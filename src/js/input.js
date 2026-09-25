'use strict';
// ============================================================
//  ENTRADA: teclado (2 esquemas) + controles Bluetooth/USB
//  Todo es reasignable y se guarda en este navegador.
// ============================================================
const ACTIONS = ['up', 'down', 'left', 'right', 'attack', 'special', 'jump', 'shield', 'grab', 'smash', 'start'];
const ACTION_LABEL = { up: 'Arriba', down: 'Abajo', left: 'Izquierda', right: 'Derecha', attack: 'Ataque', special: 'Especial', jump: 'Salto', shield: 'Escudo', grab: 'Agarre', smash: 'Smash', start: 'Pausa' };
const BUTTONS = ['attack', 'special', 'jump', 'shield', 'grab', 'smash', 'start'];
const DEFAULT_KB = {
  kb1: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], attack: ['KeyJ'], special: ['KeyK'], jump: ['Space'], shield: ['KeyL'], grab: ['KeyU'], smash: ['KeyI'], start: ['Enter', 'Escape'], tapJump: true },
  kb2: { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], attack: ['Comma', 'Numpad1'], special: ['Period', 'Numpad2'], jump: ['ShiftRight', 'Numpad0'], shield: ['Slash', 'Numpad3'], grab: ['KeyM', 'Numpad4'], smash: ['Semicolon', 'Numpad5'], start: ['NumpadEnter', 'Backspace'], tapJump: true },
};
// b = botón, a/s = eje y signo
const DEFAULT_PAD = { up: [{ a: 1, s: -1 }, { b: 12 }], down: [{ a: 1, s: 1 }, { b: 13 }], left: [{ a: 0, s: -1 }, { b: 14 }], right: [{ a: 0, s: 1 }, { b: 15 }], attack: [{ b: 0 }], special: [{ b: 1 }], jump: [{ b: 2 }, { b: 3 }], shield: [{ b: 6 }, { b: 7 }], grab: [{ b: 4 }, { b: 5 }], smash: [], start: [{ b: 9 }], tapJump: false };
const clone = o => JSON.parse(JSON.stringify(o));
const sameBind = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let GAME_KEYS = new Set();
const Binds = {
  kb: null, pads: {},
  load() {
    try { const j = JSON.parse(localStorage.getItem('golpazo-binds-v1') || 'null'); if (j) { this.kb = j.kb; this.pads = j.pads || {}; } } catch (e) { /* sin almacenamiento */ }
    this.kb = this.kb || {};
    for (const k of ['kb1', 'kb2']) this.kb[k] = Object.assign(clone(DEFAULT_KB[k]), this.kb[k] || {});
    this.refresh();
  },
  save() { try { localStorage.setItem('golpazo-binds-v1', JSON.stringify({ kb: this.kb, pads: this.pads })); } catch (e) { /* sin almacenamiento */ } this.refresh(); },
  refresh() { GAME_KEYS = new Set(Object.values(this.kb).flatMap(m => ACTIONS.flatMap(a => m[a] || []))); },
  forDev(dev) { if (dev.startsWith('kb')) return this.kb[dev]; return this.pads[padIdOf(dev)] || DEFAULT_PAD; },
  editable(dev) {
    if (dev.startsWith('kb')) return this.kb[dev];
    const id = padIdOf(dev);
    if (!this.pads[id]) this.pads[id] = clone(DEFAULT_PAD);
    return this.pads[id];
  },
  isCustom(dev) { return dev.startsWith('kb') ? JSON.stringify(this.kb[dev]) !== JSON.stringify(DEFAULT_KB[dev]) : !!this.pads[padIdOf(dev)]; },
  reset(dev) { if (dev.startsWith('kb')) this.kb[dev] = clone(DEFAULT_KB[dev]); else delete this.pads[padIdOf(dev)]; this.save(); },
  // la nueva asignación queda como principal; se conserva una alternativa
  bind(dev, action, binding) {
    const m = this.editable(dev);
    for (const act of ACTIONS) if (act !== action) m[act] = (m[act] || []).filter(b => !sameBind(b, binding));
    const prev = (m[action] || []).filter(b => !sameBind(b, binding));
    m[action] = [binding].concat(prev.slice(0, 1));
    this.save();
  },
  toggleTap(dev) { const m = this.editable(dev); m.tapJump = !m.tapJump; this.save(); },
};

