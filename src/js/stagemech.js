'use strict';
// ============================================================
//  MECÁNICA PROPIA DE CADA ESCENARIO
//  Cada mundo cambia algo de cómo se pelea o cómo se regresa:
//   Barco ········ el mar: nadas con Salto. Con poco % flotas y brincas alto; con mucho % te hundes.
//   Xochimilco ··· el canal: rebotas como piedrita en el agua (menos entre más % traes).
//   Templo ······· una corriente de aire sube por un lado de la isla y cambia de lado.
//   Volcán ······· fumarolas en el piso que avientan hacia arriba a quien esté encima.
//   Estación ····· aros de impulso a los lados que devuelven el salto y el especial.
//   Azoteas ······ tendederos en las orillas: caes en ellos y rebotas como trampolín.
//   Estadio ······ riego automático: la cancha mojada resbala.
//   Pirámide ····· un rayo de sol recorre las terrazas y cura a quien esté debajo.
//  Todo lo que se dibuja sale de st.t o de datos que ya viajan en línea, así el invitado lo ve igual.
// ============================================================

// qué tanto "flota" un personaje según su daño: 1 fresco, 0 muy golpeado
function floatK(f, from, span) {
  const B = BATTLE, hp = B && B.rules.mode === 'hp' && f.hp !== undefined;
  const pct = hp ? (1 - f.hp / (f.maxHp || 100)) * 150 : f.percent;
  return clamp(1 - (pct - from) / span, 0, 1);
}
// sale de un especial hacia arriba o de un esquive: vuelve a poder moverse (no recupera el especial)
function freeFromHelpless(f) {
  if (f.state === 'helpless' || f.state === 'airdodge') f.setState('air');
  else if (f.state === 'attack' && f.move && f.move.def.helpless) { f.move = null; f.setState('air'); }
}
const STAGE_MECH = {};
// la pelea que se está dibujando: en línea el invitado no tiene BATTLE, solo la vista que manda el anfitrión
function shownBattle() { return BATTLE || (typeof Net !== 'undefined' && Net.view) || null; }

