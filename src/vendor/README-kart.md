# Motor gráfico de Esmash Kart

`three-kart.min.js` es un bundle local de **Three.js 0.180.0**, publicado bajo MIT.
La licencia íntegra se conserva en `THREE-LICENSE.txt`; la entrada con las exportaciones utilizadas
está en `three-kart.entry.js`. Se generó con **esbuild 0.25.10**, formato IIFE,
nombre global `KartGL`, target ES2020, minificación y comentarios legales incluidos.

Además del núcleo, la entrada exporta los complementos de `three/examples/jsm` que usa el kart:
`RoundedBoxGeometry`, `mergeGeometries`/`mergeVertices`, `RoomEnvironment`, `Sky` y la cadena de
posproceso (`EffectComposer`, `RenderPass`, `UnrealBloomPass`, `ShaderPass`, `OutputPass`, `FXAAShader`).
Para regenerarlo: `npm i three@0.180.0 esbuild@0.25.10` y
`esbuild three-kart.entry.js --bundle --format=iife --global-name=KartGL --target=es2020 --minify --legal-comments=inline --outfile=three-kart.min.js`.

El posproceso (`js/kart-post.js`: bloom, gradación por pista, desenfoque radial con turbo) solo corre
con `ART.hi`; en Xbox, en Calidad «Rápida», con «Efectos reducidos», en pantalla dividida o cuando el
regulador de cuadros detecta un equipo lento, la pista se dibuja directo como antes.

El bundle forma parte de `index.html` al ejecutar `src/build_web.py`: jugar no solicita
librerías ni modelos a un CDN. Los modelos y escenarios se construyen en `kart-models.js`
y `kart-3d.js`; los materiales y geometrías comunes se reutilizan y la escena anterior se libera
al cambiar de carrera. El HUD y las peleas continúan en su lienzo 2D independiente.

Upstream: https://github.com/mrdoob/three.js/tree/r180
