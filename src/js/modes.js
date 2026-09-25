'use strict';
// ============================================================
//  MODOS DE JUEGO, EQUIPOS Y MODO FIESTA
// ============================================================
const MODES = [
  { id: 'stock', name: 'Vidas', desc: 'El clásico: sácalos del escenario. El último con vidas gana.', stock: true },
  { id: 'time', name: 'Tiempo', desc: '+1 por cada KO, −1 por cada caída. Gana quien sume más.', timed: true },
  { id: 'hp', name: 'Vida', desc: 'Estilo arcade: barra de vida. Si llega a cero, ¡K.O.!', stock: true },
  { id: 'koth', name: 'Rey de la colina', desc: 'Párate en la zona de luz para sumar puntos. Llega a 40.', timed: true },
  { id: 'soccer', name: 'Fútbol Golpazo', desc: 'Mete la pelota en la portería a golpes. Siempre por equipos.', timed: true, teams: true },
  { id: 'bomb', name: 'Bomba caliente', desc: 'Pasa la bomba pegándole a alguien antes de que explote.', stock: true },
];
const MODE_BY_ID = Object.fromEntries(MODES.map(m => [m.id, m]));
const TEAM_COLORS = ['#e63946', '#3a86ff'];
const TEAM_NAMES = ['Rojo', 'Azul'];
const HP_MAX = 150, KOTH_TARGET = 40, SOCCER_TARGET = 5;
const stockMode = m => !!(MODE_BY_ID[m] || {}).stock;
const timedMode = m => !!(MODE_BY_ID[m] || {}).timed;
const teamsOn = () => !!(BATTLE && BATTLE.rules.teams);
const sameTeam = (a, b) => !!(a && b && a !== b && teamsOn() && a.team === b.team);

function drawSoccerBall(c, x, y, r, rot) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.fillStyle = 'rgba(0,0,0,.9)'; c.beginPath(); c.arc(0, 0, r + 2, 0, TAU); c.fill();
  const g = c.createRadialGradient(-r * 0.3, -r * 0.3, 4, 0, 0, r); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c9ced6');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
  c.fillStyle = '#1b1f27';
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; c.beginPath(); for (let k = 0; k < 5; k++) { const b2 = a + k / 5 * TAU; c.lineTo(Math.cos(a) * r * 0.62 + Math.cos(b2) * r * 0.23, Math.sin(a) * r * 0.62 + Math.sin(b2) * r * 0.23); } c.fill(); }
  c.beginPath(); for (let k = 0; k < 5; k++) { const b2 = k / 5 * TAU - Math.PI / 2; c.lineTo(Math.cos(b2) * r * 0.3, Math.sin(b2) * r * 0.3); } c.fill();
  c.restore();
}

