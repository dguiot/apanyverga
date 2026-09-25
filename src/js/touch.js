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
  // en la pelea propia y también como invitado (la pelea del anfitrión se ve en 'netview')
  shown() { return this.active && (APP.screen === 'battle' || (APP.screen === 'netview' && Net.role === 'guest')); },
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
      pause: { x: vw - sr - 20, y: st + 22, r: 19 }, // arriba a la derecha: arriba al centro va el marcador
      btns: this.BUTTONS.map(b => Object.assign({}, b, { x: vw - sr - b.dx * u, y: vh - sb - b.dy * u, rr: b.r * u })) };
  },
  hitButton(x, y) {
    const L = this.L; let best = null, bd = 1e9;
    for (const b of L.btns) { const d = Math.hypot(x - b.x, y - b.y); if (d < b.rr * 1.4 && d < bd) { bd = d; best = b; } }
    if (!best && Math.hypot(x - L.pause.x, y - L.pause.y) < L.pause.r * 1.8) best = { a: 'start' };
    return best;
  },
  // ---------- dedos ----------
  // Cada dedo tiene clave 'p<pointerId>' (Pointer Events) o 't<identifier>' (Touch Events) y un papel:
  // palanca, botón o nada. En cuanto llega un TouchEvent de verdad mandan los TouchEvents: iOS Safari manda
  // pointercancel falsos a un dedo que sigue apoyado cuando otro se mueve rápido (soltaba la palanca o el
  // escudo a media pelea) y a veces pierde el pointerup; la lista e.touches siempre dice qué dedos siguen ahí.
  fingers: new Map(),            // clave -> { x, y, gone }  (gone: momento en que se canceló, 0 si sigue)
  tapped: new Set(),             // botones tocados desde la última lectura: un toque rapidísimo igual cuenta
  te: false,                     // ya llegaron TouchEvents: los Pointer Events táctiles se ignoran
  GRACE: 140,                    // ms que un dedo cancelado conserva su papel por si iOS lo "reinicia"
  start(k, x, y) {
    const now = performance.now(), near = this.L.u * 0.14;
    // iOS cancela todos los dedos y los vuelve a empezar: el dedo que reaparece donde estaba hereda su papel
    for (const [ok, f] of this.fingers) if (f.gone && Math.hypot(f.x - x, f.y - y) < near) { this.rekey(ok, k, x, y); return; }
    const b = this.hitButton(x, y);
    if (b) {
      this.fingers.set(k, { x, y, gone: 0 });
      this.held.set(k, b.a); this.tapped.add(b.a); this.pressT[b.a] = now;
      if (navigator.vibrate) try { navigator.vibrate(8); } catch (er) { /* sin vibración */ }
    } else if (x < this.L.vw * 0.46) {
      // un solo pulgar izquierdo: el dedo nuevo siempre es la palanca (si quedó una vieja colgada, se va)
      if (this.stick) this.drop(this.stick.key);
      this.fingers.set(k, { x, y, gone: 0 });
      this.stick = { key: k, cx: x, cy: y, x, y };
    }
  },
  moveTo(k, x, y) {
    const f = this.fingers.get(k); if (!f) return;
    f.x = x; f.y = y;
    if (this.stick && this.stick.key === k) {
      this.stick.x = x; this.stick.y = y;
      // la palanca sigue al dedo: si se sale del círculo, el centro lo alcanza
      const R = this.L.R, dx = x - this.stick.cx, dy = y - this.stick.cy, d = Math.hypot(dx, dy), max = R * 1.2;
      if (d > max) { this.stick.cx += dx * (1 - max / d); this.stick.cy += dy * (1 - max / d); }
    } else if (this.held.has(k)) {
      // deslizar el dedo entre botones cambia de botón
      const b = this.hitButton(x, y);
      if (b && b.a !== 'start' && b.a !== this.held.get(k)) { this.held.set(k, b.a); this.tapped.add(b.a); this.pressT[b.a] = performance.now(); }
    }
  },
  // cancelled: el navegador dice que "canceló" el dedo; puede ser mentira, así que se espera un poco antes de soltarlo
  end(k, cancelled) {
    const f = this.fingers.get(k); if (!f) return;
    if (cancelled) { if (!f.gone) f.gone = performance.now(); } else this.drop(k);
  },
  drop(k) {
    this.fingers.delete(k); this.held.delete(k);
    if (this.stick && this.stick.key === k) this.stick = null;
  },
  rekey(old, k, x, y) {
    const f = this.fingers.get(old); this.fingers.delete(old); f.gone = 0; this.fingers.set(k, f);
    if (this.held.has(old)) { const a = this.held.get(old); this.held.delete(old); this.held.set(k, a); }
    if (this.stick && this.stick.key === old) this.stick.key = k;
    this.moveTo(k, x, y);
  },
  expire() {
    const now = performance.now();
    for (const [k, f] of [...this.fingers]) if (f.gone && now - f.gone > this.GRACE) this.drop(k);
  },
  onUi(e) { return !!(e.target && e.target.closest && e.target.closest('#av, #iosfs, #invite')); }, // botones de la voz y avisos: no son la palanca
  activate() { if (!this.active) { this.active = true; this.setup(); } },
  // ---------- Pointer Events (navegadores sin Touch Events) ----------
  down(e) {
    if (e.pointerType !== 'touch' || this.onUi(e)) return;
    this.activate();
    if (this.te || !this.shown()) return;
    this.start('p' + e.pointerId, e.clientX, e.clientY);
    e.preventDefault();
  },
  move(e) {
    if (e.pointerType !== 'touch' || this.te || !this.shown()) return;
    this.moveTo('p' + e.pointerId, e.clientX, e.clientY);
    e.preventDefault();
  },
  up(e) {
    if (e.pointerType !== 'touch') return;
    if (!this.te) this.end('p' + e.pointerId, e.type === 'pointercancel');
    // soltar el dedo sí cuenta como gesto para el navegador: aquí se puede pedir pantalla completa
    if (e.type === 'pointerup') this.tryFullscreen();
  },
  // ---------- Touch Events (la verdad en iPhone y Android) ----------
  touch(e) {
    if (!this.te) { this.te = true; this.release(); } // lo que anotaron los Pointer Events se rehace con los dedos reales
    const ui = this.onUi(e);
    if (e.type === 'touchstart' && !ui) this.activate();
    if (!this.active) return;
    const on = this.shown();
    for (const t of e.changedTouches) {
      const k = 't' + t.identifier;
      if (e.type === 'touchstart') { if (on && !ui) this.start(k, t.clientX, t.clientY); }
      else if (e.type === 'touchmove') this.moveTo(k, t.clientX, t.clientY);
      else this.end(k, e.type === 'touchcancel');
    }
    // la lista de dedos apoyados manda: el que ya no está se suelta (con gracia), el que sí está se actualiza
    const live = new Set();
    for (const t of e.touches) { const k = 't' + t.identifier; live.add(k); const f = this.fingers.get(k); if (f && !f.gone) this.moveTo(k, t.clientX, t.clientY); }
    for (const [k, f] of this.fingers) if (!live.has(k) && !f.gone) f.gone = performance.now();
    // en la pelea ningún toque es del navegador: ni desplazar, ni zoom, ni lupa, ni menú de "mantener presionado"
    if (on && !ui && e.cancelable && e.type !== 'touchend') e.preventDefault();
    if (e.type === 'touchend') this.tryFullscreen();
  },
  release() { this.stick = null; this.held.clear(); this.fingers.clear(); this.tapped.clear(); },
  read() {
    const s = blankState();
    if (!this.shown() || !this.L) { if (this.fingers.size || this.tapped.size) this.release(); return s; }
    this.expire();
    if (this.stick) {
      let x = (this.stick.x - this.stick.cx) / this.L.R, y = (this.stick.y - this.stick.cy) / this.L.R;
      const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
      s.x = Math.abs(x) < 0.16 ? 0 : x; s.y = Math.abs(y) < 0.16 ? 0 : y;
    }
    for (const a of this.held.values()) s[a] = true;
    for (const a of this.tapped) s[a] = true;
    this.tapped.clear();
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
for (const t of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) window.addEventListener(t, e => TouchPad.touch(e), { capture: true, passive: false });
window.addEventListener('blur', () => TouchPad.release());
document.addEventListener('visibilitychange', () => { if (document.hidden) TouchPad.release(); });
window.addEventListener('pagehide', () => TouchPad.release());
window.addEventListener('resize', () => TouchPad.onResize());
document.addEventListener('fullscreenchange', () => TouchPad.onFsChange());
document.addEventListener('webkitfullscreenchange', () => TouchPad.onFsChange());
// quién es "el ratón" en los menús: con pantalla táctil es la palanca en pantalla
function pointerDev() { return TouchPad.active ? 'touch' : 'kb1'; }

// iPhone: Safari no deja poner una página en pantalla completa. Hay dos salidas y el aviso de los menús las dice:
//  · deslizar la página hacia arriba esconde las barras (de lado, Safari las quita del todo). Para eso, solo en
//    este caso, la página tiene espacio para desplazarse y el juego queda fijo en medio (html.iosroll). En la
//    pelea (html.fight) ningún toque desplaza nada, así que las barras no regresan solas.
//  · abrirla desde el ícono de inicio: el manifest la abre sin barras y de lado, para siempre.
const IOSFS = {
  el: null, shownState: null, swipeOff: false, roll: null, fight: null,
  mode() {
    if (!window.APYV_WEB || TouchPad.fsSupported() || TouchPad.isStandalone()) return false;
    return !!((window.matchMedia && matchMedia('(pointer: coarse)').matches) || TouchPad.active);
  },
  // de lado y sin barras, la ventana mide lo mismo que el lado corto de la pantalla
  barsShown() {
    const short = Math.min(screen.width || 0, screen.height || 0);
    return TouchPad.landscape() && short > 0 && window.innerHeight < short - 24;
  },
  want() {
    const m = this.mode(), fight = ['battle', 'netview'].includes(APP.screen), root = document.documentElement;
    if (m !== this.roll) { this.roll = m; root.classList.toggle('iosroll', m); }
    if (fight !== this.fight) { this.fight = fight; root.classList.toggle('fight', fight); }
    if (!m || fight || ['demo', 'vs'].includes(APP.screen)) return '';
    if (!this.swipeOff && this.barsShown()) return 'swipe';
    try { if (localStorage.getItem('apyv-iosfs') === '1') return ''; } catch (e) { /* sin almacenamiento */ }
    return 'home';
  },
  update() {
    const on = this.want();
    if (on === this.shownState) return;
    this.shownState = on;
    if (on && !this.el) {
      const el = this.el = document.createElement('div'); el.id = 'iosfs';
      el.innerHTML = '<span></span><button aria-label="Cerrar">✕</button>';
      el.querySelector('button').addEventListener('click', () => {
        if (this.shownState === 'swipe') this.swipeOff = true; // el de deslizar vuelve la próxima vez que abras el juego
        else try { localStorage.setItem('apyv-iosfs', '1'); } catch (e) { /* nada */ }
        this.shownState = null; this.el.style.display = 'none';
      });
      document.body.appendChild(el);
    }
    if (!this.el) return;
    this.el.style.display = on ? '' : 'none';
    if (!on) return;
    this.el.className = on;
    this.el.querySelector('span').innerHTML = on === 'swipe'
      ? '<i aria-hidden="true">↑</i><span><b>Desliza hacia arriba aquí</b> para esconder las barras de Safari. Sin barras siempre: <b>Compartir ⬆︎ → Agregar a inicio</b>.</span>'
      : '📱 <b>Pantalla completa en iPhone:</b> toca <b>Compartir ⬆︎</b> → <b>Agregar a inicio</b> y abre el juego desde el ícono.';
  },
};