// ---------------- Barco: el mar ----------------
const SEA_Y = 172, SEA_FLOAT = SEA_Y + 85; // superficie del agua y línea donde flota (pies): asoman hombros y cabeza
STAGE_MECH.ship = {
  init(st) { st.blast = { l: -1350, r: 1350, t: -1050, b: 640 }; }, // el fondo del mar está más cerca
  mech(f) {
    const s = this.solids[0], c = f.ctrl;
    if (f.grounded) f.swimStam = 100;
    if (f.grounded || ['ledge', 'climb', 'grabbed', 'holding', 'respawn'].includes(f.state)) { f.swim = false; return; }
    if (!f.swim) {
      if (f.y < SEA_Y + 6 || (f.vy < 0 && f.y < SEA_FLOAT + 10)) return; // saliendo de un brinco no vuelve a entrar
      // al agua: el mar frena el golpe
      f.swim = true; if (f.swimStam === undefined) f.swimStam = 100;
      f.lx *= 0.45; f.ly *= 0.25; f.vy = Math.min(f.vy, 4); f.fastFall = false;
      freeFromHelpless(f);
      Audio8.sfx('splash'); spawnFx('drop', f.x, SEA_Y); spawnFx('ring', f.x, SEA_Y, { col: '#e6f8ff', r: 50 });
    }
    const k = floatK(f, 20, 100);
    if (f.lastHitBy) f.lastHitTimer = Math.max(f.lastHitTimer, 2); // si se ahoga, cuenta para quien lo tiró al agua
    // flotación: con poco % sube solo; con mucho % se hunde
    f.vy = approach(f.vy, -2.2 + 4.9 * (1 - k), 0.25);
    f.lx *= 0.9; f.ly *= 0.85;
    if (f.y < SEA_FLOAT && f.vy < 0) { f.y = SEA_FLOAT; f.vy = 0; }
    f.vx = approach(f.vx, c.x * (2 + 2 * k), 0.3);
    // el casco no deja nadar por debajo
    const hl = s.x - 10, hr = s.x + s.w + 10, hw = 18 * f.size();
    if (f.x + hw > hl && f.x - hw < hr) { f.x = f.x < (hl + hr) / 2 ? hl - hw : hr + hw; f.vx = 0; }
    if (f.state === 'hitstun' || !c.pressed('jump')) return;
    c.consume('jump');
    if (f.swimStam <= 0) { spawnFx('drop', f.x, f.y - 30); return; }
    if (f.y <= SEA_FLOAT + 28) {
      // brinco fuera del agua: con poco % alcanza la orilla y devuelve el salto
      f.swim = false; f.swimStam -= 25; f.setState('air');
      f.vy = -(6 + 13 * k);
      if (k > 0.35) { f.jumps = Math.max(f.jumps, 1); f.airUsed = {}; }
      Audio8.sfx('splash'); spawnFx('drop', f.x, SEA_Y); spawnFx('ring', f.x, SEA_Y, { col: '#e6f8ff', r: 40 });
    } else {
      // brazada hacia arriba
      f.swimStam -= 12; f.vy = Math.min(f.vy, -(2 + 6 * k));
      Audio8.sfx('swing', 0.5); spawnFx('drop', f.x, f.y - 40);
    }
  },
  drawFG(c) {
    // quien nada: burbujas y un círculo en la superficie para no perderlo de vista
    const B = shownBattle(); if (!B) return;
    for (const f of B.fighters) {
      if (!f.swim || f.dead) continue;
      const t = this.t, depth = f.y - SEA_FLOAT;
      c.strokeStyle = 'rgba(230,250,255,.8)'; c.lineWidth = 2.5;
      c.beginPath(); c.ellipse(f.x, SEA_Y + 2, 34 + Math.sin(t * 0.2) * 5, 7, 0, 0, TAU); c.stroke();
      c.fillStyle = 'rgba(230,250,255,.7)';
      for (let i = 0; i < 3; i++) { const by = f.y - 60 - ((t * 1.6 + i * 23) % 60); if (by > SEA_Y) { c.beginPath(); c.arc(f.x + Math.sin(t * 0.1 + i) * 10, by, 3 + i, 0, TAU); c.fill(); } }
      if (depth > 40) { c.fillStyle = f.color || '#fff'; c.beginPath(); c.moveTo(f.x, SEA_Y - 24); c.lineTo(f.x - 10, SEA_Y - 40); c.lineTo(f.x + 10, SEA_Y - 40); c.closePath(); c.fill(); }
    }
  },
  fgAlpha: 0.8, // el agua deja ver a quien está nadando
};

// ---------------- Xochimilco: rebotes en el canal ----------------
const CANAL_Y = 50;
STAGE_MECH.xochi = {
  mech(f) {
    const prev = f._wy === undefined ? f.y : f._wy; f._wy = f.y;
    if (f.grounded) { f.skips = 0; return; }
    if (['ledge', 'climb', 'grabbed', 'holding', 'respawn'].includes(f.state)) return;
    if (f.sunk) { if (f.lastHitBy) f.lastHitTimer = Math.max(f.lastHitTimer, 2); if (f.state !== 'helpless') f.setState('helpless'); f.vy = 4; f.vx *= 0.85; f.lx = f.ly = 0; if (this.t % 6 === 0) spawnFx('drop', f.x, CANAL_Y); return; }
    const hull = this.solids[0];
    if (f.x > hull.x - 6 && f.x < hull.x + hull.w + 6) return; // encima de la trajinera no hay agua
    if (!(prev < CANAL_Y && f.y >= CANAL_Y && f.vy + f.ly > 1)) return;
    const k = floatK(f, 10, 120) * Math.pow(0.7, f.skips || 0);
    Audio8.sfx('splash'); spawnFx('drop', f.x, CANAL_Y); spawnFx('ring', f.x, CANAL_Y, { col: '#e6f8ff', r: 46 });
    if (k < 0.12 || (f.skips || 0) >= 3) {
      // demasiado golpeado para rebotar: se lo lleva el canal
      f.sunk = true; f.setState('helpless'); f.lx = f.ly = 0; f.vy = 4;
      spawnFx('text', f.x, CANAL_Y - 80, { txt: '¡Glu, glu!', col: '#a9def9', size: 30 });
      return;
    }
    // rebote de piedrita: sube según qué tan fresco esté, conserva algo del impulso
    f.skips = (f.skips || 0) + 1;
    f.y = CANAL_Y - 1; f.vy = -(7 + 13 * k); f.ly = 0; f.lx *= 0.65; f.vx = f.vx * 0.6 + f.ctrl.x * f.ch.air * 0.5; f.fastFall = false;
    if (f.state === 'hitstun') { f.hitstun = 0; f.setState('air'); f.tumbling = false; }
    freeFromHelpless(f);
  },
};

