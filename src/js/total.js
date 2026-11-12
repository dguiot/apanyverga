'use strict';
// ============================================================
//  ESMASH TOTAL — la modalidad que mezcla los tres juegos
//  Los mismos cuatro personajes compiten en tres rondas seguidas, en el mismo mundo:
//    1. CARRERA en el Mercado del Sol (Kart)
//    2. COMBATE en la Sierra (FPS a 8 bajas)
//    3. GRAN FINAL: pelea en la calle del Mercado, con los karts cruzando y granadas cayendo
//  Lo que haces en una ronda pesa en la siguiente: el podio de la carrera da bajas y granadas de ventaja
//  en el combate, y la tabla antes de la final decide las vidas y quién llega con el Golpe Final listo.
//  Puntos 10 / 7 / 5 / 3 por ronda; la final vale doble. Local: 1 a 4 jugadores; las plazas libres son CPU.
// ============================================================
const Total = {
  active: false, round: 0, humans: 1, ids: [], points: [0, 0, 0, 0], log: [], focus: 0, done: false, anim: 0,
  ROUNDS: [
    { game: 'kart', title: 'CARRERA', where: 'Mercado del Sol', how: '3 vueltas · 150 cc · con objetos', color: '#72d7d1' },
    { game: 'fps', title: 'COMBATE', where: 'Sierra', how: '8 bajas o 3 minutos', color: '#adc7ef' },
    { game: 'fight', title: 'GRAN FINAL', where: 'Mercado del Sol', how: 'Pelea por vidas · cruzan karts y caen granadas · puntos dobles', color: '#ed9b73' },
  ],
  POINTS: [10, 7, 5, 3],
  KILL_BONUS: [2, 1, 0, 0], NADE_BONUS: [3, 2, 1, 1], STOCKS: [3, 3, 2, 2],
  // ---------- preparación ----------
  enter() {
    if (ShellUI.online) { Toasts.push('Esmash Total se juega en este dispositivo por ahora'); return; }
    ShellUI.clearPlay(); this.active = true; this.round = 0; this.done = false; this.points = [0, 0, 0, 0]; this.log = []; this.focus = 0; this.anim = 0;
    this.humans = clamp(ShellUI.config.locals, 1, 4); this.roster(); APP.go('totalNext');
  },
  roster() {
    const ids = ShellUI.locals.slice(0, this.humans).map(p => CHAR_ORDER[p.ch]);
    // rivales fijos y variados: nunca repiten a un jugador
    for (let k = 5; ids.length < 4; k += 4) { const id = CHAR_ORDER[(ShellUI.locals[0].ch + k) % CHAR_ORDER.length]; if (!ids.includes(id)) ids.push(id); }
    this.ids = ids;
  },
  name(i) { return i < this.humans ? (this.humans > 1 ? 'J' + (i + 1) + ' · ' : '') + CHARS[this.ids[i]].name : CHARS[this.ids[i]].name; },
  // lugares actuales (índice de participante → lugar 0..3); empates por orden de la última ronda
  ranks() {
    const last = this.log.at(-1)?.order || [0, 1, 2, 3], order = [0, 1, 2, 3].sort((a, b) => this.points[b] - this.points[a] || last.indexOf(a) - last.indexOf(b));
    return { order, place: i => order.indexOf(i) };
  },
  stop() { this.active = false; },
  // ---------- rondas ----------
  start() {
    const R = this.ROUNDS[this.round]; ShellUI.active = true; ShellUI.online = false; ShellUI.game = R.game; ShellUI.step = 'playing'; ShellUI.paused = false;
    if (R.game === 'kart') return this.kart(); if (R.game === 'fps') return this.fps(); return this.fight();
  },
  kart() {
    const ids = this.ids.slice(); while (ids.length < 8) ids.push(CHAR_ORDER.find(id => !ids.includes(id)));
    const vehicles = ids.map((_, i) => i < this.humans ? ShellUI.locals[i].vh : i % 6);
    APP.kartRace?.stop(); const r = APP.kartRace = new KartRace(KART_TRACKS[0], ids[0], 1, false, Date.now(), ids, vehicles);
    r.racers.forEach((p, i) => p.human = i < this.humans); r.localPlayers = r.racers.slice(0, this.humans); r.player = r.racers[0]; r.localDevices = ShellUI.localDevices();
    KartMenu.cupState = null; KartMenu.recorded = true; // los récords de pista son de las carreras normales
    KartControls.read(); APP.go('kartRace');
  },
  fps() {
    const place = this.log[0] ? i => this.log[0].order.indexOf(i) : () => 3;
    const roster = this.ids.map((id, i) => ({ id, gun: i < this.humans ? ShellUI.locals[i].fg : (i * 2 + 1) % 5, bot: i >= this.humans }));
    const m = APP.fps = new FPSMatch(roster); m.target = 8; m.duration = 180; m.level = ShellUI.config.fpsLevel;
    m.players.forEach((p, i) => { p.kills = this.KILL_BONUS[place(i)]; p.grenades = this.NADE_BONUS[place(i)]; });
    FPSControls.reset(); APP.go('fpsGame'); FPSControls.lock();
  },
  fight() {
    const devs = ShellUI.localDevices();
    const players = this.ids.map((id, i) => ({ port: i, char: id, dev: i < this.humans ? devs[i] : null, cpu: i < this.humans ? 0 : ShellUI.config.cpuLevel, remote: i < this.humans ? '' : null, team: i % 2, uid: null }));
    APP.showVS({ players, stage: 'mercado', rules: { mode: 'stock', stocks: 3, time: 3, items: 2, teams: false, party: false, tournament: false }, party: null, total: true });
  },
  // ventajas de la final: vidas según la tabla y Golpe Final para quien va primero
  dressFinal(battle) {
    const R = this.ranks(); battle.stage.totalMix = true;
    for (const f of battle.fighters) { const k = R.place(f.port); f.stocks = this.STOCKS[k]; if (k === 0) f.finalReady = true; }
  },
  // ---------- cierre de ronda ----------
  finish(order) {
    const mult = this.round === 2 ? 2 : 1, gained = [0, 0, 0, 0]; order.forEach((who, k) => { gained[who] = this.POINTS[k] * mult; this.points[who] += gained[who]; });
    this.log.push({ round: this.round, order: order.slice(), gained }); this.round++; this.done = this.round >= this.ROUNDS.length; this.focus = 0; this.anim = 0;
    APP.kartRace?.stop(); APP.kartRace = null; APP.fps = null; FPSView.dispose(); FPSControls.reset(); document.exitPointerLock?.(); KartSound.stop(); BATTLE = null; APP.battle = null; ShellUI.paused = false;
    APP.go('totalNext'); Audio8.sfx(this.done ? 'game' : 'confirm');
  },
  kartOrder(race) {
    const prog = r => (r.finish ?? Infinity);
    return race.racers.slice(0, 4).sort((a, b) => prog(a) - prog(b) || b.s - a.s).map(r => r.index);
  },
  fpsOrder(m) { return m.players.slice().sort((a, b) => b.kills - a.kills || a.deaths - b.deaths || a.index - b.index).map(p => p.index); },
  // ---------- pantalla entre rondas ----------
  update() {
    this.anim++;
    const go = () => { if (this.done) return this.enter(); Audio8.sfx('go'); this.start(); }, exit = () => { this.stop(); ShellUI.room(); };
    for (const d of Devices.list) {
      const n = Devices.nav(d);
      if (n.back) return exit();
      if (this.round === 0 && !this.log.length) {
        // antes de empezar: personaje de J1 y cuántos juegan en este dispositivo
        if (n.left || n.right) { const p = ShellUI.locals[0]; p.ch = (p.ch + (n.left ? 14 : 1)) % 15; this.roster(); Audio8.sfx('menu'); }
        if (n.up || n.down) { this.humans = (this.humans - 1 + (n.up ? 1 : 3)) % 4 + 1; ShellUI.config.locals = this.humans; this.roster(); Audio8.sfx('menu'); }
      }
      if (n.confirm || n.start) { APP.firstDev = d; return go(); }
    }
    if (KartMenu.hit({ x: 817, y: 623, w: 417, h: 66 })) return go();
    if (KartMenu.hit({ x: 44, y: 642, w: 218, h: 47 })) return exit();
    if (this.round === 0 && !this.log.length) {
      if (KartMenu.hit({ x: 44, y: 150, w: 576, h: 96 })) { const p = ShellUI.locals[0]; p.ch = (p.ch + 1) % 15; this.roster(); Audio8.sfx('menu'); }
      if (KartMenu.hit({ x: 290, y: 642, w: 330, h: 47 })) { this.humans = this.humans % 4 + 1; ShellUI.config.locals = this.humans; this.roster(); Audio8.sfx('menu'); }
    }
  },
  draw() {
    const first = this.round === 0 && !this.log.length, R = this.ranks(), next = this.ROUNDS[this.round], last = this.log.at(-1);
    const save = ShellUI.game; ShellUI.game = 'fight';
    ShellUI.header(this.done ? 'ESMASH TOTAL · RESULTADO' : 'ESMASH TOTAL', this.done ? 'Carrera + combate + gran final' : first ? 'Tres juegos, una sola competencia' : 'Ronda ' + (this.round + 1) + ' de 3');
    ShellUI.game = save;
    // tabla de posiciones
    const rows = first ? [0, 1, 2, 3] : R.order;
    rows.forEach((who, k) => {
      const y = 150 + k * 108, lead = !first && k === 0, appear = clamp((this.anim - k * 6) / 14, 0, 1), x = 44 - (1 - easeOut(appear)) * 60;
      ctx.save(); ctx.globalAlpha = appear;
      slab(x, y, 576, 96, { skew: .03, top: lead ? '#3a3320' : '#17313d', bottom: '#0c202b', edge: lead ? GOLD : who < this.humans ? TEAL : '#3b5360', lw: lead || who < this.humans ? 3 : 1 });
      ctx.save(); roundRect(ctx, x + 12, y + 8, 84, 80, 10); ctx.clip(); ctx.fillStyle = (LOOKS[this.ids[who]] || {}).accent || '#2ec4b6'; ctx.fillRect(x + 12, y + 8, 84, 80); drawBust(ctx, this.ids[who], x + 12, y + 8, 84, 80, this.done && k === 0 ? 'happy' : 'normal'); ctx.restore();
      if (!first) sfText((k + 1) + 'º', x + 132, y + 50, 38, lead ? GOLD : PAPER);
      text(this.name(who), x + (first ? 112 : 172), y + 38, 22, PAPER, { align: 'left', body: true, weight: 800 });
      text(who < this.humans ? 'JUGADOR' : 'CPU', x + (first ? 112 : 172), y + 66, 12, who < this.humans ? TEAL : '#8faebb', { align: 'left', body: true, weight: 800 });
      if (!first) {
        sfText(String(this.points[who]), x + 520, y + 46, 40, lead ? GOLD : PAPER, { align: 'right' }); text('PUNTOS', x + 520, y + 76, 11, '#8faebb', { align: 'right', body: true, weight: 800 });
        if (last) text('+' + last.gained[who], x + 432, y + 50, 18, '#9fe6b0', { align: 'right', body: true, weight: 800 });
      }
      ctx.restore();
    });
    if (first) { text('← →: tu personaje (o toca tu tarjeta)   ·   ↑ ↓: jugadores', 44, 604, 15, '#a2beca', { align: 'left', body: true, weight: 650 }); ShellUI.button('JUGADORES AQUÍ: ' + this.humans, { x: 290, y: 642, w: 330, h: 47 }, false); }
    // tarjeta de la derecha: lo que viene (o el campeón)
    const bx = 660, by = 150, bw = 576, bh = 420;
    if (this.done) {
      const champ = R.order[0]; slab(bx, by, bw, bh, { skew: .02, top: '#3a3320', bottom: '#0c202b', edge: GOLD, lw: 3 });
      text('CAMPEÓN DE ESMASH TOTAL', bx + bw / 2, by + 44, 15, GOLD, { body: true, weight: 800 });
      ctx.save(); roundRect(ctx, bx + bw / 2 - 110, by + 70, 220, 210, 16); ctx.clip(); ctx.fillStyle = (LOOKS[this.ids[champ]] || {}).accent || '#2ec4b6'; ctx.fillRect(bx + bw / 2 - 110, by + 70, 220, 210); drawBust(ctx, this.ids[champ], bx + bw / 2 - 110, by + 70, 220, 210, 'happy'); ctx.restore();
      sfText(this.name(champ), bx + bw / 2, by + 322, 44, GOLD); text(this.points[champ] + ' puntos', bx + bw / 2, by + 362, 18, PAPER, { body: true, weight: 700 });
      const names = ['Carrera', 'Combate', 'Final']; this.log.forEach((l, i) => text(names[i] + ': ' + CHARS[this.ids[l.order[0]]].name, bx + 70 + i * 218, by + 396, 13, '#a2beca', { body: true, weight: 650 }));
    } else {
      slab(bx, by, bw, bh, { skew: .02, top: '#17313d', bottom: '#0c202b', edge: next.color, lw: 3 });
      // las tres rondas, con la actual resaltada
      this.ROUNDS.forEach((r, i) => { const x = bx + 24 + i * 180, on = i === this.round, past = i < this.round; ctx.fillStyle = on ? r.color : past ? '#4d6b78' : '#2a4150'; ctx.fillRect(x, by + 22, 166, 5); text((past ? '✓ ' : '0' + (i + 1) + '  ') + r.title, x, by + 46, 13, on ? PAPER : '#7894a3', { align: 'left', body: true, weight: 800 }); });
      text('RONDA ' + (this.round + 1), bx + 28, by + 104, 14, next.color, { align: 'left', body: true, weight: 800 });
      sfText(next.title, bx + 28, by + 150, 56, PAPER, { align: 'left' });
      text(next.where, bx + 28, by + 200, 24, GOLD, { align: 'left', body: true, weight: 800 }); text(next.how, bx + 28, by + 232, 15, '#b9cdd6', { align: 'left', body: true });
      // ventajas que se llevan a esta ronda
      const me = 0, k = this.round === 1 && this.log[0] ? this.log[0].order.indexOf(me) : R.place(me);
      const perk = this.round === 0 ? ['El podio de la carrera da ventaja en el combate:', '1º  +2 bajas y 3 granadas   ·   2º  +1 baja y 2 granadas']
        : this.round === 1 ? ['Tu ventaja por la carrera (' + (k + 1) + 'º):', (this.KILL_BONUS[k] ? '+' + this.KILL_BONUS[k] + (this.KILL_BONUS[k] > 1 ? ' bajas' : ' baja') + ' de inicio  ·  ' : '') + this.NADE_BONUS[k] + (this.NADE_BONUS[k] > 1 ? ' granadas' : ' granada')]
          : ['Tu ventaja por la tabla (' + (k + 1) + 'º):', this.STOCKS[k] + ' vidas' + (k === 0 ? '  ·  llegas con el Golpe Final listo' : '') + '  ·  la final vale doble'];
      ctx.fillStyle = 'rgba(255,255,255,.05)'; roundRect(ctx, bx + 24, by + 268, bw - 48, 96, 12); ctx.fill();
      text(perk[0], bx + 44, by + 302, 15, '#9fe6b0', { align: 'left', body: true, weight: 800 }); text(perk[1], bx + 44, by + 334, 16, PAPER, { align: 'left', body: true, weight: 650 });
      text('Puntos por ronda: 10 · 7 · 5 · 3', bx + 28, by + 396, 14, '#8faebb', { align: 'left', body: true, weight: 650 });
    }
    ShellUI.button('← SALIR', { x: 44, y: 642, w: 218, h: 47 }, false);
    ShellUI.button(this.done ? 'JUGAR OTRA VEZ' : first ? '¡EMPEZAR!' : '¡A LA ' + next.title + '!', { x: 817, y: 623, w: 417, h: 66 }, true);
  },
};
APP.totalNextUpdate = function () { Total.update(); };
APP.totalNextDraw = function () { Total.draw(); };

