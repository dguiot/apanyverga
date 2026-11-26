'use strict';
// ============================================================
//  FPS: RITMO DE PELEA
//  Medido antes: quien acababa de aparecer moría a los ~4 s en cualquier dificultad (aun en Normal),
//  porque solo había 4 puntos de aparición a la vista unos de otros y los tres bots disparaban a la vez
//  al terminar la protección. Ahora:
//  · 16 puntos de aparición repartidos por el mapa; se elige el más lejano de los rivales vivos y que
//    ninguno tenga a la vista
//  · la CPU prefiere blancos sin protección y reparte el fuego (no se juntan los tres sobre uno)
//  · la protección de aparición dura 3 s y se pierde en cuanto disparas o lanzas una granada
//  · ESCALAR: saltando contra cajas, autos, sacos o muros a la altura del pecho te subes encima
// ============================================================
const FPSPacing = {
  extra: null,
  // puntos extra: en un anillo y en el centro, solo donde cabe una persona y lejos del río y de los edificios
  points() {
    if (this.extra) return this.extra;
    const out = FPSWorld.spawns.map(([x, z]) => ({ x, z }));
    const cands = [];
    for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + ring * .4, r = 38 + ring * 34; cands.push({ x: Math.cos(a) * r, z: Math.sin(a) * r }); }
    for (const c of cands) {
      if (out.length >= 16) break;
      if (Math.abs(c.x + 115) < 22 || Math.abs(c.x) > FPSWorld.limit - 20 || Math.abs(c.z) > FPSWorld.limit - 20) continue;
      if (FPSWorld.solids.some(b => Math.abs(c.x - b.x) < b.w / 2 + 3 && Math.abs(c.z - b.z) < b.d / 2 + 3)) continue;
      if (out.some(o => Math.hypot(o.x - c.x, o.z - c.z) < 24)) continue;
      out.push(c);
    }
    return this.extra = out;
  },
  sees(q, x, z) {
    const eye = { x: q.x, y: q.y + FPSBody.eyeHeight(q), z: q.z }, ty = FPSWorld.height(x, z) + 1.4, dx = x - eye.x, dy = ty - eye.y, dz = z - eye.z, d = Math.hypot(dx, dy, dz);
    return d < 120 && FPSWorld.wallDistance(eye, { x: dx / d, y: dy / d, z: dz / d }, d) >= d - .6;
  },
};
{
  const respawn = FPSMatch.prototype.respawn;
  FPSMatch.prototype.respawn = function (p) {
    respawn.call(this, p);
    const foes = this.players.filter(q => q !== p && !q.dead);
    let best = null, score = -Infinity;
    for (const s of FPSPacing.points()) {
      const near = foes.length ? Math.min(...foes.map(q => Math.hypot(q.x - s.x, q.z - s.z))) : 999, seen = foes.filter(q => FPSPacing.sees(q, s.x, s.z)).length;
      const v = Math.min(near, 140) - seen * 60; if (v > score) { score = v; best = s; }
    }
    if (best) { p.x = best.x; p.z = best.z; p.y = FPSWorld.height(best.x, best.z); const c = foes.length ? foes.reduce((a, q) => ({ x: a.x + q.x / foes.length, z: a.z + q.z / foes.length }), { x: 0, z: 0 }) : { x: 0, z: 0 }; p.yaw = Math.atan2(c.x - p.x, -(c.z - p.z)); p.pitch = 0; p.prev = null; }
    p.invuln = 3; p.mantle = null;
  };
  // disparar o lanzar una granada termina la protección (no se puede atacar siendo intocable)
  const fire = FPSMatch.prototype.fire; FPSMatch.prototype.fire = function (p) { const r = fire.apply(this, arguments); if (p.invuln > 0 && !this.starting) p.invuln = 0; return r; };
  // la CPU: castiga menos al recién aparecido y reparte el fuego
  const inputAI = FPSMatch.prototype.inputAI;
  FPSMatch.prototype.inputAI = function (p) {
    const ai = p.ai, before = ai && ai.check, t = this.time;
    if (ai && t >= ai.check) {
      // elegir blanco aquí (misma regla que antes + reparto y protección) y dejar que el resto siga igual
      const L = FPS_LEVELS[this.level ?? 1] || FPS_LEVELS[1], eye = { x: p.x, y: p.y + FPSBody.eyeHeight(p), z: p.z };
      const sees = q => { const dx = q.x - p.x, dz = q.z - p.z, dy = q.y + FPSBody.eyeHeight(q) - .25 - eye.y, d = Math.hypot(dx, dy, dz); return d < 1 || FPSWorld.wallDistance(eye, { x: dx / d, y: dy / d, z: dz / d }, d) >= d - .5; };
      let best = null, score = Infinity, vis = false;
      for (const q of this.players) {
        if (q === p || q.dead) continue;
        const d = Math.hypot(q.x - p.x, q.z - p.z), v = d < FPS_GUNS[4].range && sees(q), crowd = this.players.filter(o => o !== p && o.bot && !o.dead && o.ai && o.ai.target === q.index).length;
        const s = d * (v ? 1 : 2.4) * (q.index === ai.target ? .8 : 1) * (q.invuln > 0 ? 3 : 1) * (1 + .7 * crowd);
        if (s < score) { score = s; best = q; vis = v; }
      }
      const id = best ? best.index : -1, r = k => hash1(p.index * 97 + k, Math.floor(t * 3) + k * 13);
      if (id !== ai.target || vis && !ai.los) { ai.target = id; ai.seen = vis ? t : -1; ai.err = (r(1) - .5) * 2 * L.spread * (.6 + .4 * r(2)); ai.errP = (r(3) - .5) * L.spread * .6; ai.head = r(12) < L.head; }
      if (!vis) ai.seen = -1; ai.los = vis; ai.check = t + .3;
    }
    const out = inputAI.call(this, p);
    // a un blanco protegido no se le gastan balas: se acomoda y espera
    const tg = this.players[p.ai?.target]; if (tg && tg.invuln > 0 && out) { out.fire = false; }
    return out;
  };
}

