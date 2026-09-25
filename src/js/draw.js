'use strict';
// ============================================================
//  DIBUJO DE PERSONAJES: estilo arcade de peleas (proporciones
//  realistas, músculo sombreado) + caras con foto
// ============================================================
const FACE_IMG = {}, FACE_HURT = {}, FACE_PORT = {};
function tintCanvas(img, col) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  return c;
}
function loadFaces() {
  const data = typeof FACE_DATA !== 'undefined' ? FACE_DATA : {};
  for (const [id, f] of Object.entries(data)) {
    const img = new Image();
    img.onload = () => { FACE_IMG[id] = img; FACE_HURT[id] = tintCanvas(img, 'rgba(255,40,40,.42)'); };
    img.src = f.head;
    const p = new Image(); p.onload = () => { FACE_PORT[id] = p; }; p.src = f.port;
  }
}

// sleeve: 'long' | 'short' | 'none'   ·   hairBack: pelo detrás de la foto
const LOOKS = {
  daniel: { skin: '#b97a5a', hair: '#2e241c', hairBack: 'long', toonBeard: 'short', top: '#3d5e8e', top2: '#2a4268', pattern: '#cfc39c', inner: '#f2efe9', garment: 'fleece', sleeve: 'long', pants: '#2b2f3a', shoe: '#1d1d1f', sole: '#d9d4c8', wrap: '#ece6da', accent: '#2ec4b6', build: { chest: 17, waist: 12.5, arm: 0.98, leg: 0.98 }, prop: { leg: 1.0, torso: 1.05, arm: 1.03, head: 1.02 } },
  nacho:  { skin: '#d6a084', hair: '#8a6444', hairBack: 'mullet', toonBeard: 'stubble', top: '#1d1d21', top2: '#101013', garment: 'tee', sleeve: 'short', pants: '#39404e', shoe: '#e8e4dc', sole: '#8a8578', glove: '#c1121f', accent: '#ff9f1c', build: { chest: 20.5, waist: 11.5, arm: 1.18, leg: 1.03 }, prop: { leg: 1.05, torso: 1.03, arm: 1.1, head: 0.97 } },
  pablo:  { skin: '#cc8e70', hair: '#231c18', hairBack: 'short', toonBeard: 'short', top: '#9a9ca2', top2: '#72747a', garment: 'hoodie', sleeve: 'long', sash: '#d62839', pants: '#23262d', shoe: '#121216', sole: '#3a3d45', wrap: '#2a2d34', accent: '#e63946', build: { chest: 15, waist: 10, arm: 0.9, leg: 0.93 }, prop: { leg: 0.96, torso: 0.95, arm: 0.97, head: 1.03 } },
  robes:  { skin: '#b98470', hair: '#3b2f28', hairBack: 'bun', beard: 'full', eye: '#241509', top: '#1d1d21', top2: '#111114', garment: 'tee', sleeve: 'short', shades: true, tattoo: '#2b3a4a', pants: '#34404f', shoe: '#4a3a2c', sole: '#2a2119', accent: '#95d5b2', build: { chest: 24.5, waist: 19, belly: 1, arm: 1.4, leg: 1.3 }, prop: { leg: 0.91, torso: 1.1, arm: 1.04, head: 0.98, neck: 0.7 } },
  nicole: { skin: '#dcae95', hair: '#c49a62', hairBack: 'long', hairLen: 46, eye: '#3f6e8a', lips: '#b5485d', top: '#bfa28a', top2: '#94796a', garment: 'blouse', sleeve: 'long', necklace: true, pants: '#2f3542', shoe: '#efe9e1', sole: '#a39a8f', accent: '#48cae4', build: { chest: 13.5, waist: 8.8, hips: 12.5, arm: 0.8, leg: 0.88 }, prop: { leg: 1.12, torso: 0.95, arm: 1.0, head: 0.93, neck: 1.15 } },
};

// lo que un personaje lleva en la mano cuando no carga un objeto (el capote del torero)
const HAND_PROPS = {};