// ---------- nombres legibles ----------
const KEY_NAMES = { Space: 'Espacio', Enter: 'Enter', Escape: 'Esc', Backspace: 'Retroceso', Tab: 'Tab', ShiftLeft: 'Shift izq', ShiftRight: 'Shift der', ControlLeft: 'Ctrl izq', ControlRight: 'Ctrl der', AltLeft: 'Alt', AltRight: 'Alt der', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Comma: ',', Period: '.', Slash: '-', Semicolon: 'Ñ', Quote: '´', BracketLeft: '`', BracketRight: '+', Backslash: 'Ç', Minus: "'", Equal: '¡', NumpadEnter: 'Num Enter', CapsLock: 'Bloq Mayús' };
function keyName(code) {
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
  return code;
}
const PAD_BTN = ['A · ✕', 'B · ○', 'X · □', 'Y · △', 'LB · L1', 'RB · R1', 'LT · L2', 'RT · R2', 'Select', 'Start', 'L3', 'R3', 'Cruceta ↑', 'Cruceta ↓', 'Cruceta ←', 'Cruceta →', 'Home'];
function bindName(b) {
  if (typeof b === 'string') return keyName(b);
  if (b.b !== undefined) return PAD_BTN[b.b] || `Botón ${b.b}`;
  const dirs = { 0: ['Stick ←', 'Stick →'], 1: ['Stick ↑', 'Stick ↓'], 2: ['Stick der ←', 'Stick der →'], 3: ['Stick der ↑', 'Stick der ↓'] };
  return dirs[b.a] ? dirs[b.a][b.s > 0 ? 1 : 0] : `Eje ${b.a}${b.s > 0 ? '+' : '−'}`;
}
function bindList(dev, action) { const m = Binds.forDev(dev); return (m[action] || []).map(bindName).join(' / ') || '—'; }

