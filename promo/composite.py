"""Stylemax promo compositor: 3D renders + real app screens + kinetic type -> 1920x1080 frames.

Global timeline is 672 frames @ 24 fps (28 s, 120 BPM => 12 frames per beat, 48 per bar).
Usage: python3 composite.py [start end] [--only 10,120,300]
"""
import os, sys, json, math, functools
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, 'renders')
SC = os.path.join(HERE, 'screens')
OUT = os.path.join(HERE, 'out', 'frames')
FONTS = os.path.join(HERE, 'fonts')
W, H = 1920, 1080
FPS = 24
TOTAL = 672

CREAM = (244, 245, 240)
OLIVE900 = (26, 36, 25)
OLIVE800 = (45, 58, 45)
OLIVE700 = (63, 79, 55)
OLIVE500 = (107, 127, 94)
OLIVE300 = (168, 184, 154)
OLIVE200 = (209, 216, 201)
MUTED = (232, 235, 228)
WHITE = (255, 255, 255)


# ------------------------------------------------------------------ utils
@functools.lru_cache(None)
def font(weight=600, size=40, italic=False):
    f = f'poppins-latin-{weight}-{"italic" if italic else "normal"}.woff'
    return ImageFont.truetype(os.path.join(FONTS, f), size)


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def prog(g, a, b):
    return clamp((g - a) / max(1e-6, (b - a)))


def ease_out(t):
    return 1 - (1 - t) ** 3


def ease_in_out(t):
    return 3 * t * t - 2 * t * t * t


def back_out(t, s=1.7):
    t -= 1
    return t * t * ((s + 1) * t + s) + 1


@functools.lru_cache(None)
def load(path, mode='RGBA'):
    return Image.open(path).convert(mode)


# ------------------------------------------------------------------ device screens (1170 x 2532 @3x)
DW, DH = 1170, 2532
PT = 3
STATUS = 54 * PT
NAV = 73 * PT


def _status_bar(img, bg, dark_text=True):
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, DW, STATUS], fill=bg)
    col = (20, 20, 20) if dark_text else (250, 250, 250)
    d.text((58 * PT - 8, 18 * PT), '8:42', font=font(600, 17 * PT), fill=col)
    # signal bars
    x0 = DW - 110 * PT
    for i in range(4):
        h = (4 + i * 2.6) * PT
        d.rounded_rectangle([x0 + i * 5.2 * PT, 33 * PT - h, x0 + i * 5.2 * PT + 3.4 * PT, 33 * PT], radius=PT, fill=col)
    # wifi (three arcs)
    cx, cy = DW - 72 * PT, 34 * PT
    for r in (12, 8, 4):
        d.arc([cx - r * PT, cy - r * PT, cx + r * PT, cy + r * PT], 225, 315, fill=col, width=int(2.4 * PT))
    d.ellipse([cx - 1.6 * PT, cy - 3 * PT, cx + 1.6 * PT, cy + 0.2 * PT], fill=col)
    # battery
    bx, by = DW - 48 * PT, 22 * PT
    d.rounded_rectangle([bx, by, bx + 26 * PT, by + 12.5 * PT], radius=3.5 * PT, outline=col, width=int(1.1 * PT))
    d.rounded_rectangle([bx + 2 * PT, by + 2 * PT, bx + 19 * PT, by + 10.5 * PT], radius=2 * PT, fill=col)
    d.rounded_rectangle([bx + 27.2 * PT, by + 4 * PT, bx + 28.8 * PT, by + 8.5 * PT], radius=PT, fill=col)
    # dynamic island
    iw, ih = 124 * PT, 36 * PT
    d.rounded_rectangle([(DW - iw) / 2, 11 * PT, (DW + iw) / 2, 11 * PT + ih], radius=ih / 2, fill=(0, 0, 0))


@functools.lru_cache(None)
def shot(name):
    return load(os.path.join(SC, name + '.png'))


def has_nav(name):
    return not name.startswith(('03', '04', '05_'))


def content(name, offset=0, tall=None):
    """App content region for a screen (without nav), optionally scrolled on the _tall capture."""
    src = shot(tall) if tall else shot(name)
    ch = DH - STATUS - (NAV if has_nav(name) else 0)
    return src.crop((0, offset, DW, offset + ch))


