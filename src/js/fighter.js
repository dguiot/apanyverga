'use strict';
// caída con peso (al bajar pesa más que al subir) y ventana de parry al levantar el escudo
const PHYS = { fallGrav: 1.38, fallMax: 1.12, rise: 1.3, parry: 5 };
const LATE_NORMALS = ['jab1', 'ftilt', 'utilt', 'dtilt', 'dash'];
PHYS.jumpK = Math.sqrt(PHYS.rise); // saltos más rápidos con la misma altura
PHYS.djumpK = 1.06; // el doble salto sube ~12% más: es la herramienta para regresar
// ============================================================
//  LUCHADOR: máquina de estados, física, golpes
// ============================================================
const COUNTER_HIT = { anim: 'slash', dur: 32, hits: [HB(4, 8, 44, -50, 38, 10, 40, 9, 12, { effect: 'slash', sfx: 'bighit' })] };
const LAUNCH_DECAY = 0.31;
const SPECIAL_SPEED = 1.15;
const AIM = 0.33; // cuánto hay que inclinar el stick para dirigir un golpe // los especiales (menos la recuperación) corren un poco más rápido

const MOVE_CANCEL = new Set(['jab1', 'jab2', 'jab3', 'ftilt', 'utilt', 'dtilt', 'dash']);
// poses de movimiento
const DASH_BURST = mkPose({ lean: 0.55, legF: [1.15, -1.3], legB: [-0.85, -0.15], armF: [-0.4, 1.8], armB: [1.3, 1.6], bodyY: 2 });
const BRAKE_POSE = mkPose({ lean: -0.32, legF: [0.75, -0.25], legB: [-0.35, -0.8], armF: [1.4, 1.2], armB: [1.1, 1.3], bodyY: 3 });
const SKID_POSE = mkPose({ lean: -0.42, legF: [0.95, -0.3], legB: [-0.25, -0.95], armF: [2.0, 0.8], armB: [1.6, 1.0], bodyY: 2 });
const FLIP_TUCK = mkPose({ grounded: false, lean: 0.3, legF: [1.9, -2.4], legB: [1.6, -2.3], armF: [1.6, 1.4], armB: [1.3, 1.5] });
const FLIP_T = 20;
const HOVER_POSE = mkPose({ grounded: false, lean: 0.05, legF: [0.6, -0.9], legB: [0.1, -0.6], armF: [1.9, 0.5], armB: [1.6, 0.6], face: 'angry' });
const GLIDE_POSE = mkPose({ grounded: false, lean: 0.55, legF: [0.2, -0.3], legB: [-0.3, -0.2], armF: [2.3, 0.1], armB: [-2.2, 0.1] });
class Fighter {
  constructor(port, id, ctrl, opts = {}) {
    this.port = port; this.id = id; this.ch = CHARS[id]; this.moves = buildMoveset(id);
    this.ctrl = ctrl; this.cpu = !!opts.cpu; this.color = PLAYER_COLORS[port];
    this.stocks = opts.stocks || 3; this.percent = 0; this.dead = false; this.respawnT = 0;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.lx = 0; this.ly = 0; this.face = 1;
    this.state = 'air'; this.sf = 0; this.grounded = false; this.surface = null;
    this.jumps = this.ch.jumps - 1; this.move = null;
    this.hitlag = 0; this.hitstun = 0; this.tumble = false; this.invuln = 0;
    this.shieldHP = 100; this.shieldStun = 0; this.dropT = 0; this.fastFall = false;
    this.airUsed = {}; this.item = null; this.finalReady = false;
    this.starTime = 0; this.bigTime = 0; this.scale = 1; this.hidden = false;
    this.stats = { kos: 0, falls: 0, dealt: 0, sd: 0 };
    this.pose = mkPose({}); this.phase = 0; this.flinch = 0; this.armorFlash = 0;
    this.ledge = null; this.ledgeCd = 0; this.grabbing = null; this.grabbedBy = null; this.grabT = 0;
    this.lastHitBy = null; this.lastHitTimer = 0; this.jabWin = 0; this.jabNext = null;
    this.landLag = 0; this.jumpFromTap = false; this.stateT = 0; this.score = 0;
  }
  // ---------- propiedades ----------
  size() { return this.ch.size * this.scale; }
  get h() { return 104 * skOf(this.id).bodyK * this.size(); }
  weight() { return this.ch.weight * (this.bigTime > 0 ? 1.45 : 1) * (this.weightMul || 1); }
  tr() { const m = BATTLE && BATTLE.mods && BATTLE.mods.traction, st = BATTLE && BATTLE.stage; return this.ch.traction * (m || 1) * (st && st.slick ? st.slick(this) : 1); }
  dmgMult() { const a = abil(this), b = typeof CHAR_BAL !== 'undefined' && CHAR_BAL[this.id]; return (this.bigTime > 0 ? 1.3 : 1) * (a.dmg ? a.dmg(this) : 1) * (b && b.dmg || 1); }
  kbMult() { const a = abil(this), b = typeof CHAR_BAL !== 'undefined' && CHAR_BAL[this.id]; return (this.bigTime > 0 ? 1.2 : 1) * (a.kb ? a.kb(this) : 1) * (b && b.kb || 1); }
  hurtbox() {
    const s = this.size();
    const crouch = this.state === 'crouch' || (this.move && this.move.def.crouch);
    const h = (crouch ? 68 : this.state === 'ledge' ? 92 : this.state === 'down' ? 40 : 104) * s * skOf(this.id).bodyK;
    return { x: this.x - 20 * s, y: this.y - h, w: 40 * s, h };
  }
  inWindow(w) { return this.move && w && this.move.f >= w[0] && this.move.f <= w[1]; }
  hasArmor() { return this.inWindow(this.move && this.move.def.armor); }
  inCounter() { return this.state === 'attack' && !!this.move && this.inWindow(this.move.def.counter); }
  inReflect() { return this.state === 'attack' && !!this.move && this.inWindow(this.move.def.reflect); }
  intangibleToStage() { return this.invuln > 0 || this.hidden || this.state === 'respawn' || this.dead; }
  setState(s) {
    if (s !== 'attack') this.move = null;
    if (this.state !== s) { this.state = s; this.sf = 0; }
  }
  // ---------- ciclo ----------
  update() {
    const B = BATTLE;
    if (this.dead) {
      if (this.stocks > 0 && --this.respawnT <= 0) this.respawn();
      return;
    }
    this.invuln = Math.max(0, this.invuln - 1);
    this.flinch = Math.max(0, this.flinch - 1);
    this.armorFlash = Math.max(0, this.armorFlash - 1);
    this.ledgeCd = Math.max(0, this.ledgeCd - 1);
    this.dropT = Math.max(0, this.dropT - 1);
    this.lastHitTimer = Math.max(0, this.lastHitTimer - 1);
    if (this.lastHitTimer === 0) this.lastHitBy = null;
    if (this.starTime > 0) { this.starTime--; if (this.starTime % 4 === 0) spawnFx('spark', this.x + rand(-20, 20), this.y - rand(10, 90), { col: `hsl(${rand(0, 360)},90%,65%)` }); }
    if (this.bigTime > 0) { this.bigTime--; if (this.bigTime === 0) Audio8.sfx('shrink'); }
    this.scale = approach(this.scale, this.bigTime > 0 ? 1.45 : (this.baseScale || 1), 0.03);
    if (this.state !== 'shield') this.shieldHP = Math.min(100, this.shieldHP + 0.16);
    if (this.hitlag > 0) { this.hitlag--; return; }
    this.sf++; this.stateT++;
    if (this.flipT > 0) this.flipT--;
    if (this.stretch > 0) this.stretch = Math.max(0, this.stretch - 0.12);
    this.jabWin = Math.max(0, this.jabWin - 1);
    this.runState();
    if (this.dead) return;
    abilityTick(this);
    this.physics();
    if (B.stage.mech && !this.dead) B.stage.mech(this); // agua, corrientes, aros, tendederos… (stagemech.js)
    this.checkLedge();
    this.checkBlast();
    this.updatePose();
  }

