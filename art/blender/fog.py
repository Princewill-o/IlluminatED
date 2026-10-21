"""The Fog: Hero Rush's villain (original design), a grumpy storm cloud.
  python3 art/blender/fog.py out.png [hurt]
"""
import bpy, math, sys, random
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
hurt = len(sys.argv) > 2 and sys.argv[2] == "hurt"
def mat(n, c, rough=0.8, emit=0):
    m = bpy.data.materials.new(n); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*c, 1); b.inputs["Roughness"].default_value = rough
    if emit: b.inputs["Emission Color"].default_value = (*c, 1); b.inputs["Emission Strength"].default_value = emit
    return m
body = mat("body", (0.16, 0.14, 0.26) if not hurt else (0.32, 0.26, 0.42))
dark = mat("dark", (0.06, 0.05, 0.1))
eye = mat("eye", (1, 0.85, 0.2), 0.3, 2.5)
white = mat("white", (1, 1, 1))
def sphere(r, loc, m, scale=(1, 1, 1), seg=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r, location=loc)
    o = bpy.context.object; o.scale = scale; o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o
random.seed(7)
# A lumpy cloud body from overlapping puffs.
for i in range(18):
    a = i / 18 * math.pi * 2
    sphere(0.55 + random.random() * 0.25, (math.cos(a) * 0.9, random.uniform(-0.2, 0.2), 0.9 + math.sin(a) * 0.55), body)
sphere(1.1, (0, 0, 0.95), body, (1.2, 0.8, 0.85))
# Angry glowing eyes with heavy brows.
for sx in (1, -1):
    sphere(0.2, (sx * 0.38, -0.82, 1.1), eye, (1, 0.5, 0.75 if not hurt else 0.35))
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sx * 0.38, -0.92, 1.36), rotation=(0, sx * (0.45 if not hurt else -0.3), 0))
    b = bpy.context.object; b.scale = (0.42, 0.08, 0.09); b.data.materials.append(dark)
# Jagged frown, or a wobbly "ouch" when hurt.
bpy.ops.mesh.primitive_torus_add(major_radius=0.32, minor_radius=0.05, location=(0, -0.9, 0.62 if not hurt else 0.7), rotation=(math.pi / 2, 0, 0))
m = bpy.context.object; m.data.materials.append(dark)
bm_keep = [v for v in m.data.vertices]
for v in m.data.vertices:
    if (v.co.y < 0) != hurt: v.co.y *= 0.2  # flatten one side: frown, or open "o" when hurt
# Little lightning bolts orbiting.
for i, (x, z) in enumerate(((-1.9, 1.6), (1.9, 1.4), (-1.6, 0.2), (1.7, 0.1))):
    for k in range(3):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x + (k - 1) * 0.06 * (1 if i % 2 else -1), -0.3, z - k * 0.18), rotation=(0, 0.5 if k % 2 else -0.5, 0))
        c = bpy.context.object; c.scale = (0.06, 0.06, 0.22); c.data.materials.append(eye)

sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 32; sc.cycles.device = "CPU"
sc.render.resolution_x = 900; sc.render.resolution_y = 700; sc.render.film_transparent = True
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.6, 0.6, 0.7, 1)
bpy.ops.object.light_add(type="AREA", location=(2, -4, 4)); l = bpy.context.object; l.data.energy = 900; l.data.size = 4
l.rotation_euler = (Vector((0, 0, 1)) - l.location).to_track_quat("-Z", "Y").to_euler()
bpy.ops.object.light_add(type="SUN", location=(0, 0, 5)); bpy.context.object.data.energy = 1.2
cl = Vector((0.6, -7.2, 1.6))
bpy.ops.object.camera_add(location=cl); cam = bpy.context.object; cam.data.lens = 45
cam.rotation_euler = (Vector((0, 0, 0.95)) - cl).to_track_quat("-Z", "Y").to_euler(); sc.camera = cam
sc.view_settings.view_transform = "Standard"; sc.render.filepath = sys.argv[1]
bpy.ops.render.render(write_still=True)
