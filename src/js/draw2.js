'use strict';
// ============================================================
//  DIBUJO DE LOS PERSONAJES NO HUMANOS: cabezas, colas, trajes
//  y los proyectiles nuevos
// ============================================================
Object.assign(LOOKS, {
  torito: { species: 'bull', skin: '#6b4226', fur: '#7d5030', horn: '#efe6d2', snout: '#c9a27e', ring: '#ffd166', eye: '#b3261e',
    top: '#6b4226', top2: '#4a2c17', garment: 'fur', sleeve: 'none', pants: '#9d0208', sash: '#ffd166', shoe: '#2b1d14', sole: '#140d08', wrap: '#c9a27e', accent: '#e63946',
    tail: { col: '#4a2c17', tip: '#1e140e', kind: 'bull' }, build: { chest: 23, waist: 16, arm: 1.3, leg: 1.18 } },
  chispa: { species: 'robot', skin: '#aeb8c4', top: '#d9dee5', top2: '#8d99ae', garment: 'armor', sleeve: 'none', pants: '#5c677d', shoe: '#2b2d42', sole: '#ffd166',
    glove: '#5c677d', eye: '#48cae4', accent: '#2ec4b6', build: { chest: 19, waist: 12, arm: 1.1, leg: 1.05 } },
  michi: { species: 'cat', skin: '#e39b4a', belly: '#f6e1c3', stripe: '#b86b2a', eye: '#9bd94a', mask: '#1d2230', top: '#1d2230', top2: '#12151e', garment: 'gi', sleeve: 'short',
    sash: '#2ec4b6', pants: '#1d2230', shoe: '#e39b4a', sole: '#f6e1c3', wrap: '#1d2230', accent: '#2ec4b6',
    tail: { col: '#e39b4a', tip: '#f6e1c3', stripe: '#b86b2a', kind: 'cat' }, build: { chest: 13.5, waist: 9.5, arm: 0.85, leg: 0.9 } },
  chilazo: { species: 'chile', skin: '#d62828', top: '#d62828', top2: '#9d0208', garment: 'chile', sleeve: 'none', stem: '#2d6a4f', stem2: '#52b788',
    maskCol: '#ffd166', maskTrim: '#2ec4b6', pants: '#2ec4b6', shoe: '#ffd166', sole: '#9d0208', wrap: '#f1f5f9', accent: '#ff9f1c', eye: '#10131a', lips: '#7a0a0a',
    belt: '#ffd166', build: { chest: 17.5, waist: 15, arm: 1, leg: 0.95 } },
});

// ---------- colas ----------
function drawTail(c, L, hx, hy, pose, OUT) {
  const T = L.tail, t = performance.now();
  const sw = Math.sin(t / (T.kind === 'cat' ? 260 : 340)) * (T.kind === 'cat' ? 6 : 4);
  const x0 = hx - 12, y0 = hy - 2;
  const pts = T.kind === 'cat'
    ? [x0, y0, x0 - 22, y0 + 4 + sw * 0.4, x0 - 32 + sw, y0 - 18, x0 - 25 + sw * 1.3, y0 - 38]
    : [x0, y0, x0 - 18, y0 + 6, x0 - 26 + sw * 0.5, y0 + 18, x0 - 24 + sw, y0 + 34];
  const curve = () => { c.beginPath(); c.moveTo(pts[0], pts[1]); c.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]); };
  c.lineCap = 'round';
  const w = T.kind === 'cat' ? 7 : 4.5;
  curve(); c.strokeStyle = OUT; c.lineWidth = w + 3.2; c.stroke();
  curve(); c.strokeStyle = T.col; c.lineWidth = w; c.stroke();
  if (T.stripe) { c.save(); curve(); c.setLineDash([4, 7]); c.strokeStyle = T.stripe; c.lineWidth = w; c.stroke(); c.restore(); }
  // punta
  const tx = pts[6], ty = pts[7];
  c.fillStyle = OUT; c.beginPath(); c.ellipse(tx, ty, T.kind === 'cat' ? 6.5 : 6, T.kind === 'cat' ? 7.5 : 9, 0.3, 0, TAU); c.fill();
  c.fillStyle = T.tip; c.beginPath(); c.ellipse(tx, ty, T.kind === 'cat' ? 5 : 4.6, T.kind === 'cat' ? 6 : 7.5, 0.3, 0, TAU); c.fill();
}