// ---------- poses ----------
// Ángulos: 0 = colgando hacia abajo, +π/2 = hacia delante, π = hacia arriba.
// Brazos/piernas: [ángulo del segmento superior, flexión relativa del inferior]
const BASE_POSE = { lean: 0.1, bodyY: 0, bodyX: 0, rot: 0, armF: [0.9, 1.75], armB: [0.55, 1.95], legF: [0.42, -0.62], legB: [-0.38, -0.28], head: 0, face: 'normal', grounded: true, sx: 1, sy: 1, jaw: 0, tail: 0, wing: 0, hat: 0 };
function mkPose(o) { return Object.assign({}, BASE_POSE, o); }
const POSES = {
  idle: mkPose({}),
  crouch: mkPose({ lean: 0.35, armF: [1.1, 1.5], armB: [0.7, 1.7], legF: [1.3, -2.0], legB: [0.5, -1.9], head: 0.1 }),
  jump: mkPose({ grounded: false, lean: 0.05, armF: [1.4, 1.2], armB: [1.0, 1.4], legF: [1.2, -1.8], legB: [0.4, -1.2] }),
  fall: mkPose({ grounded: false, lean: 0.05, armF: [1.6, 0.8], armB: [1.2, 1.0], legF: [0.5, -0.7], legB: [-0.3, -0.4] }),
  land: mkPose({ lean: 0.3, legF: [1.0, -1.6], legB: [0.3, -1.3] }),
  shield: mkPose({ lean: -0.05, armF: [1.2, 2.1], armB: [1.0, 2.2], legF: [0.5, -0.6], legB: [-0.5, -0.3], face: 'angry' }),
  hurt: mkPose({ grounded: false, lean: -0.55, armF: [2.4, 0.6], armB: [2.8, 0.4], legF: [0.7, -0.9], legB: [-0.3, -0.4], face: 'hurt' }),
  dizzy: mkPose({ lean: -0.2, armF: [0.15, 0.3], armB: [-0.1, 0.3], legF: [0.2, -0.2], legB: [-0.2, -0.1], face: 'dizzy' }),
  ledge: mkPose({ grounded: false, lean: 0.15, armF: [3.05, 0.05], armB: [2.95, 0.05], legF: [0.25, -0.4], legB: [-0.05, -0.2] }),
  grab: mkPose({ lean: 0.25, armF: [1.55, 0.1], armB: [1.45, 0.2], legF: [0.5, -0.5], legB: [-0.4, -0.2], face: 'angry' }),
  hold: mkPose({ lean: 0.1, armF: [1.35, 0.5], armB: [1.25, 0.6], legF: [0.45, -0.45], legB: [-0.35, -0.2], face: 'angry' }),
  grabbed: mkPose({ lean: -0.3, armF: [0.3, 0.2], armB: [-0.3, 0.2], legF: [0.1, 0], legB: [-0.1, 0], face: 'hurt', grounded: false }),
  win1: mkPose({ lean: -0.05, armF: [3.0, 0.3], armB: [0.6, 1.9], legF: [0.35, -0.2], legB: [-0.4, -0.1], face: 'happy' }),
  win2: mkPose({ lean: -0.05, armF: [1.3, 2.2], armB: [1.2, 2.3], legF: [0.35, -0.15], legB: [-0.35, -0.1], face: 'happy' }),
  sad: mkPose({ lean: 0.45, head: 0.35, armF: [0.1, 0.1], armB: [0, 0.1], legF: [0.05, 0], legB: [-0.05, 0], face: 'sad' }),
};
// animaciones de ataque: w = preparación, s = golpe
const ANIMS = {
  jab:    { w: { armF: [1.0, 2.0] }, s: { armF: [1.58, 0.02], armB: [0.4, 2.0], lean: 0.25 } },
  jab2:   { w: { armB: [0.8, 2.0] }, s: { armB: [1.6, 0.02], armF: [0.6, 1.9], lean: 0.35 } },
  jab3:   { w: { legF: [1.2, -2.0], lean: -0.05 }, s: { legF: [1.62, -0.05], legB: [-0.25, -0.1], lean: -0.3 } },
  ftilt:  { w: { legF: [1.1, -2.1], lean: -0.2 }, s: { legF: [1.55, 0], legB: [-0.3, -0.15], lean: -0.45 } },
  utilt:  { w: { armF: [0.6, 2.2], lean: 0.25, legF: [0.8, -1.2] }, s: { armF: [3.0, 0.05], lean: -0.15, legF: [0.4, -0.4], face: 'angry' } },
  dtilt:  { w: { lean: 0.5, legF: [1.3, -2.2], legB: [0.6, -2.0] }, s: { lean: 0.45, legF: [1.55, 0], legB: [0.7, -2.3], armF: [1.2, 1.4], armB: [0.8, 1.6] } },
  fsmash: { w: { lean: -0.3, armF: [-0.9, 1.9], armB: [0.9, 1.8], legF: [0.55, -0.7], legB: [-0.5, -0.25], face: 'angry' }, s: { lean: 0.55, armF: [1.6, 0], armB: [-0.4, 1.5], legF: [0.95, -0.7], legB: [-0.85, -0.05], face: 'angry' } },
  usmash: { w: { lean: 0.4, armF: [0.3, 2.2], legF: [1.2, -2.0], legB: [0.6, -1.8] }, s: { lean: -0.15, armF: [3.1, 0], armB: [0.3, 1.5], legF: [0.1, -0.1], legB: [-0.2, -0.1], face: 'angry', bodyY: -10 } },
  dsmash: { w: { lean: 0.3, legF: [1.0, -1.8], legB: [0.3, -1.8] }, s: { lean: 0.35, legF: [1.57, 0], legB: [-1.57, 0], armF: [1.9, 0.6], armB: [1.9, 0.6], bodyY: 8, face: 'angry' } },
  nair:   { w: { legF: [1.2, -1.9], legB: [0.5, -1.5] }, s: { legF: [1.6, -0.1], legB: [-1.2, -0.2], armF: [1.9, 0.3], armB: [-1.7, 0.3] }, spin: 1 },
  fair:   { w: { armF: [3.0, 0.4], armB: [2.8, 0.5], lean: -0.3 }, s: { armF: [1.3, 0.1], armB: [1.1, 0.2], lean: 0.5, face: 'angry' } },
  bair:   { w: { legB: [-0.9, -1.9], lean: 0.25 }, s: { legB: [-1.62, 0], legF: [0.8, -1.6], lean: 0.65, face: 'angry' } },
  uair:   { w: { legF: [1.2, -2.0] }, s: { legF: [2.9, -0.1], legB: [1.0, -1.5] }, flip: -1 },
  dair:   { w: { legF: [1.2, -2.0], legB: [1.1, -2.0], armF: [2.4, 0.6], armB: [2.3, 0.6] }, s: { legF: [0.1, 0], legB: [-0.05, 0], armF: [2.8, 0.3], armB: [2.7, 0.3], face: 'angry' } },
  dash:   { w: { lean: 0.3, legF: [1.2, -1.9] }, s: { lean: -0.4, legF: [1.5, 0], legB: [-0.6, -0.7] } },
  cast:   { w: { armF: [-0.3, 1.9], armB: [-0.5, 1.9], lean: -0.2 }, s: { armF: [1.55, 0.05], armB: [1.5, 0.1], lean: 0.3, face: 'angry' } },
  charge: { w: { armF: [-1.4, 1.9], lean: -0.4, legF: [0.8, -1.2], legB: [-0.6, -0.4], face: 'angry' }, s: { armF: [1.6, 0], armB: [-0.3, 1.5], lean: 0.6, legF: [1.0, -0.6], legB: [-0.9, 0], face: 'angry' } },
  upper:  { w: { armF: [0.4, 2.3], lean: 0.35, legF: [1.1, -1.9] }, s: { armF: [3.1, 0], armB: [0.4, 1.6], legF: [1.2, -1.9], legB: [0.1, -0.3], lean: -0.15, face: 'angry' } },
  spin:   { w: { legF: [1.3, -2.0] }, s: { legF: [1.6, 0], legB: [0.2, -0.6], armF: [2.2, 0.4], armB: [-1.8, 0.5] }, spin: 2 },
  stomp:  { w: { armF: [2.8, 0.4], armB: [2.8, 0.4], legF: [1.2, -2.0], legB: [1.0, -2.0] }, s: { armF: [2.0, 0.3], armB: [2.0, 0.3], legF: [0.35, -0.3], legB: [-0.35, -0.2], face: 'angry' } },
  counter:{ w: { armF: [1.25, 2.1], armB: [1.05, 2.2], lean: -0.15 }, s: { armF: [1.25, 2.1], armB: [1.05, 2.2], lean: -0.15 } },
  slash:  { w: { armF: [2.8, 0.5], lean: -0.1 }, s: { armF: [1.0, 0.15], lean: 0.6, legF: [1.2, -0.7], legB: [-1.0, -0.2], face: 'angry' } },
  shoulder:{ w: { lean: 0.5, armF: [0.5, 2.2] }, s: { lean: 0.75, armF: [1.0, 2.2], armB: [0.4, 1.9], legF: [1.1, -0.9], legB: [-0.9, -0.1], face: 'angry' } },
  throwF: { w: { armF: [1.5, 0.3], armB: [1.4, 0.3] }, s: { armF: [1.7, 0], armB: [1.6, 0], lean: 0.45 } },
  throwB: { w: { armF: [1.5, 0.3], armB: [1.4, 0.3] }, s: { armF: [-1.6, 0], armB: [-1.5, 0.1], lean: -0.45 } },
  throwU: { w: { armF: [1.2, 0.8], armB: [1.1, 0.8], lean: 0.2 }, s: { armF: [3.1, 0], armB: [3.0, 0], lean: -0.1 } },
  throwD: { w: { armF: [2.5, 0.4], armB: [2.5, 0.4] }, s: { armF: [0.9, 0.1], armB: [0.8, 0.1], lean: 0.65 } },
  swing:  { w: { armF: [-1.4, 0.7], armB: [-1.2, 0.8], lean: -0.3 }, s: { armF: [1.5, 0.1], armB: [1.3, 0.3], lean: 0.35, face: 'angry' } },
  item:   { w: { armF: [2.5, 0.8], lean: -0.2 }, s: { armF: [1.4, 0.1], lean: 0.3 } },
  pickup: { w: { lean: 0.8, armF: [0.6, 0.2] }, s: { lean: 0.8, armF: [0.6, 0.2] } },
  final:  { w: { armF: [2.6, 0.6], armB: [2.6, 0.6], face: 'angry' }, s: { armF: [3.0, 0], armB: [3.0, 0], face: 'angry' } },
};
function blendPose(a, b, t) {
  const o = {};
  for (const k in b) if (!(k in a) && typeof b[k] === 'number') o[k] = lerp(k === 'sx' || k === 'sy' ? 1 : 0, b[k], t);
  for (const k in a) {
    const va = a[k], vb = b[k] !== undefined ? b[k] : va;
    if (Array.isArray(va)) o[k] = [lerp(va[0], vb[0], t), lerp(va[1], vb[1], t)];
    else if (typeof va === 'number') o[k] = lerp(va, vb, t);
    else o[k] = t < 0.5 ? va : vb;
  }
  return o;
}
// guard = brazos en guardia (caminar); sin guardia = brazos balanceándose (correr)
function walkPose(phase, amp, lean, guard) {
  const s = Math.sin(phase), s2 = Math.sin(phase + Math.PI);
  const p = mkPose({
    lean,
    legF: [amp * s + 0.1, -0.3 - amp * 1.1 * Math.max(0, Math.cos(phase))],
    legB: [amp * s2 + 0.1, -0.3 - amp * 1.1 * Math.max(0, Math.cos(phase + Math.PI))],
    bodyY: -Math.abs(Math.cos(phase)) * 2.5 * amp,
  });
  if (!guard) { p.armF = [-amp * 0.9 * s + 0.3, 1.7]; p.armB = [-amp * 0.9 * s2 + 0.3, 1.7]; }
  else { p.armF = [0.9 + s * 0.06, 1.75]; p.armB = [0.55 - s * 0.06, 1.95]; }
  return p;
}

