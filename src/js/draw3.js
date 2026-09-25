'use strict';
// ============================================================
//  CUERPOS NUEVOS: Mariachi, Chupacabras, Dinomita (T-Rex),
//  Relámpago (luchador), Axo (ajolote) y Chilazo de cuerpo entero.
//  Cada uno cambia la silueta: sombrero y guitarra, espinas y garras,
//  cabezota con bracitos, capa y botas, branquias y cola con aleta.
// ============================================================
Object.assign(LOOKS, {
  mariachi: { species: 'mariachi', skin: '#c68b62', hair: '#1b1512', eye: '#2b1a10', lips: '#7a3e2c', top: '#17171b', top2: '#0b0b0e', garment: 'charro', sleeve: 'long',
    pants: '#17171b', studs: '#d9dde3', feet: 'boot', shoe: '#2b1d14', sole: '#120c08', heel: 1, accent: '#e9c46a', tie: '#c1121f', shirt: '#f4efe8',
    hat: '#1a1a1f', hatTrim: '#d9dde3', hatBand: '#e9c46a', back: 'guitar', mustache: '#1b1512',
    build: { chest: 18, waist: 12, arm: 1.0, leg: 1.0 }, prop: { leg: 1.0, torso: 1.02, arm: 1.02, head: 1.0 } },
  chupa: { species: 'chupa', skin: '#7d8c74', skin2: '#4f5c49', belly: '#a9b39b', eye: '#ff2d2d', spine: '#2f3a2c', top: '#7d8c74', top2: '#4f5c49', garment: 'chupa', sleeve: 'none',
    pants: '#6c7a64', hand: 'claw', claw: '#e9e4d4', feet: 'claw', back: 'spines', accent: '#ff2d2d', neckW: 6,
    tail: { kind: 'chupa', col: '#4f5c49', tip: '#2f3a2c' },
    build: { chest: 14, waist: 9, arm: 0.8, leg: 0.84 }, prop: { leg: 1.08, torso: 0.98, arm: 1.28, head: 1.05, neck: 1.25 } },
  dino: { species: 'dino', skin: '#4f8f5d', skin2: '#2f6b3d', belly: '#e7d8a8', stripe: '#2a5e36', eye: '#ffbe0b', teeth: '#f4efe8', top: '#4f8f5d', top2: '#2f6b3d', garment: 'scales', sleeve: 'none',
    pants: '#4f8f5d', scales: 1, hand: 'claw', claw: '#f4efe8', feet: 'claw', accent: '#ffbe0b', neckW: 17,
    tail: { kind: 'dino', col: '#4f8f5d', belly: '#e7d8a8', spot: '#2a5e36' },
    build: { chest: 22, waist: 18, arm: 0.95, leg: 1.42, belly: 1 }, prop: { leg: 0.9, torso: 0.95, arm: 0.52, head: 1.45, neck: 0.85 } },
  luchador: { species: 'luchador', skin: '#c98b62', hair: '#d62828', eye: '#2b1a10', lips: '#7a3e2c', mask: '#eef1f4', mask2: '#ffbe0b', maskTrim: '#d62828',
    top: '#c98b62', top2: '#a06a47', garment: 'bare', sleeve: 'none', pants: '#d62828', legCol: '#c98b62', trunks: '#d62828', bootH: 0.62, boot: '#eef1f4',
    feet: 'boot', shoe: '#eef1f4', sole: '#d62828', wrap: '#eef1f4', back: 'cape', cape: '#d62828', capeIn: '#ffbe0b', accent: '#ffbe0b',
    build: { chest: 23.5, waist: 13, arm: 1.25, leg: 1.12 }, prop: { leg: 1.02, torso: 1.06, arm: 1.08, head: 0.98, neck: 0.8 } },
  axo: { species: 'axo', skin: '#f2a7bb', skin2: '#d9829a', belly: '#fbd6de', gill: '#e0526f', gill2: '#ff8fab', eye: '#1b1418', top: '#f2a7bb', top2: '#d9829a', garment: 'axo', sleeve: 'none',
    pants: '#f2a7bb', hand: 'mitt', feet: 'web', bandana: '#2ec4b6', accent: '#2ec4b6', neckW: 12,
    tail: { kind: 'axo', col: '#f2a7bb', fin: 'rgba(255,196,210,.6)' },
    build: { chest: 15, waist: 14.5, arm: 0.95, leg: 0.95, belly: 1 }, prop: { leg: 0.78, torso: 0.9, arm: 0.86, head: 1.32, neck: 0.55 } },
});
// Chilazo ahora es un chile de pies a cabeza: el tronco y la cabeza son una sola pieza
Object.assign(LOOKS.chilazo, { plan: 'pepper', feet: 'boot', shoe: '#ffd166', sole: '#9d0208', bootH: 0.45, boot: '#ffd166', pants: '#2ec4b6',
  build: { chest: 19, waist: 15, arm: 0.95, leg: 0.92 }, prop: { leg: 0.92, torso: 1.0, arm: 1.0, head: 1.0 } });

// ---------- manos ----------
function drawHand2(c, L, x, y, a, k, col, OUT, back) {
  const dk = back ? -0.28 : 0, [dx, dy] = dirv(a);
  c.save(); c.translate(x + dx * 2, y + dy * 2); c.rotate(Math.atan2(dy, dx));
  const skin = shade(L.skin, dk);
  if (L.hand === 'claw') {
    const cl = shade(L.claw || '#efe6d2', dk);
    c.fillStyle = OUT; c.beginPath(); c.ellipse(1, 0, 6.4 * k + OUTW, 5.2 * k + OUTW, 0, 0, TAU); c.fill();
    c.fillStyle = skin; c.beginPath(); c.ellipse(1, 0, 6.4 * k, 5.2 * k, 0, 0, TAU); c.fill();
    c.lineJoin = 'round';
    for (const [oy, len] of [[-3.6, 1], [0, 1.18], [3.6, 0.92]]) {
      const l = 8.5 * k * len, y0 = oy * k;
      c.beginPath(); c.moveTo(4.5 * k, y0 - 1.9); c.quadraticCurveTo(4.5 * k + l * 0.75, y0 - 2.8, 4.5 * k + l, y0 + 2.4); c.quadraticCurveTo(4.5 * k + l * 0.5, y0 + 0.4, 4.5 * k, y0 + 1.9); c.closePath();
      c.strokeStyle = OUT; c.lineWidth = 1.6; c.stroke(); c.fillStyle = cl; c.fill();
    }
  } else if (L.hand === 'mitt') {
    // manita de ajolote: palma redonda y cuatro deditos
    c.fillStyle = OUT; c.beginPath(); c.ellipse(2, 0, 5.8 * k + OUTW, 5 * k + OUTW, 0, 0, TAU); c.fill();
    for (const oy of [-4, -1.4, 1.4, 4]) { c.beginPath(); c.ellipse(7.5 * k, oy * k, 3.1 * k + OUTW, 1.7 * k + OUTW, oy * 0.08, 0, TAU); c.fill(); }
    c.fillStyle = skin; c.beginPath(); c.ellipse(2, 0, 5.8 * k, 5 * k, 0, 0, TAU); c.fill();
    for (const oy of [-4, -1.4, 1.4, 4]) { c.beginPath(); c.ellipse(7.5 * k, oy * k, 3.1 * k, 1.7 * k, oy * 0.08, 0, TAU); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(1, -2, 2.5, 1.2, 0, 0, TAU); c.fill();
  }
  c.restore();
}

// ---------- pies ----------
function drawFoot2(c, L, x, y, rot, k, dk, OUT) {
  c.save(); c.translate(x, y); c.rotate(rot);
  const sw = 19 * k, sh = 9 * k;
  if (L.feet === 'boot') {
    // bota: charro con tacón y punta, luchador redonda con agujetas
    const col = shade(L.shoe, dk), sole = shade(L.sole, dk);
    const path = pad => { c.beginPath(); c.moveTo(-6 - pad, sh / 2 + pad); c.lineTo(-6.5 - pad, -sh / 2 - 3 - pad); c.lineTo(3, -sh / 2 - 2 - pad); c.quadraticCurveTo(sw - (L.heel ? 0 : 4), -sh / 2 + 1 - pad * 0.5, sw - (L.heel ? 2 : 5) + pad, sh / 2 + pad); c.closePath(); };
    path(OUTW); c.fillStyle = OUT; c.fill();
    const g = c.createLinearGradient(0, -sh / 2, 0, sh / 2); g.addColorStop(0, shade(col, 0.22)); g.addColorStop(0.6, col); g.addColorStop(1, shade(col, -0.3));
    path(0); c.fillStyle = g; c.fill();
    c.fillStyle = sole; c.fillRect(-6, sh / 2 - 2.4, sw - (L.heel ? 7 : 10), 2.4);
    if (L.heel) { c.fillStyle = OUT; c.fillRect(-6.8, sh / 2 - 1, 6.6, 4.4); c.fillStyle = sole; c.fillRect(-6, sh / 2 - 0.2, 5, 3.2); c.strokeStyle = withAlpha(L.studs || '#d9dde3', 0.8); c.lineWidth = 0.9; c.beginPath(); c.moveTo(0, -sh * 0.2); c.quadraticCurveTo(6, -sh * 0.45, 11, -sh * 0.05); c.stroke(); }
    else { c.strokeStyle = withAlpha(L.sole, 0.9); c.lineWidth = 1; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-1 + i * 3, -sh / 2 - 1); c.lineTo(1.5 + i * 3, -sh / 2 + 2); c.stroke(); } }
    c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(-4, -sh / 2 - 1, 5, 1.2);
  } else if (L.feet === 'claw') {
    // pie de reptil: tres dedos con garras
    const skin = shade(L.skin, dk), cl = shade(L.claw || '#efe6d2', dk);
    c.fillStyle = OUT; c.beginPath(); c.ellipse(3, 0, 10 * k + OUTW, 5 * k + OUTW, 0, 0, TAU); c.fill();
    c.fillStyle = skin; c.beginPath(); c.ellipse(3, 0, 10 * k, 5 * k, 0, 0, TAU); c.fill();
    for (const [oy, len] of [[-2.5, 1], [0.5, 1.15], [3.2, 0.9]]) {
      const x0 = 10 * k, y0 = oy * k, l = 7 * k * len;
      c.beginPath(); c.moveTo(x0, y0 - 2); c.quadraticCurveTo(x0 + l * 0.8, y0 - 2.2, x0 + l, y0 + 2.4); c.quadraticCurveTo(x0 + l * 0.4, y0 + 1, x0, y0 + 2); c.closePath();
      c.strokeStyle = OUT; c.lineWidth = 1.5; c.stroke(); c.fillStyle = cl; c.fill();
    }
    c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(3, sh * 0.3, 9 * k, 1.5, 0, 0, TAU); c.fill();
  } else if (L.feet === 'web') {
    // pata palmeada
    const skin = shade(L.skin, dk);
    c.fillStyle = OUT; c.beginPath(); c.ellipse(4, 1, 8.5 * k + OUTW, 4.5 * k + OUTW, 0, 0, TAU); c.fill();
    for (const oy of [-3, 0, 3]) { c.beginPath(); c.ellipse(11 * k, oy * k + 1, 3.3 * k + OUTW, 2 * k + OUTW, oy * 0.12, 0, TAU); c.fill(); }
    c.fillStyle = skin; c.beginPath(); c.ellipse(4, 1, 8.5 * k, 4.5 * k, 0, 0, TAU); c.fill();
    for (const oy of [-3, 0, 3]) { c.beginPath(); c.ellipse(11 * k, oy * k + 1, 3.3 * k, 2 * k, oy * 0.12, 0, TAU); c.fill(); }
  }
  c.restore();
}

