'use strict';
// Centella: mensajera urbana que pelea con impulsos eléctricos y mucha movilidad.
LOOKS.centella = {
  skin: '#9d664e', hair: '#1b1b35', hairBack: 'short', eye: '#e9f9ff', lips: '#753c42',
  top: '#263b68', top2: '#162442', garment: 'hoodie', sleeve: 'long', pants: '#19213c',
  feet: 'boot', shoe: '#f4f7ff', sole: '#121827', wrap: '#78edff', accent: '#78edff',
  build: { chest: 16, waist: 11, arm: 0.9, leg: 0.9 },
  prop: { leg: 1.08, torso: 0.98, arm: 0.98, head: 0.96 },
};
CHARS.centella = { id: 'centella', name: 'Centella', title: 'La Mensajera del Rayo',
  blurb: 'Corre, salta y pelea con electricidad. Rápida de cerca, frágil al recibir golpes.',
  weight: 88, walk: 4.3, run: 10.5, air: 6.5, airAcc: 0.57, grav: 0.67, fall: 12, ffall: 17,
  jump: 15.5, djump: 13.6, jumps: 2, traction: 0.83,
  power: 0.94, reach: 0.98, speed: 1.1, size: 0.96,
  bars: { fuerza: 2, velocidad: 5, peso: 2, rango: 3 },
};
SPECIALS.centella = {
  n: { name: 'Chispa Veloz', anim: 'cast', dur: 32,
    onFrame(f, m) {
      if (m.f !== 11 || countProj(f, 'note') >= 3) return;
      Audio8.sfx('laser');
      spawnProjectile(f, { type: 'note', x: f.x + f.face * 34, y: f.y - 70, vx: f.face * 10.5,
        vy: 0, r: 14, life: 65, dmg: 6, ang: 35, bkb: 4, kbg: 4, col: '#78edff', effect: 'elec' });
    } },
  s: { name: 'Carrera Relámpago', anim: 'shoulder', dur: 38, oncePerAir: 1,
    hits: [HB(8, 20, 30, -48, 28, 9, 42, 7, 7, { grp: 1, effect: 'elec', col: '#78edff' })],
    onFrame(f, m) {
      if (m.f >= 8 && m.f <= 20) { f.vx = f.face * 12; if (!f.grounded) f.vy = Math.min(f.vy, 0); }
      if (m.f % 5 === 0 && m.f < 22) spawnFx('spark', f.x, f.y - 45, { col: '#78edff' });
    } },
  u: { name: 'Salto de Voltios', anim: 'upper', dur: 44, helpless: 1,
    hits: [HB(5, 15, 0, -94, 34, 8, 86, 7, 8, { grp: 1, effect: 'elec', col: '#78edff' })],
    onFrame(f, m) { if (m.f >= 4 && m.f <= 16) { f.grounded = false; f.vy = -12; f.vx = f.face * 3.5; } } },
  d: { name: 'Pulso de Suelo', anim: 'dsmash', dur: 42,
    hits: [HB(13, 18, 0, -18, 66, 8, 68, 5.5, 6, { effect: 'elec', col: '#78edff' })],
    onFrame(f, m) { if (m.f === 13) { Audio8.sfx('laser'); spawnFx('ring', f.x, f.y - 15, { r: 80, col: '#78edff', life: 22 }); } } },
  f: { name: 'Tormenta Centella', anim: 'final', dur: 110, final: 1,
    onFrame(f, m) {
      if (m.f === 1) { dim(110); Audio8.sfx('laser'); }
      if (m.f === 50) {
        const st = BATTLE.stage;
        flash(0.7); shake(15); Audio8.sfx('bighit');
        hitArea(f, { x: st.left - 100, y: st.top - 450, w: st.right - st.left + 200, h: 460 },
          { dmg: 16, ang: 80, bkb: 12, kbg: 10, effect: 'elec', sfx: 'bighit' });
      }
    } },
};
ABILITIES.centella = { name: 'Paso ligero', desc: 'Corre y controla sus saltos mejor que los luchadores pesados.' };
CHAR_TWEAKS.centella = set => {
  for (const k of ['jab3', 'ftilt', 'uair']) set[k].hits.forEach(h => { h.effect = 'elec'; h.col = '#78edff'; });
};
CHAR_ORDER.push('centella');
