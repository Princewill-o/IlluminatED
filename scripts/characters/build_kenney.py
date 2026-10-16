"""
IlluminatED characters v3: Kenney's CC0 mini-characters (assets/kenney/mini-characters)
split into tintable layers, plus our Locker items re-attached to the Kenney rig.

Every Kenney character shares one 7-bone rig, so any head works with any body.
Each head is split into skin and hair; each body into skin (upper/lower), top,
bottom, shoes and untinted detail (ties, badges). Layers are rendered light grey
(keeping Kenney's two-tone shading) and tinted in the browser, so every colour
works. Eyes, brows and mouths stay 2D (drawn by the app) for expressions.

Run:  blender -b --python build_kenney.py -- <out_dir> <layer,layer,...|all|list>
"""
import bpy, math, sys, json, os
import numpy as np
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1:]
OUT = ARGS[0]
WANT = ARGS[1] if len(ARGS) > 1 else "all"
os.makedirs(OUT, exist_ok=True)

FRAME = 176          # final px per frame
SS = 2               # supersampling
RES = FRAME * SS
ORTHO = 2.75
ELEV = math.radians(24)
CENTER = Vector((0.28, 0.0, 1.06))

KEN = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../assets/kenney/mini-characters"))
# ── Animation plan ────────────────────────────────────────────────────────
CLIPS = [  # (direction, clip, frames)
    ("S", "idle", 4), ("S", "walk", 8),
    ("N", "idle", 4), ("N", "walk", 8),
    ("E", "idle", 4), ("E", "walk", 8),
    ("S", "wave", 6),
]
FRAMES = [(d, c, i, n) for d, c, n in CLIPS for i in range(n)]
if os.environ.get("ONLY_FRAMES"):
    FRAMES = [FRAMES[int(k)] for k in os.environ["ONLY_FRAMES"].split(",")]

# ── Scene ─────────────────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.render.resolution_x = sc.render.resolution_y = RES
sc.render.film_transparent = True
sc.display.render_aa = "OFF"
sc.render.dither_intensity = 0.0
sc.view_settings.view_transform = "Standard"
sh = sc.display.shading
sh.show_specular_highlight = False
sh.show_object_outline = False
sh.show_cavity = False

cam_data = bpy.data.cameras.new("cam")
cam_data.type = "ORTHO"
cam_data.ortho_scale = ORTHO
cam = bpy.data.objects.new("cam", cam_data)
sc.collection.objects.link(cam)
d = Vector((0, -math.cos(ELEV), math.sin(ELEV)))
cam.location = CENTER + d * 20
cam.rotation_euler = (math.radians(90) - ELEV, 0, 0)
sc.camera = cam

def srgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))

def empty(name, parent=None, loc=(0, 0, 0)):
    o = bpy.data.objects.new(name, None)
    sc.collection.objects.link(o)
    if parent:
        o.parent = parent
    o.location = loc
    return o

# ── Rig ───────────────────────────────────────────────────────────────────
root = empty("root")
pet_root = empty("pet_root", None, (0.86, 0.32, 0))
pelvis = empty("pelvis", root, (0, 0, 0.52))
chest = empty("chest", pelvis, (0, 0, 0))
neck = empty("neck", chest, (0, 0, 0.5))
head = empty("head", neck, (0, 0, 0))
shL = empty("shL", chest, (0.3, 0, 0.42))
shR = empty("shR", chest, (-0.3, 0, 0.42))
hipL = empty("hipL", pelvis, (0.13, 0, 0))
hipR = empty("hipR", pelvis, (-0.13, 0, 0))
handR = empty("handR", shR, (0, 0, -0.42))
handL = empty("handL", shL, (0, 0, -0.42))
face_anchor = empty("face_anchor", head, (0, -0.47, 0.42))
head_centre = empty("head_centre", head, (0, 0, 0.42))
chest_anchor = empty("chest_anchor", chest, (0, -0.25, 0.22))

# ── Mesh helpers ──────────────────────────────────────────────────────────
LAYER_OF = {}    # object name -> layer id
CURRENT = None   # layer id being built
ROLE = {}        # object name -> "body" | "item"

def _finish(o, color, parent, layer=None, role="item"):
    o.color = (*[c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb(color)], 1)
    o.parent = parent
    for p in o.data.polygons:
        p.use_smooth = True
    LAYER_OF[o.name] = layer or CURRENT
    ROLE[o.name] = role
    return o

def ball(loc, scale, color, parent, layer=None, role="item", seg=28):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, location=loc)
    o = bpy.context.object
    o.scale = scale
    return _finish(o, color, parent, layer, role)

def cyl(loc, scale, color, parent, rot=(0, 0, 0), layer=None, role="item", verts=28):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = scale
    return _finish(o, color, parent, layer, role)