// ---------- trajes ----------
function drawGarment2(c, L, cw, ww, T) {
  switch (L.garment) {
    case 'fur': {
      // pecho peludo más claro y abdomen marcado
      c.fillStyle = withAlpha(L.snout, 0.35);
      c.beginPath(); c.ellipse(cw * 0.15, -T * 0.66, cw * 0.8, T * 0.22, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-cw * 0.6, -T * 0.55); c.quadraticCurveTo(0, -T * 0.42, cw * 0.8, -T * 0.56); c.stroke();
      for (const yy of [-T * 0.34, -T * 0.18]) { c.beginPath(); c.moveTo(-ww * 0.5, yy); c.lineTo(ww * 0.8, yy); c.stroke(); }
      c.beginPath(); c.moveTo(cw * 0.12, -T * 0.5); c.lineTo(cw * 0.12, -T * 0.06); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 1;
      for (let i = 0; i < 18; i++) { const x = -cw + ((i * 9.7) % (cw * 2)), y = -T + ((i * 6.3) % T); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 2, y + 4); c.stroke(); }
      break;
    }
    case 'armor': {
      // placas y núcleo luminoso
      c.strokeStyle = 'rgba(16,19,26,.55)'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(-cw * 0.9, -T * 0.52); c.lineTo(cw * 0.95, -T * 0.52); c.moveTo(-ww, -T * 0.22); c.lineTo(ww, -T * 0.22); c.moveTo(cw * 0.1, -T * 0.52); c.lineTo(cw * 0.1, 2); c.stroke();
      const pulse = 0.65 + Math.sin(performance.now() / 180) * 0.35;
      const g = c.createRadialGradient(cw * 0.25, -T * 0.72, 1, cw * 0.25, -T * 0.72, 9);
      g.addColorStop(0, '#f0fdff'); g.addColorStop(0.45, withAlpha(L.eye, pulse)); g.addColorStop(1, withAlpha(L.eye, 0));
      c.fillStyle = '#10131a'; c.beginPath(); c.arc(cw * 0.25, -T * 0.72, 6.5, 0, TAU); c.fill();
      c.fillStyle = g; c.beginPath(); c.arc(cw * 0.25, -T * 0.72, 9, 0, TAU); c.fill();
      c.fillStyle = 'rgba(16,19,26,.45)'; for (const [x, y] of [[-cw * 0.7, -T * 0.85], [cw * 0.8, -T * 0.85], [-ww * 0.7, -T * 0.08], [ww * 0.7, -T * 0.08]]) { c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.fill(); }
      c.fillStyle = L.accent; c.fillRect(-cw * 0.85, -T * 0.4, 5, 3); c.fillRect(-cw * 0.85, -T * 0.33, 5, 3);
      break;
    }
    case 'gi': {
      // gi cruzado con el pecho de pelaje asomando
      c.fillStyle = L.belly; c.beginPath(); c.moveTo(-2, -T - 2); c.lineTo(11, -T - 2); c.lineTo(5, -T * 0.45); c.closePath(); c.fill();
      c.strokeStyle = shade(L.top, 0.35); c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(-2, -T - 2); c.lineTo(6, -T * 0.42); c.lineTo(ww * 0.7, 2); c.moveTo(11, -T - 2); c.lineTo(6, -T * 0.42); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 14; i++) c.fillRect(-cw + ((i * 7.1) % (cw * 2)), -T + ((i * 5.7) % T), 1.2, 1.2);
      break;
    }
    case 'chile': {
      // chile brillante con cinturón de campeón
      const g = c.createLinearGradient(-cw, 0, cw, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.62, 'rgba(255,255,255,0)'); g.addColorStop(0.72, 'rgba(255,255,255,.35)'); g.addColorStop(0.8, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(-cw - 2, -T - 4, cw * 2 + 4, T + 8);
      c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(cw * 0.5, -T * 0.72, 2.2, 7, 0.2, 0, TAU); c.fill();
      c.fillStyle = '#10131a'; c.fillRect(-ww - 2, -T * 0.2, ww * 2 + 4, 9);
      c.fillStyle = L.belt; c.fillRect(-ww - 1, -T * 0.2 + 1, ww * 2 + 2, 7);
      c.fillStyle = '#10131a'; roundRect(c, cw * 0.05 - 7.5, -T * 0.2 - 3, 15, 13, 3); c.fill();
      c.fillStyle = shade(L.belt, 0.15); roundRect(c, cw * 0.05 - 6, -T * 0.2 - 1.5, 12, 10, 2.5); c.fill();
      c.fillStyle = L.skin; c.beginPath(); c.arc(cw * 0.05, -T * 0.2 + 3.5, 2.6, 0, TAU); c.fill();
      break;
    }
  }
}

