'use strict';
// ============================================================
//  SALÓN DE LA FAMA: estadísticas por CUENTA (no por personaje).
//  Cada pelea online entre personas se guarda como un documento
//  `matches/<id>` con los ids de cuenta de quienes pelearon; los
//  nombres se resuelven al dibujar, nunca se guardan.
// ============================================================
const FAME_MAX_DOCS = 1000;
const Fame = {
  db: null, tried: false, unsub: null, rows: null, awards: [], total: 0, err: null,
  profiles: {}, avatars: {}, lastProfT: -999, scroll: 0, saved: new Set(),
  async init() {
    if (this.tried) return; this.tried = true;
    try { if (window.claude && typeof window.claude.use === 'function') this.db = await window.claude.use('db'); } catch (e) { this.db = null; }
    if (APP.screen === 'fame') this.open();
  },

  // ---------- guardar ----------
  // registro de una pelea: solo las personas con cuenta (las CPU no cuentan)
  recordOf(r, setup) {
    const humans = r.ranked.filter(p => !p.cpu && p.uid);
    if (new Set(humans.map(p => p.uid)).size < 2) return null; // se necesitan al menos dos cuentas distintas
    return {
      id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      v: 1, t: Date.now(), mode: r.mode, stage: setup ? setup.stage : '', teams: r.teams ? 1 : 0, draw: r.draw ? 1 : 0,
      cpus: r.ranked.length - humans.length,
      players: humans.map(p => ({ uid: p.uid, ch: p.id, win: p.win ? 1 : 0, kos: p.kos | 0, falls: p.falls | 0, dmg: p.dealt | 0, sd: p.sd | 0, team: r.teams ? (p.team || 0) : -1 })),
    };
  },
  async save(rec, asGuest) {
    if (!rec || !this.clean(rec) || this.saved.has(rec.id)) return;
    this.saved.add(rec.id);
    if (!this.tried) await this.init();
    const db = this.db; if (!db) return;
    const body = this.clean(rec); delete body.id;
    let ref;
    try { ref = db.doc('matches/' + rec.id); } catch (e) { return; }
    try {
      if (asGuest) {
        // el anfitrión escribe primero; el invitado solo cubre si no quedó guardada
        await new Promise(r => setTimeout(r, 2500 + Math.random() * 2500));
        const snap = await ref.get();
        if (snap.exists) return;
      }
      await ref.set(body);
      if (!asGuest || APP.screen === 'results') Toasts.push('🏆 Pelea guardada en el Salón de la fama');
    } catch (e) {
      // sin permiso de escritura (solo vista) o sin conexión: el juego sigue igual
      if (e && e.code === 'quota_exceeded') Toasts.push('El Salón de la fama está lleno');
    }
  },
  // valida y normaliza un registro (los datos compartidos no son de fiar)
  clean(m) {
    if (!m || typeof m !== 'object' || !Array.isArray(m.players) || m.players.length < 2 || m.players.length > 4) return null;
    const num = (v, hi) => clamp(Math.floor(+v || 0), 0, hi);
    const players = [];
    for (const p of m.players) {
      if (!p || typeof p.uid !== 'string' || !p.uid || p.uid.length > 120) return null;
      players.push({ uid: p.uid, ch: CHARS[p.ch] ? p.ch : 'nacho', win: p.win ? 1 : 0, kos: num(p.kos, 99), falls: num(p.falls, 99), dmg: num(p.dmg, 99999), sd: num(p.sd, 99), team: p.team === 0 || p.team === 1 ? p.team : -1 });
    }
    return { id: typeof m.id === 'string' ? m.id : undefined, v: 1, t: num(m.t, 1e14), mode: MODE_BY_ID[m.mode] ? m.mode : 'stock', stage: typeof m.stage === 'string' ? m.stage.slice(0, 20) : '', teams: m.teams ? 1 : 0, draw: m.draw ? 1 : 0, cpus: num(m.cpus, 3), players };
  },

  // ---------- leer ----------
  open() {
    this.scroll = 0; this.err = null;
    if (!this.db || this.unsub) return;
    try {
      this.unsub = this.db.collection('matches').orderBy('t', 'desc').limit(FAME_MAX_DOCS)
        .onSnapshot(snap => this.aggregate(snap.docs.map(d => d.data())), e => { this.err = e && e.code || 'unavailable'; this.unsub = null; });
    } catch (e) { this.err = 'unavailable'; }
  },
  close() { if (this.unsub) { try { this.unsub(); } catch (e) { /* ya cerrado */ } this.unsub = null; } },
  aggregate(bodies) {
    const list = bodies.map(b => this.clean(b)).filter(Boolean).sort((a, b) => a.t - b.t);
    const by = {};
    for (const m of list) {
      const seen = new Set();
      for (const p of m.players) {
        if (seen.has(p.uid)) continue; seen.add(p.uid);
        const a = by[p.uid] || (by[p.uid] = { uid: p.uid, games: 0, wins: 0, kos: 0, falls: 0, dmg: 0, sd: 0, streak: 0, best: 0, chars: {}, last: 0 });
        a.games++; a.kos += p.kos; a.falls += p.falls; a.dmg += p.dmg; a.sd += p.sd; a.last = m.t;
        if (p.win) { a.wins++; a.streak++; a.best = Math.max(a.best, a.streak); } else a.streak = 0;
        a.chars[p.ch] = (a.chars[p.ch] || 0) + 1;
      }
    }
    const rows = Object.values(by).map(a => Object.assign(a, { pct: a.wins / a.games, fav: Object.keys(a.chars).sort((x, y) => a.chars[y] - a.chars[x])[0] }));
    rows.sort((x, y) => (y.wins - x.wins) || (y.pct - x.pct) || (y.kos - x.kos) || (x.falls - y.falls));
    const top = (k, min = 1) => { const r = rows.slice().sort((x, y) => y[k] - x[k])[0]; return r && r[k] >= min ? r : null; };
    const kings = { kos: top('kos'), best: top('best', 2), sd: top('sd', 3), games: top('games') };
    for (const r of rows) r.title = this.titleOf(r, kings);
    this.awards = [
      kings.kos && { label: 'Más KOs', uid: kings.kos.uid, val: kings.kos.kos },
      kings.best && { label: 'Mejor racha', uid: kings.best.uid, val: kings.best.best },
      kings.games && { label: 'Más peleas', uid: kings.games.uid, val: kings.games.games },
      kings.sd && { label: 'Kamikaze (autodestrucciones)', uid: kings.sd.uid, val: kings.sd.sd },
    ].filter(Boolean);
    this.rows = rows; this.total = list.length;
    this.lastProfT = -999; // resolver nombres de inmediato
  },
  titleOf(r, k) {
    if (r.best >= 5) return 'El Invicto';
    if (k.kos && k.kos.uid === r.uid && r.kos >= 5) return 'Rey del KO';
    if (r.games >= 5 && r.pct >= 0.6) return 'Leyenda';
    if (k.sd && k.sd.uid === r.uid) return 'Kamikaze';
    if (r.games >= 20) return 'Veterano';
    if (r.games < 3) return 'Novato';
    return 'Peleador';
  },

  // nombres y fotos: se resuelven al dibujar, cada vez (la plataforma los cachea)
  refreshProfiles() {
    const u = Net.user; if (!u || !this.rows || !this.rows.length) return;
    if (APP.t - this.lastProfT < 90) return;
    this.lastProfT = APP.t;
    u.profiles(this.rows.map(r => r.uid)).then(ps => {
      this.profiles = ps || {};
      for (const id in this.profiles) {
        const url = this.profiles[id].avatarUrl;
        if (url && !this.avatars[url]) { const img = new Image(); this.avatars[url] = { img, ok: false }; img.onload = () => { this.avatars[url].ok = true; }; img.src = url; }
      }
    }).catch(() => {});
  },
  nameOf(uid) { const p = this.profiles[uid]; return (p && p.name) || 'Alguien'; },
  isMe(uid) { const p = this.profiles[uid]; return !!(p && p.isMe) || (Net.myId && uid === Net.myId); },
};

