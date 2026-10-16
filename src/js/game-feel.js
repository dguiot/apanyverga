'use strict';
// Presentation lives outside the simulation: no render clock, spring or camera
// correction enters a rollback snapshot, collision test or network checksum.
const GameFeel = {
  dt: 1 / 60, alpha: 1, rendering: false, droppedMs: 0,
  samples: new Float32Array(900), sampleAt: 0, sampleCount: 0,
  frame(ms) {
    this.dt = clamp(ms / 1000, 0, .05);
    if (document.hidden || ms <= 0) return;
    this.samples[this.sampleAt++ % this.samples.length] = ms;
    this.sampleCount = Math.min(this.samples.length, this.sampleCount + 1);
  },
  // Same response in seconds at 30, 60, 120 and 144 Hz.
  blend(at60, dt = this.dt) { return 1 - Math.pow(1 - at60, Math.max(0, dt) * 60); },
  spring(s, key, target, omega, dt = this.dt) {
    const vk = key + 'V', x = (s[key] || 0) - target, v = s[vk] || 0;
    const e = Math.exp(-omega * dt), t = (v + omega * x) * dt;
    s[key] = target + (x + t) * e; s[vk] = (v - omega * t) * e;
    return s[key];
  },
  metrics() {
    const a = Array.from(this.samples.subarray(0, this.sampleCount)).sort((x, y) => x - y);
    const q = n => a.length ? +a[Math.min(a.length - 1, Math.floor(a.length * n))].toFixed(2) : 0;
    return { frames: a.length, medianMs: q(.5), p95Ms: q(.95), p99Ms: q(.99), over34ms: a.filter(x => x > 34).length, droppedMs: Math.round(this.droppedMs) };
  },
  resetMetrics() { this.sampleAt = this.sampleCount = this.droppedMs = 0; },
};

const FightView = {
  battles: new WeakMap(), fighters: new WeakMap(), objects: new WeakMap(),
  copy(f) { return { x: f.x, y: f.y, pose: Object.fromEntries(Object.entries(f.pose).map(([k, v]) => [k, Array.isArray(v) ? v.slice() : v])), state: f.state, face: f.face, grounded: f.grounded, dead: f.dead, hidden: f.hidden, hitlag: f.hitlag }; },
  before(b) {
    const from = new Map(b.fighters.map(f => [f.port, this.copy(f)]));
    this.battles.set(b, { from, cam: { ...b.cam }, tick: b.t });
    for (const p of [...b.projectiles, ...b.items]) this.objects.set(p, { x: p.x, y: p.y, b, tick: b.t + 1 });
  },
  after(b) {
    const rec = this.battles.get(b); if (!rec) return;
    rec.tick = b.t;
    for (const f of b.fighters) this.fighters.set(f, { from: rec.from.get(f.port), b, tick: b.t });
  },
  fighter(f, alpha = GameFeel.alpha) {
    const rec = this.fighters.get(f), p = rec?.from, b = rec?.b;
    if (!p || rec.tick !== b.t || b.paused || b.view || f.dead || f.hidden) return f;
    // Teleports, landings, takeoff and contact freeze appear immediately.
    const command = f.state !== p.state && ['dash', 'attack', 'jumpsquat', 'shield', 'dodge', 'airdodge'].includes(f.state);
    const snap = command || f.hitlag > 0 || p.dead !== f.dead || p.hidden !== f.hidden || p.grounded !== f.grounded || Math.hypot(f.x - p.x, f.y - p.y) > 100 || ['ledge', 'grabbed', 'holding', 'respawn'].includes(f.state);
    const x = snap ? f.x : lerp(p.x, f.x, alpha), y = snap ? f.y : lerp(p.y, f.y, alpha);
    // Active attack poses stay on their exact hitbox frame.
    const snapPose = snap || f.state === 'attack' || p.state === 'attack' || f.state !== p.state || f.face !== p.face;
    return { x, y, pose: snapPose ? f.pose : blendPose(p.pose, f.pose, alpha) };
  },
  point(p, alpha = GameFeel.alpha) {
    const old = this.objects.get(p);
    if (!old || old.b.paused || old.b.view || old.tick !== old.b.t || Math.hypot(p.x - old.x, p.y - old.y) > 100) return p;
    return { x: lerp(old.x, p.x, alpha), y: lerp(old.y, p.y, alpha) };
  },
  camera(b, alpha = GameFeel.alpha) {
    const old = this.battles.get(b);
    if (!old || old.tick !== b.t || b.paused || b.view) return b.cam;
    return { x: lerp(old.cam.x, b.cam.x, alpha), y: lerp(old.cam.y, b.cam.y, alpha), z: lerp(old.cam.z, b.cam.z, alpha) };
  },
  // Clocked noise, rather than a new random displacement on every monitor refresh.
  noise(t, seed) { const a = Math.floor(t), u = smooth01(t - a); return lerp(hash1(a, seed), hash1(a + 1, seed), u) * 2 - 1; },
};
const feelBattleUpdate = Battle.prototype.update;
Battle.prototype.update = function () {
  // The outer rollback call captures the final display state once, rather than
  // allocating pose copies for every replayed historical frame.
  if (this.resim || this.rollbackSession?.running) return feelBattleUpdate.call(this);
  FightView.before(this); const out = feelBattleUpdate.call(this); FightView.after(this); return out;
};

