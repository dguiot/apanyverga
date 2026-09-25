'use strict';
// ============================================================
//  PERSONAJES: estadísticas, golpes normales y especiales
// ============================================================
// Ángulos de lanzamiento: 0 = hacia delante, 90 = arriba, 180 = atrás, 270 = abajo (meteoro)
function HB(f0, f1, x, y, r, dmg, ang, bkb, kbg, o) { return Object.assign({ f0, f1, x, y, r, dmg, ang, bkb, kbg }, o || {}); }

function baseMoves() {
  return {
    jab1: { anim: 'jab', dur: 18, iasa: 12, jab: 'jab2', hits: [HB(3, 5, 38, -62, 18, 3, 75, 2.5, 1)] },
    jab2: { anim: 'jab2', dur: 18, iasa: 12, jab: 'jab3', hits: [HB(3, 5, 40, -60, 18, 3, 75, 2.5, 1)] },
    jab3: { anim: 'jab3', dur: 28, hits: [HB(4, 7, 44, -38, 22, 5, 40, 6.5, 6)] },
    // eslabones extra de combo (los usa quien tiene combos largos o ráfaga)
    jab4: { anim: 'jab3', dur: 26, hits: [HB(4, 7, 44, -50, 22, 5, 50, 6.5, 6)] },
    rapid: { anim: 'jab', dur: 24, rapid: 1, holdLoop: [4, 80], holdBtn: 'attack', hits: [HB(4, 4, 42, -62, 24, 1, 80, 1.8, 0, { rehit: 4 }), HB(9, 11, 46, -58, 24, 4, 45, 7, 6)] },
    ftilt: { anim: 'ftilt', dur: 28, hits: [HB(6, 9, 50, -42, 20, 9, 36, 6, 10)] },
    utilt: { anim: 'utilt', dur: 28, hits: [HB(5, 7, 28, -80, 22, 8, 88, 6.5, 9.5), HB(7, 10, 5, -110, 24, 8, 92, 6.5, 9.5)] },
    dtilt: { anim: 'dtilt', dur: 22, crouch: 1, hits: [HB(5, 8, 48, -10, 18, 7, 78, 5.5, 6.5)] },
    dash: { anim: 'dash', dur: 36, dashAtk: 1, hits: [HB(6, 10, 36, -42, 24, 10, 55, 7.5, 8.5), HB(11, 16, 36, -42, 20, 6, 60, 5, 5)] },
    fsmash: { anim: 'fsmash', dur: 48, chargeAt: 8, smash: 1, hits: [HB(15, 18, 54, -55, 26, 16, 38, 8.5, 17, { sfx: 'bighit' })] },
    usmash: { anim: 'usmash', dur: 46, chargeAt: 6, smash: 1, hits: [HB(11, 13, 20, -80, 26, 14, 88, 8.5, 16), HB(13, 16, 0, -112, 30, 15, 90, 8.5, 16, { sfx: 'bighit' })] },
    dsmash: { anim: 'dsmash', dur: 46, chargeAt: 6, smash: 1, hits: [HB(10, 13, 46, -12, 22, 14, 28, 8, 15.5), HB(10, 13, -46, -12, 22, 14, 152, 8, 15.5)] },
    nair: { anim: 'nair', air: 1, dur: 36, land: 7, hits: [HB(4, 8, 0, -52, 42, 10, 45, 6, 10), HB(9, 22, 0, -52, 36, 6, 45, 4, 7)] },
    fair: { anim: 'fair', air: 1, dur: 42, land: 14, hits: [HB(12, 15, 40, -72, 25, 14, 40, 7.5, 14), HB(12, 15, 36, -30, 22, 15, 280, 5, 11, { meteor: 1 })] },
    bair: { anim: 'bair', air: 1, dur: 32, land: 9, hits: [HB(6, 9, -46, -45, 24, 12, 145, 7.5, 13.5)] },
    uair: { anim: 'uair', air: 1, dur: 30, land: 7, hits: [HB(5, 9, 10, -112, 30, 9, 86, 6.5, 11)] },
    dair: { anim: 'dair', air: 1, dur: 42, land: 16, hits: [HB(12, 16, 0, -4, 26, 13, 270, 6, 12, { meteor: 1 })] },
    // agarre: sale tarde, alcanza poco y si falla queda expuesto un buen rato
    grab: { anim: 'grab', dur: 44, grabBox: HB(8, 9, 42, -52, 21, 0, 0, 0, 0) },
    dashgrab: { anim: 'grab', dur: 52, grabBox: HB(10, 12, 50, -52, 23, 0, 0, 0, 0), dashAtk: 1 },
    pummel: { anim: 'jab', dur: 16, dmg: 1.2 },
    // lanzamientos: poco daño y poco empuje base; el empuje crece mucho con el %: solo sacan pasando ~125% (los mejores)
    fthrow: { anim: 'throwF', dur: 28, at: 10, dmg: 5, ang: 40, bkb: 4.5, kbg: 11.5 },
    bthrow: { anim: 'throwB', dur: 30, at: 12, dmg: 6, ang: 140, bkb: 4.5, kbg: 13.5, turn: 1 },
    uthrow: { anim: 'throwU', dur: 30, at: 12, dmg: 4.5, ang: 90, bkb: 5, kbg: 11 },
    dthrow: { anim: 'throwD', dur: 30, at: 12, dmg: 4, ang: 72, bkb: 5, kbg: 3.5 },
    getupAtk: { anim: 'dsmash', dur: 34, intang: [0, 10], hits: [HB(10, 13, 42, -20, 26, 7, 30, 7, 5), HB(10, 13, -42, -20, 26, 7, 150, 7, 5)] },
    ledgeAtk: { anim: 'dash', dur: 38, intang: [0, 12], hits: [HB(12, 15, 40, -30, 28, 8, 35, 7.5, 5)] },
    // ----- con objetos -----
    bat: { anim: 'swing', dur: 32, hits: [HB(9, 12, 58, -50, 32, 11, 40, 7.5, 10)], sfx: 'swing' },
    batSmash: { anim: 'swing', dur: 62, chargeAt: 10, smash: 1, hits: [HB(28, 30, 62, -50, 34, 25, 40, 13, 20, { sfx: 'bighit', homerun: 1 })] },
    sword: { anim: 'swing', dur: 26, hits: [HB(6, 10, 72, -55, 36, 9, 40, 6.5, 9, { effect: 'slash' })], sfx: 'laser' },
    swordSmash: { anim: 'swing', dur: 46, chargeAt: 8, smash: 1, hits: [HB(13, 17, 86, -55, 42, 18, 38, 9, 15, { effect: 'slash', sfx: 'bighit' })] },
    batU: { anim: 'swingUp', dur: 34, hits: [HB(8, 12, 30, -95, 34, 11, 86, 7.5, 9.5)], sfx: 'swing' },
    batD: { anim: 'swingDown', dur: 30, hits: [HB(8, 11, 58, -14, 30, 10, 28, 6.5, 8)], sfx: 'swing' },
    batDash: { anim: 'swingDash', dur: 38, dashAtk: 1, hits: [HB(9, 13, 62, -50, 34, 12, 42, 8, 9.5)], sfx: 'swing' },
    batAir: { anim: 'swingAir', air: 1, dur: 34, land: 10, hits: [HB(8, 16, 0, -55, 58, 10, 45, 7, 8)], sfx: 'swing' },
    swordU: { anim: 'swingUp', dur: 28, hits: [HB(6, 10, 34, -100, 38, 9, 88, 6.5, 8.5, { effect: 'slash' })], sfx: 'laser' },
    swordD: { anim: 'swingDown', dur: 26, hits: [HB(6, 9, 70, -12, 34, 8, 25, 6, 7.5, { effect: 'slash' })], sfx: 'laser' },
    swordDash: { anim: 'swingDash', dur: 32, dashAtk: 1, hits: [HB(7, 11, 78, -52, 38, 11, 40, 7.5, 9, { effect: 'slash' })], sfx: 'laser' },
    swordAir: { anim: 'swingAir', air: 1, dur: 30, land: 9, hits: [HB(6, 14, 0, -55, 64, 9, 45, 6.5, 8, { effect: 'slash' })], sfx: 'laser' },
    gun: { anim: 'cast', dur: 20, shootAt: 5 },
    itemThrow: { anim: 'item', dur: 22, throwAt: 7 },
    itemThrowU: { anim: 'throwItemU', dur: 22, throwAt: 7 },
    itemThrowD: { anim: 'throwItemD', dur: 22, throwAt: 7 },
  };
}