// ---------- esqueleto ----------
// proporciones atléticas: piernas y torso largos, cabeza a escala (antes era casi 1:4)
const SK_BASE = { thigh: 27, shin: 26, torso: 37, upper: 21, fore: 20, neck: 7.5, headRX: 10.8, headRY: 14 };
let SK = SK_BASE; // esqueleto del personaje que se está dibujando o animando (cada persona tiene el suyo)
let DRAW_POSE = null, DRAW_OPT = {}; // la pose que se está dibujando (mandíbula, cola, alas…)
function skOf(id) {
  const L = LOOKS[id]; if (!L) return SK_BASE;
  if (!L.K) {
    const p = Object.assign({ leg: 1, torso: 1, arm: 1, head: 1, neck: 1 }, L.prop || {});
    L.K = { thigh: SK_BASE.thigh * p.leg, shin: SK_BASE.shin * p.leg, torso: SK_BASE.torso * p.torso, upper: SK_BASE.upper * p.arm, fore: SK_BASE.fore * p.arm,
      neck: SK_BASE.neck * p.neck, headRX: SK_BASE.headRX * p.head, headRY: SK_BASE.headRY * p.head };
    // altura de cadera+torso respecto al esqueleto con el que se diseñaron los golpes (47 + 34)
    L.K.bodyK = (L.K.thigh + L.K.shin + L.K.torso) / 81;
    // cuánto cuelga de la orilla: manos arriba sobre el borde
    L.K.hang = L.K.thigh + L.K.shin + L.K.torso * 0.989 - 4 + L.K.upper * 0.996 + L.K.fore * 0.998 + 5 - 20.5;
  }
  return L.K;
}
function useSK(id) { SK = skOf(id); return SK; }
let OUTW = 1.05; // grosor del contorno (más grueso solo cuando destella)
const dirv = a => [Math.sin(a), Math.cos(a)];
function legReach(l) { const [, y1] = dirv(l[0]), [, y2] = dirv(l[0] + l[1]); return y1 * SK.thigh + y2 * SK.shin; }

// Silueta de un segmento con bíceps/pantorrilla (ancho inicio, medio, final)
function segPath(c, x0, y0, x1, y1, w0, wm, w1, pad = 0) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const a0 = w0 / 2 + pad, am = wm / 2 + pad, a1 = w1 / 2 + pad;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  c.beginPath();
  c.moveTo(x0 + nx * a0, y0 + ny * a0);
  c.quadraticCurveTo(mx + nx * am * 1.18, my + ny * am * 1.18, x1 + nx * a1, y1 + ny * a1);
  c.arc(x1, y1, a1, Math.atan2(ny, nx), Math.atan2(-ny, -nx), true);
  c.quadraticCurveTo(mx - nx * am * 1.18, my - ny * am * 1.18, x0 - nx * a0, y0 - ny * a0);
  c.arc(x0, y0, a0, Math.atan2(-ny, -nx), Math.atan2(ny, nx), true);
  c.closePath();
}
// Relleno opaco con degradado transversal: claro hacia la luz (delante-arriba), oscuro detrás
function segFill(c, x0, y0, x1, y1, w0, wm, w1, col) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  let nx = -dy / L, ny = dx / L;
  if (nx * 0.6 - ny * 0.8 < 0) { nx = -nx; ny = -ny; } // n apunta hacia la luz
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, h = Math.max(w0, wm) * 0.62;
  const g = c.createLinearGradient(mx - nx * h, my - ny * h, mx + nx * h, my + ny * h);
  g.addColorStop(0, shade(col, -0.5)); g.addColorStop(0.3, shade(col, -0.14)); g.addColorStop(0.62, col); g.addColorStop(0.86, shade(col, 0.14)); g.addColorStop(1, shade(col, 0.05));
  segPath(c, x0, y0, x1, y1, w0, wm, w1); c.fillStyle = g; c.fill();
}
function segOutline(c, x0, y0, x1, y1, w0, wm, w1, OUT) { segPath(c, x0, y0, x1, y1, w0, wm, w1, OUTW); c.fillStyle = OUT; c.fill(); }

function limbPoints(x, y, a1, a2, l1, l2) {
  const [d1x, d1y] = dirv(a1), [d2x, d2y] = dirv(a1 + a2);
  const ex = x + d1x * l1, ey = y + d1y * l1;
  return { ex, ey, fx: ex + d2x * l2, fy: ey + d2y * l2, a: a1 + a2 };
}

