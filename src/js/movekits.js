'use strict';
// ============================================================
//  RITMO Y FUERZA DE CADA PERSONAJE
//  Antes todos compartían los mismos tiempos (arranque, golpe, recuperación)
//  y solo cambiaba la escala. Aquí cada uno recibe:
//   · su combo de Ataque (largo, ritmo y remate distintos: 1-2-gancho, ráfaga,
//     patada giratoria, cabezazo, cuatro zarpazos…)
//   · su tempo: qué tan rápido sale el golpe, cuánto dura y cuánto tarda en
//     recuperarse, y cuánto pega y empuja
//   · golpes de firma que cambian la forma del movimiento (varios impactos,
//     barridas que tumban, áreas que duran)
// Los tiempos se escriben en la escala base; luego la velocidad de cada
// personaje los ajusta igual que al resto.
// ============================================================
// s = arranque · a = parte que pega · r = recuperación · dmg/kb = fuerza · rad = tamaño del área
const KIT_TEMPO = {
  nacho: { s: 1.15, a: 1.0, r: 1.2, dmg: 1.08, kb: 1.06, rad: 1.05 },
  pablo: { s: 0.75, a: 0.9, r: 0.7, dmg: 0.85, kb: 0.92, rad: 0.95 },
  daniel: { s: 1.0, a: 1.3, r: 0.95, dmg: 1.0, kb: 1.0, rad: 1.05 },
  robes: { s: 1.3, a: 1.1, r: 1.3, dmg: 1.08, kb: 1.04, rad: 1.15 },
  nicole: { s: 0.95, a: 1.25, r: 1.0, dmg: 1.03, kb: 1.06, rad: 1.12 },
  torito: { s: 1.2, a: 1.0, r: 1.25, dmg: 1.12, kb: 1.1, rad: 1.12 },
  chispa: { s: 1.0, a: 1.15, r: 1.05, dmg: 1.0, kb: 1.1, rad: 1.02 },
  michi: { s: 0.65, a: 0.85, r: 0.65, dmg: 0.9, kb: 0.98, rad: 0.95 },
  chilazo: { s: 0.95, a: 1.1, r: 1.0, dmg: 1.0, kb: 1.0, rad: 1.02 },
  mariachi: { s: 1.1, a: 1.15, r: 1.05, dmg: 1.0, kb: 1.02, rad: 1.1 },
  chupa: { s: 0.8, a: 0.9, r: 0.8, dmg: 0.9, kb: 0.95, rad: 0.98 },
  dino: { s: 1.35, a: 1.1, r: 1.35, dmg: 1.12, kb: 1.06, rad: 1.18 },
  luchador: { s: 1.05, a: 1.0, r: 1.1, dmg: 1.0, kb: 1.0, rad: 1.05 },
  axo: { s: 0.95, a: 1.3, r: 0.95, dmg: 0.9, kb: 0.98, rad: 1.08 },
};
const KIT_NORMALS = ['jab1', 'jab2', 'jab3', 'jab4', 'ftilt', 'utilt', 'dtilt', 'dash', 'fsmash', 'usmash', 'dsmash', 'nair', 'fair', 'bair', 'uair', 'dair'];

// cambia los tiempos de un golpe: arranque, parte activa y recuperación por separado
function retime(mv, s = 1, a = 1, r = 1) {
  const list = mv.hits && mv.hits.length ? mv.hits : mv.grabBox ? [mv.grabBox] : [];
  if (!list.length) { mv.dur = Math.max(4, Math.round(mv.dur * r)); return; }
  const first = Math.min(...list.map(h => h.f0)), last = Math.max(...list.map(h => h.f1));
  const nFirst = Math.max(1, Math.round(first * s)), nLast = nFirst + Math.round((last - first) * a);
  for (const h of list) { h.f0 = Math.max(1, nFirst + Math.round((h.f0 - first) * a)); h.f1 = Math.max(h.f0, nFirst + Math.round((h.f1 - first) * a)); }
  const rec = mv.dur - last;
  if (mv.iasa) mv.iasa = Math.max(nLast + 1, nLast + Math.round((mv.iasa - last) * r));
  mv.dur = nLast + Math.max(3, Math.round(rec * r));
  if (mv.chargeAt) mv.chargeAt = Math.max(1, Math.min(nFirst - 1, Math.round(mv.chargeAt * s)));
  if (mv.land) mv.land = Math.max(3, Math.round(mv.land * r));
}
// fuerza y tamaño
function reforce(mv, dmg = 1, kb = 1, rad = 1) {
  for (const h of mv.hits || []) { h.dmg = +(h.dmg * dmg).toFixed(1); h.bkb *= kb; h.kbg *= kb; h.r *= rad; }
}

