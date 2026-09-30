import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from assets import *

HERE = os.path.dirname(os.path.abspath(__file__))
RENDERS = os.path.join(HERE, '..', 'renders')


def parse(default0, default1):
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    nums = [int(a) for a in args if a.isdigit()]
    f0, f1 = (nums[0], nums[1]) if len(nums) >= 2 else (default0, default1)
    return args, f0, f1, nums[2:]


def setup(f0, f1, preview=False):
    s = reset()
    s.frame_start, s.frame_end = f0, f1
    s.cycles.samples = 4
    s.cycles.max_bounces = 3
    s.cycles.diffuse_bounces = 1
    s.cycles.glossy_bounces = 1
    s.cycles.caustics_reflective = s.cycles.caustics_refractive = False
    s.cycles.denoising_prefilter = 'FAST'
    s.cycles.denoising_quality = 'FAST'
    s.cycles.use_adaptive_sampling = False
    if preview:
        s.render.resolution_percentage = 50
    return s


def bright_studio(color=OLIVE_50, key_e=800, fill_e=380, rim_e=450, world=0.6):
    studio(color, world_strength=world)
    warm = srgb((1.0, 0.985, 0.965))
    area_light('key', (-4, -6, 7), (0, 0, 1.6), energy=key_e, size=5, color=warm)
    area_light('fill', (6, -5, 3), (0, 0, 1.6), energy=fill_e, size=6, color=warm)
    area_light('rim', (0, 4, 6), (0, 0, 1.8), energy=rim_e, size=4, color=warm)


def blank_screen(tex):
    nt = tex.id_data
    em = [n for n in nt.nodes if n.type == 'EMISSION'][0]
    for l in list(em.inputs['Color'].links):
        nt.links.remove(l)
    em.inputs['Color'].default_value = (0.0, 0.0, 0.0, 1)


def run(s, out_dir, args, stills):
    os.makedirs(out_dir, exist_ok=True)
    if 'still' in args:
        for f in stills or [s.frame_start]:
            s.frame_set(f)
            s.render.filepath = os.path.join(out_dir, f'still_{f:04d}.png')
            bpy.ops.render.render(write_still=True)
    elif 'track' not in args:
        s.render.filepath = os.path.join(out_dir, '')
        bpy.ops.render.render(animation=True)
