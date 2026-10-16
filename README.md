# Esmash Bros

*(antes «A pan y verga»)*

Juego de peleas estilo Smash para hasta 4 jugadores: en la misma pantalla (teclado, controles o
pantalla táctil) o en línea, cada quien desde su casa, con cámara y voz.

Al entrar, elige **Peleas** o **Esmash Kart**. Las peleas conservan sus modos y su online.

## Respuesta y movimiento

Ambos modos mantienen una simulación fija de 60 Hz. El dibujo interpola posiciones y cámaras
entre esos pasos; en las peleas, las poses activas de ataque y el contacto se muestran en su
cuadro exacto. El salto despega tras tres cuadros de anticipación y los comandos nuevos se
conservan durante la pausa de impacto. Los golpes y aterrizajes combinan reacción corporal,
sonido y vibración según su intensidad.

Los karts tienen inclinación de carrocería y motos, suspensión al aterrizar y acrobacias que
terminan su giro con continuidad. La cámara responde por tiempo transcurrido, también en
pantalla dividida. Los niveles del derrape y la salida del turbo tienen señales sonoras y hápticas.
Las correcciones pequeñas del anfitrión se absorben visualmente, y los objetos y efectos
conservan su identidad entre paquetes para reutilizar geometría y evitar repetir explosiones.

La calidad automática responde a tirones repetidos además del promedio. El bucle limita la
acumulación de pasos tras una pestaña bloqueada. La suavidad y los resortes son solo de dibujo:
no alteran colisiones, velocidades ni la igualdad del estado confirmado online.

En peleas, el retardo de entrada vuelve gradualmente a dos cuadros cuando mejora la conexión;
los toques breves se conservan durante esa transición. Para simular con rollback, todas las
pestañas deben tener la misma versión de jugabilidad. Una pestaña antigua usa el modo existente
con el anfitrión como autoridad; recarga todos los jugadores para activar la versión nueva.

## Esmash Kart

Carreras locales para **un jugador contra siete CPU**, y **salas online para hasta cuatro pilotos**,
con los **15 personajes originales**,
pilotos y karts modelados en **3D**, con sus colores, sombreros, cuernos, branquias y siluetas propias.
La cámara sigue al piloto desde atrás; las fotos se usan en la selección, no durante la conducción.
Las carreras online reutilizan las salas, enlaces de invitación, cámara, voz y conexión WebRTC de las peleas.
Los puestos restantes hasta ocho se completan con CPU.

Cada piloto puede elegir **seis vehículos**, incluidos **dos modelos de moto**, desde el botón
**Vehículo** del garaje o la sala online (**V / Y**). La elección se guarda en este navegador y viaja
con la configuración de la carrera para que todos vean el mismo vehículo y simulen sus mismas características.

| Vehículo | Ventaja | Compensación |
| --- | --- | --- |
| Cometa | Conducción equilibrada | Sin especialidad marcada |
| Flecha GP | Punta y duración del turbo | Menor aceleración y recuperación en tierra |
| Rally 4×4 | Agarre, frenada y terreno difícil | Menor punta y turbo más breve |
| Titán GT | Peso en los contactos y turbos largos | Aceleración y cambios de apoyo más lentos |
| Centella R · moto deportiva | Respuesta y carga rápida del derrape | Turbo breve, menor agarre y peso |
| Gacela Trail · moto de campo | Aceleración, agarre y recuperación | Menor punta y duración del turbo |

Las motos tienen dos ruedas, manillar y postura propia; se inclinan al girar. Las cuatro carrocerías
también tienen geometrías distintas. Todos los personajes pueden usar cualquiera. El equilibrio se
comprueba con 54 vueltas controladas: seis vehículos × tres pistas × tres cilindradas, mismo piloto e IA,
sin objetos. El margen agregado de tiempos entre el más rápido y el más lento es de aproximadamente 2,3 %.

Los escenarios incluyen cielo con nubes y atmósfera, tres capas de montañas, asfalto y terreno con
texturas y relieve, fachadas con balcones y contraventanas, árboles ramificados, roca estratificada,
estructuras bajo los puentes y reflejos suaves en las zonas nocturnas. Los materiales se generan
localmente y no requieren descargas adicionales.

Los doce ítems tienen modelos 3D propios y se ven orbitando el vehículo mientras los llevas. Las cajas
se leen desde seis caras, los cohetes dejan estela y avisan al objetivo, la piñata describe un arco y
el búmeran gira durante el vuelo. Una tortilla puede interceptar un cohete enemigo.