// golpes propios (escala base). jab: con qué sigue el combo; sin jab, ahí remata.
const MOVE_KITS = {
  // boxeador: jab rapidísimo, recto, y un gancho lento que tumba
  nacho: {
    jab1: { anim: 'bx_jab', dur: 13, iasa: 8, jab: 'jab2', hits: [HB(2, 3, 38, -62, 16, 2.5, 80, 2, 0.8)] },
    jab2: { anim: 'bx_cross', dur: 16, iasa: 10, jab: 'jab3', hits: [HB(3, 4, 40, -60, 18, 3.5, 75, 2.5, 1)] },
    jab3: { anim: 'bx_hook', dur: 34, hits: [HB(7, 9, 44, -58, 24, 8, 40, 7.5, 7.5, { sfx: 'bighit' })] },
    ftilt: { anim: 'bx_overhand', dur: 36, hits: [HB(6, 7, 40, -44, 18, 4, 70, 3, 0), HB(11, 13, 48, -66, 22, 9, 38, 7, 10)] },
    fsmash: { anim: 'bx_haymaker', dur: 58, chargeAt: 9, smash: 1, hits: [HB(19, 22, 56, -58, 28, 19, 38, 9, 18, { sfx: 'bighit' })] },
  },
  // ninja: dos cortes y una ráfaga que sigue mientras mantienes (o machacas) Ataque
  pablo: {
    jab1: { anim: 'nj_chop', dur: 10, iasa: 6, jab: 'jab2', hits: [HB(2, 3, 36, -64, 16, 2, 72, 1.6, 0.5)] },
    jab2: { anim: 'nj_chop2', dur: 10, iasa: 6, jab: 'rapid', hits: [HB(2, 3, 38, -60, 16, 2, 72, 1.6, 0.5)] },
    rapid: { anim: 'nj_rapid', rapid: 1, dur: 24, holdLoop: [4, 90], holdBtn: 'attack', hits: [HB(4, 4, 42, -62, 26, 1.1, 80, 1.8, 0, { rehit: 4 }), HB(9, 11, 46, -58, 24, 4, 45, 7, 6)] },
    fsmash: { anim: 'nj_tripleKick', dur: 40, chargeAt: 5, smash: 1, hits: [HB(9, 10, 44, -30, 20, 4, 75, 3, 0), HB(13, 14, 48, -62, 20, 4, 75, 3, 0), HB(17, 19, 50, -96, 24, 9, 45, 8, 13, { sfx: 'bighit' })] },
  },
  // capoeira: palmada y media luna que queda girando; la rasteira tumba
  daniel: {
    jab1: { anim: 'palm', dur: 14, iasa: 9, jab: 'jab2', hits: [HB(3, 4, 38, -60, 18, 3, 75, 2.5, 1)] },
    jab2: { anim: 'cp_meiaLua', dur: 28, hits: [HB(6, 11, 44, -70, 26, 7, 45, 6.5, 7)] },
    dtilt: { anim: 'cp_rasteira', dur: 24, crouch: 1, hits: [HB(5, 8, 46, -10, 22, 5, 80, 3, 2, { trip: 1 })] },
    dash: { anim: 'cp_au', dur: 38, dashAtk: 1, hits: [HB(5, 14, 30, -60, 28, 2.5, 70, 3, 0, { rehit: 4, grp: 1 }), HB(15, 18, 36, -60, 28, 6, 45, 7, 7)] },
  },
  // luchador pesado: antebrazo lento y cabezazo que manda lejos
  robes: {
    jab1: { anim: 'wr_forearm', dur: 22, iasa: 15, jab: 'jab2', hits: [HB(4, 6, 42, -60, 22, 5, 60, 3.5, 2)] },
    jab2: { anim: 'headbutt', dur: 34, hits: [HB(8, 11, 40, -100, 26, 10, 45, 8, 8.5, { sfx: 'bighit' })] },
    dtilt: { anim: 'wr_stomp', dur: 30, hits: [HB(8, 10, 44, -8, 26, 11, 75, 7, 7)] },
    fsmash: { anim: 'doubleAxe', dur: 64, chargeAt: 10, smash: 1, armor: [4, 20], hits: [HB(21, 24, 58, -60, 34, 23, 38, 9.5, 19, { sfx: 'bighit' })] },
  },
  // taekwondo: palmada, patada frontal y patada giratoria alta con chispa
  nicole: {
    jab1: { anim: 'palm', dur: 13, iasa: 8, jab: 'jab2', hits: [HB(3, 4, 40, -62, 18, 2.5, 75, 2.2, 1)] },
    jab2: { anim: 'tk_frontSnap', dur: 16, iasa: 10, jab: 'jab3', hits: [HB(4, 6, 48, -50, 20, 3.5, 70, 2.5, 1)] },
    jab3: { anim: 'tk_spinHook', dur: 30, hits: [HB(7, 11, 54, -90, 26, 7, 45, 7, 7, { effect: 'elec' })] },
    ftilt: { anim: 'tk_highKick', dur: 28, hits: [HB(6, 12, 60, -70, 22, 8, 40, 6, 9)] },
  },
  // toro: cornada corta y otra que avienta hacia arriba
  torito: {
    jab1: { anim: 'tr_hornJab', dur: 20, iasa: 13, jab: 'jab2', hits: [HB(4, 6, 40, -80, 22, 5, 60, 3.5, 2)] },
    jab2: { anim: 'tr_hornToss', dur: 34, hits: [HB(8, 11, 36, -90, 28, 9, 82, 8, 7.5)] },
    dtilt: { anim: 'tr_hoofKick', dur: 24, hits: [HB(6, 8, 46, -16, 22, 8, 70, 5, 6)] },
  },
  // robot: un pistón y luego metralla eléctrica mientras mantienes Ataque; taladro de varios golpes
  chispa: {
    jab1: { anim: 'piston', dur: 12, iasa: 7, jab: 'rapid', hits: [HB(3, 4, 40, -62, 16, 2, 75, 2, 0.8, { effect: 'elec' })] },
    rapid: { anim: 'cs_rapid', rapid: 1, dur: 26, holdLoop: [4, 100], holdBtn: 'attack', hits: [HB(4, 4, 42, -62, 22, 1, 70, 1.6, 0, { rehit: 3, effect: 'elec' }), HB(10, 12, 50, -62, 26, 5, 40, 7, 6.5, { effect: 'elec' })] },
    ftilt: { anim: 'drill', dur: 32, hits: [HB(6, 13, 50, -60, 22, 1.5, 50, 2.5, 0, { rehit: 3, grp: 1, effect: 'elec' }), HB(14, 16, 54, -60, 24, 5, 38, 6.5, 8, { effect: 'elec' })] },
    utilt: { anim: 'cs_antenna', dur: 26, hits: [HB(5, 11, 0, -128, 30, 8, 88, 6, 9, { effect: 'elec', vfx: 1 })] },
    fsmash: { anim: 'cs_hammer', dur: 50, chargeAt: 8, smash: 1, hits: [HB(16, 19, 48, -30, 30, 17, 60, 8.5, 16, { effect: 'elec', sfx: 'bighit' })] },
  },
  // gato: cuatro zarpazos rapidísimos y una marometa de remate
  michi: {
    jab1: { anim: 'clawJab', dur: 9, iasa: 5, jab: 'jab2', hits: [HB(1, 2, 36, -50, 16, 1.5, 75, 1.5, 0.5, { effect: 'slash' })] },
    jab2: { anim: 'clawJab2', dur: 9, iasa: 5, jab: 'jab3', hits: [HB(1, 2, 36, -52, 16, 1.5, 75, 1.5, 0.5, { effect: 'slash' })] },
    jab3: { anim: 'clawJab', dur: 9, iasa: 5, jab: 'jab4', hits: [HB(1, 2, 38, -50, 16, 1.5, 75, 1.5, 0.5, { effect: 'slash' })] },
    jab4: { anim: 'mc_flipKick', dur: 22, hits: [HB(4, 7, 30, -80, 24, 5, 75, 6.5, 5)] },
  },
  // chile: dos golpes de canto y un remolino picante de varios impactos
  chilazo: {
    jab1: { anim: 'chop', dur: 14, iasa: 9, jab: 'jab2', hits: [HB(3, 5, 40, -62, 18, 3, 75, 2.5, 1)] },
    jab2: { anim: 'lx_chop2', dur: 14, iasa: 9, jab: 'jab3', hits: [HB(3, 5, 40, -60, 18, 3, 75, 2.5, 1)] },
    jab3: { anim: 'ch_spin', dur: 30, hits: [HB(4, 13, 0, -50, 32, 1.4, 70, 2, 0, { rehit: 3, grp: 1, vfx: 1 }), HB(14, 16, 0, -50, 36, 5, 50, 7, 6, { vfx: 1 })] },
  },
  // mariachi: dos cachetadas y un guitarrazo de remate
  mariachi: {
    jab1: { anim: 'mr_slap', dur: 13, iasa: 8, jab: 'jab2', hits: [HB(3, 4, 38, -66, 18, 2.5, 75, 2, 1)] },
    jab2: { anim: 'mr_slap2', dur: 14, iasa: 9, jab: 'jab3', hits: [HB(3, 4, 40, -64, 18, 3, 75, 2.2, 1)] },
    jab3: { anim: 'mr_guitarJab', guitar: 1, dur: 30, hits: [HB(7, 10, 56, -62, 28, 8, 40, 7, 7.5, { sfx: 'bighit' })] },
  },
  // chupacabras: zarpazo, zarpazo y mordida que cura
  chupa: {
    jab1: { anim: 'clawJab', dur: 10, iasa: 6, jab: 'jab2', hits: [HB(2, 3, 38, -60, 16, 2, 75, 1.8, 0.6, { effect: 'slash' })] },
    jab2: { anim: 'clawJab2', dur: 10, iasa: 6, jab: 'jab3', hits: [HB(2, 3, 38, -60, 16, 2, 75, 1.8, 0.6, { effect: 'slash' })] },
    jab3: { anim: 'cb_bite', dur: 24, hits: [HB(5, 7, 40, -80, 22, 6, 55, 5.5, 5, { drain: 0.4 })] },
  },
  // T-Rex: mordida lenta y mordidota que manda lejos
  dino: {
    jab1: { anim: 'dn_chomp', dur: 24, iasa: 16, jab: 'jab2', hits: [HB(6, 9, 50, -90, 26, 7, 50, 5, 4)] },
    jab2: { anim: 'dn_bigChomp', dur: 40, hits: [HB(11, 14, 56, -90, 30, 12, 40, 8.5, 9, { sfx: 'bighit' })] },
  },
  // luchador: dos golpes de canto y lazo de remate
  luchador: {
    jab1: { anim: 'chop', dur: 14, iasa: 9, jab: 'jab2', hits: [HB(3, 5, 40, -66, 18, 3, 75, 2.5, 1)] },
    jab2: { anim: 'lx_chop2', dur: 15, iasa: 10, jab: 'jab3', hits: [HB(3, 5, 42, -62, 18, 3, 75, 2.5, 1)] },
    jab3: { anim: 'lariat', dur: 36, hits: [HB(8, 11, 50, -70, 28, 9, 38, 8, 8.5, { sfx: 'bighit' })] },
  },
  // ajolote: palmaditas y un coletazo girando que pega alrededor
  axo: {
    jab1: { anim: 'palm', dur: 12, iasa: 7, jab: 'jab2', hits: [HB(3, 4, 38, -56, 18, 2.2, 75, 2, 0.8)] },
    jab2: { anim: 'tk_palm2', dur: 12, iasa: 7, jab: 'jab3', hits: [HB(3, 4, 38, -56, 18, 2.2, 75, 2, 0.8)] },
    jab3: { anim: 'ax_tailSlap', dur: 28, hits: [HB(6, 11, 0, -40, 44, 6, 60, 6, 6, { vfx: 1 })] },
  },
};

