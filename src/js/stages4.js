'use strict';
// Escenario amplio para seis: pasarelas claras y una tormenta que avisa antes de golpear.
STAGE_INFO.push({ id: 'rain', name: 'Mirador de Lluvia',
  desc: 'Azotea amplia y pasarelas. Un rayo anunciado cae en un lado del mirador.', song: 'space' });

STAGE_DEFS.rain = () => ({
  name: 'Mirador de Lluvia', song: 'space',
  solids: [surf(-650, 0, 1300, 90, { ledge: 1 })],
  plats: [
    surf(-490, -160, 260, 16, { plat: 1 }),
    surf(-130, -285, 260, 16, { plat: 1 }),
    surf(230, -160, 260, 16, { plat: 1 }),
  ],
  boltTimer: 1800, boltWarn: 0, boltSide: 0, boltFlash: 0, boltCount: 0,
  update() {
    if (this.boltFlash > 0) this.boltFlash--;
    if (this.boltCount >= 2) return;
    if (--this.boltTimer === 120) {
      this.boltSide = pick([-1, 1]); this.boltWarn = 120;
      warnBanner(this.boltSide < 0 ? '← ¡Rayo a la izquierda!' : '¡Rayo a la derecha! →', '#78edff');
    }
    if (this.boltWarn > 0) this.boltWarn--;
    if (this.boltTimer > 0) return;
    this.boltCount++; this.boltFlash = 22; this.boltTimer = 3600;
    Audio8.sfx('laser'); shake(7); flash(0.25);
    const x = this.boltSide * 370, zone = { x: x - 75, y: -650, w: 150, h: 650 };
    for (const f of BATTLE.fighters) {
      if (f.dead || f.intangibleToStage()) continue;
      if (rectRect(zone, f.hurtbox())) applyHit(null, f,
        { dmg: 10, ang: 82, bkb: 8, kbg: 7, effect: 'elec', sfx: 'laser' }, this.boltSide, { unblockable: true });
    }
  },
  drawBG(c, cam) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#101d37'); g.addColorStop(0.64, '#304966'); g.addColorStop(1, '#557c8d');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = '#d7e5f0'; c.beginPath(); c.arc(W * 0.78, 114, 30, 0, TAU); c.fill();
    for (let i = 0; i < 18; i++) {
      const x = ((i * 116 - cam.x * 0.08) % (W + 150) + W + 150) % (W + 150) - 70;
      const hh = 130 + (i * 47) % 170;
      c.fillStyle = i % 2 ? '#243a55' : '#29425b'; c.fillRect(x, H - hh, 95, hh);
      c.fillStyle = 'rgba(255,224,144,.32)';
      for (let k = 0; k < 3; k++) for (let j = 0; j < 5; j++) if ((i + k * 3 + j) % 4) c.fillRect(x + 10 + k * 25, H - hh + 18 + j * 23, 7, 10);
    }
    c.fillStyle = 'rgba(220,239,255,.18)';
    for (let i = 0; i < 70; i++) {
      const x = (i * 89 + this.t * 6) % (W + 50), y = (i * 127 + this.t * 11) % H;
      c.fillRect(x, y, 2, 13);
    }
    if (this.boltFlash > 0) { c.fillStyle = `rgba(225,249,255,${this.boltFlash / 80})`; c.fillRect(0, 0, W, H); }
  },
  drawStage(c) {
    const s = this.solids[0];
    drawSlab(c, s, '#80bed0', '#1c3349', '#426d86');
    c.fillStyle = '#8dcbd8'; c.fillRect(s.x, s.y - 12, s.w, 12);
    c.strokeStyle = '#a8d6e0'; c.lineWidth = 4;
    for (let x = s.x + 40; x < s.x + s.w; x += 80) { c.beginPath(); c.moveTo(x, s.y - 12); c.lineTo(x, s.y - 72); c.stroke(); }
    c.beginPath(); c.moveTo(s.x + 35, s.y - 72); c.lineTo(s.x + s.w - 35, s.y - 72); c.stroke();
    for (const p of this.plats) {
      drawPlat(c, p, '#355879', '#8ad6e3');
      c.fillStyle = '#a2e7ee'; c.fillRect(p.x + 18, p.y, p.w - 36, 3);
    }
    if (this.boltWarn || this.boltFlash) {
      const x = this.boltSide * 370;
      c.fillStyle = `rgba(120,237,255,${this.boltFlash ? 0.55 : 0.15 + 0.1 * Math.sin(this.t * 0.35)})`;
      c.fillRect(x - 75, -650, 150, 650);
      if (this.boltFlash) { c.fillStyle = '#e8ffff'; c.fillRect(x - 8, -650, 16, 650); }
    }
  },
  drawFG() {},
});