// ---------- teclado ----------
const keysDown = new Set();
const keysTapped = new Set(); // pulsadas desde el último sondeo (no perder toques rápidos)
const keyOrder = new Map(); let keySeq = 0; // la última tecla pulsada gana (← y → a la vez)
const Capture = { active: false, dev: null, action: null, t: 0, result: null, cancel: false, baseB: null, baseA: null };
window.addEventListener('keydown', e => {
  Audio8.unlock();
  if (Capture.active && Capture.dev.startsWith('kb')) {
    e.preventDefault();
    if (e.code === 'Escape') Capture.cancel = true; else if (!e.repeat) Capture.result = e.code;
    return;
  }
  if (Capture.active && e.code === 'Escape') { e.preventDefault(); Capture.cancel = true; return; }
  if (GAME_KEYS.has(e.code) || e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  if (!e.repeat) { keysTapped.add(e.code); keyOrder.set(e.code, ++keySeq); }
  keysDown.add(e.code);
});
window.addEventListener('keyup', e => keysDown.delete(e.code));
window.addEventListener('blur', () => keysDown.clear());

function blankState() {
  return { x: 0, y: 0, cx: 0, cy: 0, attack: false, special: false, jump: false, shield: false, grab: false, smash: false, start: false, any: false, tapJump: true, digital: false };
}

// ---------- controles ----------
let padInfo = [];
// El Gamepad API puede estar vetado por la política del marco que contiene al juego
// (p. ej. dentro de otra página): entonces getGamepads() lanza o la política lo niega.
let gamepadsBlocked = (() => {
  try {
    const pol = document.permissionsPolicy || document.featurePolicy;
    if (pol && pol.allowsFeature && pol.features && pol.features().includes('gamepad') && !pol.allowsFeature('gamepad')) return true;
  } catch (e) { /* sin política */ }
  return !navigator.getGamepads;
})();
const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
const padsAnnounced = new Set();
function announcePad(p, how) {
  const key = p.index + '|' + p.id;
  if (padsAnnounced.has(key)) return;
  padsAnnounced.add(key);
  if (typeof Toasts !== 'undefined') Toasts.push(`🎮 Control conectado: ${shortPadName(p.id)} · pulsa A para unirte`);
}
function readPads() {
  let pads = [];
  try { pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : []; }
  catch (e) { gamepadsBlocked = true; pads = []; }
  padInfo = pads.filter(Boolean).filter(p => p.connected !== false).map(p => ({ index: p.index, id: p.id, mapping: p.mapping, buttons: p.buttons.map(b => b.pressed || b.value > 0.5), axes: p.axes.slice() }));
  // algunos navegadores no disparan "gamepadconnected": se anuncia al verlo por sondeo
  for (const p of padInfo) announcePad(p, 'poll');
  for (const k of [...padsAnnounced]) if (!padInfo.some(p => p.index + '|' + p.id === k)) padsAnnounced.delete(k);
  return pads;
}
function padIdOf(dev) { const p = padInfo.find(p => 'pad' + p.index === dev); return p ? p.id : 'desconocido'; }
window.addEventListener('gamepadconnected', e => announcePad(e.gamepad, 'event'));
window.addEventListener('gamepaddisconnected', e => { padsAnnounced.delete(e.gamepad.index + '|' + e.gamepad.id); Toasts.push(`Control desconectado: ${shortPadName(e.gamepad.id)}`); });
function shortPadName(id) {
  if (!id) return 'Control';
  if (/xbox/i.test(id)) return 'Xbox';
  if (/dualsense|ps5/i.test(id)) return 'DualSense';
  if (/dualshock|ps4|054c/i.test(id)) return 'PlayStation';
  if (/pro controller|057e|joy-con/i.test(id)) return 'Switch Pro';
  if (/8bitdo/i.test(id)) return '8BitDo';
  const s = id.replace(/\(.*?\)/g, '').replace(/[0-9a-f]{4}-[0-9a-f]{4}-/i, '').trim();
  return s.slice(0, 22) || 'Control';
}
function deadzone(v, dz = 0.22) { return Math.abs(v) < dz ? 0 : (v - sign(v) * dz) / (1 - dz); }

// Estado crudo de un dispositivo según sus asignaciones
function readDevice(dev, pads) {
  if (dev === 'touch') return TouchPad.read();
  const s = blankState();
  if (dev.startsWith('kb')) {
    const m = Binds.kb[dev];
    // un solo teclado en juego: también lee las teclas del otro esquema (flechas o WASD)
    const sh = Devices.share && Devices.share.dev === dev ? Binds.kb[dev === 'kb1' ? 'kb2' : 'kb1'] : null;
    const keys = (a, withShare) => withShare && sh ? (m[a] || []).concat(sh[a] || []) : (m[a] || []);
    const on = k => keysDown.has(k) || keysTapped.has(k);
    const stamp = a => Math.max(0, ...keys(a, true).filter(on).map(k => keyOrder.get(k) || 1));
    const axis = (neg, pos) => { const a = stamp(neg), b = stamp(pos); return !a && !b ? 0 : b > a ? 1 : -1; };
    // el otro teclado presta sus direcciones: no navega por su cuenta (evita doble movimiento en menús)
    const lent = Devices.share && Devices.share.dev !== dev;
    s.x = lent ? 0 : axis('left', 'right');
    s.y = lent ? 0 : axis('up', 'down');
    for (const b of BUTTONS) s[b] = keys(b, Devices.share && Devices.share.full).some(on);
    s.tapJump = m.tapJump !== false;
    s.digital = true;
  } else {
    const idx = +dev.slice(3);
    const p = pads.find(p => p && p.index === idx);
    if (!p) return s;
    const m = Binds.forDev(dev);
    const btn = i => !!(p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.45));
    const val = bd => bd.b !== undefined ? (btn(bd.b) ? 1 : 0) : Math.max(0, deadzone(p.axes[bd.a] || 0) * bd.s);
    const act = a => Math.max(0, ...(m[a] || []).map(val));
    s.x = clamp(act('right') - act('left'), -1, 1); s.y = clamp(act('down') - act('up'), -1, 1);
    for (const b of BUTTONS) s[b] = act(b) > 0.5;
    const usesC = ACTIONS.some(a => (m[a] || []).some(bd => bd.a === 2 || bd.a === 3));
    if (!usesC) { s.cx = deadzone(p.axes[2] || 0, 0.4); s.cy = deadzone(p.axes[3] || 0, 0.4); }
    s.tapJump = m.tapJump !== false;
  }
  s.any = s.attack || s.special || s.jump || s.shield || s.grab || s.smash || s.start;
  return s;
}