def cone(loc, r1, r2, depth, color, parent, rot=(0, 0, 0), layer=None, verts=24):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot)
    return _finish(bpy.context.object, color, parent, layer)

def box(loc, scale, color, parent, rot=(0, 0, 0), layer=None, bevel=0.3):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = scale
    if bevel:
        m = o.modifiers.new("b", "BEVEL")
        m.width = min(scale) * bevel
        m.segments = 4
    return _finish(o, color, parent, layer)

def torus(loc, major, minor, color, parent, rot=(0, 0, 0), layer=None):
    bpy.ops.mesh.primitive_torus_add(location=loc, rotation=rot, major_radius=major, minor_radius=minor, major_segments=36, minor_segments=12)
    return _finish(bpy.context.object, color, parent, layer)

def limb(parent, length, r, color, layer, role="item", top=0.0):
    """Rounded limb hanging down from its pivot."""
    return ball((0, 0, -top - length / 2), (r, r, length / 2 + r * 0.6), color, parent, layer, role)

WHITE = "#ffffff"
SKIN = "#ffffff"   # tinted at runtime
HAIR = "#e9e6ef"   # tinted at runtime


WHITE = "#ffffff"
HAIR = "#e9e6ef"   # tinted at runtime
# ── Items ─────────────────────────────────────────────────────────────────
ITEMS = {}   # layer id -> meta (tint, order)

def item(lid, tint=None):
    global CURRENT
    CURRENT = lid
    ITEMS[lid] = {"tint": tint}

# Cape is drawn behind everything: its own layer.
item("cape-back")
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0.26, 0.05))
cp = bpy.context.object
cp.scale = (0.62, 1, 1.05)
cp.rotation_euler = (math.radians(96), 0, 0)
sol = cp.modifiers.new("s", "SOLIDIFY"); sol.thickness = 0.04
cp.modifiers.new("c", "SUBSURF").levels = 2
_finish(cp, "#7c4dff", chest)



# Animal and novelty heads (replace the human head)
item("head-dog"); ball((0, 0, 0.42), (0.52, 0.49, 0.46), "#c9a46b", head, seg=40)
for x in (-0.48, 0.48):
    ball((x, 0.02, 0.32), (0.11, 0.08, 0.26), "#5a3824", head).rotation_euler = (0, math.radians(-x * 30), 0)
ball((0, -0.4, 0.28), (0.2, 0.14, 0.13), "#f4efe6", head); ball((0, -0.52, 0.34), (0.06, 0.04, 0.045), "#1b1622", head)
item("head-cow"); ball((0, 0, 0.42), (0.52, 0.49, 0.46), "#f4f0ff", head, seg=40)
for p, sc_ in [((0.28, -0.22, 0.62), 0.15), ((-0.3, -0.05, 0.75), 0.12), ((0.33, 0.25, 0.3), 0.14)]:
    ball(p, (sc_, sc_ * 0.5, sc_), "#1b1622", head)
ball((0, -0.42, 0.24), (0.27, 0.15, 0.15), "#ff9fcf", head)
for x in (-0.5, 0.5):
    ball((x, 0, 0.6), (0.14, 0.05, 0.07), "#f4f0ff", head)
    cone((x * 0.6, 0, 0.85), 0.05, 0.01, 0.16, "#f4efe6", head, rot=(0, math.radians(-x * 60), 0))
item("head-robot"); box((0, 0, 0.42), (0.48, 0.44, 0.44), "#b3abc4", head, bevel=0.35)
box((0, -0.43, 0.42), (0.36, 0.02, 0.22), "#2d1b69", head, bevel=0.3)
for x in (-0.5, 0.5):
    cyl((x, 0, 0.42), (0.07, 0.07, 0.06), "#8d85a0", head, rot=(0, math.radians(90), 0))
cyl((0, 0, 0.9), (0.02, 0.02, 0.1), "#8d85a0", head); ball((0, 0, 1.02), (0.06, 0.06, 0.06), "#ff7a6b", head)
item("head-alien"); ball((0, 0, 0.45), (0.5, 0.47, 0.52), "#8de08a", head, seg=40)
for x in (-0.18, 0.18):
    cyl((x, 0, 0.98), (0.018, 0.018, 0.12), "#6bbf69", head, rot=(0, math.radians(-x * 60), 0))
    ball((x * 1.5, 0, 1.1), (0.06, 0.06, 0.06), "#c6f36b", head)
item("head-lion")
for i in range(16):
    a = i / 16 * math.tau
    ball((math.cos(a) * 0.5, 0.06, 0.42 + math.sin(a) * 0.5), (0.18, 0.12, 0.18), "#c4622d", head)
ball((0, 0, 0.42), (0.47, 0.44, 0.43), "#e39b2d", head, seg=40)
for x in (-0.36, 0.36):
    ball((x, 0, 0.78), (0.12, 0.06, 0.12), "#e39b2d", head)