// calzón de luchador, cañas de bota, botonadura de charro y escamas
function legExtras(c, L, hx, hy, p, T, S, dk) {
  if (L.trunks) { const mx = lerp(hx, p.ex, 0.36), my = lerp(hy, p.ey, 0.36); segFill(c, hx, hy, mx, my, T[0] + 1.5, T[0] + 1.2, T[1] + 1, shade(L.trunks, dk)); }
  if (L.bootH) {
    const t0 = 1 - L.bootH, bx = lerp(p.ex, p.fx, t0), by = lerp(p.ey, p.fy, t0);
    segFill(c, bx, by, p.fx, p.fy, S[1] + 1.6, S[1] + 1.2, S[2] + 1.6, shade(L.boot, dk));
    c.strokeStyle = withAlpha(shade(L.boot, -0.45 + dk), 0.8); c.lineWidth = 1.4; c.beginPath();
    const ux = p.fx - p.ex, uy = p.fy - p.ey, ul = Math.hypot(ux, uy) || 1, nx = -uy / ul, ny = ux / ul, w = (S[1] + 1.6) / 2;
    c.moveTo(bx - nx * w, by - ny * w); c.lineTo(bx + nx * w, by + ny * w); c.stroke();
    if (L.sole && L.species === 'luchador') { c.strokeStyle = shade(L.sole, dk); c.lineWidth = 1.1; for (let i = 1; i < 4; i++) { const t = t0 + (1 - t0) * i / 4.5, qx = lerp(p.ex, p.fx, t), qy = lerp(p.ey, p.fy, t); c.beginPath(); c.moveTo(qx - nx * 2.5, qy - ny * 2.5); c.lineTo(qx + nx * 2.5 + ux / ul * 2, qy + ny * 2.5 + uy / ul * 2); c.stroke(); } }
  }
  if (L.studs) {
    // botonadura de plata por el costado del pantalón
    const col = shade(L.studs, dk * 0.6);
    const seam = (x0, y0, x1, y1, n, off) => {
      const ux = x1 - x0, uy = y1 - y0, ul = Math.hypot(ux, uy) || 1, nx = -uy / ul, ny = ux / ul;
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, qx = lerp(x0, x1, t) - nx * off, qy = lerp(y0, y1, t) - ny * off; c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.arc(qx, qy, 1.9, 0, TAU); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(qx - 0.3, qy - 0.3, 1.4, 0, TAU); c.fill(); }
    };
    seam(hx, hy, p.ex, p.ey, 4, T[1] * 0.28); seam(p.ex, p.ey, p.fx, p.fy, 4, S[1] * 0.24);
  }
  if (L.scales) {
    c.strokeStyle = withAlpha(shade(L.skin, -0.45 + dk), 0.45); c.lineWidth = 1;
    for (let i = 0; i < 5; i++) { const t = 0.15 + i * 0.16, qx = lerp(hx, p.ex, t), qy = lerp(hy, p.ey, t); c.beginPath(); c.arc(qx + (i % 2 ? 3 : -3), qy, 3, 0.2, Math.PI - 0.2); c.stroke(); }
  }
}

// ---------- lo que va en la espalda: guitarra, capa, espinas, alas ----------
function drawBack2(c, L, pose, hx, hy, sx, sy, OUT, opt) {
  const cw = L.build.chest, T = SK.torso, t = performance.now();
  if (L.back === 'guitar' && !opt.guitarOut) {
    c.save(); c.translate(hx, hy); c.rotate(pose.lean); c.translate(-cw * 0.75, -T * 0.52); c.rotate(-0.62);
    drawGuitar(c, 0.9, OUT);
    c.restore();
  } else if (L.back === 'cape') {
    // capa que ondea hacia atrás (más con la velocidad)
    const sway = Math.sin(t / 260) * 4, fly = clamp(Math.abs(pose.lean) * 10, 0, 12);
    const x0 = sx - cw * 0.55, y0 = sy + 2, x1 = sx + cw * 0.1;
    const path = pad => { c.beginPath(); c.moveTo(x0 - pad, y0 - pad); c.lineTo(x1 + pad, y0 - pad); c.quadraticCurveTo(hx - 6, hy - 6, hx - 14 - fly + sway * 0.4 + pad, hy + 30 + pad); c.quadraticCurveTo(hx - 26 - fly + sway, hy + 36 + pad, hx - 38 - fly * 1.6 + sway * 1.3 - pad, hy + 22 + pad); c.quadraticCurveTo(x0 - 18 - fly, (y0 + hy) / 2, x0 - pad, y0 - pad); c.closePath(); };
    path(OUTW); c.fillStyle = OUT; c.fill();
    path(0); const g = c.createLinearGradient(x0, y0, hx - 30, hy + 30); g.addColorStop(0, shade(L.cape, -0.25)); g.addColorStop(0.5, L.cape); g.addColorStop(1, shade(L.cape, -0.35)); c.fillStyle = g; c.fill();
    c.save(); path(0); c.clip();
    c.strokeStyle = L.capeIn; c.lineWidth = 3; c.beginPath(); c.moveTo(hx - 14 - fly + sway * 0.4, hy + 30); c.quadraticCurveTo(hx - 26 - fly + sway, hy + 36, hx - 38 - fly * 1.6 + sway * 1.3, hy + 22); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 1.4; for (const k of [0.3, 0.6]) { c.beginPath(); c.moveTo(lerp(x0, x1, k), y0); c.quadraticCurveTo(hx - 10 - k * 14, hy, hx - 16 - k * 18 - fly + sway, hy + 30); c.stroke(); }
    c.restore();
  } else if (L.back === 'spines') {
    c.save(); c.translate(hx, hy); c.rotate(pose.lean);
    for (let i = 0; i < 6; i++) {
      const y = -T * (0.12 + i * 0.16), x = -cw * (0.72 + Math.sin(i * 0.9) * 0.06), len = 9 + (i === 3 || i === 4 ? 6 : 3) + Math.sin(i * 1.7) * 2;
      c.beginPath(); c.moveTo(x + 2, y - 5); c.lineTo(x - len, y - len * 0.55); c.lineTo(x + 2, y + 5); c.closePath();
      c.fillStyle = OUT; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
      c.beginPath(); c.moveTo(x + 1, y - 3.8); c.lineTo(x - len + 2, y - len * 0.55); c.lineTo(x + 1, y + 3.8); c.closePath();
      const g = c.createLinearGradient(x, y, x - len, y - len * 0.5); g.addColorStop(0, L.skin2); g.addColorStop(1, L.spine); c.fillStyle = g; c.fill();
    }
    c.restore();
  }
  // alas de murciélago del chupacabras (solo en su salto)
  const wing = pose.wing || 0;
  if (wing > 0.05) {
    const flap = Math.sin(t / 55) * 0.5 * wing;
    for (const [side, dk] of [[-1, -0.25], [1, 0]]) {
      c.save(); c.translate(sx - cw * 0.3, sy + 2); c.rotate(-0.5 + side * 0.25 - flap * side); c.scale(wing, wing);
      const path = pad => { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-18, -34 - pad, -52 - pad, -40 - pad); c.quadraticCurveTo(-44, -28, -50, -18); c.quadraticCurveTo(-38, -16, -40, -6); c.quadraticCurveTo(-26, -8, -24, 2 + pad); c.quadraticCurveTo(-12, -2, 0, 6 + pad); c.closePath(); };
      path(1.6); c.fillStyle = OUT; c.fill();
      path(0); c.fillStyle = shade(L.skin2, dk); c.fill();
      c.strokeStyle = withAlpha(L.spine, 0.9); c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, 0); c.lineTo(-52, -40); c.moveTo(-14, -10); c.lineTo(-50, -18); c.moveTo(-10, -4); c.lineTo(-40, -6); c.stroke();
      c.restore();
    }
  }
}
// guitarra (en la espalda o en la mano), el cuerpo centrado en (0,0) y el mástil hacia -y
function drawGuitar(c, k, OUT) {
  c.save(); c.scale(k, k);
  // mástil y clavijero
  c.fillStyle = OUT; c.fillRect(-3.4, -58, 6.8, 44); roundRect(c, -5, -70, 10, 14, 3); c.fill();
  c.fillStyle = '#5a3414'; c.fillRect(-2.2, -57, 4.4, 42); c.fillStyle = '#3a220d'; roundRect(c, -3.8, -68.5, 7.6, 11, 2); c.fill();
  c.fillStyle = '#d9dde3'; for (const y of [-66, -62, -58.5]) { c.beginPath(); c.arc(-4.5, y, 1.2, 0, TAU); c.arc(4.5, y, 1.2, 0, TAU); c.fill(); }
  c.strokeStyle = 'rgba(230,230,235,.55)'; c.lineWidth = 0.5; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 1.2, -57); c.lineTo(i * 1.4, 12); c.stroke(); }
  // caja en forma de ocho
  const body = pad => { c.beginPath(); c.ellipse(0, -8, 11 + pad, 10 + pad, 0, 0, TAU); c.ellipse(0, 10, 15 + pad, 13 + pad, 0, 0, TAU); };
  body(OUTW + 0.4); c.fillStyle = OUT; c.fill();
  const g = c.createLinearGradient(-15, 0, 15, 0); g.addColorStop(0, '#8a4f1d'); g.addColorStop(0.55, '#d08a38'); g.addColorStop(1, '#a8652a');
  body(0); c.fillStyle = g; c.fill();
  c.strokeStyle = '#f4efe8'; c.lineWidth = 1; c.beginPath(); c.ellipse(0, -8, 9.5, 8.5, 0, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(0, 10, 13.5, 11.5, 0, 0, TAU); c.stroke();
  c.fillStyle = '#1d120a'; c.beginPath(); c.arc(0, 0, 4.6, 0, TAU); c.fill();
  c.strokeStyle = '#e9c46a'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.stroke();
  c.fillStyle = '#3a220d'; c.fillRect(-6, 13, 12, 3);
  c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(-5, 4, 2, 7, 0.3, 0, TAU); c.fill();
  c.restore();
}