// ---------------- Templo: corriente de aire ----------------
const UPDRAFT_T = 600;
function updraft(st) {
  const ph = st.t % UPDRAFT_T;
  return { side: Math.floor(st.t / UPDRAFT_T) % 2 ? 1 : -1, k: clamp(ph / 40, 0, 1) * clamp((UPDRAFT_T - ph) / 40, 0, 1), x: 0 };
}
STAGE_MECH.temple = {
  mech(f) {
    if (f.grounded || ['ledge', 'climb', 'grabbed', 'holding', 'respawn'].includes(f.state)) return;
    const u = updraft(this), cx = u.side * (this.right + 175);
    if (u.k <= 0 || Math.abs(f.x - cx) > 85 || f.y < -380 || f.y > 700) return;
    f.vy = Math.max(f.vy - 1.9 * u.k, -8.5); f.fastFall = false;
    if (f.ly > 0) f.ly *= 0.9;
  },
  draw(c) {
    const u = updraft(this), cx = u.side * (this.right + 175), t = this.t;
    if (u.k <= 0) return;
    c.save(); c.globalAlpha = u.k;
    const g = c.createLinearGradient(cx - 85, 0, cx + 85, 0);
    g.addColorStop(0, 'rgba(200,240,255,0)'); g.addColorStop(0.5, 'rgba(210,245,255,.3)'); g.addColorStop(1, 'rgba(200,240,255,0)');
    c.fillStyle = g; c.fillRect(cx - 85, -380, 170, 1080);
    // hojas y plumas que suben girando
    for (let i = 0; i < 16; i++) {
      const y = 700 - ((t * 5 + i * 67) % 1080), x = cx + Math.sin(t * 0.05 + i * 1.7) * 55;
      c.save(); c.translate(x, y); c.rotate(t * 0.08 + i);
      c.fillStyle = i % 3 ? '#9ad17b' : '#f1faee'; c.beginPath(); c.ellipse(0, 0, 9, 3.5, 0, 0, TAU); c.fill();
      c.restore();
    }
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const y = 650 - ((t * 7 + i * 170) % 1000); c.beginPath(); c.moveTo(cx - 50 + i * 20, y); c.lineTo(cx - 50 + i * 20, y - 60); c.stroke(); }
    c.restore();
  },
};