// ---------- especiales ----------
const SPECIALS = {
  // ===================== NACHO =====================
  nacho: {
    n: { name: 'Puño Gigante', anim: 'charge', dur: 44, chargeAt: 8, chargeMax: 70, chargeBtn: 'special',
      hits: [HB(15, 19, 52, -56, 30, 9, 38, 6, 10, { chargeScale: { dmg: 19, bkb: 7, kbg: 9, r: 10 }, sfx: 'bighit' })],
      onFrame(f, m) { if (m.f === 13) { f.vx = f.face * (6 + 8 * m.charge); } if (m.f > 13 && m.f < 22 && f.grounded) f.vx *= 0.9; if (m.f < 12 && m.f > 8) spawnFx('charge', f.x + f.face * 30, f.y - 55, { col: '#ff9f1c' }); } },
    s: { name: 'Embestida', anim: 'shoulder', dur: 42, armor: [6, 22], oncePerAir: 1,
      hits: [HB(8, 24, 26, -48, 30, 11, 35, 8, 9.5, { grp: 1 })],
      onFrame(f, m) { if (m.f >= 8 && m.f <= 24) { f.vx = f.face * 11.5; f.vy = f.grounded ? f.vy : Math.min(f.vy, 1); if (m.f % 3 === 0) spawnFx('dust', f.x - f.face * 20, f.y - 4); } else if (m.f > 24) f.vx *= 0.85; } },
    u: { name: 'Uppercut Volcánico', anim: 'upper', dur: 42, helpless: 1,
      hits: [HB(3, 6, 22, -70, 26, 12, 80, 8, 11, { effect: 'fire', sfx: 'bighit' }), HB(7, 22, 18, -85, 24, 5, 85, 5, 6, { effect: 'fire' })],
      onFrame(f, m) { if (m.f === 3) { f.vy = -17.5; f.grounded = false; Audio8.sfx('fire'); } if (m.f >= 3 && m.f < 24) { f.vx = f.ctrl.x * 3.2; spawnFx('ember', f.x + f.face * 18, f.y - 80); } } },
    d: { name: 'Terremoto', anim: 'stomp', dur: 44, land: 18,
      hits: [HB(14, 16, 0, -12, 46, 10, 88, 8, 7)],
      onFrame(f, m) {
        if (!f.grounded && m.f >= 8 && !m.v.slam) { m.v.slam = 1; }
        if (m.v.slam && !f.grounded) { f.vy = 18; f.vx *= 0.9; if (m.f > 20) m.f = 20; }
        const quake = (m.f === 14 && f.grounded && !m.v.done) || (m.v.slam && f.grounded && !m.v.done);
        if (quake) {
          m.v.done = 1; shake(8); Audio8.sfx('explosion');
          for (const d of [-1, 1]) spawnProjectile(f, { type: 'wave', x: f.x + d * 20, y: f.y - 16, vx: d * 9.5, vy: 0, r: 22, life: 32, dmg: 8, ang: 80, bkb: 7, kbg: 6, ground: 1, reflect: 0, col: '#ff9f1c' });
          if (m.v.slam) m.f = 14;
        }
      } },
    f: { name: 'Puño Meteoro', anim: 'final', dur: 120, final: 1,
      onFrame(f, m) {
        if (m.f === 1) { m.v.x0 = f.x; f.vy = -34; f.grounded = false; }
        if (m.f > 1 && m.f < 20) { f.vy = -34; f.vx = 0; }
        if (m.f === 20) { f.hidden = true; f.vy = 0; }
        if (m.f >= 20 && m.f < 64) { f.vy = 0; f.x = m.v.x0; f.y = -1400; }
        if (m.f === 64) { const st = BATTLE.stage; f.x = clamp(m.v.x0, st.left + 60, st.right - 60); f.y = st.floorY(f.x) - 2; f.vy = 0; f.hidden = false; f.grounded = true;
          shake(26); flash(0.8); Audio8.sfx('ko');
          spawnFx('boom', f.x, f.y - 20, { r: 320, col: '#ff9f1c' });
          hitArea(f, { x: st.left - 200, y: st.top - 380, w: st.right - st.left + 400, h: 420 }, { dmg: 34, ang: 80, bkb: 16, kbg: 13, sfx: 'bighit', effect: 'fire' });
        }
      } },
  },
  // ===================== PABLO =====================
  pablo: {
    n: { name: 'Shuriken', anim: 'cast', dur: 22,
      onFrame(f, m) { if (m.f === 7 && countProj(f, 'shuriken') < 3) { Audio8.sfx('swing'); spawnProjectile(f, { type: 'shuriken', x: f.x + f.face * 30, y: f.y - 60, vx: f.face * 19, vy: 0, r: 11, life: 38, dmg: 4, ang: 30, bkb: 3, kbg: 3.5, col: '#cbd5e1' }); } } },
    s: { name: 'Corte Sombra', anim: 'slash', dur: 30, intang: [5, 15], oncePerAir: 1,
      hits: [HB(6, 15, 0, -48, 36, 9, 45, 7, 9, { effect: 'slash' })],
      onFrame(f, m) { if (m.f === 5) Audio8.sfx('teleport'); if (m.f >= 6 && m.f <= 14) { f.vx = f.face * 22; f.vy = 0; spawnFx('afterimage', f.x, f.y, { f }); } else if (m.f > 14) f.vx *= 0.7; } },
    u: { name: 'Teletransporte', anim: 'jump', dur: 36, helpless: 1, intang: [2, 14],
      hits: [HB(13, 16, 0, -50, 42, 7, 80, 7, 8)],
      onFrame(f, m) {
        if (m.f === 1) { Audio8.sfx('teleport'); spawnFx('smoke', f.x, f.y - 50); }
        if (m.f >= 1 && m.f < 13) { f.vx = 0; f.vy = 0; f.hidden = true; }
        if (m.f === 12) { let dx = f.ctrl.x, dy = f.ctrl.y; if (Math.hypot(dx, dy) < 0.3) { dx = 0; dy = -1; } const l = Math.hypot(dx, dy); f.x += dx / l * 215; f.y += dy / l * 215; // 215 px: con triple salto y dos esquives ya era el mejor regreso f.grounded = false; if (dx) f.face = sign(dx);
          // si el destino queda dentro del piso, aparece encima (antes quedaba atorado debajo y se caía)
          // y si queda por debajo de la orilla (a su alcance), sube a la orilla en vez de quedarse abajo
          for (const so of BATTLE.stage.solids) if (f.x > so.x + 6 && f.x < so.x + so.w - 6 && f.y > so.y - 4 && f.y < so.y + 250) f.y = so.y - 2; }
        if (m.f === 13) { f.hidden = false; spawnFx('smoke', f.x, f.y - 50); f.vy = -2; }
      } },
    d: { name: 'Contraataque', anim: 'counter', dur: 40, counter: [4, 24] },
    f: { name: 'Tormenta de Sombras', anim: 'final', dur: 160, final: 1,
      onFrame(f, m) {
        if (m.f === 1) { m.v.x0 = f.x; m.v.y0 = f.y; m.v.targets = opponentsOf(f).filter(o => Math.abs(o.x - f.x) < 900 && !o.dead); dim(120); }
        f.vx = 0; f.vy = 0; f.hidden = m.f > 10 && m.f < 150;
        if (m.f > 10 && m.f < 130 && m.f % 10 === 0) {
          for (const o of m.v.targets) { if (o.dead) continue; spawnFx('slashline', o.x, o.y - 50); applyHit(f, o, { dmg: 4, ang: 90, bkb: 1.5, kbg: 0, effect: 'slash', sfx: 'hit' }, 1, { noLaunch: true }); }
        }
        if (m.f === 136) for (const o of m.v.targets) { if (o.dead) continue; spawnFx('boom', o.x, o.y - 50, { r: 120, col: '#e63946' }); applyHit(f, o, { dmg: 12, ang: 48, bkb: 18, kbg: 12, sfx: 'bighit', effect: 'slash' }, sign(o.x - m.v.x0) || 1); }
        if (m.f === 150) { f.x = m.v.x0; f.y = m.v.y0; }
      } },
  },
  // ===================== DANIEL =====================
  daniel: {
    n: { name: 'Bola de Fuego', anim: 'cast', dur: 30,
      onFrame(f, m) { if (m.f === 10 && countProj(f, 'fireball') < 2) { Audio8.sfx('fire'); spawnProjectile(f, { type: 'fireball', x: f.x + f.face * 32, y: f.y - 55, vx: f.face * 8, vy: 2, grav: 0.5, bounce: -7, r: 12, life: 90, dmg: 6, ang: 40, bkb: 4, kbg: 4, col: '#ff7b00', effect: 'fire' }); } } },
    s: { name: 'Capa Reflectora', anim: 'slash', dur: 34, reflect: [4, 16], oncePerAir: 1,
      hits: [HB(6, 12, 34, -50, 30, 7, 40, 6.5, 6)],
      onFrame(f, m) { if (m.f === 4) { Audio8.sfx('swing'); if (!f.grounded) f.vy = Math.min(f.vy, -3); } } },
    u: { name: 'Súper Salto', anim: 'upper', dur: 44, helpless: 1,
      hits: [HB(3, 18, 16, -80, 26, 2, 90, 3, 1, { rehit: 4, grp: 1 }), HB(19, 22, 16, -95, 30, 5, 80, 8, 8)],
      onFrame(f, m) { if (m.f === 3) { f.vy = -18.5; f.grounded = false; Audio8.sfx('djump'); } if (m.f >= 3 && m.f < 20) { f.vx = f.ctrl.x * 4; if (m.f % 3 === 0) spawnFx('coin', f.x + f.face * 16, f.y - 100); } } },
    d: { name: 'Tornado', anim: 'spin', dur: 70, land: 16,
      hits: [HB(8, 48, 0, -50, 42, 2, 60, 3, 0.5, { rehit: 6, grp: 1 }), HB(50, 54, 0, -50, 46, 6, 60, 8, 9)],
      onFrame(f, m) { if (m.f % 8 === 0) Audio8.sfx('swing', 0.6); f.vx = approach(f.vx, f.ctrl.x * 4.5, 0.6); if (f.ctrl.pressed('special') && m.f < 48) { f.vy = Math.max(f.vy - 3.2, -6); f.grounded = false; } else if (!f.grounded) f.vy = Math.min(f.vy, 3); } },
    f: { name: 'Mega Llamarada', anim: 'cast', dur: 140, final: 1,
      onFrame(f, m) {
        f.vx = 0; f.vy = 0;
        if (m.f === 1) { m.v.face = f.face; Audio8.sfx('final'); }
        if (m.f >= 20 && m.f <= 118) {
          const r = { x: f.face > 0 ? f.x + 20 : f.x - 1800, y: f.y - 150, w: 1780, h: 190 };
          m.v.beam = r;
          if (m.f % 7 === 0 && m.f < 112) hitArea(f, r, { dmg: 2.5, ang: 20, bkb: 4.5, kbg: 0, effect: 'fire', sfx: 'fire' }, { noLaunch: true });
          if (m.f === 116) { shake(20); hitArea(f, r, { dmg: 14, ang: 35, bkb: 17, kbg: 13, effect: 'fire', sfx: 'bighit' }); }
          if (m.f % 2 === 0) spawnFx('ember', f.x + f.face * rand(40, 900), f.y - 55 + rand(-70, 70));
          shake(2);
        } else m.v.beam = null;
      } },
  },
  // ===================== ROBES =====================
  robes: {
    n: { name: 'Bola de Boliche', anim: 'swing', dur: 40,
      onFrame(f, m) { if (m.f === 16 && countProj(f, 'bowling') < 1) { Audio8.sfx('throw'); spawnProjectile(f, { type: 'bowling', x: f.x + f.face * 40, y: f.y - 40, vx: f.face * 5.5, vy: -1, grav: 0.8, roll: 1, r: 19, life: 130, dmg: 13, ang: 40, bkb: 8, kbg: 10, col: '#2b2d42' }); } } },
    s: { name: 'Agarre Volador', anim: 'grab', dur: 46, oncePerAir: 1,
      grabBox: HB(9, 17, 40, -52, 28, 0, 0, 0, 0), command: { anim: 'throwD', dur: 44, at: 30, dmg: 14, ang: 78, bkb: 8.5, kbg: 10.5, slam: 1 },
      onFrame(f, m) { if (m.f >= 6 && m.f <= 17) { f.vx = f.face * 9.5; if (!f.grounded) f.vy = Math.min(f.vy, 0.5); } else f.vx *= 0.85; } },
    u: { name: 'Helicóptero', anim: 'spin', dur: 62, helpless: 1,
      hits: [HB(4, 50, 0, -55, 40, 2, 70, 3, 0.5, { rehit: 6, grp: 1 }), HB(51, 55, 0, -55, 44, 5, 80, 7.5, 8)],
      onFrame(f, m) { if (m.f >= 4 && m.f <= 50) { f.vy = m.f < 30 ? -6.5 : -4; f.grounded = false; f.vx = approach(f.vx, f.ctrl.x * 5.2, 0.5); if (m.f % 8 === 0) Audio8.sfx('swing', 0.7); } } },
    d: { name: 'Panzazo', anim: 'stomp', dur: 50, land: 22, armor: [0, 40],
      hits: [HB(14, 40, 0, -40, 40, 14, 60, 8, 12, { grp: 1 })],
      onFrame(f, m) {
        if (m.f === 1 && f.grounded) { f.vy = -12; f.grounded = false; }
        if (m.f >= 12 && !m.v.landed) { f.vy = 20; f.vx *= 0.9; if (f.grounded) { m.v.landed = 1; shake(10); Audio8.sfx('explosion'); spawnFx('boom', f.x, f.y - 10, { r: 90, col: '#95d5b2' }); hitArea(f, { x: f.x - 90, y: f.y - 70, w: 180, h: 80 }, { dmg: 10, ang: 70, bkb: 8, kbg: 8 }); m.f = 40; } else if (m.f > 38) m.f = 38; }
      } },
    f: { name: 'Terremoto Titánico', anim: 'stomp', dur: 150, final: 1,
      onFrame(f, m) {
        f.vx = 0;
        const st = BATTLE.stage;
        const zone = { x: st.left - 300, y: st.top - 300, w: st.right - st.left + 600, h: 360 };
        if ([22, 52, 82].includes(m.f)) { shake(16); Audio8.sfx('explosion'); spawnFx('boom', f.x, f.y, { r: 160, col: '#95d5b2' }); hitArea(f, zone, { dmg: 9, ang: 90, bkb: 3, kbg: 0, sfx: 'hit' }, { noLaunch: true }); for (let i = 0; i < 10; i++) spawnFx('rock', rand(st.left, st.right), st.top - rand(400, 700)); }
        if (m.f === 112) { shake(30); flash(0.7); Audio8.sfx('ko'); hitArea(f, { x: st.left - 400, y: st.top - 900, w: st.right - st.left + 800, h: 960 }, { dmg: 18, ang: 88, bkb: 17, kbg: 12, sfx: 'bighit' }); }
        if ([20, 50, 80].includes(m.f)) { f.vy = -8; f.grounded = false; }
      } },
  },
  // ===================== NICOLE =====================
  nicole: {
    n: { name: 'Orbe de Energía', anim: 'cast', dur: 30, chargeAt: 6, chargeMax: 60, chargeBtn: 'special',
      onFrame(f, m) {
        if (m.charging && m.f % 4 === 0) { Audio8.sfx('charge', m.charge); spawnFx('spark', f.x + f.face * 34, f.y - 58, { col: '#48cae4' }); }
        if (m.f === 10) { const c = m.charge; Audio8.sfx('laser'); spawnProjectile(f, { type: 'orb', x: f.x + f.face * 36, y: f.y - 58, vx: f.face * (10 + 4 * c), vy: 0, r: 9 + 15 * c, life: 90, dmg: 5 + 17 * c, ang: 38, bkb: 4 + 7.5 * c, kbg: 6 + 8 * c, col: '#48cae4', effect: 'elec' }); }
      } },
    s: { name: 'Estrella Buscadora', anim: 'cast', dur: 36,
      onFrame(f, m) { if (m.f === 12 && countProj(f, 'homing') < 1) { Audio8.sfx('star'); spawnProjectile(f, { type: 'homing', x: f.x + f.face * 30, y: f.y - 60, vx: f.face * 7, vy: -2, homing: 0.09, speed: 8.5, r: 13, life: 120, dmg: 8, ang: 45, bkb: 6.5, kbg: 6.5, col: '#ffd166' }); } } },
    u: { name: 'Impulso Arcano', anim: 'upper', dur: 44, helpless: 1,
      hits: [HB(6, 9, 0, -50, 46, 9, 82, 7.5, 8, { effect: 'elec' })],
      onFrame(f, m) { if (m.f === 6) { f.vy = -16.5; f.grounded = false; Audio8.sfx('laser'); spawnFx('boom', f.x, f.y - 50, { r: 60, col: '#48cae4' }); } if (m.f >= 6 && m.f < 26) { f.vx = f.ctrl.x * 4.8; spawnFx('spark', f.x, f.y - 20, { col: '#48cae4' }); } } },
    d: { name: 'Reflector', anim: 'counter', dur: 36, reflect: [3, 36], holdLoop: [20, 90],
      hits: [HB(3, 5, 0, -50, 44, 4, 45, 7, 2)],
      onFrame(f, m) { if (m.f === 3) Audio8.sfx('shield'); if (!f.grounded) f.vy *= 0.6; } },
    f: { name: 'Lluvia de Estrellas', anim: 'final', dur: 160, final: 1,
      onFrame(f, m) {
        f.vx = 0; f.vy = Math.min(f.vy, 0) * 0.8;
        const st = BATTLE.stage;
        if (m.f === 1) { Audio8.sfx('star'); dim(150); }
        if (m.f > 10 && m.f < 120 && m.f % 3 === 0) spawnProjectile(f, { type: 'fstar', x: rand(st.left - 250, st.right + 250), y: st.top - rand(700, 900), vx: rand(-1, 1), vy: 15, r: 20, life: 90, dmg: 4, ang: 70, bkb: 4, kbg: 1, col: '#ffd166', pierce: 1, reflect: 0 });
        if (m.f === 124) for (const o of opponentsOf(f)) if (!o.dead) spawnProjectile(f, { type: 'fstar', big: 1, x: o.x, y: o.y - 700, vx: 0, vy: 22, r: 40, life: 60, dmg: 14, ang: 70, bkb: 16, kbg: 12, col: '#ffbe0b', pierce: 1, reflect: 0 });
      } },
  },
};