function drawArm(c, L, B, sx, sy, ang, back, OUT) {
  const k = B.arm, p = limbPoints(sx, sy, ang[0], ang[1], SK.upper, SK.fore);
  const dk = back ? -0.28 : 0;
  const skin = shade(L.skin, dk), top = shade(L.top, dk);
  const upCol = L.sleeve === 'none' ? skin : (L.sleeve === 'short' ? skin : top);
  const foreCol = L.sleeve === 'long' ? top : skin;
  const U = [11 * k, 11.5 * k, 8.5 * k], F = [8.5 * k, 9 * k, 7 * k];
  if (!back) {
    // sombra suave que el brazo proyecta sobre el cuerpo
    c.save(); c.translate(-2.5, 2.5); c.fillStyle = 'rgba(10,8,20,.2)';
    segPath(c, sx, sy, p.ex, p.ey, ...U, 1); c.fill(); segPath(c, p.ex, p.ey, p.fx, p.fy, ...F, 1); c.fill();
    c.restore();
  }
  segOutline(c, sx, sy, p.ex, p.ey, ...U, OUT); segOutline(c, p.ex, p.ey, p.fx, p.fy, ...F, OUT);
  segFill(c, p.ex, p.ey, p.fx, p.fy, ...F, foreCol);
  segFill(c, sx, sy, p.ex, p.ey, ...U, upCol);
  if (L.sleeve === 'short') { const mx = lerp(sx, p.ex, 0.55), my = lerp(sy, p.ey, 0.55); segFill(c, sx, sy, mx, my, U[0] + 2, U[1] + 2, U[1] + 1.5, top); }
  if (L.tattoo && L.sleeve !== 'long') {
    // tatuajes: trazos finos a lo largo del antebrazo
    c.save(); c.strokeStyle = withAlpha(shade(L.tattoo, dk), 0.75); c.lineWidth = 1.3; c.lineCap = 'round';
    const [ux, uy] = [p.fx - p.ex, p.fy - p.ey], ln = Math.hypot(ux, uy) || 1, nx = -uy / ln, ny = ux / ln;
    for (const t of [0.25, 0.45, 0.65]) { const mx = lerp(p.ex, p.fx, t), my = lerp(p.ey, p.fy, t); c.beginPath(); c.moveTo(mx - nx * 3, my - ny * 3); c.quadraticCurveTo(mx + ux / ln * 3, my + uy / ln * 3, mx + nx * 3, my + ny * 3); c.stroke(); }
    c.restore();
  }
  const wrapCol = L.wrap && !L.glove ? shade(L.wrap, dk) : null;
  if (wrapCol) { const wx = lerp(p.ex, p.fx, 0.62), wy = lerp(p.ey, p.fy, 0.62); segFill(c, wx, wy, p.fx, p.fy, F[1] + 0.5, F[1] + 0.5, F[2] + 1, wrapCol); }
  // puño (o garra / manita según el cuerpo)
  const fistCol = L.glove ? shade(L.glove, dk) : wrapCol || skin;
  const [dx, dy] = dirv(p.a);
  if (L.hand && typeof drawHand2 === 'function') { drawHand2(c, L, p.fx, p.fy, p.a, k, fistCol, OUT, back); return [p.fx + dx * 5, p.fy + dy * 5, p.a]; }
  c.save(); c.translate(p.fx + dx * 3, p.fy + dy * 3); c.rotate(Math.atan2(dy, dx));
  const fw = (L.glove ? 13 : 10.5) * k, fh = (L.glove ? 12 : 9.5) * k;
  roundRect(c, -fw / 2 - OUTW, -fh / 2 - OUTW, fw + OUTW * 2, fh + OUTW * 2, 4); c.fillStyle = OUT; c.fill();
  const fg = c.createLinearGradient(0, -fh / 2, 0, fh / 2);
  fg.addColorStop(0, shade(fistCol, 0.16)); fg.addColorStop(0.55, fistCol); fg.addColorStop(1, shade(fistCol, -0.35));
  roundRect(c, -fw / 2, -fh / 2, fw, fh, 3.5); c.fillStyle = fg; c.fill();
  // nudillos y pulgar
  c.strokeStyle = withAlpha(shade(fistCol, -0.5), 0.55); c.lineWidth = 0.8;
  for (let i = 1; i < 4; i++) { const yy = -fh / 2 + fh * i / 4; c.beginPath(); c.moveTo(fw * 0.18, yy); c.lineTo(fw / 2 - 0.6, yy); c.stroke(); }
  c.fillStyle = shade(fistCol, -0.12); c.beginPath(); c.ellipse(-fw * 0.05, fh * 0.42, fw * 0.32, fh * 0.2, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(-fw / 2 + 1.5, -fh / 2 + 1, fw - 3, 1.2);
  if (L.glove) { c.fillStyle = shade(L.glove, -0.4); c.fillRect(-fw / 2 - 2, -fh / 2 - 0.5, 3.4, fh + 1); }
  c.restore();
  return [p.fx + dx * 5, p.fy + dy * 5, p.a];
}

function drawLeg(c, L, B, hx, hy, ang, back, OUT) {
  const k = B.leg, p = limbPoints(hx, hy, ang[0], ang[1], SK.thigh, SK.shin);
  const dk = back ? -0.28 : 0, pants = shade(L.legCol || L.pants, dk);
  const T = [17.5 * k, 16 * k, 11.5 * k], S = [11.5 * k, 12.5 * k, 8 * k];
  segOutline(c, hx, hy, p.ex, p.ey, ...T, OUT); segOutline(c, p.ex, p.ey, p.fx, p.fy, ...S, OUT);
  segFill(c, p.ex, p.ey, p.fx, p.fy, ...S, pants);
  segFill(c, hx, hy, p.ex, p.ey, ...T, pants);
  if (typeof legExtras === 'function' && (L.trunks || L.bootH || L.studs || L.scales)) legExtras(c, L, hx, hy, p, T, S, dk);
  // pliegues de tela en la rodilla y costura lateral
  const bend = Math.abs(ang[1]);
  c.save(); c.lineCap = 'round';
  c.strokeStyle = withAlpha(shade(pants, -0.55), clamp(0.2 + bend * 0.25, 0, 0.6)); c.lineWidth = 0.9;
  const kx = p.ex, ky = p.ey, ux = p.fx - p.ex, uy = p.fy - p.ey, ul = Math.hypot(ux, uy) || 1, nx = -uy / ul, ny = ux / ul;
  for (let i = -1; i <= 1; i++) { const ox = kx + ux / ul * (i * 3 + 2), oy = ky + uy / ul * (i * 3 + 2); c.beginPath(); c.moveTo(ox - nx * 4, oy - ny * 4); c.quadraticCurveTo(ox + ux / ul * 2, oy + uy / ul * 2, ox + nx * 3.5, oy + ny * 3.5); c.stroke(); }
  c.strokeStyle = withAlpha(shade(pants, 0.25), 0.28); c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(hx + nx * 2, hy + ny * 2); c.lineTo(kx + nx * 2, ky + ny * 2); c.lineTo(p.fx + nx * 2, p.fy + ny * 2); c.stroke();
  c.restore();
  // tenis: puntera, suela blanca, franja de color y agujetas
  const fa = p.a + Math.PI / 2, [fx, fy] = dirv(fa);
  if (L.feet && typeof drawFoot2 === 'function') { drawFoot2(c, L, p.fx, p.fy, Math.atan2(fy, fx), k, dk, OUT); return; }
  c.save(); c.translate(p.fx, p.fy); c.rotate(Math.atan2(fy, fx));
  const sw = 19 * k, sh = 9 * k, shoe = shade(L.shoe, dk), sole = shade(L.sole, dk);
  c.beginPath(); c.moveTo(-6 - OUTW, sh / 2 + OUTW); c.lineTo(-6 - OUTW, -sh / 2 + 2); c.quadraticCurveTo(-5, -sh / 2 - OUTW - 1, 2, -sh / 2 - OUTW); c.quadraticCurveTo(sw - 2, -sh / 2 + 1, sw - 6 + OUTW + 1.5, sh / 2 + OUTW); c.closePath(); c.fillStyle = OUT; c.fill();
  const sg = c.createLinearGradient(0, -sh / 2, 0, sh / 2); sg.addColorStop(0, shade(shoe, 0.22)); sg.addColorStop(0.6, shoe); sg.addColorStop(1, shade(shoe, -0.3));
  c.beginPath(); c.moveTo(-6, sh / 2); c.lineTo(-6, -sh / 2 + 2.5); c.quadraticCurveTo(-5, -sh / 2, 2, -sh / 2); c.quadraticCurveTo(sw - 3, -sh / 2 + 2, sw - 6, sh / 2); c.closePath(); c.fillStyle = sg; c.fill();
  c.fillStyle = sole; c.fillRect(-6, sh / 2 - 2.8, sw - 0.5, 2.8);
  c.fillStyle = 'rgba(0,0,0,.25)'; for (let xx = -4; xx < sw - 7; xx += 3) c.fillRect(xx, sh / 2 - 0.9, 1.4, 0.9);
  c.strokeStyle = withAlpha(L.accent || '#ffffff', 0.85); c.lineWidth = 1.2; c.beginPath(); c.moveTo(-3, sh * 0.15); c.quadraticCurveTo(3, sh * 0.35, 9, -sh * 0.1); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 0.7; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(1 + i * 2.2, -sh / 2 + 0.6); c.lineTo(2.6 + i * 2.2, -sh / 2 + 2.6); c.stroke(); }
  c.restore();
}