// ---------- cuerpo de una pieza: el chile ----------
function drawBodyPlan(c, id, L, pose, hx, hy, OUT, opt) {
  if (L.plan !== 'pepper') return;
  const T = SK.torso, H = T + SK.neck + SK.headRY * 1.9, W = L.build.chest, face = pose.face || 'normal';
  const wob = Math.sin(performance.now() / 300) * 0.6;
  c.save(); c.translate(hx, hy); c.rotate(pose.lean);
  const path = p => {
    c.beginPath();
    c.moveTo(0, -H - p);
    c.bezierCurveTo(W * 0.72 + p, -H - 1 - p, W * 1.02 + p, -H * 0.86, W * 1.04 + p, -H * 0.62);
    c.bezierCurveTo(W * 1.08 + p, -H * 0.3, W * 0.9 + p, -2, W * 0.5 + p, 10 + p * 0.5);
    c.quadraticCurveTo(W * 0.05, 22 + p, -W * 0.62 + wob, 27 + p);
    c.quadraticCurveTo(-W * 1.32 - p, 26 + p, -W * 1.18 - p, 12);
    c.bezierCurveTo(-W * 0.98 - p, 2, -W * 1.06 - p, -H * 0.32, -W * 1.0 - p, -H * 0.6);
    c.bezierCurveTo(-W * 0.98 - p, -H * 0.88, -W * 0.72 - p, -H - 1 - p, 0, -H - p);
    c.closePath();
  };
  path(OUTW + 0.3); c.fillStyle = OUT; c.fill();
  path(0);
  const g = c.createLinearGradient(-W * 1.1, 0, W * 1.1, 0);
  g.addColorStop(0, L.top2); g.addColorStop(0.45, L.skin); g.addColorStop(0.8, shade(L.skin, 0.14)); g.addColorStop(1, shade(L.skin, -0.06));
  c.fillStyle = g; c.fill();
  c.save(); path(0); c.clip();
  // volumen: sombra abajo, brillo encerado del chile y arrugas de la piel
  const g2 = c.createLinearGradient(0, -H, 0, 24); g2.addColorStop(0, 'rgba(255,255,255,.06)'); g2.addColorStop(0.65, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(40,0,0,.35)');
  c.fillStyle = g2; c.fillRect(-W * 1.4, -H - 4, W * 2.8, H + 34);
  c.fillStyle = 'rgba(255,255,255,.34)'; c.beginPath(); c.ellipse(W * 0.55, -H * 0.5, 2.6, H * 0.22, 0.12, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(W * 0.4, -H * 0.12, 1.6, H * 0.09, 0.3, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(80,0,0,.35)'; c.lineWidth = 1.2; c.lineCap = 'round';
  for (const [x, l] of [[-W * 0.45, 12], [-W * 0.1, 9], [W * 0.3, 11]]) { c.beginPath(); c.moveTo(x, -H + 2); c.quadraticCurveTo(x + 2, -H + l * 0.6, x - 1, -H + l); c.stroke(); }
  c.beginPath(); c.moveTo(-W * 0.8, -H * 0.3); c.quadraticCurveTo(-W * 0.5, -H * 0.1, -W * 0.7, 6); c.stroke();
  // antifaz de luchador a la altura de los ojos
  const ey = -H * 0.7;
  c.fillStyle = L.maskCol; c.beginPath(); c.moveTo(-W * 1.3, ey - 7); c.quadraticCurveTo(0, ey - 10, W * 1.3, ey - 8); c.lineTo(W * 1.3, ey + 6); c.quadraticCurveTo(0, ey + 4, -W * 1.3, ey + 5); c.closePath(); c.fill();
  c.fillStyle = L.maskTrim; c.beginPath(); c.moveTo(-W * 1.3, ey - 5); c.quadraticCurveTo(0, ey - 8, W * 1.3, ey - 6); c.lineTo(W * 1.3, ey + 3.5); c.quadraticCurveTo(0, ey + 1.5, -W * 1.3, ey + 2.8); c.closePath(); c.fill();
  // cinturón de campeón
  const by = -T * 0.16;
  c.fillStyle = '#10131a'; c.fillRect(-W * 1.3, by - 4.5, W * 2.6, 9);
  c.fillStyle = L.belt; c.fillRect(-W * 1.3, by - 3.5, W * 2.6, 7);
  c.restore();
  c.fillStyle = '#10131a'; roundRect(c, W * 0.18 - 8, by - 6.5, 16, 13, 3); c.fill();
  c.fillStyle = shade(L.belt, 0.15); roundRect(c, W * 0.18 - 6.5, by - 5, 13, 10, 2.5); c.fill();
  c.fillStyle = L.skin; c.beginPath(); c.arc(W * 0.18, by, 2.6, 0, TAU); c.fill();
  // ojos y bigote
  const angry = face === 'angry', hurt = face === 'hurt' || face === 'ko', happy = face === 'happy', sad = face === 'sad', out = face === 'ko' || face === 'dizzy';
  for (const ex of [W * 0.05, W * 0.62]) {
    c.fillStyle = L.maskCol; c.beginPath(); c.moveTo(ex - 6, ey); c.quadraticCurveTo(ex, ey - 8, ex + 6, ey - 0.5); c.quadraticCurveTo(ex + 1, ey + 6.5, ex - 6, ey); c.fill();
    if (out) { c.strokeStyle = '#10131a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(ex - 2.2, ey - 2.2); c.lineTo(ex + 2.2, ey + 1.8); c.moveTo(ex + 2.2, ey - 2.2); c.lineTo(ex - 2.2, ey + 1.8); c.stroke(); continue; }
    c.fillStyle = '#f4efe8'; c.beginPath(); c.ellipse(ex, ey - 0.5, 3.3, angry || hurt ? 1.4 : 2.4, 0, 0, TAU); c.fill();
    c.fillStyle = '#10131a'; c.beginPath(); c.ellipse(ex + 0.8, ey - 0.5, 1.4, angry || hurt ? 1.2 : 1.7, 0, 0, TAU); c.fill();
  }
  if (angry) { c.strokeStyle = '#10131a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-W * 0.35, ey - 7); c.lineTo(W * 0.3, ey - 4); c.moveTo(W * 0.4, ey - 4); c.lineTo(W * 1.0, ey - 7.5); c.stroke(); }
  const my = ey + 12, mx = W * 0.38;
  c.fillStyle = '#10131a'; c.beginPath(); c.moveTo(mx - 9, my - 1); c.quadraticCurveTo(mx - 4, my - 6, mx, my - 3.5); c.quadraticCurveTo(mx + 4, my - 6, mx + 9, my - 1); c.quadraticCurveTo(mx + 4, my - 2.5, mx, my - 1.5); c.quadraticCurveTo(mx - 4, my - 2.5, mx - 9, my - 1); c.fill();
  c.strokeStyle = L.lips; c.lineWidth = 1.7; c.beginPath();
  if (hurt) { c.fillStyle = '#3a0a0a'; c.ellipse(mx, my + 3, 2.8, 2.4, 0, 0, TAU); c.fill(); }
  else if (happy || angry) { c.fillStyle = '#3a0a0a'; c.moveTo(mx - 4, my + 1); c.quadraticCurveTo(mx, my + (angry ? 4 : 6), mx + 4, my + 1); c.closePath(); c.fill(); if (angry) { c.fillStyle = '#f4efe8'; c.fillRect(mx - 3, my + 1, 6, 1.4); } }
  else { c.moveTo(mx - 3.5, my + 2); c.quadraticCurveTo(mx, my + (sad ? 0.5 : 3.6), mx + 3.5, my + 1.8); c.stroke(); }
  // cáliz verde y rabito
  c.strokeStyle = OUT; c.lineWidth = 6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-1, -H - 2); c.quadraticCurveTo(-3, -H - 16, -14, -H - 18 + wob); c.stroke();
  c.strokeStyle = L.stem2; c.lineWidth = 3.4; c.stroke();
  c.fillStyle = OUT; c.beginPath(); for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI, r = i % 2 ? 8 : 15; c.lineTo(Math.cos(a) * r * 1.1, -H + 3 + Math.sin(a) * r * 0.42); } c.closePath(); c.fill();
  c.fillStyle = L.stem; c.beginPath(); for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI, r = i % 2 ? 6.5 : 13.5; c.lineTo(Math.cos(a) * r * 1.05, -H + 3 + Math.sin(a) * r * 0.38); } c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(4, -H - 1, 5, 1.4, 0, 0, TAU); c.fill();
  c.restore();
}

// ---------- cabezas nuevas ----------
const HEADS3 = {
  mariachi(c, L, face, OUT) {
    const RX = SK.headRX, RY = SK.headRY;
    drawToonHead(c, null, L, face, OUT, (cc) => {
      // patillas y pelo bajo el sombrero
      cc.fillStyle = L.hair; cc.fillRect(-RX, -RY, RX * 2, RY * 0.42);
      cc.beginPath(); cc.moveTo(-RX * 0.35, -RY * 0.6); cc.lineTo(-RX * 0.05, -RY * 0.6); cc.lineTo(-RX * 0.12, RY * 0.15); cc.lineTo(-RX * 0.3, RY * 0.15); cc.closePath(); cc.fill();
    });
    // bigotazo
    const my = RY * 0.36, mx = RX * 0.4;
    c.fillStyle = OUT; c.beginPath(); c.moveTo(mx - 9.5, my + 3.5); c.quadraticCurveTo(mx - 6, my - 4, mx, my - 1.5); c.quadraticCurveTo(mx + 6, my - 4, mx + 10, my + 3.5); c.quadraticCurveTo(mx + 5, my + 1.5, mx, my + 1.5); c.quadraticCurveTo(mx - 5, my + 1.5, mx - 9.5, my + 3.5); c.fill();
    c.fillStyle = L.mustache; c.beginPath(); c.moveTo(mx - 8.5, my + 2.4); c.quadraticCurveTo(mx - 5.5, my - 3, mx, my - 0.8); c.quadraticCurveTo(mx + 5.5, my - 3, mx + 9, my + 2.4); c.quadraticCurveTo(mx + 5, my + 0.6, mx, my + 0.8); c.quadraticCurveTo(mx - 5, my + 0.6, mx - 8.5, my + 2.4); c.fill();
    // sombrero de charro: copa alta, ala ancha levantada en las orillas y bordado de plata
    // (en su recuperación sube sobre la cabeza y gira como hélice)
    const hat = (DRAW_POSE && DRAW_POSE.hat) || 0;
    c.save();
    if (hat > 0.05) { c.translate(0, -hat * RY * 1.5); c.scale(0.3 + 0.7 * Math.abs(Math.cos(performance.now() / 45)), 1); }
    const by = -RY * 0.62;
    const brim = pad => { c.beginPath(); c.moveTo(-RX * 2.75 - pad, by - 6); c.quadraticCurveTo(-RX * 2.4, by + 5 + pad, 0, by + 5.5 + pad); c.quadraticCurveTo(RX * 2.4, by + 5 + pad, RX * 2.75 + pad, by - 6); c.quadraticCurveTo(RX * 2.2, by - 1 - pad, 0, by - 3 - pad); c.quadraticCurveTo(-RX * 2.2, by - 1 - pad, -RX * 2.75 - pad, by - 6); c.closePath(); };
    const crown = pad => { c.beginPath(); c.moveTo(-RX * 0.95 - pad, by - 1); c.bezierCurveTo(-RX * 1.05 - pad, -RY * 1.7 - pad, RX * 0.95 + pad, -RY * 1.75 - pad, RX * 0.9 + pad, by - 1); c.closePath(); };
    crown(1.6); c.fillStyle = OUT; c.fill(); brim(1.6); c.fill();
    const gc = c.createLinearGradient(-RX, 0, RX, 0); gc.addColorStop(0, shade(L.hat, -0.2)); gc.addColorStop(0.65, shade(L.hat, 0.25)); gc.addColorStop(1, L.hat);
    crown(0); c.fillStyle = gc; c.fill();
    brim(0); const gb = c.createLinearGradient(0, by - 6, 0, by + 6); gb.addColorStop(0, shade(L.hat, 0.3)); gb.addColorStop(1, shade(L.hat, -0.1)); c.fillStyle = gb; c.fill();
    c.fillStyle = L.hatBand; c.beginPath(); c.moveTo(-RX * 0.97, by - 1); c.quadraticCurveTo(0, by - 4.5, RX * 0.92, by - 1); c.lineTo(RX * 0.9, by - 5); c.quadraticCurveTo(0, by - 8.5, -RX * 0.96, by - 5); c.closePath(); c.fill();
    c.strokeStyle = L.hatTrim; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(-RX * 2.6, by - 5); c.quadraticCurveTo(-RX * 2.25, by + 3.6, 0, by + 4); c.quadraticCurveTo(RX * 2.25, by + 3.6, RX * 2.6, by - 5); c.stroke();
    for (let i = -3; i <= 3; i++) { const x = i * RX * 0.62; c.beginPath(); c.arc(x, by + 1.5 - Math.abs(i) * 0.4, 1.6, 0, Math.PI); c.stroke(); }
    c.beginPath(); c.moveTo(-RX * 0.5, -RY * 1.2); c.quadraticCurveTo(0, -RY * 1.45, RX * 0.45, -RY * 1.2); c.stroke();
    c.fillStyle = L.hatTrim; for (const x of [-RX * 0.5, 0, RX * 0.45]) { c.beginPath(); c.arc(x, -RY * 1.02, 1.2, 0, TAU); c.fill(); }
    c.restore();
    // barbiquejo
    if (hat <= 0.05) { c.strokeStyle = 'rgba(217,221,227,.7)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(-RX * 0.62, by + 4); c.quadraticCurveTo(-RX * 0.2, RY * 0.9, RX * 0.35, RY * 0.95); c.stroke(); }
  },
  luchador(c, L, face, OUT) {
    const RX = SK.headRX, RY = SK.headRY;
    drawToonHead(c, null, L, face, OUT, (cc) => {
      cc.fillStyle = L.mask; cc.fillRect(-RX * 1.3, -RY * 1.3, RX * 2.6, RY * 2.6);
      // boca descubierta
      cc.fillStyle = L.skin; cc.beginPath(); cc.ellipse(RX * 0.35, RY * 0.58, RX * 0.42, RY * 0.3, 0, 0, TAU); cc.fill();
      // rayo dorado en la frente y a los lados
      cc.fillStyle = L.mask2; cc.beginPath(); cc.moveTo(RX * 0.25, -RY * 1.05); cc.lineTo(-RX * 0.2, -RY * 0.42); cc.lineTo(RX * 0.12, -RY * 0.42); cc.lineTo(-RX * 0.25, RY * 0.05); cc.lineTo(RX * 0.55, -RY * 0.55); cc.lineTo(RX * 0.22, -RY * 0.55); cc.lineTo(RX * 0.6, -RY * 1.05); cc.closePath(); cc.fill();
      cc.beginPath(); cc.moveTo(-RX * 0.95, -RY * 0.5); cc.lineTo(-RX * 0.55, -RY * 0.2); cc.lineTo(-RX * 0.8, -RY * 0.1); cc.lineTo(-RX * 0.4, RY * 0.3); cc.lineTo(-RX * 0.95, 0); cc.closePath(); cc.fill();
      // ribetes rojos de los ojos
      cc.fillStyle = L.maskTrim;
      for (const ex of [RX * 0.05, RX * 0.6]) { cc.beginPath(); cc.moveTo(ex - 5.5, -RY * 0.06); cc.quadraticCurveTo(ex, -RY * 0.55, ex + 5.8, -RY * 0.12); cc.quadraticCurveTo(ex + 1, RY * 0.32, ex - 5.5, -RY * 0.06); cc.fill(); }
      // agujetas en la nuca
      cc.strokeStyle = '#10131a'; cc.lineWidth = 0.9; for (let i = 0; i < 4; i++) { const y = -RY * 0.3 + i * 4; cc.beginPath(); cc.moveTo(-RX * 0.98, y); cc.lineTo(-RX * 0.78, y + 2); cc.moveTo(-RX * 0.98, y + 2); cc.lineTo(-RX * 0.78, y); cc.stroke(); }
    });
  },
  dino(c, L, face, OUT) {
    const RX = SK.headRX, RY = SK.headRY, P = DRAW_POSE || {};
    const angry = face === 'angry', hurt = face === 'hurt' || face === 'ko', out = face === 'ko' || face === 'dizzy';
    const jaw = clamp((P.jaw || 0) + (angry ? 0.35 : 0) + (hurt ? 0.5 : 0), 0, 1) * 0.55;
    // mandíbula de abajo (gira desde la bisagra)
    c.save(); c.translate(-RX * 0.35, RY * 0.25); c.rotate(jaw);
    const lower = pad => { c.beginPath(); c.moveTo(-pad, -3 - pad); c.lineTo(RX * 1.85 + pad, -1 - pad); c.quadraticCurveTo(RX * 2.05 + pad, 4, RX * 1.7, 7 + pad); c.quadraticCurveTo(RX * 0.8, 11 + pad, -2 - pad, 7 + pad); c.closePath(); };
    lower(1.6); c.fillStyle = OUT; c.fill(); lower(0); c.fillStyle = L.skin2; c.fill();
    c.fillStyle = L.belly; c.beginPath(); c.moveTo(2, 5); c.quadraticCurveTo(RX, 10, RX * 1.7, 5); c.lineTo(RX * 1.6, 7); c.quadraticCurveTo(RX, 11, 2, 7); c.fill();
    if (jaw > 0.05) { c.fillStyle = '#7a1d2a'; c.beginPath(); c.moveTo(2, -2); c.lineTo(RX * 1.7, -0.5); c.lineTo(RX * 1.5, 3); c.lineTo(3, 3); c.closePath(); c.fill(); }
    c.fillStyle = L.teeth; for (let i = 0; i < 6; i++) { const x = RX * 0.35 + i * RX * 0.24; c.beginPath(); c.moveTo(x, -1.5); c.lineTo(x + 2.2, -1.5); c.lineTo(x + 1.1, -5.5); c.closePath(); c.fill(); }
    c.restore();
    // cráneo con hocico largo
    const skull = pad => { c.beginPath(); c.moveTo(-RX * 0.9 - pad, RY * 0.35); c.bezierCurveTo(-RX * 1.05 - pad, -RY * 0.75 - pad, -RX * 0.1, -RY * 0.95 - pad, RX * 0.7, -RY * 0.72 - pad); c.quadraticCurveTo(RX * 1.9 + pad, -RY * 0.5 - pad, RX * 2.05 + pad, -RY * 0.02); c.quadraticCurveTo(RX * 2.1 + pad, RY * 0.3 + pad, RX * 1.8, RY * 0.35 + pad); c.lineTo(-RX * 0.35, RY * 0.4 + pad); c.quadraticCurveTo(-RX * 0.7, RY * 0.55 + pad, -RX * 0.9 - pad, RY * 0.35); c.closePath(); };
    skull(1.8); c.fillStyle = OUT; c.fill();
    skull(0); const g = c.createLinearGradient(0, -RY, 0, RY * 0.4); g.addColorStop(0, shade(L.skin, 0.18)); g.addColorStop(0.6, L.skin); g.addColorStop(1, L.skin2); c.fillStyle = g; c.fill();
    c.save(); skull(0); c.clip();
    c.fillStyle = withAlpha(L.stripe, 0.7); for (const [x, y, r] of [[-RX * 0.5, -RY * 0.35, 3.4], [-RX * 0.1, -RY * 0.62, 2.6], [RX * 0.6, -RY * 0.6, 2.2], [-RX * 0.7, RY * 0.05, 2.4]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
    c.restore();
    // dientes de arriba
    c.fillStyle = L.teeth; for (let i = 0; i < 6; i++) { const x = RX * 0.3 + i * RX * 0.25; c.beginPath(); c.moveTo(x, RY * 0.36); c.lineTo(x + 2.4, RY * 0.36); c.lineTo(x + 1.2, RY * 0.36 + 4.2); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 0.5; c.stroke(); }
    // fosa nasal, ceja ósea y ojo
    c.fillStyle = shade(L.skin2, -0.4); c.beginPath(); c.ellipse(RX * 1.8, -RY * 0.18, 1.8, 1.1, 0.3, 0, TAU); c.fill();
    const ex = RX * 0.35, ey = -RY * 0.35;
    c.fillStyle = shade(L.skin, -0.25); c.beginPath(); c.moveTo(ex - 6, ey - 3); c.quadraticCurveTo(ex, ey - (angry ? 5 : 8), ex + 7, ey - (angry ? 1 : 4)); c.lineTo(ex + 7, ey - 1); c.quadraticCurveTo(ex, ey - 4, ex - 6, ey - 1); c.fill();
    if (out) { c.strokeStyle = '#10131a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(ex - 2.5, ey - 1); c.lineTo(ex + 2.5, ey + 3); c.moveTo(ex + 2.5, ey - 1); c.lineTo(ex - 2.5, ey + 3); c.stroke(); }
    else {
      c.fillStyle = '#10131a'; c.beginPath(); c.ellipse(ex, ey + 1, 3.6, angry ? 2.4 : 3.2, 0, 0, TAU); c.fill();
      c.fillStyle = L.eye; c.beginPath(); c.ellipse(ex + 0.4, ey + 1, 2.8, angry ? 1.8 : 2.5, 0, 0, TAU); c.fill();
      c.fillStyle = '#10131a'; c.fillRect(ex, ey - 1, 1.2, 4);
      c.fillStyle = '#fff'; c.fillRect(ex + 1.2, ey - 0.5, 1, 1);
    }
  },
  chupa(c, L, face, OUT) {
    const RX = SK.headRX, RY = SK.headRY;
    const angry = face === 'angry', hurt = face === 'hurt' || face === 'ko', out = face === 'ko' || face === 'dizzy';
    // espinas de la cabeza hacia atrás
    for (let i = 0; i < 4; i++) {
      const x = -RX * (0.1 + i * 0.3), y = -RY * (0.88 - i * 0.18), len = 9 - i;
      c.beginPath(); c.moveTo(x + 3, y + 1); c.lineTo(x - len, y - len * 0.7); c.lineTo(x - 3, y + 3); c.closePath(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke(); c.fillStyle = L.spine; c.fill();
    }
    // oreja puntiaguda
    c.beginPath(); c.moveTo(-RX * 0.55, -RY * 0.25); c.lineTo(-RX * 1.7, -RY * 0.95); c.lineTo(-RX * 0.75, RY * 0.15); c.closePath(); c.strokeStyle = OUT; c.lineWidth = 2.4; c.stroke(); c.fillStyle = L.skin2; c.fill();
    c.fillStyle = '#b86a6a'; c.beginPath(); c.moveTo(-RX * 0.7, -RY * 0.2); c.lineTo(-RX * 1.45, -RY * 0.78); c.lineTo(-RX * 0.8, RY * 0.02); c.closePath(); c.fill();
    // cráneo alargado con hocico
    const skull = pad => { c.beginPath(); c.moveTo(-RX * 0.95 - pad, RY * 0.15); c.bezierCurveTo(-RX * 1.05 - pad, -RY * 1.05 - pad, RX * 0.6, -RY * 1.1 - pad, RX * 0.95 + pad, -RY * 0.35); c.quadraticCurveTo(RX * 1.55 + pad, -RY * 0.1, RX * 1.5 + pad, RY * 0.3); c.quadraticCurveTo(RX * 1.2, RY * 0.75 + pad, RX * 0.4, RY * 0.8 + pad); c.quadraticCurveTo(-RX * 0.6, RY * 0.85 + pad, -RX * 0.95 - pad, RY * 0.15); c.closePath(); };
    skull(1.7); c.fillStyle = OUT; c.fill();
    skull(0); const g = c.createLinearGradient(-RX, -RY, RX, RY); g.addColorStop(0, L.skin2); g.addColorStop(0.55, L.skin); g.addColorStop(1, shade(L.skin, -0.15)); c.fillStyle = g; c.fill();
    c.strokeStyle = withAlpha(L.skin2, 0.8); c.lineWidth = 1; for (const y of [-RY * 0.45, -RY * 0.3]) { c.beginPath(); c.moveTo(RX * 0.9, y); c.quadraticCurveTo(RX * 1.1, y + 2, RX * 1.3, y + 5); c.stroke(); }
    // ojos rojos brillantes
    const ex = RX * 0.4, ey = -RY * 0.3;
    if (out) { c.strokeStyle = '#10131a'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(ex - 3, ey - 2); c.lineTo(ex + 3, ey + 2); c.moveTo(ex + 3, ey - 2); c.lineTo(ex - 3, ey + 2); c.stroke(); }
    else {
      const gl = c.createRadialGradient(ex, ey, 0.5, ex, ey, 11); gl.addColorStop(0, withAlpha(L.eye, 0.55)); gl.addColorStop(1, withAlpha(L.eye, 0));
      c.fillStyle = gl; c.beginPath(); c.arc(ex, ey, 11, 0, TAU); c.fill();
      c.fillStyle = '#10131a'; c.beginPath(); c.ellipse(ex, ey, 5.8, angry || hurt ? 2.6 : 3.8, -0.25, 0, TAU); c.fill();
      c.fillStyle = L.eye; c.beginPath(); c.ellipse(ex, ey, 4.8, angry || hurt ? 1.8 : 3, -0.25, 0, TAU); c.fill();
      c.fillStyle = '#10131a'; c.beginPath(); c.ellipse(ex + 0.8, ey, 0.9, angry ? 1.6 : 2.6, -0.25, 0, TAU); c.fill();
      c.fillStyle = '#fff5f5'; c.fillRect(ex + 1.8, ey - 1.6, 1.2, 1.2);
    }
    // boca con colmillos
    c.strokeStyle = '#1b1f1a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(RX * 0.35, RY * 0.4); c.quadraticCurveTo(RX * 0.9, RY * (hurt ? 0.6 : 0.5), RX * 1.4, RY * 0.32); c.stroke();
    c.fillStyle = '#f4efe8'; for (const x of [RX * 0.75, RX * 1.15]) { c.beginPath(); c.moveTo(x - 1.6, RY * 0.43); c.lineTo(x + 1.6, RY * 0.43); c.lineTo(x, RY * 0.43 + 5); c.closePath(); c.fill(); }
    c.fillStyle = '#1b1f1a'; c.beginPath(); c.ellipse(RX * 1.42, RY * 0.02, 1.2, 0.8, 0, 0, TAU); c.fill();
  },
  axo(c, L, face, OUT) {
    const RX = SK.headRX, RY = SK.headRY, t = performance.now();
    const angry = face === 'angry', hurt = face === 'hurt' || face === 'ko', happy = face === 'happy', out = face === 'ko' || face === 'dizzy';
    // branquias: tres ramas plumosas de cada lado (las de atrás más oscuras)
    const gill = (x, y, a, len, col, dk) => {
      const sw = Math.sin(t / 280 + a * 3) * 0.12;
      c.save(); c.translate(x, y); c.rotate(a + sw);
      c.strokeStyle = OUT; c.lineWidth = 5.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-len * 0.5, -3, -len, -1); c.stroke();
      c.strokeStyle = shade(col, dk); c.lineWidth = 3.2; c.stroke();
      c.strokeStyle = shade(L.gill2, dk); c.lineWidth = 1.6;
      for (let i = 1; i <= 5; i++) { const px = -len * i / 5.5, py = -1.5 * i / 5; c.beginPath(); c.moveTo(px, py); c.lineTo(px - 2.5, py - 4.5); c.moveTo(px, py); c.lineTo(px - 2.5, py + 3.5); c.stroke(); }
      c.restore();
    };
    for (const [a, len] of [[1.2, 19], [0.5, 18], [-0.2, 16]]) gill(-RX * 0.9, -RY * 0.12, a, len, L.gill, -0.3);
    // cabezota ancha y plana
    const head = pad => { c.beginPath(); c.ellipse(RX * 0.15, 0, RX * 1.3 + pad, RY * 0.78 + pad, 0, 0, TAU); };
    head(1.7); c.fillStyle = OUT; c.fill();
    head(0); const g = c.createLinearGradient(0, -RY, 0, RY); g.addColorStop(0, shade(L.skin, 0.12)); g.addColorStop(0.6, L.skin); g.addColorStop(1, L.skin2); c.fillStyle = g; c.fill();
    c.save(); head(0); c.clip();
    c.fillStyle = withAlpha(L.skin2, 0.5); for (const [x, y] of [[-RX * 0.6, -RY * 0.45], [-RX * 0.2, -RY * 0.6], [RX * 0.3, -RY * 0.55], [-RX * 0.8, RY * 0.1]]) { c.beginPath(); c.arc(x, y, 1.4, 0, TAU); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.ellipse(RX * 0.3, -RY * 0.5, RX * 0.7, RY * 0.16, -0.1, 0, TAU); c.fill();
    c.restore();
    for (const [a, len] of [[0.95, 23], [0.25, 22], [-0.45, 20]]) gill(-RX * 0.95, -RY * 0.02, a, len, L.gill, 0);
    // ojitos negros y sonrisa ancha
    const ey = -RY * 0.18;
    for (const ex of [RX * 0.25, RX * 1.05]) {
      if (out) { c.strokeStyle = '#1b1418'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(ex - 2, ey - 2); c.lineTo(ex + 2, ey + 2); c.moveTo(ex + 2, ey - 2); c.lineTo(ex - 2, ey + 2); c.stroke(); continue; }
      if (happy) { c.strokeStyle = '#1b1418'; c.lineWidth = 1.8; c.beginPath(); c.arc(ex, ey + 1.5, 2.6, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); continue; }
      c.fillStyle = '#1b1418'; c.beginPath(); c.ellipse(ex, ey, 2.4, angry || hurt ? 1.5 : 2.6, 0, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + 0.8, ey - 0.9, 0.8, 0, TAU); c.fill();
    }
    if (angry) { c.strokeStyle = '#1b1418'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(RX * 0.0, ey - 4.5); c.lineTo(RX * 0.5, ey - 3); c.moveTo(RX * 0.8, ey - 3); c.lineTo(RX * 1.3, ey - 4.5); c.stroke(); }
    c.fillStyle = 'rgba(224,82,111,.35)'; c.beginPath(); c.ellipse(RX * 0.95, RY * 0.22, 3.4, 1.8, 0, 0, TAU); c.fill();
    c.strokeStyle = '#7a2d3e'; c.lineWidth = 1.5; c.beginPath();
    if (hurt) { c.fillStyle = '#5a1f2c'; c.ellipse(RX * 0.75, RY * 0.35, 2.6, 2, 0, 0, TAU); c.fill(); }
    else { c.moveTo(RX * 0.1, RY * 0.2); c.quadraticCurveTo(RX * 0.75, RY * (angry ? 0.35 : 0.55), RX * 1.4, RY * 0.18); c.stroke(); }
  },
};
const _creatureHead0 = drawCreatureHead;
drawCreatureHead = function (c, L, face, OUT) {
  if (HEADS3[L.species]) return HEADS3[L.species](c, L, face, OUT);
  return _creatureHead0(c, L, face, OUT);
};

// ---------- trajes nuevos ----------
const _garment0 = drawGarment2;
drawGarment2 = function (c, L, cw, ww, T) {
  switch (L.garment) {
    case 'charro': {
      // saco corto de charro: camisa blanca, moño rojo y greca de plata
      c.fillStyle = L.shirt; c.beginPath(); c.moveTo(-3, -T - 2); c.lineTo(10, -T - 2); c.lineTo(6, -T * 0.48); c.lineTo(1, -T * 0.48); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(3.5, -T * 0.9); c.lineTo(3.5, -T * 0.5); c.stroke();
      c.strokeStyle = L.studs; c.lineWidth = 1.2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-3, -T - 1); c.quadraticCurveTo(-5, -T * 0.7, 0, -T * 0.45); c.moveTo(10, -T - 1); c.quadraticCurveTo(12, -T * 0.7, 7, -T * 0.45); c.stroke();
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const x = 3.5 + s * (8 + i * 1.5), y = -T * (0.78 - i * 0.14); c.beginPath(); c.arc(x, y, 2.2, s > 0 ? Math.PI : 0, s > 0 ? TAU : Math.PI); c.stroke(); }
      c.fillStyle = L.studs; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-4.5, -T * (0.62 - i * 0.14), 1.3, 0, TAU); c.fill(); c.beginPath(); c.arc(11.5, -T * (0.62 - i * 0.14), 1.3, 0, TAU); c.fill(); }
      // faja y cinturón
      c.fillStyle = '#0b0b0e'; c.fillRect(-ww - 2, -T * 0.2, ww * 2 + 4, T * 0.2 + 3);
      c.fillStyle = shade(L.accent, -0.1); c.fillRect(-ww - 2, -T * 0.2, ww * 2 + 4, 3);
      c.fillStyle = L.studs; roundRect(c, 1, -T * 0.15, 6, 5, 1.5); c.fill();
      // moño
      c.fillStyle = '#10131a'; c.beginPath(); c.moveTo(3.5, -T - 1); c.lineTo(-5.5, -T - 6.5); c.lineTo(-5.5, -T + 5); c.closePath(); c.fill(); c.beginPath(); c.moveTo(3.5, -T - 1); c.lineTo(12.5, -T - 6.5); c.lineTo(12.5, -T + 5); c.closePath(); c.fill();
      c.fillStyle = L.tie; c.beginPath(); c.moveTo(3.5, -T - 1); c.lineTo(-4.5, -T - 5.5); c.lineTo(-4.5, -T + 4); c.closePath(); c.fill(); c.beginPath(); c.moveTo(3.5, -T - 1); c.lineTo(11.5, -T - 5.5); c.lineTo(11.5, -T + 4); c.closePath(); c.fill();
      c.fillStyle = shade(L.tie, -0.3); c.beginPath(); c.arc(3.5, -T - 1, 2.2, 0, TAU); c.fill();
      break;
    }
    case 'bare': {
      // pecho y abdomen de luchador
      c.strokeStyle = withAlpha(shade(L.skin, -0.55), 0.55); c.lineWidth = 1.3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-cw * 0.75, -T * 0.66); c.quadraticCurveTo(-cw * 0.2, -T * 0.52, cw * 0.1, -T * 0.64); c.quadraticCurveTo(cw * 0.5, -T * 0.52, cw * 0.95, -T * 0.66); c.stroke();
      c.beginPath(); c.moveTo(cw * 0.1, -T * 0.6); c.lineTo(cw * 0.1, -T * 0.08); c.stroke();
      for (const y of [-T * 0.44, -T * 0.3, -T * 0.16]) { c.beginPath(); c.moveTo(-ww * 0.4, y); c.quadraticCurveTo(cw * 0.1, y + 2, ww * 0.75, y); c.stroke(); }
      c.beginPath(); c.moveTo(-ww * 0.9, -T * 0.5); c.quadraticCurveTo(-ww * 0.6, -T * 0.25, -ww * 0.75, -T * 0.02); c.moveTo(ww * 0.95, -T * 0.5); c.quadraticCurveTo(ww * 0.8, -T * 0.25, ww * 0.9, -T * 0.02); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.14)'; c.beginPath(); c.ellipse(cw * 0.5, -T * 0.78, cw * 0.35, T * 0.08, -0.1, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.1)'; for (const x of [-ww * 0.1, ww * 0.35]) for (const y of [-T * 0.37, -T * 0.23]) { c.beginPath(); c.ellipse(x, y, 3, 2, 0, 0, TAU); c.fill(); }
      break;
    }
    case 'scales': {
      // panza de placas y lomo moteado
      c.fillStyle = L.belly; c.beginPath(); c.moveTo(cw * 0.05, -T - 2); c.quadraticCurveTo(cw * 1.1, -T * 0.6, ww * 0.95, 2); c.lineTo(ww * 0.05, 2); c.quadraticCurveTo(cw * 0.35, -T * 0.5, cw * 0.05, -T - 2); c.fill();
      c.strokeStyle = withAlpha(shade(L.belly, -0.4), 0.7); c.lineWidth = 1;
      for (let i = 1; i < 7; i++) { const y = -T + i * T / 7; c.beginPath(); c.moveTo(cw * 0.2, y); c.quadraticCurveTo(cw * 0.6, y + 2, cw * 1.0, y - 1); c.stroke(); }
      c.fillStyle = withAlpha(L.stripe, 0.75); for (const [x, y, r] of [[-cw * 0.6, -T * 0.8, 3.5], [-cw * 0.75, -T * 0.45, 4], [-cw * 0.4, -T * 0.2, 3], [-cw * 0.2, -T * 0.65, 2.4]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
      break;
    }
    case 'chupa': {
      // costillas marcadas y pelaje ralo
      c.fillStyle = L.belly; c.beginPath(); c.moveTo(cw * 0.2, -T); c.quadraticCurveTo(cw * 0.95, -T * 0.55, ww * 0.8, 2); c.lineTo(ww * 0.1, 2); c.quadraticCurveTo(cw * 0.3, -T * 0.5, cw * 0.2, -T); c.fill();
      c.strokeStyle = withAlpha(L.skin2, 0.8); c.lineWidth = 1.2; c.lineCap = 'round';
      for (let i = 0; i < 4; i++) { const y = -T * (0.75 - i * 0.14); c.beginPath(); c.moveTo(-cw * 0.4, y); c.quadraticCurveTo(cw * 0.2, y + 4, cw * 0.7, y + 1); c.stroke(); }
      c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 0.8; for (let i = 0; i < 16; i++) { const x = -cw + ((i * 7.3) % (cw * 1.2)), y = -T + ((i * 5.9) % T); c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y + 3); c.stroke(); }
      break;
    }
    case 'axo': {
      // panza clarita, motas y paliacate turquesa
      c.fillStyle = L.belly; c.beginPath(); c.moveTo(cw * 0.1, -T * 0.9); c.quadraticCurveTo(cw * 1.05, -T * 0.5, ww * 0.85, 2); c.lineTo(ww * 0.05, 2); c.quadraticCurveTo(cw * 0.3, -T * 0.45, cw * 0.1, -T * 0.9); c.fill();
      c.fillStyle = withAlpha(L.skin2, 0.55); for (const [x, y] of [[-cw * 0.55, -T * 0.7], [-cw * 0.3, -T * 0.35], [-cw * 0.7, -T * 0.15], [cw * 0.05, -T * 0.6]]) { c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.fill(); }
      c.fillStyle = '#10131a'; c.beginPath(); c.moveTo(-cw * 0.9, -T - 3); c.lineTo(cw * 0.95, -T - 3); c.lineTo(cw * 0.25, -T * 0.55); c.closePath(); c.fill();
      c.fillStyle = L.bandana; c.beginPath(); c.moveTo(-cw * 0.85, -T - 2); c.lineTo(cw * 0.9, -T - 2); c.lineTo(cw * 0.25, -T * 0.6); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.75)'; for (const [x, y] of [[-cw * 0.3, -T * 0.92], [cw * 0.3, -T * 0.9], [cw * 0.2, -T * 0.72], [cw * 0.55, -T * 0.95]]) { c.beginPath(); c.arc(x, y, 1.2, 0, TAU); c.fill(); }
      break;
    }
    default: _garment0(c, L, cw, ww, T);
  }
};

// ---------- colas nuevas ----------
// geometría de la cola (también la usan las áreas de golpe del coletazo)
function tailGeom(L, pose, hx, hy) {
  const T = L.tail, dino = T.kind === 'dino', axo = T.kind === 'axo', t = typeof performance !== 'undefined' ? performance.now() : 0;
  const len = dino ? 78 : axo ? 58 : 50;
  const base = dino ? -0.32 : axo ? -0.15 : -0.35;
  const a = Math.PI + base + (pose.lean || 0) * 0.65 + (pose.tail || 0) + Math.sin(t / (dino ? 420 : 300)) * 0.05;
  const x0 = hx - 6, y0 = hy - (dino ? 10 : 4), dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  const bend = (dino ? 8 : 12) * Math.sin(t / 380);
  const mx = x0 + dx * len * 0.55 + nx * bend, my = y0 + dy * len * 0.55 + ny * bend + (dino ? 4 : 0);
  const ex = x0 + dx * len - nx * bend * 0.4, ey = y0 + dy * len - ny * bend * 0.4 + (dino ? 8 : 2);
  return { x0, y0, dx, dy, nx, ny, mx, my, ex, ey, len };
}
const _tail0 = drawTail;
drawTail = function (c, L, hx, hy, pose, OUT) {
  const T = L.tail;
  if (T.kind !== 'dino' && T.kind !== 'axo' && T.kind !== 'chupa') return _tail0(c, L, hx, hy, pose, OUT);
  const t = performance.now(), dino = T.kind === 'dino', axo = T.kind === 'axo';
  const w0 = dino ? 13 : axo ? 7.5 : 3.2;
  const G = tailGeom(L, pose, hx, hy), { x0, y0, dx, dy, nx, ny, mx, my, ex, ey } = G;
  if (T.kind === 'chupa') {
    c.lineCap = 'round';
    const curve = () => { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, ex, ey); };
    curve(); c.strokeStyle = OUT; c.lineWidth = w0 + 3; c.stroke();
    curve(); c.strokeStyle = T.col; c.lineWidth = w0; c.stroke();
    c.fillStyle = OUT; c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex + dx * 10 + nx * 4, ey + dy * 10 + ny * 4); c.lineTo(ex - nx * 4, ey - ny * 4); c.closePath(); c.fill();
    return;
  }
  // cola gruesa que se afila (dino) o con aleta (ajolote)
  const side = (s, pad) => [x0 + nx * (w0 + pad) * s, y0 + ny * (w0 + pad) * s, mx + nx * (w0 * 0.62 + pad) * s, my + ny * (w0 * 0.62 + pad) * s];
  const path = pad => { const [ax, ay, bx, by] = side(1, pad), [cx2, cy2, dx2, dy2] = side(-1, pad); c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo(bx, by, ex + dx * pad, ey + dy * pad); c.quadraticCurveTo(dx2, dy2, cx2, cy2); c.closePath(); };
  if (axo) {
    // aleta translúcida arriba y abajo
    c.fillStyle = T.fin; c.strokeStyle = withAlpha(L.skin2, 0.7); c.lineWidth = 1;
    c.beginPath(); c.moveTo(x0 + dx * 8, y0 + dy * 8 - 6); c.quadraticCurveTo(mx - nx * 16, my - ny * 16 - 6, ex, ey); c.quadraticCurveTo(mx + nx * 16, my + ny * 16 + 4, x0 + dx * 8, y0 + dy * 8 + 6); c.closePath(); c.fill(); c.stroke();
  }
  path(1.7); c.fillStyle = OUT; c.fill();
  path(0); const g = c.createLinearGradient(x0 + nx * w0, y0 + ny * w0, x0 - nx * w0, y0 - ny * w0); g.addColorStop(0, shade(T.col, -0.25)); g.addColorStop(0.5, T.col); g.addColorStop(1, shade(T.col, 0.12)); c.fillStyle = g; c.fill();
  if (dino) {
    c.save(); path(0); c.clip();
    c.strokeStyle = T.belly; c.lineWidth = 5; c.beginPath(); c.moveTo(x0 - nx * w0 * 0.9, y0 - ny * w0 * 0.9 + 4); c.quadraticCurveTo(mx - nx * w0 * 0.6, my - ny * w0 * 0.6 + 3, ex, ey); c.stroke();
    c.fillStyle = withAlpha(T.spot, 0.8); for (const k of [0.25, 0.45, 0.65]) { const px = lerp(x0, ex, k) + nx * 4, py = lerp(y0, ey, k) + ny * 4 - 2; c.beginPath(); c.arc(px, py, 3.2 - k * 2, 0, TAU); c.fill(); }
    c.restore();
  }
};

