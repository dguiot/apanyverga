'use strict';
// ============================================================
//  BUCLE PRINCIPAL (60 Hz fijos)
// ============================================================
APP.battleUpdate = function () {
  if (!this.battle) return;
  this.battle.update();
  // Modo Fiesta "Turbo": un paso extra cada dos fotogramas (x1.5)
  if (this.battle && this.battle.mods && this.battle.mods.turbo && this.t % 2 === 0 && !this.battle.paused) this.battle.update();
};
APP.battleDraw = function () { if (this.battle) this.battle.draw(); };

// Si solo hay un jugador en teclado, las flechas y WASD le sirven a él (y los
// botones de ambos esquemas durante la pelea). Con dos jugadores en teclado, cada
// quien usa lo suyo.
// botón de cámara y voz (solo en las pantallas de una sala online)
const AV_BTN = { x: W - 272, y: 14, w: 204, h: 40 };
function avButtonShown() { return Net.ok && (Net.role === 'host' || Net.role === 'guest') && ['modesel', 'charsel', 'stagesel', 'netroom', 'results'].includes(APP.screen); }
function kbShareNow() {
  let devs, full = false;
  if (Net.role === 'guest') { devs = [Net.localDev]; full = true; }
  else if (APP.screen === 'battle' && BATTLE && !BATTLE.demo) { devs = BATTLE.fighters.filter(f => !f.cpu && !f.netPeer).map(f => f.dev); full = true; }
  else if (['charsel', 'stagesel', 'vs', 'results', 'netroom', 'modesel'].includes(APP.screen)) devs = APP.slots.filter(s => s.type === 'human' && !s.remote).map(s => s.dev);
  else return null;
  const kbs = devs.filter(d => d === 'kb1' || d === 'kb2');
  return kbs.length === 1 ? { dev: kbs[0], full } : null;
}

const STEP = 1000 / 60;
let lastT = performance.now(), acc = 0;
function step() {
  Devices.poll();
  try { Net.tick(); } catch (e) { console.error(e); }
  try { UIFocus.begin(); } catch (e) { console.error(e); }
  if (Pointer.clicked && APP.screen !== 'battle' && hover(W - 58, 14, 44, 44)) { Audio8.setMuted(!Audio8.muted); Pointer.clicked = false; }
  if (Pointer.clicked && avButtonShown()) { const b = AV_BTN; if (hover(b.x, b.y, b.w, b.h)) { AV.click(b); Pointer.clicked = false; } }
  if (AV.on && keyEdge('kb1', 'KeyM')) { AV.setMic(!AV.mic); Toasts.push(AV.mic ? '🎤 Micrófono abierto' : '🔇 Micrófono silenciado'); }
  try { AV.tick(); } catch (e) { console.error(e); }
  // con la ventanita de invitar abierta el juego espera; B o Esc la cierran
  if (InviteBox.isOpen()) { for (const d of Devices.list) { const n = Devices.nav(d); if (n.back || n.start) InviteBox.close(); } }
  else try { APP.update(); } catch (e) { console.error(e); }
  Audio8.tick();
  endFrameKeys();
  Pointer.clicked = false;
}
function render() {
  ctx.setTransform(VIEW.scale * VIEW.dpr, 0, 0, VIEW.scale * VIEW.dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const t0 = performance.now();
  try { APP.draw(); } catch (e) { console.error(e); }
  if (APP.screen === 'battle') ART.measure(performance.now() - t0);
}
function frame(now) {
  acc += Math.min(120, now - lastT); lastT = now;
  let n = 0;
  while (acc >= STEP && n < 5) { step(); acc -= STEP; n++; }
  render();
  requestAnimationFrame(frame);
}
loadFaces();
Net.init();
Fame.init();
if (document.fonts && document.fonts.load) {
  Promise.all([document.fonts.load(`40px ${FONT_DISPLAY}`), document.fonts.load(`16px ${FONT_BODY}`)]).catch(() => {});
}
APP.go('title');
requestAnimationFrame(frame);