// ---------------- Volcán: fumarolas ----------------
const VENTS = [-250, 250], VENT_T = 600;
function ventPhase(st, i) { return (st.t + i * (VENT_T / 2)) % VENT_T; } // 0–80 avisa, 80–130 truena
STAGE_MECH.volcano = {
  mech(f) {
    if (this.lavaPhase !== 'idle' || f.intangibleToStage()) return;
    const floor = this.solids[0].y;
    VENTS.forEach((vx, i) => {
      const ph = ventPhase(this, i);
      if (ph < 80 || ph >= 130 || Math.abs(f.x - vx) > 40 || f.y < floor - 300 || f.y > floor + 2 || (f.ventT || 0) > this.t) return;
      f.ventT = this.t + 50;
      applyHit(null, f, { dmg: 5, ang: 90, bkb: 0, kbg: 0, effect: 'fire', sfx: 'fire' }, 1, { unblockable: true, noLaunch: true });
      // empujón fijo hacia arriba: no crece con el %, así que nunca saca por sí sola
      if (!f.dead && f.state === 'hitstun') { f.hitstun = 16; f.grounded = false; f.surface = null; f.vy = -17; f.tumble = false; }
    });
  },
  update() {
    if (this.lavaPhase !== 'idle') return;
    VENTS.forEach((vx, i) => { const ph = ventPhase(this, i); if (ph === 80) { Audio8.sfx('explosion', 0.6); shake(4); } if (ph === 0) Audio8.sfx('fire', 0.6); });
  },
  draw(c) {
    const floor = this.solids[0].y, t = this.t;
    VENTS.forEach((vx, i) => {
      const ph = ventPhase(this, i), idle = this.lavaPhase === 'idle';
      // grieta en el piso
      c.fillStyle = '#1a0a08'; c.beginPath(); c.ellipse(vx, floor + 3, 30, 6, 0, 0, TAU); c.fill();
      c.fillStyle = idle && ph < 130 ? `rgba(255,${ph < 80 ? 140 : 210},60,${ph < 80 ? 0.5 + 0.5 * Math.sin(t * 0.4) : 1})` : 'rgba(255,110,40,.35)';
      c.beginPath(); c.ellipse(vx, floor + 2, 20, 3.5, 0, 0, TAU); c.fill();
      if (!idle) return;
      if (ph < 80) { // burbujas de aviso
        c.fillStyle = 'rgba(255,200,120,.8)';
        for (let k = 0; k < 4; k++) { const y = floor - ((t * 2 + k * 11) % 40); c.beginPath(); c.arc(vx + Math.sin(t * 0.3 + k) * 12, y, 3, 0, TAU); c.fill(); }
      } else if (ph < 130) { // columna de vapor ardiente
        const h = Math.min(300, (ph - 80) * 30), a = ph > 118 ? (130 - ph) / 12 : 1;
        const g = c.createLinearGradient(0, floor, 0, floor - h);
        g.addColorStop(0, `rgba(255,190,90,${0.85 * a})`); g.addColorStop(0.4, `rgba(255,110,40,${0.55 * a})`); g.addColorStop(1, 'rgba(120,80,70,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(vx - 24, floor); c.quadraticCurveTo(vx - 48, floor - h * 0.6, vx - 30 + Math.sin(t * 0.3) * 8, floor - h); c.lineTo(vx + 30 + Math.sin(t * 0.3 + 1) * 8, floor - h); c.quadraticCurveTo(vx + 48, floor - h * 0.6, vx + 24, floor); c.closePath(); c.fill();
      }
    });
  },
};

// ---------------- Estación orbital: aros de impulso ----------------
function ringPos(st, side) { return { x: side * 620, y: -60 + Math.sin(st.t * 0.012 + (side > 0 ? 0 : Math.PI)) * 150 }; }
STAGE_MECH.space = {
  mech(f) {
    if (f.grounded || f.intangibleToStage() || ['ledge', 'climb', 'grabbed', 'holding'].includes(f.state) || (f.ringT || 0) > this.t) return;
    for (const side of [-1, 1]) {
      const p = ringPos(this, side);
      if (dist(f.x, f.y - f.h * 0.5, p.x, p.y) > 44) continue;
      f.ringT = this.t + 90;
      f.jumps = f.ch.jumps - 1; f.airUsed = {}; f.fastFall = false;
      if (f.state !== 'hitstun') { freeFromHelpless(f); f.vy = Math.min(f.vy, -9); f.vx = -side * 5; }
      Audio8.sfx('djump', 1.3); spawnFx('ring', p.x, p.y, { col: '#48cae4', r: 70 }); spawnFx('text', p.x, p.y - 70, { txt: '¡Impulso!', col: '#48cae4', size: 26 });
      return;
    }
  },
  draw(c) {
    const t = this.t;
    for (const side of [-1, 1]) {
      const p = ringPos(this, side), pulse = 1 + Math.sin(t * 0.15 + side) * 0.06;
      c.save(); c.translate(p.x, p.y); c.scale(pulse, pulse);
      c.strokeStyle = 'rgba(72,202,228,.25)'; c.lineWidth = 16; c.beginPath(); c.ellipse(0, 0, 40, 46, 0, 0, TAU); c.stroke();
      c.strokeStyle = '#48cae4'; c.lineWidth = 5; c.beginPath(); c.ellipse(0, 0, 40, 46, 0, 0, TAU); c.stroke();
      c.strokeStyle = '#e0fbff'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, 40, 46, 0, -1.2, 0.2); c.stroke();
      // flecha hacia la estación
      c.fillStyle = 'rgba(224,251,255,.8)'; c.beginPath(); c.moveTo(-side * 16, 0); c.lineTo(side * 4, -10); c.lineTo(side * 4, 10); c.closePath(); c.fill();
      c.restore();
    }
  },
};

