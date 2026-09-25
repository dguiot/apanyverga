'use strict';
// ============================================================
//  PELEA: reglas, cámara, HUD, fin de partida
// ============================================================
class Battle {
  // setup: { players: [{port, char, dev|null, cpu:level|0}], stage, rules: {mode, stocks, time, items} }
  constructor(setup, opts = {}) {
    BATTLE = this;
    this.setup = setup; this.demo = !!opts.demo; this.online = !!opts.online; this.view = !!opts.view;
    this.rules = Object.assign({ mode: 'stock', stocks: 3, time: 3, items: 2, teams: false, party: false }, setup.rules);
    if (this.rules.mode === 'soccer') this.rules.teams = true;
    this.party = this.rules.party && setup.party ? PARTY_BY_ID[setup.party] || null : null;
    this.stage = makeStage(setup.stage, { soccer: this.rules.mode === 'soccer' });
    this.fighters = []; this.projectiles = []; this.fx = []; this.items = []; this.koFx = []; this.banners = [];
    this.shake = 0; this.flash = 0; this.dim = 0; this.t = 0; this.phase = 'intro'; this.introT = 0; this.endT = 0;
    this.timer = this.rules.time * 60 * 60; this.paused = false; this.pauseSel = 0; this.pauser = null; this.slow = 0;
    this.cam = { x: 0, y: -150, z: 0.8 };
    const n = setup.players.length;
    const spread = Math.min(1.6, (this.stage.right - this.stage.left) / 900);
    const spawnX = (n === 2 ? [-240, 240] : n === 3 ? [-280, 0, 280] : [-300, -100, 100, 300]).map(x => x * spread);
    setup.players.forEach((p, i) => {
      let ctrl, brain = null;
      if (p.cpu) { brain = new AIBrain(p.cpu); ctrl = brain.ctrl; }
      else if (p.dev && p.dev.startsWith('net:')) ctrl = new NetCtrl(p.dev.slice(4));
      else ctrl = Devices.ctrls[p.dev] || (Devices.ctrls[p.dev] = new Controller(p.dev)); // el mismo que actualiza Devices.poll
      const f = new Fighter(p.port, p.char, ctrl, { cpu: !!p.cpu, stocks: stockMode(this.rules.mode) ? this.rules.stocks : 1 });
      f.dev = p.dev; f.brain = brain; if (brain) brain.f = f; f.uid = p.uid || null;
      f.team = p.team !== undefined && p.team !== null ? p.team : i % 2;
      if (this.rules.teams) f.color = TEAM_COLORS[f.team];
      if (ctrl instanceof NetCtrl) { f.netPeer = ctrl.peer; f.label = Net.nameOf(ctrl.peer); f.avPeer = ctrl.peer; }
      else if (this.online && !p.cpu) { f.label = 'Anfitrión'; if (!this.fighters.some(q => q.avPeer && q.avPeer === Net.myPeer())) f.avPeer = Net.myPeer(); }
      let sx = spawnX[i];
      if (this.rules.mode === 'soccer') { const k = setup.players.slice(0, i).filter(q => (q.team ?? 0) === f.team).length; sx = (f.team === 0 ? -1 : 1) * (380 + k * 220); }
      f.placeAt(sx, this.stage.floorY(sx) - 160);
      this.fighters.push(f);
    });
    Modes.init(this);
    if (!this.demo) Audio8.playBattle();
  }
  get alive() { return this.fighters.filter(f => f.stocks > 0); }

