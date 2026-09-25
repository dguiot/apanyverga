'use strict';
// ============================================================
//  ANIMACIÓN: golpes por cuadros clave alineados con los golpes
//  (anticipación → impacto → remate → vuelta a la guardia),
//  estelas de movimiento, y el movimiento del cuerpo (correr,
//  frenar, saltar, caer) con estiramiento y aplastamiento.
// ============================================================
// Claves de cada golpe (se mezclan sobre la guardia o la pose del aire):
//   w = anticipación, llega justo antes del golpe (o al empezar a cargar)
//   h = impacto (primer cuadro que pega)   m = mitad de la parte activa
//   x = último cuadro que pega             f = remate, después vuelve a la guardia
// limb = qué parte deja la estela: handF/handB/hands, footF/footB/feet, head, chest, item
const AIRBASE = mkPose({ grounded: false, lean: 0.08, armF: [1.3, 1.3], armB: [0.9, 1.5], legF: [0.95, -1.45], legB: [0.3, -1.0] });
const A2 = {
  // ---------- en suelo ----------
  jab: { limb: 'handF', w: { armF: [0.7, 2.15], lean: 0.06 }, h: { armF: [1.62, 0.04], armB: [0.35, 2.1], lean: 0.26, legF: [0.52, -0.6], legB: [-0.45, -0.2] }, f: { armF: [1.52, 0.25], lean: 0.22 } },
  jab2: { limb: 'handB', w: { armB: [0.75, 2.05], armF: [1.2, 1.2], lean: 0.12 }, h: { armB: [1.6, 0.03], armF: [0.55, 1.95], lean: 0.4, legB: [-0.6, -0.08], legF: [0.55, -0.7] }, f: { armB: [1.5, 0.3], lean: 0.34 } },
  jab3: { limb: 'footF', w: { legF: [1.15, -2.1], lean: -0.05, armF: [1.2, 1.5], armB: [0.5, 1.9] }, h: { legF: [1.62, -0.03], legB: [-0.28, -0.12], lean: -0.32, armF: [0.35, 1.5], armB: [-0.35, 1.7], face: 'angry' }, f: { legF: [1.45, -0.3], lean: -0.26 } },
  ftilt: { limb: 'footF', w: { legF: [1.25, -2.25], legB: [-0.25, -0.35], lean: -0.12, armF: [1.0, 1.6], armB: [0.3, 1.8] }, h: { legF: [1.56, 0], legB: [-0.32, -0.08], lean: -0.52, armF: [0.2, 1.4], armB: [-0.7, 1.3], face: 'angry' }, f: { legF: [1.5, -0.25], lean: -0.46 } },
  utilt: { limb: 'handF', w: { armF: [0.45, 2.35], lean: 0.32, legF: [0.95, -1.4], legB: [-0.1, -0.9], bodyY: 5 }, h: { armF: [2.1, 0.45], lean: 0.08, legF: [0.45, -0.4], legB: [-0.3, -0.2], bodyY: -2, face: 'angry' }, m: { armF: [2.75, 0.18], lean: -0.1, bodyY: -5 }, x: { armF: [3.1, 0.04], armB: [0.2, 1.4], lean: -0.2, bodyY: -6 }, f: { armF: [3.0, 0.2], lean: -0.15 } },
  dtilt: { limb: 'footF', base: 'crouch', w: { lean: 0.5, legF: [1.35, -2.25], legB: [0.55, -2.0], armF: [1.1, 1.4], armB: [0.8, 1.6] }, h: { lean: 0.46, legF: [1.28, -0.02], legB: [0.8, -2.35], armF: [1.3, 1.2], armB: [0.9, 1.5], face: 'angry' }, f: { legF: [1.3, -0.3] } },
  dash: { limb: 'footF', w: { lean: 0.42, legF: [1.25, -1.95], legB: [-0.5, -0.4], armF: [0.2, 1.7], armB: [1.3, 1.3] }, h: { lean: -0.38, legF: [1.56, -0.08], legB: [-0.75, -0.55], armF: [-0.35, 1.2], armB: [2.0, 0.6], face: 'angry' }, m: { lean: -0.34 }, f: { legF: [1.3, -0.5], lean: -0.2 } },
  fsmash: { limb: 'handF', heavy: 1, w: { lean: -0.38, armF: [-1.05, 1.95], armB: [1.1, 1.6], legF: [0.62, -0.8], legB: [-0.52, -0.2], bodyX: -5, face: 'angry' }, h: { lean: 0.56, armF: [1.58, 0], armB: [-0.5, 1.5], legF: [1.02, -0.78], legB: [-0.92, -0.04], bodyX: 9, face: 'angry' }, f: { lean: 0.62, armF: [1.48, 0.1], bodyX: 11 } },
  usmash: { limb: 'hands', heavy: 1, w: { lean: 0.36, legF: [1.25, -2.05], legB: [0.62, -1.85], armF: [0.25, 2.35], armB: [0.2, 2.35], bodyY: 6 }, h: { lean: -0.08, armF: [2.6, 0.25], armB: [2.45, 0.3], legF: [0.12, -0.08], legB: [-0.18, -0.1], bodyY: -12, face: 'angry' }, x: { armF: [3.12, 0], armB: [3.02, 0.05], bodyY: -14, lean: -0.15 }, f: { armF: [3.0, 0.2], armB: [2.9, 0.25], bodyY: -8 } },
  dsmash: { limb: 'feet', heavy: 1, w: { lean: 0.32, legF: [1.0, -1.95], legB: [0.28, -1.95], armF: [2.3, 0.5], armB: [2.3, 0.5] }, h: { lean: 0.18, legF: [1.57, 0], legB: [-1.57, 0], armF: [1.9, 0.5], armB: [-1.9, 0.5], bodyY: 8, face: 'angry' }, f: { legF: [1.45, -0.2], legB: [-1.45, -0.2], bodyY: 6 } },
  // ---------- en el aire ----------
  nair: { limb: 'footF', air: 1, w: { legF: [1.35, -2.1], legB: [0.6, -1.7], lean: 0.12, armF: [1.2, 1.3], armB: [1.0, 1.4] }, h: { legF: [1.62, -0.04], legB: [-0.55, -1.45], lean: -0.4, armF: [0.85, 1.1], armB: [-0.75, 1.2], face: 'angry' }, x: { legF: [1.5, -0.18], lean: -0.34 }, f: { legF: [1.3, -0.8] } },
  fair: { limb: 'hands', air: 1, heavy: 1, w: { armF: [3.05, 0.3], armB: [2.9, 0.4], lean: -0.38, legF: [1.1, -1.4], legB: [0.3, -1.3] }, h: { armF: [1.95, 0.12], armB: [1.85, 0.16], lean: 0.3 }, x: { armF: [1.05, 0.05], armB: [1.0, 0.1], lean: 0.58, face: 'angry' }, f: { armF: [0.9, 0.3], armB: [0.85, 0.35], lean: 0.5 } },
  bair: { limb: 'footB', air: 1, w: { legB: [-0.45, -2.15], legF: [0.95, -1.5], lean: 0.32, armF: [1.3, 1.1] }, h: { legB: [-1.64, -0.02], legF: [0.95, -1.7], lean: 0.72, armF: [1.85, 0.6], armB: [0.95, 1.0], face: 'angry' }, f: { legB: [-1.5, -0.3], lean: 0.6 } },
  uair: { limb: 'footF', air: 1, spin: { turns: -1, from: 'w', to: 'f' }, w: { legF: [0.9, -1.9], legB: [0.3, -1.3], lean: 0.2 }, h: { legF: [2.9, -0.08], legB: [1.2, -1.6], lean: -0.1, armF: [1.2, 1.0], armB: [0.6, 1.2], face: 'angry' }, x: { legF: [3.0, -0.2] }, f: { legF: [1.6, -1.2] } },
  dair: { limb: 'feet', air: 1, heavy: 1, w: { legF: [2.2, -2.45], legB: [2.0, -2.35], armF: [2.4, 0.6], armB: [2.3, 0.6], lean: 0 }, h: { legF: [0.1, 0], legB: [-0.08, 0], armF: [2.95, 0.3], armB: [2.85, 0.3], face: 'angry' }, f: { legF: [0.15, -0.2], legB: [-0.1, -0.2] } },
  // ---------- agarres ----------
  grab: { w: { armF: [0.95, 1.3], armB: [0.85, 1.4], lean: 0.12 }, h: { armF: [1.56, 0.08], armB: [1.46, 0.2], lean: 0.32, legF: [0.62, -0.5], legB: [-0.5, -0.15] }, f: { armF: [1.5, 0.3], armB: [1.4, 0.35], lean: 0.25 } },
  throwF: { limb: 'hands', w: { armF: [1.5, 0.3], armB: [1.4, 0.3], lean: 0.05 }, h: { armF: [1.75, 0], armB: [1.65, 0], lean: 0.5, legF: [0.9, -0.7], legB: [-0.7, -0.1] }, f: { lean: 0.45 } },
  throwB: { limb: 'hands', w: { armF: [1.5, 0.3], armB: [1.4, 0.3], lean: 0.1 }, h: { armF: [-1.7, 0.1], armB: [-1.6, 0.1], lean: -0.5, legF: [0.7, -0.5], legB: [-0.9, -0.3] } },
  throwU: { limb: 'hands', w: { armF: [1.2, 0.8], armB: [1.1, 0.8], lean: 0.25, bodyY: 4 }, h: { armF: [3.1, 0], armB: [3.0, 0], lean: -0.12, bodyY: -6 } },
  throwD: { limb: 'hands', w: { armF: [2.6, 0.4], armB: [2.5, 0.4], lean: -0.1 }, h: { armF: [0.9, 0.1], armB: [0.8, 0.1], lean: 0.7, bodyY: 6 } },
  // ---------- especiales ----------
  cast: { limb: 'handF', w: { armF: [-0.4, 1.9], armB: [-0.5, 1.9], lean: -0.22 }, h: { armF: [1.56, 0.04], armB: [1.46, 0.12], lean: 0.32, face: 'angry' }, f: { armF: [1.5, 0.2] } },
  charge: { limb: 'handF', heavy: 1, w: { armF: [-1.45, 1.9], lean: -0.42, legF: [0.85, -1.2], legB: [-0.62, -0.4], face: 'angry' }, h: { armF: [1.6, 0], armB: [-0.3, 1.5], lean: 0.62, legF: [1.05, -0.6], legB: [-0.95, 0], face: 'angry' } },
  upper: { limb: 'handF', w: { armF: [0.4, 2.35], lean: 0.36, legF: [1.15, -1.95], bodyY: 4 }, h: { armF: [3.05, 0.05], armB: [0.4, 1.6], legF: [1.25, -1.95], legB: [0.1, -0.3], lean: -0.14, face: 'angry' }, f: { armF: [3.0, 0.1] } },
  spin: { limb: 'hands', spin: { turns: 3, from: 'h', to: 'x' }, w: { armF: [1.5, 0.6], armB: [-1.3, 0.6] }, h: { armF: [2.1, 0.25], armB: [-2.0, 0.3], legF: [1.2, -0.5], legB: [0.2, -0.6], face: 'angry' } },
  stomp: { limb: 'feet', w: { armF: [2.8, 0.4], armB: [2.8, 0.4], legF: [1.2, -2.0], legB: [1.0, -2.0] }, h: { armF: [2.0, 0.3], armB: [2.0, 0.3], legF: [0.35, -0.3], legB: [-0.35, -0.2], face: 'angry', bodyY: 4 } },
  counter: { w: { armF: [1.25, 2.1], armB: [1.05, 2.2], lean: -0.15 }, h: { armF: [1.25, 2.1], armB: [1.05, 2.2], lean: -0.15 } },
  slash: { limb: 'handF', w: { armF: [2.85, 0.5], lean: -0.1 }, h: { armF: [1.0, 0.12], lean: 0.62, legF: [1.2, -0.7], legB: [-1.0, -0.2], face: 'angry' }, f: { armF: [0.7, 0.3] } },
  shoulder: { limb: 'chest', w: { lean: 0.55, armF: [0.5, 2.2] }, h: { lean: 0.78, armF: [1.0, 2.2], armB: [0.4, 1.9], legF: [1.1, -0.9], legB: [-0.9, -0.1], face: 'angry' } },
  jump: { w: { lean: 0.2, legF: [1.2, -1.9], legB: [0.5, -1.6], armF: [0.4, 1.6], armB: [0.3, 1.6], bodyY: 3 }, h: { lean: -0.05, armF: [2.9, 0.2], armB: [2.7, 0.3], legF: [0.2, -0.3], legB: [-0.1, -0.4], face: 'angry' } },
  item: { limb: 'handF', w: { armF: [2.6, 0.8], lean: -0.22 }, h: { armF: [1.4, 0.08], lean: 0.32 } },
  pickup: { w: { lean: 0.85, armF: [0.55, 0.2], legF: [1.2, -1.8], legB: [0.4, -1.6] }, h: { lean: 0.85, armF: [0.55, 0.2], legF: [1.2, -1.8], legB: [0.4, -1.6] } },
  final: { w: { armF: [2.6, 0.6], armB: [2.6, 0.6], face: 'angry' }, h: { armF: [3.0, 0], armB: [3.0, 0], face: 'angry' } },
  // ---------- con objetos ----------
  swing: { limb: 'item', w: { armF: [-1.4, 0.7], armB: [-1.2, 0.8], lean: -0.3 }, h: { armF: [1.5, 0.1], armB: [1.3, 0.3], lean: 0.35, face: 'angry' }, f: { armF: [2.3, 0.1], armB: [2.1, 0.3], lean: 0.4 } },
  swingUp: { limb: 'item', w: { armF: [0.35, 0.4], armB: [0.3, 0.5], lean: 0.35, bodyY: 4 }, h: { armF: [2.3, 0.1], armB: [2.1, 0.2], lean: -0.05 }, x: { armF: [3.2, 0], armB: [3.1, 0.1], lean: -0.25, bodyY: -4 }, f: { armF: [3.6, 0.1], armB: [3.5, 0.1], lean: -0.3 } },
  swingDown: { limb: 'item', base: 'crouch', w: { armF: [2.5, 0.3], armB: [2.4, 0.3], lean: 0.2 }, h: { armF: [1.25, 0.05], armB: [1.15, 0.1], lean: 0.55 }, f: { armF: [0.6, 0.1], armB: [0.55, 0.1], lean: 0.6 } },
  swingDash: { limb: 'item', w: { armF: [-0.9, 0.6], lean: 0.2, legF: [1.1, -1.5] }, h: { armF: [1.7, 0.1], armB: [1.4, 0.3], lean: 0.6, legF: [1.2, -0.7], legB: [-1.0, -0.2], face: 'angry' }, f: { armF: [2.4, 0.1], lean: 0.5 } },
  swingAir: { limb: 'item', air: 1, spin: { turns: 1, from: 'h', to: 'f' }, w: { armF: [-1.2, 0.6], lean: -0.2 }, h: { armF: [1.6, 0.1], armB: [1.4, 0.2], lean: 0.2 } },
  throwItemU: { limb: 'handF', w: { armF: [0.6, 1.2], lean: 0.2, bodyY: 3 }, h: { armF: [3.0, 0.05], lean: -0.15 } },
  throwItemD: { limb: 'handF', w: { armF: [2.9, 0.5], lean: -0.2 }, h: { armF: [0.5, 0.05], lean: 0.6 } },

  // ---------- estilos de personaje ----------
  hook: { limb: 'handF', w: { armF: [0.35, 2.2], lean: 0.1, bodyY: 3 }, h: { armF: [1.35, 0.5], armB: [0.5, 2.0], lean: 0.45, bodyY: 8, legF: [0.8, -1.0], legB: [-0.5, -0.4], face: 'angry' }, f: { armF: [1.5, 0.7], lean: 0.4 } },
  bodyBlow: { limb: 'handF', w: { armF: [0.5, 2.2], lean: 0.2, bodyY: 5 }, h: { armF: [1.28, 0.02], armB: [0.4, 2.1], lean: 0.52, bodyY: 10, legF: [0.95, -1.1], legB: [-0.55, -0.35], face: 'angry' }, f: { armF: [1.25, 0.2], lean: 0.48 } },
  superman: { limb: 'handF', w: { lean: 0.3, armF: [0.3, 2.0], legF: [1.2, -1.8] }, h: { lean: 0.7, armF: [1.5, 0.02], armB: [-0.6, 1.2], legF: [-0.2, -0.6], legB: [-0.9, -0.3], face: 'angry' }, m: { lean: 0.72 }, f: { lean: 0.5 } },
  palm: { limb: 'handF', w: { armF: [0.9, 2.3], lean: 0.02 }, h: { armF: [1.6, 0.18], armB: [0.4, 2.0], lean: 0.3, legF: [0.55, -0.6], legB: [-0.45, -0.2] }, f: { armF: [1.55, 0.3] } },
  roundhouse: { limb: 'footF', w: { legF: [0.9, -2.2], legB: [-0.2, -0.3], lean: 0.15, armF: [1.5, 1.2] }, h: { legF: [1.9, -0.05], legB: [-0.25, -0.1], lean: -0.62, armF: [0.2, 1.2], armB: [-0.9, 1.1], face: 'angry' }, f: { legF: [1.7, -0.4], lean: -0.5 } },
  spinKick: { limb: 'footF', heavy: 1, w: { lean: 0.35, legF: [0.6, -1.6], legB: [-0.7, -1.9], armF: [1.6, 1.0], armB: [0.6, 1.2], bodyX: -4 }, h: { lean: -0.62, legF: [1.72, -0.02], legB: [-0.3, -0.12], armF: [0.3, 1.2], armB: [-1.1, 1.0], bodyX: 8, face: 'angry' }, f: { legF: [1.6, -0.3], lean: -0.5, bodyX: 9 } },
  spinNair: { limb: 'feet', air: 1, spin: { turns: 1, from: 'h', to: 'x' }, w: { legF: [1.3, -2.0], legB: [0.5, -1.6] }, h: { legF: [1.62, -0.05], legB: [-1.5, -0.1], armF: [2.4, 0.3], armB: [-2.3, 0.3], face: 'angry' } },
  shove: { limb: 'hands', w: { armF: [0.8, 1.9], armB: [0.7, 2.0], lean: 0.05 }, h: { armF: [1.35, 0.05], armB: [1.3, 0.1], lean: 0.5, bodyY: 5, legF: [0.9, -0.9], legB: [-0.7, -0.2], face: 'angry' }, f: { lean: 0.46 } },
  doubleAxe: { limb: 'hands', heavy: 1, w: { armF: [3.1, 0.3], armB: [3.0, 0.35], lean: -0.3, bodyY: -3, face: 'angry' }, h: { armF: [1.6, 0.05], armB: [1.5, 0.1], lean: 0.55, bodyX: 8, legF: [1.0, -0.8], legB: [-0.9, -0.05], face: 'angry' }, f: { armF: [1.2, 0.1], armB: [1.1, 0.15], lean: 0.62, bodyX: 10 } },
  palmBlast: { limb: 'handF', w: { armF: [-0.2, 1.9], armB: [0.3, 1.9], lean: -0.2 }, h: { armF: [1.52, 0.3], armB: [0.9, 1.6], lean: 0.35, bodyY: 4, legF: [0.8, -0.8], legB: [-0.6, -0.2], face: 'angry' }, f: { armF: [1.5, 0.4] } },
  twoPalm: { limb: 'hands', heavy: 1, w: { armF: [-0.5, 1.8], armB: [-0.6, 1.8], lean: -0.35, bodyX: -4, face: 'angry' }, h: { armF: [1.58, 0.25], armB: [1.5, 0.3], lean: 0.5, bodyX: 9, legF: [1.0, -0.8], legB: [-0.9, -0.05], face: 'angry' }, f: { lean: 0.55, bodyX: 10 } },
  headbutt: { limb: 'head', w: { lean: -0.25, armF: [0.3, 1.6], armB: [0.2, 1.7] }, h: { lean: 0.95, armF: [0.2, 0.9], armB: [-0.2, 0.9], legF: [1.0, -0.9], legB: [-0.8, -0.1], bodyY: 6, face: 'angry' }, f: { lean: 0.85 } },
  gore: { limb: 'head', heavy: 1, w: { lean: -0.4, armF: [-0.3, 1.2], armB: [-0.4, 1.2], legF: [0.7, -0.8], legB: [-0.5, -0.3], bodyX: -6, face: 'angry' }, h: { lean: 1.05, armF: [0.1, 0.8], armB: [-0.3, 0.8], legF: [1.1, -0.8], legB: [-1.0, 0], bodyY: 8, bodyX: 12, face: 'angry' }, f: { lean: 0.95, bodyX: 13 } },
  bullRush: { limb: 'head', w: { lean: 0.5, armF: [0.2, 1.2] }, h: { lean: 1.0, armF: [0.1, 0.8], armB: [-0.4, 0.8], legF: [1.2, -1.0], legB: [-1.0, -0.2], bodyY: 7, face: 'angry' }, m: { lean: 0.98 } },
  piston: { limb: 'handF', w: { armF: [1.2, 1.6], lean: 0.1 }, h: { armF: [1.58, 0], armB: [0.5, 2.0], lean: 0.3, legF: [0.55, -0.6], legB: [-0.45, -0.2] }, f: { armF: [1.58, 0.05] } },
  drill: { limb: 'handF', heavy: 1, w: { armF: [-0.8, 1.9], armB: [1.0, 1.6], lean: -0.32, bodyX: -5, face: 'angry' }, h: { armF: [1.56, 0], armB: [-0.4, 1.4], lean: 0.5, bodyX: 10, legF: [1.0, -0.8], legB: [-0.9, -0.05], face: 'angry' }, x: { armF: [1.58, 0], lean: 0.52, bodyX: 11 }, f: { lean: 0.5, bodyX: 11 } },
  clawJab: { limb: 'handF', w: { armF: [1.9, 0.9], lean: 0.05 }, h: { armF: [1.35, 0.1], armB: [0.5, 1.9], lean: 0.35, legF: [0.6, -0.7], legB: [-0.45, -0.2], face: 'angry' }, f: { armF: [1.1, 0.2] } },
  clawSwipe: { limb: 'handF', w: { armF: [2.8, 0.3], lean: -0.15 }, h: { armF: [1.9, 0.05], lean: 0.2, face: 'angry' }, x: { armF: [1.15, 0.05], lean: 0.5, bodyY: 4 }, f: { armF: [0.8, 0.2], lean: 0.5 } },
  pounce: { limb: 'hands', heavy: 1, w: { lean: 0.55, armF: [0.3, 1.8], armB: [0.2, 1.8], legF: [1.3, -2.1], legB: [0.6, -1.9], bodyY: 6 }, h: { lean: 0.7, armF: [1.7, 0.1], armB: [1.6, 0.2], legF: [0.3, -0.3], legB: [-1.1, -0.1], bodyX: 12, face: 'angry' }, f: { lean: 0.6, bodyX: 12 } },
  chop: { limb: 'handF', w: { armF: [2.9, 0.6], armB: [0.5, 1.9], lean: -0.15 }, h: { armF: [1.45, 0.05], lean: 0.45, bodyY: 5, legF: [0.9, -0.9], legB: [-0.6, -0.2], face: 'angry' }, f: { armF: [1.1, 0.1], lean: 0.5 } },
  lariat: { limb: 'handF', heavy: 1, w: { armF: [-1.6, 0.1], armB: [1.2, 1.5], lean: -0.3, bodyX: -5, face: 'angry' }, h: { armF: [1.55, 0], armB: [-0.8, 1.2], lean: 0.25, bodyX: 10, legF: [1.0, -0.7], legB: [-0.9, 0], face: 'angry' }, f: { armF: [2.1, 0], lean: 0.2, bodyX: 12 } },
  dropkick: { limb: 'feet', w: { lean: 0.2, legF: [1.2, -2.0], legB: [1.0, -2.0], armF: [1.8, 0.5] }, h: { lean: -1.1, legF: [1.6, 0], legB: [1.5, 0], armF: [-0.6, 0.4], armB: [-0.8, 0.4], bodyY: -18, face: 'angry' }, m: { lean: -1.1, bodyY: -16 }, f: { lean: -0.5, bodyY: -6 } },
  elbowDrop: { limb: 'chest', air: 1, w: { lean: -0.2, armF: [2.9, 1.8], legF: [1.2, -1.8] }, h: { lean: 1.25, armF: [0.3, 2.6], armB: [0.2, 2.6], legF: [-0.6, -0.3], legB: [-0.9, -0.2], face: 'angry' }, f: { lean: 1.1 } },
};
// Cada personaje pega a su manera: boxeador, ninja, luchador, mago…
const STYLE = {
  nacho: { jab3: 'hook', ftilt: 'bodyBlow', dash: 'superman' },
  pablo: { jab: 'palm', jab3: 'roundhouse', fsmash: 'spinKick', nair: 'spinNair' },
  daniel: { fsmash: 'spinKick' },
  robes: { ftilt: 'shove', fsmash: 'doubleAxe' },
  nicole: { jab: 'palm', ftilt: 'palmBlast', fsmash: 'twoPalm' },
  torito: { ftilt: 'headbutt', fsmash: 'gore', dash: 'bullRush' },
  chispa: { jab: 'piston', jab3: 'piston', ftilt: 'piston', fsmash: 'drill' },
  michi: { jab: 'clawJab', ftilt: 'clawSwipe', fsmash: 'pounce', nair: 'spinNair' },
  chilazo: { ftilt: 'chop', fsmash: 'lariat', dash: 'dropkick' },
};
// color de la estela según el efecto del golpe
const TRAIL_COL = { fire: '#ff9f1c', elec: '#48cae4', slash: '#e2e8f0' };

