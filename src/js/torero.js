'use strict';
// ============================================================
//  PUENTIN, EL TORERO
//  Traje de luces grana y oro, montera y capote. Pelea como en la plaza:
//  el capote pega de lejos, la verónica deja pasar al rival de largo,
//  la estocada es su golpe insignia (la punta de la espada pega el doble),
//  las banderillas lo llevan de frente y la garrocha lo regresa por arriba.
//  Habilidad ¡Olé!: esquivar un golpe justo a tiempo hace gritar a la
//  plaza y su siguiente golpe pega más.
// ============================================================

// ---------- cómo se ve ----------
LOOKS.puentin = {
  skin: '#d9a17e', hair: '#1a1411', hairBack: 'short', eye: '#2b1a10', lips: '#9a5a48',
  top: '#8a1531', top2: '#5c0d20', garment: 'torero', sleeve: 'long', gold: '#e9b949', gold2: '#a8781f',
  shirt: '#f6f1e7', tie: '#141418', faja: '#141418',
  pants: '#8a1531', braid: '#e9b949', bootH: 0.46, boot: '#f2a0b6', feet: 'slipper', shoe: '#121216', sole: '#050507', bow: '#e9b949',
  headwear: 'montera', montera: '#16161a', accent: '#e9b949', capote: '#c2185b', capoteIn: '#f2c230',
  build: { chest: 16.5, waist: 10.5, arm: 0.95, leg: 0.95 }, prop: { leg: 1.06, torso: 1.0, arm: 1.02, head: 1.0 },
};

// chaquetilla corta: camisa, corbatín, alamares, bordado y caireles; faja negra
const _garmentTorero0 = drawGarment2;
drawGarment2 = function (c, L, cw, ww, T) {
  if (L.garment !== 'torero') return _garmentTorero0(c, L, cw, ww, T);
  const G = L.gold, G2 = L.gold2;
  // chaleco bajo la chaquetilla
  c.fillStyle = shade(L.top, -0.12); c.fillRect(-cw - 2, -T * 0.34, cw * 2 + 4, T * 0.2);
  // camisa blanca y corbatín
  c.fillStyle = L.shirt; c.beginPath(); c.moveTo(-2.5, -T - 2); c.lineTo(9.5, -T - 2); c.lineTo(5.5, -T * 0.4); c.lineTo(1.5, -T * 0.4); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(3.5, -T * 0.86); c.lineTo(3.5, -T * 0.45); c.stroke();
  c.fillStyle = L.tie; c.fillRect(2.3, -T - 1, 2.4, T * 0.46); c.fillRect(1.2, -T - 2.4, 4.6, 3.2);
  // solapas y orillas bordadas
  c.strokeStyle = G; c.lineWidth = 2.4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-2.5, -T - 1); c.quadraticCurveTo(-5.5, -T * 0.62, -0.5, -T * 0.34); c.moveTo(9.5, -T - 1); c.quadraticCurveTo(12.5, -T * 0.62, 7.5, -T * 0.34); c.stroke();
  // alamares: cierres dorados a los lados de la camisa
  c.lineWidth = 1.6;
  for (const y of [-T * 0.78, -T * 0.64, -T * 0.5]) { c.beginPath(); c.moveTo(-6.5, y); c.lineTo(-2.2, y); c.moveTo(9.8, y); c.lineTo(14, y); c.stroke(); }
  // arabescos en el pecho y la espalda
  c.strokeStyle = G; c.lineWidth = 1.3;
  for (const [x, y, k] of [[-cw * 0.55, -T * 0.74, 1], [-cw * 0.64, -T * 0.5, 0.8], [cw * 0.72, -T * 0.72, 0.85], [-cw * 0.2, -T * 0.86, 0.7]]) {
    c.beginPath(); c.arc(x, y, 3.4 * k, 0.3, 5.4); c.stroke();
    c.beginPath(); c.arc(x + 4.6 * k, y + 2.2 * k, 2.2 * k, 3.4, 8.6); c.stroke();
    c.fillStyle = G; c.beginPath(); c.arc(x, y, 1.1 * k, 0, TAU); c.fill();
  }
  // bajo de la chaquetilla: franja dorada con caireles colgando
  c.fillStyle = G; c.fillRect(-cw - 2, -T * 0.36, cw * 2 + 4, 3);
  c.strokeStyle = G2; c.lineWidth = 1;
  for (let x = -cw; x <= cw; x += 3.2) { c.beginPath(); c.moveTo(x, -T * 0.36 + 3); c.lineTo(x + 0.4, -T * 0.36 + 6.2); c.stroke(); }
  // faja
  c.fillStyle = L.faja; c.fillRect(-ww - 2, -T * 0.15, ww * 2 + 4, T * 0.15 + 3);
  c.fillStyle = withAlpha(G, 0.8); c.fillRect(-ww - 2, -T * 0.15, ww * 2 + 4, 1.2);
  // lentejuelas que brillan con la luz de la plaza
  const tw = typeof performance !== 'undefined' ? performance.now() / 260 : 0;
  for (let i = 0; i < 9; i++) {
    const x = -cw * 0.85 + ((i * 7.7) % (cw * 1.8)), y = -T * (0.42 + ((i * 0.137) % 0.5));
    c.fillStyle = `rgba(255,248,220,${0.35 + 0.5 * Math.abs(Math.sin(tw + i * 1.9))})`; c.beginPath(); c.arc(x, y, 0.9, 0, TAU); c.fill();
  }
};

