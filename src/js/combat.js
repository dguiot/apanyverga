'use strict';
// ============================================================
//  COMBATE: golpes, retroceso, proyectiles y efectos
// ============================================================
let BATTLE = null; // estado de la pelea activa

function shake(n) { if (BATTLE && !reducedMotion) BATTLE.shake = Math.max(BATTLE.shake, n); }
function flash(a) { if (BATTLE) BATTLE.flash = Math.max(BATTLE.flash, a); }
function dim(frames) { if (BATTLE) BATTLE.dim = Math.max(BATTLE.dim, frames); }
function banner(txt, col) { if (BATTLE) BATTLE.banners.push({ txt, col: col || '#f1f5f9', t: 0 }); NetEv.push(['b', txt, col || '#f1f5f9']); }
function opponentsOf(f) { return BATTLE.fighters.filter(o => o !== f && !o.dead && o.stocks > 0 && !sameTeam(o, f)); }
function countProj(f, type) { return BATTLE.projectiles.filter(p => p.owner === f && p.type === type).length; }

// ---------- efectos ----------
function spawnFx(type, x, y, o = {}) {
  if (!BATTLE) return;
  if (NetEv.on && NET_FX.has(type)) NetEv.push(['f', type, ri(x), ri(y), o.col || 0, type === 'wind' || type === 'claw' ? o.dir : (o.r ? ri(o.r) : 0), o.txt || 0, o.life || 0, o.ang ? Math.round(o.ang * 100) / 100 : 0]);
  const fx = Object.assign({ type, x, y, t: 0, life: 20, vx: 0, vy: 0, r: 10, col: '#fff' }, o);
  switch (type) {
    case 'spark': fx.life = 14; fx.vx = rand(-3, 3); fx.vy = rand(-4, 1); break;
    case 'hit': fx.life = 12; fx.rot = rand(0, TAU); break;
    case 'dust': fx.life = 26; fx.vx = rand(-1.8, 1.8); fx.vy = rand(-1.3, -0.3); fx.r = rand(9, 15); fx.rot = rand(0, TAU); break;
    case 'launch': fx.life = 34; fx.r = o.r || rand(12, 18); fx.rot = rand(0, TAU); fx.vx = rand(-0.4, 0.4); fx.vy = rand(-0.6, -0.1); break;
    case 'ember': fx.life = 30; fx.vx = rand(-1, 1); fx.vy = rand(-3, -1); fx.col = pick(['#ffd166', '#ff9f1c', '#ff6d00']); break;
    case 'boom': fx.life = 30; fx.rot = rand(0, TAU); break;
    case 'smoke': fx.life = 40; fx.rot = rand(0, TAU); break;
    case 'afterimage': fx.life = 12; fx.pose = o.f.pose; fx.face = o.f.face; fx.id = o.f.id; fx.scale = o.f.scale; break;
    case 'coin': fx.life = 30; fx.vx = rand(-2, 2); fx.vy = rand(-7, -4); break;
    case 'wind': fx.life = 90; fx.vx = 26 * o.dir; break;
    case 'target': break;
    case 'slashline': fx.life = 10; fx.rot = rand(0, TAU); break;
    case 'rock': fx.life = 90; fx.vy = rand(10, 16); fx.vx = rand(-1, 1); fx.r = rand(10, 22); break;
    case 'charge': fx.life = 14; fx.ang = rand(0, TAU); break;
    case 'trail': fx.life = 24; fx.r = rand(8, 14); break;
    case 'text': fx.life = 70; fx.vy = -1.2; break;
    case 'shock': fx.life = 18; break;
    case 'pillar': fx.life = 24; break;
    case 'impact': fx.life = 16; fx.ang = o.ang || 0; fx.seeds = Array.from({ length: 9 }, () => [rand(-0.55, 0.55), rand(0.6, 1.25)]); break;
    case 'claw': fx.life = 12; fx.dir = o.dir || 1; break;
    case 'cateyes': fx.life = 120; break;
  }
  BATTLE.fx.push(fx);
  if (BATTLE.fx.length > 700) BATTLE.fx.splice(0, 100);
}
// estela de humo detrás de quien sale volando (cuanto más rápido, más densa)
function launchTrails(B) {
  for (const f of B.fighters) {
    const px = f._ltx, py = f._lty; f._ltx = f.x; f._lty = f.y;
    if (px === undefined || f.dead || f.state !== 'hitstun' || f.hitlag > 0) continue;
    const sp = Math.hypot(f.x - px, f.y - py);
    if (sp < 8 || sp > 200) continue;
    const n = sp > 22 ? 2 : 1;
    for (let i = 0; i < n; i++) spawnFx('launch', lerp(px, f.x, i / n), lerp(py, f.y, i / n) - 50 * f.size(), { r: clamp(sp * 0.7, 10, 24), hot: sp > 24 });
  }
}
function updateFx() {
  for (const p of BATTLE.fx) {
    p.t++; p.x += p.vx; p.y += p.vy;
    if (p.type === 'coin') p.vy += 0.4;
    if (p.type === 'dust' || p.type === 'smoke' || p.type === 'launch') { p.vx *= 0.92; p.vy *= 0.96; }
  }
  BATTLE.fx = BATTLE.fx.filter(p => p.t < p.life);
}
function drawFx(c, layer) {
  for (const p of BATTLE.fx) {
    const k = p.t / p.life, a = 1 - k;
    if ((p.type === 'target' || p.type === 'afterimage') !== (layer === 'back')) continue;
    c.globalAlpha = clamp(a, 0, 1);
    switch (p.type) {
      case 'spark': {
        c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = p.col; c.lineWidth = 2.2 * a + 0.6; c.lineCap = 'round';
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 2.5, p.y - p.vy * 2.5); c.stroke();
        c.fillStyle = '#fff'; c.fillRect(p.x - 1, p.y - 1, 2, 2); c.restore(); break;
      }
      case 'hit': {
        // destello de impacto: núcleo blanco, rayos finos y un anillo que se abre
        const r = p.r * (0.8 + easeOut(k) * 1.1);
        ART.drawGlow(c, p.x, p.y, r * 2.4 * (1 - k * 0.5), p.col, a);
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = withAlpha(p.col.length === 7 ? p.col : '#ffd166', 0.9);
        for (let i = 0; i < 10; i++) {
          const an = i / 10 * TAU + (i % 3) * 0.1, len = r * (i % 2 ? 1.1 : 2.1) * (1 - k * 0.3), w = 0.07;
          c.beginPath(); c.moveTo(Math.cos(an - w) * r * 0.18, Math.sin(an - w) * r * 0.18); c.lineTo(Math.cos(an) * len, Math.sin(an) * len); c.lineTo(Math.cos(an + w) * r * 0.18, Math.sin(an + w) * r * 0.18); c.fill();
        }
        c.fillStyle = '#fff';
        for (let i = 0; i < 4; i++) { const an = i / 4 * TAU + 0.4, len = r * 1.5 * (1 - k); c.beginPath(); c.moveTo(Math.cos(an - 0.03) * 3, Math.sin(an - 0.03) * 3); c.lineTo(Math.cos(an) * len, Math.sin(an) * len); c.lineTo(Math.cos(an + 0.03) * 3, Math.sin(an + 0.03) * 3); c.fill(); }
        c.beginPath(); c.arc(0, 0, r * 0.42 * (1 - k * 0.7), 0, TAU); c.fill();
        c.strokeStyle = withAlpha('#ffffff', 0.7 * a); c.lineWidth = 2 * a + 0.5; c.beginPath(); c.arc(0, 0, r * (0.9 + k * 0.9), 0, TAU); c.stroke();
        c.restore(); break;
      }
      case 'dust': { const R = p.r * (0.7 + k * 1.3); c.globalAlpha = clamp(a * 0.9, 0, 1); c.save(); c.translate(p.x, p.y); c.rotate(p.rot + k); c.drawImage(ART.puff('#d8d0c2'), -R, -R, R * 2, R * 2); c.restore(); break; }
      case 'launch': {
        // estela de humo al salir volando: blanca, y con fuego si el golpe fue brutal
        const R = p.r * (0.6 + k * 1.6); c.globalAlpha = clamp(a * 0.85, 0, 1);
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot + k * 2); c.drawImage(ART.puff(p.hot ? '#ffb070' : '#e8e4dc'), -R, -R, R * 2, R * 2); c.restore();
        if (p.hot && k < 0.4) ART.drawGlow(c, p.x, p.y, R * 1.2, '#ff7a1a', (0.4 - k) * 1.6);
        break;
      }
      case 'ember': ART.drawGlow(c, p.x, p.y, 7, p.col, a); c.fillStyle = '#fff3c4'; c.fillRect(p.x - 1, p.y - 1, 2, 2); break;
      case 'boom': {
        // explosión: bola de fuego que se expande, humo que queda y onda de choque
        const r = p.r * easeOut(Math.min(1, k * 1.8)), col = p.col.length === 7 ? p.col : '#ffffff';
        const fire = col === '#ff6d00' || col === '#ff9f1c' || col === '#ffbe0b' || col === '#e63946' || p.col === '#fff';
        if (k > 0.25) { c.globalAlpha = clamp((1 - k) * 0.8, 0, 1); c.save(); c.translate(p.x, p.y - k * 20); c.rotate(p.rot); c.drawImage(ART.puff('#3a3440'), -r * 1.2, -r * 1.2, r * 2.4, r * 2.4); c.restore(); }
        c.globalAlpha = clamp(a * 1.2, 0, 1);
        c.save(); c.globalCompositeOperation = 'lighter';
        if (fire) c.drawImage(ART.fireball(), p.x - r, p.y - r, r * 2, r * 2);
        else ART.drawGlow(c, p.x, p.y, r * 1.4, col, a);
        c.restore();
        c.strokeStyle = withAlpha(fire ? '#ffe2a8' : col, 0.8 * a); c.lineWidth = 5 * a + 1; c.beginPath(); c.arc(p.x, p.y, r * 1.15, 0, TAU); c.stroke();
        break;
      }
      case 'smoke': { const R = 34 * (0.7 + k * 1.2); c.globalAlpha = clamp(a, 0, 1); for (let i = 0; i < 3; i++) { c.save(); c.translate(p.x + Math.cos(i * 2.1 + p.rot) * 14 * (0.5 + k), p.y + Math.sin(i * 2.1 + p.rot) * 10 * (0.5 + k) - k * 16); c.rotate(p.rot + i); c.drawImage(ART.puff('#4a4656'), -R, -R, R * 2, R * 2); c.restore(); } break; }
      case 'afterimage':
        c.globalAlpha = a * 0.4; c.save(); c.translate(p.x, p.y); c.scale(p.face * p.scale, p.scale);
        drawCharacter(c, p.id, p.pose, { outline: 'rgba(40,60,100,.9)', flip: p.face < 0 }); c.restore(); break;
      case 'coin': c.fillStyle = '#ffd166'; c.beginPath(); c.ellipse(p.x, p.y, 7 * Math.abs(Math.cos(p.t * 0.3)) + 1, 8, 0, 0, TAU); c.fill(); break;
      case 'wind': c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 3; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 5, p.y + Math.sin(p.t * 0.2) * 6); c.stroke(); break;
      case 'target': {
        c.globalAlpha = 0.5 + Math.sin(p.t * 0.4) * 0.3;
        c.strokeStyle = p.col; c.lineWidth = 4;
        c.beginPath(); c.ellipse(p.x, p.y, 34, 10, 0, 0, TAU); c.stroke();
        c.beginPath(); c.moveTo(p.x, p.y - 200); c.lineTo(p.x, p.y - 20); c.setLineDash([12, 12]); c.stroke(); c.setLineDash([]);
        break;
      }
      case 'slashline': c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.strokeStyle = '#fff'; c.lineWidth = 6 * a; c.beginPath(); c.moveTo(-90, 0); c.lineTo(90, 0); c.stroke(); c.strokeStyle = '#e63946'; c.lineWidth = 2; c.stroke(); c.restore(); break;
      case 'rock': c.fillStyle = '#5b4a44'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); break;
      case 'charge': { const r = 40 * (1 - k); c.fillStyle = p.col; c.fillRect(p.x + Math.cos(p.ang) * r, p.y + Math.sin(p.ang) * r, 4, 4); break; }
      case 'trail': ART.drawGlow(c, p.x, p.y, p.r * 1.6 * a + 2, p.col, a * 0.9); break;
      case 'text': text(p.txt, p.x, p.y, p.size || 34, p.col, { stroke: '#10131a' }); break;
      case 'shock': c.strokeStyle = p.col; c.lineWidth = 5 * a; c.beginPath(); c.ellipse(p.x, p.y, 20 + k * 90, 6 + k * 14, 0, 0, TAU); c.stroke(); break;
      case 'impact': {
        // rayas en la dirección en que sale volando + anillo: se lee la fuerza y hacia dónde
        c.save(); c.translate(p.x, p.y); c.rotate(p.ang);
        const R = p.r * (0.6 + k * 1.2);
        c.lineCap = 'round';
        for (const [da, lk] of p.seeds) {
          const a0 = da, len = R * lk;
          c.strokeStyle = withAlpha(p.col, 0.9 * a); c.lineWidth = Math.max(1, (p.r / 9) * a);
          c.beginPath(); c.moveTo(Math.cos(a0) * R * 0.25, Math.sin(a0) * R * 0.25); c.lineTo(Math.cos(a0) * len, Math.sin(a0) * len); c.stroke();
        }
        c.strokeStyle = withAlpha('#ffffff', 0.8 * a); c.lineWidth = 3 * a;
        c.beginPath(); c.ellipse(0, 0, R * 0.55, R * 0.4, 0, 0, TAU); c.stroke();
        c.restore(); break;
      }
      case 'pillar': {
        // rayo orbital de Chispa: del cielo al suelo
        const w = p.r * (1 - k * 0.6), top = BATTLE.stage.blast.t;
        const g = c.createLinearGradient(p.x - w, 0, p.x + w, 0);
        g.addColorStop(0, 'rgba(72,202,228,0)'); g.addColorStop(0.3, 'rgba(72,202,228,.85)'); g.addColorStop(0.5, 'rgba(240,253,255,1)'); g.addColorStop(0.7, 'rgba(72,202,228,.85)'); g.addColorStop(1, 'rgba(72,202,228,0)');
        c.fillStyle = g; c.fillRect(p.x - w, top, w * 2, p.y - top);
        c.fillStyle = 'rgba(240,253,255,.8)'; c.beginPath(); c.ellipse(p.x, p.y, w * 1.6, 12, 0, 0, TAU); c.fill();
        break;
      }
      case 'claw': {
        // tres zarpazos curvos
        c.save(); c.translate(p.x, p.y); c.scale(p.dir, 1); c.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          c.strokeStyle = '#2ec4b6'; c.lineWidth = 7 * a; c.beginPath(); c.moveTo(-34 + i * 12, -36); c.quadraticCurveTo(8 + i * 12, -6, 22 + i * 12, 38 * (0.4 + k)); c.stroke();
          c.strokeStyle = '#f1f5f9'; c.lineWidth = 3 * a; c.stroke();
        }
        c.restore(); break;
      }
      case 'cateyes': {
        const bl = Math.abs(Math.sin(p.t * 0.05 + p.x)) > 0.12 ? 1 : 0.1;
        c.fillStyle = '#ffd166';
        for (const dx of [-11, 11]) { c.beginPath(); c.ellipse(p.x + dx, p.y, 7, 5 * bl, dx > 0 ? -0.25 : 0.25, 0, TAU); c.fill(); }
        c.fillStyle = '#10131a'; for (const dx of [-11, 11]) c.fillRect(p.x + dx - 1.2, p.y - 4 * bl, 2.4, 8 * bl);
        break;
      }
      default: if (typeof drawFx2 === 'function') drawFx2(c, p, k, a);
    }
    c.globalAlpha = 1;
  }
}

