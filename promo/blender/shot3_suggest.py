"""Shot 3 (f264-383): mood -> outfits on screen while the same outfit assembles in 3D."""
from common import *

args, F0, F1, stills = parse(264, 383)
s = setup(F0, F1, 'preview' in args)
OUT = os.path.join(RENDERS, 'shot3')
bright_studio()

inner, scr, tex = phone('ph')
blank_screen(tex)
corners = screen_corners(scr)
ph = upright(inner)
ph.scale = (1.45,) * 3
key(ph, 264, loc=(-0.15, -0.6, 1.5), rot=(math.radians(-3), math.radians(-2), math.radians(-6)))
key(ph, 383, loc=(-0.2, -0.62, 1.54), rot=(math.radians(-2), math.radians(1), math.radians(-10)))
ease_all(ph)

X = 1.85
TOP_Z, BOT_Z, SHOE_Z = 2.8, 1.7, 0.1


def piece(ob, land_f, target, spin=1, out_f=None, from_=None, sc=0.96):
    tx, ty, tz = target
    fx, fy, fz = from_ or (tx + 0.8 * spin, ty - 0.6, tz + 3.2)
    ob.scale = (sc,) * 3
    key(ob, F0, loc=(fx, fy, fz), rot=(math.radians(30), math.radians(40 * spin), math.radians(-60 * spin)))
    key(ob, land_f - 8, loc=(fx, fy, fz), rot=(math.radians(30), math.radians(40 * spin), math.radians(-60 * spin)))
    key(ob, land_f, loc=(tx, ty, tz - 0.06), rot=(0, 0, math.radians(3 * spin)))
    key(ob, land_f + 4, loc=(tx, ty, tz + 0.02), rot=(0, 0, 0))
    key(ob, land_f + 8, loc=(tx, ty, tz))
    if out_f:
        key(ob, out_f, loc=(tx, ty, tz + 0.03), rot=(0, 0, 0))
        key(ob, out_f + 10, loc=(tx + 5.5, ty - 1.0, tz + 1.2), rot=(math.radians(-40), math.radians(-90), math.radians(80 * spin)))
    else:
        key(ob, F1, loc=(tx, ty, tz + 0.06), rot=(0, math.radians(8 * spin), math.radians(2 * spin)))
    ease_all(ob)


# Outfit 1 (Creative): beige blazer + black tee + navy pleated skirt + black ankle boots
tee = upright(tshirt('tee1', hex_rgb('#1C1C1C')))
bl = upright(blazer('blz', hex_rgb('#CDB797')))
sk = upright(skirt('sk', hex_rgb('#1F2A44')))
bt1 = upright(boot('boot1', hex_rgb('#151515')))
bt2 = upright(boot('boot2', hex_rgb('#151515')))
piece(tee, 306, (X, -0.05, TOP_Z - 0.02), spin=1, out_f=344)
piece(bl, 312, (X, -0.25, TOP_Z), spin=-1, out_f=346)
piece(sk, 318, (X, -0.1, BOT_Z), spin=1, out_f=348)
piece(bt1, 324, (X - 0.26, -0.25, SHOE_Z), spin=-1, out_f=350, sc=0.86)
piece(bt2, 326, (X + 0.28, 0.05, SHOE_Z), spin=1, out_f=350, sc=0.86)
for b in (bt1, bt2):
    for fc in fcurves(b.animation_data.action):
        pass
# Outfit 2: blue denim jacket + pink silk blouse + black jeans + brown loafers
bs = upright(tshirt('blouse', hex_rgb('#E88BB8'), mat=fabric_mat('silk', hex_rgb('#E88BB8'), rough=0.35, sheen=1.0, noise_scale=400, bump=0.03)))
dj = upright(jacket('dj', hex_rgb('#5B7C99')))
jn = upright(jeans('jn', hex_rgb('#1E1E22')))
lf1 = upright(loafer('lf1', hex_rgb('#7A4A2C')))
lf2 = upright(loafer('lf2', hex_rgb('#7A4A2C')))
piece(bs, 352, (X, -0.05, TOP_Z - 0.02), spin=-1, from_=(X - 0.6, -0.6, TOP_Z + 3.4))
piece(dj, 357, (X, -0.25, TOP_Z), spin=1, from_=(X + 0.8, -0.8, TOP_Z + 3.4))
piece(jn, 362, (X, -0.1, BOT_Z + 0.06), spin=-1, from_=(X - 0.5, -0.6, BOT_Z + 3.6))
piece(lf1, 367, (X - 0.26, -0.25, SHOE_Z), spin=1, sc=0.86)
piece(lf2, 369, (X + 0.28, 0.05, SHOE_Z), spin=-1, sc=0.86)

cam = camera((0, -7.0, 1.5), (0, 0, 1.45), lens=38)
key(cam, 264, loc=(-0.15, -7.1, 1.5))
key(cam, 383, loc=(0.15, -6.7, 1.45))
ease_all(cam)
anchors = {'outfit_top': empty('ot', (X, -0.2, TOP_Z + 0.25)), 'outfit_mid': empty('om', (X, -0.2, 1.3))}
os.makedirs(OUT, exist_ok=True)
track_points({**corners, **anchors}, os.path.join(OUT, 'track.json'), F0, F1)
run(s, OUT, args, stills)
