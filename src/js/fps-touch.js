'use strict';
// ============================================================
//  FPS EN EL CELULAR
//  Antes el FPS no tenía controles táctiles: en el teléfono no había cómo moverse. Ahora, como en los
//  battle royale de celular:
//  · pulgar izquierdo: palanca flotante para caminar; llevarla al tope hacia adelante corre solo
//  · pulgar derecho: arrastrar en cualquier parte libre de la mitad derecha mueve la mira
//  · DISPARAR grande a la derecha (y otro a la izquierda): mientras lo mantienes, arrastrarlo también apunta
//  · MIRA y AGACHAR se quedan puestos con un toque (agacharse corriendo hace la barrida)
//  · SALTAR, RECARGAR, ARMA, GRANADA y RECOGER
//  Con pantalla táctil o mando hay asistencia de mira: la mira frena un poco al pasar sobre un rival
//  visible y lo sigue suavemente si te mueves. Con ratón no hay asistencia.
// ============================================================
const FPSTouch = {
  // dx/dy: distancia desde la esquina inferior derecha (o izquierda con left) en unidades de u
  BUTTONS: [
    { a: 'fire', label: 'DISPARAR', col: '#e63946', dx: .2, dy: .25, r: .13 },
    { a: 'aim', label: 'MIRA', col: '#3a86ff', dx: .47, dy: .14, r: .085, toggle: true },
    { a: 'jump', label: 'SALTAR', col: '#2dc653', dx: .13, dy: .55, r: .09 },
    { a: 'crouch', label: 'AGACHAR', col: '#8ecae6', dx: .44, dy: .4, r: .075, toggle: true },
    { a: 'reload', label: 'RECARGAR', col: '#ffbe0b', dx: .7, dy: .13, r: .07 },
    { a: 'swap', label: 'ARMA', col: '#b48cf2', dx: .36, dy: .66, r: .07 },
    { a: 'grenade', label: 'GRANADA', col: '#ff8c42', dx: .6, dy: .58, r: .065 },
    { a: 'interact', label: 'RECOGER', col: '#2ec4b6', dx: .68, dy: .35, r: .065 },
    { a: 'fire', label: 'DISPARAR', col: '#e63946', dx: .14, dy: .66, r: .075, left: true },
  ],
  look: new Map(), lookX: 0, lookY: 0, aim: false, crouch: false, sens: 1,
  on() { return APP.screen === 'fpsGame'; },
  reset() { this.look.clear(); this.lookX = this.lookY = 0; this.aim = this.crouch = false; },
  layout(T) {
    const L = T.L; if (!L) return;
    L.fps = this.on();
    if (!L.fps) return;
    const { vw, vh, u, sl, sr, sb } = L;
    L.btns = this.BUTTONS.map(b => Object.assign({}, b, { x: b.left ? sl + b.dx * u : vw - sr - b.dx * u, y: vh - sb - b.dy * u, rr: b.r * u }));
  },
  // ---- lectura para FPSControls: lo que tocó la persona desde el cuadro anterior ----
  read() {
    const T = TouchPad, out = { x: 0, z: 0, lx: 0, ly: 0, fire: false, aim: false, crouch: false, sprint: false, jump: false, reload: false, swap: false, grenade: false, interact: false, touch: true };
    if (!T.active || !T.shown() || !T.L?.fps) { this.lookX = this.lookY = 0; return out; }
    T.expire();
    if (T.stick) {
      let x = (T.stick.x - T.stick.cx) / T.L.R, y = (T.stick.y - T.stick.cy) / T.L.R; const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
      out.x = Math.abs(x) < .12 ? 0 : x; out.z = Math.abs(y) < .12 ? 0 : -y;
      // palanca al tope hacia adelante: corre solo
      out.sprint = m > .92 && -y > .7;
    }
    // la mira: pixeles de pantalla → radianes (media vuelta ≈ deslizar casi todo el ancho del teléfono)
    const k = 3.5 / Math.max(320, T.L.vw) * this.sens;
    out.lx = this.lookX * k; out.ly = this.lookY * k * .85; this.lookX = this.lookY = 0;
    const held = new Set(T.held.values());
    out.fire = held.has('fire') || T.tapped.has('fire');
    for (const a of ['jump', 'reload', 'swap', 'grenade', 'interact']) out[a] = T.tapped.has(a);
    if (T.tapped.has('aim')) this.aim = !this.aim;
    if (T.tapped.has('crouch')) this.crouch = !this.crouch;
    if (out.jump) this.crouch = false;
    const p = APP.fps?.player; if (p?.dead) this.aim = this.crouch = false;
    out.aim = this.aim; out.crouch = this.crouch;
    for (const a of [...T.tapped]) if (a !== 'start') T.tapped.delete(a);
    return out;
  },
};