function animFor(f, m) {
  const d = m.def, st = STYLE[f.id];
  const name = (st && st[m.key]) || d.anim;
  return A2[name] || A2[d.anim] || A2.jab;
}
// cuadros clave según los cuadros de golpe reales del movimiento
function animTimes(d) {
  let f0, f1;
  if (d.hits && d.hits.length) { f0 = Math.min(...d.hits.map(h => h.f0)); f1 = Math.max(...d.hits.map(h => h.f1)); }
  else if (d.grabBox) { f0 = d.grabBox.f0; f1 = d.grabBox.f1; }
  else if (d.at || d.shootAt || d.throwAt) { f0 = d.at || d.shootAt || d.throwAt; f1 = f0 + 2; }
  else { f0 = Math.max(2, Math.round(Math.min(10, d.dur * 0.3))); f1 = Math.round(Math.min(d.dur * 0.75, f0 + 20)); }
  if (d.final) { f0 = 10; f1 = d.dur - 12; }
  const e = d.dur;
  const w = d.chargeAt ? Math.min(d.chargeAt, f0 - 1) : Math.max(f0 <= 1 ? 0 : 1, f0 - 1);
  // remate corto y regreso rápido a la guardia: el golpe se ve seco y el cuerpo queda listo
  const x = Math.max(f0, f1), f = Math.min(e - 1, x + Math.max(2, Math.ceil((e - x) * 0.22)));
  return { w, h: Math.max(w + 1, f0), m: (f0 + x) / 2, x, f, e, r: Math.min(e, f + Math.max(3, Math.ceil((e - f) * 0.55))) };
}
// ---------- cinemática inversa: el brazo o la pierna que pega llega al área de golpe ----------
// ángulos del esqueleto: dirv(a) = (sin a, cos a), 0 = hacia abajo, π/2 = hacia delante
function ik2(rx, ry, tx, ty, L1, L2, bend) {
  const dx = tx - rx, dy = ty - ry, d = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + 0.5, L1 + L2 - 0.2);
  const base = Math.atan2(dx, dy);
  const A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const Bk = Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
  return [base - bend * A, bend * (Math.PI - Bk)];
}
function limbRoots(id, pose) {
  useSK(id);
  const B = LOOKS[id].build;
  let hipY = -(SK.thigh + SK.shin);
  if (pose.grounded) hipY = -Math.max(legReach(pose.legF), legReach(pose.legB), 10);
  hipY += pose.bodyY || 0;
  const [tdx, tdy] = dirv(Math.PI - pose.lean), sx = tdx * SK.torso, sy = hipY + tdy * SK.torso, cw = B.chest;
  return { armF: [sx + cw * 0.3 * Math.cos(pose.lean), sy + 4], armB: [sx - cw * 0.35 * Math.cos(pose.lean), sy + 4], legF: [4, hipY], legB: [-4, hipY] };
}
// lleva el punto del mundo local (con giro/escala/desplazamiento) al marco del esqueleto sin girar
function toSkeleton(pose, x, y) {
  const pv = pose.pivot || -56, r = -(pose.rot || 0), cr = Math.cos(r), sr = Math.sin(r), qx = x - (pose.bodyX || 0), qy = y - pv;
  return [(qx * cr - qy * sr) / (pose.sx || 1), (pv + qx * sr + qy * cr) / (pose.sy || 1)];
}
function hitAt(d, fr) {
  const on = d.hits.filter(h => fr >= h.f0 - 0.5 && fr <= h.f1 + 0.5);
  if (on.length) return on;
  let best = d.hits[0], bd = 1e9; for (const h of d.hits) { const dd = Math.min(Math.abs(fr - h.f0), Math.abs(fr - h.f1)); if (dd < bd) { bd = dd; best = h; } }
  return [best];
}
function applyIK(fig, pose, hits, limb, itemLen) {
  const chains = limb === 'hands' ? ['armF', 'armB'] : limb === 'feet' ? ['legF', 'legB'] : limb === 'handF' || limb === 'item' ? ['armF'] : limb === 'handB' ? ['armB'] : limb === 'footF' ? ['legF'] : limb === 'footB' ? ['legB'] : [];
  if (!chains.length) return pose;
  for (let it = 0; it < 3; it++) {
    const R = limbRoots(fig.id, pose);
    for (const ch of chains) {
      const arm = ch.startsWith('arm');
      // área para este miembro: la del lado que le toca (dsmash tiene una a cada lado)
      let h = hits[0];
      if (hits.length > 1) {
        // dos miembros: cada uno a su lado; uno solo: va hacia el área que empezó más tarde (el arco sigue)
        if (chains.length > 1) h = ch.endsWith('F') ? hits.reduce((a, b) => (b.x > a.x ? b : a)) : hits.reduce((a, b) => (b.x < a.x ? b : a));
        else h = hits.reduce((a, b) => (b.f0 > a.f0 || (b.f0 === a.f0 && b.x > a.x) ? b : a));
      }
      const [tx, ty] = toSkeleton(pose, h.x, h.y + (chains.length > 1 ? (ch.endsWith('F') ? -3 : 3) : 0));
      const [rx, ry] = R[ch];
      const L1 = arm ? SK.upper : SK.thigh, L2 = arm ? SK.fore + 5 + (itemLen || 0) : SK.shin + 3;
      // un área grande centrada en el cuerpo no es para estirar el pie hasta ahí
      if (Math.hypot(tx - rx, ty - ry) < (L1 + L2) * (itemLen ? 0.2 : arm ? 0.25 : 0.42)) continue;
      const bend = arm ? (pose[ch][1] >= 0 ? 1 : -1) : (pose[ch][1] <= 0 ? -1 : 1);
      pose[ch] = ik2(rx, ry, tx, ty, L1, L2, bend);
    }
  }
  return pose;
}
function spinRot(A, T, f) {
  if (!A.spin) return 0;
  const a = T[A.spin.from || 'h'], b = T[A.spin.to || 'x'];
  return f < a || f > b ? 0 : ((f - a) / Math.max(1, b - a)) * TAU * A.spin.turns;
}
// poses clave del golpe (con la punta en su sitio), guardadas por movimiento
function keyPoses(fig, m, A, T, base, air) {
  const d = m.def, itemLen = A.limb === 'item' ? (fig.item && fig.item.type === 'sword' ? 58 : 46) : 0;
  const ck = (air ? 'a' : 'g') + (A.limb === 'item' ? itemLen : '') + '|' + (A === animFor(fig, m) ? (STYLE[fig.id] && STYLE[fig.id][m.key]) || d.anim : '');
  d._kp = d._kp || {};
  if (d._kp[ck]) return d._kp[ck];
  const P = (k, from) => A[k] ? mkPose(Object.assign({}, from || base, A[k], { grounded: base.grounded })) : null;
  // cada pose clave hereda de la anterior (a media patada la pierna sigue arriba)
  const W_ = P('w') || base;
  let H_ = P('h') || mkPose(W_), M_ = P('m', H_), X_ = P('x', M_ || H_) || (M_ ? mkPose(M_) : mkPose(H_));
  if (d.hits && d.hits.length && A.limb) {
    for (const [pz, fr] of [[H_, T.h], [M_, T.m], [X_, T.x]]) {
      if (!pz) continue;
      pz.rot = spinRot(A, T, fr);
      // si el área ya sale de la pose (alignHits), la pose se respeta tal cual
      const hs = hitAt(d, fr).filter(h => !h._al);
      if (hs.length) applyIK(fig, pz, hs, A.limb, itemLen);
    }
  }
  const F_ = P('f', X_) || X_;
  return (d._kp[ck] = { W_, H_, M_, X_, F_ });
}
// pose de un golpe en el cuadro f (exacta: sin retraso, así el puño está donde pega)
function attackPose2(fig, m, fOverride) {
  const d = m.def, A = animFor(fig, m), T = d._t || (d._t = animTimes(d));
  const air = !fig.grounded;
  const base = A.base === 'crouch' ? POSES.crouch : air ? AIRBASE : BASE_POSE;
  const { W_, H_, M_, X_, F_ } = keyPoses(fig, m, A, T, base, air);
  const f = fOverride === undefined ? m.f : fOverride;
  let p;
  if (f <= T.w) p = blendPose(base, W_, easeInOut(clamp(f / Math.max(1, T.w), 0, 1)));
  else if (f < T.h) p = W_;
  else if (f <= T.x) {
    if (M_ && T.x > T.h) p = f <= T.m ? blendPose(H_, M_, (f - T.h) / Math.max(1, T.m - T.h)) : blendPose(M_, X_, (f - T.m) / Math.max(1, T.x - T.m));
    else p = blendPose(H_, X_, T.x > T.h ? (f - T.h) / (T.x - T.h) : 1);
  } else if (f <= T.f) p = blendPose(X_, F_, easeOut((f - T.x) / Math.max(1, T.f - T.x)));
  else p = blendPose(F_, base, easeInOut(clamp((f - T.f) / Math.max(1, (T.r || T.e) - T.f), 0, 1)));
  // ráfaga: mientras se sostiene, alterna los dos puños (o pistones)
  if (d.rapid && d.holdLoop && f === d.holdLoop[0] && A.h2 && Math.floor((m.t || 0) / 3) % 2) p = mkPose(Object.assign({}, base, A.h2, { grounded: base.grounded }));
  p = mkPose(p);
  p.rot = spinRot(A, T, f);
  if (d.crouch) p.face = 'angry';
  return p;
}

