'use strict';
// ============================================================
//  PERSONAJES NUEVOS: Mariachi, Chupacabras, Dinomita (T-Rex),
//  Relámpago (luchador) y Axo (ajolote). Cada uno pelea distinto:
//  guitarra y canciones, mordidas que curan, cabezazos y cola,
//  llaves y planchas, agua y burbujas.
// ============================================================
Object.assign(SPECIALS, {
  // ===================== MARIACHI =====================
  mariachi: {
    n: { name: 'Grito de Mariachi', anim: 'cast', dur: 34,
      onFrame(f, m) {
        if (m.f === 10 && countProj(f, 'note') < 6) {
          Audio8.sfx('trumpet'); spawnFx('text', f.x + f.face * 30, f.y - 150 * f.size(), { txt: '¡AJÚA!', col: '#e9c46a', size: 30 });
          [-2.2, 0, 2.2].forEach((vy, i) => spawnProjectile(f, { type: 'note', x: f.x + f.face * 36, y: f.y - 84, vx: f.face * 8.6, vy, r: 13, life: 50, dmg: 4.5, ang: 40, bkb: 4.5, kbg: 3.5, col: ['#e9c46a', '#f4efe8', '#e63946'][i] }));
        }
      } },
    s: { name: 'Guitarrazo', anim: 'mr_guitarSwing', dur: 40, oncePerAir: 1, guitar: 1,
      hits: [HB(10, 13, 58, -70, 30, 14, 40, 8.5, 12, { sfx: 'bighit' })],
      onFrame(f, m) {
        if (m.f >= 7 && m.f <= 12) f.vx = f.face * 4.5;
        if (m.f === 10) Audio8.sfx('strum');
        if (!f.grounded) f.vy = Math.min(f.vy, 3);
      } },
    u: { name: 'Sombrero Volador', anim: 'mr_hatSpin', dur: 58, helpless: 1,
      hits: [HB(6, 40, 0, -118, 34, 2, 85, 3, 0.5, { rehit: 5, grp: 1, vfx: 1 }), HB(41, 44, 0, -118, 40, 6, 80, 7.5, 8, { vfx: 1 })],
      onFrame(f, m) {
        if (m.f >= 6 && m.f <= 40) { f.grounded = false; f.vy = m.f < 26 ? -9.4 : -5.6; f.vx = approach(f.vx, f.ctrl.x * 5.6, 0.55); if (m.f % 6 === 0) Audio8.sfx('swing', 0.7); }
      } },
    d: { name: 'Canción de Cuna', anim: 'mr_strum', dur: 50, guitar: 1,
      hits: [HB(15, 19, 10, -60, 95, 1, 80, 2, 0, { sleep: 70, grp: 1, vfx: 1 })],
      onFrame(f, m) {
        if (m.f >= 4 && m.f <= 17 && m.f % 4 === 0) { Audio8.sfx('strum', 0.6); spawnFx('note', f.x + rand(-30, 40) * f.face, f.y - rand(60, 110), { col: pick(['#bfe9ff', '#e9c46a', '#f4efe8']), life: 40 }); }
        if (m.f === 15) spawnFx('ring', f.x, f.y - 60, { r: 110, col: '#bfe9ff', life: 24 });
      } },
    f: { name: 'Mariachi Completo', anim: 'final', dur: 170, final: 1,
      onFrame(f, m) {
        const st = BATTLE.stage;
        f.vx = 0; if (!f.grounded) f.vy = Math.min(f.vy, 0) * 0.8;
        if (m.f === 1) {
          dim(170); Audio8.sfx('trumpet');
          for (const s of [-1, 1]) { const x = s < 0 ? st.left + 70 : st.right - 70; spawnProjectile(f, { type: 'band', x, y: floorAt(x) - 50, vx: 0, vy: 0, r: 46, life: 165, dir: -s, dmg: 0, arm: 9999, pierce: 1, reflect: 0 }); }
        }
        if (m.f >= 22 && m.f <= 118 && m.f % 12 === 10) {
          Audio8.sfx(m.f % 24 === 10 ? 'trumpet' : 'violin');
          for (const s of [-1, 1]) { const x = s < 0 ? st.left + 110 : st.right - 110; spawnProjectile(f, { type: 'note', x, y: floorAt(x) - rand(50, 150), vx: -s * 11, vy: rand(-1, 1), r: 16, life: 110, dmg: 4, ang: 70, bkb: 5, kbg: 2, pierce: 1, reflect: 0, col: pick(['#e9c46a', '#e63946', '#f4efe8']) }); }
        }
        if (m.f === 132) {
          shake(24); flash(0.6); Audio8.sfx('ko');
          for (let i = 0; i < 12; i++) spawnFx('note', rand(st.left, st.right), st.top - rand(20, 260), { col: pick(['#e9c46a', '#e63946', '#f4efe8']), life: 50 });
          hitArea(f, { x: st.left - 200, y: st.top - 600, w: st.right - st.left + 400, h: 640 }, { dmg: 14, ang: 80, bkb: 15, kbg: 11, sfx: 'bighit' });
        }
      } },
  },
  // ===================== CHUPACABRAS =====================
  chupa: {
    n: { name: 'Mordida', anim: 'cb_bite', dur: 40,
      grabBox: HB(8, 14, 36, -64, 28, 0, 0, 0, 0), command: { anim: 'cb_feed', dur: 42, at: 24, dmg: 10, ang: 50, bkb: 7, kbg: 7, drain: 0.7, effect: 'slash' },
      onFrame(f, m) { if (m.f >= 6 && m.f <= 12) f.vx = f.face * 6; else f.vx *= 0.8; if (m.f === 8) Audio8.sfx('swing', 1.2); } },
    s: { name: 'Salto Depredador', anim: 'pounce', dur: 44, oncePerAir: 1, land: 12,
      hits: [HB(8, 26, 30, -50, 30, 11, 45, 7.5, 9.5, { grp: 1, effect: 'slash', drain: 0.3 })],
      onFrame(f, m) {
        if (m.f === 7) { f.vy = f.grounded ? -9 : Math.min(f.vy, -5); f.vx = f.face * 12.5; f.grounded = false; Audio8.sfx('swing', 1.3); }
        if (m.f >= 7 && m.f <= 26 && m.f % 5 === 2) spawnFx('claw', f.x + f.face * 36, f.y - 60, { dir: f.face });
        if (m.f > 26) f.vx *= 0.9;
      } },
    u: { name: 'Alas de Murciélago', anim: 'cb_wings', dur: 60, helpless: 1,
      hits: [HB(4, 10, 0, -70, 34, 4, 80, 5, 4, { vfx: 1 }), HB(18, 24, 0, -70, 34, 4, 80, 5, 4, { vfx: 1 }), HB(32, 38, 0, -70, 36, 6, 80, 7, 7, { vfx: 1 })],
      onFrame(f, m) {
        if (m.f === 4 || m.f === 18 || m.f === 32) { f.grounded = false; f.vy = m.f === 4 ? -12.5 : m.f === 18 ? -11 : -10; Audio8.sfx('wind'); spawnFx('dust', f.x, f.y + 4); }
        if (m.f >= 4 && m.f <= 44) f.vx = approach(f.vx, f.ctrl.x * 6, 0.5);
      } },
    d: { name: 'Espinas', anim: 'cb_hunch', dur: 44, armor: [4, 14],
      hits: [HB(10, 14, 38, -66, 28, 10, 50, 7, 9, { vfx: 1 }), HB(10, 14, -42, -66, 28, 10, 130, 7, 9, { vfx: 1 }), HB(10, 14, 0, -108, 30, 10, 90, 7, 9, { vfx: 1 })],
      onFrame(f, m) {
        if (m.f === 10) { Audio8.sfx('shoot'); for (let i = 0; i < 7; i++) { const a = -Math.PI + i * Math.PI / 6; spawnFx('spike', f.x + Math.cos(a) * 18, f.y - 64 + Math.sin(a) * 18, { ang: a, r: 34, life: 16 }); } }
      } },
    f: { name: 'Noche sin Luna', anim: 'final', dur: 160, final: 1,
      onFrame(f, m) {
        if (m.f === 1) { m.v.x0 = f.x; m.v.y0 = f.y; m.v.targets = opponentsOf(f).filter(o => Math.abs(o.x - f.x) < 1100 && !o.dead); dim(170); Audio8.sfx('teleport'); }
        f.vx = 0; f.vy = 0; f.hidden = m.f > 10 && m.f < 146;
        if (m.f === 12) for (const o of m.v.targets) for (let i = 0; i < 2; i++) spawnFx('cateyes', o.x + rand(-140, 140), o.y - rand(60, 200));
        if (m.f > 16 && m.f < 122 && m.f % 10 === 0) for (const o of m.v.targets) {
          if (o.dead) continue;
          spawnFx('claw', o.x + rand(-20, 20), o.y - 50 + rand(-20, 20), { dir: pick([-1, 1]) });
          applyHit(f, o, { dmg: 3, ang: 90, bkb: 1.5, kbg: 0, effect: 'slash', sfx: 'hit', drain: 0.5 }, 1, { noLaunch: true });
        }
        if (m.f === 132) for (const o of m.v.targets) { if (o.dead) continue; spawnFx('boom', o.x, o.y - 50, { r: 120, col: '#ff2d2d' }); applyHit(f, o, { dmg: 14, ang: 55, bkb: 17, kbg: 12, sfx: 'bighit', effect: 'slash', drain: 0.5 }, sign(o.x - m.v.x0) || 1); }
        if (m.f === 146) { f.x = m.v.x0; f.y = m.v.y0; }
      } },
  },
  // ===================== DINOMITA (T-Rex) =====================
  dino: {
    n: { name: 'Rugido', anim: 'dn_roar', dur: 46, reflect: [12, 26],
      hits: [HB(12, 26, 72, -84, 56, 3, 22, 11, 1.5, { grp: 1, vfx: 1 })],
      onFrame(f, m) {
        if (m.f === 12) { Audio8.sfx('rumble'); Audio8.sfx('voice', 0.4); shake(7); spawnFx('ring', f.x + f.face * 50, f.y - 110 * f.size(), { r: 90, col: '#f4efe8', life: 20 }); }
        if (m.f >= 12 && m.f <= 26 && m.f % 3 === 0) spawnFx('wind', f.x + f.face * rand(50, 120), f.y - rand(60, 120), { dir: f.face });
      } },
    s: { name: 'Mordida Jurásica', anim: 'dn_chomp', dur: 48, oncePerAir: 1,
      grabBox: HB(10, 16, 52, -86, 32, 0, 0, 0, 0), command: { anim: 'dn_shake', dur: 50, at: 34, dmg: 14, ang: 40, bkb: 9, kbg: 10.5 },
      onFrame(f, m) { if (m.f >= 8 && m.f <= 14) f.vx = f.face * 7; else f.vx *= 0.85; if (m.f === 10) Audio8.sfx('swing', 0.7); } },
    u: { name: 'Cola Resorte', anim: 'dn_spring', dur: 50, helpless: 1,
      hits: [HB(5, 12, 0, -24, 42, 11, 85, 8, 9, { vfx: 1, sfx: 'bighit' })],
      onFrame(f, m) {
        if (m.f === 5) { f.vy = -22.5; f.grounded = false; Audio8.sfx('djump'); spawnFx('boom', f.x, f.y, { r: 44, col: '#e7d8a8' }); }
        if (m.f >= 5 && m.f <= 28) f.vx = f.ctrl.x * 5.3;
      } },
    d: { name: 'Meteorito', anim: 'dn_skyRoar', dur: 50,
      onFrame(f, m) {
        if (m.f === 14 && countProj(f, 'meteor') < 1) {
          Audio8.sfx('rumble');
          const x = clamp(f.x + f.face * 200, BATTLE.stage.left + 20, BATTLE.stage.right - 20), fy = floorAt(x);
          spawnFx('target', x, fy, { life: 36, col: '#ff6d00' });
          spawnProjectile(f, { type: 'meteor', x, y: fy - 640, vx: 0, vy: 0, delay: 34, dropV: 19, r: 26, life: 90, dmg: 15, ang: 60, bkb: 9, kbg: 10, explodeGround: 1, col: '#ff6d00', reflect: 0, pierce: 1, effect: 'fire' });
        }
      } },
    f: { name: 'Extinción', anim: 'final', dur: 160, final: 1,
      onFrame(f, m) {
        const st = BATTLE.stage;
        f.vx = 0; if (!f.grounded) f.vy = Math.min(f.vy, 0) * 0.8;
        if (m.f === 1) { dim(160); Audio8.sfx('rumble'); }
        if (m.f >= 16 && m.f <= 112 && m.f % 8 === 0) {
          const x = rand(st.left + 20, st.right - 20);
          spawnProjectile(f, { type: 'meteor', x, y: floorAt(x) - 700, vx: rand(-2, 2), vy: 0, delay: 14, dropV: 20, r: 24, life: 90, dmg: 7, ang: 70, bkb: 6, kbg: 3, explodeGround: 1, col: '#ff9f1c', reflect: 0, pierce: 1, effect: 'fire' });
        }
        if (m.f === 120) {
          const o = opponentsOf(f).sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x))[0], x = o ? o.x : f.x + f.face * 200;
          spawnFx('target', x, floorAt(x), { life: 30, col: '#ff2d2d' });
          spawnProjectile(f, { type: 'meteor', x, y: floorAt(x) - 800, vx: 0, vy: 0, delay: 26, dropV: 24, r: 64, life: 90, dmg: 20, ang: 55, bkb: 16, kbg: 12, explodeGround: 1, col: '#ff2d2d', reflect: 0, pierce: 1, effect: 'fire' });
        }
      } },
  },
  // ===================== RELÁMPAGO (luchador) =====================
  luchador: {
    n: { name: 'La Quebradora', anim: 'grab', dur: 48,
      grabBox: HB(11, 14, 36, -56, 26, 0, 0, 0, 0), command: { anim: 'lx_backbreaker', dur: 52, at: 36, dmg: 12, ang: 82, bkb: 8, kbg: 10, slam: 1 } },
    s: { name: 'Huracanrana', anim: 'lx_hurri', dur: 50, oncePerAir: 1, land: 14,
      grabBox: HB(10, 20, 34, -80, 28, 0, 0, 0, 0), command: { anim: 'lx_hurriThrow', dur: 44, at: 26, dmg: 12, ang: 300, bkb: 8, kbg: 9, slam: 1 },
      onFrame(f, m) {
        if (m.f === 6) { f.vy = f.grounded ? -8 : Math.min(f.vy, -4); f.vx = f.face * 11; f.grounded = false; Audio8.sfx('swing', 1.2); }
        if (m.f > 22) f.vx *= 0.9;
      } },
    u: { name: 'Tercera Cuerda', anim: 'jump', dur: 56, helpless: 1,
      hits: [HB(6, 14, 20, -110, 30, 9, 80, 7, 8)],
      onFrame(f, m) { if (m.f === 6) { f.vy = -20.5; f.grounded = false; Audio8.sfx('djump'); spawnFx('boom', f.x, f.y, { r: 30, col: '#ffbe0b' }); } if (m.f >= 6 && m.f <= 30) f.vx = f.ctrl.x * 4.5; } },
    d: { name: 'Plancha', anim: 'lx_splash', dur: 50, land: 18,
      hits: [HB(10, 34, 20, -40, 40, 12, 60, 8, 9.5, { grp: 1, vfx: 1 })],
      onFrame(f, m) {
        if (m.f === 1 && f.grounded) { f.vy = -11; f.grounded = false; }
        if (m.f === 10) { f.vy = 15; f.vx = f.face * 7; Audio8.sfx('swing', 0.8); }
        if (m.f > 12 && f.grounded && !m.v.landed) { m.v.landed = 1; shake(9); Audio8.sfx('explosion'); spawnFx('boom', f.x, f.y - 10, { r: 70, col: '#ffbe0b' }); for (let i = 0; i < 4; i++) spawnFx('dust', f.x + rand(-40, 40), f.y - 4); m.f = Math.max(m.f, 36); }
        if (!m.v.landed && m.f >= 30 && !f.grounded) m.f = 30;
      } },
    f: { name: 'Lucha Estelar', anim: 'final', dur: 170, final: 1,
      onFrame(f, m) {
        if (m.f === 1) { dim(170); Audio8.sfx('final'); m.v.t = opponentsOf(f).filter(o => Math.abs(o.x - f.x) < 900).sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x))[0] || null; }
        const t = m.v.t;
        if (!t || t.dead) { f.vx = 0; return; }
        if (m.f === 12) { if (t.grabbing) t.releaseGrab(); if (t.grabbedBy) t.grabbedBy.releaseGrab(); if (['ledge', 'climb', 'grabbed', 'holding'].includes(t.state)) t.setState('air'); spawnFx('boom', f.x, f.y - 50, { r: 60, col: '#ffbe0b' }); f.x = t.x - f.face * 30; f.y = t.y; Audio8.sfx('teleport'); spawnFx('text', f.x, f.y - 160, { txt: '¡A LA LONA!', col: '#ffbe0b', size: 40 }); }
        if (m.f >= 12 && !m.v.done) {
          t.hitlag = 2; t.vx = t.vy = 0; t.lx = t.ly = 0; t.grounded = false; t.x = f.x + f.face * 6; t.y = f.y - 104 * f.size();
          if (m.f === 40) { f.vy = -17; f.grounded = false; Audio8.sfx('djump'); }
          if (m.f < 40) { f.vx = 0; }
          if ((m.f > 48 && f.grounded) || m.f >= 118) {
            m.v.done = 1; t.y = f.y; shake(26); flash(0.7); Audio8.sfx('ko');
            spawnFx('boom', f.x, f.y - 20, { r: 160, col: '#ffbe0b' }); spawnFx('shock', f.x, f.y);
            applyHit(f, t, { dmg: 26, ang: 80, bkb: 17, kbg: 13, sfx: 'bighit' }, f.face);
            m.f = Math.max(m.f, 140);
          }
        }
      } },
  },
  // ===================== AXO (ajolote) =====================
  axo: {
    n: { name: 'Burbuja', anim: 'cast', dur: 36,
      onFrame(f, m) { if (m.f === 11 && countProj(f, 'bubble') < 1) { Audio8.sfx('splash'); spawnProjectile(f, { type: 'bubble', x: f.x + f.face * 38, y: f.y - 70, vx: f.face * 4.2, vy: -0.4, r: 18, life: 140, dmg: 3, ang: 80, bkb: 3, kbg: 0, sleep: 55, trap: 1, col: '#bfe9ff' }); } } },
    s: { name: 'Chorro de Agua', anim: 'palmBlast', dur: 40, holdLoop: [12, 70],
      hits: [HB(10, 34, 72, -70, 32, 1.2, 15, 5.5, 0.6, { rehit: 5, grp: 1, vfx: 1 })],
      onFrame(f, m) {
        if (m.f >= 10 && m.f <= 34) { for (let i = 0; i < 2; i++) spawnFx('spark', f.x + f.face * rand(40, 110), f.y - 70 + rand(-12, 12), { col: pick(['#a9def9', '#e6f8ff', '#5fa8d3']) }); if (m.t % 9 === 0) Audio8.sfx('splash', 0.5); }
        if (!f.grounded) f.vy = Math.min(f.vy, 2);
      } },
    u: { name: 'Géiser', anim: 'jump', dur: 52, helpless: 1,
      onFrame(f, m) {
        if (m.f === 4) {
          Audio8.sfx('splash'); spawnProjectile(f, { type: 'geyser', x: f.x, y: f.y, r: 26, h: 170, vx: 0, vy: 0, life: 24, arm: 9999, pierce: 1, reflect: 0, dmg: 0 });
          hitArea(f, { x: f.x - 34, y: f.y - 170, w: 68, h: 176 }, { dmg: 7, ang: 88, bkb: 8, kbg: 7 });
          f.vy = -19; f.grounded = false;
        }
        if (m.f >= 4 && m.f <= 24) { f.vx = f.ctrl.x * 4; if (m.f % 3 === 0) spawnFx('spark', f.x + rand(-10, 10), f.y + 6, { col: '#a9def9' }); }
      } },
    d: { name: 'Charco', anim: 'item', dur: 30,
      onFrame(f, m) {
        if (m.f === 10) {
          for (const p of BATTLE.projectiles) if (p.owner === f && p.type === 'puddle') p.life = Math.min(p.life, 20);
          Audio8.sfx('throw');
          spawnProjectile(f, { type: 'puddle', x: f.x + f.face * 36, y: f.y - 40, vx: f.face * 3, vy: -4, grav: 0.6, r: 12, life: 360, pierce: 1, reflect: 0, rehit: 60,
            dmg: 2, ang: 80, bkb: 2, kbg: 0, trip: 1, col: '#8ecae6',
            onGround(p, s) { p.y = s.y - 6; p.vy = 0; p.vx = 0; p.grav = 0; p.r = 34; p.on = 1; p.puddle = 1; Audio8.sfx('splash', 0.6); } });
        }
      } },
    f: { name: 'Trajinera de Xochimilco', anim: 'final', dur: 170, final: 1,
      onFrame(f, m) {
        const st = BATTLE.stage;
        f.vx = 0; if (!f.grounded) f.vy = Math.min(f.vy, 0) * 0.8;
        if (m.f === 1) { dim(170); Audio8.sfx('splash'); }
        if (m.f === 20 || m.f === 80) {
          const s = m.f === 20 ? -f.face : f.face, x = s < 0 ? st.left + 20 : st.right - 20;
          Audio8.sfx('trumpet');
          spawnProjectile(f, { type: 'trajinera', x, y: floorAt(x) - 60, vx: -s * 12, vy: 0, r: 60, life: 200, dir: -s, dmg: 16, ang: 45, bkb: 15, kbg: 11, pierce: 1, reflect: 0, ground: 1, sfx: 'bighit' });
        }
        if (m.f % 4 === 0 && m.f < 150) spawnFx('drop', rand(st.left, st.right), floorAt(rand(st.left, st.right)) - 4, { life: 26 });
      } },
  },
});

