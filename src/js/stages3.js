'use strict';
// ============================================================
//  ESCENARIOS NUEVOS: Canales de Xochimilco y la Pirámide del Sol
//  (mundo gigante con terrazas, templo y Quetzalcóatl)
// ============================================================
STAGE_INFO.push(
  { id: 'xochi', name: 'Canales de Xochimilco', desc: 'Una trajinera que se mece; otras pasan a los lados y un ajolote gigante salpica la cubierta.', song: 'ship' },
  { id: 'pyramid', name: 'Pirámide del Sol', desc: 'Mundo gigante: cuatro terrazas, el templo en la cima y Quetzalcóatl cruzando el cielo.', song: 'temple', big: true },
);

// trajinera: casco pintado, cubierta de tablones, postes, techo y arco de flores con su nombre
function drawTrajinera(c, x, y, w, name, seed, opt = {}) {
  const r = srand(seed), hullH = opt.hullH || 34, cols = opt.cols || ['#d62828', '#f4a300', '#1b9e77', '#2a6fdb', '#e76f8a'];
  // casco
  c.fillStyle = '#1a120c'; c.beginPath(); c.moveTo(x - 10, y - 2); c.lineTo(x + w + 10, y - 2); c.lineTo(x + w - 14, y + hullH + 2); c.lineTo(x + 14, y + hullH + 2); c.closePath(); c.fill();
  const sw = (w - 24) / cols.length;
  for (let i = 0; i < cols.length; i++) {
    const g = c.createLinearGradient(0, y, 0, y + hullH); g.addColorStop(0, shade(cols[i], 0.12)); g.addColorStop(1, shade(cols[i], -0.35));
    c.fillStyle = g; c.beginPath();
    const x0 = x + 12 + i * sw, x1 = x0 + sw;
    const lx = t => t === 0 ? x - 6 : x0, rx = t => t === cols.length - 1 ? x + w + 6 : x1;
    c.moveTo(lx(i), y); c.lineTo(rx(i), y); c.lineTo(i === cols.length - 1 ? x + w - 16 : x1, y + hullH); c.lineTo(i === 0 ? x + 16 : x0, y + hullH); c.closePath(); c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(x - 6, y + 2, w + 12, 3);
  c.fillStyle = '#f4efe8'; c.fillRect(x - 8, y - 4, w + 16, 5);
  // flores pintadas en el casco
  for (let i = 0; i < Math.floor(w / 60); i++) { const fx = x + 30 + i * 60 + r() * 10, fy = y + hullH * 0.55; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(fx + Math.cos(a) * 4, fy + Math.sin(a) * 4, 3, 0, TAU); c.fill(); } c.fillStyle = '#e63946'; c.beginPath(); c.arc(fx, fy, 2.5, 0, TAU); c.fill(); }
  if (opt.noRoof) return;
  // postes y techo
  const roofY = y - (opt.roofH || 200);
  c.fillStyle = '#3b2616'; for (const px of [x + 30, x + w / 2 - 4, x + w - 38]) { c.fillRect(px, roofY + 10, 8, y - roofY - 10); c.fillStyle = 'rgba(255,230,190,.25)'; c.fillRect(px + 5, roofY + 10, 2, y - roofY - 10); c.fillStyle = '#3b2616'; }
  c.fillStyle = '#10131a'; roundRect(c, x + 6, roofY - 2, w - 12, 18, 4); c.fill();
  const rg = c.createLinearGradient(0, roofY, 0, roofY + 14); rg.addColorStop(0, '#f6d365'); rg.addColorStop(1, '#c9851c');
  c.fillStyle = rg; roundRect(c, x + 8, roofY, w - 16, 14, 3); c.fill();
  for (let i = 0; i < (w - 16) / 22; i++) { c.fillStyle = cols[i % cols.length]; c.beginPath(); c.moveTo(x + 8 + i * 22, roofY + 14); c.lineTo(x + 19 + i * 22, roofY + 26); c.lineTo(x + 30 + i * 22, roofY + 14); c.closePath(); c.fill(); }
  // arco de flores con el nombre
  if (name) {
    const ax = x + w / 2, ay = roofY - 20;
    c.fillStyle = '#10131a'; roundRect(c, ax - 98, ay - 30, 196, 40, 18); c.fill();
    c.fillStyle = '#fff7e6'; roundRect(c, ax - 95, ay - 27, 190, 34, 16); c.fill();
    for (let i = 0; i < 22; i++) { const a = Math.PI + i / 21 * Math.PI, fx = ax + Math.cos(a) * 104, fy = ay - 10 + Math.sin(a) * 30; c.fillStyle = cols[i % cols.length]; c.beginPath(); c.arc(fx, fy, 6, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(fx - 1.5, fy - 1.5, 2, 0, TAU); c.fill(); }
    c.font = `700 22px ${FONT_DISPLAY}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#c1121f'; c.fillText(name, ax, ay - 9);
  }
}

STAGE_DEFS.xochi = () => {
  const bob = (amp, sp, ph) => (t, s) => [s.bx, s.by + Math.sin(t * sp + ph) * amp];
  return {
    name: 'Canales de Xochimilco', song: 'ship',
    blast: { l: -1420, r: 1420, t: -1080, b: 700 }, cam: { l: -1060, r: 1060, t: -820, b: 430 },
    solids: [surf(-520, 0, 1040, 70, { ledge: 1, boat: 1, move: bob(5, 0.021, 0) })],
    plats: [
      surf(-230, -200, 460, 14, { plat: 1, canopy: 1, move: bob(5, 0.021, 0) }),
      surf(-940, 12, 250, 14, { plat: 1, side: 1, move: (t, s) => [s.bx + Math.sin(t * 0.0045) * 170, s.by + Math.sin(t * 0.03 + 1) * 4] }),
      surf(690, 12, 250, 14, { plat: 1, side: 2, move: (t, s) => [s.bx - Math.sin(t * 0.0045) * 170, s.by + Math.sin(t * 0.03 + 2) * 4] }),
    ],
    light: { dir: [0.8, -0.6], rim: '#ffcf9a', rimA: 0.6, shade: 'rgba(40,30,70,.32)', amb: 'rgba(255,170,120,.05)' },
    grade: { bloom: 0.2, bloomPow: 3, top: 'rgba(40,80,150,.25)', bottom: 'rgba(120,70,60,.2)', vig: 0.55 },
    nextSplash: 780, axo: null,
    update() {
      // el ajolote gigante sale del agua y avienta una ola por la cubierta
      if (!this.axo) {
        if (--this.nextSplash === 100) { this.axoSide = pick([-1, 1]); warnBanner(this.axoSide < 0 ? '← ¡Salpicón del ajolote gigante!' : '¡Salpicón del ajolote gigante! →', '#ff8fab'); }
        if (this.nextSplash <= 0) { this.axo = { t: 0, side: this.axoSide }; Audio8.sfx('splash'); }
        return;
      }
      const a = this.axo; a.t++;
      if (a.t === 40) {
        Audio8.sfx('splash'); shake(5);
        const fy = this.solids[0].y;
        spawnProjectile(null, { type: 'wave', x: a.side * 500, y: fy - 22, vx: -a.side * 9.5, vy: 0, r: 30, life: 125, dmg: 6, ang: 55, bkb: 9, kbg: 3, ground: 1, pierce: 1, reflect: 0, col: '#a9def9' });
        for (let i = 0; i < 10; i++) spawnFx('spark', a.side * 600 + rand(-40, 40), fy + rand(0, 30), { col: '#e6f8ff' });
      }
      if (a.t > 110) { this.axo = null; this.nextSplash = randi(900, 1300); }
    },
    drawBG(c, cam) {
      const t = this.t;
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#4d7fb3'); g.addColorStop(0.45, '#9dbcd4'); g.addColorStop(0.72, '#f3c89a'); g.addColorStop(1, '#f8dcb2');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      ART.drawGlow(c, W * 0.2, H * 0.38, 380, '#ffb070', 0.45); ART.drawGlow(c, W * 0.2, H * 0.38, 120, '#fff1c8', 0.9);
      c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(W * 0.2, H * 0.38, 26, 0, TAU); c.fill();
      // Popocatépetl e Iztaccíhuatl a lo lejos
      const volc = ART.layer('xochi-volc', 2200, 720, (x, w) => {
        const hz = x.createLinearGradient(0, 200, 0, 520); hz.addColorStop(0, 'rgba(150,150,190,.9)'); hz.addColorStop(1, 'rgba(210,170,170,.9)');
        x.fillStyle = hz;
        x.beginPath(); x.moveTo(300, 520); x.lineTo(760, 250); x.quadraticCurveTo(800, 232, 840, 250); x.lineTo(1250, 520); x.closePath(); x.fill();
        x.beginPath(); x.moveTo(1000, 520); x.quadraticCurveTo(1200, 330, 1360, 318); x.quadraticCurveTo(1500, 300, 1620, 330); x.quadraticCurveTo(1760, 345, 1900, 520); x.closePath(); x.fill();
        x.fillStyle = 'rgba(255,250,245,.9)';
        x.beginPath(); x.moveTo(705, 283); x.lineTo(760, 250); x.quadraticCurveTo(800, 232, 840, 250); x.lineTo(895, 285); x.lineTo(850, 300); x.lineTo(820, 280); x.lineTo(790, 305); x.lineTo(760, 285); x.lineTo(730, 300); x.closePath(); x.fill();
        x.beginPath(); x.moveTo(1250, 340); x.quadraticCurveTo(1360, 312, 1450, 312); x.quadraticCurveTo(1560, 305, 1680, 338); x.lineTo(1600, 350); x.lineTo(1520, 336); x.lineTo(1440, 352); x.lineTo(1360, 338); x.closePath(); x.fill();
        x.fillStyle = 'rgba(230,230,240,.5)'; x.beginPath(); x.ellipse(800, 220, 40, 14, -0.2, 0, TAU); x.fill();
        const hz2 = x.createLinearGradient(0, 380, 0, 560); hz2.addColorStop(0, 'rgba(250,215,180,0)'); hz2.addColorStop(1, 'rgba(250,215,180,.85)');
        x.fillStyle = hz2; x.fillRect(0, 380, w, 340);
      });
      ART.drawLayer(c, volc, cam, 0.03, 0);
      // chinampas con ahuejotes (árboles altos y delgados) y casitas
      const chin = ART.layer('xochi-chin', 2400, 720, (x, w) => {
        const r = srand(31);
        for (let i = 0; i < 60; i++) {
          const tx = i * 40 + r() * 20, th = 110 + r() * 90, ty = 470;
          const tg = x.createLinearGradient(tx - 10, 0, tx + 10, 0); tg.addColorStop(0, '#3f6b3a'); tg.addColorStop(1, '#6f9a52');
          x.fillStyle = tg; x.beginPath(); x.ellipse(tx, ty - th / 2, 9 + r() * 5, th / 2, 0, 0, TAU); x.fill();
        }
        for (let i = 0; i < 9; i++) { const hx = 100 + i * 260 + r() * 80; x.fillStyle = ['#e9c46a', '#e76f51', '#f4a261', '#8ecae6'][i % 4]; x.fillRect(hx, 440, 60, 34); x.fillStyle = '#7a3e2c'; x.beginPath(); x.moveTo(hx - 6, 442); x.lineTo(hx + 30, 420); x.lineTo(hx + 66, 442); x.closePath(); x.fill(); x.fillStyle = 'rgba(40,30,20,.6)'; x.fillRect(hx + 22, 452, 14, 22); }
        x.fillStyle = '#51743f'; x.fillRect(0, 468, w, 24);
        const hz = x.createLinearGradient(0, 300, 0, 500); hz.addColorStop(0, 'rgba(250,215,180,0)'); hz.addColorStop(1, 'rgba(250,210,175,.45)');
        x.globalCompositeOperation = 'source-atop'; x.fillStyle = hz; x.fillRect(0, 0, w, 720);
      });
      ART.drawLayer(c, chin, cam, 0.07, 0);
      // canal con trajineras amarradas del otro lado
      const moored = ART.layer('xochi-moored', 2600, 720, (x, w) => {
        const wg = x.createLinearGradient(0, 488, 0, 720); wg.addColorStop(0, '#6d9bb8'); wg.addColorStop(1, '#3b6a7f');
        x.fillStyle = wg; x.fillRect(0, 488, w, 232);
        const names = ['LUPITA', 'XÓCHITL', 'MI JUANITA', 'LA GÜERA', 'EL CHARRO', 'AMOR'];
        for (let i = 0; i < 6; i++) { x.save(); x.translate(80 + i * 430, 520); x.scale(0.5, 0.5); drawTrajinera(x, 0, 0, 520, names[i], 60 + i, { roofH: 150 }); x.restore(); }
      });
      ART.drawLayer(c, moored, cam, 0.12, 10);
      // brillos del sol en el agua
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 24; i++) { const x = (i * 97 + t * 0.6) % W, y = H * 0.78 + (i % 6) * 14 - cam.y * 0.05; c.fillStyle = `rgba(255,230,180,${0.12 + 0.1 * Math.sin(t * 0.08 + i)})`; c.fillRect(x, y, 22 + (i % 3) * 8, 2); }
      c.restore();
    },
    drawStage(c) {
      const t = this.t, s = this.solids[0], dy = s.y - s.by;
      // agua del canal (debajo de todo)
      const wy = 46;
      const wg = c.createLinearGradient(0, wy, 0, 900); wg.addColorStop(0, '#5f94ad'); wg.addColorStop(0.4, '#3e6f82'); wg.addColorStop(1, '#1d3b47');
      c.fillStyle = wg; c.fillRect(-2600, wy, 5200, 1000);
      // reflejo de la trajinera
      c.save(); c.globalAlpha = 0.22; c.translate(0, wy * 2 + 40); c.scale(1, -0.55); drawTrajinera(c, s.x, 20, s.w, null, 5); c.restore();
      c.strokeStyle = 'rgba(230,248,255,.35)'; c.lineWidth = 2;
      for (let i = 0; i < 26; i++) { const x = -2400 + ((i * 197 + t * 0.8) % 4800), y = wy + 10 + (i % 7) * 18; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 20, y - 3, x + 40, y); c.stroke(); }
      // lirios y flores de cempasúchil flotando
      for (let i = 0; i < 16; i++) { const x = -1800 + ((i * 263 + t * 0.35) % 3600), y = wy + 16 + (i % 5) * 26; c.fillStyle = '#2d6a4f'; c.beginPath(); c.ellipse(x, y, 16, 5, 0, 0.3, TAU); c.fill(); if (i % 3 === 0) { c.fillStyle = '#ff9f1c'; c.beginPath(); c.arc(x + 4, y - 3, 4, 0, TAU); c.fill(); } }
      // ajolote gigante
      if (this.axo) {
        const a = this.axo, k = Math.min(1, a.t / 30) * (a.t > 80 ? Math.max(0, 1 - (a.t - 80) / 30) : 1), ax = a.side * 700, ay = wy + 40 - k * 150;
        c.save(); c.translate(ax, ay); c.scale(-a.side * 3, 3);
        c.fillStyle = '#10131a'; c.beginPath(); c.ellipse(0, 0, 36, 26, 0, 0, TAU); c.fill();
        c.fillStyle = '#f2a7bb'; c.beginPath(); c.ellipse(0, 0, 34, 24, 0, 0, TAU); c.fill();
        for (const [gx, gy, ga] of [[-26, -14, -2.4], [-30, -2, -3.0], [-26, 10, 2.6], [26, -14, -0.7], [30, -2, -0.1], [26, 10, 0.5]]) { c.strokeStyle = '#e0526f'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + Math.cos(ga) * 16, gy + Math.sin(ga) * 16); c.stroke(); }
        c.fillStyle = '#1b1418'; c.beginPath(); c.arc(-12, -6, 3.5, 0, TAU); c.arc(12, -6, 3.5, 0, TAU); c.fill();
        c.strokeStyle = '#7a2d3e'; c.lineWidth = 2; c.beginPath(); c.arc(0, 2, 14, 0.2, Math.PI - 0.2); c.stroke();
        c.restore();
        c.fillStyle = 'rgba(230,248,255,.7)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(ax + rand(-60, 60), wy + rand(0, 10), rand(3, 7), 0, TAU); c.fill(); }
      }
      // trajineras laterales (plataformas)
      for (const p of this.plats) if (p.side) { drawTrajinera(c, p.x, p.y, p.w, null, 10 + p.side, { noRoof: true, hullH: 26, cols: p.side === 1 ? ['#2a6fdb', '#f4a300', '#e63946'] : ['#1b9e77', '#e76f8a', '#f4a300'] }); c.fillStyle = '#8a5a36'; c.fillRect(p.x + 4, p.y - 2, p.w - 8, 5); }
      // la trajinera principal: cubierta de tablones, casco y techo (el techo es la plataforma)
      c.save(); c.translate(0, dy);
      const deckY = s.by;
      const pat = ART.pattern(c, 'xochi-planks', 64, (x, y) => { const n = vnoise2(x / 8, y / 2, 5, [8, 32]) * 0.5 + (y % 16 < 1 ? -0.4 : 0) + (x % 64 < 1 ? -0.3 : 0); return mixRGB([150, 98, 60], n > 0 ? [205, 150, 100] : [70, 44, 28], Math.abs(n) * 0.8); });
      c.fillStyle = pat; c.fillRect(s.bx - 6, deckY - 8, s.w + 12, 10);
      drawTrajinera(c, s.bx, deckY + 2, s.w, 'GOLPAZO', 3, { roofH: 202 });
      // mesa con comida y banquitas
      c.fillStyle = '#10131a'; c.fillRect(-120, deckY - 40, 240, 8); c.fillRect(-100, deckY - 34, 8, 34); c.fillRect(92, deckY - 34, 8, 34);
      c.fillStyle = '#f4efe8'; c.fillRect(-118, deckY - 42, 236, 4);
      for (const [fx, col] of [[-70, '#e63946'], [-20, '#f4a300'], [40, '#2dc653'], [80, '#8a5a36']]) { c.fillStyle = col; c.beginPath(); c.ellipse(fx, deckY - 46, 12, 5, 0, 0, TAU); c.fill(); }
      c.restore();
    },
    drawFG(c) {
      // tules en la orilla de enfrente
      const t = this.t;
      for (let i = 0; i < 40; i++) {
        const side = i < 20 ? -1 : 1, x = side * (1150 + (i % 20) * 22), h = 90 + (i * 37) % 70, sway = Math.sin(t * 0.02 + i) * 6;
        c.strokeStyle = i % 2 ? '#3f6b3a' : '#5d8a44'; c.lineWidth = 4; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x, 120); c.quadraticCurveTo(x + sway * 0.5, 120 - h * 0.6, x + sway, 120 - h); c.stroke();
        if (i % 4 === 0) { c.fillStyle = '#6b4226'; c.beginPath(); c.ellipse(x + sway, 120 - h - 10, 4, 12, 0, 0, TAU); c.fill(); }
      }
    },
  };
};

// ================================================================
//  PIRÁMIDE DEL SOL — mundo gigante de terrazas
// ================================================================
STAGE_DEFS.pyramid = () => {
  const tiers = [
    surf(-300, -170, 600, 205, { ledge: 1, tier: 3 }),
    surf(-640, 35, 1280, 205, { ledge: 1, tier: 2 }),
    surf(-1020, 240, 2040, 205, { ledge: 1, tier: 1 }),
    surf(-1500, 445, 3000, 400, { ledge: 1, tier: 0 }),
  ];
  const slab = (x, y, ph) => surf(x, y, 190, 14, { plat: 1, glyph: 1, move: (t, s) => [s.bx, s.by + Math.sin(t * 0.02 + ph) * 18] });
  return {
    name: 'Pirámide del Sol', song: 'temple', big: true, zoomMin: 0.27,
    blast: { l: -2450, r: 2450, t: -1300, b: 1300 }, cam: { l: -2050, r: 2050, t: -1300, b: 1050 },
    solids: tiers,
    plats: [surf(-165, -385, 330, 14, { plat: 1, roof: 1 }), slab(-1330, 40, 0), slab(1140, 40, 2), slab(-860, -170, 1), slab(670, -170, 3)],
    light: { dir: [-0.75, -0.66], rim: '#fff1c8', rimA: 0.7, shade: 'rgba(60,40,30,.34)', amb: 'rgba(255,200,140,.05)' },
    grade: { bloom: 0.22, bloomPow: 3, top: 'rgba(40,90,170,.2)', bottom: 'rgba(160,90,40,.22)', vig: 0.5 },
    nextSerp: 900, serp: null,
    update() {
      // Quetzalcóatl cruza a la altura de una terraza
      if (!this.serp) {
        if (--this.nextSerp === 130) {
          this.serpDir = pick([-1, 1]); this.serpY = pick([140, -60, -270, -470]);
          warnBanner(this.serpDir > 0 ? '¡Quetzalcóatl! →' : '← ¡Quetzalcóatl!', '#2ec4b6');
        }
        if (this.nextSerp <= 0) { this.serp = { x: this.serpDir > 0 ? -2800 : 2800, y: this.serpY, dir: this.serpDir, t: 0 }; Audio8.sfx('wind'); }
        return;
      }
      const sp = this.serp; sp.t++; sp.x += sp.dir * 21;
      if (sp.t % 8 === 0) shake(1.2);
      for (let k = 0; k < 14; k++) {
        const px = sp.x - sp.dir * k * 46, py = sp.y + Math.sin(sp.t * 0.12 - k * 0.55) * 34;
        for (const f of BATTLE.fighters) {
          if (f.dead || f.intangibleToStage() || (f.serpCd || 0) > sp.t) continue;
          const hb = f.hurtbox();
          if (circleRect(px, py, k === 0 ? 46 : 32, hb.x, hb.y, hb.w, hb.h)) { f.serpCd = sp.t + 50; applyHit(null, f, { dmg: 12, ang: 65, bkb: 11, kbg: 6, sfx: 'bighit' }, sp.dir, { unblockable: true }); }
        }
      }
      if (Math.abs(sp.x) > 3600) { this.serp = null; this.nextSerp = randi(1200, 1700); for (const f of BATTLE.fighters) f.serpCd = 0; }
    },
    drawBG(c, cam) {
      const t = this.t;
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#2f6fb3'); g.addColorStop(0.45, '#7fb2dc'); g.addColorStop(0.75, '#f0d7a6'); g.addColorStop(1, '#f7e3bb');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      if (this.serp) { c.fillStyle = 'rgba(20,40,60,.12)'; c.fillRect(0, 0, W, H); }
      ART.drawGlow(c, W * 0.18, H * 0.16, 460, '#ffe0a0', 0.5); ART.drawGlow(c, W * 0.18, H * 0.16, 130, '#fffbe8', 0.95);
      c.fillStyle = '#fffdf4'; c.beginPath(); c.arc(W * 0.18, H * 0.16, 30, 0, TAU); c.fill();
      SC.rays(c, W * 0.18, H * 0.16, 8, 900, '#fff0c0', t, 0.05, 0.12);
      // sierra lejana
      const far = ART.layer('pyr-far', 2200, 720, (x, w) => {
        x.fillStyle = '#9fb3c8'; ART.ridge(x, w, 470, 150, 13, 380, 6, true); x.fill();
        const hz = x.createLinearGradient(0, 300, 0, 520); hz.addColorStop(0, 'rgba(240,215,170,0)'); hz.addColorStop(1, 'rgba(240,215,170,.9)');
        x.fillStyle = hz; x.fillRect(0, 300, w, 420);
        x.fillStyle = '#c3b69c'; ART.ridge(x, w, 520, 80, 17, 240, 5); x.fill();
      });
      ART.drawLayer(c, far, cam, 0.03, 0);
      // Calzada de los Muertos con la Pirámide de la Luna y templos
      const ave = ART.layer('pyr-avenue', 2400, 720, (x, w) => {
        const r = srand(51);
        const pyr = (cx, base, bw, levels, col) => {
          for (let i = 0; i < levels; i++) {
            const ww = bw * (1 - i / (levels + 0.6)), hh = 22, y = base - i * hh;
            const gg = x.createLinearGradient(cx - ww / 2, 0, cx + ww / 2, 0); gg.addColorStop(0, shade(col, 0.12)); gg.addColorStop(0.6, col); gg.addColorStop(1, shade(col, -0.2));
            x.fillStyle = gg; x.beginPath(); x.moveTo(cx - ww / 2, y); x.lineTo(cx - ww / 2 + 8, y - hh); x.lineTo(cx + ww / 2 - 8, y - hh); x.lineTo(cx + ww / 2, y); x.closePath(); x.fill();
            x.fillStyle = 'rgba(60,40,30,.25)'; x.fillRect(cx - ww / 2 + 8, y - hh + 12, ww - 16, 3);
          }
          x.fillStyle = 'rgba(80,60,50,.35)'; x.fillRect(cx - 8, base - levels * 22, 16, levels * 22);
        };
        pyr(1500, 500, 520, 5, '#b89b7a');
        for (let i = 0; i < 10; i++) { const cx = 150 + i * 230 + r() * 40; if (Math.abs(cx - 1500) < 330) continue; pyr(cx, 500, 110 + r() * 60, 2 + Math.floor(r() * 2), '#a98d6d'); }
        x.fillStyle = '#c7ab83'; x.fillRect(0, 498, w, 40);
        const hz = x.createLinearGradient(0, 380, 0, 540); hz.addColorStop(0, 'rgba(245,220,175,0)'); hz.addColorStop(1, 'rgba(245,220,175,.55)');
        x.globalCompositeOperation = 'source-atop'; x.fillStyle = hz; x.fillRect(0, 0, w, 720);
      });
      ART.drawLayer(c, ave, cam, 0.07, 0);
      // lomas con magueyes y nopales
      const near = ART.layer('pyr-near', 2600, 720, (x, w) => {
        const r = srand(77);
        x.fillStyle = '#b79a6b'; ART.ridge(x, w, 600, 60, 23, 300, 4); x.fill();
        for (let i = 0; i < 40; i++) {
          const mx = r() * w, my = 560 + r() * 60, s = 0.6 + r() * 0.6;
          if (i % 3) { x.fillStyle = i % 2 ? '#5e7f5a' : '#6f9269'; for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.32; x.beginPath(); x.moveTo(mx - 4 * s, my); x.quadraticCurveTo(mx + Math.cos(a) * 20 * s, my + Math.sin(a) * 20 * s, mx + Math.cos(a) * 34 * s, my + Math.sin(a) * 34 * s); x.lineTo(mx + 4 * s, my); x.closePath(); x.fill(); } }
          else { x.fillStyle = '#4f7a4a'; for (const [dx, dy, rr] of [[0, -14, 10], [-10, -30, 8], [9, -32, 8]]) { x.beginPath(); x.ellipse(mx + dx * s, my + dy * s, rr * 0.7 * s, rr * s, 0, 0, TAU); x.fill(); } }
        }
      });
      ART.drawLayer(c, near, cam, 0.12, 20);
    },
    drawStage(c) {
      const t = this.t;
      // las terrazas se hornean una vez: talud (inclinado) y tablero (vertical con marco), estilo Teotihuacan
      const img = ART.bake('pyr-body', -1560, -560, 3120, 1420, (x) => {
        const r = srand(88);
        const stoneTex = ART.pattern(x, 'pyr-stone', 256, SC.rockTex('pyr', '#a8845f', '#6e5236', '#d8b88c', 0.05));
        for (let i = this.solids.length - 1; i >= 0; i--) {
          const s = this.solids[i], top = s.y, bot = i === 3 ? s.y + s.h : this.solids[i + 1].y;
          // talud
          x.fillStyle = stoneTex; x.beginPath(); x.moveTo(s.x - 26, bot); x.lineTo(s.x, top + 70); x.lineTo(s.x + s.w, top + 70); x.lineTo(s.x + s.w + 26, bot); x.closePath(); x.fill();
          SC.stoneBlocks(x, s.x, top + 72, s.w, bot - top - 72, 46, 22, 90 + i, '#9a7856');
          // tablero con marco (franja roja de pintura antigua)
          x.fillStyle = '#5a3f28'; x.fillRect(s.x - 4, top + 8, s.w + 8, 62);
          x.fillStyle = stoneTex; x.fillRect(s.x, top + 12, s.w, 54);
          x.fillStyle = 'rgba(150,40,30,.55)'; x.fillRect(s.x + 10, top + 24, s.w - 20, 30);
          x.fillStyle = '#6e5236'; x.fillRect(s.x + 10, top + 24, s.w - 20, 3); x.fillRect(s.x + 10, top + 51, s.w - 20, 3);
          // grecas en el tablero
          x.strokeStyle = 'rgba(240,210,160,.45)'; x.lineWidth = 3;
          for (let gx = s.x + 30; gx < s.x + s.w - 40; gx += 60) { x.beginPath(); x.moveTo(gx, top + 48); x.lineTo(gx, top + 30); x.lineTo(gx + 24, top + 30); x.lineTo(gx + 24, top + 42); x.lineTo(gx + 12, top + 42); x.stroke(); }
          // piso de la terraza con tierra y pasto seco
          x.fillStyle = '#c9a877'; x.fillRect(s.x, top, s.w, 10);
          x.fillStyle = 'rgba(255,240,210,.5)'; x.fillRect(s.x, top, s.w, 2);
          SC.grass(x, s.x + 4, s.x + s.w - 4, top, 60 + i, ['#9c8a4a', '#b5a05a', '#7f7440'], 7, 0.35);
          SC.aoLine(x, s.x, top + 70, s.w, 14, 0.35);
        }
        // escalinata central con alfardas y cabezas de serpiente emplumada al pie
        const sw = 180;
        for (let i = 0; i < 3; i++) {
          const s = this.solids[i], s2 = this.solids[i + 1], top = s.y, bot = s2.y, steps = 12;
          for (let k = 0; k < steps; k++) { const y = top + (bot - top) * k / steps, hh = (bot - top) / steps; x.fillStyle = k % 2 ? '#b89468' : '#a8845f'; x.fillRect(-sw / 2, y, sw, hh); x.fillStyle = 'rgba(255,240,210,.35)'; x.fillRect(-sw / 2, y, sw, 2); x.fillStyle = 'rgba(40,24,12,.25)'; x.fillRect(-sw / 2, y + hh - 2, sw, 2); }
          x.fillStyle = '#7d5d3f'; x.fillRect(-sw / 2 - 16, top, 16, bot - top); x.fillRect(sw / 2, top, 16, bot - top);
        }
        for (const sd of [-1, 1]) {
          const hx = sd * 108, hy = this.solids[3].y - 28;
          x.fillStyle = '#6f8f6a'; x.beginPath(); x.ellipse(hx, hy, 34, 26, 0, 0, TAU); x.fill();
          for (let k = 0; k < 9; k++) { const a = -Math.PI + k * Math.PI / 8; x.fillStyle = k % 2 ? '#2ec4b6' : '#e9c46a'; x.beginPath(); x.ellipse(hx + Math.cos(a) * 36, hy + Math.sin(a) * 30, 7, 14, a + Math.PI / 2, 0, TAU); x.fill(); }
          x.fillStyle = '#8fb08a'; x.beginPath(); x.ellipse(hx + sd * 14, hy + 6, 22, 16, 0, 0, TAU); x.fill();
          x.fillStyle = '#10131a'; x.beginPath(); x.arc(hx + sd * 10, hy - 6, 4, 0, TAU); x.fill();
          x.fillStyle = '#f4efe8'; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(hx + sd * (18 + k * 5), hy + 12); x.lineTo(hx + sd * (20 + k * 5), hy + 20); x.lineTo(hx + sd * (22 + k * 5), hy + 12); x.closePath(); x.fill(); }
        }
        // templo en la cima
        const s = this.solids[0], ty = s.y;
        x.fillStyle = '#6e5236'; x.fillRect(-170, ty - 212, 340, 16);
        const wall = x.createLinearGradient(-150, 0, 150, 0); wall.addColorStop(0, '#c9a57a'); wall.addColorStop(0.7, '#a8845f'); wall.addColorStop(1, '#7d5d3f');
        x.fillStyle = wall; x.fillRect(-150, ty - 196, 300, 196);
        x.fillStyle = '#2a1a10'; roundRect(x, -40, ty - 130, 80, 130, 6); x.fill();
        x.fillStyle = 'rgba(150,40,30,.6)'; x.fillRect(-150, ty - 190, 300, 26);
        x.strokeStyle = 'rgba(240,210,160,.55)'; x.lineWidth = 3; for (let gx = -130; gx < 130; gx += 44) { x.beginPath(); x.moveTo(gx, ty - 168); x.lineTo(gx, ty - 184); x.lineTo(gx + 20, ty - 184); x.lineTo(gx + 20, ty - 174); x.stroke(); }
        void r;
      }, 1);
      ART.blit(c, img);
      // braseros con fuego en las esquinas de cada terraza
      for (let i = 0; i < 4; i++) {
        const s = this.solids[i];
        for (const bx of [s.x + 26, s.x + s.w - 26]) {
          c.fillStyle = '#3b2616'; c.fillRect(bx - 12, s.y - 16, 24, 16); c.fillStyle = '#5a3f28'; c.fillRect(bx - 14, s.y - 20, 28, 5);
          const fl = 1 + Math.sin(t * 0.3 + bx) * 0.15;
          ART.drawGlow(c, bx, s.y - 30, 70, '#ff9f1c', 0.35);
          c.fillStyle = '#ff6d00'; c.beginPath(); c.moveTo(bx - 10, s.y - 20); c.quadraticCurveTo(bx - 8, s.y - 40 * fl, bx, s.y - 50 * fl); c.quadraticCurveTo(bx + 8, s.y - 40 * fl, bx + 10, s.y - 20); c.closePath(); c.fill();
          c.fillStyle = '#ffd166'; c.beginPath(); c.moveTo(bx - 5, s.y - 20); c.quadraticCurveTo(bx, s.y - 38 * fl, bx + 5, s.y - 20); c.closePath(); c.fill();
        }
      }
      // techo del templo y losas flotantes con glifos
      for (const p of this.plats) {
        if (p.roof) { c.fillStyle = '#10131a'; c.fillRect(p.x - 4, p.y - 2, p.w + 8, 18); c.fillStyle = '#8a6a48'; c.fillRect(p.x, p.y, p.w, 14); c.fillStyle = 'rgba(255,240,210,.4)'; c.fillRect(p.x, p.y, p.w, 2); continue; }
        c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 40, p.w * 0.4, 6, 0, 0, TAU); c.fill();
        c.fillStyle = '#10131a'; roundRect(c, p.x - 3, p.y - 3, p.w + 6, 30, 6); c.fill();
        const gg = c.createLinearGradient(0, p.y, 0, p.y + 26); gg.addColorStop(0, '#c9a57a'); gg.addColorStop(1, '#7d5d3f');
        c.fillStyle = gg; roundRect(c, p.x, p.y, p.w, 24, 5); c.fill();
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.05 + p.x);
        c.strokeStyle = withAlpha('#2ec4b6', 0.5 + pulse * 0.5); c.lineWidth = 2.5;
        for (let gx = p.x + 20; gx < p.x + p.w - 30; gx += 50) { c.beginPath(); c.moveTo(gx, p.y + 18); c.lineTo(gx, p.y + 7); c.lineTo(gx + 20, p.y + 7); c.lineTo(gx + 20, p.y + 13); c.lineTo(gx + 10, p.y + 13); c.stroke(); }
        ART.drawGlow(c, p.x + p.w / 2, p.y + 12, 90, '#2ec4b6', 0.15 + pulse * 0.1);
      }
    },
    drawFG(c) {
      // Quetzalcóatl: serpiente emplumada que ondula
      const sp = this.serp; if (!sp) return;
      const pts = [];
      for (let k = 0; k < 14; k++) pts.push([sp.x - sp.dir * k * 46, sp.y + Math.sin(sp.t * 0.12 - k * 0.55) * 34]);
      for (let k = pts.length - 1; k >= 1; k--) {
        const [x, y] = pts[k], rr = 30 - k * 1.2;
        for (let j = 0; j < 3; j++) { const a = Math.PI / 2 + (j - 1) * 0.6 + Math.sin(sp.t * 0.3 + k) * 0.2; c.fillStyle = j === 1 ? '#e9c46a' : '#2ec4b6'; c.beginPath(); c.ellipse(x + Math.cos(a) * rr, y - Math.sin(a) * rr * 1.2, 8, 20, -a + Math.PI / 2, 0, TAU); c.fill(); }
        c.fillStyle = '#10131a'; c.beginPath(); c.arc(x, y, rr + 3, 0, TAU); c.fill();
        const g = c.createLinearGradient(0, y - rr, 0, y + rr); g.addColorStop(0, '#3fb08a'); g.addColorStop(1, '#1d6b52');
        c.fillStyle = g; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill();
        c.fillStyle = k % 2 ? '#e9c46a' : '#e76f51'; c.beginPath(); c.ellipse(x, y + rr * 0.5, rr * 0.6, rr * 0.25, 0, 0, TAU); c.fill();
      }
      const [hx, hy] = pts[0];
      c.save(); c.translate(hx, hy); c.scale(sp.dir, 1);
      for (let j = 0; j < 7; j++) { const a = -Math.PI / 2 + (j - 3) * 0.35; c.fillStyle = ['#e63946', '#e9c46a', '#2ec4b6'][j % 3]; c.beginPath(); c.ellipse(-20 + Math.cos(a) * 44, Math.sin(a) * 44, 9, 26, a + Math.PI / 2, 0, TAU); c.fill(); }
      c.fillStyle = '#10131a'; c.beginPath(); c.ellipse(10, 0, 50, 36, 0, 0, TAU); c.fill();
      c.fillStyle = '#2f9e7a'; c.beginPath(); c.ellipse(10, 0, 47, 33, 0, 0, TAU); c.fill();
      c.fillStyle = '#1d6b52'; c.beginPath(); c.moveTo(20, 8); c.lineTo(70, 14); c.lineTo(20, 26); c.closePath(); c.fill();
      c.fillStyle = '#f4efe8'; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(30 + k * 9, 12); c.lineTo(34 + k * 9, 22); c.lineTo(38 + k * 9, 13); c.closePath(); c.fill(); }
      c.fillStyle = '#ffbe0b'; c.beginPath(); c.arc(24, -10, 7, 0, TAU); c.fill(); c.fillStyle = '#10131a'; c.fillRect(23, -16, 3, 12);
      c.restore();
    },
  };
};
