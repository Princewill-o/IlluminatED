"""IlluminatED chibi character kit (original design).

Builds one rigid-rigged character with every wardrobe piece as a separate,
switchable mesh, and exports public/world3d/chibi.glb. Each mesh carries glTF
extras {slot, variant} so the game can show one variant per slot and recolour
it by material name (skin, hair, top, top2, bottom, shoes, sole, white, dark).

  python3 art/blender/chibi.py export            -> public/world3d/chibi.glb
  python3 art/blender/chibi.py render out.png "hair=afro top=hoodie ..." [yaw]
"""
import bpy, bmesh, math, sys, random
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
MATS = {}
PALETTE = {"skin": (0.98, 0.86, 0.66), "hair": (0.16, 0.1, 0.07), "top": (0.36, 0.34, 0.78), "top2": (0.96, 0.96, 0.96),
           "bottom": (0.22, 0.3, 0.55), "shoes": (0.95, 0.95, 0.95), "sole": (0.25, 0.25, 0.28), "white": (1, 1, 1), "dark": (0.08, 0.08, 0.1),
           "accent": (1.0, 0.6, 0.1)}
def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]; c = PALETTE[name]
        b.inputs["Base Color"].default_value = (*c, 1); b.inputs["Roughness"].default_value = 0.85
        MATS[name] = m
    return MATS[name]

# ---------- rig: plain pivot nodes (rigid parts, animated in the game) ----------
def empty(name, loc, parent=None):
    o = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(o)
    o.location = loc
    if parent: o.parent = parent; o.location = Vector(loc) - parent.matrix_world.translation
    bpy.context.view_layer.update(); return o
ROOT = empty("root", (0, 0, 0))
TORSO = empty("torso", (0, 0, 0.22), ROOT)
HEAD = empty("head", (0, 0, 0.47), TORSO)
SH = 0.43; HIP = 0.22
ARM = {1: empty("arm-left", (0.07, 0, SH), TORSO), -1: empty("arm-right", (-0.07, 0, SH), TORSO)}
LEG = {1: empty("leg-left", (0.045, 0, HIP), ROOT), -1: empty("leg-right", (-0.045, 0, HIP), ROOT)}
ARM_ANG = math.radians(32); ARM_L = 0.22

def arm_dir(sx): return Vector((sx * math.cos(ARM_ANG), 0, -math.sin(ARM_ANG)))

# ---------- mesh helpers ----------
pieces = []  # (obj, slot, variant, parent)
def put(o, material, parent, slot, variant):
    o.data.materials.clear(); o.data.materials.append(mat(material))
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.object.shade_flat(); o.select_set(False)
    pieces.append((o, slot, variant, parent)); return o
def sphere(r, seg, ring, loc, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=ring, radius=r, location=loc)
    o = bpy.context.object
    for v in o.data.vertices: v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]))
    return o
def cone(r1, r2, d, seg, loc, direction=Vector((0, 0, 1))):
    bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r1, radius2=r2, depth=d, location=loc)
    o = bpy.context.object; o.rotation_euler = Vector((0, 0, 1)).rotation_difference(direction).to_euler(); return o
def box(size, loc, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.scale = size; o.rotation_euler = rot; return o
def keep(o, cond):
    """Delete vertices (world space) that fail cond; used to cut hair caps and shells."""
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    dead = [v for v in bm.verts if not cond(o.matrix_world @ v.co)]
    bmesh.ops.delete(bm, geom=dead, context="VERTS"); bm.to_mesh(o.data); bm.free()
    o.data.update(); return o
def join(objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); o = bpy.context.object
    o.select_set(False); return o
def solidify(o, t=0.006):
    m = o.modifiers.new("s", "SOLIDIFY"); m.thickness = t; m.offset = 1
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="s"); return o

# ---------- the body (always visible) ----------
HC = Vector((0, 0, 0.70)); HR = 0.21
def head_mesh(r=HR, seg=16, ring=12):
    h = sphere(r, seg, ring, HC, (1, 0.95, 1.08))
    for v in h.data.vertices:
        z = (v.co.z) / r
        s = 1 - 0.12 * max(0, -z) ** 1.5
        v.co.x *= s; v.co.y *= s
    return h
put(head_mesh(), "skin", HEAD, "body", "head")
for sx in (1, -1):
    put(sphere(0.045, 8, 6, (sx * 0.205, 0.0, 0.66), (0.55, 0.9, 1.1)), "skin", HEAD, "body", "ear")
put(cone(0.045, 0.05, 0.08, 10, (0, 0, 0.48)), "skin", TORSO, "body", "neck")

def torso_mesh(grow=0.0, seg=12, ring=10):
    t = sphere(0.12 + grow, seg, ring, (0, 0, 0.33), (0.84, 0.74, 1.18))
    for v in t.data.vertices:
        z = v.co.z / (0.12 + grow)
        s = 1 - 0.26 * max(0, z) ** 1.4
        v.co.x *= s; v.co.y *= s
    return t
