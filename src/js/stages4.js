'use strict';
// ============================================================
//  ARENAS DEL MISMO MUNDO: Mercado del Sol (la pista del Kart) y Sierra (el mundo del FPS)
//  El fondo de estas peleas ES el mundo 3D de los otros dos juegos: se construye la escena real una vez,
//  se fotografía desde un costado y la pelea se dibuja encima. Mismos edificios, mismos árboles, mismo cielo.
//  En el Mercado los karts de la carrera cruzan la calle; en la Sierra caen granadas como en el FPS.
//  Sin WebGL (o en modo ligero) el fondo se pinta en 2D con la misma paleta.
// ============================================================
const WorldShots = {
  cache: new Map(), sprites: new Map(),
  can3D() { return typeof KartGL !== 'undefined' && !IS_XBOX && !ART.lite && Kart3D.init() && !Kart3D.contextLost; },
  // foto del mundo: un lienzo 16:9 o null (entonces quien llama pinta el respaldo 2D)
  get(key) {
    if (this.cache.has(key)) return this.cache.get(key);
    let shot = null;
    // nunca se desarma una carrera o una partida en curso para sacar la foto
    if (this.can3D() && !APP.kartRace && !APP.fps) { try { shot = key === 'sierra' ? this.sierra() : this.mercado(); } catch (e) { console.error(e); shot = null; } }
    else if (!this.can3D()) { this.cache.set(key, null); return null; }
    else return null; // ocupado: se intenta de nuevo en el siguiente cuadro
    this.cache.set(key, shot); return shot;
  },
  capture(scene, camera, sky, w = 1920, h = 1080) {
    const r = Kart3D.renderer, old = { w: r.domElement.width, h: r.domElement.height, shadows: r.shadowMap.enabled, exposure: r.toneMappingExposure };
    r.setRenderTarget(null); r.setScissorTest(false); r.setSize(w, h, false); r.setViewport(0, 0, w, h); r.shadowMap.enabled = true; r.toneMappingExposure = 1.02; r.setClearColor('#000000', 0);
    camera.aspect = w / h; camera.updateProjectionMatrix(); if (sky) { sky.position.copy(camera.position); sky.updateMatrixWorld(); }
    Style3D.inkBudget(true); r.render(scene, camera);
    const cv = mkCanvas(w, h); cv.getContext('2d').drawImage(r.domElement, 0, 0);
    r.setSize(old.w, old.h, false); r.shadowMap.enabled = old.shadows; r.toneMappingExposure = old.exposure;
    return cv;
  },
  mercado() {
    const T = KartGL, race = new KartRace(KART_TRACKS[0], 'daniel', 1, false, 444); Kart3D.build(race);
    const C = race.course, s = 118, eye = C.world(s, .82, 3.1), look = C.world(s + 6, -2.4, 5.2), camera = new T.PerspectiveCamera(58, 16 / 9, .3, 6500);
    for (const m of Kart3D.drivers) m.visible = false;
    for (const m of [Kart3D.pickupShells, Kart3D.pickupMarks, Kart3D.coinInstances, ...(Kart3D.hazards || [])]) if (m) m.visible = false;
    for (const m of Kart3D.staticChunks || []) m.visible = true;
    camera.position.set(eye.x, eye.y, eye.z); camera.lookAt(look.x, look.y, look.z);
    Kart3D.sun.position.set(eye.x - 65, eye.y + 110, eye.z - 50); Kart3D.sun.target.position.set(look.x, look.y, look.z); Kart3D.sun.target.updateMatrixWorld();
    Kart3D.scene.updateMatrixWorld(true);
    const shot = this.capture(Kart3D.scene, camera, Kart3D.skyMesh);
    Kart3D.disposeScene(); Kart3D.race = null; KartPost.dispose();
    return shot;
  },
  sierra() {
    const T = KartGL, match = new FPSMatch(CHAR_ORDER.slice(0, 4).map((id, i) => ({ id, gun: i, bot: true }))); FPSView.build(match);
    for (const m of [...FPSView.models, ...FPSView.pickupModels]) m.visible = false;
    const camera = new T.PerspectiveCamera(60, 16 / 9, .2, 10000), x = -9, z = -30, y = FPSWorld.height(x, z) + 2.3;
    camera.position.set(x, y, z); camera.lookAt(16, y + 2.4, 24);
    FPSView.sun.position.set(x - 48, y + 64, z - 36); FPSView.sun.target.position.set(10, y, 10); FPSView.sun.target.updateMatrixWorld();
    FPSView.scene.updateMatrixWorld(true);
    const shot = this.capture(FPSView.scene, camera, FPSView.sky);
    FPSView.dispose();
    return shot;
  },
  // kart real de la carrera visto de lado (mira a la izquierda); para los que cruzan la arena del Mercado
  kartSide(id, vehicle = 0) {
    const key = id + ':' + vehicle; if (this.sprites.has(key)) return this.sprites.get(key);
    let cv = null;
    if (this.can3D()) try {
      const T = KartGL, scene = new T.Scene(), camera = new T.PerspectiveCamera(24, 1.6, .1, 60), kart = KartModels.kart(id, vehicle), r = Kart3D.renderer;
      scene.environment = Kart3D.environment; scene.environmentIntensity = .5; scene.add(kart); const sun = Kart3D.lighting(scene, 'town'); sun.castShadow = false; sun.position.set(40, 80, -30);
      camera.position.set(11.5, 2.2, .1); camera.lookAt(0, 1.05, .1);
      const old = { w: r.domElement.width, h: r.domElement.height }; r.setRenderTarget(null); r.setScissorTest(false); r.setSize(480, 300, false); r.setViewport(0, 0, 480, 300); r.setClearColor('#000000', 0);
      Style3D.inkBudget(true); r.render(scene, camera); cv = mkCanvas(480, 300); cv.getContext('2d').drawImage(r.domElement, 0, 0);
      r.setSize(old.w, old.h, false);
      const done = new Set(), shared = new Set(KartModels.geometry.values()); scene.traverse(o => { if (o.geometry && !shared.has(o.geometry) && !done.has(o.geometry)) { done.add(o.geometry); o.geometry.dispose(); } });
      kart.userData.shield?.material?.dispose();
    } catch (e) { console.error(e); cv = null; }
    this.sprites.set(key, cv); return cv;
  },
  // respaldo pintado: mismo cielo, mismas lomas, mismos árboles de bloque y fachadas de color
  paint(c, cam, kind) {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1f7fe0'); g.addColorStop(.45, '#58b6f2'); g.addColorStop(.78, '#c8f0ff'); g.addColorStop(1, '#ffe9c4'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,243,201,.9)'; c.beginPath(); c.arc(W * .2, 120, 52, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,243,201,.2)'; c.beginPath(); c.arc(W * .2, 120, 110, 0, TAU); c.fill();
    const px = -cam.x * .05, py = -cam.y * .04;
    for (let i = 0; i < 6; i++) { const x = ((i * 290 + px * .5) % 1700 + 1700) % 1700 - 200, y = 90 + (i % 3) * 60; c.fillStyle = '#a9c4f2'; c.beginPath(); c.ellipse(x, y + 12, 96, 26, 0, 0, TAU); c.fill(); c.fillStyle = '#fff'; for (const [dx, r] of [[-50, 30], [-8, 44], [42, 32]]) { c.beginPath(); c.arc(x + dx, y, r, 0, TAU); c.fill(); } }
    for (const [par, base, col, amp] of [[.4, 380, '#8fc0ea', 90], [.7, 430, '#62b0a6', 70], [1, 480, '#4fa860', 50]]) {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 40) c.lineTo(x, base + py - (Math.sin((x - px * par) * .006 + par * 3) * .5 + .5) * amp - (Math.sin((x - px * par) * .017) * .5 + .5) * amp * .4);
      c.lineTo(W, H); c.closePath(); c.fill();
    }
    c.fillStyle = '#7fb568'; c.fillRect(0, 500 + py, W, H);
    const walls = ['#ffc857', '#f47c5c', '#45b8c8', '#f58fb0', '#b99aee', '#fff0c8'];
    for (let i = 0; i < 9; i++) {
      const x = i * 170 - 80 + px, w = 150, h = kind === 'sierra' ? 0 : 150 + hash1(i, 3) * 110, y = 520 + py;
      if (h) { c.fillStyle = walls[i % walls.length]; c.strokeStyle = Style3D.INK; c.lineWidth = 4; c.fillRect(x, y - h, w, h); c.strokeRect(x, y - h, w, h); c.fillStyle = '#f0876a'; c.fillRect(x - 6, y - h - 14, w + 12, 16); c.fillStyle = '#58b4e6'; for (let j = 0; j < 3; j++)c.fillRect(x + 18 + j * 44, y - h + 34, 26, 40); }
      const tx = x + 160 * (kind === 'sierra' ? 1 : .0) + (kind === 'sierra' ? hash1(i, 9) * 60 : -14), ty = 530 + py;
      c.fillStyle = '#9a6a44'; c.fillRect(tx - 7, ty - 90, 14, 90);
      const tones = i % 4 === 1 ? ['#8b5fd0', '#b58af0', '#d9bcff'] : ['#3f9f52', '#62bf55', '#a2de5e'];
      for (const [dx, dy, r, t] of [[-26, -92, 34, 0], [24, -98, 36, 0], [0, -128, 40, 1], [-6, -158, 28, 2]]) { c.fillStyle = tones[t]; c.beginPath(); c.arc(tx + dx, ty + dy, r, 0, TAU); c.fill(); }
    }
  },
  // dibuja la foto con un poco de paralaje; false = no hay foto (pinta el respaldo)
  draw(c, cam, key) {
    const img = this.get(key);
    if (!img) { this.paint(c, cam, key); return false; }
    const s = 1.14, x = (W - W * s) / 2 - clamp(cam.x * .07, -80, 80), y = (H - H * s) / 2 - clamp(cam.y * .05, -40, 40) - 6;
    c.drawImage(img, x, y, W * s, H * s); return true;
  },
};

