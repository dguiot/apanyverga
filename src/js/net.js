'use strict';
// ============================================================
//  ONLINE: salas en tiempo real con la capacidad "room" del visor.
//  El anfitrión simula la pelea y publica una foto compacta del estado
//  en su "presence" (~30 veces/s); cada invitado publica solo su control.
// ============================================================
const NET_STATES = ['idle', 'walk', 'dash', 'run', 'turn', 'jumpsquat', 'land', 'air', 'helpless', 'hitstun', 'down', 'shield', 'dizzy', 'dodge', 'airdodge', 'ledge', 'climb', 'holding', 'grabbed', 'attack', 'respawn', 'brake'];
const NET_FACES = ['normal', 'angry', 'hurt', 'happy', 'sad', 'ko', 'dizzy'];
const NET_PROJ = ['shuriken', 'fireball', 'wave', 'orb', 'laser', 'homing', 'fstar', 'bowling', 'rock', 'meteor', 'cannon', 'item', 'boom', 'ball', 'steam', 'rocketfist', 'mine', 'hairball', 'salsa', 'bull', 'note', 'bubble', 'puddle', 'geyser', 'band', 'trajinera'];
const NET_PROJ_COL = { shuriken: '#cbd5e1', fireball: '#ff7b00', wave: '#ff9f1c', orb: '#48cae4', laser: '#48cae4', homing: '#ffd166', fstar: '#ffd166', bowling: '#2b2d42', rock: '#ff6d00', meteor: '#ff9f1c', cannon: '#222', item: '#fff', boom: '#ffbe0b', ball: '#fff', steam: '#f1f5f9', rocketfist: '#aeb8c4', mine: '#2ec4b6', hairball: '#e39b4a', salsa: '#d62828', bull: '#6b4226' };
const NET_ITEMS = ['bat', 'sword', 'gun', 'bomb', 'heart', 'taco', 'star', 'shroom', 'orb'];
const NET_PHASES = ['intro', 'fight', 'end'];
// movimientos en curso (para que el invitado dibuje la pose exacta y la estela)
const NET_MOVES = Object.keys(baseMoves()).concat(['sp_n', 'sp_s', 'sp_u', 'sp_d', 'sp_f', 'pickup', 'counterHit']);
const NET_FX = new Set(['hit', 'boom', 'smoke', 'text', 'target', 'slashline', 'shock', 'coin', 'rock', 'wind', 'pillar', 'claw', 'cateyes', 'impact', 'zzz', 'ring', 'spike', 'drop']);
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100, ri = v => Math.round(v);

// Eventos del anfitrión que los invitados reproducen (efectos, sonidos, anuncios)
const NetEv = {
  on: false, id: 0, buf: [],
  push(e) { if (!this.on) return; this.buf.push([++this.id].concat(e)); if (this.buf.length > 28) this.buf.shift(); },
};

// Control remoto: lo que un invitado publica en su presence, leído por el anfitrión
class NetCtrl extends Controller {
  constructor(peer) { super('net:' + peer); this.peer = peer; this.lastCnt = null; this.missing = 0; }
  pull() {
    const pr = Net.presOf(this.peer);
    const a = pr && Array.isArray(pr.inp) ? pr.inp : null;
    if (!a) { this.missing++; this.update(blankState()); return; }
    this.missing = 0;
    const s = blankState();
    s.x = clamp((+a[0] || 0) / 100, -1, 1); s.y = clamp((+a[1] || 0) / 100, -1, 1);
    s.cx = clamp((+a[2] || 0) / 100, -1, 1); s.cy = clamp((+a[3] || 0) / 100, -1, 1);
    const bits = +a[4] || 0;
    BUTTONS.forEach((b, i) => { const cnt = a[5 + i]; const tapped = this.lastCnt && cnt !== this.lastCnt[i]; s[b] = !!(bits & (1 << i)) || !!tapped; });
    s.tapJump = !(bits & 256); s.digital = !!(bits & 512);
    s.any = BUTTONS.some(b => s[b]);
    this.lastCnt = a.slice(5, 5 + BUTTONS.length);
    this.update(s);
  }
}