put(torso_mesh(), "skin", TORSO, "body", "torso")

def arm_segment(sx, r1, r2, a, b):
    """A cylinder along the arm from a to b (fractions of the arm length)."""
    d = arm_dir(sx); s = ARM["l" if 0 else sx].matrix_world.translation
    p0 = s + d * (ARM_L * a); p1 = s + d * (ARM_L * b)
    return cone(r1, r2, (p1 - p0).length, 8, (p0 + p1) / 2, d)
for sx in (1, -1):
    put(arm_segment(sx, 0.028, 0.022, -0.05, 1.0), "skin", ARM[sx], "body", "arm")
    put(sphere(0.035, 10, 8, ARM[sx].matrix_world.translation + arm_dir(sx) * (ARM_L + 0.02)), "skin", ARM[sx], "body", "hand")
    put(cone(0.04, 0.034, 0.2, 10, (sx * 0.045, 0, 0.13)), "skin", LEG[sx], "body", "leg")

# ---------- tops ----------
def top_shell(grow=0.012, hem=0.19):
    t = torso_mesh(grow, 14, 12); return keep(t, lambda c: c.z > hem and c.z < 0.465)
def sleeves(variant, long, r=0.036, material="top", parent_slot="top"):
    for sx in (1, -1):
        s = arm_segment(sx, r, r * (0.85 if long else 0.95), -0.1, 0.95 if long else 0.42)
        put(s, material, ARM[sx], parent_slot, variant)
def top(variant, long=False, hem=0.19, extras=()):
    put(top_shell(hem=hem), "top", TORSO, "top", variant); sleeves(variant, long)
    for o, m in extras: put(o, m, TORSO, "top", variant)
top("tee")
top("long", long=True)
top("hoodie", long=True, extras=[
    (keep(solidify(sphere(0.085, 12, 8, (0, 0.07, 0.47), (1.25, 1, 0.8))), lambda c: c.y > 0.02), "top"),   # hood, behind the neck
    (box((0.11, 0.02, 0.05), (0, -0.098, 0.27)), "top"),                                                 # front pocket
    (cone(0.004, 0.004, 0.07, 4, (0.02, -0.105, 0.41)), "white"), (cone(0.004, 0.004, 0.07, 4, (-0.02, -0.105, 0.41)), "white")])
top("jacket", long=True, extras=[
    (box((0.05, 0.02, 0.2), (0, -0.095, 0.33)), "top2"),                                                  # shirt down the open front
    (box((0.012, 0.02, 0.1), (0.035, -0.1, 0.4), (0, 0.4, 0)), "top"), (box((0.012, 0.02, 0.1), (-0.035, -0.1, 0.4), (0, -0.4, 0)), "top")])
top("coat", long=True, hem=0.1, extras=[(box((0.05, 0.02, 0.2), (0, -0.095, 0.33)), "top2")])
top("vest", extras=[(box((0.2, 0.2, 0.025), (0, 0, z)), "accent") for z in (0.27, 0.36)])
top("stripes", extras=[(keep(torso_mesh(0.016, 24, 40), lambda c, z=z: abs(c.z - z) < 0.017), "top2") for z in (0.25, 0.31, 0.37, 0.43)])
top("apron", extras=[(box((0.15, 0.015, 0.2), (0, -0.1, 0.3)), "top2"), (box((0.1, 0.015, 0.06), (0, -0.088, 0.43)), "top2")])
top("suitspace", long=True, extras=[(cone(0.07, 0.07, 0.03, 14, (0, 0, 0.465)), "top2"), (box((0.07, 0.03, 0.05), (0, -0.1, 0.36)), "accent")])
top("jersey", extras=[(box((0.05, 0.02, 0.06), (0, -0.1, 0.36)), "top2")])
cape = keep(solidify(cone(0.09, 0.2, 0.36, 16, (0, 0.03, 0.29)), 0.008), lambda c: c.y > 0.02)
put(cape, "accent", TORSO, "extra", "cape")

# ---------- bottoms ----------
def bottoms(variant, length, cuff=False, extras=()):
    seat = keep(torso_mesh(0.014, 14, 12), lambda c: c.z < 0.235)
    put(seat, "bottom", TORSO, "bottom", variant)
    for sx in (1, -1):
        z0 = HIP + 0.01; z1 = HIP - length
        put(cone(0.046, 0.042 if length > 0.12 else 0.046, length + 0.01, 10, (sx * 0.045, 0, (z0 + z1) / 2)), "bottom", LEG[sx], "bottom", variant)
        if cuff: put(cone(0.04, 0.04, 0.025, 10, (sx * 0.045, 0, z1 + 0.012)), "bottom", LEG[sx], "bottom", variant)
    for o, m, p in extras: put(o, m, p, "bottom", variant)
