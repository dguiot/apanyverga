'use strict';
// ============================================================
//  OBJETOS
// ============================================================
const ITEM_DEFS = {
  bat:    { name: 'Bate', kind: 'weapon', w: 3, throwDmg: 12 },
  sword:  { name: 'Espada láser', kind: 'weapon', w: 3, throwDmg: 10 },
  gun:    { name: 'Pistola de rayos', kind: 'weapon', w: 2.5, ammo: 14, throwDmg: 8 },
  bomb:   { name: 'Bomba', kind: 'throw', w: 3, throwDmg: 18 },
  heart:  { name: 'Corazón', kind: 'consume', w: 0.8 },
  taco:   { name: 'Taco', kind: 'consume', w: 2 },
  star:   { name: 'Estrella', kind: 'consume', w: 0.9 },
  shroom: { name: 'Champiñón', kind: 'consume', w: 1.2 },
  orb:    { name: 'Orbe Final', kind: 'orb', w: 0.7 },
};
const ITEM_FREQ = { 0: 0, 1: 1000, 2: 560, 3: 300 };

function updateItems() {
  const B = BATTLE, st = B.stage;
  // aparición
  const every = ITEM_FREQ[B.rules.items];
  if (every && B.phase === 'fight') {
    B.itemTimer = (B.itemTimer || every * 0.6) - 1;
    if (B.itemTimer <= 0) {
      B.itemTimer = every * rand(0.7, 1.3);
      if (B.items.length < 4) spawnRandomItem();
    }
  }
  for (const it of B.items) {
    it.t++;
    if (it.holder) continue;
    if (it.type === 'orb') {
      const t = it.t;
      it.x = it.ox + Math.sin(t * 0.013) * 380 + Math.sin(t * 0.031) * 120;
      it.y = it.oy + Math.sin(t * 0.021) * 110;
      it.hitCd = Math.max(0, (it.hitCd || 0) - 1);
      if (it.t > 1500) it.dead = true;
      continue;
    }
    const oy = it.y;
    it.vy = Math.min(it.vy + 0.55 * st.grav, 12);
    it.x += it.vx; it.y += it.vy;
    it.grounded = false;
    for (const s of st.surfaces()) {
      if (it.x < s.x || it.x > s.x + s.w) continue;
      if (oy <= s.y + 1 + Math.max(0, s.dy) && it.y >= s.y) {
        it.y = s.y; it.grounded = true;
        if (it.type === 'star') { it.vy = -11; }
        else { it.vy = 0; it.x += s.dx; }
        break;
      }
    }
    if (it.grounded && it.type !== 'star' && it.type !== 'shroom') it.vx *= 0.8;
    if (it.type === 'shroom' && it.grounded && !it.vx) it.vx = pick([-2, 2]);
    if (it.grounded) it.groundT = (it.groundT || 0) + 1;
    if (it.groundT > 900) it.dead = true;
    if (it.type === 'bomb' && it.groundT > 720) { explodeItem(it, null); }
    if (it.y > st.blast.b || it.x < st.blast.l || it.x > st.blast.r) it.dead = true;
    // consumibles al tocarlos
    if (ITEM_DEFS[it.type].kind === 'consume') {
      for (const f of B.fighters) {
        if (f.dead || f.stocks <= 0) continue;
        if (rectRect(f.hurtbox(), { x: it.x - 18, y: it.y - 34, w: 36, h: 34 })) { consumeItem(f, it); break; }
      }
    }
  }
  B.items = B.items.filter(i => !i.dead);
}

