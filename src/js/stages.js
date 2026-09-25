'use strict';
// ============================================================
//  ESCENARIOS (4, interactivos)
// ============================================================
function surf(x, y, w, h, o) { return Object.assign({ x, y, w, h, bx: x, by: y, dx: 0, dy: 0 }, o || {}); }

function makeStage(id, opts = {}) {
  const common = {
    t: 0, grav: 1, blast: { l: -1350, r: 1350, t: -1050, b: 720 }, cam: { l: -1000, r: 1000, t: -800, b: 420 },
    hazardTimer: 0, event: null, particles: [],
    floorY(x) {
      let best = null;
      for (const s of this.solids) if (x >= s.x && x <= s.x + s.w) best = best === null ? s.y : Math.min(best, s.y);
      return best === null ? this.top : best;
    },
    surfaces() { return this.solids.concat(this.plats); },
    step() {
      this.t++;
      for (const s of this.surfaces()) {
        const ox = s.x, oy = s.y;
        if (s.move) { const p = s.move(this.t, s); s.x = p[0]; s.y = p[1]; }
        s.dx = s.x - ox; s.dy = s.y - oy;
      }
      this.update && this.update();
    },
    ledges() {
      const out = [];
      for (const s of this.solids) if (s.ledge) { out.push({ s, x: s.x, y: s.y, side: -1 }); out.push({ s, x: s.x + s.w, y: s.y, side: 1 }); }
      return out;
    },
  };
  const def = STAGE_DEFS[id](opts);
  const st = Object.assign(common, def);
  st.id = id;
  const main = st.solids.filter(s => s.ledge || s === st.solids[0]);
  st.left = Math.min(...main.map(s => s.x)); st.right = Math.max(...main.map(s => s.x + s.w)); st.top = st.solids[0].y;
  return st;
}

const STAGE_INFO = [
  { id: 'temple', name: 'Templo del Cielo', desc: 'Plataformas flotantes y ráfagas de viento que te empujan.', song: 'temple' },
  { id: 'volcano', name: 'Volcán Furioso', desc: 'La lava sube y cubre el suelo. Llueven rocas de fuego.', song: 'volcano' },
  { id: 'ship', name: 'Barco Pirata', desc: 'El barco se mece, disparan cañonazos y llegan olas.', song: 'ship' },
  { id: 'space', name: 'Estación Orbital', desc: 'Baja gravedad, plataformas en órbita y meteoritos.', song: 'space' },
];

// --------- utilidades de dibujo de escenario ---------
function drawSlab(c, s, top, side, edge) {
  c.fillStyle = side; c.fillRect(s.x, s.y, s.w, s.h);
  c.fillStyle = top; c.fillRect(s.x, s.y, s.w, 12);
  c.fillStyle = edge; c.fillRect(s.x, s.y + 12, s.w, 4);
}
function drawPlat(c, p, col, col2) {
  roundRect(c, p.x, p.y, p.w, 14, 7); c.fillStyle = col; c.fill();
  c.fillStyle = col2; c.fillRect(p.x + 8, p.y + 10, p.w - 16, 4);
}
function warnBanner(txt, col) { if (typeof banner === 'function') banner(txt, col); Audio8.sfx('warn'); }

