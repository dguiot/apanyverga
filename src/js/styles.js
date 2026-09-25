'use strict';
// ============================================================
//  ESTILOS DE PELEA: cada persona pelea distinto.
//   Nacho  → boxeo        Pablo → ninja / karate
//   Daniel → capoeira     Robes → lucha libre
//   Nicole → taekwondo con magia
//  Aquí están su guardia, su forma de correr y sus golpes. Las áreas de
//  golpe se colocan donde de verdad queda el puño o el pie en la pose
//  de impacto (alignHits), así cada cuerpo pega desde su propio brazo.
// ============================================================
// Ángulos: brazo/pierna = [segmento superior, flexión del inferior].
//   superior: 0 abajo, π/2 al frente, π arriba, negativo hacia atrás.
//   brazo: flexión + dobla el antebrazo hacia delante · pierna: flexión − dobla la rodilla.
Object.assign(A2, {
  // ---------- BOXEO (Nacho) ----------
  bx_jab: { limb: 'handF', w: { armF: [1.05, 1.9], lean: 0.2 }, h: { armF: [1.62, 0.02], armB: [0.8, 2.15], lean: 0.32, legF: [0.55, -0.7], legB: [-0.5, -0.25] }, f: { armF: [1.35, 0.9], lean: 0.25 } },
  bx_cross: { limb: 'handB', w: { armB: [0.65, 2.3], armF: [1.1, 1.85], lean: 0.15 }, h: { armB: [1.62, 0.02], armF: [0.85, 2.1], lean: 0.48, legB: [-0.72, -0.1], legF: [0.62, -0.6], bodyX: 4 }, f: { armB: [1.4, 0.7], lean: 0.4, bodyX: 3 } },
  bx_hook: { limb: 'handF', w: { armF: [0.95, 1.85], lean: 0.08, bodyX: -2 }, h: { armF: [1.52, 0.95], armB: [0.8, 2.1], lean: 0.4, bodyX: 5, legF: [0.62, -0.7], legB: [-0.55, -0.2], face: 'angry' }, f: { armF: [1.2, 1.5], lean: 0.32, bodyX: 4 } },
  bx_overhand: { limb: 'handB', heavy: 1, w: { armB: [2.45, 0.9], armF: [1.15, 1.8], lean: -0.12 }, h: { armB: [1.82, 0.05], armF: [0.8, 2.1], lean: 0.6, bodyY: 4, legB: [-0.8, -0.1], legF: [0.72, -0.8], face: 'angry' }, f: { armB: [1.25, 0.3], lean: 0.62, bodyY: 4 } },
  bx_upper: { limb: 'handF', w: { armF: [0.45, 2.3], lean: 0.38, bodyY: 7, legF: [0.95, -1.4], legB: [-0.2, -0.9] }, h: { armF: [2.15, 0.75], lean: 0.1, bodyY: -2, face: 'angry' }, x: { armF: [2.9, 0.28], lean: -0.18, bodyY: -7 }, f: { armF: [2.75, 0.5], lean: -0.1 } },
  bx_duck: { limb: 'handF', base: 'crouch', w: { armF: [0.95, 1.8], lean: 0.55 }, h: { armF: [1.42, 0.02], armB: [0.7, 2.0], lean: 0.78, face: 'angry' }, f: { armF: [1.3, 0.5], lean: 0.7 } },
  bx_haymaker: { limb: 'handB', heavy: 1, w: { armB: [-0.35, 2.5], armF: [1.2, 1.8], lean: -0.36, bodyX: -6, legF: [0.62, -0.8], legB: [-0.6, -0.3], face: 'angry' }, h: { armB: [1.64, 0.0], armF: [0.4, 2.0], lean: 0.62, bodyX: 11, legB: [-0.98, -0.05], legF: [1.02, -0.8], face: 'angry' }, f: { armB: [1.5, 0.12], lean: 0.66, bodyX: 12 } },
  bx_dblUpper: { limb: 'hands', heavy: 1, w: { armF: [0.4, 2.4], armB: [0.3, 2.4], lean: 0.42, bodyY: 8, legF: [1.2, -2.0], legB: [0.6, -1.8] }, h: { armF: [2.7, 0.2], armB: [2.55, 0.3], lean: -0.1, bodyY: -12, legF: [0.1, -0.08], legB: [-0.2, -0.1], face: 'angry' }, x: { armF: [3.1, 0], armB: [3.0, 0.05], bodyY: -14 }, f: { armF: [2.95, 0.25], armB: [2.85, 0.3], bodyY: -8 } },
  bx_pound: { limb: 'hands', heavy: 1, base: 'crouch', w: { armF: [2.8, 0.4], armB: [2.75, 0.45], lean: 0.1, bodyY: -4 }, h: { armF: [0.55, 0.05], armB: [-0.55, 0.05], lean: 0.2, bodyY: 14, face: 'angry' }, f: { armF: [0.6, 0.2], armB: [-0.6, 0.2], bodyY: 12 } },
  bx_spinFist: { limb: 'handF', air: 1, spin: { turns: 1, from: 'h', to: 'x' }, w: { armF: [1.2, 1.4], armB: [0.9, 1.5] }, h: { armF: [1.6, 0.05], armB: [-1.4, 0.3], legF: [1.0, -1.4], legB: [0.4, -1.0], face: 'angry' }, f: { armF: [1.4, 0.6] } },
  bx_backfist: { limb: 'handB', air: 1, w: { armB: [1.3, 1.6], lean: 0.2, legF: [1.1, -1.5] }, h: { armB: [-1.52, 0.15], armF: [1.2, 1.2], lean: 0.52, face: 'angry' }, f: { armB: [-1.3, 0.5], lean: 0.45 } },
  bx_upAir: { limb: 'handF', air: 1, w: { armF: [0.8, 2.2], lean: 0.2, legF: [1.2, -1.8] }, h: { armF: [2.75, 0.25], lean: -0.2, face: 'angry' }, x: { armF: [3.1, 0.02], lean: -0.28 }, f: { armF: [2.9, 0.3] } },

  // ---------- NINJA (Pablo) ----------
  nj_chop: { limb: 'handF', w: { armF: [2.3, 0.9], lean: 0.12 }, h: { armF: [1.55, 0.22], armB: [-0.4, 1.9], lean: 0.38, legF: [0.75, -1.1], legB: [-0.55, -0.6] }, f: { armF: [1.3, 0.4], lean: 0.32 } },
  nj_chop2: { limb: 'handB', w: { armB: [2.25, 0.9], armF: [1.2, 0.8], lean: 0.1 }, h: { armB: [1.52, 0.25], armF: [0.4, 1.9], lean: 0.46, legF: [0.75, -1.1], legB: [-0.6, -0.5] }, f: { armB: [1.3, 0.45], lean: 0.4 } },
  nj_sideKick: { limb: 'footF', w: { legF: [1.42, -2.3], legB: [-0.2, -0.3], lean: -0.18, armF: [1.3, 0.9], armB: [-0.3, 1.8] }, h: { legF: [1.63, 0], legB: [-0.26, -0.1], lean: -0.56, armF: [0.3, 1.3], armB: [-0.9, 1.1], face: 'angry' }, f: { legF: [1.45, -0.6], lean: -0.42 } },
  nj_crescent: { limb: 'footF', w: { legF: [0.95, -1.7], lean: 0.12 }, h: { legF: [2.3, -0.15], legB: [-0.2, -0.1], lean: -0.52, armF: [0.6, 1.3], face: 'angry' }, x: { legF: [2.85, -0.08], lean: -0.62 }, f: { legF: [1.6, -1.2], lean: -0.2 } },
  nj_sweep: { limb: 'footF', base: 'crouch', w: { legF: [0.9, -2.2], lean: 0.6 }, h: { legF: [1.55, -0.04], legB: [0.9, -2.3], lean: 0.72, bodyY: 10, armB: [0.1, 0.2], face: 'angry' }, f: { legF: [1.4, -0.4], lean: 0.6 } },
  nj_flyKick: { limb: 'footF', w: { lean: 0.3, legF: [1.25, -2.0], legB: [-0.4, -0.5] }, h: { legF: [1.58, 0], legB: [0.9, -2.0], lean: -0.32, bodyY: -12, armF: [-0.4, 1.0], armB: [-0.8, 0.8], face: 'angry' }, m: { lean: -0.3, bodyY: -12 }, f: { legF: [1.3, -0.6], lean: -0.15, bodyY: -4 } },
  nj_flip: { limb: 'footF', heavy: 1, spin: { turns: -1, from: 'h', to: 'f' }, w: { lean: 0.35, legF: [1.2, -2.0], legB: [0.6, -1.9], bodyY: 8 }, h: { legF: [2.9, -0.1], legB: [1.0, -1.6], lean: -0.2, bodyY: -18, face: 'angry' }, x: { legF: [3.0, -0.2], bodyY: -16 }, f: { legF: [1.6, -1.2], bodyY: -6 } },
  nj_split: { limb: 'feet', heavy: 1, w: { legF: [1.2, -2.2], legB: [1.0, -2.2], bodyY: 10, armF: [2.4, 0.5], armB: [2.3, 0.5] }, h: { legF: [1.57, 0], legB: [-1.57, 0], bodyY: 26, lean: 0.05, armF: [2.2, 0.4], armB: [-2.2, 0.4], face: 'angry' }, f: { legF: [1.5, -0.2], legB: [-1.5, -0.2], bodyY: 22 } },
  nj_airKick: { limb: 'footF', air: 1, heavy: 1, w: { legF: [1.3, -2.2], legB: [0.6, -1.7], lean: 0.05 }, h: { legF: [1.64, -0.02], legB: [0.5, -1.7], lean: -0.52, armF: [0.4, 1.2], armB: [-0.7, 1.0], face: 'angry' }, f: { legF: [1.45, -0.4], lean: -0.4 } },
  nj_bicycle: { limb: 'feet', air: 1, w: { legF: [1.0, -1.9], legB: [0.4, -1.4] }, h: { legF: [2.9, -0.1], legB: [2.1, -1.4], lean: -0.32, face: 'angry' }, x: { legB: [3.0, -0.1], legF: [2.0, -1.3], lean: -0.3 }, f: { legF: [1.4, -1.2], legB: [1.0, -1.2] } },

  // ---------- CAPOEIRA (Daniel) ----------
  cp_palm2: { limb: 'handB', w: { armB: [0.85, 2.2], armF: [1.2, 1.3], lean: 0.1 }, h: { armB: [1.6, 0.2], armF: [0.5, 1.9], lean: 0.42, legB: [-0.62, -0.1], legF: [0.6, -0.7] }, f: { armB: [1.5, 0.35], lean: 0.36 } },
  cp_meiaLua: { limb: 'footF', w: { legF: [0.7, -0.4], lean: 0.25, armF: [1.4, 1.0], armB: [0.8, 1.3] }, h: { legF: [2.1, -0.1], legB: [-0.25, -0.1], lean: -0.42, armF: [0.4, 1.2], armB: [-0.6, 1.2], face: 'angry' }, x: { legF: [1.65, -0.1], lean: -0.32 }, f: { legF: [0.95, -0.6], lean: -0.1 } },
  cp_bencao: { limb: 'footF', w: { legF: [1.55, -2.35], legB: [-0.1, -0.3], lean: -0.1, armF: [1.2, 1.4], armB: [0.6, 1.6] }, h: { legF: [1.66, -0.04], legB: [-0.28, -0.08], lean: -0.62, armF: [0.2, 1.3], armB: [-0.5, 1.4], face: 'angry' }, f: { legF: [1.5, -0.8], lean: -0.4 } },
  cp_armada: { limb: 'footF', w: { lean: 0.2, legF: [0.6, -0.8], armF: [1.6, 0.6], armB: [-1.4, 0.6] }, h: { legF: [2.55, -0.1], legB: [-0.2, -0.1], lean: -0.6, armF: [0.6, 1.2], armB: [-0.8, 1.1], face: 'angry' }, x: { legF: [2.4, -0.1], lean: -0.55 }, f: { legF: [1.2, -1.0], lean: -0.2 } },
  cp_rasteira: { limb: 'footF', base: 'crouch', w: { lean: 0.7, legF: [0.8, -2.2], armB: [0.2, 0.3] }, h: { legF: [1.57, 0], legB: [0.9, -2.35], lean: 0.95, bodyY: 16, armB: [0.25, 0.15], armF: [0.5, 0.3], face: 'angry' }, f: { legF: [1.45, -0.3], lean: 0.8, bodyY: 12 } },
  cp_au: { limb: 'feet', heavy: 1, spin: { turns: 1, from: 'w', to: 'x' }, w: { lean: 0.35, legF: [1.1, -1.6] }, h: { legF: [2.55, -0.08], legB: [-2.55, -0.08], armF: [0.35, 0.02], armB: [-0.35, 0.02], lean: 0, bodyY: -6, face: 'angry' }, x: { legF: [2.4, -0.1], legB: [-2.4, -0.1] }, f: { legF: [0.8, -1.0], legB: [-0.6, -0.6] } },
  cp_queixada: { limb: 'footF', heavy: 1, w: { lean: 0.35, legF: [1.1, -1.8], legB: [0.3, -1.4], bodyY: 6 }, h: { legF: [2.95, -0.05], legB: [-0.2, -0.1], lean: -0.35, bodyY: -10, face: 'angry' }, x: { legF: [2.8, -0.1] }, f: { legF: [1.5, -1.2], bodyY: -4 } },
  cp_airPalm: { limb: 'hands', air: 1, heavy: 1, w: { armF: [-0.4, 1.9], armB: [-0.5, 1.9], lean: -0.25, legF: [1.0, -1.5] }, h: { armF: [1.58, 0.1], armB: [1.5, 0.15], lean: 0.35, face: 'angry' }, f: { armF: [1.5, 0.3], armB: [1.4, 0.35] } },

  // ---------- LUCHA LIBRE (Robes) ----------
  wr_forearm: { limb: 'handF', w: { armF: [1.05, 2.25], lean: 0.15 }, h: { armF: [1.5, 1.35], armB: [0.7, 1.6], lean: 0.5, legF: [0.6, -0.8], legB: [-0.6, -0.4], bodyX: 4 }, f: { armF: [1.3, 1.6], lean: 0.42 } },
  wr_forearm2: { limb: 'handB', w: { armB: [1.0, 2.25], armF: [0.9, 1.3], lean: 0.15 }, h: { armB: [1.5, 1.35], armF: [0.6, 1.5], lean: 0.55, legB: [-0.7, -0.2], legF: [0.62, -0.7], bodyX: 5 }, f: { armB: [1.3, 1.6], lean: 0.45 } },
  wr_lariat: { limb: 'handF', heavy: 1, w: { armF: [-0.4, 0.15], armB: [0.8, 1.4], lean: -0.2, bodyX: -4 }, h: { armF: [1.62, 0], armB: [0.2, 1.4], lean: 0.32, bodyX: 9, legF: [0.9, -0.8], legB: [-0.8, -0.1], face: 'angry' }, f: { armF: [2.05, 0.1], lean: 0.2, bodyX: 11 } },
  wr_clapUp: { limb: 'hands', w: { armF: [0.75, 1.2], armB: [0.65, 1.3], lean: 0.35, bodyY: 5 }, h: { armF: [2.6, 0.12], armB: [2.5, 0.15], lean: -0.08, bodyY: -4, face: 'angry' }, x: { armF: [3.0, 0.05], armB: [2.95, 0.08], bodyY: -5 }, f: { armF: [2.7, 0.3], armB: [2.6, 0.35] } },
  wr_stomp: { limb: 'footF', w: { legF: [1.35, -1.9], legB: [-0.1, -0.3], lean: 0.1, armF: [1.2, 1.0], armB: [0.9, 1.1] }, h: { legF: [0.95, -0.15], legB: [-0.3, -0.1], lean: 0.32, bodyY: 5, face: 'angry' }, f: { legF: [0.8, -0.3], lean: 0.25 } },
  wr_press: { limb: 'hands', heavy: 1, w: { armF: [0.9, 2.4], armB: [0.8, 2.4], lean: 0.3, bodyY: 9, legF: [0.9, -1.4], legB: [0.3, -1.1] }, h: { armF: [3.0, 0], armB: [2.95, 0.05], lean: -0.05, bodyY: -8, face: 'angry' }, f: { armF: [2.9, 0.2], armB: [2.8, 0.25], bodyY: -5 } },
  wr_splash: { limb: 'chest', air: 1, w: { armF: [2.6, 0.5], armB: [-2.6, 0.5], legF: [1.3, -2.0], legB: [0.6, -1.8] }, h: { armF: [1.9, 0.1], armB: [-1.9, 0.1], legF: [1.1, -0.2], legB: [-1.1, -0.2], lean: 0.1, face: 'angry' }, f: { armF: [1.8, 0.3], armB: [-1.8, 0.3] } },

  // ---------- TAEKWONDO + MAGIA (Nicole) ----------
  tk_palm2: { limb: 'handB', w: { armB: [0.8, 2.3], armF: [1.0, 1.4], lean: 0.05 }, h: { armB: [1.6, 0.18], armF: [0.5, 1.9], lean: 0.36, legB: [-0.55, -0.1], legF: [0.5, -0.6] }, f: { armB: [1.5, 0.3], lean: 0.3 } },
  tk_frontSnap: { limb: 'footF', w: { legF: [1.55, -2.35], legB: [-0.1, -0.2], lean: -0.1, armF: [0.8, 1.7], armB: [0.4, 1.9] }, h: { legF: [1.95, -0.08], legB: [-0.25, -0.05], lean: -0.5, armF: [0.4, 1.5], armB: [-0.4, 1.6] }, f: { legF: [1.6, -1.2], lean: -0.3 } },
  tk_highKick: { limb: 'footF', w: { legF: [1.25, -2.25], legB: [-0.2, -0.2], lean: -0.12, armF: [0.9, 1.6], armB: [0.3, 1.8] }, h: { legF: [2.15, -0.02], legB: [-0.3, -0.05], lean: -0.78, armF: [0.2, 1.4], armB: [-0.8, 1.2], face: 'angry' }, f: { legF: [1.9, -0.4], lean: -0.62 } },
  tk_split: { limb: 'footF', w: { legF: [1.0, -1.6], lean: 0.05 }, h: { legF: [2.85, -0.05], legB: [-0.2, -0.05], lean: -0.25, armF: [1.2, 0.8], armB: [-1.0, 0.8], face: 'angry' }, x: { legF: [3.05, 0], lean: -0.3 }, f: { legF: [1.6, -1.0] } },
  tk_lowSpin: { limb: 'footF', base: 'crouch', w: { legF: [0.9, -2.1], lean: 0.5 }, h: { legF: [1.52, -0.02], legB: [0.8, -2.25], lean: 0.55, bodyY: 10, armB: [0.2, 0.4], face: 'angry' }, f: { legF: [1.4, -0.4] } },
  tk_jumpKick: { limb: 'footF', w: { lean: 0.2, legF: [1.3, -2.1], legB: [-0.3, -0.5] }, h: { legF: [1.72, -0.04], legB: [1.0, -2.0], lean: -0.42, bodyY: -16, armF: [0.3, 1.2], armB: [-0.6, 1.0], face: 'angry' }, m: { lean: -0.4, bodyY: -15 }, f: { legF: [1.4, -0.7], lean: -0.2, bodyY: -5 } },
  tk_scissor: { limb: 'feet', heavy: 1, spin: { turns: -1, from: 'h', to: 'f' }, w: { lean: 0.3, legF: [1.2, -2.0], legB: [0.6, -1.8], bodyY: 8 }, h: { legF: [2.95, -0.05], legB: [2.4, -0.4], lean: -0.2, bodyY: -16, face: 'angry' }, x: { legF: [2.8, -0.1], legB: [2.9, -0.1], bodyY: -14 }, f: { legF: [1.5, -1.1], legB: [1.2, -1.0], bodyY: -5 } },
  tk_splitAir: { limb: 'footF', air: 1, w: { legF: [1.0, -1.8], legB: [0.3, -1.2] }, h: { legF: [2.9, -0.05], legB: [-0.4, -0.2], lean: -0.2, face: 'angry' }, x: { legF: [3.05, 0] }, f: { legF: [1.6, -1.2] } },
});

