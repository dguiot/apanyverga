# Esmash Bros

*(antes «A pan y verga»)*

Juego de peleas estilo Smash para hasta 4 jugadores: en la misma pantalla (teclado, controles o
pantalla táctil) o en línea, cada quien desde su casa, con cámara y voz.

La portada tipo póster presenta los tres juegos y dos entradas: **Juego local** y
**Juego online**. Online crea una sala inmediatamente; el mismo enlace sirve para
Esmash, Kart y FPS, con voz/cámara y participantes visibles aunque apaguen el video.
El anfitrión confirma el juego; los invitados pueden proponerlo. Cambiar de juego o
volver a preparar una partida conserva la sala y las conexiones de voz/cámara.

Cada juego sigue el mismo recorrido: **Ajustes → Personajes y vehículos → Escenario**.
Los ajustes reúnen reglas, sonido, imagen y controles. Se abre exactamente el mismo panel
con **Esc / Menu** o **Pausa / Ajustes** durante la partida. Las reglas de una ronda en
curso quedan bloqueadas; sonido, imagen y controles se pueden cambiar al momento. En online,
el juego sigue para los demás mientras consultas tus ajustes.

La selección de Kart tiene pestañas visibles **Personajes** y **Vehículos**: pulsa **Y**
para alternar, recorre los seis vehículos con la cruceta y confirma con **A**. En local,
**LB / RB** cambia el jugador que estás configurando; cada uno conserva su personaje y
vehículo. Las cámaras se dividen únicamente para jugadores del mismo dispositivo.

La ilustración original de portada está en `src/assets/cover-three-games.webp`, generada
con ImageGen a partir de los personajes existentes. El compilador la incluye en el HTML;
no depende de un CDN ni de descargar imágenes al abrir el juego.

## Controles de Kart

| Acción | Teclado | Mando Xbox / PlayStation |
| --- | --- | --- |
| Dirección | A D o ← → | Palanca izquierda o cruceta |
| Acelerar / frenar | W S o ↑ ↓ | RT / LT (R2 / L2); A también acelera |
| Derrape / acrobacia en el aire | Espacio o Shift | X / RB (□ / R1) |
| Lanzar objeto adelante | E o J | LB / L1 |
| Lanzar objeto atrás | Q | B / ○ |
| Pausa y ajustes | Esc / Enter | Menu / Options |

Y y R no rescatan ni reinician el kart. El rescate es automático al caer de un puente.
La invulnerabilidad se muestra con un halo constante: el piloto nunca se oculta ni parpadea.
Los avisos de vuelta y meta son discretos; los objetos y efectos activos se consultan en el HUD.
Los mismos controles de objetos se usan en solitario, pantalla dividida y online.

La palanca tiene zona muerta y respuesta progresiva: se puede corregir la trazada cerca
del centro sin llegar de golpe al giro máximo. El derrape pierde velocidad por fricción
de neumáticos incluso acelerando, y recupera agarre de forma gradual al soltarlo.
La vibración combina velocidad, carga de curva, deslizamiento y tipo de firme; solo se
envía al mando de ese jugador y respeta los impactos más fuertes. Depende de que el
mando/navegador exponga un actuador háptico, y se apaga desde Sonido e imagen.

## Un solo diseño de personajes

Esmash conserva su dibujo, siluetas, proporciones y animaciones. Las fotos se sustituyen
por las caras dibujadas de ese mismo estilo. No se introduce otro renderer para las peleas.

`src/js/character-design.js` es la única definición de los 15 personajes: piel, pelo,
vestuario, accesorios y proporciones. El registro es inmutable y `CharacterDesign.get(id)`
devuelve el mismo objeto para los tres modos. `LOOKS` es un alias del mismo registro.

`character-art.js` llama al **renderer original de Esmash** (`drawHead` / `drawTorso`)
para generar las texturas de cara y vestuario que usan los modelos de Kart y FPS.
No hay una segunda ilustración de la cara ni una paleta distinta por juego.
Las texturas se colocan en superficies delanteras; la cabeza mantiene volumen, cabello
y accesorios por detrás. La cámara de Kart no muestra una cara mirando al conductor.
`character-models.js` comparte la construcción sentada y de pie y deriva las proporciones
del esqueleto de Esmash. También comparte manos, guantes y garras con las armas de FPS.

La cámara de voz/video sigue siendo opcional y se conserva. El póster es una referencia
artística: esta unificación no presenta los escenarios ni la jugabilidad de Kart/FPS como
terminados o con la calidad de la ilustración. Las mejoras gráficas continúan un juego a la vez.