const CHARS = {
  nacho: { id: 'nacho', name: 'Nacho', title: 'El Rompemuros', blurb: 'Pegador pesado. Lento, pero cada golpe duele.',
    weight: 112, walk: 3.4, run: 8.2, air: 5.3, airAcc: 0.42, grav: 0.66, fall: 11, ffall: 16.5, jump: 15.5, djump: 14.5, jumps: 2, traction: 0.75,
    power: 1.15, reach: 1.05, speed: 0.92, size: 1.0, bars: { fuerza: 5, velocidad: 2, peso: 4, rango: 2 } },
  pablo: { id: 'pablo', name: 'Pablo', title: 'La Sombra', blurb: 'Ninja veloz con triple salto y shurikens.',
    weight: 84, walk: 4.4, run: 11.2, air: 7, airAcc: 0.6, grav: 0.72, fall: 12, ffall: 18, jump: 15.5, djump: 13.5, jumps: 3, traction: 0.9,
    power: 0.86, reach: 0.95, speed: 1.22, size: 0.96, bars: { fuerza: 2, velocidad: 5, peso: 1, rango: 3 } },
  daniel: { id: 'daniel', name: 'Daniel', title: 'El Cerrador', blurb: 'Todoterreno: fuego, reflejo y un súper salto.',
    weight: 100, walk: 3.9, run: 9.4, air: 6.2, airAcc: 0.5, grav: 0.63, fall: 11, ffall: 16.5, jump: 15.5, djump: 14.5, jumps: 2, traction: 0.8,
    power: 1.0, reach: 1.0, speed: 1.05, size: 1.0, bars: { fuerza: 3, velocidad: 3, peso: 3, rango: 3 } },
  robes: { id: 'robes', name: 'Robes', title: 'El Muro', blurb: 'Peso pesado con agarre volador y armadura.',
    weight: 128, walk: 3.0, run: 7.4, air: 5.0, airAcc: 0.38, grav: 0.72, fall: 12, ffall: 17.5, jump: 15, djump: 14, jumps: 2, traction: 0.7,
    power: 1.25, reach: 1.14, speed: 0.84, size: 1.13, bars: { fuerza: 5, velocidad: 1, peso: 5, rango: 3 } },
  nicole: { id: 'nicole', name: 'Nicole', title: 'La Hechicera', blurb: 'Magia a distancia y caída flotante.',
    weight: 90, walk: 3.9, run: 9.0, air: 6.8, airAcc: 0.55, grav: 0.5, fall: 9, ffall: 14, jump: 14.5, djump: 13.5, jumps: 2, traction: 0.8,
    power: 0.95, reach: 1.1, speed: 1.0, size: 0.98, bars: { fuerza: 3, velocidad: 3, peso: 2, rango: 5 } },
};
const CHAR_ORDER = ['nacho', 'pablo', 'daniel', 'robes', 'nicole'];