// ---- escalar: saltar contra algo a la altura del pecho te sube encima ----
const FPSMantle = {
  REACH: 2.35, TIME: .34,
  // ¿hay un borde enfrente? devuelve a dónde subirse
  ledge(p, dirX, dirZ) {
    const foot = p.y, ahead = .62;
    for (const b of FPSWorld.solids) {
      if (b.type === 'stair' || b.type === 'trunk') continue;
      const top = b.y + b.h, rise = top - foot; if (rise < .5 || rise > this.REACH) continue;
      const fx = p.x + dirX * ahead, fz = p.z + dirZ * ahead;
      if (Math.abs(fx - b.x) > b.w / 2 + .05 || Math.abs(fz - b.z) > b.d / 2 + .05) continue;
      // un poco más adentro del borde, sobre la tapa, debe caber de pie
      const tx = clamp(p.x + dirX * 1.0, b.x - b.w / 2 + .3, b.x + b.w / 2 - .3), tz = clamp(p.z + dirZ * 1.0, b.z - b.d / 2 + .3, b.z + b.d / 2 - .3);
      if (Math.min(b.w, b.d) < .5) continue;
      if (!FPSWorld.fits({ x: tx, y: top + .02, z: tz }, FPSBody.height)) continue;
      return { x: tx, y: top + .02, z: tz };
    }
    return null;
  },
};
{
  const move = FPSMatch.prototype.move;
  FPSMatch.prototype.move = function (p, I, dt) {
    if (p.dead) { p.mantle = null; return move.call(this, p, I, dt); }
    if (p.mantle) {
      // subiendo: la mira sigue libre; el cuerpo va del borde a la tapa en ~1/3 s
      const m = p.mantle; m.t += dt; const k = clamp(m.t / FPSMantle.TIME, 0, 1), e = k * k * (3 - 2 * k), lift = Math.min(1, k * 1.6);
      const look = I.absoluteLook ? 1 : this.lookScale(p); p.yaw = Math.atan2(Math.sin(p.yaw + clamp(I.lx || 0, -.3, .3) * look), Math.cos(p.yaw + clamp(I.lx || 0, -.3, .3) * look)); p.pitch = clamp(p.pitch + clamp(I.ly || 0, -.3, .3) * look, -1.4, 1.4);
      p.x = lerp(m.fx, m.tx, e); p.z = lerp(m.fz, m.tz, e); p.y = lerp(m.fy, m.ty, lift * lift * (3 - 2 * lift));
      p.vx = p.vz = 0; p.vy = 0; p.grounded = false; p.sprint = false; p.ads = approach(p.ads, 0, dt * 8);
      if (k >= 1) { p.mantle = null; p.grounded = true; p.y = m.ty; p.landing = 0; }
      p.hurt = Math.max(0, p.hurt - dt); p.hit = Math.max(0, p.hit - dt); p.invuln = Math.max(0, p.invuln - dt); p.throwTimer = Math.max(0, (p.throwTimer || 0) - dt);
      return;
    }
    const wasGrounded = p.grounded, vy0 = p.vy;
    move.call(this, p, I, dt);
    // en el aire (o recién saltando), empujando hacia adelante contra un borde alcanzable
    const z = I.z || 0, x = I.x || 0;
    if (!p.grounded && z > .35 && p.stance < .2 && !p.dead) {
      const dirX = Math.cos(p.yaw) * x + Math.sin(p.yaw) * z, dirZ = Math.sin(p.yaw) * x - Math.cos(p.yaw) * z, n = Math.hypot(dirX, dirZ) || 1;
      const to = FPSMantle.ledge(p, dirX / n, dirZ / n);
      if (to) { p.mantle = { t: 0, fx: p.x, fy: p.y, fz: p.z, tx: to.x, ty: to.y, tz: to.z }; p.slide = 0; this.sound('step', p); }
    }
  };
}
// ---- arranque: cada quien empieza lejos y fuera de la vista de los demás (antes, a la vista y a ~45 m) ----
{
  const Base = FPSMatch;
  FPSMatch = class extends Base {
    constructor(...args) {
      super(...args);
      const placed = [this.players[0]];
      for (const p of this.players.slice(1)) {
        let best = null, score = -Infinity;
        for (const s of FPSPacing.points()) {
          if (placed.some(q => Math.hypot(q.x - s.x, q.z - s.z) < 20)) continue;
          const near = Math.min(...placed.map(q => Math.hypot(q.x - s.x, q.z - s.z))), seen = placed.filter(q => FPSPacing.sees(q, s.x, s.z)).length;
          const v = Math.min(near, 110) - seen * 60; if (v > score) { score = v; best = s; }
        }
        if (best) { p.x = best.x; p.z = best.z; p.y = FPSWorld.height(best.x, best.z); p.yaw = Math.atan2(-p.x, -p.z); }
        placed.push(p);
      }
      for (const p of this.players) p.invuln = 3;
    }
  };
}
