"""Procedural 3D asset library for the Stylemax promo (Blender bpy).

Stylised "inflated" garments: 2D silhouettes -> extrude -> bevel -> subdivision,
so they read like soft vinyl toys. Plus a phone, hangers, rail and a studio.
"""
import bpy, bmesh, math
from mathutils import Vector

OLIVE_900 = (0.102, 0.141, 0.098)
OLIVE_800 = (0.176, 0.227, 0.176)
OLIVE_500 = (0.420, 0.498, 0.369)
OLIVE_300 = (0.659, 0.722, 0.604)
OLIVE_50 = (0.957, 0.961, 0.941)


def srgb(c):
    """sRGB 0-1 -> linear."""
    def f(x):
        return x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4
    return tuple(f(x) for x in c)


def hex_rgb(h):
    h = h.lstrip('#')
    return srgb(tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)))


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    s.cycles.device = 'CPU'
    s.cycles.samples = 24
    s.cycles.use_denoising = True
    s.cycles.denoiser = 'OPENIMAGEDENOISE'
    s.cycles.max_bounces = 4
    s.cycles.diffuse_bounces = 2
    s.cycles.glossy_bounces = 2
    s.cycles.transmission_bounces = 2
    s.cycles.transparent_max_bounces = 4
    s.cycles.use_adaptive_sampling = True
    s.cycles.adaptive_threshold = 0.05
    s.render.fps = 24
    s.render.resolution_x, s.render.resolution_y = 1920, 1080
    s.render.image_settings.file_format = 'PNG'
    s.view_settings.view_transform = 'Standard'
    s.view_settings.look = 'None'
    return s


# ---------------------------------------------------------------- materials

def fabric_mat(name, color, rough=0.75, sheen=0.6, noise_scale=180.0, bump=0.15, sleep=True):
    """Fabric material; if sleep=True a 'Wake' value node blends grey->colour (animate it)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    n = nt.nodes
    l = nt.links
    bsdf = n['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Sheen Weight'].default_value = sheen
    bsdf.inputs['Sheen Roughness'].default_value = 0.5
    col = n.new('ShaderNodeRGB')
    col.outputs[0].default_value = (*color, 1)
    if sleep:
        grey_v = 0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2]
        g = 0.35 * grey_v + 0.05
        grey = n.new('ShaderNodeRGB')
        grey.outputs[0].default_value = (g, g, g * 1.03, 1)
        wake = n.new('ShaderNodeValue')
        wake.name = 'Wake'
        wake.label = 'Wake'
        wake.outputs[0].default_value = 1.0
        mix = n.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        l.new(wake.outputs[0], mix.inputs['Factor'])
        l.new(grey.outputs[0], mix.inputs[6])
        l.new(col.outputs[0], mix.inputs[7])
        l.new(mix.outputs[2], bsdf.inputs['Base Color'])
        # a faint glow while waking up
        em = n.new('ShaderNodeValue')
        em.name = 'Glow'
        em.outputs[0].default_value = 0.0
        l.new(col.outputs[0], bsdf.inputs['Emission Color'])
        l.new(em.outputs[0], bsdf.inputs['Emission Strength'])
    else:
        l.new(col.outputs[0], bsdf.inputs['Base Color'])
    # woven micro bump
    tc = n.new('ShaderNodeTexCoord')
    wave = n.new('ShaderNodeTexWave')
    wave.inputs['Scale'].default_value = noise_scale
    wave.inputs['Distortion'].default_value = 2.0
    nz = n.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = noise_scale * 0.6
    mixb = n.new('ShaderNodeMath')
    mixb.operation = 'ADD'
    bmp = n.new('ShaderNodeBump')
    bmp.inputs['Strength'].default_value = bump
    l.new(tc.outputs['Object'], wave.inputs['Vector'])
    l.new(tc.outputs['Object'], nz.inputs['Vector'])
    l.new(wave.outputs['Fac'], mixb.inputs[0])
    l.new(nz.outputs['Fac'], mixb.inputs[1])
    l.new(mixb.outputs[0], bmp.inputs['Height'])
    l.new(bmp.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def simple_mat(name, color, rough=0.4, metal=0.0, emit=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*color, 1)
        b.inputs['Emission Strength'].default_value = emit
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
    return m


def set_wake(obj, frame, value, glow=None):
    """Keyframe the Wake (grey->colour) value on every material of obj (and children)."""
    objs = [obj] + list(obj.children_recursive)
    for o in objs:
        for slot in getattr(o, 'material_slots', []):
            m = slot.material
            if not m or not m.use_nodes:
                continue
            n = m.node_tree.nodes.get('Wake')
            if n:
                n.outputs[0].default_value = value
                n.outputs[0].keyframe_insert('default_value', frame=frame)
            g = m.node_tree.nodes.get('Glow')
            if g is not None and glow is not None:
                g.outputs[0].default_value = glow
                g.outputs[0].keyframe_insert('default_value', frame=frame)


# ---------------------------------------------------------------- geometry helpers

def _link(obj, coll=None):
    (coll or bpy.context.scene.collection).objects.link(obj)
    return obj


def slab(name, pts, depth=0.1, bevel=0.045, segs=4, subsurf=2, mat=None, puff=0.0):
    """2D polygon (x,y list, CCW) -> soft inflated slab centred on z=0."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    verts = [bm.verts.new((x, y, -depth / 2)) for x, y in pts]
    f = bm.faces.new(verts)
    bmesh.ops.recalc_face_normals(bm, faces=[f])
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    top = [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=top, vec=(0, 0, depth))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    # triangulate big ngons into a grid-ish fill so subsurf + puff behave
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    _link(ob)
    bv = ob.modifiers.new('bevel', 'BEVEL')
    bv.width = bevel
    bv.segments = segs
    bv.limit_method = 'ANGLE'
    bv.harden_normals = False
    if puff:
        # remesh + inflate via displace along normals => pillowy
        rm = ob.modifiers.new('remesh', 'REMESH')
        rm.mode = 'SMOOTH'
        rm.octree_depth = 7
        rm.use_smooth_shade = True
        sm = ob.modifiers.new('smooth', 'SMOOTH')
        sm.factor = 0.9
        sm.iterations = 6
    if subsurf:
        ss = ob.modifiers.new('sub', 'SUBSURF')
        ss.levels = subsurf
        ss.render_levels = subsurf
    for p in me.polygons:
        p.use_smooth = True
    if mat:
        me.materials.append(mat)
    return ob