// ---------------- Azoteas: tendederos ----------------
// a media altura entre la calle y las azoteas: atrapan al que se cae de la orilla y son la salida de la calle cuando viene el metro
const ROPES = [{ x0: -1340, x1: -1150, y: 330 }, { x0: 1150, x1: 1340, y: 330 }];
STAGE_MECH.city = {
  mech(f) {
    const prev = f._ry === undefined ? f.y : f._ry; f._ry = f.y;
    if (f.grounded || f.intangibleToStage() || ['ledge', 'climb', 'grabbed', 'holding'].includes(f.state)) return;
    for (const r of ROPES) {
      if (f.x < r.x0 + 4 || f.x > r.x1 - 4 || !(prev < r.y && f.y >= r.y) || f.vy + f.ly <= 0.5 || f.ctrl.y > 0.6) continue;
      const vin = f.vy + f.ly;
      f.y = r.y - 1; f.vy = -clamp(vin * 1.05 + 6, 20, 25); f.ly = 0; f.lx *= 0.8; f.fastFall = false; // rebote de trampolín: alcanza la orilla de la azotea
      f.vx += (r.x0 < 0 ? 1 : -1) * 2.5; // rebota un poco hacia los edificios
      if (f.state === 'hitstun') { f.hitstun = 0; f.setState('air'); f.tumbling = false; }
      freeFromHelpless(f);
      Audio8.sfx('djump', 0.7); spawnFx('dust', f.x, r.y);
      return;
    }
  },
  draw(c) {
    const t = this.t;
    for (const r of ROPES) {
      // se hunde donde alguien está cerca
      let sagX = (r.x0 + r.x1) / 2, sag = 8;
      const B = shownBattle();
      if (B) for (const f of B.fighters) if (!f.dead && f.x > r.x0 && f.x < r.x1 && Math.abs(f.y - r.y) < 40) { sagX = f.x; sag = 8 + (40 - Math.abs(f.y - r.y)) * 0.7; }
      const out = r.x0 < 0 ? r.x0 : r.x1, inn = r.x0 < 0 ? r.x1 : r.x0;
      // poste en la orilla de afuera y armella en el edificio
      c.fillStyle = '#39435a'; c.fillRect(out - 4, r.y - 70, 8, 380); c.fillStyle = '#566078'; c.fillRect(out - 10, r.y - 74, 20, 8);
      c.fillStyle = '#6c7892'; c.fillRect(inn - 5, r.y - 6, 10, 12);
      c.strokeStyle = '#e8e3d3'; c.lineWidth = 3; c.beginPath(); c.moveTo(r.x0, r.y); c.quadraticCurveTo(sagX, r.y + sag * 2, r.x1, r.y); c.stroke();
      // ropa tendida que se mece
      const cols = ['#e63946', '#ffd166', '#48cae4', '#f1faee', '#2dc653'];
      for (let i = 0; i < 5; i++) {
        const x = r.x0 + 20 + i * 34, u = (x - r.x0) / (r.x1 - r.x0), y = r.y + sag * 2 * 2 * u * (1 - u) * (1 - Math.abs(x - sagX) / 300 * 0), sw = Math.sin(t * 0.05 + i) * 0.12;
        c.save(); c.translate(x, y); c.rotate(sw); c.fillStyle = cols[i];
        if (i % 2) { c.fillRect(-11, 0, 22, 26); c.fillRect(-15, 0, 30, 9); } else { c.fillRect(-9, 0, 8, 24); c.fillRect(1, 0, 8, 24); c.fillRect(-9, 0, 18, 8); }
        c.fillStyle = '#b08968'; c.fillRect(-2, -3, 4, 6); c.restore();
      }
    }
  },
};