function spawnRandomItem(force) {
  const B = BATTLE, st = B.stage;
  const pool = [];
  for (const [k, d] of Object.entries(ITEM_DEFS)) {
    if (k === 'orb' && (B.items.some(i => i.type === 'orb') || B.fighters.some(f => f.finalReady || (f.move && f.move.def.final)))) continue;
    for (let i = 0; i < d.w * 10; i++) pool.push(k);
  }
  const type = force || pick(pool);
  const x = rand(st.left + 60, st.right - 60);
  const it = { type, x, y: st.top - 700, vx: 0, vy: 0, t: 0, holder: null, ammo: ITEM_DEFS[type].ammo || 0, hp: 30 };
  if (type === 'orb') { it.ox = 0; it.oy = st.top - 330; it.x = it.ox; it.y = it.oy; Audio8.sfx('orb'); banner('¡Apareció el ORBE FINAL!', '#ffbe0b'); }
  B.items.push(it);
  spawnFx('boom', it.x, type === 'orb' ? it.y : st.top - 40, { r: 40, col: '#ffd166' });
  return it;
}

function consumeItem(f, it) {
  it.dead = true;
  switch (it.type) {
    case 'heart': case 'taco': {
      const v = it.type === 'heart' ? 50 : 15, hpMode = BATTLE.rules.mode === 'hp';
      if (hpMode) f.hp = Math.min(f.maxHp, f.hp + v); else f.percent = Math.max(0, f.percent - v);
      Audio8.sfx('heal'); spawnFx('text', f.x, f.y - 130, { txt: hpMode ? `+${v}` : `-${v}%`, col: '#2dc653' }); break;
    }
    case 'star': f.starTime = 540; Audio8.sfx('star'); spawnFx('text', f.x, f.y - 130, { txt: '¡INVENCIBLE!', col: '#ffd166' }); break;
    case 'shroom': f.bigTime = 600; Audio8.sfx('grow'); spawnFx('text', f.x, f.y - 150, { txt: '¡GIGANTE!', col: '#e63946' }); break;
  }
  for (let i = 0; i < 12; i++) spawnFx('spark', f.x, f.y - 50, { col: '#ffd166' });
}

function explodeItem(it, owner) {
  it.dead = true; it.holder = null;
  const p = spawnProjectile(owner, { type: 'boom', x: it.x, y: it.y - 16, r: 1, life: 1, dmg: 18, ang: 60, bkb: 9, kbg: 11, col: '#ffbe0b' });
  explodeProj(p);
}

function nearbyItem(f, kinds, range = 56) {
  let best = null, bd = range;
  for (const it of BATTLE.items) {
    if (it.holder || it.dead || !kinds.includes(ITEM_DEFS[it.type].kind)) continue;
    const d = Math.hypot(it.x - f.x, (it.y - f.y) * 0.7);
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}

// Golpes a objetos (orbe final y bombas)
function hitItems(att, cx, cy, r, dmg) {
  for (const it of BATTLE.items) {
    if (it.holder || it.dead) continue;
    if (it.type === 'orb') {
      if (it.hitCd > 0 || dist(cx, cy, it.x, it.y) > r + 26) continue;
      it.hitCd = 10; it.hp -= dmg; it.ox += sign(it.x - att.x) * 40;
      Audio8.sfx('hit', 1.2); spawnFx('hit', it.x, it.y, { col: '#ffbe0b', r: 24 });
      if (it.hp <= 0) {
        it.dead = true; att.finalReady = true;
        Audio8.sfx('orb'); flash(0.6);
        banner(`¡${CHARS[att.id].name} tiene el GOLPE FINAL! (Especial)`, att.color);
        spawnFx('boom', it.x, it.y, { r: 160, col: '#ffbe0b' });
      }
    } else if (it.type === 'bomb') {
      if (dist(cx, cy, it.x, it.y - 14) < r + 16) explodeItem(it, att);
    }
  }
}

function throwItem(f, dx, dy, strong) {
  const it = f.item; if (!it) return;
  f.item = null; it.holder = null; it.dead = true;
  const d = ITEM_DEFS[it.type];
  let vx = dx * 17, vy = -3 + dy * 14;
  if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) { vx = f.face * 17; vy = -3; }
  if (dy < -0.5) { vx = dx * 4; vy = -19; }
  if (dy > 0.5) { vx = dx * 5; vy = f.grounded ? -8 : 16; } // abajo: al piso (en el aire, en picada)
  // lanzamiento fuerte (Smash): más rápido, más recto y pega más
  const k = strong ? 1.45 : 1;
  vx *= k; vy = strong && dy >= -0.5 && dy <= 0.5 ? -1.5 : vy * k;
  Audio8.sfx(strong ? 'bighit' : 'throw', strong ? 0.8 : 1);
  if (strong) spawnFx('shock', f.x + f.face * 30, f.y - 60, { col: '#ffd166' });
  spawnProjectile(f, {
    type: 'item', itemType: it.type, x: f.x + f.face * 24, y: f.y - 60, vx: vx + f.vx * 0.4, vy, grav: 0.5, r: 16, life: 140,
    dmg: d.throwDmg * (strong ? 1.3 : 1), ang: dy > 0.5 && !f.grounded ? 280 : it.type === 'bomb' ? 60 : 40, meteor: dy > 0.5 && !f.grounded ? 1 : 0, bkb: (it.type === 'bomb' ? 9 : 7) * (strong ? 1.2 : 1), kbg: (it.type === 'bomb' ? 11 : 8) * (strong ? 1.15 : 1), reflect: 1, trail: strong ? 1 : 0,
    explodeGround: it.type === 'bomb' ? 1 : 0,
    onGround: it.type === 'bomb' ? null : (p, s) => { p.life = 0; BATTLE.items.push({ type: p.itemType, x: p.x, y: s.y, vx: p.vx * 0.3, vy: 0, t: 0, holder: null, ammo: it.ammo, hp: 30 }); },
  });
}