Object.assign(CHARS, {
  mariachi: { id: 'mariachi', name: 'Mariachi', title: 'El Charro Cantor', blurb: 'Pelea con la guitarra, canta notas que pegan y duerme a quien lo escuche.', beast: 1,
    weight: 102, walk: 3.8, run: 9.2, air: 5.9, airAcc: 0.48, grav: 0.66, fall: 11.5, ffall: 17, jump: 15.2, djump: 14, jumps: 2, traction: 0.8,
    power: 1.02, reach: 1.1, speed: 1.0, size: 1.02, bars: { fuerza: 3, velocidad: 3, peso: 3, rango: 4 } },
  chupa: { id: 'chupa', name: 'Chupacabras', title: 'El Terror del Rancho', blurb: 'Rápido y encorvado: garras, mordidas que lo curan y alas para volver.', beast: 1,
    weight: 86, walk: 4.3, run: 10.8, air: 6.6, airAcc: 0.58, grav: 0.68, fall: 12, ffall: 18, jump: 15.2, djump: 13.5, jumps: 2, traction: 0.92,
    power: 0.95, reach: 1.06, speed: 1.15, size: 0.98, bars: { fuerza: 3, velocidad: 4, peso: 2, rango: 3 } },
  dino: { id: 'dino', name: 'Dinomita', title: 'El T-Rex', blurb: 'Cabezota, mordidas y cola: el más grande y pesado, lento pero demoledor.', beast: 1,
    weight: 134, walk: 3.0, run: 8.0, air: 4.8, airAcc: 0.36, grav: 0.75, fall: 13, ffall: 18.5, jump: 14.8, djump: 13, jumps: 2, traction: 0.7,
    power: 1.28, reach: 1.12, speed: 0.82, size: 1.2, bars: { fuerza: 5, velocidad: 1, peso: 5, rango: 4 } },
  luchador: { id: 'luchador', name: 'Relámpago', title: 'El Luchador Enmascarado', blurb: 'Llaves, planchas y vuelo desde la tercera cuerda: agarrarte es su especialidad.', beast: 1,
    weight: 110, walk: 3.8, run: 9.6, air: 6.0, airAcc: 0.5, grav: 0.7, fall: 12, ffall: 17.5, jump: 16, djump: 15, jumps: 2, traction: 0.82,
    power: 1.1, reach: 1.0, speed: 1.05, size: 1.04, bars: { fuerza: 4, velocidad: 3, peso: 4, rango: 2 } },
  axo: { id: 'axo', name: 'Axo', title: 'El Ajolote de Xochimilco', blurb: 'Nada en el aire: burbujas que atrapan, chorros de agua y charcos resbalosos.', beast: 1,
    weight: 90, walk: 3.8, run: 9.2, air: 6.4, airAcc: 0.55, grav: 0.58, fall: 10, ffall: 15, jump: 14.5, djump: 12.5, jumps: 3, traction: 0.75,
    power: 0.9, reach: 0.95, speed: 1.05, size: 0.92, bars: { fuerza: 2, velocidad: 3, peso: 2, rango: 4 } },
});
CHAR_ORDER.push('mariachi', 'chupa', 'dino', 'luchador', 'axo');