`node src/test/tcharacters.cjs` comprueba el renderer conservado, las texturas compartidas,
los 15 personajes en ambos modelos, las superficies delanteras y la ausencia de fotos.

## FPS

FPS es un mundo de unos 500 × 500 metros: valle, bosque, río con puentes,
patio central, almacenes accesibles, escaleras y azoteas. Conserva los 15 personajes.
El combate libre termina a las 12 bajas o a los siete minutos, con escudos, munición,
coberturas que bloquean disparos, reaparición y CPU para completar cuatro plazas.

Las cinco armas tienen cargadores, cadencias, dispersión, retroceso y tiempos de recarga
distintos, y modelos a escala real con acabados de verdad (aluminio anodizado con desgaste,
acero, polímero punteado, Cerakote, nogal): Cobalto 9 (pistola con miras de tritio), Avispa
(subfusil con punto rojo), Sierra M4 (fusil con guardamanos color arena y mira holográfica),
Trueno 12 (escopeta de bomba con mira de fibra óptica) y Horizonte (francotirador de cerrojo con
anteojo de 30 mm). Las retículas brillan contra cualquier fondo. Todos llevan guantes tácticos.

En la mano el arma tiene inercia al mirar, paso en forma de ocho, postura baja al correr,
inclinación al moverte de lado, caída al aterrizar y retroceso propio (patada, cabeceo y giro).
La luz del arma sale del mismo lado que el sol y el fogonazo ilumina el arma y lo que tienes cerca.
Las recargas son completas: el cargador sale y cae, la mano trae otro, lo inserta y lo golpea, y si
estaba vacía jala la palanca o la corredera; la escopeta se carga cartucho por cartucho y bombea
después de cada tiro, y el francotirador mueve el cerrojo. Cada paso tiene su sonido.
Agacharse mientras corres hace una **barrida** de unos 0.7 s, más rápida que correr.

La granada es de fragmentación a escala real y su explosión tiene bola de fuego, humo que sube,
esquirlas que rebotan, onda en el suelo, marca quemada, luz propia, sacudida según la distancia y
zumbido de oídos si estalla muy cerca. Las granadas cercanas se marcan en pantalla con su distancia.

La CPU tiene tres niveles (**Ajustes → Dificultad CPU**, por omisión *Difícil*). Apunta a quien ve
y recuerda dónde te vio (no ve a través de paredes), tarda en reaccionar, su puntería empieza con
error y se afina mientras te sigue, se le atrasa la mira si te mueves de lado, compensa el retroceso
según su nivel, dispara en ráfagas, rodea obstáculos, sale de los edificios por la puerta, se cubre
detrás de algo que le tape tu línea de tiro para recargar o curarse y lanza granadas con el arco
calculado a donde te escondiste. Contra alguien que se mueve de lado todo el tiempo a 25 m:

| Nivel | Precisión | Daño por segundo |
| --- | --- | --- |
| Normal | ~15 % | ~10 |
| Difícil | ~35 % | ~26 |
| Experto | ~55 % | ~42 |

Los personajes llevan portaplacas con portacargadores, radio y cinturón de combate sobre su vestuario
(cara y colores de Esmash intactos). Corren en la dirección real del movimiento, inclinan el torso,
siguen la mira, se llevan el arma al hombro al apuntar, la bajan al correr, recogen las piernas en
el aire, reaccionan al recibir un tiro y caen al morir. El mapa suma autos estacionados y tambos que
frenan balas, sombras de contacto bajo las coberturas y mugre en la base de los edificios.

En pantalla hay marcador con tiempo, bajas y lugar; un arco rojo alrededor de la mira que
señala de dónde vino el daño (también en línea); aviso al eliminar a alguien, con otro color
para el tiro a la cabeza, y quién te eliminó mientras esperas reaparecer. La guía de controles
solo aparece los primeros segundos. Con una sola vista y calidad completa, la imagen pasa por
brillo, gradación de color y viñeta (`js/fps-post.js`); el pasto tiene manchas de color
natural sin cuadrícula repetida y las montañas crestas con bosque, roca y nieve.