// ---------- proyectiles nuevos ----------
const _proj0 = drawProj2;
drawProj2 = function (c, p) {
  const dir = sign(p.vx || p.dir || 1) || 1;
  switch (p.type) {
    case 'note': {
      // nota musical que ondula
      const s = p.r / 11, w = Math.sin(p.t * 0.35) * 0.3;
      c.rotate(w); c.scale(s, s);
      c.fillStyle = 'rgba(0,0,0,.6)'; c.beginPath(); c.ellipse(-3, 6, 7.5, 5.5, -0.35, 0, TAU); c.fill(); c.fillRect(2.5, -16, 4, 22);
      c.fillStyle = p.col || '#e9c46a'; c.beginPath(); c.ellipse(-3, 6, 6, 4.2, -0.35, 0, TAU); c.fill(); c.fillRect(3.2, -15, 2.4, 20);
      c.beginPath(); c.moveTo(5.5, -15); c.quadraticCurveTo(13, -11, 11, -3); c.quadraticCurveTo(10, -8, 5.5, -9); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-5, 4.5, 2, 1.2, -0.35, 0, TAU); c.fill();
      return true;
    }
    case 'bubble': {
      const r = p.r * (1 + Math.sin(p.t * 0.2) * 0.05);
      const g = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
      g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.5, 'rgba(142,202,230,.15)'); g.addColorStop(0.9, 'rgba(142,202,230,.35)'); g.addColorStop(1, 'rgba(240,253,255,.8)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(240,253,255,.85)'; c.lineWidth = 1.6; c.stroke();
      c.strokeStyle = 'rgba(255,190,205,.6)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, r * 0.8, 0.3, 1.4); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-r * 0.38, -r * 0.42, r * 0.2, r * 0.11, -0.6, 0, TAU); c.fill();
      return true;
    }
    case 'puddle': {
      if (!p.on) { c.fillStyle = '#10131a'; c.beginPath(); c.arc(0, 0, p.r + 2, 0, TAU); c.fill(); c.fillStyle = '#8ecae6'; c.beginPath(); c.arc(0, 0, p.r, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-3, -3, 3, 0, TAU); c.fill(); return true; }
      const k = Math.min(1, p.t / 10), fade = p.life < 30 ? p.life / 30 : 1;
      c.globalAlpha = fade;
      c.fillStyle = 'rgba(16,19,26,.8)'; c.beginPath(); c.ellipse(0, 3, 44 * k + 2, 8 * k + 2, 0, 0, TAU); c.fill();
      const g = c.createLinearGradient(-44, 0, 44, 0); g.addColorStop(0, '#5fa8d3'); g.addColorStop(0.5, '#a9def9'); g.addColorStop(1, '#5fa8d3');
      c.fillStyle = g; c.beginPath(); c.ellipse(0, 3, 44 * k, 8 * k, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(Math.sin(p.t * 0.05) * 10, 2, 16 * k, 3 * k, 0, 0, TAU); c.stroke();
      c.globalAlpha = 1;
      return true;
    }
    case 'geyser': {
      const h = p.h || 160, k = Math.min(1, p.t / 6), fade = p.life < 10 ? p.life / 10 : 1;
      c.globalAlpha = 0.85 * fade;
      const g = c.createLinearGradient(-p.r, 0, p.r, 0); g.addColorStop(0, 'rgba(95,168,211,.2)'); g.addColorStop(0.5, 'rgba(230,248,255,.95)'); g.addColorStop(1, 'rgba(95,168,211,.2)');
      c.fillStyle = g; c.beginPath(); c.moveTo(-p.r, p.r); c.quadraticCurveTo(-p.r * 0.6, -h * k * 0.5, -p.r * 0.35 + Math.sin(p.t) * 3, -h * k); c.lineTo(p.r * 0.35 + Math.sin(p.t + 1) * 3, -h * k); c.quadraticCurveTo(p.r * 0.6, -h * k * 0.5, p.r, p.r); c.closePath(); c.fill();
      c.fillStyle = 'rgba(240,253,255,.9)'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(Math.sin(p.t * 0.4 + i * 1.7) * p.r * 0.8, -h * k + i * 6, 4 + (i % 2) * 2, 0, TAU); c.fill(); }
      c.globalAlpha = 1;
      return true;
    }
    case 'band': {
      // mariachi fantasma con trompeta
      const s = p.r / 40; c.scale(dir * s, s); c.globalAlpha = 0.9;
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0, 48, 26, 5, 0, 0, TAU); c.fill();
      c.fillStyle = '#17171b'; roundRect(c, -12, -6, 24, 34, 6); c.fill(); c.fillRect(-11, 26, 8, 22); c.fillRect(3, 26, 8, 22);
      c.fillStyle = '#d9dde3'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-9, 30 + i * 5, 1.2, 0, TAU); c.arc(9, 30 + i * 5, 1.2, 0, TAU); c.fill(); }
      c.fillStyle = '#c68b62'; c.beginPath(); c.arc(0, -16, 10, 0, TAU); c.fill();
      c.fillStyle = '#1b1512'; c.fillRect(-1, -12, 9, 2.5);
      c.fillStyle = '#1a1a1f'; c.beginPath(); c.ellipse(0, -22, 30, 6, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0, -30, 11, 11, 0, Math.PI, TAU); c.fill();
      c.strokeStyle = '#d9dde3'; c.lineWidth = 1.4; c.beginPath(); c.ellipse(0, -22, 27, 4.5, 0, 0, TAU); c.stroke();
      c.fillStyle = '#e9c46a'; c.fillRect(8, -8, 22, 4); c.beginPath(); c.moveTo(30, -12); c.lineTo(40, -16); c.lineTo(40, 4); c.lineTo(30, 0); c.closePath(); c.fill();
      c.fillStyle = '#c1121f'; c.beginPath(); c.moveTo(0, -5); c.lineTo(-6, -8); c.lineTo(-6, -2); c.closePath(); c.moveTo(0, -5); c.lineTo(6, -8); c.lineTo(6, -2); c.closePath(); c.fill();
      c.globalAlpha = 1;
      return true;
    }
    case 'trajinera': {
      // la trajinera de Xochimilco: casco de colores y arco de flores
      const s = p.r / 60; c.scale(dir * s, s);
      c.fillStyle = 'rgba(95,168,211,.5)'; c.beginPath(); c.ellipse(0, 26, 110, 10, 0, 0, TAU); c.fill();
      c.fillStyle = '#10131a'; c.beginPath(); c.moveTo(-100, 0); c.lineTo(100, 0); c.lineTo(84, 26); c.lineTo(-84, 26); c.closePath(); c.fill();
      const cols = ['#e63946', '#ffbe0b', '#2ec4b6', '#ff8fab', '#3a86ff'];
      for (let i = 0; i < 5; i++) { c.fillStyle = cols[i]; c.fillRect(-96 + i * 38.4, 3, 38.4, 20); }
      c.fillStyle = '#10131a'; c.fillRect(-70, -48, 6, 50); c.fillRect(64, -48, 6, 50);
      c.fillStyle = '#ffbe0b'; roundRect(c, -78, -64, 156, 20, 8); c.fill();
      c.fillStyle = '#e63946'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(-70 + i * 17.5, -54, 5, 0, TAU); c.fill(); }
      c.fillStyle = '#10131a'; c.font = '700 13px sans-serif'; c.textAlign = 'center'; c.fillText('AXO', 0, -50);
      return true;
    }
  }
  return _proj0(c, p);
};