// se llama al armar el set de golpes (antes de ajustar por velocidad, alcance y fuerza)
function applyMoveKit(id, base) {
  const kit = MOVE_KITS[id] || {}, T = KIT_TEMPO[id];
  for (const k of KIT_NORMALS) {
    if (kit[k]) continue;
    const mv = base[k]; if (!mv || !T) continue;
    retime(mv, T.s, T.a, T.r); reforce(mv, T.dmg, T.kb, T.rad);
  }
  // el golpe propio reemplaza al genérico (sin heredar su combo ni su cancelación);
  // solo conserva lo que dice qué tipo de golpe es
  for (const k in kit) {
    const b = base[k] || {}, m = Object.assign({}, kit[k], { hits: kit[k].hits.map(h => Object.assign({}, h)) });
    for (const f of ['air', 'land', 'crouch', 'dashAtk', 'smash']) if (m[f] === undefined && b[f] !== undefined) m[f] = b[f];
    base[k] = m;
  }
}

// ---------- animaciones nuevas ----------
Object.assign(A2, {
  // combos
  nj_rapid: { limb: 'handF', w: { armF: [0.9, 1.6], armB: [0.7, 1.8], lean: 0.2 }, h: { armF: [1.6, 0.1], armB: [1.1, 1.5], lean: 0.3, legF: [0.7, -0.8], legB: [-0.6, -0.3], face: 'angry' }, h2: { armF: [1.1, 1.5], armB: [1.6, 0.1], lean: 0.32, legF: [0.7, -0.8], legB: [-0.6, -0.3], face: 'angry' }, x: { armF: [1.65, 0.05], lean: 0.4 }, f: { armF: [1.55, 0.2], lean: 0.3 } },
  cs_rapid: { limb: 'handF', w: { armF: [1.2, 1.6], armB: [1.0, 1.8] }, h: { armF: [1.58, 0], armB: [0.6, 2.0], lean: 0.18, face: 'angry' }, h2: { armF: [0.7, 2.0], armB: [1.58, 0], lean: 0.2, face: 'angry' }, x: { armF: [1.6, 0], armB: [1.5, 0.1], lean: 0.35 } },
  nj_tripleKick: { limb: 'footF', heavy: 1, w: { legF: [1.1, -2.1], lean: 0.1, armF: [1.2, 1.4] }, h: { legF: [1.35, -0.1], legB: [-0.3, -0.1], lean: -0.25 }, m: { legF: [1.9, -0.05], lean: -0.5 }, x: { legF: [2.45, 0], legB: [-0.3, -0.05], lean: -0.78, armF: [0.2, 1.2], armB: [-0.9, 1.1], face: 'angry' }, f: { legF: [1.6, -1.0], lean: -0.4 } },
  tk_spinHook: { limb: 'footF', spin: { turns: 1, from: 'w', to: 'h' }, w: { lean: 0.1, legF: [0.8, -1.6], armF: [1.2, 1.3] }, h: { legF: [1.95, -0.08], legB: [-0.3, -0.1], lean: -0.62, armF: [0.2, 1.2], armB: [-0.9, 1.1], face: 'angry' }, f: { legF: [1.5, -0.6], lean: -0.4 } },
  tr_hornJab: { limb: 'head', w: { lean: 0.1, bodyY: 2 }, h: { lean: 0.72, bodyX: 6, legF: [0.8, -0.9], legB: [-0.7, -0.2], face: 'angry' }, f: { lean: 0.6, bodyX: 5 } },
  tr_hornToss: { limb: 'head', heavy: 1, w: { lean: 0.95, bodyY: 8, legF: [1.1, -1.6] }, h: { lean: -0.35, bodyY: -4, armF: [2.2, 0.6], armB: [2.0, 0.7], face: 'angry' }, f: { lean: -0.25 } },
  tr_hoofKick: { limb: 'footF', w: { legF: [1.15, -2.1], lean: 0.45, bodyY: 4 }, h: { legF: [1.5, -0.1], legB: [-0.3, -0.3], lean: 0.5, bodyY: 6, face: 'angry' }, f: { legF: [1.3, -0.5] } },
  clawJab2: { limb: 'handB', w: { armB: [1.9, 0.9], armF: [1.0, 1.4], lean: 0.1 }, h: { armB: [1.35, 0.1], armF: [0.5, 1.9], lean: 0.35, legF: [0.6, -0.7], legB: [-0.45, -0.2], face: 'angry' }, f: { armB: [1.1, 0.2] } },
  mc_flipKick: { limb: 'footF', spin: { turns: -1, from: 'h', to: 'f' }, w: { lean: 0.2, legF: [1.0, -1.8], bodyY: 5 }, h: { legF: [2.6, -0.1], legB: [0.9, -1.6], lean: -0.4, face: 'angry' }, f: { legF: [1.4, -1.2] } },
  ch_spin: { limb: 'chest', spin: { turns: 2, from: 'h', to: 'x' }, w: { armF: [1.6, 0.3], armB: [-1.6, 0.3], lean: 0.1 }, h: { armF: [1.7, 0.1], armB: [-1.7, 0.1], legF: [0.5, -0.4], legB: [-0.5, -0.4], face: 'angry' } },
  lx_chop2: { limb: 'handB', w: { armB: [2.9, 0.6], armF: [0.9, 1.5], lean: -0.1 }, h: { armB: [1.45, 0.05], armF: [0.4, 1.8], lean: 0.45, bodyY: 5, legF: [0.8, -0.9], legB: [-0.6, -0.2], face: 'angry' }, f: { armB: [1.1, 0.1], lean: 0.45 } },
  mr_slap: { limb: 'handF', w: { armF: [0.25, 1.5], armB: [0.4, 1.4], lean: -0.05 }, h: { armF: [1.75, 0.35], lean: 0.2, legF: [0.5, -0.6], legB: [-0.45, -0.2] }, f: { armF: [2.0, 0.5], lean: 0.18 } },
  mr_slap2: { limb: 'handB', w: { armB: [0.4, 1.9], armF: [1.2, 1.0] }, h: { armB: [1.6, 0.2], armF: [0.5, 1.6], lean: 0.3, legF: [0.55, -0.6], legB: [-0.5, -0.2] }, f: { armB: [1.4, 0.3] } },
  mr_guitarJab: { limb: 'guitar', heavy: 1, w: { armF: [0.6, 1.4], armB: [0.5, 1.4], lean: -0.1, bodyX: -3 }, h: { armF: [1.55, 0.05], armB: [1.4, 0.2], lean: 0.3, bodyX: 6, legF: [0.9, -0.9], legB: [-0.8, -0.2], face: 'angry' }, f: { armF: [1.6, 0.1], lean: 0.32, bodyX: 7 } },
  ax_tailSlap: { limb: 'tail', spin: { turns: 1, from: 'w', to: 'x' }, w: { lean: 0.25, tail: -0.3 }, h: { lean: 0.35, tail: 0.6, armF: [1.6, 0.6], armB: [-1.4, 0.6], face: 'angry' }, f: { tail: 0.2 } },
  cs_antenna: { limb: 'hands', w: { bodyY: 4, armF: [0.6, 1.2], armB: [0.5, 1.2] }, h: { armF: [3.0, 0.1], armB: [2.9, 0.1], bodyY: -4, lean: -0.05, face: 'angry' }, f: { armF: [2.9, 0.2], armB: [2.8, 0.2] } },
  cs_hammer: { limb: 'hands', heavy: 1, w: { armF: [3.1, 0.2], armB: [3.0, 0.2], lean: -0.25, bodyY: -2, face: 'angry' }, h: { armF: [1.3, 0], armB: [1.2, 0.05], lean: 0.65, bodyY: 6, legF: [1.0, -1.0], legB: [-0.8, -0.2], face: 'angry' }, f: { armF: [1.0, 0.1], armB: [0.9, 0.1], lean: 0.7, bodyY: 8 } },
  // especiales con cuerpo propio
  nc_rush: { limb: 'handF', w: { armF: [0.3, 2.2], armB: [0.6, 1.8], lean: 0.2, bodyX: -4 }, h: { armF: [1.6, 0], armB: [-0.6, 1.2], lean: 0.85, legF: [1.2, -1.2], legB: [-1.1, -0.3], bodyX: 10, face: 'angry' }, m: { lean: 0.9 }, f: { lean: 0.6 } },
  nc_rising: { limb: 'handF', spin: { turns: 1, from: 'h', to: 'x' }, w: { armF: [0.4, 2.3], bodyY: 8, lean: 0.4 }, h: { armF: [3.1, 0.05], armB: [0.3, 1.8], legF: [0.9, -1.8], legB: [-0.1, -0.3], lean: -0.1, face: 'angry' } },
  nc_pound: { limb: 'hands', w: { armF: [3.1, 0.3], armB: [3.0, 0.3], lean: -0.2, bodyY: -4, face: 'angry' }, h: { armF: [0.9, 0.05], armB: [0.8, 0.1], lean: 1.0, bodyY: 14, legF: [1.3, -2.2], legB: [0.5, -2.0], face: 'angry' } },
  nj_throw: { limb: 'handF', w: { armF: [-0.8, 1.6], armB: [1.0, 1.4], lean: -0.2 }, h: { armF: [1.7, 0.2], armB: [-0.4, 1.2], lean: 0.35, legF: [0.8, -0.8], legB: [-0.7, -0.2] }, f: { armF: [1.9, 0.3] } },
  nj_dash: { limb: 'handF', w: { lean: 0.5, armF: [-0.5, 0.6], bodyY: 6 }, h: { lean: 0.75, armF: [1.9, 0.05], armB: [-1.4, 0.3], legF: [1.3, -1.3], legB: [-1.2, -0.3], face: 'angry' }, f: { lean: 0.5 } },
  nj_vanish: { w: { bodyY: 6, armF: [1.2, 2.6], armB: [1.1, 2.6], lean: 0.1 }, h: { bodyY: 4, armF: [1.3, 2.7], armB: [1.2, 2.7], legF: [0.3, -0.3], legB: [-0.2, -0.3], face: 'angry' } },
  nj_guard: { w: { lean: 0.1, armF: [1.8, 2.4], armB: [1.6, 2.5], bodyY: 8, legF: [0.9, -1.4], legB: [-0.6, -0.9] }, h: { lean: 0.12, armF: [1.8, 2.4], armB: [1.6, 2.5], bodyY: 8, legF: [0.9, -1.4], legB: [-0.6, -0.9], face: 'angry' } },
  dl_fireball: { limb: 'hands', w: { armF: [0.6, 2.2], armB: [0.5, 2.2], lean: -0.15, bodyY: 4 }, h: { armF: [1.5, 0.1], armB: [1.4, 0.15], lean: 0.4, legF: [0.9, -0.9], legB: [-0.7, -0.2], face: 'angry' }, f: { armF: [1.5, 0.2], armB: [1.4, 0.25] } },
  dl_cape: { limb: 'handF', w: { armF: [-0.6, 0.4], armB: [0.4, 1.2], lean: -0.1 }, h: { armF: [2.3, 0.2], armB: [0.8, 1.4], lean: 0.25, face: 'angry' }, f: { armF: [2.6, 0.3] } },
  dl_flameKick: { limb: 'footF', spin: { turns: 2, from: 'h', to: 'x' }, w: { bodyY: 8, lean: 0.3, legF: [1.3, -2.1] }, h: { legF: [2.6, -0.1], legB: [0.3, -0.6], armF: [1.5, 0.4], armB: [-1.2, 0.4], face: 'angry' } },
  dl_tornado: { limb: 'feet', spin: { turns: 3, from: 'h', to: 'x' }, w: { legF: [1.2, -1.8], lean: 0.1 }, h: { legF: [1.6, -0.05], legB: [-0.4, -0.2], armF: [2.2, 0.4], armB: [-2.2, 0.4], lean: -0.3, face: 'angry' } },
  rb_tackle: { w: { lean: 0.4, armF: [1.2, 0.9], armB: [1.1, 1.0] }, h: { lean: 0.9, armF: [1.6, 0.3], armB: [1.5, 0.35], legF: [1.2, -1.0], legB: [-1.1, -0.2], bodyX: 8, face: 'angry' } },
  rb_bellyFlop: { limb: 'chest', w: { lean: -0.3, bodyY: -6, armF: [2.9, 0.4], armB: [2.8, 0.4] }, h: { lean: 1.35, armF: [2.2, 0.3], armB: [-1.5, 0.3], legF: [-0.4, -0.3], legB: [-0.6, -0.3], face: 'angry' } },
  ni_orb: { limb: 'hands', w: { armF: [0.9, 2.3], armB: [0.8, 2.4], lean: -0.1 }, h: { armF: [1.5, 0.3], armB: [1.45, 0.35], lean: 0.25, legF: [0.6, -0.6], legB: [-0.5, -0.2], face: 'angry' }, f: { armF: [1.5, 0.4], armB: [1.45, 0.45] } },
  ni_star: { limb: 'handF', w: { armF: [3.0, 0.6], armB: [0.8, 1.4], lean: -0.15 }, h: { armF: [1.9, 0.1], armB: [0.4, 1.8], lean: 0.2 }, f: { armF: [1.6, 0.2] } },
  ni_float: { w: { bodyY: 6, armF: [0.6, 0.4], armB: [0.5, 0.4] }, h: { armF: [2.2, 0.2], armB: [2.0, 0.2], legF: [0.2, -0.3], legB: [0.1, -0.4], lean: -0.1 } },
  ni_ward: { w: { armF: [2.7, 1.2], armB: [2.6, 1.3], lean: -0.05, bodyY: 3 }, h: { armF: [2.7, 1.2], armB: [2.6, 1.3], lean: -0.05, bodyY: 3, face: 'angry' } },
  tr_snort: { w: { lean: 0.4, bodyY: 3 }, h: { lean: 0.75, head: 0.3, legF: [0.9, -1.0], legB: [-0.5, -0.3], face: 'angry' } },
  tr_charge: { limb: 'head', w: { lean: 0.6, bodyY: 6 }, h: { lean: 1.1, bodyY: 10, armF: [-0.4, 0.8], armB: [-0.6, 0.8], legF: [1.3, -1.2], legB: [-1.2, -0.3], face: 'angry' }, m: { lean: 1.1, bodyY: 10 } },
  tr_hornUp: { limb: 'head', w: { lean: 0.9, bodyY: 10 }, h: { lean: -0.6, bodyY: -8, armF: [2.6, 0.4], armB: [2.4, 0.5], legF: [0.3, -0.3], face: 'angry' } },
  tr_rear: { limb: 'feet', w: { lean: -0.5, legF: [1.6, -1.9], armF: [2.4, 0.8], armB: [2.2, 0.9] }, h: { lean: 0.3, legF: [0.5, -0.2], legB: [-0.4, -0.2], bodyY: 6, armF: [1.2, 0.6], face: 'angry' } },
  cs_laser: { limb: 'handF', w: { armF: [1.2, 1.2], armB: [1.1, 1.8] }, h: { armF: [1.57, 0], armB: [1.3, 1.6], lean: 0.1, legF: [0.7, -0.7], legB: [-0.7, -0.2], face: 'angry' } },
  cs_jet: { w: { bodyY: 4 }, h: { armF: [0.2, 0.2], armB: [0.15, 0.2], legF: [0.1, -0.1], legB: [-0.05, -0.1], lean: 0.05 } },
  cs_drop: { limb: 'handF', w: { lean: 0.6, bodyY: 10, armF: [0.9, 0.3] }, h: { lean: 0.75, bodyY: 14, armF: [0.4, 0.2], legF: [1.4, -2.2], legB: [0.6, -2.0] } },
  mc_cough: { w: { lean: 0.8, bodyY: 6, head: 0.4 }, h: { lean: 0.3, head: -0.2, armF: [1.3, 1.2], face: 'angry' } },
  mc_lunge: { limb: 'handF', w: { lean: 0.4, armF: [2.6, 0.5], bodyY: 6 }, h: { lean: 0.8, armF: [1.3, 0.1], armB: [-1.0, 0.4], legF: [1.2, -1.0], legB: [-1.2, -0.2], bodyX: 10, face: 'angry' } },
  mc_leap: { w: { bodyY: 8, lean: 0.5, legF: [1.4, -2.2] }, h: { lean: -0.2, armF: [2.8, 0.6], armB: [2.6, 0.7], legF: [1.6, -2.3], legB: [1.3, -2.2], face: 'angry' } },
  mc_crouch: { w: { bodyY: 12, lean: 0.5, armF: [1.5, 1.6], armB: [1.3, 1.7], legF: [1.4, -2.2], legB: [0.5, -2.0] }, h: { bodyY: 12, lean: 0.5, armF: [1.5, 1.6], armB: [1.3, 1.7], legF: [1.4, -2.2], legB: [0.5, -2.0], face: 'angry' } },
  ch_breath: { w: { lean: -0.35, head: -0.3, armF: [0.9, 1.4] }, h: { lean: 0.35, head: 0.1, armF: [0.8, 1.2], armB: [0.7, 1.3], face: 'angry' } },
  ch_tope: { limb: 'chest', w: { lean: 0.3, bodyY: 6, armF: [-0.8, 0.3], armB: [-0.9, 0.3] }, h: { lean: 1.5, armF: [1.7, 0.1], armB: [1.6, 0.1], legF: [-0.5, -0.2], legB: [-0.7, -0.2], face: 'angry' } },
  ch_plancha: { spin: { turns: 2, from: 'h', to: 'x' }, w: { bodyY: 6, armF: [0.6, 0.8] }, h: { armF: [2.9, 0.3], armB: [2.8, 0.3], legF: [0.4, -0.6], legB: [0.2, -0.5], face: 'angry' } },
  ch_squirt: { limb: 'handF', w: { armF: [2.4, 1.0], lean: -0.1 }, h: { armF: [1.0, 0.4], armB: [0.9, 0.5], lean: 0.35, bodyY: 4 } },
  mr_grito: { w: { lean: -0.1, armF: [1.0, 1.6], armB: [0.9, 1.7] }, h: { lean: -0.25, head: -0.4, armF: [2.2, 0.2], armB: [2.0, 0.2], face: 'happy' } },
  lx_lunge: { w: { lean: 0.3, armF: [1.0, 1.4], armB: [0.9, 1.5], bodyY: 6 }, h: { lean: 0.6, armF: [1.5, 0.2], armB: [1.4, 0.3], legF: [1.1, -1.1], legB: [-1.0, -0.2], bodyX: 8, face: 'angry' } },
  lx_rope: { limb: 'footF', w: { bodyY: 8, lean: 0.3, armF: [0.6, 0.8] }, h: { armF: [2.9, 0.2], armB: [2.7, 0.3], legF: [1.6, -2.2], legB: [-0.1, -0.2], face: 'angry' } },
  ax_blow: { w: { lean: -0.2, head: -0.2, armF: [0.8, 1.8] }, h: { lean: 0.3, head: 0.15, armF: [1.3, 1.4], armB: [1.1, 1.5] } },
  ax_jet: { limb: 'hands', w: { armF: [0.4, 2.0], armB: [0.3, 2.1], lean: -0.2 }, h: { armF: [1.55, 0.1], armB: [1.5, 0.15], lean: 0.15, legF: [0.8, -0.8], legB: [-0.8, -0.2], face: 'angry' } },
  ax_geyser: { spin: { turns: 2, from: 'h', to: 'x' }, w: { bodyY: 8, armF: [0.5, 0.5], armB: [0.4, 0.5] }, h: { armF: [2.9, 0.1], armB: [2.8, 0.1], legF: [0.1, -0.1], legB: [-0.05, -0.1] } },
  ax_splat: { limb: 'handF', w: { armF: [2.7, 0.6], lean: -0.2 }, h: { armF: [0.7, 0.2], armB: [0.6, 0.3], lean: 0.6, bodyY: 8 } },
});