| Acción | Teclado y ratón | Mando estándar |
| --- | --- | --- |
| Mover / mirar | WASD / ratón con cursor capturado | Palancas izquierda / derecha |
| Correr | Shift | Pulsar L3; se cancela al parar o apuntar |
| Mira / disparo | Clic derecho / izquierdo | LT / RT |
| Recargar | R | X / □; también RB / R1 |
| Saltar | Espacio | A / ✕ |
| Agacharse (mantener) / barrida corriendo | C o Ctrl | B / ○ |
| Cambiar arma | 1–5, Q o rueda | Y |
| Pausa | Esc | Menu / Start |

En solitario funcionan teclado/ratón o mando. En local, P1 usa teclado/ratón y P2–P4
usan un mando cada uno; selecciona la cantidad antes de entrar. Solo el multijugador
local divide la pantalla. **Online cada persona tiene una única cámara propia a pantalla
completa**, tanto en FPS como en Kart. El FPS reutiliza salas, invitaciones, DataChannels,
alternativa por relay y la misma voz/cámara de Esmash. El anfitrión resuelve impactos,
munición y puntuación; los invitados predicen su movimiento y reciben correcciones.

## Música por escenario

El tema del lobby se conserva. Hay doce composiciones originales de la misma familia
disco/funk electrónico, con bajo sincopado, teclas cálidas, pulsaciones de guitarra,
percusión y secciones de 32 compases. Cada arena y circuito tiene su propia armonía,
melodía y patrón; los tempos van de 103 a 130 BPM. También hay un tema para FPS.
Se respetan los ajustes de música/efectos, volumen general y atenuación de la voz.

| Escenario | Tema | BPM |
| --- | --- | --- |
| Templo | Piedra y terciopelo | 110 |
| Volcán (peleas) | Disco de magma | 128 |
| Barco | Sal en el vinilo | 105 |
| Espacio | Órbita de seda | 116 |
| Ciudad | Semáforo ámbar | 121 |
| Estadio | La última vuelta al sol | 125 |
| Xochimilco | Canal de miel | 103 |
| Pirámide | Cobre al amanecer | 113 |
| Mercado del Sol | Domingo de groove | 119 |
| Cañón de Fuego | Fuego de medianoche | 130 |
| Cumbre Neón | Lluvia cromada | 123 |
| FPS | Horizonte eléctrico | 112 |

## Respuesta y movimiento

Los tres modos mantienen una simulación fija de 60 Hz. El dibujo interpola posiciones y cámaras
entre esos pasos; en las peleas, las poses activas de ataque y el contacto se muestran en su
cuadro exacto. El salto despega tras tres cuadros de anticipación y los comandos nuevos se
conservan durante la pausa de impacto. Los golpes y aterrizajes combinan reacción corporal,
sonido y vibración según su intensidad.

Los karts tienen inclinación de carrocería y motos, suspensión al aterrizar y acrobacias que
terminan su giro con continuidad. La cámara responde por tiempo transcurrido. En online cada
jugador tiene una sola vista propia a pantalla completa. Los niveles del derrape y la salida del turbo tienen señales sonoras y hápticas.
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
La cámara sigue al piloto desde atrás; selección, retratos y conducción usan el mismo diseño estilizado.
Las carreras online reutilizan las salas, enlaces de invitación, cámara, voz y conexión WebRTC de las peleas.
Los puestos restantes hasta ocho se completan con CPU.
En online cada dispositivo sigue únicamente a su piloto; las cámaras de voz/vídeo aparecen
como miniaturas. La pista y el HUD se componen en el mismo lienzo para que una superficie 2D
opaca o las capas del navegador no oculten el mundo 3D. La pantalla dividida se reserva para
participantes locales. Una pérdida del contexto gráfico muestra recuperación y reconstruye la pista.

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
son cubos de cristal arcoíris con un «?» encendido que gira adentro, estallan en chispas al tomarlas,
reaparecen con un rebote y se leen desde seis caras, los cohetes dejan estela y avisan al objetivo, la piñata describe un arco y
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

- **Mercado del Sol** — 4.7 km por vuelta (≈55 s a 150 cc); curvas enlazadas, adoquines, puestos y un puente estrecho.
- **Cañón de Fuego** — 5.3 km (≈60 s); horquillas, desniveles, rocas móviles y puentes sobre el cañón.
- **Cumbre Neón** — 5.7 km (≈72 s); eses, asfalto mojado, curvas cerradas y luces nocturnas.
  Las pistas se acortaron a 0.76 de su trazo original (`KART_TRACK_SCALE`): antes una vuelta tardaba
  de 95 a 145 s y una carrera de tres vueltas pasaba de cinco minutos.