function drawTorso(c, id, L, B, OUT) {
  const cw = B.chest, ww = B.waist, T = SK.torso;
  // cadera / cintura del pantalón
  const hw = B.hips || ww;
  roundRect(c, -hw - 1 - OUTW, -6 - OUTW, hw * 2 + 2 + OUTW * 2, 13 + OUTW * 2, 6); c.fillStyle = OUT; c.fill();
  roundRect(c, -hw - 1, -6, hw * 2 + 2, 13, 5); c.fillStyle = L.pants; c.fill();
  const bel = B.belly ? 9 : 1; // barriga del peso pesado: el frente del tronco se abomba
  // tronco en V
  const path = pad => {
    c.beginPath();
    c.moveTo(-ww - pad, 2);
    c.quadraticCurveTo(-ww - 1 - pad, -T * 0.45, -cw - pad, -T * 0.78);
    c.quadraticCurveTo(-cw - pad, -T - 1 - pad, -cw * 0.45, -T - 2 - pad);
    c.lineTo(cw * 0.45, -T - 2 - pad);
    c.quadraticCurveTo(cw + pad, -T - 1 - pad, cw + pad, -T * 0.78);
    c.quadraticCurveTo(ww + bel + pad, -T * (B.belly ? 0.28 : 0.45), ww + pad, 2);
    c.closePath();
  };
  path(OUTW); c.fillStyle = OUT; c.fill();
  path(0);
  const g = c.createLinearGradient(-cw, 0, cw, 0);
  g.addColorStop(0, L.top2); g.addColorStop(0.55, L.top); g.addColorStop(1, shade(L.top, 0.12));
  c.fillStyle = g; c.fill();
  c.save(); path(0); c.clip();
  // sombra inferior (volumen)
  const g2 = c.createLinearGradient(0, -T, 0, 2);
  g2.addColorStop(0, 'rgba(255,255,255,.08)'); g2.addColorStop(0.6, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,.25)');
  c.fillStyle = g2; c.fillRect(-cw - 2, -T - 4, cw * 2 + 4, T + 8);
  // pliegues: cintura y bajo la axila (la tela no es plana)
  c.strokeStyle = withAlpha(shade(L.top, -0.6), 0.32); c.lineWidth = 0.9; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-ww * 0.6, -3); c.quadraticCurveTo(-ww * 0.1, -6, ww * 0.3, -3.5); c.moveTo(-ww * 0.2, -7); c.quadraticCurveTo(ww * 0.25, -9.5, ww * 0.75, -6);
  c.moveTo(cw * 0.55, -T * 0.72); c.quadraticCurveTo(cw * 0.35, -T * 0.55, cw * 0.5, -T * 0.4); c.stroke();
  c.strokeStyle = withAlpha(shade(L.top, 0.5), 0.14); c.beginPath(); c.moveTo(-cw * 0.2, -T * 0.9); c.quadraticCurveTo(0, -T * 0.8, cw * 0.3, -T * 0.9); c.stroke();
  switch (L.garment) {
    case 'tee':
      // pecho y abdomen marcados bajo la camiseta
      c.strokeStyle = 'rgba(255,255,255,.1)'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(-cw * 0.7, -T * 0.62); c.quadraticCurveTo(0, -T * 0.5, cw * 0.75, -T * 0.64); c.stroke();
      c.beginPath(); c.moveTo(cw * 0.1, -T * 0.55); c.lineTo(cw * 0.1, -T * 0.1); c.stroke();
      c.fillStyle = shade(L.skin, -0.05); c.beginPath(); c.moveTo(-4, -T - 2); c.quadraticCurveTo(1, -T + 5, 6, -T - 2); c.fill();
      if (L.shades) {
        // lentes de sol colgados del cuello de la playera
        c.fillStyle = '#0b0b0e'; c.strokeStyle = '#6b5a48'; c.lineWidth = 1;
        for (const dx of [-1.5, 6.5]) { c.beginPath(); c.ellipse(dx, -T + 7, 3.4, 2.6, 0.1, 0, TAU); c.fill(); c.stroke(); }
        c.beginPath(); c.moveTo(1.9, -T + 6.5); c.lineTo(3.1, -T + 6.5); c.stroke();
        c.strokeStyle = '#8a7157'; c.beginPath(); c.moveTo(2.5, -T + 4); c.lineTo(2.5, -T + 9); c.stroke();
      }
      break;
    case 'blouse': {
      // blusa de satín: brillo, cuello en V con solapas, botones y collar
      const sg = c.createLinearGradient(-cw, -T, cw, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.55, 'rgba(255,255,255,.18)'); sg.addColorStop(0.7, 'rgba(255,255,255,0)');
      c.fillStyle = sg; c.fillRect(-cw - 2, -T - 4, cw * 2 + 4, T + 8);
      c.fillStyle = shade(L.skin, -0.04); c.beginPath(); c.moveTo(-3, -T - 2); c.lineTo(9, -T - 2); c.lineTo(4, -T * 0.6); c.closePath(); c.fill();
      c.fillStyle = shade(L.top, 0.12); c.strokeStyle = shade(L.top, -0.35); c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-3, -T - 2); c.lineTo(4, -T * 0.6); c.lineTo(-6, -T * 0.78); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(9, -T - 2); c.lineTo(4, -T * 0.6); c.lineTo(13, -T * 0.8); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = shade(L.top, 0.3); for (const yy of [-T * 0.48, -T * 0.26, -T * 0.05]) { c.beginPath(); c.arc(4.5, yy, 1.3, 0, TAU); c.fill(); }
      if (L.necklace) { c.strokeStyle = 'rgba(241,245,249,.8)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-1, -T - 1); c.quadraticCurveTo(3, -T * 0.8, 7, -T - 1); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(3, -T * 0.83, 1.4, 0, TAU); c.fill(); }
      break;
    }
    case 'fleece': {
      c.fillStyle = L.inner; c.beginPath(); c.moveTo(-1, -T - 2); c.lineTo(9, -T - 2); c.lineTo(5, -T * 0.55); c.closePath(); c.fill();
      c.strokeStyle = L.pattern; c.lineWidth = 1.8; c.globalAlpha = 0.75;
      for (const yy of [-T * 0.72, -T * 0.42, -T * 0.14]) { c.beginPath(); let k2 = 0; for (let x = -cw; x <= cw + 4; x += 4.5) c.lineTo(x, yy + ((k2++ % 2) ? -2.8 : 2.8)); c.stroke(); }
      c.globalAlpha = 1;
      c.strokeStyle = shade(L.top, -0.45); c.lineWidth = 1.6; c.beginPath(); c.moveTo(5, -T * 0.55); c.lineTo(3.5, 2); c.stroke();
      c.fillStyle = L.top2; c.fillRect(-cw * 0.45, -T - 3, cw * 0.5, 4);
      break;
    }
    case 'hoodie':
      c.fillStyle = 'rgba(0,0,0,.18)'; roundRect(c, -ww * 0.3, -T * 0.42, ww * 1.4, T * 0.3, 5); c.fill();
      c.strokeStyle = '#e8e8ea'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(3, -T); c.lineTo(3.5, -T * 0.72); c.moveTo(7, -T); c.lineTo(8, -T * 0.74); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 26; i++) c.fillRect(-cw + ((i * 7.3) % (cw * 2)), -T + ((i * 5.1) % T), 1.4, 1.4);
      break;
    case 'jacket':
      c.fillStyle = L.inner; c.beginPath(); c.moveTo(-3, -T - 2); c.lineTo(9, -T - 2); c.lineTo(7, 2); c.lineTo(-1, 2); c.closePath(); c.fill();
      c.strokeStyle = shade(L.top, -0.4); c.lineWidth = 1.6; c.beginPath(); c.moveTo(-3, -T - 2); c.lineTo(-1, 2); c.moveTo(9, -T - 2); c.lineTo(7, 2); c.stroke();
      if (L.scarf) { c.fillStyle = L.scarf; roundRect(c, -cw * 0.55, -T - 4, cw * 1.25, 8, 4); c.fill(); c.fillRect(cw * 0.35, -T + 2, 5, 13); }
      break;
    default: drawGarment2(c, L, cw, ww, T);
  }
  c.restore();
  if (L.sash) { c.fillStyle = OUT; c.fillRect(-ww - 2, -4.5, ww * 2 + 4, 7); c.fillStyle = L.sash; c.fillRect(-ww - 1, -3.6, ww * 2 + 2, 5.2); c.fillRect(-ww - 5, -2, 6, 12); }
}