// ---- enganches: el final de cada juego regresa a la tabla de Esmash Total ----
{
  const go = APP.go; APP.go = function (s) {
    if (Total.active) {
      if (s === 'kartResults' && this.kartRace) return Total.finish(Total.kartOrder(this.kartRace));
      if (s === 'fpsResults' && this.fps) return Total.finish(Total.fpsOrder(this.fps));
      if (['uiHub', 'uiRoom', 'title', 'main', 'kartGarage', 'kartTracks', 'fpsGarage', 'charsel', 'stagesel', 'modesel', 'uiSettings'].includes(s) && !ShellUI.paused) Total.stop();
    }
    go.call(this, s);
    if (s === 'totalNext') KartMusic.play('total');
  };
  const results = APP.showResults; APP.showResults = function (r) {
    if (Total.active && this.lastSetup?.total) return Total.finish(r.ranked.map(f => f.port));
    return results.call(this, r);
  };
  const battle = APP.startBattle; APP.startBattle = function (setup) { battle.call(this, setup); if (Total.active && setup.total && this.battle) Total.dressFinal(this.battle); };
  const choose = ShellUI.choose; ShellUI.choose = function (game) { if (game === 'total') return Total.enter(); return choose.call(this, game); };
  ShellUI.games.push({ id: 'total', name: 'ESMASH TOTAL', sub: 'LOS TRES JUEGOS', color: '#ffc53d', desc: 'Carrera, combate y gran final.' });
  ShellUI.cards = function () { const n = this.games.length, w = (1192 - (n - 1) * 14) / n; return this.games.map((g, i) => ({ x: 44 + i * (w + 14), y: this.online ? 146 : 196, w, h: 238 })); };
}
// tema propio de Esmash Total (pantallas entre rondas)
STAGE_SCORE.total = { title: 'Tres en uno', bpm: 122, key: 2, chords: [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 53]].map(c => c.map(n => n + 12)), bass: [0, 3, 6, 8, 10, 14], melody: [72, 76, 79, 76, 74, 72, 69, 67], guitar: [2, 6, 10, 14], swing: .06, energy: .9 };
KartMusic.themes.total = { bpm: 122, key: 2, lead: .7 };