  runState() {
    const c = this.ctrl, ch = this.ch;
    switch (this.state) {
      case 'idle': case 'walk': case 'crouch':
        if (this.groundActions()) return;
        if (c.y > 0.6) { if (this.state !== 'crouch') this.setState('crouch'); if (this.surface && this.surface.plat && (c.digital ? this.sf >= 7 : c.downFlick(3))) return this.dropThrough(); }
        else if (Math.abs(c.x) > 0.25) {
          if (c.sideFlick(3) && Math.abs(c.x) > 0.75) { this.face = sign(c.x); this.setState('dash'); this.vx = this.face * ch.run * 0.95; spawnFx('dust', this.x - this.face * 16, this.y - 4); return; }
          // la dirección que sigue apretada después de un golpe o de aterrizar sigue corriendo
          // (con teclado siempre: no hay "medio stick" para caminar)
          if (Math.abs(c.x) > 0.5 && (c.digital || (this.resumeRun && Math.abs(c.x) > 0.8) || (c.fullX || 0) >= 8)) {
            this.resumeRun = false; this.face = sign(c.x); this.setState('run'); this.vx = approach(this.vx, this.face * ch.run * 0.75, 4); return;
          }
          if (this.state !== 'walk') this.setState('walk');
          this.face = sign(c.x);
          this.vx = approach(this.vx, c.x * ch.walk * (Math.abs(c.x) > 0.8 ? 1.25 : 1), 0.6);
        } else { this.resumeRun = false; if (this.state !== 'idle') this.setState('idle'); }
        break;
      case 'dash':
        if (this.groundActions(true)) return;
        this.vx = this.face * ch.run;
        if (c.sideFlick(2) && sign(c.x) === -this.face) { this.face = -this.face; this.sf = 0; this.vx = this.face * ch.run * 0.8; spawnFx('dust', this.x, this.y - 4); }
        if (this.sf > 12) { if (sign(c.x) === this.face && Math.abs(c.x) > 0.4) this.setState('run'); else this.setState(Math.abs(c.x) < 0.3 ? 'brake' : 'idle'); }
        break;
      case 'run':
        if (this.groundActions(true)) return;
        if (sign(c.x) === this.face && Math.abs(c.x) > 0.3) { this.vx = approach(this.vx, this.face * ch.run, 1); if (this.sf % 12 === 0) spawnFx('dust', this.x - this.face * 16, this.y - 4); }
        else if (sign(c.x) === -this.face && Math.abs(c.x) > 0.5) { this.setState('turn'); }
        else this.setState(Math.abs(this.vx) > ch.walk * 1.2 ? 'brake' : 'idle');
        if (c.y > 0.7) this.setState('crouch');
        break;
      case 'brake':
        // frenada: se derrapa unos cuadros y se puede actuar en cualquier momento
        if (this.groundActions()) return;
        this.vx = approach(this.vx, 0, this.tr() * 1.1);
        if (this.sf % 4 === 1) spawnFx('dust', this.x + this.face * 14, this.y - 4);
        if (Math.abs(c.x) > 0.5) { if (sign(c.x) === this.face) { this.setState('run'); break; } this.setState('turn'); break; }
        if (c.y > 0.6) { this.setState('crouch'); break; }
        if (this.sf >= 10 || Math.abs(this.vx) < 0.4) this.setState('idle');
        break;
      case 'turn':
        if (this.sf >= 2) { const f0 = this.face; this.face = -this.face; if (this.groundActions()) return; this.face = f0; }
        this.vx = approach(this.vx, 0, this.tr() * 1.4);
        if (this.sf === 1) spawnFx('dust', this.x + this.face * 10, this.y - 4);
        if (this.sf >= 6) { this.face = -this.face; this.setState(Math.abs(c.x) > 0.4 ? 'run' : 'idle'); }
        else if (c.buffered('jump')) { c.consume('jump'); this.startJumpsquat(); }
        break;
      case 'jumpsquat': {
        this.vx *= 0.97;
        if (c.buffered('attack', 3) && c.y < -0.5 && this.jumpFromTap && !this.item) { c.consume('attack'); this.startMove(c.digital ? 'utilt' : 'usmash'); return; }
        if (c.buffered('special', 3) && c.y < -0.5) { c.consume('special'); this.special(); return; }
        // golpe durante el impulso: salto corto y el golpe sale al despegar
        if (!this.jsQueue && !this.jumpFromTap) { if (c.buffered('attack', 3)) { c.consume('attack'); this.jsQueue = 'attack'; } else if (c.buffered('special', 3)) { c.consume('special'); this.jsQueue = 'special'; } }
        if (this.sf >= 4) {
          const q = this.jsQueue; this.jsQueue = null;
          const full = !q && (c.held('jump') || (this.jumpFromTap && c.y < -0.5));
          const crouchK = abil(this).crouchJump && (this.crouchT || 0) >= 24 ? abil(this).crouchJump : 1; this.crouchT = 0;
          if (crouchK > 1) { Audio8.sfx('djump'); spawnFx('boom', this.x, this.y, { r: 40, col: '#ff2d2d' }); }
          this.vy = -(full ? ch.jump : ch.jump * 0.66) * PHYS.jumpK * crouchK;
          this.vx = clamp(this.vx + c.x * 1.5, -ch.air * 1.2, ch.air * 1.2);
          this.grounded = false; this.surface = null; this.setState('air'); this.stretch = 1;
          Audio8.sfx('jump'); spawnFx('dust', this.x - 8, this.y - 4); spawnFx('dust', this.x + 8, this.y - 4);
          if (q) { c.buffer[q] = 0; this.airActions(); }
        }
        break;
      }
      case 'land':
        this.vx = approach(this.vx, 0, this.tr());
        if (this.sf >= this.landLag) { this.resumeRun = Math.abs(c.x) > 0.8; this.setState('idle'); this.runState(); }
        break;
      case 'air': case 'helpless':
        this.airControl(1); // indefenso tras el especial hacia arriba: se puede dirigir completo
        if (this.state === 'air') this.airActions();
        break;
      case 'hitstun':
        if (--this.hitstun <= 0) { this.setState(this.grounded ? 'idle' : 'air'); this.tumbling = !this.grounded && this.tumble; break; }
        if (this.sf % 2 === 0 && Math.hypot(this.lx, this.ly) > 14) spawnFx('trail', this.x, this.y - 45, { col: '#cbd5e1' });
        if (this.sf % 3 === 0 && Math.hypot(this.lx, this.ly) > 24) spawnFx('smoke', this.x, this.y - 45);
        this.vx += c.x * 0.04;
        break;
      case 'down':
        this.vx = approach(this.vx, 0, 1);
        if (this.sf > 4 && (c.buffered('attack') || c.buffered('special'))) { c.consume('attack'); c.consume('special'); this.startMove('getupAtk'); break; }
        if (this.sf > 4 && Math.abs(c.x) > 0.6) { this.startRoll(sign(c.x)); break; }
        if (this.sf > 4 && (c.buffered('jump') || c.y < -0.6 || c.held('shield'))) { this.invuln = 16; this.setState('idle'); break; }
        if (this.sf > 26) { this.invuln = 12; this.setState('idle'); }
        break;
      case 'shield':
        this.vx = approach(this.vx, 0, this.tr());
        this.shieldHP -= 0.14;
        if (this.shieldHP <= 0) { this.breakShield(); break; }
        if (this.shieldStun > 0) { this.shieldStun--; break; }
        if (c.buffered('jump') || c.tapUp(2)) { const tap = !c.buffered('jump'); c.consume('jump'); this.startJumpsquat(tap); break; }
        if (c.buffered('attack') || c.buffered('grab')) { c.consume('attack'); c.consume('grab'); this.startMove('grab'); break; }
        if (c.sideFlick(3) && Math.abs(c.x) > 0.7) { this.startRoll(sign(c.x)); break; }
        if (c.downFlick(3) && c.y > 0.7) { this.startSpotDodge(); break; }
        if (!c.held('shield') && this.sf > 4) { this.setState('idle'); }
        break;
      case 'dizzy':
        this.vx = approach(this.vx, 0, 1);
        if (c.pressed('attack') || c.pressed('special') || c.pressed('jump')) this.sf += 6;
        if (this.sf > 150) { this.shieldHP = 40; this.setState('idle'); }
        break;
      case 'dodge': {
        const d = this.dodge;
        this.vx = d.dir ? d.dir * (this.sf >= 3 && this.sf <= 18 ? 7 : 1) : 0;
        if (this.sf === d.dur) { if (d.dir && d.dir === this.face) this.face = -this.face; this.setState('idle'); }
        break;
      }
      case 'airdodge': {
        const d = this.dodge;
        if (this.sf <= 20 && d.dx !== undefined) { const k = Math.max(0, 1 - this.sf / 20), sp = abil(this).dodgeSpeed || 10; this.vx = d.dx * sp * k; this.vy = d.dy * sp * k; if (abil(this).shadow && this.sf % 2 === 0) spawnFx('afterimage', this.x, this.y, { f: this }); }
        if (this.sf >= 24) this.setState('air');
        break;
      }
      case 'ledge': this.ledgeState(); break;
      case 'climb': {
        const L = this.ledgeTo, s2 = this.size(), k = this.sf / 14;
        this.x = lerp(L.x + L.side * 16 * s2, L.x - L.side * 30, k); this.y = lerp(L.s.y + skOf(this.id).hang * s2, L.s.y, easeOut(k));
        if (this.sf >= 14) { const L = this.ledgeTo; this.x = L.x - L.side * 30; this.y = L.s.y; this.grounded = true; this.surface = L.s; this.vx = 0; this.vy = 0; this.setState('idle'); if (this.pendingMove) { this.startMove(this.pendingMove); this.pendingMove = null; } }
        break;
      }
      case 'holding': this.holdingState(); break;
      case 'grabbed':
        if (!this.grabbedBy) { this.setState('air'); break; }
        if (c.pressed('attack') || c.pressed('special') || c.pressed('jump') || c.pressed('shield') || c.sideFlick(1)) this.grabbedBy.grabT -= 5 * (abil(this).escape || 1);
        break;
      case 'attack':
        // en el aire el control sigue respondiendo mientras golpeas
        if (!this.grounded && this.move && !this.move.def.final && this.move.key !== 'throw' && this.move.key !== 'counterHit') this.airControl(this.move.def.helpless ? 0.6 : 0.9);
        this.updateMove();
        if (this.state === 'attack' && this.move && /^sp_[nsd]$/.test(this.move.key) && !this.move.charging) {
          this.move.spAcc = (this.move.spAcc || 0) + SPECIAL_SPEED - 1;
          if (this.move.spAcc >= 1) { this.move.spAcc -= 1; this.updateMove(); }
        }
        break;
      case 'respawn':
        this.vx = 0; this.vy = 0;
        if (this.sf > 30 && (Math.abs(c.x) > 0.3 || Math.abs(c.y) > 0.3 || c.pressed('jump') || c.pressed('attack') || c.pressed('special') || c.pressed('shield'))) { this.invuln = 120; this.setState('air'); this.jumps = this.ch.jumps - 1; this.airActions(); }
        else if (this.sf > 240) { this.invuln = 120; this.setState('air'); }
        break;
    }
  }