En **Esmash Kart → ONLINE** (U / LB en el garaje), crea una sala o entra con el enlace que te compartan.
Cada invitado elige su personaje y pulsa **Estoy listo**; el anfitrión elige pista y cilindrada e inicia.
Cada navegador muestra una vista trasera por participante: dos mitades para dos pilotos, una mitad y
dos cuartos para tres, cuatro cuadrantes para cuatro. Tu vista tiene borde dorado y la etiqueta **TÚ**.
El botón **Cámara y voz** funciona en la sala, durante la carrera y en resultados; los videos aparecen
en el cuadro de cada piloto. En carrera, M controla la música; el micrófono se controla desde su botón.
El anfitrión resuelve ítems, impactos y vueltas; los invitados predicen su conducción y reciben el
estado por el transporte existente, con el mismo respaldo por canal cuando no conecta WebRTC.
Abrir el menú no detiene una carrera online. Un piloto desconectado pasa temporalmente a CPU;
las llegadas durante una carrera son espectadores hasta la siguiente. Los resultados aparecen cuando
terminan todos los pilotos conectados. El anfitrión puede volver a la sala sin cortar la voz ni la cámara.

- **Mercado del Sol** — 8.9 km por vuelta; curvas enlazadas, adoquines, puestos y un puente estrecho.
- **Cañón de Fuego** — 10.1 km; horquillas, desniveles, rocas móviles y puentes sobre el cañón.
- **Cumbre Neón** — 11.0 km; eses, asfalto mojado, curvas cerradas y luces nocturnas.
- Tres vueltas por carrera; carrera individual o copa de las tres pistas con puntuación acumulada.
- 100, 150 y 200 cc; asistencia de dirección opcional. Velocidad, aceleración y agarre combinan el personaje y el vehículo; también cambian frenada, carga y duración del derrape, recuperación fuera de pista y respuesta al contacto.
- Dirección y velocidad de los neumáticos independientes: el kart conserva su rumbo si no giras. Derrape con contravolante y tres niveles de mini turbo.
- Rampas, saltos y acrobacias: pulsa derrape en el aire para ganar turbo al aterrizar. Rebufo al seguir de cerca una misma línea y monedas que aumentan la velocidad; un impacto hace perder tres.
- Doce ítems: chile teledirigido, tortilla que rebota, salsa, pan turbo, burbuja, piñata, búmeran de ida y vuelta, triple chile, tormenta de alcance limitado, imán, estrella y resorte.
- Placas de aceleración y salida turbo al acelerar al final del 2.
- Banda sonora original con batería, bajo, acordes suaves y melodía; motor y neumáticos separados. **M** alterna música y solo efectos; en pausa también sirve X del mando.
- Minimapa, aviso de curvas, posición, tiempos por vuelta y récord por pista, cilindrada y asistencia, guardado en este navegador.
- Mundo WebGL2 con iluminación, sombras, materiales, relieve y objetos con profundidad. Simulación a 60 Hz e interpolación; calidad adaptativa y modo Xbox sin sombras dinámicas. Pausa automática al cambiar de ventana en carreras locales; el online continúa.

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
`node src/test/tkart-online.cjs` abre cuatro navegadores con el adaptador de Supabase existente
(solo el servicio de señalización se simula) y conexiones WebRTC reales. Comprueba invitaciones,
voz y cámara, conducción independiente, ítems remotos, vistas de dos/tres/cuatro jugadores, entrada
como espectador, paquetes atrasados, desconexiones, resultados y regreso a la sala.

El motor 3D (Three.js 0.180.0) se incluye dentro de la versión web; no necesita un CDN ni instalar paquetes
para jugar. Licencia y entrada del bundle: `src/vendor/THREE-LICENSE.txt` y `src/vendor/three-kart.entry.js`.

`node src/test/tkart-vehicles.cjs` verifica la selección y persistencia, geometría de los seis vehículos,
dos ruedas en las motos, 54 vueltas para comparar tiempos, respuesta por peso, intercepción de
cohetes, los doce modelos de ítems, materiales y cielos de las tres pistas, y el límite de caché de miniaturas.

`node src/test/tgame-feel.cjs` comprueba tiempos de salto y búfer durante impactos, dibujo sin
mutar el combate, repetición tras rollback, recuperación del retardo de entrada, cámara y
suspensión a 30/60/120/144 Hz, pausa, corrección online y continuidad de las entidades recibidas.
`node src/test/trollback.js` compara dos navegadores con WebRTC real, latencia y pérdidas,
incluyendo dibujo durante la partida y comparación de estados confirmados. Estas pruebas
no sustituyen la medición de FPS ni las pruebas de tacto en el dispositivo final.