// ---- TouchPad: tercer modo (además de pelea y kart) ----
{
  const T = TouchPad;
  const shown = T.shown; T.shown = function () { if (APP.screen === 'fpsGame') { const m = APP.fps; return this.active && !!m && !m.paused && !ShellUI.paused && m.phase !== 'done'; } return shown.call(this); };
  const measure = T.measure; T.measure = function () { measure.call(this); FPSTouch.layout(this); };
  const labels = T.kartLabels; T.kartLabels = function () { if (this.L?.fps) return; return labels.call(this); };
  const start = T.start; T.start = function (k, x, y) {
    if (!this.L?.fps) return start.call(this, k, x, y);
    // un dedo que iOS reinicia conserva su papel (también si era la mira)
    for (const [ok, f] of this.fingers) if (f.gone && Math.hypot(f.x - x, f.y - y) < this.L.u * .14) { if (FPSTouch.look.has(ok)) { FPSTouch.look.set(k, { x, y }); FPSTouch.look.delete(ok); } this.rekey(ok, k, x, y); return; }
    const b = this.hitButton(x, y);
    if (b) {
      this.fingers.set(k, { x, y, gone: 0 }); this.held.set(k, b.a); this.tapped.add(b.a); this.pressT[b.a] = performance.now();
      if (b.a === 'fire') FPSTouch.look.set(k, { x, y }); // el botón de disparo también apunta al arrastrarlo
      if (navigator.vibrate) try { navigator.vibrate(8); } catch (er) { /* sin vibración */ }
    } else if (x < this.L.vw * .46) {
      if (this.stick) this.drop(this.stick.key);
      this.fingers.set(k, { x, y, gone: 0 }); this.stick = { key: k, cx: x, cy: y, x, y };
    } else { this.fingers.set(k, { x, y, gone: 0 }); FPSTouch.look.set(k, { x, y }); }
  };
  const moveTo = T.moveTo; T.moveTo = function (k, x, y) {
    if (!this.L?.fps) return moveTo.call(this, k, x, y);
    const f = this.fingers.get(k); if (!f) return;
    const l = FPSTouch.look.get(k);
    if (l) { FPSTouch.lookX += x - l.x; FPSTouch.lookY += y - l.y; l.x = x; l.y = y; f.x = x; f.y = y; return; }
    if (this.held.has(k)) { f.x = x; f.y = y; return; } // los demás botones no cambian al deslizar
    return moveTo.call(this, k, x, y);
  };
  const drop = T.drop; T.drop = function (k) { FPSTouch.look.delete(k); return drop.call(this, k); };
  const rekey = T.rekey; T.rekey = function (old, k, x, y) { const l = FPSTouch.look.get(old); if (l) { FPSTouch.look.delete(old); FPSTouch.look.set(k, l); } return rekey.call(this, old, k, x, y); };
  const release = T.release; T.release = function () { FPSTouch.look.clear(); FPSTouch.lookX = FPSTouch.lookY = 0; return release.call(this); };
  // para Devices.poll en el FPS solo cuenta la pausa: lo demás lo lee FPSControls (si no, se comería los toques)
  const read = T.read; T.read = function () {
    if (!this.L?.fps || APP.screen !== 'fpsGame') return read.call(this);
    const s = blankState(); if (!this.shown()) { if (this.fingers.size || this.tapped.size) this.release(); return s; }
    this.expire(); s.start = [...this.held.values()].includes('start') || this.tapped.has('start'); this.tapped.delete('start'); s.any = s.start; return s;
  };
  // dibujo: los botones de alternar se quedan encendidos mientras están puestos
  const draw = T.draw; T.draw = function () {
    if (!this.L?.fps || !this.shown()) return draw.call(this);
    const keep = new Map(this.held), extra = [];
    if (FPSTouch.aim) extra.push('aim'); if (FPSTouch.crouch) extra.push('crouch');
    extra.forEach((a, i) => this.held.set('toggle' + i, a));
    try { draw.call(this); } finally { this.held = keep; }
    // guía de los primeros segundos
    const m = APP.fps; if (m && m.time < 8) { const g = this.g, L = this.L; g.save(); g.globalAlpha = clamp((8 - m.time) / 2, 0, .85); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `600 ${Math.round(L.u * .034)}px 'Barlow', system-ui, sans-serif`; g.fillText('Desliza aquí para mirar', L.vw * .72, L.vh * .32); g.restore(); }
  };
  // el juego entra y sale del FPS: botones del modo y nada pegado
  const go = APP.go; APP.go = function (s) { const was = this.screen; go.call(this, s); if (was !== s && (s === 'fpsGame' || was === 'fpsGame')) { FPSTouch.reset(); T.release(); T.measure(); } };
  const want = IOSFS.want; IOSFS.want = function () { const r = want.call(this); document.documentElement.classList.toggle('fight', ['battle', 'netview', 'kartRace', 'fpsGame'].includes(APP.screen)); return r; };
}

