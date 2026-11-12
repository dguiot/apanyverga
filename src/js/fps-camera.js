'use strict';
// ============================================================
//  FPS: CÁMARA AL HOMBRO (estilo "battle royale")
//  Ves a tu personaje —el mismo de las peleas y del Kart— desde atrás y a la derecha. La simulación no
//  cambia: las balas siguen saliendo de los ojos hacia donde apuntas. La cámara se coloca detrás y gira
//  hacia el punto exacto al que llega esa línea, así que la mira del centro marca donde pega el tiro.
//  Una pared detrás acerca la cámara; el francotirador con mira pasa a primera persona.
//  V (o cruceta arriba) alterna con la vista en primera persona de siempre; la elección se guarda.
// ============================================================
const FPSCam = {
  third: true, padPrev: false,
  load() { try { this.third = localStorage.getItem('esmash-fps-cam') !== 'first'; } catch (e) { this.third = true; } },
  toggle() {
    this.third = !this.third; try { localStorage.setItem('esmash-fps-cam', this.third ? 'third' : 'first'); } catch (e) { /* modo privado */ }
    Toasts.push(this.third ? '🎥 Cámara al hombro' : '🎯 Primera persona');
  },
  // se llama desde el paso de simulación (ahí viven los flancos de tecla)
  input() {
    const pad = ModeControls.pad('fps'), up = !!pad?.buttons?.[12]?.pressed || pad?.buttons?.[12] === true;
    if (keyEdge('kb1', 'KeyV') || (up && !this.padPrev)) this.toggle();
    this.padPrev = up;
  },
  active(p) { return this.third && !(p.gun === 4 && p.ads > .6); },
  // La cámara ya trae la posición de los ojos y la rotación de la mira. Devuelve true si quedó al hombro.
  place(view, camera, p) {
    if (!this.active(p)) { view.tpDist = view.tpAim = null; return false; }
    const T = KartGL, eye = camera.position.clone(), fwd = new T.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), right = new T.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const a = p.ads * p.ads * (3 - 2 * p.ads), dead = p.dead ? 1 : 0;
    const back = lerp(3.4, 1.9, a) + dead * 1.6, side = lerp(1, .78, a) * (1 - dead), rise = lerp(.78, .5, a) + dead * .9;
    const want = eye.clone().addScaledVector(fwd, -back).addScaledVector(right, side); want.y += rise;
    const dir = want.clone().sub(eye), len = dir.length(); dir.multiplyScalar(1 / len);
    const wall = FPSWorld.wallHit(eye, dir, len + .35), free = wall ? Math.max(.3, wall.distance - .35) : len;
    // acercarse de golpe (no atravesar la pared), alejarse con suavidad
    const dt = Math.min(GameFeel.dt || 1 / 60, .05);
    view.tpDist = view.tpDist == null || free < view.tpDist ? free : lerp(view.tpDist, free, 1 - Math.exp(-dt * 7));
    // punto al que llega la bala: la cámara converge ahí
    const hit = FPSWorld.wallHit(eye, fwd, 160), reach = clamp(hit ? hit.distance : 160, 6, 160);
    view.tpAim = view.tpAim == null ? reach : lerp(view.tpAim, reach, 1 - Math.exp(-dt * 12));
    camera.position.copy(eye).addScaledVector(dir, view.tpDist);
    const floor = FPSWorld.height(camera.position.x, camera.position.z) + .25; if (camera.position.y < floor) camera.position.y = floor;
    camera.lookAt(eye.clone().addScaledVector(fwd, view.tpAim));
    return true;
  },
};
FPSCam.load();