// qué animación usa cada golpe de cada personaje (las criaturas conservan las suyas)
Object.assign(STYLE, {
  nacho: { jab1: 'bx_jab', jab2: 'bx_cross', jab3: 'bx_hook', ftilt: 'bx_overhand', utilt: 'bx_upper', dtilt: 'bx_duck', dash: 'superman', fsmash: 'bx_haymaker', usmash: 'bx_dblUpper', dsmash: 'bx_pound', nair: 'bx_spinFist', bair: 'bx_backfist', uair: 'bx_upAir', sp_n: 'bx_haymaker' },
  pablo: { jab1: 'nj_chop', jab2: 'nj_chop2', jab3: 'roundhouse', ftilt: 'nj_sideKick', utilt: 'nj_crescent', dtilt: 'nj_sweep', dash: 'nj_flyKick', fsmash: 'spinKick', usmash: 'nj_flip', dsmash: 'nj_split', nair: 'spinNair', fair: 'nj_airKick', uair: 'nj_bicycle' },
  daniel: { jab1: 'palm', jab2: 'cp_palm2', jab3: 'cp_meiaLua', ftilt: 'cp_bencao', utilt: 'cp_armada', dtilt: 'cp_rasteira', dash: 'cp_au', fsmash: 'spinKick', usmash: 'cp_queixada', dsmash: 'nj_split', nair: 'spinNair', fair: 'cp_airPalm' },
  robes: { jab1: 'wr_forearm', jab2: 'wr_forearm2', jab3: 'headbutt', ftilt: 'wr_lariat', utilt: 'wr_clapUp', dtilt: 'wr_stomp', dash: 'shoulder', fsmash: 'doubleAxe', usmash: 'wr_press', dsmash: 'stomp', nair: 'wr_splash', bair: 'bx_backfist' },
  nicole: { jab1: 'palm', jab2: 'tk_palm2', jab3: 'tk_frontSnap', ftilt: 'tk_highKick', utilt: 'tk_split', dtilt: 'tk_lowSpin', dash: 'tk_jumpKick', fsmash: 'twoPalm', usmash: 'tk_scissor', dsmash: 'nj_split', nair: 'spinNair', fair: 'nj_airKick', uair: 'tk_splitAir' },
});