  // ---------- acciones en suelo ----------
  groundActions(running) {
    const c = this.ctrl;
    if (c.cPressed && this.item) { this.itemSmash(c.cdir(), running); return true; }
    if (c.cPressed && !this.item) {
      const d = c.cdir();
      if (d.y) this.startMove(d.y < 0 ? 'usmash' : 'dsmash');
      else { if (d.x) this.face = d.x; this.startMove('fsmash'); }
      return true;
    }
    // dos botones a la vez (una persona los aprieta con 0-2 cuadros de diferencia):
    // Ataque+Especial = smash · Salto+golpe = salta y el golpe sale en el aire · Escudo+Ataque = agarre
    if (c.buffered('attack', 2) && c.buffered('special', 2) && !this.item) { c.consume('attack'); c.consume('special'); this.comboSmash(); return true; }
    if (c.buffered('jump') && (c.buffered('attack') || c.buffered('special'))) { c.consume('jump'); this.startJumpsquat(false); this.jsQueue = c.buffered('attack') ? 'attack' : 'special'; return true; }
    if (c.buffered('attack', 2) && (c.buffered('shield', 2) || c.held('shield')) && !this.item) { c.consume('attack'); c.consume('shield'); this.startMove(running ? 'dashgrab' : 'grab'); return true; }
    if (c.buffered('attack')) { c.consume('attack'); this.groundAttack(running); return true; }
    if (c.buffered('special')) { c.consume('special'); this.special(); return true; }
    if (c.buffered('grab')) {
      c.consume('grab');
      if (this.item) this.throwHeld([c.x, c.y], false);
      else this.startMove(running ? 'dashgrab' : 'grab');
      return true;
    }
    if (c.held('shield')) { this.setState('shield'); Audio8.sfx('shield'); return true; }
    if (c.buffered('jump') || c.tapUp(2)) { const tap = !c.buffered('jump'); c.consume('jump'); this.startJumpsquat(tap); return true; }
    return false;
  }
  startJumpsquat(tap = false) { this.setState('jumpsquat'); this.jumpFromTap = tap; this.jsQueue = null; }
  // Ataque+Especial: smash hacia donde apunta la palanca (hacia delante si no apunta)
  comboSmash() {
    const c = this.ctrl;
    if (c.y < -0.5 && Math.abs(c.y) >= Math.abs(c.x) * 0.8) return this.startMove('usmash');
    if (c.y > 0.5 && Math.abs(c.y) >= Math.abs(c.x) * 0.8) return this.startMove('dsmash');
    if (Math.abs(c.x) > 0.3) this.face = sign(c.x);
    this.startMove('fsmash');
  }
  // un golpe que acaba de empezar se combina con el botón que llegó 1-2 cuadros tarde
  lateCombo(m) {
    const c = this.ctrl;
    if (!this.move || m.combined || !this.grounded || this.item) return false;
    if (m.hitSets.some(s => s.size) || BATTLE.projectiles.some(p => p.owner === this && p.t <= 3)) return false;
    const normal = LATE_NORMALS.includes(m.key), sp = /^sp_[nsd]$/.test(m.key);
    if (!normal && !sp) return false;
    // Salto: cancela y salta; el golpe (o el especial) sale en el aire
    if (c.buffered('jump', 2) && m.key !== 'sp_d') { c.consume('jump'); this.move = null; this.startJumpsquat(false); this.jsQueue = sp ? 'special' : 'attack'; return true; }
    if (m.key === 'dash') return false;
    // Ataque+Especial en cualquier orden: smash
    if ((normal && c.buffered('special', 2)) || (sp && c.buffered('attack', 2))) { c.consume('special'); c.consume('attack'); this.comboSmash(); this.move.combined = true; return true; }
    // Ataque+Escudo: agarre
    if (normal && c.buffered('shield', 2)) { c.consume('shield'); this.startMove('grab'); this.move.combined = true; return true; }
    return false;
  }
  dropThrough() { this.dropT = 14; this.grounded = false; this.surface = null; this.y += 3; this.vy = 1; this.setState('air'); }

  groundAttack(running) {
    const c = this.ctrl;
    const it = this.item;
    const smashIn = (c.sideFlick(4) && Math.abs(c.x) > 0.7) || (c.upFlick(4) && c.y < -0.7) || (c.downFlick(4) && c.y > 0.7);
    if (it) {
      const k = ITEM_DEFS[it.type].kind;
      if (Math.abs(c.x) > 0.5) this.face = sign(c.x);
      if (k === 'throw') return this.throwHeld([c.x || this.face, c.y], smashIn && !c.digital);
      if (it.type === 'gun') return this.startMove('gun');
      const w = it.type; // bate o espada: cada dirección es un golpe distinto
      if (running && (this.state === 'run' || this.sf > 6)) return this.startMove(w + 'Dash');
      if (smashIn && !c.digital) return this.itemSmash({ x: c.sideFlick(4) ? sign(c.x) : 0, y: c.upFlick(4) ? -1 : c.downFlick(4) ? 1 : 0 }, false);
      if (c.y < -0.5) return this.startMove(w + 'U');
      if (c.y > 0.5) return this.startMove(w + 'D');
      return this.startMove(w);
    }
    if (!smashIn) {
      // como en Smash: Ataque junto a un objeto lo levanta (también corriendo)
      const near = nearbyItem(this, ['weapon', 'throw']);
      if (near && c.y < 0.5) { this.pickup(near); return; }
    }
    if (c.digital) {
      // teclado: dirección + Ataque = golpe dirigido; los smash van con el botón Smash
      if (running && (this.state === 'run' || this.sf > 8)) return this.startMove('dash');
      if (c.y < -0.5) return this.startMove('utilt');
      if (c.y > 0.5) return this.startMove('dtilt');
      if (Math.abs(c.x) > 0.5) { this.face = sign(c.x); return this.startMove('ftilt'); }
      if (this.jabWin > 0 && this.jabNext) return this.startMove(this.jabNext);
      return this.startMove('jab1');
    }
    if (running && (this.state === 'run' || this.sf > 5)) return this.startMove('dash');
    if (running && c.sideFlick(6)) { return this.startMove('fsmash'); }
    if (c.sideFlick(4) && Math.abs(c.x) > 0.7) { this.face = sign(c.x); return this.startMove('fsmash'); }
    if (c.upFlick(4) && c.y < -0.7) return this.startMove('usmash');
    if (c.downFlick(4) && c.y > 0.7) return this.startMove('dsmash');
    // con stick: basta inclinarlo un poco (el valor ya viene sin la zona muerta)
    if (c.y < -AIM && Math.abs(c.y) >= Math.abs(c.x) * 0.8) return this.startMove('utilt');
    if (c.y > AIM && Math.abs(c.y) >= Math.abs(c.x) * 0.8) return this.startMove('dtilt');
    if (Math.abs(c.x) > AIM) { this.face = sign(c.x); return this.startMove('ftilt'); }
    if (this.jabWin > 0 && this.jabNext) return this.startMove(this.jabNext);
    return this.startMove('jab1');
  }
  pickup(it) {
    it.holder = this; this.item = it; Audio8.sfx('pickup');
    this.startMove('pickup');
    const s = this.size();
    spawnFx('text', this.x, this.y - 150 * s, { txt: `¡${ITEM_DEFS[it.type].name}!`, col: '#ffd166', size: 28 });
    spawnFx('shock', this.x, this.y - 2, { col: '#ffd166' });
    for (let i = 0; i < 6; i++) spawnFx('spark', this.x + rand(-20, 20), this.y - rand(20, 90), { col: '#ffd166' });
  }
  // smash con objeto: arma → golpe fuerte según la dirección; bomba o pistola → lanzamiento fuerte
  itemSmash(d, running) {
    const it = this.item, k = ITEM_DEFS[it.type].kind;
    if (d.x) this.face = d.x;
    if (k === 'weapon' && it.type !== 'gun') return this.startMove(d.y < 0 ? it.type + 'U' : d.y > 0 ? it.type + 'D' : running ? it.type + 'Dash' : it.type + 'Smash');
    this.throwHeld([d.x || (d.y ? 0 : this.face), d.y], true);
  }
  // lanzar el objeto en la dirección apretada (fuerte con Smash)
  throwHeld(dir, strong) {
    const key = dir[1] < -0.5 ? 'itemThrowU' : dir[1] > 0.5 ? 'itemThrowD' : 'itemThrow';
    if (Math.abs(dir[0]) > 0.5) this.face = sign(dir[0]);
    this.startMove(key); this.move.v.dir = dir; this.move.v.strong = strong;
  }
  special() {
    const c = this.ctrl;
    if (this.finalReady) { this.finalReady = false; this.startMove('sp_f'); this.invuln = this.move.def.dur + 30; banner(`¡${this.ch.name}: ${this.move.def.name}!`, this.color); Audio8.sfx('final'); flash(0.5); Rumble.play(Rumble.devOf(this), 0.8, 0.9, 400); return; }
    let key = 'sp_n';
    if (c.y < -AIM && Math.abs(c.y) >= Math.abs(c.x) * 0.8) key = 'sp_u';
    else if (c.y > AIM && Math.abs(c.y) >= Math.abs(c.x) * 0.8) key = 'sp_d';
    else if (Math.abs(c.x) > AIM) { key = 'sp_s'; this.face = sign(c.x); }
    const d = this.moves[key];
    if (!this.grounded && d.oncePerAir && this.airUsed[key]) return;
    if (!this.grounded && key === 'sp_u' && this.airUsed.sp_u) return;
    if (!this.grounded) this.airUsed[key] = true;
    this.startMove(key);
  }