const KartMotion = {
  states: new WeakMap(),
  sample(r) { return { s: r.s, x: r.x, yaw: r.yaw || 0, height: r.height || 0, steer: r.steer, v: r.v, lat: r.lat, vy: r.vy, trick: r.trick, stun: r.stun, turbo: r.turbo, charge: r.charge, drift: r.drift, rescue: r.rescue, finish: r.finish }; },
  state(r) {
    let q = this.states.get(r);
    if (!q) { q = { prev: this.sample(r), tick: -1, offsetS: 0, offsetX: 0, offsetH: 0, offsetYaw: 0, roll: 0, pitch: 0, bounce: 0, trickAge: 1, trickDuration: .6, hitAge: 1 }; this.states.set(r, q); }
    return q;
  },
  before(race) { for (const r of race.racers) { const q = this.state(r); q.prev = this.sample(r); q.race = race; } },
  after(race) {
    for (const r of race.racers) {
      const q = this.state(r), p = q.prev; q.tick = race.tick;
      if (p.height > 0 && r.height === 0 && p.vy < 0 && !r.rescue) {
        const force = clamp(-p.vy / 14, .1, 1); q.bounceV = -force * 7;
        if (p.height > .08 || force > .3) race.feedback(r, 'land', force * .25);
      }
      if (r.trick && !p.trick) { q.trickAge = 0; q.trickDuration = clamp((r.vy + Math.sqrt(r.vy * r.vy + 48 * r.height)) / 24 - .04, .12, .6); }
      if (r.stun > p.stun + .2) q.hitAge = 0;
      const tier = c => c > 2 ? 3 : c > 1.3 ? 2 : c > .7 ? 1 : 0;
      if (!r.drift) q.driftCue = 0;
      if (r.drift && tier(r.charge) > (q.driftCue || 0)) { q.driftCue = tier(r.charge); race.feedback(r, 'drift' + q.driftCue, .08 + q.driftCue * .04); }
      if (r.turbo > p.turbo + .2 && performance.now() - (q.boostCueAt ?? -1000) > 300) { q.boostCueAt = performance.now(); race.feedback(r, 'boost', .23); }
    }
  },
  view(r, alpha = GameFeel.alpha) {
    const q = this.state(r), p = q.prev, snap = q.race?.paused && !q.race.online || r.rescue || Math.abs(r.s - p.s) > 60 || Math.abs(r.x - p.x) > .8;
    const a = snap ? 1 : alpha;
    return { s: lerp(p.s, r.s, a) + q.offsetS, x: lerp(p.x, r.x, a) + q.offsetX,
      yaw: lerp(p.yaw, r.yaw || 0, a) + q.offsetYaw, height: lerp(p.height, r.height || 0, a) + q.offsetH,
      steer: lerp(p.steer, r.steer, a), v: lerp(p.v, r.v, a), lat: lerp(p.lat, r.lat, a), q };
  },
  // Keep the picture continuous while the host corrects the real driving state.
  // Large moves (rescue, finish, teleport) snap and cannot leave a phantom kart.
  reconcile(r, previous, hard) {
    const q = this.state(r);
    if (hard || Math.abs(previous.s - r.s) > 18 || Math.abs(previous.x - r.x) > .6) q.offsetS = q.offsetX = q.offsetH = q.offsetYaw = 0;
    else {
      q.offsetS = clamp(previous.s - r.s, -12, 12); q.offsetX = clamp(previous.x - r.x, -.4, .4);
      q.offsetH = clamp(previous.height - r.height, -1, 1); q.offsetYaw = clamp(previous.yaw - r.yaw, -.4, .4);
    }
    q.prev = this.sample(r);
  },
  animate(race, dt = GameFeel.dt) {
    // The world advances once even when it is rendered through four cameras.
    if (race.paused && !race.online) dt = 0;
    const decay = Math.exp(-18 * dt);
    for (const r of race.racers) {
      const q = this.state(r), p = q.prev, V = kartVehicle(r.vehicle);
      q.offsetS *= decay; q.offsetX *= decay; q.offsetH *= decay; q.offsetYaw *= decay;
      const roll = V.kind.endsWith('bike') ? clamp(-r.steer * r.v / 170, -.48, .48) : clamp(-r.lat * .045, -.14, .14);
      const acceleration = clamp((r.v - p.v) * 60, -180, 160);
      const pitch = r.height > .15 ? clamp(-r.vy * .018, -.22, .24) : clamp(-acceleration * .0007, -.1, .13);
      GameFeel.spring(q, 'roll', reducedMotion ? 0 : roll, 18, dt);
      GameFeel.spring(q, 'pitch', reducedMotion ? 0 : pitch, 16, dt);
      GameFeel.spring(q, 'bounce', 0, 20, dt);
      q.trickAge += dt; q.hitAge += dt;
    }
  },
  body(r, mesh) {
    const q = this.state(r), b = mesh.userData.body, progress = clamp(q.trickAge / q.trickDuration, 0, 1);
    b.rotation.z = q.roll;
    b.rotation.x = q.pitch - (reducedMotion ? 0 : TAU * smooth01(progress));
    b.rotation.y = reducedMotion || q.hitAge >= .65 ? 0 : TAU * easeOut(q.hitAge / .65);
    b.position.y = clamp(q.bounce, -.24, .12) + Math.sin(r.s * .25) * Math.min(.018, r.v * .0002);
  },
};
const feelKartUpdate = KartRace.prototype.update;
KartRace.prototype.update = function (input, dt) { if (this.paused) return feelKartUpdate.call(this, input, dt); KartMotion.before(this); const out = feelKartUpdate.call(this, input, dt); KartMotion.after(this); return out; };
const feelKartPredict = KartOnline.predict;
KartOnline.predict = function (input) { const race = APP.kartRace; KartMotion.before(race); const out = feelKartPredict.call(this, input); KartMotion.after(race); return out; };