// ---------- cabezas ----------
function drawCreatureHead(c, L, face, OUT) {
  const RX = SK.headRX, RY = SK.headRY;
  const angry = face === 'angry', hurt = face === 'hurt' || face === 'ko', happy = face === 'happy', sad = face === 'sad', out = face === 'ko' || face === 'dizzy';
  const ellipse = (x, y, rx, ry, rot, col, pad = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx + pad, ry + pad, rot, 0, TAU); c.fill(); };
  const both = (x, y, rx, ry, rot, col) => { ellipse(x, y, rx, ry, rot, OUT, 1.6); ellipse(x, y, rx, ry, rot, col); };
  switch (L.species) {
    case 'bull': {
      // cuernos
      const horn = (bx, by, tx, ty, k) => {
        const path = pad => { c.beginPath(); c.moveTo(bx - 5 - pad, by + 2); c.quadraticCurveTo(bx - 3 + (tx - bx) * 0.2, ty + 14 * k, tx, ty - pad); c.quadraticCurveTo(bx + (tx - bx) * 0.55, ty + 20 * k, bx + 5 + pad, by + 1); c.closePath(); };
        path(1.6); c.fillStyle = OUT; c.fill();
        path(0); const g = c.createLinearGradient(bx, by, tx, ty); g.addColorStop(0, shade(L.horn, -0.35)); g.addColorStop(1, L.horn); c.fillStyle = g; c.fill();
      };
      horn(-RX * 0.55, -RY * 0.55, -RX * 1.9, -RY * 1.75, 1);
      both(-RX * 1.0, -RY * 0.2, 6.5, 3.2, -0.5, shade(L.fur, -0.1)); // oreja
      // cráneo ancho
      const g = c.createLinearGradient(-RX, 0, RX, 0); g.addColorStop(0, shade(L.fur, -0.25)); g.addColorStop(0.7, L.fur); g.addColorStop(1, shade(L.fur, 0.1));
      both(0, -2, RX * 1.12, RY * 0.95, 0, L.fur); ellipse(0, -2, RX * 1.12, RY * 0.95, 0, g);
      // hocico
      both(RX * 0.72, RY * 0.38, 9.5, 7.5, -0.1, L.snout);
      c.fillStyle = shade(L.snout, -0.5); for (const nx of [RX * 0.58, RX * 1.05]) { c.beginPath(); c.ellipse(nx, RY * 0.3, 1.6, 2.4, 0.2, 0, TAU); c.fill(); }
      c.strokeStyle = OUT; c.lineWidth = 3.4; c.beginPath(); c.arc(RX * 0.82, RY * 0.5, 4.2, 0.1 * Math.PI, 0.95 * Math.PI); c.stroke();
      c.strokeStyle = L.ring; c.lineWidth = 2; c.stroke();
      c.strokeStyle = shade(L.snout, -0.55); c.lineWidth = 1.3; c.beginPath();
      if (hurt) c.ellipse(RX * 0.72, RY * 0.72, 3.5, 2, 0, 0, TAU); else { c.moveTo(RX * 0.32, RY * 0.7); c.quadraticCurveTo(RX * 0.7, RY * (happy ? 0.86 : 0.76), RX * 1.1, RY * 0.66); }
      c.stroke();
      // copete entre los cuernos
      c.fillStyle = shade(L.fur, -0.4); c.beginPath(); c.moveTo(-RX * 0.4, -RY * 0.8); c.quadraticCurveTo(0, -RY * 1.25, RX * 0.5, -RY * 0.82); c.quadraticCurveTo(RX * 0.1, -RY * 0.55, -RX * 0.4, -RY * 0.8); c.fill();
      horn(RX * 0.3, -RY * 0.7, RX * 1.25, -RY * 1.9, 1);
      // ojos
      const ey = -RY * 0.18;
      for (const ex of [RX * 0.02, RX * 0.55]) {
        if (out) { c.strokeStyle = '#10131a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(ex - 2.5, ey - 2); c.lineTo(ex + 2.5, ey + 2); c.moveTo(ex + 2.5, ey - 2); c.lineTo(ex - 2.5, ey + 2); c.stroke(); continue; }
        ellipse(ex, ey, 2.8, (angry || hurt) ? 1.3 : 2, 0, '#f4efe8');
        ellipse(ex + 0.8, ey, 1.4, (angry || hurt) ? 1.1 : 1.5, 0, L.eye);
      }
      c.strokeStyle = '#1e140e'; c.lineWidth = 2.4; c.lineCap = 'round';
      const bro = angry ? 2.2 : sad || hurt ? -1.5 : 0.6;
      c.beginPath(); c.moveTo(-RX * 0.2, ey - 4.5); c.lineTo(RX * 0.25, ey - 4 + bro); c.moveTo(RX * 0.35, ey - 4 + bro); c.lineTo(RX * 0.8, ey - 5); c.stroke();
      break;
    }
    case 'robot': {
      // antena
      c.strokeStyle = OUT; c.lineWidth = 3.2; c.beginPath(); c.moveTo(-RX * 0.2, -RY * 0.85); c.lineTo(-RX * 0.35, -RY * 1.5); c.stroke();
      c.strokeStyle = '#8d99ae'; c.lineWidth = 1.6; c.stroke();
      const blink = Math.floor(performance.now() / 400) % 3 ? 1 : 0.35;
      both(-RX * 0.35, -RY * 1.55, 3.2, 3.2, 0, withAlpha(L.eye, blink));
      // casco
      const path = pad => roundRect(c, -RX * 1.02 - pad, -RY * 0.92 - pad, RX * 2.08 + pad * 2, RY * 1.78 + pad * 2, 7 + pad);
      path(1.6); c.fillStyle = OUT; c.fill();
      path(0); const g = c.createLinearGradient(-RX, -RY, RX, RY); g.addColorStop(0, shade(L.skin, -0.25)); g.addColorStop(0.55, L.skin); g.addColorStop(0.8, shade(L.skin, 0.25)); g.addColorStop(1, shade(L.skin, 0.05));
      c.fillStyle = g; c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-RX * 0.8, -RY * 0.8, RX * 1.2, 2);
      // oreja con tornillo
      both(-RX * 0.95, RY * 0.05, 3.6, 5.2, 0, '#8d99ae');
      c.strokeStyle = '#10131a'; c.lineWidth = 1; c.beginPath(); c.moveTo(-RX * 0.95 - 2, RY * 0.05); c.lineTo(-RX * 0.95 + 2, RY * 0.05); c.stroke();
      // visor
      roundRect(c, -RX * 0.45, -RY * 0.46, RX * 1.5, RY * 0.66, 5); c.fillStyle = '#0b1320'; c.fill();
      const ey = -RY * 0.14;
      c.fillStyle = L.eye; c.strokeStyle = L.eye; c.lineWidth = 2.2; c.lineCap = 'round';
      for (const ex of [RX * 0.05, RX * 0.65]) {
        c.globalAlpha = 0.35; c.beginPath(); c.arc(ex, ey, 5, 0, TAU); c.fill(); c.globalAlpha = 1;
        c.beginPath();
        if (out || hurt) { c.moveTo(ex - 2.5, ey - 2.5); c.lineTo(ex + 2.5, ey + 2.5); c.moveTo(ex + 2.5, ey - 2.5); c.lineTo(ex - 2.5, ey + 2.5); c.stroke(); }
        else if (happy) { c.arc(ex, ey + 1.5, 2.8, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
        else if (angry) { const d = ex < RX * 0.3 ? 1 : -1; c.moveTo(ex - 3, ey - 1.5 * d); c.lineTo(ex + 3, ey + 1.5 * d); c.stroke(); }
        else if (sad) { c.moveTo(ex - 3, ey + 1); c.lineTo(ex + 3, ey - 0.5); c.stroke(); }
        else { roundRect(c, ex - 2.6, ey - 2.4, 5.2, 4.8, 2); c.fill(); }
      }
      // rejilla de boca
      c.strokeStyle = 'rgba(16,19,26,.7)'; c.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) { const x = RX * 0.08 + i * 3.2; c.beginPath(); c.moveTo(x, RY * 0.42); c.lineTo(x, RY * 0.62); c.stroke(); }
      break;
    }
    case 'cat': {
      const ear = (a, b, tip) => {
        c.fillStyle = OUT; c.beginPath(); c.moveTo(a[0] - 1.5, a[1] + 1); c.lineTo(tip[0], tip[1] - 2); c.lineTo(b[0] + 1.5, b[1] + 1); c.closePath(); c.fill();
        c.fillStyle = L.skin; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(tip[0], tip[1]); c.lineTo(b[0], b[1]); c.closePath(); c.fill();
        c.fillStyle = '#f4a6a6'; c.beginPath(); c.moveTo(lerp(a[0], tip[0], 0.25), lerp(a[1], tip[1], 0.25) + 1); c.lineTo(lerp(a[0], tip[0], 0.8) + 0.5, lerp(a[1], tip[1], 0.8)); c.lineTo(lerp(b[0], tip[0], 0.3), lerp(b[1], tip[1], 0.3) + 1); c.closePath(); c.fill();
      };
      ear([-RX * 0.95, -RY * 0.45], [-RX * 0.15, -RY * 0.82], [-RX * 0.72, -RY * 1.5]);
      // cabeza redonda con mejillas
      const g = c.createLinearGradient(-RX, 0, RX, 0); g.addColorStop(0, shade(L.skin, -0.2)); g.addColorStop(0.7, L.skin); g.addColorStop(1, shade(L.skin, 0.1));
      c.fillStyle = OUT; c.beginPath(); c.ellipse(0, 0, RX * 1.08 + 1.6, RY * 0.86 + 1.6, 0, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(-RX * 1.05, RY * 0.1); c.lineTo(-RX * 1.35, RY * 0.45); c.lineTo(-RX * 0.8, RY * 0.6); c.closePath(); c.fill();
      c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, RX * 1.08, RY * 0.86, 0, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(-RX * 1.0, RY * 0.12); c.lineTo(-RX * 1.25, RY * 0.43); c.lineTo(-RX * 0.78, RY * 0.52); c.closePath(); c.fill();
      ear([RX * 0.12, -RY * 0.82], [RX * 0.98, -RY * 0.4], [RX * 0.72, -RY * 1.45]);
      // rayas
      c.strokeStyle = L.stripe; c.lineWidth = 2; c.lineCap = 'round';
      for (const [x, l] of [[-RX * 0.35, 5], [-RX * 0.05, 6], [RX * 0.25, 5]]) { c.beginPath(); c.moveTo(x, -RY * 0.82); c.lineTo(x + 0.6, -RY * 0.82 + l); c.stroke(); }
      // antifaz ninja con cintas al viento
      const sw = Math.sin(performance.now() / 160) * 3;
      c.fillStyle = L.mask; c.beginPath(); c.moveTo(-RX * 1.1, -RY * 0.42); c.quadraticCurveTo(0, -RY * 0.55, RX * 1.08, -RY * 0.4); c.lineTo(RX * 1.05, -RY * 0.02); c.quadraticCurveTo(0, -RY * 0.12, -RX * 1.08, -RY * 0.02); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-RX * 1.05, -RY * 0.3); c.quadraticCurveTo(-RX * 1.7, -RY * 0.35 + sw, -RX * 2.3, -RY * 0.15 + sw); c.lineTo(-RX * 2.2, RY * 0.02 + sw); c.quadraticCurveTo(-RX * 1.6, -RY * 0.1 + sw * 0.5, -RX * 1.05, -RY * 0.1); c.fill();
      c.beginPath(); c.moveTo(-RX * 1.05, -RY * 0.18); c.quadraticCurveTo(-RX * 1.5, RY * 0.1 - sw * 0.6, -RX * 1.9, RY * 0.38 - sw * 0.6); c.lineTo(-RX * 1.75, RY * 0.48 - sw * 0.6); c.quadraticCurveTo(-RX * 1.4, RY * 0.15, -RX * 1.0, -RY * 0.04); c.fill();
      c.fillStyle = L.accent; c.fillRect(-RX * 1.12, -RY * 0.32, 4, 5);
      // ojos de gato
      const ey = -RY * 0.22;
      for (const ex of [RX * 0.0, RX * 0.6]) {
        if (out) { c.strokeStyle = '#f1f5f9'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(ex - 2.5, ey - 2); c.lineTo(ex + 2.5, ey + 2); c.moveTo(ex + 2.5, ey - 2); c.lineTo(ex - 2.5, ey + 2); c.stroke(); continue; }
        if (happy) { c.strokeStyle = '#f1f5f9'; c.lineWidth = 1.8; c.beginPath(); c.arc(ex, ey + 2, 3, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); continue; }
        const h = angry || hurt ? 1.8 : 3.1;
        ellipse(ex, ey, 3.6, h, 0, L.eye);
        c.fillStyle = '#10131a'; c.beginPath(); c.ellipse(ex + 0.7, ey, 0.9, h * 0.95, 0, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.fillRect(ex + 1.4, ey - h * 0.6, 1.2, 1.2);
      }
      // hocico, nariz, boca y bigotes
      ellipse(RX * 0.55, RY * 0.38, 7.5, 5, 0, L.belly);
      c.fillStyle = '#e07a8b'; c.beginPath(); c.moveTo(RX * 0.42, RY * 0.14); c.lineTo(RX * 0.82, RY * 0.14); c.lineTo(RX * 0.62, RY * 0.3); c.closePath(); c.fill();
      c.strokeStyle = '#6b3a1f'; c.lineWidth = 1.2; c.beginPath();
      if (hurt) c.ellipse(RX * 0.62, RY * 0.5, 2.2, 1.8, 0, 0, TAU);
      else { c.moveTo(RX * 0.62, RY * 0.3); c.lineTo(RX * 0.62, RY * 0.42); c.quadraticCurveTo(RX * 0.45, RY * (sad ? 0.42 : 0.56), RX * 0.32, RY * 0.44); c.moveTo(RX * 0.62, RY * 0.42); c.quadraticCurveTo(RX * 0.8, RY * (sad ? 0.42 : 0.56), RX * 0.92, RY * 0.44); }
      c.stroke();
      c.strokeStyle = 'rgba(241,245,249,.85)'; c.lineWidth = 0.9;
      for (const dy of [-1.5, 1.5, 4]) { c.beginPath(); c.moveTo(RX * 0.95, RY * 0.36 + dy * 0.6); c.lineTo(RX * 1.75, RY * 0.3 + dy * 1.4); c.stroke(); }
      break;
    }
    case 'chile': {
      // rabito y cáliz verde
      c.strokeStyle = OUT; c.lineWidth = 5.4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-RX * 0.1, -RY * 0.95); c.quadraticCurveTo(-RX * 0.3, -RY * 1.6, -RX * 1.1, -RY * 1.65); c.stroke();
      c.strokeStyle = L.stem2; c.lineWidth = 3; c.stroke();
      // cabeza: punta de chile redondeada
      const path = pad => { c.beginPath(); c.moveTo(-RX * 1.0 - pad, RY * 0.4); c.bezierCurveTo(-RX * 1.15 - pad, -RY * 0.9 - pad, RX * 1.15 + pad, -RY * 1.05 - pad, RX * 1.02 + pad, RY * 0.35); c.quadraticCurveTo(RX * 0.8 + pad, RY * 0.95 + pad, 0, RY * 1.0 + pad); c.quadraticCurveTo(-RX * 0.85 - pad, RY * 0.95 + pad, -RX * 1.0 - pad, RY * 0.4); c.closePath(); };
      path(1.6); c.fillStyle = OUT; c.fill();
      path(0); const g = c.createLinearGradient(-RX, 0, RX, 0); g.addColorStop(0, L.top2); g.addColorStop(0.6, L.skin); g.addColorStop(1, shade(L.skin, 0.15)); c.fillStyle = g; c.fill();
      // máscara de luchador
      c.save(); path(0); c.clip();
      // antifaz de luchador: banda teal con ribete dorado y llama en la frente
      c.fillStyle = L.maskCol; c.beginPath(); c.moveTo(-RX * 1.3, -RY * 0.5); c.quadraticCurveTo(0, -RY * 0.62, RX * 1.3, -RY * 0.52); c.lineTo(RX * 1.3, RY * 0.14); c.quadraticCurveTo(0, RY * 0.02, -RX * 1.3, RY * 0.12); c.closePath(); c.fill();
      c.fillStyle = L.maskTrim; c.beginPath(); c.moveTo(-RX * 1.3, -RY * 0.42); c.quadraticCurveTo(0, -RY * 0.54, RX * 1.3, -RY * 0.44); c.lineTo(RX * 1.3, RY * 0.06); c.quadraticCurveTo(0, -RY * 0.06, -RX * 1.3, RY * 0.04); c.closePath(); c.fill();
      c.fillStyle = L.maskCol; c.beginPath(); c.moveTo(RX * 0.0, -RY * 0.5); c.quadraticCurveTo(RX * 0.2, -RY * 0.95, RX * 0.35, -RY * 1.05); c.quadraticCurveTo(RX * 0.45, -RY * 0.8, RX * 0.7, -RY * 0.52); c.closePath(); c.fill();
      c.restore();
      // cáliz
      c.fillStyle = OUT; c.beginPath(); for (let i = 0; i < 7; i++) { const a = Math.PI + i / 6 * Math.PI, r = i % 2 ? 7.5 : 12.5; c.lineTo(Math.cos(a) * r * 1.05, -RY * 0.82 + Math.sin(a) * r * 0.5); } c.closePath(); c.fill();
      c.fillStyle = L.stem; c.beginPath(); for (let i = 0; i < 7; i++) { const a = Math.PI + i / 6 * Math.PI, r = i % 2 ? 6 : 11; c.lineTo(Math.cos(a) * r, -RY * 0.82 + Math.sin(a) * r * 0.45); } c.closePath(); c.fill();
      // aberturas de los ojos
      const ey = -RY * 0.18;
      for (const ex of [RX * 0.02, RX * 0.62]) {
        c.fillStyle = L.maskCol; c.beginPath(); c.moveTo(ex - 5.5, ey - 1); c.quadraticCurveTo(ex, ey - 7.5, ex + 5.5, ey - 1.5); c.quadraticCurveTo(ex + 1, ey + 5.5, ex - 5.5, ey - 1); c.fill();
        if (out) { c.strokeStyle = '#10131a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(ex - 2, ey - 2.5); c.lineTo(ex + 2, ey + 1.5); c.moveTo(ex + 2, ey - 2.5); c.lineTo(ex - 2, ey + 1.5); c.stroke(); continue; }
        ellipse(ex, ey - 0.6, 3, (angry || hurt) ? 1.3 : 2.2, 0, '#f4efe8');
        ellipse(ex + 0.7, ey - 0.6, 1.3, (angry || hurt) ? 1.1 : 1.5, 0, '#10131a');
      }
      if (angry) { c.strokeStyle = '#10131a'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-RX * 0.3, ey - 6); c.lineTo(RX * 0.3, ey - 3.5); c.moveTo(RX * 0.35, ey - 3.5); c.lineTo(RX * 0.95, ey - 6); c.stroke(); }
      // boca (bigote de luchador)
      const my = RY * 0.62, mx = RX * 0.35;
      c.fillStyle = '#10131a'; c.beginPath(); c.moveTo(mx - 7, my - 2.5); c.quadraticCurveTo(mx, my - 5.5, mx + 7, my - 2.5); c.quadraticCurveTo(mx, my - 3, mx - 7, my - 2.5); c.fill();
      c.strokeStyle = L.lips; c.lineWidth = 1.6; c.beginPath();
      if (hurt) { c.fillStyle = '#3a0a0a'; c.ellipse(mx, my + 1, 2.6, 2.2, 0, 0, TAU); c.fill(); }
      else if (happy) { c.arc(mx, my - 1, 3.4, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
      else { c.moveTo(mx - 3, my + 0.8); c.quadraticCurveTo(mx, my + (sad ? -0.5 : 1.8), mx + 3, my + 0.6); c.stroke(); }
      break;
    }
  }
}

// ---------- proyectiles nuevos (devuelve true si lo dibujó) ----------
function drawProj2(c, p) {
  const dir = sign(p.vx || p.dir || 1) || 1;
  switch (p.type) {
    case 'steam': {
      const k = clamp(p.t / 22, 0, 1);
      c.globalAlpha = 0.75 * (1 - k * 0.8);
      for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? '#f1f5f9' : '#dfe7ef'; c.beginPath(); c.arc(-dir * i * p.r * 0.45, Math.sin(i * 2 + p.t * 0.3) * 4, p.r * (0.55 + i * 0.12), 0, TAU); c.fill(); }
      c.globalAlpha = 1; return true;
    }
    case 'rocketfist': {
      c.scale(dir, 1);
      const fl = 14 + Math.sin(p.t * 1.3) * 5;
      c.fillStyle = '#ff9f1c'; c.beginPath(); c.moveTo(-14, -7); c.lineTo(-14 - fl, 0); c.lineTo(-14, 7); c.closePath(); c.fill();
      c.fillStyle = '#fff3b0'; c.beginPath(); c.moveTo(-14, -3.5); c.lineTo(-14 - fl * 0.55, 0); c.lineTo(-14, 3.5); c.closePath(); c.fill();
      roundRect(c, -16, -12, 34, 24, 6); c.fillStyle = '#10131a'; c.fill();
      roundRect(c, -14.5, -10.5, 31, 21, 5); c.fillStyle = '#aeb8c4'; c.fill();
      c.fillStyle = '#5c677d'; c.fillRect(-14, -3, 8, 6);
      c.strokeStyle = 'rgba(16,19,26,.6)'; c.lineWidth = 1.4; for (const y of [-5, 0, 5]) { c.beginPath(); c.moveTo(8, y); c.lineTo(15, y); c.stroke(); }
      c.fillStyle = '#2ec4b6'; c.fillRect(-2, -10, 3, 20);
      return true;
    }
    case 'mine': {
      const armed = !p.arm || p.t >= p.arm, blink = armed ? (Math.floor(p.t / 6) % 2) : (Math.floor(p.t / 12) % 2);
      c.fillStyle = '#10131a'; c.beginPath(); c.ellipse(0, 0, p.r + 2, p.r * 0.55 + 2, 0, 0, TAU); c.fill();
      c.fillStyle = '#5c677d'; c.beginPath(); c.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, TAU); c.fill();
      c.fillStyle = '#8d99ae'; c.beginPath(); c.ellipse(0, -2, p.r * 0.6, p.r * 0.28, 0, 0, TAU); c.fill();
      c.fillStyle = armed ? (blink ? '#ff4d4d' : '#6b1b1b') : (blink ? '#2ec4b6' : '#135e57');
      c.beginPath(); c.arc(0, -4, 3.2, 0, TAU); c.fill();
      if (armed && blink) { c.globalAlpha = 0.3; c.beginPath(); c.arc(0, -4, 9, 0, TAU); c.fill(); c.globalAlpha = 1; }
      return true;
    }
    case 'hairball': {
      c.rotate(p.t * 0.25);
      c.fillStyle = '#10131a'; c.beginPath(); c.arc(0, 0, p.r + 2, 0, TAU); c.fill();
      c.fillStyle = p.col || '#e39b4a'; c.beginPath(); c.arc(0, 0, p.r, 0, TAU); c.fill();
      c.strokeStyle = '#b86b2a'; c.lineWidth = 1.4;
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; c.beginPath(); c.moveTo(Math.cos(a) * p.r * 0.3, Math.sin(a) * p.r * 0.3); c.lineTo(Math.cos(a + 0.5) * (p.r + 3), Math.sin(a + 0.5) * (p.r + 3)); c.stroke(); }
      return true;
    }
    case 'salsa': {
      if (p.puddle) {
        const k = Math.min(1, p.t / 10), fade = p.life < 30 ? p.life / 30 : 1;
        c.globalAlpha = fade;
        c.fillStyle = '#10131a'; c.beginPath(); c.ellipse(0, 2, 36 * k + 2, 8 * k + 2, 0, 0, TAU); c.fill();
        c.fillStyle = '#d62828'; c.beginPath(); c.ellipse(0, 2, 36 * k, 8 * k, 0, 0, TAU); c.fill();
        c.fillStyle = '#ff6d00'; c.beginPath(); c.ellipse(-6, 0, 18 * k, 3.5 * k, 0, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,209,102,.8)'; for (let i = 0; i < 3; i++) { const bx = Math.sin(p.t * 0.07 + i * 2.1) * 24, r = 2 + ((p.t + i * 13) % 26) / 10; c.beginPath(); c.arc(bx, -1 - r, r, 0, TAU); c.fill(); }
        c.globalAlpha = 1;
      } else {
        c.fillStyle = '#10131a'; c.beginPath(); c.arc(0, 0, p.r + 2, 0, TAU); c.fill();
        c.fillStyle = '#d62828'; c.beginPath(); c.arc(0, 0, p.r, 0, TAU); c.fill();
        c.fillStyle = '#ff6d00'; c.beginPath(); c.arc(-4, -4, p.r * 0.4, 0, TAU); c.fill();
      }
      return true;
    }
    case 'bull': {
      // toro de la estampida
      const s = p.r / 44, run = Math.sin(p.t * 0.7);
      c.scale(dir * s, s);
      c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(0, 44, 60, 8, 0, 0, TAU); c.fill();
      c.lineCap = 'round';
      for (const [lx, ph] of [[-32, 1], [-18, -1], [22, -1], [36, 1]]) { c.strokeStyle = '#10131a'; c.lineWidth = 10; c.beginPath(); c.moveTo(lx, 10); c.lineTo(lx + run * 10 * ph, 40); c.stroke(); c.strokeStyle = '#4a2c17'; c.lineWidth = 6.5; c.stroke(); }
      c.fillStyle = '#10131a'; c.beginPath(); c.ellipse(0, 0, 50, 26, 0, 0, TAU); c.fill();
      const g = c.createLinearGradient(0, -26, 0, 26); g.addColorStop(0, '#8a5a36'); g.addColorStop(1, '#4a2c17');
      c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 47.5, 23.5, 0, 0, TAU); c.fill();
      c.fillStyle = '#10131a'; c.beginPath(); c.ellipse(50, -6, 20, 16, 0.25, 0, TAU); c.fill();
      c.fillStyle = '#6b4226'; c.beginPath(); c.ellipse(50, -6, 17.5, 13.5, 0.25, 0, TAU); c.fill();
      c.fillStyle = '#c9a27e'; c.beginPath(); c.ellipse(62, 2, 8, 6, 0.2, 0, TAU); c.fill();
      c.strokeStyle = '#10131a'; c.lineWidth = 6; c.beginPath(); c.moveTo(44, -18); c.quadraticCurveTo(56, -40, 72, -34); c.stroke();
      c.strokeStyle = '#efe6d2'; c.lineWidth = 3.4; c.stroke();
      c.fillStyle = '#b3261e'; c.beginPath(); c.arc(55, -10, 2.4, 0, TAU); c.fill();
      c.fillStyle = 'rgba(230,225,215,.65)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-50 - i * 16, 34 - i * 4, 7 + i * 3, 0, TAU); c.fill(); }
      return true;
    }
  }
  return false;
}