Object.assign(CHAR_TWEAKS, {
  mariachi(set) { for (const k of ['ftilt', 'fsmash', 'usmash', 'fair']) set[k].guitar = 1; set.dash.guitar = 1; set.fsmash.hits.forEach(h => { h.sfx = 'bighit'; }); },
  chupa(set) { for (const k of ['jab1', 'jab2', 'ftilt', 'fsmash', 'fair', 'bair']) set[k].hits.forEach(h => { h.effect = 'slash'; }); set.jab3.hits.forEach(h => { h.drain = 0.4; }); set.fsmash.hits.forEach(h => { h.drain = 0.25; }); },
  dino(set) { set.fsmash.armor = [4, 15]; set.bair.hits.forEach(h => { h.bkb *= 1.12; h.dmg *= 1.1; }); },
  luchador(set) {
    for (const k of ['grab', 'dashgrab']) { set[k].grabBox.r *= 1.12; set[k].grabBox.x *= 1.06; }
    for (const k of ['fthrow', 'bthrow', 'uthrow', 'dthrow']) if (set[k]) { set[k].dmg *= 1.1; set[k].bkb *= 1.04; }
  },
  axo(set) { for (const k of ['ftilt', 'fsmash', 'nair']) set[k].hits.forEach(h => { h.effect = 'elec'; h.col = '#a9def9'; }); },
});

