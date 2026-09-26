'use strict';
// ============================================================
//  XBOX (Edge en la consola, conectada a la tele)
//  Edge arranca en "modo navegador": el control mueve una flecha de ratón con la palanca, A hace clic
//  donde esté la flecha, la cruceta manda teclas de flecha y B regresa a la página anterior. Y al mismo
//  tiempo el juego lee el mismo control por la API de controles. Resultado: cada toque contaba doble
//  (la cruceta brincaba dos opciones, A picaba un botón al azar bajo la flecha) y B te sacaba del juego
//  a una pantalla negra.
//  · las teclas y clics que son eco del control se descartan (la tecla llega en los mismos ms que el botón);
//  · con un control conectado, la flecha de ratón del navegador no cuenta (el control ya llega a todos los botones);
//  · B / "atrás" no abandona la página;
//  · un aviso explica cómo pasar a "Usar controles de juego" y se quita solo cuando ya está así;
//  · si el juego no arranca, se muestra por qué en vez de quedarse en negro.
// ============================================================
const TVBOX = {
  on: IS_XBOX,
  WIN: 160,            // ms: una tecla y un botón del control tan juntos son el mismo toque
  HOLD: 60,            // ms que espera una tecla antes de contar (para ver si llega el botón)
  q: [],               // teclas en espera [{ e: {code, repeat}, up, t }]
  dropped: new Set(),  // teclas descartadas: su auto-repetición y su soltar también
  padT: -1e9,          // último flanco de algún control
  prev: {},            // estado anterior de cada control
  browsing: false,     // se vio al navegador usando el control como ratón/teclado
  clean: 0,            // toques del control sin eco: ya está en "controles de juego"
  NAVKEYS: new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'NumpadEnter', 'Escape', 'Backspace', 'Space']),
  now() { return performance.now(); },
  // teclado: en Xbox la cruceta/A/B pueden llegar como teclas además de como botones
  holdKey(e, up) {
    if (!this.on) return false;
    // Edge antiguo manda los botones del control como teclas "Gamepad…": siempre son eco
    if (/^Gamepad/.test(e.key || '') || (e.keyCode >= 195 && e.keyCode <= 218)) { this.seenEcho(); try { e.preventDefault(); } catch (er) { /* nada */ } return true; }
    if (!this.NAVKEYS.has(e.code)) return false;
    try { e.preventDefault(); } catch (er) { /* nada */ }
    if (!padInfo.length) return false; // sin control conectado es un teclado de verdad: pasa directo
    this.q.push({ code: e.code, repeat: !!e.repeat, up: !!up, t: this.now() });
    return true;
  },
  seenEcho() { this.browsing = true; this.clean = 0; this.banner(); },
  tick(raw) {
    if (!this.on) return;
    const t = this.now();
    let edge = false, dir = false;
    for (const [d, s] of raw) {
      if (!d.startsWith('pad')) continue;
      const cur = { x: Math.abs(s.x) > 0.5 ? Math.sign(s.x) : 0, y: Math.abs(s.y) > 0.5 ? Math.sign(s.y) : 0 };
      for (const b of BUTTONS) cur[b] = !!s[b];
      const p = this.prev[d] || {};
      for (const k in cur) if (cur[k] && cur[k] !== p[k]) { edge = true; if (k === 'x' || k === 'y') dir = true; }
      this.prev[d] = cur;
    }
    if (edge) this.padT = t;
    // teclas en espera: las que coinciden con un botón del control son eco
    let echo = false;
    while (this.q.length && t - this.q[0].t >= this.HOLD) {
      const k = this.q.shift();
      if (k.up) { keysDown.delete(k.code); this.dropped.delete(k.code); continue; }
      if (this.dropped.has(k.code)) continue;
      if (Math.abs(k.t - this.padT) <= this.WIN) { this.dropped.add(k.code); echo = true; continue; }
      if (!k.repeat) { keysTapped.add(k.code); keyOrder.set(k.code, ++keySeq); }
      keysDown.add(k.code);
    }
    // toques de la cruceta sin eco (ni tecla ni flecha de ratón): ya está en "controles de juego"
    if (echo) this.seenEcho();
    else if (dir && !this.q.length && t - this.mouseT > 1000 && ++this.clean >= 6) this.browsing = false;
    this.banner();
  },
  mouseT: -1e9,
  // ratón: con un control conectado, la flecha que mueve la palanca (y el clic de A) es del navegador
  fakeMouse(e, click) {
    if (!this.on || !padInfo.length) return false;
    if (e.pointerType && e.pointerType !== 'mouse') return false; // dedo o lápiz: de verdad
    this.mouseT = this.now();
    if (click || !this.browsing) this.seenEcho();
    return true;
  },
  // B = "atrás" del navegador: se queda en el juego
  // (Edge se salta al regresar las entradas agregadas sin un toque del usuario: se agrega otra con el primer toque)
  gest: false,
  trap(gesture) {
    if (!this.on || !window.history || !history.pushState) return;
    try {
      if (!history.state || !history.state.apv) history.pushState({ apv: 1 }, '');
      else if (gesture && !this.gest) history.pushState({ apv: 2 }, '');
      if (gesture) this.gest = true;
    } catch (e) { /* sin historial */ }
  },
  // ---------- aviso "Usar controles de juego" ----------
  el: null, closed: false, shown: null,
  banner() {
    if (!this.on) return;
    const want = !this.closed && (this.browsing || this.clean < 6) && (typeof APP === 'undefined' || !['battle', 'demo', 'vs', 'netview'].includes(APP.screen));
    const key = want ? (this.browsing ? 'warn' : 'tip') : 'off';
    if (key === this.shown || !document.body) return;
    this.shown = key;
    if (!want) { if (this.el) this.el.hidden = true; return; }
    if (!this.el) {
      const el = document.createElement('div');
      el.id = 'tvbox'; el.setAttribute('role', 'status');
      el.innerHTML = '<span><b>Xbox:</b> pulsa <b>A</b> una vez (enciende el sonido), luego <b>mantén presionado ☰ Menú</b> y elige <b>«Usar controles de juego»</b>.</span><button type="button" aria-label="Cerrar aviso">✕</button>';
      el.querySelector('button').addEventListener('click', ev => { ev.stopPropagation(); this.closed = true; this.banner(); });
      el.addEventListener('pointerdown', ev => ev.stopPropagation());
      document.body.appendChild(el);
      this.el = el;
    }
    this.el.hidden = false;
    this.el.classList.toggle('warn', this.browsing);
  },
  // ---------- si no arranca: decir por qué ----------
  errs: [],
  fail(msg) {
    if (document.getElementById('bootfail')) return;
    const el = document.createElement('div');
    el.id = 'bootfail';
    el.innerHTML = '<div><b>El juego no pudo arrancar.</b><p></p><button type="button">Recargar</button></div>';
    el.querySelector('p').textContent = msg;
    el.querySelector('button').addEventListener('click', () => location.reload());
    document.body.appendChild(el);
  },
};
for (const ev of ['error', 'unhandledrejection']) window.addEventListener(ev, e => {
  const m = e.reason ? (e.reason.message || String(e.reason)) : (e.message || (e.target && e.target.src ? 'no cargó ' + e.target.src.split('/').pop() : 'error'));
  TVBOX.errs.push(m);
}, true);
// a los 8 s: si el bucle ni empezó (un archivo no cargó o tronó al arrancar), se dice en vez de pantalla negra
setTimeout(() => {
  const started = typeof Devices !== 'undefined' && Devices.frame > 0;
  if (typeof APP === 'undefined' || (!started && TVBOX.errs.length)) TVBOX.fail(TVBOX.errs.length ? [...new Set(TVBOX.errs)].sort((a, b) => /^no cargó/.test(b) - /^no cargó/.test(a)).slice(0, 2).join(' · ') : 'Algún archivo del juego no cargó. Revisa la conexión y recarga.');
}, 8000);
// la tele o la consola pueden tirar la memoria del lienzo (pantalla negra al volver): se vuelve a pintar todo
canvas.addEventListener('contextlost', e => { e.preventDefault(); });
canvas.addEventListener('contextrestored', () => { if (typeof ART !== 'undefined') ART.store.clear(); });
if (TVBOX.on) {
  document.documentElement.classList.add('xbox');
  TVBOX.trap();
  for (const ev of ['keydown', 'pointerdown']) window.addEventListener(ev, () => TVBOX.trap(true), { capture: true, passive: true });
  window.addEventListener('popstate', () => TVBOX.trap());
  // sin nada que desplazar: la cruceta en modo navegador no mueve la página
  window.addEventListener('scroll', () => { if (window.scrollY || window.scrollX) window.scrollTo(0, 0); }, { passive: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => TVBOX.banner()); else TVBOX.banner();
}
