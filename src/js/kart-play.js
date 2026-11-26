'use strict';
// ============================================================
//  KART: JUGABILIDAD
//  · En el celular acelera solo. Antes el pulgar derecho tenía que mantener GAS y a la vez derrapar o
//    lanzar el objeto (imposible con un solo pulgar). Ahora: botón grande = DERRAPE (suelta para el turbo),
//    FRENO, ÍTEM y ATRÁS. En la cuenta regresiva el botón grande es GAS, para la salida turbo.
//  · El objeto que llevas te cubre la espalda (como en las carreras de karts clásicas): si un proyectil te
//    alcanza por detrás mientras cargas una tortilla, una salsa o un chile, se pierde el objeto y no te pegan.
// ============================================================
const KartTouch = {
  auto: true,
  load() { try { this.auto = localStorage.getItem('esmash-kart-autogas') !== 'off'; } catch (e) { this.auto = true; } },
  set(on) { this.auto = !!on; try { localStorage.setItem('esmash-kart-autogas', on ? 'on' : 'off'); } catch (e) { /* modo privado */ } },
  grid() { return APP.kartRace?.phase === 'grid'; },
};
KartTouch.load();
{
  const T = TouchPad, labels = T.kartLabels;
  T.kartLabels = function () {
    if (!this.L || this.L.fps) return labels.call(this);
    const kart = APP.screen === 'kartRace';
    // al salir del kart vuelven los cinco botones de la pelea
    if (!kart && this.L.btns.length !== this.BUTTONS.length && !this._relabel) { this._relabel = true; try { this.measure(); } finally { this._relabel = false; } return; }
    labels.call(this);
    if (!kart || !KartTouch.auto) return;
    const grid = KartTouch.grid(), names = { attack: grid ? ['GAS', 'Salida turbo'] : ['DERRAPE', 'Suelta: turbo'], special: ['FRENO', null], jump: ['ÍTEM', null], shield: ['ATRÁS', null] };
    this.L.btns = this.L.btns.filter(b => b.a !== 'grab');
    for (const b of this.L.btns) if (names[b.a]) { b.label = names[b.a][0]; b.sub = names[b.a][1]; }
  };
  // la etiqueta del botón grande cambia al terminar la cuenta regresiva
  const draw = T.draw; T.draw = function () { if (APP.screen === 'kartRace' && this.L && this._grid !== KartTouch.grid()) { this._grid = KartTouch.grid(); this.kartLabels(); } return draw.call(this); };
}
{
  const hit = KartRace.prototype.hit;
  KartRace.prototype.hit = function (r, owner, strength = 1) {
    const guard = ['tortilla', 'salsa', 'chile', 'triple', 'pinata'];
    if (owner !== null && owner !== undefined && strength >= .8 && r.item && guard.includes(r.item) && !r.invuln && !r.rescue && r.finish === null) {
      const L = this.course.length, q = this.projectiles.find(q => q.life > 0 && q.owner === owner && q.type !== 'salsa' && Math.abs(KartMath.delta(q.s, r.s, L)) < 30 && q.v > 0 && KartMath.delta(q.ps, r.ps, L) <= .5);
      if (q) {
        r.item = null; q.life = 0; r.invuln = .4;
        this.effects.push({ s: r.s - 2, x: r.x, life: .45, max: .45, type: 'hit', color: '#ffe3a7' });
        this.feedback(r, 'parry', .3); if (r.human) Audio8.sfx('shield');
        return false;
      }
    }
    return hit.call(this, r, owner, strength);
  };
}
