'use strict';
// ============================================================
//  ESTILO ESMASH EN 3D — una sola dirección de arte para Kart, FPS y Total
//  Las peleas son caricatura: tinta gruesa, color plano con una sombra, cielos pintados. Kart y FPS
//  se veían como otro juego (grises, realistas, sin contorno). Aquí vive lo que los tres comparten:
//   · sombreado: color saturado, luz de borde del cielo y, en personajes, sombra de un solo corte (cel)
//   · tinta: contorno oscuro en personajes, vehículos, armas y objetos (casco invertido)
//   · cielo pintado: degradado, sol con halo y rayos, nubes de caricatura con borde nítido, estrellas y aurora
//  Todo se inyecta en los materiales que ya existen: ningún modelo se reescribe.
// ============================================================
const Style3D = {
  INK: '#171226', ready: false, time: 0,
  U: null, // uniformes compartidos por todos los materiales (se cambian una vez por escena)
  // Paletas por ambiente: las mismas familias de color que los fondos de las peleas
  THEMES: {
    day:    { zenith: '#1f7fe0', mid: '#58b6f2', horizon: '#c8f0ff', haze: '#ffe9c4', sun: '#fff3c9', sunDir: [-.48, .52, -.62], cloudLit: '#ffffff', cloudShade: '#a9c4f2', cloudRim: '#ffffff', cover: .56, night: 0, rim: '#bfe6ff', fog: '#bfe6f2', hemiSky: '#cfeaff', hemiGround: '#8fae62', sunLight: '#fff0cf' },
    sunset: { zenith: '#27358f', mid: '#8a5fc4', horizon: '#ffb47a', haze: '#ffe0a0', sun: '#ffd88a', sunDir: [-.55, .2, -.6], cloudLit: '#ffe6c8', cloudShade: '#8f5fae', cloudRim: '#fff4b8', cover: .56, night: 0, rim: '#ffd0b0', fog: '#e6b4a8', hemiSky: '#e8d6f0', hemiGround: '#a8705c', sunLight: '#ffd0a0' },
    night:  { zenith: '#070a2c', mid: '#1b1f6b', horizon: '#6a3fb0', haze: '#ff5fc8', sun: '#cfe0ff', sunDir: [.38, .55, -.52], cloudLit: '#5a63c4', cloudShade: '#1f2260', cloudRim: '#7af0ff', cover: .6, night: 1, rim: '#6ab8ff', fog: '#10143c', hemiSky: '#7f96f0', hemiGround: '#221a44', sunLight: '#b9cdff' },
  },
  themeOf(info) { const t = info && info.theme; return t === 'canyon' || t === 'sunset' ? 'sunset' : t === 'neon' || t === 'night' ? 'night' : 'day'; },
  uniforms() {
    if (!this.U) { const T = KartGL; this.U = { rim: { value: new T.Color('#bfe6ff') }, rimPower: { value: 1 }, fogColor: { value: new T.Color('#bfe6f2') }, fogDensity: { value: .001 }, ink: { value: new T.Color(this.INK) }, time: { value: 0 } }; }
    return this.U;
  },
  // ---------- sombreado ----------
  install() {
    if (this.ready || typeof KartGL === 'undefined') return; this.ready = true;
    const S = this, proto = Object.getPrototypeOf(KartGL.MeshStandardMaterial.prototype);
    proto.onBeforeCompile = function (shader) { if (this.isMeshStandardMaterial) S.inject(shader, this); };
    proto.customProgramCacheKey = function () { return this.isMeshStandardMaterial ? 'esmash:' + S.variant(this) : ''; };
  },
  variant(m) { const u = m.userData || {}; return (u.esToon ? 'toon' : 'soft') + (u.esPlain ? ':plain' : '') + (u.esKey || ''); },
  inject(shader, m) {
    const U = this.uniforms(), u = m.userData || {}, toon = !!u.esToon;
    shader.uniforms.esRim = U.rim; shader.uniforms.esRimPower = U.rimPower;
    let f = shader.fragmentShader;
    f = f.replace('#include <common>', '#include <common>\nuniform vec3 esRim;uniform float esRimPower;');
    // color: más saturado que el pigmento original (texturas, color por vértice y por instancia incluidos)
    if (!u.esPlain) f = f.replace('#include <color_fragment>', '#include <color_fragment>\n{float esL=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=max(vec3(0.),mix(vec3(esL),diffuseColor.rgb,' + (toon ? '1.15' : '1.22') + '));}');
    // personajes: la luz directa no se degrada, corta en dos tonos como la sombra dibujada de las peleas
    if (toon) f = f.replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>
void RE_Direct_Esmash(const in IncidentLight directLight,const in vec3 geometryPosition,const in vec3 geometryNormal,const in vec3 geometryViewDir,const in vec3 geometryClearcoatNormal,const in PhysicalMaterial material,inout ReflectedLight reflectedLight){
 float esD=dot(geometryNormal,directLight.direction),esT=smoothstep(-.02,.09,esD);
 reflectedLight.directDiffuse+=directLight.color*(esT*.58)*BRDF_Lambert(material.diffuseColor);
 vec3 esH=normalize(directLight.direction+geometryViewDir);float esS=smoothstep(.955,.975,dot(geometryNormal,esH))*(1.-material.roughness);
 reflectedLight.directSpecular+=directLight.color*esS*.1;
}
#undef RE_Direct
#define RE_Direct RE_Direct_Esmash`);
    // luz de borde: el cielo se asoma por la silueta (más arriba que abajo)
    f = f.replace('#include <opaque_fragment>', `{vec3 esN=normalize(normal),esV=normalize(vViewPosition);float esF=1.-clamp(dot(esN,esV),0.,1.);
 vec3 esUp=normalize((viewMatrix*vec4(0.,1.,0.,0.)).xyz);float esSky=.35+.65*clamp(.5+.5*dot(esN,esUp),0.,1.);
 ${toon ? 'float esR=smoothstep(.62,.7,esF)*.34;' : 'float esR=esF*esF*esF*.42;'}
 outgoingLight+=(diffuseColor.rgb*.75+.25)*esRim*esR*esSky*esRimPower;}
#include <opaque_fragment>`);
    shader.fragmentShader = f;
  },
  // material de caricatura (personajes): mismo pigmento, sombra de un corte
  toon(color, metal = 0, rough = .7, emissive = null) {
    const key = 'toon:' + [color, metal, rough, emissive].join(':'), M = KartModels.materials;
    if (!M.has(key)) { const m = new KartGL.MeshStandardMaterial({ color, metalness: Math.min(metal, .35), roughness: Math.max(rough, .45), emissive: emissive || '#000000', emissiveIntensity: emissive ? 1.1 : 0 }); m.userData.esToon = true; M.set(key, m); }
    return M.get(key);
  },
  // ---------- tinta ----------
  inkMaterial(width) {
    const key = 'esmash-ink:' + width, M = KartModels.materials;
    if (M.has(key)) return M.get(key);
    const T = KartGL, U = this.uniforms();
    const m = new T.ShaderMaterial({
      side: T.BackSide, uniforms: { width: { value: width }, ink: U.ink, fogColor: U.fogColor, fogDensity: U.fogDensity },
      vertexShader: 'uniform float width;varying float vDepth;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vec3 n=normalize(normalMatrix*normal);float d=max(0.,-mv.z);mv.xyz+=n*width*(.75+min(d,90.)*.045);vDepth=d;gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform vec3 ink,fogColor;uniform float fogDensity;varying float vDepth;void main(){float f=1.-exp(-fogDensity*fogDensity*vDepth*vDepth);gl_FragColor=vec4(mix(ink,fogColor,clamp(f,0.,1.)),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
    });
    m.name = 'esmash-ink'; M.set(key, m); return m;
  },
  // contorno para un modelo ya armado. Se cuelga de cada malla (mismo movimiento, misma geometría).
  outline(root, width = .022) {
    if (!root || root.userData.esInked) return root; root.userData.esInked = true;
    const T = KartGL, mat = this.inkMaterial(width), targets = [];
    root.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || o.userData.esInk || o.userData.noInk) return;
      const m = o.material; if (!m || Array.isArray(m) || m.transparent || m.alphaTest > 0 || m.isMeshBasicMaterial || m.isShaderMaterial || m.side === T.DoubleSide) return;
      if (!o.geometry.attributes.normal) return;
      targets.push(o);
    });
    for (const o of targets) { const ink = new T.Mesh(o.geometry, mat); ink.userData.esInk = true; ink.name = 'ink'; ink.castShadow = ink.receiveShadow = false; ink.matrixAutoUpdate = false; o.add(ink); }
    return root;
  },
  // la tinta cuesta una pasada extra por malla: se apaga sola con el presupuesto bajo
  inkBudget(on) { for (const [key, m] of KartModels.materials) if (key.startsWith('esmash-ink:')) m.visible = on; },
  // ---------- cielo ----------
  skyMaterial(theme) {
    const T = KartGL, P = this.THEMES[theme] || this.THEMES.day, U = this.uniforms(), col = c => ({ value: new T.Color(c) });
    return new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { time: U.time, zenith: col(P.zenith), mid: col(P.mid), horizon: col(P.horizon), haze: col(P.haze), sunColor: col(P.sun), cloudLit: col(P.cloudLit), cloudShade: col(P.cloudShade), cloudRim: col(P.cloudRim), sunDir: { value: new T.Vector3(...P.sunDir).normalize() }, cover: { value: P.cover }, night: { value: P.night } },
      vertexShader: 'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: `varying vec3 direction;uniform vec3 zenith,mid,horizon,haze,sunColor,cloudLit,cloudShade,cloudRim,sunDir;uniform float time,cover,night;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.07+vec2(13.2,4.7);a*=.5;}return v;}
// nube de caricatura: borde nítido, panza en sombra, cresta iluminada hacia el sol
vec4 clouds(vec3 d,float scale,float speed,float density){
 vec2 uv=d.xz/max(.12,d.y+.14)*scale+vec2(time*speed,time*speed*.35);
 float c=fbm(uv)+.18*fbm(uv*3.1+7.);float edge=cover+.2-density*.2;
 float mask=smoothstep(edge,edge+.035,c)*smoothstep(.015,.11,d.y);
 vec2 toSun=normalize(sunDir.xz+vec2(1e-4))*.09;float lit=smoothstep(-.03,.07,c-fbm(uv+toSun)-.18*fbm((uv+toSun)*3.1+7.)+.035);
 float core=smoothstep(edge+.05,edge+.3,c);
 vec3 col=mix(cloudShade,cloudLit,max(lit,.25*core));col=mix(col,cloudRim,(1.-smoothstep(edge+.03,edge+.1,c))*.75*lit);
 return vec4(col,mask);}
void main(){vec3 d=normalize(direction);float h=d.y;
 vec3 sky=mix(horizon,mid,smoothstep(-.02,.22,h));sky=mix(sky,zenith,smoothstep(.16,.78,h));
 sky=mix(sky,haze,(1.-smoothstep(-.06,.1,h))*.55);
 float sd=max(0.,dot(d,sunDir));
 // halo ancho, corona y disco; rayos suaves que giran muy despacio, como en los escenarios de pelea
 sky+=sunColor*(pow(sd,6.)*.22+pow(sd,48.)*.5);
 vec3 sx=normalize(cross(sunDir,vec3(0.,1.,0.))),sy=cross(sx,sunDir);float ang=atan(dot(d,sy),dot(d,sx));
 float rays=(.5+.5*sin(ang*14.+time*.05))*(.5+.5*sin(ang*5.-time*.03));sky+=sunColor*rays*pow(sd,5.)*.16*(1.-night*.6);
 sky=mix(sky,sunColor*(1.6-night*.5),smoothstep(.9991,.9996,sd));
 if(night>.5){vec2 su=d.xz/max(.2,abs(d.y)+.25)*90.;vec2 cell=floor(su);float st=step(.985,hash(cell));float tw=.6+.4*sin(time*2.+hash(cell+3.)*40.);
  sky+=vec3(.9,.95,1.)*st*tw*(1.-smoothstep(.05,.32,length(fract(su)-.5)))*smoothstep(.06,.4,h);
  float band=sin(d.x*5.+time*.12+sin(d.z*3.)*1.3)*.5+.5;float au=smoothstep(.12,.3,h)*(1.-smoothstep(.34,.62,h))*band;
  sky+=mix(vec3(.1,.95,.8),vec3(.85,.3,1.),.5+.5*sin(d.z*4.+time*.07))*au*.34;}
 vec4 far=clouds(d,1.15,.004,.35);sky=mix(sky,mix(far.rgb,horizon,.45),far.a*.8);
 vec4 near=clouds(d,.62,.009,1.);sky=mix(sky,near.rgb,near.a*(.96-night*.25));
 gl_FragColor=vec4(sky,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
    });
  },
  sky(scene, info) {
    const T = KartGL, theme = this.themeOf(info), mesh = new T.Mesh(new T.SphereGeometry(6500, 32, 20), this.skyMaterial(theme));
    mesh.frustumCulled = false; mesh.name = 'atmospheric-sky'; mesh.renderOrder = -10; scene.add(mesh); this.apply(scene, theme); return mesh;
  },
  // uniformes compartidos de la escena activa: color de la luz de borde y niebla de la tinta
  apply(scene, theme) {
    const P = this.THEMES[theme] || this.THEMES.day, U = this.uniforms(); this.install();
    U.rim.value.set(P.rim); U.rimPower.value = theme === 'night' ? .8 : 1;
    if (scene.fog) { U.fogColor.value.copy(scene.fog.color); U.fogDensity.value = scene.fog.density || 0; }
    scene.userData.esTheme = theme; return P;
  },
  tick(dt) { this.time += dt; if (this.U) this.U.time.value = this.time; },
  // ---------- vegetación compartida ----------
  // add(tipo, color, posición, escala, rotación): cada modo la manda a su propio lote de geometría.
  // Copas de bloque facetadas con tres tonos (sombra abajo, luz arriba); una de cada cinco florece.
  tree(add, x, y, z, h, rng, opt = {}) {
    const roll = rng(), kind = roll < .16 ? 'jacaranda' : roll < .26 ? 'flamboyan' : roll < .44 ? 'pine' : 'round';
    const tones = kind === 'jacaranda' ? ['#8b5fd0', '#b58af0', '#d9bcff'] : kind === 'flamboyan' ? ['#e2553a', '#ff7f4a', '#ffb347'] : kind === 'pine' ? ['#2f8f5a', '#49ab62', '#7fca6a'] : ['#3f9f52', '#62bf55', '#a2de5e'];
    const top = y + h * .58, r = h * .26;
    if (opt.trunk !== false) add('branch', '#9a6a44', [x, y + h * .3, z], [h * .05, h * .62, h * .05], [.02, 0, .03]);
    if (kind === 'pine') { for (let i = 0; i < 3; i++) add('cone', tones[i], [x, top + i * r * .95 + r * .3, z], [r * (1.45 - i * .36), r * 1.7, r * (1.45 - i * .36)], [0, rng() * 6, 0]); return; }
    add('branch', '#9a6a44', [x, top + r * .1, z], [h * .035, r * 1.2, h * .035]);
    const n = 5 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const a = i * 2.399 + rng(), lift = i / (n - 1), rad = r * (1.05 - lift * .75) * (i ? 1 : 0), s = r * (1.25 - lift * .45) * (.85 + rng() * .3);
      add('hill', tones[lift < .34 ? 0 : lift < .72 ? 1 : 2], [x + Math.cos(a) * rad, top + r * (.55 + lift * 1.25), z + Math.sin(a) * rad], [s, s * .82, s], [rng() * .5, rng() * 6, rng() * .5]);
    }
  },
};
Style3D.install();
// El cielo de Kart y FPS es el mismo cielo pintado.
KartWorld.sky = (scene, info) => { Kart3D.skyMesh = Style3D.sky(scene, info); };
// Personajes: todo lo que arma CharacterModels usa el material de caricatura.
Style3D.toonDepth = 0;
{
  const mat = KartModels.mat; KartModels.mat = function (color, metal, rough, emissive) { return Style3D.toonDepth > 0 ? Style3D.toon(color, metal, rough, emissive) : mat.call(this, color, metal, rough, emissive); };
  const create = CharacterModels.create; CharacterModels.create = function (id) { Style3D.toonDepth++; try { return create.call(this, id); } finally { Style3D.toonDepth--; } };
  const drawing = CharacterArt.drawing; CharacterArt.drawing = function (id, part, face) { const art = drawing.call(this, id, part, face); art.material.userData.esToon = true; return art; };
  const kart = KartModels.kart; KartModels.kart = function (id, vehicle) { return Style3D.outline(kart.call(this, id, vehicle), .026); };
}
// Las pistas usan los mismos árboles de bloque que el mundo del FPS.
KartWorld.tree = (w, rng) => Style3D.tree((type, color, pos, scale, rot) => Kart3D.instance(type, color, pos, scale, rot, 0, .9), w.x, w.y, w.z, 7.5 + rng() * 4, rng);