STAGE_INFO.push(
  { id: 'mercado', name: 'Mercado del Sol', desc: 'La calle de la carrera: toldos para subirse y los karts cruzan a toda velocidad.', song: 'mercado' },
  { id: 'sierra', name: 'Sierra', desc: 'La plaza del FPS: cajas, sacos de arena y granadas que caen del cielo.', song: 'sierra' },
);

// tinta y relleno con el mismo trazo de los personajes
function inkPath(c, fill, lw = 4) { c.fillStyle = fill; c.fill(); c.lineJoin = 'round'; c.lineWidth = lw; c.strokeStyle = Style3D.INK; c.stroke(); }
// isla flotante: tapa plana y cuerpo que se angosta hacia abajo
function islandBody(c, s, depth, top, body, shadeCol) {
  c.beginPath(); c.moveTo(s.x - 6, s.y + 8); c.lineTo(s.x + s.w + 6, s.y + 8); c.lineTo(s.x + s.w - 40, s.y + depth * .45);
  c.quadraticCurveTo(s.x + s.w * .62, s.y + depth, s.x + s.w * .5, s.y + depth * 1.06); c.quadraticCurveTo(s.x + s.w * .36, s.y + depth, s.x + 40, s.y + depth * .45); c.closePath(); inkPath(c, body, 5);
  c.save(); c.clip(); c.fillStyle = shadeCol; c.fillRect(s.x - 10, s.y + depth * .5, s.w + 20, depth); c.restore();
  c.beginPath(); roundRect(c, s.x - 10, s.y, s.w + 20, 26, 9); inkPath(c, top, 5);
}