bottoms("trousers", 0.165)
bottoms("joggers", 0.165, cuff=True, extras=[(box((0.006, 0.014, 0.15), (sx * 0.089, 0, 0.13)), "top2", LEG[sx]) for sx in (1, -1)])
bottoms("shorts", 0.08)
bottoms("cargo", 0.165, extras=[(box((0.02, 0.05, 0.045), (sx * 0.09, 0, 0.13)), "bottom", LEG[sx]) for sx in (1, -1)])
put(keep(torso_mesh(0.014, 14, 12), lambda c: c.z < 0.235), "bottom", TORSO, "bottom", "skirt")
put(cone(0.11, 0.15, 0.09, 14, (0, 0, 0.18)), "bottom", TORSO, "bottom", "skirt")

# ---------- shoes ----------
def shoe(variant, h=0.06, toe=1.3, sole=True, extras=lambda sx: []):
    for sx in (1, -1):
        x = sx * 0.045
        put(sphere(0.043, 10, 6, (x, -0.012, 0.03), (1.05, toe, 0.62 * h / 0.05)), "shoes", LEG[sx], "shoes", variant)
        if sole: put(box((0.085, 0.12, 0.014), (x, -0.012, 0.007)), "sole", LEG[sx], "shoes", variant)
        for o, m in extras(sx): put(o, m, LEG[sx], "shoes", variant)
shoe("trainers", extras=lambda sx: [(box((0.006, 0.05, 0.012), (sx * 0.045 + sx * 0.04, -0.01, 0.03)), "white")])
shoe("hightops", h=0.07, extras=lambda sx: [(cone(0.046, 0.046, 0.05, 10, (sx * 0.045, 0, 0.065)), "shoes"), (cone(0.047, 0.047, 0.008, 10, (sx * 0.045, 0, 0.06)), "white")])
shoe("boots", h=0.07, toe=1.2, extras=lambda sx: [(cone(0.048, 0.046, 0.08, 10, (sx * 0.045, 0, 0.08)), "shoes")])
shoe("smart", h=0.045, toe=1.45)
shoe("sliders", h=0.03, extras=lambda sx: [(cone(0.042, 0.042, 0.07, 10, (sx * 0.045, 0, 0.06)), "white")])
shoe("skates", extras=lambda sx: [(cone(0.012, 0.012, 0.012, 8, (sx * 0.045 + dx, y, -0.006), Vector((1, 0, 0))), "accent") for y in (-0.05, 0.03) for dx in (-0.02, 0.02)])
shoe("rocket", h=0.08, extras=lambda sx: [(cone(0.03, 0.0, 0.05, 8, (sx * 0.045, 0.01, -0.02), Vector((0, 0, -1))), "accent")])

# ---------- hair ----------
def cap(r=HR + 0.016, front=0.78, back=0.6, sides=None):
    h = head_mesh(r, 18, 14)
    def ok(c):
        if c.y < -0.05: return c.z > front                              # fringe line at the front
        if c.y < 0.08: return c.z > (sides if sides is not None else (front + back) / 2)
        return c.z > back
    return keep(h, ok)
def hair(variant, objs):
    for o in objs: put(o, "hair", HEAD, "hair", variant)
hair("short", [cap()])
hair("buzz", [cap(HR + 0.006, 0.8, 0.62)])
hair("bob", [cap(HR + 0.02, 0.76, 0.56, 0.56)])
hair("long", [cap(HR + 0.02, 0.76, 0.56, 0.5), keep(sphere(0.2, 14, 10, (0, 0.06, 0.55), (1.05, 0.7, 1.4)), lambda c: c.y > 0.03)])
hair("ponytail", [cap(), sphere(0.06, 10, 8, (0, 0.2, 0.62), (0.8, 0.9, 1.6)), sphere(0.03, 8, 6, (0, 0.21, 0.74))])
hair("buns", [cap(), sphere(0.07, 10, 8, (0.12, 0.02, 0.93)), sphere(0.07, 10, 8, (-0.12, 0.02, 0.93))])
random.seed(4)
curls = []
for i in range(46):
    th = random.uniform(0, 2 * math.pi); ph = random.uniform(0.0, 1.25)
    d = Vector((math.sin(ph) * math.cos(th), math.sin(ph) * math.sin(th), math.cos(ph)))
    p = HC + Vector((d.x * 0.22, d.y * 0.21, d.z * 0.24))
    if p.y < -0.08 and p.z < 0.8: continue
    curls.append(sphere(0.045, 8, 6, p))