// ---------- guardias y carreras propias ----------
const STANCES = {
  // boxeador: guardia alta, rebote rápido sobre las puntas
  boxer: (t, b, b2) => ({ bodyY: b * 2.2 - 1, lean: 0.2 + b2 * 0.03, armF: [1.05 + b * 0.04, 1.95], armB: [0.72 - b * 0.03, 2.2], legF: [0.52, -0.72 - b * 0.05], legB: [-0.52, -0.26 - b * 0.05] }),
  // ninja: postura baja, mano abierta al frente y la otra lista en la cadera
  ninja: (t, b) => ({ bodyY: b * 0.8, lean: 0.3, armF: [1.35 + b * 0.03, 0.55], armB: [-0.35, 1.95], legF: [0.78, -1.25], legB: [-0.6, -0.72] }),
  // capoeira: la ginga, un vaivén de un pie al otro con los brazos alternando
  capoeira: (t) => { const g = Math.sin(t * 3.2); return { bodyY: Math.abs(g) * 3, bodyX: g * 5, lean: 0.2 + Math.abs(g) * 0.15, armF: [1.15 + g * 0.35, 1.5 - g * 0.3], armB: [0.5 - g * 0.3, 1.9], legF: [0.4 + g * 0.35, -0.6 - Math.max(0, g) * 0.6], legB: [-0.4 + g * 0.3, -0.35 - Math.max(0, -g) * 0.6] }; },
  // luchador: abierto, bajo, con los brazos listos para agarrar
  wrestler: (t, b, b2) => ({ bodyY: b * 1.2 + 1, lean: 0.36 + b2 * 0.02, armF: [0.95, 0.95], armB: [0.75, 1.05], legF: [0.58, -0.85], legB: [-0.58, -0.6] }),
  // taekwondo: de perfil, rebotando ligera, manos bajas
  taekwondo: (t, b) => { const q = Math.sin(t * 5.4); return { bodyY: Math.abs(q) * -2.4, lean: 0.06, armF: [0.72, 1.9], armB: [0.38, 2.1], legF: [0.34, -0.36 - Math.abs(q) * 0.12], legB: [-0.36, -0.2 - Math.abs(q) * 0.12] }; },
};
const FIGHT_STYLE = { nacho: 'boxer', pablo: 'ninja', daniel: 'capoeira', robes: 'wrestler', nicole: 'taekwondo' };
const RUN_STYLE = {
  ninja: { lean: 0.62, amp: 1.05, arms: 'back' },
  wrestler: { lean: 0.28, amp: 0.8, bounce: 1.5 },
  taekwondo: { lean: 0.32, amp: 1.1 },
  boxer: { lean: 0.38, amp: 0.95 },
  capoeira: { lean: 0.34, amp: 1.0, bounce: 1.2 },
};
const _stance0 = stancePose;
stancePose = function (fig, t) {
  const st = STANCES[FIGHT_STYLE[fig.id]];
  if (!st || fig.item) return _stance0(fig, t);
  const b = Math.sin(t * (FIGHT_STYLE[fig.id] === 'boxer' ? 6 : 4.2) + fig.port), b2 = Math.sin(t * 2.1 + fig.port);
  return mkPose(st(t + fig.port, b, b2));
};
function runPoseFor(fig, phase, lean) {
  const rs = RUN_STYLE[FIGHT_STYLE[fig.id]];
  if (!rs) return runPose2(phase, lean);
  const p = runPose2(phase, rs.lean, rs.amp);
  if (rs.arms === 'back') { p.armF = [-1.25, 0.35]; p.armB = [-1.35, 0.3]; }
  if (rs.bounce) p.bodyY *= rs.bounce;
  return p;
}

