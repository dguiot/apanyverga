'use strict';
// ============================================================
//  MENÚS Y FLUJO DE PANTALLAS (estilo arcade de peleas)
// ============================================================
const GOLD = '#ffc53d', RED = '#e63946', DEEP = '#07090f', PAPER = '#f4f6fa', MUTED = '#9aa7b8', STEEL = '#5b6778', INK = '#07090f';
const TEAL = '#2ec4b6';

function devLabel(d) {
  if (!d) return '';
  if (d === 'kb1') return 'Teclado 1';
  if (d === 'kb2') return 'Teclado 2';
  if (d === 'touch') return 'Pantalla táctil';
  if (d === 'local') return 'Tú · control o teclado';
  if (d.startsWith('net:')) return d.slice(4);
  const p = padInfo.find(p => 'pad' + p.index === d);
  return p ? shortPadName(p.id) : 'Control';
}
// Paralelogramo inclinado (la forma base de toda la interfaz)
function slabPath(x, y, w, h, sk = 0.22) {
  const o = h * sk;
  ctx.beginPath(); ctx.moveTo(x + o, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - o, y + h); ctx.lineTo(x, y + h); ctx.closePath();
}
function slab(x, y, w, h, o = {}) {
  const sk = o.skew ?? 0.22;
  slabPath(x, y, w, h, sk);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, o.top || 'rgba(34,40,54,.94)'); g.addColorStop(1, o.bottom || 'rgba(12,15,22,.96)');
  ctx.fillStyle = g; ctx.fill();
  if (o.edge !== null) { ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.edge || 'rgba(154,167,184,.35)'; ctx.stroke(); }
}
function sfText(str, x, y, size, col = PAPER, o = {}) {
  ctx.save(); ctx.translate(x, y); if (o.italic !== false) ctx.transform(1, 0, -0.18, 1, 0, 0);
  text(str.toUpperCase ? (o.keepCase ? str : str.toUpperCase()) : str, 0, size * 0.08, size, col, { weight: o.weight || 700, align: o.align || 'center', stroke: o.stroke === undefined ? 'rgba(0,0,0,.85)' : o.stroke, strokeW: o.strokeW || Math.max(3, size / 9) });
  ctx.restore();
}
function sfButton(label, x, y, w, h, on) {
  slab(x, y, w, h, on ? { top: '#ffd76a', bottom: '#e0a01a', edge: '#fff3c4' } : {});
  sfText(label, x + w / 2, y + h / 2, h * 0.62, on ? INK : PAPER, { stroke: on ? null : 'rgba(0,0,0,.8)' });
}
function drawMenuBG(seed = 0) {
  const t = APP.t;
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#0b0e16'); g.addColorStop(0.55, '#141a28'); g.addColorStop(1, '#2a0d14');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // haces diagonales de energía
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const off = ((i * 197 + seed * 91 + (reducedMotion ? 0 : t * (1.2 + (i % 3) * 0.6))) % (W + 600)) - 300;
    const gw = 30 + (i % 4) * 26;
    const lg = ctx.createLinearGradient(off, 0, off + gw, 0);
    lg.addColorStop(0, 'rgba(230,57,70,0)'); lg.addColorStop(0.5, i % 3 ? 'rgba(230,57,70,.10)' : 'rgba(255,197,61,.08)'); lg.addColorStop(1, 'rgba(230,57,70,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(off, 0); ctx.lineTo(off + gw, 0); ctx.lineTo(off + gw - 260, H); ctx.lineTo(off - 260, H); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // líneas de escaneo + viñeta
  ctx.fillStyle = 'rgba(255,255,255,.025)'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
const GAME_NAME = 'A pan y verga', GAME_TAGLINE = '…y se nos acabó el pan';
function logo(x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.save(); ctx.transform(1, 0, -0.2, 1, 0, 0);
  ctx.font = `700 64px ${FONT_DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  ctx.lineWidth = 10; ctx.strokeStyle = INK; ctx.strokeText('A PAN Y', -118, -46);
  ctx.fillStyle = RED; ctx.fillText('A PAN Y', -118, -46);
  ctx.font = `700 170px ${FONT_DISPLAY}`;
  ctx.lineWidth = 22; ctx.strokeStyle = INK; ctx.strokeText('VERGA', 0, 88);
  ctx.lineWidth = 8; ctx.strokeStyle = '#8c0b1c'; ctx.strokeText('VERGA', 0, 88);
  const g = ctx.createLinearGradient(0, -30, 0, 90);
  g.addColorStop(0, '#fff8e1'); g.addColorStop(0.45, GOLD); g.addColorStop(0.5, '#f59f00'); g.addColorStop(1, '#c2410c');
  ctx.fillStyle = g; ctx.fillText('VERGA', 0, 88);
  ctx.restore();
  // subtítulo
  ctx.font = `italic 600 34px ${FONT_BODY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.strokeText(GAME_TAGLINE, 24, 134);
  ctx.fillStyle = '#f3e3c3'; ctx.fillText(GAME_TAGLINE, 24, 134);
  ctx.restore();
}
// Orden fijo de la portada y de la selección: las caras de persona repartidas entre los demás
// (en la selección quedan tres por fila, nunca dos juntas). Los que se agreguen después van al final.
const ROSTER = ['torito', 'daniel', 'chilazo', 'nicole', 'dino', 'mariachi', 'nacho', 'axo', 'puentin', 'chispa', 'michi', 'robes', 'luchador', 'pablo', 'chupa'];
CHAR_ORDER.sort((a, b) => (ROSTER.includes(a) ? ROSTER.indexOf(a) : 99) - (ROSTER.includes(b) ? ROSTER.indexOf(b) : 99));
const NCH = () => CHAR_ORDER.length; // la tarjeta NCH() es "Aleatorio"
function lineupX(i) { const n = CHAR_ORDER.length, sp = Math.min(215, (W - 150) / (n - 1)); return W / 2 + (i - (n - 1) / 2) * sp; }
function lineup(y, scale) {
  CHAR_ORDER.forEach((id, i) => {
    const x = lineupX(i);
    const flip = i > (CHAR_ORDER.length - 1) / 2;
    ctx.save(); ctx.translate(x, y); ctx.scale((flip ? -1 : 1) * scale * CHARS[id].size, scale * CHARS[id].size);
    const ph = APP.t * 0.07 + i;
    const p = mkPose(Object.assign({}, POSES.idle, { bodyY: Math.sin(ph) * 2, armF: [0.9 + Math.sin(ph) * 0.05, 1.75] }));
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(0, 0, 30, 6, 0, 0, TAU); ctx.fill();
    drawCharacter(ctx, id, p, { flip });
    ctx.restore();
  });
}
// tamaño de letra que cabe en maxW (títulos en mayúsculas)
function fitSize(str, maxW, size) {
  ctx.font = `700 ${size}px ${FONT_DISPLAY}`;
  const w = ctx.measureText(str.toUpperCase()).width;
  return w > maxW ? Math.max(14, Math.floor(size * maxW / w)) : size;
}
function wrapText(str, x, y, maxW, size, lh, col, align = 'center') {
  ctx.font = `500 ${size}px ${FONT_BODY}`;
  const words = str.split(' '); let line = '', yy = y;
  const lines = [];
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  for (const l of lines) { text(l, x, yy, size, col, { body: true, align, weight: 500 }); yy += lh; }
}

const APP = {
  screen: 'title', t: 0, idle: 0, battle: null, results: null, firstDev: null,
  slots: [{ type: 'none' }, { type: 'none' }, { type: 'none' }, { type: 'none' }],
  rules: { mode: 'stock', stocks: 3, time: 3, items: 2, teams: false, party: false },
  cpuLevel: 5, stageSel: 0, stageRow: 0, menuSel: 0, ctrlTab: 0, lastSetup: null, pendingSetup: null,
  bind: { col: 0, dev: 0, row: 0, msg: '' },
  go(s) {
    const prev = this.screen;
    this.screen = s; this.t = 0; this.idle = 0;
    if (prev === 'fame' && s !== 'fame') Fame.close();
    if (s === 'fame' && prev !== 'fame') Fame.open();
    // versión web: la primera vez que entras al online te pregunta cómo te llamas
    if (s === 'online' && window.APYV_WEB && Net.user && Net.user.askName) setTimeout(() => Net.user.askName(), 60);
    if (['title', 'main', 'modesel', 'charsel', 'stagesel', 'controls', 'binds', 'fame'].includes(s)) Audio8.playSong('menu');
    if (s === 'modesel') this.modeSel = Math.max(0, MODES.findIndex(m => m.id === this.rules.mode));
  },
  startBattle(setup) {
    this.lastSetup = setup;
    const online = Net.role === 'host';
    this.battle = new Battle(setup, { online });
    NetEv.on = online;
    if (online) Net.publishLobby({ ph: 'game' });
    this.go('battle');
  },
  showVS(setup) { this.pendingSetup = setup; this.go('vs'); Audio8.sfx('go'); },
  startDemo() {
    const ids = CHAR_ORDER.slice().sort(() => Math.random() - 0.5).slice(0, 4);
    const setup = { players: ids.map((id, i) => ({ port: i, char: id, cpu: 7 })), stage: pick(STAGE_INFO).id, rules: { mode: 'stock', stocks: 2, items: 3 } };
    this.battle = new Battle(setup, { demo: true }); this.go('demo');
  },
  showResults(r) {
    this.results = r; BATTLE = null; this.battle = null; this.go('results'); Audio8.playSong('results');
    const rec = Net.role === 'host' ? Fame.recordOf(r, this.lastSetup) : null;
    if (Net.role === 'host') { NetEv.on = false; Net.set({ st: null }); Net.publishLobby({ ph: 'res', res: Net.encodeResults(r), fm: rec }); }
    if (rec) Fame.save(rec, false);
  },
  update() {
    this.t++;
    const S = this[this.screen + 'Update'];
    if (S) S.call(this);
  },
  draw() {
    const S = this[this.screen + 'Draw'];
    if (S) S.call(this);
    if (avButtonShown()) {
      const b = AV_BTN, on = AV.on, hv = hover(b.x, b.y, b.w, b.h);
      slab(b.x, b.y, b.w, b.h, { skew: 0.2, top: on ? '#34d399' : hv ? '#ffd76a' : undefined, bottom: on ? '#059669' : hv ? '#e0a01a' : undefined, edge: on ? '#a7f3d0' : undefined });
      if (on) {
        // prendido: micrófono · cámara · salir
        const sg = AV.segs(b), lab = { mic: AV.mic ? '🎤' : '🔇', cam: AV.cam ? '📷' : '🚫', off: `✕ Salir · ${AV.count() + 1}` };
        for (const q of sg) { if (hover(q.x, q.y, q.w, q.h)) { ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(q.x + 4, q.y + 4, q.w - 8, q.h - 8); } text(lab[q.a], q.x + q.w / 2, q.y + q.h / 2 + 1, q.a === 'off' ? 14 : 17, INK, { body: true, weight: 700 }); }
        ctx.strokeStyle = 'rgba(6,40,30,.45)'; ctx.lineWidth = 1.5; for (const q of sg.slice(1)) { ctx.beginPath(); ctx.moveTo(q.x, q.y + 8); ctx.lineTo(q.x, q.y + q.h - 8); ctx.stroke(); }
      } else text(AV.starting ? 'Pidiendo permiso…' : '🎥 Cámara y voz', b.x + b.w / 2, b.y + b.h / 2 + 1, 15, hv ? INK : PAPER, { body: true, weight: 700 });
      if (AV.err && performance.now() - AV.errT < 12000) {
        slab(W - 452, 62, 420, 96, { skew: 0.05, edge: '#ff9f1c' });
        wrapText(AV.err, W - 242, 82, 380, 14, 19, '#f1f5f9');
      }
    }
    TouchPad.draw();
    IOSFS.update();
    Toasts.draw();
    const sx = W - 58, sy = 14;
    if (!['battle', 'demo', 'vs', 'netview'].includes(this.screen)) {
      slab(sx, sy, 46, 40, { skew: 0.2 });
      text(Audio8.muted ? '🔇' : '🔊', sx + 23, sy + 21, 18, PAPER, { body: true });
      // el navegador todavía no deja sonar (con control de juego pasa siempre: sus botones no cuentan como gesto)
      if (!Audio8.ready && Audio8.soundMode() !== 'off' && ['title', 'main', 'online'].includes(this.screen)) {
        const touchy = TouchPad.active || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
        const msg = touchy ? 'Toca la pantalla para activar el sonido' : 'Haz clic o pulsa una tecla para activar el sonido';
        const a = 0.75 + 0.25 * Math.sin(this.t / 9);
        slab(sx - 392, sy + 2, 380, 36, { skew: 0.2, edge: '#ffbe0b' });
        ctx.globalAlpha = a; text('🔈 ' + msg, sx - 202, sy + 21, 15, '#ffe8a3', { body: true, weight: 700 }); ctx.globalAlpha = 1;
      }
    }
    UIFocus.draw(); // el marco del botón que tiene el control, encima de todo
  },

  // ---------------- el control llega a todos los botones (focus.js) ----------------
  // El cursor propio de cada pantalla: sus casillas (items), dónde está (cur), cómo moverlo (sel),
  // qué direcciones usa siempre (own) y qué botones anotados ya cubre él (hide).
  // false: esta pantalla (o este control) no usa el foco.
  focusNative(d) {
    const R = (x, y, w, h) => ({ x, y, w, h });
    const grid = k => k === 'left' || k === 'right'; // en las rejillas ←→ recorre y da la vuelta
    const cardsR = () => { const c = []; for (let i = 0; i <= NCH(); i++) c.push(this.cardRect(i)); return c; };
    switch (this.screen) {
      case 'title': case 'results': return { items: [] };
      case 'fame': return { items: [], own: k => k === 'up' || k === 'down' }; // ↑↓ recorre la tabla
      case 'main': { const it = this.mainOptions().map((o, i) => R(W / 2 - 230, this.mainY(i), 460, 50)); return { items: it, cur: it[this.menuSel], sel: i => { this.menuSel = i; } }; }
      case 'online': {
        if (!Net.ok) return { items: [] };
        const n0 = Net.hosts().filter(h => !h.sameTab).length + 1, it = [];
        for (let i = 0; i < n0; i++) it.push(R(W / 2 - 300, 200 + i * 70, 600, 58));
        return { items: it, cur: it[clamp(this.onSel, 0, n0 - 1)], sel: i => { this.onSel = i; } };
      }
      case 'modesel': {
        const it = MODES.map((m, i) => this.modeRect(i)).concat([0, 1, 2].map(i => this.toggleRect(i)));
        return { items: it, cur: it[this.modeSel], own: grid, sel: k => { this.modeSel = k; if (k < MODES.length) this.rules.mode = MODES[k].id; } };
      }
      case 'charsel': {
        const si = this.humanSlot(Net.role === 'host' ? 'local' : d);
        if (si < 0) return false; // quien no se ha unido: A lo une
        const S = this.slots[si], T = this.slots[S.edit] || S, cards = cardsR();
        const slots = [0, 1, 2, 3].map(i => this.slotRect(i)), bodies = slots.map(r => R(r.x, r.y, r.w, r.h - 100));
        if (T === S && S.ready) {
          const fi = S.focus >= 0 && S.focus < 4 ? S.focus : si, F = this.slots[fi];
          return { items: slots, cur: slots[fi], hide: cards.concat(bodies), sel: i => { S.focus = i; }, own: k => grid(k) || (F.type === 'cpu' && !F.remote && (k === 'up' || k === 'down')) };
        }
        return { items: cards, cur: cards[clamp(T.cur, 0, NCH())], sel: i => { T.cur = i; }, own: k => grid(k) || (T.type === 'cpu' && (k === 'up' || k === 'down')) };
      }
      case 'netroom': {
        const g = Net.guest, cards = cardsR();
        if (g.rdy) return { items: [], hide: cards };
        return { items: cards, cur: cards[clamp(g.ch, 0, NCH())], own: grid, sel: i => { g.ch = i; Net.set({ ch: g.ch, rdy: g.rdy, tm: g.tm }); } };
      }
      case 'stagesel': {
        const rows = this.ruleRows(), cards = [], idx = [];
        STAGE_INFO.forEach((s, i) => { if (!this.stageLocked(i)) { cards.push(this.stageRect(i)); idx.push(i); } });
        const rr = rows.map((row, i) => R(W / 2 - 290, this.ruleY(i) - 2, 580, 38));
        const arrows = rows.flatMap((row, i) => [R(W / 2 + 10, this.ruleY(i), 50, 34), R(W / 2 + 210, this.ruleY(i), 50, 34)]);
        const cur = this.stageRow === 0 ? cards[Math.max(0, idx.indexOf(this.stageSel))] : rr[this.stageRow - 1];
        return { items: cards.concat(rr), cur, hide: arrows, own: grid,
          sel: k => { if (k < cards.length) { this.stageSel = idx[k]; this.stageRow = 0; } else this.stageRow = k - cards.length + 1; } };
      }
      case 'binds': {
        const B = this.bind, devs = Devices.list.map((x, i) => R(40, 120 + i * 62, 330, 52)), rows = this.bindRows(Devices.list[clamp(B.dev, 0, Devices.list.length - 1)]).map((r, i) => R(410, 116 + i * 40, 830, 36));
        if (B.col === 0) return { items: devs, cur: devs[clamp(B.dev, 0, devs.length - 1)], hide: rows, own: k => k === 'right', sel: i => { B.dev = i; } };
        return { items: rows, cur: rows[clamp(B.row, 0, rows.length - 1)], hide: devs, own: k => k === 'left', sel: i => { B.row = i; } };
      }
      case 'controls': { const it = [R(W / 2 - 280, 76, 270, 44), R(W / 2 + 10, 76, 270, 44)]; return { items: it, cur: it[this.ctrlTab], own: grid, sel: i => { this.ctrlTab = i; } }; }
      default: return false;
    }
  },

  // ---------------- TÍTULO ----------------
  titleUpdate() {
    this.idle++;
    const d = Devices.anyConfirm();
    if (d || Pointer.clicked) {
      Audio8.unlock(); Audio8.sfx('confirm');
      if (d && /^pad/.test(d) && !Audio8.ready && Audio8.soundMode() !== 'off') Toasts.push('🔈 Para oír el juego: un clic o una tecla (el navegador no deja sonar con solo el control)');
      this.firstDev = d || pointerDev();
      if (Net.wantCode) { this.inviteT = 0; return this.go('online'); } // abriste un link de invitación
      this.go('main'); this.menuSel = 0; return;
    }
    for (const dv of Devices.list) { const c = Devices.ctrls[dv]; if (c && c.cur.any) this.idle = 0; }
    if (this.idle > 60 * 22) this.startDemo();
  },
  titleDraw() {
    drawMenuBG();
    logo(W / 2, 150, 1);
    // piso
    const fl = ctx.createLinearGradient(0, 560, 0, H);
    fl.addColorStop(0, 'rgba(230,57,70,.18)'); fl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fl; ctx.fillRect(0, 560, W, H - 560);
    // sin nombres: la fila de personajes habla sola
    lineup(612, CHAR_ORDER.length <= 5 ? 1.55 : 1.22);
    const focused = !document.hasFocus || document.hasFocus();
    if (Math.floor(this.t / 30) % 2 === 0 || reducedMotion) sfText(TouchPad.active || (window.matchMedia && matchMedia('(pointer: coarse)').matches) ? 'Toca para jugar' : focused ? 'Presiona Start · Enter · A' : 'Haz clic aquí para jugar', W / 2, 668, 34, GOLD);
    const np = padInfo.length;
    let pm = np ? `🎮 ${np} control${np > 1 ? 'es' : ''} conectado${np > 1 ? 's' : ''}` : '🎮 Conecta tu control Bluetooth y pulsa cualquier botón';
    if (!np && gamepadsBlocked) pm = '🎮 Esta página no deja leer controles aquí dentro: abre el archivo del juego en Edge o Chrome';
    else if (!np && inFrame && this.t > 600) pm = '🎮 ¿No aparece tu control? Pulsa un botón; si sigue sin salir, abre el archivo del juego en Edge o Chrome';
    text(pm, W / 2, 704, 15, np ? TEAL : gamepadsBlocked ? '#ff9f1c' : MUTED, { body: true, weight: 500 });
  },

  // ---------------- DEMO ----------------
  demoUpdate() {
    this.battle.update();
    for (const d of Devices.list) { const c = Devices.ctrls[d]; if (c && c.cur.any && !c.prev.any) { BATTLE = null; this.go('title'); return; } }
    if (Pointer.clicked || !BATTLE || (this.battle.phase === 'end' && this.battle.endT > 100)) { BATTLE = null; this.go('title'); }
  },
  demoDraw() { if (this.battle) this.battle.draw(); },

  // ---------------- MENÚ PRINCIPAL ----------------
  mainOptions() { return ['Pelear', 'Jugar online', 'Salón de la fama', 'Cómo jugar', 'Configurar botones', `Sonido: ${({ all: 'Sí', fx: 'Solo efectos', off: 'No' })[Audio8.soundMode()]}`, `Vibración del control: ${Rumble.on ? 'Sí' : 'No'}`]; },
  mainY(i) { return 228 + i * 58; },
  mainUpdate() {
    const opts = this.mainOptions();
    for (const d of Devices.list) {
      const n = Devices.nav(d);
      if (n.up) { this.menuSel = (this.menuSel + opts.length - 1) % opts.length; Audio8.sfx('menu'); }
      if (n.down) { this.menuSel = (this.menuSel + 1) % opts.length; Audio8.sfx('menu'); }
      if (n.confirm || n.start) { this.firstDev = d; return this.mainChoose(this.menuSel); }
      if (n.back) { Audio8.sfx('back'); return this.go('title'); }
    }
    opts.forEach((o, i) => { if (clickIn(W / 2 - 230, this.mainY(i), 460, 50)) { this.menuSel = i; this.mainChoose(i); } });
  },
  mainChoose(i) {
    Audio8.sfx('confirm');
    if (i === 0) {
      // lugares que quedaron de una sala en línea (invitados, el aparato "local") no sirven aquí
      if (!this.slots.some(s => s.type === 'human') || this.slots.some(s => s.remote || s.dev === 'local')) this.slots = [{ type: 'human', dev: this.firstDev || 'kb1', cur: 0, ready: false, edit: 0 }, { type: 'none' }, { type: 'none' }, { type: 'none' }];
      this.modeBack = 'main'; this.go('modesel');
    }
    if (i === 1) { this.onSel = 0; this.go('online'); }
    if (i === 2) this.go('fame');
    if (i === 3) this.go('controls');
    if (i === 4) { this.bind = { col: 0, dev: Math.max(0, Devices.list.indexOf(this.firstDev)), row: 0, msg: '' }; this.go('binds'); }
    if (i === 5) Audio8.cycleSound();
    if (i === 6) {
      Rumble.set(!Rumble.on);
      // al prenderla, todos los controles conectados dan un tirón para comprobar que vibran
      if (Rumble.on) { const pads = Devices.list.filter(d => d.startsWith('pad')); for (const d of pads) Rumble.play(d, 0.6, 0.8, 260);
        Toasts.push(!pads.length ? 'Vibración activada: conecta un control para sentirla' : pads.some(d => Rumble.canRumble(d)) ? '🎮 Vibración activada' : 'Este navegador no deja vibrar al control (prueba en Chrome o Edge)'); }
    }
  },
  mainDraw() {
    drawMenuBG(1);
    logo(W / 2, 118, 0.62);
    this.mainOptions().forEach((o, i) => {
      const y = this.mainY(i), sel = i === this.menuSel || hover(W / 2 - 230, y, 460, 50);
      sfButton(o, W / 2 - 230 + (sel ? 12 : 0), y, 460, 50, sel);
    });
    const desc = ['Hasta 4 jugadores en esta pantalla: 6 modos, equipos y Modo Fiesta', 'Pelea con tus amigos, cada quien desde su casa', 'Ranking de tus amigos por cuenta: victorias, rachas y KOs', 'Combinaciones de golpes y prueba de control', 'Cambia las teclas y los botones del control', 'Todo · solo efectos (sin música) · nada', 'El control vibra al pegar, al recibir golpes y al salir volando'][this.menuSel];
    text(desc, W / 2, 660, 18, '#cbd5e1', { body: true, weight: 500 });
    text('A / J / Enter: aceptar   ·   B / K / Esc: volver', W / 2, 694, 14, MUTED, { body: true });
  },

  // ---------------- SELECCIÓN DE MODO ----------------
  // 0-5 modos · 6 Equipos · 7 Modo Fiesta · 8 continuar
  modeSel: 0, modeBack: 'main',
  modeRect(i) { const w = 386, h = 150, gap = 16, x0 = (W - (3 * w + 2 * gap)) / 2; return { x: x0 + (i % 3) * (w + gap), y: 84 + Math.floor(i / 3) * (h + gap), w, h }; },
  toggleRect(i) { const w = 386, gap = 16, x0 = (W - (3 * w + 2 * gap)) / 2; return { x: x0 + i * (w + gap), y: 420, w, h: 96 }; },
  // ---------------- invitar a la sala (anfitrión) ----------------
  // arriba a la izquierda en la selección de personajes, abajo a la derecha al elegir el modo
  // (arriba a la derecha van la cámara y el sonido)
  inviteRect() { return this.screen === 'modesel' ? { x: W - 290, y: 648, w: 250, h: 40 } : { x: 118, y: 14, w: 250, h: 40 }; },
  inviteShown() { return Net.role === 'host' && !!Net.code && ['modesel', 'charsel'].includes(this.screen); },
  inviteHit(x, y) { if (!this.inviteShown()) return false; const b = this.inviteRect(); return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; },
  // el clic en el botón se atiende en su propio evento (ver abajo): aquí solo se evita que atraviese al menú
  inviteUpdate() { if (Pointer.clicked && this.inviteHit(Pointer.x, Pointer.y)) Pointer.clicked = false; },
  inviteDraw(showLink) {
    if (Net.role !== 'host' || !Net.code) return;
    const b = this.inviteRect(), hv = hover(b.x, b.y, b.w, b.h), kb = !TouchPad.active;
    slab(b.x, b.y, b.w, b.h, { skew: 0.2, top: hv ? '#ffd76a' : '#34d399', bottom: hv ? '#e0a01a' : '#059669', edge: '#a7f3d0' });
    text(`📨 Invitar · sala ${Net.code}${kb ? ' (I)' : ''}`, b.x + b.w / 2, b.y + b.h / 2 + 1, 15, INK, { body: true, weight: 800 });
    if (showLink) {
      const url = Net.inviteURL();
      text(url ? `Invita con este link: ${url.replace(/^https?:\/\//, '')}` : `Tus amigos abren el juego, entran a "Jugar online" y eligen tu sala (código ${Net.code})`, W / 2, 672, 14, TEAL, { body: true, weight: 700 });
    }
  },
  modeselUpdate() {
    this.inviteUpdate();
    for (const d of Devices.list) {
      const n = Devices.nav(d);
      let k = this.modeSel;
      if (n.left) k = k % 3 === 0 ? k + 2 : k - 1;
      if (n.right) k = k % 3 === 2 ? k - 2 : k + 1;
      if (n.up) k = k < 3 ? k + 6 : k - 3;
      if (n.down) k = k >= 6 ? k - 6 : k + 3;
      if (k !== this.modeSel) { this.modeSel = k; Audio8.sfx('menu'); if (k < 6) this.rules.mode = MODES[k].id; }
      if (n.jump) this.toggleTeams();
      if (n.grab) this.toggleParty();
      if (n.confirm || n.start) {
        if (this.modeSel === 6 && !n.start) { this.toggleTeams(); continue; }
        if (this.modeSel === 7 && !n.start) { this.toggleParty(); continue; }
        this.firstDev = d; return this.modeContinue();
      }
      if (n.back) return this.modeBackAction();
    }
    for (let i = 0; i < MODES.length; i++) {
      const q = this.modeRect(i);
      if (clickIn(q.x, q.y, q.w, q.h)) { if (this.rules.mode === MODES[i].id) return this.modeContinue(); this.modeSel = i; this.rules.mode = MODES[i].id; Audio8.sfx('menu'); }
    }
    for (let i = 0; i < 3; i++) {
      const q = this.toggleRect(i);
      if (clickIn(q.x, q.y, q.w, q.h)) { this.modeSel = 6 + i; if (i === 0) this.toggleTeams(); else if (i === 1) this.toggleParty(); else return this.modeContinue(); }
    }
    if (clickIn(40, 660, 150, 40)) return this.modeBackAction();
  },
  modeBackAction() {
    Audio8.sfx('back');
    if (this.modeBack === 'online') { Net.leave(); this.slots = this.slots.map(() => ({ type: 'none' })); return this.go('online'); }
    return this.go('main');
  },
  toggleTeams() {
    if (this.rules.mode === 'soccer') { Audio8.sfx('back'); Toasts.push('En Fútbol siempre se juega por equipos'); return; }
    this.rules.teams = !this.rules.teams; Audio8.sfx('menu');
  },
  toggleParty() { this.rules.party = !this.rules.party; Audio8.sfx('menu'); },
  modeContinue() {
    Audio8.sfx('confirm');
    if (!this.slots.some(s => s.type === 'human') && Net.role !== 'host') this.slots = [{ type: 'human', dev: this.firstDev || 'kb1', cur: 0, ready: false, edit: 0 }, { type: 'none' }, { type: 'none' }, { type: 'none' }];
    if (this.rules.mode === 'soccer') this.stageSel = Math.max(0, STAGE_INFO.findIndex(s => s.id === 'stadium'));
    this.slots.forEach((sl, i) => { if (sl.type !== 'none' && sl.team === undefined) sl.team = i % 2; });
    this.go('charsel');
  },
  modeselDraw() {
    drawMenuBG(2);
    sfText(Net.role === 'host' ? 'Tu sala online · elige el modo' : 'Elige el modo de juego', W / 2, 42, 44, PAPER);
    const r = this.rules;
    MODES.forEach((m, i) => {
      const q = this.modeRect(i), on = r.mode === m.id, cur = this.modeSel === i;
      ctx.save(); ctx.translate(0, on ? -4 : 0);
      slab(q.x, q.y, q.w, q.h, { skew: 0.12, edge: cur ? GOLD : on ? TEAL : undefined, lw: cur || on ? 4 : 2, top: on ? 'rgba(46,196,182,.25)' : undefined });
      drawModeIcon(m.id, q.x + 72, q.y + q.h / 2 + 2, on);
      sfText(m.name, q.x + 134, q.y + 42, fitSize(m.name, q.w - 170, 34), on ? GOLD : PAPER, { align: 'left' });
      wrapText(m.desc, q.x + 136, q.y + 74, q.w - 162, 14, 19, '#cbd5e1', 'left');
      if (m.teams) text('Siempre por equipos', q.x + q.w - 30, q.y + q.h - 16, 12, TEAL, { align: 'right', body: true, weight: 700 });
      ctx.restore();
    });
    const forced = r.mode === 'soccer';
    const tog = [
      { name: 'Equipos', on: forced || r.teams, sub: forced ? 'Fútbol siempre es Rojo contra Azul' : 'Rojo contra Azul · sin fuego amigo', key: 'Atajo: X / Y · Espacio' },
      { name: 'Modo Fiesta', on: r.party, sub: 'Cada pelea trae una regla loca al azar', key: 'Atajo: LB / RB · U' },
    ];
    tog.forEach((tg, i) => {
      const q = this.toggleRect(i), cur = this.modeSel === 6 + i;
      slab(q.x, q.y, q.w, q.h, { skew: 0.16, edge: cur ? GOLD : undefined, lw: cur ? 4 : 2, top: tg.on ? 'rgba(52,211,153,.22)' : undefined });
      sfText(tg.name, q.x + 44, q.y + 32, 32, cur ? GOLD : PAPER, { align: 'left' });
      const sx = q.x + q.w - 130, sy = q.y + 16;
      slab(sx, sy, 90, 32, { skew: 0.3, top: tg.on ? '#34d399' : 'rgba(40,46,60,.95)', bottom: tg.on ? '#059669' : 'rgba(20,24,34,.95)', edge: tg.on ? '#a7f3d0' : undefined });
      sfText(tg.on ? 'Sí' : 'No', sx + 45, sy + 16, 24, tg.on ? INK : MUTED, { stroke: tg.on ? null : undefined });
      text(tg.sub, q.x + 40, q.y + 64, 13, '#cbd5e1', { align: 'left', body: true, weight: 600 });
      text(tg.key, q.x + q.w - 40, q.y + 84, 11, MUTED, { align: 'right', body: true, weight: 600 });
    });
    const q = this.toggleRect(2), cur = this.modeSel === 8;
    const pulse = reducedMotion ? 1 : 1 + Math.sin(this.t * 0.15) * 0.02;
    ctx.save(); ctx.translate(q.x + q.w / 2, q.y + q.h / 2); ctx.scale(pulse, pulse);
    slab(-q.w / 2, -q.h / 2, q.w, q.h, { skew: 0.16, top: '#ff5d6c', bottom: '#b3122a', edge: cur ? GOLD : '#ffc2c8', lw: cur ? 5 : 2 });
    sfText('Personajes ›', 0, 0, 40, PAPER);
    ctx.restore();
    if (r.party) wrapText('Reglas locas posibles: ' + PARTY.map(p => p.name).join(' · '), W / 2, 552, 1100, 13, 18, GOLD);
    text('←→↑↓ elegir · A / Enter: continuar · B / Esc: volver', W / 2, 694, 14, MUTED, { body: true, weight: 500 });
    sfButton(Net.role === 'host' ? '‹ Cerrar sala' : '‹ Volver', 40, 660, 150, 40, hover(40, 660, 150, 40));
    this.inviteDraw(true);
  },

  // ---------------- SELECCIÓN DE PERSONAJES ----------------
  humanSlot(d) { return this.slots.findIndex(s => s.type === 'human' && s.dev === d); },
  newCPU(ready, i) { const c = randi(0, NCH() - 1); return { type: 'cpu', cur: c, ready, pick: CHAR_ORDER[c], level: this.cpuLevel, team: i === undefined ? 1 : i % 2 }; },
  charselUpdate() {
    this.inviteUpdate();
    const sl = this.slots;
    const allReadyBefore = sl.some(s => s.type !== 'none') && sl.every(s => s.type === 'none' || s.ready);
    // en línea el anfitrión es uno solo y lo mueve cualquier cosa conectada (el aparato "local")
    const devList = Net.role === 'host' ? ['local'] : Devices.list;
    const navs = {}; for (const d of devList) navs[d] = Devices.nav(d);
    // un solo teclado: mientras nadie se une con las flechas, las flechas también mueven al jugador de WASD
    if (navs.kb1 && navs.kb2 && this.humanSlot('kb2') < 0 && this.humanSlot('kb1') >= 0) for (const k of ['left', 'right', 'up', 'down']) if (navs.kb2[k]) { navs.kb1[k] = true; navs.kb2[k] = false; }
    for (const d of devList) {
      const n = navs[d];
      let si = this.humanSlot(d);
      if (si < 0) {
        if (Net.role === 'host') continue; // en línea, cada quien juega desde su pantalla
        if (n.confirm || n.start) {
          const free = sl.findIndex(s => s.type === 'none');
          const idx = free >= 0 ? free : sl.findIndex(s => s.type === 'cpu');
          if (idx >= 0) { sl[idx] = { type: 'human', dev: d, cur: idx % NCH(), ready: false, edit: idx, team: idx % 2 }; Audio8.sfx('confirm'); Rumble.play(d, 0.3, 0.6, 140); Toasts.push(`${devLabel(d)} se unió como ${PLAYER_TAGS[idx]}`); }
        }
        continue;
      }
      const S = sl[si];
      if (n.start && allReadyBefore) return this.toStages();
      if (S.edit !== si && (!sl[S.edit] || sl[S.edit].type !== 'cpu')) S.edit = si;
      const T = sl[S.edit];
      // ya listo: con ←→ el cursor recorre los cuatro lugares para agregar, editar o quitar CPUs
      if (T === S && S.ready) {
        if (!(S.focus >= 0 && S.focus < 4)) S.focus = si;
        const F = sl[S.focus];
        if (n.left || n.right) { S.focus = (S.focus + (n.left ? 3 : 1)) % 4; Audio8.sfx('menu'); continue; }
        if (F.type === 'cpu' && (n.up || n.down)) { F.level = clamp(F.level + (n.up ? 1 : -1), 1, AI_MAX); this.cpuLevel = F.level; Audio8.sfx('menu'); continue; }
        if (n.shield && this.teamsOn()) { const X = F.type !== 'none' && !F.remote ? F : S; X.team = X.team ? 0 : 1; Audio8.sfx('menu'); continue; }
        if (n.confirm && F.type === 'none') { sl[S.focus] = this.newCPU(false, S.focus); S.edit = S.focus; Audio8.sfx('confirm'); continue; }
        if (n.confirm && F.type === 'cpu') { F.ready = false; S.edit = S.focus; Audio8.sfx('confirm'); continue; }
        if (n.grab && F.type === 'cpu') { sl[S.focus] = { type: 'none' }; Audio8.sfx('back'); continue; }
        if (n.back && S.focus !== si) { S.focus = si; Audio8.sfx('back'); continue; }
      }
      if (!T.ready) {
        const N = NCH() + 1;
        if (n.left) { T.cur = (T.cur + N - 1) % N; Audio8.sfx('menu'); }
        if (n.right) { T.cur = (T.cur + 1) % N; Audio8.sfx('menu'); }
        if (T.type === 'cpu') { if (n.up || n.down) { T.level = clamp(T.level + (n.up ? 1 : -1), 1, AI_MAX); this.cpuLevel = T.level; Audio8.sfx('menu'); } }
        else if (n.up || n.down) { T.cur = this.cardRow(T.cur, n.up ? -1 : 1); Audio8.sfx('menu'); }
      }
      if (n.shield && this.teamsOn()) { T.team = T.team ? 0 : 1; Audio8.sfx('menu'); }
      if (n.confirm) {
        if (!T.ready) { T.ready = true; T.pick = T.cur === NCH() ? pick(CHAR_ORDER) : CHAR_ORDER[T.cur]; Audio8.sfx('confirm'); S.focus = S.edit; if (S.edit !== si) S.edit = si; }
      } else if (n.back) {
        Audio8.sfx('back');
        // soltar la CPU que editaba: se queda con el personaje que tenía marcado (no se queda "eligiendo")
        if (S.edit !== si) { if (!T.ready) { T.ready = true; T.pick = T.cur === NCH() ? pick(CHAR_ORDER) : CHAR_ORDER[T.cur]; } S.focus = S.edit; S.edit = si; }
        else if (S.ready) S.ready = false;
        else if (Net.role === 'host' && si === 0) return this.go('modesel'); // la sala sigue abierta; desde el modo se cierra
        else { sl[si] = { type: 'none' }; if (!sl.some(s => s.type === 'human')) { this.slots = sl.map(() => ({ type: 'none' })); return this.go('modesel'); } }
      } else if (n.jump && S.ready) {
        const free = sl.findIndex(s => s.type === 'none');
        if (free >= 0) { sl[free] = this.newCPU(false, free); S.edit = free; S.focus = free; Audio8.sfx('confirm'); }
      } else if (n.grab) {
        for (let i = 3; i >= 0; i--) if (sl[i].type === 'cpu') { sl[i] = { type: 'none' }; Audio8.sfx('back'); break; }
      }
    }
    // ratón
    for (let i = 0; i <= NCH(); i++) {
      const r = this.cardRect(i);
      if (clickIn(r.x, r.y, r.w, r.h)) {
        let si = this.humanSlot(Net.role === 'host' ? Net.localDev : pointerDev());
        if (si < 0 && Net.role === 'host') break;
        if (si < 0) { const free = sl.findIndex(s => s.type === 'none'); if (free < 0) break; sl[free] = { type: 'human', dev: pointerDev(), cur: i, ready: false, edit: free, team: free % 2 }; si = free; }
        const S = sl[si], T = sl[S.edit] && sl[S.edit].type === 'cpu' ? sl[S.edit] : S;
        T.cur = i; T.ready = true; T.pick = i === NCH() ? pick(CHAR_ORDER) : CHAR_ORDER[i]; if (T !== S) S.edit = si;
        Audio8.sfx('confirm');
      }
    }
    for (let i = 0; i < 4; i++) {
      const r = this.slotRect(i), s = sl[i], b = this.slotButton(i);
      if (b && clickIn(b.x, b.y, b.w, b.h)) {
        if (b.kind === 'toCPU') {
          if (sl.filter(x => x.type === 'human' && !x.remote).length <= 1) { Toasts.push('Necesitas al menos un jugador'); Audio8.sfx('back'); continue; }
          sl[i] = { type: 'cpu', cur: s.cur >= NCH() ? randi(0, NCH() - 1) : s.cur, ready: true, pick: s.pick || CHAR_ORDER[s.cur] || pick(CHAR_ORDER), level: this.cpuLevel, team: s.team };
          sl.forEach(x => { if (x.type === 'human' && x.edit === i) x.edit = sl.indexOf(x); });
          Toasts.push(`${PLAYER_TAGS[i]} ahora es CPU`); Audio8.sfx('confirm');
        } else { sl[i] = { type: 'none' }; Audio8.sfx('back'); }
        continue;
      }
      if (s.type === 'cpu') {
        if (clickIn(r.x + 150, r.y + r.h - 94, 34, 30)) { s.level = clamp(s.level - 1, 1, AI_MAX); this.cpuLevel = s.level; Audio8.sfx('menu'); continue; }
        if (clickIn(r.x + r.w - 44, r.y + r.h - 94, 34, 30)) { s.level = clamp(s.level + 1, 1, AI_MAX); this.cpuLevel = s.level; Audio8.sfx('menu'); continue; }
      }
      if (s.type !== 'none' && this.teamsOn() && clickIn(r.x + 86, r.y + 12, 108, 28)) { s.team = s.team ? 0 : 1; Audio8.sfx('menu'); continue; }
      if (s.remote) continue;
      if (clickIn(r.x, r.y, r.w, r.h - 100)) {
        if (s.type === 'none') { sl[i] = this.newCPU(true, i); Audio8.sfx('confirm'); }
        else if (s.type === 'cpu') { sl[i] = { type: 'none' }; Audio8.sfx('back'); }
        else if (s.type === 'human') s.ready = false;
      }
    }
    if (clickIn(W / 2 - 170, 652, 340, 50) && allReadyBefore) this.toStages();
    if (clickIn(40, 660, 150, 40)) { Audio8.sfx('back'); this.slots.forEach(x => { if (x.type === 'human' && !x.remote) x.ready = false; }); return this.go('modesel'); }
  },
  // botón de cada ranura: una persona local pasa a CPU; una CPU se quita
  slotButton(i) {
    if (this.screen !== 'charsel') return null;
    const s = this.slots[i], r = this.slotRect(i);
    if (s.type === 'cpu') return { kind: 'remove', x: r.x + r.w - 48, y: r.y + 10, w: 34, h: 30 };
    if (s.type === 'human' && !s.remote && Net.role !== 'host') return { kind: 'toCPU', x: r.x + 160, y: r.y + r.h - 92, w: 116, h: 32 };
    return null;
  },
  teamsOn() { return this.rules.teams || this.rules.mode === 'soccer'; },
  // nadie pelea sin rival: si todos quedaron en un equipo, se pasa a alguien al otro
  // (primero una CPU, luego un jugador local, al final un invitado). true si movió a alguien.
  balanceTeams() {
    const act = this.slots.filter(s => s.type !== 'none');
    for (const s of act) if (s.team !== 0 && s.team !== 1) s.team = 0;
    let moved = false;
    while (act.length > 1) {
      const n0 = act.filter(s => s.team === 0).length, n1 = act.length - n0;
      if (n0 && n1 && Math.abs(n0 - n1) <= Math.max(1, act.length - 2)) break;
      const big = n0 >= n1 ? 0 : 1, mem = act.filter(s => s.team === big);
      const who = mem.filter(s => s.type === 'cpu').pop() || mem.filter(s => !s.remote).pop() || mem.pop();
      who.team = 1 - big; moved = true;
      if (!n0 || !n1) continue;
      break;
    }
    return moved;
  },
  toStages() {
    const sl = this.slots;
    if (sl.filter(s => s.type !== 'none').length < 2) {
      const free = sl.findIndex(s => s.type === 'none');
      sl[free] = this.newCPU(true, free);
      Toasts.push('Se agregó una CPU para que tengas rival');
    }
    if (this.teamsOn() && this.balanceTeams()) Toasts.push('Equipos repartidos: Rojo contra Azul');
    Audio8.sfx('confirm'); this.stageRow = 0;
    if (this.rules.mode === 'soccer') this.stageSel = Math.max(0, STAGE_INFO.findIndex(s => s.id === 'stadium'));
    this.go('stagesel');
  },
  // con muchos personajes, las tarjetas van en dos filas
  cardCols() { const n = NCH() + 1; return n > 11 ? Math.ceil(n / 2) : n; },
  cardRect(i) {
    const n = NCH() + 1, cols = this.cardCols(), rows = Math.ceil(n / cols), gap = cols > 6 ? 10 : 16;
    const w = Math.min(176, Math.floor((W - 60 - (cols - 1) * gap) / cols)), h = rows > 1 ? 102 : 196, x0 = (W - (cols * w + (cols - 1) * gap)) / 2;
    const row = Math.floor(i / cols), inRow = row === rows - 1 ? n - row * cols : cols; // la última fila va centrada
    return { x: x0 + (i % cols) * (w + gap) + (cols - inRow) * (w + gap) / 2, y: rows > 1 ? 62 + row * (h + 8) : 70, w, h };
  },
  cardRow(cur, dir) { const n = NCH() + 1, cols = this.cardCols(); return cols >= n ? (cur === NCH() ? 0 : NCH()) : (cur + dir * cols + n * 2) % n; },
  slotRect(i) { const w = 292, gap = 14, x0 = (W - (4 * w + 3 * gap)) / 2; return { x: x0 + i * (w + gap), y: 340, w, h: 300 }; },
  charselDraw(opts = {}) {
    drawMenuBG(2);
    sfText(opts.title || (Net.role === 'host' ? 'Tu sala online' : 'Selección de personaje'), W / 2, 36, 44, PAPER);
    if (!opts.title) this.inviteDraw(false);
    const ru = opts.rules || this.rules, mode = MODE_BY_ID[ru.mode] || MODES[0];
    text([mode.name, ru.teams || ru.mode === 'soccer' ? 'Equipos' : null, ru.party ? 'Modo Fiesta' : null].filter(Boolean).join(' · '), 40, 36, 15, TEAL, { align: 'left', body: true, weight: 700 });
    const sl = this.slots;
    for (let i = 0; i <= NCH(); i++) {
      const r = this.cardRect(i), id = CHAR_ORDER[i];
      const cursors = sl.map((s, si) => ({ s, si })).filter(({ s }) => s.type !== 'none' && !s.ready && s.cur === i && (s.type === 'human' || sl.some(h => h.type === 'human' && sl[h.edit] === s)));
      const focused = cursors.length > 0;
      ctx.save();
      slabPath(r.x, r.y, r.w, r.h, 0.12); ctx.clip();
      const bg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
      bg.addColorStop(0, id ? withAlpha(LOOKS[id].top, 0.8) : '#2a2f3d'); bg.addColorStop(1, '#07090f');
      ctx.fillStyle = bg; ctx.fillRect(r.x, r.y, r.w, r.h);
      if (id) drawBust(ctx, id, r.x + 8, r.y, r.w - 16, r.h - (r.h < 120 ? 24 : 36), focused ? 'angry' : 'normal');
      else sfText('?', r.x + r.w / 2, r.y + r.h * 0.42, r.h < 120 ? 64 : 120, GOLD);
      const pl = ctx.createLinearGradient(0, r.y + r.h - 50, 0, r.y + r.h);
      pl.addColorStop(0, 'rgba(7,9,15,0)'); pl.addColorStop(0.5, 'rgba(7,9,15,.92)');
      ctx.fillStyle = pl; ctx.fillRect(r.x, r.y + r.h - 50, r.w, 50);
      ctx.restore();
      slabPath(r.x, r.y, r.w, r.h, 0.12); ctx.lineWidth = focused ? 4 : 2; ctx.strokeStyle = focused ? GOLD : 'rgba(154,167,184,.35)'; ctx.stroke();
      const nm = id ? CHARS[id].name : 'Aleatorio';
      sfText(nm, r.x + r.w / 2, r.y + r.h - (r.h < 120 ? 13 : 18), r.h < 120 ? (nm.length > 9 ? 17 : 21) : r.w < 140 ? 22 : 30, focused ? GOLD : PAPER);
      cursors.forEach(({ s, si }, k) => {
        const bw = r.w < 140 ? 40 : 46, bx = r.x + 10 + (k % 2) * (bw + 4), by = r.y + 8 + Math.floor(k / 2) * 28 + (reducedMotion ? 0 : Math.sin(this.t * 0.15 + si) * 3);
        slabPath(bx, by, bw, 24, 0.3); ctx.fillStyle = PLAYER_COLORS[si]; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
        sfText(s.type === 'cpu' ? 'CPU' : PLAYER_TAGS[si], bx + bw / 2, by + 12, 18, INK, { stroke: null });
      });
    }
    // franja de especiales
    const hs = sl.find(s => s.type === 'human');
    const hint = this.slotHint(), fsl = hint && hs && hs.focus >= 0 ? sl[hs.focus] : null;
    const T = fsl && fsl.type !== 'none' ? fsl : hs && sl[hs.edit] && sl[hs.edit].type !== 'none' ? sl[hs.edit] : null;
    const focusId = T ? (T.ready ? T.pick : CHAR_ORDER[T.cur]) : null;
    slab(40, 282, W - 80, 44, { skew: 0.4 });
    if (focusId) {
      const sp = SPECIALS[focusId];
      text(`${CHARS[focusId].blurb}   ·   B: ${sp.n.name}   →B: ${sp.s.name}   ↑B: ${sp.u.name}   ↓B: ${sp.d.name}   ★ ${sp.f.name}`, W / 2, 295, 14, '#e2e8f0', { body: true, weight: 600 });
      const ab = ABILITIES[focusId];
      if (hint) text(hint, W / 2, 314, 13, TEAL, { body: true, weight: 700 });
      else if (ab) text(`Habilidad · ${ab.name}: ${ab.desc}`, W / 2, 314, 13, GOLD, { body: true, weight: 600 });
    } else if (hint) { text('Lugar libre', W / 2, 295, 14, '#e2e8f0', { body: true, weight: 600 }); text(hint, W / 2, 314, 13, TEAL, { body: true, weight: 700 }); }
    else text('Personaje aleatorio', W / 2, 304, 15, '#e2e8f0', { body: true, weight: 600 });
    for (let i = 0; i < 4; i++) this.drawSlot(i);
    sfButton(this.screen === 'netroom' ? '‹ Salir' : '‹ Volver', 40, 660, 150, 40, hover(40, 660, 150, 40));
    const allReady = sl.some(s => s.type !== 'none') && sl.every(s => s.type === 'none' || s.ready);
    if (opts.footer) text(opts.footer, W / 2, 677, 15, GOLD, { body: true, weight: 700 });
    else if (allReady) {
      const pulse = reducedMotion ? 1 : 1 + Math.sin(this.t * 0.15) * 0.03;
      ctx.save(); ctx.translate(W / 2, 677); ctx.scale(pulse, pulse);
      slab(-170, -25, 340, 50, { top: '#ffd76a', bottom: '#e0a01a', edge: '#fff3c4' });
      sfText('¡Listos! · Start', 0, 0, 34, INK, { stroke: null });
      ctx.restore();
    } else {
      const inSlots = sl.some((h, hi) => h.type === 'human' && !h.remote && h.ready && h.edit === hi);
      text(inSlots ? '←→ moverte entre los lugares · A agregar o cambiar CPU · ↑↓ nivel · LB/RB quitar CPU · B regresar' + (this.teamsOn() ? ' · Escudo: equipo' : '')
        : (Net.role === 'host' ? 'Tus amigos aparecen aquí al unirse · ←→ elegir · A confirmar · X/Y agregar CPU · ↑↓ nivel · B cerrar la sala' : '←→ elegir · A confirmar · B volver · luego ←→ para agregar CPUs') + (this.teamsOn() ? ' · Escudo: cambiar de equipo' : ''), W / 2, 677, 14, MUTED, { body: true, weight: 500 });
    }
  },
  // de quién es la cámara de una tarjeta: el invitado por su conexión; el anfitrión (o quien juega aquí) por la propia
  slotPeer(s) {
    if (this.screen === 'netroom') return s.mine ? Net.myPeer() : s.peer || null;
    if (Net.role !== 'host') return null;
    return s.remote || (this.slots.find(x => x.type === 'human' && !x.remote) === s ? Net.myPeer() : null);
  },
  drawSlot(i) {
    const r = this.slotRect(i), s = this.slots[i], col = PLAYER_COLORS[i];
    if (s.type === 'none') {
      slab(r.x, r.y, r.w, r.h, { skew: 0.08, top: 'rgba(20,24,34,.6)', bottom: 'rgba(8,10,16,.7)', edge: 'rgba(154,167,184,.25)' });
      sfText(PLAYER_TAGS[i], r.x + r.w / 2, r.y + 100, 70, withAlpha(col, 0.45), { stroke: null });
      text('Pulsa A / J para unirte', r.x + r.w / 2, r.y + 160, 16, '#cbd5e1', { body: true, weight: 600 });
      if (this.slotFocusers(i).length) { this.drawSlotFocus(i); return; }
      text('X·Y / Espacio: agregar CPU', r.x + r.w / 2, r.y + 186, 14, MUTED, { body: true, weight: 500 });
      text('(o haz clic aquí)', r.x + r.w / 2, r.y + 208, 13, MUTED, { body: true });
      return;
    }
    const id = s.ready ? s.pick : (s.cur >= NCH() ? null : CHAR_ORDER[s.cur]);
    ctx.save();
    slabPath(r.x, r.y, r.w, r.h, 0.08); ctx.clip();
    const g = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
    g.addColorStop(0, withAlpha(col, 0.45)); g.addColorStop(0.6, 'rgba(12,15,22,.95)'); g.addColorStop(1, 'rgba(8,10,16,.98)');
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    if (id) {
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(r.x + 88, r.y + 262, 44, 8, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(r.x + 88, r.y + 262); const k = 1.72 * CHARS[id].size; ctx.scale(k, k);
      drawCharacter(ctx, id, s.ready ? (i % 2 ? POSES.win2 : POSES.win1) : mkPose(Object.assign({}, POSES.idle, { bodyY: Math.sin(this.t * 0.07 + i) * 2 })), {});
      ctx.restore();
    } else sfText('?', r.x + 88, r.y + 160, 140, GOLD);
    ctx.restore();
    const teams = this.screen === 'netroom' ? !!this.netTeams : this.teamsOn();
    slabPath(r.x, r.y, r.w, r.h, 0.08); ctx.lineWidth = teams ? 5 : 3; ctx.strokeStyle = teams ? TEAM_COLORS[s.team || 0] : col; ctx.stroke();
    if (teams) {
      slabPath(r.x + 86, r.y + 12, 108, 28, 0.3); ctx.fillStyle = TEAM_COLORS[s.team || 0]; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      sfText(`Equipo ${TEAM_NAMES[s.team || 0]}`, r.x + 140, r.y + 26, 18, PAPER);
    }
    slabPath(r.x + 14, r.y + 12, 66, 28, 0.3); ctx.fillStyle = col; ctx.fill();
    sfText(s.type === 'cpu' ? 'CPU' : PLAYER_TAGS[i], r.x + 47, r.y + 26, 24, INK, { stroke: null });
    // con cámara y voz: su cara en vivo en la esquina de su tarjeta
    const cam = s.type === 'human' && typeof AV !== 'undefined' ? AV.videoFor(this.slotPeer(s)) : null;
    if (cam) {
      const cx = r.x + r.w - 84, cy = r.y + 8, cw2 = 72, ch2 = 50;
      ctx.save(); roundRect(ctx, cx, cy, cw2, ch2, 10); ctx.clip(); drawVideoCover(ctx, cam.v, cx, cy, cw2, ch2, cam.mirror); ctx.restore();
      roundRect(ctx, cx, cy, cw2, ch2, 10); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(cx + 9, cy + 9, 3.5, 0, TAU); ctx.fill();
    } else text(s.type === 'cpu' ? '' : devLabel(s.dev), r.x + r.w - 18, r.y + 26, 13, '#cbd5e1', { align: 'right', body: true, weight: 600 });
    sfText(id ? CHARS[id].name : 'Aleatorio', r.x + 220, r.y + 70, 36, PAPER);
    if (id) {
      text(CHARS[id].title, r.x + 220, r.y + 96, 13, MUTED, { body: true, weight: 600 });
      let by = r.y + 116;
      for (const [k, v] of Object.entries(CHARS[id].bars)) {
        text(k.toUpperCase(), r.x + 168, by + 5, 10, MUTED, { align: 'left', body: true, weight: 700 });
        for (let j = 0; j < 5; j++) { slabPath(r.x + 168 + j * 22, by + 13, 19, 8, 0.5); ctx.fillStyle = j < v ? GOLD : 'rgba(154,167,184,.22)'; ctx.fill(); }
        by += s.type === 'cpu' || this.slotButton(i) ? 23 : 30; // deja espacio para el nivel de la CPU o el botón → CPU
      }
    }
    if (s.type === 'cpu') {
      const ly = r.y + r.h - 94;
      slab(r.x + 150, ly, 34, 30, { skew: 0.25 }); sfText('‹', r.x + 167, ly + 15, 30, PAPER);
      slab(r.x + r.w - 44, ly, 34, 30, { skew: 0.25 }); sfText('›', r.x + r.w - 27, ly + 15, 30, PAPER);
      const lvCol = s.level >= 8 ? RED : s.level >= 6 ? '#ff9f1c' : GOLD;
      sfText(`Nv ${s.level}`, r.x + 214, ly + 14, 26, lvCol);
      text(AI_NAMES[s.level], r.x + 214, ly + 40, 12, MUTED, { body: true, weight: 600 });
    }
    const btn = this.slotButton(i);
    if (btn) {
      const hv = hover(btn.x, btn.y, btn.w, btn.h);
      if (btn.kind === 'remove') { slab(btn.x, btn.y, btn.w, btn.h, { skew: 0.25, top: hv ? '#ff5d6c' : 'rgba(40,46,60,.95)', bottom: hv ? '#b3122a' : 'rgba(20,24,34,.95)' }); sfText('✕', btn.x + btn.w / 2, btn.y + btn.h / 2, 22, PAPER); }
      else { slab(btn.x, btn.y, btn.w, btn.h, { skew: 0.25, top: hv ? '#ffd76a' : 'rgba(40,46,60,.95)', bottom: hv ? '#e0a01a' : 'rgba(20,24,34,.95)', edge: hv ? '#fff3c4' : undefined }); sfText('→ CPU', btn.x + btn.w / 2, btn.y + btn.h / 2, 22, hv ? INK : PAPER, { stroke: hv ? null : undefined }); }
    }
    const status = s.ready ? '¡Listo!' : (s.type === 'cpu' ? 'Eligiendo CPU…' : 'Eligiendo…');
    slab(r.x + 16, r.y + r.h - 46, r.w - 32, 34, s.ready ? { top: '#34d399', bottom: '#059669', edge: '#a7f3d0' } : {});
    sfText(status, r.x + r.w / 2, r.y + r.h - 29, 26, s.ready ? INK : PAPER, { stroke: s.ready ? null : undefined });
    this.drawSlotFocus(i);
  },
  // quién tiene el cursor de lugares aquí (jugadores de esta pantalla que ya están listos)
  slotFocusers(i) {
    if (this.screen !== 'charsel') return [];
    return this.slots.map((h, hi) => ({ h, hi })).filter(({ h, hi }) => h.type === 'human' && !h.remote && h.ready && h.edit === hi && (h.focus >= 0 ? h.focus : hi) === i);
  },
  drawSlotFocus(i) {
    const who = this.slotFocusers(i); if (!who.length) return;
    const r = this.slotRect(i), s = this.slots[i], { hi } = who[0], col = PLAYER_COLORS[hi];
    const own = s === who[0].h;
    const pulse = reducedMotion ? 0 : Math.sin(this.t * 0.2) * 2;
    slabPath(r.x - 5 - pulse, r.y - 5 - pulse, r.w + 10 + pulse * 2, r.h + 10 + pulse * 2, 0.08); ctx.lineWidth = 4; ctx.strokeStyle = col; ctx.stroke();
    slabPath(r.x + r.w / 2 - 34, r.y - 13, 68, 22, 0.3); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    sfText(who.map(w => PLAYER_TAGS[w.hi]).join(' ') + ' ▼', r.x + r.w / 2, r.y - 2, 17, INK, { stroke: null });
    if (s.type === 'none') text('A: agregar CPU', r.x + r.w / 2, r.y + 232, 17, GOLD, { body: true, weight: 700 });
  },
  // qué hacen los botones con el cursor puesto en ese lugar (va en la franja de arriba)
  slotHint() {
    const sl = this.slots, h = sl.find((x, hi) => x.type === 'human' && !x.remote && x.ready && x.edit === hi);
    if (!h || this.screen !== 'charsel') return null;
    const f = sl[h.focus >= 0 ? h.focus : sl.indexOf(h)];
    if (f.type === 'none') return '🎮 A: agregar una CPU aquí  ·  ←→ moverte entre lugares  ·  Start: ¡a pelear!';
    if (f.type === 'cpu') return '🎮 A: cambiarle personaje  ·  ↑↓ nivel  ·  LB/RB (U): quitarla  ·  ←→ moverte  ·  Start: ¡a pelear!';
    return '🎮 ←→ para agregar o cambiar CPUs  ·  B: cambiar tu personaje  ·  Start: ¡a pelear!';
  },

  // ---------------- ESCENARIOS Y REGLAS ----------------
  ruleRows() {
    const r = this.rules, m = MODE_BY_ID[r.mode] || MODES[0];
    const cycleMode = d => {
      const i = MODES.findIndex(x => x.id === r.mode);
      r.mode = MODES[(i + d + MODES.length) % MODES.length].id;
      if (r.mode === 'soccer') { this.stageSel = this.soccerStage(); this.toStagesTeams(); }
    };
    return [
      { label: 'Modo', val: m.name, ch: cycleMode },
      m.stock
        ? { label: r.mode === 'hp' ? 'Barras de vida' : 'Vidas', val: `${r.stocks}`, ch: d => { r.stocks = clamp(r.stocks + d, 1, 9); } }
        : { label: r.mode === 'koth' || r.mode === 'soccer' ? 'Minutos máx.' : 'Minutos', val: `${r.time}`, ch: d => { r.time = clamp(r.time + d, 1, 9); } },
      { label: 'Objetos', val: ['Ninguno', 'Pocos', 'Normal', 'Muchos'][r.items], ch: d => { r.items = (r.items + d + 4) % 4; } },
      { label: 'Equipos', val: this.teamsOn() ? 'Sí' : 'No', ch: () => { this.toggleTeams(); if (this.teamsOn()) this.toStagesTeams(); } },
      { label: 'Modo Fiesta', val: r.party ? 'Sí' : 'No', ch: () => this.toggleParty() },
    ];
  },
  ruleY(i) { return 390 + i * 38; },
  soccerStage() { return Math.max(0, STAGE_INFO.findIndex(s => s.id === 'stadium')); },
  stageLocked(i) { return this.rules.mode === 'soccer' && i !== this.soccerStage(); },
  // al cambiar a Fútbol desde aquí: equipos forzados y repartidos
  toStagesTeams() { this.balanceTeams(); },
  stageRect(i) {
    const n = STAGE_INFO.length, cols = n > 6 ? 4 : n > 4 ? 3 : n, w = cols === 4 ? 293 : cols === 3 ? 390 : 286, h = cols >= 3 ? 138 : 258, gap = 16, x0 = (W - (cols * w + (cols - 1) * gap)) / 2;
    return { x: x0 + (i % cols) * (w + gap), y: 80 + Math.floor(i / cols) * (h + gap), w, h, cols };
  },
  stageselUpdate() {
    const rows = this.ruleRows(), N = STAGE_INFO.length, cols = this.stageRect(0).cols;
    if (this.stageLocked(this.stageSel)) this.stageSel = this.soccerStage();
    for (const d of Devices.list) {
      const n = Devices.nav(d);
      const inGrid = this.stageRow === 0;
      if (n.up) {
        if (inGrid && this.stageSel >= cols && !this.stageLocked(this.stageSel - cols)) this.stageSel -= cols;
        else if (!inGrid) this.stageRow--;
        Audio8.sfx('menu');
      }
      if (n.down) {
        if (inGrid && this.stageSel + cols < N && !this.stageLocked(this.stageSel + cols)) this.stageSel += cols;
        else this.stageRow = Math.min(rows.length, this.stageRow + 1);
        Audio8.sfx('menu');
      }
      if (n.left || n.right) {
        const dd = n.left ? -1 : 1;
        if (inGrid) { if (this.rules.mode !== 'soccer') this.stageSel = (this.stageSel + dd + N) % N; } else rows[this.stageRow - 1].ch(dd);
        Audio8.sfx('menu');
      }
      if (n.confirm || n.start) {
        if (this.stageRow > 0 && n.confirm && !n.start) { rows[this.stageRow - 1].ch(1); Audio8.sfx('menu'); continue; }
        return this.launch();
      }
      if (n.back) { Audio8.sfx('back'); this.slots.forEach(s => { if (s.type !== 'none') s.ready = s.type === 'cpu'; }); return this.go('charsel'); }
    }
    for (let i = 0; i < N; i++) { const r = this.stageRect(i); if (clickIn(r.x, r.y, r.w, r.h)) { if (this.stageLocked(i)) { Toasts.push('El Fútbol se juega en el Estadio'); continue; } if (this.stageSel === i) return this.launch(); this.stageSel = i; this.stageRow = 0; Audio8.sfx('menu'); } }
    rows.forEach((row, i) => {
      const y = this.ruleY(i);
      if (clickIn(W / 2 + 10, y, 50, 34)) { row.ch(-1); Audio8.sfx('menu'); }
      if (clickIn(W / 2 + 210, y, 50, 34)) { row.ch(1); Audio8.sfx('menu'); }
    });
    if (clickIn(W / 2 - 170, 600, 340, 58)) this.launch();
    if (clickIn(40, 660, 150, 40)) { Audio8.sfx('back'); this.slots.forEach(s => { if (s.type !== 'none') s.ready = s.type === 'cpu'; }); return this.go('charsel'); }
  },
  launch() {
    const players = [], teams = this.teamsOn();
    if (this.stageLocked(this.stageSel)) this.stageSel = this.soccerStage();
    if (teams) this.balanceTeams();
    this.slots.forEach((s, i) => {
      if (s.type === 'none') return;
      const ch = s.pick || (s.cur >= NCH() ? pick(CHAR_ORDER) : CHAR_ORDER[s.cur]);
      // uid: la cuenta de cada persona (solo en línea); el Salón de la fama cuenta cuentas, no personajes
      const uid = s.type !== 'human' || Net.role !== 'host' ? null : s.remote ? Net.byOf(s.remote) : Net.myId;
      players.push({ port: i, char: ch, dev: s.type === 'human' ? (s.remote ? 'net:' + s.remote : s.dev) : null, cpu: s.type === 'cpu' ? s.level : 0, remote: s.remote || (s.type === 'human' ? '' : null), team: teams ? (s.team || 0) : i % 2, uid });
    });
    const rules = Object.assign({}, this.rules, { teams });
    const setup = { players, stage: STAGE_INFO[this.stageSel].id, rules, party: rules.party ? pick(PARTY).id : null };
    if (Net.role === 'host') Net.startMatch(setup);
    this.showVS(setup);
  },
  previews: {},
  stageselDraw() {
    drawMenuBG(3);
    sfText('Elige el escenario', W / 2, 40, 44, PAPER);
    // la primera vez que se dibuja un escenario pinta y guarda sus capas (hasta medio segundo cada uno):
    // una vista previa nueva por cuadro. Antes salían las 8 juntas y el juego se congelaba casi 2 s aquí
    let fresh = 0;
    STAGE_INFO.forEach((info, i) => {
      const r = this.stageRect(i), sel = i === this.stageSel, locked = this.stageLocked(i), wide = r.cols >= 3, narrow = r.cols === 4;
      const pk = info.id + (info.id === 'stadium' && this.rules.mode === 'soccer' ? ':futbol' : ''); // el estadio de Fútbol lleva porterías
      if (!this.previews[pk]) this.previews[pk] = makeStage(info.id, { soccer: pk !== info.id });
      const st = this.previews[pk], ready = st.shown || fresh++ === 0;
      if (ready) {
        st.shown = true; st.t++;
        for (const s of st.surfaces()) if (s.move) { const p = s.move(st.t, s); s.x = p[0]; s.y = p[1]; }
      }
      ctx.save(); ctx.translate(0, sel ? -6 : 0);
      if (locked) ctx.globalAlpha = 0.35;
      slab(r.x, r.y, r.w, r.h, { skew: 0.1, edge: sel ? (this.stageRow === 0 ? GOLD : TEAL) : undefined, lw: sel ? 4 : 2 });
      // vista previa: a lo ancho (4 escenarios) o a la izquierda (rejilla de 6)
      const pw = narrow ? 124 : wide ? 190 : r.w - 16, ph = wide ? r.h - 16 : 164;
      ctx.save(); slabPath(r.x + 8, r.y + 8, pw, ph, 0.1); ctx.clip();
      if (ready) {
        ctx.translate(r.x + 8, r.y + 8); ctx.scale(pw / W, ph / H);
        const z = info.big ? 0.36 : 0.62;
        st.drawBG(ctx, { x: 0, y: -150, z: 1 });
        ctx.translate(W / 2, H / 2 + 60); ctx.scale(z * (wide ? 1.35 : 1), z * (wide ? 1.35 : 1)); ctx.translate(0, info.big ? 40 : 100);
        st.drawStage(ctx); st.drawFG(ctx);
      } else { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(r.x + 8, r.y + 8, pw, ph); } // un instante, mientras se pinta
      ctx.restore();
      if (wide) {
        const tx = r.x + pw + 22, tw = r.w - pw - 34;
        sfText(info.name, tx, r.y + 26, fitSize(info.name, tw, narrow ? 22 : 28), sel ? GOLD : PAPER, { align: 'left' });
        wrapText(info.desc, tx, r.y + (narrow ? 48 : 58), tw, narrow ? 11 : 13, narrow ? 14 : 17, '#cbd5e1', 'left');
        if (info.big) { slabPath(r.x + r.w - 104, r.y + r.h - 34, 86, 22, 0.3); ctx.fillStyle = TEAL; ctx.fill(); sfText('Gigante', r.x + r.w - 61, r.y + r.h - 23, 16, INK, { stroke: null }); }
      } else {
        sfText(info.name, r.x + r.w / 2, r.y + 196, 30, sel ? GOLD : PAPER);
        wrapText(info.desc, r.x + r.w / 2, r.y + 224, r.w - 40, 14, 18, '#cbd5e1');
      }
      ctx.restore();
    });
    if (this.rules.mode === 'soccer') text('El Fútbol se juega en el Estadio: tiene porterías', W / 2, 70, 13, TEAL, { body: true, weight: 700 });
    const rows = this.ruleRows();
    slab(W / 2 - 320, 380, 640, 204, { skew: 0.08 });
    rows.forEach((row, i) => {
      const y = this.ruleY(i), sel = this.stageRow === i + 1;
      if (sel) { slabPath(W / 2 - 290, y - 2, 580, 38, 0.3); ctx.fillStyle = 'rgba(255,197,61,.14)'; ctx.fill(); }
      sfText(row.label, W / 2 - 250, y + 17, 26, sel ? GOLD : PAPER, { align: 'left' });
      slab(W / 2 + 10, y, 50, 34, { skew: 0.25 }); sfText('‹', W / 2 + 35, y + 17, 28, PAPER);
      slab(W / 2 + 210, y, 50, 34, { skew: 0.25 }); sfText('›', W / 2 + 235, y + 17, 28, PAPER);
      const on = row.val === 'Sí';
      sfText(row.val, W / 2 + 135, y + 17, fitSize(row.val, 136, 26), on ? '#34d399' : PAPER);
    });
    const pulse = reducedMotion ? 1 : 1 + Math.sin(this.t * 0.15) * 0.03;
    ctx.save(); ctx.translate(W / 2, 629); ctx.scale(pulse, pulse);
    slab(-170, -29, 340, 58, { top: '#ff5d6c', bottom: '#b3122a', edge: '#ffc2c8' });
    sfText('¡A pelear!', 0, 0, 44, PAPER);
    ctx.restore();
    text('←→↑↓ escenario · ↓ reglas · A / Start: pelear · B: volver · el nivel de la CPU se elige en la selección de personaje', W / 2 + 60, 694, 14, MUTED, { body: true, weight: 500 });
    sfButton('‹ Volver', 40, 660, 150, 40, hover(40, 660, 150, 40));
  },

  // ---------------- VS ----------------
  vsUpdate() {
    if (this.pendingSetup && this.pendingSetup.net) return; // el invitado espera la pelea del anfitrión
    if (this.t > 20) for (const d of Devices.list) { const n = Devices.nav(d); if (n.confirm || n.start) { this.t = 999; break; } }
    if (Pointer.clicked && this.t > 20) this.t = 999;
    if (this.t >= 150) this.startBattle(this.pendingSetup);
  },
  vsDraw() {
    const S0 = this.pendingSetup, P = S0.rules.teams ? S0.players.slice().sort((a, b) => (a.team || 0) - (b.team || 0)) : S0.players, n = P.length, t = this.t;
    const split = S0.rules.teams ? P.findIndex(p => (p.team || 0) === 1) : -1;
    ctx.fillStyle = DEEP; ctx.fillRect(0, 0, W, H);
    const cw = W / n;
    P.forEach((p, i) => {
      const slide = reducedMotion ? 0 : Math.max(0, 1 - t / 18) * (i < n / 2 ? -1 : 1) * 400;
      const x = i * cw + slide, col = this.pendingSetup.rules.teams ? TEAM_COLORS[p.team || 0] : PLAYER_COLORS[p.port];
      ctx.save();
      slabPath(x - 40, 0, cw + 80, H, -0.12); ctx.clip();
      const g = ctx.createLinearGradient(x, 0, x, H);
      g.addColorStop(0, withAlpha(col, 0.55)); g.addColorStop(1, '#07090f');
      ctx.fillStyle = g; ctx.fillRect(x - 60, 0, cw + 120, H);
      drawBust(ctx, p.char, x - 10, 60, cw + 20, 470, 'angry', i >= n / 2 && n === 2);
      const fade = ctx.createLinearGradient(0, 380, 0, H);
      fade.addColorStop(0, 'rgba(7,9,15,0)'); fade.addColorStop(0.5, 'rgba(7,9,15,.95)');
      ctx.fillStyle = fade; ctx.fillRect(x - 60, 380, cw + 120, H - 380);
      ctx.restore();
      sfText(CHARS[p.char].name, x + cw / 2, 560, n > 2 ? 64 : 92, PAPER);
      sfText(p.cpu ? `CPU · Nv ${p.cpu}` : PLAYER_TAGS[p.port], x + cw / 2, 618, 30, col);
      text(CHARS[p.char].title, x + cw / 2, 652, 15, MUTED, { body: true, weight: 600 });
    });
    for (let i = 1; i < n; i++) {
      if (split > 0 && i !== split) continue; // por equipos: un solo VS entre Rojo y Azul
      const x = i * cw, k = reducedMotion ? 1 : clamp((t - 14) / 10, 0, 1);
      ctx.save(); ctx.translate(x, H / 2 - 60); ctx.scale(0.6 + k * 0.4 + (k < 1 ? (1 - k) * 1.5 : 0), 0.6 + k * 0.4 + (k < 1 ? (1 - k) * 1.5 : 0)); ctx.globalAlpha = k;
      sfText('VS', 0, 0, n > 2 ? 90 : 140, GOLD, { strokeW: 14 });
      ctx.restore(); ctx.globalAlpha = 1;
    }
    const S = this.pendingSetup, info = STAGE_INFO.find(s => s.id === S.stage) || STAGE_INFO[0];
    const mode = MODE_BY_ID[S.rules.mode] || MODES[0];
    slab(W / 2 - 260, 16, 520, 40, { skew: 0.3 });
    sfText(`${mode.name}${S.rules.teams ? ' por equipos' : ''} · ${info.name}`, W / 2, 36, 26, GOLD);
    const party = S.party && PARTY_BY_ID[S.party];
    if (party) {
      const k = reducedMotion ? 1 : clamp((t - 30) / 14, 0, 1);
      ctx.save(); ctx.globalAlpha = k; ctx.translate(W / 2, 96); ctx.rotate(-0.03);
      slab(-300, -26, 600, 52, { skew: 0.3, top: '#ffd76a', bottom: '#e0a01a', edge: '#fff3c4' });
      sfText(`¡Fiesta! ${party.name}`, 0, -4, 30, INK, { stroke: null });
      text(party.desc, 0, 16, 13, INK, { body: true, weight: 700 });
      ctx.restore();
    }
  },

  // ---------------- ONLINE: buscar o crear sala ----------------
  onSel: 0,
  onlineUpdate() {
    if (!Net.ok) {
      for (const d of Devices.list) { const n = Devices.nav(d); if (n.back || n.confirm || n.start) { Audio8.sfx('back'); return this.go('main'); } }
      if (clickIn(40, 660, 170, 44)) this.go('main');
      return;
    }
    const hosts = Net.hosts().filter(h => !h.sameTab);
    const n0 = hosts.length + 1;
    this.onSel = clamp(this.onSel, 0, n0 - 1);
    if (Net.wantCode) {
      const h = Net.hostByCode(Net.wantCode);
      if (h) { const code = Net.wantCode; Net.wantCode = null; Audio8.sfx('confirm'); Toasts.push(`Entraste a la sala ${code}`); Net.join(h.peer); return this.go('netroom'); }
      this.inviteT = (this.inviteT || 0) + 1;
      if (this.inviteT > 60 * 20) { Toasts.push(`No encontré la sala ${Net.wantCode}: quizá ya se cerró. Elige otra o crea la tuya.`); Net.wantCode = null; }
    }
    const choose = i => {
      Audio8.sfx('confirm');
      if (i === 0) { Net.host(); this.slots = [{ type: 'human', dev: 'local', cur: 0, ready: false, edit: 0 }, { type: 'none' }, { type: 'none' }, { type: 'none' }]; this.modeBack = 'online'; return this.go('modesel'); }
      const h = hosts[i - 1]; Net.join(h.peer); this.go('netroom');
    };
    for (const d of Devices.list) {
      const n = Devices.nav(d);
      if (n.up) { this.onSel = (this.onSel + n0 - 1) % n0; Audio8.sfx('menu'); }
      if (n.down) { this.onSel = (this.onSel + 1) % n0; Audio8.sfx('menu'); }
      if (n.confirm) return choose(this.onSel);
      if (n.back) { Audio8.sfx('back'); return this.go('main'); }
    }
    for (let i = 0; i < n0; i++) if (clickIn(W / 2 - 300, 200 + i * 70, 600, 58)) return choose(i);
    if (clickIn(40, 660, 170, 44)) this.go('main');
  },
  onlineDraw() {
    drawMenuBG(7);
    sfText('Jugar online', W / 2, 40, 44, PAPER);
    if (!Net.ok) {
      slab(W / 2 - 420, 150, 840, 380, { skew: 0.05 });
      sfText(window.APYV_WEB ? 'No se pudo conectar a las salas' : 'El online funciona desde el link del juego', W / 2, 200, 36, GOLD);
      const lines = window.APYV_WEB ? [
        'Revisa tu conexión a internet y vuelve a entrar a esta pantalla.',
        'Si estás en una red de oficina o escuela, puede que bloquee el juego en línea.',
        'Mientras tanto puedes jugar en esta pantalla contra la CPU o con controles.',
      ] : [
        'Abre el juego desde su link en claude.ai (no desde el archivo descargado).',
        'Comparte el juego con tus amigos desde el menú "Compartir" de la página',
        'e invítalos con su correo. Cada quien entra con su cuenta de Claude.',
        'Todos abren el link al mismo tiempo: uno crea la sala y los demás se unen.',
      ];
      lines.forEach((l, i) => text(l, W / 2, 270 + i * 40, 18, '#e2e8f0', { body: true, weight: 500 }));
      text(this.t > 600 ? 'No se pudo conectar a la sala en esta vista.' : 'Buscando la sala…', W / 2, 470, 15, MUTED, { body: true, weight: 600 });
      sfButton('‹ Volver', 40, 660, 170, 44, hover(40, 660, 170, 44));
      return;
    }
    const hosts = Net.hosts().filter(h => !h.sameTab);
    const here = Net.peers().filter(p => p.presence && p.presence.g === 'golpazo');
    text(`${Net.conn ? '● Conectado' : '○ Conectando…'}  ·  Aquí ahora: ${here.map(p => p.sameTab ? 'Tú' : Net.nameOf(p.peer)).join(', ') || 'solo tú'}`, W / 2, 96, 15, Net.conn ? TEAL : MUTED, { body: true, weight: 600 });
    const rows = [{ label: 'Crear sala', sub: 'Tú eres el anfitrión: eliges el escenario y las reglas' }].concat(hosts.map(h => {
      const lob = h.presence.lob || {}, sl = lob.sl || [];
      const used = sl.filter(x => x[0] !== 'n').length;
      const ph = lob.ph === 'lobby' ? 'eligiendo personajes' : lob.ph === 'res' ? 'viendo resultados' : 'peleando (entra a ver)';
      return { label: `Sala de ${Net.nameOf(h.peer)}`, sub: `${h.presence.code ? 'código ' + h.presence.code + ' · ' : ''}${used}/4 · ${ph}` };
    }));
    rows.forEach((r, i) => {
      const y = 200 + i * 70, sel = i === this.onSel || hover(W / 2 - 300, y, 600, 58);
      slab(W / 2 - 300 + (sel ? 10 : 0), y, 600, 58, sel ? { top: '#ffd76a', bottom: '#e0a01a', edge: '#fff3c4' } : {});
      sfText(r.label, W / 2 - 260 + (sel ? 10 : 0), y + 22, 32, sel ? INK : PAPER, { align: 'left', stroke: sel ? null : undefined });
      text(r.sub, W / 2 + 270 + (sel ? 10 : 0), y + 40, 13, sel ? INK : MUTED, { align: 'right', body: true, weight: 600 });
    });
    if (!hosts.length) text('Todavía no hay salas abiertas: crea una o espera a que tus amigos abran el juego.', W / 2, 300, 15, MUTED, { body: true, weight: 500 });
    if (Net.wantCode) { slab(W / 2 - 300, 128, 600, 44, { skew: 0.1, edge: GOLD }); text(`Buscando la sala ${Net.wantCode} de tu invitación…`, W / 2, 151, 17, GOLD, { body: true, weight: 700 }); }
    text('Todos abren este mismo link. Cada quien juega con su control o teclado desde su casa.', W / 2, 610, 14, MUTED, { body: true, weight: 500 });
    if (window.APYV_WEB && Net.user && Net.user.name) {
      const nm = `Tu nombre: ${Net.user.name()} · cámbialo aquí`;
      text(nm, W - 40, 684, 14, hover(W - 330, 666, 300, 30) ? GOLD : MUTED, { body: true, weight: 600, align: 'right' });
      if (clickIn(W - 330, 666, 300, 30)) Net.user.askName(true);
    }
    text('Ya en la sala, el botón "🎥 Cámara y voz" los pone en video para verse y platicar mientras pelean.', W / 2, 634, 14, TEAL, { body: true, weight: 600 });
    sfButton('‹ Volver', 40, 660, 170, 44, hover(40, 660, 170, 44));
  },

  // ---------------- ONLINE: sala vista por un invitado ----------------
  netSlots() {
    const hp = Net.hostPres(), me = Net.myPeer(), g = Net.guest;
    const sl = (hp && hp.lob && hp.lob.sl) || [['n'], ['n'], ['n'], ['n']];
    return sl.map((a, i) => {
      if (a[0] === 'c') return { type: 'cpu', cur: a[1], ready: !!a[2], pick: CHAR_ORDER[a[3]], level: a[4], edit: i, team: a[5] || 0 };
      if (a[0] === 'h') {
        if (a[1] && a[1] === me) return { type: 'human', dev: 'net:Tú', cur: g.ch, ready: !!g.rdy, pick: g.rdy ? (CHAR_ORDER[a[4]] || CHAR_ORDER[g.ch] || null) : null, edit: i, mine: true, team: g.tm >= 0 ? g.tm : (a[5] || 0) };
        const nm = a[1] ? Net.nameOf(a[1]) : Net.nameOf(Net.hostPeer);
        const first = sl.findIndex(x => x[0] === 'h' && !x[1]) === i;
        return { type: 'human', dev: 'net:' + nm, cur: a[2], ready: !!a[3], pick: CHAR_ORDER[a[4]] || null, edit: i, team: a[5] || 0, peer: a[1] || (first ? Net.hostPeer : null) };
      }
      return { type: 'none' };
    });
  },
  netroomUpdate() {
    const g = Net.guest, before = g.ch + ':' + g.rdy + ':' + g.tm, N = NCH() + 1;
    const hp = Net.hostPres(), ru = hp && hp.lob && hp.lob.ru ? Net.decRules(hp.lob.ru) : null;
    const mine = this.netSlots().find(x => x.mine);
    for (const d of Devices.list) {
      const n = Devices.nav(d);
      if (!g.rdy) {
        if (n.left) { g.ch = (g.ch + N - 1) % N; Audio8.sfx('menu'); }
        if (n.right) { g.ch = (g.ch + 1) % N; Audio8.sfx('menu'); }
        if (n.up || n.down) { g.ch = this.cardRow(g.ch, n.up ? -1 : 1); Audio8.sfx('menu'); }
        if (n.confirm) { g.rdy = 1; Audio8.sfx('confirm'); }
      }
      if (n.shield && ru && ru.teams && mine) { g.tm = (mine.team || 0) ? 0 : 1; Audio8.sfx('menu'); }
      if (n.back) { Audio8.sfx('back'); if (g.rdy) g.rdy = 0; else { Net.leave(); return this.go('online'); } }
    }
    for (let i = 0; i < N; i++) { const r = this.cardRect(i); if (clickIn(r.x, r.y, r.w, r.h)) { g.ch = i; g.rdy = 1; Audio8.sfx('confirm'); } }
    if (clickIn(40, 660, 150, 40)) { Audio8.sfx('back'); Net.leave(); return this.go('online'); }
    if (g.ch + ':' + g.rdy + ':' + g.tm !== before) Net.set({ ch: g.ch, rdy: g.rdy, tm: g.tm });
  },
  netroomDraw() {
    const saved = this.slots;
    this.slots = this.netSlots();
    const hp = Net.hostPres(), lob = hp && hp.lob;
    const inRoom = this.slots.some(s => s.mine);
    const stg = lob ? (STAGE_INFO[lob.stg] || STAGE_INFO[0]).name : '';
    const rules = lob && lob.ru ? Net.decRules(lob.ru) : null;
    this.netTeams = !!(rules && rules.teams);
    const ru = rules ? (stockMode(rules.mode) ? `${rules.stocks} vidas` : `${rules.time} min`) + ' · objetos: ' + ['ninguno', 'pocos', 'normal', 'muchos'][rules.items] : '';
    const teamHint = this.netTeams ? ' · Escudo: cambiar de equipo' : '';
    this.charselDraw({ title: `Sala de ${Net.nameOf(Net.hostPeer)}`, rules: rules || this.rules, footer: inRoom ? (Net.guest.rdy ? `¡Listo! Esperando al anfitrión · ${stg} · ${ru}` : `←→ elige personaje · A listo · B salir de la sala${teamHint} · ${stg} · ${ru}`) : 'La sala está llena: verás la pelea como espectador' });
    this.slots = saved;
  },

  // ---------------- ONLINE: la pelea vista por un invitado ----------------
  netviewUpdate() {
    if (Net.view) { BATTLE = Net.view; Net.view.viewTick(); }
    if (keyEdge('kb1', 'Escape')) { Net.leave(); BATTLE = null; this.go('online'); }
  },
  netviewDraw() {
    if (Net.view) Net.view.draw();
    if (!Net.lastSnap) { ctx.fillStyle = 'rgba(6,8,14,.7)'; ctx.fillRect(0, 0, W, H); sfText('Conectando con el anfitrión…', W / 2, H / 2, 44, GOLD); }
    const oy = hudOnTop() ? H - 46 : 14;
    slab(16, oy, 250, 32, { skew: 0.3 });
    text(`● ONLINE · sala de ${Net.nameOf(Net.hostPeer)}`, 141, oy + 17, 13, TEAL, { body: true, weight: 700 });
  },

  // ---------------- CONFIGURAR BOTONES ----------------
  bindRows(dev) {
    const rows = ACTIONS.map(a => ({ kind: 'act', a, label: ACTION_LABEL[a], val: bindList(dev, a) }));
    rows.push({ kind: 'tap', label: 'Saltar con ↑', val: Binds.forDev(dev).tapJump !== false ? 'Sí' : 'No' });
    rows.push({ kind: 'reset', label: 'Restablecer', val: Binds.isCustom(dev) ? 'Volver a los de fábrica' : 'Sin cambios' });
    return rows;
  },
  bindsUpdate() {
    const B = this.bind, devs = Devices.list;
    B.dev = clamp(B.dev, 0, devs.length - 1);
    const dev = devs[B.dev], rows = this.bindRows(dev);
    const cap = pollCapture();
    if (cap) {
      if (cap.bind) { Binds.bind(dev, rows[B.row].a, cap.bind); B.msg = `${rows[B.row].label}: ${bindName(cap.bind)}`; Audio8.sfx('confirm'); }
      else { B.msg = 'Cancelado'; Audio8.sfx('back'); }
      B.cool = 12;
      return;
    }
    if (Capture.active) return;
    if (B.cool > 0) { B.cool--; return; }
    const act = r => {
      const row = rows[r];
      if (row.kind === 'act') { startCapture(dev, row.a); B.msg = ''; Audio8.sfx('menu'); }
      else if (row.kind === 'tap') { Binds.toggleTap(dev); Audio8.sfx('menu'); }
      else { Binds.reset(dev); B.msg = `${devLabel(dev)}: botones de fábrica`; Audio8.sfx('confirm'); }
    };
    for (const d of devs) {
      const n = Devices.nav(d);
      if (B.col === 0) {
        if (n.up) { B.dev = (B.dev + devs.length - 1) % devs.length; Audio8.sfx('menu'); }
        if (n.down) { B.dev = (B.dev + 1) % devs.length; Audio8.sfx('menu'); }
        if (n.right || n.confirm) { B.col = 1; B.row = 0; Audio8.sfx('menu'); }
        if (n.back) { Audio8.sfx('back'); return this.go('main'); }
      } else {
        if (n.up) { B.row = (B.row + rows.length - 1) % rows.length; Audio8.sfx('menu'); }
        if (n.down) { B.row = (B.row + 1) % rows.length; Audio8.sfx('menu'); }
        if (n.left || n.back) { B.col = 0; Audio8.sfx('back'); }
        if (n.confirm) return act(B.row);
      }
    }
    devs.forEach((d, i) => { if (clickIn(40, 120 + i * 62, 330, 52)) { B.dev = i; B.col = 1; B.row = 0; } });
    rows.forEach((r, i) => { if (clickIn(410, 116 + i * 40, 830, 36)) { B.col = 1; B.row = i; act(i); } });
    if (clickIn(40, 660, 170, 44)) this.go('main');
  },
  bindsDraw() {
    drawMenuBG(4);
    sfText('Configurar botones', W / 2, 40, 44, PAPER);
    const B = this.bind, devs = Devices.list, dev = devs[clamp(B.dev, 0, devs.length - 1)];
    text('Dispositivo', 40, 100, 13, MUTED, { align: 'left', body: true, weight: 700 });
    devs.forEach((d, i) => {
      const y = 120 + i * 62, sel = i === B.dev;
      slab(40 + (sel ? 10 : 0), y, 330, 52, sel ? { top: B.col === 0 ? '#ffd76a' : '#3a4356', bottom: B.col === 0 ? '#e0a01a' : '#1f2533', edge: GOLD } : {});
      sfText(devLabel(d), 70 + (sel ? 10 : 0), y + 22, 30, sel && B.col === 0 ? INK : PAPER, { align: 'left', stroke: sel && B.col === 0 ? null : undefined });
      text(Binds.isCustom(d) ? 'personalizado' : 'de fábrica', 355 + (sel ? 10 : 0), y + 38, 11, sel && B.col === 0 ? INK : MUTED, { align: 'right', body: true, weight: 600 });
    });
    if (!padInfo.length) wrapText('¿Tu control no aparece? Empareja el control por Bluetooth y pulsa cualquier botón con el juego abierto.', 205, 120 + devs.length * 62 + 20, 320, 13, 18, MUTED);
    const rows = this.bindRows(dev);
    slab(400, 104, 840, rows.length * 40 + 24, { skew: 0.03 });
    rows.forEach((r, i) => {
      const y = 116 + i * 40, sel = B.col === 1 && i === B.row;
      if (sel) { slabPath(410, y, 820, 36, 0.3); ctx.fillStyle = 'rgba(255,197,61,.18)'; ctx.fill(); }
      sfText(r.label, 440, y + 18, 28, sel ? GOLD : PAPER, { align: 'left' });
      const capturing = Capture.active && sel;
      text(capturing ? (dev.startsWith('kb') ? 'Pulsa una tecla… (Esc cancela)' : 'Pulsa un botón o mueve un stick… (Esc cancela)') : r.val, 640, y + 19, 16, capturing ? GOLD : r.kind === 'reset' ? MUTED : '#e2e8f0', { align: 'left', body: true, weight: 600 });
      if (r.kind === 'act' && r.a === 'smash' && !capturing) text('opcional: Smash con un solo botón', 1210, y + 19, 12, MUTED, { align: 'right', body: true, weight: 500 });
    });
    const tip = B.msg || (B.col === 0 ? '↑↓ elige dispositivo · A / → para editar' : 'A: cambiar (pulsa la nueva tecla o botón) · la anterior queda como alternativa · B: volver');
    text(tip, 820, 116 + rows.length * 40 + 42, 15, B.msg ? TEAL : MUTED, { body: true, weight: 600 });
    text('Se guarda en este navegador. Los controles se recuerdan por modelo.', 820, 116 + rows.length * 40 + 66, 13, MUTED, { body: true });
    sfButton('‹ Volver', 40, 660, 170, 44, hover(40, 660, 170, 44));
  },

  // ---------------- CÓMO JUGAR ----------------
  controlsUpdate() {
    for (const d of Devices.list) {
      const n = Devices.nav(d);
      if (n.back || n.start) { Audio8.sfx('back'); return this.go('main'); }
      if (n.left || n.right) { this.ctrlTab = (this.ctrlTab + 1) % 2; Audio8.sfx('menu'); }
      // en la pestaña de prueba, A hace vibrar ese control
      if (this.ctrlTab === 1 && n.confirm && d.startsWith('pad')) { Rumble.cur = {}; Rumble.play(d, 0.7, 0.9, 320); }
    }
    if (clickIn(W / 2 - 280, 76, 270, 44)) this.ctrlTab = 0;
    if (clickIn(W / 2 + 10, 76, 270, 44)) this.ctrlTab = 1;
    if (clickIn(40, 660, 170, 44)) this.go('main');
  },
  controlsDraw() {
    drawMenuBG(5);
    sfText('Cómo jugar', W / 2, 40, 44, PAPER);
    sfButton('Combinaciones', W / 2 - 280, 76, 270, 44, this.ctrlTab === 0);
    sfButton('Botones y prueba', W / 2 + 10, 76, 270, 44, this.ctrlTab === 1);
    if (this.ctrlTab === 0) {
      slab(40, 136, 1200, 504, { skew: 0.03 });
      MOVE_LIST.forEach(([k, v], i) => {
        const col = i < 8 ? 0 : 1, row = col ? i - 8 : i;
        const x = col ? 660 : 80, y = 170 + row * 54;
        slabPath(x, y - 20, 260, 40, 0.3); ctx.fillStyle = 'rgba(255,197,61,.14)'; ctx.fill();
        text(k, x + 130, y, 14, GOLD, { body: true, weight: 700 });
        wrapText(v, x + 280, y - 8, 285, 14, 17, PAPER, 'left');
      });
      text('El % de daño no es vida: mientras más alto, más lejos sales volando con cada golpe. En Vidas gana el último que queda en pie.', W / 2, 608, 14, '#cbd5e1', { body: true, weight: 600 });
      text('Si juegas solo en el teclado, te sirven las flechas y WASD. Con dos en el teclado: WASD + J K es el jugador 1, flechas + , . el jugador 2.', W / 2, 630, 13, MUTED, { body: true, weight: 600 });
    } else {
      const pad = Devices.list.find(d => d.startsWith('pad')) || null;
      const cols = [['kb1', 'Teclado 1'], ['kb2', 'Teclado 2'], [pad, pad ? devLabel(pad) : 'Control']];
      slab(40, 136, 790, 504, { skew: 0.03 });
      cols.forEach(([d, name], j) => sfText(name, 330 + j * 170, 162, 26, GOLD));
      ACTIONS.forEach((a, i) => {
        const y = 196 + i * 36;
        sfText(ACTION_LABEL[a], 70, y, 24, PAPER, { align: 'left' });
        cols.forEach(([d], j) => {
          const val = d ? bindList(d, a) : (DEFAULT_PAD[a] || []).map(bindName).join(' / ') || '—';
          text(val, 330 + j * 170, y + 1, 12, '#cbd5e1', { body: true, weight: 600 });
        });
      });
      text('Cámbialos en el menú "Configurar botones".', 435, 612, 13, MUTED, { body: true, weight: 600 });
      slab(850, 136, 390, 504, { skew: 0.03 });
      sfText('Probar control', 1045, 162, 26, GOLD);
      if (gamepadsBlocked) wrapText('La página que contiene al juego no le deja leer controles. Abre el archivo del juego directamente en Edge o Chrome y ahí sí funcionan.', 1045, 220, 330, 14, 20, '#ff9f1c');
      else if (!padInfo.length) {
        wrapText('No hay controles detectados.', 1045, 214, 330, 16, 22, PAPER);
        wrapText('1. Empareja el control por Bluetooth en tu computadora o teléfono.', 1045, 252, 330, 14, 20, '#cbd5e1');
        wrapText('2. Con el juego abierto, pulsa cualquier botón del control.', 1045, 300, 330, 14, 20, '#cbd5e1');
        wrapText('Funcionan Xbox, PlayStation, Switch Pro, 8BitDo y genéricos.', 1045, 348, 330, 14, 20, MUTED);
      } else padInfo.slice(0, 4).forEach((p, i) => {
        const y = 206 + i * 104;
        text(`${i + 1}. ${shortPadName(p.id)}${p.mapping !== 'standard' ? ' (mapa no estándar)' : ''}`, 870, y, 14, PAPER, { align: 'left', body: true, weight: 700 });
        p.buttons.slice(0, 17).forEach((on, j) => { ctx.fillStyle = on ? GOLD : 'rgba(154,167,184,.25)'; ctx.beginPath(); ctx.arc(882 + (j % 9) * 34, y + 26 + Math.floor(j / 9) * 26, 9, 0, TAU); ctx.fill(); text(`${j}`, 882 + (j % 9) * 34, y + 27 + Math.floor(j / 9) * 26, 9, on ? INK : MUTED, { body: true, weight: 700 }); });
        p.axes.slice(0, 4).forEach((v, j) => { ctx.fillStyle = 'rgba(154,167,184,.25)'; ctx.fillRect(1186, y + 14 + j * 12, 40, 6); ctx.fillStyle = TEAL; ctx.fillRect(1206 + Math.min(0, v * 20), y + 14 + j * 12, Math.abs(v * 20), 6); });
        const vib = !Rumble.on ? 'Vibración apagada (menú principal)' : Rumble.canRumble('pad' + p.index) ? 'Vibración lista · pulsa A para sentirla' : 'Este navegador no deja vibrar al control';
        text(vib, 870, y + 84, 12, Rumble.on && Rumble.canRumble('pad' + p.index) ? TEAL : MUTED, { align: 'left', body: true, weight: 600 });
      });
    }
    sfButton('‹ Volver', 40, 660, 170, 44, hover(40, 660, 170, 44));
    text('B / Esc: volver · ←→ cambiar pestaña', W / 2, 684, 14, MUTED, { body: true });
  },

  // ---------------- RESULTADOS ----------------
  resultsUpdate() {
    if (this.t < 40) return;
    if (Net.role === 'guest') { for (const d of Devices.list) { const n = Devices.nav(d); if (n.back) { Net.leave(); return this.go('online'); } } return; }
    if (Net.role === 'host') {
      for (const d of Devices.list) {
        const n = Devices.nav(d);
        if (n.confirm || n.start) { Audio8.sfx('confirm'); Net.startMatch(this.lastSetup); return this.showVS(this.lastSetup); }
        if (n.back) { this.slots.forEach(s => { if (s.type === 'human' && !s.remote) s.ready = false; }); return this.go('charsel'); }
      }
      if (clickIn(W - 540, 648, 240, 52)) { Net.startMatch(this.lastSetup); return this.showVS(this.lastSetup); }
      if (clickIn(W - 280, 648, 240, 52)) { this.slots.forEach(s => { if (s.type === 'human' && !s.remote) s.ready = false; }); this.go('charsel'); }
      return;
    }
    for (const d of Devices.list) {
      const n = Devices.nav(d);
      if (n.confirm || n.start) { Audio8.sfx('confirm'); return this.showVS(this.lastSetup); }
      if (n.back) { Audio8.sfx('back'); this.slots.forEach(s => { if (s.type === 'human') s.ready = false; }); return this.go('charsel'); }
    }
    if (clickIn(W - 540, 648, 240, 52)) return this.showVS(this.lastSetup);
    if (clickIn(W - 280, 648, 240, 52)) { this.slots.forEach(s => { if (s.type === 'human') s.ready = false; }); this.go('charsel'); }
  },
  resultsDraw() {
    const R = this.results; if (!R) return;
    drawMenuBG(6);
    const win = R.ranked[0], teams = !!R.teams, m = R.mode;
    const heroCol = teams && R.winTeam >= 0 ? TEAM_COLORS[R.winTeam] : win.color;
    ctx.save(); slabPath(0, 0, 640, H, -0.1); ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, withAlpha(heroCol, 0.5)); g.addColorStop(1, '#07090f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 700, H);
    drawBust(ctx, win.id, 20, 70, 560, 520, R.draw ? 'normal' : 'happy');
    const fade = ctx.createLinearGradient(0, 420, 0, H); fade.addColorStop(0, 'rgba(7,9,15,0)'); fade.addColorStop(0.6, 'rgba(7,9,15,.95)');
    ctx.fillStyle = fade; ctx.fillRect(0, 420, 700, H - 420);
    ctx.restore();
    ctx.save(); ctx.translate(460, 660); ctx.scale(2.1, 2.1); drawCharacter(ctx, win.id, R.draw ? POSES.idle : Math.floor(this.t / 40) % 2 ? POSES.win1 : POSES.win2, {}); ctx.restore();
    const lastStanding = stockMode(m);
    const who = p => p.label || (p.cpu ? 'CPU' : PLAYER_TAGS[p.port]);
    const title = R.draw ? '¡Empate!' : teams ? `¡Gana el equipo ${TEAM_NAMES[R.winTeam]}!` : `¡Gana ${CHARS[win.id].name}!`;
    sfText(title, 300, 560, title.length > 20 ? 62 : 84, GOLD);
    let sub;
    if (m === 'soccer' && R.goals) sub = `${TEAM_NAMES[0]} ${R.goals[0]} – ${R.goals[1]} ${TEAM_NAMES[1]}`;
    else if (R.draw) sub = lastStanding ? 'Cayeron al mismo tiempo' : 'Mismo puntaje';
    else if (teams) sub = R.ranked.filter(p => p.win).map(p => CHARS[p.id].name).join(' y ') + (lastStanding ? ' · últimos en pie' : '');
    else sub = who(win) + (lastStanding ? ' · último en pie' : '');
    sfText(`${sub} · ${R.stage}`, 300, 616, sub.length > 34 ? 22 : 28, heroCol);
    if (R.party) text(`Fiesta: ${R.party}`, 300, 650, 14, GOLD, { body: true, weight: 700 });
    slab(660, 64, 590, 560, { skew: 0.04 });
    const first = m === 'time' || m === 'koth' ? 'Puntos' : m === 'soccer' ? 'Goles' : lastStanding ? 'Vidas' : 'KOs';
    const cols = ['', 'Jugador', first, 'KOs', 'Caídas', 'Daño'];
    const cx = [700, 820, 980, 1055, 1135, 1210];
    cols.forEach((c, i) => text(c, cx[i], 100, 13, GOLD, { body: true, weight: 700 }));
    R.ranked.forEach((p, i) => {
      const y = 160 + i * 110, rc = teams ? TEAM_COLORS[p.team || 0] : p.color, top = teams ? p.win : i === 0 && !R.draw;
      slabPath(680, y - 46, 550, 94, 0.15); ctx.fillStyle = top ? withAlpha(rc, 0.28) : 'rgba(30,36,50,.7)'; ctx.fill();
      if (teams) { slabPath(680, y - 46, 12, 94, 0.15); ctx.fillStyle = rc; ctx.fill(); }
      sfText(`${i + 1}º`, cx[0], y, 44, top ? GOLD : PAPER);
      ctx.save(); slabPath(730, y - 38, 76, 76, 0.15); ctx.clip(); ctx.fillStyle = withAlpha(rc, 0.4); ctx.fillRect(730, y - 38, 80, 76); drawPortrait(ctx, p.id, 768, y, 32, top ? 'happy' : 'sad'); ctx.restore();
      sfText(CHARS[p.id].name, 860, y - 10, 30, PAPER, { align: 'left' });
      text(`${who(p)}${teams ? ' · ' + TEAM_NAMES[p.team || 0] : ''}`, 862, y + 18, 13, rc, { body: true, weight: 700, align: 'left' });
      const v0 = first === 'Vidas' ? (p.stocks > 0 ? p.stocks : 'Fuera') : first === 'KOs' ? p.kos : p.score;
      const vals = [v0, p.kos, p.falls, `${p.dealt}%`];
      vals.forEach((v, j) => v === 'Fuera' ? sfText('Fuera', cx[j + 2] + 6, y, 22, '#ff8a8a') : sfText(`${v}`, cx[j + 2], y, 34, PAPER));
    });
    if (Net.role === 'guest') { slab(W - 540, 648, 500, 52, { skew: 0.3 }); sfText('Esperando al anfitrión…', W - 290, 674, 30, GOLD); return; }
    sfButton('Revancha (A)', W - 540, 648, 240, 52, true);
    sfButton(Net.role === 'host' ? 'A la sala (B)' : 'Personajes (B)', W - 280, 648, 240, 52, hover(W - 280, 648, 240, 52));
  },
};

// Iconos de los modos (dibujados, sin imágenes)
function drawModeIcon(id, x, y, on) {
  const c = ctx;
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(7,9,15,.55)'; c.beginPath(); c.arc(0, 0, 46, 0, TAU); c.fill();
  c.strokeStyle = on ? TEAL : 'rgba(154,167,184,.35)'; c.lineWidth = 3; c.stroke();
  c.lineJoin = 'round'; c.lineCap = 'round';
  switch (id) {
    case 'stock': // tres corazones
      for (const [dx, dy, s] of [[-17, 8, 0.8], [17, 8, 0.8], [0, -8, 1]]) {
        c.save(); c.translate(dx, dy); c.scale(s, s);
        c.beginPath(); c.moveTo(0, 14); c.bezierCurveTo(-22, 0, -14, -18, 0, -8); c.bezierCurveTo(14, -18, 22, 0, 0, 14); c.closePath();
        c.fillStyle = '#10131a'; c.lineWidth = 5; c.strokeStyle = '#10131a'; c.stroke(); c.fillStyle = RED; c.fill();
        c.restore();
      }
      break;
    case 'time':
      c.fillStyle = '#f1f5f9'; c.beginPath(); c.arc(0, 0, 28, 0, TAU); c.fill();
      c.strokeStyle = '#10131a'; c.lineWidth = 4; c.stroke();
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -19); c.moveTo(0, 0); c.lineTo(13, 6); c.stroke();
      c.fillStyle = RED; c.beginPath(); c.arc(0, 0, 3.5, 0, TAU); c.fill();
      break;
    case 'hp':
      for (const [dy, k, cl] of [[-12, 0.85, '#34d399'], [12, 0.35, '#ffd166']]) {
        c.fillStyle = '#10131a'; c.fillRect(-32, dy - 8, 64, 16);
        c.fillStyle = 'rgba(154,167,184,.3)'; c.fillRect(-29, dy - 5, 58, 10);
        c.fillStyle = cl; c.fillRect(-29, dy - 5, 58 * k, 10);
      }
      break;
    case 'koth': // corona
      c.beginPath(); c.moveTo(-28, 16); c.lineTo(-32, -14); c.lineTo(-14, 0); c.lineTo(0, -22); c.lineTo(14, 0); c.lineTo(32, -14); c.lineTo(28, 16); c.closePath();
      c.lineWidth = 5; c.strokeStyle = '#10131a'; c.stroke(); c.fillStyle = GOLD; c.fill();
      c.fillStyle = RED; c.beginPath(); c.arc(0, 6, 5, 0, TAU); c.fill(); c.fillStyle = TEAL; for (const dx of [-16, 16]) { c.beginPath(); c.arc(dx, 8, 3.5, 0, TAU); c.fill(); }
      break;
    case 'soccer': drawSoccerBall(c, 0, 0, 27, APP.t * 0.02); break;
    case 'bomb':
      c.fillStyle = '#10131a'; c.beginPath(); c.arc(-3, 5, 27, 0, TAU); c.fill();
      c.fillStyle = '#4a5568'; c.beginPath(); c.arc(-3, 5, 23.5, 0, TAU); c.fill();
      c.fillStyle = '#8d99ae'; c.beginPath(); c.arc(-11, -3, 7, 0, TAU); c.fill();
      c.fillStyle = '#10131a'; c.fillRect(4, -22, 12, 9);
      c.strokeStyle = '#c9a27e'; c.lineWidth = 4; c.beginPath(); c.moveTo(12, -14); c.quadraticCurveTo(22, -28, 30, -22); c.stroke();
      if (Math.floor(APP.t / 6) % 2) drawStar(c, 31, -23, 9, 4, '#ffd166');
      break;
  }
  c.restore();
}

// Invitar se atiende dentro del gesto (clic, toque o tecla I): solo así el navegador deja compartir o copiar
canvas.addEventListener('click', e => { const p = toLogical(e); if (!InviteBox.isOpen() && APP.inviteHit(p.x, p.y)) Net.invite(); });
window.addEventListener('keydown', e => { if (e.code === 'KeyI' && !e.repeat && !InviteBox.isOpen() && APP.inviteShown()) Net.invite(); });