def mirror_pts(half):
    """half: list of (x,y) for x>=0 from top-centre going clockwise down to bottom-centre.
    Returns a full CCW polygon."""
    right = half
    left = [(-x, y) for x, y in reversed(half) if x != 0]
    pts = left + right
    # ensure CCW
    area = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
    if area < 0:
        pts.reverse()
    return pts


def empty(name, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    e.location = loc
    _link(e)
    return e


def parent(child, par):
    child.parent = par


def torus(name, R, r, mat, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=48, minor_segments=12, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.shade_smooth()
    o.data.materials.append(mat)
    return o


def sphere(name, r, mat, loc=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=24, ring_count=12)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.shade_smooth()
    o.data.materials.append(mat)
    return o


def rbox(name, size, mat, loc=(0, 0, 0), bevel=0.05, segs=5):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    b = o.modifiers.new('bevel', 'BEVEL')
    b.width = bevel
    b.segments = segs
    bpy.ops.object.shade_smooth()
    o.data.materials.append(mat)
    return o


def upright(inner):
    """Builders model Y-up facing +Z; wrap in an outer empty so it stands Z-up facing -Y."""
    outer = empty(inner.name.replace('_root', ''))
    inner.parent = outer
    inner.rotation_euler = (math.pi / 2, 0, 0)
    return outer


# ---------------------------------------------------------------- garments
# All garments ~1 unit tall, built in the XY plane (Y up), facing +Z. Root empty at top-centre
# (the hanger hook point) so they hang naturally.

def tshirt(name, color, long_sleeve=False, collar=True, mat=None):
    mat = mat or fabric_mat(name + '_mat', color)
    sl = 0.62 if long_sleeve else 0.5
    half = [(0.0, 0.0), (0.12, 0.0), (0.26, -0.04), (sl, -0.2 - (0.42 if long_sleeve else 0.0)),
            (sl - 0.13, -0.33 - (0.45 if long_sleeve else 0.0)) if long_sleeve else (sl - 0.1, -0.36),
            (0.29, -0.3 if not long_sleeve else -0.34), (0.29, -0.98), (0.0, -0.98)]
    if long_sleeve:
        half = [(0.0, 0.0), (0.12, 0.0), (0.26, -0.04), (0.47, -0.3), (0.6, -0.86), (0.47, -0.9),
                (0.31, -0.42), (0.3, -1.0), (0.0, -1.0)]
    body = slab(name, mirror_pts(half), depth=0.2, bevel=0.095, segs=6, mat=mat)
    # neckline scoop: dark inner disc
    root = empty(name + '_root')
    parent(body, root)
    body.location = (0, 0, 0)
    if collar:
        c = torus(name + '_collar', 0.12, 0.03, mat, loc=(0, -0.02, 0.0), rot=(math.radians(80), 0, 0), scale=(1.1, 1.0, 0.9))
        parent(c, root)
    return root


def tshirt_up(*a, **k):
    return upright(tshirt(*a, **k))


def jacket(name, color, mat=None, button_col=(0.85, 0.8, 0.7)):
    mat = mat or fabric_mat(name + '_mat', color, rough=0.8, noise_scale=90, bump=0.35)
    root = tshirt(name, color, long_sleeve=True, collar=False, mat=mat)
    # collar flaps
    for sx in (1, -1):
        flap = slab(name + f'_lapel{sx}', [(0, 0), (0.17 * sx, 0.02), (0.1 * sx, -0.2), (0.02 * sx, -0.16)][::sx],
                    depth=0.05, bevel=0.02, mat=mat)
        flap.location = (0, 0.0, 0.1)
        flap.rotation_euler = (math.radians(-8), 0, 0)
        parent(flap, root)
    # placket + buttons + pockets
    bm = simple_mat(name + '_btn', srgb(button_col), rough=0.3, metal=0.6)
    for i in range(4):
        s = sphere(name + f'_b{i}', 0.022, bm, loc=(0.035, -0.3 - i * 0.17, 0.1), scale=(1, 1, 0.5))
        parent(s, root)
    for sx in (1, -1):
        p = rbox(name + f'_pk{sx}', (0.13, 0.1, 0.02), mat, loc=(0.15 * sx, -0.42, 0.095), bevel=0.02)
        parent(p, root)
    # seam stitch lines (thin darker bars)
    dark = simple_mat(name + '_seam', tuple(c * 0.55 for c in color), rough=0.9)
    seam = rbox(name + '_seam', (0.006, 0.9, 0.01), dark, loc=(0, -0.55, 0.1), bevel=0.002, segs=1)
    parent(seam, root)
    return root


def sweater(name, color, mat=None):
    mat = mat or fabric_mat(name + '_mat', color, rough=0.9, sheen=0.9, noise_scale=60, bump=0.6)
    root = tshirt(name, color, long_sleeve=True, collar=True, mat=mat)
    rib = fabric_mat(name + '_rib', tuple(c * 0.85 for c in color), rough=0.9, noise_scale=40, bump=0.8)
    hem = rbox(name + '_hem', (0.64, 0.09, 0.215), rib, loc=(0, -0.97, 0), bevel=0.035)
    parent(hem, root)
    for sx in (1, -1):
        cf = rbox(name + f'_cuff{sx}', (0.15, 0.08, 0.2), rib, loc=(0.545 * sx, -0.86, 0), bevel=0.03)
        cf.rotation_euler = (0, 0, math.radians(-14 * sx))
        parent(cf, root)
    # cable knit stripes
    for k, xx in enumerate((-0.14, 0.0, 0.14)):
        st = rbox(name + f'_cable{k}', (0.035, 0.75, 0.012), rib, loc=(xx, -0.52, 0.1), bevel=0.012, segs=3)
        parent(st, root)
    return root


def hoodie(name, color, mat=None):
    mat = mat or fabric_mat(name + '_mat', color, rough=0.85, sheen=0.8)
    root = tshirt(name, color, long_sleeve=True, collar=False, mat=mat)
    hood = slab(name + '_hood', mirror_pts([(0, 0.2), (0.14, 0.17), (0.2, 0.05), (0.16, -0.08), (0.0, -0.12)]),
                depth=0.1, bevel=0.04, mat=mat)
    hood.location = (0, 0.02, -0.03)
    parent(hood, root)
    pocket = slab(name + '_pocket', mirror_pts([(0, -0.6), (0.17, -0.6), (0.23, -0.82), (0, -0.82)]), depth=0.03, bevel=0.012, mat=mat)
    pocket.location = (0, 0, 0.095)
    parent(pocket, root)
    cm = simple_mat(name + '_cord', srgb((0.95, 0.95, 0.92)), rough=0.5)
    for sx in (1, -1):
        c = rbox(name + f'_cord{sx}', (0.015, 0.22, 0.015), cm, loc=(0.05 * sx, -0.14, 0.1), bevel=0.006, segs=2)
        parent(c, root)
    return root


def jeans(name, color, mat=None):
    mat = mat or fabric_mat(name + '_mat', color, rough=0.85, noise_scale=120, bump=0.5)
    half = [(0.0, 0.0), (0.28, 0.0), (0.33, -0.55), (0.36, -1.18), (0.07, -1.18), (0.02, -0.34), (0.0, -0.34)]
    pts = mirror_pts(half)
    body = slab(name, pts, depth=0.2, bevel=0.095, segs=6, mat=mat)
    root = empty(name + '_root')
    parent(body, root)
    band = rbox(name + '_band', (0.6, 0.08, 0.22), mat, loc=(0, -0.035, 0), bevel=0.03)
    parent(band, root)
    stitch = simple_mat(name + '_stitch', srgb((0.85, 0.62, 0.3)), rough=0.6)
    btn = simple_mat(name + '_btn', srgb((0.8, 0.65, 0.35)), rough=0.25, metal=1.0)
    b = sphere(name + '_button', 0.02, btn, loc=(0.0, -0.035, 0.1), scale=(1, 1, 0.5))
    parent(b, root)
    for sx in (1, -1):
        # front pocket curve as thin torus segment
        t = rbox(name + f'_pk{sx}', (0.16, 0.008, 0.01), stitch, loc=(0.2 * sx, -0.14, 0.1), bevel=0.003, segs=1)
        t.rotation_euler = (0, 0, math.radians(-40 * sx))
        parent(t, root)
        sd = rbox(name + f'_sd{sx}', (0.008, 0.9, 0.01), stitch, loc=(0.2 * sx, -0.65, 0.1), bevel=0.003, segs=1)
        sd.rotation_euler = (0, 0, math.radians(-2 * sx))
        parent(sd, root)
        cuff = rbox(name + f'_cuff{sx}', (0.3, 0.05, 0.21), mat, loc=(0.215 * sx, -1.16, 0), bevel=0.02)
        cuff.rotation_euler = (0, 0, math.radians(-2.5 * sx))
        parent(cuff, root)
    return root


def dress(name, color, mat=None):
    mat = mat or fabric_mat(name + '_mat', color, rough=0.6, sheen=0.9, noise_scale=220, bump=0.08)
    half = [(0.0, -0.08), (0.1, -0.02), (0.13, 0.0), (0.2, -0.05), (0.22, -0.34), (0.17, -0.42),
            (0.24, -0.62), (0.48, -1.25), (0.0, -1.3)]
    body = slab(name, mirror_pts(half), depth=0.2, bevel=0.095, segs=6, mat=mat)
    root = empty(name + '_root')
    parent(body, root)
    belt = rbox(name + '_belt', (0.36, 0.05, 0.215), simple_mat(name + '_beltm', tuple(c * 0.55 for c in color), rough=0.5), loc=(0, -0.42, 0), bevel=0.02)
    parent(belt, root)
    return root


def skirt(name, color, mat=None):
    mat = mat or fabric_mat(name + '_mat', color, rough=0.7, sheen=0.7)
    half = [(0.0, 0.0), (0.24, 0.0), (0.42, -0.7), (0.0, -0.74)]
    body = slab(name, mirror_pts(half), depth=0.2, bevel=0.095, segs=6, mat=mat)
    root = empty(name + '_root')
    parent(body, root)
    dark = simple_mat(name + '_pleat', tuple(c * 0.6 for c in color), rough=0.8)
    for i in range(-3, 4):
        p = rbox(name + f'_pl{i}', (0.006, 0.66, 0.01), dark, loc=(i * 0.09, -0.37, 0.1), bevel=0.002, segs=1)
        p.rotation_euler = (0, 0, math.radians(-i * 3.2))
        parent(p, root)
    return root


def sneaker(name, color, sole=(0.97, 0.96, 0.93)):
    """Stylised chunky sneaker (side profile in XY, toe at +X, ~0.62 long), sole bottom at y=0."""
    root = empty(name + '_root')
    sm = simple_mat(name + '_sole', srgb(sole), rough=0.55)
    um = fabric_mat(name + '_upper', color, rough=0.6, sheen=0.3, noise_scale=300, bump=0.1)
    s = slab(name + '_sole', [(-0.3, 0.0), (0.26, 0.0), (0.32, 0.03), (0.33, 0.08), (-0.31, 0.09), (-0.32, 0.04)],
             depth=0.24, bevel=0.035, mat=sm)
    parent(s, root)
    up = slab(name + '_up', [(-0.29, 0.08), (0.3, 0.08), (0.32, 0.12), (0.22, 0.17), (0.06, 0.22), (-0.06, 0.3),
                             (-0.2, 0.31), (-0.3, 0.28), (-0.31, 0.16)], depth=0.21, bevel=0.08, segs=5, mat=um)
    parent(up, root)
    toe = slab(name + '_toe', [(0.14, 0.08), (0.32, 0.09), (0.31, 0.13), (0.2, 0.16)], depth=0.225, bevel=0.03, mat=sm)
    parent(toe, root)
    heel = slab(name + '_heel', [(-0.33, 0.1), (-0.25, 0.1), (-0.24, 0.3), (-0.31, 0.33)], depth=0.2, bevel=0.03, mat=sm)
    parent(heel, root)
    lm = simple_mat(name + '_lace', srgb((0.98, 0.98, 0.96)), rough=0.5)
    for i in range(4):
        l = rbox(name + f'_lace{i}', (0.018, 0.018, 0.2), lm, loc=(0.13 - i * 0.06, 0.2 + i * 0.03, 0), bevel=0.008, segs=2)
        parent(l, root)
    for z in (0.112, -0.112):
        sw = slab(name + f'_logo{z}', [(-0.22, 0.12), (0.04, 0.2), (0.1, 0.2), (-0.18, 0.15)], depth=0.01, bevel=0.004, segs=2,
                  mat=simple_mat(name + '_logo', srgb(sole), rough=0.4))
        sw.location = (0, 0, z)
        parent(sw, root)
    return root


def hanger(name, mat=None, width=0.62):
    mat = mat or simple_mat(name + '_mat', srgb((0.72, 0.55, 0.36)), rough=0.35)
    root = empty(name + '_root')
    # wooden bar (bent)
    cd = bpy.data.curves.new(name + '_c', 'CURVE')
    cd.dimensions = '3D'
    sp = cd.splines.new('BEZIER')
    sp.bezier_points.add(2)
    pts = [(-width / 2, -0.16, 0), (0, 0.0, 0), (width / 2, -0.16, 0)]
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    cd.bevel_depth = 0.022
    cd.bevel_resolution = 6
    cd.use_fill_caps = True
    bar = bpy.data.objects.new(name + '_bar', cd)
    _link(bar)
    bar.data.materials.append(mat)
    parent(bar, root)
    # metal hook
    mm = simple_mat(name + '_hook', srgb((0.8, 0.8, 0.78)), rough=0.2, metal=1.0)
    cd2 = bpy.data.curves.new(name + '_h', 'CURVE')
    cd2.dimensions = '3D'
    sp2 = cd2.splines.new('BEZIER')
    hp = [(0, 0.0, 0), (0, 0.1, 0), (0.05, 0.17, 0), (0, 0.22, 0), (-0.045, 0.18, 0)]
    sp2.bezier_points.add(len(hp) - 1)
    for bp, p in zip(sp2.bezier_points, hp):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    cd2.bevel_depth = 0.007
    cd2.bevel_resolution = 4
    hook = bpy.data.objects.new(name + '_hookobj', cd2)
    _link(hook)
    hook.data.materials.append(mm)
    parent(hook, root)
    return root


def rounded_rect(name, w, h, r, seg=10):
    pts = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(seg + 1):
            a = math.radians(a0 + i * 90 / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a), 0))
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in pts]
    bm.faces.new(vs)
    bmesh.ops.triangulate(bm, faces=bm.faces[:], quad_method='BEAUTY', ngon_method='BEAUTY')
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    _link(ob)
    return ob