// mangas bordadas, puño dorado y hombreras con flecos
const _armTorero0 = drawArm;
drawArm = function (c, L, B, sx, sy, ang, back, OUT) {
  const r = _armTorero0(c, L, B, sx, sy, ang, back, OUT);
  if (L.garment !== 'torero') return r;
  const p = limbPoints(sx, sy, ang[0], ang[1], SK.upper, SK.fore), k = B.arm, dk = back ? -0.28 : 0, G = shade(L.gold, dk);
  c.save(); c.lineCap = 'round';
  c.strokeStyle = G; c.lineWidth = 2 * k;
  c.beginPath(); c.moveTo(sx, sy); c.lineTo(p.ex, p.ey); c.lineTo(lerp(p.ex, p.fx, 0.7), lerp(p.ey, p.fy, 0.7)); c.stroke();
  segFill(c, lerp(p.ex, p.fx, 0.72), lerp(p.ey, p.fy, 0.72), lerp(p.ex, p.fx, 0.84), lerp(p.ey, p.fy, 0.84), 9.6 * k, 9.6 * k, 8.4 * k, G);
  const ey = sy - 4;
  c.fillStyle = OUT; c.beginPath(); c.ellipse(sx, ey, 6.4 * k + OUTW, 3.6 * k + OUTW, 0, 0, TAU); c.fill();
  const g = c.createLinearGradient(sx - 6, ey - 4, sx + 6, ey + 3); g.addColorStop(0, shade(G, 0.25)); g.addColorStop(1, shade(G, -0.25));
  c.fillStyle = g; c.beginPath(); c.ellipse(sx, ey, 6.4 * k, 3.6 * k, 0, 0, TAU); c.fill();
  c.strokeStyle = shade(L.gold2, dk); c.lineWidth = 0.9;
  for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(sx + i * 2.3 * k, ey + 2.4 * k); c.lineTo(sx + i * 2.5 * k, ey + 5.4 * k); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(sx + 1.5, ey - 1.2, 2, 0.9, -0.3, 0, TAU); c.fill();
  c.restore();
  return r;
};

// taleguilla con bordado dorado por el costado y los machos en la rodilla
const _legTorero0 = legExtras;
legExtras = function (c, L, hx, hy, p, T, S, dk) {
  _legTorero0(c, L, hx, hy, p, T, S, dk);
  if (!L.braid) return;
  const G = shade(L.braid, dk * 0.8);
  const ux = p.ex - hx, uy = p.ey - hy, ul = Math.hypot(ux, uy) || 1, nx = -uy / ul, ny = ux / ul, off = T[1] * 0.24;
  c.save(); c.strokeStyle = G; c.lineWidth = 2.6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(hx - nx * off, hy - ny * off); c.lineTo(p.ex - nx * off * 0.7, p.ey - ny * off * 0.7); c.stroke();
  c.fillStyle = G;
  for (let i = 1; i < 5; i++) { const t = i / 5; c.beginPath(); c.arc(lerp(hx, p.ex, t) - nx * (off + 2.6), lerp(hy, p.ey, t) - ny * (off + 2.6), 1.3, 0, TAU); c.fill(); }
  // machos: borlitas doradas donde termina la taleguilla
  const t0 = 1 - (L.bootH || 0), bx = lerp(p.ex, p.fx, t0), by = lerp(p.ey, p.fy, t0);
  for (const s of [-1, 1]) { c.beginPath(); c.arc(bx + nx * s * 3.2, by + ny * s * 3.2 - 1.5, 2, 0, TAU); c.fill(); }
  c.restore();
};