  update() {
    if (this.online) this.netTick();
    if (this.paused) return this.updatePause();
    // pausa
    for (const f of this.fighters) {
      if (!f.cpu && !f.netPeer && f.ctrl.pressed('start') && this.phase === 'fight' && !this.demo) { this.paused = true; this.pauser = f.dev; this.pauseSel = 0; Audio8.sfx('menu'); Rumble.stopAll(); return; }
    }
    this.camKick = (this.camKick || 0) * 0.84; if (this.slowCd > 0) this.slowCd--;
    if (this.slow > 0) { this.slow--; if (this.slow % 3 !== 0) { this.updateCamera(); return; } }
    this.t++;
    if (this.phase === 'intro') {
      this.introT++;
      if (this.introT === 2) Audio8.sfx('count');
      if (this.introT === 150) { Audio8.sfx('go'); this.phase = 'fight'; }
    }
    for (const f of this.fighters) if (f.brain) f.brain.tick();
    this.stage.step();
    for (const f of this.fighters) {
      if (this.phase === 'intro') { const c = f.ctrl, save = c.cur; c.cur = blankState(); c.prev = blankState(); f.update(); c.cur = save; }
      else f.update();
    }
    updateProjectiles();
    updateItems();
    Modes.tick(this);
    updateFx(); launchTrails(this);
    this.updateCamera();
    this.shake = Math.max(0, this.shake * 0.88 - 0.1);
    this.flash = Math.max(0, this.flash - 0.07);
    this.dim = Math.max(0, this.dim - 1);
    for (const b of this.banners) b.t++;
    this.banners = this.banners.filter(b => b.t < 150);
    for (const k of this.koFx) k.t++;
    this.koFx = this.koFx.filter(k => k.t < 60);
    if (this.phase === 'fight') {
      if (timedMode(this.rules.mode)) {
        this.timer--;
        if (this.timer === 60 * 10) banner('¡10 segundos!', '#ffbe0b');
      }
      if (Modes.isFinished(this)) this.finish();
    }
    if (this.phase === 'end') {
      this.endT++;
      if (this.endT === 150) APP.showResults(this.results());
    }
  }
  // online (anfitrión): leer los controles remotos y publicar el estado
  netTick() {
    for (const f of this.fighters) {
      if (!f.netPeer || f.cpu) continue;
      f.ctrl.pull();
      if (f.ctrl.missing > 180) {
        f.cpu = true; f.brain = new AIBrain(5); f.brain.f = f; f.ctrl = f.brain.ctrl;
        banner(`${f.label || 'Un jugador'} se desconectó: ahora lo controla la CPU`, f.color);
      }
    }
    if (APP.t % 2 === 0) Net.pushSnapshot(this);
  }
  // invitado: solo avanza lo visual (la simulación la hace el anfitrión)
  viewTick() {
    updateFx(); launchTrails(this);
    for (const f of this.fighters) { try { recordSwoosh(f); } catch (e) { /* movimiento desconocido */ } }
    for (const b of this.banners) b.t++;
    this.banners = this.banners.filter(b => b.t < 150);
    for (const k of this.koFx) k.t++;
    this.koFx = this.koFx.filter(k => k.t < 60);
    this.shake = Math.max(0, this.shake * 0.88 - 0.1);
    this.flash = Math.max(0, this.flash - 0.07);
    this.updateCamera();
  }
  onKO(f) {
    if (this.phase !== 'fight') return;
    if (stockMode(this.rules.mode) && f.stocks <= 0) {
      banner(`¡${f.label || CHARS[f.id].name} quedó fuera!`, f.color);
      if (Modes.isFinished(this)) this.slow = 60;
    }
  }
  finish() {
    if (this.phase === 'end') return;
    this.phase = 'end'; this.endT = 0; this.slow = 45;
    Audio8.sfx('game'); Audio8.stopSong();
    // muerte súbita no; en tiempo gana el de mejor puntaje, desempata el menor daño
  }
  results() {
    const B = this, m = this.rules.mode, fs = this.fighters.slice(), teams = !!this.rules.teams;
    const pts = f => m === 'koth' ? f.score : m === 'soccer' ? f.score : f.score;
    const dmgOf = f => m === 'hp' ? (f.maxHp - f.hp) : f.percent;
    // Vidas (y Vida / Bomba): gana el último que queda en pie. El resto queda en el
    // orden en que fue eliminado; puntos, KOs y daño no cuentan para nada.
    const surv = f => f.stocks > 0 ? 1e9 : (f.outAt || 0);
    const byPlayer = (a, b) => stockMode(m) ? (surv(b) - surv(a)) : ((pts(b) - pts(a)) || (b.stats.kos - a.stats.kos) || (dmgOf(a) - dmgOf(b)));
    let winTeam = -1;
    if (teams) {
      const tScore = tm => { const mem = fs.filter(f => f.team === tm); if (!mem.length) return -1e9; if (m === 'soccer') return B.ms.goals[tm]; if (stockMode(m)) return Math.max(...mem.map(surv)); return mem.reduce((s, f) => s + f.score, 0); };
      const s0 = tScore(0), s1 = tScore(1);
      winTeam = s0 === s1 ? -1 : (s0 > s1 ? 0 : 1);
    }
    const ranked = fs.sort((a, b) => (teams && winTeam >= 0 ? ((a.team === winTeam ? 0 : 1) - (b.team === winTeam ? 0 : 1)) : 0) || byPlayer(a, b));
    // empate: los últimos dos cayeron en el mismo cuadro
    const draw = teams ? winTeam < 0 : (stockMode(m) && ranked.length > 1 && surv(ranked[0]) === surv(ranked[1]));
    return {
      ranked: ranked.map(f => ({ port: f.port, id: f.id, cpu: f.cpu, color: f.color, team: f.team, label: f.label || null, uid: f.uid, kos: f.stats.kos, falls: f.stats.falls, dealt: Math.round(f.stats.dealt), sd: f.stats.sd, score: Math.floor(f.score), stocks: Math.max(0, f.stocks), win: teams ? f.team === winTeam : (!draw && f === ranked[0]) })),
      mode: m, draw, stage: this.stage.name, teams, winTeam, goals: m === 'soccer' ? B.ms.goals.slice() : null, party: this.party ? this.party.name : null,
    };
  }