// ---- asistencia de mira (táctil y mando; con ratón no) ----
const FPSAimAssist = {
  // radianes por cuadro hacia el pecho del rival más cercano a la mira; freno de la mira encima de él
  apply(p, out, strength = 1) {
    const m = APP.fps; if (!m || !p || p.dead) return out;
    const eye = { x: p.x, y: p.y + FPSBody.eyeHeight(p), z: p.z }, cone = (p.ads > .5 ? .07 : .11);
    let best = null, bestErr = cone;
    for (const q of m.players) {
      if (q === p || q.dead || q.invuln > 1.5) continue;
      const dx = q.x - eye.x, dz = q.z - eye.z, d = Math.hypot(dx, dz); if (d < 1 || d > 70) continue;
      const ty = q.y + FPSBody.bodyHeight(q) * .62, yaw = Math.atan2(dx, -dz), pitch = Math.atan2(eye.y - ty, d);
      const ey = Math.atan2(Math.sin(yaw - p.yaw), Math.cos(yaw - p.yaw)), ep = pitch - p.pitch, err = Math.hypot(ey, ep * .8);
      if (err >= bestErr) continue;
      const dir = { x: dx, y: ty - eye.y, z: dz }, len = Math.hypot(dir.x, dir.y, dir.z); dir.x /= len; dir.y /= len; dir.z /= len;
      if (FPSWorld.wallHit(eye, dir, len - .4)) continue; // solo a quien se ve
      bestErr = err; best = { ey, ep, err };
    }
    if (!best) return out;
    const near = 1 - best.err / cone, moving = Math.hypot(out.x || 0, out.z || 0) > .2 || out.fire || p.ads > .3;
    // freno: la mira va más despacio sobre el rival
    const slow = 1 - .45 * near * strength; out.lx = (out.lx || 0) * slow; out.ly = (out.ly || 0) * slow;
    // imán suave: solo si te mueves, disparas o apuntas (no te gira la cámara si no haces nada)
    if (moving) { const pull = .07 * near * strength; out.lx += clamp(best.ey * pull, -.01, .01); out.ly += clamp(best.ep * pull, -.008, .008); }
    return out;
  },
};
{
  const read = FPSControls.read; FPSControls.read = function (slot = 0) {
    const out = read.call(this, slot), m = APP.fps;
    let assisted = false;
    if (slot === 0 && TouchPad.active && APP.screen === 'fpsGame') {
      const t = FPSTouch.read();
      if (Math.hypot(t.x, t.z) > Math.hypot(out.x, out.z)) { out.x = t.x; out.z = t.z; }
      out.lx += t.lx; out.ly += t.ly;
      for (const a of ['fire', 'aim', 'crouch', 'sprint', 'jump', 'reload', 'swap', 'grenade', 'interact']) out[a] = out[a] || t[a];
      const c = Devices.ctrls.touch; if (!ShellUI.active && c && c.pressed('start')) out.pause = true;
      assisted = Math.abs(t.lx) + Math.abs(t.ly) > 0 || t.fire || t.aim || Math.hypot(t.x, t.z) > 0;
    }
    // mando: con la palanca o los gatillos en uso también hay asistencia (con el ratón no)
    const pm = APP.fps?.localCount === 1 || APP.fps?.online ? ModeControls.pad('fps') : slot > 0 ? padInfo.find(q => q.index === APP.fps?.devices?.[slot]) : null, a = pm?.axes || [], b = pm?.buttons || [];
    const pad = !!pm && (a.some(v => Math.abs(v || 0) > .2) || !!b[6] || !!b[7]) && !(slot === 0 && (this.mouse.fire || this.mouse.aim));
    if (m && !m.online && (assisted || pad) && Prefs.aimAssist !== false) {
      const p = slot === 0 ? m.player : m.players.filter(q => !q.bot)[slot];
      FPSAimAssist.apply(p, out, assisted ? 1 : .8);
    } else if (m && m.online && (assisted || pad) && Prefs.aimAssist !== false) FPSAimAssist.apply(m.player, out, assisted ? 1 : .8);
    return out;
  };
  const reset = FPSControls.reset; FPSControls.reset = function () { reset.call(this); FPSTouch.lookX = FPSTouch.lookY = 0; };
  // en el teléfono no se pide capturar el puntero (y un toque no es un clic de disparo)
  const lock = FPSControls.lock; FPSControls.lock = function () { if (TouchPad.active) return; return lock.call(this); };
}