def phone(name, screen_image=None, body_col=(0.12, 0.13, 0.12)):
    """iPhone-ish slab 0.75 x 1.55, screen facing +Z. Returns (root, screen_obj, screen_image_node)."""
    W, H, D = 0.75, 1.56, 0.075
    root = empty(name + '_root')
    frame_m = simple_mat(name + '_frame', srgb((0.62, 0.64, 0.6)), rough=0.25, metal=1.0)
    body = rbox(name + '_body', (W, H, D), frame_m, bevel=0.1, segs=10)
    parent(body, root)
    back_m = simple_mat(name + '_back', srgb(body_col), rough=0.3)
    back = rbox(name + '_back', (W - 0.02, H - 0.02, 0.01), back_m, loc=(0, 0, -D / 2), bevel=0.09, segs=8)
    parent(back, root)
    # black glass front
    glass_m = simple_mat(name + '_glass', (0.005, 0.005, 0.005), rough=0.05)
    glass = rbox(name + '_glass', (W - 0.018, H - 0.018, 0.006), glass_m, loc=(0, 0, D / 2 - 0.001), bevel=0.09, segs=8)
    parent(glass, root)
    # screen: plane with rounded alpha mask + emissive image
    sw, sh = W - 0.06, H - 0.06
    scr = rounded_rect(name + '_screen', sw, sh, 0.075)
    scr.location = (0, 0, D / 2 + 0.0035)
    m = bpy.data.materials.new(name + '_screenmat')
    m.use_nodes = True
    nt = m.node_tree
    n = nt.nodes
    l = nt.links
    for x in list(n):
        n.remove(x)
    out = n.new('ShaderNodeOutputMaterial')
    em = n.new('ShaderNodeEmission')
    em.inputs['Strength'].default_value = 1.0
    tex = n.new('ShaderNodeTexImage')
    tex.name = 'ScreenTex'
    tex.interpolation = 'Cubic'
    tex.extension = 'CLIP'
    if screen_image:
        img = bpy.data.images.load(screen_image)
        tex.image = img
    # rounded-rect mask via UV
    uv = n.new('ShaderNodeTexCoord')
    sep = n.new('ShaderNodeSeparateXYZ')
    l.new(uv.outputs['UV'], sep.inputs[0])
    l.new(uv.outputs['UV'], tex.inputs['Vector'])
    # glossy glass reflection layered on top
    gl = n.new('ShaderNodeBsdfGlossy')
    gl.inputs['Roughness'].default_value = 0.08
    lw = n.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.12
    add = n.new('ShaderNodeMixShader')
    l.new(tex.outputs['Color'], em.inputs['Color'])
    l.new(lw.outputs['Facing'], add.inputs['Fac'])
    l.new(em.outputs[0], add.inputs[1])
    l.new(gl.outputs[0], add.inputs[2])
    l.new(add.outputs[0], out.inputs['Surface'])
    scr.data.materials.append(m)
    # re-UV after bevel: planar map
    me = scr.data
    uvl = me.uv_layers.active or me.uv_layers.new()
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            uvl.data[li].uv = (v.x / sw + 0.5, v.y / sh + 0.5)
    parent(scr, root)
    # dynamic island
    isl = rbox(name + '_island', (0.2, 0.055, 0.004), glass_m, loc=(0, H / 2 - 0.085, D / 2 + 0.005), bevel=0.0274, segs=8)
    parent(isl, root)
    # side buttons
    for y, h in ((0.35, 0.16), (0.12, 0.16)):
        b = rbox(name + f'_btn{y}', (0.02, h, 0.03), frame_m, loc=(-W / 2 - 0.004, y, 0), bevel=0.009, segs=3)
        parent(b, root)
    b = rbox(name + '_pwr', (0.02, 0.24, 0.03), frame_m, loc=(W / 2 + 0.004, 0.22, 0), bevel=0.009, segs=3)
    parent(b, root)
    # camera bump on back
    cam = rbox(name + '_cam', (0.3, 0.3, 0.03), back_m, loc=(-0.17, 0.55, -D / 2 - 0.012), bevel=0.07, segs=8)
    parent(cam, root)
    lens_m = simple_mat(name + '_lens', (0.01, 0.01, 0.015), rough=0.05, metal=0.3)
    for (x, y) in ((-0.24, 0.62), (-0.1, 0.48), (-0.24, 0.48)):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.045, depth=0.03, location=(x, y, -D / 2 - 0.03), vertices=32)
        c = bpy.context.active_object
        bpy.ops.object.shade_smooth()
        c.data.materials.append(lens_m)
        parent(c, root)
    return root, scr, tex