// ---------------- Estadio: riego automático ----------------
const SPRINKLERS = [-840, -420, 0, 420, 840];
STAGE_MECH.stadium = {
  init(st) { st.wet = 0; st.riegoWarn = 0; st.nextRiego = 1300; },
  update() {
    if (this.soccer) return;
    if (this.wet > 0) { this.wet--; if (this.wet % 40 === 0) Audio8.sfx('splash', 0.35); return; }
    if (this.riegoWarn > 0) { if (--this.riegoWarn === 0) { this.wet = 540; Audio8.sfx('splash'); } return; }
    if (--this.nextRiego <= 0) { this.nextRiego = randi(1500, 2100); this.riegoWarn = 100; warnBanner('¡Riego automático! La cancha va a resbalar', '#48cae4'); }
  },
  slick(f) { return this.wet > 0 && f.surface === this.solids[0] ? 0.22 : 1; },
  draw(c) {
    if (this.soccer) return;
    const s = this.solids[0], t = this.t;
    if (this.wet > 0) {
      const a = Math.min(1, this.wet / 40, (540 - this.wet) / 20);
      const g = c.createLinearGradient(0, s.y - 30, 0, s.y + 10);
      g.addColorStop(0, 'rgba(170,225,255,0)'); g.addColorStop(0.7, `rgba(170,225,255,${0.35 * a})`); g.addColorStop(1, `rgba(220,245,255,${0.55 * a})`);
      c.fillStyle = g; c.fillRect(s.x, s.y - 30, s.w, 40);
      c.fillStyle = `rgba(255,255,255,${0.7 * a})`;
      for (let i = 0; i < 40; i++) c.fillRect(s.x + ((i * 97 + t * 0.8) % s.w), s.y + 1 + (i % 3) * 2, 26 + (i % 4) * 8, 2);
      // charquitos que reflejan a quien pasa
      const B = shownBattle();
      if (B) for (const f of B.fighters) if (!f.dead && f.grounded && f.surface === s) { c.fillStyle = `rgba(200,235,255,${0.35 * a})`; c.beginPath(); c.ellipse(f.x, s.y + 3, 46, 6, 0, 0, TAU); c.fill(); }
    }
    for (const x of SPRINKLERS) {
      c.fillStyle = '#39435a'; c.fillRect(x - 6, s.y - 10, 12, 10); c.fillStyle = '#9aa5b1'; c.fillRect(x - 3, s.y - 16, 6, 7);
      if (this.wet <= 0 && !(this.riegoWarn > 0 && Math.floor(t / 6) % 2)) continue;
      const on = this.wet > 0, spin = t * 0.09 + x;
      for (let k = 0; k < (on ? 26 : 5); k++) {
        const u = ((t * 0.03 + k / 26) % 1), dir = Math.sin(spin + k * 0.9) > 0 ? 1 : -1, dx = dir * u * 200, dy = -Math.sin(u * Math.PI) * 130;
        c.fillStyle = `rgba(215,240,255,${0.9 - u * 0.5})`; c.beginPath(); c.arc(x + dx, s.y - 16 + dy, 3.5 - u * 1.5, 0, TAU); c.fill();
      }
      if (on) { c.fillStyle = 'rgba(220,245,255,.12)'; c.beginPath(); c.ellipse(x, s.y - 60, 200, 70, 0, 0, TAU); c.fill(); }
    }
  },
};