// ---------- efectos nuevos ----------
function drawFx2(c, p, k, a) {
  switch (p.type) {
    case 'zzz': {
      c.fillStyle = '#bfe9ff'; c.strokeStyle = '#10131a'; c.lineWidth = 3; c.font = `700 ${16 + k * 10}px sans-serif`; c.textAlign = 'center';
      for (let i = 0; i < 3; i++) { const x = p.x + 8 + i * 9 + Math.sin(p.t * 0.1 + i) * 4, y = p.y - i * 12 - k * 20; c.strokeText('z', x, y); c.fillText('z', x, y); }
      break;
    }
    case 'note': {
      const x = p.x + Math.sin(p.t * 0.2) * 6, y = p.y - p.t * 1.2;
      c.fillStyle = p.col || '#e9c46a'; c.beginPath(); c.ellipse(x - 3, y + 6, 5, 3.6, -0.35, 0, TAU); c.fill(); c.fillRect(x + 1, y - 10, 2, 16);
      c.beginPath(); c.moveTo(x + 3, y - 10); c.quadraticCurveTo(x + 9, y - 7, x + 8, y - 1); c.quadraticCurveTo(x + 7, y - 5, x + 3, y - 5); c.fill();
      break;
    }
    case 'drop': {
      c.fillStyle = '#a9def9';
      for (let i = 0; i < 5; i++) { const ang = -Math.PI / 2 + (i - 2) * 0.5, d = 6 + k * 26, x = p.x + Math.cos(ang) * d, y = p.y + Math.sin(ang) * d + k * k * 20; c.beginPath(); c.arc(x, y, 3 * a + 1, 0, TAU); c.fill(); }
      break;
    }
    case 'spike': {
      c.save(); c.translate(p.x, p.y); c.rotate(p.ang || 0);
      const l = (p.r || 30) * Math.min(1, p.t / 4);
      c.fillStyle = '#10131a'; c.beginPath(); c.moveTo(0, -6); c.lineTo(l + 3, 0); c.lineTo(0, 6); c.closePath(); c.fill();
      c.fillStyle = '#56624f'; c.beginPath(); c.moveTo(0, -4); c.lineTo(l, 0); c.lineTo(0, 4); c.closePath(); c.fill();
      c.restore(); break;
    }
    case 'ring': {
      c.strokeStyle = p.col || '#e9c46a'; c.lineWidth = 4 * a + 1; c.beginPath(); c.arc(p.x, p.y, (p.r || 60) * (0.3 + k * 0.9), 0, TAU); c.stroke();
      break;
    }
  }
}