// Dibuja un personaje con los pies en (0,0) mirando a la derecha.
// opt.flip: el lienzo está espejado (mira a la izquierda) → la foto se des-espeja.
function drawCharacter(c, id, pose, opt = {}) {
  useSK(id);
  const L = LOOKS[id], B = L.build;
  const OUT = opt.outline || 'rgba(8,10,16,.92)';
  OUTW = opt.outline && opt.outline !== '#10131a' ? 1.9 : 1.05;
  c.save();
  if (pose.bodyX) c.translate(pose.bodyX, 0);
  if (pose.rot) { const pv = pose.pivot || -56; c.translate(0, pv); c.rotate(pose.rot); c.translate(0, -pv); }
  if (pose.sx !== 1 || pose.sy !== 1) c.scale(pose.sx || 1, pose.sy || 1);
  let hipY = -(SK.thigh + SK.shin);
  if (pose.grounded) hipY = -Math.max(legReach(pose.legF), legReach(pose.legB), 10);
  hipY += pose.bodyY || 0;
  const hx = 0, hy = hipY;
  const [tdx, tdy] = dirv(Math.PI - pose.lean);
  const sx = hx + tdx * SK.torso, sy = hy + tdy * SK.torso;
  const cw = B.chest;
  // capucha / pelo largo detrás
  const hdx = sx + Math.sin(pose.lean) * (SK.neck + SK.headRY * 0.8), hdy = sy - Math.cos(pose.lean) * (SK.neck + SK.headRY * 0.8);
  if (L.garment === 'hoodie') { c.fillStyle = OUT; c.beginPath(); c.ellipse(sx - 9, sy + 2, 12, 9, -0.4, 0, TAU); c.fill(); c.fillStyle = L.top2; c.beginPath(); c.ellipse(sx - 9, sy + 2, 10.5, 7.5, -0.4, 0, TAU); c.fill(); }
  drawHairBack(c, id, L, hdx, hdy, pose, OUT);
  DRAW_POSE = pose; DRAW_OPT = opt;
  if (L.tail) drawTail(c, L, hx, hy, pose, OUT);
  if (L.back && typeof drawBack2 === 'function') drawBack2(c, L, pose, hx, hy, sx, sy, OUT, opt);
  // brazo trasero
  drawArm(c, L, B, sx - cw * 0.35 * Math.cos(pose.lean), sy + 4, pose.armB, true, OUT);
  // piernas
  drawLeg(c, L, B, hx - 4, hy, pose.legB, true, OUT);
  drawLeg(c, L, B, hx + 4, hy, pose.legF, false, OUT);
  const onHand = opt.onHand !== undefined ? opt.onHand : HAND_PROPS[id] ? (cc, x, y, a) => HAND_PROPS[id](cc, null, x, y, a, OUT) : null;
  if (L.plan && typeof drawBodyPlan === 'function') {
    // cuerpo de una pieza (el chile): tronco y cabeza son lo mismo
    drawBodyPlan(c, id, L, pose, hx, hy, OUT, opt);
    const hand = drawArm(c, L, B, sx + cw * 0.3 * Math.cos(pose.lean), sy + 4, pose.armF, false, OUT);
    if (onHand) onHand(c, hand[0], hand[1], hand[2]);
    c.restore();
    return { hand, head: [hdx, hdy] };
  }
  // tronco
  c.save(); c.translate(hx, hy); c.rotate(pose.lean); drawTorso(c, id, L, B, OUT); c.restore();
  // cuello
  c.save(); c.translate(sx, sy); c.rotate(pose.lean);
  const nw = (L.neckW || 8) / 2;
  roundRect(c, -nw - OUTW, -SK.neck - 6 - OUTW, nw * 2 + OUTW * 2, SK.neck + 7 + OUTW * 2, 4); c.fillStyle = OUT; c.fill();
  const ng = c.createLinearGradient(-nw, 0, nw, 0); ng.addColorStop(0, shade(L.skin, -0.32)); ng.addColorStop(0.6, shade(L.skin, -0.1)); ng.addColorStop(1, shade(L.skin, -0.02));
  roundRect(c, -nw, -SK.neck - 6, nw * 2, SK.neck + 7, 3); c.fillStyle = ng; c.fill();
  // sombra que proyecta la barbilla
  c.fillStyle = 'rgba(30,14,10,.35)'; c.beginPath(); c.ellipse(1, -SK.neck - 4, 5, 3.2, 0, 0, TAU); c.fill();
  c.restore();
  // cabeza
  c.save(); c.translate(hdx, hdy); c.rotate(pose.head * 0.5 + pose.lean * 0.25);
  if (opt.headScale && opt.headScale !== 1) { c.translate(0, -SK.headRY * (opt.headScale - 1) * 0.85); c.scale(opt.headScale, opt.headScale); }
  drawHead(c, id, pose.face, Object.assign({ outline: OUT }, opt));
  c.restore();
  // brazo delantero
  const hand = drawArm(c, L, B, sx + cw * 0.3 * Math.cos(pose.lean), sy + 4, pose.armF, false, OUT);
  if (onHand) onHand(c, hand[0], hand[1], hand[2]);
  c.restore();
  return { hand, head: [hdx, hdy] };
}