ball((0, -0.4, 0.26), (0.2, 0.12, 0.13), "#ffd9a3", head); ball((0, -0.5, 0.33), (0.06, 0.04, 0.04), "#5a3824", head)

# Hats
item("hat-cap"); ball((0, 0, 0.62), (0.5, 0.48, 0.33), "#a67fff", head)
ball((0, -0.42, 0.62), (0.32, 0.26, 0.03), "#8d63ff", head)
item("hat-beanie"); ball((0, 0, 0.62), (0.53, 0.5, 0.38), "#ff7a6b", head)
torus((0, 0, 0.55), 0.5, 0.07, "#e2584a", head).scale = (1, 0.95, 1)
ball((0, 0, 1.02), (0.11, 0.11, 0.11), "#f4f0ff", head)
item("hat-party"); cone((0.08, 0, 1.05), 0.24, 0.0, 0.55, "#ffd166", head, rot=(0, math.radians(14), 0))
ball((0.15, 0, 1.33), (0.07, 0.07, 0.07), "#ff8fd1", head)
item("hat-headphones"); torus((0, 0, 0.42), 0.52, 0.04, "#1b1622", head, rot=(0, math.radians(90), 0))
for x in (-0.52, 0.52):
    cyl((x, 0, 0.36), (0.13, 0.13, 0.06), "#1b1622", head, rot=(0, math.radians(90), 0))
    cyl((x * 1.04, 0, 0.36), (0.08, 0.08, 0.04), "#7c4dff", head, rot=(0, math.radians(90), 0))
item("hat-tophat"); cyl((0, 0, 0.88), (0.24, 0.24, 0.2), "#0b0910", head)
cyl((0, 0, 0.72), (0.38, 0.38, 0.02), "#0b0910", head); cyl((0, 0, 0.77), (0.245, 0.245, 0.04), "#c4433a", head)
item("hat-crown"); cyl((0, 0, 0.82), (0.32, 0.32, 0.08), "#ffd166", head)
for i in range(5):
    a = i / 5 * math.tau
    cone((math.sin(a) * 0.3, -math.cos(a) * 0.3, 0.96), 0.07, 0.0, 0.2, "#ffd166", head)
ball((0, -0.32, 0.82), (0.04, 0.03, 0.04), "#ff7a6b", head)
item("hat-hardhat"); ball((0, 0, 0.66), (0.52, 0.5, 0.36), "#ffd166", head)
cyl((0, 0, 0.62), (0.6, 0.58, 0.025), "#ffd166", head); ball((0, 0, 0.98), (0.07, 0.3, 0.06), "#e8b84a", head)
item("hat-chef"); cyl((0, 0, 0.78), (0.4, 0.4, 0.1), "#ffffff", head)
for p in [(0, 0, 1.0), (-0.2, 0, 0.95), (0.2, 0, 0.95), (0, -0.15, 0.95), (0, 0.15, 0.95)]:
    ball(p, (0.24, 0.24, 0.2), "#ffffff", head)
item("hat-explorer"); ball((0, 0, 0.64), (0.48, 0.46, 0.34), "#c9a46b", head)
cyl((0, 0, 0.66), (0.72, 0.72, 0.02), "#c9a46b", head); cyl((0, 0, 0.72), (0.49, 0.47, 0.04), "#5a3824", head)
item("hat-grad"); ball((0, 0, 0.66), (0.46, 0.44, 0.3), "#0b0910", head)
box((0, 0, 0.92), (0.46, 0.46, 0.025), "#0b0910", head, rot=(0, 0, math.radians(45)), bevel=0.2)
cyl((0.3, -0.1, 0.78), (0.012, 0.012, 0.14), "#ffd166", head); ball((0.3, -0.1, 0.62), (0.04, 0.04, 0.06), "#ffd166", head)
item("hat-lion")
for x in (-0.34, 0.34):
    ball((x, 0, 0.82), (0.15, 0.08, 0.15), "#e39b2d", head); ball((x, -0.05, 0.82), (0.08, 0.04, 0.08), "#ffd9a3", head)
item("hat-halo"); torus((0, 0, 1.12), 0.28, 0.045, "#ffd166", head)

# Held items (right hand)

