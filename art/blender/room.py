"""IlluminatED isometric diorama rooms (original designs).

A cut-away room on a slab, lit like a product shot: soft area light through tall
windows, procedural wood, fabric and plaster (no image textures), bevelled
furniture and a deep-blue studio backdrop. Used for home previews, the store
and marketing art.

  python3 art/blender/room.py <theme> <out.png> [samples] [size]
  themes: study, lounge, bedroom, gaming, halloween, winter
"""
import bpy, bmesh, math, sys, random
from mathutils import Vector

THEME = sys.argv[1] if len(sys.argv) > 1 else "study"
OUT = sys.argv[2] if len(sys.argv) > 2 else "/tmp/room.png"
SAMPLES = int(sys.argv[3]) if len(sys.argv) > 3 else 96
SIZE = int(sys.argv[4]) if len(sys.argv) > 4 else 1200
random.seed(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ---------------------------------------------------------------- materials
MATS = {}
def principled(name, colour, rough=0.6, metal=0.0, **extra):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*colour, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    for k, v in extra.items(): b.inputs[k].default_value = v
    MATS[name] = m; return m
def lin(h):
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (1, 3, 5))

def wood(name, base, dark, scale=(1.0, 14.0, 1.0)):
    """Plank floor / tabletop: stretched noise grain, plank stripes, varied tone, fine bump."""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = scale
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    grain = nt.nodes.new("ShaderNodeTexNoise"); grain.inputs["Scale"].default_value = 6; grain.inputs["Detail"].default_value = 12; grain.inputs["Distortion"].default_value = 0.6
    nt.links.new(mp.outputs["Vector"], grain.inputs["Vector"])
    planks = nt.nodes.new("ShaderNodeTexBrick"); planks.inputs["Scale"].default_value = 2.2; planks.inputs["Mortar Size"].default_value = 0.004
    planks.offset = 0.5; planks.squash = 0.18
    planks.inputs["Color1"].default_value = (*base, 1); planks.inputs["Color2"].default_value = (*[c * 0.82 for c in base], 1); planks.inputs["Mortar"].default_value = (*dark, 1)
    nt.links.new(tc.outputs["Object"], planks.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (*dark, 1); ramp.color_ramp.elements[1].color = (*base, 1)
    nt.links.new(grain.outputs["Fac"], ramp.inputs["Fac"])
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.inputs["Factor"].default_value = 0.65
    nt.links.new(planks.outputs["Color"], mix.inputs["A"]); nt.links.new(ramp.outputs["Color"], mix.inputs["B"]); nt.links.new(mix.outputs["Result"], b.inputs["Base Color"])
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.15
    nt.links.new(grain.outputs["Fac"], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.38; b.inputs["Coat Weight"].default_value = 0.25
    MATS[name] = m; return m

def fabric(name, colour, scale=180):
    """Woven upholstery: tiny wave bump and sheen."""
    if name in MATS: return MATS[name]
    m = principled(name, colour, 0.92, **{"Sheen Weight": 0.5})
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    w = nt.nodes.new("ShaderNodeTexWave"); w.inputs["Scale"].default_value = scale; w.inputs["Distortion"].default_value = 3
    n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = scale * 2
    mx = nt.nodes.new("ShaderNodeMath"); mx.operation = "ADD"
    nt.links.new(w.outputs["Fac"], mx.inputs[0]); nt.links.new(n.outputs["Fac"], mx.inputs[1])
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35
    nt.links.new(mx.outputs["Value"], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m

def plaster(name, colour):
    m = principled(name, colour, 0.95)
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = 60
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.04
    nt.links.new(n.outputs["Fac"], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m

def emit(name, colour, strength):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*colour, 1); b.inputs["Emission Color"].default_value = (*colour, 1); b.inputs["Emission Strength"].default_value = strength
    MATS[name] = m; return m

def leaf_mat():
    return principled("leaf", lin("#3f8a3a"), 0.5, **{"Subsurface Weight": 0.15})

# ---------------------------------------------------------------- geometry helpers
def assign(o, m):
    o.data.materials.clear(); o.data.materials.append(m); return o
def smooth(o, angle=40):
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle)); o.select_set(False); return o
def block(x0, y0, z0, x1, y1, z1, m, bevel=0.015, seg=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    o = bpy.context.object; o.scale = (x1 - x0, y1 - y0, z1 - z0)
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        b = o.modifiers.new("b", "BEVEL"); b.width = min(bevel, min(x1 - x0, y1 - y0, z1 - z0) * 0.45); b.segments = seg
    return smooth(assign(o, m))
def cyl(x, y, z0, z1, r, m, seg=32, r2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r, radius2=r if r2 is None else r2, depth=z1 - z0, location=(x, y, (z0 + z1) / 2))
    return smooth(assign(bpy.context.object, m))
def ball(x, y, z, r, m, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, radius=r, location=(x, y, z)); o = bpy.context.object; o.scale = scale
    return smooth(assign(o, m), 80)
def leg(x0, y0, z0, x1, y1, z1, r, m):
    a, b = Vector((x0, y0, z0)), Vector((x1, y1, z1)); d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=r, depth=d.length, location=(a + b) / 2)
    o = bpy.context.object; o.rotation_euler = d.to_track_quat("Z", "Y").to_euler(); return smooth(assign(o, m))

# ---------------------------------------------------------------- palette per theme
THEMES = {
    "study":    dict(wall="#f1efe9", trim="#3c8de0", floor=("#b07a4f", "#4a2c18"), sofa="#2f3e52", accent="#ffd23f", rug="#c9d6e8", glow="#fff3d6"),
    "lounge":   dict(wall="#f4ece4", trim="#e07a5f", floor=("#b07a4f", "#4a2c18"), sofa="#7a8b6f", accent="#e07a5f", rug="#efe0c9", glow="#ffe9c6"),
    "bedroom":  dict(wall="#eef1f7", trim="#7a5ce6", floor=("#c49a6c", "#5a3a20"), sofa="#c3a6ff", accent="#ff8fc7", rug="#f6e7f3", glow="#fff0f6"),
    "gaming":   dict(wall="#1f2333", trim="#00e5ff", floor=("#4a3a33", "#1c1410"), sofa="#2a2f45", accent="#ff3bd4", rug="#2e2a52", glow="#9fe8ff"),
    "halloween":dict(wall="#2a1f3d", trim="#ff7a1a", floor=("#5a3a2a", "#20120a"), sofa="#3b1f4f", accent="#ff7a1a", rug="#3a2448", glow="#ffb36b"),
    "cottage":  dict(wall="#dfe8d8", trim="#5f8a5a", floor=("#c49a6c", "#6a4a2a"), sofa="#efe4d0", accent="#c96f4a", rug="#f3ead8", glow="#fff1d6"),
    "penthouse":dict(wall="#2b2f38", trim="#c9a24a", floor=("#3a3330", "#141110"), sofa="#1d4e89", accent="#c9a24a", rug="#d8d2c6", glow="#ffe2a8"),
    "winter":   dict(wall="#f3f7fb", trim="#c2263f", floor=("#9a6a45", "#3a2416"), sofa="#c2263f", accent="#2e9d55", rug="#ffffff", glow="#fff3d6"),
}
T = THEMES.get(THEME, THEMES["study"])
WALL = plaster("wall", lin(T["wall"])); TRIM = principled("trim", lin(T["trim"]), 0.4)
FLOOR = wood("floor", lin(T["floor"][0]), lin(T["floor"][1]))
OAK = wood("oak", lin("#d9b98c"), lin("#a07a4c"), (1, 10, 1))
WHITE = principled("white", lin("#f4f4f2"), 0.35); BLACK = principled("black", lin("#1b1d22"), 0.4)
STEEL = principled("steel", lin("#c9ccd2"), 0.25, 1.0); SOFA = fabric("sofa", lin(T["sofa"]))
ACCENT = principled("accent", lin(T["accent"]), 0.45); RUG = fabric("rug", lin(T["rug"]), 90)
CERAMIC = principled("ceramic", lin("#f7f7f5"), 0.2, **{"Coat Weight": 0.6})
GLASS = principled("glass", lin("#dfe9f2"), 0.02, **{"Transmission Weight": 1.0})
SKY = emit("sky", lin(T["glow"]), 6.0)

# ---------------------------------------------------------------- the room shell (4 x 4 m, open towards the camera)
S = 4.0; H = 2.6; TH = 0.12
block(-0.06, -0.06, -0.18, S + 0.06, S + 0.06, 0.0, TRIM, 0.03)                          # slab with coloured edge
block(0, 0, 0, S, S, 0.02, FLOOR, 0.0)                                                     # plank floor
block(-TH, 0, 0, 0, S, H, WALL, 0.0); block(-TH - 0.02, -0.06, 0, -TH, S + 0.06, H + 0.02, TRIM, 0.0)   # left wall + trim edge
BACK_WALL = [block(-TH, S, 0, S, S + TH, H, WALL, 0.0), block(-0.06, S + TH, 0, S + 0.06, S + TH + 0.02, H + 0.02, TRIM, 0.0)]  # back wall
block(-TH - 0.02, -0.06, H, 0, S + TH + 0.02, H + 0.03, TRIM, 0.0); block(-TH, S, H, S + 0.06, S + TH + 0.02, H + 0.03, TRIM, 0.0)

# Tall windows in the back wall: cut openings, wooden frames, glowing sky behind.
def window(x0, x1, z0=0.45, z1=2.35):
    cut = block(x0, S - 0.05, z0, x1, S + TH + 0.05, z1, WALL, 0.0)
    for w in BACK_WALL:
        mod = w.modifiers.new("cut", "BOOLEAN"); mod.object = cut; mod.operation = "DIFFERENCE"
        bpy.context.view_layer.objects.active = w; bpy.ops.object.modifier_apply(modifier="cut")
    bpy.data.objects.remove(cut)
    f = 0.045
    for x in (x0, x1 - f, (x0 + x1) / 2 - f / 2): block(x, S + 0.02, z0, x + f, S + 0.09, z1, OAK, 0.006)
    for z in (z0, z1 - f, z0 + (z1 - z0) * 0.33, z0 + (z1 - z0) * 0.66): block(x0, S + 0.02, z, x1, S + 0.09, z + f, OAK, 0.006)
    block(x0, S + 0.06, z0, x1, S + 0.065, z1, GLASS, 0.0)
    block(x0 - 0.08, S + 0.14, z0 - 0.08, x1 + 0.08, S + 0.15, z1 + 0.08, SKY, 0.0)
for x0 in (1.0, 2.25, 3.35): window(x0, x0 + 0.55 if x0 > 3 else x0 + 0.9)

# ---------------------------------------------------------------- furniture
def plant(x, y, h=1.1, pot=0.18):
    cyl(x, y, 0.02, pot * 1.6, pot, CERAMIC, 32, pot * 0.8)
    for i in range(3):
        leg(x, y, pot * 1.5, x + random.uniform(-0.12, 0.12), y + random.uniform(-0.12, 0.12), h * random.uniform(0.75, 1.0), 0.012, principled("stem", lin("#6b5a3a"), 0.6))
    for i in range(55):
        a = random.uniform(0, math.tau); r = random.uniform(0.05, 0.32); z = random.uniform(h * 0.55, h * 1.05)
        o = ball(x + math.cos(a) * r, y + math.sin(a) * r, z, 0.07, leaf_mat(), (1.8, 0.5, 0.12))
        o.rotation_euler = (random.uniform(-0.8, 0.8), random.uniform(-0.6, 0.6), a)

def sofa(x, y, w=2.0):
    block(x, y, 0.08, x + w, y + 0.85, 0.42, SOFA, 0.06, 4)                                 # base
    block(x, y + 0.65, 0.42, x + w, y + 0.88, 0.92, SOFA, 0.08, 4)                         # back
    for cx in (x, x + w - 0.22): block(cx, y, 0.42, cx + 0.22, y + 0.85, 0.66, SOFA, 0.08, 4)  # arms
    for i in range(2): block(x + 0.24 + i * (w - 0.48) / 2, y + 0.04, 0.42, x + 0.22 + (i + 1) * (w - 0.48) / 2, y + 0.64, 0.56, SOFA, 0.07, 4)
    for lx in (x + 0.08, x + w - 0.08):
        for ly in (y + 0.08, y + 0.78): cyl(lx, ly, 0.0, 0.08, 0.025, STEEL)

def coffee_table(x, y):
    o = ball(x, y, 0.42, 0.6, wood("walnut", lin("#5a3a26"), lin("#2a1810"), (1, 8, 1)), (1.2, 0.75, 0.05))
    for a in (0.6, 2.4, 3.9, 5.5): leg(x + math.cos(a) * 0.45, y + math.sin(a) * 0.28, 0.0, x + math.cos(a) * 0.3, y + math.sin(a) * 0.18, 0.4, 0.015, STEEL)

def desk(x, y, w=1.5):
    block(x, y, 0.74, x + w, y + 0.7, 0.78, OAK, 0.012)
    block(x + 0.05, y + 0.05, 0.6, x + w - 0.05, y + 0.65, 0.74, OAK, 0.01)
    for d in range(2): block(x + 0.1 + d * 0.45, y - 0.005, 0.63, x + 0.5 + d * 0.45, y + 0.0, 0.71, OAK, 0.004)
    for lx in (x + 0.06, x + w - 0.06):
        for ly in (y + 0.06, y + 0.64): cyl(lx, ly, 0.0, 0.6, 0.022, STEEL)
    # Monitor with a glowing screen, keyboard, mug, lamp.
    block(x + w * 0.35, y + 0.42, 0.95, x + w * 0.35 + 0.62, y + 0.45, 1.33, BLACK, 0.01)
    block(x + w * 0.35 + 0.02, y + 0.415, 0.97, x + w * 0.35 + 0.6, y + 0.42, 1.31, emit("screen", lin("#3aa0ff"), 2.5), 0.0)
    cyl(x + w * 0.35 + 0.31, y + 0.47, 0.78, 0.95, 0.02, STEEL); block(x + w * 0.35 + 0.21, y + 0.4, 0.78, x + w * 0.35 + 0.41, y + 0.55, 0.79, STEEL, 0.004)
    block(x + w * 0.35 + 0.05, y + 0.12, 0.78, x + w * 0.35 + 0.47, y + 0.27, 0.795, principled("keys", lin("#e8e8ea"), 0.3), 0.006)
    cyl(x + 0.18, y + 0.25, 0.78, 0.88, 0.04, CERAMIC); cyl(x + w - 0.15, y + 0.5, 0.78, 1.1, 0.012, STEEL); ball(x + w - 0.15, y + 0.5, 1.12, 0.06, emit("lamp", lin("#fff1d0"), 8))

def chair(x, y):
    cyl(x, y, 0.06, 0.08, 0.28, STEEL, 5)
    cyl(x, y, 0.08, 0.45, 0.03, STEEL)
    block(x - 0.24, y - 0.24, 0.45, x + 0.24, y + 0.22, 0.52, BLACK, 0.05, 4)
    block(x - 0.23, y - 0.3, 0.55, x + 0.23, y - 0.24, 1.05, BLACK, 0.05, 4)

def shelf(x, y, z, w=1.1):
    block(x, y, z, x + w, y + 0.26, z + 0.035, OAK, 0.008)
    hue = [lin(c) for c in ("#2b5fd9", "#15987f", "#ffd23f", "#e07a5f", "#7a5ce6", "#13203a")]
    bx = x + 0.08
    for i in range(int(w * 9)):
        tw = random.uniform(0.03, 0.05); th = random.uniform(0.18, 0.26)
        if random.random() < 0.15: bx += 0.06; continue
        block(bx, y + 0.03, z + 0.035, bx + tw, y + 0.22, z + 0.035 + th, principled(f"book{i % 6}", hue[i % 6], 0.6), 0.004); bx += tw + 0.004
        if bx > x + w * 0.65: break
    cyl(x + w - 0.18, y + 0.13, z + 0.035, z + 0.17, 0.05, CERAMIC)

def poster(x, y, z, w=0.8, h=1.1):
    """A framed IlluminatED subject poster on the left wall (coloured dot grid)."""
    block(x, y, z, x + 0.03, y + w, z + h, BLACK, 0.006)
    cols = [lin(c) for c in ("#ff9f0a", "#30d158", "#0a84ff", "#ff375f", "#bf5af2", "#ffd60a", "#64d2ff")]
    for r in range(6):
        for c in range(4):
            ball(x + 0.035, y + 0.12 + c * (w - 0.24) / 3, z + 0.15 + r * (h - 0.3) / 5, 0.045, principled(f"dot{(r * 4 + c) % 7}", cols[(r * 4 + c) % 7], 0.4), (0.3, 1, 1))

def rug(x, y, w, d):
    block(x, y, 0.02, x + w, y + d, 0.035, RUG, 0.01)

def speakers_and_turntable(x, y):
    block(x, y, 0.0, x + 1.5, y + 0.4, 0.32, BLACK, 0.02)
    for sx in (x - 0.05, x + 1.4): block(sx, y - 0.02, 0.0, sx + 0.25, y + 0.3, 0.95, BLACK, 0.02)
    block(x + 0.55, y + 0.05, 0.32, x + 0.95, y + 0.35, 0.38, OAK, 0.01); cyl(x + 0.72, y + 0.2, 0.38, 0.395, 0.12, BLACK)

# Layout (same bones as a real flat; theme swaps colours and a few props).
rug(0.5, 0.6, 2.2, 1.6)
sofa(0.15, 0.55, 2.1)
coffee_table(1.4, 1.95)
desk(2.2, S - 0.85, 1.55)
chair(2.95, S - 1.25)
shelf(-0.0, 1.0, 1.55); shelf(0.0, 1.0, 1.95, 0.9)
poster(0.0, 2.3, 1.0)
plant(1.6, S - 0.45, 1.25); plant(3.65, 1.7, 1.0, 0.16)
speakers_and_turntable(2.3, 0.15)
if THEME == "halloween":
    for (px, py, s) in ((0.6, 0.35, 1.0), (3.4, 2.4, 0.8), (1.9, 3.5, 0.7)):
        p = ball(px, py, 0.18 * s, 0.22 * s, principled("pumpkin", lin("#f07a1a"), 0.5), (1.15, 1.05, 0.85))
        cyl(px, py, 0.33 * s, 0.42 * s, 0.025 * s, principled("stem2", lin("#3f6b2a"), 0.6))
        for sx in (-1, 1): ball(px + sx * 0.08 * s, py - 0.2 * s, 0.22 * s, 0.035 * s, emit("pglow", lin("#ffb100"), 12))
if THEME == "winter":
    cyl(3.5, 3.4, 0.0, 0.25, 0.08, principled("trunk", lin("#5a3a26"), 0.7))
    for i, (r, z) in enumerate(((0.55, 0.25), (0.42, 0.75), (0.28, 1.2))): cyl(3.5, 3.4, z, z + 0.6, r, principled("pine", lin("#1f6b3a"), 0.6), 24, 0.0)
    for i in range(18):
        a = random.uniform(0, math.tau); z = random.uniform(0.35, 1.5); r = 0.5 * (1 - (z - 0.25) / 1.6) + 0.04
        ball(3.5 + math.cos(a) * r, 3.4 + math.sin(a) * r, z, 0.04, emit(f"bauble{i % 3}", [lin("#ff3b30"), lin("#ffd60a"), lin("#64d2ff")][i % 3], 4))

# ---------------------------------------------------------------- lighting, backdrop, camera
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; nt = w.node_tree
bg = nt.nodes["Background"]
tc = nt.nodes.new("ShaderNodeTexCoord"); grad = nt.nodes.new("ShaderNodeTexGradient"); grad.gradient_type = "SPHERICAL"
mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Location"].default_value = (-0.62, -0.45, 0); mp.inputs["Scale"].default_value = (1.25, 1.25, 1)
ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (0.004, 0.015, 0.06, 1); ramp.color_ramp.elements[1].color = (0.05, 0.25, 0.7, 1)
lp = nt.nodes.new("ShaderNodeLightPath"); mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs["A"].default_value = (0.08, 0.12, 0.2, 1)
nt.links.new(tc.outputs["Window"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], grad.inputs["Vector"]); nt.links.new(grad.outputs["Fac"], ramp.inputs["Fac"])
nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Factor"]); nt.links.new(ramp.outputs["Color"], mix.inputs["B"]); nt.links.new(mix.outputs["Result"], bg.inputs["Color"])
# A blue ground plane that only catches shadows and a soft reflection of the slab.
bpy.ops.mesh.primitive_plane_add(size=60, location=(S / 2, S / 2, -0.181)); ground = bpy.context.object; ground.is_shadow_catcher = True

def area(loc, target, energy, size, colour=(1, 1, 1)):
    bpy.ops.object.light_add(type="AREA", location=loc); l = bpy.context.object
    l.data.energy = energy; l.data.size = size; l.data.color = colour
    l.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); return l
glow = tuple(c for c in lin(T["glow"]))
area((S / 2, S + 1.5, 1.6), (S / 2, S / 2, 0.5), 900, 3.0, glow)          # daylight through the windows
area((S + 3.0, -3.0, 6.0), (S / 2, S / 2, 0), 700, 6.0)                        # big soft key from the camera side
area((-1.0, -2.5, 2.0), (S / 2, S / 2, 1.0), 180, 4.0, (0.75, 0.85, 1.0))  # cool rim

bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = 7.4
d = Vector((1, -1, 0.82)).normalized() * 30; centre = Vector((S / 2 - 0.15, S / 2 - 0.1, 0.95))
cam.location = centre + d; cam.rotation_euler = (centre - cam.location).to_track_quat("-Z", "Y").to_euler()

sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 6
sc.render.resolution_x = SIZE; sc.render.resolution_y = int(SIZE * 0.75)
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print("rendered", OUT)