def nav(name):
    return shot(name).crop((0, DH - NAV, DW, DH))


def device(name, content_img=None, nav_img=None):
    """Assemble a full device screen: status bar + content + (nav)."""
    src = shot(name)
    bg = src.getpixel((6, 6))[:3]
    lum = 0.3 * bg[0] + 0.59 * bg[1] + 0.11 * bg[2]
    img = Image.new('RGBA', (DW, DH), bg + (255,))
    img.paste(content_img if content_img is not None else content(name), (0, STATUS))
    if has_nav(name):
        img.paste(nav_img if nav_img is not None else nav(name), (0, DH - NAV))
    _status_bar(img, bg, lum > 128)
    return img


@functools.lru_cache(maxsize=64)
def device_c(name):
    return device(name)


def slide(a_name, b_name, t, direction=-1):
    """Horizontal slide of content region from a to b (nav of b stays put)."""
    ca, cb = content(a_name), content(b_name)
    w = DW
    off = int(ease_in_out(t) * w)
    c = Image.new('RGBA', ca.size, (244, 245, 240, 255))
    c.paste(ca, (direction * off, 0))
    c.paste(cb, (direction * off - direction * w, 0))
    return device(b_name, c)


def crossfade(a, b, t):
    return Image.blend(a, b, clamp(t))


def ripple(img, x_pt, y_pt, t, col=(45, 58, 45)):
    """Tap ripple at screen point coordinates (in pt)."""
    if t <= 0 or t >= 1:
        return img
    img = img.copy()
    ov = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    r = (12 + 40 * ease_out(t)) * PT
    a = int(150 * (1 - t))
    cx, cy = x_pt * PT, y_pt * PT + STATUS
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col + (int(a * 0.5),), outline=col + (a,), width=3 * PT)
    rr = 14 * PT * (1 - 0.3 * t)
    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(255, 255, 255, int(170 * (1 - t))))
    return Image.alpha_composite(img, ov)


def flash(img, t):
    if t <= 0:
        return img
    return Image.blend(img, Image.new('RGBA', img.size, (255, 255, 255, 255)), clamp(t))


@functools.lru_cache(None)
def round_mask(w, h, r):
    m = Image.new('L', (w * 2, h * 2), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w * 2 - 1, h * 2 - 1], radius=r * 2, fill=255)
    return m.resize((w, h), Image.LANCZOS)


def masked(img):
    w, h = img.size
    img = img.copy()
    img.putalpha(round_mask(w, h, int(w * 0.1087)))
    return img


# ------------------------------------------------------------------ perspective paste
def _coeffs(dst, src):
    A, B = [], []
    for (x, y), (u, v) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y])
        B += [u, v]
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()


def warp_paste(frame, scr, corners):
    """corners: dict tl,tr,br,bl -> (x,y) in frame px."""
    pts = [corners[k] for k in ('tl', 'tr', 'br', 'bl')]
    # skip if back-facing (clockwise check in image coords)
    area = sum(pts[i][0] * pts[(i + 1) % 4][1] - pts[(i + 1) % 4][0] * pts[i][1] for i in range(4))
    if area <= 0:
        return frame
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    x0, y0 = int(math.floor(min(xs))) - 2, int(math.floor(min(ys))) - 2
    x1, y1 = int(math.ceil(max(xs))) + 2, int(math.ceil(max(ys))) + 2
    th = max(ys) - min(ys)
    # prefilter to ~1.25x target size to avoid aliasing
    sh = int(clamp(th * 1.25, 200, DH))
    sw = int(sh * DW / DH)
    s = masked(scr.resize((sw, sh), Image.LANCZOS))
    src = [(0, 0), (sw, 0), (sw, sh), (0, sh)]
    dst = [(p[0] - x0, p[1] - y0) for p in pts]
    c = _coeffs(dst, src)
    patch = s.transform((x1 - x0, y1 - y0), Image.PERSPECTIVE, c, Image.BICUBIC)
    frame.alpha_composite(patch, (x0, y0)) if x0 >= 0 and y0 >= 0 else _paste_any(frame, patch, x0, y0)
    return frame


def _paste_any(frame, patch, x, y):
    tmp = Image.new('RGBA', frame.size, (0, 0, 0, 0))
    tmp.paste(patch, (x, y))
    frame.alpha_composite(tmp)