// qué animación usa cada golpe (combos y especiales propios)
const KIT_STYLE = {
  nacho: { jab1: 'bx_jab', jab2: 'bx_cross', jab3: 'bx_hook', sp_s: 'nc_rush', sp_u: 'nc_rising', sp_d: 'nc_pound' },
  pablo: { jab1: 'nj_chop', jab2: 'nj_chop2', rapid: 'nj_rapid', fsmash: 'nj_tripleKick', sp_n: 'nj_throw', sp_s: 'nj_dash', sp_u: 'nj_vanish', sp_d: 'nj_guard' },
  daniel: { jab1: 'palm', jab2: 'cp_meiaLua', jab3: 'cp_meiaLua', sp_n: 'dl_fireball', sp_s: 'dl_cape', sp_u: 'dl_flameKick', sp_d: 'dl_tornado' },
  robes: { jab1: 'wr_forearm', jab2: 'headbutt', jab3: 'headbutt', sp_s: 'rb_tackle', sp_d: 'rb_bellyFlop' },
  nicole: { jab1: 'palm', jab2: 'tk_frontSnap', jab3: 'tk_spinHook', sp_n: 'ni_orb', sp_s: 'ni_star', sp_u: 'ni_float', sp_d: 'ni_ward' },
  torito: { jab1: 'tr_hornJab', jab2: 'tr_hornToss', jab3: 'tr_hornToss', utilt: 'tr_hornToss', dtilt: 'tr_hoofKick', nair: 'spinNair', sp_n: 'tr_snort', sp_s: 'tr_charge', sp_u: 'tr_hornUp', sp_d: 'tr_rear' },
  chispa: { jab1: 'piston', rapid: 'cs_rapid', ftilt: 'drill', utilt: 'cs_antenna', dtilt: 'nj_sweep', dash: 'superman', fsmash: 'cs_hammer', nair: 'spinNair', sp_n: 'cs_laser', sp_u: 'cs_jet', sp_d: 'cs_drop' },
  michi: { jab1: 'clawJab', jab2: 'clawJab2', jab3: 'clawJab', jab4: 'mc_flipKick', utilt: 'nj_crescent', dtilt: 'nj_sweep', dash: 'superman', sp_n: 'mc_cough', sp_s: 'mc_lunge', sp_u: 'mc_leap', sp_d: 'mc_crouch' },
  chilazo: { jab1: 'chop', jab2: 'lx_chop2', jab3: 'ch_spin', utilt: 'wr_clapUp', dtilt: 'nj_sweep', nair: 'spinNair', sp_n: 'ch_breath', sp_s: 'ch_tope', sp_u: 'ch_plancha', sp_d: 'ch_squirt' },
  mariachi: { jab1: 'mr_slap', jab2: 'mr_slap2', jab3: 'mr_guitarJab', sp_n: 'mr_grito' },
  chupa: { jab1: 'clawJab', jab2: 'clawJab2', jab3: 'cb_bite' },
  dino: { jab1: 'dn_chomp', jab2: 'dn_bigChomp', jab3: 'dn_bigChomp' },
  luchador: { jab1: 'chop', jab2: 'lx_chop2', jab3: 'lariat', sp_n: 'lx_lunge', sp_u: 'lx_rope' },
  axo: { jab1: 'palm', jab2: 'tk_palm2', jab3: 'ax_tailSlap', sp_n: 'ax_blow', sp_s: 'ax_jet', sp_u: 'ax_geyser', sp_d: 'ax_splat' },
};
for (const id in KIT_STYLE) STYLE[id] = Object.assign({}, STYLE[id] || {}, KIT_STYLE[id]);
// el uppercut y la cornada al cielo pegan con el puño y los cuernos que se ven
ALIGN_SPECIALS.nacho = (ALIGN_SPECIALS.nacho || []).concat(['sp_u']);
ALIGN_SPECIALS.torito = (ALIGN_SPECIALS.torito || []).concat(['sp_u']);
ALIGN_SPECIALS.daniel = (ALIGN_SPECIALS.daniel || []).concat(['sp_u']);