// ---------- Modo Fiesta: una regla loca por pelea ----------
const PARTY = [
  { id: 'gigantes', name: 'Todos gigantes', desc: 'Todos pelean en tamaño gigante.', start(B) { for (const f of B.fighters) f.bigTime = 1e9; }, respawn(f) { f.bigTime = 1e9; } },
  { id: 'mini', name: 'Mini peleadores', desc: 'Todos chiquitos… y salen volando más lejos.', start(B) { for (const f of B.fighters) { f.baseScale = 0.62; f.weightMul = 0.8; } } },
  { id: 'luna', name: 'Gravedad lunar', desc: 'Saltos enormes y caídas lentas.', start(B) { B.stage.grav *= 0.45; if (B.stage.baseGrav) B.stage.baseGrav *= 0.45; } },
  { id: 'bombas', name: 'Lluvia de bombas', desc: 'Del cielo caen bombas sin parar.', tick(B) { if (B.phase === 'fight' && B.t % 70 === 0) { const st = B.stage, x = rand(st.left, st.right); spawnFx('target', x, st.floorY(x), { life: 60, col: '#ffbe0b' }); spawnProjectile(null, { type: 'item', itemType: 'bomb', x, y: st.top - 900, vx: 0, vy: 14, grav: 0.2, r: 16, life: 200, dmg: 16, ang: 65, bkb: 8, kbg: 10, explodeGround: 1, reflect: 0 }); } } },
  { id: 'hielo', name: 'Piso de hielo', desc: 'Nadie puede frenar: todo resbala.', start(B) { B.mods.traction = 0.12; } },
  { id: 'turbo', name: 'Turbo', desc: 'El juego corre 50% más rápido.', start(B) { B.mods.turbo = true; } },
  { id: 'vampiro', name: 'Vampiros', desc: 'Pegar te cura parte del daño que haces.', start(B) { B.mods.vampire = 0.45; } },
  { id: 'cabezones', name: 'Cabezones', desc: 'Cabezas gigantes. Todo se ve mejor así.', start(B) { B.mods.bigHeads = true; } },
  { id: 'final', name: 'Golpe final para todos', desc: 'Todos empiezan (y reaparecen) con su Golpe Final.', start(B) { for (const f of B.fighters) f.finalReady = true; }, respawn(f) { f.finalReady = true; } },
  { id: 'bates', name: 'Derby de jonrones', desc: 'Solo aparecen bates, y muy seguido.', start(B) { B.mods.onlyItem = 'bat'; B.mods.itemEvery = 240; } },
  { id: 'fantasmas', name: 'Fantasmas', desc: 'Todos son casi invisibles salvo al atacar.', start(B) { B.mods.ghosts = true; } },
  { id: 'explosivo', name: 'Golpes explosivos', desc: 'Cada golpe fuerte explota y lanza más lejos.', start(B) { B.mods.explosive = true; } },
];
const PARTY_BY_ID = Object.fromEntries(PARTY.map(p => [p.id, p]));

