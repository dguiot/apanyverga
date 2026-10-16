# Esmash Bros

*(antes «A pan y verga»)*

Juego de peleas estilo Smash para hasta 4 jugadores: en la misma pantalla (teclado, controles o
pantalla táctil) o en línea, cada quien desde su casa, con cámara y voz.

Al entrar, elige **Peleas** o **Esmash Kart**. Las peleas conservan sus modos y su online.

## Esmash Kart

Carreras locales para **un jugador contra siete CPU**, con los **15 personajes originales**,
pilotos y karts modelados en **3D**, con sus colores, sombreros, cuernos, branquias y siluetas propias.
La cámara sigue al piloto desde atrás; las fotos se usan en la selección, no durante la conducción.
El online y el multijugador local corresponden por ahora a las peleas.

- **Mercado del Sol** — 8.9 km por vuelta; curvas enlazadas, adoquines, puestos y un puente estrecho.
- **Cañón de Fuego** — 10.1 km; horquillas, desniveles, rocas móviles y puentes sobre el cañón.
- **Cumbre Neón** — 11.0 km; eses, asfalto mojado, curvas cerradas y luces nocturnas.
- Tres vueltas por carrera; carrera individual o copa de las tres pistas con puntuación acumulada.
- 100, 150 y 200 cc; asistencia de dirección opcional. Velocidad, aceleración y agarre dependen del personaje.
- Dirección y velocidad de los neumáticos independientes: el kart conserva su rumbo si no giras. Derrape con contravolante y tres niveles de mini turbo.
- Rampas, saltos y acrobacias: pulsa derrape en el aire para ganar turbo al aterrizar. Rebufo al seguir de cerca una misma línea y monedas que aumentan la velocidad; un impacto hace perder tres.
- Doce ítems: chile teledirigido, tortilla que rebota, salsa, pan turbo, burbuja, piñata, búmeran de ida y vuelta, triple chile, tormenta de alcance limitado, imán, estrella y resorte.
- Placas de aceleración y salida turbo al acelerar al final del 2.
- Banda sonora original con batería, bajo, acordes suaves y melodía; motor y neumáticos separados. **M** alterna música y solo efectos; en pausa también sirve X del mando.
- Minimapa, aviso de curvas, posición, tiempos por vuelta y récord por pista, cilindrada y asistencia, guardado en este navegador.
- Mundo WebGL2 con iluminación, sombras, materiales, relieve y objetos con profundidad. Simulación a 60 Hz e interpolación; calidad adaptativa y modo Xbox sin sombras dinámicas. Pausa automática al cambiar de ventana.

| Acción | Teclado | Control estándar |
| --- | --- | --- |
| Acelerar | W / ↑ | RT / A |
| Frenar | S / ↓ | LT |
| Girar | A D / ← → | Stick izquierdo / cruceta |
| Derrapar; soltar para turbo | Espacio / Shift | X / RB |
| Acrobacia durante un salto | Espacio / Shift | X / RB |
| Usar o lanzar ítem | E / J | LB |
| Lanzar hacia atrás | Q, o freno + ítem | B, o LT + LB |
| Rescate al centro | R | Y |
| Pausa | Esc / Enter | Menú ☰ |
| Música / solo efectos | M | X en pausa |

En celular, los botones cambian a **Gas, Freno, Derrape, Ítem y Atrás**. En el garaje,
X / Espacio cambia la cilindrada y LT / RT / L alterna la asistencia. En la selección de pista,
X / Espacio alterna carrera individual y copa. Los controles de carrera tienen su propio esquema;
la reasignación del menú «Configurar botones» se aplica a las peleas.

**Jugar:** https://dguiot.github.io/apanyverga/ (compu y celular).

**iPhone:** Safari no deja que una página se ponga en pantalla completa. Desliza la página hacia
arriba en el menú para esconder las barras, o mejor: *Compartir → Agregar a inicio* y abre el juego
desde el ícono (así abre sin barras y de lado, siempre).

**Xbox (Edge):** Edge arranca con el control manejando el navegador (flecha de ratón, B = atrás).
Pulsa **A** una vez (enciende el sonido), luego **mantén presionado ☰ Menú** y elige
**«Usar controles de juego»**; el juego lo avisa en pantalla y el aviso se quita solo. Para salir de
ese modo, vuelve a mantener ☰ Menú. En la consola arranca en calidad *Rápida* (modo ligero y menos
pixeles; se cambia en *Ajustes*), y si aun así no alcanza los 60 cuadros por segundo baja la nitidez solo.

## Cómo funciona la versión web

- `index.html` es el juego completo en un solo archivo (se genera; no se edita a mano).
- `config.js` trae la URL de Supabase y la *anon / publishable key*. Esa llave es pública por
  diseño: viaja en el navegador de todos. **Nunca** pongas aquí la `service_role` / secret key.
- **Salas en línea:** un canal de Supabase Realtime sirve para encontrarse (quién está, quién es
  anfitrión) y para las señales de cámara y voz. La pelea misma viaja directo entre navegadores
  (WebRTC); si la red no deja conectar directo, pasa por el canal a menos cuadros por segundo.
- **Salón de la fama:** tablas `apyv_players` y `apyv_docs` (ver `supabase/schema.sql`). Cualquiera
  puede leer; cada quien solo agrega lo suyo; nadie cambia ni borra.
- **Identidad:** sesión anónima de Supabase + el nombre que escribes la primera vez que entras a
  *Jugar online*.

## Configurar Supabase (una sola vez)

1. **SQL Editor** → pega `supabase/schema.sql` → *Run*.
2. **Authentication → Sign In / Providers** → activa **Allow anonymous sign-ins**.
3. **Project Settings → API** → copia la *anon* (o *publishable*) key a `config.js`.
4. Opcional: si en alguna red la cámara o la pelea no conectan, agrega un servidor TURN en `ice`
   dentro de `config.js` (Cloudflare y Metered tienen plan gratis).

## Código

`src/` tiene el código del juego, con las fotos de las caras (`src/js/faces.js`). `WEB_FACES=0` genera una versión con caras dibujadas.
Para regenerar el sitio desde la raíz del repositorio:

```sh
cd src && OUT=.. python3 build_web.py
```

`src/test/` tiene la prueba en línea de punta a punta con un Supabase simulado
(`cd src && python3 build_web.py && node test/tweb.js`, requiere Playwright).

Las carreras se verifican desde la raíz con `node src/test/tkart.cjs` y
`node src/test/tkart-devices.cjs` (requieren Playwright y Chromium; `CHROME_PATH` permite usar
una instalación de Chrome o Edge). La primera prueba cubre controles, ítems, puntos de control,
determinismo y 9 carreras completas —tres pistas × tres cilindradas—, además del arranque de una pelea.
La segunda cubre control estándar, pantalla táctil, copa, récords, pérdida de foco y calidad Xbox.
`node src/test/tkart-3d.cjs` cubre WebGL real, los 15 modelos sin fotos en carrera, cámara trasera,
contravolante, acrobacias, rebufo, monedas, los seis objetos nuevos y una renderización de audio sin saturación.

El motor 3D (Three.js 0.180.0) se incluye dentro de la versión web; no necesita un CDN ni instalar paquetes
para jugar. Licencia y entrada del bundle: `src/vendor/THREE-LICENSE.txt` y `src/vendor/three-kart.entry.js`.
