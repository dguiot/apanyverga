# Motor gráfico de Esmash Kart

`three-kart.min.js` es un bundle local de **Three.js 0.180.0**, publicado bajo MIT.
La licencia íntegra se conserva en `THREE-LICENSE.txt`; la entrada con las exportaciones utilizadas
está en `three-kart.entry.js`. Se generó con **esbuild 0.25.10**, formato IIFE,
nombre global `KartGL`, target ES2020, minificación y comentarios legales incluidos.

El bundle forma parte de `index.html` al ejecutar `src/build_web.py`: jugar no solicita
librerías ni modelos a un CDN. Los modelos y escenarios se construyen en `kart-models.js`
y `kart-3d.js`; los materiales y geometrías comunes se reutilizan y la escena anterior se libera
al cambiar de carrera. El HUD y las peleas continúan en su lienzo 2D independiente.

Upstream: https://github.com/mrdoob/three.js/tree/r180