STAGE_DEFS.mercado = () => ({
  name: 'Mercado del Sol', song: 'mercado', grade: { vig: .35 },
  solids: [surf(-470, 0, 940, 64, { ledge: 1 })],
  plats: [
    surf(-390, -140, 200, 14, { plat: 1, awning: '#f25c54' }),
    surf(190, -140, 200, 14, { plat: 1, awning: '#2ec4b6' }),
    surf(-95, -270, 190, 14, { plat: 1, banner: 1, move: (t, s) => [s.bx + Math.sin(t * .012) * 120, s.by] }),
  ],
  karts: [], nextKarts: 780, kartDir: 1, wave: 0, totalMix: false, nextNades: 520,
  update() {
    this.nextKarts--;
    // Esmash Total: en la gran final también caen las granadas del FPS
    if (this.totalMix && --this.nextNades <= 100) {
      if (this.nextNades === 100) warnBanner('¡Granadas!', '#ff8c42');
      if (this.nextNades <= 0) { const from = pick([-1, 1]); for (let i = 0; i < 2; i++) spawnProjectile(null, { type: 'cannon', x: from * 1250, y: -420, delay: 10 + i * 40, toX: rand(-380, 380), r: 17, life: 400, dmg: 15, ang: 62, bkb: 10, kbg: 9, col: '#2f7d46', explodeGround: 1, grav: .34 }); this.nextNades = randi(900, 1300); }
    }
    if (this.nextKarts === 110) { this.kartDir = pick([-1, 1]); warnBanner(this.kartDir > 0 ? '¡Vienen los karts! →' : '← ¡Vienen los karts!', '#ffc53d'); }
    if (this.nextKarts <= 0 && this.nextKarts > -70 && this.nextKarts % 23 === 0) {
      this.karts.push({ x: this.kartDir > 0 ? -1500 : 1500, dir: this.kartDir, who: (this.wave * 3 + this.karts.length + 5) % CHAR_ORDER.length, veh: (this.wave + this.karts.length) % 4, v: 27 + this.karts.length * 1.5 });
      if (this.nextKarts === 0) Audio8.sfx('rumble');
    }
    if (this.nextKarts <= -70 && !this.karts.length) { this.nextKarts = randi(900, 1300); this.wave++; }
    const floor = this.solids[0];
    for (const k of this.karts) {
      k.x += k.dir * k.v;
      // solo atropella sobre la calle: los toldos y el aire son refugio
      if (k.x < floor.x - 40 || k.x > floor.x + floor.w + 40) continue;
      const r = { x: k.x - 78, y: floor.y - 82, w: 156, h: 82 };
      for (const f of BATTLE.fighters) {
        if (f.kartCd > 0) { f.kartCd--; continue; }
        if (f.dead || f.intangibleToStage()) continue;
        if (rectRect(r, f.hurtbox())) { f.kartCd = 50; applyHit(null, f, { dmg: 15, ang: 52, bkb: 14, kbg: 6, sfx: 'bighit' }, k.dir, { unblockable: true }); shake(5); }
      }
    }
    this.karts = this.karts.filter(k => Math.abs(k.x) < 1700);
  },
  drawBG(c, cam) { WorldShots.draw(c, cam, 'mercado'); },
  drawStage(c) {
    const s = this.solids[0];
    islandBody(c, s, 250, '#8e93ad', '#d9a36e', 'rgba(120,70,60,.28)');
    // adoquín en el cuerpo y bordillo rojo y blanco como el de la pista
    c.save(); c.beginPath(); c.rect(s.x, s.y + 26, s.w, 90); c.clip(); c.strokeStyle = 'rgba(110,70,50,.4)'; c.lineWidth = 2;
    for (let row = 0; row < 4; row++)for (let x = s.x - 40 + (row % 2) * 34; x < s.x + s.w; x += 68) { c.beginPath(); roundRect(c, x, s.y + 32 + row * 22, 60, 17, 5); c.stroke(); }
    c.restore();
    for (let x = s.x - 10, i = 0; x < s.x + s.w + 10; x += 34, i++) { c.fillStyle = i % 2 ? '#f6f1e4' : '#ee5d4c'; c.fillRect(x, s.y + 14, Math.min(34, s.x + s.w + 10 - x), 10); }
    c.fillStyle = '#fbf2d7'; for (let x = s.x + 30; x < s.x + s.w - 60; x += 110)c.fillRect(x, s.y + 5, 56, 5);
    c.strokeStyle = Style3D.INK; c.lineWidth = 5; c.beginPath(); roundRect(c, s.x - 10, s.y, s.w + 20, 26, 9); c.stroke();
    for (const p of this.plats) {
      if (p.awning) {
        // toldo de puesto: lona a rayas con fleco, colgada de dos cuerdas
        c.strokeStyle = 'rgba(23,18,38,.55)'; c.lineWidth = 3; for (const dx of [16, p.w - 16]) { c.beginPath(); c.moveTo(p.x + dx, p.y); c.lineTo(p.x + dx + (dx < 50 ? -18 : 18), p.y - 420); c.stroke(); }
        c.beginPath(); c.moveTo(p.x - 6, p.y - 4); c.lineTo(p.x + p.w + 6, p.y - 4); c.lineTo(p.x + p.w + 6, p.y + 16);
        for (let i = 9; i >= 0; i--) { const x0 = p.x - 6 + (p.w + 12) * i / 10; c.quadraticCurveTo(x0 + (p.w + 12) / 20, p.y + 34, x0, p.y + 16); }
        c.closePath(); c.save(); c.clip(); for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? '#fff5e0' : p.awning; c.fillRect(p.x - 6 + (p.w + 12) * i / 10, p.y - 8, (p.w + 12) / 10 + 1, 50); } c.fillStyle = 'rgba(23,18,38,.14)'; c.fillRect(p.x - 6, p.y + 10, p.w + 12, 30); c.restore();
        c.lineWidth = 4; c.strokeStyle = Style3D.INK; c.lineJoin = 'round'; c.stroke();
      } else {
        // papel picado: una tabla con banderines que se mecen
        c.strokeStyle = 'rgba(23,18,38,.5)'; c.lineWidth = 3; c.beginPath(); c.moveTo(p.x - 260, p.y - 60); c.quadraticCurveTo(p.x + p.w / 2, p.y + 14, p.x + p.w + 260, p.y - 60); c.stroke();
        c.beginPath(); roundRect(c, p.x - 4, p.y - 2, p.w + 8, 16, 7); inkPath(c, '#f0b660');
        for (let i = 0; i < 7; i++) { const x = p.x + 6 + i * (p.w - 12) / 7, sway = Math.sin(this.t * .06 + i) * 3; c.beginPath(); c.moveTo(x, p.y + 14); c.lineTo(x + (p.w - 12) / 7 - 4, p.y + 14); c.lineTo(x + (p.w - 12) / 14 + sway, p.y + 40); c.closePath(); inkPath(c, ['#ff7aa8', '#ffd23f', '#2ec4b6', '#b48cf2'][i % 4], 3); }
      }
    }
    // los karts de la carrera, de lado
    for (const k of this.karts) {
      const img = WorldShots.kartSide(CHAR_ORDER[k.who], k.veh), bob = Math.sin(this.t * .9 + k.x * .01) * 1.5;
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(k.x, s.y + 2, 84, 9, 0, 0, TAU); c.fill();
      c.save(); c.translate(k.x, s.y + bob); if (k.dir > 0) c.scale(-1, 1);
      if (img) c.drawImage(img, -112, -128, 224, 140);
      else { c.beginPath(); roundRect(c, -80, -52, 160, 40, 16); inkPath(c, ['#f25c54', '#ffd23f', '#3ab4f2', '#7bd389'][k.veh]); for (const wx of [-52, 52]) { c.beginPath(); c.arc(wx, -14, 20, 0, TAU); inkPath(c, '#2b2440'); } c.beginPath(); c.arc(0, -70, 24, 0, TAU); inkPath(c, (LOOKS[CHAR_ORDER[k.who]] || {}).skin || '#c68b62'); }
      c.restore();
      // estela de velocidad
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 4; c.lineCap = 'round'; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(k.x - k.dir * (96 + i * 26), s.y - 26 - i * 22); c.lineTo(k.x - k.dir * (170 + i * 40), s.y - 26 - i * 22); c.stroke(); }
    }
  },
  drawFG() { },
});

