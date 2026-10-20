"""
Animated London pieces, rendered with the same camera and finish as the city:
the London Eye wheel (8 frames that loop as it turns), red buses and black cabs
in four directions, and a riverboat in two.

  blender -b --python build_movers.py -- out_dir
"""
import bpy, bmesh, math, os, sys, json
# Cloud CI sprite regeneration workflow is tracked alongside this generator.

import numpy as np
from mathutils import Vector

OUT = sys.argv[sys.argv.index("--") + 1:][0]
os.makedirs(OUT, exist_ok=True)
ELEV = math.radians(42)
PPU = 64

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.render.film_transparent = True
sc.display.render_aa = "OFF"
sc.render.dither_intensity = 0.0
sc.view_settings.view_transform = "Standard"
sh = sc.display.shading
sh.show_specular_highlight = False

def lin(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)

MATS = {}
def mat(h):
    if h not in MATS:
        m = bpy.data.materials.new(h)
        m.diffuse_color = (*lin(h), 1)
        MATS[h] = m
    return MATS[h]

ALL = []
def obj(op, colour, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0), parent=None, **kw):
    op(location=loc, rotation=rot, **kw)
    o = bpy.context.object
    o.scale = scale
    o.data.materials.append(mat(colour))
    if parent:
        o.parent = parent
    ALL.append(o)
    return o

def box(c, loc, size, parent=None, rot=(0, 0, 0)):
    return obj(bpy.ops.mesh.primitive_cube_add, c, loc, tuple(s / 2 for s in size), rot, parent)

def cyl(c, loc, r, depth, parent=None, rot=(0, 0, 0), v=20):
    return obj(bpy.ops.mesh.primitive_cylinder_add, c, loc, (1, 1, 1), rot, parent, radius=r, depth=depth, vertices=v)

def ball(c, loc, r, parent=None, scale=(1, 1, 1)):
    o = obj(bpy.ops.mesh.primitive_uv_sphere_add, c, loc, scale, (0, 0, 0), parent, radius=r, segments=16, ring_count=8)
    return o

def empty(name, loc=(0, 0, 0)):
    o = bpy.data.objects.new(name, None)
    sc.collection.objects.link(o)
    o.location = loc
    return o

cam_data = bpy.data.cameras.new("cam")
cam_data.type = "ORTHO"
cam = bpy.data.objects.new("cam", cam_data)
sc.collection.objects.link(cam)
sc.camera = cam
theta = math.radians(90) - ELEV
cam.rotation_euler = (theta, 0, 0)
up = Vector((0, math.cos(theta), math.sin(theta)))
view = Vector((0, math.sin(theta), -math.cos(theta)))

def show(group):
    for o in ALL:
        o.hide_render = o not in group

def render_arr():
    path = f"/tmp/_mv{os.getpid()}.png"
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]
    bpy.data.images.remove(img)
    return a