const BUFFER = { jump: 8, attack: 5, special: 5, grab: 5, shield: 4, smash: 5, start: 4 };
// Controlador con flancos, "flicks" y búfer
class Controller {
  constructor(dev) {
    this.dev = dev; this.cur = blankState(); this.prev = blankState();
    this.flickX = 99; this.flickY = 99; this.flickDirX = 0; this.flickDirY = 0;
    this.buffer = {}; for (const b of BUTTONS) this.buffer[b] = 99;
    this.cPressed = false; this.smashPressed = false;
  }
  update(state) {
    this.prev = this.cur; this.cur = state;
    const p = this.prev, c = this.cur;
    this.flickX++; this.flickY++;
    // "stick rápido": llega al tope habiendo estado cerca del centro hace 1-3 cuadros
    // (un pulgar real tarda un par de cuadros en recorrer el stick)
    const hx = this.hx || (this.hx = [0, 0, 0]), hy = this.hy || (this.hy = [0, 0, 0]);
    const fromCenter = (h, v) => h.some(q => Math.abs(q) < 0.3 || sign(q) !== sign(v));
    if (Math.abs(c.x) > 0.75 && !(Math.abs(p.x) > 0.75 && sign(p.x) === sign(c.x)) && fromCenter(hx, c.x)) { this.flickX = 0; this.flickDirX = sign(c.x); }
    if (Math.abs(c.y) > 0.72 && !(Math.abs(p.y) > 0.72 && sign(p.y) === sign(c.y)) && fromCenter(hy, c.y)) { this.flickY = 0; this.flickDirY = sign(c.y); }
    hx.unshift(p.x); hx.length = 3; hy.unshift(p.y); hy.length = 3;
    this.fullX = Math.abs(c.x) > 0.92 ? (this.fullX || 0) + 1 : 0;
    for (const b of BUTTONS) { this.buffer[b]++; if (c[b] && !p[b]) this.buffer[b] = 0; }
    this.smashPressed = c.smash && !p.smash;
    const cOn = s => Math.abs(s.cx) > 0.6 || Math.abs(s.cy) > 0.6;
    this.cPressed = (cOn(c) && !cOn(p)) || this.smashPressed;
  }
  // dirección del ataque smash (stick derecho o botón Smash + dirección); 0,0 = hacia delante
  cdir() {
    const c = this.cur;
    if (!this.smashPressed && (c.cx || c.cy)) return Math.abs(c.cx) >= Math.abs(c.cy) ? { x: sign(c.cx), y: 0 } : { x: 0, y: sign(c.cy) };
    if (Math.abs(c.x) >= Math.abs(c.y) && Math.abs(c.x) > 0.3) return { x: sign(c.x), y: 0 };
    if (Math.abs(c.y) > 0.3) return { x: 0, y: sign(c.y) };
    return { x: 0, y: 0 };
  }
  get tapJump() { return this.cur.tapJump !== false; }
  // teclado: todo o nada, sin "inclinar" el stick; los smash van con su botón
  get digital() { return !!this.cur.digital; }
  pressed(b) { return this.cur[b] && !this.prev[b]; }
  // cada botón se recuerda unos cuadros: el salto más, porque se aprieta justo al aterrizar o al acabar un golpe
  buffered(b, n) { return this.buffer[b] <= (n === undefined ? (BUFFER[b] || 5) : n); }
  consume(b) { this.buffer[b] = 99; }
  held(b) { return !!this.cur[b]; }
  get x() { return this.cur.x; }
  get y() { return this.cur.y; }
  upFlick(n = 4) { return this.flickY <= n && this.flickDirY < 0; }
  tapUp(n = 2) { return this.tapJump && this.upFlick(n) && this.cur.y < -0.7; }
  downFlick(n = 4) { return this.flickY <= n && this.flickDirY > 0; }
  sideFlick(n = 4) { return this.flickX <= n; }
}