  // ---------- acciones aéreas ----------
  airControl(k) {
    const c = this.ctrl, ch = this.ch;
    const target = c.x * ch.air * k;
    if (Math.abs(c.x) > 0.2) this.vx = approach(this.vx, target, ch.airAcc * k);
    else this.vx = approach(this.vx, 0, 0.06);
    if (this.vy > 0 && c.downFlick(3) && c.y > 0.7) this.fastFall = true;
  }
  // doble salto; combinado con un golpe no voltea ni da la marometa (el golpe sale derecho)
  doubleJump(withMove) {
    const c = this.ctrl;
    c.consume('jump'); this.jumps--;
    this.vy = -this.ch.djump * PHYS.jumpK * PHYS.djumpK; this.fastFall = false;
    this.vx = c.x * this.ch.air;
    if (!withMove && Math.abs(c.x) > 0.3) this.face = sign(c.x);
    this.flipT = withMove || this.ch.weight >= 120 ? 0 : FLIP_T; this.stretch = this.ch.weight >= 120 ? 1 : 0;
    Audio8.sfx('djump');
    spawnFx('boom', this.x, this.y, { r: 26, col: '#f1f5f9' });
    this.tumbling = false;
  }
  airActions() {
    const c = this.ctrl;
    if (this.swim) return; // en el agua solo se nada (Salto = brazada)
    if (c.cPressed && this.item) {
      const it = this.item, k = ITEM_DEFS[it.type].kind, d = c.cdir();
      if (k === 'weapon' && it.type !== 'gun') return this.startMove(it.type + 'Air');
      return this.throwHeld([d.x || (d.y ? 0 : this.face), d.y], true);
    }
    if (c.cPressed && !this.item) {
      const d = c.cdir();
      if (d.y) this.startMove(d.y < 0 ? 'uair' : 'dair');
      else if (d.x) this.startMove(d.x === this.face ? 'fair' : 'bair');
      else this.startMove('nair');
      return;
    }
    if (c.buffered('jump', 2) && this.jumps > 0 && !this.item && (c.buffered('attack', 2) || c.buffered('special', 2))) this.doubleJump(true);
    if (c.buffered('attack')) {
      c.consume('attack');
      if (this.item) {
        const k = ITEM_DEFS[this.item.type].kind;
        if (k === 'throw') return this.throwHeld([c.x || this.face, c.y], false);
        return this.startMove(this.item.type === 'gun' ? 'gun' : this.item.type + 'Air');
      }
      if (c.y < -AIM && Math.abs(c.y) >= Math.abs(c.x) * 0.8) return this.startMove('uair');
      if (c.y > AIM && Math.abs(c.y) >= Math.abs(c.x) * 0.8) return this.startMove('dair');
      if (Math.abs(c.x) > AIM) return this.startMove(sign(c.x) === this.face ? 'fair' : 'bair');
      return this.startMove('nair');
    }
    if (c.buffered('special')) { c.consume('special'); return this.special(); }
    if (c.buffered('grab') && this.item) { c.consume('grab'); this.throwHeld([c.x, c.y], false); return; }
    if (abilityWallJump(this)) return;
    const tap = c.tapUp(2);
    if ((c.buffered('jump') || tap) && this.jumps > 0) { this.doubleJump(false); return; }
    if (c.buffered('shield') && (this.airUsed.dodgeN || 0) < (abil(this).airDodges || 1)) {
      c.consume('shield'); this.airUsed.dodgeN = (this.airUsed.dodgeN || 0) + 1;
      this.dodge = {}; const l = Math.hypot(c.x, c.y);
      if (l > 0.4) { this.dodge.dx = c.x / l; this.dodge.dy = c.y / l; }
      this.setState('airdodge'); this.invuln = 20; Audio8.sfx('dodge');
    }
  }
  startRoll(dir) { this.dodge = { dir, dur: 26 }; this.setState('dodge'); this.invuln = 16; Audio8.sfx('dodge'); }
  startSpotDodge() { this.dodge = { dir: 0, dur: 22 }; this.setState('dodge'); this.invuln = 15; Audio8.sfx('dodge'); }
  breakShield() {
    this.shieldHP = 0; Audio8.sfx('shieldbreak'); Rumble.shieldBreak(this);
    spawnFx('boom', this.x, this.y - 50, { r: 80, col: '#8ecae6' });
    this.setState('dizzy'); this.vy = -9; this.grounded = false;
  }