def shoot(name, group, w_tiles, up_tiles, down_tiles, frames, setup):
    """Renders frames around the origin: w_tiles wide, from down_tiles below the ground point to up_tiles above (view units)."""
    show(group)
    wpx = int(w_tiles * PPU)
    hpx = int((up_tiles + down_tiles) * PPU)
    sc.render.resolution_x, sc.render.resolution_y = wpx, hpx
    cam_data.ortho_scale = max(wpx, hpx) / PPU
    cv = (up_tiles - down_tiles) / 2
    cam.location = up * cv - view * 200
    colours, lights, ids = [], [], []
    for f in range(frames):
        setup(f)
        bpy.context.view_layer.update()
        sh.light = "FLAT"; sh.color_type = "TEXTURE"
        colours.append(render_arr())
        sh.light = "STUDIO"; sh.color_type = "SINGLE"; sh.single_color = (1, 1, 1)
        lights.append(render_arr()[..., 0])
        sh.light = "FLAT"; sh.color_type = "RANDOM"
        ids.append(render_arr()[..., :3])
    np.savez_compressed(os.path.join(OUT, f"{name}.npz"), colour=np.stack(colours).astype(np.float16),
                        light=np.stack(lights).astype(np.float16), id=np.stack(ids).astype(np.float16))
    META[name] = {"frames": frames, "w": wpx // 2, "h": int(round(hpx / 2 / math.sin(ELEV))),
                  "ax": wpx // 4, "ay": int(round(up_tiles * PPU / 2 / math.sin(ELEV)))}
    print("DONE", name, flush=True)

META = {}

# ── London Eye wheel ─────────────────────────────────────────────────────────
hub = empty("hub", (0, 0, 5.4))
R = 4.6
eye = []
rim = obj(bpy.ops.mesh.primitive_torus_add, "#e8ecf2", (0, 0, 0), (1, 1, 1), (math.radians(90), 0, 0), hub, major_radius=R, minor_radius=0.09, major_segments=64, minor_segments=8)
rim2 = obj(bpy.ops.mesh.primitive_torus_add, "#cfd6e0", (0, 0, 0), (1, 1, 1), (math.radians(90), 0, 0), hub, major_radius=R - 0.35, minor_radius=0.05, major_segments=64, minor_segments=6)
eye += [rim, rim2]
for i in range(16):
    a = i / 16 * math.tau
    s = box("#dfe4ea", (math.cos(a) * R / 2, 0, math.sin(a) * R / 2), (R, 0.04, 0.04), hub, rot=(0, -a, 0))
    eye.append(s)
eye.append(cyl("#cfd6e0", (0, 0, 0), 0.35, 0.3, hub, rot=(math.radians(90), 0, 0)))
pods = []
for i in range(32):
    a = i / 32 * math.tau
    p = ball("#f4f6fa", (math.cos(a) * (R + 0.18), -0.05, math.sin(a) * (R + 0.18)), 0.22, hub, scale=(1.25, 1, 0.9))
    pods.append(p)
    eye.append(p)
for dx in (-1.9, 1.9):
    eye.append(box("#e4e8ee", (dx * 0.5, 0.6, 2.7), (0.14, 0.14, 5.6), rot=(math.radians(-14), math.radians(dx * 6), 0)))

def turn(f):
    hub.rotation_euler = (0, f / 8 * (math.tau / 32), 0)
    for p in pods:
        p.rotation_euler = (0, -hub.rotation_euler.y, 0)

shoot("eye", eye, 10.6, 10.6, 0.6, 8, turn)

# ── Red double-decker bus (modern London double-decker) ──────────────────────
def bevel(o, w=0.08):
    m = o.modifiers.new("bv", "BEVEL"); m.width = w; m.segments = 3
    return o

bus_root = empty("bus")
def busbody(parent):
    """Rounded London double-decker with two full decks and kerbside doors."""
    red, dark, glass, ink, cream = "#c9182c", "#a91224", "#162834", "#20272c", "#e7d9bd"
    parts = [
        bevel(box(red, (0, 0, 1.48), (3.05, 1.06, 2.65), parent), 0.22),
        box(ink, (0, 0, 0.29), (3.07, 1.07, 0.18), parent),
        box(dark, (0, 0, 1.46), (3.06, 1.08, 0.15), parent),
        box(cream, (0, 0, 1.54), (3.07, 1.09, 0.045), parent),
        bevel(box(dark, (0, 0, 2.81), (2.7, 0.95, 0.13), parent), 0.06),
        box("#a6afb0", (-0.35, 0, 2.9), (0.52, 0.42, 0.12), parent),
    ]
    # Full-length upper and lower windows, with a regular red frame.
    for side in (-1, 1):
        y = side * 0.55
        for z, height in ((1.03, 0.48), (2.1, 0.63)):
            parts.append(box(ink, (-0.08, y, z), (2.63, 0.035, height + 0.07), parent))
            parts.append(box(glass, (-0.08, y + side * 0.026, z), (2.55, 0.025, height), parent))
            for x in (-1.17, -0.8, -0.43, -0.06, 0.31, 0.68, 1.05):
                parts.append(box(red, (x, y + side * 0.035, z), (0.05, 0.06, height), parent))
        parts.append(box(red, (0, y, 1.69), (2.75, 0.09, 0.15), parent))
        parts.append(box(cream, (0, y + side * 0.05, 1.58), (2.75, 0.035, 0.04), parent))
    # Two double doors on the +Y kerb side, each with a central stile.
    for x in (-0.22, 0.92):
        parts.append(box(ink, (x, 0.59, 0.96), (0.45, 0.055, 1.15), parent))
        parts.append(box(glass, (x, 0.625, 1.01), (0.38, 0.025, 0.94), parent))
        parts.append(box(cream, (x, 0.655, 1.01), (0.035, 0.035, 0.94), parent))
        parts.append(box(cream, (x, 0.66, 0.78), (0.4, 0.035, 0.04), parent))
        parts.append(box(cream, (x, 0.66, 0.42), (0.46, 0.035, 0.05), parent))
    # Front destination display, twin windscreens and the dark curved nose.
    parts.extend([
        box(ink, (1.55, 0, 2.56), (0.08, 0.88, 0.25), parent),
        box("#ffce78", (1.6, -0.24, 2.58), (0.025, 0.18, 0.09), parent),
        box(cream, (1.6, 0.13, 2.58), (0.025, 0.4, 0.065), parent),
        box(glass, (1.57, 0, 1.97), (0.07, 0.89, 0.76), parent),
        box(red, (1.61, 0, 1.61), (0.05, 0.95, 0.13), parent),
        box(glass, (1.58, 0, 1.12), (0.07, 0.87, 0.74), parent),
        box(cream, (1.63, 0, 1.12), (0.035, 0.035, 0.74), parent),
        box(ink, (1.59, 0, 0.54), (0.11, 0.89, 0.36), parent),
    ])
    for y in (-0.36, 0.36):
        parts.append(cyl("#fff0ca", (1.67, y, 0.86), 0.11, 0.04, parent, rot=(0, math.radians(90), 0)))
        parts.append(box("#e34b47", (-1.58, y, 0.82), (0.035, 0.17, 0.3), parent))
    for x in (-1.0, 0.94):
        for side in (-1, 1):
            y = side * 0.55
            parts.append(cyl(ink, (x, y, 0.35), 0.29, 0.15, parent, rot=(math.radians(90), 0, 0)))
            parts.append(cyl("#aeb7b5", (x, side * 0.64, 0.35), 0.13, 0.16, parent, rot=(math.radians(90), 0, 0)))
    return parts

bus = busbody(bus_root)
for d, rz in (("E", 0), ("W", math.pi), ("N", math.pi / 2), ("S", -math.pi / 2)):
    shoot(f"bus-{d}", bus, 3.8, 3.7, 1.4, 1, lambda f, rz=rz: setattr(bus_root, "rotation_euler", (0, 0, rz)))

# ── Black cab ────────────────────────────────────────────────────────────────
cab_root = empty("cab")
cab = [
    bevel(box("#24222b", (0, 0, 0.42), (1.6, 0.8, 0.5), cab_root)),
    bevel(box("#24222b", (-0.1, 0, 0.82), (1.0, 0.76, 0.42), cab_root)),
    box("#54607a", (-0.1, 0, 0.84), (1.02, 0.78, 0.26), cab_root),
    box("#ffd166", (-0.1, 0, 1.08), (0.24, 0.12, 0.08), cab_root),
]
for x in (-0.55, 0.55):
    for y in (-0.4, 0.4):
        cab.append(cyl("#1a1820", (x, y, 0.18), 0.18, 0.1, cab_root, rot=(math.radians(90), 0, 0)))
for d, rz in (("E", 0), ("W", math.pi), ("N", math.pi / 2), ("S", -math.pi / 2)):
    shoot(f"cab-{d}", cab, 2.2, 2.0, 1.0, 1, lambda f, rz=rz: setattr(cab_root, "rotation_euler", (0, 0, rz)))

# ── Everyday traffic: Kenney car kit (CC0), textured ────────────────────────
KIT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "kenney", "car-kit")
for car in ("sedan", "van", "suv", "police", "ambulance", "delivery", "hatchback-sports"):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(KIT, f"{car}.glb"))
    new_objs = [o for o in bpy.data.objects if o not in before]
    root = empty(f"car-{car}")
    meshes = [o for o in new_objs if o.type == "MESH"]
    for o in new_objs:
        if o.parent is None:
            o.parent = root
    bpy.context.view_layer.update()
    xs = [ (o.matrix_world @ Vector(c)).x for o in meshes for c in o.bound_box]
    ys = [ (o.matrix_world @ Vector(c)).y for o in meshes for c in o.bound_box]
    long = max(max(xs) - min(xs), max(ys) - min(ys))
    target = 2.0 if car in ("van", "ambulance", "delivery") else 1.7
    root.scale = (target / long,) * 3
    # Kenney cars face -Y/+Z; turn so the nose points +X like the bus.
    face = math.pi / 2  # glTF noses point -Y after import
    ALL.extend(meshes)
    for d, rz in (("E", 0), ("W", math.pi), ("N", math.pi / 2), ("S", -math.pi / 2)):
        shoot(f"{car}-{d}", meshes, 2.6, 2.0, 1.0, 1, lambda f, rz=rz, root=root, face=face: setattr(root, "rotation_euler", (0, 0, rz + face)))
        META[f"{car}-{d}"]["tex"] = True

# ── Riverboat ────────────────────────────────────────────────────────────────
boat_root = empty("boat", (0, 0, -0.3))
boat = [
    box("#f4f0ea", (0, 0, 0.2), (3.4, 1.1, 0.4), boat_root),
    box("#2d6a8f", (0, 0, 0.42), (3.42, 1.12, 0.08), boat_root),
    box("#f4f0ea", (-0.2, 0, 0.7), (2.2, 0.9, 0.5), boat_root),
    box("#3e4658", (-0.2, 0, 0.74), (2.22, 0.92, 0.22), boat_root),
]
for d, rz in (("E", 0), ("W", math.pi)):
    shoot(f"boat-{d}", boat, 4.2, 2.0, 1.0, 1, lambda f, rz=rz: setattr(boat_root, "rotation_euler", (0, 0, rz)))

json.dump(META, open(os.path.join(OUT, "meta.json"), "w"))