// código corto de sala para invitar (sin letras que se confunden: 0/O, 1/I/L)
const ROOM_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const roomCode = () => Array.from({ length: 4 }, () => ROOM_ABC[randi(0, ROOM_ABC.length - 1)]).join('');
// ?sala=K7QX en el link: entra directo a esa sala
function inviteCodeFromURL() {
  try { const c = new URLSearchParams(location.search).get('sala'); return c ? c.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || null : null; } catch (e) { return null; }
}
const Net = {
  code: null, wantCode: inviteCodeFromURL(),
  room: null, user: null, ok: false, tried: false, conn: false,
  role: 'off', hostPeer: null, localDev: 'kb1', names: {}, asked: {},
  lob: { ph: 'lobby', ep: 0 }, lastLobJSON: '', view: null, lastSnap: null, lastEv: 0, lostHostT: 0,
  guest: { ch: 0, rdy: 0, cnt: BUTTONS.map(() => 0) },
  async init() {
    if (this.tried) return; this.tried = true;
    try {
      if (!window.claude || typeof window.claude.use !== 'function') return;
      this.room = await window.claude.use('room');
      this.user = await window.claude.use('user').catch(() => null);
      if (this.user) this.myId = await this.user.id();
    } catch (e) { this.room = null; }
    if (!this.room) return;
    this.ok = true;
    try { this.room.onConnection(c => { this.conn = c; }, () => { this.ok = false; }); } catch (e) { /* sin sala */ }
    this.set({ g: 'golpazo', v: 1, role: 'idle', join: null });
  },
  set(patch) { if (this.room) this.room.presence(patch).catch(() => {}); },
  peers() { try { return this.room ? this.room.peers() : []; } catch (e) { return []; } },
  me() { return this.peers().find(p => p.sameTab) || null; },
  myPeer() { const m = this.me(); return m ? m.peer : null; },
  byOf(peer) { const p = this.peers().find(x => x.peer === peer); return p && p.by ? p.by : null; },
  presOf(peer) { const p = this.peers().find(x => x.peer === peer); return p && p.presence && p.presence.g === 'golpazo' ? p.presence : null; },
  hosts() { return this.peers().filter(p => p.presence && p.presence.g === 'golpazo' && p.presence.role === 'host' && p.presence.lob); },
  hostByCode(code) { return code ? this.hosts().find(h => !h.sameTab && h.presence.code === code) || null : null; },
  codeOf(peer) { const p = this.presOf(peer); return p && p.code ? p.code : null; },
  // ---------- invitar ----------
  inviteURL() {
    if (!window.APYV_WEB || !this.code) return null;
    try { return location.origin + location.pathname + '?sala=' + this.code; } catch (e) { return null; }
  },
  inviteText() {
    const who = this.user && this.user.name ? this.user.name() : '', url = this.inviteURL();
    return url ? `¡Vente a jugar A pan y verga${who ? ' con ' + who : ''}! Entra directo a mi sala: ${url}`
      : `¡Vente a jugar A pan y verga! Abre el juego (el link que te compartí), entra a "Jugar online" y elige mi sala · código ${this.code}`;
  },
  // compartir (celular) o copiar el link; si el navegador no deja, queda escrito en pantalla
  async invite() {
    const text = this.inviteText(), url = this.inviteURL();
    try { if (navigator.share && url) { await navigator.share({ title: 'A pan y verga', text, url }); return 'share'; } } catch (e) { if (e && e.name === 'AbortError') return 'abort'; }
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); Toasts.push(url ? '📋 Link de invitación copiado: pégalo en WhatsApp' : '📋 Invitación copiada: pégala en WhatsApp'); return 'copy'; } } catch (e) { /* sin portapapeles */ }
    Toasts.push(url ? 'Comparte este link: ' + url : `Diles que elijan tu sala · código ${this.code}`);
    return 'show';
  },
  guestsOf(peer) { return this.peers().filter(p => !p.sameTab && p.presence && p.presence.g === 'golpazo' && p.presence.role === 'guest' && p.presence.join === peer); },
  nameOf(peer) {
    const p = this.peers().find(x => x.peer === peer);
    if (!p) return 'Jugador';
    // versión web: el nombre viaja con la presencia y puede cambiar (no se guarda en caché)
    if (p.by && this.user && this.user.liveName) { const n = this.user.liveName(p.by); if (n) return p.sameTab ? 'Tú' : n; }
    if (p.by && this.names[p.by]) return this.names[p.by];
    if (p.by && this.user && !this.asked[p.by]) {
      this.asked[p.by] = true;
      this.user.profiles([p.by]).then(ps => { const n = ps && ps[p.by] && ps[p.by].name; if (n) this.names[p.by] = n.split(' ')[0]; }).catch(() => {});
    }
    return (p.sameTab ? 'Tú' : 'Amigo ' + p.peer.slice(0, 2).toUpperCase());
  },

  // ---------- papel de anfitrión ----------
  host(dev) {
    this.role = 'host'; this.localDev = dev; this.hostPeer = this.myPeer();
    this.lob = { ph: 'lobby', ep: (this.lob.ep || 0) + 1 };
    if (!this.code) this.code = roomCode(); // el mismo en toda la visita: el link que ya mandaste sigue sirviendo
    this.set({ role: 'host', code: this.code, join: null, lob: null, st: null, inp: null });
    this.lastLobJSON = '';
  },
  join(peer, dev) {
    this.role = 'guest'; this.hostPeer = peer; this.localDev = dev;
    this.guest = { ch: randi(0, CHAR_ORDER.length - 1), rdy: 0, tm: -1, cnt: BUTTONS.map(() => 0) };
    this.lastSnap = null; this.lastEv = 0; this.view = null; this.lostHostT = 0;
    this.set({ role: 'guest', join: peer, ch: this.guest.ch, rdy: 0, tm: -1, lob: null, st: null });
  },
  leave() {
    if (typeof AV !== 'undefined' && AV.on) AV.stop(true);
    this.role = 'off'; this.hostPeer = null; NetEv.on = false; this.view = null;
    this.set({ role: 'idle', join: null, lob: null, st: null, inp: null, rdy: 0 });
  },
  // lobby del anfitrión → presence
  publishLobby(extra) {
    Object.assign(this.lob, extra || {});
    const sl = APP.slots.map(s => s.type === 'none' ? ['n'] : s.type === 'cpu' ? ['c', s.cur, s.ready ? 1 : 0, CHAR_ORDER.indexOf(s.pick), s.level, s.team || 0] : ['h', s.remote || '', s.cur, s.ready ? 1 : 0, CHAR_ORDER.indexOf(s.pick), s.team || 0]);
    const lob = Object.assign({}, this.lob, { sl, stg: APP.stageSel, ru: this.encRules(APP.rules) });
    const j = JSON.stringify(lob);
    if (j !== this.lastLobJSON) { this.lastLobJSON = j; this.set({ lob }); }
  },
  encRules(r) { return [Math.max(0, MODES.findIndex(m => m.id === r.mode)), r.stocks, r.time, r.items, r.teams || r.mode === 'soccer' ? 1 : 0, r.party ? 1 : 0]; },
  decRules(a) { const mode = (MODES[a[0]] || MODES[0]).id; return { mode, stocks: a[1], time: a[2], items: a[3], teams: !!a[4] || mode === 'soccer', party: !!a[5] }; },
  // invitados que se unieron → ranuras del anfitrión
  syncSlots() {
    const me = this.myPeer(); if (!me) return;
    const guests = this.guestsOf(me);
    const sl = APP.slots;
    for (let i = 0; i < 4; i++) if (sl[i].remote && !guests.find(g => g.peer === sl[i].remote)) { Toasts.push(`${sl[i].name || 'Un jugador'} salió de la sala`); sl[i] = { type: 'none' }; }
    for (const g of guests) {
      let s = sl.find(x => x.remote === g.peer);
      if (!s) {
        if (this.lob.ph !== 'lobby') continue; // espectador hasta la próxima
        const free = sl.findIndex(x => x.type === 'none');
        if (free < 0) continue;
        sl[free] = s = { type: 'human', remote: g.peer, dev: 'net:' + g.peer, cur: 0, ready: false, team: free % 2 };
        Audio8.sfx('confirm'); Toasts.push(`${this.nameOf(g.peer)} entró a tu sala`);
      }
      s.name = this.nameOf(g.peer); s.dev = 'net:' + s.name;
      s.cur = clamp(+g.presence.ch || 0, 0, CHAR_ORDER.length);
      // el equipo que elige el invitado se aplica cuando lo cambia (el anfitrión puede rebalancear después)
      if ((g.presence.tm === 0 || g.presence.tm === 1) && g.presence.tm !== s.tmSeen) s.team = g.presence.tm;
      s.tmSeen = g.presence.tm;
      const rdy = !!g.presence.rdy;
      if (rdy && !s.ready) s.pick = s.cur >= CHAR_ORDER.length ? pick(CHAR_ORDER) : CHAR_ORDER[s.cur];
      if (!rdy) s.pick = null;
      s.ready = rdy;
    }
  },
  startMatch(setup) {
    const enc = { pl: setup.players.map(p => [p.port, CHAR_ORDER.indexOf(p.char), p.cpu || 0, p.remote || (p.cpu ? null : ''), p.team || 0]), stg: STAGE_INFO.findIndex(s => s.id === setup.stage), ru: this.encRules(setup.rules), py: setup.party ? PARTY.findIndex(p => p.id === setup.party) : -1 };
    this.lob.ep = (this.lob.ep || 0) + 1;
    this.publishLobby({ ph: 'vs', set: enc, res: null });
  },
  // foto del estado para los invitados
  pushSnapshot(B) {
    const st = B.stage;
    const f = B.fighters.map(x => {
      const p = x.pose, fl = (x.dead ? 1 : 0) | (x.hidden ? 2 : 0) | (x.grounded ? 4 : 0) | (x.finalReady ? 8 : 0) | (x.move && x.move.charging ? 16 : 0) | (x.state === 'attack' && x.inReflect() ? 32 : 0) | (x.state === 'attack' && x.inCounter() ? 64 : 0) | (x.starTime > 0 ? 128 : 0) | (x.armorFlash > 0 ? 256 : 0) | (x.flinch > 0 ? 512 : 0) | (p.grounded ? 1024 : 0) | (x.hitlag > 0 ? 2048 : 0) | (x.swim ? 4096 : 0);
      const a = [ri(x.x), ri(x.y), x.face, NET_STATES.indexOf(x.state), fl, r1(x.percent), x.stocks, x.score, ri(x.shieldHP), r2(x.scale), x.item ? NET_ITEMS.indexOf(x.item.type) : -1, Math.min(99, ri(x.invuln)),
        r2(p.lean), ri(p.bodyY || 0), r2(p.rot || 0), r2(p.armF[0]), r2(p.armF[1]), r2(p.armB[0]), r2(p.armB[1]), r2(p.legF[0]), r2(p.legF[1]), r2(p.legB[0]), r2(p.legB[1]), r2(p.head || 0), NET_FACES.indexOf(p.face), ri(p.pivot || 0), x.move && x.move.charging ? ri(x.move.ct) : 0];
      a.push(x.hp !== undefined ? ri(x.hp) : -1, x.move ? NET_MOVES.indexOf(x.move.key) : -1, x.move ? x.move.f : 0);
      const bm = x.move && x.move.v && x.move.v.beam; if (bm) a.push(ri(bm.x), ri(bm.y), ri(bm.w), ri(bm.h));
      return a;
    });
    // extra: tipo de objeto, o bits (1 grande · 2 mira a la izquierda · 4 charco · 8 armada)
    let pr = B.projectiles.filter(p => p.delay <= 0 && NET_PROJ.includes(p.type)).slice(-26).map(p => [NET_PROJ.indexOf(p.type), ri(p.x), ri(p.y), ri(p.r), p.t,
      p.type === 'item' ? NET_ITEMS.indexOf(p.itemType) : ((p.big ? 1 : 0) | ((p.vx || p.dir || 1) < 0 ? 2 : 0) | (p.puddle ? 4 : 0) | (!p.arm || p.t >= p.arm ? 8 : 0))]);
    const it = B.items.filter(i => !i.holder).map(i => [NET_ITEMS.indexOf(i.type), ri(i.x), ri(i.y), i.t, i.grounded ? 1 : 0, ri(i.groundT || 0)]);
    const sg = [st.t];
    if (st.id === 'temple') sg.push(st.wind, st.windDir);
    if (st.id === 'volcano') sg.push(ri(st.lavaY), ['idle', 'warn', 'rise', 'hold', 'fall'].indexOf(st.lavaPhase));
    if (st.id === 'ship') sg.push(st.wave, ri(st.waveX), st.waveDir, st.nextCannon);
    if (st.id === 'space') sg.push(st.zeroG);
    if (st.id === 'city') sg.push(st.train, ri(st.trainX), st.trainDir, st.trainWarn);
    if (st.id === 'pyramid') sg.push(st.serp ? 1 : 0, st.serp ? ri(st.serp.x) : 0, st.serp ? st.serp.y : 0, st.serp ? st.serp.dir : 0, st.serp ? st.serp.t : 0);
    if (st.id === 'xochi') sg.push(st.axo ? st.axo.t : 0, st.axo ? st.axo.side : 0);
    if (st.id === 'stadium') sg.push(st.wet || 0, st.riegoWarn || 0);
    // estado del modo
    const ms = B.ms || {}, mode = B.rules.mode;
    let md = null;
    if (mode === 'koth' && ms.zone) md = [ms.zone.si, ri(ms.zone.off), ri(ms.zone.w), ms.zoneT, ms.contested ? 1 : 0, ms.holder];
    if (mode === 'bomb' && ms.bomb) md = [ms.bomb.holder, ms.bomb.t];
    if (mode === 'soccer' && ms.ball) md = [ri(ms.ball.x), ri(ms.ball.y), r2(ms.ball.rot), ms.goals[0], ms.goals[1], ms.pause];
    const g = [NET_PHASES.indexOf(B.phase), B.introT, B.endT, B.t, B.timer, ri(B.dim), ri(B.flash * 100), ri(B.shake), B.paused ? 1 : 0, B.pauseSel];
    let ev = NetEv.buf.slice();
    let snap = { f, p: pr, i: it, s: sg, g, e: ev, m: md };
    // la presence completa no puede pasar de 4 KiB
    while (JSON.stringify(snap).length > 3000 && (snap.e.length > 6 || snap.p.length > 6)) {
      if (snap.p.length > 6) snap.p = snap.p.slice(-Math.floor(snap.p.length * 0.7)); else snap.e = snap.e.slice(-Math.floor(snap.e.length * 0.7));
    }
    this.set({ st: snap });
  },

  // ---------- papel de invitado ----------
  sendInput() {
    const c = Devices.ctrls[this.localDev]; if (!c) return;
    const g = this.guest;
    let bits = 0;
    BUTTONS.forEach((b, i) => { if (c.cur[b]) bits |= 1 << i; if (c.pressed(b)) g.cnt[i] = (g.cnt[i] + 1) % 256; });
    if (!c.tapJump) bits |= 256;
    if (c.digital) bits |= 512;
    this.set({ inp: [ri(c.cur.x * 100), ri(c.cur.y * 100), ri(c.cur.cx * 100), ri(c.cur.cy * 100), bits].concat(g.cnt) });
  },
  hostPres() { return this.hostPeer ? this.presOf(this.hostPeer) : null; },
  // decodifica la configuración de la partida que manda el anfitrión
  decodeSetup(enc) {
    return {
      players: enc.pl.map(([port, ci, cpu, remote, team]) => ({ port, char: CHAR_ORDER[ci] || 'nacho', cpu: cpu || 0, remote, team: team || 0 })),
      stage: (STAGE_INFO[enc.stg] || STAGE_INFO[0]).id,
      rules: this.decRules(enc.ru),
      party: enc.py >= 0 && PARTY[enc.py] ? PARTY[enc.py].id : null,
    };
  },
  // construye la vista local (sin simular) para dibujar lo que manda el anfitrión
  buildView(setup) {
    const B = new Battle(setup, { view: true });
    B.fighters.forEach((f, i) => {
      const p = setup.players[i];
      if (p.remote === '') f.label = this.nameOf(this.hostPeer);
      else if (p.remote) f.label = p.remote === this.myPeer() ? 'Tú' : this.nameOf(p.remote);
    });
    this.meIdx = setup.players.findIndex(p => p.remote && p.remote === this.myPeer());
    this.view = B; this.lastSnap = null; this.lastEv = 0;
    return B;
  },
  applySnapshot(B, snap) {
    const st = B.stage;
    snap.f.forEach((a, i) => {
      const f = B.fighters[i]; if (!f) return;
      // el invitado no simula: su control vibra con lo que cambió en su peleador
      const was = i === this.meIdx && this.lastSnap ? { pct: f.percent, hp: f.hp, dead: f.dead, lag: f.hitlag, sh: f.shieldHP, st: f.state } : null;
      const tx = a[0], ty = a[1];
      if (Math.abs(f.x - tx) > 180 || Math.abs(f.y - ty) > 180 || !this.lastSnap) { f.x = tx; f.y = ty; } else { f.x = lerp(f.x, tx, 0.65); f.y = lerp(f.y, ty, 0.65); }
      f._tx = tx; f._ty = ty;
      f.face = a[2]; f.state = NET_STATES[a[3]] || 'idle';
      const fl = a[4];
      f.dead = !!(fl & 1); f.hidden = !!(fl & 2); f.grounded = !!(fl & 4); f.finalReady = !!(fl & 8);
      f.starTime = fl & 128 ? 10 : 0; f.armorFlash = fl & 256 ? 2 : 0; f.flinch = fl & 512 ? 8 : 0; f.hitlag = fl & 2048 ? 1 : 0; f.swim = !!(fl & 4096);
      f.percent = a[5]; f.stocks = a[6]; f.score = a[7]; f.shieldHP = a[8]; f.scale = a[9];
      f.item = a[10] >= 0 ? { type: NET_ITEMS[a[10]] } : null;
      f.invuln = a[11];
      f.pose = mkPose({ lean: a[12], bodyY: a[13], rot: a[14], armF: [a[15], a[16]], armB: [a[17], a[18]], legF: [a[19], a[20]], legB: [a[21], a[22]], head: a[23], face: NET_FACES[a[24]] || 'normal', grounded: !!(fl & 1024), pivot: a[25] || undefined });
      if (a[27] >= 0) { f.hp = a[27]; f.maxHp = f.maxHp || HP_MAX; }
      const beam = a.length >= 34 ? { x: a[30], y: a[31], w: a[32], h: a[33] } : null;
      const mk = NET_MOVES[a[28]], mdef = mk && f.moves[mk];
      const flags = { reflect: fl & 32 ? [0, 1e9] : null, counter: fl & 64 ? [0, 1e9] : null };
      if (f.state === 'attack' || beam) {
        const same = f.move && f.move.key === mk && mk;
        f.move = same ? f.move : { key: mk || null, def: mdef ? Object.assign(Object.create(mdef), flags) : flags, v: {} };
        f.move.f = a[29] || 1; f.move.v.beam = beam; f.move.charging = !!(fl & 16); f.move.ct = a[26];
      } else f.move = null;
      if (was) Rumble.fromSnapshot(this.localDev, was, f);
    });
    B.projectiles = snap.p.map(a => {
      const type = NET_PROJ[a[0]], it = type === 'item', b = it ? 0 : a[5];
      return { type, x: a[1], y: a[2], r: a[3], t: a[4], delay: 0, itemType: it ? NET_ITEMS[a[5]] : undefined, big: b & 1, dir: b & 2 ? -1 : 1, vx: 0, puddle: b & 4, arm: b & 8 ? 0 : 1e9, col: type === 'fstar' && (b & 1) ? '#ffbe0b' : NET_PROJ_COL[type] };
    });
    B.items = snap.i.map(a => ({ type: NET_ITEMS[a[0]], x: a[1], y: a[2], t: a[3], grounded: !!a[4], groundT: a[5], holder: null }));
    const s = snap.s; st.t = s[0];
    for (const sf of st.surfaces()) if (sf.move) { const p = sf.move(st.t, sf); sf.dx = p[0] - sf.x; sf.dy = p[1] - sf.y; sf.x = p[0]; sf.y = p[1]; }
    if (st.id === 'temple') { st.wind = s[1]; st.windDir = s[2]; }
    if (st.id === 'volcano') { st.lavaY = s[1]; st.lavaPhase = ['idle', 'warn', 'rise', 'hold', 'fall'][s[2]] || 'idle'; }
    if (st.id === 'ship') { st.wave = s[1]; st.waveX = s[2]; st.waveDir = s[3]; st.nextCannon = s[4]; }
    if (st.id === 'space') { st.zeroG = s[1]; }
    if (st.id === 'city') { st.train = s[1]; st.trainX = s[2]; st.trainDir = s[3]; st.trainWarn = s[4]; }
    if (st.id === 'pyramid') st.serp = s[1] ? { x: s[2], y: s[3], dir: s[4], t: s[5] } : null;
    if (st.id === 'xochi') st.axo = s[1] ? { t: s[1], side: s[2] } : null;
    if (st.id === 'stadium') { st.wet = s[1] || 0; st.riegoWarn = s[2] || 0; }
    const md = snap.m, ms = B.ms || (B.ms = {});
    if (md && B.rules.mode === 'koth') { ms.zone = { si: md[0], off: md[1], w: md[2] }; ms.zoneT = md[3]; ms.contested = !!md[4]; ms.holder = md[5]; }
    if (md && B.rules.mode === 'bomb') ms.bomb = Object.assign(ms.bomb || {}, { holder: md[0], t: md[1] });
    if (md && B.rules.mode === 'soccer') { ms.ball = Object.assign(ms.ball || { r: 26 }, { x: md[0], y: md[1], rot: md[2] }); ms.goals = [md[3], md[4]]; ms.pause = md[5]; }
    const g = snap.g;
    B.phase = NET_PHASES[g[0]] || 'fight'; B.introT = g[1]; B.endT = g[2]; B.t = g[3]; B.timer = g[4]; B.dim = g[5]; B.flash = Math.max(B.flash, g[6] / 100); B.shake = Math.max(B.shake, g[7]); B.paused = !!g[8]; B.pauseSel = g[9];
    for (const e of snap.e) {
      if (e[0] <= this.lastEv) continue;
      this.lastEv = e[0];
      if (!this.lastSnap) continue; // no reproducir lo viejo al llegar
      const k = e[1];
      if (k === 'f') { const dirFx = e[2] === 'wind' || e[2] === 'claw'; spawnFx(e[2], e[3], e[4], Object.assign({}, e[5] ? { col: e[5] } : {}, e[6] && !dirFx ? { r: e[6] } : {}, e[7] ? { txt: e[7] } : {}, e[8] ? { life: e[8] } : {}, dirFx ? { dir: e[6] || 1 } : {}, e[9] ? { ang: e[9] } : {})); if (e[2] === 'hit') for (let n = 0; n < 6; n++) spawnFx('spark', e[3], e[4], { col: e[5] || '#ffd166' }); }
      else if (k === 's') Audio8.sfx(e[2], e[3]);
      else if (k === 'b') B.banners.push({ txt: e[2], col: e[3], t: 0 });
      else if (k === 'k') B.koFx.push({ x: e[2], y: e[3], col: e[4], t: 0 });
    }
    this.lastSnap = snap;
  },

  // ---------- cada fotograma ----------
  tick() {
    if (!this.ok) return;
    if (this.role === 'host') {
      if (['modesel', 'charsel', 'stagesel'].includes(APP.screen)) { this.syncSlots(); this.publishLobby({ ph: 'lobby' }); }
    } else if (this.role === 'guest') {
      this.sendInput();
      const hp = this.hostPres();
      if (!hp || !hp.lob) {
        if (++this.lostHostT > 150) { Toasts.push('El anfitrión cerró la sala'); this.leave(); APP.go('online'); }
        return;
      }
      this.lostHostT = 0;
      const lob = hp.lob;
      if (lob.ph === 'lobby' && APP.screen !== 'netroom') {
        if (['results', 'netview', 'vs'].includes(APP.screen)) { this.guest.rdy = 0; this.set({ rdy: 0 }); }
        this.view = null; BATTLE = null; APP.go('netroom');
      }
      if (lob.ph === 'vs' && APP.screen !== 'vs' && lob.set) { APP.pendingSetup = this.decodeSetup(lob.set); APP.pendingSetup.net = true; APP.go('vs'); Audio8.sfx('go'); }
      if (lob.ph === 'game' && lob.set && (!this.view || this.viewEp !== lob.ep)) { this.viewEp = lob.ep; this.buildView(this.decodeSetup(lob.set)); APP.go('netview'); }
      if (lob.ph === 'res' && lob.res && APP.screen !== 'results') {
        APP.results = this.decodeResults(lob.res); BATTLE = null; this.view = null; APP.go('results'); Audio8.playSong('results');
        if (lob.fm) Fame.save(lob.fm, true); // respaldo: si el anfitrión no pudo guardar la pelea, la guarda un invitado
      }
      if (APP.screen === 'netview' && this.view && hp.st && hp.st !== this.lastSnapObj) { this.lastSnapObj = hp.st; BATTLE = this.view; this.applySnapshot(this.view, hp.st); }
    }
  },
  encodeResults(r) { return { m: r.mode, d: r.draw ? 1 : 0, s: r.stage, t: r.teams ? 1 : 0, w: r.winTeam, go: r.goals, pa: r.party, r: r.ranked.map(p => [p.port, CHAR_ORDER.indexOf(p.id), p.cpu ? 1 : 0, p.kos, p.falls, p.dealt, p.sd, p.score, p.stocks, p.team || 0, p.win ? 1 : 0, p.label || 0]) }; },
  decodeResults(e) {
    return { mode: MODE_BY_ID[e.m] ? e.m : 'stock', draw: !!e.d, stage: e.s, teams: !!e.t, winTeam: e.w === undefined ? -1 : e.w, goals: e.go || null, party: e.pa || null,
      ranked: e.r.map(a => ({ port: a[0], id: CHAR_ORDER[a[1]] || 'nacho', cpu: !!a[2], color: PLAYER_COLORS[a[0]], kos: a[3], falls: a[4], dealt: a[5], sd: a[6], score: a[7], stocks: a[8], team: a[9] || 0, win: !!a[10], label: a[11] || null })) };
  },
};
