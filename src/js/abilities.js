'use strict';
// ============================================================
//  HABILIDADES: cada personaje tiene un poder propio que cambia
//  cómo se mueve o cómo aguanta, además de sus especiales.
// ============================================================
const ABILITIES = {
  nacho: {
    name: 'Furia', desc: 'Con 100% o más pega 15% más fuerte · armadura mientras carga el smash y el Puño Gigante',
    dmg: f => f.percent >= 100 ? 1.15 : 1, kb: f => f.percent >= 100 ? 1.1 : 1,
    tick(f) { if (f.percent >= 100 && BATTLE.t % 4 === 0 && !f.dead) spawnFx('ember', f.x + f.face * rand(10, 30), f.y - rand(60, 100) * f.size()); },
  },
  pablo: {
    name: 'Paso sombra', desc: 'Dos esquives aéreos por salto, rápidos y largos como un relámpago · triple salto',
    airDodges: 2, dodgeSpeed: 13, shadow: true,
  },
  daniel: {
    name: 'Vuelo de fuego', desc: 'Mantén Salto en el aire para flotar un momento (puedes pegar mientras flotas)',
    hover: 70,
  },
  robes: {
    name: 'Coloso', desc: 'Los golpes débiles no lo mueven · si cae con fuerza hace temblar el piso',
    armor: (f, kb) => kb < 5 && ['idle', 'walk', 'run', 'dash', 'attack', 'crouch', 'land', 'brake', 'turn', 'jumpsquat'].includes(f.state),
    onLand(f, vy) {
      if (vy < 13 || f.state === 'hitstun') return;
      shake(5); Audio8.sfx('rumble'); Rumble.thud(f, 0.6); spawnFx('shock', f.x, f.y - 2, { col: '#95d5b2' }); spawnFx('dust', f.x - 20, f.y - 4); spawnFx('dust', f.x + 20, f.y - 4);
      hitArea(f, { x: f.x - 80 * f.size(), y: f.y - 40, w: 160 * f.size(), h: 44 }, { dmg: 5, ang: 80, bkb: 5, kbg: 3 });
    },
  },
  nicole: {
    name: 'Planeo arcano', desc: 'Mantén Salto mientras caes para planear y cruzar el escenario',
    glide: 150,
  },
  torito: {
    name: 'Embestida', desc: 'Corriendo, los golpes débiles no lo detienen',
    armor: (f, kb) => kb < 12 && (f.state === 'run' || f.state === 'dash' || (f.state === 'attack' && f.move && f.move.key === 'dash')),
  },
  chispa: {
    name: 'Escudo reflector', desc: 'Su escudo devuelve los proyectiles a quien los lanzó',
    reflectShield: true,
  },
  michi: {
    name: 'Patas de gato', desc: 'Siempre cae de pie: amortigua solo al chocar con el suelo · se agarra de las paredes y salta de ellas',
    wall: 3, autoTech: true,
  },
  chilazo: {
    name: 'Picor', desc: 'Sus golpes queman · con 100% o más sale volando menos (está que arde)',
    takenKb: f => f.percent >= 100 ? 0.94 : 1,
  },
};
function abil(f) { return ABILITIES[f.id] || {}; }
function abilityArmor(t, kb) { const a = abil(t); return !!(a.armor && !t.grabbedBy && a.armor(t, kb)); }

// cada cuadro, después de decidir la acción
function abilityTick(f) {
  const a = abil(f), c = f.ctrl;
  if (a.tick) a.tick(f);
  f.hovering = false; f.gliding = false;
  if (f.grounded) {
    f.hoverT = 0; f.glideT = 0; f.wallJumps = 0; f.jumpHoldT = c.held('jump') ? (f.jumpHoldT || 0) + 1 : 0;
    // Chupacabras: agazapado carga el súper salto
    if (a.crouchJump) { if (f.state === 'crouch') { f.crouchT = (f.crouchT || 0) + 1; if (f.crouchT === 24) { Audio8.sfx('charge', 0.6); spawnFx('ring', f.x, f.y - 20, { r: 40, col: '#ff2d2d', life: 14 }); } } else if (f.state !== 'jumpsquat') f.crouchT = 0; }
    return;
  }
  const free = f.state === 'air' || (f.state === 'attack' && f.move && f.move.def.air);
  // Daniel: flotar manteniendo Salto (al llegar arriba o cayendo)
  f.jumpHoldT = c.held('jump') ? (f.jumpHoldT || 0) + 1 : 0;
  if (a.hover && free && f.jumpHoldT >= 10 && f.vy >= -0.5 && (f.hoverT || 0) < a.hover) {
    f.hoverT = (f.hoverT || 0) + 1; f.hovering = true; f.vy = 0; f.fastFall = false;
    if (BATTLE.t % 3 === 0) spawnFx('ember', f.x + rand(-10, 10), f.y + 2);
    if (f.hoverT === 1) Audio8.sfx('fire');
  }
  // Nicole: planear manteniendo Salto mientras cae
  if (a.glide && free && f.jumpHoldT >= 8 && f.vy > 1.2 && (f.glideT || 0) < a.glide) {
    f.glideT = (f.glideT || 0) + 1; f.gliding = true; f.fastFall = false;
    f.vy = Math.min(f.vy, 1.9);
    const dir = Math.abs(c.x) > 0.3 ? sign(c.x) : f.face;
    f.vx = approach(f.vx, dir * f.ch.air * 1.2, 0.35); if (Math.abs(c.x) > 0.3) f.face = dir;
    if (BATTLE.t % 3 === 0) spawnFx('spark', f.x - f.face * 20, f.y - 50, { col: '#48cae4' });
  }
  // Michi: resbala por la pared
  if (a.wall && free && f.wallT !== undefined && BATTLE.t - f.wallT <= 2 && f.vy > 1.5) { f.vy = Math.min(f.vy, 1.6); if (BATTLE.t % 5 === 0) spawnFx('dust', f.x + f.wallDir * 16, f.y - 50); }
}
// salto de pared (va antes del doble salto)
function abilityWallJump(f) {
  const a = abil(f), c = f.ctrl;
  if (!a.wall || f.wallT === undefined || BATTLE.t - f.wallT > 3 || (f.wallJumps || 0) >= a.wall) return false;
  if (!(c.buffered('jump') || c.tapUp(2))) return false;
  c.consume('jump'); f.wallJumps = (f.wallJumps || 0) + 1;
  f.vy = -f.ch.jump * 0.95 * PHYS.jumpK; f.vx = -f.wallDir * 7.5; f.face = -f.wallDir; f.fastFall = false;
  f.flipT = FLIP_T; Audio8.sfx('djump'); spawnFx('boom', f.x + f.wallDir * 14, f.y - 50, { r: 26, col: '#f1f5f9' });
  f.wallT = -99;
  return true;
}
