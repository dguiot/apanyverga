'use strict';
// ============================================================
//  IA de la CPU (niveles 1–9): genera la misma "entrada" que un control
// ============================================================
const AI_MAX = 9;
const AI_NAMES = ['', 'Principiante', 'Fácil', 'Fácil+', 'Normal', 'Normal+', 'Difícil', 'Muy difícil', 'Experto', 'Leyenda'];
function aiParams(lv) {
  const t = (clamp(lv, 1, AI_MAX) - 1) / (AI_MAX - 1);
  return {
    lv, t,
    react: Math.round(lerp(32, 2, t)),          // fotogramas entre decisiones de ataque
    aggro: lerp(0.3, 0.97, t),                  // probabilidad de atacar en rango
    shield: lerp(0.02, 0.55, t),                // reacción de escudo ante un ataque cercano
    proj: lerp(0.003, 0.02, t),
    recover: lerp(0.55, 1, t),                  // intenta volver al escenario
    di: lerp(0.1, 1, t),                        // DI para sobrevivir
    tech: lerp(0, 0.9, t),                      // amortiguar al caer
    punish: lerp(0, 1, t),                      // castiga aterrizajes y escudos soltados
    oos: lerp(0, 0.85, t),                      // agarre / ataque tras bloquear
    juggle: lerp(0, 0.9, t),                    // persigue en el aire
    edgeguard: t >= 0.5 ? lerp(0.3, 0.95, t) : 0,
    dodge: lerp(0, 0.6, t),                     // esquiva proyectiles
    killSense: lerp(0.2, 1, t),                 // elige golpes fuertes a % alto
    mistake: lerp(0.25, 0, t),                  // decisiones al azar
    speed: lerp(0.55, 1, Math.min(1, t * 1.6)),  // los niveles bajos caminan en vez de correr
    daydream: lerp(0.012, 0, Math.min(1, t * 2)), // a veces se quedan quietos
  };
}