// ---------- habilidades ----------
Object.assign(ABILITIES, {
  mariachi: {
    name: 'Ritmo', desc: 'Cada tercer golpe seguido suena un acorde y pega 30% más fuerte',
    dmg: f => (f.rhythm || 0) === 2 && BATTLE && BATTLE.t - (f.rhythmT || 0) < 100 ? 1.3 : 1,
    onHit(f) {
      if (BATTLE.t - (f.rhythmT || 0) > 100) f.rhythm = 0;
      if (BATTLE.t === f.rhythmT) return; // un golpe que toca a varios cuenta una vez
      f.rhythm = (f.rhythm || 0) + 1; f.rhythmT = BATTLE.t;
      if (f.rhythm >= 3) { f.rhythm = 0; Audio8.sfx('strum'); for (let i = 0; i < 3; i++) spawnFx('note', f.x + rand(-30, 30), f.y - rand(90, 140), { col: '#e9c46a', life: 40 }); }
    },
  },
  chupa: { name: 'Acecho', desc: 'Sus mordidas lo curan · agachado carga un súper salto (50% más alto)', crouchJump: 1.22 },
  dino: { name: 'Escamas', desc: 'Los proyectiles le hacen la mitad de daño y casi no lo empujan', projResist: 0.5 },
  luchador: { name: 'Llave maestra', desc: 'Agarra desde más lejos, sus lanzamientos pegan y mandan más lejos, y se zafa rápido de los agarres', escape: 1.6 },
  axo: {
    name: 'Regeneración', desc: 'Si no le pegan en 3 segundos, se cura 1% cada medio segundo',
    tick(f) {
      if (f.dead || !BATTLE || BATTLE.phase !== 'fight' || BATTLE.t - (f.lastHurtT || 0) < 180 || BATTLE.t % 30) return;
      const hp = BATTLE.rules.mode === 'hp';
      if (hp ? f.hp >= f.maxHp : f.percent <= 0) return;
      if (hp) f.hp = Math.min(f.maxHp, f.hp + 1); else f.percent = Math.max(0, f.percent - 1);
      spawnFx('spark', f.x + rand(-14, 14), f.y - rand(30, 90) * f.size(), { col: '#ff8fab' });
    },
  },
});