const KB_MIN_GROWTH = 4.5, KB_BASE = 0.85, KB_ACCEL = 0.33;
// los peligros del escenario empujan 20% menos desde que todos aguantan más (v12)
const HAZARD_KB = 0.8;
const EFFECT_COL = { fire: '#ff9f1c', elec: '#48cae4', slash: '#f1f5f9', normal: '#ffd166' };

// ---------- aplicar un golpe ----------
// dir: 1 lanza hacia la derecha para ángulos "hacia delante", -1 hacia la izquierda
function applyHit(att, t, hit, dir, opts = {}) {
  if (!t || t.dead || t.stocks <= 0) return false;
  if (t.invuln > 0 || t.hidden) return false;
  if (t.starTime > 0) { spawnFx('spark', t.x, t.y - 50, { col: '#ffd166' }); return false; }
  if (att && att === t) return false;
  if (sameTeam(att, t)) return false; // sin fuego amigo
  // contraataque
  if (att && t.inCounter()) { triggerCounter(t, att, hit.dmg); return 'counter'; }
  const px = t.x - dir * 10, py = t.y - t.h * 0.55;
  // escudo
  if (t.state === 'shield' && t.shieldHP > 0 && !opts.unblockable) {
    // parry: el escudo recién levantado detiene el golpe sin desgaste y deja al atacante expuesto
    // la CPU solo acierta un parry de vez en cuando (según su nivel); una persona siempre que lo clave
    const cpuParry = !t.cpu || Math.random() < (t.brain && t.brain.L ? t.brain.L.lv : 5) * 0.03;
    if (t.sf <= PHYS.parry && cpuParry) {
      t.shieldStun = 0; t.invuln = Math.max(t.invuln, 10); t.vx = 0;
      if (att && !opts.proj) { att.hitlag = Math.max(att.hitlag, 12); att.vx = -dir * 3; att.parried = 30; }
      t.hitlag = Math.max(t.hitlag, 6);
      Audio8.sfx('counter'); shake(6);
      spawnFx('hit', px, py, { col: '#e0f7ff', r: 26 }); spawnFx('shock', t.x, t.y - 4, { col: '#e0f7ff' });
      spawnFx('text', t.x, t.y - 150, { txt: '¡PARRY!', col: '#bff3ff', size: 44 });
      Rumble.parry(t); if (att && !opts.proj) Rumble.parried(att);
      return 'shield';
    }
    t.shieldHP -= hit.dmg * 1.25;
    t.shieldStun = Math.floor(4 + hit.dmg * 0.55);
    t.vx = dir * Math.min(8, 1 + hit.dmg * 0.3);
    if (att && !opts.proj) att.vx = -dir * 2.5;
    Audio8.sfx('shield');
    spawnFx('hit', px, py, { col: '#8ecae6', r: 14 });
    Rumble.block(t, hit.dmg); if (att && !opts.proj) Rumble.land(att, hit.dmg * 0.4, 2);
    if (t.shieldHP <= 0) t.breakShield();
    return 'shield';
  }
  const B = BATTLE, mods = (B && B.mods) || {}, hpMode = B && B.rules.mode === 'hp';
  const mult = att ? att.dmgMult() : 1;
  const tab = abil(t), projRes = opts.proj && tab.projResist ? tab.projResist : 1;
  const dmg = hit.dmg * mult * projRes;
  t.lastHurtT = B ? B.t : 0;
  if (att && hit.drain && att !== t) { if (hpMode) att.hp = Math.min(att.maxHp, att.hp + dmg * hit.drain); else att.percent = Math.max(0, att.percent - dmg * hit.drain); spawnFx('text', att.x, att.y - 150 * att.size(), { txt: `-${Math.round(dmg * hit.drain)}%`, col: '#95d5b2', size: 26 }); }
  if (att && abil(att).onHit) abil(att).onHit(att, t, dmg, hit);
  if (hpMode) t.hp = Math.max(0, t.hp - dmg); else t.percent = Math.min(999, t.percent + dmg);
  t.flinch = 12;
  if (att) { att.stats.dealt += dmg; t.lastHitBy = att; t.lastHitTimer = 480; }
  if (att && mods.vampire) { if (hpMode) att.hp = Math.min(att.maxHp, att.hp + dmg * mods.vampire); else att.percent = Math.max(0, att.percent - dmg * mods.vampire); }
  Modes.onHit(att, t);
  const col = EFFECT_COL[hit.effect] || '#ffd166';
  // retroceso
  // Cuanto más %, más lejos sale: todo golpe crece con el daño acumulado y el
  // crecimiento se acelera a porcentajes altos.
  // en modo Vida el retroceso no crece: la barra decide
  const pf = hpMode ? 0.4 : t.percent / 100;
  let kb = (hit.bkb + Math.max(hit.kbg, KB_MIN_GROWTH) * pf) * (KB_BASE + KB_ACCEL * pf) * (100 / t.weight()) * (att ? att.kbMult() : HAZARD_KB);
  { const ab = abil(t); if (ab.takenKb) kb *= ab.takenKb(t); }
  if (projRes < 1) kb *= 0.55;
  if (hit.homerun) kb *= 1.15;
  if (mods.explosive && dmg >= 6) { kb *= 1.25; spawnFx('boom', px, py, { r: 40 + dmg * 3, col: '#ff9f1c' }); Audio8.sfx('explosion'); }
  const hpKO = hpMode && t.hp <= 0 && !opts.noLaunch;
  if (hpKO) { kb = Math.max(kb, 36); hit = Object.assign({}, hit, { ang: 72 }); flash(0.5); spawnFx('text', t.x, t.y - 150, { txt: 'K.O.', col: RED, size: 60 }); }
  // dormir o resbalar no es un golpe: la armadura no lo evita
  const armored = ((t.hasArmor() && kb < 17) || abilityArmor(t, kb)) && !hpKO && !hit.sleep && !hit.trip;
  // congelamiento al pegar: se siente el golpe pero no se traba el juego
  const hitlag = Math.min(14, Math.floor(2 + dmg * 0.32 + (hit.heavy ? 2 : 0)));
  if (!opts.proj && att) att.hitlag = Math.max(att.hitlag, hitlag);
  t.hitlag = hitlag;
  Rumble.hurt(t, dmg, armored ? 0 : kb, hitlag); if (att) Rumble.land(att, dmg, hitlag);
  spawnFx('hit', px, py, { col, r: 14 + dmg * 1.2 });
  for (let i = 0; i < 4 + dmg / 3; i++) spawnFx('spark', px, py, { col });
  const sfxK = kb / 10;
  Audio8.sfx(hit.sfx === 'bighit' || kb > 20 ? 'bighit' : (hit.sfx && hit.sfx !== 'hit' ? hit.sfx : 'hit'), sfxK);
  if (hit.sfx && hit.sfx !== 'bighit' && hit.sfx !== 'hit') Audio8.sfx('hit', sfxK);
  if (armored) { t.armorFlash = 8; return true; }
  if (t.grabbing) t.releaseGrab();
  if (t.grabbedBy) t.grabbedBy.releaseGrab();
  if (opts.noLaunch || (hit.sleep && (t.grounded || hit.trap)) || (hit.trip && t.grounded)) {
    t.setState('hitstun'); t.hitstun = 22; t.lx = 0; t.ly = 0; t.vx = 0; t.vy = 0; t.tumble = false;
    // dormido / atrapado: queda mareado un rato (machacar botones lo despierta antes)
    if (hit.sleep && (t.grounded || hit.trap)) { t.setState('dizzy'); t.sf = Math.max(0, 150 - hit.sleep); spawnFx('zzz', t.x, t.y - 120 * t.size(), { life: 50 }); }
    // resbalón: al piso
    else if (hit.trip && t.grounded) { t.setState('down'); t.vx = dir * 2; spawnFx('drop', t.x, t.y - 20, { life: 30 }); }
    return true;
  }
  let a = hit.ang * Math.PI / 180;
  if (t.grounded && hit.ang > 180 && hit.ang < 360) a = (hit.meteor ? 75 : 80) * Math.PI / 180; // meteoro en suelo: rebota
  let lx = Math.cos(a) * kb * dir, ly = -Math.sin(a) * kb;
  // DI: el defensor inclina la trayectoria con el stick
  const cx = t.ctrl.x, cy = t.ctrl.y;
  if (Math.hypot(cx, cy) > 0.3) {
    const len = Math.hypot(lx, ly) || 1;
    const perp = (cx * -ly + cy * lx) / len; // componente perpendicular
    const rot = clamp(-perp, -1, 1) * 0.2;
    const ca = Math.cos(rot), sa = Math.sin(rot);
    [lx, ly] = [lx * ca - ly * sa, lx * sa + ly * ca];
  }
  t.lx = lx; t.ly = ly; t.vx = 0; t.vy = 0;
  t.grounded = false; t.surface = null;
  // aturdimiento: igual en golpes de combo; los que mandan a volar dejan actuar antes para poder regresar
  t.hitstun = Math.floor(kb <= 13 ? kb * 2.1 : 27 + (kb - 13) * 1.4);
  t.tumble = kb > 13;
  // salir volando devuelve las herramientas para regresar: especial hacia arriba, esquive y un salto
  if (t.tumble) { t.airUsed = {}; if (t.jumps < 1 && t.ch.jumps > 1) t.jumps = 1; }
  t.setState('hitstun');
  spawnFx('impact', px, py, { col, r: 16 + dmg * 1.6 + kb * 0.8, ang: Math.atan2(ly, lx) });
  if (B && kb > 12) B.camKick = Math.max(B.camKick || 0, Math.min(0.075, kb * 0.0022));
  // golpe que seguramente saca del escenario: un instante en cámara lenta
  if (B && kb > 58 && B.phase === 'fight' && !B.slow && (B.slowCd || 0) <= 0) { B.slow = 12; B.slowCd = 300; }
  if (kb > 18) { shake(Math.min(22, kb * 0.45)); flash(Math.min(0.22, kb * 0.0055)); t.hitlag += 2; if (att) att.hitlag += 2; }
  if (hit.homerun && kb > 22) spawnFx('text', t.x, t.y - 140, { txt: '¡HOME RUN!', col: '#ffbe0b', size: 42 });
  return true;
}