// Captura de un botón/tecla nueva para reasignar
function startCapture(dev, action) {
  Object.assign(Capture, { active: true, dev, action, t: 0, result: null, cancel: false });
  if (!dev.startsWith('kb')) { const p = padInfo.find(p => 'pad' + p.index === dev); Capture.baseB = p ? p.buttons.slice() : []; Capture.baseA = p ? p.axes.slice() : []; }
}
function pollCapture() {
  if (!Capture.active) return null;
  Capture.t++;
  if (Capture.cancel || Capture.t > 60 * 8) { Capture.active = false; return { cancelled: true }; }
  let res = null;
  if (Capture.dev.startsWith('kb')) { if (Capture.result) res = Capture.result; }
  else {
    const p = padInfo.find(p => 'pad' + p.index === Capture.dev);
    if (!p) { Capture.active = false; return { cancelled: true }; }
    if (Capture.t > 8) {
      for (let i = 0; i < p.buttons.length; i++) {
        if (p.buttons[i] && !Capture.baseB[i]) { res = { b: i }; break; }
        if (!p.buttons[i]) Capture.baseB[i] = false;
      }
      if (!res) for (let i = 0; i < p.axes.length; i++) {
        const d = p.axes[i] - (Capture.baseA[i] || 0);
        if (Math.abs(d) > 0.8) { res = { a: i, s: sign(d) }; break; }
      }
    }
  }
  if (res) { Capture.active = false; return { bind: res }; }
  return null;
}

