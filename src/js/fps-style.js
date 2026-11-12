'use strict';
// ============================================================
//  FPS: DETALLES DE "BATTLE ROYALE"
//  · Números de daño que saltan sobre el rival (blanco al cuerpo, amarillo a la cabeza, azul al escudo)
//    y se acumulan mientras sigues pegando.
//  · Recogidas que flotan, giran y se anuncian con un haz de luz de su color, visibles desde lejos;
//    el escudo es una poción azul.
//  Solo presentación: se calcula con lo que ya viaja en línea (vida, escudo, marca de impacto).
// ============================================================
const FPSPop = {
  list: [], last: new Map(), match: null,
  // un vistazo por cuadro: quién perdió vida o escudo mientras el jugador local marcó impacto
  scan(match) {
    if (this.match !== match) { this.match = match; this.list = []; this.last.clear(); }
    const dt = match.paused && !match.online ? 0 : Math.min(GameFeel.dt || 1 / 60, .05), locals = match.online ? [match.player] : match.players.filter(p => !p.bot);
    for (const q of match.players) {
      const old = this.last.get(q.index), now = { health: q.health, shield: q.shield }; this.last.set(q.index, now);
      if (!old || q.dead && old.health <= 0) continue;
      const lost = old.health + old.shield - q.health - q.shield; if (lost < .5) continue;
      const by = locals.find(p => p !== q && p.hit > .15); if (!by) continue;
      const kind = by.hitKind === 'head' ? 'head' : old.shield > q.shield && old.health === q.health ? 'shield' : 'body';
      const same = this.list.find(n => n.to === q.index && n.by === by.index && n.age < .45);
      if (same) { same.value += lost; same.age = 0; same.kind = kind === 'head' ? 'head' : same.kind; same.bump = 1; }
      else this.list.push({ to: q.index, by: by.index, value: lost, kind, age: 0, bump: 1, x: q.x, y: q.y + FPSBody.bodyHeight(q) + .25, z: q.z, side: (hash1(match.tick, q.index) - .5) * .5 });
    }
    for (const n of this.list) { n.age += dt; n.bump = Math.max(0, n.bump - dt * 6); }
    this.list = this.list.filter(n => n.age < 1.1);
  },
  draw(match, p, camera) {
    if (!camera) return; const v = new KartGL.Vector3();
    for (const n of this.list) {
      if (n.by !== p.index) continue;
      v.set(n.x, n.y + n.age * .9, n.z).project(camera); if (v.z > 1 || v.z < -1) continue;
      const x = (v.x + 1) * 640 + n.side * 60, y = (1 - v.y) * 360, alpha = clamp((1.1 - n.age) / .35, 0, 1), size = (n.kind === 'head' ? 34 : 27) * (1 + n.bump * .35);
      ctx.save(); ctx.globalAlpha = alpha;
      sfText(String(Math.round(n.value)), x, y, size, n.kind === 'head' ? '#ffd23f' : n.kind === 'shield' ? '#6fd3ff' : '#ffffff', { strokeW: 5 });
      ctx.restore();
    }
  },
};
{
  const draw = FPSView.draw; FPSView.draw = function (match) { FPSPop.scan(match); return draw.call(this, match); };
  const hud = FPSView.hud; FPSView.hud = function (match, p, box) {
    hud.call(this, match, p, box);
    ctx.save(); ctx.translate(box.x, box.y); ctx.scale(box.w / W, box.h / H);
    FPSPop.draw(match, p, this.views.get(p.index)?.camera);
    if (box.w >= 800 && match.time < 14) text('V / cruceta ↑: cámara al hombro o primera persona', 640, 688, 12, '#ffe9a8', { body: true, stroke: '#132a35', strokeW: 3 });
    ctx.restore();
  };
  // ----- recogidas -----
  const BEAM = { ammo: '#ffd23f', grenade: '#ff8c42', shield: '#3ab4f2' };
  const beamMaterial = color => {
    const key = 'fps-beam:' + color, M = KartModels.materials; if (M.has(key)) return M.get(key);
    const T = KartGL, m = new T.ShaderMaterial({
      transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, uniforms: { tint: { value: new T.Color(color) } },
      vertexShader: 'varying float h;void main(){h=uv.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform vec3 tint;varying float h;void main(){float a=pow(1.-h,1.6)*.5;gl_FragColor=vec4(tint*1.6,a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
    });
    M.set(key, m); return m;
  };
  const pickup = FPSSupplyArt.pickup; FPSSupplyArt.pickup = function (q) {
    const T = KartGL; let root = pickup.call(this, q);
    if (q.type === 'shield') {
      // poción de escudo: frasco redondo azul con tapón
      const at = root.position.clone(); root.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
      root = new T.Group(); root.userData.type = q.type; root.position.copy(at); const b = KartModels.batch();
      b.add('sphere', '#3ab4f2', [0, .3, 0], [.24, .24, .24], null, .1, .2, '#0d5f9a'); b.add('cylinder', '#bfeaff', [0, .56, 0], [.09, .16, .09], null, .1, .25); b.add('cylinder', '#b98a5e', [0, .68, 0], [.1, .08, .1]);
      b.add('sphere', '#e9f8ff', [.09, .38, .17], [.05, .07, .03], null, 0, .2, '#bfeaff'); b.add('fps-loot-ring', '#3ab4f2', [0, .035, 0], [1, 1, 1], [Math.PI / 2, 0, 0], .2, .5, '#0d5f9a'); b.finish(root, false);
    }
    const color = q.type === 'weapon' ? (FPSWeaponArt.SKINS[q.gun] || FPSWeaponArt.SKINS[0]).black : BEAM[q.type] || '#ffffff';
    if (!KartModels.geometry.has('fps-beam')) { const g = new T.CylinderGeometry(.32, .46, 9, 14, 1, true); g.translate(0, 4.5, 0); KartModels.geometry.set('fps-beam', g); }
    const beam = new T.Mesh(KartModels.geo('fps-beam'), beamMaterial(color)); beam.userData.noInk = true; beam.renderOrder = 4; beam.castShadow = beam.receiveShadow = false;
    Style3D.outline(root, .009); root.add(beam); root.userData.baseY = root.position.y; root.userData.beam = beam; return root;
  };
  const update = FPSSupplyArt.update; FPSSupplyArt.update = function (view, m) {
    update.call(this, view, m);
    view.pickupModels.forEach((mesh, i) => { if (!mesh.visible || mesh.userData.baseY === undefined) return; mesh.position.y = mesh.userData.baseY + .16 + Math.sin(m.time * 2.2 + i) * .07; mesh.rotation.y = m.time * .9 + i; mesh.userData.beam.rotation.y = -mesh.rotation.y; });
  };
}