function drawHairBack(c, id, L, x, y, pose, OUT) {
  if (!L.hairBack && L.style !== 'ponytail') return; // también sin foto: la cara dibujada lleva su pelo
  c.save(); c.translate(x, y); c.rotate(pose.lean * 0.25);
  if (L.hairBack === 'long') {
    const sw = Math.sin(performance.now() / 400) * 1.5, len = L.hairLen || 30, k = len / 30;
    if (FACE_IMG[id]) { c.fillStyle = OUT; c.beginPath(); c.ellipse(-3, 8 * k, 17.5, 23 * k, 0.08, 0, TAU); c.fill(); }
    c.fillStyle = L.hair; c.beginPath(); c.moveTo(-17, -4); c.quadraticCurveTo(-21 + sw, len * 0.75, -11, len); c.lineTo(9, len); c.quadraticCurveTo(17, len * 0.6, 14, -4); c.quadraticCurveTo(0, -20, -17, -4); c.fill();
    if (!FACE_IMG[id]) { c.strokeStyle = OUT; c.lineWidth = 1.6; c.stroke(); } // cara dibujada: contorno fino en vez de la sombra detrás de la foto
    c.strokeStyle = shade(L.hair, 0.2); c.lineWidth = 1; for (let i = -12; i < 12; i += 5) { c.beginPath(); c.moveTo(i, 0); c.quadraticCurveTo(i - 2 + sw, len * 0.55, i - 1, len - 2); c.stroke(); }
    c.strokeStyle = shade(L.hair, -0.18); c.beginPath(); c.moveTo(-4, 4); c.quadraticCurveTo(-7 + sw, len * 0.6, -5, len - 3); c.stroke();
  } else if (L.hairBack === 'bun') {
    c.fillStyle = OUT; c.beginPath(); c.ellipse(-11, -12, 7.5, 6.5, -0.5, 0, TAU); c.fill();
    c.fillStyle = L.hair; c.beginPath(); c.ellipse(-11, -12, 6, 5, -0.5, 0, TAU); c.fill();
    c.strokeStyle = shade(L.hair, 0.25); c.lineWidth = 1; c.beginPath(); c.arc(-11, -12, 3, 0.3, 2.6); c.stroke();
  } else if (L.hairBack === 'mullet') {
    c.fillStyle = OUT; c.beginPath(); c.ellipse(-4, 14, 12.5, 17, 0.12, 0, TAU); c.fill();
    c.fillStyle = L.hair; c.beginPath(); c.moveTo(-14, 0); c.quadraticCurveTo(-16, 22, -8, 28); c.lineTo(4, 26); c.quadraticCurveTo(9, 14, 8, 0); c.closePath(); c.fill();
  } else if (L.style === 'ponytail') {
    const sw = Math.sin(performance.now() / 300) * 2;
    c.fillStyle = OUT; c.beginPath(); c.ellipse(-15 + sw * 0.3, 6, 6.5, 15, 0.45, 0, TAU); c.fill();
    c.fillStyle = L.hair; c.beginPath(); c.ellipse(-15 + sw * 0.3, 6, 5, 13.5, 0.45, 0, TAU); c.fill();
  }
  c.restore();
}