// zapatillas planas con moño
const _footTorero0 = drawFoot2;
drawFoot2 = function (c, L, x, y, rot, k, dk, OUT) {
  if (L.feet !== 'slipper') return _footTorero0(c, L, x, y, rot, k, dk, OUT);
  c.save(); c.translate(x, y); c.rotate(rot);
  const sw = 18 * k, sh = 7 * k, col = shade(L.shoe, dk);
  const path = pad => { c.beginPath(); c.moveTo(-6 - pad, sh / 2 + pad); c.lineTo(-6 - pad, -sh / 2 + 1 - pad); c.quadraticCurveTo(-3, -sh / 2 - 1 - pad, 3, -sh / 2 + 0.5 - pad); c.quadraticCurveTo(sw - 2 + pad, -sh / 2 + 2, sw - 3 + pad, sh / 2 + pad); c.closePath(); };
  path(OUTW); c.fillStyle = OUT; c.fill();
  const g = c.createLinearGradient(0, -sh / 2, 0, sh / 2); g.addColorStop(0, shade(col, 0.35)); g.addColorStop(1, col);
  path(0); c.fillStyle = g; c.fill();
  c.fillStyle = shade(L.sole, dk); c.fillRect(-6, sh / 2 - 1.6, sw - 3, 1.6);
  // moño en el empeine
  c.fillStyle = shade(L.bow, dk); c.beginPath(); c.ellipse(6.5, -sh / 2 + 0.8, 2.6, 1.5, 0.3, 0, TAU); c.ellipse(10, -sh / 2 + 1.6, 2.6, 1.5, -0.3, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(-4, -sh / 2 + 0.2, 6, 1);
  c.restore();
};

// montera: negra, de astracán, con sus dos borlas; va sobre la cabeza dibujada o sobre la foto
function drawHeadwear(c, id, L, OUT, photo) {
  if (L.headwear !== 'montera') return;
  const RX = SK.headRX, RY = SK.headRY, by = -RY * (photo ? (L.hatY || 0.7) : 0.56), k = photo ? (L.hatS || 1.05) : 1;
  c.save(); c.translate(0, by); c.scale(k, k);
  // coleta del torero: el moñito negro de la nuca
  if (!photo) { c.fillStyle = OUT; c.beginPath(); c.ellipse(-RX * 0.98, RY * 0.5, 4.6, 3.8, 0.4, 0, TAU); c.fill(); c.fillStyle = L.hair; c.beginPath(); c.ellipse(-RX * 0.98, RY * 0.5, 3.4, 2.7, 0.4, 0, TAU); c.fill(); }
  const path = pad => {
    c.beginPath();
    c.moveTo(-RX * 1.1 - pad, 2 + pad);
    c.bezierCurveTo(-RX * 1.42 - pad, -RY * 0.36, -RX * 1.08 - pad, -RY * 0.82 - pad, -RX * 0.6, -RY * 0.66 - pad);
    c.quadraticCurveTo(0, -RY * 0.44 - pad, RX * 0.62, -RY * 0.68 - pad);
    c.bezierCurveTo(RX * 1.1 + pad, -RY * 0.84 - pad, RX * 1.46 + pad, -RY * 0.36, RX * 1.12 + pad, 2 + pad);
    c.quadraticCurveTo(0, RY * 0.16 + pad, -RX * 1.1 - pad, 2 + pad);
    c.closePath();
  };
  path(1.6); c.fillStyle = OUT; c.fill();
  const g = c.createLinearGradient(0, -RY * 0.8, 0, RY * 0.15); g.addColorStop(0, shade(L.montera, 0.22)); g.addColorStop(1, shade(L.montera, -0.2));
  path(0); c.fillStyle = g; c.fill();
  // rizos del astracán
  c.save(); path(0); c.clip();
  c.strokeStyle = 'rgba(255,255,255,.1)'; c.lineWidth = 1;
  for (let i = 0; i < 14; i++) { const x = -RX * 1.1 + ((i * 5.3) % (RX * 2.2)), y = -RY * 0.6 + ((i * 3.7) % (RY * 0.62)); c.beginPath(); c.arc(x, y, 1.6, 0.4, 4.6); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.14)'; c.beginPath(); c.ellipse(RX * 0.55, -RY * 0.52, RX * 0.3, RY * 0.08, -0.2, 0, TAU); c.fill();
  c.restore();
  // cinta de la orilla y las borlas (machos)
  c.strokeStyle = shade(L.montera, 0.35); c.lineWidth = 1.2; c.beginPath(); c.moveTo(-RX * 1.05, 0.5); c.quadraticCurveTo(0, RY * 0.12, RX * 1.07, 0.5); c.stroke();
  for (const s of [-1, 1]) { const x = s * RX * 1.22, y = -RY * 0.12; c.fillStyle = OUT; c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fill(); c.fillStyle = L.montera; c.beginPath(); c.arc(x, y, 2.9, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.arc(x - 0.8, y - 0.9, 1, 0, TAU); c.fill(); }
  c.restore();
}

// ---------- lo que lleva en la mano ----------
// capote colgando del brazo (quieto) o extendido (en los pases), espada, banderillas y garrocha
function capoteHanging(c, L, hx, hy, wide, OUT) {
  const t = typeof performance !== 'undefined' ? performance.now() : 0, sway = Math.sin(t / 320) * 3;
  const w0 = wide ? 26 : 9, w1 = wide ? 38 : 21, bot = Math.min(hy + (wide ? 72 : 64), -3);
  const x0 = hx - w0, x1 = hx + w1, xb1 = x1 + 9 + sway, xb0 = x0 - 7 + sway * 0.6;
  const path = () => {
    c.beginPath(); c.moveTo(x0, hy - 1);
    c.quadraticCurveTo(hx + (w1 - w0) / 2, hy - 5, x1, hy - 1);
    c.quadraticCurveTo(x1 + 6, (hy + bot) / 2, xb1, bot);
    for (let i = 1; i <= 4; i++) { const xa = lerp(xb1, xb0, (i - 0.5) / 4), xe = lerp(xb1, xb0, i / 4); c.quadraticCurveTo(xa, bot + (i % 2 ? 6 : -2), xe, bot); }
    c.quadraticCurveTo(x0 - 6, (hy + bot) / 2, x0, hy - 1); c.closePath();
  };
  path(); c.strokeStyle = OUT; c.lineWidth = OUTW * 2 + 0.6; c.lineJoin = 'round'; c.stroke();
  const g = c.createLinearGradient(x0, 0, x1 + 8, 0); g.addColorStop(0, shade(L.capote, -0.3)); g.addColorStop(0.55, L.capote); g.addColorStop(1, shade(L.capote, 0.12));
  c.fillStyle = g; c.fill();
  c.save(); path(); c.clip();
  // el forro amarillo asoma en el doblez
  c.fillStyle = L.capoteIn; c.beginPath(); c.moveTo(x0 - 8, hy); c.quadraticCurveTo(x0 + 5, (hy + bot) / 2, xb0 + 3, bot + 8); c.lineTo(x0 - 14, bot + 8); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(60,0,20,.35)'; c.lineWidth = 1.3;
  for (const k of [0.3, 0.55, 0.8]) { const x = lerp(x0, x1, k); c.beginPath(); c.moveTo(x, hy + 2); c.quadraticCurveTo(x + 3, (hy + bot) / 2, x + sway * k + 2, bot); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(x0 + 2, hy + 1, (x1 - x0) * 0.8, 2);
  c.restore();
}
function capoteFan(c, L, hx, hy, ang, trail, k, OUT) {
  const t = typeof performance !== 'undefined' ? performance.now() : 0, R = 62 * k;
  const a0 = ang + trail * 0.2, a1 = ang - trail * 1.1, pts = [];
  for (let i = 0; i <= 8; i++) { const a = lerp(a0, a1, i / 8), rr = R * (0.9 + 0.1 * Math.sin(i * 1.7 + t / 80)), [dx, dy] = dirv(a); pts.push([hx + dx * rr, hy + dy * rr]); }
  const edge = (start) => { if (start) c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2); c.lineTo(pts[8][0], pts[8][1]); };
  const path = () => { c.beginPath(); c.moveTo(hx, hy); c.lineTo(pts[0][0], pts[0][1]); edge(false); c.closePath(); };
  path(); c.strokeStyle = OUT; c.lineWidth = OUTW * 2 + 0.6; c.lineJoin = 'round'; c.stroke();
  const g = c.createRadialGradient(hx, hy, 4, hx, hy, R); g.addColorStop(0, shade(L.capote, -0.25)); g.addColorStop(0.7, L.capote); g.addColorStop(1, shade(L.capote, 0.1));
  c.fillStyle = g; c.fill();
  c.save(); path(); c.clip();
  c.beginPath(); edge(true); c.strokeStyle = L.capoteIn; c.lineWidth = R * 0.3; c.stroke();
  c.strokeStyle = 'rgba(60,0,20,.3)'; c.lineWidth = 1.2;
  for (const q of [0.3, 0.6]) { const [dx, dy] = dirv(lerp(a0, a1, q)); c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + dx * R * 0.8, hy + dy * R * 0.8); c.stroke(); }
  c.restore();
}
function drawEstoque(c, hx, hy, ang, OUT) {
  const [dx, dy] = dirv(ang), len = 48;
  c.save(); c.translate(hx, hy); c.rotate(Math.atan2(dy, dx)); c.lineCap = 'round';
  const blade = () => { c.beginPath(); c.moveTo(4, 0); c.lineTo(len - 6, 0); c.quadraticCurveTo(len - 1, 0.4, len + 2, 3); };
  blade(); c.strokeStyle = OUT; c.lineWidth = 4.4; c.stroke();
  blade(); c.strokeStyle = '#d6dde6'; c.lineWidth = 2.3; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(8, -0.6); c.lineTo(len - 8, -0.6); c.stroke();
  c.fillStyle = OUT; c.fillRect(0.6, -6.6, 4.6, 13.2); c.fillStyle = '#e9b949'; c.fillRect(1.4, -5.8, 3, 11.6);
  c.fillStyle = OUT; c.fillRect(-8, -2.6, 9, 5.2); c.fillStyle = '#8a1531'; c.fillRect(-7.2, -1.8, 7.6, 3.6);
  c.restore();
}
function drawBanderillas(c, hx, hy, ang, OUT) {
  for (const da of [-0.14, 0.12]) {
    const [dx, dy] = dirv(ang + da);
    c.save(); c.translate(hx, hy); c.rotate(Math.atan2(dy, dx)); c.lineCap = 'round';
    c.strokeStyle = OUT; c.lineWidth = 3.6; c.beginPath(); c.moveTo(-8, 0); c.lineTo(38, 0); c.stroke();
    c.strokeStyle = '#f4efe8'; c.lineWidth = 2; c.beginPath(); c.moveTo(-8, 0); c.lineTo(38, 0); c.stroke();
    // papel picado de colores enrollado en el palo
    const cols = ['#e63946', '#ffbe0b', '#2a9d8f', '#e63946'];
    for (let i = 0; i < 4; i++) { const x = -4 + i * 7; c.fillStyle = cols[i]; c.beginPath(); c.moveTo(x, -4.5); c.lineTo(x + 6, -3); c.lineTo(x + 6, 3); c.lineTo(x, 4.5); c.closePath(); c.fill(); }
    c.fillStyle = OUT; c.beginPath(); c.moveTo(38, -3); c.lineTo(46, 0); c.lineTo(38, 3); c.closePath(); c.fill();
    c.fillStyle = '#cfd6de'; c.beginPath(); c.moveTo(38.6, -1.8); c.lineTo(44.4, 0); c.lineTo(38.6, 1.8); c.closePath(); c.fill();
    c.restore();
  }
}
function drawGarrocha(c, hx, hy, tx, ty, OUT) {
  const dx = tx - hx, dy = ty - hy, l = Math.hypot(dx, dy) || 1, len = Math.min(l, 200), ex = hx + dx / l * len, ey = hy + dy / l * len;
  c.save(); c.lineCap = 'round';
  c.strokeStyle = OUT; c.lineWidth = 5.2; c.beginPath(); c.moveTo(hx - dx / l * 16, hy - dy / l * 16); c.lineTo(ex, ey); c.stroke();
  c.strokeStyle = '#a0703d'; c.lineWidth = 3.2; c.beginPath(); c.moveTo(hx - dx / l * 16, hy - dy / l * 16); c.lineTo(ex, ey); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1; c.beginPath(); c.moveTo(hx, hy - 1); c.lineTo(ex, ey - 1); c.stroke();
  c.restore();
}
HAND_PROPS.puentin = function (c, fig, hx, hy, ang, OUT) {
  const L = LOOKS.puentin, m = fig && fig.state === 'attack' ? fig.move : null, d = m && m.def;
  const A = d ? animFor(fig, m) : null;
  // estocada (y el remate de su golpe final): la espada
  if (d && (d.estoque || (A && A.limb === 'estoque') || (d.final && m.f >= 126))) { drawEstoque(c, hx, hy, ang, OUT); return; }
  if (d && d.banderillas) { drawBanderillas(c, hx, hy, ang, OUT); return; }
  if (d && d.garrocha && m.f < 26) {
    // la punta de la garrocha se queda clavada donde la plantó
    const s = fig.size ? fig.size() : 1, v = m.v || {};
    const tx = v.px !== undefined ? (v.px - fig.x) * fig.face / s : 60, ty = v.py !== undefined ? (v.py - fig.y) / s : 20;
    drawGarrocha(c, hx, hy, tx, ty, OUT); return;
  }
  const spread = d && !d.pass && (d.capote || (A && A.limb === 'capote'));
  if (fig) {
    // el capote se queda atrás del movimiento del brazo
    const prev = fig._capA, dA = prev === undefined ? 0 : ang - prev;
    if (dA > 0.01) fig._capT = 1; else if (dA < -0.01) fig._capT = -1;
    fig._capA = ang;
    fig._capK = spread ? Math.min(1, (fig._capK || 0.6) + 0.2) : 0.6;
  }
  if (spread) capoteFan(c, L, hx, hy, ang, (fig && fig._capT) || 1, fig ? fig._capK : 1, OUT);
  else capoteHanging(c, L, hx, hy, !!(d && (d.pass || d.final)), OUT);
};
// dónde queda la punta del capote y de la espada (para que el área de golpe esté donde se ve)
const _limbTipTorero0 = limbTip;
limbTip = function (fig, pose, limb) {
  if (limb !== 'capote' && limb !== 'estoque') return _limbTipTorero0(fig, pose, limb);
  const h = skeletonTips(fig.id, pose).handF, [dx, dy] = dirv(h.a), len = limb === 'estoque' ? 38 : 20;
  return [{ x: h.x + dx * len, y: h.y + dy * len, a: h.a }];
};

// ---------- sonidos de la plaza ----------
const _sfxTorero0 = Audio8.sfx;
Audio8.sfx = function (name, k = 1) {
  if (name !== 'ole' && name !== 'pasodoble') return _sfxTorero0.call(this, name, k);
  if (typeof NetEv !== 'undefined' && NetEv.on) NetEv.push(['s', name, Math.round(k * 10) / 10]);
  if (!this.ready) return;
  if (name === 'ole') {
    // la plaza entera: rumor que crece y un "o-lé" de dos notas
    this.noise(0.9, 0.2 * k, 650, 0.5, 0, 'lowpass', null, 1500);
    this.tone('triangle', 330, 318, 0.16, 0.14 * k); this.tone('triangle', 440, 428, 0.36, 0.16 * k, 0.16);
    this.tone('square', 220, 214, 0.16, 0.04 * k); this.tone('square', 294, 286, 0.36, 0.05 * k, 0.16);
  } else {
    // clarín de pasodoble
    [392, 523, 659, 784, 659, 784].forEach((f, i) => { this.tone('square', f, f, i === 5 ? 0.4 : 0.12, 0.07 * k, i * 0.11); this.tone('triangle', f * 2, f * 2, i === 5 ? 0.4 : 0.12, 0.04 * k, i * 0.11); });
  }
};

// ---------- ¡Olé! ----------
function oleActive(f) { return !!(BATTLE && f.oleT && BATTLE.t - f.oleT < 240 && (!f.oleHitT || f.oleHitT === BATTLE.t)); }
function oleFor(f) {
  if (!BATTLE) return;
  f.oleT = BATTLE.t; f.oleHitT = 0;
  Audio8.sfx('ole');
  spawnFx('text', f.x, f.y - 150 * f.size(), { txt: '¡OLÉ!', col: '#e9b949', size: 40 });
  for (let i = 0; i < 6; i++) spawnFx('spark', f.x + rand(-40, 40), f.y - rand(40, 130) * f.size(), { col: pick(['#e9b949', '#f4efe8', '#c2185b']) });
}
// la verónica: el rival pasa de largo por el capote y se va de boca; el torero queda libre
function capotePass(f, att, incoming) {
  Audio8.sfx('counter');
  f.invuln = Math.max(f.invuln, 24);
  const near = Math.abs(att.x - f.x) < 220 && Math.abs(att.y - f.y) < 200;
  if (near && !att.dead) {
    const dir = sign(f.x - att.x) || att.face;
    att.x = f.x + dir * 66 * f.size();
    spawnFx('wind', f.x, f.y - 60 * f.size(), { dir });
    applyHit(f, att, { dmg: Math.max(3, incoming * 0.5), ang: 25, bkb: 5, kbg: 3, trip: 1, sfx: 'hit' }, dir, { unblockable: true });
    f.face = dir;
  }
  oleFor(f); // después del tropezón: el bono es para el golpe que sigue
  if (f.move) f.move.f = Math.max(f.move.f, f.move.def.dur - 12);
}

// ---------- golpes especiales ----------
SPECIALS.puentin = {
  n: { name: 'Verónica', anim: 'to_veronica', dur: 42, counter: [4, 22], pass: 1, capote: 1,
    onFrame(f, m) { if (m.f === 4) Audio8.sfx('swing', 0.6); if (!f.grounded) f.vy *= 0.7; } },
  s: { name: 'Par de Banderillas', anim: 'to_banderillas', dur: 46, oncePerAir: 1, land: 12, banderillas: 1,
    hits: [HB(14, 18, 36, -58, 26, 9, 55, 7, 8.5, { effect: 'slash', vfx: 1 })],
    onFrame(f, m) {
      if (m.f === 5) { f.vy = f.grounded ? -7.5 : Math.min(f.vy, -7); f.vx = f.face * 10; f.grounded = false; Audio8.sfx('swing', 1.1); }
      if (m.f > 5 && m.f < 18) f.vx = approach(f.vx, f.face * 10, 0.6);
      if (m.f > 20) f.vx *= 0.9;
    } },
  u: { name: 'Salto de Garrocha', anim: 'to_garrocha', dur: 58, helpless: 1, garrocha: 1,
    hits: [HB(10, 18, 24, -44, 30, 8, 78, 7, 8, { vfx: 1 })],
    onFrame(f, m) {
      if (m.f === 1) { m.v.px = f.x + f.face * 70 * f.size(); m.v.py = f.grounded ? f.y : f.y + 150 * f.size(); Audio8.sfx('swing', 0.8); }
      if (m.f < 8) { f.vx *= 0.8; if (!f.grounded) f.vy = Math.min(f.vy, 1); }
      if (m.f === 8) { f.vy = -20.5; f.grounded = false; f.vx = f.face * 3.5; Audio8.sfx('djump'); spawnFx('dust', m.v.px, m.v.py); }
      if (m.f >= 8 && m.f <= 30) f.vx = approach(f.vx, f.ctrl.x * 5.2, 0.5);
    } },
  d: { name: 'Revolera', anim: 'to_revolera', dur: 46, capote: 1,
    hits: [HB(10, 16, 42, -38, 34, 7, 45, 5.5, 4, { trip: 1, grp: 1, vfx: 1 }), HB(10, 16, -42, -38, 34, 7, 135, 5.5, 4, { trip: 1, grp: 1, vfx: 1 })],
    onFrame(f, m) { if (m.f === 9) Audio8.sfx('swing', 0.9); if (!f.grounded) f.vy = Math.min(f.vy, 2.5); } },
  f: { name: 'Faena de Gala', anim: 'to_faena', dur: 170, final: 1, capote: 1,
    onFrame(f, m) {
      if (m.f === 1) {
        dim(170); Audio8.sfx('pasodoble');
        m.v.t = opponentsOf(f).filter(o => !o.dead && Math.abs(o.x - f.x) < 900 && Math.abs(o.y - f.y) < 500);
        spawnFx('text', f.x, f.y - 175, { txt: '¡FAENA DE GALA!', col: '#e9b949', size: 40 });
      }
      f.vx = 0; if (!f.grounded) f.vy = Math.min(f.vy, 0) * 0.8;
      const s = f.size();
      (m.v.t || []).forEach((t, i) => {
        if (t.dead) return;
        if (m.f === 12) { if (t.grabbing) t.releaseGrab(); if (t.grabbedBy) t.grabbedBy.releaseGrab(); if (['ledge', 'climb', 'grabbed', 'holding'].includes(t.state)) t.setState('air'); }
        if (m.f < 12) return;
        // cinco pases: el rival embiste de un lado al otro por el capote
        if (m.f < 124) {
          const n = Math.floor((m.f - 12) / 22), ph = ((m.f - 12) % 22) / 22, e = ph * ph * (3 - 2 * ph);
          const from = (n % 2 ? 1 : -1) * f.face;
          t.hitlag = 2; t.vx = t.vy = t.lx = t.ly = 0; t.grounded = false;
          t.x = f.x + lerp(from, -from, e) * 150 * s + i * 14; t.y = f.y - Math.sin(ph * Math.PI) * 10 - i * 8; t.face = -from;
          if ((m.f - 12) % 22 === 11) {
            applyHit(f, t, { dmg: 3, ang: 90, bkb: 1, kbg: 0, sfx: 'hit' }, 1, { noLaunch: true });
            if (i === 0) { Audio8.sfx('ole', 0.8); spawnFx('text', f.x + rand(-60, 60), f.y - rand(160, 200), { txt: '¡OLÉ!', col: '#f4efe8', size: 32 }); }
          }
          return;
        }
        // la estocada
        if (m.f < 140) { t.hitlag = 2; t.vx = t.vy = t.lx = t.ly = 0; t.x = lerp(t.x, f.x + f.face * 76 * s, 0.3); t.y = f.y; t.face = -f.face; return; }
        if (m.f === 140) {
          shake(24); flash(0.6); Audio8.sfx('ko');
          spawnFx('boom', t.x, t.y - 60, { r: 120, col: '#e9b949' });
          applyHit(f, t, { dmg: 16, ang: 42, bkb: 17, kbg: 12, effect: 'slash', sfx: 'bighit' }, f.face);
        }
      });
      // lluvia de claveles al final
      if (m.f >= 142 && m.f < 168 && m.f % 2 === 0) spawnFx('spark', f.x + rand(-260, 260), f.y - rand(160, 320), { col: pick(['#e63946', '#f4efe8', '#ff8fab']) });
    } },
};

CHARS.puentin = { id: 'puentin', name: 'Puentin', title: 'El Torero', blurb: 'Capote, estocada y banderillas: si esquiva justo, la plaza le grita ¡Olé!',
  weight: 94, walk: 4.0, run: 9.8, air: 6.3, airAcc: 0.52, grav: 0.66, fall: 11.5, ffall: 17, jump: 15.6, djump: 14.4, jumps: 2, traction: 0.85,
  power: 1.0, reach: 1.06, speed: 1.06, size: 1.0, bars: { fuerza: 3, velocidad: 4, peso: 2, rango: 4 } };
CHAR_ORDER.push('puentin');

ABILITIES.puentin = {
  name: '¡Olé!', desc: 'Si esquiva un golpe justo a tiempo, la plaza grita ¡Olé! y su siguiente golpe pega 30% más',
  dmg: f => oleActive(f) ? 1.3 : 1,
  kb: f => oleActive(f) ? 1.1 : 1,
  onDodge(f, att, key) { if (f._oleKey === key) return; f._oleKey = key; oleFor(f); },
  onHit(f) { if (oleActive(f) && !f.oleHitT) f.oleHitT = BATTLE.t; },
  tick(f) { if (oleActive(f) && !f.dead && BATTLE.t % 5 === 0) spawnFx('spark', f.x + rand(-26, 26), f.y - rand(30, 120) * f.size(), { col: '#e9b949' }); },
};

// ---------- golpes normales propios ----------
MOVE_KITS.puentin = {
  // dos capotazos cortos y el pase de pecho de remate
  jab1: { anim: 'to_flick', dur: 13, iasa: 8, jab: 'jab2', hits: [HB(3, 4, 44, -60, 18, 2.4, 75, 2, 0.8)] },
  jab2: { anim: 'to_flick2', dur: 14, iasa: 9, jab: 'jab3', hits: [HB(3, 5, 44, -62, 18, 2.8, 75, 2.2, 1)] },
  jab3: { anim: 'to_pecho', dur: 32, capote: 1, hits: [HB(7, 10, 46, -76, 28, 7, 60, 7, 7.5)] },
  // estocada: la punta de la espada (lejos) es la que manda a volar; de cerca pega menos
  fsmash: { anim: 'to_estocada', dur: 56, chargeAt: 10, smash: 1, estoque: 1, hits: [HB(17, 19, 92, -64, 16, 18, 36, 8.5, 17.5, { sfx: 'bighit', effect: 'slash' }), HB(17, 19, 64, -64, 20, 12, 45, 6.5, 11, { vfx: 1 })] },
};
// el capote pega en todo el paño, no solo en la punta: cada golpe de capote lleva otra área
// pegada al cuerpo (la de la punta se alinea a donde queda el capote; esta se queda cerca)
CHAR_TWEAKS.puentin = set => {
  set.dsmash.capote = 1;
  for (const k in set) {
    const d = set[k], name = STYLE.puentin[k];
    if (!d || !d.hits || !d.hits.length || !name || !A2[name] || A2[name].limb !== 'capote') continue;
    d.hits = d.hits.concat(d.hits.filter(h => !h.vfx).map(h => Object.assign({}, h, { x: Math.min(h.x, 46), r: Math.max(h.r, 20), vfx: 1 })));
  }
};
KIT_TEMPO.puentin = { s: 0.95, a: 1.0, r: 1.0, dmg: 1.0, kb: 1.0, rad: 1.08 };

// ---------- animaciones ----------
Object.assign(A2, {
  to_flick: { limb: 'handF', w: { armF: [0.9, 0.9], armB: [-0.35, 2.3], lean: 0.02 }, h: { armF: [1.7, 0.15], lean: 0.25, legF: [0.55, -0.6], legB: [-0.45, -0.2] }, f: { armF: [1.9, 0.3] } },
  to_flick2: { limb: 'handF', w: { armF: [2.3, 0.4], armB: [-0.35, 2.3], lean: 0.18 }, h: { armF: [1.25, 0.1], lean: 0.35, legF: [0.6, -0.7], legB: [-0.45, -0.2] }, f: { armF: [0.95, 0.3] } },
  to_pecho: { limb: 'capote', w: { armF: [0.1, 0.4], armB: [-0.35, 2.3], lean: -0.1, face: 'angry' }, h: { armF: [2.3, 0.1], lean: -0.25, bodyY: -3, legF: [0.7, -0.6], legB: [-0.5, -0.2], face: 'angry' }, f: { armF: [2.7, 0.2], lean: -0.3 } },
  to_capote: { limb: 'capote', w: { armF: [-0.9, 0.5], armB: [1.2, 1.5], lean: -0.25 }, h: { armF: [1.6, 0.05], armB: [-0.35, 2.3], lean: 0.35, legF: [0.9, -0.9], legB: [-0.7, -0.2], face: 'angry' }, f: { armF: [2.2, 0.1], lean: 0.4 } },
  to_capoteAir: { limb: 'capote', air: 1, w: { armF: [-0.9, 0.5], armB: [1.2, 1.5], lean: -0.25, legF: [1.2, -1.6], legB: [0.4, -1.2] }, h: { armF: [1.6, 0.05], lean: 0.3, legF: [1.1, -1.4], legB: [0.3, -1.2], face: 'angry' }, f: { armF: [2.3, 0.1], lean: 0.35 } },
  to_molinete: { limb: 'capote', w: { armF: [0.8, 0.4], armB: [-0.35, 2.3], lean: 0.2, bodyY: 3 }, h: { armF: [2.6, 0.1], lean: -0.05, bodyY: -3, face: 'angry' }, x: { armF: [3.3, 0.05], lean: -0.2, bodyY: -5 }, f: { armF: [3.6, 0.1], lean: -0.15 } },
  to_lowCape: { limb: 'capote', base: 'crouch', w: { lean: 0.5, armF: [0.5, 0.6], legF: [1.3, -2.1], legB: [0.5, -1.9], bodyY: 8 }, h: { lean: 0.55, armF: [1.45, 0.05], bodyY: 10, legF: [1.35, -2.2], legB: [0.55, -2.0], face: 'angry' }, f: { armF: [1.6, 0.15] } },
  to_larga: { limb: 'capote', w: { lean: 0.4, armF: [0.2, 0.5], bodyY: 4 }, h: { lean: 0.2, armF: [1.8, 0.05], legF: [1.2, -1.0], legB: [-1.0, -0.3], bodyX: 8, face: 'angry' }, f: { armF: [2.3, 0.1], lean: 0.1 } },
  // estocada: apunta con la espada a la altura de los ojos y se tira a fondo
  to_estocada: { limb: 'estoque', heavy: 1, w: { armF: [2.35, -1.0], armB: [0.9, 1.2], lean: -0.28, bodyX: -6, legF: [0.7, -0.9], legB: [-0.5, -0.2], head: 0.15, face: 'angry' }, h: { armF: [1.55, 0.02], armB: [-0.4, 1.4], lean: 0.55, bodyX: 12, legF: [1.1, -0.8], legB: [-1.0, -0.05], face: 'angry' }, f: { armF: [1.5, 0.08], lean: 0.6, bodyX: 13 } },
  to_revolera: { limb: 'hands', spin: { turns: 1, from: 'w', to: 'h' }, w: { armF: [1.2, 0.3], armB: [-1.2, 0.3], lean: 0.1, bodyY: 3 }, h: { armF: [1.7, 0.1], armB: [-1.7, 0.1], legF: [0.6, -0.5], legB: [-0.6, -0.4], bodyY: 5, face: 'angry' } },
  // verónica: el capote abierto al frente, los pies juntos, la barbilla arriba
  to_veronica: { w: { armF: [1.2, 0.3], armB: [1.1, 0.4], lean: -0.1 }, h: { armF: [1.25, 0.12], armB: [1.15, 0.18], lean: -0.14, legF: [0.15, -0.1], legB: [-0.1, -0.05], head: 0.25 } },
  to_banderillas: { limb: 'handF', w: { armF: [2.9, 0.3], armB: [2.8, 0.35], lean: -0.2, bodyY: -2, legF: [0.9, -1.2], legB: [-0.3, -0.6] }, h: { armF: [1.9, 0.1], armB: [1.8, 0.15], lean: 0.45, bodyX: 6, legF: [1.0, -1.0], legB: [-0.8, -0.2], face: 'angry' }, f: { armF: [1.6, 0.2], armB: [1.5, 0.25], lean: 0.4 } },
  to_garrocha: { limb: 'feet', w: { armF: [1.2, 0.2], armB: [1.1, 0.3], lean: 0.35, bodyY: 5, legF: [1.1, -1.4], legB: [-0.3, -0.6] }, h: { armF: [3.0, 0.1], armB: [2.9, 0.15], lean: -0.15, legF: [0.9, -1.6], legB: [0.5, -1.3], face: 'happy' }, x: { armF: [3.1, 0.05], armB: [3.0, 0.1], lean: -0.3, legF: [1.6, -0.6], legB: [1.3, -0.8] }, f: { armF: [2.6, 0.4], lean: 0 } },
  to_faena: { w: { armF: [1.3, 0.2], armB: [-0.35, 2.3], lean: -0.12, head: 0.2 }, h: { armF: [1.35, 0.1], armB: [-0.35, 2.3], lean: -0.16, legF: [0.2, -0.1], legB: [-0.15, -0.05], head: 0.3, face: 'happy' } },
});
STYLE.puentin = {
  jab1: 'to_flick', jab2: 'to_flick2', jab3: 'to_pecho', ftilt: 'to_capote', utilt: 'to_molinete', dtilt: 'to_lowCape', dash: 'to_larga',
  fsmash: 'to_estocada', usmash: 'to_molinete', dsmash: 'to_revolera', nair: 'spinNair', fair: 'to_capoteAir', uair: 'to_molinete',
  sp_n: 'to_veronica', sp_s: 'to_banderillas', sp_u: 'to_garrocha', sp_d: 'to_revolera', sp_f: 'to_faena',
};
// torero: erguido, pecho fuera, el capote bajo al frente y la otra mano en la cadera
STANCES.torero = (t) => { const s = Math.sin(t * 1.8); return { bodyY: -Math.abs(s) * 0.8, lean: -0.06, armF: [0.55 + s * 0.04, 0.9], armB: [-0.35, 2.3], legF: [0.22, -0.2], legB: [-0.2, -0.12], head: -0.1 + s * 0.04 }; };
FIGHT_STYLE.puentin = 'torero';
RUN_STYLE.torero = { lean: 0.28, amp: 0.9 };
