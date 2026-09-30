"""Shot 6 (f576-671): final hit - every garment bursts out and orbits the logo on dark olive."""
from common import *

args, F0, F1, stills = parse(576, 671)
s = setup(F0, F1, 'preview' in args)
OUT = os.path.join(RENDERS, 'shot6')
DARK = hex_rgb('#2D3A2D')
studio(DARK, world_strength=0.5, world_col=hex_rgb('#3F4F37'))
warm = srgb((1.0, 0.985, 0.965))
area_light('key', (-4, -6, 7), (0, 0, 1.5), energy=900, size=5, color=warm)
area_light('fill', (6, -5, 3), (0, 0, 1.5), energy=350, size=6, color=warm)
area_light('rim', (0, 5, 6), (0, 0, 1.8), energy=900, size=5, color=srgb((0.85, 0.95, 0.75)))

items = [
    upright(tshirt('tee', hex_rgb('#F2EBDD'))),
    upright(jacket('denim', hex_rgb('#5B7C99'))),
    upright(dress('dress', hex_rgb('#C96F4A'))),
    upright(sweater('knit', hex_rgb('#8A9E78'))),
    upright(jeans('jeans', hex_rgb('#3E5A7E'))),
    upright(tshirt('mustard', hex_rgb('#D9A441'))),
    upright(skirt('skirt', hex_rgb('#E7B7B0'))),
    upright(sneaker('snk', hex_rgb('#F4F5F0'), sole=(0.95, 0.95, 0.92))),
    upright(leather_jacket('lj')),
    upright(blazer('blz', hex_rgb('#CDB797'))),
]
random.seed(11)
R, TILT, CZ = 2.85, math.radians(13), 2.35
n = len(items)


def ease_out(x):
    return 1 - (1 - x) ** 3


for i, it in enumerate(items):
    snk = 'snk' in it.name
    sc = 1.25 if snk else 0.95
    off = 0.2 if snk else 0.55 * sc  # origin is the hanger point; lift so the garment centre rides the ring
    phase = 2 * math.pi * i / n
    wob = [random.uniform(-1, 1) for _ in range(3)]
    for f in list(range(F0, F1 + 1, 3)) + [F1]:
        u = (f - F0) / (F1 - F0)
        th = phase + math.radians(-30 + 75 * ease_out(u))
        b = min(1.0, (f - F0) / 16)
        rr = R * (ease_out(b) * (1.0 + 0.06 * math.sin(min(1, b) * math.pi)))
        x = rr * math.cos(th)
        yy = rr * math.sin(th)
        y = yy * math.cos(TILT)
        z = CZ + yy * math.sin(TILT) - off + 0.08 * math.sin(f * 0.11 + i)
        scale = sc * min(1.0, 0.15 + 0.85 * ease_out(min(1, (f - F0) / 10)))
        rot = (math.radians(8 * wob[0] * math.sin(f * 0.07 + i)), math.radians(12 * wob[1]), math.radians(-x * 6 + 10 * wob[2]))
        key(it, f, loc=(x, y, z), rot=rot, scale=scale)
    for fc in fcurves(it.animation_data.action):
        for kp in fc.keyframe_points:
            kp.interpolation = 'BEZIER'
            kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'

cam = camera((0, -9.0, 2.6), (0, 0, 2.0), lens=34)
cam.data.shift_y = 0.12
key(cam, F0, loc=(0, -8.4, 2.55))
key(cam, F1, loc=(0, -9.2, 2.7))
ease_all(cam)
run(s, OUT, args, stills)
