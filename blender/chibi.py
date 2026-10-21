# IlluminatED chibi character, built from primitives (no third-party meshes).
import bpy, math, sys
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene
mat = bpy.data.materials.new("skin"); mat.use_nodes = True
mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (1.0, 0.86, 0.62, 1)
mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.8

def finish(o, flat=True):
    o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = not flat
    return o
def sphere(loc, r, seg=16, ring=10, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=ring, radius=r, location=loc)
    o = bpy.context.object; o.scale = scale; return finish(o)
def limb(a, b, r1, r2, seg=10):
    a, b = Vector(a), Vector(b); d = b - a
    bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r1, radius2=r2, depth=d.length, location=(a + b) / 2)
    o = bpy.context.object; o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d); return finish(o)

# Head: an egg, wider at the crown, the body's full height again.
head = sphere((0, 0, 0.80), 0.215, 18, 12, (1.06, 1.0, 1.08))
for v in head.data.vertices:  # taper toward the chin
    t = (v.co.z + 0.215) / 0.43
    k = 0.86 + 0.14 * min(1, t * 1.6)
    v.co.x *= k; v.co.y *= k
for s in (1, -1): sphere((s * 0.205, 0, 0.77), 0.04, 10, 6, (0.5, 0.8, 1))  # ears
limb((0, 0, 0.62), (0, 0, 0.55), 0.04, 0.045)  # neck
torso = sphere((0, 0, 0.42), 0.12, 14, 10, (1, 0.85, 1.15))  # pear torso
for v in torso.data.vertices:
    t = (v.co.z + 0.12) / 0.24
    v.co.x *= 1.12 - 0.3 * t; v.co.y *= 1.08 - 0.22 * t
for s in (1, -1):
    limb((s * 0.04, 0, 0.55), (s * 0.27, 0, 0.42), 0.045, 0.02)  # arms angled down
    sphere((s * 0.285, 0, 0.41), 0.036, 10, 8)                      # ball hands
    limb((s * 0.05, 0, 0.33), (s * 0.05, 0, 0.05), 0.05, 0.032)   # legs
    sphere((s * 0.05, 0.012, 0.035), 0.042, 10, 8, (0.95, 1.25, 0.8))  # feet

out = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else None
# Studio render like the reference: soft grey backdrop, front three-quarter-ish.
w = bpy.data.worlds.new("w"); S.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.55, 0.56, 1)
bpy.ops.object.camera_add(location=(0, -3.0, 0.55), rotation=(math.radians(90), 0, 0))
S.camera = bpy.context.object; S.camera.data.lens = 85
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(50), math.radians(-20), math.radians(-25)))
bpy.context.object.data.energy = 3
S.render.engine = 'CYCLES'; S.cycles.samples = 48; S.cycles.device = 'CPU'
S.render.resolution_x, S.render.resolution_y = 960, 960
S.render.filepath = out; bpy.ops.render.render(write_still=True)