class AIBrain {
  constructor(level) {
    this.L = aiParams(level);
    this.ctrl = new Controller('cpu');
    this.f = null; this.cool = 0; this.shieldT = 0; this.jumpCd = 0; this.wasShield = 0; this.guardT = 0; this.idleT = 0;
  }
  tick() {
    const s = this.think(), f = this.f;
    // cerca del techo (gravedad cero del espacio o un salto de más): no sigue subiendo, baja rápido
    if (f && !f.grounded && BATTLE) {
      const top = BATTLE.stage.blast.t;
      if (f.y < top + 560) s.jump = false; // con poca gravedad un salto de más ya no baja a tiempo
      if (f.y < top + 420) { s.attack = false; s.special = false; s.y = 1; } // ni aéreos: seguía subiendo al atacar
    }
    this.ctrl.update(s);
  }
  think() {
    const s = blankState(), f = this.f, L = this.L;
    if (!f || f.dead || !BATTLE || BATTLE.phase !== 'fight') return s;
    const st = BATTLE.stage;
    this.cool--; this.jumpCd--; this.shieldT--; this.guardT--;
    const press = b => { s[b] = !this.ctrl.cur[b]; };
    const flickX = d => { s.x = d; this.ctrl.flickX = -1; this.ctrl.flickDirX = d; };
    const flickY = d => { s.y = d; this.ctrl.flickY = -1; this.ctrl.flickDirY = d; };
    if (this.idleT > 0 && f.grounded && !['hitstun', 'grabbed', 'ledge'].includes(f.state)) { this.idleT--; return s; }
    if (f.grounded && Math.random() < L.daydream) { this.idleT = randi(20, 50); return s; }
    if (f.state === 'respawn') { if (f.sf > 40 - L.t * 25) s.x = sign(-f.x) || 1; return s; }
    if (f.state === 'grabbed') { if (Math.random() < 0.3 + L.t * 0.6) press(pick(['attack', 'jump', 'special'])); s.x = Math.random() > 0.5 ? 1 : -1; return s; }
    if (f.state === 'hitstun') {
      if (Math.random() < L.di) { s.x = -sign(f.lx) * 0.9; s.y = f.ly < 0 ? 0.6 : -0.8; }
      if (f.tumble && Math.random() < L.tech * 0.4 && f.x > st.left - 20 && f.x < st.right + 20) press('shield'); // fuera del escenario no: se volvería un esquive perdido
      return s;
    }
    if (f.state === 'ledge') {
      if (f.sf > 10 + randi(0, Math.max(2, L.react))) {
        const r = Math.random();
        if (r < 0.45) s.x = -f.ledge.side; else if (r < 0.7) press('jump'); else if (r < 0.85) press('attack'); else press('shield');
      }
      return s;
    }
    if (f.state === 'down') { if (Math.random() < 0.1 + L.t * 0.3) { if (Math.random() < 0.5) press('attack'); else s.x = pick([-1, 1]); } return s; }
    if (f.state === 'holding') {
      if (f.sf > 8 + randi(0, 10)) {
        const t = f.grabbing;
        if (t && t.percent < 50 && Math.random() < 0.5 && f.sf < 30) { if (f.sf % 8 === 0) press('attack'); return s; }
        // lanzamiento según posición y %
        const toEdge = f.x > 0 ? 1 : -1;
        if (t && t.percent > 120 && Math.abs(f.x) < 150) s.y = -1;
        else if (t && t.percent < 60 && L.juggle > 0.5) s.y = Math.random() < 0.5 ? -1 : 1;
        else s.x = toEdge;
      }
      return s;
    }
    // ---------- en el mar (barco): nadar hacia el casco y brincar a la orilla ----------
    if (f.swim) {
      const hull = st.solids[0], left = Math.abs(f.x - hull.x) < Math.abs(f.x - (hull.x + hull.w));
      const tx = left ? hull.x - 40 : hull.x + hull.w + 40;
      s.x = Math.abs(tx - f.x) > 12 ? sign(tx - f.x) : 0;
      const nearSurface = f.y <= SEA_FLOAT + 26;
      if (this.jumpCd <= 0 && ((nearSurface && Math.abs(tx - f.x) < 70) || (!nearSurface && f.vy > -1))) { press('jump'); this.jumpCd = nearSurface ? 20 : 9; }
      return s;
    }
    // ---------- recuperación ----------
    // fuera = sin piso debajo, o metido debajo de un piso. Regresa a la orilla más cercana: en mundos de
    // varios pisos (pirámide, azoteas) cada terraza tiene la suya y su altura propia
    const onTop = st.solids.some(so => !so.wall && f.x >= so.x - 10 && f.x <= so.x + so.w + 10 && f.y <= so.y + 20);
    let lg = null;
    if (!f.grounded && !onTop) {
      let bd = 1e9;
      for (const l of st.ledges()) { const out = (f.x - l.x) * l.side, d = Math.abs(f.x - l.x) + Math.abs(f.y - l.y) * 0.5 + (out < -40 ? 400 : 0); if (d < bd) { bd = d; lg = l; } }
    }
    if (lg) {
      const toward = -lg.side, edgeX = lg.x, ly = lg.y, out = (f.x - edgeX) * lg.side;
      s.x = toward;
      // el teletransporte de Pablo lee el stick a medio movimiento: hay que seguir apuntando a la orilla
      if (f.id === 'pablo' && f.state === 'attack' && f.move && f.move.key === 'sp_u') { const dx = edgeX - f.x, dy = ly - 40 - f.y, l = Math.hypot(dx, dy) || 1; s.x = dx / l; s.y = Math.min(-0.3, dy / l); return s; }
      // debajo del piso: primero sale por la orilla más cercana (hacia el centro se queda atorada abajo)
      if (out < -8 && f.y > ly + 20) {
        s.x = lg.side;
        if (f.jumps > 0 && f.vy > -2 && this.jumpCd <= 0 && Math.random() < L.recover) { press('jump'); this.jumpCd = 22; }
        return s;
      }
      // más abajo que la orilla: se queda justo afuera (si se mete debajo choca con el piso por abajo),
      // salvo cuando ya cae dentro del alcance para agarrarse: entonces se pega a la orilla
      const margin = 18 * f.size() + 16;
      if (f.y > ly + 5) {
        const snapWin = f.vy >= 0 && f.y < ly + 160 * f.size();
        if (snapWin) s.x = toward;
        else { const tx = edgeX - toward * margin, dx = tx - f.x; s.x = Math.abs(dx) < 6 ? 0 : clamp(dx / 30, -1, 1); }
      }
      if (Math.random() > L.recover) return s;
      const below = f.y > ly - 40;
      const farX = Math.abs(f.x - edgeX);
      // alto y lejos: primero planea hacia la orilla; el salto y el especial se guardan para cuando baje
      if ((below || (farX > 250 && f.y > ly - 150)) && f.vy > -3) {
        if (f.jumps > 0 && this.jumpCd <= 0) { press('jump'); this.jumpCd = 22; return s; }
        const reach = farX < 300 && f.y - ly < 330;
        if (!f.airUsed.sp_u && f.state === 'air' && f.vy > -1 && ((reach && f.y > ly - 20) || (f.jumps === 0 && f.y > ly - 30))) {
          s.y = -1; s.x = f.y > ly + 5 ? s.x : toward;
          if (f.id === 'pablo') { const dx = edgeX - f.x, dy = ly - 40 - f.y; const l = Math.hypot(dx, dy) || 1; s.x = dx / l; s.y = Math.min(-0.5, dy / l); }
          press('special'); return s;
        }
        if (!f.airUsed.sp_s && ['nacho', 'pablo', 'robes', 'torito', 'michi', 'chilazo', 'chupa', 'puentin'].includes(f.id) && farX > 220 && f.y < ly + 60) { s.x = toward; press('special'); return s; }
      }
      return s;
    }
    if (f.state === 'helpless') { s.x = sign(-f.x); return s; }

    // ---------- peligros ----------
    if (st.id === 'volcano' && st.lavaPhase !== 'idle') {
      const plat = st.plats.reduce((b, p) => Math.abs(p.x + p.w / 2 - f.x) < Math.abs(b.x + b.w / 2 - f.x) ? p : b, st.plats[0]);
      if (!(f.grounded && f.surface && f.surface.plat)) {
        const px = plat.x + plat.w / 2;
        s.x = Math.abs(px - f.x) > 30 ? sign(px - f.x) : 0;
        if (Math.abs(px - f.x) < 140 && this.jumpCd <= 0 && (f.grounded || f.vy > 0)) { press('jump'); this.jumpCd = 18; }
        return s;
      }
    }
    // peligros que caen del cielo (rocas del volcán, cañonazos): salirse de abajo
    if (L.dodge > 0 && f.grounded) {
      const drop = BATTLE.projectiles.find(p => !p.owner && p.vy > 0 && p.y < f.y && f.y - p.y < 750 && Math.abs(p.x - f.x) < 80);
      if (drop && Math.random() < L.dodge + 0.3) { s.x = sign(f.x - drop.x) || 1; return s; }
    }
    // el metro de las azoteas: si viene y estoy en la calle, brinco alto (se mantiene Salto para el salto completo)
    if (st.id === 'city' && f.y > 450 && (st.trainWarn > 0 || (st.train && Math.sign(f.x - st.trainX) === st.trainDir && Math.abs(f.x - st.trainX) < 2600)) && Math.random() < L.dodge + 0.4) {
      if (f.grounded || f.state === 'jumpsquat') { s.jump = true; return s; }
      if (f.jumps > 0 && f.vy > 0 && this.jumpCd <= 0) { press('jump'); this.jumpCd = 20; return s; }
    }
    // proyectiles que vienen hacia mí
    if (L.dodge > 0 && this.shieldT <= 0) {
      const inc = BATTLE.projectiles.find(p => p.owner !== f && p.delay <= 0 && Math.abs(p.y - (f.y - 50)) < 70 && sign(f.x - p.x) === sign(p.vx) && Math.abs(f.x - p.x) < 60 + Math.abs(p.vx) * 8);
      if (inc && Math.random() < L.dodge) {
        if (f.grounded) { this.shieldT = randi(8, 14); }
        else if (!f.airUsed.dodge) { press('shield'); return s; }
      }
    }

    // ---------- objetivo ----------
    const opps = opponentsOf(f).filter(o => !o.dead && o.state !== 'respawn');
    let tgt = null, bd = 1e9;
    for (const o of opps) { const d = Math.abs(o.x - f.x) + Math.abs(o.y - f.y) * 0.6 - (L.killSense > 0.6 ? o.percent * 0.4 : 0); if (d < bd) { bd = d; tgt = o; } }
    const orb = BATTLE.items.find(i => i.type === 'orb');
    const wantItem = !f.item && BATTLE.items.find(i => !i.holder && i.type !== 'orb' && ITEM_DEFS[i.type].kind !== 'consume' && Math.abs(i.x - f.x) < 260 && Math.abs(i.y - f.y) < 60 && i.grounded);
    const heal = BATTLE.items.find(i => !i.holder && ['heart', 'taco', 'star', 'shroom'].includes(i.type) && Math.abs(i.x - f.x) < 400);
    let gx = tgt ? tgt.x : 0, gy = tgt ? tgt.y : st.top;
    let mode = 'fight';
    if (f.finalReady && tgt && Math.abs(tgt.x - f.x) < 520) { press('special'); return s; }
    if (orb && (!tgt || Math.abs(orb.x - f.x) < Math.abs(tgt.x - f.x) + 200)) { gx = orb.x; gy = orb.y + 40; mode = 'orb'; }
    else if (heal && f.percent > 40) { gx = heal.x; gy = heal.y; mode = 'item'; }
    else if (wantItem && Math.random() < 0.5) { gx = wantItem.x; gy = wantItem.y; mode = 'pick'; }
    // objetivos propios de cada modo
    const gm = BATTLE.rules.mode;
    if (gm === 'soccer' && BATTLE.ms.ball) return this.soccer(s, f, L, press, flickX);
    if (gm === 'koth' && mode === 'fight') {
      const zr = Modes.zoneRect(BATTLE);
      if (zr) {
        const inZone = f.x > zr.x + 12 && f.x < zr.x + zr.w - 12 && Math.abs(f.y - zr.top) < 8;
        const near = tgt && Math.abs(tgt.x - f.x) < 90 && Math.abs(tgt.y - f.y) < 80;
        if (!inZone && !near) { gx = zr.x + zr.w / 2; gy = zr.top; mode = 'goto'; }
      }
    }
    if (gm === 'bomb' && BATTLE.ms.bomb) {
      const b = BATTLE.ms.bomb, hold = BATTLE.fighters[b.holder];
      if (hold && hold !== f && !sameTeam(hold, f) && b.t < 300 && Math.abs(hold.x - f.x) < 360 && Math.abs(hold.y - f.y) < 200) {
        s.x = sign(f.x - hold.x) || 1;
        if (f.grounded && (f.x + s.x * 80 < st.left + 30 || f.x + s.x * 80 > st.right - 30)) { s.x = -s.x; if (this.jumpCd <= 0) { press('jump'); this.jumpCd = 30; } }
        return s;
      }
      if (hold === f) this.cool = Math.min(this.cool, 3);
    }
    if (!tgt && mode === 'fight') { s.x = Math.abs(f.x) > 100 ? -sign(f.x) : 0; return s; }

    const dx = gx - f.x, dy = gy - f.y, adx = Math.abs(dx);
    const range = 80 * f.size();
    const safeX = x => x > st.left + 30 && x < st.right - 30;
    const face = sign(dx) || f.face;

    if (!f.grounded && f.state === 'air' && !f.airUsed.dodge && tgt && tgt.state === 'attack' && dist(tgt.x, tgt.y, f.x, f.y) < 120 && Math.random() < L.dodge * 0.25) { press('shield'); return s; }
    // el torero espera la embestida con la verónica: la saca antes de que llegue el golpe
    if (f.id === 'puentin' && tgt && mode === 'fight' && f.grounded && tgt.state === 'attack' && tgt.move && tgt.move.def && this.cool <= 0 && Math.abs(tgt.x - f.x) < 150 && Math.abs(tgt.y - f.y) < 80) {
      const hs = tgt.move.def.hits || [], f0 = hs.length ? Math.min(...hs.map(h => h.f0)) : 0;
      if (f0 - tgt.move.f >= 4 && Math.random() < L.shield * 0.5) { this.cool = L.react + 16; s.x = 0; s.y = 0; press('special'); return s; }
    }
    // ---------- defensa ----------
    if (tgt && mode === 'fight' && f.grounded && this.shieldT <= 0 && tgt.state === 'attack' && Math.abs(tgt.x - f.x) < 140 && Math.random() < L.shield) this.shieldT = randi(8, 20);
    if (f.state === 'shield') this.wasShield = 8;
    else this.wasShield--;
    if (this.shieldT > 0 && f.grounded) {
      s.shield = true;
      // fuera de escudo: agarrar o castigar si el rival quedó cerca
      if (tgt && f.shieldStun === 0 && Math.abs(tgt.x - f.x) < 90 && tgt.state === 'attack' && Math.random() < L.oos * 0.35) { this.shieldT = 0; if (Math.random() < 0.4) press('grab'); else { s.shield = false; press('attack'); } }
      return s;
    }

    if (mode === 'orb') {
      if (dist(f.x, f.y - 50, gx, gy - 40) < 90) { if (this.cool <= 0) { this.cool = L.react; press('attack'); s.y = dy < -60 ? -1 : 0; } }
      else { s.x = sign(dx); if (dy < -100 && this.jumpCd <= 0) { press('jump'); this.jumpCd = 25; } }
      if (!safeX(f.x + sign(dx) * 40) && f.grounded) s.x = 0;
      return s;
    }
    if (mode === 'goto') {
      if (adx > 20) s.x = sign(dx) * (f.grounded ? L.speed : 1);
      if (dy < -60 && this.jumpCd <= 0 && (f.grounded || f.vy > 0) && adx < 280) { press('jump'); this.jumpCd = 24; }
      if (dy > 60 && f.grounded && f.surface && f.surface.plat && adx < 120) { s.y = 1; this.ctrl.flickY = 0; this.ctrl.flickDirY = 1; }
      return s;
    }
    if (mode === 'pick' || mode === 'item') {
      if (adx < 30 && mode === 'pick' && f.grounded) { press('attack'); return s; }
      s.x = sign(dx); return s;
    }

    // ---------- edge-guard: el rival está fuera ----------
    const tOff = tgt.x < st.left - 20 || tgt.x > st.right + 20 || (tgt.y > st.top + 30 && !tgt.grounded);
    if (tOff && L.edgeguard > 0 && Math.random() < L.edgeguard) {
      const side = tgt.x < 0 ? -1 : 1, edgeX = side < 0 ? st.left : st.right;
      if (f.grounded) {
        const standX = edgeX - side * 40;
        s.x = Math.abs(standX - f.x) > 20 ? sign(standX - f.x) : 0;
        // salta a interceptar si viene por arriba del borde y cerca
        if (Math.abs(tgt.x - edgeX) < 200 && tgt.y < st.top + 60 && Math.abs(f.x - standX) < 40 && this.jumpCd <= 0 && f.percent < 150) { press('jump'); s.x = side * 0.5; this.jumpCd = 40; }
        return s;
      }
      const safeOff = f.jumps > 0 && !f.airUsed.sp_u && Math.abs(f.x - edgeX) < 170 && f.y < st.top + 80;
      if (!f.grounded && !safeOff) { s.x = sign(-f.x); if (f.jumps > 0 && f.vy > 0 && this.jumpCd <= 0) { press('jump'); this.jumpCd = 20; } return s; }
      if (!f.grounded && Math.abs(tgt.x - f.x) < 110 && Math.abs(tgt.y - f.y) < 90 && this.cool <= 0) {
        this.cool = L.react;
        if (tgt.y > f.y + 30) s.y = 1; else s.x = sign(tgt.x - f.x) === f.face ? f.face : -f.face;
        press('attack'); return s;
      }
      if (!f.grounded) { s.x = sign(-f.x) * 0.8; if (f.y > st.top - 20 && f.jumps > 0 && this.jumpCd <= 0) { press('jump'); this.jumpCd = 20; } return s; }
    }

    // proyectiles a distancia
    if (adx > 320 && f.grounded && f.id !== 'puentin' && Math.random() < L.proj * 3 && this.cool <= 0) { this.cool = L.react + 20; if (sign(dx) !== f.face) s.x = sign(dx) * 0.4; press('special'); return s; }
    if (f.item && f.item.type === 'gun' && adx < 700 && Math.abs(dy) < 60 && this.cool <= 0) { this.cool = Math.max(8, L.react); f.face = sign(dx); press('attack'); return s; }
    if (f.item && ITEM_DEFS[f.item.type].kind === 'throw' && adx < 450 && this.cool <= 0) { this.cool = 20; s.x = sign(dx); press('grab'); return s; }

    // ---------- castigo: el rival está vulnerable ----------
    const vulnerable = ['land', 'down', 'dizzy', 'helpless'].includes(tgt.state) || (tgt.state === 'attack' && tgt.move && tgt.move.f > (tgt.move.def.dur * 0.6));
    if (vulnerable && adx < range * 1.6 && Math.abs(dy) < 60 && f.grounded && Math.random() < L.punish && this.cool <= 0) {
      this.cool = L.react;
      if (sign(dx) !== f.face) { s.x = face * 0.4; return s; }
      if (tgt.percent > 90 || tgt.state === 'dizzy') { flickX(face); press('attack'); } else if (Math.random() < 0.22) press('grab'); else { s.x = face * 0.6; press('attack'); }
      return s;
    }
    // ---------- persecución aérea (juggle) ----------
    if (tgt.state === 'hitstun' && dy < -60 && adx < 180 && tgt.x > st.left + 60 && tgt.x < st.right - 60 && Math.random() < L.juggle) {
      if (f.grounded && this.jumpCd <= 0) { press('jump'); s.x = face * 0.5; this.jumpCd = 14; return s; }
      if (!f.grounded) {
        s.x = sign(dx) * 0.9;
        if (Math.abs(dy + 50) < 90 && adx < 90 && this.cool <= 0) { this.cool = Math.max(4, L.react); s.x = 0; s.y = dy < -30 ? -1 : 0; press('attack'); }
        else if (f.jumps > 0 && dy < -140 && this.jumpCd <= 0) { press('jump'); this.jumpCd = 16; }
        return s;
      }
    }

    if (adx > range || Math.abs(dy) > 90) {
      s.x = sign(dx) * (f.grounded ? L.speed : 1);
      if (!f.grounded && !safeX(f.x + sign(dx) * 80) && !(tgt.x > st.left && tgt.x < st.right)) s.x = sign(-f.x);
      if (f.grounded && !safeX(f.x + sign(dx) * 60) && !(tgt.x > st.left && tgt.x < st.right)) s.x = 0;
      if (dy < -110 && (f.grounded || f.vy > 0) && this.jumpCd <= 0 && adx < 260) { press('jump'); this.jumpCd = 30 - L.t * 15; }
      if (dy > 80 && f.grounded && f.surface && f.surface.plat && adx < 200 && Math.random() < 0.08) { s.y = 1; this.ctrl.flickY = 0; this.ctrl.flickDirY = 1; }
      if (!f.grounded && f.vy > 0 && dy > 60 && Math.random() < 0.05 + L.t * 0.1) s.y = 1;
      if (Math.random() < 0.004 && f.grounded) press('jump');
      // a nivel alto, retrocede un poco para espaciar (baile)
      if (L.t > 0.6 && adx < range * 1.4 && tgt.state === 'attack' && f.grounded && Math.random() < 0.3) s.x = -sign(dx);
      return s;
    }
    // ---------- en rango ----------
    if (this.cool > 0) { if (Math.random() < 0.3) s.x = sign(dx) * 0.3; return s; }
    if (Math.random() > L.aggro) { this.cool = randi(4, 12); return s; }
    this.cool = L.react + randi(0, Math.round(8 * (1 - L.t)));
    const killPct = 110 - (tgt.weight() - 100) * 0.8;
    const high = tgt.percent > killPct * (1.3 - L.killSense * 0.4);
    if (Math.random() < L.mistake) { press(pick(['attack', 'special', 'grab'])); return s; }
    if (!f.grounded) {
      if (dy < -50) s.y = -1; else if (dy > 50) s.y = 1; else s.x = face === f.face ? face : -f.face;
      press('attack'); return s;
    }
    if (dy < -70) {
      if (high && Math.random() < 0.6) flickY(-1); else s.y = -0.6;
      press('attack'); return s;
    }
    if (face !== f.face && Math.random() < 0.6) { s.x = face * 0.6; return s; }
    if (L.t > 0.6 && Math.random() < L.t) {
      // espaciado: pegado → golpe rápido o agarre; a media distancia → golpe lateral o smash
      if (adx < 45) { if (Math.random() < 0.16) press('grab'); else if (high) { flickY(Math.random() < 0.5 ? 1 : -1); press('attack'); } else press('attack'); }
      else { if (high) flickX(face); else s.x = face * 0.6; press('attack'); }
      return s;
    }
    const r = Math.random();
    if (r < 0.05 + L.t * 0.03) { press('grab'); return s; }
    if (r < 0.2) {
      // el torero no saca la verónica al aire: sin embestida no sirve; mejor banderillas o revolera
      if (f.id === 'puentin') { if (Math.random() < 0.5) s.x = face * 0.9; else s.y = 0.9; } else s.x = face * (Math.random() < 0.5 ? 0.9 : 0);
      press('special'); return s;
    }
    if (high || r < 0.32) {
      const k = Math.random();
      if (k < 0.7) flickX(face); else if (k < 0.85) flickY(1); else flickY(-1);
      press('attack'); return s;
    }
    if (r < 0.55) { s.x = face * 0.6; press('attack'); return s; }
    if (r < 0.65) { s.y = 0.6; press('attack'); return s; }
    press('attack');
    return s;
  }
  // Fútbol: ponerse detrás de la pelota y patear hacia la portería rival
  soccer(s, f, L, press, flickX) {
    const ball = BATTLE.ms.ball;
    if (BATTLE.ms.pause > 0 || ball.y < -5000) { s.x = Math.abs(f.x) > 200 ? -sign(f.x) * 0.5 : 0; return s; }
    const goalDir = f.team === 0 ? 1 : -1;
    const behind = ball.x - goalDir * 58;
    const dx = behind - f.x, bd = dist(f.x, f.y - 50, ball.x, ball.y);
    const behindOk = sign(ball.x - f.x) === goalDir || Math.abs(ball.x - f.x) < 18;
    if (bd < 95 && this.cool <= 0 && Math.random() < 0.35 + L.aggro * 0.6) {
      this.cool = Math.max(4, L.react);
      if (behindOk) {
        if (ball.y < f.y - 115) { s.y = -0.6; press('attack'); }
        else if (!f.grounded) { s.x = goalDir === f.face ? goalDir : -f.face; press('attack'); }
        else if (Math.random() < 0.35 + L.t * 0.35) { flickX(goalDir); press('attack'); }
        else { s.x = goalDir * 0.6; press('attack'); }
        return s;
      }
    }
    s.x = Math.abs(dx) > 14 ? sign(dx) * (f.grounded ? L.speed : 1) : 0;
    // rodear la pelota si estoy del lado equivocado
    if (!behindOk && Math.abs(ball.x - f.x) < 70 && f.grounded && this.jumpCd <= 0) { press('jump'); this.jumpCd = 30; }
    if (ball.y < f.y - 160 && Math.abs(ball.x - f.x) < 160 && this.jumpCd <= 0 && (f.grounded || f.vy > 0)) { press('jump'); this.jumpCd = 26; }
    return s;
  }
}
