"""Shot 1 (f1-168): the closet is asleep -> beat drop -> scan beam wakes every garment."""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from assets import *

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
F0, F1 = (int(args[0]), int(args[1])) if len(args) >= 2 else (1, 168)
PREVIEW = 'preview' in args
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'renders', 'shot1', '')

s = reset()
s.frame_start, s.frame_end = F0, F1
s.cycles.samples = 4
s.cycles.max_bounces = 3
s.cycles.diffuse_bounces = 1
s.cycles.glossy_bounces = 1
s.cycles.caustics_reflective = s.cycles.caustics_refractive = False
s.cycles.denoising_prefilter = 'FAST'
s.cycles.denoising_quality = 'FAST'
s.cycles.use_adaptive_sampling = False
if PREVIEW:
    s.render.resolution_percentage = 50
s.render.filepath = OUT
DROP = 97  # frame of the beat drop (4.0 s)

# ---------------------------------------------------------------- stage
cyc = studio(OLIVE_50, world_strength=0.0)
cmat = cyc.data.materials[0]
cb = cmat.node_tree.nodes['Principled BSDF'].inputs['Base Color']
DARK = srgb((0.07, 0.085, 0.07))
LIGHT = OLIVE_50
cb.default_value = (*DARK, 1)
cb.keyframe_insert('default_value', frame=DROP - 1)
cb.default_value = (*LIGHT, 1)
cb.keyframe_insert('default_value', frame=DROP + 8)
wbg = s.world.node_tree.nodes['Background']
wbg.inputs['Color'].default_value = (*OLIVE_50, 1)
wbg.inputs['Strength'].default_value = 0.02
wbg.inputs['Strength'].keyframe_insert('default_value', frame=DROP - 1)
wbg.inputs['Strength'].default_value = 0.6
wbg.inputs['Strength'].keyframe_insert('default_value', frame=DROP + 8)

# rail
chrome = simple_mat('chrome', srgb((0.8, 0.8, 0.78)), rough=0.18, metal=1.0)
bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=8.6, location=(0, 0, 2.72), rotation=(0, math.pi / 2, 0), vertices=32)
rail = bpy.context.active_object
rail.data.materials.append(chrome)
bpy.ops.object.shade_smooth()
for x in (-4.3, 4.3):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=2.72, location=(x, 0, 1.36), vertices=32)
    p = bpy.context.active_object
    p.data.materials.append(chrome)
    bpy.ops.object.shade_smooth()

# ---------------------------------------------------------------- garments on hangers
spec = [
    ('tee', lambda: tshirt('tee', hex_rgb('#F2EBDD')), 1.0),
    ('denim', lambda: jacket('denim', hex_rgb('#5B7C99')), 0.95),
    ('dress', lambda: dress('dress', hex_rgb('#C96F4A')), 0.9),
    ('knit', lambda: sweater('knit', hex_rgb('#6B7F5E')), 0.95),
    ('jeans', lambda: jeans('jeans', hex_rgb('#3E5A7E')), 0.9),
    ('mustard', lambda: tshirt('mustard', hex_rgb('#D9A441')), 1.0),
    ('skirt', lambda: skirt('skirt', hex_rgb('#E7B7B0')), 1.0),
]
random.seed(4)
garments = []
N = len(spec)
for i, (nm, fn, sc) in enumerate(spec):
    x = -3.3 + i * 1.1
    g = upright(fn())
    g.scale = (sc,) * 3
    hg = upright(hanger(nm + '_hg'))
    base = (x, 0.0, 2.5)
    hg.location = base
    g.location = base
    # gentle sleepy sway while asleep
    for f in range(1, 169, 12):
        sw = math.sin(f * 0.07 + i) * math.radians(2.0)
        if f < DROP:
            key(g, f, rot=(0, sw, 0))
            key(hg, f, rot=(0, sw, 0))
    # asleep
    set_wake(g, 1, 0.0, glow=0.0)
    # wake time: beam sweeps left->right between DROP and DROP+24
    fw = DROP + int(round((i / (N - 1)) * 22))
    set_wake(g, fw - 1, 0.0, glow=0.0)
    set_wake(g, fw + 1, 1.0, glow=0.25)
    set_wake(g, fw + 8, 1.0, glow=0.0)
    # pop + lift off the hanger and float toward camera
    key(g, fw - 1, loc=base, rot=(0, 0, 0), scale=sc)
    key(g, fw + 3, scale=sc * 1.12)
    key(g, fw + 8, scale=sc)
    # float targets: an arc in front of the rail
    tx = (-3.3 + i * 1.1) * 1.04
    tz = 3.75 + (0.28 if i % 2 else 0.0) - 0.1 * abs(i - 3)
    ty = -1.5 - (0.45 if i % 2 else 0.0)
    key(g, fw + 30, loc=(tx, ty, tz), rot=(math.radians(random.uniform(-8, 8)), 0, math.radians(random.uniform(-25, 25))))
    # continuous drift / bob to the end
    key(g, 168, loc=(tx * 1.03, ty - 0.25, tz + 0.2), rot=(math.radians(random.uniform(-10, 10)), math.radians(random.uniform(-6, 6)), math.radians(random.uniform(-35, 35))))
    # hanger swings when released
    key(hg, fw, rot=(0, 0, 0))
    key(hg, fw + 6, rot=(0, math.radians(9 * (1 if i % 2 else -1)), 0))
    key(hg, fw + 14, rot=(0, math.radians(-5 * (1 if i % 2 else -1)), 0))
    key(hg, fw + 24, rot=(0, math.radians(2 * (1 if i % 2 else -1)), 0))
    key(hg, fw + 34, rot=(0, 0, 0))
    ease_all(g)
    ease_all(hg)
    garments.append(g)