# ------------------------------------------------------------------ typography
def draw_words(frame, lines, x, y, size, weight, color, starts, dur=8, rise=34, align='left', italic_words=(),
               accent=None, line_gap=1.12, out=None):
    """Kinetic text. lines: list of strings; starts: per-word start frames (flattened)."""
    g = frame._g
    f = font(weight, size)
    wi = 0
    ov = Image.new('RGBA', frame.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    out_t = 0.0
    if out:
        out_t = ease_in_out(prog(g, out[0], out[1]))
    for li, line in enumerate(lines):
        words = line.split(' ')
        widths = []
        for w_ in words:
            ff = font(weight, size, italic=w_ in italic_words) if w_ in italic_words else f
            widths.append(ff.getlength(w_))
        space = f.getlength(' ')
        total = sum(widths) + space * (len(words) - 1)
        cx = x - (total / 2 if align == 'center' else total if align == 'right' else 0)
        cy = y + li * size * line_gap
        for w_, ww in zip(words, widths):
            st = starts[wi] if wi < len(starts) else starts[-1]
            t = prog(g, st, st + dur)
            if t > 0:
                a = ease_out(t) * (1 - out_t)
                dy = rise * (1 - ease_out(t)) - out_t * rise * 0.6
                col = accent if (accent and w_ in accent[1]) else color
                col = accent[0] if (accent and w_ in accent[1]) else color
                ff = font(weight, size, italic=w_ in italic_words) if w_ in italic_words else f
                d.text((cx, cy + dy), w_, font=ff, fill=col + (int(255 * a),))
            cx += ww + space
            wi += 1
    frame.alpha_composite(ov)


def eyebrow(frame, text, x, y, color, t_in, size=24, t_out=None, align='left'):
    g = frame._g
    t = ease_out(prog(g, t_in, t_in + 10))
    if t_out:
        t *= 1 - ease_in_out(prog(g, t_out[0], t_out[1]))
    if t <= 0:
        return
    f = font(600, size)
    spaced = '  '.join(text) if False else text
    ov = Image.new('RGBA', frame.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    # letter-spaced caps
    cx = x
    widths = [f.getlength(ch) + size * 0.16 for ch in spaced]
    total = sum(widths)
    if align == 'center':
        cx = x - total / 2
    # accent bar
    bar_w = 34 * t
    if align == 'left':
        d.rounded_rectangle([cx, y + size * 0.55, cx + bar_w, y + size * 0.55 + 4], radius=2, fill=color + (int(255 * t),))
        cx += 46
    for ch, w_ in zip(spaced, widths):
        d.text((cx, y), ch, font=f, fill=color + (int(255 * t),))
        cx += w_
    frame.alpha_composite(ov)


def pill(frame, text, cx, cy, t, bg=(255, 255, 255), fg=OLIVE800, dot=None, size=30, weight=500, border=MUTED, alpha=245):
    """Pop-in chip centred at (cx, cy); t in [0,1] is the animation progress."""
    if t <= 0:
        return
    s = back_out(clamp(t), 2.2) if t < 1 else 1.0
    f = font(weight, size)
    tw = f.getlength(text)
    pad_x, h = size * 0.75, size * 1.9
    dot_w = size * 0.95 if dot else 0
    w = tw + pad_x * 2 + dot_w
    scale = 2
    im = Image.new('RGBA', (int(w * scale) + 8, int(h * scale) + 8 + 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # soft shadow
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([4, 14, w * scale + 4, h * scale + 14], radius=h * scale / 2, fill=(20, 30, 20, 60))
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    im.alpha_composite(sh)
    d.rounded_rectangle([4, 4, w * scale + 4, h * scale + 4], radius=h * scale / 2, fill=bg + (alpha,), outline=border + (255,), width=3)
    x = 4 + pad_x * scale
    if dot:
        r = size * 0.28 * scale
        d.ellipse([x, 4 + h * scale / 2 - r, x + 2 * r, 4 + h * scale / 2 + r], fill=dot + (255,),
                  outline=(200, 200, 200, 255) if sum(dot) > 700 else None, width=2)
        x += dot_w * scale
    d.text((x, 4 + (h * scale - size * scale * 1.2) / 2 - size * scale * 0.05), text, font=font(weight, size * scale), fill=fg + (255,))
    im = im.resize((max(1, int(im.width / scale * s)), max(1, int(im.height / scale * s))), Image.LANCZOS)
    a = clamp(t * 3)
    if a < 1:
        im.putalpha(im.getchannel('A').point(lambda v: int(v * a)))
    frame.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2 + 5)))


# ------------------------------------------------------------------ backgrounds / base frames
def render_frame(shot_dir, n):
    p = os.path.join(R, shot_dir, f'{n:04d}.png')
    if os.path.exists(p):
        return load(p, 'RGB').convert('RGBA')
    # dev fallback: nearest still
    cands = sorted([f for f in os.listdir(os.path.join(R, shot_dir)) if f.startswith('still_')]) if os.path.isdir(os.path.join(R, shot_dir)) else []
    if cands:
        best = min(cands, key=lambda f: abs(int(f[6:10]) - n))
        return load(os.path.join(R, shot_dir, best), 'RGB').resize((W, H)).convert('RGBA')
    return Image.new('RGBA', (W, H), CREAM + (255,))


@functools.lru_cache(None)
def track(shot_dir):
    p = os.path.join(R, shot_dir, 'track.json')
    return json.load(open(p)) if os.path.exists(p) else {}


def tpos(shot_dir, n, key):
    tr = track(shot_dir)
    fr = tr.get(str(n))
    if not fr:
        return None
    x, y, _ = fr[key]
    return (x, y)


def corners(shot_dir, n):
    tr = track(shot_dir).get(str(n))
    if not tr:
        return None
    return {k: (tr[k][0], tr[k][1]) for k in ('tl', 'tr', 'br', 'bl')}


def radial_bg(c_in, c_out, cx=0.5, cy=0.45):
    y, x = np.mgrid[0:H, 0:W]
    d = np.sqrt(((x - W * cx) / W) ** 2 + ((y - H * cy) / H) ** 2) / 0.75
    d = np.clip(d, 0, 1)[..., None]
    a = np.array(c_in)[None, None]
    b = np.array(c_out)[None, None]
    img = (a * (1 - d) + b * d).astype(np.uint8)
    return Image.fromarray(img).convert('RGBA')


@functools.lru_cache(None)
def bg_cached(c_in, c_out):
    return radial_bg(c_in, c_out)


@functools.lru_cache(None)
def phone_front():
    return load(os.path.join(R, 'phone_front.png'))


def phone_flat(frame, scr, cx, cy, height, angle=0.0, shadow=True):
    """Front-facing phone mockup (Blender render) with screen composited, centred at (cx, cy)."""
    pf = phone_front()
    k = height / 1560.0  # phone body is 1560 px tall in the render
    pw, ph = int(pf.width * k), int(pf.height * k)
    body = pf.resize((pw, ph), Image.LANCZOS)
    sw, sh = int(690 * k), int(1500 * k)
    s = masked(scr.resize((sw, sh), Image.LANCZOS))
    layer = Image.new('RGBA', (pw, ph), (0, 0, 0, 0))
    layer.alpha_composite(body)
    layer.alpha_composite(s, (int(55 * k), int(60 * k)))
    if angle:
        layer = layer.rotate(angle, resample=Image.BICUBIC, expand=True)
    if shadow:
        a = layer.getchannel('A').filter(ImageFilter.GaussianBlur(28))
        sh_ = Image.new('RGBA', layer.size, (10, 20, 10, 0))
        sh_.putalpha(a.point(lambda v: int(v * 0.35)))
        frame.alpha_composite(sh_, (int(cx - layer.width / 2 + 18), int(cy - layer.height / 2 + 30)))
    frame.alpha_composite(layer, (int(cx - layer.width / 2), int(cy - layer.height / 2)))


class Frame:
    pass


def new_frame(base, g):
    f = base.copy()
    f._g = g
    return f


def vignette(frame, strength=0.18):
    return frame


# ------------------------------------------------------------------ SHOTS
def shot1(g):
    fr = new_frame(render_frame('shot1', g + 1), g)
    # "80% of your closet / is asleep."
    draw_words(fr, ['80% of your closet'], 150, 780, 92, 700, CREAM, [8, 13, 18, 23], dur=10, out=(86, 94))
    draw_words(fr, ['is asleep.'], 150, 890, 92, 300, OLIVE300, [40, 47], dur=12, out=(86, 94), italic_words=('asleep.',))
    # after the drop: "Let's wake it up."
    draw_words(fr, ["Let's wake it up."], W / 2, 870, 104, 700, OLIVE800, [102, 108, 114, 120], dur=8, align='center', out=(158, 167))
    return fr


SCAN_TAGS = [('tagA', 'Outerwear', None, 222), ('tagB', 'Black', (18, 18, 18), 227),
             ('tagC', 'Spring · Fall', OLIVE500, 232), ('tagD', 'Casual · Creative', OLIVE300, 237)]


def scan_screen(g):
    if g < 199:
        s = device_c('03_scan_camera')
        # small countdown pulse on the capture button before the snap
        s = ripple(s, 195, 747 - 54, prog(g, 190, 202), col=(255, 255, 255))
        return s
    if g < 218:
        s = device_c('04_scan_analyzing')
        return flash(s, 1 - prog(g, 199, 206))
    a, b = device_c('04_scan_analyzing'), device_c('05_scan_result')
    return crossfade(a, b, ease_out(prog(g, 218, 224)))


def shot2(g):
    fr = new_frame(render_frame('shot2', g), g)
    c = corners('shot2', g)
    if c:
        warp_paste(fr, scan_screen(g), c)
    # item name + AI tags around the jacket
    top = tpos('shot2', g, 'jk_top')
    if top:
        pill(fr, 'Black Leather Biker Jacket', top[0], top[1] - 46, prog(g, 216, 226), bg=OLIVE800, fg=CREAM, border=OLIVE800, size=30, weight=600)
    for key_, label, dot, st in SCAN_TAGS:
        p = tpos('shot2', g, key_)
        if p:
            pill(fr, label, p[0], p[1], prog(g, st, st + 9), dot=dot, size=28)
    eyebrow(fr, 'STEP 1 · SCAN', 150, 752, OLIVE500, 176, t_out=(252, 262))
    draw_words(fr, ['Snap it.', 'AI tags it.'], 150, 800, 84, 700, OLIVE800, [178, 184, 204, 210], dur=9, out=(252, 262))
    return fr


def suggest_screen(g):
    if g < 284:
        s = device_c('06_suggest_moods')
        return ripple(s, 372, 91, prog(g, 276, 290))
    if g < 306:
        a, b = device_c('06_suggest_moods'), device_c('07_suggest_loading')
        return crossfade(a, b, ease_out(prog(g, 284, 288)))
    if g < 346:
        a, b = device_c('07_suggest_loading'), device_c('08_suggest_results')
        return crossfade(a, b, ease_out(prog(g, 304, 310)))
    if g < 356:
        return slide('08_suggest_results', '08_suggest_results_outfit2', prog(g, 346, 356))
    return device_c('08_suggest_results_outfit2')


def shot3(g):
    fr = new_frame(render_frame('shot3', g), g)
    c = corners('shot3', g)
    if c:
        warp_paste(fr, suggest_screen(g), c)
    x = 130
    eyebrow(fr, 'STEP 2 · STYLE', x, 300, OLIVE500, 268, t_out=(374, 383))
    draw_words(fr, ['Pick a mood.'], x, 348, 76, 700, OLIVE800, [270, 275, 280], dur=9, out=(374, 383))
    draw_words(fr, ['Get 3 outfits', 'from your own', 'closet.'], x, 450, 58, 500, OLIVE700,
               [308, 312, 316, 320, 324, 328, 332], dur=9, out=(374, 383))
    # live scores next to the 3D outfit
    p = tpos('shot3', g, 'outfit_mid')
    if p:
        if g < 346:
            pill(fr, 'Weather 88%', p[0] - 250, p[1] - 60, prog(g, 330, 338) * (1 - prog(g, 344, 348)), size=26, dot=OLIVE500)
            pill(fr, 'Rotation 75%', p[0] - 250, p[1] + 10, prog(g, 334, 342) * (1 - prog(g, 344, 348)), size=26, dot=(214, 164, 65))
        else:
            pill(fr, 'Weather 100%', p[0] - 250, p[1] - 60, prog(g, 368, 376), size=26, dot=OLIVE500)
            pill(fr, 'Rotation 76%', p[0] - 250, p[1] + 10, prog(g, 372, 380), size=26, dot=(214, 164, 65))
    return fr


def insights_screen(g):
    # gentle scroll from the week strip to the nudge + try-it list
    t = ease_in_out(prog(g, 390, 430))
    off = int(t * 190 * PT)
    c = content('09_insights', offset=off, tall='09_insights_tall')
    s = device('09_insights', c, nav('09_insights'))
    # highlight ring around the nudge card once it is in view
    ht = prog(g, 432, 444)
    if ht > 0:
        s = s.copy()
        d = ImageDraw.Draw(s)
        y_card = (1176 - 844 * 1 - 0) if False else 0
        # nudge card sits at y~ (1178..1284) pt in the page (contact-sheet coords) => page y 334..440 pt
        top = STATUS + (334 - 0) * PT - off
        a = int(255 * ease_out(ht))
        d.rounded_rectangle([12 * PT, top - 6 * PT, DW - 12 * PT, top + 116 * PT], radius=18 * PT,
                            outline=(214, 164, 65, a), width=int(3 * PT))
    return s


def shot4(g):
    fr = new_frame(bg_cached(OLIVE700, OLIVE900), g)
    # floating dust motes (continuity with the asleep closet)
    rng = np.random.default_rng(3)
    d = ImageDraw.Draw(fr)
    for i in range(40):
        x = (rng.uniform(0, W) + g * rng.uniform(-0.4, 0.4)) % W
        y = (rng.uniform(0, H) - g * rng.uniform(0.2, 0.8)) % H
        r = rng.uniform(1, 2.6)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(244, 245, 240, int(rng.uniform(40, 110))))
    ph_in = ease_out(prog(g, 384, 398))
    phone_flat(fr, insights_screen(g), 1420, 548 + 60 * (1 - ph_in), 920, angle=-4 * (1 - ph_in) + 2)
    eyebrow(fr, 'STEP 3 · NOTICE', 150, 300, OLIVE300, 388, t_out=(470, 479))
    words = ['“Your blue denim jacket', "hasn’t seen sunlight", 'in 3 weeks.”']
    starts = [396 + i * 4 for i in range(11)]
    draw_words(fr, words, 150, 350, 70, 600, CREAM, starts, dur=8, out=(470, 479),
               accent=((214, 190, 120), ['sunlight']))
    draw_words(fr, ['Stylemax notices what you forget —', 'and puts it back in rotation.'], 150, 620, 36, 400, OLIVE300,
               [440, 442, 444, 446, 448, 450, 452, 454, 456, 458, 460, 462], dur=8, out=(470, 479))
    return fr