// Construye el set de golpes escalado para un personaje
// los cuerpos nuevos son ~12% más altos: las cajas de golpe suben con ellos
const BODY_Y = 1.12;
const MOVE_SPEED = 1.2; // todos los normales y aéreos, 20% más rápidos
function buildMoveset(id) {
  const ch = CHARS[id];
  const base = baseMoves();
  if (typeof applyMoveKit === 'function') applyMoveKit(id, base); // ritmo y combos propios
  const sp = SPECIALS[id];
  const set = {};
  const bodyY = typeof skOf === 'function' ? skOf(id).bodyK : BODY_Y; // cada cuerpo tiene su altura
  const scaleFrames = v => Math.max(1, Math.round(v / (ch.speed * MOVE_SPEED)));
  const conv = (mv, isSpecial) => {
    const m = Object.assign({}, mv);
    const sf = isSpecial ? (v => v) : scaleFrames; // los especiales tienen su propio ritmo
    m.dur = sf(mv.dur);
    if (mv.iasa) m.iasa = sf(mv.iasa);
    if (mv.chargeAt && !isSpecial) m.chargeAt = sf(mv.chargeAt);
    if (mv.holdLoop && !isSpecial) m.holdLoop = [sf(mv.holdLoop[0]), mv.holdLoop[1]]; // la ráfaga se sostiene en su cuadro de golpe
    if (mv.hits) m.hits = mv.hits.map(h => Object.assign({}, h, {
      f0: sf(h.f0), f1: sf(h.f1),
      x: h.x * ch.reach, y: h.y * bodyY, r: h.r * (0.5 + 0.5 * ch.reach),
      dmg: +(h.dmg * (isSpecial ? 1 : ch.power)).toFixed(1),
      bkb: h.bkb * (isSpecial ? 1 : (0.6 + 0.4 * ch.power)),
    }));
    if (mv.grabBox) m.grabBox = Object.assign({}, mv.grabBox, { f0: sf(mv.grabBox.f0), f1: sf(mv.grabBox.f1), x: mv.grabBox.x * ch.reach, y: mv.grabBox.y * bodyY });
    if (mv.at) m.at = sf(mv.at);
    // lanzamientos: pegan un poco más con más fuerza, sin volverse la mejor arma de los pesados
    if (mv.dmg !== undefined && !mv.hits && !isSpecial) { m.dmg = +(mv.dmg * (0.7 + 0.3 * ch.power)).toFixed(1); if (mv.bkb !== undefined) m.bkb = mv.bkb * (0.85 + 0.15 * ch.power); if (mv.kbg !== undefined) m.kbg = mv.kbg * (0.75 + 0.25 * ch.power); }
    if (mv.shootAt) m.shootAt = sf(mv.shootAt);
    if (mv.throwAt) m.throwAt = sf(mv.throwAt);
    return m;
  };
  for (const k in base) set[k] = conv(base[k], false);
  for (const k of ['n', 's', 'u', 'd', 'f']) set['sp_' + k] = conv(sp[k], true);
  // toques de personalidad en normales
  if (id === 'nicole') { for (const k of ['nair', 'fair', 'bair', 'uair']) set[k].hits.forEach(h => { h.effect = 'elec'; }); }
  if (id === 'nacho') { set.fsmash.hits[0].effect = 'fire'; set.jab3.hits[0].bkb *= 1.2; }
  if (id === 'pablo') { for (const k of ['ftilt', 'fair', 'bair']) set[k].hits.forEach(h => { h.effect = 'slash'; }); }
  if (id === 'robes') { set.fsmash.armor = [4, 16]; set.usmash.armor = [4, 13]; }
  // Furia de Nacho: aguanta golpes mientras carga el smash y el Puño Gigante
  if (id === 'nacho') { set.fsmash.armor = [0, set.fsmash.hits[0].f0]; set.sp_n.armor = [0, 14]; }
  // Picor de Chilazo: todos sus golpes queman
  if (id === 'chilazo') for (const k of ['jab1', 'jab2', 'jab3', 'ftilt', 'utilt', 'dtilt', 'dash', 'fsmash', 'usmash', 'dsmash', 'nair', 'fair', 'bair', 'uair', 'dair']) (set[k].hits || []).forEach(h => { h.effect = h.effect || 'fire'; });
  if (id === 'daniel') { set.fsmash.hits[0].effect = 'fire'; set.dair.hits[0].dmg *= 1.1; }
  if (typeof CHAR_TWEAKS !== 'undefined' && CHAR_TWEAKS[id]) CHAR_TWEAKS[id](set);
  if (typeof alignHits === 'function') alignHits(id, set); // el golpe sale del brazo o la pierna que se ve
  return set;
}