// ---------- áreas de golpe donde queda el puño o el pie ----------
// Se calcula con la pose clave del cuadro en que pega (sin cinemática inversa):
// el golpe sale del brazo o la pierna que se ve, para cada cuerpo y cada estilo.
function rawKeyPose(fig, m, fr) {
  const d = m.def, A = animFor(fig, m), T = animTimes(d);
  const base = A.base === 'crouch' ? POSES.crouch : !fig.grounded ? AIRBASE : BASE_POSE;
  const P = (k, from) => A[k] ? mkPose(Object.assign({}, from || base, A[k], { grounded: base.grounded })) : null;
  const W_ = P('w') || base, H_ = P('h') || mkPose(W_), M_ = P('m', H_), X_ = P('x', M_ || H_) || (M_ ? mkPose(M_) : mkPose(H_));
  let p;
  if (fr <= T.h) p = H_;
  else if (fr <= T.x) p = M_ && T.x > T.h ? (fr <= T.m ? blendPose(H_, M_, (fr - T.h) / Math.max(1, T.m - T.h)) : blendPose(M_, X_, (fr - T.m) / Math.max(1, T.x - T.m))) : blendPose(H_, X_, T.x > T.h ? (fr - T.h) / (T.x - T.h) : 1);
  else p = X_;
  p = mkPose(p); p.rot = spinRot(A, T, fr);
  return p;
}
const ALIGN_SKIP = /^(bat|sword|gun|item|pummel|[fbud]throw|sp_)/;
const ALIGN_SPECIALS = { nacho: ['sp_n'] }; // especiales que son un golpe normal con el brazo
function alignHits(id, set) {
  const fig = { id, item: null, grounded: true };
  for (const key in set) {
    const d = set[key];
    if (!d || !d.hits || (ALIGN_SKIP.test(key) && !(ALIGN_SPECIALS[id] || []).includes(key))) continue;
    const m = { key, def: d, f: 0, v: {} };
    fig.grounded = !d.air;
    const A = animFor(fig, m);
    if (!A.limb) continue;
    for (const h of d.hits) {
      if (h.vfx) continue;
      if (h.r >= 34 && Math.hypot(h.x, h.y + 55) < h.r * 1.1) continue; // área grande en el cuerpo
      const pose = rawKeyPose(fig, m, h.f0);
      const tips = limbTip(fig, pose, A.limb);
      let tp = tips[0];
      if (tips.length > 1) tp = tips.reduce((a, b) => (Math.hypot(b.x - h.x, b.y - h.y) < Math.hypot(a.x - h.x, a.y - h.y) ? b : a));
      if (!tp || !isFinite(tp.x) || !isFinite(tp.y)) continue;
      // si el miembro va estirado, el área sigue un poco más allá del puño o del empeine
      const ch = A.limb === 'handB' ? 'armB' : A.limb.startsWith('hand') ? 'armF' : A.limb === 'footB' ? 'legB' : A.limb.startsWith('foot') ? 'legF' : null;
      const straight = ch && pose[ch] && Math.abs(pose[ch][1]) < 0.4 && tp.a !== undefined;
      let ex = 0, ey = 0;
      if (straight) { const [dx, dy] = dirv(A.limb.startsWith('foot') || A.limb === 'feet' ? tp.a : tp.a); ex = dx * h.r * 0.3; ey = dy * h.r * 0.3; }
      h.x = +(tp.x + ex).toFixed(1); h._al = 1;
      // el punto de meteoro va justo debajo de la punta: sigue siendo un área aparte
      h.y = +(tp.y + ey + (h.meteor && d.hits.length > 1 ? h.r * 0.9 : 0)).toFixed(1);
    }
    delete d._kp; delete d._t;
  }
}