MONTAGE = [
    (480, 'Scan.', '05_scan_result', OLIVE300, OLIVE900),
    (492, 'Style.', '08_suggest_results_outfit3', CREAM, OLIVE800),
    (504, 'Wear.', '08c_suggest_outfit_logged', OLIVE800, CREAM),
    (516, 'Repeat.', '01_home', OLIVE500, CREAM),
]


def shot5(g):
    if g < 528:
        i = min(3, (g - 480) // 12)
        st, word, scr, bg, fg = MONTAGE[i]
        fr = new_frame(Image.new('RGBA', (W, H), bg + (255,)), g)
        t = prog(g, st, st + 12)
        # punchy zoom-in on each cut
        z = 1.0 + 0.05 * ease_out(t)
        phone_flat(fr, device_c(scr), 1330, 548, int(920 * z), angle=(-3 if i % 2 else 3) * (1 - ease_out(t)))
        f = font(800, 190)
        d = ImageDraw.Draw(fr)
        a = ease_out(prog(g, st, st + 4))
        d.text((150 - 30 * (1 - a), 390), word, font=f, fill=fg + (int(255 * a),))
        # beat counter dots
        for k in range(4):
            cx = 160 + k * 34
            col = fg if k <= i else tuple(int(0.5 * fg[j] + 0.5 * bg[j]) for j in range(3))
            d.ellipse([cx - 7, 680 - 7, cx + 7, 680 + 7], fill=col + (255,))
        return fr
    # payoff: closet rotation back
    fr = new_frame(bg_cached(CREAM, (226, 231, 219)), g)
    t_in = ease_out(prog(g, 528, 540))
    s = device_c('01_home')
    phone_flat(fr, s, 1360, 548 + 40 * (1 - t_in), 940, angle=0)
    eyebrow(fr, 'THIS MONTH', 150, 330, OLIVE500, 530)
    n = int(round(4 + 14 * ease_out(prog(g, 532, 556))))
    f = font(800, 210)
    d = ImageDraw.Draw(fr)
    a = ease_out(prog(g, 530, 538))
    d.text((140, 360), f'{n}', font=f, fill=OLIVE800 + (int(255 * a),))
    nx = 140 + f.getlength(f'{n}') + 14
    d.text((nx, 440), '/22', font=font(500, 110), fill=OLIVE500 + (int(255 * a),))
    draw_words(fr, ['pieces back in rotation.'], 150, 610, 54, 600, OLIVE800, [540, 543, 546, 549], dur=8)
    # progress bar
    pb = ease_out(prog(g, 532, 556))
    d.rounded_rectangle([150, 720, 150 + 640, 734], radius=7, fill=MUTED + (255,))
    d.rounded_rectangle([150, 720, 150 + int(640 * (n / 22)), 734], radius=7, fill=OLIVE500 + (255,))
    pill(fr, '12 day streak', 330, 810, prog(g, 552, 560), dot=(245, 158, 11), size=28)
    fade = prog(g, 570, 576)
    if fade > 0:
        fr.alpha_composite(Image.new('RGBA', (W, H), OLIVE800 + (int(255 * fade),)))
    return fr


@functools.lru_cache(None)
def app_icon(size):
    ic = load(os.path.join(HERE, '..', 'public', 'icons', 'apple-touch-icon.png'))
    ic = ic.resize((size, size), Image.LANCZOS)
    m = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=int(size * 4 * 0.225), fill=255)
    ic.putalpha(m.resize((size, size), Image.LANCZOS))
    return ic


