'use strict';
// ============================================================
//  CHILAZO, EL CHILE JAROCHO
//  Antes era un chile luchador (antifaz, cinturón de campeón y botas).
//  Ahora es un jalapeño de Veracruz vestido de jarocho: sombrero de palma,
//  paliacate rojo al cuello, camisa blanca con alforzas, pantalón blanco y
//  botines de tacón para el zapateado. Pelea igual que antes.
// ============================================================
Object.assign(LOOKS.chilazo, {
  jarocho: 1, skin: '#3f9142', pepper: '#3f9142', pepper2: '#1f5e2a',
  top: '#f4efe8', top2: '#d9d2c4', sleeve: 'long', pants: '#f4efe8',
  feet: 'boot', shoe: '#f7f2e8', sole: '#5a3a22', heel: 1, bootH: 0, wrap: null,
  hat: '#e9d6a4', hat2: '#b99a5c', hatBand: '#18181c', scarf: '#c1121f',
  stem: '#4d7f2c', stem2: '#86b94f', accent: '#c1121f', lips: '#5a1010',
});

// el mismo cuerpo de chile (tronco y cabeza en una pieza), ahora verde y vestido
function pepperPath(c, W, H, wob, p) {
  c.beginPath();
  c.moveTo(0, -H - p);
  c.bezierCurveTo(W * 0.72 + p, -H - 1 - p, W * 1.02 + p, -H * 0.86, W * 1.04 + p, -H * 0.62);
  c.bezierCurveTo(W * 1.08 + p, -H * 0.3, W * 0.9 + p, -2, W * 0.5 + p, 10 + p * 0.5);
  c.quadraticCurveTo(W * 0.05, 22 + p, -W * 0.62 + wob, 27 + p);
  c.quadraticCurveTo(-W * 1.32 - p, 26 + p, -W * 1.18 - p, 12);
  c.bezierCurveTo(-W * 0.98 - p, 2, -W * 1.06 - p, -H * 0.32, -W * 1.0 - p, -H * 0.6);
  c.bezierCurveTo(-W * 0.98 - p, -H * 0.88, -W * 0.72 - p, -H - 1 - p, 0, -H - p);
  c.closePath();
}
// sombrero jarocho de palma: ala ancha y plana, copa baja con pellizco y cinta negra
function drawJarochoHat(c, L, cx, cy, s, OUT) {
  c.save(); c.translate(cx, cy); c.scale(s, s);
  const brim = pad => { c.beginPath(); c.ellipse(0, 0, 34 + pad, 6.5 + pad, 0, 0, TAU); };
  const crown = pad => { c.beginPath(); c.moveTo(-17 - pad, 1); c.bezierCurveTo(-18 - pad, -14 - pad, -9, -19 - pad, -3, -15 - pad); c.quadraticCurveTo(0, -12.5 - pad, 3, -15 - pad); c.bezierCurveTo(9, -19 - pad, 18 + pad, -14 - pad, 17 + pad, 1); c.closePath(); };
  brim(1.6); c.fillStyle = OUT; c.fill(); crown(1.6); c.fill();
  const gb = c.createLinearGradient(0, -6, 0, 7); gb.addColorStop(0, shade(L.hat, 0.12)); gb.addColorStop(1, L.hat2);
  brim(0); c.fillStyle = gb; c.fill();
  const gc = c.createLinearGradient(-17, 0, 17, 0); gc.addColorStop(0, L.hat2); gc.addColorStop(0.6, L.hat); gc.addColorStop(1, shade(L.hat, 0.1));
  crown(0); c.fillStyle = gc; c.fill();
  // tejido de palma
  c.save(); crown(0); c.clip(); c.strokeStyle = 'rgba(120,90,40,.28)'; c.lineWidth = 0.8;
  for (let x = -18; x < 18; x += 3.2) { c.beginPath(); c.moveTo(x, 2); c.lineTo(x + 5, -20); c.stroke(); }
  c.restore();
  c.strokeStyle = 'rgba(120,90,40,.3)'; c.lineWidth = 0.8;
  for (const r of [0.62, 0.82]) { c.beginPath(); c.ellipse(0, 0, 34 * r, 6.5 * r, 0, Math.PI * 0.05, Math.PI * 0.95); c.stroke(); }
  // cinta negra
  c.fillStyle = L.hatBand; c.beginPath(); c.moveTo(-17, -1); c.quadraticCurveTo(0, 2, 17, -1); c.lineTo(17.3, -4.6); c.quadraticCurveTo(0, -1.8, -17.3, -4.6); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.ellipse(8, -12, 4, 1.4, -0.3, 0, TAU); c.fill();
  c.restore();
}
// paliacate rojo anudado al frente, con motitas blancas
function drawPaliacate(c, L, x0, x1, y, knotX, OUT) {
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = OUT; c.lineWidth = 8.5; c.beginPath(); c.moveTo(x0, y + 1); c.quadraticCurveTo((x0 + x1) / 2, y + 5, x1, y); c.stroke();
  c.strokeStyle = L.scarf; c.lineWidth = 6.2; c.stroke();
  // puntas que cuelgan del nudo
  const tri = pad => { c.beginPath(); c.moveTo(knotX - 5 - pad, y + 1); c.lineTo(knotX + 7 + pad, y + 1); c.lineTo(knotX + 2, y + 15 + pad * 1.6); c.closePath(); };
  tri(1.6); c.fillStyle = OUT; c.fill(); tri(0); c.fillStyle = shade(L.scarf, -0.08); c.fill();
  c.fillStyle = OUT; c.beginPath(); c.arc(knotX + 1, y + 1.5, 4.6, 0, TAU); c.fill();
  c.fillStyle = shade(L.scarf, 0.1); c.beginPath(); c.arc(knotX + 1, y + 1.5, 3.3, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.85)';
  for (const [dx, dy] of [[-14, 3], [-6, 4], [10, 2.5], [17, 1.5], [1, 7], [3, 11]]) { c.beginPath(); c.arc(knotX + dx, y + dy, 0.9, 0, TAU); c.fill(); }
  c.restore();
}
function drawPepperJarocho(c, id, L, pose, hx, hy, OUT, opt) {
  const T = SK.torso, H = T + SK.neck + SK.headRY * 1.9, W = L.build.chest, face = pose.face || 'normal';
  const wob = Math.sin((typeof performance !== 'undefined' ? performance.now() : 0) / 300) * 0.6;
  c.save(); c.translate(hx, hy); c.rotate(pose.lean);
  pepperPath(c, W, H, wob, OUTW + 0.3); c.fillStyle = OUT; c.fill();
  pepperPath(c, W, H, wob, 0);
  const g = c.createLinearGradient(-W * 1.1, 0, W * 1.1, 0);
  g.addColorStop(0, L.pepper2); g.addColorStop(0.45, L.pepper); g.addColorStop(0.8, shade(L.pepper, 0.16)); g.addColorStop(1, shade(L.pepper, -0.06));
  c.fillStyle = g; c.fill();
  c.save(); pepperPath(c, W, H, wob, 0); c.clip();
  // brillo encerado del jalapeño y sus rayitas de corcho
  c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(W * 0.58, -H * 0.62, 2.4, H * 0.14, 0.12, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(210,200,150,.35)'; c.lineWidth = 0.9; c.lineCap = 'round';
  for (const [x, y] of [[-W * 0.55, -H * 0.8], [-W * 0.35, -H * 0.86], [-W * 0.7, -H * 0.66]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 3, y - 1.5); c.stroke(); }
  // camisa blanca (guayabera): del cuello al dobladillo, deja ver la punta verde del chile
  const cy = -H * 0.45, hem = 9;
  const shirt = () => { c.beginPath(); c.moveTo(-W * 1.5, cy); c.quadraticCurveTo(0, cy + 4, W * 1.5, cy - 1); c.lineTo(W * 1.5, hem - 2); c.quadraticCurveTo(0, hem + 6, -W * 1.5, hem); c.closePath(); };
  shirt();
  const gs = c.createLinearGradient(-W * 1.1, 0, W * 1.1, 0); gs.addColorStop(0, L.top2); gs.addColorStop(0.5, L.top); gs.addColorStop(1, shade(L.top, 0.04));
  c.fillStyle = gs; c.fill();
  c.strokeStyle = 'rgba(40,40,50,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-W * 1.5, hem); c.quadraticCurveTo(0, hem + 6, W * 1.5, hem - 2); c.stroke();
  // alforzas y botonadura
  const bx = W * 0.22;
  c.strokeStyle = 'rgba(120,110,95,.45)'; c.lineWidth = 0.8;
  for (const dx of [-9, -6, 7, 10]) { c.beginPath(); c.moveTo(bx + dx, cy + 6); c.lineTo(bx + dx - 1, hem - 2); c.stroke(); }
  c.strokeStyle = 'rgba(120,110,95,.55)'; c.beginPath(); c.moveTo(bx, cy + 4); c.lineTo(bx - 1, hem + 1); c.stroke();
  c.fillStyle = '#e5ddc9'; for (let i = 0; i < 4; i++) { const y = cy + 9 + i * ((hem - cy - 12) / 3); c.beginPath(); c.arc(bx + 1.8, y, 1.3, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(-W * 1.5, cy, W * 3, 3);
  c.restore();
  // paliacate al cuello
  drawPaliacate(c, L, -W * 1.02, W * 1.06, cy - 1, W * 0.3, OUT);
  // ojos (sin antifaz), cejas y bigotazo
  const angry = face === 'angry', hurt = face === 'hurt' || face === 'ko', happy = face === 'happy', sad = face === 'sad', out = face === 'ko' || face === 'dizzy';
  const ey = -H * 0.7;
  for (const ex of [W * 0.05, W * 0.62]) {
    if (out) { c.strokeStyle = '#10131a'; c.lineWidth = 1.7; c.beginPath(); c.moveTo(ex - 2.4, ey - 2.4); c.lineTo(ex + 2.4, ey + 2); c.moveTo(ex + 2.4, ey - 2.4); c.lineTo(ex - 2.4, ey + 2); c.stroke(); continue; }
    c.fillStyle = OUT; c.beginPath(); c.ellipse(ex, ey - 0.5, 4.6, angry || hurt ? 2.6 : 3.8, 0, 0, TAU); c.fill();
    c.fillStyle = '#f4efe8'; c.beginPath(); c.ellipse(ex, ey - 0.5, 3.6, angry || hurt ? 1.7 : 2.9, 0, 0, TAU); c.fill();
    c.fillStyle = '#10131a'; c.beginPath(); c.ellipse(ex + 0.9, ey - 0.3, 1.5, angry || hurt ? 1.3 : 1.9, 0, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + 1.4, ey - 1.2, 0.6, 0, TAU); c.fill();
  }
  c.strokeStyle = '#10131a'; c.lineWidth = 1.8; c.lineCap = 'round';
  c.beginPath();
  if (angry) { c.moveTo(-W * 0.3, ey - 7); c.lineTo(W * 0.3, ey - 4.5); c.moveTo(W * 0.4, ey - 4.5); c.lineTo(W * 0.98, ey - 7.5); }
  else if (sad) { c.moveTo(-W * 0.28, ey - 5); c.lineTo(W * 0.28, ey - 7); c.moveTo(W * 0.4, ey - 7); c.lineTo(W * 0.95, ey - 5); }
  else { c.moveTo(-W * 0.26, ey - 6.5); c.quadraticCurveTo(W * 0.05, ey - 8.5, W * 0.3, ey - 6.5); c.moveTo(W * 0.38, ey - 6.5); c.quadraticCurveTo(W * 0.62, ey - 8.5, W * 0.92, ey - 6.5); }
  c.stroke();
  const my = ey + 12, mx = W * 0.38;
  c.fillStyle = '#10131a'; c.beginPath(); c.moveTo(mx - 11, my + 1); c.quadraticCurveTo(mx - 6, my - 6.5, mx, my - 3.5); c.quadraticCurveTo(mx + 6, my - 6.5, mx + 11, my + 1); c.quadraticCurveTo(mx + 5, my - 1.5, mx, my - 1); c.quadraticCurveTo(mx - 5, my - 1.5, mx - 11, my + 1); c.fill();
  c.strokeStyle = L.lips; c.lineWidth = 1.7; c.beginPath();
  if (hurt) { c.fillStyle = '#2a0808'; c.ellipse(mx, my + 3, 2.8, 2.4, 0, 0, TAU); c.fill(); }
  else if (happy || angry) { c.fillStyle = '#2a0808'; c.moveTo(mx - 4, my + 1); c.quadraticCurveTo(mx, my + (angry ? 4 : 6), mx + 4, my + 1); c.closePath(); c.fill(); if (angry) { c.fillStyle = '#f4efe8'; c.fillRect(mx - 3, my + 1, 6, 1.4); } }
  else { c.moveTo(mx - 3.5, my + 2); c.quadraticCurveTo(mx, my + (sad ? 0.5 : 3.6), mx + 3.5, my + 1.8); c.stroke(); }
  // sombrero y el rabito del chile que se asoma por arriba
  drawJarochoHat(c, L, W * 0.12, -H * 0.9, 1, OUT);
  c.strokeStyle = OUT; c.lineWidth = 5.6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(W * 0.1, -H * 0.9 - 14); c.quadraticCurveTo(W * 0.05, -H * 0.9 - 24, -W * 0.5, -H * 0.9 - 26 + wob); c.stroke();
  c.strokeStyle = L.stem2; c.lineWidth = 3.2; c.stroke();
  c.restore();
}
const _bodyPlanJarocho0 = drawBodyPlan;
drawBodyPlan = function (c, id, L, pose, hx, hy, OUT, opt) {
  if (L.plan === 'pepper' && L.jarocho) return drawPepperJarocho(c, id, L, pose, hx, hy, OUT, opt);
  return _bodyPlanJarocho0(c, id, L, pose, hx, hy, OUT, opt);
};

// retrato (marcador y menús): cabeza de jalapeño con sombrero y bigote
HEADS3.chile = function (c, L, face, OUT) {
  const RX = SK.headRX, RY = SK.headRY, angry = face === 'angry', hurt = face === 'hurt' || face === 'ko', happy = face === 'happy', sad = face === 'sad', out = face === 'ko' || face === 'dizzy';
  const path = pad => { c.beginPath(); c.moveTo(-RX * 1.0 - pad, RY * 0.5); c.bezierCurveTo(-RX * 1.15 - pad, -RY * 0.9 - pad, RX * 1.15 + pad, -RY * 1.05 - pad, RX * 1.02 + pad, RY * 0.45); c.quadraticCurveTo(RX * 0.8 + pad, RY * 1.05 + pad, 0, RY * 1.1 + pad); c.quadraticCurveTo(-RX * 0.8 - pad, RY * 1.05 + pad, -RX * 1.0 - pad, RY * 0.5); c.closePath(); };
  path(1.6); c.fillStyle = OUT; c.fill();
  path(0); const g = c.createLinearGradient(-RX, 0, RX, 0); g.addColorStop(0, L.pepper2); g.addColorStop(0.6, L.pepper); g.addColorStop(1, shade(L.pepper, 0.15)); c.fillStyle = g; c.fill();
  c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.ellipse(RX * 0.62, -RY * 0.1, 1.8, RY * 0.3, 0.1, 0, TAU); c.fill();
  // paliacate en el cuello del retrato
  c.save(); path(0); c.clip();
  c.fillStyle = L.scarf; c.beginPath(); c.moveTo(-RX * 1.2, RY * 0.78); c.quadraticCurveTo(0, RY * 0.9, RX * 1.2, RY * 0.76); c.lineTo(RX * 1.2, RY * 1.3); c.lineTo(-RX * 1.2, RY * 1.3); c.closePath(); c.fill();
  c.restore();
  const ey = -RY * 0.12;
  for (const ex of [RX * 0.02, RX * 0.62]) {
    if (out) { c.strokeStyle = '#10131a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(ex - 2, ey - 2.5); c.lineTo(ex + 2, ey + 1.5); c.moveTo(ex + 2, ey - 2.5); c.lineTo(ex - 2, ey + 1.5); c.stroke(); continue; }
    c.fillStyle = OUT; c.beginPath(); c.ellipse(ex, ey - 0.6, 4.2, angry || hurt ? 2.4 : 3.5, 0, 0, TAU); c.fill();
    c.fillStyle = '#f4efe8'; c.beginPath(); c.ellipse(ex, ey - 0.6, 3.2, angry || hurt ? 1.5 : 2.6, 0, 0, TAU); c.fill();
    c.fillStyle = '#10131a'; c.beginPath(); c.ellipse(ex + 0.8, ey - 0.5, 1.4, angry || hurt ? 1.2 : 1.7, 0, 0, TAU); c.fill();
  }
  if (angry) { c.strokeStyle = '#10131a'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-RX * 0.3, ey - 6); c.lineTo(RX * 0.3, ey - 3.5); c.moveTo(RX * 0.35, ey - 3.5); c.lineTo(RX * 0.95, ey - 6); c.stroke(); }
  const my = RY * 0.5, mx = RX * 0.35;
  c.fillStyle = '#10131a'; c.beginPath(); c.moveTo(mx - 9, my); c.quadraticCurveTo(mx - 4, my - 6, mx, my - 3); c.quadraticCurveTo(mx + 4, my - 6, mx + 9, my); c.quadraticCurveTo(mx + 4, my - 2, mx, my - 1.2); c.quadraticCurveTo(mx - 4, my - 2, mx - 9, my); c.fill();
  c.strokeStyle = L.lips; c.lineWidth = 1.6; c.beginPath();
  if (hurt) { c.fillStyle = '#2a0808'; c.ellipse(mx, my + 2.5, 2.4, 2, 0, 0, TAU); c.fill(); }
  else if (happy) { c.arc(mx, my, 3.2, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
  else { c.moveTo(mx - 3, my + 1.6); c.quadraticCurveTo(mx, my + (sad ? 0 : 2.8), mx + 3, my + 1.4); c.stroke(); }
  drawJarochoHat(c, L, RX * 0.1, -RY * 0.72, 0.82, OUT);
  c.strokeStyle = OUT; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(RX * 0.08, -RY * 0.72 - 12); c.quadraticCurveTo(0, -RY * 0.72 - 20, -RX * 0.9, -RY * 0.72 - 21); c.stroke();
  c.strokeStyle = L.stem2; c.lineWidth = 2.8; c.stroke();
};

// nombre, descripción y especiales con sabor jarocho (los golpes no cambian)
Object.assign(CHARS.chilazo, { title: 'El Chile Jarocho', blurb: 'Jalapeño de Veracruz: echa lumbre, avienta salsa y se lanza con todo.' });
SPECIALS.chilazo.s.name = 'Embestida Jarocha';
SPECIALS.chilazo.u.name = 'Salto de La Bamba';
SPECIALS.chilazo.d.name = 'Salsa Veracruzana';