# ---------------------------------------------------------------- stage

def studio(color=OLIVE_50, floor=True, world_strength=0.4, world_col=None):
    s = bpy.context.scene
    w = bpy.data.worlds.new('world')
    s.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (*(world_col or color), 1)
    bg.inputs['Strength'].default_value = world_strength
    if floor:
        # cyclorama backdrop
        bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
        f = bpy.context.active_object
        f.name = 'cyc'
        bm = bmesh.new()
        bm.from_mesh(f.data)
        bm.free()
        # build curved sweep via curve bevel instead: simpler - floor + back wall with big bevel
        bpy.data.objects.remove(f)
        me = bpy.data.meshes.new('cyc')
        bm = bmesh.new()
        prof = []
        R = 4.0
        for i in range(0, 17):
            a = math.radians(-90 + i * 90 / 16)
            prof.append((0, -R + R * math.cos(math.radians(i * 90 / 16)) * 0 + (-R * math.sin(a) - R) * 0, 0))
        # explicit profile in (y,z): floor from y=+20 to y=-6, arc radius R to wall, wall up to z=20
        pts = [(20, 0), (-6 + 0, 0)]
        for i in range(1, 16):
            a = math.radians(i * 90 / 16)
            pts.append((-6 - R * math.sin(a), R - R * math.cos(a)))
        pts += [(-6 - R, R), (-6 - R, 20)]
        rows = []
        for x in (-30, 30):
            rows.append([bm.verts.new((x, -y, z)) for y, z in pts])
        for i in range(len(pts) - 1):
            bm.faces.new((rows[0][i], rows[1][i], rows[1][i + 1], rows[0][i + 1]))
        bm.to_mesh(me)
        bm.free()
        cyc = bpy.data.objects.new('cyc', me)
        _link(cyc)
        for p in me.polygons:
            p.use_smooth = True
        cyc.data.materials.append(simple_mat('cycmat', color, rough=0.9))
        cyc.rotation_euler = (0, 0, 0)
        return cyc
    return None