const STAGE_DEFS = {
  // ===================================================
  temple: () => ({
    name: 'Templo del Cielo', song: 'temple',
    solids: [surf(-430, 0, 860, 64, { ledge: 1 })],
    plats: [
      surf(-300, -140, 170, 14, { plat: 1, move: (t, s) => [s.bx, s.by + Math.sin(t * 0.02) * 22] }),
      surf(130, -140, 170, 14, { plat: 1, move: (t, s) => [s.bx, s.by - Math.sin(t * 0.02) * 22] }),
      surf(-85, -275, 170, 14, { plat: 1, move: (t, s) => [s.bx + Math.sin(t * 0.011) * 150, s.by] }),
    ],
    wind: 0, windDir: 1, nextEvent: 900,
    clouds: Array.from({ length: 14 }, (_, i) => ({ x: rand(-1600, 1600), y: rand(-700, 200), s: rand(0.6, 1.6), z: rand(0.2, 0.6) })),
    update() {
      this.nextEvent--;
      if (this.nextEvent === 90) { this.windDir = pick([-1, 1]); warnBanner(this.windDir > 0 ? '¡Ráfaga de viento! →' : '← ¡Ráfaga de viento!', '#8ecae6'); }
      if (this.nextEvent === 0) { this.wind = 260; Audio8.sfx('wind'); }
      if (this.nextEvent < 0 && this.wind <= 0) this.nextEvent = randi(900, 1400);
      if (this.wind > 0) {
        this.wind--;
        const k = Math.min(1, this.wind / 40, (260 - this.wind) / 30);
        for (const f of BATTLE.fighters) if (!f.dead && !f.intangibleToStage()) f.vx += this.windDir * (f.grounded ? 0.3 : 0.42) * k;
        if (this.wind % 3 === 0) spawnFx('wind', this.windDir > 0 ? -1100 : 1100, rand(-700, 200), { dir: this.windDir });
        if (this.wind % 50 === 0) Audio8.sfx('wind');
      }
    },
    drawBG(c, cam) {
      const cyc = (Math.sin(this.t * 0.0012) + 1) / 2; // 0 día, 1 atardecer
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, `rgb(${lerp(76, 60, cyc)},${lerp(160, 70, cyc)},${lerp(230, 140, cyc)})`);
      g.addColorStop(0.6, `rgb(${lerp(170, 250, cyc)},${lerp(215, 150, cyc)},${lerp(245, 120, cyc)})`);
      g.addColorStop(1, `rgb(${lerp(240, 255, cyc)},${lerp(240, 200, cyc)},${lerp(230, 160, cyc)})`);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // sol
      c.fillStyle = `rgba(255,${lerp(245, 190, cyc)},${lerp(200, 120, cyc)},0.9)`;
      c.beginPath(); c.arc(W * 0.78, H * (0.22 + cyc * 0.25), 60, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,240,200,0.18)'; c.beginPath(); c.arc(W * 0.78, H * (0.22 + cyc * 0.25), 110, 0, TAU); c.fill();
      // islas lejanas
      c.fillStyle = `rgba(${lerp(90, 120, cyc)},${lerp(120, 90, cyc)},${lerp(170, 130, cyc)},0.55)`;
      for (let i = 0; i < 5; i++) {
        const x = ((i * 330 - cam.x * 0.08) % 1700 + 1700) % 1700 - 200, y = 360 + (i % 2) * 70 - cam.y * 0.05;
        c.beginPath(); c.moveTo(x - 90, y); c.lineTo(x + 90, y); c.lineTo(x + 30, y + 70); c.lineTo(x - 10, y + 110); c.lineTo(x - 50, y + 60); c.closePath(); c.fill();
        c.fillRect(x - 40, y - 60, 12, 60); c.fillRect(x + 20, y - 60, 12, 60); c.fillRect(x - 50, y - 70, 92, 12);
      }
      // nubes
      for (const cl of this.clouds) {
        cl.x += 0.25 * cl.z; if (cl.x > 1700) cl.x = -1700;
        const x = W / 2 + (cl.x - cam.x * cl.z) * 0.5, y = H / 2 + (cl.y - cam.y * cl.z) * 0.5;
        c.fillStyle = `rgba(255,255,255,${0.35 + cl.z * 0.5})`;
        for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(x + k * 34 * cl.s, y - (k % 2) * 14 * cl.s, 46 * cl.s, 26 * cl.s, 0, 0, TAU); c.fill(); }
      }
    },
    drawStage(c) {
      const s = this.solids[0];
      // isla flotante
      const g = c.createLinearGradient(0, s.y, 0, s.y + 300);
      g.addColorStop(0, '#8d6e53'); g.addColorStop(1, '#4a3a30');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(s.x, s.y + 40); c.lineTo(s.x + s.w, s.y + 40); c.lineTo(s.x + s.w - 90, s.y + 150); c.lineTo(s.x + s.w * 0.62, s.y + 210); c.lineTo(s.x + s.w * 0.5, s.y + 300); c.lineTo(s.x + s.w * 0.38, s.y + 220); c.lineTo(s.x + 110, s.y + 160); c.closePath(); c.fill();
      c.fillStyle = 'rgba(46,196,182,0.8)';
      for (const [dx, dy, r] of [[0.3, 140, 10], [0.55, 190, 14], [0.7, 120, 9], [0.45, 250, 8]]) { c.beginPath(); c.moveTo(s.x + s.w * dx, s.y + dy - r * 2); c.lineTo(s.x + s.w * dx + r, s.y + dy); c.lineTo(s.x + s.w * dx, s.y + dy + r * 2); c.lineTo(s.x + s.w * dx - r, s.y + dy); c.closePath(); c.fill(); }
      drawSlab(c, s, '#7ec850', '#b8a38a', '#5e9c3a');
      // baldosas del templo
      c.strokeStyle = 'rgba(80,60,40,.35)'; c.lineWidth = 2;
      for (let x = s.x + 60; x < s.x + s.w; x += 60) { c.beginPath(); c.moveTo(x, s.y + 16); c.lineTo(x, s.y + s.h); c.stroke(); }
      // columnas decorativas al fondo del suelo
      for (const px of [-360, 330]) { c.fillStyle = 'rgba(230,220,200,.8)'; c.fillRect(px, -120, 30, 120); c.fillRect(px - 8, -130, 46, 14); }
      for (const p of this.plats) {
        c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(p.x + 10, p.y + 14, p.w - 20, 10);
        drawPlat(c, p, '#e9dcc5', '#bfa98a');
        c.fillStyle = '#2ec4b6'; c.beginPath(); c.arc(p.x + p.w / 2, p.y + 22, 6 + Math.sin(this.t * 0.1) * 1.5, 0, TAU); c.fill();
      }
    },
    drawFG() {},
  }),
  // ===================================================
  volcano: () => ({
    name: 'Volcán Furioso', song: 'volcano',
    solids: [surf(-460, 0, 920, 70, { ledge: 1 })],
    plats: [
      surf(-330, -150, 160, 14, { plat: 1 }),
      surf(170, -150, 160, 14, { plat: 1 }),
      surf(-80, -290, 160, 14, { plat: 1, move: (t, s) => [s.bx + Math.sin(t * 0.009) * 60, s.by] }),
    ],
    lavaY: 460, lavaBase: 460, lavaPhase: 'idle', lavaT: 0, nextEvent: 1100, rockT: 300,
    update() {
      this.nextEvent--;
      if (this.lavaPhase === 'idle' && this.nextEvent <= 0) { this.lavaPhase = 'warn'; this.lavaT = 150; warnBanner('¡LA LAVA SUBE! ¡A las plataformas!', '#ff6d00'); Audio8.sfx('rumble'); }
      if (this.lavaPhase === 'warn') { shake(2); if (--this.lavaT <= 0) { this.lavaPhase = 'rise'; this.lavaT = 0; } }
      else if (this.lavaPhase === 'rise') { this.lavaY = approach(this.lavaY, -60, 4.4); if (this.lavaY <= -60) { this.lavaPhase = 'hold'; this.lavaT = 320; } }
      else if (this.lavaPhase === 'hold') { if (this.lavaT % 20 === 0) spawnFx('ember', rand(-600, 600), this.lavaY); if (--this.lavaT <= 0) this.lavaPhase = 'fall'; }
      else if (this.lavaPhase === 'fall') { this.lavaY = approach(this.lavaY, this.lavaBase, 3); if (this.lavaY >= this.lavaBase) { this.lavaPhase = 'idle'; this.nextEvent = randi(1300, 1800); } }
      const erupting = this.lavaPhase !== 'idle';
      if (--this.rockT <= 0) {
        this.rockT = erupting ? randi(30, 55) : randi(200, 360);
        const x = rand(this.left - 80, this.right + 80);
        spawnFx('target', x, this.floorY(x), { life: 72, col: '#ff6d00' });
        spawnProjectile(null, { type: 'rock', x, y: this.floorY(x) - 1200, vx: 0, vy: 17, grav: 0, r: 24, life: 200, dmg: 12, ang: 70, bkb: 8, kbg: 8, col: '#ff6d00', effect: 'fire', explodeGround: 1 });
      }
      for (const f of BATTLE.fighters) {
        if (f.dead || f.intangibleToStage()) continue;
        f.lavaCd = Math.max(0, (f.lavaCd || 0) - 1);
        if (f.y > this.lavaY + 4 && !f.lavaCd) { f.lavaCd = 45; spawnFx('boom', f.x, this.lavaY, { r: 70, col: '#ff6d00' }); applyHit(null, f, { dmg: 11, ang: 90, bkb: 0, kbg: 0, effect: 'fire', sfx: 'fire' }, 1, { noLaunch: true });
          // la lava quema y avienta hacia arriba siempre igual (no crece con el %): castiga, pero da chance de regresar
          if (!f.dead && f.state === 'hitstun') { f.hitstun = 18; f.grounded = false; f.surface = null; f.vy = -22; f.airUsed = {}; f.jumps = Math.max(f.jumps, 1); } }
      }
    },
    drawBG(c, cam) {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1b0b12'); g.addColorStop(0.55, '#5a1414'); g.addColorStop(1, '#c1440e');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      const px = -cam.x * 0.06, py = -cam.y * 0.05;
      c.fillStyle = '#2a0f0f';
      c.beginPath(); c.moveTo(80 + px, H + 40); c.lineTo(520 + px, 250 + py); c.lineTo(660 + px, 250 + py); c.lineTo(1150 + px, H + 40); c.closePath(); c.fill();
      const glow = 0.5 + Math.sin(this.t * 0.05) * 0.2 + (this.lavaPhase !== 'idle' ? 0.4 : 0);
      c.fillStyle = `rgba(255,120,20,${glow})`; c.beginPath(); c.ellipse(590 + px, 255 + py, 80, 18, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(40,20,20,.55)';
      for (let i = 0; i < 6; i++) { const t = (this.t * 0.4 + i * 60) % 360; c.beginPath(); c.arc(590 + px + Math.sin(i + t * 0.02) * 30, 240 + py - t, 30 + t * 0.25, 0, TAU); c.fill(); }
      c.fillStyle = 'rgba(255,160,60,.7)';
      for (let i = 0; i < 30; i++) { const x = (i * 97 + this.t * (0.4 + (i % 3) * 0.2)) % W, y = H - ((i * 53 + this.t * (1 + i % 4)) % H); c.fillRect(x, y, 3, 3); }
    },
    drawStage(c) {
      const s = this.solids[0];
      c.fillStyle = '#2b1d1a';
      c.beginPath(); c.moveTo(s.x, s.y + 50); c.lineTo(s.x + s.w, s.y + 50); c.lineTo(s.x + s.w - 120, s.y + 220); c.lineTo(s.x + 140, s.y + 240); c.closePath(); c.fill();
      drawSlab(c, s, '#5b4a44', '#3a2b27', '#ff6d00');
      c.fillStyle = 'rgba(255,109,0,.5)';
      for (let x = s.x + 40; x < s.x + s.w; x += 110) { c.fillRect(x, s.y + 24, 3, 30); c.fillRect(x + 3, s.y + 40, 20, 3); }
      for (const p of this.plats) drawPlat(c, p, '#6b5750', '#ff8c42');
    },
    drawFG(c) {
      const y = this.lavaY;
      const g = c.createLinearGradient(0, y, 0, y + 600);
      g.addColorStop(0, '#ffd166'); g.addColorStop(0.08, '#ff6d00'); g.addColorStop(1, '#8a1c00');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(-2000, y + 1200);
      for (let x = -2000; x <= 2000; x += 40) c.lineTo(x, y + Math.sin(x * 0.02 + this.t * 0.08) * 6);
      c.lineTo(2000, y + 1200); c.closePath(); c.fill();
      if (this.lavaPhase === 'warn') {
        c.fillStyle = `rgba(255,80,0,${0.15 + Math.sin(this.t * 0.4) * 0.1})`; c.fillRect(-2000, -40, 4000, 40);
      }
    },
  }),
  // ===================================================
  ship: () => {
    const bob = (t, s) => [s.bx, s.by + Math.sin(t * 0.025) * 11];
    return {
      name: 'Barco Pirata', song: 'ship',
      solids: [surf(-470, 0, 900, 60, { ledge: 1, move: bob })],
      plats: [
        surf(-70, -300, 140, 14, { plat: 1, move: bob }),
        surf(250, -115, 180, 14, { plat: 1, move: bob }),
        surf(-470, -100, 150, 14, { plat: 1, move: bob }),
      ],
      nextCannon: 600, nextWave: 1700, wave: 0, waveDir: 1, waveX: 0,
      update() {
        if (--this.nextCannon <= 0) {
          this.nextCannon = randi(520, 800);
          warnBanner('¡Cañonazos!', '#ffbe0b');
          for (let i = 0; i < 3; i++) {
            const x = rand(this.left + 40, this.right - 40);
            spawnFx('target', x, this.floorY(x), { life: 160 + i * 25, col: '#ffbe0b' });
            spawnProjectile(null, { type: 'cannon', x: 1300, y: -300, delay: 70 + i * 25, toX: x, r: 20, life: 400, dmg: 14, ang: 60, bkb: 9, kbg: 10, col: '#222', explodeGround: 1, grav: 0.35 });
          }
        }
        if (--this.nextWave === 120) { this.waveDir = pick([-1, 1]); warnBanner(this.waveDir > 0 ? '¡Ola gigante! →' : '← ¡Ola gigante!', '#48cae4'); }
        if (this.nextWave <= 0 && !this.wave) { this.wave = 150; this.waveX = this.waveDir > 0 ? -1300 : 1300; Audio8.sfx('splash'); }
        if (this.wave > 0) {
          this.wave--; this.waveX += this.waveDir * 18;
          for (const f of BATTLE.fighters) {
            if (f.dead || f.intangibleToStage()) continue;
            if (Math.abs(f.x - this.waveX) < 140 && f.y > -220) {
              f.vx += this.waveDir * 1.1; if (f.grounded) { f.vy = -4; f.grounded = false; if (f.state !== 'hitstun') f.setState('air'); }
              if (!f.waveHit) { f.waveHit = 1; applyHit(null, f, { dmg: 4, ang: 50, bkb: 6, kbg: 2, sfx: 'splash' }, this.waveDir); }
            }
          }
          if (this.wave === 0) { this.nextWave = randi(1500, 2100); for (const f of BATTLE.fighters) f.waveHit = 0; }
        }
      },
      drawBG(c, cam) {
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#1d3557'); g.addColorStop(0.5, '#e76f51'); g.addColorStop(0.75, '#f4a261'); g.addColorStop(1, '#264653');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,220,150,.9)'; c.beginPath(); c.arc(W * 0.3, H * 0.58, 70, Math.PI, 0); c.fill();
        const px = -cam.x * 0.05;
        c.fillStyle = '#3d2c2e';
        const sx = 1000 + px + Math.sin(this.t * 0.01) * 20, sy = H * 0.6 + Math.sin(this.t * 0.03) * 4;
        c.beginPath(); c.moveTo(sx - 90, sy); c.lineTo(sx + 90, sy); c.lineTo(sx + 60, sy + 26); c.lineTo(sx - 70, sy + 26); c.closePath(); c.fill();
        c.fillRect(sx - 4, sy - 90, 6, 90); c.fillStyle = 'rgba(240,230,210,.7)'; c.fillRect(sx - 40, sy - 80, 36, 50);
        if (this.nextCannon > 480 && this.nextCannon < 560) { c.fillStyle = 'rgba(255,230,120,.9)'; c.beginPath(); c.arc(sx - 90, sy + 8, 10 + Math.random() * 6, 0, TAU); c.fill(); }
        c.fillStyle = '#2a9d8f';
        c.beginPath(); c.moveTo(0, H * 0.62);
        for (let x = 0; x <= W; x += 20) c.lineTo(x, H * 0.62 + Math.sin(x * 0.02 + this.t * 0.03) * 5);
        c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,.25)';
        for (let i = 0; i < 25; i++) { const x = (i * 71 + this.t * 0.6) % W; c.fillRect(x, H * 0.66 + (i % 5) * 26, 26, 2); }
      },
      drawStage(c) {
        const s = this.solids[0];
        // casco
        c.fillStyle = '#6b3e26';
        c.beginPath(); c.moveTo(s.x - 40, s.y); c.lineTo(s.x + s.w + 60, s.y); c.lineTo(s.x + s.w - 40, s.y + 190); c.lineTo(s.x + 60, s.y + 190); c.closePath(); c.fill();
        c.strokeStyle = '#4a2a18'; c.lineWidth = 4;
        for (let y = 40; y < 190; y += 36) { c.beginPath(); c.moveTo(s.x - 20 + y * 0.3, s.y + y); c.lineTo(s.x + s.w + 40 - y * 0.5, s.y + y); c.stroke(); }
        c.fillStyle = '#1a1a1a'; for (let x = s.x + 90; x < s.x + s.w - 60; x += 140) { c.beginPath(); c.arc(x, s.y + 80, 13, 0, TAU); c.fill(); }
        drawSlab(c, s, '#c08552', '#8c5a35', '#5e3a22');
        c.strokeStyle = 'rgba(60,35,20,.4)'; c.lineWidth = 2;
        for (let x = s.x + 50; x < s.x + s.w; x += 50) { c.beginPath(); c.moveTo(x, s.y + 2); c.lineTo(x, s.y + 12); c.stroke(); }
        // mástil y vela
        const m = this.plats[0];
        c.fillStyle = '#5e3a22'; c.fillRect(m.x + m.w / 2 - 8, m.y, 16, s.y - m.y);
        c.fillStyle = 'rgba(245,235,215,.92)';
        c.beginPath(); c.moveTo(m.x + m.w / 2 + 10, m.y + 40); c.quadraticCurveTo(m.x + m.w / 2 + 170 + Math.sin(this.t * 0.03) * 12, m.y + 130, m.x + m.w / 2 + 10, m.y + 230); c.closePath(); c.fill();
        c.fillStyle = '#e63946'; c.beginPath(); c.moveTo(m.x + m.w / 2, m.y - 60); c.lineTo(m.x + m.w / 2 + 50 + Math.sin(this.t * 0.1) * 6, m.y - 48); c.lineTo(m.x + m.w / 2, m.y - 36); c.fill();
        c.fillStyle = '#5e3a22'; c.fillRect(m.x + m.w / 2 - 3, m.y - 60, 6, 60);
        for (const p of this.plats) { drawPlat(c, p, '#a0673f', '#6b3e26'); }
        c.fillStyle = '#6b3e26'; const p1 = this.plats[1]; c.fillRect(p1.x + 10, p1.y + 14, 14, s.y - p1.y - 14); c.fillRect(p1.x + p1.w - 24, p1.y + 14, 14, s.y - p1.y - 14);
        const p2 = this.plats[2]; c.fillRect(p2.x + 20, p2.y + 14, 14, s.y - p2.y - 14);
        // ola
        if (this.wave > 0) {
          c.fillStyle = 'rgba(72,202,228,.8)';
          c.beginPath(); c.moveTo(this.waveX - 160 * this.waveDir, 60); c.quadraticCurveTo(this.waveX, -320, this.waveX + 100 * this.waveDir, -140); c.quadraticCurveTo(this.waveX + 40 * this.waveDir, 0, this.waveX + 160 * this.waveDir, 60); c.closePath(); c.fill();
          c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(this.waveX + 60 * this.waveDir, -200, 30, 0, TAU); c.fill();
        }
      },
      drawFG(c) {
        c.fillStyle = 'rgba(38,70,83,.92)';
        c.beginPath(); c.moveTo(-2000, 900);
        for (let x = -2000; x <= 2000; x += 40) c.lineTo(x, 170 + Math.sin(x * 0.012 + this.t * 0.05) * 12);
        c.lineTo(2000, 900); c.closePath(); c.fill();
      },
    };
  },
  // ===================================================
  space: () => {
    const orbit = off => (t, s) => { const a = t * 0.008 + off; return [Math.cos(a) * 320 - s.w / 2, -175 + Math.sin(a) * 95]; };
    return {
      name: 'Estación Orbital', song: 'space', grav: 0.62, baseGrav: 0.62,
      solids: [surf(-380, 0, 760, 50, { ledge: 1 })],
      plats: [surf(0, 0, 150, 14, { plat: 1, move: orbit(0) }), surf(0, 0, 150, 14, { plat: 1, move: orbit(Math.PI) })],
      stars: Array.from({ length: 160 }, () => ({ x: rand(0, W), y: rand(0, H), z: rand(0.1, 1) })),
      nextMeteor: 700, zeroG: 0, nextZero: 1600,
      update() {
        if (--this.nextMeteor <= 0) {
          this.nextMeteor = randi(600, 900);
          const d = pick([-1, 1]);
          warnBanner(d > 0 ? '¡Alerta de meteorito! →' : '← ¡Alerta de meteorito!', '#ff9f1c');
          spawnProjectile(null, { type: 'meteor', x: -1300 * d, y: rand(-700, -350), vx: 10.5 * d, vy: 4.2, delay: 80, r: 34, life: 400, dmg: 16, ang: 40, bkb: 10, kbg: 11, col: '#ff9f1c', pierce: 1, effect: 'fire' });
        }
        if (--this.nextZero === 0) { warnBanner('¡GRAVEDAD CERO!', '#48cae4'); this.zeroG = 480; }
        if (this.zeroG > 0) { this.zeroG--; this.grav = this.baseGrav * 0.4; if (this.zeroG === 0) { this.grav = this.baseGrav; this.nextZero = randi(1500, 2100); } }
      },
      drawBG(c, cam) {
        c.fillStyle = '#060b1a'; c.fillRect(0, 0, W, H);
        const neb = c.createRadialGradient(W * 0.7, H * 0.3, 20, W * 0.7, H * 0.3, 500);
        neb.addColorStop(0, 'rgba(46,196,182,.25)'); neb.addColorStop(1, 'rgba(6,11,26,0)');
        c.fillStyle = neb; c.fillRect(0, 0, W, H);
        for (const s of this.stars) {
          const x = ((s.x - cam.x * s.z * 0.1) % W + W) % W, y = ((s.y - cam.y * s.z * 0.1) % H + H) % H;
          c.fillStyle = `rgba(255,255,255,${0.3 + s.z * 0.7 * (0.7 + Math.sin(this.t * 0.05 + s.x) * 0.3)})`;
          c.fillRect(x, y, s.z * 2.2, s.z * 2.2);
        }
        const px = -cam.x * 0.04, py = -cam.y * 0.03;
        const eg = c.createRadialGradient(220 + px, 820 + py, 50, 250 + px, 860 + py, 420);
        eg.addColorStop(0, '#48cae4'); eg.addColorStop(0.6, '#1d6fa3'); eg.addColorStop(1, '#0b2545');
        c.fillStyle = eg; c.beginPath(); c.arc(250 + px, 860 + py, 400, 0, TAU); c.fill();
        c.fillStyle = 'rgba(56,176,0,.5)'; c.beginPath(); c.ellipse(180 + px, 560 + py, 90, 40, 0.4, 0, TAU); c.fill(); c.beginPath(); c.ellipse(390 + px, 620 + py, 60, 30, -0.3, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(180,200,230,.35)'; c.lineWidth = 10;
        c.beginPath(); c.ellipse(W * 0.75 + px * 2, 170 + py * 2, 150, 40, 0, 0, TAU); c.stroke();
        c.save(); c.translate(W * 0.75 + px * 2, 170 + py * 2); c.rotate(this.t * 0.004);
        c.strokeStyle = 'rgba(180,200,230,.5)'; c.lineWidth = 3;
        for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 40); c.stroke(); }
        c.restore();
      },
      drawStage(c) {
        const s = this.solids[0];
        c.fillStyle = '#394a63';
        c.beginPath(); c.moveTo(s.x + 30, s.y + 40); c.lineTo(s.x + s.w - 30, s.y + 40); c.lineTo(s.x + s.w - 160, s.y + 150); c.lineTo(s.x + 160, s.y + 150); c.closePath(); c.fill();
        c.fillStyle = '#1b263b'; c.fillRect(-30, s.y + 150, 60, 60);
        c.fillStyle = `rgba(72,202,228,${0.6 + Math.sin(this.t * 0.2) * 0.3})`; c.beginPath(); c.arc(0, s.y + 215, 14, 0, TAU); c.fill();
        drawSlab(c, s, '#c9d6e8', '#6c7a91', '#48cae4');
        c.fillStyle = 'rgba(72,202,228,.7)';
        for (let x = s.x + 30; x < s.x + s.w - 40; x += 80) c.fillRect(x, s.y + 28, 30, 5);
        for (const p of this.plats) {
          drawPlat(c, p, '#aebed4', '#48cae4');
          c.fillStyle = `rgba(72,202,228,${0.35 + Math.random() * 0.2})`; c.beginPath(); c.moveTo(p.x + 30, p.y + 14); c.lineTo(p.x + p.w - 30, p.y + 14); c.lineTo(p.x + p.w / 2, p.y + 44); c.closePath(); c.fill();
        }
        if (this.zeroG > 0) { c.fillStyle = `rgba(72,202,228,${0.08 + Math.sin(this.t * 0.1) * 0.05})`; c.fillRect(-1400, -1100, 2800, 1800); }
      },
      drawFG() {},
    };
  },
};