// golpe a todos los rivales dentro de un rectángulo
function hitArea(att, r, hit, opts = {}) {
  for (const o of BATTLE.fighters) {
    if (o === att || o.dead || o.stocks <= 0) continue;
    if (rectRect(r, o.hurtbox())) applyHit(att, o, hit, sign(o.x - (att ? att.x : 0)) || 1, Object.assign({ unblockable: true }, opts));
  }
}

function triggerCounter(f, att, incoming) {
  Audio8.sfx('counter');
  spawnFx('boom', f.x, f.y - 50, { r: 70, col: '#f1f5f9' });
  f.x = att.x - att.face * 50; f.face = att.face; f.y = att.y; f.grounded = att.grounded;
  f.invuln = 30;
  f.startMove('counterHit');
  f.move.v.dmg = Math.max(8, incoming * 1.35);
  att.hitlag = 14;
}

// ---------- proyectiles ----------
function spawnProjectile(owner, o) {
  // los disparos salen a la altura de las manos del cuerpo de cada quien
  if (owner && owner.id && typeof skOf === 'function' && o.y < owner.y && o.y > owner.y - 160) o = Object.assign({}, o, { y: owner.y + (o.y - owner.y) * skOf(owner.id).bodyK });
  const p = Object.assign({ owner, t: 0, grav: 0, reflect: 1, hitSet: new Set(), rehitT: new Map(), ang: 40, bkb: 4, kbg: 4, dmg: 5, r: 10, life: 60, vx: 0, vy: 0, col: '#fff', delay: 0 }, o);
  BATTLE.projectiles.push(p);
  return p;
}
function updateProjectiles() {
  const st = BATTLE.stage;
  for (const p of BATTLE.projectiles) {
    if (p.delay > 0) {
      p.delay--;
      if (p.delay === 0 && p.toX !== undefined) {
        const T = 90, ty = st.floorY(p.toX) - 10;
        p.vx = (p.toX - p.x) / T; p.vy = (ty - p.y - 0.5 * p.grav * T * T) / T;
        Audio8.sfx('explosion');
      }
      if (p.delay === 0 && p.dropV) p.vy = p.dropV;
      continue;
    }
    p.t++; p.life--;
    if (p.homing) {
      const tg = nearestTarget(p);
      if (tg) { const a = Math.atan2(tg.y - 50 - p.y, tg.x - p.x), cur = Math.atan2(p.vy, p.vx); let d = a - cur; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; const na = cur + clamp(d, -p.homing, p.homing); p.vx = Math.cos(na) * p.speed; p.vy = Math.sin(na) * p.speed; }
    }
    p.vy += p.grav * (p.owner ? 1 : 1);
    const oy = p.y;
    p.x += p.vx; p.y += p.vy;
    if (p.grow) p.r += p.grow;
    if (p.trail && p.t % 2 === 0) spawnFx('ember', p.x - sign(p.vx) * p.r, p.y + rand(-4, 4));
    if (p.type === 'meteor' || p.type === 'fireball' || p.type === 'orb') if (p.t % 2 === 0) spawnFx('trail', p.x, p.y, { col: p.col, r: p.r * 0.8 });
    // suelo
    if (p.grav || p.ground || p.explodeGround || p.roll) {
      for (const s of st.surfaces()) {
        if (p.x < s.x || p.x > s.x + s.w) continue;
        if (oy + p.r <= s.y + 2 + Math.max(0, s.dy) && p.y + p.r >= s.y) {
          if (p.onGround) { p.onGround(p, s); break; }
          if (p.explodeGround) { explodeProj(p); break; }
          if (p.bounce) { p.y = s.y - p.r; p.vy = p.bounce; }
          else if (p.roll) { p.y = s.y - p.r; p.vy = 0; p.vx *= 1.004; }
          break;
        }
      }
    }
    if (p.ground) {
      const fy = st.floorY(p.x);
      if (p.x < st.left || p.x > st.right) p.life = 0; else p.y = fy - p.r;
      if (p.t % 3 === 0) spawnFx('dust', p.x, fy - 4);
    }
    // impacto con luchadores
    for (const f of BATTLE.fighters) {
      if (p.life <= 0) break;
      if (f === p.owner || f.dead || f.stocks <= 0) continue;
      const hb = f.hurtbox();
      if (!circleRect(p.x, p.y, p.r, hb.x, hb.y, hb.w, hb.h)) continue;
      if (p.hitSet.has(f)) continue;
      if (p.rehitT.get(f) > p.t) continue;
      if (p.arm && p.t < p.arm) continue;
      if (sameTeam(p.owner, f)) continue;
      if (p.reflect && (f.inReflect() || (f.state === 'shield' && abil(f).reflectShield))) {
        p.vx = -p.vx * 1.25; p.vy = -p.vy * 0.5; p.owner = f; p.hitSet.clear(); p.life = Math.max(p.life, 60); p.dmg *= 1.2;
        Audio8.sfx('counter'); spawnFx('hit', p.x, p.y, { col: '#8ecae6', r: 20 });
        continue;
      }
      const r = applyHit(p.owner, f, p, sign(p.vx) || (p.owner ? p.owner.face : 1), { proj: true });
      if (!r) continue;
      if (p.rehit) p.rehitT.set(f, p.t + p.rehit); else p.hitSet.add(f);
      if (p.explodeGround || p.boomOnHit || p.type === 'cannon') { explodeProj(p); break; }
      if (!p.pierce) p.life = 0;
    }
    if (BATTLE.ms && BATTLE.ms.ball && p.life > 0 && !p.hitBall && Modes.kickBall(p.owner, p, sign(p.vx) || 1, p.x, p.y, p.r)) { p.hitBall = true; if (!p.pierce) p.life = 0; }
    if (p.x < st.blast.l - 200 || p.x > st.blast.r + 200 || p.y > st.blast.b + 200 || p.y < st.blast.t - 600) p.life = 0;
  }
  BATTLE.projectiles = BATTLE.projectiles.filter(p => p.life > 0);
}
function explodeProj(p) {
  p.life = 0;
  Audio8.sfx('explosion'); shake(8);
  spawnFx('boom', p.x, p.y, { r: 90, col: p.col === '#222' ? '#ffbe0b' : p.col });
  for (let i = 0; i < 6; i++) spawnFx('smoke', p.x + rand(-30, 30), p.y + rand(-30, 10));
  const r = 70;
  for (const f of BATTLE.fighters) {
    if (f.dead || p.hitSet.has(f)) continue;
    const hb = f.hurtbox();
    if (circleRect(p.x, p.y, r, hb.x, hb.y, hb.w, hb.h)) applyHit(p.owner, f, p, sign(f.x - p.x) || 1, { proj: true });
  }
}
function nearestTarget(p) {
  let best = null, bd = 1e9;
  for (const f of BATTLE.fighters) { if (f === p.owner || f.dead || f.stocks <= 0) continue; const d = dist(f.x, f.y, p.x, p.y); if (d < bd) { bd = d; best = f; } }
  return best;
}
function drawProjectiles(c) {
  for (const p of BATTLE.projectiles) {
    if (p.delay > 0) continue;
    c.save(); c.translate(p.x, p.y);
    switch (p.type) {
      case 'shuriken':
        c.rotate(p.t * 0.6);
        drawStar(c, 0, 0, p.r + 1.5, 4.5, 'rgba(12,14,22,.9)', 0);
        { const sg = c.createLinearGradient(-p.r, -p.r, p.r, p.r); sg.addColorStop(0, '#f1f5f9'); sg.addColorStop(0.5, '#8a96a8'); sg.addColorStop(1, '#2c333f'); drawStar(c, 0, 0, p.r, 3.5, sg, 0); }
        c.fillStyle = '#1b1f28'; c.beginPath(); c.arc(0, 0, 2.2, 0, TAU); c.fill();
        break;
      case 'fireball': case 'wave': {
        ART.drawGlow(c, 0, 0, p.r * 3, p.col, 0.7);
        c.globalCompositeOperation = 'lighter';
        const g = c.createRadialGradient(0, 0, 1, 0, 0, p.r * 1.3);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#fff3b0'); g.addColorStop(0.65, p.col); g.addColorStop(1, 'rgba(255,80,0,0)');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, p.r * 1.3, 0, TAU); c.fill();
        c.globalCompositeOperation = 'source-over';
        break;
      }
      case 'orb': case 'laser': {
        c.globalCompositeOperation = 'lighter';
        if (p.type === 'laser') {
          ART.drawGlow(c, 0, 0, 40, p.col, 0.6);
          c.fillStyle = withAlpha(p.col.length === 7 ? p.col : '#48cae4', 0.55); roundRect(c, -28, -5, 56, 10, 5); c.fill();
          c.fillStyle = '#ffffff'; roundRect(c, -22, -1.6, 44, 3.2, 1.6); c.fill();
        } else {
          ART.drawGlow(c, 0, 0, p.r * 3, p.col, 0.7);
          const g = c.createRadialGradient(0, 0, 1, 0, 0, p.r * 1.3);
          g.addColorStop(0, '#fff'); g.addColorStop(0.4, p.col); g.addColorStop(1, 'rgba(72,202,228,0)');
          c.fillStyle = g; c.beginPath(); c.arc(0, 0, p.r * 1.3, 0, TAU); c.fill();
        }
        c.globalCompositeOperation = 'source-over';
        break;
      }
      case 'homing': case 'fstar':
        c.rotate(p.t * 0.2);
        drawStar(c, 0, 0, p.r + 3, (p.r + 3) * 0.45, '#10131a');
        drawStar(c, 0, 0, p.r, p.r * 0.45, p.col);
        break;
      case 'bowling':
        c.rotate(p.x * 0.05);
        c.fillStyle = '#10131a'; c.beginPath(); c.arc(0, 0, p.r + 2, 0, TAU); c.fill();
        c.fillStyle = p.col; c.beginPath(); c.arc(0, 0, p.r, 0, TAU); c.fill();
        c.fillStyle = '#8d99ae'; for (const [x, y] of [[-5, -6], [3, -8], [-1, 1]]) { c.beginPath(); c.arc(x, y, 2.6, 0, TAU); c.fill(); }
        break;
      case 'rock': case 'meteor': {
        // roca ardiente: estela de fuego, textura y grietas de lava
        const v = Math.hypot(p.vx || 0, p.vy || 0) || 1, tx = -(p.vx || 0) / v, ty = -(p.vy || 0) / v;
        c.save(); c.globalCompositeOperation = 'lighter';
        const tg = c.createLinearGradient(0, 0, tx * p.r * 5, ty * p.r * 5); tg.addColorStop(0, 'rgba(255,200,90,.8)'); tg.addColorStop(0.4, 'rgba(255,90,20,.45)'); tg.addColorStop(1, 'rgba(255,60,10,0)');
        c.fillStyle = tg; c.beginPath(); c.moveTo(-ty * p.r, tx * p.r); c.lineTo(tx * p.r * 5, ty * p.r * 5); c.lineTo(ty * p.r, -tx * p.r); c.closePath(); c.fill();
        c.restore();
        ART.drawGlow(c, 0, 0, p.r * 2.6, '#ff6a1a', 0.55);
        c.rotate(p.t * 0.1);
        c.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, r = p.r * (0.8 + hash1(i, p.r | 0) * 0.28); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath();
        const rg = c.createRadialGradient(-p.r * 0.3, -p.r * 0.35, 1, 0, 0, p.r * 1.1); rg.addColorStop(0, p.type === 'meteor' ? '#9a7a64' : '#7a5a48'); rg.addColorStop(0.6, '#3d2a24'); rg.addColorStop(1, '#140c0a');
        c.fillStyle = rg; c.fill();
        c.save(); c.clip(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,140,40,.85)'; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(-p.r * 0.6, p.r * 0.2); c.lineTo(-p.r * 0.1, -p.r * 0.1); c.lineTo(p.r * 0.2, p.r * 0.5); c.moveTo(-p.r * 0.1, -p.r * 0.1); c.lineTo(p.r * 0.5, -p.r * 0.4); c.stroke(); c.restore();
        break;
      }
      case 'ball':
        c.restore(); drawSoccerBall(c, p.x, p.y, p.r, p.x * 0.05); c.save();
        break;
      case 'cannon':
        { const cg = c.createRadialGradient(-p.r * 0.35, -p.r * 0.4, 1, 0, 0, p.r); cg.addColorStop(0, '#9aa3b2'); cg.addColorStop(0.35, '#3a404c'); cg.addColorStop(1, '#0b0d12');
          c.fillStyle = cg; c.beginPath(); c.arc(0, 0, p.r, 0, TAU); c.fill();
          c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-p.r * 0.35, -p.r * 0.42, p.r * 0.28, p.r * 0.14, -0.6, 0, TAU); c.fill(); }
        break;
      case 'item':
        c.rotate(p.t * 0.3); drawItemIcon(c, p.itemType, 0, 0, 1);
        break;
      default:
        if (typeof drawProj2 === 'function' && drawProj2(c, p)) break;
        c.fillStyle = p.col; c.beginPath(); c.arc(0, 0, p.r, 0, TAU); c.fill();
    }
    c.restore();
  }
}