def area_light(name, loc, target=(0, 0, 0), energy=500, size=3, color=(1, 1, 1)):
    ld = bpy.data.lights.new(name, 'AREA')
    ld.energy = energy
    ld.size = size
    ld.color = color
    o = bpy.data.objects.new(name, ld)
    _link(o)
    o.location = loc
    look_at(o, target)
    return o


def look_at(obj, target):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def camera(loc, target, lens=50, dof=None, fstop=2.8):
    cd = bpy.data.cameras.new('cam')
    cd.lens = lens
    cam = bpy.data.objects.new('cam', cd)
    _link(cam)
    cam.location = loc
    look_at(cam, target)
    bpy.context.scene.camera = cam
    if dof:
        cd.dof.use_dof = True
        cd.dof.focus_object = dof if not isinstance(dof, (int, float)) else None
        if isinstance(dof, (int, float)):
            cd.dof.focus_distance = dof
        cd.dof.aperture_fstop = fstop
    return cam


def key(obj, frame, loc=None, rot=None, scale=None, interp=None):
    if loc is not None:
        obj.location = loc
        obj.keyframe_insert('location', frame=frame)
    if rot is not None:
        obj.rotation_euler = rot
        obj.keyframe_insert('rotation_euler', frame=frame)
    if scale is not None:
        obj.scale = scale if hasattr(scale, '__len__') else (scale,) * 3
        obj.keyframe_insert('scale', frame=frame)