function drawItems(c) {
  for (const it of BATTLE.items) {
    if (it.holder) continue;
    if (it.groundT > 780 && Math.floor(it.t / 4) % 2) continue;
    c.save(); c.translate(it.x, it.y);
    if (it.type === 'orb') {
      const pulse = 1 + Math.sin(it.t * 0.2) * 0.08;
      ART.drawGlow(c, 0, 0, 90 * pulse, '#ff7a1a', 0.7);
      const g = c.createRadialGradient(-6, -6, 2, 0, 0, 24 * pulse);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#ffe27a'); g.addColorStop(0.75, '#ff6a1a'); g.addColorStop(1, '#b3122a');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 24 * pulse, 0, TAU); c.fill();
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        c.save(); c.rotate(it.t * (0.05 + k * 0.02) + k * 2); c.scale(1, 0.35);
        c.strokeStyle = `rgba(255,${200 - k * 40},120,.8)`; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, 32 + k * 6, 0, Math.PI * 1.3); c.stroke();
        c.restore();
      }
      c.restore();
      c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.ellipse(-8, -9, 6, 3, -0.6, 0, TAU); c.fill();
    } else {
      if (it.grounded) { c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(0, 0, 20, 4.5, 0, 0, TAU); c.fill(); ART.drawGlow(c, 0, -14, 34, '#fff3c4', 0.18 + Math.sin(it.t * 0.1) * 0.06); }
      c.translate(0, -16 + (it.grounded ? Math.sin(it.t * 0.1) * 2 : 0));
      drawItemIcon(c, it.type, 0, 0, 1);
    }
    c.restore();
  }
}

