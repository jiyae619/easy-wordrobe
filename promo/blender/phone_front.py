from common import *
s = setup(1, 1)
s.cycles.samples = 48
s.render.film_transparent = True
s.render.resolution_x, s.render.resolution_y = 800, 1620
w = bpy.data.worlds.new('w'); s.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.9, 0.9, 0.9, 1)
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.8
area_light('key', (-3, -5, 4), (0, 0, 0), energy=300, size=4)
area_light('rim', (3, -2, -3), (0, 0, 0), energy=200, size=3)
inner, scr, tex = phone('ph')
blank_screen(tex)
# screen: pure holdout-ish black so the compositor can key it
ph = upright(inner)
cd = bpy.data.cameras.new('c'); cd.type = 'ORTHO'; cd.ortho_scale = 1.62
cam = bpy.data.objects.new('c', cd); s.collection.objects.link(cam); cam.location = (0, -5, 0); cam.rotation_euler = (math.pi / 2, 0, 0)
s.camera = cam
s.render.filepath = os.path.join(RENDERS, 'phone_front.png')
bpy.ops.render.render(write_still=True)
