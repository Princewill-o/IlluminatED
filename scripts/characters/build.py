"""
IlluminatED characters: a chibi rig plus every Locker item, built from simple
rounded shapes in Blender and rendered as layered sprite sheets.

Run:  blender -b --python build.py -- <out_dir> <layer_id,layer_id,...|all>

For every layer it renders 42 frames (idle/walk in three directions + a wave)
in three Workbench passes (flat colour, lighting, object id) at 2x size and
saves them as .npz for post.py to turn into cel-shaded, outlined sheets.
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

# ── Animation plan ────────────────────────────────────────────────────────
CLIPS = [  # (direction, clip, frames)
    ("S", "idle", 4), ("S", "walk", 8),
    ("N", "idle", 4), ("N", "walk", 8),
    ("E", "idle", 4), ("E", "walk", 8),
    ("S", "wave", 6),
]
FRAMES = [(d, c, i, n) for d, c, n in CLIPS for i in range(n)]

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

# ── Base body (two layers: body and human head, both skin-tinted) ───────
CURRENT = "body"
ball((0, 0, 0.22), (0.27, 0.21, 0.3), SKIN, chest, role="body")            # torso
ball((0, 0, 0.0), (0.22, 0.18, 0.12), SKIN, pelvis, role="body")           # hips
for sh_, s in ((shL, 1), (shR, -1)):
    limb(sh_, 0.3, 0.075, SKIN, "body", "body")
    ball((0, 0, -0.42), (0.085, 0.085, 0.085), SKIN, sh_, role="body")     # hand
for hp in (hipL, hipR):
    limb(hp, 0.42, 0.085, SKIN, "body", "body")
ball((0, 0, 0.47), (0.08, 0.08, 0.08), SKIN, chest, role="body")           # neck
CURRENT = "head"
ball((0, 0, 0.42), (0.5, 0.47, 0.45), SKIN, head, role="body", seg=40)
ball((0.45, 0, 0.4), (0.07, 0.05, 0.1), SKIN, head, role="body")            # ears
ball((-0.45, 0, 0.4), (0.07, 0.05, 0.1), SKIN, head, role="body")

# ── Items ─────────────────────────────────────────────────────────────────
ITEMS = {}   # layer id -> meta (tint, order)

def item(lid, tint=None):
    global CURRENT
    CURRENT = lid
    ITEMS[lid] = {"tint": tint}

def torso_shell(color, s=1.07, long=True, zlo=None):
    ball((0, 0, 0.22), (0.27 * s, 0.21 * s, 0.31 * s), color, chest)
    ball((0, 0, 0.0), (0.225 * s, 0.185 * s, 0.13 * s), color, pelvis) if long else None

def sleeves(color, short=False, s=1.12):
    for sh_ in (shL, shR):
        if short:
            ball((0, 0, -0.1), (0.075 * s, 0.075 * s, 0.13), color, sh_)
        else:
            limb(sh_, 0.3, 0.075 * s, color, CURRENT)

def collar(color, z=0.44):
    torus((0, 0, z), 0.12, 0.035, color, chest)

def badge_front(color, z=0.28, w=0.09):
    box((0, -0.22, z), (w, 0.02, w), color, chest, bevel=0.4)

# Tops
item("top-tee"); torso_shell("#2d1b69"); sleeves("#2d1b69", short=True); collar("#3b2783")
item("top-hoodie"); torso_shell("#3a2d58", 1.1); sleeves("#3a2d58", s=1.18)
ball((0, 0.12, 0.44), (0.24, 0.14, 0.13), "#2f2448", chest)  # hood
box((0, -0.235, 0.12), (0.13, 0.02, 0.07), "#2f2448", chest, bevel=0.4)  # pocket
item("top-stripes"); torso_shell("#f4f0ff"); sleeves("#f4f0ff", short=True)
for z in (0.08, 0.2, 0.32):
    torus((0, 0, z), 0.27, 0.025, "#7c4dff", chest).scale = (1.07, 0.82, 1)
item("top-polo"); torso_shell("#6bc6ff"); sleeves("#6bc6ff", short=True); collar("#ffffff")
item("top-knit"); torso_shell("#ff7a6b", 1.1); sleeves("#ff7a6b", s=1.16)
for z in (-0.05, 0.42):
    torus((0, 0, z), 0.25 if z > 0 else 0.29, 0.035, "#e2584a", chest)
item("top-apron"); torso_shell("#2d1b69"); sleeves("#2d1b69", short=True)
box((0, -0.2, 0.08), (0.2, 0.03, 0.3), "#f4efe6", chest, bevel=0.2)
box((0, -0.23, 0.0), (0.12, 0.02, 0.06), "#e0d6c5", chest, bevel=0.4)
item("top-denim"); torso_shell("#4f74c4", 1.1); sleeves("#4f74c4", s=1.18); collar("#3d5ea8", 0.43)
box((0, -0.235, 0.22), (0.02, 0.02, 0.22), "#3d5ea8", chest, bevel=0)
item("top-jersey"); torso_shell("#ff7a6b"); sleeves("#ff7a6b", short=True); collar("#ffffff")
box((0, -0.23, 0.2), (0.07, 0.02, 0.09), "#ffffff", chest, bevel=0.3)
item("top-suit"); torso_shell("#24203a", 1.1); sleeves("#24203a", s=1.18)
box((0, -0.228, 0.32), (0.08, 0.02, 0.12), "#ffffff", chest, rot=(0, 0, 0), bevel=0.2)
box((0, -0.24, 0.27), (0.025, 0.02, 0.1), "#c4433a", chest, bevel=0.3)
item("top-tux"); torso_shell("#0b0910", 1.1); sleeves("#0b0910", s=1.18)
box((0, -0.228, 0.3), (0.09, 0.02, 0.14), "#ffffff", chest, bevel=0.2)
box((0, -0.245, 0.42), (0.06, 0.02, 0.025), "#0b0910", chest, bevel=0.3)
item("top-astronaut"); torso_shell("#e9e6f2", 1.16); sleeves("#e9e6f2", s=1.3)
box((0, -0.26, 0.2), (0.11, 0.04, 0.08), "#b3abc4", chest, bevel=0.3)
ball((0.05, -0.3, 0.21), (0.022, 0.02, 0.022), "#ff7a6b", chest); ball((-0.04, -0.3, 0.21), (0.022, 0.02, 0.022), "#c6f36b", chest)
collar("#b3abc4")
item("top-cape"); torso_shell("#2d1b69"); sleeves("#2d1b69", short=True); collar("#ffd166")
item("top-labcoat"); torso_shell("#ffffff", 1.12); sleeves("#ffffff", s=1.2)
cone((0, 0, -0.12), 0.34, 0.27, 0.36, "#ffffff", pelvis)
box((0, -0.24, 0.12), (0.015, 0.02, 0.32), "#d8d4e0", chest, bevel=0)
item("top-hivis"); torso_shell("#2d1b69"); sleeves("#2d1b69", short=True)
ball((0, 0, 0.2), (0.3, 0.235, 0.3), "#c6f36b", chest)
for z in (0.08, 0.26):
    torus((0, 0, z), 0.3, 0.02, "#e9e6f2", chest).scale = (1, 0.8, 1)
item("top-tracksuit"); torso_shell("#6bc6ff", 1.1); sleeves("#6bc6ff", s=1.16); collar("#ffffff", 0.43)
for sh_ in (shL, shR):
    box((0, -0.07, -0.16), (0.02, 0.012, 0.2), "#ffffff", sh_, bevel=0.3)

# Cape is drawn behind everything: its own layer.
item("cape-back")
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0.26, 0.05))
cp = bpy.context.object
cp.scale = (0.62, 1, 1.05)
cp.rotation_euler = (math.radians(96), 0, 0)
sol = cp.modifiers.new("s", "SOLIDIFY"); sol.thickness = 0.04
cp.modifiers.new("c", "SUBSURF").levels = 2
_finish(cp, "#7c4dff", chest)

# Bottoms
def legs(color, short=False, s=1.12):
    ball((0, 0, 0.0), (0.235, 0.195, 0.14), color, pelvis)
    for hp in (hipL, hipR):
        if short:
            ball((0, 0, -0.12), (0.085 * s, 0.085 * s, 0.15), color, hp)
        else:
            limb(hp, 0.4, 0.085 * s, color, CURRENT)

item("bottom-jeans"); legs("#3c5a9a")
item("bottom-joggers"); legs("#3a2d58", s=1.2)
for hp in (hipL, hipR):
    torus((0, 0, -0.44), 0.085, 0.03, "#2f2448", hp)
item("bottom-shorts"); legs("#c9a46b", short=True)
item("bottom-skirt"); cone((0, 0, -0.08), 0.33, 0.22, 0.3, "#2d1b69", pelvis, verts=12)
item("bottom-cargo"); legs("#6b6b4a", s=1.18)
for hp in (hipL, hipR):
    box((0, -0.1, -0.22), (0.05, 0.02, 0.06), "#5a5a3c", hp, bevel=0.4)
item("bottom-smart"); legs("#24203a")
item("bottom-tartan"); legs("#c4433a")
for hp in (hipL, hipR):
    for z in (-0.1, -0.25, -0.4):
        torus((0, 0, z), 0.093, 0.012, "#2d1b69", hp)

# Shoes (attached to the hips so they swing with the legs)
def shoes(color, h=0.07, sole="#e9e6f2", extra=None):
    for hp in (hipL, hipR):
        ball((0, -0.05, -0.5), (0.1, 0.15, h), color, hp)
        ball((0, -0.05, -0.5 - h * 0.7), (0.105, 0.155, 0.03), sole, hp)
        if extra:
            extra(hp)

item("shoes-trainers"); shoes("#f4f0ff", sole="#7c4dff")
item("shoes-hightops"); shoes("#7c4dff")
for hp in (hipL, hipR):
    cyl((0, 0, -0.42), (0.1, 0.1, 0.08), "#7c4dff", hp)
item("shoes-boots"); shoes("#5a3824", sole="#3a2416")
for hp in (hipL, hipR):
    cyl((0, 0, -0.4), (0.105, 0.105, 0.1), "#5a3824", hp)
item("shoes-sliders"); shoes("#1b1622", h=0.04, sole="#1b1622")
for hp in (hipL, hipR):
    cyl((0, 0, -0.42), (0.09, 0.09, 0.08), "#ffffff", hp)
item("shoes-smart"); shoes("#1b1622", h=0.06, sole="#0b0910")
item("shoes-skates"); shoes("#ff8fd1", sole="#ffffff")
for hp in (hipL, hipR):
    for y in (-0.15, 0.05):
        ball((0, y, -0.62), (0.05, 0.05, 0.05), "#ffd166", hp)
item("shoes-rocket"); shoes("#b3abc4", h=0.09, sole="#8d85a0")
for hp in (hipL, hipR):
    cone((0, 0.12, -0.6), 0.06, 0.0, 0.16, "#ff7a6b", hp, rot=(math.radians(-60), 0, 0))

# Hair (rendered light grey; tinted at runtime)
def cap(s=1.08, back=0.1, z=0.6, flat=1.0):
    ball((0, back, z), (0.5 * s, 0.47 * s, 0.4 * s * flat), HAIR, head, seg=36)

item("hair-short", "hair"); cap()
item("hair-curly", "hair"); cap(1.08)
for i in range(14):
    a = i / 14 * math.tau
    ball((math.cos(a) * 0.42, math.sin(a) * 0.4 + 0.02, 0.62 + 0.12 * math.sin(a * 2)), (0.13, 0.13, 0.13), HAIR, head)
item("hair-long", "hair"); cap(1.09)
ball((0, 0.16, 0.08), (0.48, 0.22, 0.5), HAIR, head)

item("hair-bob", "hair"); cap(1.09)
for x in (-0.42, 0.42):
    ball((x, 0.02, 0.32), (0.14, 0.3, 0.3), HAIR, head)

item("hair-ponytail", "hair"); cap(1.08)
ball((0, 0.5, 0.55), (0.12, 0.12, 0.12), HAIR, head); ball((0, 0.58, 0.32), (0.13, 0.12, 0.26), HAIR, head)
item("hair-buns", "hair"); cap(1.07)
for x in (-0.32, 0.32):
    ball((x, 0.05, 0.86), (0.16, 0.16, 0.16), HAIR, head)
item("hair-buzz", "hair"); cap(1.03, flat=0.95)
item("hair-quiff", "hair"); cap(1.07)
ball((0.05, -0.28, 0.86), (0.3, 0.2, 0.17), HAIR, head).rotation_euler = (math.radians(-30), 0, 0)
item("hair-braids", "hair"); cap(1.08)
for x in (-0.4, 0.4):
    for k in range(5):
        ball((x * (1 + k * 0.03), 0.12, 0.3 - k * 0.15), (0.075, 0.075, 0.08), HAIR, head)
item("hair-afro", "hair"); ball((0, 0.16, 0.74), (0.66, 0.6, 0.5), HAIR, head, seg=40)
item("hair-spiky", "hair"); cap(1.08)
for i, (x, y) in enumerate([(-0.3, -0.1), (0, -0.2), (0.3, -0.1), (-0.2, 0.2), (0.2, 0.2), (0, 0.15)]):
    cone((x, y, 0.88), 0.14, 0.0, 0.34, HAIR, head, rot=(math.radians(-y * 80), math.radians(x * 80), 0))
item("hair-mohawk", "hair"); cap(1.02, flat=0.9)
for k in range(6):
    cone((0, -0.32 + k * 0.13, 0.86 - abs(k - 2.5) * 0.03), 0.07, 0.0, 0.3, HAIR, head, rot=(math.radians(-20 + k * 8), 0, 0)).scale = (0.5, 1.5, 1)

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

# ── Posing ────────────────────────────────────────────────────────────────
FACING = {"S": 0.0, "N": math.pi, "E": math.pi / 2}

def pose(direction, clip, i, n):
    for o in (root, pelvis, chest, head, shL, shR, hipL, hipR, pet_root):
        o.rotation_euler = (0, 0, 0)
    root.location = (0, 0, 0)
    pet_root.location = (0.86, 0.32, 0)
    root.rotation_euler = (0, 0, FACING[direction])
    t = i / n * math.tau
    if clip == "idle":
        root.location.z = 0.012 * (1 + math.sin(t))
        head.rotation_euler = (0.03 * math.sin(t), 0, 0)
        shL.rotation_euler = (0, -math.radians(4 + 2 * math.sin(t)), 0)
        shR.rotation_euler = (0, math.radians(4 + 2 * math.sin(t)), 0)
        pet_root.location.z = 0.01 * (1 + math.sin(t))
    elif clip == "walk":
        sw = math.sin(t)
        hipL.rotation_euler = (0.55 * sw, 0, 0)
        hipR.rotation_euler = (-0.55 * sw, 0, 0)
        shL.rotation_euler = (-0.5 * sw, -math.radians(6), 0)
        shR.rotation_euler = (0.5 * sw, math.radians(6), 0)
        root.location.z = 0.05 * abs(math.cos(t))
        chest.rotation_euler = (0.06, 0, 0.08 * sw)
        head.rotation_euler = (-0.04, 0, -0.06 * sw)
        pet_root.location.z = 0.07 * abs(math.sin(t))
    elif clip == "wave":
        shR.rotation_euler = (0, math.radians(150 + 14 * math.sin(t)), 0)
        shL.rotation_euler = (0, -math.radians(6), 0)
        head.rotation_euler = (0, 0.12 * math.sin(t), 0)
        root.location.z = 0.012 * (1 + math.sin(t))
    bpy.context.view_layer.update()

def screen(obj):
    from bpy_extras.object_utils import world_to_camera_view
    co = world_to_camera_view(sc, cam, obj.matrix_world.translation)
    return [round(co.x * FRAME, 1), round((1 - co.y) * FRAME, 1)]

# ── Rendering ─────────────────────────────────────────────────────────────
objs = [o for o in sc.objects if o.type == "MESH"]
BODY = [o for o in objs if ROLE.get(o.name) == "body"]

def setup_pass(kind, layer):
    """kind: colour | light | id. Body parts act as a holdout (key colour) for item layers."""
    sh.light = "FLAT" if kind in ("colour", "id") else "STUDIO"
    sh.color_type = {"colour": "OBJECT", "light": "SINGLE", "id": "RANDOM"}[kind]
    sh.single_color = (1, 1, 1)
    is_body = layer in ("body", "head")
    for o in objs:
        lid = LAYER_OF.get(o.name)
        mine = lid == layer
        hold = (not is_body) and o in BODY and not layer.startswith("pet-") and not layer.startswith("head-")
        if layer == "cape-back" and lid in ("top-cape",):
            hold = True
        o.hide_render = not (mine or hold)
        o["hold"] = 1 if (hold and not mine) else 0
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

layers = ALL_LAYERS if WANT == "all" else WANT.split(",")
meta = {"layers": ALL_LAYERS, "tint": {k: v["tint"] for k, v in ITEMS.items()}, "frames": [list(f[:3]) for f in FRAMES], "size": FRAME}
anchors = None
for L in layers:
    if L != "body" and os.path.exists(os.path.join(OUT, f"{L}.npz")) and os.environ.get("SKIP_DONE"):
        continue
    a = render_layer(L)
    anchors = anchors or a
    print("DONE", L, flush=True)
if anchors and "body" in layers:
    meta["anchors"] = anchors
    json.dump(meta, open(os.path.join(OUT, "meta.json"), "w"))
