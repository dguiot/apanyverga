// La CPU no hace cosas "tontas" (CPU contra CPU y contra un rival quieto, 15 personajes × 8 escenarios):
// quedarse parada o vibrando sin avanzar, repetir el mismo golpe sin pegar, escudo intermitente,
// saltar en su lugar. Antes: ~1 caso por minuto de CPU (y bucles de agarres al aire); tope: 0.3.
process.env.MAX = process.env.MAX || '0.3';
require('./cpuaudit.js');