STAGE_DEFS.sierra = () => ({
  name: 'Sierra', song: 'sierra', grade: { vig: .35 },
  solids: [surf(-460, 0, 920, 64, { ledge: 1 })],
  plats: [
    surf(-400, -128, 190, 14, { plat: 1, bags: 1 }),
    surf(215, -150, 180, 14, { plat: 1, crates: 1 }),
    surf(-90, -285, 180, 14, { plat: 1, drone: 1, move: (t, s) => [s.bx + Math.sin(t * .009) * 170, s.by + Math.sin(t * .031) * 14] }),
  ],
  nextNades: 700,
  update() {
    this.nextNades--;
    if (this.nextNades === 100) warnBanner('¡Granadas!', '#ff8c42');
    if (this.nextNades === 0) {
      const from = pick([-1, 1]);
      for (let i = 0; i < 3; i++) spawnProjectile(null, { type: 'cannon', x: from * 1250, y: -420, delay: 10 + i * 34, toX: rand(-380, 380), r: 17, life: 400, dmg: 15, ang: 62, bkb: 10, kbg: 9, col: '#2f7d46', explodeGround: 1, grav: .34 });
      this.nextNades = randi(820, 1200);
    }
  },
  drawBG(c, cam) { WorldShots.draw(c, cam, 'sierra'); },
  drawStage(c) {
    const s = this.solids[0];
    islandBody(c, s, 240, '#f4dcc0', '#c9905e', 'rgba(110,70,50,.3)');
    // losas de la plaza y pasto en las orillas
    c.strokeStyle = 'rgba(150,110,90,.55)'; c.lineWidth = 2; for (let x = s.x + 46; x < s.x + s.w; x += 58) { c.beginPath(); c.moveTo(x, s.y + 3); c.lineTo(x - 8, s.y + 24); c.stroke(); }
    for (const [x0, dir] of [[s.x - 8, 1], [s.x + s.w + 8, -1]]) for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x0 + dir * (8 + i * 15), s.y + 3, 12 - i, Math.PI, 0); inkPath(c, i % 2 ? '#93d860' : '#6fc457', 3); }
    for (const p of this.plats) {
      if (p.bags) {
        // sacos de arena apilados hasta el piso (cobertura del FPS)
        const rows = Math.round((s.y - p.y) / 32);
        for (let row = rows - 1; row >= 0; row--)for (let i = 0; i < 4; i++) { const w = p.w / 4, x = p.x + i * w + (row % 2 ? w * .25 : -w * .1), y = p.y + 4 + row * 32; if (x + w > p.x + p.w + 14) continue; c.beginPath(); roundRect(c, x, y, w + 2, 30, 12); inkPath(c, row % 2 ? '#f2d896' : '#e8c878', 3); }
        c.beginPath(); roundRect(c, p.x - 6, p.y - 2, p.w + 12, 16, 8); inkPath(c, '#f6e2a8');
      } else if (p.crates) {
        // cajas de suministros: las mismas naranjas con herraje azul
        const size = (s.y - p.y - 6) / 2;
        for (let row = 0; row < 2; row++)for (let i = 0; i < 2; i++) { const x = p.x + 8 + i * (size + 6) + (row ? 0 : 10), y = p.y + 8 + row * size; c.beginPath(); roundRect(c, x, y, size, size - 2, 6); inkPath(c, '#f0b660'); c.strokeStyle = '#c9843a'; c.lineWidth = 5; c.beginPath(); c.moveTo(x + 8, y + 8); c.lineTo(x + size - 8, y + size - 10); c.moveTo(x + size - 8, y + 8); c.lineTo(x + 8, y + size - 10); c.stroke(); c.fillStyle = '#5fa7c4'; for (const cx of [x + 3, x + size - 11]) c.fillRect(cx, y + 3, 8, size - 8); }
        c.beginPath(); roundRect(c, p.x - 4, p.y - 2, p.w + 8, 16, 6); inkPath(c, '#ffd08a');
      } else {
        // dron de suministros: plataforma con dos rotores
        c.beginPath(); roundRect(c, p.x - 4, p.y - 2, p.w + 8, 18, 9); inkPath(c, '#45b8c8');
        c.fillStyle = '#ffd23f'; c.fillRect(p.x + p.w / 2 - 16, p.y + 3, 32, 8);
        for (const dx of [18, p.w - 18]) { c.strokeStyle = Style3D.INK; c.lineWidth = 4; c.beginPath(); c.moveTo(p.x + dx, p.y - 2); c.lineTo(p.x + dx, p.y - 20); c.stroke(); const sp = Math.abs(Math.sin(this.t * .7 + dx)) * 44 + 10; c.beginPath(); c.ellipse(p.x + dx, p.y - 22, sp, 5, 0, 0, TAU); c.fillStyle = 'rgba(255,255,255,.75)'; c.fill(); c.lineWidth = 2; c.stroke(); }
      }
    }
  },
  drawFG() { },
});
