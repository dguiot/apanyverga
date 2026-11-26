# Convierte las fotos de las caras (src/assets/faces/<id>-head.webp, recorte ovalado con transparencia) en
# ilustraciones del estilo de Esmash: colores planos, sombra de un corte, líneas de tinta y contorno grueso.
# Conserva los rasgos de cada persona (forma de la cara, barba, sonrisa, lentes, color de ojos y piel).
# Salida: src/js/faces.js (FACE_TOON). El juego nunca carga las fotos; solo estas ilustraciones.
#   pip install opencv-python-headless numpy pillow
#   python3 src/tools/toon_faces.py            (desde la raíz del repositorio)
#   python3 src/tools/toon_faces.py --preview out.png
import base64, io, json, pathlib, sys
import cv2, numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / 'assets' / 'faces'
IDS = ['daniel', 'nacho', 'pablo', 'robes', 'nicole', 'puentin']
SCALE = {'daniel': 1.18, 'nacho': 1.04, 'pablo': 1.0, 'robes': 1.12, 'nicole': 1.1, 'puentin': 1.24}
INK = np.array([26, 19, 16], np.float32)  # BGR de #10131a (la tinta de los personajes)

def load(path):
    im = Image.open(path).convert('RGBA'); a = np.array(im)
    return cv2.cvtColor(a[:, :, :3], cv2.COLOR_RGB2BGR), a[:, :, 3]

def quantize(bgr, mask, k):
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    pts = lab[mask > 0]
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, .5)
    cv2.setRNGSeed(7)
    _, labels, centers = cv2.kmeans(pts, k, None, crit, 4, cv2.KMEANS_PP_CENTERS)
    out = lab.copy(); out[mask > 0] = centers[labels.flatten()]
    return cv2.cvtColor(out.astype(np.uint8), cv2.COLOR_LAB2BGR)

def xdog(gray, sigma=1.1, k=1.7, p=24, eps=-0.03, phi=12):
    g = gray.astype(np.float32) / 255
    a = cv2.GaussianBlur(g, (0, 0), sigma); b = cv2.GaussianBlur(g, (0, 0), sigma * k)
    d = (1 + p) * a - p * b
    return np.where(d >= eps, 1.0, 1 + np.tanh(phi * (d - eps)))  # 1 = papel, 0 = tinta

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

def cel(L, levels, soft):
    # luz en escalones (sombra de un corte), con orillas apenas suavizadas para que no se vean dientes
    out = np.full_like(L, levels[0][1])
    for edge, value in levels[1:]: out = out + (value - out) * smoothstep(edge - soft, edge + soft, L)
    return out

def clean_lines(ink, min_area):
    # quita puntos sueltos: solo quedan los trazos con cuerpo (ojos, cejas, boca, barba, lentes)
    dark = (ink < .5).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(dark, 8)
    keep = np.zeros(n, bool); keep[1:] = stats[1:, cv2.CC_STAT_AREA] >= min_area
    return np.where(keep[lab], ink, 1.0)

