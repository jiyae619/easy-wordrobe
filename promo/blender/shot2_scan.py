"""Shot 2 (f168-263): phone whips in, snaps a leather jacket, AI tags pop out."""
from common import *

args, F0, F1, stills = parse(168, 263)
s = setup(F0, F1, 'preview' in args)
OUT = os.path.join(RENDERS, 'shot2')
bright_studio()

# phone
inner, scr, tex = phone('ph')
blank_screen(tex)
corners = screen_corners(scr)
ph = upright(inner)
ph.scale = (1.3,) * 3
key(ph, 168, loc=(4.6, -0.2, 0.2), rot=(math.radians(30), math.radians(-40), math.radians(-150)))
key(ph, 182, loc=(1.02, -0.55, 1.62), rot=(math.radians(-4), math.radians(3), math.radians(-17)))
key(ph, 186, loc=(1.05, -0.55, 1.58), rot=(math.radians(-2), math.radians(1), math.radians(-13)))
key(ph, 263, loc=(1.05, -0.62, 1.62), rot=(math.radians(-3), math.radians(-1), math.radians(-11)))
ease_all(ph)
for fc in fcurves(ph.animation_data.action):
    fc.keyframe_points[0].easing = 'EASE_OUT'

# leather jacket
jk = upright(leather_jacket('lj'))
jk.scale = (1.35,) * 3
key(jk, 168, loc=(-1.3, -0.3, 4.4), rot=(math.radians(20), 0, math.radians(35)))
key(jk, 184, loc=(-1.3, -0.3, 2.5), rot=(0, 0, math.radians(-8)))
key(jk, 190, loc=(-1.3, -0.3, 2.56), rot=(0, 0, math.radians(-4)))
key(jk, 200, loc=(-1.3, -0.3, 2.52), rot=(0, 0, math.radians(0)), scale=1.35)
key(jk, 204, scale=1.42)
key(jk, 210, scale=1.35)
key(jk, 263, loc=(-1.3, -0.35, 2.58), rot=(0, 0, math.radians(10)))
ease_all(jk)
# anchors for AI tags (relative to jacket, in its outer (Z-up) frame)
anchors = {}
for nm, loc in {'tagA': (-0.42, -0.2, -0.3), 'tagB': (0.78, -0.2, -0.36), 'tagC': (-0.4, -0.2, -0.86), 'tagD': (0.6, -0.2, -1.08),
                'jk_top': (0, 0, 0.05), 'jk_bot': (0, 0, -1.0)}.items():
    e = empty(nm, loc)
    e.parent = jk
    anchors[nm] = e

# scan beam across the jacket
beam_m = simple_mat('beam', srgb((0.85, 0.97, 0.7)), rough=1, emit=10.0)
bpy.ops.mesh.primitive_plane_add(size=1)
beam = bpy.context.active_object
beam.data.materials.append(beam_m)
beam.visible_shadow = False
beam.rotation_euler = (math.pi / 2, 0, 0)
key(beam, 199, loc=(-1.3, -0.8, 2.75), scale=(0.0, 0.02, 1))
key(beam, 200, loc=(-1.3, -0.8, 2.75), scale=(2.0, 0.02, 1))
key(beam, 214, loc=(-1.3, -0.8, 1.05), scale=(2.0, 0.02, 1))
key(beam, 215, loc=(-1.3, -0.8, 1.05), scale=(0.0, 0.02, 1))
for fc in fcurves(beam.animation_data.action):
    for kp in fc.keyframe_points:
        kp.interpolation = 'LINEAR'

cam = camera((0, -7.2, 1.72), (0, 0, 1.62), lens=45)
key(cam, 168, loc=(-0.1, -7.3, 1.75))
key(cam, 263, loc=(0.12, -6.7, 1.68))
ease_all(cam)

os.makedirs(OUT, exist_ok=True)
track_points({**{k: v for k, v in corners.items()}, **anchors}, os.path.join(OUT, 'track.json'), F0, F1)
run(s, OUT, args, stills)
