"""IlluminatED London double-decker (original model). Front is +X, Z up in Blender.
  python3 art/blender/bus.py export          -> public/world3d/bus.glb
  python3 art/blender/bus.py render out.png
"""
import bpy, math, sys
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
COL = {"red": (0.55, 0.012, 0.018), "silver": (0.86, 0.87, 0.88), "glass": (0.04, 0.05, 0.07), "rubber": (0.06, 0.06, 0.07),
       "hub": (0.75, 0.76, 0.78), "lamp": (1, 0.95, 0.8), "tail": (0.85, 0.08, 0.06), "amber": (1, 0.6, 0.1), "grille": (0.2, 0.2, 0.22),
       "yellow": (1, 0.82, 0.1), "seat": (0.15, 0.25, 0.65)}
M = {}
def mat(n):
    if n not in M:
        m = bpy.data.materials.new(n); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (*COL[n], 1)
        b.inputs["Roughness"].default_value = 0.08 if n == "glass" else 0.35 if n in ("red", "silver") else 0.7
        M[n] = m
    return M[n]
objs = []
KZ, KY = 0.42, 0.635  # laid out at a roomy scale, built at true London proportions
def rbox(n, x0, y0, z0, x1, y1, z1, bevel=0.0, segs=3):
    y0, y1, z0, z1, bevel = y0 * KY, y1 * KY, z0 * KZ, z1 * KZ, bevel * 0.45
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    o = bpy.context.object; o.scale = (x1 - x0, y1 - y0, z1 - z0)
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        m = o.modifiers.new("b", "BEVEL"); m.width = bevel; m.segments = segs; m.limit_method = "NONE"
        bpy.ops.object.modifier_apply(modifier="b")
    o.data.materials.append(mat(n)); bpy.ops.object.shade_smooth() if bevel else None
    objs.append(o); return o
def cyl(n, r, d, loc, axis="Y", v=20):
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=d, location=loc)
    o = bpy.context.object
    if axis == "Y": o.rotation_euler = (math.pi / 2, 0, 0)
    o.data.materials.append(mat(n)); bpy.ops.object.shade_smooth(); objs.append(o); return o

L, W, H = 2.8, 1.04, 2.72
x0, x1 = -L / 2, L / 2
# Body: one rounded red shell, silver roof cap.
rbox("red", x0, -W / 2, 0.22, x1, W / 2, H - 0.1, bevel=0.12, segs=4)
rbox("silver", x0 + 0.03, -W / 2 + 0.02, H - 0.2, x1 - 0.03, W / 2 - 0.02, H, bevel=0.1, segs=4)
# Black glazing bands, inset flush with the sides (upper deck and lower deck).
for z0, z1, xa, xb in ((1.6, 2.32, x0 + 0.12, x1 - 0.04), (0.95, 1.4, x0 + 0.5, x1 - 0.06)):
    rbox("glass", xa, -W / 2 - 0.012, z0, xb, W / 2 + 0.012, z1, bevel=0.04)
# Window pillars: thin red dividers over the glass.
for z0, z1, xs in ((1.6, 2.32, [-0.95, -0.45, 0.05, 0.55]), (0.95, 1.4, [-0.1, 0.4])):
    for x in xs:
        for s in (-1, 1): rbox("grille", x, s * (W / 2 + 0.006) - 0.012, z0, x + 0.025, s * (W / 2 + 0.006) + 0.012, z1)
