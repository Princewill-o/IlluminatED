"""IlluminatED London kit: original Blender models for the rebuilt city.

  python3 art/blender/london_kit.py export            -> public/world3d/london/*.glb
  python3 art/blender/london_kit.py render <name> out.png   (one model, Cycles preview)
  python3 art/blender/london_kit.py sheet out.png           (every model on one plinth)

Units are game tiles (1 Blender unit = 1 tile). Z is up, and every model's
front faces -Y (it becomes +Z, "south", in the game). Footprints:
  terrace-*  3 x 3   (one townhouse; the game repeats it along a row)
  fountain   5 x 5   (centred on the origin)
  lamp       1 x 1   (centred)
  townhall  18 x 8   (front edge at y = 0)
  blossom    2 x 2   (centred)
"""
import bpy, bmesh, math, os, random, sys
from mathutils import Vector

OUT = "/home/claude/illuminated/public/world3d/london"

# ── Materials ────────────────────────────────────────────────────────────────
PALETTE = {
    "stone": ((0.80, 0.72, 0.60), 0.75), "stone_dark": ((0.62, 0.57, 0.49), 0.8), "trim": ((0.93, 0.90, 0.84), 0.55),
    "slate": ((0.23, 0.26, 0.30), 0.6), "iron": ((0.06, 0.07, 0.07), 0.45), "glass": ((0.10, 0.15, 0.20), 0.08),
    "lit": ((1.0, 0.82, 0.52), 0.3), "wood": ((0.32, 0.20, 0.12), 0.6), "brass": ((0.85, 0.65, 0.28), 0.3),
    "gold": ((0.95, 0.72, 0.25), 0.25), "leaf": ((0.24, 0.45, 0.22), 0.8), "leaf2": ((0.33, 0.56, 0.27), 0.8),
    "pot": ((0.66, 0.30, 0.18), 0.8), "water": ((0.33, 0.66, 0.80), 0.05), "basin": ((0.20, 0.45, 0.55), 0.2),
    "clock": ((0.97, 0.95, 0.86), 0.4), "blossom": ((0.98, 0.72, 0.82), 0.8), "blossom2": ((1.0, 0.84, 0.9), 0.8),
    "bark": ((0.30, 0.22, 0.18), 0.85), "flower_r": ((0.86, 0.17, 0.25), 0.7), "flower_w": ((0.98, 0.96, 0.92), 0.7),
    "flower_p": ((0.80, 0.45, 0.85), 0.7), "flower_y": ((1.0, 0.8, 0.2), 0.7),
}
M = {}
def mat(name, colour=None, rough=None):
    key = name if colour is None else f"{name}"
    if key in M: return M[key]
    c, r = PALETTE.get(name, (colour, rough))
    if colour is not None: c = colour
    if rough is not None: r = rough
    m = bpy.data.materials.new(key); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*c, 1)
    b.inputs["Roughness"].default_value = r
    if name == "lit":
        b.inputs["Emission Color"].default_value = (1.0, 0.78, 0.45, 1); b.inputs["Emission Strength"].default_value = 1.4
    if name == "clock":
        b.inputs["Emission Color"].default_value = (1.0, 0.96, 0.85, 1); b.inputs["Emission Strength"].default_value = 0.35
    if name == "water":
        b.inputs["Alpha"].default_value = 0.62
        m.surface_render_method = "BLENDED" if hasattr(m, "surface_render_method") else m.blend_method
    M[key] = m
    return m

def colour(name, rgb, rough=0.75):
    """A one-off named colour (house brick, door paint...)."""
    if name not in M: mat(name, rgb, rough)
    return name

OBJS = []
def _finish(o, m, smooth=False):
    o.data.materials.append(M[m] if m in M else mat(m))
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    OBJS.append(o)
    return o

def box(m, x0, y0, z0, x1, y1, z1, bevel=0.0, segs=1):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    o = bpy.context.object
    o.scale = (max(1e-3, x1 - x0), max(1e-3, y1 - y0), max(1e-3, z1 - z0))
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        mod = o.modifiers.new("b", "BEVEL"); mod.width = bevel; mod.segments = segs; mod.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier="b")
    return _finish(o, m)

def cyl(m, x, y, z0, z1, r, v=16, r2=None, cap=True, rot=0.0):
    bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r, radius2=r if r2 is None else r2, depth=max(1e-3, z1 - z0),
                                    location=(x, y, (z0 + z1) / 2), end_fill_type="NGON" if cap else "NOTHING")
    o = bpy.context.object; o.rotation_euler[2] = rot
    return _finish(o, m, smooth=v > 8)

def sphere(m, x, y, z, r, sub=1, sz=1.0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=(x, y, z))
    o = bpy.context.object; o.scale[2] = sz
    return _finish(o, m, smooth=True)

