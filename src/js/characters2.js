'use strict';
// ============================================================
//  PERSONAJES NUEVOS (no humanos): Torito, Chispa, Michi y Chilazo
// ============================================================
const floorAt = x => { const st = BATTLE.stage; const y = st.floorY(clamp(x, st.left + 1, st.right - 1)); return isFinite(y) ? y : st.top; };

Object.assign(SPECIALS, {
  // ===================== TORITO (minotauro) =====================
  torito: {
    n: { name: 'Bufido', anim: 'shoulder', dur: 36,
      onFrame(f, m) {
        if (m.f === 11) {
          Audio8.sfx('wind');
          spawnProjectile(f, { type: 'steam', x: f.x + f.face * 46, y: f.y - 96, vx: f.face * 7.5, vy: -0.4, r: 18, grow: 0.9, life: 22, dmg: 3, ang: 32, bkb: 9.5, kbg: 3, pierce: 1, reflect: 0, col: '#f1f5f9' });
          for (let i = 0; i < 3; i++) spawnFx('dust', f.x + f.face * (40 + i * 16), f.y - 94 + rand(-6, 6));
        }
      } },
    s: { name: 'Embestida de Cuernos', anim: 'shoulder', dur: 58, armor: [8, 36], oncePerAir: 1,
      hits: [HB(10, 36, 36, -66, 32, 12, 52, 8.5, 10, { grp: 1, sfx: 'bighit' })],
      onFrame(f, m) {
        if (m.f >= 10 && m.f <= 36) { f.vx = f.face * Math.min(13.5, 6 + m.f * 0.3); if (!f.grounded) f.vy = Math.min(f.vy, 1); if (m.f % 3 === 0) spawnFx('dust', f.x - f.face * 24, f.y - 4); }
        else if (m.f > 36) f.vx *= 0.84;
        if (m.f === 10) Audio8.sfx('wind');
      } },
    u: { name: 'Cornada al Cielo', anim: 'upper', dur: 44, helpless: 1,
      hits: [HB(4, 8, 24, -96, 30, 13, 85, 8, 11, { sfx: 'bighit' }), HB(9, 20, 14, -112, 26, 6, 88, 5, 6)],
      onFrame(f, m) { if (m.f === 4) { f.vy = -19.5; f.grounded = false; Audio8.sfx('swing', 1.4); } if (m.f >= 4 && m.f < 24) f.vx = f.ctrl.x * 4.2; } },
    d: { name: 'Pisotón Sísmico', anim: 'stomp', dur: 50, land: 20,
      hits: [HB(16, 18, 0, -14, 60, 12, 80, 8, 8.5)],
      onFrame(f, m) {
        if (!f.grounded && m.f >= 8) { f.vy = 20; f.vx *= 0.9; if (m.f > 15) m.f = 15; m.v.air = 1; }
        if (f.grounded && m.f >= 15 && !m.v.done) {
          m.v.done = 1; m.f = 16; shake(12); Audio8.sfx('explosion');
          spawnFx('shock', f.x, f.y, { col: '#e9c46a' }); spawnFx('boom', f.x, f.y - 10, { r: 80, col: '#e9c46a' });
          for (let i = 0; i < 6; i++) spawnFx('dust', f.x + rand(-60, 60), f.y - 4);
          for (const d of [-1, 1]) spawnProjectile(f, { type: 'wave', x: f.x + d * 30, y: f.y - 18, vx: d * 8, r: 24, life: 34, dmg: 7, ang: 82, bkb: 7.5, kbg: 5, ground: 1, reflect: 0, col: '#e9c46a' });
        }
      } },
    f: { name: 'Estampida', anim: 'final', dur: 150, final: 1,
      onFrame(f, m) {
        const st = BATTLE.stage;
        f.vx = 0; if (!f.grounded) f.vy = Math.min(f.vy, 0) * 0.8;
        if (m.f === 1) { dim(140); Audio8.sfx('wind'); m.v.side = -f.face; }
        if (m.f >= 18 && m.f <= 108 && m.f % 10 === 0) {
          const from = m.v.side, big = m.f === 108;
          const x = from < 0 ? st.left - 420 : st.right + 420, y = st.top - (big ? 58 : 44) - (m.f % 20 === 0 ? 0 : 6);
          spawnProjectile(f, { type: 'bull', x, y, vx: -from * (big ? 22 : 19), r: big ? 58 : 44, life: 130, pierce: 1, reflect: 0, dir: -from,
            dmg: big ? 16 : 7, ang: big ? 45 : 70, bkb: big ? 17 : 6, kbg: big ? 11 : 2, col: '#6b4226', big: big ? 1 : 0 });
          shake(4); if (m.f % 20 === 0) Audio8.sfx('explosion');
        }
      } },
  },
  // ===================== CHISPA (robot) =====================
  chispa: {
    n: { name: 'Láser', anim: 'cast', dur: 24,
      onFrame(f, m) { if (m.f === 7 && countProj(f, 'laser') < 2) { Audio8.sfx('laser'); spawnProjectile(f, { type: 'laser', x: f.x + f.face * 40, y: f.y - 72, vx: f.face * 24, r: 8, life: 44, dmg: 4, ang: 18, bkb: 2.5, kbg: 2.5, col: '#48cae4', effect: 'elec' }); } } },
    s: { name: 'Puño Cohete', anim: 'charge', dur: 42, chargeAt: 8, chargeMax: 50, chargeBtn: 'special', oncePerAir: 1,
      onFrame(f, m) {
        if (m.charging && m.f % 4 === 0) spawnFx('ember', f.x - f.face * 20, f.y - 70);
        if (m.f === 13 && countProj(f, 'rocketfist') < 1) {
          const c = m.charge; Audio8.sfx('fire');
          spawnProjectile(f, { type: 'rocketfist', x: f.x + f.face * 42, y: f.y - 70, vx: f.face * (10 + 8 * c), r: 14, life: 70, trail: 1, dir: f.face,
            dmg: 7 + 9 * c, ang: 40, bkb: 5 + 4 * c, kbg: 6 + 6 * c, col: '#aeb8c4', sfx: c > 0.6 ? 'bighit' : 'hit' });
        }
      } },
    u: { name: 'Turbo Propulsor', anim: 'jump', dur: 58, helpless: 1,
      hits: [HB(4, 44, 0, -2, 22, 2, 80, 4, 1.5, { rehit: 6, grp: 1, effect: 'fire', vfx: 1 })], // el área es la llama del propulsor, no un miembro
      onFrame(f, m) {
        if (m.f >= 4 && m.f <= 46) {
          f.grounded = false; f.vy = approach(f.vy, m.f < 30 ? -10 : -6, 1.6); f.vx = approach(f.vx, f.ctrl.x * 6, 0.6);
          spawnFx('ember', f.x + rand(-8, 8), f.y + 2); if (m.f % 3 === 0) spawnFx('trail', f.x, f.y + 6, { col: '#ff9f1c' });
          if (m.f % 10 === 4) Audio8.sfx('fire');
        }
      } },
    d: { name: 'Mina de Proximidad', anim: 'item', dur: 30,
      onFrame(f, m) {
        if (m.f === 9) {
          const mine = BATTLE.projectiles.filter(p => p.owner === f && p.type === 'mine');
          if (mine.length >= 2) mine[0].life = 0;
          Audio8.sfx('throw');
          spawnProjectile(f, { type: 'mine', x: f.x + f.face * 30, y: f.y - 30, vx: f.face * 2.5, vy: -4, grav: 0.6, r: 12, life: 720, arm: 36, boomOnHit: 1, reflect: 0,
            dmg: 11, ang: 70, bkb: 8, kbg: 8.5, col: '#2ec4b6',
            onGround(p, s) { p.y = s.y - p.r * 0.5; p.vy = 0; p.vx = 0; p.grav = 0; p.on = 1; } });
        }
      } },
    f: { name: 'Láser Orbital', anim: 'final', dur: 150, final: 1,
      onFrame(f, m) {
        f.vx = 0; if (!f.grounded) f.vy = Math.min(f.vy, 0) * 0.8;
        if (m.f === 1) { dim(150); Audio8.sfx('charge', 1); m.v.q = []; }
        if (m.f >= 16 && m.f <= 112 && m.f % 16 === 0) for (const o of opponentsOf(f)) {
          const x = o.x + o.vx * 8, y = floorAt(x);
          spawnFx('target', x, y, { life: 14, col: '#48cae4' }); m.v.q.push({ x, y, t: m.f + 12, big: m.f === 112 });
        }
        for (const s of m.v.q) if (s.t === m.f) {
          spawnFx('pillar', s.x, s.y, { r: s.big ? 90 : 56 }); Audio8.sfx(s.big ? 'bighit' : 'laser'); shake(s.big ? 18 : 6);
          const w = s.big ? 150 : 90, top = BATTLE.stage.blast.t;
          hitArea(f, { x: s.x - w / 2, y: top, w, h: s.y - top + 20 }, s.big ? { dmg: 16, ang: 88, bkb: 16, kbg: 12, sfx: 'bighit', effect: 'elec' } : { dmg: 6, ang: 80, bkb: 4, kbg: 0, effect: 'elec' }, s.big ? {} : { noLaunch: true });
        }
      } },
  },
  // ===================== MICHI (gato ninja) =====================
  michi: {
    n: { name: 'Bola de Pelos', anim: 'cast', dur: 28,
      onFrame(f, m) { if (m.f === 9 && countProj(f, 'hairball') < 2) { Audio8.sfx('throw'); spawnProjectile(f, { type: 'hairball', x: f.x + f.face * 30, y: f.y - 70, vx: f.face * 9, vy: -4.5, grav: 0.45, bounce: -5.5, r: 11, life: 80, dmg: 5, ang: 45, bkb: 4, kbg: 4.5, col: '#e39b4a' }); } } },
    s: { name: 'Zarpazo', anim: 'slash', dur: 32, oncePerAir: 1,
      hits: [HB(5, 16, 30, -54, 30, 2.5, 50, 3, 1, { rehit: 4, grp: 1, effect: 'slash' }), HB(17, 19, 38, -54, 32, 6, 40, 7.5, 8.5, { effect: 'slash' })],
      onFrame(f, m) {
        if (m.f >= 5 && m.f <= 16) { f.vx = f.face * 13; f.vy = f.grounded ? f.vy : Math.min(f.vy, 0.5); if (m.f % 4 === 1) spawnFx('claw', f.x + f.face * 40, f.y - 60, { dir: f.face }); }
        else if (m.f > 16) f.vx *= 0.75;
        if (m.f === 5) Audio8.sfx('swing', 1.3);
      } },
    // sin caída libre: puede seguir atacando después (un uso por salto)
    u: { name: 'Salto Felino', anim: 'jump', dur: 30,
      hits: [HB(3, 8, 0, -64, 34, 6, 85, 6, 6.5, { effect: 'slash' })],
      onFrame(f, m) { if (m.f === 3) { f.vy = -19; f.grounded = false; Audio8.sfx('djump'); spawnFx('boom', f.x, f.y, { r: 30, col: '#f6e1c3' }); } if (m.f >= 3 && m.f < 18) f.vx = f.ctrl.x * 5; } },
    d: { name: 'Siete Vidas', anim: 'counter', dur: 36, counter: [3, 22] },
    f: { name: 'Noche de Gatos', anim: 'final', dur: 160, final: 1,
      onFrame(f, m) {
        if (m.f === 1) { m.v.x0 = f.x; m.v.y0 = f.y; m.v.targets = opponentsOf(f).filter(o => Math.abs(o.x - f.x) < 1000 && !o.dead); dim(150); Audio8.sfx('teleport'); }
        f.vx = 0; f.vy = 0; f.hidden = m.f > 10 && m.f < 150;
        if (m.f === 12) for (const o of m.v.targets) for (let i = 0; i < 3; i++) spawnFx('cateyes', o.x + rand(-160, 160), o.y - rand(60, 200));
        if (m.f > 14 && m.f < 128 && m.f % 8 === 0) for (const o of m.v.targets) {
          if (o.dead) continue;
          spawnFx('claw', o.x + rand(-20, 20), o.y - 50 + rand(-20, 20), { dir: pick([-1, 1]) });
          applyHit(f, o, { dmg: 3, ang: 90, bkb: 1.5, kbg: 0, effect: 'slash', sfx: 'hit' }, 1, { noLaunch: true });
        }
        if (m.f === 136) for (const o of m.v.targets) { if (o.dead) continue; spawnFx('boom', o.x, o.y - 50, { r: 120, col: '#2ec4b6' }); applyHit(f, o, { dmg: 13, ang: 50, bkb: 17, kbg: 12, sfx: 'bighit', effect: 'slash' }, sign(o.x - m.v.x0) || 1); }
        if (m.f === 150) { f.x = m.v.x0; f.y = m.v.y0; }
      } },
  },
  // ===================== CHILAZO (chile luchador) =====================
  chilazo: {
    n: { name: 'Aliento de Fuego', anim: 'cast', dur: 52, holdLoop: [12, 70],
      hits: [HB(9, 34, 64, -100, 30, 1.5, 38, 2.2, 0.8, { rehit: 5, grp: 1, effect: 'fire' })],
      onFrame(f, m) {
        if (m.f >= 9 && m.f <= 34) { for (let i = 0; i < 2; i++) spawnFx('ember', f.x + f.face * rand(36, 100), f.y - 112 + rand(-14, 14)); if (m.t % 8 === 0) Audio8.sfx('fire'); }
        if (!f.grounded) f.vy = Math.min(f.vy, 2.5);
      } },
    s: { name: 'Tope Suicida', anim: 'shoulder', dur: 50, oncePerAir: 1, land: 14,
      hits: [HB(8, 30, 30, -64, 30, 13, 40, 8, 10.5, { grp: 1, sfx: 'bighit', effect: 'fire' })],
      onFrame(f, m) {
        if (m.f === 7) { f.vy = f.grounded ? -7 : Math.min(f.vy, -3); f.grounded = false; Audio8.sfx('swing', 1.2); }
        if (m.f >= 7 && m.f <= 30 && !m.v.bonk) { f.vx = f.face * 14; if (m.f % 2 === 0) spawnFx('ember', f.x - f.face * 20, f.y - 60); }
        if (!m.v.bonk && m.hitSets[0] && m.hitSets[0].size) { m.v.bonk = 1; f.vx = -f.face * 4; f.vy = -7; }
        if (m.f > 30) f.vx *= 0.9;
      } },
    u: { name: 'Plancha Volcánica', anim: 'upper', dur: 50, helpless: 1,
      hits: [HB(3, 18, 10, -74, 34, 2.5, 85, 3, 1.5, { rehit: 5, grp: 1, effect: 'fire' }), HB(19, 22, 10, -84, 38, 8, 72, 8, 8, { effect: 'fire', sfx: 'bighit' })],
      onFrame(f, m) {
        if (m.f === 3) { f.vy = -17.5; f.grounded = false; Audio8.sfx('fire'); spawnFx('boom', f.x, f.y, { r: 50, col: '#ff9f1c' }); }
        if (m.f >= 3 && m.f < 22) { f.vx = f.ctrl.x * 3.6; spawnFx('ember', f.x + rand(-16, 16), f.y - rand(0, 90)); }
      } },
    d: { name: 'Salsa Picante', anim: 'item', dur: 32,
      onFrame(f, m) {
        if (m.f === 11) {
          for (const p of BATTLE.projectiles) if (p.owner === f && p.type === 'salsa') p.life = Math.min(p.life, 20);
          Audio8.sfx('throw');
          spawnProjectile(f, { type: 'salsa', x: f.x + f.face * 36, y: f.y - 40, vx: f.face * 3, vy: -4, grav: 0.6, r: 14, life: 330, pierce: 1, reflect: 0, rehit: 22,
            dmg: 3, ang: 80, bkb: 5, kbg: 1, effect: 'fire', col: '#d62828',
            onGround(p, s) { p.y = s.y - 6; p.vy = 0; p.vx = 0; p.grav = 0; p.r = 30; p.puddle = 1; Audio8.sfx('fire'); } });
        }
      } },
    f: { name: 'Súper Enchilada', anim: 'final', dur: 150, final: 1,
      onFrame(f, m) {
        f.vx = 0; if (!f.grounded) f.vy = Math.min(f.vy, 0) * 0.8;
        if (m.f === 1) { dim(130); f.bigTime = 150; Audio8.sfx('grow'); }
        if (m.f >= 20 && m.f <= 100 && m.f % 10 === 0) {
          Audio8.sfx('fire'); shake(4);
          for (const d of [-1, 1]) spawnProjectile(f, { type: 'wave', x: f.x + d * 40, y: f.y - 30, vx: d * 12, r: 30, life: 70, dmg: 4, ang: 70, bkb: 6, kbg: 2, ground: 1, pierce: 1, reflect: 0, col: '#ff6d00', effect: 'fire' });
        }
        if (m.f % 3 === 0 && m.f < 115) spawnFx('ember', f.x + rand(-80, 80), f.y - rand(0, 200));
        if (m.f === 116) {
          shake(26); flash(0.8); Audio8.sfx('ko');
          spawnFx('boom', f.x, f.y - 80, { r: 380, col: '#ff6d00' });
          hitArea(f, { x: f.x - 380, y: f.y - 420, w: 760, h: 460 }, { dmg: 18, ang: 60, bkb: 16, kbg: 12, sfx: 'bighit', effect: 'fire' });
        }
      } },
  },
});