# Front: big windscreen wrapping both decks, centre pillar, destination blind recess.
rbox("glass", x1 - 0.07, -W / 2 + 0.07, 0.95, x1 + 0.012, W / 2 - 0.07, 2.32, bevel=0.03)
rbox("red", x1 - 0.02, -0.02, 0.95, x1 + 0.02, 0.02, 1.5)
rbox("red", x1 - 0.03, -W / 2 + 0.07, 1.4, x1 + 0.02, W / 2 - 0.07, 1.6)
# Rear: small upper window, route box, engine grille.
rbox("glass", x0 - 0.012, -0.32, 1.85, x0 + 0.05, 0.32, 2.3, bevel=0.03)
rbox("glass", x0 - 0.012, -0.3, 1.45, x0 + 0.05, 0.1, 1.68, bevel=0.02)
rbox("grille", x0 - 0.012, -0.36, 0.45, x0 + 0.05, -0.02, 0.9, bevel=0.02)
rbox("silver", x0 - 0.02, -0.4, 0.3, x0 + 0.05, 0.4, 0.38, bevel=0.02)
# Doors (front and centre, on the kerb side = +Y faces the pavement on UK roads? kerb is left: -Y when front is +X).
for xa, xb in ((x1 - 0.48, x1 - 0.12), (-0.55, -0.15)):
    rbox("glass", xa, -W / 2 - 0.016, 0.3, xb, -W / 2 + 0.02, 1.4, bevel=0.02)
    rbox("red", (xa + xb) / 2 - 0.012, -W / 2 - 0.02, 0.3, (xa + xb) / 2 + 0.012, -W / 2 + 0.02, 1.4)
# Lights.
for s in (-1, 1):
    rbox("lamp", x1 - 0.01, s * 0.36 - 0.07, 0.42, x1 + 0.02, s * 0.36 + 0.07, 0.55, bevel=0.02)
    rbox("tail", x0 - 0.02, s * 0.44 - 0.04, 0.4, x0 + 0.01, s * 0.44 + 0.04, 0.95, bevel=0.015)
    rbox("amber", x0 - 0.02, s * 0.44 - 0.04, 0.3, x0 + 0.01, s * 0.44 + 0.04, 0.38, bevel=0.01)
    # Mirrors on stalks.
    rbox("rubber", x1 - 0.05, s * W / 2, 1.42, x1 + 0.08, s * (W / 2 + 0.16), 1.46)
    rbox("rubber", x1 + 0.05, s * (W / 2 + 0.13) - 0.03, 1.2, x1 + 0.09, s * (W / 2 + 0.13) + 0.03, 1.46, bevel=0.01)
# Wheels in arches.
for x in (x1 - 0.55, x0 + 0.6):
    for s in (-1, 1):
        cyl("rubber", 0.15, 0.1, (x, s * (W / 2 - 0.06) * KY, 0.15))
        cyl("hub", 0.085, 0.104, (x, s * (W / 2 - 0.05) * KY, 0.15))
        cyl("rubber", 0.03, 0.11, (x, s * (W / 2 - 0.04) * KY, 0.15), v=10)
# A couple of seats visible through the glass.
for x in (-0.8, -0.3, 0.2, 0.7):
    rbox("seat", x, -0.4, 1.62, x + 0.18, -0.1, 1.85)
    rbox("seat", x, 0.1, 1.62, x + 0.18, 0.4, 1.85)

bpy.ops.object.select_all(action="SELECT")
bpy.context.view_layer.objects.active = objs[0]
bpy.ops.object.join(); bus = bpy.context.object; bus.name = "bus"

if sys.argv[1] == "export":
    bpy.ops.export_scene.gltf(filepath="/home/claude/illuminated/public/world3d/bus.glb", export_format="GLB", export_yup=True, export_apply=True)
else:
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 48; sc.cycles.device = "CPU"
    sc.render.resolution_x = 1200; sc.render.resolution_y = 800
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.75, 0.8, 0.9, 1)
    bpy.ops.mesh.primitive_plane_add(size=30); bpy.context.object.data.materials.append(mat("grille"))
    bpy.ops.object.light_add(type="SUN", location=(2, -3, 5)); s = bpy.context.object; s.data.energy = 3.5
    s.rotation_euler = (math.radians(40), 0, math.radians(30))
    cl = Vector((-3.4, -3.6, 2.2))
    bpy.ops.object.camera_add(location=cl); cam = bpy.context.object; cam.data.lens = 45
    cam.rotation_euler = (Vector((0, 0, 0.55)) - cl).to_track_quat("-Z", "Y").to_euler(); sc.camera = cam
    sc.view_settings.view_transform = "Standard"; sc.render.filepath = sys.argv[2]
    bpy.ops.render.render(write_still=True)
