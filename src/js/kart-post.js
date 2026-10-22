'use strict';
// ============================================================
//  KART: LUZ Y COLOR DE CINE
//  La pista se renderiza a una textura y pasa por: brillo (lo que pasa de la luz normal "sangra":
//  neones, turbos, cajas, el sol), gradación por pista (cálida en el Mercado, dorada en el Cañón,
//  fría y saturada en Neón: igual que las peleas), viñeta, y un desenfoque radial cuando vas con
//  turbo. Sin esto todo se veía plano y deslavado.
//  En calidad Rápida (Xbox), efectos reducidos o pantalla dividida se renderiza directo, como antes.
// ============================================================
const KART_GRADE = {
  town:   { sat: 1.2,  contrast: 1.1,  lift: [0.005, 0.0, -0.01], gain: [1.04, 1.0, 0.94], bloom: 0.32, radius: 0.55, threshold: 0.92, vig: 0.42, exposure: 1.08 },
  canyon: { sat: 1.18, contrast: 1.12, lift: [0.012, 0.0, -0.02], gain: [1.08, 0.98, 0.88], bloom: 0.38, radius: 0.6, threshold: 0.9, vig: 0.48, exposure: 1.06 },
  neon:   { sat: 1.3, contrast: 1.12, lift: [-0.01, 0.0, 0.025], gain: [0.96, 1.0, 1.1], bloom: 0.72, radius: 0.5, threshold: 0.55, vig: 0.55, exposure: 1.2 },
};
const KartPost = {
  composer: null, w: 0, h: 0, theme: null, speed: 0, kick: 0,
  // ¿hay presupuesto? ART.hi ya es falso en Xbox, en "Rápida" y con "Efectos reducidos", y es lo primero que
  // apaga ART.measure cuando un equipo no llega a 60 cuadros: así un celular lento pierde el posproceso antes
  // que la resolución
  enabled() { return typeof KartGL !== 'undefined' && !!KartGL.EffectComposer && ART.hi && !ART.lite; },
  // limpia la textura antes del brillo: un solo pixel NaN/Inf (relieve en superficies muy rasantes) se
  // convertía en una mancha blanca enorme al pasar por el bloom
  cleanShader() {
    return {
      uniforms: { tDiffuse: { value: null } },
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);vec3 v=c.rgb;bvec3 ok=equal(v,v);v=vec3(ok.x?v.x:0.,ok.y?v.y:0.,ok.z?v.z:0.);gl_FragColor=vec4(clamp(v,0.,48.),1.);}',
    };
  },
  gradeShader() {
    return {
      uniforms: { tDiffuse: { value: null }, sat: { value: 1 }, contrast: { value: 1 }, lift: { value: new KartGL.Vector3() }, gain: { value: new KartGL.Vector3(1, 1, 1) },
        vig: { value: 0.4 }, speed: { value: 0 }, kick: { value: 0 }, aspect: { value: 16 / 9 } },
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      // Color en lineal (antes del tonemapping de OutputPass): la gradación no aplasta los brillos.
      fragmentShader: `uniform sampler2D tDiffuse;uniform float sat,contrast,vig,speed,kick,aspect;uniform vec3 lift,gain;varying vec2 vUv;
vec3 grade(vec3 c){float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,sat);
  c=c*gain+lift;                                      // tinte de luces (gain) y de sombras (lift)
  vec3 lg=log2(max(c,1e-4));c=exp2((lg+2.47)*contrast-2.47); // contraste alrededor del gris medio (0.18)
  return max(c,0.);}
void main(){vec2 d=vUv-.5;float r=length(d*vec2(aspect,1.));
  vec3 col=texture2D(tDiffuse,vUv).rgb;
  // turbo: la orilla de la imagen se estira hacia el centro (el centro queda nítido)
  float blur=speed*smoothstep(.18,.75,r);
  if(blur>.001){vec3 acc=col;float wsum=1.;for(int i=1;i<7;i++){float t=float(i)/6.;vec2 uv=.5+d*(1.-blur*.07*t);acc+=texture2D(tDiffuse,uv).rgb*(1.-t*.5);wsum+=1.-t*.5;}col=acc/wsum;}
  col=grade(col);
  // impacto: un destello que se apaga solo
  col+=vec3(1.,.82,.55)*kick*.35*(1.-r);
  float v=smoothstep(.95,.25,r*(1.+vig*.55));col*=mix(1.-vig*.85,1.,v);
  gl_FragColor=vec4(col,1.);}`,
    };
  },
  build(renderer, scene, camera) {
    const T = KartGL, w = renderer.domElement.width, h = renderer.domElement.height;
    this.dispose();
    // 4 muestras de antialias en la textura (el antialias del lienzo no aplica al renderizar a textura)
    const rt = new T.WebGLRenderTarget(w, h, { type: T.HalfFloatType, samples: 4 });
    const c = this.composer = new T.EffectComposer(renderer, rt);
    this.renderPass = new T.RenderPass(scene, camera);
    this.bloom = new T.UnrealBloomPass(new T.Vector2(Math.round(w / 2), Math.round(h / 2)), 0.4, 0.6, 0.9);
    this.grade = new T.ShaderPass(this.gradeShader());
    this.output = new T.OutputPass();
    c.addPass(this.renderPass); c.addPass(new T.ShaderPass(this.cleanShader())); c.addPass(this.bloom); c.addPass(this.grade); c.addPass(this.output);
    this.w = w; this.h = h; this.scene = scene; this.theme = null;
  },
  dispose() { if (this.composer) { this.composer.renderTarget1.dispose(); this.composer.renderTarget2.dispose(); this.bloom.dispose(); this.composer = null; } },
  // render de una vista completa; false = no hay postproceso y quien llama renderiza directo
  render(renderer, scene, camera, race) {
    if (!this.enabled()) { this.dispose(); return false; }
    const w = renderer.domElement.width, h = renderer.domElement.height;
    if (!this.composer || this.w !== w || this.h !== h || this.scene !== scene) this.build(renderer, scene, camera);
    this.renderPass.camera = camera;
    const theme = race.course.info.theme, G = KART_GRADE[theme] || KART_GRADE.town;
    if (this.theme !== theme) {
      this.theme = theme; const u = this.grade.uniforms;
      u.sat.value = G.sat; u.contrast.value = G.contrast; u.lift.value.set(...G.lift); u.gain.value.set(...G.gain); u.vig.value = G.vig;
      this.bloom.strength = G.bloom; this.bloom.radius = G.radius; this.bloom.threshold = G.threshold;
    }
    const p = race.player, turbo = !reducedMotion && (p.turbo > 0 || p.star > 0) && !race.paused ? 1 : 0;
    this.speed = lerp(this.speed, turbo * clamp(p.v / 120, 0, 1.2), 0.12);
    this.kick = Math.max(0, this.kick - 0.06);
    if (p.stun > (this.lastStun || 0) + 0.2) this.kick = 1; // te pegaron: destello
    this.lastStun = p.stun;
    const u = this.grade.uniforms; u.speed.value = this.speed; u.kick.value = reducedMotion ? 0 : this.kick; u.aspect.value = w / h;
    renderer.toneMappingExposure = G.exposure;
    this.composer.render();
    return true;
  },
};