// ---------- esqueleto: dónde quedan manos, pies y cabeza (mismas cuentas que drawCharacter) ----------
function skeletonTips(id, pose) {
  useSK(id);
  const L = LOOKS[id], B = L.build;
  let hipY = -(SK.thigh + SK.shin);
  if (pose.grounded) hipY = -Math.max(legReach(pose.legF), legReach(pose.legB), 10);
  hipY += pose.bodyY || 0;
  const hy = hipY, [tdx, tdy] = dirv(Math.PI - pose.lean);
  const sx = tdx * SK.torso, sy = hy + tdy * SK.torso, cw = B.chest;
  const hand = (x, y, ang) => { const q = limbPoints(x, y, ang[0], ang[1], SK.upper, SK.fore), [dx, dy] = dirv(q.a); return { x: q.fx + dx * 5, y: q.fy + dy * 5, a: q.a }; };
  const foot = (x, y, ang) => { const q = limbPoints(x, y, ang[0], ang[1], SK.thigh, SK.shin), [dx, dy] = dirv(q.a + Math.PI / 2); return { x: q.fx + dx * 6, y: q.fy + dy * 6, a: q.a }; };
  const t = {
    handB: hand(sx - cw * 0.35 * Math.cos(pose.lean), sy + 4, pose.armB),
    handF: hand(sx + cw * 0.3 * Math.cos(pose.lean), sy + 4, pose.armF),
    footB: foot(-4, hy, pose.legB), footF: foot(4, hy, pose.legF),
    head: { x: sx + Math.sin(pose.lean) * (SK.neck + SK.headRY * 1.3), y: sy - Math.cos(pose.lean) * (SK.neck + SK.headRY * 1.3) },
    chest: { x: sx * 0.8 + Math.sin(pose.lean) * 6, y: (sy + hy) / 2 - 4 },
  };
  if (L.tail && typeof tailGeom === 'function' && ['dino', 'axo', 'chupa'].includes(L.tail.kind)) { const g = tailGeom(L, pose, 0, hy); t.tail = { x: g.ex, y: g.ey }; }
  // mismas transformaciones que drawCharacter: desplazamiento, giro y estiramiento
  const pv = pose.pivot || -56, r = pose.rot || 0, cr = Math.cos(r), sr = Math.sin(r), kx = pose.sx || 1, ky = pose.sy || 1, bx = pose.bodyX || 0;
  for (const k in t) {
    const px = t[k].x * kx, py = t[k].y * ky - pv;
    t[k].x = bx + px * cr - py * sr; t[k].y = pv + px * sr + py * cr;
  }
  return t;
}
function limbTip(fig, pose, limb) {
  const t = skeletonTips(fig.id, pose);
  if (limb === 'item') { const h = t.handF, len = fig.item && fig.item.type === 'sword' ? 58 : 46, [dx, dy] = dirv(h.a); return [{ x: h.x + dx * len, y: h.y + dy * len }]; }
  if (limb === 'guitar') { const h = t.handF, [dx, dy] = dirv(h.a); return [{ x: h.x + dx * 40, y: h.y + dy * 40, a: h.a }]; }
  if (limb === 'tail') return [t.tail || t.chest];
  if (limb === 'hands') return [t.handF, t.handB];
  if (limb === 'feet') return [t.footF, t.footB];
  return [t[limb] || t.handF];
}

