# Versión web (GitHub Pages): el mismo juego + Supabase (salas, salón de la fama) + adaptador js/webshim.js
# Salida: web/index.html y web/config.js (este último solo se crea si no existe: ahí va la anon key)
# Lleva las fotos de las caras (Daniel autorizó que sean públicas). WEB_FACES=0 las quita y quedan caras dibujadas.
import re, pathlib, os
root = pathlib.Path(__file__).parent
out = pathlib.Path(os.environ.get('OUT') or (root / 'web')); out.mkdir(parents=True, exist_ok=True)
html = (root / 'index.html').read_text()
block = re.search(r'<!--SCRIPTS-->(.*?)<!--/SCRIPTS-->', html, re.S).group(1)
srcs = re.findall(r'src="([^"]+)"', block)
faces = os.environ.get('WEB_FACES') != '0'
if not faces: srcs = [s for s in srcs if s != 'js/faces.js']
js = []
for s in ['js/webshim.js'] + srcs:
    code = (root / s).read_text()
    assert '</script' not in code.lower(), s
    js.append(f'// ---- {s} ----\n' + code.replace("'use strict';\n", '', 1))
vendor = (root / 'vendor/package/dist/umd/supabase.js').read_text()
assert '</script' not in vendor.lower()
fonts = (root / 'fonts/inline.css').read_text()
html = html.replace('<link rel="stylesheet" href="fonts/inline.css">', '<style>\n' + fonts + '\n</style>')
icon = "data:image/svg+xml," + "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23e63946'/%3E%3Ctext x='32' y='47' font-size='40' text-anchor='middle' font-family='Impact,Arial Black,sans-serif' fill='%23ffc53d'%3EV%3C/text%3E%3C/svg%3E"
head = ('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="theme-color" content="#060d18">\n'
        '<meta name="description" content="A pan y verga… y se nos acabó el pan. Juego de peleas para hasta 4 jugadores, en la misma pantalla o en línea con voz y cámara.">\n'
        f'<link rel="icon" href="{icon}">\n'
        # "Agregar a inicio": desde el ícono abre a pantalla completa y de lado (en iPhone es la única forma)
        '<link rel="manifest" href="manifest.webmanifest">\n'
        '<link rel="apple-touch-icon" href="icons/icon-180.png">\n'
        '<meta name="mobile-web-app-capable" content="yes">\n'
        '<meta name="apple-mobile-web-app-capable" content="yes">\n'
        '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
        '<meta name="apple-mobile-web-app-title" content="A pan y verga">\n')
html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + head, 1)
block = re.search(r'<!--SCRIPTS-->(.*?)<!--/SCRIPTS-->', html, re.S).group(1)
page = html.replace(block, "\n<script>\n" + vendor + "\n</script>\n<script src=\"config.js\"></script>\n<script>\n'use strict';\n" + '\n'.join(js) + "\n</script>\n")
(out / 'index.html').write_text(page)
(out / 'icons').mkdir(exist_ok=True)
for n in (180, 192, 512): (out / 'icons' / f'icon-{n}.png').write_bytes((root / 'icons' / f'icon-{n}.png').read_bytes())
(out / 'manifest.webmanifest').write_text('''{
  "name": "A pan y verga",
  "short_name": "A pan y verga",
  "description": "…y se nos acabó el pan. Peleas para hasta 4, en la misma pantalla o en línea.",
  "start_url": "./",
  "scope": "./",
  "display": "fullscreen",
  "orientation": "landscape",
  "background_color": "#060d18",
  "theme_color": "#060d18",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
''')
cfg = out / 'config.js'
if not cfg.exists():
    cfg.write_text("""// Configuración de la versión web de "A pan y verga".
// url y key: Supabase → Project Settings → API. La "anon" / "publishable" key es pública por diseño
// (viaja en el navegador de todos). NUNCA pongas aquí la service_role / secret key.
// ice: servidores para conectar voz, cámara y la pelea directo entre navegadores. Con los STUN de
// Google conecta en la mayoría de las casas; para redes difíciles agrega un TURN, por ejemplo:
//   ice: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'turn:TU-SERVIDOR:3478', username: '...', credential: '...' }]
window.APYV_CONFIG = {
  url: 'https://bwgdnhdilaspyfwbmuhz.supabase.co',
  key: '',
  ice: null,
};
""")
print('web built', len(page), 'bytes ·', 'con fotos' if faces else 'sin fotos (caras dibujadas)')
