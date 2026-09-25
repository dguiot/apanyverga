'use strict';
// ============================================================
//  PARCHE DE BALANCE
//  Medido en el motor (auditoría de golpes, saltos, recuperación y % de KO)
//  y con cientos de peleas 1 contra 1 entre CPUs del mismo nivel.
//  Aquí van los ajustes de ritmo y fuerza por personaje; los cambios a
//  especiales concretos están en su propio archivo con un comentario.
// ============================================================

// ritmo de los golpes normales (arranque, activo, recuperación, daño, empuje, área)
Object.assign(KIT_TEMPO, {
  // Nacho perdía casi todo: era el más lento de los humanos sin ser el más fuerte
  nacho: { s: 1.0, a: 1.0, r: 1.04, dmg: 1.08, kb: 1.06, rad: 1.06 },
  // Pablo: igual de veloz, pega un poco más
  pablo: { s: 0.75, a: 0.9, r: 0.8, dmg: 0.92, kb: 0.95, rad: 0.96 }, // v12: recupera un poco más lento (pegaba más que nadie)
  // Robes ganaba casi todo: sigue siendo el más fuerte, pero tarda más en recuperarse
  robes: { s: 1.3, a: 1.1, r: 1.36, dmg: 1.02, kb: 1.0, rad: 1.12 },
  // Michi: sus smashes eran casi seguros en escudo; ahora cuestan un poco más
  michi: { s: 0.65, a: 0.85, r: 0.74, dmg: 0.86, kb: 0.96, rad: 0.95 },
  // Chupacabras: un poco más de pegada
  chupa: { s: 0.8, a: 0.9, r: 0.8, dmg: 0.98, kb: 1.0, rad: 1.0 },
  // Mariachi era el más débil: golpes más rápidos y con más fuerza
  mariachi: { s: 0.88, a: 1.15, r: 0.85, dmg: 1.1, kb: 1.08, rad: 1.12 },
  // Nicole: magia a distancia; de cerca era muy lenta
  nicole: { s: 0.85, a: 1.25, r: 0.88, dmg: 1.03, kb: 1.06, rad: 1.12 },
  // Axo: un poco menos de daño (se cura solo)
  axo: { s: 0.95, a: 1.3, r: 0.95, dmg: 0.86, kb: 0.96, rad: 1.06 },
  // Dinomita: arranca un poco antes
  dino: { s: 1.3, a: 1.1, r: 1.32, dmg: 1.12, kb: 1.06, rad: 1.18 },
});

// golpes propios que se pasaban o se quedaban cortos
MOVE_KITS.robes.fsmash.hits = [HB(21, 24, 58, -60, 34, 20, 38, 9, 17, { sfx: 'bighit' })]; // sacaba a 66% sin cargar
MOVE_KITS.nacho.ftilt.dur = 32;
MOVE_KITS.mariachi.jab3.hits = [HB(6, 9, 56, -62, 28, 9, 40, 7.5, 8, { sfx: 'bighit' })];
MOVE_KITS.chispa.fsmash.hits = [HB(16, 19, 48, -30, 30, 17, 48, 8.5, 16, { effect: 'elec', sfx: 'bighit' })]; // más horizontal: sí saca de lado

// peso y movilidad: los pesados eran casi imposibles de sacar; Pablo se escapaba de todo
Object.assign(CHARS.robes, { weight: 110 }); // v12: aguantar más le daba de más al más pesado
Object.assign(CHARS.luchador, { weight: 104, reach: 0.95, air: 5.7 }); // luchador de cerca: alcance corto, poco control en el aire
Object.assign(CHARS.pablo, { weight: 80, run: 10.4, air: 6.5 });
Object.assign(CHARS.michi, { weight: 78 }); // la más ligera salía volando desde 70% en la orilla
Object.assign(CHARS.nicole, { weight: 95 });
Object.assign(CHARS.mariachi, { weight: 106, run: 9.6 });
Object.assign(CHARS.chupa, { weight: 90 });
Object.assign(CHARS.dino, { weight: 128, djump: 14 });
Object.assign(CHARS.torito, { weight: 120 });
Object.assign(CHARS.chispa, { run: 9.3, air: 6.0, weight: 110 }); // v12: la robot era la más lenta en alcanzar a los demás, y de metal pesa más

// fuerza final por personaje:
//  dmg — daño de todo lo que pega (golpes, especiales, proyectiles, lanzamientos); se afina con peleas simuladas
//  kb  — empuje de todo lo que pega; se calibra para que sus golpes normales saquen al % de su tipo
//  fs  — empuje extra solo del smash lateral (su golpe insignia), calibrado aparte para no inflar lo demás
const CHAR_BAL = {
  pablo: { dmg: 0.8, kb: 0.742, fs: 1.384 },
  torito: { dmg: 0.932, kb: 0.726, fs: 1.084 },
  luchador: { dmg: 0.86, kb: 0.786, fs: 1.091 },
  dino: { dmg: 0.946, kb: 0.749, fs: 1.105 },
  chupa: { dmg: 1.124, kb: 0.713, fs: 1.076 },
  nicole: { dmg: 1.14, kb: 0.708, fs: 1.081 },
  mariachi: { dmg: 1.231, kb: 0.675, fs: 1.052 },
  axo: { dmg: 1.026, kb: 0.746, fs: 1.089 },
  daniel: { dmg: 1.091, kb: 0.762, fs: 1.092 },
  robes: { dmg: 0.804, kb: 0.847, fs: 1.048 },
  michi: { dmg: 1.048, kb: 0.742, fs: 1.077 },
  chilazo: { dmg: 0.822, kb: 0.776, fs: 1.094 },
  nacho: { dmg: 1.129, kb: 0.755, fs: 1.065 },
  chispa: { dmg: 1.25, kb: 0.72, fs: 1.338 },
  puentin: { dmg: 1.04, kb: 0.745, fs: 1.029 },
};

// qué tan lejos mandan los lanzamientos a % alto: los luchadores y los pesados sacan desde ~125% en la orilla,
// los demás pasando ~150%. Por debajo de eso un agarre solo sirve para acomodar, no para sacar.
const THROW_KB = { luchador: 1.14, robes: 1.03, dino: 1.07, torito: 1.07 };

// aplica fs al smash lateral y THROW_KB a los lanzamientos, después de los ajustes propios de cada personaje
for (const id of CHAR_ORDER) {
  const own = CHAR_TWEAKS[id];
  CHAR_TWEAKS[id] = set => {
    if (own) own(set);
    const fs = CHAR_BAL[id] && CHAR_BAL[id].fs;
    if (fs && fs !== 1 && set.fsmash) set.fsmash.hits.forEach(h => { h.bkb *= fs; h.kbg *= fs; });
    const th = THROW_KB[id];
    if (th) for (const k of ['fthrow', 'bthrow', 'uthrow', 'dthrow']) if (set[k]) set[k].kbg *= th;
  };
}