// ---------- estela del golpe ----------
// se guarda en coordenadas del mundo: puntos recientes de la punta que pega
function recordSwoosh(fig) {
  const m = fig.move;
  if (!m || fig.state !== 'attack') { if (fig.swoosh) { fig.swoosh.fade++; if (fig.swoosh.fade > 8) fig.swoosh = null; } return; }
  const d = m.def, A = animFor(fig, m), T = d._t || (d._t = animTimes(d));
  if (!A.limb || !d.hits || !d.hits.length) return;
  const on = m.f >= T.h - 1 && m.f <= T.x + 3;
  if (!on) { if (fig.swoosh) { fig.swoosh.fade++; if (fig.swoosh.fade > 8) fig.swoosh = null; } return; }
  const s = fig.size(), dmg = Math.max(...d.hits.map(h => h.dmg));
  const eff = d.hits[0].effect || (fig.item && fig.item.type === 'sword' ? 'slash' : null);
  if (!fig.swoosh || fig.swoosh.move !== m) fig.swoosh = { move: m, lines: [], fade: 0, w: (5 + dmg * 0.75) * s * (d.smash || A.heavy ? 1.35 : 1), col: TRAIL_COL[eff] || (d.smash ? '#ffbe0b' : LOOKS[fig.id].accent || '#fff3c4'), hot: !!(d.smash || A.heavy) };
  const sw = fig.swoosh;
  // entre el cuadro anterior y este: pasos intermedios siguiendo el arco del cuerpo
  const steps = 4, prevF = Math.max(0, m.f - 1);
  const p0 = attackPose2(fig, m, prevF), p1 = attackPose2(fig, m, m.f);
  for (let k = 1; k <= steps; k++) {
    const q = mkPose(blendPose(p0, p1, k / steps)); q.rot = lerp(p0.rot || 0, p1.rot || 0, k / steps);
    const tips = limbTip(fig, q, A.limb);
    tips.forEach((tp, i) => {
      const L = sw.lines[i] || (sw.lines[i] = []);
      L.push({ x: fig.x + fig.face * tp.x * s, y: fig.y + tp.y * s });
      if (L.length > 26) L.shift();
    });
  }
}
function drawSwoosh(c, fig) {
  const sw = fig.swoosh; if (!sw) return;
  const a = clamp(1 - sw.fade / 8, 0, 1);
  for (const L of sw.lines) {
    const n = L.length; if (n < 3) continue;
    const left = [], right = [];
    for (let i = 0; i < n; i++) {
      const p = L[i], q = L[Math.min(n - 1, i + 1)], o = L[Math.max(0, i - 1)];
      let dx = q.x - o.x, dy = q.y - o.y; const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
      const w = sw.w * Math.pow(i / (n - 1), 0.9) * 0.5;
      left.push([p.x - dy * w, p.y + dx * w]); right.push([p.x + dy * w, p.y - dx * w]);
    }
    const path = k => { c.beginPath(); c.moveTo(left[0][0], left[0][1]); for (let i = 1; i < n; i++) c.lineTo(left[i][0] * k + L[i].x * (1 - k), left[i][1] * k + L[i].y * (1 - k)); for (let i = n - 1; i >= 0; i--) c.lineTo(right[i][0] * k + L[i].x * (1 - k), right[i][1] * k + L[i].y * (1 - k)); c.closePath(); };
    c.save();
    c.globalAlpha = 0.45 * a; c.fillStyle = sw.col; path(1); c.fill();
    if (sw.hot) { c.globalAlpha = 0.3 * a; c.fillStyle = '#ff6d00'; path(1.35); c.fill(); }
    c.globalAlpha = 0.85 * a; c.fillStyle = '#ffffff'; path(0.42); c.fill();
    c.restore();
  }
}