// Icono dibujado en (x,y), centro del objeto. Materiales con volumen: madera,
// cromo, vidrio, energía; nada de siluetas planas.
function drawItemIcon(c, type, x, y, s = 1, inHand = false) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const O = 'rgba(12,14,22,.9)', now = performance.now();
  c.lineJoin = 'round'; c.lineCap = 'round';
  const lin = (x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([k, col]) => g.addColorStop(k, col)); return g; };
  switch (type) {
    case 'bat': {
      if (!inHand) c.rotate(-0.6);
      const path = pad => {
        c.beginPath(); c.moveTo(-2.4 - pad, 26); c.lineTo(-2.4 - pad, 8);
        c.quadraticCurveTo(-3 - pad, 0, -6.2 - pad, -14); c.lineTo(-6.4 - pad, -26); c.quadraticCurveTo(0, -33 - pad, 6.4 + pad, -26);
        c.lineTo(6.2 + pad, -14); c.quadraticCurveTo(3 + pad, 0, 2.4 + pad, 8); c.lineTo(2.4 + pad, 26); c.closePath();
      };
      path(1.1); c.fillStyle = O; c.fill();
      path(0); c.fillStyle = lin(-7, 0, 7, 0, [[0, '#7a4b24'], [0.3, '#d9a868'], [0.52, '#f6d9a6'], [0.7, '#c98f52'], [1, '#6a3d1c']]); c.fill();
      c.save(); path(0); c.clip();
      c.strokeStyle = 'rgba(110,62,26,.35)'; c.lineWidth = 0.6;
      for (const dx of [-3.5, -1.2, 1.6, 3.8]) { c.beginPath(); c.moveTo(dx * 0.4, 20); c.quadraticCurveTo(dx, -6, dx * 1.1, -30); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-1.8, -28, 1.4, 34);
      // cinta del mango
      c.fillStyle = '#1c1c22'; c.fillRect(-4, 9, 8, 17);
      c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1; for (let yy = 10; yy < 26; yy += 3) { c.beginPath(); c.moveTo(-4, yy + 2); c.lineTo(4, yy - 1); c.stroke(); }
      c.restore();
      c.fillStyle = '#b3202e'; c.beginPath(); c.ellipse(0, -16, 2.6, 4, 0, 0, TAU); c.fill();
      c.fillStyle = lin(-5, 0, 5, 0, [[0, '#3b2512'], [0.5, '#8a5a30'], [1, '#2a180a']]); c.beginPath(); c.ellipse(0, 27.5, 5.2, 2.6, 0, 0, TAU); c.fill();
      break;
    }
    case 'sword': {
      if (!inHand) c.rotate(-0.6);
      const fl = 0.85 + Math.sin(now / 45) * 0.08 + Math.sin(now / 13) * 0.05;
      // hoja de energía
      c.save(); c.globalCompositeOperation = 'lighter';
      c.fillStyle = `rgba(40,190,255,${0.22 * fl})`; roundRect(c, -9, -48, 18, 62, 9); c.fill();
      c.fillStyle = `rgba(60,210,255,${0.55 * fl})`; roundRect(c, -5, -44, 10, 56, 5); c.fill();
      c.fillStyle = `rgba(230,250,255,${0.95 * fl})`; roundRect(c, -2, -42, 4, 53, 2); c.fill();
      c.restore();
      // empuñadura cromada
      c.fillStyle = O; roundRect(c, -5.2, 9, 10.4, 20.5, 3); c.fill();
      c.fillStyle = lin(-4, 0, 4, 0, [[0, '#3b414e'], [0.35, '#e9eef5'], [0.55, '#9aa6b8'], [1, '#2a2f3a']]); roundRect(c, -4, 10, 8, 18, 2.5); c.fill();
      c.fillStyle = '#1b1f28'; for (let yy = 15; yy < 27; yy += 3) c.fillRect(-4, yy, 8, 1.3);
      c.fillStyle = lin(-7, 0, 7, 0, [[0, '#2a2f3a'], [0.5, '#c8d2e0'], [1, '#2a2f3a']]); roundRect(c, -6.5, 8, 13, 4, 1.5); c.fill();
      c.fillStyle = '#ff4d5e'; c.beginPath(); c.arc(0, 13.5, 1.3, 0, TAU); c.fill();
      break;
    }
    case 'gun': {
      // pistola de rayos retro: cuerpo cromado, aletas, bobinas de cobre y emisor encendido
      c.fillStyle = O; c.beginPath(); c.ellipse(-2, -3, 14.5, 8.5, 0, 0, TAU); c.fill(); c.fillRect(-9.5, 0, 9, 16.5); c.fillRect(8, -5.5, 12, 7);
      c.fillStyle = lin(0, -11, 0, 5, [[0, '#f2f6fb'], [0.35, '#aab6c8'], [0.7, '#5d6778'], [1, '#2c323d']]);
      c.beginPath(); c.ellipse(-2, -3, 13.4, 7.4, 0, 0, TAU); c.fill();
      c.fillStyle = lin(0, -5, 0, 1, [[0, '#dfe6ef'], [1, '#4a5363']]); c.fillRect(8, -4.5, 11, 5);
      c.fillStyle = '#c87533'; for (const xx of [10, 13.5, 17]) { c.fillRect(xx, -5.2, 1.8, 6.4); }
      c.fillStyle = 'rgba(255,220,180,.5)'; for (const xx of [10, 13.5, 17]) c.fillRect(xx, -5.2, 1.8, 1.4);
      c.fillStyle = '#5d6778'; c.beginPath(); c.moveTo(-10, -9); c.lineTo(-17, -15); c.lineTo(-13, -5); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-10, 3); c.lineTo(-17, 8); c.lineTo(-12, -1); c.closePath(); c.fill();
      c.fillStyle = lin(-9, 0, 0, 0, [[0, '#2a1a12'], [0.5, '#5a3726'], [1, '#2a1a12']]); roundRect(c, -8.5, 1, 7.5, 14.5, 2.5); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 0.8; for (let yy = 4; yy < 15; yy += 2.4) { c.beginPath(); c.moveTo(-8, yy); c.lineTo(-1.5, yy); c.stroke(); }
      c.strokeStyle = '#3a414d'; c.lineWidth = 1.4; c.beginPath(); c.arc(1.5, 4.5, 4, 0.2, Math.PI * 0.9); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(-4, -7.2, 7, 1.8, -0.1, 0, TAU); c.fill();
      const pulse = 0.7 + Math.sin(now / 90) * 0.3;
      c.save(); c.globalCompositeOperation = 'lighter';
      c.fillStyle = `rgba(90,220,255,${0.35 * pulse})`; c.beginPath(); c.arc(21, -2, 6, 0, TAU); c.fill();
      c.fillStyle = `rgba(210,250,255,${0.9 * pulse})`; c.beginPath(); c.arc(21, -2, 2.4, 0, TAU); c.fill();
      c.restore();
      break;
    }
    case 'bomb': {
      c.fillStyle = O; c.beginPath(); c.arc(0, 4, 17, 0, TAU); c.fill();
      const bg = c.createRadialGradient(-6, -3, 2, 0, 4, 17); bg.addColorStop(0, '#6b7280'); bg.addColorStop(0.35, '#2b2f3a'); bg.addColorStop(1, '#0b0d12');
      c.fillStyle = bg; c.beginPath(); c.arc(0, 4, 16, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-6, -4, 5, 2.8, -0.6, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(150,180,220,.35)'; c.lineWidth = 1.4; c.beginPath(); c.arc(0, 4, 14.5, 0.1, 1.3); c.stroke();
      // tapa metálica con remaches
      c.fillStyle = lin(-6, 0, 6, 0, [[0, '#3a3f4a'], [0.5, '#b9c2cf'], [1, '#3a3f4a']]); roundRect(c, -6, -15, 12, 7, 2); c.fill();
      c.fillStyle = '#1b1e25'; for (const xx of [-3.5, 0, 3.5]) { c.beginPath(); c.arc(xx, -11.5, 0.9, 0, TAU); c.fill(); }
      // mecha trenzada y chispa
      c.strokeStyle = '#8a6a44'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(0, -15); c.quadraticCurveTo(4, -24, 11, -22); c.stroke();
      c.strokeStyle = 'rgba(40,24,10,.6)'; c.lineWidth = 0.8; c.setLineDash([1.5, 1.5]); c.stroke(); c.setLineDash([]);
      c.save(); c.globalCompositeOperation = 'lighter';
      const sp = 0.7 + Math.random() * 0.3;
      c.fillStyle = `rgba(255,170,60,${0.5 * sp})`; c.beginPath(); c.arc(12, -22, 7 * sp, 0, TAU); c.fill();
      c.fillStyle = '#fff4c2'; c.beginPath(); c.arc(12, -22, 2.2, 0, TAU); c.fill();
      c.strokeStyle = '#ffd166'; c.lineWidth = 1; for (let i = 0; i < 5; i++) { const a = Math.random() * TAU, r = 4 + Math.random() * 6; c.beginPath(); c.moveTo(12, -22); c.lineTo(12 + Math.cos(a) * r, -22 + Math.sin(a) * r); c.stroke(); }
      c.restore();
      break;
    }
    case 'heart': {
      const hp = pad => { c.beginPath(); c.moveTo(0, 15 + pad); c.bezierCurveTo(-24 - pad, 0, -15 - pad, -24 - pad, 0, -10 + pad * 0.3); c.bezierCurveTo(15 + pad, -24 - pad, 24 + pad, 0, 0, 15 + pad); c.closePath(); };
      ART.drawGlow(c, 0, 0, 34, '#ff4d6d', 0.45 + Math.sin(now / 200) * 0.12);
      hp(1.1); c.fillStyle = O; c.fill();
      const g = c.createRadialGradient(-6, -8, 1, 0, 0, 22); g.addColorStop(0, '#ffb3c1'); g.addColorStop(0.35, '#ff3b5c'); g.addColorStop(0.8, '#b3102c'); g.addColorStop(1, '#6e0717');
      hp(0); c.fillStyle = g; c.fill();
      c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(-8, -9, 4.5, 2.4, -0.7, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,200,210,.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(6, 8); c.quadraticCurveTo(13, 2, 13, -6); c.stroke();
      break;
    }
    case 'taco': {
      // tortilla doblada con carne, cebolla, cilantro y salsa
      c.fillStyle = O; c.beginPath(); c.arc(0, 8, 21, Math.PI, 0); c.closePath(); c.fill();
      const fill = [['#5a2e17', 7], ['#7a3f1f', 5]];
      for (let i = -15; i <= 15; i += 4) { c.fillStyle = fill[(i + 16) % 2][0]; c.beginPath(); c.arc(i, -7 + Math.abs(i) * 0.25, fill[(i + 16) % 2][1] * 0.8, 0, TAU); c.fill(); }
      c.fillStyle = '#f4f1e6'; for (const [a, b] of [[-9, -12], [4, -13], [11, -9], [-2, -10]]) { c.fillRect(a, b, 3, 2.4); }
      c.fillStyle = '#2f9e44'; for (const [a, b] of [[-12, -11], [-5, -14], [2, -12], [8, -13], [13, -10], [-1, -15]]) { c.beginPath(); c.ellipse(a, b, 2.2, 1.3, a * 0.2, 0, TAU); c.fill(); }
      c.fillStyle = '#d62839'; for (const [a, b] of [[-7, -9], [6, -10], [0, -8]]) { c.beginPath(); c.arc(a, b, 1.8, 0, TAU); c.fill(); }
      const tg = c.createLinearGradient(0, -12, 0, 8); tg.addColorStop(0, '#f7dc8a'); tg.addColorStop(0.6, '#e6b95a'); tg.addColorStop(1, '#b3802e');
      c.fillStyle = tg; c.beginPath(); c.arc(0, 8, 18.5, Math.PI, 0); c.closePath(); c.fill();
      c.fillStyle = 'rgba(120,70,20,.45)'; for (const [a, b, r] of [[-10, 1, 1.6], [-3, -5, 1.2], [6, 0, 1.8], [11, 4, 1.1], [-13, 5, 1.2], [2, 4, 1]]) { c.beginPath(); c.arc(a, b, r, 0, TAU); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(0, 8, 16, Math.PI * 1.15, Math.PI * 1.55); c.arc(0, 8, 14, Math.PI * 1.55, Math.PI * 1.15, true); c.fill();
      break;
    }
    case 'star': {
      const hue = (now / 6) % 360;
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha *= 0.55; c.drawImage(ART.glow('#ffd84a'), -34, -34, 68, 68); c.restore();
      drawStar(c, 0, 0, 21.5, 9.8, O);
      // puntas biseladas: cada punta con una cara clara y una oscura
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * TAU / 5, a1 = a - TAU / 10, a2 = a + TAU / 10;
        const tip = [Math.cos(a) * 20, Math.sin(a) * 20], l = [Math.cos(a1) * 8.5, Math.sin(a1) * 8.5], r = [Math.cos(a2) * 8.5, Math.sin(a2) * 8.5];
        c.fillStyle = '#ffe98a'; c.beginPath(); c.moveTo(0, 0); c.lineTo(...l); c.lineTo(...tip); c.closePath(); c.fill();
        c.fillStyle = '#e0a21a'; c.beginPath(); c.moveTo(0, 0); c.lineTo(...tip); c.lineTo(...r); c.closePath(); c.fill();
      }
      c.save(); drawStar(c, 0, 0, 20, 8.6, 'rgba(0,0,0,0)'); c.clip(); c.globalAlpha *= 0.28; c.fillStyle = `hsl(${hue},100%,58%)`; c.fillRect(-22, -22, 44, 44); c.restore();
      c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(-4, -6, 2, 0, TAU); c.fill();
      break;
    }
    case 'shroom': {
      c.fillStyle = O; roundRect(c, -8.5, -2, 17, 19, 6); c.fill();
      c.fillStyle = lin(-7, 0, 7, 0, [[0, '#b9ad98'], [0.4, '#fffaf0'], [1, '#c9bca6']]); roundRect(c, -7.2, -1, 14.4, 17, 5); c.fill();
      c.fillStyle = 'rgba(60,40,30,.25)'; c.fillRect(-7, -1, 14, 3);
      c.fillStyle = O; c.beginPath(); c.ellipse(0, 0, 20.5, 18, 0, Math.PI, 0); c.closePath(); c.fill();
      const cg = c.createRadialGradient(-6, -12, 2, 0, -2, 22); cg.addColorStop(0, '#ff8a8a'); cg.addColorStop(0.45, '#e11d2e'); cg.addColorStop(1, '#7a0a14');
      c.fillStyle = cg; c.beginPath(); c.ellipse(0, -0.5, 19.2, 16.8, 0, Math.PI, 0); c.closePath(); c.fill();
      c.fillStyle = '#e8dcc4'; c.beginPath(); c.ellipse(0, -0.5, 19, 3, 0, 0, Math.PI); c.fill();
      for (const [a, b, rx, ry, rot] of [[-9, -8, 4.6, 3.6, -0.5], [5, -12, 3.8, 3, 0.2], [13, -4, 2.8, 3.2, 0.9], [-15, -1.5, 2.4, 2, -1]]) {
        c.fillStyle = '#fffaf2'; c.beginPath(); c.ellipse(a, b, rx, ry, rot, 0, TAU); c.fill();
        c.fillStyle = 'rgba(160,120,110,.35)'; c.beginPath(); c.ellipse(a + 0.8, b + 0.9, rx * 0.8, ry * 0.6, rot, 0, Math.PI); c.fill();
      }
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-8, -12, 6, 2.2, -0.5, 0, TAU); c.fill();
      break;
    }
  }
  c.restore();
}
function hslToRgb(h, s, l) {
  const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return [f(0), f(8), f(4)];
}