// ---------- cabezas ----------
function drawHead(c, id, face = 'normal', opt = {}) {
  useSK(id);
  const L = LOOKS[id], OUT = opt.outline || 'rgba(8,10,16,.92)';
  if (L.species) return drawCreatureHead(c, L, face, OUT);
  const img = FACE_IMG[id];
  if (img) {
    const d = FACE_DATA[id];
    const w = SK.headRX * 2.25 * d.scale, h = w * d.hh / d.hw;
    c.save();
    if (opt.flip) c.scale(-1, 1);
    c.drawImage((face === 'hurt' || face === 'ko') && FACE_HURT[id] ? FACE_HURT[id] : img, -w / 2, -h / 2 - 1, w, h);
    c.restore();
    if (L.headwear && typeof drawHeadwear === 'function') drawHeadwear(c, id, L, OUT, true);
    return;
  }
  drawToonHead(c, id, L, face, OUT);
  if (L.headwear && typeof drawHeadwear === 'function') drawHeadwear(c, id, L, OUT, false);
}
function drawToonHead(c, id, L, face, OUT, clipInside) {
  const RX = SK.headRX, RY = SK.headRY;
  // oreja (lado trasero)
  c.fillStyle = OUT; c.beginPath(); c.ellipse(-RX * 0.62, RY * 0.05, 4.2, 5.6, 0, 0, TAU); c.fill();
  c.fillStyle = shade(L.skin, -0.12); c.beginPath(); c.ellipse(-RX * 0.62, RY * 0.05, 3, 4.4, 0, 0, TAU); c.fill();
  // cráneo + mandíbula
  const headPath = pad => {
    c.beginPath();
    c.moveTo(0, -RY - pad);
    c.bezierCurveTo(RX * 0.95 + pad, -RY - pad, RX + pad, -RY * 0.2, RX * 0.92 + pad, RY * 0.25);
    c.quadraticCurveTo(RX * 0.8 + pad, RY * 0.8 + pad, RX * 0.15, RY + pad);
    c.quadraticCurveTo(-RX * 0.6, RY * 0.95 + pad, -RX * 0.85 - pad, RY * 0.3);
    c.bezierCurveTo(-RX - pad, -RY * 0.3, -RX * 0.8 - pad, -RY - pad, 0, -RY - pad);
    c.closePath();
  };
  headPath(OUTW); c.fillStyle = OUT; c.fill();
  headPath(0);
  const g = c.createLinearGradient(-RX, 0, RX, 0);
  g.addColorStop(0, shade(L.skin, -0.18)); g.addColorStop(0.65, L.skin); g.addColorStop(1, shade(L.skin, 0.08));
  c.fillStyle = g; c.fill();
  if (clipInside) { c.save(); headPath(0); c.clip(); clipInside(c, RX, RY); c.restore(); }
  // barba
  const beard = L.beard || (!FACE_IMG[id] && L.toonBeard);
  if (beard === 'short' || beard === 'stubble') {
    c.save(); headPath(0); c.clip();
    c.fillStyle = beard === 'short' ? shade(L.hair, 0.05) : withAlpha(shade(L.hair, 0.1), 0.45);
    c.beginPath(); c.moveTo(-RX * 0.55, RY * 0.12); c.quadraticCurveTo(-RX * 0.1, RY * 0.4, RX * 0.12, RY * 0.36); c.quadraticCurveTo(RX * 0.6, RY * 0.34, RX * 1.05, RY * 0.2); c.lineTo(RX, RY * 1.2); c.lineTo(-RX * 0.6, RY * 1.2); c.closePath(); c.fill();
    if (beard === 'short') { c.fillStyle = shade(L.skin, -0.05); c.beginPath(); c.ellipse(RX * 0.32, RY * 0.56, 4.2, 2.4, 0, 0, TAU); c.fill(); } // la boca se asoma
    c.restore();
  }
  if (beard === 'full') {
    c.save(); headPath(0); c.clip();
    c.fillStyle = shade(L.hair, 0.08);
    c.beginPath(); c.moveTo(-RX, RY * 0.05); c.quadraticCurveTo(-RX * 0.2, RY * 0.35, RX * 0.15, RY * 0.32); c.quadraticCurveTo(RX * 0.7, RY * 0.3, RX * 1.1, RY * 0.12); c.lineTo(RX, RY * 1.2); c.lineTo(-RX, RY * 1.2); c.closePath(); c.fill();
    c.restore();
  }
  // rasgos (vista 3/4 hacia la derecha)
  const ey = -RY * 0.08, e1 = RX * 0.05, e2 = RX * 0.6;
  const squint = face === 'angry' || face === 'hurt' ? 0.55 : face === 'happy' ? 0.5 : 1;
  if (face === 'ko' || face === 'dizzy') {
    c.strokeStyle = '#2a1a14'; c.lineWidth = 1.6;
    for (const ex of [e1, e2]) { c.beginPath(); c.moveTo(ex - 2.5, ey); c.lineTo(ex + 2.5, ey); c.stroke(); }
  } else for (const ex of [e1, e2]) {
    c.fillStyle = '#f4efe8'; c.beginPath(); c.ellipse(ex, ey, 2.9, 1.9 * squint, 0, 0, TAU); c.fill();
    c.fillStyle = L.eye || '#2b1a10'; c.beginPath(); c.arc(ex + 0.8, ey, 1.4 * Math.max(0.7, squint), 0, TAU); c.fill();
    c.strokeStyle = 'rgba(20,10,8,.7)'; c.lineWidth = 0.9; c.beginPath(); c.ellipse(ex, ey, 2.9, 1.9 * squint, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  }
  const bro = face === 'angry' ? 1.6 : face === 'hurt' || face === 'sad' ? -1.4 : 0;
  c.strokeStyle = shade(L.hair, -0.1); c.lineWidth = 1.9; c.lineCap = 'round';
  c.beginPath(); c.moveTo(e1 - 3, ey - 4 - bro * 0.2); c.lineTo(e1 + 3, ey - 4 + bro); c.moveTo(e2 - 3, ey - 4 + bro); c.lineTo(e2 + 3.2, ey - 4.5 - bro * 0.2); c.stroke();
  // nariz
  c.strokeStyle = shade(L.skin, -0.35); c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(RX * 0.42, ey + 1); c.quadraticCurveTo(RX * 0.62, RY * 0.28, RX * 0.4, RY * 0.32); c.stroke();
  // boca
  const my = RY * 0.55, mx = RX * 0.32;
  c.strokeStyle = L.lips || shade(L.skin, -0.45); c.lineWidth = 1.5;
  if (face === 'hurt' || face === 'ko') { c.fillStyle = '#3a1616'; c.beginPath(); c.ellipse(mx, my, 2.8, 2.4, 0, 0, TAU); c.fill(); }
  else if (face === 'happy') { c.beginPath(); c.arc(mx, my - 1.5, 3.4, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
  else if (face === 'angry') { c.fillStyle = '#f4efe8'; c.fillRect(mx - 3, my - 1, 6, 2); c.beginPath(); c.moveTo(mx - 3.5, my - 1); c.lineTo(mx + 3.5, my - 1.4); c.stroke(); }
  else { c.beginPath(); c.moveTo(mx - 3, my); c.quadraticCurveTo(mx, my + (face === 'sad' ? -1 : 0.8), mx + 3, my - 0.2); c.stroke(); }
  drawHairFront(c, id, L, RX, RY, OUT);
}

function drawHairFront(c, id, L, RX, RY, OUT) {
  c.fillStyle = L.style === 'cap' ? L.cap : L.hair;
  c.strokeStyle = OUT; c.lineWidth = 1.4;
  c.beginPath();
  if (L.style === 'cap') {
    // gorra hacia atrás
    c.moveTo(-RX - 1.5, -RY * 0.1);
    c.bezierCurveTo(-RX - 1, -RY * 1.25, RX * 0.9, -RY * 1.3, RX + 1, -RY * 0.35);
    c.lineTo(-RX * 0.2, -RY * 0.45);
    c.lineTo(-RX - 1.5, -RY * 0.1);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = shade(L.cap, -0.25); c.beginPath(); c.moveTo(-RX - 1, -RY * 0.25); c.lineTo(-RX - 9, -RY * 0.1); c.lineTo(-RX - 8, RY * 0.05); c.lineTo(-RX, -RY * 0.02); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#f1f5f9'; c.beginPath(); c.arc(-RX * 0.1, -RY * 0.85, 1.8, 0, TAU); c.fill();
  } else if (L.style === 'ponytail') {
    c.moveTo(-RX - 1, RY * 0.35);
    c.bezierCurveTo(-RX - 2.5, -RY * 1.2, RX * 0.8, -RY * 1.35, RX + 1, -RY * 0.25);
    c.quadraticCurveTo(RX * 0.55, -RY * 0.65, RX * 0.05, -RY * 0.55);
    c.quadraticCurveTo(-RX * 0.4, -RY * 0.45, -RX * 0.55, RY * 0.3);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = L.accent; c.beginPath(); c.arc(-RX * 0.85, -RY * 0.3, 2.2, 0, TAU); c.fill();
  } else if (L.hairBack && !FACE_IMG[id]) {
    // pelo dibujado (versión sin fotos): el copete según su peinado
    if (L.hairBack === 'long') {
      c.moveTo(-RX - 2.5, RY * 0.55);
      c.bezierCurveTo(-RX - 3.5, -RY * 1.25, RX * 0.85, -RY * 1.42, RX + 2, -RY * 0.12);
      c.quadraticCurveTo(RX * 0.62, -RY * 0.72, RX * 0.12, -RY * 0.64);
      c.quadraticCurveTo(-RX * 0.42, -RY * 0.52, -RX * 0.52, RY * 0.5);
    } else if (L.hairBack === 'bun') {
      c.moveTo(-RX - 1, RY * 0.02);
      c.bezierCurveTo(-RX - 1.2, -RY * 1.15, RX * 0.8, -RY * 1.25, RX + 0.5, -RY * 0.42);
      c.quadraticCurveTo(RX * 0.45, -RY * 0.72, -RX * 0.05, -RY * 0.7);
      c.quadraticCurveTo(-RX * 0.55, -RY * 0.62, -RX * 0.7, RY * 0.02);
    } else {
      // corto (y el mullet, que lleva lo largo atrás)
      c.moveTo(-RX - 1.2, RY * 0.12);
      c.bezierCurveTo(-RX - 2, -RY * 1.22, RX * 0.82, -RY * 1.36, RX + 1.2, -RY * 0.3);
      c.quadraticCurveTo(RX * 0.72, -RY * 0.55, RX * 0.35, -RY * 0.5);
      c.lineTo(RX * 0.18, -RY * 0.66);
      c.quadraticCurveTo(-RX * 0.35, -RY * 0.58, -RX * 0.6, RY * 0.12);
    }
    c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = shade(L.hair, 0.28); c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(-RX * 0.5, -RY * 0.85); c.quadraticCurveTo(RX * 0.1, -RY * 1.12, RX * 0.6, -RY * 0.8); c.stroke();
  }
}

// Retrato para HUD / menús: foto real si existe; si no, la cabeza dibujada
function drawPortrait(c, id, x, y, r, face = 'normal') {
  const p = FACE_PORT[id];
  if (p) {
    const s = r * 2.35;
    c.drawImage(p, x - s / 2, y - s * 0.46, s, s);
    if (face === 'ko' || face === 'hurt') { c.fillStyle = face === 'ko' ? 'rgba(10,12,20,.55)' : 'rgba(230,57,70,.28)'; c.fillRect(x - s / 2, y - s * 0.46, s, s); }
    return;
  }
  c.save(); c.translate(x, y + r * 0.1); c.scale(r / SK.headRY, r / SK.headRY);
  drawHead(c, id, face);
  c.restore();
}
// Retrato grande de busto (selección, VS): foto o busto dibujado
function drawBust(c, id, x, y, w, h, face = 'normal', flip = false) {
  const p = FACE_PORT[id];
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  if (p) {
    const s = Math.min(Math.max(w, h) * 1.02, h * 1.12);
    c.imageSmoothingQuality = 'high';
    if (flip) { c.translate(x + w, 0); c.scale(-1, 1); c.drawImage(p, (w - s) / 2, y + (h - s) * 0.35, s, s); }
    else c.drawImage(p, x + (w - s) / 2, y + (h - s) * 0.35, s, s);
    // integra el fondo de la foto con el color del panel
    const vg = c.createRadialGradient(x + w / 2, y + h * 0.42, s * 0.28, x + w / 2, y + h * 0.45, s * 0.62);
    vg.addColorStop(0, 'rgba(7,9,15,0)'); vg.addColorStop(1, 'rgba(7,9,15,.75)');
    c.fillStyle = vg; c.fillRect(x, y, w, h);
  } else {
    const k = h / 70;
    c.translate(x + w / 2, y + h * 1.62); c.scale((flip ? -1 : 1) * k, k);
    drawCharacter(c, id, mkPose({ armF: [0.6, 1.9], armB: [0.4, 2.0], face }), { flip });
  }
  c.restore();
}
function drawStar(c, x, y, r1, r2, col, rot = -Math.PI / 2) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? r2 : r1, a = rot + i * Math.PI / 5; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  c.closePath(); c.fillStyle = col; c.fill();
}