  // ---------- movimientos ----------
  startMove(key) {
    let def = key === 'counterHit' ? COUNTER_HIT : key === 'pickup' ? { anim: 'pickup', dur: 8 } : this.moves[key];
    if (!def) return;
    this.setState('attack');
    this.move = { key, def, f: 0, t: 0, v: {}, charge: 0, ct: 0, charging: false, hitSets: (def.hits || []).map(() => new Map()), bornT: BATTLE ? BATTLE.t : 0 };
    if (this.jabWin <= 0 || !/^(jab\d|rapid)$/.test(key)) this.jabNext = null;
    if (def.jab) { this.jabNext = def.jab; }
    if (def.intang) this.invuln = Math.max(this.invuln, def.intang[1]);
    if (def.sfx) Audio8.sfx(def.sfx);
    this.swingSfx = def.hits && def.hits.length && !def.final ? (def.hits[0].f0 || 1) : 0;
  }
  updateMove() {
    const m = this.move, c = this.ctrl;
    if (!m) return this.setState(this.grounded ? 'idle' : 'air');
    // un aéreo nunca sigue en el suelo: se convierte en aterrizaje
    if (m.def.air && this.grounded) { this.landLag = Math.max(3, Math.round((m.def.land || 6) * 0.6)); this.move = null; this.setState('land'); return; }
    if (BATTLE.t - (m.bornT || 0) <= 2 && this.lateCombo(m)) return;
    // en el aire: Salto 1-2 cuadros después de empezar el aéreo = doble salto sin cortar el golpe
    if (m.def.air && !this.grounded && !m.djumped && BATTLE.t - (m.bornT || 0) <= 2 && c.buffered('jump', 2) && this.jumps > 0) { m.djumped = true; this.doubleJump(true); }
    if (m.f <= 2 && !m.late && this.lateDirection(m)) return;
    const d = m.def;
    // carga (smash / especiales cargables)
    let advance = true;
    if (d.chargeAt && m.f === d.chargeAt && !m.chargeDone) {
      const btn = d.chargeBtn || 'attack';
      const held = c.held(btn) || (d.smash && (c.held('smash') || Math.abs(c.cur.cx) > 0.5 || Math.abs(c.cur.cy) > 0.5));
      const max = d.chargeMax || 60;
      if (held && m.ct < max && !(d.chargeBtn && c.pressed('shield'))) {
        m.ct++; m.charge = m.ct / max; m.charging = true; advance = false;
        if (m.ct % 6 === 0) { spawnFx('charge', this.x + this.face * 20, this.y - 50, { col: '#ffd166' }); if (d.smash) Audio8.sfx('charge', m.charge); }
        if (m.ct % 7 === 1) Rumble.charge(this, m.charge);
      } else {
        if (d.chargeBtn && c.pressed('shield')) { this.move = null; this.setState(this.grounded ? 'idle' : 'air'); return; }
        m.chargeDone = true; m.charging = false;
      }
    }
    // mantener el botón sostiene el golpe (la ráfaga también sigue si lo machacas)
    if (advance && d.holdLoop && m.f === d.holdLoop[0] && m.t < d.holdLoop[1] && (c.held(d.holdBtn || 'special') || (d.holdBtn && c.buffered(d.holdBtn, 8)))) advance = false;
    if (advance) m.f++;
    m.t++;
    if (this.swingSfx && m.f === this.swingSfx) Audio8.sfx('swing', d.smash ? 1.6 : 1);
    if (d.onFrame) d.onFrame(this, m);
    if (this.move !== m) return; // el hook cambió de movimiento
    // cajas de golpe
    if (d.hits) {
      for (let i = 0; i < d.hits.length; i++) {
        const h = d.hits[i];
        if (m.f < h.f0 || m.f > h.f1) continue;
        this.activeHit(h, m.hitSets[i], m, i);
        if (this.move !== m) return;
      }
    }
    if (d.grabBox && m.f >= d.grabBox.f0 && m.f <= d.grabBox.f1 && !m.v.grabbed) this.tryGrab(d.grabBox, d.command);
    if (this.move !== m) return;
    if (d.shootAt && m.f === d.shootAt && this.item && this.item.type === 'gun') {
      if (this.item.ammo > 0) { this.item.ammo--; Audio8.sfx('laser'); spawnProjectile(this, { type: 'laser', x: this.x + this.face * 40, y: this.y - 58, vx: this.face * 22, r: 8, life: 50, dmg: 5, ang: 20, bkb: 3, kbg: 3, col: '#48cae4' }); }
      else { Audio8.sfx('back'); spawnFx('smoke', this.x + this.face * 40, this.y - 58); }
    }
    if (d.throwAt && m.f === d.throwAt && this.item) { const dir = m.v.dir || [this.face, 0]; throwItem(this, dir[0], dir[1], m.v.strong); }
    if (m.key === 'throw' && this.grabbing) this.positionHeld(m.def.slam && m.f > 4);
    if (d.at && m.f === d.at && this.grabbing) this.doThrow();
    // golpes normales en suelo: pasada la parte que pega, la dirección apretada vuelve a correr
    // y el salto sale al instante (así nunca se "congela" con la flecha apretada)
    if (d._lastHit === undefined) d._lastHit = Math.max(0, ...(d.hits || []).map(h => h.f1));
    if (this.grounded && (MOVE_CANCEL.has(m.key) || (d.smash && m.f > d._lastHit + 8))) {
      if (m.f > d._lastHit + 3) {
        // combos: pasado el golpe, el siguiente ataque, salto, escudo o carrera salen de inmediato
        if (!d.jab || !c.buffered('attack')) { const prevMove = this.move; if (this.groundActions()) { if (this.move !== prevMove) return; return; } }
        if (Math.abs(c.x) > 0.5 && m.f > d._lastHit + 5) { this.move = null; this.face = sign(c.x); this.setState('run'); this.vx = approach(this.vx, this.face * this.ch.run * 0.75, 4); return; }
      }
    }
    if (!this.grounded && d.air && d.hits && m.f > d._lastHit + 5 && !m.v.cancelled) {
      // aéreos: después de pegar ya se puede saltar, esquivar, otro aéreo o un especial
      const prevMove = this.move; this.airActions(); if (this.move !== prevMove || this.state !== 'attack') return;
    }
    // fin
    if (m.f >= d.dur) return this.endMove();
    if (d.iasa && m.f >= d.iasa) {
      if (d.jab && c.buffered('attack') && Math.abs(c.x) < 0.5 && Math.abs(c.y) < 0.5) { c.consume('attack'); this.jabWin = 0; return this.startMove(d.jab); }
      if (this.grounded && this.groundActions()) return;
    }
    // aterrizaje de especiales en caída libre
  }
  lateDirection(m) {
    const c = this.ctrl, x = Math.abs(c.x) > AIM ? sign(c.x) : 0, y = Math.abs(c.y) > AIM ? sign(c.y) : 0;
    if (!x && !y) return false;
    let key = null;
    if (m.key === 'jab1' && this.grounded) key = y < 0 ? 'utilt' : y > 0 ? 'dtilt' : 'ftilt';
    else if (m.key === 'nair' && !this.grounded) key = y < 0 ? 'uair' : y > 0 ? 'dair' : x === this.face ? 'fair' : 'bair';
    else if (m.key === 'sp_n') {
      key = y < 0 ? 'sp_u' : y > 0 ? 'sp_d' : 'sp_s';
      if (!this.grounded && (this.moves[key].oncePerAir || key === 'sp_u') && this.airUsed[key]) return false;
      if (!this.grounded) this.airUsed[key] = true;
      if (key === 'sp_s') this.face = x || this.face;
    }
    if (!key || !this.moves[key]) return false;
    if (key === 'ftilt') this.face = x || this.face;
    const born = m.bornT; this.startMove(key); this.move.late = true; this.move.bornT = born;
    return true;
  }
  activeHit(h, set, m, i) {
    const s = this.size();
    const cs = h.chargeScale;
    const ch = m.charge;
    const r = (h.r + (cs && cs.r ? cs.r * ch : 0)) * s;
    const hx = this.x + this.face * h.x * s, hy = this.y + h.y * s;
    const hit = Object.assign({}, h);
    if (m.def.smash || animFor(this, m).heavy) hit.heavy = 1;
    if (m.def.smash) hit.dmg = h.dmg * (1 + 0.45 * ch);
    if (cs) { hit.dmg = h.dmg + cs.dmg * ch; hit.bkb = h.bkb + cs.bkb * ch; hit.kbg = h.kbg + cs.kbg * ch; }
    if (m.v.dmg) hit.dmg = m.v.dmg;
    for (const t of BATTLE.fighters) {
      if (t === this || t.dead || t.stocks <= 0) continue;
      const last = set.get(t);
      if (last !== undefined && !(h.rehit && m.t - last >= h.rehit)) continue;
      const hb = t.hurtbox();
      if (!circleRect(hx, hy, r, hb.x, hb.y, hb.w, hb.h)) continue;
      // un grupo solo golpea una vez por fotograma
      if (h.grp && m.hitSets.some((st2, j) => j !== i && m.def.hits[j].grp === h.grp && st2.get(t) === m.t)) continue;
      const dir = Math.abs(h.x) < 12 ? (sign(t.x - this.x) || this.face) : this.face;
      const res = applyHit(this, t, hit, dir);
      if (res) set.set(t, m.t);
      if (res && !h.rehit) for (let j = 0; j < m.hitSets.length; j++) if (j !== i && m.def.hits[j].f0 <= h.f1 && m.def.hits[j].f1 >= h.f0 && !m.def.hits[j].rehit) m.hitSets[j].set(t, m.t);
      if (res === 'counter' || this.move !== m) return;
    }
    hitItems(this, hx, hy, r, hit.dmg);
    if (BATTLE.ms && BATTLE.ms.ball && !m.ballHit && Modes.kickBall(this, hit, Math.abs(h.x) < 12 ? (sign(BATTLE.ms.ball.x - this.x) || this.face) : this.face, hx, hy, r)) m.ballHit = true;
  }
  endMove() {
    const d = this.move ? this.move.def : null;
    this.move = null;
    if (d && d.final) { this.hidden = false; this.invuln = Math.max(this.invuln, 30); }
    if (this.grabbing && this.state === 'attack') { this.setState('holding'); return; }
    if (d && d.helpless && !this.grounded) { this.setState('helpless'); return; }
    const c = this.ctrl;
    this.resumeRun = false;
    // lo que se apretó durante el golpe sale en este mismo cuadro (salto, otro golpe, escudo)
    if (this.grounded && !(d && d.jab && c.buffered('attack'))) { this.setState('idle'); if (this.groundActions()) { if (d && d.jab) this.jabWin = 14; return; } }
    if (this.grounded && Math.abs(c.x) > 0.8 && c.y < 0.6) { this.face = sign(c.x); this.setState('run'); if (d && d.jab) this.jabWin = 14; return; } // sigue corriendo
    this.setState(this.grounded ? 'idle' : 'air');
    if (d && d.jab) this.jabWin = 14;
  }

  // ---------- agarres ----------
  tryGrab(box, command) {
    const s = this.size();
    const gx = this.x + this.face * box.x * s, gy = this.y + box.y * s, r = box.r * s;
    for (const t of BATTLE.fighters) {
      if (t === this || t.dead || t.stocks <= 0 || t.invuln > 0 || t.hidden || t.grabbedBy || t.starTime > 0 || sameTeam(this, t)) continue;
      if (!command && !t.grounded) continue;
      const hb = t.hurtbox();
      if (!circleRect(gx, gy, r, hb.x, hb.y, hb.w, hb.h)) continue;
      if (t.inCounter()) { triggerCounter(t, this, 6); return; }
      this.move.v.grabbed = true;
      this.grabbing = t; t.grabbedBy = this; t.setState('grabbed'); t.vx = t.vy = t.lx = t.ly = 0;
      this.grabT = 70 + t.percent * 0.7;
      Audio8.sfx('grab'); Rumble.land(this, 4, 3); Rumble.thud(t, 0.1);
      if (command) { this.move = null; this.startThrowDef(command); }
      else { this.move = null; this.setState('holding'); }
      return;
    }
  }
  holdingState() {
    const c = this.ctrl, t = this.grabbing;
    this.vx = approach(this.vx, 0, 1);
    if (!t || t.dead) { this.releaseGrab(); return; }
    this.positionHeld(false);
    this.grabT--;
    if (this.grabT <= 0) { this.releaseGrab(true); return; }
    if (this.sf < 6) return;
    if (c.pressed('attack') || c.pressed('grab')) { this.startThrowDef(this.moves.pummel, true); return; }
    if (c.x * this.face > 0.6) return this.startThrowDef(this.moves.fthrow);
    if (c.x * this.face < -0.6) return this.startThrowDef(this.moves.bthrow);
    if (c.y < -0.6) return this.startThrowDef(this.moves.uthrow);
    if (c.y > 0.6) return this.startThrowDef(this.moves.dthrow);
  }
  startThrowDef(def, pummel) {
    this.setState('attack');
    this.move = { key: 'throw', def: pummel ? { anim: 'jab', dur: 14, at: 4, pummel: 1 } : def, f: 0, t: 0, v: {}, charge: 0, hitSets: [] };
    this.move.throwDef = def;
  }
  positionHeld(slam) {
    const t = this.grabbing; if (!t) return;
    const s = this.size();
    t.x = this.x + this.face * 42 * s; t.y = this.y - (slam ? 95 * s : 0);
    t.face = -this.face; t.vx = t.vy = 0; t.grounded = this.grounded;
  }
  doThrow() {
    const m = this.move, t = this.grabbing, d = m.throwDef;
    if (!t) return;
    if (m.def.pummel) {
      if (BATTLE && BATTLE.rules.mode === 'hp') t.hp = Math.max(1, t.hp - d.dmg); else t.percent += d.dmg;
      t.hitlag = 6; this.hitlag = 4; Audio8.sfx('hit', 0.4); spawnFx('hit', t.x, t.y - 50, { r: 10, col: '#ffd166' });
      this.move = null; this.setState('holding'); this.sf = 6; return;
    }
    const dir = d.turn ? -this.face : this.face;
    if (d.turn) this.face = -this.face;
    this.releaseGrab();
    applyHit(this, t, { dmg: d.dmg, ang: d.ang, bkb: d.bkb, kbg: d.kbg, sfx: d.slam ? 'bighit' : 'throw', drain: d.drain, effect: d.effect }, dir, { unblockable: true });
    if (d.slam) { shake(10); spawnFx('boom', t.x, this.y, { r: 90, col: '#95d5b2' }); }
  }
  releaseGrab(pushApart) {
    const t = this.grabbing;
    this.grabbing = null;
    if (t) {
      t.grabbedBy = null;
      if (t.state === 'grabbed') { t.setState(t.grounded ? 'idle' : 'air'); if (pushApart) { t.vx = -this.face * -6; t.invuln = 10; } }
    }
    if (this.state === 'holding') this.setState('idle');
  }

