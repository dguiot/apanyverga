'use strict';
// Cuadro de eliminación directa. El anfitrión decide los resultados; los invitados reciben una copia.
const Tourney = {
  active: false, entrants: [], matches: [], current: 0, champion: -1, stage: null, rules: null, party: null, retry: false, interrupted: false, missing: {},
  stop() { this.active = false; this.entrants = []; this.matches = []; this.champion = -1; this.current = 0; this.retry = false; },
  begin(setup) {
    if (setup.players.length < 2 || setup.players.length > 4 || setup.players.some(p => p.cpu)) {
      Toasts.push('El torneo necesita de 2 a 4 personas, sin CPU');
      return false;
    }
    if (setup.rules.mode !== 'stock' || setup.rules.teams || setup.rules.party) {
      Toasts.push('El torneo usa Vidas, sin equipos ni Modo Fiesta');
      return false;
    }
    this.stop();
    this.active = true;
    this.entrants = setup.players.map((p, i) => ({
      char: p.char, dev: p.dev, remote: p.remote || '', uid: p.uid || null,
      name: p.remote ? Net.nameOf(p.remote) : 'Jugador ' + (i + 1),
    }));
    this.stage = setup.stage;
    this.rules = Object.assign({}, setup.rules, { tournament: false, teams: false, party: false });
    this.party = null;
    const n = this.entrants.length;
    this.matches = n === 2 ? [{ a: 0, b: 1, win: -1 }] :
      n === 3 ? [{ a: 1, b: 2, win: -1 }, { a: 0, b: -1, win: -1 }] :
      [{ a: 0, b: 3, win: -1 }, { a: 1, b: 2, win: -1 }, { a: -1, b: -1, win: -1 }];
    this.current = 0;
    APP.go('tournament');
    if (Net.role === 'host') Net.publishLobby({ ph: 'tour', tr: this.snapshot(), set: null, res: null });
    return true;
  },
  snapshot() {
    return {
      e: this.entrants.map(p => [p.char, p.remote, p.uid, p.name]),
      m: this.matches.map(m => [m.a, m.b, m.win]), c: this.current,
      w: this.champion, s: this.stage, r: Net.encRules(this.rules), retry: this.retry ? 1 : 0,
    };
  },
  load(data) {
    if (!data || !Array.isArray(data.e) || !Array.isArray(data.m) || data.e.length < 2 || data.e.length > 4) return;
    this.active = true;
    this.entrants = data.e.map(p => ({ char: p[0], remote: p[1], uid: p[2], name: p[3] }));
    this.matches = data.m.map(m => ({ a: m[0], b: m[1], win: m[2] }));
    this.current = data.c; this.champion = data.w; this.stage = data.s;
    this.rules = Net.decRules(data.r); this.retry = !!data.retry;
  },
  match() { return this.matches[this.current] || null; },
  // El invitado puede volver con otra conexión: su cuenta recupera su lugar.
  rebind() {
    if (Net.role !== 'host') return;
    const guests = Net.guestsOf(Net.myPeer());
    for (const p of this.entrants) {
      if (!p.remote) continue;
      const g = guests.find(q => q.peer === p.remote) || (p.uid && guests.find(q => q.by === p.uid));
      if (g) { p.remote = g.peer; p.name = Net.nameOf(g.peer); }
    }
  },
  start() {
    if (!this.active || this.champion >= 0 || Net.role === 'guest') return;
    this.rebind();
    const m = this.match();
    if (!m || m.a < 0 || m.b < 0) return;
    const entries = [this.entrants[m.a], this.entrants[m.b]];
    if (Net.role === 'host' && entries.some(p => p.remote && !Net.presOf(p.remote))) {
      Toasts.push('Espera a que vuelvan los dos jugadores de esta ronda');
      return;
    }
    const setup = {
      players: entries.map((p, port) => ({
        port, char: p.char, dev: p.remote ? 'net:' + p.remote : p.dev,
        cpu: 0, remote: p.remote, uid: p.uid, team: port,
      })),
      stage: this.stage, rules: this.rules, party: null,
    };
    this.retry = false; this.interrupted = false; this.missing = {};
    if (Net.role === 'host') { Net.publishLobby({ tr: this.snapshot() }); Net.startMatch(setup); }
    APP.showVS(setup);
  },
  record(result) {
    if (!this.active || this.champion >= 0) return;
    const m = this.match();
    if (!m) return;
    const interrupted = this.interrupted || result.ranked.some(p => p.cpu);
    if (result.draw || interrupted || !result.ranked.length) {
      this.retry = true;
      return;
    }
    m.win = result.ranked[0].port === 0 ? m.a : m.b;
    this.retry = false;
    this.current++;
    if (this.current >= this.matches.length) { this.champion = m.win; return; }
    if (this.entrants.length === 3) this.matches[1].b = m.win;
    if (this.entrants.length === 4 && this.current === 2) {
      this.matches[2].a = this.matches[0].win;
      this.matches[2].b = this.matches[1].win;
    }
  },
  roundName(i) { return i === this.matches.length - 1 ? 'Final' : 'Semifinal ' + (i + 1); },
  name(i) { return i < 0 ? 'Por definir' : this.entrants[i] ? this.entrants[i].name + ' · ' + (CHARS[this.entrants[i].char]?.name || 'Personaje') : 'Por definir'; },
};
APP.tournamentUpdate = function () {
  for (const d of Devices.list) {
    const n = Devices.nav(d);
    if (n.confirm || n.start) { Audio8.sfx('confirm'); return Tourney.start(); }
    if (n.back) {
      if (Net.role === 'guest') { Net.leave(); Tourney.stop(); return this.go('online'); }
      Tourney.stop();
      if (Net.role === 'host') { Net.publishLobby({ ph: 'lobby', tr: null, set: null, res: null }); return this.go('charsel'); }
      return this.go('main');
    }
  }
  if (clickIn(W - 540, 648, 240, 52)) Tourney.start();
  if (clickIn(W - 280, 648, 240, 52)) {
    if (Net.role === 'guest') Net.leave();
    if (Net.role === 'host') Net.publishLobby({ ph: 'lobby', tr: null, set: null, res: null });
    Tourney.stop(); this.go(Net.role === 'host' ? 'charsel' : Net.role === 'guest' ? 'online' : 'main');
  }
};
APP.tournamentDraw = function () {
  drawMenuBG(8);
  sfText('Torneo entre amigos', W / 2, 52, 48, GOLD);
  text('Eliminación directa · ' + Tourney.entrants.length + ' jugadores · ' + (STAGE_INFO.find(x => x.id === Tourney.stage)?.name || ''), W / 2, 92, 17, MUTED, { body: true });
  const finalsAt = Tourney.matches.length - 1;
  if (finalsAt > 0) {
    ctx.save(); ctx.strokeStyle = TEAL; ctx.lineWidth = 4; ctx.beginPath();
    for (let i = 0; i < finalsAt; i++) {
      const y = 235 + i * 245;
      ctx.moveTo(588, y); ctx.lineTo(636, y);
    }
    ctx.moveTo(636, 235); ctx.lineTo(636, finalsAt > 1 ? 480 : 320);
    ctx.moveTo(636, 320); ctx.lineTo(685, 320);
    ctx.stroke(); ctx.restore();
  }
  Tourney.matches.forEach((m, i) => {
    const final = i === finalsAt, x = final ? 685 : 78, y = final ? 240 : 155 + i * 245;
    slab(x, y, 510, 160, { skew: 0.08, edge: i === Tourney.current ? GOLD : final ? TEAL : undefined, lw: 3 });
    sfText(Tourney.roundName(i), x + 255, y + 30, 27, i === Tourney.current ? GOLD : TEAL);
    [m.a, m.b].forEach((id, side) => {
      const yy = y + 68 + side * 52;
      text(Tourney.name(id), x + 28, yy, 19, id >= 0 && id === m.win ? GOLD : PAPER, { align: 'left', body: true, weight: 700 });
    });
  });
  if (Tourney.entrants.length === 3) text(Tourney.name(0) + ' pasa directo a la final', 78, 592, 16, TEAL, { align: 'left', body: true });
  const champion = Tourney.champion >= 0;
  if (champion) sfText('¡Campeón: ' + Tourney.name(Tourney.champion) + '!', W / 2, 615, 36, GOLD);
  else text(Tourney.retry ? 'Empate o desconexión: se repite esta pelea.' : 'Siguiente: ' + Tourney.roundName(Tourney.current), W / 2, 616, 18, GOLD, { body: true, weight: 700 });
  if (Net.role === 'guest') {
    slab(W - 540, 648, 240, 52); sfText('Esperando al anfitrión', W - 420, 674, 20, MUTED);
  } else if (!champion) sfButton('Jugar ronda (A)', W - 540, 648, 240, 52, true);
  sfButton(Net.role === 'host' ? 'Salir a la sala (B)' : 'Salir (B)', W - 280, 648, 240, 52, hover(W - 280, 648, 240, 52));
};
