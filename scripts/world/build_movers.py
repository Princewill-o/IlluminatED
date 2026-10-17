"""
Animated London pieces, rendered with the same camera and finish as the city:
the London Eye wheel (8 frames that loop as it turns), red buses and black cabs
in four directions, and a riverboat in two.

  blender -b --python build_movers.py -- out_dir
"""
import bpy, bmesh, math, os, sys, json
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
    """A New Routemaster-style double-decker: rounded roof, wraparound upper glass,
    diagonal glazed staircases front and back, sloping lower windscreen, black nose."""
    red, glass, ink, white = "#d72a22", "#1c2430", "#15151c", "#eef0f4"
    parts = [
        bevel(box(red, (0, 0, 1.15), (2.8, 0.98, 1.98), parent), 0.3),            # body, very rounded roof edges
        box(glass, (-0.1, 0, 1.62), (2.3, 1.0, 0.42), parent),                     # upper deck band
        box(glass, (1.25, 0, 1.62), (0.34, 0.99, 0.42), parent),                   # wraparound front corner glass
        bevel(box(glass, (1.39, 0, 1.62), (0.04, 0.84, 0.46), parent), 0.02),      # upper windscreen
        box(glass, (-0.4, 0, 0.82), (1.4, 1.0, 0.38), parent),                     # lower deck windows
        box(red, (-0.45, 0, 0.82), (0.06, 1.01, 0.38), parent),                    # pillar
        box(red, (0.35, 0, 1.62), (0.06, 1.01, 0.42), parent),
        box(red, (-0.65, 0, 1.62), (0.06, 1.01, 0.42), parent),
    ]
    # The swoosh: diagonal glazed staircases at the front and the back.
    for x0, tilt in ((0.75, 0.62), (-1.15, -0.62)):
        parts.append(box(glass, (x0, 0, 1.2), (0.26, 1.0, 1.15), parent, rot=(0, tilt, 0)))
    parts += [
        box(glass, (1.31, 0, 0.75), (0.16, 0.86, 0.7), parent, rot=(0, -0.28, 0)),   # sloping lower windscreen
        box(ink, (1.33, 0, 0.3), (0.12, 0.9, 0.3), parent),                           # black nose
        box(ink, (1.38, 0, 1.2), (0.05, 0.72, 0.2), parent),                          # dot-matrix destination
        box(white, (1.41, 0.12, 1.2), (0.02, 0.36, 0.08), parent),                    # destination text
        box("#ffb020", (1.41, -0.26, 1.2), (0.02, 0.12, 0.1), parent),               # route number
        box(glass, (0.98, 0.5, 0.62), (0.36, 0.02, 0.9), parent),                     # doors (kerb side)
        box(glass, (-0.1, 0.5, 0.62), (0.4, 0.02, 0.9), parent),
        box(glass, (-1.25, 0.5, 0.62), (0.3, 0.02, 0.9), parent),
        box(ink, (0, 0, 0.17), (2.82, 1.0, 0.12), parent),                            # skirt
        box(white, (-0.2, -0.5, 1.2), (0.5, 0.02, 0.05), parent),                     # fleet stripe detail
    ]
    for y in (-0.36, 0.36):
        parts.append(cyl(white, (1.4, y, 0.36), 0.1, 0.04, parent, rot=(0, math.radians(90), 0)))   # round headlights
    for x in (-0.95, 0.85):
        for y in (-0.47, 0.47):
            parts.append(cyl("#2a2730", (x, y, 0.22), 0.25, 0.14, parent, rot=(math.radians(90), 0, 0)))
            parts.append(cyl("#9aa0ab", (x, y * 1.03, 0.22), 0.12, 0.15, parent, rot=(math.radians(90), 0, 0)))
    return parts
bus = busbody(bus_root)
for d, rz in (("E", 0), ("W", math.pi), ("N", math.pi / 2), ("S", -math.pi / 2)):
    shoot(f"bus-{d}", bus, 3.4, 3.4, 1.4, 1, lambda f, rz=rz: setattr(bus_root, "rotation_euler", (0, 0, rz)))

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