// Controladores por dispositivo (siempre activos; también navegan menús)
const Devices = {
  list: ['kb1', 'kb2'],
  ctrls: {},
  pads: [],
  share: null, // { dev, full }: el único teclado en juego también lee el otro esquema
  poll() {
    this.pads = readPads();
    this.share = typeof kbShareNow === 'function' ? kbShareNow() : null;
    const want = ['kb1', 'kb2', ...(TouchPad.active ? ['touch'] : []), ...padInfo.map(p => 'pad' + p.index)];
    this.list = want;
    for (const d of want) {
      if (!this.ctrls[d]) this.ctrls[d] = new Controller(d);
      this.ctrls[d].update(Capture.active ? blankState() : readDevice(d, this.pads));
    }
    keysTapped.clear();
  },
  // flancos de navegación de menú, con auto-repetición
  nav(dev) {
    const c = this.ctrls[dev]; if (!c || Capture.active) return {};
    const out = {};
    const dirs = [['left', c.x < -0.6], ['right', c.x > 0.6], ['up', c.y < -0.6], ['down', c.y > 0.6]];
    c._rep = c._rep || {};
    for (const [k, on] of dirs) {
      if (on) { c._rep[k] = (c._rep[k] || 0) + 1; const t = c._rep[k]; out[k] = t === 1 || (t > 18 && t % 6 === 0); }
      else c._rep[k] = 0;
    }
    out.confirm = c.pressed('attack') || keyEdge(dev, 'Enter');
    out.back = c.pressed('special') || keyEdge(dev, 'Escape');
    out.start = c.pressed('start');
    out.jump = c.pressed('jump');
    out.grab = c.pressed('grab');
    out.shield = c.pressed('shield');
    return out;
  },
  anyConfirm() {
    for (const d of this.list) { const n = this.nav(d); if (n.confirm || n.start) return d; }
    return null;
  },
};
// ---------- vibración ----------
// Los controles con motores (Xbox, DualShock/DualSense, Switch Pro en Chrome/Edge) sienten
// cada golpe: fuerte al recibir, un toque seco al conectar, un tirón largo al salir volando.
// Un efecto nuevo reemplaza al que está sonando solo si es más fuerte o si ese ya se acabó,
// para que la ráfaga de un combo no apague el golpe grande.
const Rumble = {
  on: (() => { try { return localStorage.getItem('golpazo-rumble') !== '0'; } catch (e) { return true; } })(),
  cur: {},    // dev -> { until, power }
  log: null,  // pruebas: si es un arreglo, anota cada efecto
  set(v) { this.on = v; try { localStorage.setItem('golpazo-rumble', v ? '1' : '0'); } catch (e) { /* sin almacenamiento */ } },
  pad(dev) {
    if (!dev || !dev.startsWith('pad')) return null;
    const idx = +dev.slice(3);
    try { const all = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of all) if (p && p.index === idx) return p; } catch (e) { /* vetado */ }
    return null;
  },
  canRumble(dev) {
    if (dev === 'touch') return !!navigator.vibrate;
    const p = this.pad(dev);
    return !!(p && ((p.vibrationActuator && p.vibrationActuator.playEffect) || (p.hapticActuators && p.hapticActuators[0])));
  },
  // strong: motor grande (grave), weak: motor chico (agudo), ms: duración, trig: gatillos Xbox (Edge/Chrome en Windows)
  play(dev, strong, weak, ms, trig) {
    if (!this.on || !dev || typeof dev !== 'string') return false;
    if (!dev.startsWith('pad') && dev !== 'touch') return false;
    strong = clamp(strong, 0, 1); weak = clamp(weak, 0, 1); ms = Math.round(clamp(ms, 20, 1500));
    const now = performance.now(), power = Math.max(strong, weak), c = this.cur[dev];
    if (c && now < c.until && power < c.power) return false;
    this.cur[dev] = { until: now + ms, power };
    if (this.log) this.log.push({ dev, strong: +strong.toFixed(2), weak: +weak.toFixed(2), ms });
    try {
      if (dev === 'touch') { if (navigator.vibrate && power >= 0.3) navigator.vibrate(Math.round(ms * power)); return true; }
      const p = this.pad(dev); if (!p) return false;
      const va = p.vibrationActuator;
      if (va && va.playEffect) {
        const fx = { startDelay: 0, duration: ms, strongMagnitude: strong, weakMagnitude: weak };
        const hasTrig = trig && Array.isArray(va.effects) && va.effects.includes('trigger-rumble');
        const r = hasTrig ? va.playEffect('trigger-rumble', Object.assign(fx, { leftTrigger: trig.l || 0, rightTrigger: trig.r || 0 })) : va.playEffect('dual-rumble', fx);
        if (r && r.catch) r.catch(() => {});
        return true;
      }
      const h = p.hapticActuators && p.hapticActuators[0];
      if (h && h.pulse) { const r = h.pulse(power, ms); if (r && r.catch) r.catch(() => {}); return true; }
    } catch (e) { /* el control no vibra */ }
    return false;
  },
  stop(dev) {
    delete this.cur[dev];
    try { const p = this.pad(dev); if (p && p.vibrationActuator && p.vibrationActuator.reset) { const r = p.vibrationActuator.reset(); if (r && r.catch) r.catch(() => {}); } } catch (e) { /* nada */ }
  },
  stopAll() { for (const d of Object.keys(this.cur)) this.stop(d); if (navigator.vibrate) try { navigator.vibrate(0); } catch (e) { /* nada */ } },
  // quién siente algo de un peleador: solo personas en este aparato (no CPU, no jugadores remotos, no la demo)
  devOf(f) {
    const B = typeof BATTLE !== 'undefined' ? BATTLE : null;
    if (!f || f.cpu || !f.dev || (B && B.demo)) return null;
    return f.dev;
  },
  // ---- patrones ----
  hurt(f, dmg, kb, hitlag) {  // recibir un golpe: más daño y más retroceso, más fuerte y más largo
    const d = this.devOf(f); if (!d) return;
    const k = clamp(dmg / 20 + kb / 60, 0, 1);
    this.play(d, 0.25 + k * 0.75, 0.45 + k * 0.5, 90 + hitlag * 12 + kb * 2.2);
  },
  land(f, dmg, hitlag) {      // conectar un golpe: un toque seco en el motor chico
    const d = this.devOf(f); if (!d) return;
    const k = clamp(dmg / 20, 0, 1);
    this.play(d, 0.08 + k * 0.35, 0.3 + k * 0.45, 45 + hitlag * 7, { r: 0.25 + k * 0.5 });
  },
  block(f, dmg) { const d = this.devOf(f); if (d) this.play(d, 0.05, 0.22 + clamp(dmg / 25, 0, 0.3), 55, { l: 0.3 }); },
  parry(f) { const d = this.devOf(f); if (d) this.play(d, 0.15, 1, 70, { l: 0.8 }); },
  parried(f) { const d = this.devOf(f); if (d) this.play(d, 0.55, 0.2, 180); },
  shieldBreak(f) { const d = this.devOf(f); if (d) this.play(d, 0.95, 0.6, 520); },
  ko(f) { const d = this.devOf(f); if (d) this.play(d, 1, 1, 480); },
  scored(f) { const d = this.devOf(f); if (d) this.play(d, 0.35, 0.7, 160, { r: 0.6 }); },
  thud(f, k) { const d = this.devOf(f); if (d) this.play(d, 0.4 + k * 0.5, 0.2, 120 + k * 120); },
  charge(f, k) { const d = this.devOf(f); if (d) this.play(d, 0.06 + k * 0.3, 0.1 + k * 0.15, 130); },
  // en línea el invitado solo recibe fotos del anfitrión: se deduce qué pasó comparando
  fromSnapshot(dev, was, f) {
    const lost = f.hp !== undefined && was.hp !== undefined && f.hp < was.hp ? was.hp - f.hp : f.percent - (was.pct || 0);
    if (f.dead && !was.dead) this.play(dev, 1, 1, 480);
    else if (lost > 0.5 && !f.dead) { const k = clamp(lost / 20, 0, 1); this.play(dev, 0.25 + k * 0.75, 0.45 + k * 0.5, 110 + lost * 12); }
    else if (f.state === 'dizzy' && was.st === 'shield') this.play(dev, 0.95, 0.6, 520);
    else if (f.state === 'shield' && f.shieldHP < was.sh - 0.5) this.play(dev, 0.05, 0.3, 55);
    else if (f.hitlag && !was.lag) this.play(dev, 0.15, 0.5, 70);  // mi golpe conectó
  },
};
window.addEventListener('blur', () => Rumble.stopAll());

// flancos de Enter/Esc en el teclado 1 (siempre sirven en menús)
const _keyPrev = new Set();
function keyEdge(dev, code) {
  if (dev !== 'kb1') return false;
  return keysDown.has(code) && !_keyPrev.has(code);
}
function endFrameKeys() { _keyPrev.clear(); for (const k of keysDown) _keyPrev.add(k); }
Binds.load();