// ============================================================
//  KART: EFECTOS DE CARRERA
//  Flamas de escape (turbo azul; mini-turbo azul → naranja → morado según la carga), chispas y humo
//  de llantas al derrapar, polvo fuera de la pista y al aterrizar, líneas de velocidad y sacudida
//  de cámara. Antes un derrape a 190 km/h se veía igual que ir a 60.
// ============================================================
// partículas con tamaño y transparencia propios (PointsMaterial solo tiene una opacidad para todas)
class KartPuffs {
  constructor(n, additive, tex) {
    const T = KartGL; this.n = n; this.at = 0;
    this.data = Array.from({ length: n }, () => ({ life: 0, max: 1, x: 0, y: -1e4, z: 0, vx: 0, vy: 0, vz: 0, s0: 1, s1: 1, c: [1, 1, 1], a: 1, g: 0, drag: 0 }));
    const geo = new T.BufferGeometry();
    this.pos = new T.Float32BufferAttribute(new Float32Array(n * 3), 3); this.col = new T.Float32BufferAttribute(new Float32Array(n * 4), 4); this.siz = new T.Float32BufferAttribute(new Float32Array(n), 1);
    for (const a of [this.pos, this.col, this.siz]) a.setUsage(T.DynamicDrawUsage);
    geo.setAttribute('position', this.pos); geo.setAttribute('tint', this.col); geo.setAttribute('size', this.siz);
    this.mat = new T.ShaderMaterial({
      uniforms: { map: { value: tex }, scale: { value: 600 } }, transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending,
      vertexShader: 'attribute vec4 tint;attribute float size;varying vec4 vTint;uniform float scale;void main(){vTint=tint;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*scale/max(.2,-mv.z);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform sampler2D map;varying vec4 vTint;void main(){float a=texture2D(map,gl_PointCoord).a*vTint.a;if(a<.01)discard;gl_FragColor=vec4(vTint.rgb,a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
    });
    this.points = new T.Points(geo, this.mat); this.points.frustumCulled = false; this.points.renderOrder = additive ? 3 : 2;
  }
  // c: color lineal [r,g,b]; s0→s1: tamaño en metros al nacer y al morir
  emit(x, y, z, vx, vy, vz, life, s0, s1, c, a = 1, g = 0, drag = 0) {
    const q = this.data[this.at++ % this.n];
    q.x = x; q.y = y; q.z = z; q.vx = vx; q.vy = vy; q.vz = vz; q.life = q.max = life; q.s0 = s0; q.s1 = s1; q.c = c; q.a = a; q.g = g; q.drag = drag;
  }
  step(dt) {
    const P = this.pos.array, C = this.col.array, S = this.siz.array;
    for (let i = 0; i < this.n; i++) {
      const q = this.data[i];
      if (q.life > 0) {
        q.life -= dt; const k = Math.exp(-q.drag * dt);
        q.vx *= k; q.vy = q.vy * k - q.g * dt; q.vz *= k; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      }
      const t = q.life > 0 ? 1 - q.life / q.max : 1, alive = q.life > 0;
      P[i * 3] = q.x; P[i * 3 + 1] = alive ? q.y : -1e4; P[i * 3 + 2] = q.z;
      C[i * 4] = q.c[0]; C[i * 4 + 1] = q.c[1]; C[i * 4 + 2] = q.c[2]; C[i * 4 + 3] = alive ? q.a * (1 - t) * Math.min(1, t * 8 + .2) : 0;
      S[i] = q.s0 + (q.s1 - q.s0) * t;
    }
    this.pos.needsUpdate = this.col.needsUpdate = this.siz.needsUpdate = true;
  }
}
const KartFX = {
  shake: 0, lines: 0,
  lin(hex) { const c = new KartGL.Color(hex); return [c.r, c.g, c.b]; },
  // dos conos aditivos por boca de escape, ocultos hasta que hay turbo
  makeJets(body, tips) {
    const T = KartGL, jets = [];
    if (!this.cone) { this.cone = new T.ConeGeometry(1, 1, 14, 1, true); this.cone.translate(0, -.5, 0); this.cone.rotateX(Math.PI / 2); } // base en la boca, punta hacia atrás
    for (const p of tips) {
      const outer = new T.Mesh(this.cone, new T.MeshBasicMaterial({ color: '#4fd8ff', transparent: true, opacity: .75, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      const inner = new T.Mesh(this.cone, new T.MeshBasicMaterial({ color: '#f4fbff', transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      for (const m of [outer, inner]) { m.position.set(p[0], p[1], p[2] - .02); m.visible = false; m.renderOrder = 4; body.add(m); }
      jets.push({ outer, inner });
    }
    return jets;
  },
  TIER: ['#4fd8ff', '#4fd8ff', '#ff9a2e', '#d36bff'],
  tier(r) { return r.drift ? (r.charge > 2 ? 3 : r.charge > 1.3 ? 2 : r.charge > .7 ? 1 : 0) : 0; },
  // por kart y por cuadro: boca incandescente y flama
  kart(race, r, m) {
    const u = m.userData; if (!u.jets) return;
    const boost = r.turbo > 0 || r.star > 0, tier = this.tier(r), t = race.time, flick = .82 + Math.sin(t * 61 + r.index) * .1 + Math.sin(t * 37) * .08;
    if (u.flame) u.flame.emissiveIntensity = boost ? 4 * flick : tier ? 1.5 : 0;
    const col = boost ? (r.star > 0 ? '#ffd860' : '#4fd8ff') : this.TIER[tier];
    for (const j of u.jets) {
      const on = (boost || tier > 0) && !race.paused, len = boost ? 1.7 * flick * (r.turbo > 1.4 ? 1.2 : 1) : .35 + tier * .14, w = boost ? .2 : .11 + tier * .02;
      j.outer.visible = j.inner.visible = on; if (!on) continue;
      j.outer.material.color.set(col); j.outer.scale.set(w, w, len); j.inner.scale.set(w * .5, w * .5, len * .6);
    }
  },
  // partículas: se crean junto con la escena de la carrera
  build(scene) {
    const tex = (fn) => { const cv = mkCanvas(64, 64), c = cv.getContext('2d'); fn(c, 64); const t = new KartGL.CanvasTexture(cv); return t; };
    const soft = tex((c, n) => { const g = c.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, n, n); });
    const puff = tex((c, n) => { for (let i = 0; i < 7; i++) { const a = i * 2.4, r = 9 + (i % 3) * 3, x = n / 2 + Math.cos(a) * 9, y = n / 2 + Math.sin(a) * 9; const g = c.createRadialGradient(x, y, 0, x, y, r + 6); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, n, n); } });
    this.sparks = new KartPuffs(700, true, soft); this.smoke = new KartPuffs(420, false, puff);
    scene.add(this.sparks.points, this.smoke.points); this.last = new Map(); this.tickAt = -1; this.v = new KartGL.Vector3();
  },
  // emisión una vez por paso de simulación (no por cuadro dibujado)
  emit(race, r, m, C) {
    if (!this.sparks) return;
    const u = m.userData, rear = u.wheels.filter(w => !w.front), q = this.last.get(r) || {}, near = r === race.player || Math.abs(KartMath.delta(r.s, race.player.s, C.length)) < 140;
    const tier = this.tier(r), ground = r.height < .15 && !r.rescue, off = Math.abs(r.x) > 1 && ground && r.v > 25, theme = C.info.theme;
    if (near && ground && (r.drift || off || (r.turbo > 0 && r.v > 60))) {
      m.updateMatrixWorld(true);
      for (const w of rear) {
        w.spin.getWorldPosition(this.v); const p = this.v, back = C.sample(r.s), bx = -back.tx, bz = -back.tz, side = (Math.random() - .5) * 2;
        if (r.drift && tier > 0) for (let i = 0; i < 2; i++) this.sparks.emit(p.x, p.y - .25, p.z, bx * 4 + side * 3, 1.5 + Math.random() * 3, bz * 4 - side * 3, .28 + Math.random() * .15, .32, .1, this.lin(this.TIER[tier]), 1, 9, 1.5);
        if (r.drift) this.smoke.emit(p.x, p.y - .3, p.z, bx * 2 + side, .8, bz * 2 - side, .9, .7, 2.6, [.86, .86, .86], .28, -.6, 1.6);
        if (off) this.smoke.emit(p.x, p.y - .3, p.z, bx * 3 + side * 1.5, 1.2, bz * 3, .8, .8, 3.2, this.lin(theme === 'canyon' ? '#b9886a' : theme === 'neon' ? '#5d6f85' : '#a7a07c'), .45, -.2, 1.2);
      }
    }
    // aterrizaje: anillo de polvo
    if (q.h > .4 && r.height === 0 && near) {
      const w = C.world(r.s, r.x, .2);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; this.smoke.emit(w.x, w.y, w.z, Math.cos(a) * 5, .6, Math.sin(a) * 5, .7, .9, 2.8, [.85, .82, .76], .4, -.4, 3); }
      if (r === race.player) this.shake = Math.max(this.shake, clamp(q.h / 3, .2, .7));
    }
    if (r === race.player) {
      if (r.stun > (q.stun || 0) + .2) this.shake = 1;                 // impacto
      if (r.turbo > (q.turbo || 0) + .2) this.shake = Math.max(this.shake, .25); // arranca el turbo
      if (off) this.shake = Math.max(this.shake, .12);                    // brincos de la tierra
    }
    this.last.set(r, { h: r.height, stun: r.stun, turbo: r.turbo });
  },
  step(race, camera, renderer, dt) {
    if (!this.sparks) return;
    if (race.paused) dt = 0;
    this.sparks.step(dt); this.smoke.step(dt);
    const scale = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360));
    this.sparks.mat.uniforms.scale.value = this.smoke.mat.uniforms.scale.value = scale;
  },
  // sacudida de cámara (se respeta "movimiento reducido")
  jolt(camera) {
    if (reducedMotion || this.shake <= .01) { this.shake = 0; return; }
    const s = this.shake * this.shake * .28, t = performance.now() * .05;
    camera.position.x += Math.sin(t * 1.7) * s; camera.position.y += Math.sin(t * 2.3 + 1) * s * .7; camera.position.z += Math.cos(t * 1.9) * s;
    this.shake *= .9;
  },
  // líneas de velocidad en la orilla de la pantalla (2D, sobre la pista y bajo el marcador)
  speedLines(race) {
    if (reducedMotion || race.paused || race.phase !== 'race') { this.lines = 0; return; }
    const p = race.player, max = p.stats.speed * race.cc.speed, want = p.turbo > 0 || p.star > 0 ? 1 : clamp((p.v / max - .82) / .18, 0, 1) * .55;
    this.lines = lerp(this.lines, want, .12); if (this.lines < .03) return;
    const cx = W / 2, cy = H * .47, R = Math.hypot(W, H) / 2, seed = Math.floor(race.time * 30);
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const h = hash1(i, seed), a = hash1(i * 7 + 3, seed) * TAU, r0 = R * (.62 + h * .22), len = R * (.12 + hash1(i, seed + 9) * .2) * this.lines;
      const x0 = cx + Math.cos(a) * r0, y0 = cy + Math.sin(a) * r0 * .9;
      ctx.strokeStyle = `rgba(255,255,255,${(.08 + h * .16) * this.lines})`; ctx.lineWidth = 1.5 + h * 2.5;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.cos(a) * len, y0 + Math.sin(a) * len * .9); ctx.stroke();
    }
    ctx.restore();
  },
};