def shot6(g):
    fr = new_frame(render_frame('shot6', g), g)
    # logo lockup
    t = prog(g, 580, 592)
    if t > 0:
        sc = back_out(t, 1.4)
        ic = app_icon(130)
        f = font(700, 128)
        word = 'Stylemax'
        tw = int(f.getlength(word))
        lw, lh = 130 + 36 + tw, 170
        lock = Image.new('RGBA', (lw, lh), (0, 0, 0, 0))
        lock.alpha_composite(ic, (0, 20))
        ImageDraw.Draw(lock).text((166, 8), word, font=f, fill=CREAM + (255,))
        lock = lock.resize((max(1, int(lw * sc)), max(1, int(lh * sc))), Image.LANCZOS)
        a = clamp(t * 2.5)
        lock.putalpha(lock.getchannel('A').point(lambda v: int(v * a)))
        fr.alpha_composite(lock, (int(W / 2 - lock.width / 2), int(265 - lock.height / 2)))
    draw_words(fr, ['Your closet, finally awake.'], W / 2, 360, 54, 500, OLIVE200, [596, 599, 602, 605], dur=10, align='center')
    pill(fr, 'Scan  ·  Style  ·  Wear', W / 2, 482, prog(g, 612, 622), bg=OLIVE700, fg=CREAM, border=OLIVE500, size=24, weight=500, alpha=235)
    fo = prog(g, 660, 672)
    if fo > 0:
        fr.alpha_composite(Image.new('RGBA', (W, H), OLIVE900 + (int(255 * ease_in_out(fo)),)))
    return fr


def frame_at(g):
    if g < 168:
        return shot1(g)
    if g < 264:
        return shot2(g)
    if g < 384:
        return shot3(g)
    if g < 480:
        return shot4(g)
    if g < 576:
        return shot5(g)
    return shot6(g)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    args = sys.argv[1:]
    if '--only' in args:
        frames = [int(x) for x in args[args.index('--only') + 1].split(',')]
    else:
        a, b = (int(args[0]), int(args[1])) if len(args) >= 2 else (0, TOTAL - 1)
        frames = range(a, b + 1)
    for g in frames:
        im = frame_at(g).convert('RGB')
        im.save(os.path.join(OUT, f'{g:04d}.png'), compress_level=1)
    print('done', len(list(frames)))
