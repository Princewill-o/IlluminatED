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
        sh.light = "FLAT"; sh.color_type = "MATERIAL"
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

# ── Red double-decker bus ────────────────────────────────────────────────────
bus_root = empty("bus")
bus = []
def busbody(parent):
    parts = [
        box("#d4342c", (0, 0, 1.05), (2.6, 0.95, 1.9), parent),
        box("#2f3644", (0.0, 0.0, 1.45), (2.62, 0.97, 0.38), parent),     # upper windows
        box("#2f3644", (0.15, 0.0, 0.62), (2.3, 0.97, 0.36), parent),     # lower windows
        box("#f4f0ea", (0, 0, 2.02), (2.6, 0.95, 0.06), parent),          # roof
        box("#ffd166", (0, 0, 0.95), (2.62, 0.97, 0.06), parent),         # yellow stripe
        box("#2f3644", (1.31, 0, 1.05), (0.02, 0.8, 1.5), parent),        # windscreen
    ]
    for x in (-0.85, 0.85):
        for y in (-0.48, 0.48):
            parts.append(cyl("#2a2730", (x, y, 0.22), 0.22, 0.12, parent, rot=(math.radians(90), 0, 0)))
    return parts
bus = busbody(bus_root)
for d, rz in (("E", 0), ("W", math.pi), ("N", math.pi / 2), ("S", -math.pi / 2)):
    shoot(f"bus-{d}", bus, 3.4, 3.2, 1.4, 1, lambda f, rz=rz: setattr(bus_root, "rotation_euler", (0, 0, rz)))

# ── Black cab ────────────────────────────────────────────────────────────────
cab_root = empty("cab")
cab = [
    box("#24222b", (0, 0, 0.42), (1.6, 0.8, 0.5), cab_root),
    box("#24222b", (-0.1, 0, 0.82), (1.0, 0.76, 0.42), cab_root),
    box("#54607a", (-0.1, 0, 0.84), (1.02, 0.78, 0.26), cab_root),
    box("#ffd166", (-0.1, 0, 1.08), (0.24, 0.12, 0.08), cab_root),
]
for x in (-0.55, 0.55):
    for y in (-0.4, 0.4):
        cab.append(cyl("#1a1820", (x, y, 0.18), 0.18, 0.1, cab_root, rot=(math.radians(90), 0, 0)))
for d, rz in (("E", 0), ("W", math.pi), ("N", math.pi / 2), ("S", -math.pi / 2)):
    shoot(f"cab-{d}", cab, 2.2, 2.0, 1.0, 1, lambda f, rz=rz: setattr(cab_root, "rotation_euler", (0, 0, rz)))

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