# ---------------------------------------------------------------- scan beam (emissive sheet)
beam_m = simple_mat('beam', srgb((0.85, 0.97, 0.7)), rough=1, emit=14.0)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -0.3, 2.0))
beam = bpy.context.active_object
beam.scale = (0.035, 1, 4.5)
beam.rotation_euler = (math.pi / 2, 0, 0)
beam.data.materials.append(beam_m)
beam.visible_shadow = False
key(beam, DROP - 2, loc=(-4.6, -0.3, 2.0), scale=(0.0, 1, 4.5))
key(beam, DROP, loc=(-4.2, -0.3, 2.0), scale=(0.035, 1, 4.5))
key(beam, DROP + 24, loc=(4.2, -0.3, 2.0), scale=(0.035, 1, 4.5))
key(beam, DROP + 26, loc=(4.6, -0.3, 2.0), scale=(0.0, 1, 4.5))
for fc in fcurves(beam.animation_data.action):
    for kp in fc.keyframe_points:
        kp.interpolation = 'LINEAR'
# beam light that travels with it
bl = bpy.data.lights.new('beamlight', 'AREA')
bl.shape = 'RECTANGLE'
bl.size, bl.size_y = 0.2, 4.5
bl.color = srgb((0.93, 1.0, 0.85))
blo = bpy.data.objects.new('beamlight', bl)
bpy.context.scene.collection.objects.link(blo)
blo.parent = beam
blo.location = (0, 0, 0)
bl.energy = 0
bl.keyframe_insert('energy', frame=DROP - 1)
bl.energy = 120
bl.keyframe_insert('energy', frame=DROP + 1)
bl.keyframe_insert('energy', frame=DROP + 23)
bl.energy = 0
bl.keyframe_insert('energy', frame=DROP + 26)

# ---------------------------------------------------------------- dust motes (asleep mood)
dust_m = simple_mat('dust', srgb((1, 0.95, 0.85)), rough=1, emit=1.6)
for k in range(46):
    x0 = random.uniform(-4, 4)
    z0 = random.uniform(0.6, 4)
    y0 = random.uniform(-2.6, 0.6)
    d = sphere(f'dust{k}', random.uniform(0.004, 0.01), dust_m, loc=(x0, y0, z0))
    d.visible_shadow = False
    key(d, 1, loc=(x0, y0, z0), scale=1)
    key(d, DROP, loc=(x0 + random.uniform(-0.3, 0.3), y0, z0 - random.uniform(0.1, 0.35)), scale=1)
    key(d, DROP + 10, scale=0.0)

# ---------------------------------------------------------------- lights: dim moonlight -> bright studio
key_l = area_light('key', (-4, -6, 7), (0, 0, 2), energy=60, size=5, color=srgb((0.75, 0.82, 1.0)))
fill = area_light('fill', (6, -5, 3), (0, 0, 2), energy=10, size=6)
rim = area_light('rim', (0, 4, 6), (0, 0, 2.3), energy=120, size=4, color=srgb((0.8, 0.85, 1.0)))
spot_d = bpy.data.lights.new('slit', 'SPOT')
spot_d.energy = 900
spot_d.spot_size = math.radians(28)
spot_d.spot_blend = 0.6
spot_d.color = srgb((0.95, 0.9, 0.8))
slit = bpy.data.objects.new('slit', spot_d)
s.collection.objects.link(slit)
slit.location = (2.5, -5, 6.5)
look_at(slit, (-0.5, 0, 2.2))
for L, a, b in ((key_l, 60, 800), (fill, 10, 380), (rim, 120, 450), (slit, 900, 0)):
    d = L.data
    d.energy = a
    d.keyframe_insert('energy', frame=DROP - 1)
    d.energy = b
    d.keyframe_insert('energy', frame=DROP + 12)
    if L is not slit:
        c0 = tuple(d.color)
        d.keyframe_insert('color', frame=DROP - 1)
        d.color = srgb((1.0, 0.97, 0.92))
        d.keyframe_insert('color', frame=DROP + 8)

# ---------------------------------------------------------------- camera
cam = camera((2.6, -5.2, 2.55), (1.0, 0, 2.2), lens=42, dof=6.2, fstop=4.0)
cam_t = empty('camtarget', (1.0, 0, 2.2))
tc = cam.constraints.new('TRACK_TO')
tc.target = cam_t
tc.track_axis = 'TRACK_NEGATIVE_Z'
tc.up_axis = 'UP_Y'
cam.data.dof.focus_object = cam_t
key(cam, 1, loc=(2.8, -5.0, 2.6))
key(cam_t, 1, loc=(1.2, 0, 2.05))
key(cam, DROP - 1, loc=(-0.2, -4.7, 2.45))
key(cam_t, DROP - 1, loc=(-0.9, 0, 2.05))
key(cam, DROP + 20, loc=(0.0, -7.6, 2.4))
key(cam_t, DROP + 20, loc=(0.0, -0.6, 2.7))
key(cam, 168, loc=(0.3, -8.8, 2.5))
key(cam_t, 168, loc=(0.0, -1.2, 3.35))
ease_all(cam)
ease_all(cam_t)
# lens push-out at drop
cam.data.lens = 50
cam.data.keyframe_insert('lens', frame=DROP - 1)
cam.data.lens = 36
cam.data.keyframe_insert('lens', frame=DROP + 20)
cam.data.lens = 33
cam.data.keyframe_insert('lens', frame=168)

if 'still' in args:
    for f in [int(a) for a in args if a.isdigit()][2:] or [60]:
        s.frame_set(f)
        s.render.filepath = OUT + f'still_{f:04d}.png'
        bpy.ops.render.render(write_still=True)
else:
    bpy.ops.render.render(animation=True)