item("held-coffee"); cyl((0, -0.08, -0.4), (0.08, 0.08, 0.11), "#f4efe6", shR); cyl((0, -0.08, -0.29), (0.085, 0.085, 0.02), "#7c4dff", shR)
item("held-phone"); box((0, -0.1, -0.42), (0.07, 0.015, 0.12), "#1b1622", shR, bevel=0.3)
item("held-croissant"); torus((0, -0.1, -0.42), 0.09, 0.05, "#e39b2d", shR, rot=(math.radians(90), 0, 0))
item("held-briefcase"); box((0, -0.02, -0.66), (0.2, 0.07, 0.15), "#5a3824", shR, bevel=0.2); torus((0, -0.02, -0.5), 0.06, 0.015, "#3a2416", shR, rot=(math.radians(90), 0, 0))
item("held-mic"); cyl((0, -0.1, -0.36), (0.025, 0.025, 0.12), "#1b1622", shR); ball((0, -0.1, -0.22), (0.06, 0.06, 0.06), "#8d85a0", shR)
item("held-laptop"); box((0, -0.18, -0.46), (0.22, 0.15, 0.012), "#b3abc4", shR, bevel=0.2); box((0, -0.04, -0.33), (0.22, 0.012, 0.14), "#6bc6ff", shR, rot=(math.radians(-15), 0, 0), bevel=0.2)
item("held-trophy"); cyl((0, -0.1, -0.56), (0.07, 0.07, 0.03), "#5a3824", shR); cyl((0, -0.1, -0.5), (0.02, 0.02, 0.06), "#ffd166", shR); cone((0, -0.1, -0.36), 0.05, 0.12, 0.16, "#ffd166", shR)
item("held-compass"); cyl((0, -0.12, -0.42), (0.11, 0.11, 0.02), "#ffd166", shR, rot=(math.radians(90), 0, 0)); cyl((0, -0.135, -0.42), (0.085, 0.085, 0.01), "#f4efe6", shR, rot=(math.radians(90), 0, 0))

# Pets (beside the character, screen right)
def eyes(parent, x, y, z, gap=0.05, r=0.025):
    for s in (-1, 1):
        ball((x + s * gap, y, z), (r, r * 0.7, r), "#1b1622", parent)

item("pet-hamster"); ball((0, 0, 0.16), (0.2, 0.18, 0.16), "#e39b2d", pet_root); ball((0, -0.12, 0.12), (0.12, 0.08, 0.08), "#ffd9a3", pet_root)
for x in (-0.11, 0.11): ball((x, 0, 0.3), (0.05, 0.03, 0.05), "#c4622d", pet_root)
eyes(pet_root, 0, -0.17, 0.2)
item("pet-goldfish"); ball((0, 0, 0.2), (0.22, 0.22, 0.2), "#bfe6ff", pet_root); ball((0, -0.04, 0.2), (0.1, 0.06, 0.07), "#ff7a6b", pet_root); cyl((0, 0, 0.38), (0.15, 0.15, 0.02), "#8fd0ff", pet_root)
item("pet-cat"); ball((0, 0, 0.14), (0.18, 0.15, 0.13), "#8d85a0", pet_root); ball((0, -0.1, 0.32), (0.15, 0.13, 0.13), "#8d85a0", pet_root)
for x in (-0.09, 0.09): cone((x, -0.1, 0.46), 0.05, 0.0, 0.1, "#8d85a0", pet_root)
ball((0.2, 0.08, 0.22), (0.05, 0.05, 0.14), "#8d85a0", pet_root).rotation_euler = (0, math.radians(-30), 0); eyes(pet_root, 0, -0.22, 0.34)
item("pet-duck"); ball((0, 0, 0.14), (0.17, 0.2, 0.13), "#ffd166", pet_root); ball((0, -0.1, 0.32), (0.11, 0.11, 0.11), "#ffd166", pet_root); ball((0, -0.22, 0.3), (0.06, 0.06, 0.025), "#ff7a6b", pet_root); eyes(pet_root, 0, -0.19, 0.36)
item("pet-dragon"); ball((0, 0, 0.18), (0.18, 0.2, 0.16), "#7c4dff", pet_root); ball((0, -0.12, 0.38), (0.14, 0.13, 0.12), "#7c4dff", pet_root)
for s in (-1, 1):
    ball((s * 0.2, 0.06, 0.3), (0.14, 0.03, 0.09), "#c6f36b", pet_root).rotation_euler = (0, math.radians(s * -35), 0)
    cone((s * 0.07, -0.1, 0.52), 0.035, 0.0, 0.1, "#ffd166", pet_root)