def ease_all(obj, interp='BEZIER', easing='EASE_IN_OUT'):
    ad = obj.animation_data
    if not ad or not ad.action:
        return
    for fc in fcurves(ad.action):
        for kp in fc.keyframe_points:
            kp.interpolation = interp
            kp.easing = easing
            kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'


def fcurves(action):
    if hasattr(action, 'fcurves') and len(getattr(action, 'fcurves', [])):
        return action.fcurves
    out = []
    for layer in getattr(action, 'layers', []):
        for strip in layer.strips:
            for cb in strip.channelbags:
                out.extend(cb.fcurves)
    return out


# ---------------------------------------------------------------- extra pieces

def leather_jacket(name, color=(0.006, 0.006, 0.007)):
    mat = bpy.data.materials.new(name + '_leather')
    mat.use_nodes = True
    nt = mat.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = 0.42
    b.inputs['Coat Weight'].default_value = 0.25
    b.inputs['Coat Roughness'].default_value = 0.22
    nz = nt.nodes.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = 26
    nz.inputs['Detail'].default_value = 8
    bm_ = nt.nodes.new('ShaderNodeBump')
    bm_.inputs['Strength'].default_value = 0.25
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    nt.links.new(nz.outputs['Fac'], bm_.inputs['Height'])
    nt.links.new(bm_.outputs['Normal'], b.inputs['Normal'])
    root = tshirt(name, color, long_sleeve=True, collar=False, mat=mat)
    for sx in (1, -1):
        flap = slab(name + f'_lapel{sx}', [(0, 0), (0.2 * sx, 0.03), (0.16 * sx, -0.26), (0.03 * sx, -0.2)][::sx],
                    depth=0.05, bevel=0.02, mat=mat)
        flap.location = (0, 0.0, 0.1)
        flap.rotation_euler = (math.radians(-8), 0, 0)
        parent(flap, root)
    metal = simple_mat(name + '_zip', srgb((0.85, 0.85, 0.83)), rough=0.15, metal=1.0)
    z = rbox(name + '_zip', (0.018, 0.95, 0.012), metal, loc=(0.06, -0.52, 0.105), bevel=0.004, segs=2)
    z.rotation_euler = (0, 0, math.radians(8))
    parent(z, root)
    pull = rbox(name + '_pull', (0.03, 0.07, 0.015), metal, loc=(0.1, -0.2, 0.11), bevel=0.006, segs=2)
    parent(pull, root)
    for sx in (1, -1):
        pz = rbox(name + f'_pz{sx}', (0.012, 0.16, 0.01), metal, loc=(0.2 * sx, -0.66, 0.1), bevel=0.003, segs=1)
        pz.rotation_euler = (0, 0, math.radians(12 * sx))
        parent(pz, root)
    belt = rbox(name + '_belt', (0.62, 0.07, 0.215), mat, loc=(0, -0.95, 0), bevel=0.03)
    parent(belt, root)
    return root