def ring(m, r_out, r_in, z0, z1, v=24, rot=0.0, x=0.0, y=0.0):
    """A closed annulus (kerbs and bowl rims), so whatever sits inside stays visible."""
    bm = bmesh.new()
    def circle(r, z): return [bm.verts.new((x + math.cos(rot + k * math.tau / v) * r, y + math.sin(rot + k * math.tau / v) * r, z)) for k in range(v)]
    ob, ot, ib, it = circle(r_out, z0), circle(r_out, z1), circle(r_in, z0), circle(r_in, z1)
    for k in range(v):
        n = (k + 1) % v
        bm.faces.new([ob[k], ob[n], ot[n], ot[k]])     # outer wall
        bm.faces.new([ib[n], ib[k], it[k], it[n]])     # inner wall
        bm.faces.new([ot[k], ot[n], it[n], it[k]])     # top
        bm.faces.new([ib[k], ib[n], ob[n], ob[k]])     # bottom
    me = bpy.data.meshes.new("ring"); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("ring", me); bpy.context.collection.objects.link(o)
    return _finish(o, m, smooth=v > 8)

def prism(m, x0, x1, y0, y1, z0, h, hip=0.0):
    """A pitched roof, ridge along X, optionally hipped at the ends."""
    bm = bmesh.new()
    ym = (y0 + y1) / 2
    v = [bm.verts.new(p) for p in [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0 + hip, ym, z0 + h), (x1 - hip, ym, z0 + h)]]
    for f in [(0, 1, 5, 4), (2, 3, 4, 5), (1, 2, 5), (3, 0, 4), (0, 3, 2, 1)]: bm.faces.new([v[i] for i in f])
    me = bpy.data.meshes.new("prism"); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("prism", me); bpy.context.collection.objects.link(o)
    return _finish(o, m)

def pyramid(m, x, y, z0, z1, r, v=4, rot=math.pi / 4):
    return cyl(m, x, y, z0, z1, r, v=v, r2=0.0, rot=rot)

def rotated_box(m, cx, cy, z0, z1, length, depth, angle):
    """A box centred on (cx, cy), turned about Z (box() keeps its origin at the centre)."""
    o = box(m, cx - length / 2, cy - depth / 2, z0, cx + length / 2, cy + depth / 2, z1)
    o.rotation_euler[2] = angle
    return o

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    M.clear(); OBJS.clear()

NO_EXPORT = False   # preview renders build models without overwriting the game files

