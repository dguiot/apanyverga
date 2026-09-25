# A pan y verga

*…y se nos acabó el pan.*

Juego de peleas estilo Smash para hasta 4 jugadores: en la misma pantalla (teclado, controles o
pantalla táctil) o en línea, cada quien desde su casa, con cámara y voz.

**Jugar:** https://dguiot.github.io/apanyverga/ (compu y celular).

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

`src/` tiene el código del juego (sin fotos de personas reales: la versión pública usa caras dibujadas).
Para regenerar el sitio desde la raíz del repositorio:

```sh
cd src && OUT=.. python3 build_web.py
```

`src/test/` tiene la prueba en línea de punta a punta con un Supabase simulado
(`cd src && python3 build_web.py && node test/tweb.js`, requiere Playwright).