  // ---------- bordes ----------
  checkLedge() {
    if (this.grounded || this.ledgeCd > 0 || this.dead || this.sunk) return; // al que se lleva el canal ya no alcanza la orilla
    const recovering = this.state === 'attack' && this.move && this.move.def.helpless && this.move.f > 10;
    if ((!['air', 'helpless'].includes(this.state) && !recovering) || this.vy < 0) return;
    if (this.ctrl.y > 0.6) return;
    for (const L of BATTLE.stage.ledges()) {
      const s = this.size();
      const dx = (this.x - L.x) * L.side; // >0 = fuera del escenario
      if (dx < -8 || dx > 76 * s) continue;
      const dy = this.y - L.y;
      if (dy < 16 * s || dy > 170 * s) continue;
      if (BATTLE.fighters.some(o => o !== this && o.state === 'ledge' && o.ledge && o.ledge.x === L.x && o.ledge.y === L.y)) continue;
      this.grabLedge(L); return;
    }
  }
  grabLedge(L) {
    this.ledge = L; this.setState('ledge');
    this.face = -L.side; this.vx = this.vy = 0; this.fastFall = false;
    this.jumps = this.ch.jumps - 1; this.airUsed = {};
    if (!this.ledgeRegrab || this.stateT - this.ledgeRegrab > 300) this.invuln = Math.max(this.invuln, 50);
    this.ledgeRegrab = this.stateT;
    Audio8.sfx('grab');
  }
  ledgeState() {
    const L = this.ledge, c = this.ctrl, s = this.size();
    this.x = L.x + L.side * 16 * s; this.y = L.s.y + skOf(this.id).hang * s;
    if (this.sf < 8) return;
    const toward = c.x * -L.side;
    if (c.pressed('jump') || c.tapUp(2)) { this.setState('air'); this.vy = -this.ch.jump * 1.05 * PHYS.jumpK; this.vx = -L.side * 2; this.y = L.s.y - 4; this.x = L.x + L.side * 10; Audio8.sfx('jump'); this.ledgeCd = 20; return; }
    if (c.pressed('attack') || c.pressed('special')) { this.ledgeTo = L; this.pendingMove = 'ledgeAtk'; this.setState('climb'); this.invuln = 18; return; }
    if (c.pressed('shield')) { this.ledgeTo = L; this.setState('climb'); this.invuln = 20; this.pendingRoll = true; return; }
    if (toward > 0.6 || (c.y < -0.6 && !c.upFlick(2))) { this.ledgeTo = L; this.setState('climb'); this.invuln = 14; return; }
    if (toward < -0.6 || c.y > 0.6 || this.sf > 330) { this.setState('air'); this.ledgeCd = 30; this.x += L.side * 8; this.vy = 1; return; }
  }

  // ---------- física ----------
  physics() {
    const st = BATTLE.stage, ch = this.ch;
    if (this.state === 'ledge' || this.state === 'grabbed' || this.state === 'climb' || this.state === 'respawn') {
      if (this.state === 'respawn') { this.x = this.respawnX; this.y = this.respawnY; }
      return;
    }
    // transporte por plataformas móviles
    if (this.grounded && this.surface) { this.x += this.surface.dx; this.y += this.surface.dy; }
    const g = st.grav;
    const noGrav = (this.state === 'airdodge' && this.sf <= 20 && this.dodge.dx !== undefined) || this.hovering || this.swim; // nadando manda el agua
    if (!this.grounded && !noGrav) {
      // al caer pesa más que al subir: el salto llega igual de alto pero no flota
      // mientras sale volando la gravedad pesa menos: no se hunde debajo del escenario antes de poder hacer algo
      const flying = this.state === 'hitstun' && Math.hypot(this.lx, this.ly) > 3;
      const maxF = (this.fastFall ? ch.ffall : ch.fall) * PHYS.fallMax * (g < 1 ? 0.72 + 0.28 * g : 1) * (flying ? 0.6 : this.state === 'helpless' ? 0.8 : 1); // indefenso cae más despacio: alcanza a llegar a la orilla
      // subir también es más rápido en saltos y aéreos normales (los especiales y los lanzamientos no cambian)
      const normalAir = !this.tumbling && (this.state === 'air' || (this.state === 'attack' && this.move && this.move.def.air && !String(this.move.key).startsWith('sp_')));
      this.vy = Math.min(this.vy + ch.grav * g * (this.vy > 0 ? PHYS.fallGrav : normalAir ? PHYS.rise : 1) * (flying ? 0.65 : 1), maxF);
      if (this.gliding) this.vy = Math.min(this.vy, 1.9); // planeo: cae despacio
    }
    // retroceso
    if (this.lx || this.ly) {
      const mag = Math.hypot(this.lx, this.ly);
      const nm = Math.max(0, mag - LAUNCH_DECAY);
      if (nm <= 0) { this.lx = this.ly = 0; } else { this.lx *= nm / mag; this.ly *= nm / mag; }
    }
    if (this.grounded) {
      if (['idle', 'crouch', 'land', 'shield', 'dizzy', 'down', 'holding'].includes(this.state)) this.vx = approach(this.vx, 0, this.tr());
      else if (this.state === 'attack') this.vx = approach(this.vx, 0, this.tr() * (this.move && this.move.def.dashAtk ? 0.3 : 0.8));
      if (this.state === 'hitstun') this.vx = approach(this.vx, 0, 0.5);
    }
    let nx = this.x + this.vx + this.lx, ny = this.y + this.vy + this.ly;
    const s = this.size(), hw = 18 * s, hh = this.h;
    // paredes de sólidos
    for (const so of st.solids) {
      if (ny - hh < so.y + so.h && ny > so.y + 6 && nx + hw > so.x && nx - hw < so.x + so.w) {
        if (this.x <= so.x) { nx = so.x - hw; } else if (this.x >= so.x + so.w) { nx = so.x + so.w + hw; } else continue;
        if (!this.grounded) { this.wallT = BATTLE.t; this.wallDir = this.x <= so.x ? 1 : -1; } // para quien se agarra de paredes
        if (this.state === 'hitstun' && Math.abs(this.lx) > 6) { this.lx = -this.lx * 0.6; spawnFx('boom', nx, ny - 40, { r: 40 }); Audio8.sfx('land'); }
        else { this.vx = 0; this.lx = 0; }
      }
    }
    // techo (parte inferior de sólidos)
    if (ny < this.y) {
      for (const so of st.solids) {
        if (nx + hw > so.x && nx - hw < so.x + so.w && this.y - hh >= so.y + so.h - 1 && ny - hh < so.y + so.h) { ny = so.y + so.h + hh; this.vy = Math.max(this.vy, 0); this.ly = Math.max(0, -this.ly * 0.4); }
      }
    }
    // aterrizaje
    const wasGrounded = this.grounded;
    if (!this.grounded && ny >= this.y - 0.01) {
      let best = null;
      for (const so of st.surfaces()) {
        if (nx < so.x - 2 || nx > so.x + so.w + 2) continue;
        if (so.plat && this.dropT > 0) continue;
        const prevTop = so.y - so.dy;
        if (this.y <= prevTop + 2 && ny >= so.y) { if (!best || so.y < best.y) best = so; }
      }
      if (best) { ny = best.y; this.land(best); }
    } else if (this.grounded) {
      const so = this.surface;
      if (!so || nx < so.x - 3 || nx > so.x + so.w + 3) {
        // se salió del borde
        if (['idle', 'walk', 'dash', 'run', 'crouch', 'turn', 'land', 'shield'].includes(this.state) && so && !so.plat) {
          // detenerse en el borde si camina despacio
          if ((this.state === 'walk' && Math.abs(this.ctrl.x) < 0.8) || ['idle', 'shield', 'land', 'crouch'].includes(this.state)) { nx = clamp(nx, so.x, so.x + so.w); this.vx = 0; }
          else { this.grounded = false; this.surface = null; this.setState('air'); this.jumps = Math.max(this.jumps, this.ch.jumps - 1); }
        } else {
          this.grounded = false; this.surface = null;
          // saltó justo al salir corriendo de la orilla: el salto sale igual (antes se perdía)
          if (this.state === 'jumpsquat') { this.setState('air'); this.vy = -this.ch.jump * PHYS.jumpK; Audio8.sfx('jump'); }
          else if (this.state !== 'attack' && this.state !== 'hitstun' && this.state !== 'dodge') this.setState('air');
          if (this.state === 'dodge') this.setState('air');
        }
      } else ny = so.y;
    }
    this.x = nx; this.y = ny;
    if (!wasGrounded && this.grounded) Audio8.sfx('land');
  }
  land(so) {
    const prevVy = this.vy + this.ly;
    this.grounded = true; this.surface = so; this.vy = 0; this.fastFall = false;
    this.jumps = this.ch.jumps - 1; this.airUsed = {};
    if (this.state === 'hitstun') {
      if (this.tumble && this.ly > 5) { this.ly = -this.ly * 0.55; this.grounded = false; this.surface = null; spawnFx('boom', this.x, this.y, { r: 50 }); return; }
      if (this.tumble) {
        if (this.ctrl.buffered('shield', 10) || abil(this).autoTech) { this.invuln = 20; this.lx = this.ly = 0; spawnFx('boom', this.x, this.y - 40, { r: 50, col: '#f1f5f9' }); Audio8.sfx('dodge'); this.setState('idle'); return; }
        this.lx *= 0.4; this.ly = 0; this.setState('down'); spawnFx('dust', this.x, this.y - 4); return;
      }
      this.ly = 0;
      return;
    }
    this.lx = 0; this.ly = 0; this.tumbling = false;
    spawnFx('dust', this.x - 10, this.y - 4); spawnFx('dust', this.x + 10, this.y - 4);
    { const a = abil(this); if (a.onLand) a.onLand(this, prevVy); }
    if (this.state === 'attack' && this.move) {
      const d = this.move.def;
      if (d.air) { this.landLag = Math.max(3, Math.round((d.land || 6) * 0.6)); this.move = null; this.setState('land'); return; }
      if (d.helpless && this.move.f > 8 && prevVy >= 0) { this.landLag = 10; this.move = null; this.setState('land'); return; }
      return; // otros especiales continúan en el suelo
    }
    if (this.state === 'helpless') { this.landLag = 12; this.setState('land'); return; }
    if (this.state === 'airdodge') { this.landLag = 6; this.setState('land'); return; }
    if (this.state === 'dizzy' || this.state === 'grabbed' || this.state === 'holding') return;
    this.landLag = 3; this.setState('land');
  }