def blazer(name, color):
    mat = fabric_mat(name + '_mat', color, rough=0.7, sheen=0.5, noise_scale=150, bump=0.2)
    root = jacket(name, color, mat=mat, button_col=(0.25, 0.2, 0.15))
    return root


def boot(name, color, sole=(0.08, 0.08, 0.08)):
    """Ankle boot, side profile in XY, toe at +X."""
    root = empty(name + '_root')
    sm = simple_mat(name + '_sole', srgb(sole), rough=0.6)
    um = simple_mat(name + '_upper', color, rough=0.3)
    s = slab(name + '_sole', [(-0.28, 0.0), (0.27, 0.0), (0.31, 0.03), (0.3, 0.06), (-0.29, 0.07)], depth=0.2, bevel=0.025, mat=sm)
    parent(s, root)
    heel = slab(name + '_heel', [(-0.28, -0.02), (-0.14, -0.02), (-0.15, 0.06), (-0.28, 0.06)], depth=0.19, bevel=0.02, mat=sm)
    heel.location = (0, -0.05, 0)
    parent(heel, root)
    up = slab(name + '_up', [(-0.27, 0.05), (0.29, 0.05), (0.3, 0.1), (0.14, 0.17), (0.02, 0.24), (0.0, 0.52), (-0.24, 0.53),
                             (-0.29, 0.2)], depth=0.19, bevel=0.07, segs=5, mat=um)
    parent(up, root)
    return root