eyes(pet_root, 0, -0.24, 0.4)
item("pet-cub"); ball((0, 0, 0.14), (0.17, 0.16, 0.13), "#e39b2d", pet_root); ball((0, -0.08, 0.32), (0.15, 0.14, 0.14), "#e39b2d", pet_root)
for x in (-0.1, 0.1): ball((x, -0.06, 0.45), (0.05, 0.03, 0.05), "#c4622d", pet_root)
ball((0, -0.2, 0.28), (0.07, 0.05, 0.05), "#ffd9a3", pet_root); eyes(pet_root, 0, -0.21, 0.35)
item("pet-robot"); box((0, 0, 0.14), (0.15, 0.13, 0.12), "#b3abc4", pet_root, bevel=0.3); box((0, 0, 0.36), (0.13, 0.12, 0.1), "#b3abc4", pet_root, bevel=0.35)
box((0, -0.12, 0.36), (0.09, 0.01, 0.045), "#2d1b69", pet_root, bevel=0.3); ball((0, -0.135, 0.36), (0.04, 0.01, 0.025), "#c6f36b", pet_root)
cyl((0, 0, 0.5), (0.012, 0.012, 0.05), "#8d85a0", pet_root); ball((0, 0, 0.56), (0.03, 0.03, 0.03), "#6bc6ff", pet_root)
item("pet-dog"); ball((0, 0, 0.14), (0.17, 0.2, 0.13), "#c9a46b", pet_root); ball((0, -0.12, 0.33), (0.14, 0.13, 0.13), "#c9a46b", pet_root)
for x in (-0.13, 0.13): ball((x, -0.1, 0.3), (0.04, 0.03, 0.1), "#5a3824", pet_root)
ball((0, -0.24, 0.3), (0.05, 0.04, 0.04), "#1b1622", pet_root); eyes(pet_root, 0, -0.24, 0.37)
item("pet-cow"); ball((0, 0, 0.16), (0.2, 0.17, 0.14), "#f4f0ff", pet_root); ball((0.08, -0.05, 0.2), (0.07, 0.15, 0.07), "#1b1622", pet_root)
ball((0, -0.12, 0.34), (0.13, 0.12, 0.12), "#f4f0ff", pet_root); ball((0, -0.22, 0.29), (0.09, 0.05, 0.06), "#ff9fcf", pet_root)
for x in (-0.06, 0.06): cone((x, -0.1, 0.47), 0.02, 0.0, 0.07, "#f4efe6", pet_root)
eyes(pet_root, 0, -0.22, 0.37)

ALL_LAYERS = ["body", "head", "cape-back"] + [k for k in ITEMS if k != "cape-back"]


# ── Kenney characters ─────────────────────────────────────────────────────
LOOKS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "looks.json")))
REF = "male-a"
SCALE = LOOKS["scale"]

def import_char(var):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(KEN, f"character-{var}.glb"))
    new = [o for o in bpy.data.objects if o not in before]
    arm = [o for o in new if o.type == "ARMATURE"][0]
    meshes = {o.name.split(".")[0]: o for o in new if o.type == "MESH" and o.name.startswith(("head-mesh", "body-mesh"))}
    for o in new:
        if o.type == "MESH" and o not in meshes.values():
            bpy.data.objects.remove(o)
    return arm, meshes

ref_arm, ref_meshes = import_char(REF)
ref_arm.scale = (SCALE, SCALE, SCALE)
# Measure and attach everything in the true rest pose (the importer leaves an action applied).
if ref_arm.animation_data:
    ref_arm.animation_data.action = None
for pb in ref_arm.pose.bones:
    pb.matrix_basis.identity()
for o in ref_meshes.values():
    bpy.data.objects.remove(o)
bpy.context.view_layer.update()

# Colour map (the Kenney palette texture) for classifying faces.
cm = bpy.data.images.load(os.path.join(KEN, "Textures/colormap.png"))
CW, CH = cm.size
CPX = np.array(cm.pixels[:], dtype=np.float32).reshape(CH, CW, 4)

def face_colour(me, poly):
    uv = me.uv_layers.active.data
    u = sum(uv[l].uv[0] for l in poly.loop_indices) / poly.loop_total
    v = sum(uv[l].uv[1] for l in poly.loop_indices) / poly.loop_total
    x = min(CW - 1, max(0, int(u * CW))); y = min(CH - 1, max(0, int(v * CH)))
    return (x // 32, y // 128), CPX[y, x, :3]

def lum(c):
    return float(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) + 1e-4

KOBJ = {}     # layer -> list of objects
FAMILY = {}   # object name -> (variant, "head"|"body")

def split(var, mesh_obj, family, classify):
    """Splits a Kenney mesh into one object per (layer, palette cell), parented to the reference rig."""
    me = mesh_obj.data
    groups = {}
    for poly in me.polygons:
        cell, colour = face_colour(me, poly)
        layer = classify(poly, cell, colour)
        if layer:
            if "-skin" in layer:
                cell = SKINCELL[var]   # one skin object: no outlines round removed eyes or glasses
            groups.setdefault((layer, cell), []).append(poly.index)
    for (layer, cell), idx in groups.items():
        dup = mesh_obj.copy(); dup.data = me.copy()
        sc.collection.objects.link(dup)
        keep = set(idx)
        import bmesh as _bm
        bm = _bm.new(); bm.from_mesh(dup.data)
        _bm.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context="FACES")
        bm.to_mesh(dup.data); bm.free()
        dup.parent = ref_arm
        dup.matrix_parent_inverse.identity()
        for m in dup.modifiers:
            if m.type == "ARMATURE":
                m.object = ref_arm
        # Grey keeps Kenney's two-tone shading after tinting; detail keeps its real colour.
        _, colour = face_colour(me, me.polygons[idx[0]])
        if "-skin" in layer:
            colour = DOMINANT.get(layer, colour)
        if layer.endswith("-detail"):
            col = colour
        else:
            dom = DOMINANT.get(layer, colour)
            g = max(0.42, min(1.0, lum(colour) / lum(dom)))
            if "-skin" in layer and cell != SKINCELL.get(var):
                g = 1.0   # eyes, mouths and glasses become plain skin (the app draws faces)
            col = (g, g, g)
        lin_ = [c for c in col]
        dup.color = (*lin_, 1)
        dup.name = f"{layer}~{cell[0]}-{cell[1]}"
        LAYER_OF[dup.name] = layer
        ROLE[dup.name] = "kenney"
        FAMILY[dup.name] = (var, family)
        KOBJ.setdefault(layer, []).append(dup)