// ---------- animaciones propias ----------
Object.assign(A2, {
  // mariachi: guitarra como arma, zapateado y el sombrero
  mr_guitarSwing: { limb: 'guitar', heavy: 1, w: { armF: [-1.3, 0.5], armB: [-1.1, 0.6], lean: -0.3, face: 'angry' }, h: { armF: [1.5, 0.05], armB: [1.3, 0.15], lean: 0.4, legF: [0.9, -0.9], legB: [-0.7, -0.2], face: 'angry' }, f: { armF: [2.2, 0.1], armB: [2.0, 0.2], lean: 0.45 } },
  mr_guitarSmash: { limb: 'guitar', heavy: 1, w: { armF: [3.3, 0.2], armB: [3.2, 0.25], lean: -0.3, bodyY: -3, face: 'angry' }, h: { armF: [1.45, 0.05], armB: [1.35, 0.1], lean: 0.6, bodyX: 8, legF: [1.0, -0.8], legB: [-0.9, -0.05], face: 'angry' }, f: { armF: [1.0, 0.1], armB: [0.9, 0.15], lean: 0.65, bodyX: 10 } },
  mr_guitarUp: { limb: 'guitar', heavy: 1, w: { armF: [0.3, 0.3], armB: [0.2, 0.4], lean: 0.3, bodyY: 5 }, h: { armF: [2.4, 0.1], armB: [2.2, 0.15], lean: 0.0, bodyY: -3, face: 'angry' }, x: { armF: [3.3, 0], armB: [3.1, 0.05], lean: -0.25, bodyY: -6 }, f: { armF: [3.4, 0.05], lean: -0.2 } },
  mr_slide: { limb: 'guitar', w: { lean: 0.1, armF: [0.6, 0.6] }, h: { lean: -0.45, legF: [1.7, -2.5], legB: [-0.3, -2.3], armF: [1.4, 0.2], armB: [1.2, 0.3], bodyY: 14, face: 'happy' }, m: { lean: -0.45, bodyY: 14 }, f: { lean: -0.2, bodyY: 6 } },
  mr_strum: { limb: 'guitar', w: { armF: [1.2, 1.2], armB: [0.8, 1.2], lean: -0.05, face: 'happy' }, h: { armF: [1.0, 1.5], armB: [0.9, 1.1], lean: -0.1, legF: [0.4, -0.4], face: 'happy' } },
  mr_heel: { limb: 'footF', w: { legF: [1.2, -2.2], legB: [-0.2, -0.3], lean: 0.02, armF: [0.4, 1.3], armB: [0.3, 1.4] }, h: { legF: [1.4, -0.05], legB: [-0.3, -0.1], lean: -0.3, armF: [0.3, 1.2], armB: [-0.3, 1.3], face: 'angry' }, f: { legF: [1.2, -0.4] } },
  mr_stomp: { limb: 'footF', w: { legF: [1.45, -2.35], legB: [-0.1, -0.25], lean: 0.2, armF: [0.4, 1.3] }, h: { legF: [0.75, -0.08], legB: [-0.4, -0.3], lean: 0.3, bodyY: 5, armF: [0.3, 1.3], face: 'angry' }, f: { legF: [0.7, -0.2] } },
  mr_hatSpin: { w: { hat: 0.4, armF: [2.4, 0.6], armB: [2.2, 0.6], lean: 0.05 }, h: { hat: 1, armF: [2.9, 0.3], armB: [2.8, 0.4], legF: [0.5, -0.8], legB: [0.2, -0.6], face: 'happy' }, f: { hat: 0.2 } },
  // chupacabras: encorvado, mordidas y alas
  cb_bite: { limb: 'head', w: { lean: -0.2, armF: [0.8, 1.9], armB: [0.6, 1.9] }, h: { lean: 0.85, bodyX: 8, armF: [1.3, 0.3], armB: [1.1, 0.4], legF: [1.1, -0.9], legB: [-0.9, -0.1], face: 'angry' }, f: { lean: 0.7, bodyX: 6 } },
  cb_feed: { limb: 'head', w: { lean: 0.6, armF: [1.3, 0.8], armB: [1.1, 0.9], face: 'angry' }, h: { lean: 0.9, bodyY: 4, armF: [1.2, 0.9], armB: [1.0, 1.0], face: 'angry' } },
  cb_hunch: { w: { lean: 0.9, bodyY: 10, legF: [1.4, -2.2], legB: [0.6, -2.1], armF: [0.4, 1.2], armB: [0.3, 1.2] }, h: { lean: 0.95, bodyY: 12, legF: [1.5, -2.3], legB: [0.7, -2.2], armF: [0.2, 0.6], armB: [-0.2, 0.6], face: 'angry' } },
  cb_wings: { w: { wing: 0.6, lean: 0.05, armF: [1.8, 0.8], armB: [1.6, 0.9] }, h: { wing: 1, armF: [2.4, 0.5], armB: [2.2, 0.6], legF: [0.6, -1.0], legB: [0.2, -0.8], face: 'angry' }, f: { wing: 0.8 } },
  cb_doubleClaw: { limb: 'hands', heavy: 1, w: { armF: [2.9, 0.4], armB: [2.8, 0.5], lean: -0.25, face: 'angry' }, h: { armF: [1.2, 0.1], armB: [1.1, 0.15], lean: 0.6, bodyX: 10, legF: [1.1, -0.9], legB: [-0.9, -0.1], face: 'angry' }, f: { armF: [0.6, 0.2], armB: [0.5, 0.2], lean: 0.65, bodyX: 10 } },
  // T-Rex: mordidas con la cabezota, cola y el rugido
  dn_chomp: { limb: 'head', w: { lean: 0.15, jaw: 1, bodyX: -3, face: 'angry' }, h: { lean: 0.75, jaw: 0, bodyX: 8, legF: [0.9, -0.9], legB: [-0.8, -0.2], face: 'angry' }, f: { lean: 0.62, jaw: 0.2, bodyX: 6 } },
  dn_bigChomp: { limb: 'head', heavy: 1, w: { lean: -0.2, jaw: 1, bodyX: -6, legF: [0.7, -0.9], legB: [-0.5, -0.4], face: 'angry' }, h: { lean: 0.9, jaw: 0, bodyX: 14, legF: [1.1, -0.8], legB: [-1.0, 0], face: 'angry' }, f: { lean: 0.85, jaw: 0.1, bodyX: 14 } },
  dn_headUp: { limb: 'head', w: { lean: 0.75, bodyY: 6, jaw: 0.6 }, h: { lean: -0.5, bodyY: -6, jaw: 0.2, face: 'angry' }, f: { lean: -0.4, bodyY: -4 } },
  dn_tailWhip: { limb: 'tail', air: 1, heavy: 1, w: { lean: 0.2, tail: -0.5 }, h: { lean: 0.7, tail: 0.75, legF: [0.9, -1.2], face: 'angry' }, f: { lean: 0.6, tail: 0.5 } },
  dn_roar: { w: { lean: -0.15, jaw: 0.4, bodyY: 2 }, h: { lean: 0.35, jaw: 1, armF: [1.6, 1.2], armB: [1.4, 1.3], face: 'angry' }, f: { jaw: 0.8 } },
  dn_skyRoar: { w: { lean: 0.3, jaw: 0.3 }, h: { lean: -0.55, jaw: 1, head: -0.6, face: 'angry' }, f: { lean: -0.4, jaw: 0.6 } },
  dn_spring: { limb: 'feet', w: { lean: 0.5, bodyY: 10, tail: -0.6, legF: [1.4, -2.3], legB: [0.7, -2.2] }, h: { lean: -0.1, bodyY: -4, tail: -0.9, legF: [0.1, -0.1], legB: [-0.1, -0.1], face: 'angry' } },
  dn_shake: { limb: 'head', w: { lean: 0.6, jaw: 0, bodyX: 4 }, h: { lean: 0.2, jaw: 0.1, head: 0.5, bodyX: -2, face: 'angry' }, f: { lean: 0.5, jaw: 0.9 } },
  // luchador: llaves y vuelo
  lx_backbreaker: { w: { armF: [3.0, 0.3], armB: [2.9, 0.3], bodyY: 4, face: 'angry' }, h: { armF: [1.2, 0.2], armB: [1.1, 0.2], bodyY: 12, lean: 0.3, legF: [1.4, -1.8], legB: [-0.3, -0.3], face: 'angry' } },
  lx_hurri: { limb: 'feet', w: { lean: 0.3, legF: [1.3, -2.0], legB: [0.6, -1.8] }, h: { legF: [1.9, -0.3], legB: [1.7, -0.3], lean: -0.8, armF: [0.6, 0.6], armB: [0.4, 0.6], face: 'angry' }, f: { lean: -0.6 } },
  lx_hurriThrow: { spin: { turns: -1, from: 'w', to: 'h' }, w: { lean: -0.5, legF: [2.0, -0.4], legB: [1.8, -0.4] }, h: { lean: 0.2, legF: [0.5, -0.6], legB: [-0.3, -0.4], face: 'angry' } },
  lx_splash: { limb: 'chest', w: { lean: -0.2, armF: [2.8, 0.4], armB: [2.7, 0.4] }, h: { lean: 1.45, armF: [1.6, 0.2], armB: [-1.3, 0.2], legF: [-0.3, -0.2], legB: [-0.5, -0.2], face: 'angry' }, f: { lean: 1.3 } },
  // chile: postura saltarina y rodada
  pp_roll: { limb: 'chest', spin: { turns: 2, from: 'h', to: 'x' }, w: { lean: 0.5, bodyY: 6, legF: [1.4, -2.3], legB: [0.8, -2.2], armF: [1.9, 1.6], armB: [1.7, 1.7] }, h: { lean: 0.6, legF: [1.6, -2.4], legB: [1.2, -2.3], armF: [2.0, 1.8], armB: [1.9, 1.8], face: 'angry' } },
});