- Tres vueltas por carrera; carrera individual o copa de las tres pistas con puntuación acumulada.
- 100, 150 y 200 cc; asistencia de dirección opcional. Velocidad, aceleración y agarre combinan el personaje y el vehículo; también cambian frenada, carga y duración del derrape, recuperación fuera de pista y respuesta al contacto.
- Dirección y velocidad de los neumáticos independientes: el kart conserva su rumbo si no giras. Derrape con contravolante y tres niveles de mini turbo.
- Rampas, saltos y acrobacias: pulsa derrape en el aire para ganar turbo al aterrizar. Rebufo al seguir de cerca una misma línea y monedas que aumentan la velocidad; un impacto hace perder tres.
- Doce ítems: chile teledirigido, tortilla que rebota, salsa, pan turbo, burbuja, piñata, búmeran de ida y vuelta, triple chile, tormenta de alcance limitado, imán, estrella y resorte.
- Placas de aceleración y salida turbo al acelerar al final del 2.
- Banda sonora original con batería, bajo, acordes suaves y melodía; motor y neumáticos separados. **M** alterna música y solo efectos; en pausa también sirve X del mando.
- Minimapa, aviso de curvas, posición, tiempos por vuelta y récord por pista, cilindrada y asistencia, guardado en este navegador.
- Imagen de cine: brillo (bloom), gradación de color por pista, viñeta y desenfoque radial con turbo;
  flamas de escape que cambian de azul a naranja y morado con la carga del derrape, chispas, humo de
  llantas, polvo, sacudida de cámara y líneas de velocidad. Se apaga solo en Xbox, en Calidad «Rápida»,
  con «Efectos reducidos», en pantalla dividida o si el equipo no alcanza 60 cuadros.
- Vehículos con carrocería redondeada, pintura con barniz, llantas con dibujo, rines y número de piloto.
- CPU que frena según el radio real de la curva, esquiva obstáculos según dónde van a estar, no derrapa
  junto a un peligro y mantiene la carrera cerrada (±5 % de ritmo según la distancia a los humanos).
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

`src/` contiene el código, el registro de personajes y los modelos compartidos. El build no incluye fotos de caras.
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
voz y cámara, conducción independiente, ítems remotos, vista individual con dos/tres/cuatro jugadores, entrada
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

`node src/test/tkart-screen.cjs` reproduce un lienzo de PC opaco, comprueba píxeles reales
de las tres pistas, redimensionado, pausa, miniaturas, vista individual online y pérdida/restauración
del contexto WebGL.

`node src/test/tmode-controls.cjs` comprueba aceleración inalámbrica con un mando inactivo
conectado antes, ausencia de rescate por Y/R, lanzamiento delantero/trasero, rescate automático,
protección sin parpadeo, recarga de las cinco armas con X y RB, WASD con mando conectado,
separación local, acciones de Esmash y pausa con Menu independiente de las asignaciones de pelea.
El panel de controles muestra los botones detectados para diagnosticar mandos inalámbricos.
`node src/test/tkart-handling.cjs` verifica la respuesta de palanca, fricción y recuperación
de los seis vehículos, vibración proporcional y las llamadas al actuador inalámbrico.

`node src/test/tkart-steering.cjs` comprueba izquierda/derecha en coordenadas de pantalla
con palanca, cruceta, WASD, flechas y controles táctiles, y verifica desplazamiento,
orientación y ruedas delanteras en los seis vehículos de las tres pistas.

`node src/test/tfps.cjs` verifica movimiento, salto, colisión, acceso a azoteas, impactos,
escudos, munición, cambio de arma, recarga, reaparición, controles de mando, vista en
primera persona y división exclusivamente local. `node src/test/tfps-online.cjs` comprueba
cuatro navegadores con WebRTC, AV, predicción, latencia/pérdida, autoridad del anfitrión,
validación de paquetes, resultados, espectadores y revancha usando la señalización simulada.

En FPS, mantener **C / Ctrl** o **B / ○** permite agacharse. La postura reduce la
velocidad, la altura física, la cámara, el origen de disparo y las zonas de impacto;
un techo bajo impide levantarse hasta tener espacio. Los sacos de arena, gaviones,
cajas de suministros y troncos del campo bloquean balas y movimiento.
Los impactos en cabeza hacen **×1.65** de daño, también contra jugadores agachados;
Horizonte usa **×2.2** y premia el tiro preciso con una baja de cabeza.
La vida se recupera a **15 puntos por segundo tras 5 segundos sin daño**. Un impacto
al escudo también reinicia la espera; el escudo se obtiene en las recogidas del mapa.
En online, el anfitrión resuelve daño y recuperación; cada persona conserva su vista.
Las manos, mangas y detalles del vestuario mantienen el diseño único de Esmash.