  // ---------- pausa ----------
  updatePause() {
    const opts = ['Continuar', 'Reiniciar', 'Salir al menú'];
    for (const d of Devices.list) {
      const n = Devices.nav(d);
      if (n.up) { this.pauseSel = (this.pauseSel + 2) % 3; Audio8.sfx('menu'); }
      if (n.down) { this.pauseSel = (this.pauseSel + 1) % 3; Audio8.sfx('menu'); }
      if (n.start || n.back) { this.paused = false; return; }
      if (n.confirm) return this.pauseChoose(this.pauseSel);
    }
    for (let i = 0; i < 3; i++) if (clickIn(W / 2 - 170, 300 + i * 70, 340, 56)) return this.pauseChoose(i);
    void opts;
  }
  pauseChoose(i) {
    Audio8.sfx('confirm');
    if (i === 0) this.paused = false;
    if (i === 1) APP.startBattle(this.setup);
    if (i === 2) { BATTLE = null; APP.go('charsel'); }
  }

  // ---------- cámara ----------
  updateCamera() {
    const st = this.stage;
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, n = 0;
    for (const f of this.fighters) {
      if (f.dead || f.stocks <= 0) continue;
      const x = clamp(f.x, st.cam.l, st.cam.r), y = clamp(f.y - 50, st.cam.t, st.cam.b);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); n++;
    }
    if (!n) { minX = -300; maxX = 300; minY = -200; maxY = 0; }
    // incluir siempre parte del escenario
    minX = Math.min(minX, st.left * 0.4); maxX = Math.max(maxX, st.right * 0.4); maxY = Math.max(maxY, st.top + 40);
    // encuadre más cerrado: los peleadores se ven más grandes y con más detalle
    const w = (maxX - minX) + 360, h = (maxY - minY) + 320;
    const z = clamp(Math.min(W / w, (H - 60) / h), st.zoomMin || 0.42, 1.32);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2 + 20;
    this.cam.z = lerp(this.cam.z, z, 0.06);
    this.cam.x = lerp(this.cam.x, cx, 0.08);
    this.cam.y = lerp(this.cam.y, cy, 0.08);
  }
  worldToScreen(x, y) { const c = this.cam; return [(x - c.x) * c.z + W / 2, (y - c.y) * c.z + H / 2]; }

  // ---------- dibujo ----------
  draw() {
    const c = ctx, cam = this.cam, st = this.stage;
    ART.light = st.light || null;
    st.drawBG(c, cam);
    c.save();
    const sx = this.shake ? rand(-this.shake, this.shake) : 0, sy = this.shake ? rand(-this.shake, this.shake) : 0;
    const z = cam.z * (1 + (this.camKick || 0));
    c.translate(W / 2 + sx, H / 2 + sy); c.scale(z, z); c.translate(-cam.x, -cam.y);
    st.drawStage(c);
    drawFx(c, 'back');
    drawItems(c);
    Modes.drawWorld(c, this);
    // sombras de contacto
    for (const f of this.fighters) {
      if (f.dead || f.hidden || !f.grounded) continue;
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(f.x, f.y + 1, 26 * f.size(), 6, 0, 0, TAU); c.fill();
    }
    const order = this.fighters.slice().sort((a, b) => (a.cpu ? 0 : 1) - (b.cpu ? 0 : 1));
    for (const f of order) f.draw(c);
    drawProjectiles(c);
    drawFx(c, 'front');
    st.drawFG(c);
    c.restore();
    // luz del mundo: bloom, gradación de color y viñeta
    ART.post(c, st.grade || { vig: 0.5 });
    for (const k of this.koFx) this.drawKO(k);
    if (this.dim > 0) { c.fillStyle = `rgba(6,10,20,${Math.min(0.5, this.dim / 30)})`; c.fillRect(0, 0, W, H); }
    this.drawOffscreen();
    this.drawNowPlaying();
    this.drawHUD();
    // con el marcador arriba (celular), lo de cada modo baja para no encimarse
    if (hudOnTop()) { c.save(); c.translate(0, 98); Modes.drawHUD(c, this); c.restore(); } else Modes.drawHUD(c, this);
    // anuncios
    let by = 130;
    for (const b of this.banners) {
      const a = clamp(Math.min(b.t / 10, (150 - b.t) / 20), 0, 1);
      c.globalAlpha = a;
      const slide = reducedMotion ? 0 : Math.max(0, 10 - b.t) * 40;
      c.font = `700 32px ${FONT_DISPLAY}`; const tw = c.measureText(b.txt.toUpperCase()).width + 80;
      slab(W / 2 - tw / 2 + slide, by - 24, tw, 48, { skew: 0.35, edge: b.col });
      sfText(b.txt, W / 2 + slide, by, 34, b.col);
      c.globalAlpha = 1;
      by += 60;
    }
    // ¿LISTOS? / ¡PELEA!
    if (this.phase === 'intro' || (this.phase === 'fight' && this.t < 200)) {
      const fight = this.phase === 'fight';
      const tt = fight ? this.t - 150 : this.introT;
      const k = easeOut(clamp(tt / 12, 0, 1));
      const sc = fight ? 1.6 - k * 0.6 : 1.3 - k * 0.3;
      c.save(); c.translate(W / 2, H / 2 - 40); c.scale(sc, sc);
      c.globalAlpha = fight ? clamp((200 - this.t) / 16, 0, 1) : clamp(this.introT / 8, 0, 1);
      if (fight) { c.fillStyle = 'rgba(230,57,70,.35)'; c.fillRect(-W, -60, W * 2, 120); }
      sfText(fight ? '¡Pelea!' : '¿Listos?', 0, 0, fight ? 170 : 120, fight ? GOLD : PAPER, { strokeW: 14 });
      c.restore(); c.globalAlpha = 1;
    }
    if (this.phase === 'end') {
      const k = easeOut(clamp(this.endT / 14, 0, 1));
      c.fillStyle = `rgba(0,0,0,${0.35 * k})`; c.fillRect(0, 0, W, H);
      c.save(); c.translate(W / 2, H / 2 - 40); const sc = 2.2 - k * 1.2; c.scale(sc, sc);
      const txt = this.rules.mode === 'time' && this.timer <= 0 ? '¡Tiempo!' : 'K.O.';
      sfText(txt, 0, 0, 190, RED, { strokeW: 18 });
      c.restore();
    }
    if (this.flash > 0) { c.fillStyle = `rgba(255,255,255,${this.flash})`; c.fillRect(0, 0, W, H); }
    if (this.demo) { slab(W / 2 - 210, 16, 420, 42, { skew: 0.3 }); sfText('Demo · pulsa cualquier botón', W / 2, 37, 28, PAPER); }
    if (this.paused) { if (this.view) { c.fillStyle = 'rgba(6,8,14,.6)'; c.fillRect(0, 0, W, H); sfText('Pausa', W / 2, H / 2 - 30, 110, PAPER, { strokeW: 12 }); text('El anfitrión pausó la pelea', W / 2, H / 2 + 40, 18, '#cbd5e1', { body: true, weight: 600 }); } else this.drawPause(); }
  }
  // nombre de la canción: discreto, arriba a la izquierda, y se desvanece
  drawNowPlaying() {
    const np = Audio8.nowPlaying; if (!np || this.demo) return;
    const age = (performance.now() - np.t) / 1000; if (age > 5) return;
    const c = ctx, a = clamp(Math.min(age / 0.4, (5 - age) / 0.8), 0, 1);
    c.save(); c.globalAlpha = a;
    c.font = `600 15px ${FONT_BODY}`;
    const w = c.measureText('♪ ' + np.title).width + 28;
    const ny = hudOnTop() ? H - 48 : 18; // con el marcador arriba, la canción va abajo
    roundRect(c, 20, ny, w, 30, 15); c.fillStyle = 'rgba(8,12,22,.6)'; c.fill();
    c.strokeStyle = 'rgba(46,196,182,.5)'; c.lineWidth = 1.5; c.stroke();
    text('♪ ' + np.title, 34, ny + 16, 15, '#e2e8f0', { body: true, weight: 600, align: 'left' });
    c.restore();
  }
  drawKO(k) {
    const c = ctx;
    let [x, y] = this.worldToScreen(k.x, k.y);
    x = clamp(x, 0, W); y = clamp(y, 0, H);
    const ang = Math.atan2(H / 2 - y, W / 2 - x);
    const a = 1 - k.t / 60, len = 900 * easeOut(Math.min(1, k.t / 12));
    c.save(); c.translate(x, y); c.rotate(ang);
    c.globalAlpha = a; c.globalCompositeOperation = 'lighter';
    const bg = c.createLinearGradient(0, 0, len, 0); bg.addColorStop(0, withAlpha(k.col, 0.95)); bg.addColorStop(0.6, withAlpha(k.col, 0.4)); bg.addColorStop(1, withAlpha(k.col, 0));
    c.fillStyle = bg; c.beginPath(); c.moveTo(0, -30 * a); c.lineTo(len, -150 * a); c.lineTo(len, 150 * a); c.lineTo(0, 30 * a); c.closePath(); c.fill();
    const wg = c.createLinearGradient(0, 0, len * 0.85, 0); wg.addColorStop(0, 'rgba(255,255,255,1)'); wg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = wg; c.beginPath(); c.moveTo(0, -10 * a); c.lineTo(len * 0.85, -44 * a); c.lineTo(len * 0.85, 44 * a); c.lineTo(0, 10 * a); c.closePath(); c.fill();
    c.restore();
    ART.drawGlow(c, x, y, 260 * a + 60, k.col, a); ART.drawGlow(c, x, y, 110 * a + 20, '#ffffff', a);
    const tx = clamp(x + Math.cos(ang) * 150, 120, W - 120), ty = clamp(y + Math.sin(ang) * 150, hudOnTop() ? 200 : 100, hudOnTop() ? H - 80 : H - 180);
    c.save(); c.globalAlpha = clamp(a * 1.5, 0, 1); c.translate(tx, ty); const sc = 1 + Math.max(0, 8 - k.t) * 0.12; c.scale(sc, sc);
    sfText('K.O.', 0, 0, 90, k.col, { strokeW: 12 });
    c.restore(); c.globalAlpha = 1;
  }
  drawOffscreen() {
    const c = ctx;
    for (const f of this.fighters) {
      if (f.dead || f.stocks <= 0 || f.hidden) continue;
      const [x, y] = this.worldToScreen(f.x, f.y - 56);
      const top = hudOnTop();
      if (x > -10 && x < W + 10 && y > (top ? 100 : -10) && y < (top ? H + 10 : H - 100)) continue;
      const bx = clamp(x, 60, W - 60), by = clamp(y, top ? 160 : 60, top ? H - 60 : H - 160);
      const ang = Math.atan2(y - by, x - bx);
      c.save(); c.translate(bx, by);
      c.fillStyle = f.color; c.beginPath(); c.moveTo(Math.cos(ang) * 58, Math.sin(ang) * 58); c.lineTo(Math.cos(ang + 0.5) * 42, Math.sin(ang + 0.5) * 42); c.lineTo(Math.cos(ang - 0.5) * 42, Math.sin(ang - 0.5) * 42); c.fill();
      c.beginPath(); c.arc(0, 0, 44, 0, TAU); c.fillStyle = 'rgba(8,10,16,.88)'; c.fill(); c.lineWidth = 4; c.strokeStyle = f.color; c.stroke();
      c.save(); c.beginPath(); c.arc(0, 0, 40, 0, TAU); c.clip();
      c.translate(0, 34); c.scale(f.face * 0.46, 0.46); drawCharacter(c, f.id, f.pose, { flip: f.face < 0 });
      c.restore();
      c.restore();
    }
  }
  drawHUD() {
    const c = ctx, n = this.fighters.length;
    const cw = 268, gap = 14, total = n * cw + (n - 1) * gap;
    let x0 = (W - total) / 2;
    for (const f of this.fighters) {
      const x = x0, y = hudOnTop() ? 8 : H - 100;
      x0 += cw + gap;
      c.globalAlpha = f.stocks <= 0 ? 0.4 : 1;
      slab(x, y, cw, 86, { skew: 0.25, edge: withAlpha(f.color, 0.95), lw: 2.5 });
      // retrato
      c.save(); slabPath(x + 14, y + 7, 84, 72, 0.25); c.clip();
      const pg = c.createLinearGradient(0, y, 0, y + 80); pg.addColorStop(0, withAlpha(f.color, 0.6)); pg.addColorStop(1, '#0b0e16');
      c.fillStyle = pg; c.fillRect(x + 10, y + 5, 92, 76);
      // con cámara y voz: su cara en vivo en lugar del retrato
      const cam = typeof AV !== 'undefined' && f.avPeer ? AV.videoFor(f.avPeer) : null;
      if (cam) drawVideoCover(c, cam.v, x + 10, y + 5, 92, 76, cam.mirror);
      else drawPortrait(c, f.id, x + 57, y + 44, 30, f.dead ? 'ko' : f.flinch > 0 ? 'hurt' : 'normal');
      if (cam && (f.dead || f.flinch > 0)) { c.fillStyle = f.dead ? 'rgba(10,12,20,.55)' : 'rgba(230,57,70,.3)'; c.fillRect(x + 10, y + 5, 92, 76); }
      c.restore();
      slabPath(x + 14, y + 7, 84, 72, 0.25); c.lineWidth = cam ? 2.5 : 1.5; c.strokeStyle = cam ? withAlpha(f.color, 0.95) : 'rgba(255,255,255,.25)'; c.stroke();
      if (cam) { c.fillStyle = '#ef4444'; c.beginPath(); c.arc(x + 26, y + 17, 4, 0, TAU); c.fill(); }
      sfText(CHARS[f.id].name, x + 106, y + 18, fitSize(CHARS[f.id].name, cw - 106 - 78, 22), '#dfe5ee', { align: 'left' });
      if (f.label && !f.cpu) text(f.label.slice(0, 12), x + cw - 24, y + 17, 12, f.color, { align: 'right', body: true, weight: 700 });
      else sfText(f.cpu ? `CPU ${f.brain ? f.brain.L.lv : ''}` : PLAYER_TAGS[f.port], x + cw - 22, y + 18, 20, f.color, { align: 'right' });
      const m = this.rules.mode;
      const jx = f.flinch > 0 ? rand(-3, 3) : 0, jy = f.flinch > 0 ? rand(-3, 3) : 0;
      const bx = x + 104, bw = cw - 138, byy = y + 72;
      if (m === 'hp') {
        // barra de vida estilo arcade
        const hp = Math.ceil(f.hp || 0), k = clamp((f.hp || 0) / (f.maxHp || HP_MAX), 0, 1);
        const hc = k > 0.5 ? '#34d399' : k > 0.25 ? '#ffd166' : '#e63946';
        if (!f.dead || f.stocks > 0) sfText(`${hp}`, x + 214 + jx, y + 48 + jy, 44, hc, { align: 'right', strokeW: 6 });
        slabPath(bx, byy - 4, bw, 11, 1); c.fillStyle = 'rgba(0,0,0,.7)'; c.fill();
        if (k > 0) { slabPath(bx, byy - 4, bw * k, 11, 1); c.fillStyle = hc; c.fill(); }
      } else {
        // porcentaje con color de calor
        const p = Math.floor(f.percent);
        const pc = p < 40 ? '#f4f6fa' : p < 80 ? '#ffe08a' : p < 120 ? '#ffb020' : p < 160 ? '#ff6a2b' : p < 220 ? '#e63946' : '#a4161a';
        if (!f.dead || f.stocks > 0) {
          const pop = f.flinch > 0 ? 1 + f.flinch * 0.012 : 1;
          c.save(); c.translate(x + 196 + jx, y + 50 + jy); c.scale(pop, pop);
          sfText(`${p}`, 0, 0, 56, pc, { align: 'right', strokeW: 7 });
          sfText('%', 4, 8, 26, pc, { align: 'left', strokeW: 4 });
          c.restore();
        }
        // barra de peligro (0–200 %)
        slabPath(bx, byy, bw, 7, 1); c.fillStyle = 'rgba(0,0,0,.6)'; c.fill();
        const fill = clamp(f.percent / 200, 0, 1);
        if (fill > 0) { slabPath(bx, byy, bw * fill, 7, 1); const bg = c.createLinearGradient(bx, 0, bx + bw, 0); bg.addColorStop(0, '#ffe08a'); bg.addColorStop(0.5, '#ff6a2b'); bg.addColorStop(1, '#a4161a'); c.fillStyle = bg; c.fill(); }
      }
      // vidas / puntos
      if (stockMode(m)) {
        const sN = f.stocks;
        if (sN <= 6) for (let i = 0; i < sN; i++) { const sx2 = x + 110 + i * 15, sy2 = y + 36; c.save(); c.translate(sx2, sy2); c.rotate(Math.PI / 4); c.fillStyle = f.color; c.fillRect(-4.5, -4.5, 9, 9); c.strokeStyle = INK; c.lineWidth = 1.5; c.strokeRect(-4.5, -4.5, 9, 9); c.restore(); }
        else sfText(`×${sN}`, x + 108, y + 38, 20, f.color, { align: 'left' });
      } else if (m === 'koth') sfText(`${Math.floor(f.score)}/${KOTH_TARGET}`, x + 108, y + 40, 22, GOLD, { align: 'left' });
      else if (m === 'soccer') sfText(`⚽ ${Math.floor(f.score)}`, x + 108, y + 40, 20, PAPER, { align: 'left' });
      else sfText(`${f.score >= 0 ? '+' : ''}${f.score}`, x + 108, y + 40, 24, f.score >= 0 ? '#34d399' : RED, { align: 'left' });
      if (f.finalReady) sfText('¡Final!', x + cw - 26, y + 56, 20, GOLD, { align: 'right' });
      else if (f.item) drawItemIcon(c, f.item.type, x + cw - 36, y + 52, 0.55);
      c.globalAlpha = 1;
    }
    if (timedMode(this.rules.mode)) {
      const s = Math.max(0, Math.ceil(this.timer / 60));
      const txt = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      const ty = (this.rules.mode === 'soccer' ? 72 : 12) + (hudOnTop() ? 98 : 0);
      slab(W / 2 - 80, ty, 160, 54, { skew: 0.3, edge: GOLD });
      sfText(txt, W / 2, ty + 28, 48, s <= 10 ? RED : GOLD);
    }
  }
  drawPause() {
    const c = ctx;
    c.fillStyle = 'rgba(6,8,14,.72)'; c.fillRect(0, 0, W, H);
    sfText('Pausa', W / 2, 210, 110, PAPER, { strokeW: 12 });
    ['Continuar', 'Reiniciar', 'Salir al menú'].forEach((o, i) => {
      const y = 300 + i * 70, sel = i === this.pauseSel || hover(W / 2 - 170, y, 340, 56);
      sfButton(o, W / 2 - 170 + (sel ? 10 : 0), y, 340, 56, sel);
    });
  }
}

// marcador arriba en pantalla táctil: abajo lo taparían los pulgares
function hudOnTop() { return typeof TouchPad !== 'undefined' && TouchPad.active; }
// dibuja un video llenando un rectángulo (recorta lo que sobra); la cámara propia va como espejo
function drawVideoCover(c, v, x, y, w, h, mirror) {
  const vw = v.videoWidth, vh = v.videoHeight, k = Math.max(w / vw, h / vh), dw = vw * k, dh = vh * k;
  c.save();
  if (mirror) { c.translate(x + w / 2, 0); c.scale(-1, 1); c.translate(-(x + w / 2), 0); }
  try { c.drawImage(v, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); } catch (e) { /* cuadro aún sin datos */ }
  c.restore();
}