  // ---------- KO y reaparición ----------
  checkBlast() {
    const b = BATTLE.stage.blast;
    if (this.x < b.l || this.x > b.r || this.y > b.b || this.y < b.t) this.ko();
  }
  ko() {
    const B = BATTLE;
    Audio8.sfx('ko'); shake(18); Rumble.ko(this);
    if (B.phase === 'fight' && this.lastHitBy && this.lastHitBy !== this) Rumble.scored(this.lastHitBy);
    B.koFx.push({ x: clamp(this.x, B.stage.blast.l, B.stage.blast.r), y: clamp(this.y - 40, B.stage.blast.t, B.stage.blast.b), col: this.color, t: 0 });
    NetEv.push(['k', ri(clamp(this.x, B.stage.blast.l, B.stage.blast.r)), ri(clamp(this.y - 40, B.stage.blast.t, B.stage.blast.b)), this.color]);
    if (this.grabbing) this.releaseGrab();
    if (this.grabbedBy) this.grabbedBy.releaseGrab();
    if (this.item) { this.item.dead = true; this.item = null; }
    const timeMode = B.rules.mode === 'time';
    // una caída después de que se decidió la pelea (cámara lenta final) ya no cuenta
    if (B.phase === 'fight') {
      this.stats.falls++; if (timeMode) this.score--;
      if (this.lastHitBy && this.lastHitBy !== this) { this.lastHitBy.stats.kos++; if (timeMode) this.lastHitBy.score++; }
      else this.stats.sd++;
      if (stockMode(B.rules.mode)) { this.stocks--; if (this.stocks <= 0) this.outAt = B.t; } // orden de eliminación
    }
    this.dead = true; this.hidden = false; this.move = null;
    this.respawnT = 80;
    this.lx = this.ly = this.vx = this.vy = 0;
    this.finalReady = false; this.starTime = 0; this.bigTime = 0; this.scale = 1;
    B.onKO(this);
  }
  respawn() {
    const st = BATTLE.stage;
    this.dead = false; this.percent = 0;
    this.swim = false; this.sunk = false; this.skips = 0; this.swimStam = 100;
    this.respawnX = [-160, 160, -60, 60][this.port]; this.respawnY = st.top - 250;
    this.x = this.respawnX; this.y = this.respawnY; this.vx = this.vy = 0;
    this.grounded = false; this.surface = null; this.fastFall = false; this.hitstun = 0; this.tumble = false;
    this.shieldHP = 100; this.airUsed = {};
    this.setState('respawn'); this.invuln = 999;
    Modes.onRespawn(BATTLE, this);
    if (BATTLE.rules.mode === 'soccer') { this.x = this.respawnX; }
  }
  placeAt(x, y) { this.x = x; this.y = y; this.grounded = false; this.setState('air'); this.face = x < 0 ? 1 : -1; }

  // ---------- pose ----------
  updatePose() {
    let tgt, k = 0.35, sq = 0; // sq: aplastamiento (+) o estiramiento (−)
    const t = performance.now() / 1000;
    switch (this.state) {
      case 'idle': tgt = stancePose(this, t); k = 0.28; break;
      case 'walk': this.phase += Math.abs(this.vx) * 0.085; tgt = walkPose2(this.phase); k = 0.4; break;
      case 'dash': this.phase += Math.abs(this.vx) * 0.06; tgt = this.sf < 5 ? DASH_BURST : runPoseFor(this, this.phase, 0.42); k = this.sf < 5 ? 0.6 : 0.45; break;
      case 'run': this.phase += Math.abs(this.vx) * 0.06; tgt = runPoseFor(this, this.phase, 0.36); k = 0.42; break;
      case 'brake': tgt = BRAKE_POSE; k = 0.45; break;
      case 'turn': tgt = SKID_POSE; k = 0.5; break;
      case 'crouch': tgt = POSES.crouch; sq = 0.05; k = 0.45; break;
      case 'jumpsquat': tgt = POSES.land; sq = 0.15; k = 0.7; break;
      case 'land': tgt = POSES.land; sq = 0.13 * (1 - this.sf / Math.max(1, this.landLag)); k = 0.6; break;
      case 'air':
        tgt = this.swim ? swimPose(t) : this.tumbling ? POSES.hurt : this.flipT > 0 ? FLIP_TUCK : this.hovering ? HOVER_POSE : this.gliding ? GLIDE_POSE : airPose2(this);
        if (this.stretch > 0) sq = -0.08 * this.stretch;
        k = this.flipT > 0 ? 0.5 : 0.3; break;
      case 'helpless': tgt = mkPose(Object.assign({}, POSES.fall, { face: 'sad' })); break;
      case 'hitstun': tgt = mkPose(Object.assign({}, POSES.hurt, { rot: this.tumble ? (this.pose.rot || 0) + 0.35 * -this.face * sign(this.lx || 1) : 0 })); k = 0.6; break;
      case 'down': tgt = mkPose({ rot: -Math.PI / 2, pivot: -14, face: 'ko', grounded: false, legF: [0.1, 0], legB: [-0.1, 0], armF: [2.9, 0.2], armB: [2.6, 0.2] }); break;
      case 'shield': tgt = POSES.shield; sq = 0.04; break;
      case 'dizzy': tgt = mkPose(Object.assign({}, POSES.dizzy, { rot: Math.sin(t * 6) * 0.15 })); break;
      case 'dodge': tgt = this.dodge.dir ? mkPose(Object.assign({}, POSES.crouch, { rot: (this.sf / this.dodge.dur) * TAU * sign(this.dodge.dir * this.face), grounded: false, bodyY: 20 })) : POSES.shield; k = 0.8; break;
      case 'airdodge': tgt = mkPose(Object.assign({}, POSES.jump, { rot: this.sf < 20 ? (this.sf / 20) * TAU : 0 })); k = 0.8; break;
      case 'ledge': tgt = POSES.ledge; break;
      case 'climb': tgt = POSES.jump; break;
      case 'holding': tgt = POSES.hold; break;
      case 'grabbed': tgt = POSES.grabbed; break;
      case 'respawn': tgt = mkPose(Object.assign({}, POSES.idle, { grounded: true })); break;
      // golpes: pose exacta del cuadro (el puño llega justo cuando pega); solo se suaviza la entrada
      case 'attack': tgt = this.move ? attackPose2(this, this.move) : POSES.idle; k = this.move && this.move.f <= 1 ? 0.6 : 1; break;
      default: tgt = POSES.idle;
    }
    // con un arma en la mano se carga al hombro al moverse
    if (this.item && ITEM_DEFS[this.item.type].kind === 'weapon' && ['walk', 'run', 'dash', 'brake', 'turn', 'air', 'crouch'].includes(this.state)) tgt = Object.assign({}, tgt, { armF: [2.35, 1.3] });
    const rot = tgt.rot;
    this.pose = blendPose(this.pose, tgt, k);
    if (this.state === 'air' && this.flipT > 0) this.pose.rot = (1 - this.flipT / FLIP_T) * TAU; // voltereta hacia delante
    else this.pose.rot = (this.state === 'hitstun' && this.tumble) || this.state === 'down' || this.state === 'dodge' || this.state === 'airdodge' || (this.state === 'attack' && rot) ? rot : lerp(this.pose.rot, 0, 0.3);
    this.pose.face = this.flinch > 6 ? 'hurt' : tgt.face;
    this.pose.grounded = tgt.grounded; this.pose.pivot = tgt.pivot;
    if (this.state === 'attack' && this.move && this.move.charging) this.pose.bodyY = (this.pose.bodyY || 0) + Math.sin(this.move.ct) * 1.5;
    // aplastar al caer y al agacharse para saltar; estirar al despegar
    this.sq = lerp(this.sq || 0, sq, 0.45);
    this.pose.sx = 1 + this.sq * 0.6; this.pose.sy = 1 - this.sq;
    recordSwoosh(this);
  }