def toon(bgr, alpha, scale=2, line=1.0, rim_on=True):
    h, w = alpha.shape
    bgr = cv2.resize(bgr, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)
    alpha = cv2.resize(alpha, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)
    solid = (alpha > 128).astype(np.uint8)
    # el borde del recorte trae fondo de la foto: se rellena con el color de la cara antes de filtrar
    inner = cv2.erode(solid, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9 * scale, 9 * scale)))
    fill = cv2.inpaint(bgr, (1 - inner).astype(np.uint8) * 255, 6 * scale, cv2.INPAINT_TELEA)
    edge_band = (solid > 0) & (inner == 0)
    bgr = np.where(edge_band[:, :, None], (bgr.astype(np.float32) * .35 + fill.astype(np.float32) * .65).astype(np.uint8), bgr)
    # 1. zonas lisas que respetan los rasgos
    s = cv2.pyrMeanShiftFiltering(bgr, 5 * scale, 18)
    for _ in range(3): s = cv2.bilateralFilter(s, 9, 24, 6)
    lab = cv2.cvtColor(s, cv2.COLOR_BGR2LAB).astype(np.float32)
    # 2. luz por escalones; color (a, b) suave y un poco más vivo
    L = cv2.GaussianBlur(lab[:, :, 0], (0, 0), 1.1 * scale)
    lo, hi = np.percentile(L[solid > 0], [4, 97])
    Ln = np.clip((L - lo) / max(1, hi - lo), 0, 1)
    Lc = cel(Ln, [(0, .08), (.16, .24), (.32, .42), (.5, .6), (.68, .77), (.84, .92), (.94, 1.0)], .022)
    lab[:, :, 0] = lo + Lc * (hi - lo) * 1.03 + 6
    for c in (1, 2): lab[:, :, c] = 128 + (cv2.GaussianBlur(lab[:, :, c], (0, 0), 1.3 * scale) - 128) * 1.3
    col = cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)
    # 3. tinta de los rasgos (XDoG) sin puntos sueltos
    gray = cv2.cvtColor(cv2.bilateralFilter(bgr, 9, 40, 6), cv2.COLOR_BGR2GRAY)
    ink = xdog(gray, sigma=.65 * scale, k=1.7, p=26, eps=-.025, phi=12)
    ink = clean_lines(ink, 10 * scale * scale)
    ink = cv2.GaussianBlur(ink.astype(np.float32), (0, 0), .45 * scale)
    ink = np.where(inner[:, :, None] > 0, ink[:, :, None], 1.0)[:, :, 0]
    ink = np.clip(1 - (1 - ink) * line, 0, 1)
    out = col * ink[:, :, None] + INK * (1 - ink[:, :, None])
    # 4. contorno grueso de la cabeza, como el de los personajes
    if rim_on:
        rim = cv2.dilate(solid, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7 * scale, 7 * scale))) - solid
        out[rim > 0] = INK
        na = np.clip(cv2.GaussianBlur(np.maximum(solid, rim).astype(np.float32), (0, 0), .7), 0, 1)
    else:
        # para la cabeza 3D: sin contorno y con la orilla difuminada hacia la piel (sin borde de máscara)
        na = cv2.GaussianBlur(cv2.erode(solid, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5 * scale, 5 * scale))).astype(np.float32), (0, 0), 5 * scale)
    rgba = np.dstack([cv2.cvtColor(np.clip(out, 0, 255).astype(np.uint8), cv2.COLOR_BGR2RGB), (na * 255).astype(np.uint8)])
    return Image.fromarray(rgba)

def uri(im, q=88):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()

def skin_of(bgr, alpha):
    # color de piel: mediana de la zona de las mejillas (debajo de los ojos, lejos de barba y pelo)
    h, w = alpha.shape; y0, y1, x0, x1 = int(h * .42), int(h * .58), int(w * .22), int(w * .78)
    zone = bgr[y0:y1, x0:x1][alpha[y0:y1, x0:x1] > 200]
    lum = zone.astype(np.float32).mean(1); zone = zone[lum > np.percentile(lum, 45)]
    b, g, r = np.median(zone, 0).astype(int); return '#%02x%02x%02x' % (r, g, b)

def skin_toon(im):
    # piel ya ilustrada (para cuello, manos y el resto de la cabeza 3D): mejillas de la versión final
    a = np.array(im); h, w = a.shape[:2]; z = a[int(h * .45):int(h * .6), int(w * .2):int(w * .8)]
    z = z[z[:, :, 3] > 200][:, :3].astype(np.float32); lum = z.mean(1); z = z[(lum > np.percentile(lum, 40)) & (lum < np.percentile(lum, 90))]
    r, g, b = np.median(z, 0).astype(int); return '#%02x%02x%02x' % (r, g, b)

def build():
    data = {}
    for id in IDS:
        bgr, a = load(SRC / f'{id}-head.webp')
        head = toon(bgr, a); head = head.resize((head.width * 3 // 4, head.height * 3 // 4), Image.LANCZOS)
        tex = toon(bgr, a, rim_on=False)
        data[id] = {'head': uri(head, 86), 'tex': uri(tex, 84), 'w': head.width, 'h': head.height, 'skin': skin_toon(tex), 'k': SCALE[id]}
    return data

if __name__ == '__main__':
    if '--preview' in sys.argv:
        out = sys.argv[sys.argv.index('--preview') + 1]
        ims = []
        for id in IDS:
            bgr, a = load(SRC / f'{id}-head.webp'); ims.append(toon(bgr, a))
        H = max(i.height for i in ims); sheet = Image.new('RGBA', (sum(i.width for i in ims) + 20 * len(ims), H + 160), (58, 66, 80, 255)); x = 10
        for i in ims:
            sheet.alpha_composite(i, (x, 0)); small = i.resize((i.width // 8, i.height // 8), Image.LANCZOS); sheet.alpha_composite(small, (x + 20, H + 20)); x += i.width + 20
        sheet.convert('RGB').save(out, quality=90); sys.exit()
    data = build()
    js = "'use strict';\n// Caras ilustradas a partir de las fotos (src/tools/toon_faces.py): estilo Esmash, sin fotografías.\nconst FACE_TOON = " + json.dumps(data) + ";\n"
    (ROOT / 'js' / 'faces.js').write_text(js)
    print('faces.js', len(js), 'bytes')