def export(name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in OBJS: o.select_set(True)
    bpy.context.view_layer.objects.active = OBJS[0]
    bpy.ops.object.join()
    o = bpy.context.object; o.name = name
    if NO_EXPORT: return o
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    os.makedirs(OUT, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{name}.glb", export_format="GLB", export_yup=True, export_apply=True)
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    print(f"exported {name}.glb  ~{tris} tris")
    return o

# ── Georgian / Victorian townhouse ──────────────────────────────────────────
TERRACES = {
    # name: brick, ground-floor stucco, door, flowers
    "a": ((0.78, 0.58, 0.34), (0.93, 0.90, 0.83), (0.12, 0.13, 0.16), "flower_r"),   # yellow London stock brick
    "b": ((0.90, 0.70, 0.66), (0.93, 0.80, 0.76), (0.20, 0.22, 0.25), "flower_w"),   # painted pink brick
    "c": ((0.66, 0.70, 0.60), (0.70, 0.78, 0.84), (0.13, 0.20, 0.32), "flower_p"),   # sage stucco, blue ground floor
}

def window(x0, x1, z0, z1, front=0.55, lit=False, head="flat", box_flowers=None):
    d = front
    box("iron", x0 - 0.02, d - 0.03, z0 - 0.02, x1 + 0.02, d + 0.01, z1 + 0.02)            # dark reveal
    box("lit" if lit else "glass", x0 + 0.04, d - 0.045, z0 + 0.04, x1 - 0.04, d - 0.02, z1 - 0.04)
    for xx in (x0, x1 - 0.045): box("trim", xx, d - 0.06, z0, xx + 0.045, d - 0.02, z1)      # frame sides
    box("trim", x0, d - 0.06, z0, x1, d - 0.02, z0 + 0.045)
    box("trim", x0, d - 0.06, z1 - 0.045, x1, d - 0.02, z1)
    mid = (z0 + z1) / 2
    box("trim", x0, d - 0.065, mid - 0.02, x1, d - 0.035, mid + 0.02)                      # meeting rail
    box("trim", (x0 + x1) / 2 - 0.012, d - 0.06, z0, (x0 + x1) / 2 + 0.012, d - 0.04, z1)    # glazing bar
    for zz in (z0 + (mid - z0) / 2, mid + (z1 - mid) / 2):
        box("trim", x0, d - 0.06, zz - 0.01, x1, d - 0.04, zz + 0.01)
    box("trim", x0 - 0.07, d - 0.12, z0 - 0.07, x1 + 0.07, d + 0.0, z0 - 0.01)              # sill
    if head == "pediment":
        box("trim", x0 - 0.08, d - 0.1, z1 + 0.03, x1 + 0.08, d, z1 + 0.11)
        prism("trim", x0 - 0.08, x1 + 0.08, d - 0.1, d + 0.0, z1 + 0.11, 0.12)
    elif head == "cornice":
        box("trim", x0 - 0.06, d - 0.1, z1 + 0.03, x1 + 0.06, d, z1 + 0.12)
    else:
        box("trim", x0 - 0.04, d - 0.04, z1 + 0.02, x1 + 0.04, d, z1 + 0.1)
    if box_flowers:
        box("leaf", x0 - 0.03, d - 0.2, z0 - 0.17, x1 + 0.03, d - 0.06, z0 - 0.04)
        rnd = random.Random(int(x0 * 100 + z0 * 10))
        for i in range(6):
            fx = x0 + 0.04 + (x1 - x0 - 0.08) * (i + rnd.random() * 0.5) / 6
            sphere("leaf2", fx, d - 0.13, z0 - 0.02, 0.055, sub=1)
            if i % 2 == 0: sphere(box_flowers, fx + 0.02, d - 0.16, z0 + 0.02, 0.04, sub=1)

def terrace(variant, floors):
    brick, stucco, door, flowers = TERRACES[variant]
    # Variant-specific names so a street of mixed houses never shares a paint pot.
    B, S, D, SL = f"brick_{variant}", f"stucco_{variant}", f"door_{variant}", f"stucco_line_{variant}"
    colour(B, brick, 0.85); colour(S, stucco, 0.7); colour(D, door, 0.4)
    colour(SL, tuple(c * 0.86 for c in stucco), 0.7)
    W, F = 3.0, 0.55                   # width, front wall line (y); front zone 0..0.55 for steps, bay and railings
    g1, f1, f2 = 1.45, 2.65, 3.6        # tops of ground, first and second floors
    top = f2 if floors == 3 else f1
    random.seed(hash((variant, floors)) % 1000)
    # Body, plinth and painted ground floor with rusticated lines.
    box(B, 0.02, F, 0.3, W - 0.02, 3.0, top)
    box("stone_dark", 0.0, F - 0.04, 0.0, W, 3.0, 0.32)
    box(S, 0.0, F - 0.02, 0.3, W, F + 0.05, g1)
    for z in (0.55, 0.8, 1.05, 1.3): box(SL, 0.0, F - 0.025, z, W, F - 0.015, z + 0.018)
    box("trim", -0.02, F - 0.08, g1, W + 0.02, F + 0.05, g1 + 0.09, bevel=0.015)            # string course
    box("trim", -0.01, F - 0.05, f1 - 0.05, W + 0.01, F + 0.05, f1, bevel=0.01)
    # Party-wall pilasters / quoins on the brick storeys.
    z = g1 + 0.09; i = 0
    while z < top - 0.05:
        h = min(0.2, top - z)
        for side in (0.0, W):
            wq = 0.2 if i % 2 == 0 else 0.13
            x0 = side if side == 0 else side - wq
            box("trim", x0, F - 0.04, z, x0 + wq, F + 0.02, z + h - 0.025)
        z += 0.2; i += 1
    # Cornice with dentils, parapet with coping.
    box("trim", -0.04, F - 0.14, top, W + 0.04, 3.0, top + 0.12, bevel=0.02)
    for k in range(19): box("trim", 0.05 + k * 0.155, F - 0.1, top - 0.06, 0.1 + k * 0.155, F - 0.04, top)
    box(B, 0.0, F - 0.02, top + 0.12, W, F + 0.14, top + 0.36)
    box("trim", -0.02, F - 0.05, top + 0.36, W + 0.02, F + 0.17, top + 0.42)
    # Slate mansard with two dormers, chimney stack with pots.
    prism("slate", 0.05, W - 0.05, F + 0.2, 2.95, top + 0.12, 1.0, hip=0.0)
    for dx in (0.55, 1.95):
        box("slate", dx, F + 0.35, top + 0.3, dx + 0.5, F + 0.75, top + 0.85)
        box("trim", dx + 0.06, F + 0.33, top + 0.38, dx + 0.44, F + 0.36, top + 0.78)
        box("glass", dx + 0.1, F + 0.32, top + 0.42, dx + 0.4, F + 0.34, top + 0.74)
        prism("slate", dx - 0.03, dx + 0.53, F + 0.33, F + 0.78, top + 0.85, 0.16)
    box(B, W - 0.32, 1.5, top + 0.4, W - 0.02, 2.2, top + 1.45)
    box("trim", W - 0.35, 1.47, top + 1.45, W + 0.01, 2.23, top + 1.52)
    for py in (1.65, 1.85, 2.05): cyl("pot", W - 0.17, py, top + 1.52, top + 1.72, 0.055, v=8)
    # Front steps, portico with two columns, panelled door and fanlight.
    for s in range(3):
        box("stone", 0.16, 0.04 + s * 0.17, 0.0, 1.04, F, 0.1 * (s + 1) + 0.02)
    for cx in (0.24, 0.96):
        cyl("trim", cx, 0.2, 0.32, g1 - 0.02, 0.055, v=12)
        box("trim", cx - 0.08, 0.12, 0.3, cx + 0.08, 0.28, 0.38)
        box("trim", cx - 0.08, 0.12, g1 - 0.06, cx + 0.08, 0.28, g1)
    box("trim", 0.12, 0.08, g1, 1.08, F, g1 + 0.12, bevel=0.012)
    box("trim", 0.1, 0.06, g1 + 0.12, 1.1, F, g1 + 0.17)
    box(D, 0.36, F - 0.03, 0.32, 0.84, F + 0.01, 1.2)
    for pz in (0.42, 0.8):
        for px in (0.4, 0.62): box(D, px, F - 0.045, pz, px + 0.18, F - 0.03, pz + 0.3)  # raised panels
    box("brass", 0.76, F - 0.06, 0.74, 0.8, F - 0.03, 0.8)
    box("brass", 0.55, F - 0.06, 0.96, 0.65, F - 0.03, 0.99)
    box("lit", 0.38, F - 0.035, 1.24, 0.82, F - 0.01, 1.38)
    for fx in (0.49, 0.6, 0.71): box("trim", fx, F - 0.05, 1.24, fx + 0.02, F - 0.03, 1.38)
    box("trim", 0.32, F - 0.05, 1.2, 0.88, F - 0.02, 1.24)
    box("lit", 0.1, F - 0.12, 1.02, 0.17, F - 0.05, 1.16)                                     # door lantern
    # Ground-floor canted bay window with a lead roof and a balcony rail above.
    bx0, bx1, by = 1.3, 2.84, 0.18
    box(S, bx0 + 0.18, by, 0.3, bx1 - 0.18, F, g1 - 0.05)
    for side, sx in ((-1, bx0 + 0.18), (1, bx1 - 0.18)):
        rotated_box(S, sx + side * 0.07, (by + F) / 2 + 0.02, 0.3, g1 - 0.05, 0.26, 0.06, side * -0.75)
    box("glass", bx0 + 0.25, by - 0.012, 0.55, bx1 - 0.25, by, 1.3)
    for mx in (bx0 + 0.25, (bx0 + bx1) / 2 - 0.02, bx1 - 0.29):
        box("trim", mx, by - 0.03, 0.55, mx + 0.04, by - 0.005, 1.3)
    box("trim", bx0 + 0.22, by - 0.03, 0.9, bx1 - 0.22, by - 0.005, 0.93)
    box("trim", bx0 + 0.15, by - 0.06, 0.5, bx1 - 0.15, by + 0.02, 0.55)
    box("slate", bx0 + 0.1, by - 0.08, g1 - 0.05, bx1 - 0.1, F, g1 + 0.02)
    for k in range(10):
        box("iron", bx0 + 0.15 + k * 0.137, by - 0.02, g1 + 0.02, bx0 + 0.17 + k * 0.137, by, g1 + 0.3)
    box("iron", bx0 + 0.12, by - 0.03, g1 + 0.28, bx1 - 0.12, by + 0.01, g1 + 0.32)
    # Area railings in front of the bay.
    for k in range(14):
        x = 1.12 + k * 0.135
        box("iron", x, 0.05, 0.0, x + 0.025, 0.075, 0.5)
        sphere("iron", x + 0.012, 0.062, 0.52, 0.025, sub=1)
    box("iron", 1.1, 0.04, 0.42, W - 0.02, 0.085, 0.45)
    box("iron", 1.1, 0.04, 0.1, W - 0.02, 0.085, 0.13)
    # Upper storeys: tall first-floor windows (window boxes) and shorter second-floor ones.
    lit_any = random.Random(floors * 7 + ord(variant))
    for x0 in (0.35, 1.42, 2.15):
        window(x0, x0 + 0.5, 1.72, 2.48, F, lit=lit_any.random() < 0.35, head="pediment" if x0 > 1 else "cornice", box_flowers=flowers)
    if floors == 3:
        for x0 in (0.4, 1.47, 2.2):
            window(x0, x0 + 0.42, 2.85, 3.38, F, lit=lit_any.random() < 0.3)
    export(f"terrace-{variant}-{floors}")

# ── Tiered fountain ─────────────────────────────────────────────────────────
def fountain():
    oct_r = 2.35
    rot8 = math.pi / 8
    cyl("stone_dark", 0, 0, 0.0, 0.1, 2.55, v=8, rot=rot8)
    cyl("basin", 0, 0, 0.1, 0.3, 2.2, v=8, rot=rot8)
    ring("stone", oct_r, oct_r - 0.3, 0.1, 0.6, v=8, rot=rot8)
    ring("trim", oct_r + 0.04, oct_r - 0.34, 0.6, 0.68, v=8, rot=rot8)
    for i in range(8):
        a = rot8 + i * math.pi / 4
        px, py = math.cos(a) * (oct_r - 0.12), math.sin(a) * (oct_r - 0.12)
        box("stone", px - 0.17, py - 0.17, 0.1, px + 0.17, py + 0.17, 0.84, bevel=0.02)
        sphere("trim", px, py, 0.94, 0.12, sub=2)
    cyl("water", 0, 0, 0.3, 0.52, 2.15, v=8, rot=math.pi / 8)
    # Pedestal, lower bowl, waterfall curtain.
    cyl("stone", 0, 0, 0.3, 0.55, 0.62, v=20)
    cyl("trim", 0, 0, 0.55, 0.62, 0.5, v=20)
    cyl("stone", 0, 0, 0.62, 1.28, 0.32, v=20, r2=0.26)
    for z in (0.8, 1.05): cyl("trim", 0, 0, z, z + 0.05, 0.33, v=20)
    cyl("stone", 0, 0, 1.28, 1.56, 0.3, v=24, r2=1.2)
    ring("trim", 1.26, 1.12, 1.54, 1.66, v=24)
    cyl("water", 0, 0, 1.56, 1.62, 1.14, v=24)
    for k in range(16):                                     # water streaming off the lower bowl
        a = k * math.tau / 16
        cyl("water", math.cos(a) * 1.21, math.sin(a) * 1.21, 0.5, 1.58, 0.018, v=5, r2=0.03)
    # Upper tier.
    cyl("stone", 0, 0, 1.66, 2.35, 0.17, v=16, r2=0.14)
    cyl("trim", 0, 0, 2.0, 2.05, 0.2, v=16)
    cyl("stone", 0, 0, 2.35, 2.53, 0.16, v=20, r2=0.62)
    ring("trim", 0.67, 0.56, 2.52, 2.61, v=20)
    cyl("water", 0, 0, 2.53, 2.58, 0.57, v=20)
    for k in range(10):                                     # and off the upper tier
        a = k * math.tau / 10 + 0.2
        cyl("water", math.cos(a) * 0.63, math.sin(a) * 0.63, 1.62, 2.56, 0.014, v=5, r2=0.024)
    # Finial and jet.
    cyl("stone", 0, 0, 2.6, 2.85, 0.09, v=12, r2=0.06)
    sphere("gold", 0, 0, 2.95, 0.11, sub=2)
    cyl("water", 0, 0, 3.0, 3.45, 0.05, v=8, r2=0.02)
    export("fountain")

# ── Victorian double lamp post ──────────────────────────────────────────────
def lamp():
    cyl("iron", 0, 0, 0.0, 0.12, 0.24, v=8, rot=math.pi / 8)
    cyl("iron", 0, 0, 0.12, 0.45, 0.17, v=8, r2=0.12, rot=math.pi / 8)
    cyl("iron", 0, 0, 0.45, 0.52, 0.14, v=16)
    cyl("iron", 0, 0, 0.52, 2.55, 0.065, v=12, r2=0.05)
    for z in (1.2, 2.3): cyl("iron", 0, 0, z, z + 0.06, 0.085, v=12)
    box("iron", -0.5, -0.03, 2.62, 0.5, 0.03, 2.68)
    for s in (-1, 1):
        box("iron", s * 0.12 - 0.015, -0.02, 2.4, s * 0.12 + 0.015, 0.02, 2.65)      # scroll brackets
        x = s * 0.44
        cyl("iron", x, 0, 2.38, 2.5, 0.05, v=6, r2=0.12)
        cyl("lit", x, 0, 2.5, 2.82, 0.12, v=6, r2=0.15)
        for k in range(6):
            a = k * math.pi / 3
            box("iron", x + math.cos(a) * 0.135 - 0.01, math.sin(a) * 0.135 - 0.01, 2.5, x + math.cos(a) * 0.135 + 0.01, math.sin(a) * 0.135 + 0.01, 2.82)
        cyl("iron", x, 0, 2.82, 2.98, 0.19, v=6, r2=0.04)
        sphere("iron", x, 0, 3.02, 0.035, sub=1)
        box("iron", x - 0.012, -0.012, 2.68, x + 0.012, 0.012, 2.82)
    sphere("iron", 0, 0, 2.75, 0.06, sub=1)
    cyl("iron", 0, 0, 2.78, 2.98, 0.03, v=6, r2=0.0)
    export("lamp")

# ── Gothic town hall with clock tower ───────────────────────────────────────
def lancet(x0, x1, z0, z1, y, lit=False):
    """A pointed gothic window on a wall at depth y (front faces -Y)."""
    w = x1 - x0
    box("stone_dark", x0 - 0.06, y - 0.04, z0 - 0.06, x1 + 0.06, y + 0.01, z1 + 0.06)
    box("lit" if lit else "glass", x0, y - 0.05, z0, x1, y - 0.02, z1)
    # Pointed head (a triangular gable of glass above the frame).
    # Rebuild as a real diamond via bmesh (simpler and exact).
    bm = bmesh.new(); hw = w / 2
    pts = [(x0, y - 0.05, z1), (x1, y - 0.05, z1), ((x0 + x1) / 2, y - 0.05, z1 + hw * 1.1)]
    back = [(p[0], p[1] + 0.03, p[2]) for p in pts]
    vs = [bm.verts.new(p) for p in pts + back]
    for f in [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]: bm.faces.new([vs[i] for i in f])
    me = bpy.data.meshes.new("arch"); bm.to_mesh(me); bm.free()
    a = bpy.data.objects.new("arch", me); bpy.context.collection.objects.link(a)
    _finish(a, "lit" if lit else "glass")
    box("trim", (x0 + x1) / 2 - 0.015, y - 0.065, z0, (x0 + x1) / 2 + 0.015, y - 0.04, z1 + hw * 0.9)   # mullion
    box("trim", x0, y - 0.065, (z0 + z1) / 2 - 0.015, x1, y - 0.04, (z0 + z1) / 2 + 0.015)            # transom
    box("trim", x0 - 0.1, y - 0.14, z0 - 0.1, x1 + 0.1, y, z0 - 0.04)                                 # sill

def townhall():
    W, D, H = 18.0, 8.0, 6.2
    F = 0.9                                    # front wall line
    stone = colour("hall_stone", (0.86, 0.76, 0.58), 0.8)
    box("stone_dark", 0, F - 0.1, 0, W, D, 0.4)
    box(stone, 0.1, F, 0.4, W - 0.1, D - 0.1, H)
    box("trim", -0.05, F - 0.12, 2.9, W + 0.05, D, 3.05)                       # string course
    box("trim", -0.08, F - 0.2, H, W + 0.08, D, H + 0.2, bevel=0.03)           # cornice
    # Crenellated parapet.
    for k in range(36):
        if k % 2 == 0: box(stone, k * 0.5, F - 0.15, H + 0.2, k * 0.5 + 0.5, F + 0.15, H + 0.62)
    box(stone, 0, F - 0.15, H + 0.2, W, F + 0.15, H + 0.36)
    prism("slate", 0.3, W - 0.3, F + 0.3, D - 0.2, H + 0.2, 3.2, hip=1.6)
    # Buttresses with pinnacles divide the facade into bays.
    bays = [k * 1.5 for k in range(13)]
    for i, bx in enumerate(bays):
        if 7.0 < bx < 11.0: continue
        box(stone, bx - 0.14 if bx > 0 else 0, F - 0.42, 0.4, bx + 0.14 if bx < W else W, F, H + 0.4)
        box("trim", bx - 0.18 if bx > 0 else 0, F - 0.46, 2.85, bx + 0.18 if bx < W else W, F, 3.0)
        pyramid(stone, max(0.14, min(W - 0.14, bx)), F - 0.21, H + 0.4, H + 1.5, 0.2)
        sphere("gold", max(0.14, min(W - 0.14, bx)), F - 0.21, H + 1.55, 0.06, sub=1)
    rnd = random.Random(5)
    for i in range(12):
        x0 = i * 1.5 + 0.38
        if 6.6 < x0 < 11.0: continue
        lancet(x0, x0 + 0.74, 0.9, 2.3, F, lit=rnd.random() < 0.3)
        lancet(x0 + 0.08, x0 + 0.66, 3.4, 5.0, F, lit=rnd.random() < 0.25)
    # Clock tower.
    tx0, tx1, ty0, ty1 = 7.2, 10.8, 0.25, 4.0
    box(stone, tx0, ty0, 0.4, tx1, ty1, 11.4)
    for cx in (tx0, tx1):
        box(stone, cx - 0.2, ty0 - 0.2, 0.4, cx + 0.2, ty0 + 0.2, 12.0)
        pyramid(stone, cx, ty0, 12.0, 13.4, 0.26)
        sphere("gold", cx, ty0, 13.45, 0.08, sub=1)
    for z in (3.0, 6.2, 8.8, 11.4): box("trim", tx0 - 0.08, ty0 - 0.08, z, tx1 + 0.08, ty1 + 0.08, z + 0.15)
    # Grand entrance: pointed arch doorway with steps.
    box("stone_dark", 8.15, ty0 - 0.05, 0.4, 9.85, ty0 + 0.02, 2.7)
    box("wood", 8.35, ty0 - 0.07, 0.4, 9.65, ty0 - 0.03, 2.4)
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in [(8.15, ty0 - 0.06, 2.7), (9.85, ty0 - 0.06, 2.7), (9.0, ty0 - 0.06, 3.5),
                                    (8.15, ty0 + 0.0, 2.7), (9.85, ty0 + 0.0, 2.7), (9.0, ty0 + 0.0, 3.5)]]
    for f in [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]: bm.faces.new([vs[i] for i in f])
    me = bpy.data.meshes.new("door_arch"); bm.to_mesh(me); bm.free()
    a = bpy.data.objects.new("door_arch", me); bpy.context.collection.objects.link(a); _finish(a, "stone_dark")
    box("brass", 8.97, ty0 - 0.09, 0.4, 9.03, ty0 - 0.06, 2.4)
    for s in range(3): box("stone", 7.6 - s * 0.1, ty0 - 0.25 - s * 0.22, 0, 10.4 + s * 0.1, ty0, 0.4 - s * 0.13)
    lancet(8.5, 9.5, 4.0, 5.8, ty0, lit=True)
    lancet(8.6, 9.4, 6.6, 7.9, ty0)
    # Clock faces on the three visible sides: gilded surround, dial, numerals, hands.
    for side in ("front", "left", "right"):
        cx, cz = (tx0 + tx1) / 2, 10.1
        if side == "front":
            box("gold", cx - 1.35, ty0 - 0.06, cz - 1.35, cx + 1.35, ty0, cz + 1.35)
            dial = cyl("clock", cx, ty0 - 0.08, 0, 0.001, 1.15, v=40)
            dial.rotation_euler = (math.pi / 2, 0, 0); dial.location = (cx, ty0 - 0.08, cz)
            ring = cyl("iron", cx, ty0 - 0.07, 0, 0.001, 1.22, v=40)
            ring.rotation_euler = (math.pi / 2, 0, 0); ring.location = (cx, ty0 - 0.065, cz)
            for k in range(12):
                a = k * math.pi / 6
                px, pz = cx + math.sin(a) * 0.95, cz + math.cos(a) * 0.95
                box("iron", px - 0.035, ty0 - 0.1, pz - 0.09, px + 0.035, ty0 - 0.085, pz + 0.09)
            box("iron", cx - 0.035, ty0 - 0.12, cz, cx + 0.035, ty0 - 0.1, cz + 0.6)          # minute hand to 12
            o = box("iron", cx, ty0 - 0.13, cz - 0.035, cx + 0.45, ty0 - 0.11, cz + 0.035)    # hour hand to 3
            sphere("gold", cx, ty0 - 0.13, cz, 0.07, sub=1)
        else:
            x = tx0 if side == "left" else tx1
            sgn = -1 if side == "left" else 1
            box("gold", x - 0.03 if sgn < 0 else x, (ty0 + ty1) / 2 - 1.35, cz - 1.35, x + 0.03 if sgn > 0 else x, (ty0 + ty1) / 2 + 1.35, cz + 1.35)
            dial = cyl("clock", 0, 0, 0, 0.001, 1.15, v=40)
            dial.rotation_euler = (0, math.pi / 2, 0); dial.location = (x + sgn * 0.05, (ty0 + ty1) / 2, cz)
            ring = cyl("iron", 0, 0, 0, 0.001, 1.22, v=40)
            ring.rotation_euler = (0, math.pi / 2, 0); ring.location = (x + sgn * 0.04, (ty0 + ty1) / 2, cz)
            box("iron", x + sgn * 0.06 - 0.01, (ty0 + ty1) / 2 - 0.035, cz, x + sgn * 0.06 + 0.01, (ty0 + ty1) / 2 + 0.035, cz + 0.6)
            box("iron", x + sgn * 0.06 - 0.01, (ty0 + ty1) / 2, cz - 0.035, x + sgn * 0.06 + 0.01, (ty0 + ty1) / 2 + 0.45, cz + 0.035)
    # Belfry and spire.
    box(stone, tx0 + 0.2, ty0 + 0.2, 11.55, tx1 - 0.2, ty1 - 0.2, 13.1)
    for k in range(3):
        lancet(tx0 + 0.55 + k * 0.95, tx0 + 1.1 + k * 0.95, 11.8, 12.6, ty0 + 0.2)
    box("trim", tx0 + 0.05, ty0 + 0.05, 13.1, tx1 - 0.05, ty1 - 0.05, 13.3)
    pyramid("slate", (tx0 + tx1) / 2, (ty0 + ty1) / 2, 13.3, 17.6, 2.3)
    cyl("gold", (tx0 + tx1) / 2, (ty0 + ty1) / 2, 17.4, 18.3, 0.05, v=8, r2=0.01)
    sphere("gold", (tx0 + tx1) / 2, (ty0 + ty1) / 2, 17.55, 0.12, sub=2)
    # Flag on top? Keep the skyline clean: four gilded corner pinnacles instead.
    for px in (tx0 + 0.25, tx1 - 0.25):
        for py in (ty0 + 0.25, ty1 - 0.25):
            pyramid(stone, px, py, 13.3, 14.5, 0.18)
    # Lanterns either side of the entrance.
    for lx in (7.6, 10.4):
        box("iron", lx - 0.04, ty0 - 0.3, 0.4, lx + 0.04, ty0 - 0.22, 2.0)
        cyl("lit", lx, ty0 - 0.26, 2.0, 2.35, 0.12, v=6, r2=0.15)
        cyl("iron", lx, ty0 - 0.26, 2.35, 2.5, 0.18, v=6, r2=0.03)
    export("townhall")

# ── Blossom tree ────────────────────────────────────────────────────────────
def blossom():
    cyl("bark", 0, 0, 0, 1.1, 0.11, v=8, r2=0.08)
    for a, l in ((0.4, 0.55), (2.4, 0.5), (4.3, 0.6)):
        o = cyl("bark", 0, 0, 0, l, 0.06, v=6, r2=0.035)
        o.rotation_euler = (0.7, 0, a); o.location = (math.cos(a) * 0.15, math.sin(a) * 0.15, 1.05)
    rnd = random.Random(3)
    for k in range(14):
        a = rnd.random() * math.tau; r = rnd.random() * 0.62
        sphere("blossom" if k % 3 else "blossom2", math.cos(a) * r, math.sin(a) * r, 1.45 + rnd.random() * 0.55, 0.32 + rnd.random() * 0.18, sub=2, sz=0.8)
    cyl("stone", 0, 0, 0, 0.12, 0.42, v=12)
    export("blossom")

MODELS = {"fountain": fountain, "lamp": lamp, "townhall": townhall, "blossom": blossom}
for v in TERRACES:
    for f in (2, 3):
        MODELS[f"terrace-{v}-{f}"] = (lambda v=v, f=f: terrace(v, f))

def render_setup(cam_loc, target, lens=40, res=(1200, 900)):
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 40; sc.cycles.device = "CPU"
    sc.render.resolution_x, sc.render.resolution_y = res
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.62, 0.72, 0.86, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.55
    bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, -0.001))
    bpy.context.object.data.materials.append(mat("paving", (0.82, 0.78, 0.7), 0.9))
    bpy.ops.object.light_add(type="SUN", location=(4, -6, 9)); s = bpy.context.object; s.data.energy = 2.4
    s.rotation_euler = (math.radians(48), 0, math.radians(-35)); s.data.angle = math.radians(6)
    cl = Vector(cam_loc)
    bpy.ops.object.camera_add(location=cl); cam = bpy.context.object; cam.data.lens = lens
    cam.rotation_euler = (Vector(target) - cl).to_track_quat("-Z", "Y").to_euler(); sc.camera = cam
    sc.view_settings.view_transform = "AgX"

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "export"
    if cmd == "export":
        names = sys.argv[2:] or list(MODELS)
        for n in names:
            reset(); MODELS[n]()
    elif cmd == "render":
        NO_EXPORT = True
        name, out = sys.argv[2], sys.argv[3]
        reset(); MODELS[name]()
        o = bpy.context.object
        bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
        lo = Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb)))
        hi = Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb)))
        c = (lo + hi) / 2; size = (hi - lo).length
        render_setup((c.x - size * 0.55, c.y - size * 1.05, c.z + size * 0.55), (c.x, c.y, c.z * 0.85))
        bpy.context.scene.render.filepath = out; bpy.ops.render.render(write_still=True)
    elif cmd == "sheet":
        NO_EXPORT = True
        out = sys.argv[2]
        reset()
        # A street of terraces, the fountain in front and the town hall behind.
        x = -9.0
        for v in ("a", "b", "c", "a", "b", "c"):
            terrace(v, 3 if v != "b" else 2)
            new = bpy.context.object; new.location = (x, 4.0, 0); x += 3.0
            OBJS.clear()
        fountain(); f = bpy.context.object; f.location = (0, -3.5, 0); OBJS.clear()
        for lx in (-3.5, 3.5):
            lamp(); l = bpy.context.object; l.location = (lx, -3.5, 0); OBJS.clear()
        blossom(); b = bpy.context.object; b.location = (-6, -2, 0); OBJS.clear()
        blossom(); b = bpy.context.object; b.location = (6, -2, 0); OBJS.clear()
        townhall(); t = bpy.context.object; t.location = (-9, 12, 0); OBJS.clear()
        render_setup((14, -22, 13), (0, 3, 2.5), lens=32, res=(1600, 1000))
        bpy.context.scene.render.filepath = out; bpy.ops.render.render(write_still=True)