// ---------------- Pirámide: rayo de sol que cura ----------------
function sunX(st) { return Math.sin(st.t * 0.0021) * 1250; }
STAGE_MECH.pyramid = {
  mech(f) {
    if (!f.grounded || f.state === 'hitstun' || this.t % 20 || Math.abs(f.x - sunX(this)) > 95) return;
    const hpMode = BATTLE.rules.mode === 'hp' && f.hp !== undefined;
    if (hpMode ? f.hp >= f.maxHp : f.percent <= 0) return;
    if (hpMode) f.hp = Math.min(f.maxHp, f.hp + 1); else f.percent = Math.max(0, f.percent - 1);
    spawnFx('spark', f.x + rand(-20, 20), f.y - rand(20, 100), { col: '#fff1a8' });
  },
  draw(c) {
    const x = sunX(this), t = this.t;
    const g = c.createLinearGradient(x - 110, 0, x + 110, 0);
    g.addColorStop(0, 'rgba(255,240,170,0)'); g.addColorStop(0.5, `rgba(255,240,170,${0.42 + Math.sin(t * 0.05) * 0.06})`); g.addColorStop(1, 'rgba(255,240,170,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(x - 60, -1700); c.lineTo(x + 60, -1700); c.lineTo(x + 110, 900); c.lineTo(x - 110, 900); c.closePath(); c.fill();
    // mancha de luz en cada terraza que toca
    for (const s of this.solids.concat(this.plats)) if (x > s.x - 60 && x < s.x + s.w + 60) {
      const gg = c.createRadialGradient(x, s.y, 4, x, s.y, 110); gg.addColorStop(0, 'rgba(255,250,200,.75)'); gg.addColorStop(1, 'rgba(255,240,170,0)');
      c.fillStyle = gg; c.beginPath(); c.ellipse(x, s.y, 110, 16, 0, 0, TAU); c.fill();
    }
    c.fillStyle = 'rgba(255,250,210,.8)';
    for (let i = 0; i < 18; i++) { const y = 900 - ((t * 2 + i * 150) % 2600), dx = Math.sin(t * 0.02 + i * 2.1) * 70; c.fillRect(x + dx, y, 3, 3); }
  },
};

// Instala la mecánica sobre el escenario ya armado (lógica, arte y todo)
(function installStageMech() {
  for (const id of Object.keys(STAGE_MECH)) {
    const base = STAGE_DEFS[id];
    if (!base || base._mech) continue;
    const wrapped = opts => {
      const st = base(opts), M = STAGE_MECH[id];
      if (M.init) M.init(st);
      if (M.mech) st.mech = M.mech;
      if (M.slick) st.slick = M.slick;
      if (M.update) { const u = st.update; st.update = function () { if (u) u.call(this); M.update.call(this); }; }
      if (M.draw) { const d = st.drawStage; st.drawStage = function (c) { if (d) d.call(this, c); M.draw.call(this, c); }; }
      if (M.drawFG || M.fgAlpha) {
        const d = st.drawFG;
        st.drawFG = function (c) {
          if (d) { c.save(); if (M.fgAlpha) c.globalAlpha *= M.fgAlpha; d.call(this, c); c.restore(); }
          if (M.drawFG) M.drawFG.call(this, c);
        };
      }
      return st;
    };
    wrapped._mech = true; wrapped._art = base._art;
    STAGE_DEFS[id] = wrapped;
  }
})();

// pose de nado: brazadas alternadas, piernas pataleando
function swimPose(t) {
  const a = Math.sin(t * 7), b = Math.sin(t * 7 + Math.PI);
  return mkPose({ grounded: false, lean: 0.35, armF: [2.2 + a * 0.9, 0.4], armB: [2.2 + b * 0.9, 0.4], legF: [0.3 + b * 0.35, -0.2], legB: [-0.2 + a * 0.35, -0.2] });
}

// el menú de escenarios cuenta la mecánica de cada uno
{
  const D = {
    temple: 'Ráfagas de viento y una corriente de aire que sube por un lado de la isla: úsala para regresar.',
    volcano: 'La lava sube y llueven rocas. Las fumarolas del piso te avientan hacia arriba.',
    ship: 'El barco se mece y disparan cañonazos. Si caes al mar nadas con Salto: con poco % flotas y brincas alto; con mucho % te hundes.',
    space: 'Baja gravedad y meteoritos. Los aros de impulso a los lados te devuelven el salto y el especial.',
    city: 'Mundo gigante: edificios, elevadores y el metro. Los tendederos de las orillas rebotan como trampolín.',
    stadium: 'Cancha enorme con balonazos desde la tribuna. Cuando prenden el riego, la cancha resbala.',
    xochi: 'Una trajinera que se mece y un ajolote gigante. Si caes al canal rebotas como piedrita; con mucho % te hundes.',
    pyramid: 'Mundo gigante con Quetzalcóatl cruzando el cielo. Un rayo de sol recorre las terrazas y cura a quien esté debajo.',
  };
  for (const s of STAGE_INFO) if (D[s.id]) s.desc = D[s.id];
}