Object.assign(STYLE, {
  mariachi: { jab1: 'bx_jab', jab2: 'jab2', jab3: 'mr_heel', ftilt: 'mr_guitarSwing', utilt: 'mr_guitarUp', dtilt: 'mr_stomp', dash: 'mr_slide', fsmash: 'mr_guitarSmash', usmash: 'mr_guitarUp', dsmash: 'stomp', nair: 'spinNair', fair: 'mr_guitarSwing' },
  chupa: { jab1: 'clawJab', jab2: 'clawJab', jab3: 'cb_bite', ftilt: 'clawSwipe', utilt: 'upper', dtilt: 'nj_sweep', dash: 'pounce', fsmash: 'cb_doubleClaw', usmash: 'upper', nair: 'spinNair', fair: 'clawSwipe', uair: 'nj_bicycle' },
  dino: { jab1: 'dn_chomp', jab2: 'dn_chomp', jab3: 'headbutt', utilt: 'dn_headUp', dash: 'bullRush', fsmash: 'dn_bigChomp', usmash: 'dn_headUp', dsmash: 'stomp', nair: 'spinNair', fair: 'headbutt', bair: 'dn_tailWhip', uair: 'dn_headUp' },
  luchador: { jab1: 'wr_forearm', jab2: 'chop', jab3: 'tk_frontSnap', ftilt: 'tk_highKick', utilt: 'wr_clapUp', dtilt: 'nj_sweep', dash: 'dropkick', fsmash: 'lariat', usmash: 'tk_scissor', nair: 'wr_splash', fair: 'dropkick', bair: 'bx_backfist', uair: 'nj_bicycle', dair: 'elbowDrop' },
  axo: { jab1: 'palm', jab2: 'tk_palm2', jab3: 'headbutt', ftilt: 'palmBlast', utilt: 'upper', dtilt: 'tk_lowSpin', dash: 'superman', fsmash: 'twoPalm', usmash: 'tk_scissor', dsmash: 'nj_split', nair: 'spinNair', fair: 'nj_airKick', uair: 'tk_splitAir' },
});
// el chile rueda en su ataque en carrera
STYLE.chilazo = Object.assign({}, STYLE.chilazo, { dash: 'pp_roll' });