hair("curly", [cap(HR + 0.01, 0.78, 0.6)] + curls)
hair("afro", [keep(sphere(0.29, 18, 14, (0, 0.03, 0.8)), lambda c: not (c.y < -0.05 and c.z < 0.78))])
hair("quiff", [cap(HR + 0.01, 0.8, 0.6), sphere(0.09, 12, 8, (0, -0.12, 0.92), (1.2, 1.1, 0.7))])
hair("braids", [cap(HR + 0.008, 0.79, 0.6)] + [cone(0.018, 0.012, 0.3, 6, (x, 0.17, 0.6), Vector((0, 0.25, 1))) for x in (-0.12, -0.06, 0, 0.06, 0.12)])
spikes = [cone(0.05, 0.0, 0.12, 6, HC + d * 0.22, d) for d in [Vector((math.sin(a) * math.cos(b), math.sin(a) * math.sin(b), math.cos(a))).normalized() for a in (0.2, 0.7, 1.1) for b in [k * 1.05 + a for k in range(6)]] if not (d.y < -0.4 and d.z < 0.6)]
hair("spiky", [cap()] + spikes)
hair("mohawk", [cap(HR + 0.004, 0.84, 0.7)] + [cone(0.045, 0.0, 0.13, 4, HC + Vector((0, math.sin(a) * 0.22, math.cos(a) * 0.235)), Vector((0, math.sin(a), math.cos(a)))) for a in (-0.6, -0.25, 0.1, 0.45, 0.8, 1.15)])

# ---------- parent everything, tag it ----------
for o, slot, variant, parent in pieces:
    mw = o.matrix_world.copy(); o.parent = parent; o.matrix_world = mw
    o["slot"] = slot; o["variant"] = variant
    o.name = f"{slot}-{variant}"

def apply_look(look):
    for o, slot, variant, _ in pieces:
        o.hide_render = not (slot == "body" or look.get(slot) == variant or (slot == "extra" and look.get("extra") == variant))

if sys.argv[1] == "export":
    bpy.ops.export_scene.gltf(filepath="/home/claude/illuminated/public/world3d/chibi.glb", export_format="GLB", export_extras=True,
                              export_apply=True, export_animations=False, export_yup=True, export_materials="EXPORT")
    print("exported", len(pieces))
else:
    out, spec = sys.argv[2], dict(kv.split("=") for kv in sys.argv[3].split())
    cols = {k[4:]: v for k, v in spec.items() if k.startswith("col-")}
    for k, hexv in cols.items():
        c = tuple(int(hexv[i:i + 2], 16) / 255 for i in (0, 2, 4))
        mat(k).node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*[x ** 2.2 for x in c], 1)
    apply_look(spec)
    # Thumbnail-only face (in the game the drawn face texture is used instead).
    face_mat = bpy.data.materials.new("face"); face_mat.use_nodes = True
    face_mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.04, 0.03, 0.03, 1)
    for sx in (1, -1):
        e = sphere(0.026, 12, 8, (sx * 0.075, -0.195, 0.67), (0.8, 0.5, 1.25)); e.data.materials.append(face_mat)
        hl = sphere(0.008, 8, 6, (sx * 0.075 + 0.006, -0.209, 0.684)); hl.data.materials.append(mat("white"))
        ck = sphere(0.022, 10, 6, (sx * 0.12, -0.18, 0.61), (1, 0.4, 0.6)); ck.data.materials.append(mat("accent"))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.026, minor_radius=0.006, location=(0, -0.2, 0.6), rotation=(math.pi / 2, 0, 0))
    m = bpy.context.object; m.data.materials.append(face_mat)
    keep(m, lambda c: c.z < 0.6)
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = int(spec.get("samples", 32)); sc.render.film_transparent = spec.get("transparent") == "1"; sc.cycles.device = "CPU"
    sc.render.resolution_x = int(spec.get("w", 640)); sc.render.resolution_y = int(spec.get("h", 720))
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.55, 0.58, 1)
    bpy.ops.object.light_add(type="AREA", location=(1.2, -2.2, 2.0)); l = bpy.context.object; l.data.energy = 180; l.data.size = 2
    l.rotation_euler = (Vector((0, 0, 0.5)) - l.location).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.light_add(type="SUN", location=(0, 0, 3)); bpy.context.object.data.energy = 1.5
    yaw = math.radians(float(sys.argv[4]) if len(sys.argv) > 4 else 25)
    cl = Vector((math.sin(yaw) * 3.4, -math.cos(yaw) * 3.4, 0.7))
    bpy.ops.object.camera_add(location=cl); cam = bpy.context.object; cam.data.lens = 55
    cam.rotation_euler = (Vector((0, 0, 0.52)) - cl).to_track_quat("-Z", "Y").to_euler(); sc.camera = cam
    sc.view_settings.view_transform = "Standard"; sc.render.filepath = out
    bpy.ops.render.render(write_still=True)