const MOVE_LIST = [
  ['Ataque, Ataque…', 'Combo propio: 2, 3 o 4 golpes · Pablo y Chispa: machaca para una ráfaga'],
  ['← / → + Ataque', 'Golpe lateral'],
  ['↑ + Ataque', 'Golpe hacia arriba'],
  ['↓ + Ataque', 'Barrida agachado'],
  ['Ataque + Especial juntos', 'SMASH hacia donde apuntes · mantén para cargar (o botón Smash / stick derecho)'],
  ['Salto + Ataque juntos', 'Salto corto con golpe aéreo · Escudo + Ataque = agarre'],
  ['Corriendo + Ataque', 'Ataque en carrera'],
  ['En el aire: Ataque / →←↑↓', '5 ataques aéreos distintos (↓ = meteoro)'],
  ['Especial / → / ↑ / ↓ + Especial', '4 movimientos únicos por personaje · ↑ = recuperación'],
  ['Agarre, luego → ← ↑ ↓', '4 lanzamientos · Ataque = golpear al agarrado'],
  ['Escudo · Escudo + ← → / ↓', 'Bloquear · rodar · esquivar · en el aire: esquive direccional'],
  ['Mantén ↓ en plataforma · ↓ cayendo', 'Bajar de la plataforma · caída rápida'],
  ['Rompe el Orbe Final → Especial', '¡GOLPE FINAL!'],
  ['Habilidad propia', 'Flotar, planear, paredes, paso relámpago, armadura… (se ve al elegir)'],
  ['Con bate o espada', 'Ataque, ↑, ↓, corriendo o Smash: golpes distintos · Agarre: lanzar'],
];