Object.assign(STANCES, {
  // charro: erguido, pecho fuera y un vaivén al ritmo
  charro: (t) => { const s = Math.sin(t * 2.2); return { bodyY: Math.abs(s) * -1.2, lean: 0.02, armF: [0.35, 1.35], armB: [0.25, 1.4], legF: [0.32 + s * 0.04, -0.38], legB: [-0.3, -0.26], head: s * 0.08 }; },
  // chupacabras: agazapado, garras al frente, nervioso
  feral: (t, b) => { const tw = Math.sin(t * 13) * 0.03; return { bodyY: 7 + b * 1.4, lean: 0.58 + tw, armF: [1.25 + b * 0.08, 0.95], armB: [0.95, 1.05], legF: [0.95, -1.55], legB: [-0.18, -1.25], head: -0.25 }; },
  // T-Rex: inclinado, bracitos arriba, cabeceo
  rex: (t, b) => ({ bodyY: b * 1.5, lean: 0.46 + b * 0.02, armF: [0.75, 1.2], armB: [0.6, 1.3], legF: [0.55, -1.0], legB: [-0.42, -0.72], head: -0.35 + b * 0.05, tail: b * 0.06 }),
  // ajolote: flota como bajo el agua
  swim: (t) => { const s = Math.sin(t * 2.6); return { bodyY: s * 2.5 - 1, lean: 0.15 + s * 0.05, armF: [0.95 + s * 0.3, 1.2], armB: [0.6 - s * 0.3, 1.3], legF: [0.42, -0.6], legB: [-0.36, -0.42], tail: s * 0.15 }; },
  // chile: rebota con los puños arriba
  pepper: (t) => { const s = Math.abs(Math.sin(t * 4)); return { bodyY: -s * 2.6, lean: 0.06, armF: [1.0, 1.9], armB: [0.7, 2.1], legF: [0.5, -0.8 + s * 0.2], legB: [-0.5, -0.5 + s * 0.2] }; },
});
Object.assign(FIGHT_STYLE, { mariachi: 'charro', chupa: 'feral', dino: 'rex', luchador: 'wrestler', axo: 'swim', chilazo: 'pepper' });
Object.assign(RUN_STYLE, {
  charro: { lean: 0.3, amp: 0.95 },
  feral: { lean: 0.78, amp: 1.15, arms: 'back' },
  rex: { lean: 0.55, amp: 0.9, bounce: 1.6 },
  swim: { lean: 0.4, amp: 1.0, bounce: 1.3 },
  pepper: { lean: 0.35, amp: 1.1, bounce: 1.4 },
});
// el guitarrazo es un golpe con la guitarra: su área va donde queda la guitarra
ALIGN_SPECIALS.mariachi = ['sp_s'];
