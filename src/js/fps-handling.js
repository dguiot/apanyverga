'use strict';
// ============================================================
//  FPS: MANEJO DEL ARMA EN PRIMERA PERSONA
//  Dónde va el arma frente a la cámara en cada cuadro: a la cadera o apuntando, con inercia al mirar
//  (se queda atrás y regresa con resorte), paso en forma de ocho al caminar, postura baja al correr,
//  inclinación al moverte de lado, caída al aterrizar y retroceso propio de cada arma (patada atrás,
//  cabeceo y un poco de giro). La inclinación de la recarga viene de FPSWeaponArt.animate (u.anim).
//  Solo presentación: no cambia la simulación ni lo que viaja en línea. Apuntando y quieto, el arma
//  queda exactamente en su posición de mira (las pruebas de apertura dependen de eso).
// ============================================================
const FPSHandling = {
  HIP: [[.085, -.095, -.29], [.105, -.12, -.33], [.115, -.135, -.37], [.115, -.125, -.4], [.12, -.13, -.47]],
  ADS_Z: [-.3, -.27, -.25, -.31, -.3],
  // por arma: patada atrás (m), cabeceo (rad), giro lateral (rad), rigidez y amortiguación del resorte
  KICK: [
    { back: .028, pitch: .11, yaw: .03, k: 300, c: 24 },
    { back: .016, pitch: .04, yaw: .022, k: 380, c: 30 },
    { back: .022, pitch: .055, yaw: .02, k: 340, c: 27 },
    { back: .07, pitch: .2, yaw: .035, k: 170, c: 15 },
    { back: .085, pitch: .16, yaw: .025, k: 150, c: 14 },
  ],
  state(view, p) {
    return view.hand || (view.hand = { x: 0, vx: 0, y: 0, vy: 0, rx: 0, vrx: 0, ry: 0, vry: 0, kz: 0, vkz: 0, kp: 0, vkp: 0, ky: 0, vky: 0, land: 0, vland: 0, run: 0, roll: 0, yaw: p.yaw, pitch: p.pitch, shot: p.shot });
  },
  spring(s, key, target, k, c, dt) { const v = 'v' + key; s[v] += ((target - s[key]) * k - s[v] * c) * dt; s[key] += s[v] * dt; },
  place(view, p, gun, dt) {
    const s = this.state(view, p), id = p.gun, u = gun.userData, A = u.anim || {}, a = p.ads * p.ads * (3 - 2 * p.ads), still = reducedMotion ? 0 : 1;
    const sub = dt > 0 ? Math.max(1, Math.ceil(dt / (1 / 120))) : 0, h = sub ? dt / sub : 0;
    // inercia al mirar: velocidad angular → el arma se retrasa (menos al apuntar)
    const dyaw = Math.atan2(Math.sin(p.yaw - s.yaw), Math.cos(p.yaw - s.yaw)), dpitch = p.pitch - s.pitch; s.yaw = p.yaw; s.pitch = p.pitch;
    const w = dt > 0 ? 1 / dt : 0, lag = (1 - a * .85) * still, tx = clamp(-dyaw * w * .006, -.035, .035) * lag, ty = clamp(dpitch * w * .004, -.025, .025) * lag;
    // retroceso: impulso en el tiro
    if (p.shot !== s.shot) {
      if (p.shot > s.shot) {
        const K = this.KICK[id], side = (hash1(p.shot, id * 7 + 3) - .5) * 2, aim = 1 - a * .45;
        s.vkz += K.back * 26 * aim; s.vkp += K.pitch * 24 * aim; s.vky += side * K.yaw * 24 * aim;
      }
      s.shot = p.shot;
    }
    if (p.landing > .12) s.vland -= Math.min(.9, p.landing) * 1.6 * still;
    const K = this.KICK[id], lateral = p.vx * Math.cos(p.yaw) + p.vz * Math.sin(p.yaw);
    s.run = approach(s.run, p.sprint && p.grounded && !p.reloading ? 1 : 0, dt * 6);
    for (let i = 0; i < sub; i++) {
      this.spring(s, 'x', tx, 120, 15, h); this.spring(s, 'y', ty, 120, 15, h);
      this.spring(s, 'rx', ty * 2.2, 110, 14, h); this.spring(s, 'ry', tx * 2.6, 110, 14, h);
      this.spring(s, 'kz', 0, K.k, K.c, h); this.spring(s, 'kp', 0, K.k, K.c, h); this.spring(s, 'ky', 0, K.k * .8, K.c, h);
      this.spring(s, 'land', 0, 140, 13, h);
    }
    s.roll = lerp(s.roll, clamp(-lateral * .012, -.07, .07) * (1 - a * .7) * still, Math.min(1, dt * 8));
    // paso en forma de ocho; más amplio corriendo, casi nada apuntando
    const speed = Math.hypot(p.vx, p.vz), amp = (p.grounded ? clamp(speed / 6, 0, 1.7) : .2) * (1 - a * .88) * still * (1 + s.run * .6), ph = p.bob * 1.15;
    const bx = Math.sin(ph) * .008 * amp, by = -Math.abs(Math.cos(ph)) * .007 * amp, br = Math.sin(ph) * .014 * amp;
    // postura al correr: arma cruzada y baja (pistola hacia arriba)
    const run = s.run * (1 - a), pistol = id === 0, equip = (view.equip || 0) ** 2, crouch = FPSBody.stance(p) * (1 - a), throwing = clamp((p.throwTimer || 0) / .5, 0, 1);
    const hip = this.HIP[id], ads = [0, -FPSWeaponArt.SIGHT[id], this.ADS_Z[id]];
    gun.position.set(
      lerp(hip[0], ads[0], a) + s.x + bx + (pistol ? -.035 : .025) * run + (A.px || 0),
      lerp(hip[1], ads[1], a) + s.y + by - (pistol ? .02 : .045) * run + s.land * .05 - equip * .22 - throwing * .2 - crouch * .008 + (A.py || 0),
      lerp(hip[2], ads[2], a) + s.kz + (pistol ? .02 : .05) * run + equip * .08);
    gun.rotation.set(
      s.rx + s.kp + (pistol ? .55 : -.2) * run + s.land * .08 - equip * .55 - throwing * .45 + (A.pitch || 0),
      s.ry + s.ky + (pistol ? .15 : .62) * run,
      s.roll + br + (pistol ? .1 : .4) * run + crouch * .06 + (A.roll || 0));
  },
  // luz principal del arma desde el mismo lado que el sol del mundo (en el espacio de la cámara)
  light(key, sun, camera) {
    if (!key || !sun) return;
    const d = sun.position.clone().sub(sun.target.position).normalize().applyQuaternion(camera.quaternion.clone().invert());
    key.position.copy(d.multiplyScalar(5));
  },
};