// ---------------- pantalla ----------------
APP.fameUpdate = function () {
  Fame.refreshProfiles();
  const n = Fame.rows ? Fame.rows.length : 0, vis = 7;
  for (const d of Devices.list) {
    const nv = Devices.nav(d);
    if (nv.up) { Fame.scroll = Math.max(0, Fame.scroll - 1); Audio8.sfx('menu'); }
    if (nv.down) { Fame.scroll = clamp(Fame.scroll + 1, 0, Math.max(0, n - vis)); Audio8.sfx('menu'); }
    if (nv.back || nv.confirm || nv.start) { Audio8.sfx('back'); return this.go('main'); }
  }
  if (clickIn(40, 660, 170, 44)) this.go('main');
};
APP.fameDraw = function () {
  drawMenuBG(4);
  sfText('Salón de la fama', W / 2, 40, 48, GOLD);
  text(window.APYV_WEB ? 'Cuentan las peleas online entre personas · cada quien con su nombre · el personaje no importa' : 'Cuentan las peleas online entre personas · cada quien con su cuenta de Claude · el personaje no importa', W / 2, 78, 14, MUTED, { body: true, weight: 600 });
  const msg = (a, b) => {
    slab(W / 2 - 420, 200, 840, 250, { skew: 0.05 });
    sfText(a, W / 2, 270, 34, GOLD);
    wrapText(b, W / 2, 322, 720, 17, 26, '#e2e8f0');
  };
  if (!Fame.db) {
    msg(Fame.tried ? (window.APYV_WEB ? 'No se pudo abrir el salón' : 'El salón vive en el link del juego') : 'Abriendo el salón…', window.APYV_WEB ? 'Revisa tu conexión y vuelve a entrar a esta pantalla.' : 'Abre A pan y verga desde su link en claude.ai para ver y guardar el ranking. En el archivo descargado no hay dónde guardarlo.');
  } else if (Fame.err) {
    msg('No se pudo abrir el salón', 'Revisa tu conexión y vuelve a entrar a esta pantalla.');
  } else if (!Fame.rows) {
    msg('Cargando…', 'Trayendo las peleas guardadas.');
  } else if (!Fame.rows.length) {
    msg('Todavía no hay leyendas', 'Crea una sala en "Jugar online" y pelea con tus amigos: cada pelea entre personas se guarda aquí, por cuenta, con victorias, KOs y rachas.');
  } else {
    const cols = [[90, '#'], [170, 'Jugador'], [640, 'Victorias'], [740, 'Peleas'], [830, '% gana'], [920, 'KOs'], [1005, 'Caídas'], [1100, 'Racha'], [1195, 'Favorito']];
    slab(40, 96, 1200, 470, { skew: 0.03 });
    cols.forEach(([x, l]) => text(l, x, 118, 13, GOLD, { body: true, weight: 700, align: l === 'Jugador' ? 'left' : 'center' }));
    const vis = Fame.rows.slice(Fame.scroll, Fame.scroll + 7);
    vis.forEach((r, k) => {
      const i = Fame.scroll + k, y = 164 + k * 58, me = Fame.isMe(r.uid);
      slabPath(60, y - 26, 1160, 52, 0.2);
      ctx.fillStyle = me ? 'rgba(46,196,182,.22)' : i === 0 ? 'rgba(255,197,61,.16)' : 'rgba(30,36,50,.7)'; ctx.fill();
      if (me) { ctx.strokeStyle = TEAL; ctx.lineWidth = 2; ctx.stroke(); }
      sfText(`${i + 1}`, 90, y, i < 3 ? 38 : 30, i === 0 ? GOLD : i === 1 ? '#e2e8f0' : i === 2 ? '#e0a36b' : PAPER);
      // foto de la cuenta (o el retrato de su favorito)
      const p = Fame.profiles[r.uid], av = p && p.avatarUrl && Fame.avatars[p.avatarUrl];
      ctx.save(); ctx.beginPath(); ctx.arc(140, y, 20, 0, TAU); ctx.clip();
      ctx.fillStyle = p ? p.color || STEEL : STEEL; ctx.fillRect(118, y - 22, 44, 44);
      if (av && av.ok) ctx.drawImage(av.img, 120, y - 20, 40, 40); else drawPortrait(ctx, r.fav, 140, y, 17, 'normal');
      ctx.restore();
      ctx.strokeStyle = me ? TEAL : 'rgba(0,0,0,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(140, y, 20, 0, TAU); ctx.stroke();
      const nm = Fame.nameOf(r.uid) + (me ? ' (tú)' : '');
      sfText(nm.length > 26 ? nm.slice(0, 25) + '…' : nm, 172, y - 7, 26, PAPER, { align: 'left', keepCase: true });
      text(r.title, 174, y + 15, 12, i === 0 ? GOLD : TEAL, { align: 'left', body: true, weight: 700 });
      sfText(`${r.wins}`, 640, y, 32, i === 0 ? GOLD : PAPER);
      sfText(`${r.games}`, 740, y, 28, PAPER);
      sfText(`${Math.round(r.pct * 100)}%`, 830, y, 28, PAPER);
      sfText(`${r.kos}`, 920, y, 28, PAPER);
      sfText(`${r.falls}`, 1005, y, 28, PAPER);
      sfText(`${r.streak}`, 1088, y, 28, r.streak >= 3 ? '#ff9f1c' : PAPER);
      text(`mejor ${r.best}`, 1122, y + 2, 11, MUTED, { body: true, weight: 600, align: 'left' });
      ctx.save(); slabPath(1172, y - 22, 46, 44, 0.2); ctx.clip(); ctx.fillStyle = withAlpha(LOOKS[r.fav].top, 0.55); ctx.fillRect(1168, y - 24, 54, 48); drawPortrait(ctx, r.fav, 1195, y, 19, 'happy'); ctx.restore();
    });
    if (Fame.rows.length > 7) text(`↑↓ ver más · ${Fame.scroll + 1}–${Math.min(Fame.rows.length, Fame.scroll + 7)} de ${Fame.rows.length}`, W / 2, 552, 12, MUTED, { body: true, weight: 600 });
    // premios
    const aw = Fame.awards;
    if (aw.length) {
      const w = 1200 / aw.length;
      aw.forEach((a, i) => {
        const x = 40 + i * w;
        slab(x + 6, 580, w - 12, 64, { skew: 0.2 });
        text(a.label, x + w / 2, 598, 12, GOLD, { body: true, weight: 700 });
        const nm = Fame.nameOf(a.uid);
        sfText(`${nm.length > 18 ? nm.slice(0, 17) + '…' : nm} · ${a.val}`, x + w / 2, 624, 24, PAPER, { keepCase: true });
      });
    }
    text(`${Fame.total} pelea${Fame.total === 1 ? '' : 's'} registrada${Fame.total === 1 ? '' : 's'}`, W - 60, 684, 12, MUTED, { body: true, weight: 600, align: 'right' });
  }
  sfButton('‹ Volver', 40, 660, 170, 44, hover(40, 660, 170, 44));
};