const Modes = {
  // al crear la pelea
  init(B) {
    B.mods = {};
    B.ms = { mode: B.rules.mode };
    if (B.party) { B.party.start && B.party.start(B); }
    if (B.rules.mode === 'hp') for (const f of B.fighters) { f.maxHp = HP_MAX; f.hp = HP_MAX; }
    if (B.rules.mode === 'koth') { B.ms.zone = null; B.ms.zoneT = 0; this.moveZone(B); }
    if (B.rules.mode === 'bomb') B.ms.bomb = { holder: -1, t: 0, cool: 200, noBack: -1, noBackT: 0 };
    if (B.rules.mode === 'soccer') { B.ms.goals = [0, 0]; B.ms.pause = 0; this.resetBall(B, 0); }
  },
  onRespawn(B, f) {
    if (B.party && B.party.respawn) B.party.respawn(f);
    if (B.rules.mode === 'hp') f.hp = f.maxHp;
    if (B.rules.mode === 'soccer') { f.respawnX = (f.team === 0 ? -1 : 1) * rand(350, 550); }
  },
  // lógica por fotograma (solo el anfitrión / partida local)
  tick(B) {
    if (B.party && B.party.tick) B.party.tick(B);
    if (B.mods.onlyItem && B.phase === 'fight' && B.t % B.mods.itemEvery === 0 && B.items.length < 5) spawnRandomItem(B.mods.onlyItem);
    const m = B.rules.mode;
    if (m === 'koth') this.tickKoth(B);
    if (m === 'bomb') this.tickBomb(B);
    if (m === 'soccer') this.tickBall(B);
  },
  isFinished(B) {
    const m = B.rules.mode;
    if (timedMode(m) && B.timer <= 0) return true;
    if (m === 'koth') return B.fighters.some(f => this.pointsOf(B, f) >= KOTH_TARGET);
    if (m === 'soccer') return B.ms.goals.some(g => g >= SOCCER_TARGET);
    if (stockMode(m)) {
      const alive = B.fighters.filter(f => f.stocks > 0);
      if (B.rules.teams) return new Set(alive.map(f => f.team)).size <= 1;
      return alive.length <= 1;
    }
    return false;
  },
  pointsOf(B, f) { if (!B.rules.teams) return f.score; return B.fighters.filter(o => o.team === f.team).reduce((s, o) => s + o.score, 0); },

  // ---------- Rey de la colina ----------
  moveZone(B) {
    const st = B.stage;
    const opts = st.surfaces().filter(s => s.w >= 150);
    const prev = B.ms.zone && B.ms.zone.si;
    let si = randi(0, opts.length - 1);
    if (opts.length > 1 && si === prev) si = (si + 1) % opts.length;
    const s = opts[si], w = Math.min(230, s.w * 0.8);
    B.ms.zone = { si, off: rand(0, s.w - w), w };
    B.ms.zoneT = 60 * 18;
    if (B.phase === 'fight') banner('¡La zona se movió!', GOLD);
  },
  zoneRect(B) {
    const z = B.ms.zone; if (!z) return null;
    const s = B.stage.surfaces().filter(s => s.w >= 150)[z.si]; if (!s) return null;
    return { x: s.x + z.off, y: s.y - 170, w: z.w, h: 170, top: s.y };
  },
  tickKoth(B) {
    if (B.phase !== 'fight') return;
    if (--B.ms.zoneT <= 0) this.moveZone(B);
    const r = this.zoneRect(B); if (!r) return;
    const inside = B.fighters.filter(f => !f.dead && f.stocks > 0 && f.x > r.x && f.x < r.x + r.w && f.y <= r.top + 4 && f.y > r.y);
    const sides = new Set(inside.map(f => B.rules.teams ? 't' + f.team : f.port));
    B.ms.contested = sides.size > 1;
    B.ms.holder = sides.size === 1 ? inside[0].port : -1;
    if (sides.size === 1) for (const f of inside) { f.score += 1 / 60; if (B.t % 60 === 0) Audio8.sfx('menu'); }
  },

  // ---------- Bomba caliente ----------
  tickBomb(B) {
    const b = B.ms.bomb;
    if (B.phase !== 'fight') return;
    const holder = B.fighters[b.holder];
    if (b.noBackT > 0) b.noBackT--;
    if (!holder || holder.dead || holder.stocks <= 0) {
      if (holder) { b.holder = -1; b.cool = 120; }
      if (--b.cool <= 0) {
        const cand = B.fighters.filter(f => !f.dead && f.stocks > 0 && f.state !== 'respawn');
        if (cand.length) { const f = pick(cand); b.holder = B.fighters.indexOf(f); b.t = randi(10, 16) * 60; banner(`¡${f.label || CHARS[f.id].name} tiene la bomba!`, RED); Audio8.sfx('warn'); }
      }
      return;
    }
    b.t--;
    if (b.t % 60 === 0 && b.t > 0) Audio8.sfx(b.t < 180 ? 'warn' : 'menu');
    if (b.t <= 0) {
      holder.invuln = 0; holder.starTime = 0;
      spawnFx('boom', holder.x, holder.y - 50, { r: 190, col: '#ffbe0b' }); shake(22); flash(0.5); Audio8.sfx('explosion');
      applyHit(null, holder, { dmg: 30, ang: 78, bkb: 38, kbg: 0, sfx: 'bighit', effect: 'fire' }, holder.face, { unblockable: true });
      b.holder = -1; b.cool = 150;
    }
  },
  onHit(att, t) {
    const B = BATTLE; if (!B || B.rules.mode !== 'bomb' || !att) return;
    const b = B.ms.bomb, ai = B.fighters.indexOf(att), ti = B.fighters.indexOf(t);
    if (ai !== b.holder || ti < 0 || (b.noBackT > 0 && ti === b.noBack) || sameTeam(att, t)) return;
    b.holder = ti; b.noBack = ai; b.noBackT = 60;
    Audio8.sfx('pickup'); spawnFx('text', t.x, t.y - 150, { txt: '¡TE TOCA!', col: RED, size: 30 });
  },

  // ---------- Fútbol ----------
  resetBall(B, dir) {
    B.ms.ball = { x: dir * 40, y: B.stage.top - 520, vx: 0, vy: 0, r: 26, rot: 0, last: -1 };
  },
  kickBall(att, hit, dir, hx, hy, r) {
    const B = BATTLE; if (!B || !B.ms || !B.ms.ball || B.ms.pause > 0) return false;
    const ball = B.ms.ball;
    if (dist(hx, hy, ball.x, ball.y) > r + ball.r) return false;
    let a = hit.ang * Math.PI / 180;
    if (hit.ang > 180) a = -40 * Math.PI / 180; // los meteoros la clavan al piso
    const k = clamp((hit.bkb + Math.max(hit.kbg, 4) * 0.7) * 1.05, 7, 28);
    ball.vx = Math.cos(a) * k * dir; ball.vy = -Math.sin(a) * k - 2;
    ball.last = att ? B.fighters.indexOf(att) : -1;
    Audio8.sfx('hit', 1); spawnFx('hit', ball.x, ball.y, { col: '#f4f6fa', r: 18 });
    return true;
  },
  tickBall(B) {
    const ball = B.ms.ball, st = B.stage;
    if (B.ms.pause > 0) { if (--B.ms.pause === 0) this.resetBall(B, 0); return; }
    if (B.phase === 'intro') return;
    ball.vy = Math.min(ball.vy + 0.5 * st.grav, 18);
    ball.vx *= 0.996;
    const ox = ball.x, oy = ball.y;
    ball.x += ball.vx; ball.y += ball.vy;
    ball.rot += ball.vx * 0.04;
    for (const s of st.surfaces()) {
      if (ball.x + ball.r * 0.4 < s.x || ball.x - ball.r * 0.4 > s.x + s.w) continue;
      if (oy + ball.r <= s.y + 2 + Math.max(0, s.dy) && ball.y + ball.r >= s.y && ball.vy >= 0) {
        ball.y = s.y - ball.r; ball.vy = Math.abs(ball.vy) > 3 ? -ball.vy * 0.62 : 0; ball.vx *= 0.985;
        if (Math.abs(ball.vy) > 4) Audio8.sfx('land');
      }
      if (!s.plat && ball.y > s.y + 4 && ball.y - ball.r < s.y + s.h) {
        if (ox <= s.x - ball.r + 1 && ball.x > s.x - ball.r) { ball.x = s.x - ball.r; ball.vx = -Math.abs(ball.vx) * 0.7; }
        else if (ox >= s.x + s.w + ball.r - 1 && ball.x < s.x + s.w + ball.r) { ball.x = s.x + s.w + ball.r; ball.vx = Math.abs(ball.vx) * 0.7; }
      }
      if (!s.plat && oy - ball.r >= s.y + s.h - 1 && ball.y - ball.r < s.y + s.h && ball.x > s.x && ball.x < s.x + s.w) { ball.y = s.y + s.h + ball.r; ball.vy = Math.abs(ball.vy) * 0.6; }
    }
    // los cuerpos la empujan un poco
    for (const f of B.fighters) {
      if (f.dead || f.hidden) continue;
      const hb = f.hurtbox();
      if (circleRect(ball.x, ball.y, ball.r, hb.x, hb.y, hb.w, hb.h)) {
        const d = sign(ball.x - f.x) || f.face;
        ball.vx = approach(ball.vx, d * Math.max(4, Math.abs(f.vx) * 1.2), 1.2);
        ball.x += d * 2; ball.last = B.fighters.indexOf(f);
      }
    }
    // ¿gol?
    const g = st.goals;
    if (g) {
      let team = -1;
      if (ball.x < g.l && ball.y > g.top) team = 1;
      if (ball.x > g.r && ball.y > g.top) team = 0;
      if (team >= 0 && B.phase !== 'fight') { B.ms.pause = 150; } // ya se decidió: el gol no cuenta
      else if (team >= 0) {
        B.ms.goals[team]++; B.ms.pause = 150;
        const who = B.fighters[ball.last];
        banner(`¡GOOOOL del equipo ${TEAM_NAMES[team]}!`, TEAM_COLORS[team]);
        if (who && who.team === team) who.score++;
        Audio8.sfx('orb'); Audio8.sfx('explosion'); flash(0.4); shake(12);
        for (let i = 0; i < 40; i++) spawnFx('coin', ball.x + rand(-80, 80), ball.y - rand(0, 120));
        spawnFx('boom', ball.x, ball.y, { r: 160, col: TEAM_COLORS[team] });
        ball.y = -9999;
      }
    }
    if (ball.y > st.blast.b || ball.x < st.blast.l || ball.x > st.blast.r) this.resetBall(B, 0);
  },

  // ---------- dibujo en el mundo ----------
  drawWorld(c, B) {
    const m = B.rules.mode, t = performance.now() / 1000;
    if (m === 'koth') {
      const r = this.zoneRect(B); if (!r) return;
      const blink = B.ms.zoneT < 180 && Math.floor(B.ms.zoneT / 10) % 2;
      const col = B.ms.contested ? '#ffbe0b' : B.ms.holder >= 0 ? (B.fighters[B.ms.holder] || {}).color || GOLD : '#fff3c4';
      const g = c.createLinearGradient(0, r.y, 0, r.top);
      g.addColorStop(0, withAlpha(col, 0)); g.addColorStop(1, withAlpha(col, blink ? 0.15 : 0.45));
      c.fillStyle = g; c.fillRect(r.x, r.y, r.w, r.h);
      c.strokeStyle = withAlpha(col, 0.9); c.lineWidth = 4; c.beginPath(); c.moveTo(r.x, r.top); c.lineTo(r.x + r.w, r.top); c.stroke();
      for (let i = 0; i < 5; i++) { const y = r.top - ((t * 60 + i * 34) % r.h); c.fillStyle = withAlpha(col, 0.6); c.fillRect(r.x + ((i * 53) % r.w), y, 3, 10); }
    }
    if (m === 'bomb') {
      const b = B.ms.bomb, f = B.fighters[b.holder];
      if (f && !f.dead) {
        const x = f.x, y = f.y - 150 * f.size(), sec = Math.ceil(b.t / 60);
        const pulse = 1 + (b.t < 180 ? Math.sin(t * 20) * 0.12 : 0);
        c.save(); c.translate(x, y); c.scale(pulse * 1.3, pulse * 1.3); drawItemIcon(c, 'bomb', 0, 0, 1); c.restore();
        text(`${sec}`, x, y - 36, 26, sec <= 3 ? RED : PAPER, { stroke: '#000', strokeW: 5 });
      }
    }
    if (m === 'soccer') {
      const ball = B.ms.ball; if (!ball || ball.y < -5000) return;
      drawSoccerBall(c, ball.x, ball.y, ball.r, ball.rot);
      // sombra
      const fy = B.stage.floorY(ball.x);
      if (fy > ball.y) { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(ball.x, fy, ball.r * clamp(1 - (fy - ball.y) / 700, 0.3, 1), 5, 0, 0, TAU); c.fill(); }
    }
  },
  // ---------- marcador superior ----------
  drawHUD(c, B) {
    const m = B.rules.mode;
    if (m === 'soccer') {
      const g = B.ms.goals;
      slab(W / 2 - 230, 10, 460, 58, { skew: 0.25, edge: GOLD });
      sfText(`${TEAM_NAMES[0]} ${g[0]}`, W / 2 - 110, 40, 40, TEAM_COLORS[0]);
      sfText(`${g[1]} ${TEAM_NAMES[1]}`, W / 2 + 110, 40, 40, TEAM_COLORS[1]);
    }
    if (m === 'koth' && B.rules.teams) {
      slab(W / 2 - 260, 70, 520, 36, { skew: 0.3 });
      [0, 1].forEach(tm => { const pts = B.fighters.filter(f => f.team === tm).reduce((s, f) => s + f.score, 0); sfText(`${TEAM_NAMES[tm]} ${Math.floor(pts)}/${KOTH_TARGET}`, W / 2 + (tm ? 120 : -120), 89, 26, TEAM_COLORS[tm]); });
    }
    if (B.party && B.phase === 'fight' && B.t < 400) {
      const a = clamp((400 - B.t) / 30, 0, 1); c.globalAlpha = a;
      slab(W - 360, 76, 340, 52, { skew: 0.3, edge: GOLD });
      sfText('Modo fiesta', W - 190, 90, 20, GOLD);
      text(B.party.name, W - 190, 112, 14, PAPER, { body: true, weight: 700 });
      c.globalAlpha = 1;
    }
  },
};
