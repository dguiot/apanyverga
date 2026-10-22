'use strict';
// ============================================================
//  FPS: LUZ Y COLOR DE CINE
//  El mundo y el arma se dibujan en la misma textura (el arma encima, con su propia profundidad) y
//  pasan por la cadena del kart: brillo en el sol, los fogonazos y las explosiones, gradación de color
//  con más contraste, viñeta y un ligero desenfoque de orillas al correr. Solo con una vista local y
//  con ART.hi (se apaga en Xbox, en Calidad «Rápida», con «Efectos reducidos» o si el equipo es lento).
// ============================================================
const FPS_GRADE = { sat: 1.0, contrast: 1.13, lift: [0.003, 0.002, -0.004], gain: [1.03, 1.0, 0.97], bloom: 0.2, radius: 0.45, threshold: 1.15, vig: 0.4, exposure: 1.04 };
const FPSPost = {
  composer: null, w: 0, h: 0, blur: 0,
  enabled(views) { return views === 1 && KartPost.enabled(); },
  build(renderer) {
    const T = KartGL, w = renderer.domElement.width, h = renderer.domElement.height, G = FPS_GRADE;
    this.dispose();
    const c = this.composer = new T.EffectComposer(renderer, new T.WebGLRenderTarget(w, h, { type: T.HalfFloatType, samples: 4 }));
    this.bloom = new T.UnrealBloomPass(new T.Vector2(Math.round(w / 2), Math.round(h / 2)), G.bloom, G.radius, G.threshold);
    this.grade = new T.ShaderPass(KartPost.gradeShader());
    const u = this.grade.uniforms; u.sat.value = G.sat; u.contrast.value = G.contrast; u.lift.value.set(...G.lift); u.gain.value.set(...G.gain); u.vig.value = G.vig;
    c.addPass(new T.ShaderPass(KartPost.cleanShader())); c.addPass(this.bloom); c.addPass(this.grade); c.addPass(new T.OutputPass());
    this.w = w; this.h = h;
  },
  dispose() { if (this.composer) { this.composer.renderTarget1.dispose(); this.composer.renderTarget2.dispose(); this.bloom.dispose(); this.composer = null; } },
  // destino donde quien llama dibuja mundo y arma; null = sin posproceso (dibujar directo)
  begin(renderer, views) {
    if (!this.enabled(views)) { this.dispose(); return null; }
    const w = renderer.domElement.width, h = renderer.domElement.height;
    if (!this.composer || this.w !== w || this.h !== h) this.build(renderer);
    const target = this.composer.readBuffer;
    renderer.setRenderTarget(target); renderer.setScissorTest(false); renderer.setViewport(0, 0, w, h); renderer.clear();
    return target;
  },
  finish(renderer, p, paused) {
    const u = this.grade.uniforms, run = p.sprint && !p.dead && !paused && !reducedMotion ? .32 : 0;
    this.blur = lerp(this.blur, run, .1); u.speed.value = this.blur; u.kick.value = 0; u.aspect.value = this.w / this.h;
    renderer.setRenderTarget(null); renderer.toneMappingExposure = FPS_GRADE.exposure;
    this.composer.render();
  },
};