DOMINANT = {}
SKINCELL = {}
SKIN_CELLS = {(c, 0) for c in range(10, 16)}

for var in LOOKS["variants"]:
    arm, meshes = import_char(var)
    head_m, body_m = meshes["head-mesh"], meshes["body-mesh"]
    # Skin: the skin-tone cell with the most faces on the head.
    hc = {}
    for p in head_m.data.polygons:
        cell, colour = face_colour(head_m.data, p)
        hc.setdefault(cell, []).append(p)
    ys = [v.co.y for v in head_m.data.vertices]; zs = [v.co.z for v in head_m.data.vertices]
    front, z0, z1 = min(ys), min(zs), max(zs)
    def in_face(p):
        return p.center.y < front + 0.12 * (max(ys) - front) and z0 + 0.1 * (z1 - z0) < p.center.z < z0 + 0.6 * (z1 - z0) and p.normal.y < -0.3
    # Skin: the skin-tone cell that covers the face (hair can be brown too).
    # Every Kenney head is the same 124-face skin block plus hair and features.
    skin_cell = min((c for c in hc if c in SKIN_CELLS), key=lambda c: abs(len(hc[c]) - 124))
    SKINCELL[var] = skin_cell
    feature_cells = {c for c, ps in hc.items() if c != skin_cell and len(ps) <= 40 and sum(in_face(p) for p in ps) / len(ps) > 0.3}
    bald = var in LOOKS["bald"]
    def head_class(p, cell, colour, var=var):
        if cell == skin_cell or cell in feature_cells or in_face(p):
            return f"kh-{var}-skin"
        return None if bald else f"kh-{var}-hair"
    # Dominant colours (for the grey levels): most faces per layer.
    def dominant(mesh, cls):
        best = {}
        for p in mesh.data.polygons:
            cell, colour = face_colour(mesh.data, p)
            L = cls(p, cell, colour)
            if L:
                best.setdefault(L, {}).setdefault(cell, [0, colour])[0] += 1
        for L, cells in best.items():
            DOMINANT[L] = max(cells.values(), key=lambda v: v[0])[1]
    name = "bald" if bald else var
    hv = f"{var}" if not bald else f"{var}"
    dominant(head_m, head_class)
    split(var, head_m, "head", head_class)

    vg = body_m.vertex_groups
    bz = [v.co.z for v in body_m.data.vertices]
    shoe_z = min(bz) + LOOKS["shoeHeight"] * (max(bz) - min(bz))
    bc = {}
    for p in body_m.data.polygons:
        cell, _ = face_colour(body_m.data, p)
        bc[cell] = bc.get(cell, 0) + 1
    def group_of(p):
        v = body_m.data.vertices[p.vertices[0]]
        g = max(v.groups, key=lambda g: g.weight) if v.groups else None
        return vg[g.group].name if g else "torso"
    def body_class(p, cell, colour, var=var):
        g = group_of(p)
        legs = g.startswith("leg")
        if cell[1] == skin_cell[1] and cell[0] // 2 == skin_cell[0] // 2:
            return f"kb-{var}-skin" + ("L" if legs else "U")
        if cell in SKIN_CELLS:
            return f"kb-{var}-skin" + ("L" if legs else "U")   # necks and other skin tones
        if bc[cell] <= LOOKS["detailMax"] and not legs:
            return f"kb-{var}-detail"
        if legs:
            return f"kb-{var}-shoes" if p.center.z < shoe_z else f"kb-{var}-bottom"
        return f"kb-{var}-top"
    dominant(body_m, body_class)
    split(var, body_m, "body", body_class)
    bpy.data.objects.remove(head_m); bpy.data.objects.remove(body_m); bpy.data.objects.remove(arm)

bpy.context.view_layer.update()

# ── Attach our item rig (empties) to the Kenney bones ─────────────────────
def bone_world(name):
    b = ref_arm.pose.bones[name]
    return ref_arm.matrix_world @ b.matrix

