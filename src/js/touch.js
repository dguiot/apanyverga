'use strict';
// ============================================================
//  CONTROLES TÁCTILES (celular / tableta)
//  Palanca flotante a la izquierda y botones a la derecha. Se comporta
//  como un control más ('touch'): inclinar = golpe normal, deslizar
//  rápido = smash, igual que un stick analógico.
// ============================================================
const TouchPad = {
  active: false,                 // se activa con el primer toque
  stick: null,                   // { id, cx, cy, x, y }
  held: new Map(),               // pointerId -> acción
  pressT: {},                    // acción -> momento del último toque (para el destello)
  R: 78,                         // radio de la palanca (unidades de pantalla)
  BUTTONS: [
    { a: 'attack',  x: 1150, y: 585, r: 60, label: 'A',      col: '#e63946' },
    { a: 'special', x: 1028, y: 640, r: 46, label: 'B',      col: '#3a86ff' },
    { a: 'jump',    x: 1212, y: 462, r: 46, label: 'Salto',  col: '#2dc653' },
    { a: 'shield',  x: 1060, y: 500, r: 40, label: 'Escudo', col: '#8ecae6' },
    { a: 'grab',    x: 932,  y: 668, r: 34, label: 'Agarre', col: '#ffbe0b' },
    { a: 'smash',   x: 1212, y: 350, r: 34, label: 'Smash',  col: '#ff9f1c' },
    { a: 'start',   x: W / 2, y: 30, r: 24, label: 'II',     col: '#cbd5e1' },
  ],
  shown() { return this.active && APP.screen === 'battle'; },
  hitButton(x, y) {
    let best = null, bd = 1e9;
    for (const b of this.BUTTONS) { const d = Math.hypot(x - b.x, y - b.y); if (d < b.r * 1.25 && d < bd) { bd = d; best = b; } }
    return best;
  },
  down(e) {
    if (e.pointerType !== 'touch') return;
    if (!this.active) { this.active = true; this.tryFullscreen(); }
    if (!this.shown()) return;
    const p = toLogical(e);
    try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* sin captura */ }
    const b = this.hitButton(p.x, p.y);
    if (b) { this.held.set(e.pointerId, b.a); this.pressT[b.a] = performance.now(); if (navigator.vibrate) try { navigator.vibrate(8); } catch (er) { /* sin vibración */ } }
    else if (p.x < W * 0.5 && !this.stick) this.stick = { id: e.pointerId, cx: p.x, cy: p.y, x: p.x, y: p.y };
    e.preventDefault();
  },
  move(e) {
    if (e.pointerType !== 'touch' || !this.shown()) return;
    const p = toLogical(e);
    if (this.stick && this.stick.id === e.pointerId) {
      this.stick.x = p.x; this.stick.y = p.y;
      // la palanca sigue al dedo si se sale mucho del círculo
      const dx = p.x - this.stick.cx, dy = p.y - this.stick.cy, d = Math.hypot(dx, dy), max = this.R * 1.35;
      if (d > max) { this.stick.cx += dx * (1 - max / d); this.stick.cy += dy * (1 - max / d); }
    } else if (this.held.has(e.pointerId)) {
      // deslizar el dedo entre botones cambia de botón (como en los juegos de celular)
      const b = this.hitButton(p.x, p.y);
      if (b && b.a !== this.held.get(e.pointerId)) { this.held.set(e.pointerId, b.a); this.pressT[b.a] = performance.now(); }
    }
    e.preventDefault();
  },
  up(e) {
    if (e.pointerType !== 'touch') return;
    if (this.stick && this.stick.id === e.pointerId) this.stick = null;
    this.held.delete(e.pointerId);
  },
  release() { this.stick = null; this.held.clear(); },
  read() {
    const s = blankState();
    if (!this.shown()) return s;
    if (this.stick) {
      let x = (this.stick.x - this.stick.cx) / this.R, y = (this.stick.y - this.stick.cy) / this.R;
      const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
      s.x = Math.abs(x) < 0.16 ? 0 : x; s.y = Math.abs(y) < 0.16 ? 0 : y;
    }
    for (const a of this.held.values()) s[a] = true;
    s.tapJump = false; // en pantalla táctil saltar es con su botón: subir la palanca no salta sola
    s.any = s.attack || s.special || s.jump || s.shield || s.grab || s.smash || s.start;
    return s;
  },
  tryFullscreen() {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (er) { /* sin giro */ } }).catch(() => {});
    } catch (er) { /* sin pantalla completa */ }
  },
  draw() {
    if (!this.shown()) return;
    const c = ctx, now = performance.now();
    c.save();
    // palanca
    const st = this.stick;
    const cx = st ? st.cx : 190, cy = st ? st.cy : 560;
    c.globalAlpha = st ? 0.9 : 0.45;
    const bg = c.createRadialGradient(cx, cy, 10, cx, cy, this.R);
    bg.addColorStop(0, 'rgba(255,255,255,.05)'); bg.addColorStop(1, 'rgba(255,255,255,.16)');
    c.fillStyle = bg; c.beginPath(); c.arc(cx, cy, this.R, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2; c.stroke();
    let kx = cx, ky = cy;
    if (st) { const dx = st.x - cx, dy = st.y - cy, d = Math.hypot(dx, dy), k = d > this.R ? this.R / d : 1; kx = cx + dx * k; ky = cy + dy * k; }
    const kg = c.createRadialGradient(kx - 8, ky - 10, 4, kx, ky, 36);
    kg.addColorStop(0, 'rgba(255,255,255,.95)'); kg.addColorStop(1, 'rgba(160,175,200,.8)');
    c.fillStyle = kg; c.beginPath(); c.arc(kx, ky, 34, 0, TAU); c.fill();
    if (!st) text('Mueve', cx, cy + this.R + 18, 14, 'rgba(255,255,255,.7)', { body: true, weight: 600 });
    // botones
    const pressed = new Set(this.held.values());
    for (const b of this.BUTTONS) {
      const on = pressed.has(b.a), fl = Math.max(0, 1 - (now - (this.pressT[b.a] || 0)) / 180);
      c.globalAlpha = on ? 0.95 : 0.55;
      const g = c.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.35, 2, b.x, b.y, b.r);
      g.addColorStop(0, mixStr(b.col, '#ffffff', on ? 0.55 : 0.35)); g.addColorStop(1, withAlpha(shade(b.col, -0.35), 0.85));
      c.fillStyle = g; c.beginPath(); c.arc(b.x, b.y, b.r * (on ? 0.94 : 1), 0, TAU); c.fill();
      c.strokeStyle = on ? '#ffffff' : 'rgba(255,255,255,.45)'; c.lineWidth = on ? 3 : 1.5; c.stroke();
      if (fl > 0) { c.globalAlpha = fl * 0.6; c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.arc(b.x, b.y, b.r + (1 - fl) * 16, 0, TAU); c.stroke(); }
      c.globalAlpha = on ? 1 : 0.85;
      const big = b.label.length <= 2;
      text(b.label, b.x, b.y + 1, big ? b.r * 0.8 : 14, '#ffffff', big ? { weight: 700 } : { body: true, weight: 700 });
    }
    c.restore();
    // aviso para girar el teléfono
    if (window.innerHeight > window.innerWidth * 1.05) {
      c.fillStyle = 'rgba(6,10,18,.8)'; c.fillRect(0, 0, W, H);
      sfText('Gira el teléfono ↻', W / 2, H / 2 - 20, 80, PAPER);
      text('Se juega de lado para que quepan la palanca y los botones', W / 2, H / 2 + 50, 24, '#cbd5e1', { body: true, weight: 600 });
    }
  },
};
canvas.addEventListener('pointerdown', e => TouchPad.down(e), { passive: false });
canvas.addEventListener('pointermove', e => TouchPad.move(e), { passive: false });
canvas.addEventListener('pointerup', e => TouchPad.up(e));
canvas.addEventListener('pointercancel', e => TouchPad.up(e));
window.addEventListener('blur', () => TouchPad.release());
// quién es "el ratón" en los menús: con pantalla táctil es la palanca en pantalla
function pointerDev() { return TouchPad.active ? 'touch' : 'kb1'; }
