'use strict';
// ============================================================
//  CONTROLES TÁCTILES (celular / tableta)
//  Van en una capa encima de TODA la pantalla, no dentro del cuadro del
//  juego: en un teléfono alargado el juego deja franjas a los lados y
//  justo ahí descansan los pulgares.
//  · Palanca flotante: aparece donde apoyas el pulgar izquierdo (cualquier
//    punto de la mitad izquierda) y lo sigue si te sales del círculo.
//    Inclinar = golpe normal, deslizar rápido = smash, como un stick.
//  · Cinco botones en abanico alrededor del pulgar derecho, del tamaño de
//    lo que más se usa: A (ataque) el más grande, luego B (especial) y
//    Saltar, Escudo y Agarrar (agarrar + dirección = lanzar).
// ============================================================
const TouchPad = {
  active: false,                 // se activa con el primer toque
  stick: null,                   // { id, cx, cy, x, y } en pixeles de pantalla
  held: new Map(),               // pointerId -> acción
  pressT: {},                    // acción -> momento del último toque (para el destello)
  // posición: distancia desde la esquina inferior derecha, en unidades de "u" (lo corto de la pantalla)
  BUTTONS: [
    { a: 'attack',  label: 'A',       sub: 'Ataque',   col: '#e63946', dx: 0.20, dy: 0.21, r: 0.125 },
    { a: 'special', label: 'B',       sub: 'Especial', col: '#3a86ff', dx: 0.47, dy: 0.13, r: 0.10 },
    { a: 'jump',    label: 'Saltar',                   col: '#2dc653', dx: 0.13, dy: 0.48, r: 0.10 },
    { a: 'shield',  label: 'Escudo',                   col: '#8ecae6', dx: 0.43, dy: 0.42, r: 0.085 },
    { a: 'grab',    label: 'Agarrar',                  col: '#ffbe0b', dx: 0.68, dy: 0.29, r: 0.075 },
  ],
  el: null, g: null, L: null, fsRefused: false, wasFs: false,
  shown() { return this.active && APP.screen === 'battle'; },
  // ---------- capa y medidas ----------
  setup() {
    if (this.el) return;
    const el = this.el = document.createElement('canvas');
    el.id = 'touchpad'; el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:4;background:transparent;max-width:none';
    document.body.appendChild(el);
    this.g = el.getContext('2d');
    // márgenes seguros (muesca y barra de inicio)
    const probe = this.probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:env(safe-area-inset-left,0px);right:env(safe-area-inset-right,0px);top:env(safe-area-inset-top,0px);bottom:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden';
    document.body.appendChild(probe);
    this.measure();
  },
  measure() {
    if (!this.el) return;
    const vw = window.innerWidth, vh = window.innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.el.style.width = vw + 'px'; this.el.style.height = vh + 'px';
    this.el.width = Math.round(vw * dpr); this.el.height = Math.round(vh * dpr);
    const r = this.probe.getBoundingClientRect();
    const sl = Math.max(12, r.left), sr = Math.max(12, vw - r.right), st = Math.max(8, r.top), sb = Math.max(10, vh - r.bottom);
    const u = clamp(Math.min(vw, vh), 280, 440);
    this.L = { vw, vh, dpr, u, sl, sr, st, sb, R: u * 0.17, knob: u * 0.075,
      home: { x: sl + u * 0.3, y: vh - sb - u * 0.3 },
      pause: { x: vw / 2, y: st + 22, r: 19 },
      btns: this.BUTTONS.map(b => Object.assign({}, b, { x: vw - sr - b.dx * u, y: vh - sb - b.dy * u, rr: b.r * u })) };
  },
  hitButton(x, y) {
    const L = this.L; let best = null, bd = 1e9;
    for (const b of L.btns) { const d = Math.hypot(x - b.x, y - b.y); if (d < b.rr * 1.4 && d < bd) { bd = d; best = b; } }
    if (!best && Math.hypot(x - L.pause.x, y - L.pause.y) < L.pause.r * 1.8) best = { a: 'start' };
    return best;
  },
  // ---------- toques ----------
  down(e) {
    if (e.pointerType !== 'touch') return;
    if (!this.active) {
      this.active = true; this.setup();
      if (!this.fsSupported() && !this.isStandalone() && typeof Toasts !== 'undefined') setTimeout(() => Toasts.push('📱 Pantalla completa: Compartir → "Agregar a inicio" y ábrelo desde el ícono'), 1200);
    }
    if (!this.shown()) return;
    const x = e.clientX, y = e.clientY;
    const b = this.hitButton(x, y);
    if (b) { this.held.set(e.pointerId, b.a); this.pressT[b.a] = performance.now(); if (navigator.vibrate) try { navigator.vibrate(8); } catch (er) { /* sin vibración */ } }
    else if (x < this.L.vw * 0.46 && !this.stick) this.stick = { id: e.pointerId, cx: x, cy: y, x, y };
    e.preventDefault();
  },
  move(e) {
    if (e.pointerType !== 'touch' || !this.shown()) return;
    const x = e.clientX, y = e.clientY;
    if (this.stick && this.stick.id === e.pointerId) {
      this.stick.x = x; this.stick.y = y;
      // la palanca sigue al dedo: si se sale del círculo, el centro lo alcanza
      const R = this.L.R, dx = x - this.stick.cx, dy = y - this.stick.cy, d = Math.hypot(dx, dy), max = R * 1.2;
      if (d > max) { this.stick.cx += dx * (1 - max / d); this.stick.cy += dy * (1 - max / d); }
    } else if (this.held.has(e.pointerId)) {
      // deslizar el dedo entre botones cambia de botón
      const b = this.hitButton(x, y);
      if (b && b.a !== 'start' && b.a !== this.held.get(e.pointerId)) { this.held.set(e.pointerId, b.a); this.pressT[b.a] = performance.now(); }
    }
    e.preventDefault();
  },
  up(e) {
    if (e.pointerType !== 'touch') return;
    if (this.stick && this.stick.id === e.pointerId) this.stick = null;
    this.held.delete(e.pointerId);
    // soltar el dedo sí cuenta como gesto para el navegador: aquí se puede pedir pantalla completa
    this.tryFullscreen();
  },
  release() { this.stick = null; this.held.clear(); },
  read() {
    const s = blankState();
    if (!this.shown() || !this.L) return s;
    if (this.stick) {
      let x = (this.stick.x - this.stick.cx) / this.L.R, y = (this.stick.y - this.stick.cy) / this.L.R;
      const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
      s.x = Math.abs(x) < 0.16 ? 0 : x; s.y = Math.abs(y) < 0.16 ? 0 : y;
    }
    for (const a of this.held.values()) s[a] = true;
    s.tapJump = false; // en pantalla táctil saltar es con su botón: subir la palanca no salta sola
    s.any = s.attack || s.special || s.jump || s.shield || s.grab || s.start;
    return s;
  },
  // ---------- pantalla completa ----------
  landscape() { return window.innerWidth > window.innerHeight; },
  fsSupported() { const el = document.documentElement; return !!(el.requestFullscreen || el.webkitRequestFullscreen); },
  isStandalone() { return (window.matchMedia && matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) || navigator.standalone === true; },
  tryFullscreen() {
    if (!this.active || !this.landscape() || this.fsRefused || this.isStandalone()) return;
    if (document.fullscreenElement || document.webkitFullscreenElement) return;
    try {
      const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (!req) return;
      const p = req.call(el, { navigationUI: 'hide' });
      const lock = () => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (er) { /* sin bloqueo */ } };
      if (p && p.then) p.then(lock).catch(() => {}); else lock();
    } catch (er) { /* sin pantalla completa */ }
  },
  onFsChange() {
    const fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    // si la persona se salió a propósito, no la regresamos hasta que vuelva a girar el teléfono
    if (this.wasFs && !fs && this.landscape()) this.fsRefused = true;
    this.wasFs = fs;
  },
  onResize() {
    const land = this.landscape();
    if (land && this._land === false) this.fsRefused = false; // giró otra vez a horizontal
    this._land = land;
    this.measure();
  },
  // ---------- dibujo ----------
  draw() {
    if (!this.el) return;
    const g = this.g, L = this.L;
    g.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    g.clearRect(0, 0, L.vw, L.vh);
    if (this.active && !this.landscape()) {
      // aviso para girar el teléfono
      g.fillStyle = 'rgba(6,10,18,.88)'; g.fillRect(0, 0, L.vw, L.vh);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f4efe8';
      g.font = `700 ${Math.round(L.vw * 0.09)}px 'Barlow Condensed', 'Barlow', system-ui, sans-serif`; g.fillText('Gira el teléfono ↻', L.vw / 2, L.vh / 2 - 20);
      g.font = `600 ${Math.round(L.vw * 0.04)}px 'Barlow', system-ui, sans-serif`; g.fillStyle = '#cbd5e1';
      g.fillText('Se juega de lado: así caben la palanca y los botones', L.vw / 2, L.vh / 2 + 30);
      return;
    }
    if (!this.shown()) return;
    const now = performance.now();
    // palanca
    const st = this.stick, cx = st ? st.cx : L.home.x, cy = st ? st.cy : L.home.y, R = L.R;
    g.globalAlpha = st ? 0.9 : 0.4;
    const bg = g.createRadialGradient(cx, cy, 6, cx, cy, R);
    bg.addColorStop(0, 'rgba(255,255,255,.05)'); bg.addColorStop(1, 'rgba(255,255,255,.18)');
    g.fillStyle = bg; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2; g.stroke();
    let kx = cx, ky = cy;
    if (st) { const dx = st.x - cx, dy = st.y - cy, d = Math.hypot(dx, dy), k = d > R ? R / d : 1; kx = cx + dx * k; ky = cy + dy * k; }
    const kg = g.createRadialGradient(kx - L.knob * 0.25, ky - L.knob * 0.3, 2, kx, ky, L.knob);
    kg.addColorStop(0, 'rgba(255,255,255,.95)'); kg.addColorStop(1, 'rgba(160,175,200,.8)');
    g.fillStyle = kg; g.beginPath(); g.arc(kx, ky, L.knob, 0, TAU); g.fill();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (!st) { g.globalAlpha = 0.75; g.fillStyle = '#fff'; g.font = `600 ${Math.round(L.u * 0.036)}px 'Barlow', system-ui, sans-serif`; g.fillText('Pon el pulgar donde quieras', cx, cy + R + L.u * 0.04); }
    // botones
    const pressed = new Set(this.held.values());
    for (const b of L.btns) {
      const on = pressed.has(b.a), fl = Math.max(0, 1 - (now - (this.pressT[b.a] || 0)) / 180), r = b.rr * (on ? 0.94 : 1);
      g.globalAlpha = on ? 0.95 : 0.6;
      const bgr = g.createRadialGradient(b.x - r * 0.3, b.y - r * 0.35, 2, b.x, b.y, r);
      bgr.addColorStop(0, mixStr(b.col, '#ffffff', on ? 0.55 : 0.35)); bgr.addColorStop(1, withAlpha(shade(b.col, -0.35), 0.88));
      g.fillStyle = bgr; g.beginPath(); g.arc(b.x, b.y, r, 0, TAU); g.fill();
      g.strokeStyle = on ? '#ffffff' : 'rgba(255,255,255,.5)'; g.lineWidth = on ? 3 : 1.5; g.stroke();
      if (fl > 0) { g.globalAlpha = fl * 0.6; g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.arc(b.x, b.y, b.rr + (1 - fl) * 14, 0, TAU); g.stroke(); }
      g.globalAlpha = on ? 1 : 0.92; g.fillStyle = '#fff';
      const letter = b.label.length <= 2;
      g.font = letter ? `800 ${Math.round(b.rr * 0.82)}px 'Barlow Condensed', 'Barlow', system-ui, sans-serif` : `700 ${Math.round(b.rr * 0.36)}px 'Barlow', system-ui, sans-serif`;
      g.fillText(b.label, b.x, b.y + (b.sub ? -b.rr * 0.1 : 1));
      if (b.sub) { g.font = `700 ${Math.round(b.rr * 0.24)}px 'Barlow', system-ui, sans-serif`; g.globalAlpha *= 0.85; g.fillText(b.sub, b.x, b.y + b.rr * 0.48); }
    }
    // pausa
    const P = L.pause; g.globalAlpha = pressed.has('start') ? 0.95 : 0.55;
    g.fillStyle = 'rgba(203,213,225,.35)'; g.beginPath(); g.arc(P.x, P.y, P.r, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = '#fff'; g.fillRect(P.x - 6, P.y - 7, 4, 14); g.fillRect(P.x + 2, P.y - 7, 4, 14);
    g.globalAlpha = 1;
  },
};
// los toques se escuchan en toda la ventana (también en las franjas fuera del cuadro del juego)
window.addEventListener('pointerdown', e => TouchPad.down(e), { capture: true, passive: false });
window.addEventListener('pointermove', e => TouchPad.move(e), { capture: true, passive: false });
window.addEventListener('pointerup', e => TouchPad.up(e), { capture: true });
window.addEventListener('pointercancel', e => TouchPad.up(e), { capture: true });
window.addEventListener('blur', () => TouchPad.release());
window.addEventListener('resize', () => TouchPad.onResize());
document.addEventListener('fullscreenchange', () => TouchPad.onFsChange());
document.addEventListener('webkitfullscreenchange', () => TouchPad.onFsChange());
// quién es "el ratón" en los menús: con pantalla táctil es la palanca en pantalla
function pointerDev() { return TouchPad.active ? 'touch' : 'kb1'; }