def bbox_of(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx

ref_head = KOBJ[f"kh-{REF}-skin"]
hmn, hmx = bbox_of(ref_head)
hs = (hmx.x - hmn.x) / 2 / 0.5 * 0.92
hc_ = (hmn + hmx) / 2
from mathutils import Matrix
def attach(empty, bone, world_rest):
    empty.parent = None
    empty.matrix_world = world_rest
    c = empty.constraints.new("CHILD_OF")
    c.target = ref_arm; c.subtarget = bone
    c.inverse_matrix = bone_world(bone).inverted()

attach(head, "head", Matrix.Translation(hc_ - Vector((0, 0, 0.42 * hs))) @ Matrix.Scale(hs, 4))
# Right arm: our items hang along -Z from the shoulder to the hand. Kenney's rest
# pose is a T-pose with the arm straight out sideways (its bone points elsewhere).
ab = ref_arm.pose.bones["arm-right"]
a0 = ref_arm.matrix_world @ ab.head
bmn_all, bmx_all = bbox_of(KOBJ.get(f"kb-{REF}-top", []) + KOBJ.get(f"kb-{REF}-skinU", []))
reach = (a0.x - bmn_all.x) if a0.x < 0 else (bmx_all.x - a0.x)
out = Vector((-1 if a0.x < 0 else 1, 0, 0))
rot = Vector((0, 0, -1)).rotation_difference(out).to_matrix().to_4x4()
attach(shR, "arm-right", Matrix.Translation(a0) @ rot @ Matrix.Scale(reach * LOOKS["armReach"] / 0.42, 4))
tb = ref_arm.pose.bones["torso"]
t0 = ref_arm.matrix_world @ tb.head
bmn, bmx = bbox_of(KOBJ.get(f"kb-{REF}-top", []) + KOBJ.get(f"kb-{REF}-skinU", []))
cs = (bmx.x - bmn.x) / 2 / 0.3
attach(chest, "torso", Matrix.Translation(Vector((0, (bmn.y + bmx.y) / 2, bmn.z))) @ Matrix.Scale(cs, 4))
ref_arm.rotation_mode = "XYZ"

# Blocky hair Kenney doesn't have, sized from the reference cube head.
hw, hd, hh = hmx.x - hmn.x, hmx.y - hmn.y, hmx.z - hmn.z
def head_box(cx, cy, cz, sx, sy, sz):
    """Box in head-relative units (0..1 across the head), returned in head-empty local coords."""
    p = Vector((hmn.x + cx * hw, hmn.y + cy * hd, hmn.z + cz * hh))
    loc = head.matrix_world.inverted() @ p
    return loc, (sx * hw / 2 / hs, sy * hd / 2 / hs, sz * hh / 2 / hs)
item("hair-afro", "hair")
l_, s_ = head_box(0.5, 0.62, 0.98, 1.32, 0.86, 0.78); box(tuple(l_), s_, HAIR, head, bevel=0.35)
item("hair-mohawk", "hair")
for k in range(5):
    l_, s_ = head_box(0.5, 0.12 + k * 0.2, 1.08 - abs(k - 2) * 0.04, 0.2, 0.17, 0.3); box(tuple(l_), s_, HAIR, head, bevel=0.2)

# ── Posing: Kenney's own animations ───────────────────────────────────────
FACING = {"S": 0.0, "N": math.pi, "E": math.pi / 2}
ACTION = {"idle": "idle", "walk": "walk", "wave": "interact-right"}
ref_arm.animation_data_create()

def pose(direction, clip, i, n):
    act = bpy.data.actions[f"{ACTION[clip]}_character-{REF}"]
    ref_arm.animation_data.action = act
    f0, f1 = act.frame_range
    sc.frame_set(int(round(f0 + (f1 - f0) * i / n)))
    ref_arm.rotation_euler = (0, 0, FACING[direction])
    pet_root.location = (0.86, 0.32, 0.01 * (1 + math.sin(i / n * math.tau)) if clip != "walk" else 0.07 * abs(math.sin(i / n * math.tau)))
    bpy.context.view_layer.update()

def screen(obj):
    from bpy_extras.object_utils import world_to_camera_view
    co = world_to_camera_view(sc, cam, obj.matrix_world.translation)
    return [round(co.x * FRAME, 1), round((1 - co.y) * FRAME, 1)]

# ── Rendering ─────────────────────────────────────────────────────────────
objs = [o for o in sc.objects if o.type == "MESH"]
REF_HEAD = [o for o in objs if FAMILY.get(o.name) == (REF, "head") and LAYER_OF[o.name].endswith("-skin")]
REF_BODY = [o for o in objs if FAMILY.get(o.name) == (REF, "body")]

def holds_for(layer):
    if layer.startswith(("kb-", "kh-")):
        # Only hide what's in front within the same variant; draw order does the rest,
        # so heads, hair and clothes from different characters mix cleanly.
        var = FAMILY[KOBJ[layer][0].name][0]
        front = {"hair": ["skin"], "top": ["skinU"], "detail": ["skinU"]}.get(layer.split("-")[-1], [])
        pre = layer.rsplit("-", 1)[0]
        return [o for f in front for o in KOBJ.get(f"{pre}-{f}", [])]
    if layer.startswith("pet-"):
        return []
    if layer == "cape-back":
        return REF_BODY
    if layer.startswith(("hat-", "hair-")):
        return REF_HEAD
    if layer.startswith("head-"):
        return []
    return REF_BODY + REF_HEAD

def setup_pass(kind, layer):
    sh.light = "FLAT" if kind in ("colour", "id") else "STUDIO"
    sh.color_type = {"colour": "OBJECT", "light": "SINGLE", "id": "RANDOM"}[kind]
    sh.single_color = (1, 1, 1)
    hold = set(o.name for o in holds_for(layer))
    for o in objs:
        mine = LAYER_OF.get(o.name) == layer
        o.hide_render = not (mine or o.name in hold)
        o["hold"] = 1 if (o.name in hold and not mine) else 0
    return [o for o in objs if o.get("hold")]
def render_to_array():
    path = f"/tmp/_r{os.getpid()}.png"
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(path, check_existing=False)
    a = np.array(img.pixels[:], dtype=np.float32).reshape(RES, RES, 4)[::-1]
    bpy.data.images.remove(img)
    return a

KEY = (1.0, 0.0, 1.0)

def render_layer(layer):
    frames = {"colour": [], "light": [], "id": []}
    anchors = []
    for (dirn, clip, i, n) in FRAMES:
        pose(dirn, clip, i, n)
        anchors.append({
            "face": screen(face_anchor), "head": screen(head_centre),
            "chest": screen(chest_anchor), "hand": screen(handR),
        })
        for kind in ("colour", "light", "id"):
            holds = setup_pass(kind, layer)
            saved = {}
            if kind == "colour":
                for o in holds:
                    saved[o.name] = tuple(o.color)
                    o.color = (*KEY, 1)
            frames[kind].append(render_to_array())
            for nm, c in saved.items():
                sc.objects[nm].color = c
    np.savez_compressed(os.path.join(OUT, f"{layer}.npz"),
                        colour=np.stack(frames["colour"]).astype(np.float16),
                        light=np.stack(frames["light"])[..., 0].astype(np.float16),
                        id=np.stack(frames["id"])[..., :3].astype(np.float16))
    return anchors

ALL = list(KOBJ) + [k for k in ITEMS]
if WANT == "list":
    print("LAYERS", ",".join(ALL)); sys.exit(0)
layers = ALL if WANT == "all" else [l for l in WANT.split(",") if l in ALL]
meta = {"layers": ALL, "tint": {**{k: v["tint"] for k, v in ITEMS.items()}, **{k: ("skin" if "-skin" in k else "hair" if k.endswith("-hair") else None if k.endswith("-detail") else k.split("-")[-1]) for k in KOBJ}}, "frames": [list(f[:3]) for f in FRAMES], "size": FRAME}
anchors = None
if os.environ.get("DEBUG_ARM"):
    for clip in ("idle", "walk"):
        pose("S", clip, 1, 4)
        b = ref_arm.pose.bones["arm-right"]
        dg = bpy.context.evaluated_depsgraph_get(); ev = ref_arm.evaluated_get(dg)
        eb = ev.pose.bones["arm-right"]
        print("DBGEV", clip, sc.frame_current, ref_arm.animation_data.action.name, tuple(round(v, 2) for v in ev.matrix_world @ eb.tail), tuple(round(v,3) for v in b.rotation_quaternion), [fc.data_path for fc in ref_arm.animation_data.action.fcurves][:4])
        print("DBG", clip, "bone head", tuple(round(v, 2) for v in ref_arm.matrix_world @ b.head), "tail", tuple(round(v, 2) for v in ref_arm.matrix_world @ b.tail), "handR", tuple(round(v, 2) for v in handR.matrix_world.translation), "shR", tuple(round(v, 2) for v in shR.matrix_world.translation))
    sys.exit(0)
for L in layers:
    if L != ALL[0] and os.path.exists(os.path.join(OUT, f"{L}.npz")) and os.environ.get("SKIP_DONE"):
        continue
    a = render_layer(L)
    anchors = anchors or a
    print("DONE", L, flush=True)
if anchors:
    pose("S", "idle", 0, 4)
    from bpy_extras.object_utils import world_to_camera_view
    mn, mx = bbox_of(ref_head)
    meta["u"] = round((world_to_camera_view(sc, cam, Vector((mx.x, 0, hc_.z))).x - world_to_camera_view(sc, cam, Vector((mn.x, 0, hc_.z))).x) * FRAME / 2, 2)
    meta["anchors"] = anchors
    json.dump(meta, open(os.path.join(OUT, "meta.json"), "w"))