El campo contiene **8 cajas de munición, 4 escudos, 7 armas de los cinco tipos y
6 recogidas de granadas**. La munición, el escudo y las granadas se recogen al pasar;
con el inventario lleno se conservan para otro jugador. La munición añade dos
cargadores por arma, sin exceder su reserva máxima. **F / R3** recoge y equipa el
arma cercana, carga su depósito y repone reserva. Las recogidas reaparecen entre
15 y 20 segundos después y requieren estar en el mismo piso, con paso libre.
**G / LB (L1)** lanza una granada; **X / RB sigue recargando**. Se empieza con una
granada y se pueden llevar dos. La granada rebota y explota tras 2,6 segundos, con
daño por distancia hasta 8 metros: una pared bloquea el daño y un parapeto puede
reducirlo. La explosión no mata de un solo impacto a un jugador con 100 de vida y
50 de escudo; una granada propia puede hacer daño al lanzador.

Referencia de balance con impactos seguidos a 20 m, vida y escudo completos
(escopeta a 6 m). Incluye viaje del proyectil; no incluye fallos de puntería.

| Arma | Impactos al cuerpo | Tiempo orientativo |
| --- | --- | --- |
| Cobalto 9 | 7 | 1,50 s |
| Avispa | 13 | 1,07 s |
| Sierra M4 | 8 | 0,86 s |
| Trueno 12 | 2 disparos | 0,92 s |
| Horizonte | 2 | 1,22 s |

`node src/test/tfps-supplies.cjs` comprueba ubicaciones, recogidas, reservas,
controles, granadas con colisión y caída, daño protegido por cobertura, temporizador,
vida/escudo, balance con balística real, validación de paquetes y modelos/efectos.
Las pruebas online incluyen recoger un arma, reponer munición, recoger/lanzar una
granada y recibir su explosión y daño resueltos por el anfitrión.

`node src/test/tfps-cover.cjs` comprueba cobertura real, postura bajo techos, cámaras
y cabezas alineadas, tiros de cabeza de pie/agachado, recuperación interrumpida,
pausa, reaparición, teclado/mando inalámbrico, recargas animadas y validación online.
`node src/test/tfps-polish.cjs` comprueba las cinco miras sin oclusión, caída y viaje
de las balas, impactos, límites gráficos y liberación de recursos al salir del FPS.
`node src/test/tfps-feel.cjs` comprueba que la CPU sale de un edificio por la puerta, reacciona
antes de disparar con un error de puntería acotado, que los tres niveles de dificultad forman una
escalera real contra un blanco que se mueve de lado, que la búsqueda de cobertura devuelve un punto
oculto del tirador, que el arco de la granada cae a la distancia pedida y que las cuatro CPU entran
al combate; la barrida, que el posproceso solo corre con una vista a calidad completa, el arco de
daño hacia quien disparó y el aviso de eliminación.
`node src/test/tfps-architecture.cjs` recorre las entradas y escaleras de los cuatro
edificios, comprueba el acceso a azoteas y la cobertura de sus ventanas empotradas,
verifica que el terreno queda bajo los pisos y compara píxeles para detectar
transparencia incorrecta en la lente de Horizonte sin apuntar. Al apuntar, el arma
se oculta y la cámara del mundo conserva su zoom sin tapar la mira. Los agarres de
pistola y de guardamanos usan poses diferentes, conservando piel, guantes y mangas
del personaje de Esmash. La arquitectura comparte un solo diseño entre colisiones
y renderizado; las ventanas son vidrio opaco como cobertura, sin destrucción.
`node src/test/tstage-music.cjs` renderiza audio real, mide nivel/saturación, distingue
las doce composiciones, comprueba la identidad del lobby y sus transiciones/ajustes.

`node src/test/tshell-ui.cjs` recorre la portada, los tres pasos de cada juego, selección
de moto con mando real simulado, dos pilotos locales independientes y ajustes/remapeo
desde pausa. `node src/test/tshell-online.cjs` conecta cuatro navegadores y comprueba
invitaciones, presencia sin cámara y el cambio Kart → FPS → Esmash sin recrear la sala
ni cortar las conexiones WebRTC existentes. Solo se simula el directorio de salas.