def loafer(name, color):
    root = empty(name + '_root')
    sm = simple_mat(name + '_sole', srgb((0.2, 0.13, 0.08)), rough=0.6)
    um = simple_mat(name + '_upper', color, rough=0.28)
    s = slab(name + '_sole', [(-0.3, 0.0), (0.27, 0.0), (0.32, 0.03), (0.3, 0.05), (-0.3, 0.05)], depth=0.21, bevel=0.02, mat=sm)
    parent(s, root)
    up = slab(name + '_up', [(-0.29, 0.04), (0.3, 0.04), (0.31, 0.08), (0.16, 0.15), (0.0, 0.17), (-0.2, 0.17), (-0.3, 0.14)],
              depth=0.2, bevel=0.06, segs=5, mat=um)
    parent(up, root)
    strap = rbox(name + '_strap', (0.05, 0.02, 0.21), simple_mat(name + '_s', tuple(c * 0.7 for c in color), rough=0.3),
                 loc=(0.05, 0.15, 0), bevel=0.008, segs=2)
    parent(strap, root)
    return root


def track_points(named_objs, path, f0, f1, extra=None):
    """Export per-frame 2D pixel positions (top-left origin) of objects' world origins."""
    import json
    from bpy_extras.object_utils import world_to_camera_view
    s = bpy.context.scene
    W = s.render.resolution_x
    H = s.render.resolution_y
    out = {}
    for f in range(f0, f1 + 1):
        s.frame_set(f)
        dg = bpy.context.evaluated_depsgraph_get()
        fr = {}
        for nm, ob in named_objs.items():
            co = world_to_camera_view(s, s.camera, ob.matrix_world.translation)
            fr[nm] = [co.x * W, (1 - co.y) * H, co.z]
        out[f] = fr
    json.dump(out, open(path, 'w'))


def screen_corners(scr, sw=0.69, sh=1.5):
    """Empties at the 4 screen corners (tl,tr,br,bl), parented to the screen object."""
    res = {}
    for nm, (x, y) in {'tl': (-sw / 2, sh / 2), 'tr': (sw / 2, sh / 2), 'br': (sw / 2, -sh / 2), 'bl': (-sw / 2, -sh / 2)}.items():
        e = empty(scr.name + '_' + nm)
        e.parent = scr
        e.location = (x, y, 0.001)
        res[nm] = e
    return res