  // ---------- dibujo ----------
  draw(c) {
    if (this.dead || this.hidden) return;
    const s = this.size();
    if (this.state === 'respawn') {
      c.fillStyle = withAlpha(this.color, 0.5);
      c.beginPath(); c.ellipse(this.x, this.y + 4, 48, 10, 0, 0, TAU); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke();
    }
    // sombra en el suelo
    if (!this.grounded && BATTLE) {
      const fy = BATTLE.stage.floorY(this.x);
      if (this.x > BATTLE.stage.left && this.x < BATTLE.stage.right && fy > this.y) {
        c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(this.x, fy, 22 * s * clamp(1 - (fy - this.y) / 600, 0.3, 1), 5, 0, 0, TAU); c.fill();
      }
    }
    // aura del golpe final
    if (this.finalReady) {
      const g = c.createRadialGradient(this.x, this.y - 50 * s, 10, this.x, this.y - 50 * s, 90 * s);
      g.addColorStop(0, 'rgba(255,190,11,0.0)'); g.addColorStop(0.6, `rgba(255,190,11,${0.3 + Math.sin(performance.now() / 80) * 0.15})`); g.addColorStop(1, 'rgba(230,57,70,0)');
      c.fillStyle = g; c.beginPath(); c.arc(this.x, this.y - 50 * s, 90 * s, 0, TAU); c.fill();
    }
    const shakeX = this.hitlag > 0 && this.flinch > 0 ? rand(-3, 3) : 0;
    c.save();
    c.translate(this.x + shakeX, this.y);
    if ((this.invuln > 0 && this.state !== 'attack' && this.state !== 'respawn' && Math.floor(this.invuln / 3) % 2) || this.state === 'dodge' || this.state === 'airdodge') c.globalAlpha = 0.55;
    if (BATTLE && BATTLE.mods && BATTLE.mods.ghosts && !['attack', 'hitstun', 'grabbed', 'holding'].includes(this.state) && !this.flinch) c.globalAlpha = 0.12;
    c.scale(this.face * s, s);
    let outline = '#10131a';
    if (this.starTime > 0) outline = `hsl(${(performance.now() / 3) % 360},95%,55%)`;
    else if (this.armorFlash > 0) outline = '#ffbe0b';
    else if (this.move && this.move.charging) outline = Math.floor(this.move.ct / 3) % 2 ? '#ffd166' : '#10131a';
    else if (this.state === 'helpless') outline = '#394a63';
    if (this.hitlag > 0 && this.flinch > 8) outline = '#ffffff';
    const item = this.item;
    // el mariachi saca la guitarra de la espalda para los golpes que la usan
    const gOut = this.id === 'mariachi' && !item && this.state === 'attack' && this.move && this.move.def && (this.move.def.guitar || animFor(this, this.move).limb === 'guitar');
    ART.drawLit(c, this.port, [-160, -270, 160, 60], cc => drawCharacter(cc, this.id, this.pose, {
      outline, flip: this.face < 0, headScale: BATTLE && BATTLE.mods && BATTLE.mods.bigHeads ? 1.9 : 1, guitarOut: gOut,
      onHand: item ? (cc, hx, hy, ang) => {
        cc.save(); cc.translate(hx, hy);
        if (item.type === 'gun') { cc.rotate(Math.PI / 2 - ang); drawItemIcon(cc, 'gun', 8, 0, 0.9, true); }
        else if (item.type === 'bat' || item.type === 'sword') { cc.rotate(Math.PI - ang); drawItemIcon(cc, item.type, 0, item.type === 'sword' ? -24 : -26, 1.18, true); }
        else drawItemIcon(cc, item.type, 0, -4, 0.85, true);
        cc.restore();
      } : gOut ? (cc, hx, hy, ang) => { cc.save(); cc.translate(hx, hy); cc.rotate(Math.PI - ang); cc.translate(0, -30); cc.rotate(Math.PI); drawGuitar(cc, 0.82, outline); cc.restore(); }
        : HAND_PROPS[this.id] ? (cc, hx, hy, ang) => HAND_PROPS[this.id](cc, this, hx, hy, ang, outline) : null,
    }));
    c.restore();
    c.globalAlpha = 1;
    drawSwoosh(c, this);
    // escudo
    if (this.state === 'shield') {
      // burbuja de energía: centro transparente, borde brillante, reflejo; destella en la ventana de parry
      const r = (26 + this.shieldHP * 0.38) * s, cx = this.x, cy = this.y - 60 * s, pw = this.sf <= PHYS.parry;
      const g = c.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
      g.addColorStop(0, withAlpha(this.color, 0.04)); g.addColorStop(0.7, withAlpha(this.color, 0.16)); g.addColorStop(1, withAlpha(this.color, 0.5));
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill();
      c.strokeStyle = pw ? 'rgba(255,255,255,.95)' : withAlpha(mixStr(this.color, '#ffffff', 0.4), 0.9); c.lineWidth = pw ? 3.5 : 2;
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2.5; c.beginPath(); c.arc(cx, cy, r * 0.8, Math.PI * 1.1, Math.PI * 1.45); c.stroke();
      if (pw) ART.drawGlow(c, cx, cy, r * 1.6, '#ffffff', 0.35);
      if (this.shieldHP < 35) { c.strokeStyle = 'rgba(255,90,90,.7)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx - r * 0.3, cy - r * 0.5); c.lineTo(cx, cy - r * 0.1); c.lineTo(cx - r * 0.1, cy + r * 0.3); c.moveTo(cx, cy - r * 0.1); c.lineTo(cx + r * 0.4, cy + r * 0.05); c.stroke(); }
    }
    if (this.state === 'dizzy') for (let i = 0; i < 3; i++) { const a = performance.now() / 200 + i * 2.1; drawStar(c, this.x + Math.cos(a) * 26, this.y - 128 * s + Math.sin(a) * 6, 7, 3, '#ffd166'); }
    // reflector / contraataque
    if (this.state === 'attack' && (this.inReflect() || this.inCounter())) {
      c.strokeStyle = this.inCounter() ? 'rgba(241,245,249,.8)' : 'rgba(72,202,228,.85)'; c.lineWidth = 4;
      c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + performance.now() / 300; c.lineTo(this.x + Math.cos(a) * 56 * s, this.y - 56 * s + Math.sin(a) * 56 * s); } c.closePath(); c.stroke();
    }
    // haz de Daniel
    if (this.move && this.move.v.beam) {
      const r = this.move.v.beam;
      const g = c.createLinearGradient(0, r.y, 0, r.y + r.h);
      g.addColorStop(0, 'rgba(255,109,0,0)'); g.addColorStop(0.3, 'rgba(255,159,28,.85)'); g.addColorStop(0.5, 'rgba(255,243,176,.95)'); g.addColorStop(0.7, 'rgba(255,159,28,.85)'); g.addColorStop(1, 'rgba(255,109,0,0)');
      c.fillStyle = g; c.fillRect(r.x, r.y + Math.sin(performance.now() / 30) * 4, r.w, r.h);
    }
    // indicador de jugador
    const tagY = this.y - (this.state === 'ledge' ? 128 : 150) * s;
    c.fillStyle = this.color;
    c.beginPath(); c.moveTo(this.x - 8, tagY); c.lineTo(this.x + 8, tagY); c.lineTo(this.x, tagY + 10); c.closePath(); c.fill();
    text(this.cpu ? 'CPU' : (this.label || PLAYER_TAGS[this.port]), this.x, tagY - 12, 15, this.color, { stroke: '#10131a', strokeW: 4 });
  }
}