// ---------- movimiento del cuerpo ----------
// guardia de peleador: rebote suave y peso que se mueve
function stancePose(fig, t) {
  const b = Math.sin(t * 4.2 + fig.port), b2 = Math.sin(t * 2.1 + fig.port);
  const p = mkPose({ bodyY: b * 1.6 - 0.5, lean: 0.12 + b2 * 0.025, armF: [0.9 + b * 0.05, 1.75 + b * 0.05], armB: [0.55 - b * 0.04, 1.95], legF: [0.42, -0.62 - b * 0.04], legB: [-0.38, -0.28 - b * 0.04] });
  if (fig.item) { const k = ITEM_DEFS[fig.item.type].kind; p.armF = k === 'weapon' ? [2.35, 1.35] : [1.2, 0.6]; }
  return p;
}
// carrera: rodilla arriba, brazos doblados bombeando, inclinado hacia delante
function runPose2(phase, lean, amp = 1) {
  const s = Math.sin(phase), s2 = Math.sin(phase + Math.PI), c1 = Math.cos(phase), c2 = Math.cos(phase + Math.PI);
  return mkPose({
    lean,
    legF: [0.25 + s * 0.95 * amp, -0.35 - 1.55 * amp * Math.max(0, c1)],
    legB: [0.25 + s2 * 0.95 * amp, -0.35 - 1.55 * amp * Math.max(0, c2)],
    armF: [0.35 - s * 0.95 * amp, 1.85], armB: [0.35 - s2 * 0.95 * amp, 1.85],
    bodyY: -Math.abs(Math.sin(phase)) * 3.2 * amp + 1,
  });
}
function walkPose2(phase) {
  const s = Math.sin(phase), s2 = Math.sin(phase + Math.PI);
  return mkPose({
    lean: 0.1,
    legF: [0.12 + s * 0.5, -0.25 - 0.7 * Math.max(0, Math.cos(phase))],
    legB: [0.12 + s2 * 0.5, -0.25 - 0.7 * Math.max(0, Math.cos(phase + Math.PI))],
    armF: [0.9 + s2 * 0.08, 1.75], armB: [0.55 + s * 0.08, 1.95],
    bodyY: -Math.abs(Math.cos(phase)) * 1.8,
  });
}
// en el aire: encogido al subir, piernas abiertas al caer
function airPose2(fig) {
  const up = clamp(-fig.vy / 14, 0, 1), down = clamp(fig.vy / 12, 0, 1);
  const rise = mkPose({ grounded: false, lean: 0.05, armF: [2.1, 0.7], armB: [1.5, 0.9], legF: [1.35, -2.05], legB: [0.35, -1.3] });
  const apex = mkPose({ grounded: false, lean: 0.08, armF: [1.5, 1.0], armB: [1.1, 1.2], legF: [0.95, -1.5], legB: [0.25, -0.9] });
  const fall = mkPose({ grounded: false, lean: -0.02, armF: [2.5, 0.45], armB: [2.2, 0.55], legF: [0.45, -0.55], legB: [-0.2, -0.35] });
  return up > 0 ? blendPose(apex, rise, up) : blendPose(apex, fall, down);
}