Object.assign(CHARS, {
  torito: { id: 'torito', name: 'Torito', title: 'El Minotauro', blurb: 'Toro de lidia: embiste con armadura y hace temblar el suelo.', beast: 1,
    weight: 126, walk: 3.2, run: 8.4, air: 5.0, airAcc: 0.4, grav: 0.72, fall: 12.5, ffall: 18, jump: 15.2, djump: 14, jumps: 2, traction: 0.72,
    power: 1.2, reach: 1.1, speed: 0.88, size: 1.12, bars: { fuerza: 5, velocidad: 2, peso: 5, rango: 3 } },
  chispa: { id: 'chispa', name: 'Chispa', title: 'La Robot', blurb: 'Robot de combate: láser, puño cohete, jetpack y minas.', beast: 1,
    weight: 106, walk: 3.6, run: 8.8, air: 5.6, airAcc: 0.46, grav: 0.7, fall: 12.5, ffall: 18, jump: 15, djump: 14, jumps: 2, traction: 0.85,
    power: 1.02, reach: 1.02, speed: 0.98, size: 1.02, bars: { fuerza: 3, velocidad: 3, peso: 4, rango: 5 } },
  michi: { id: 'michi', name: 'Michi', title: 'El Gato Ninja', blurb: 'Ligerísimo y veloz: triple salto y siete vidas.', beast: 1,
    weight: 74, walk: 4.6, run: 11.8, air: 7.2, airAcc: 0.64, grav: 0.66, fall: 11.5, ffall: 17.5, jump: 15.5, djump: 13, jumps: 3, traction: 0.95,
    power: 0.82, reach: 0.9, speed: 1.25, size: 0.86, bars: { fuerza: 2, velocidad: 5, peso: 1, rango: 2 } },
  chilazo: { id: 'chilazo', name: 'Chilazo', title: 'El Chile Luchador', blurb: 'Luchador picante: fuego, topes y salsa en el piso.', beast: 1,
    weight: 98, walk: 3.9, run: 9.6, air: 6.0, airAcc: 0.5, grav: 0.66, fall: 11.5, ffall: 17, jump: 15.5, djump: 14.5, jumps: 2, traction: 0.8,
    power: 1.06, reach: 0.98, speed: 1.04, size: 0.98, bars: { fuerza: 4, velocidad: 3, peso: 3, rango: 3 } },
});
CHAR_ORDER.push('torito', 'chispa', 'michi', 'chilazo');

// toques de personalidad en los golpes normales
const CHAR_TWEAKS = {
  torito(set) { set.fsmash.armor = [4, 15]; set.dash.armor = [4, 14]; set.usmash.hits.forEach(h => { h.bkb *= 1.08; }); },
  chispa(set) { for (const k of ['fsmash', 'dair', 'nair']) set[k].hits.forEach(h => { h.effect = 'elec'; }); },
  michi(set) { for (const k of ['ftilt', 'fair', 'bair', 'uair', 'dtilt']) set[k].hits.forEach(h => { h.effect = 'slash'; }); },
  chilazo(set) { for (const k of ['fsmash', 'dsmash', 'nair', 'dash']) set[k].hits.forEach(h => { h.effect = 'fire'; }); },
};
