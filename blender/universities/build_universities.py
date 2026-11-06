"""
Builds the nine university landmark models in Blender and exports one GLB each
to public/world3d/universities/<id>.glb.

Run headless:  python3 blender/universities/build_universities.py

Each model faces +Y in Blender (the street side), sits on the ground with its
footprint centred on the origin, and is about 20 m wide by 14 m deep. The game
scales it to the plot. Shapes follow each university's best-known building:

  ucl         Wilkins Building: Portico, ten columns, pediment, drum and dome
  imperial    Queen's Tower: stone campanile, copper cupola, with a modern wing
  kcl         Strand frontage: rusticated base, columned centre, attic and flag
  lse         Marshall Building: dark grid facade, glass, cantilevered top
  kent        Templeman-era concrete: pilotis, strip windows, roof terrace
  ntu         Newton Building: Portland stone block with a clock tower
  birmingham  Aston Webb: red-brick crescent, central dome and Old Joe tower
  manchester  Whitworth Hall: sandstone gothic, pointed windows, spire tower
  edinburgh   Old College: dark stone, columned arch, dome with gold figure

Stylised to match the game's chunky look, not survey-accurate.
"""
import math
import os
import sys

import bpy  # noqa: I001  (bpy must load before bmesh when run as a module)
import bmesh

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "world3d", "universities")


# ── Scene and materials ──────────────────────────────────────────────────────
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


MATS = {}


def mat(name, colour, rough=0.85, metal=0.0, emit=0.0):
    key = (name, colour)
    if key in MATS:
        return MATS[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    r, g, b = (int(colour[i:i + 2], 16) / 255 for i in (1, 3, 5))
    # sRGB to linear for the base colour socket.
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in (r, g, b)]
    bsdf.inputs["Base Color"].default_value = (*lin, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emit:
        bsdf.inputs["Emission Color"].default_value = (*lin, 1)
        bsdf.inputs["Emission Strength"].default_value = emit
    MATS[key] = m
    return m


PARTS = []


def link(obj, material):
    obj.data.materials.append(material)
    bpy.context.collection.objects.link(obj) if obj.name not in bpy.context.collection.objects else None
    PARTS.append(obj)
    return obj


def box(x0, y0, z0, x1, y1, z1, material, bevel=0.0):
    """An axis-aligned box from corner to corner (metres). Y is depth, +Y faces the street."""
    me = bpy.data.meshes.new("box")
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("box", me)
    ob.scale = (abs(x1 - x0), abs(y1 - y0), abs(z1 - z0))
    ob.location = ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    link(ob, material)
    if bevel:
        mod = ob.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 1
    return ob


def cylinder(x, y, z0, z1, r, material, seg=12, r_top=None):
    me = bpy.data.meshes.new("cyl")
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r_top is None else r_top, depth=z1 - z0)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("cyl", me)
    ob.location = (x, y, (z0 + z1) / 2)
    return link(ob, material)


def cone(x, y, z0, z1, r, material, seg=4, rot=math.pi / 4):
    ob = cylinder(x, y, z0, z1, r, material, seg=seg, r_top=0.001)
    ob.rotation_euler[2] = rot
    return ob


def dome(x, y, z, r, material, height=1.0, seg=20):
    me = bpy.data.meshes.new("dome")
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=10, radius=r)
    # Keep the top half.
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context="VERTS")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("dome", me)
    ob.location = (x, y, z)
    ob.scale = (1, 1, height)
    return link(ob, material)


def prism(x0, x1, y0, y1, z0, z1, material):
    """A triangular pediment / gable: ridge runs along Y, apex centred on X."""
    me = bpy.data.meshes.new("prism")
    xm = (x0 + x1) / 2
    verts = [(x0, y0, z0), (x1, y0, z0), (xm, y0, z1), (x0, y1, z0), (x1, y1, z0), (xm, y1, z1)]
    faces = [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]
    me.from_pydata(verts, [], faces)
    ob = bpy.data.objects.new("prism", me)
    return link(ob, material)


def roof_x(x0, x1, y0, y1, z0, z1, material):
    """A pitched roof whose ridge runs along X."""
    me = bpy.data.meshes.new("roof")
    ym = (y0 + y1) / 2
    verts = [(x0, y0, z0), (x0, y1, z0), (x0, ym, z1), (x1, y0, z0), (x1, y1, z0), (x1, ym, z1)]
    faces = [(0, 2, 1), (3, 4, 5), (0, 3, 5, 2), (1, 2, 5, 4), (0, 1, 4, 3)]
    me.from_pydata(verts, [], faces)
    ob = bpy.data.objects.new("roof", me)
    return link(ob, material)


def column(x, y, z0, z1, r, material, cap=None):
    cap = cap or material
    cylinder(x, y, z0, z0 + 0.18, r * 1.35, cap, seg=10)
    cylinder(x, y, z0 + 0.18, z1 - 0.25, r, material, seg=12)
    box(x - r * 1.4, y - r * 1.4, z1 - 0.25, x + r * 1.4, y + r * 1.4, z1, cap)


def windows(x0, x1, y, rows, material, gap=1.4, w=0.7, h=1.3, depth=0.06, arch=False, frame=None):
    """Window panes set into a facade at depth y (front faces +Y)."""
    n = max(1, int((x1 - x0) / gap))
    step = (x1 - x0) / n
    for i in range(n):
        cx = x0 + step * (i + 0.5)
        for z in rows:
            if frame:
                box(cx - w / 2 - 0.08, y, z - 0.08, cx + w / 2 + 0.08, y + depth * 0.6, z + h + 0.08, frame)
            box(cx - w / 2, y, z, cx + w / 2, y + depth, z + h, material)
            if arch:
                cylinder(cx, y + depth / 2, z + h - 0.01, z + h + 0.01, w / 2, material, seg=10).rotation_euler[0] = math.pi / 2


def side_windows(x, y0, y1, rows, material, gap=1.6, w=0.7, h=1.3, depth=0.06):
    n = max(1, int((y1 - y0) / gap))
    step = (y1 - y0) / n
    for i in range(n):
        cy = y0 + step * (i + 0.5)
        for z in rows:
            box(x, cy - w / 2, z, x + depth, cy + w / 2, z + h, material)


def steps(x0, x1, y_front, n, material, rise=0.18, run=0.4):
    for i in range(n):
        box(x0 - i * 0.25, y_front + i * run, 0, x1 + i * 0.25, y_front + (i + 1) * run, rise * (n - i), material)


def export(name, preview_dir=None):
    bpy.ops.object.select_all(action="DESELECT")
    for ob in PARTS:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = PARTS[0]
    # One mesh per building (one draw call per material in the game).
    bpy.ops.object.convert(target="MESH")
    bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    joined.name = name
    PARTS[:] = [joined]
    if preview_dir:
        preview(name, preview_dir)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"{name}.glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True,
                              export_yup=True, export_materials="EXPORT", export_cameras=False, export_lights=False)
    tris = sum(sum(len(p.vertices) - 2 for p in ob.data.polygons) for ob in PARTS)
    print(f"{name}: {len(PARTS)} parts, ~{tris} tris, {os.path.getsize(path) // 1024} KB")


def preview(name, folder):
    """A three-quarter render for checking the model."""
    scene = bpy.context.scene
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    scene.collection.objects.link(cam)
    ob = PARTS[0]
    top = max((ob.matrix_world @ v.co).z for v in ob.data.vertices)
    aim = bpy.data.objects.new("aim", None)
    aim.location = (0, 0, top * 0.42)
    scene.collection.objects.link(aim)
    reach = max(24, top * 1.25)
    cam.location = (reach * 0.62, reach * 1.05, top * 0.42 + reach * 0.55)
    track = cam.constraints.new("TRACK_TO")
    track.target = aim
    cam.data.lens = 30
    scene.camera = cam
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy = 3.5
    sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(150))
    scene.collection.objects.link(sun)
    world = bpy.data.worlds.new("w"); world.color = (0.55, 0.62, 0.7); scene.world = world
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 12
    scene.cycles.use_denoising = False
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.55, 0.62, 0.7, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8
    scene.render.resolution_x, scene.render.resolution_y = 640, 480
    scene.render.filepath = os.path.join(folder, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam); bpy.data.objects.remove(sun); bpy.data.objects.remove(aim)


# ── The buildings ────────────────────────────────────────────────────────────
GLASS = "#33495a"


def ucl():
    stone, shade, col, lead = mat("portland", "#e9e3d4"), mat("shade", "#cfc6b2"), mat("column", "#f4efe4"), mat("lead", "#b9c3c0", 0.6, 0.3)
    glass = mat("glass", GLASS, 0.3, 0.2)
    box(-10, -7, 0, 10, 4, 9, stone)                       # main block
    box(-10.1, -7.1, 9, 10.1, 4.1, 9.6, shade)              # cornice
    windows(-9.4, -4.2, 4.02, [1.5, 5], glass, gap=1.5, frame=shade)
    windows(4.2, 9.4, 4.02, [1.5, 5], glass, gap=1.5, frame=shade)
    steps(-4.4, 4.4, 4, 5, stone)
    box(-4.2, 4, 0, 4.2, 7, 1.2, stone)                     # podium
    for i in range(10):
        column(-3.75 + i * (7.5 / 9), 6.5, 1.2, 8.2, 0.3, col, shade)
    for i in range(4):
        column(-3.75 + i * 2.5, 4.9, 1.2, 8.2, 0.26, col, shade)
    box(-4.3, 4, 8.2, 4.3, 7.2, 9.1, shade)                 # entablature
    prism(-4.3, 4.3, 7.2, 4, 9.1, 11.2, stone)               # pediment (ridge into the building)
    p = PARTS[-1]
    p.rotation_euler[0] = 0
    # Drum, colonnade, dome and lantern sit behind the portico.
    cylinder(0, -1, 9.6, 12.4, 3.2, stone, seg=24)
    for i in range(16):
        a = i / 16 * math.tau
        column(math.cos(a) * 3.45, -1 + math.sin(a) * 3.45, 9.6, 12.2, 0.16, col, shade)
    cylinder(0, -1, 12.4, 12.9, 3.7, shade, seg=24)
    dome(0, -1, 12.9, 3.3, lead, height=0.95, seg=24)
    cylinder(0, -1, 16, 17.3, 0.6, stone, seg=10)
    for i in range(6):
        a = i / 6 * math.tau
        column(math.cos(a) * 0.65, -1 + math.sin(a) * 0.65, 16, 17.2, 0.06, col)
    dome(0, -1, 17.3, 0.75, lead, height=0.9, seg=12)
    cylinder(0, -1, 17.9, 18.6, 0.05, lead)


def imperial():
    stone, band, copper, brick = mat("tower", "#d7c7a8"), mat("band", "#bfae8e"), mat("copper", "#6fa58f", 0.5, 0.35), mat("modern", "#c7cdd3")
    glass, dark = mat("glass", "#5d7f99", 0.25, 0.2), mat("dark", "#2e3a46")
    box(-10, -7, 0, 2, 5, 7, brick)                         # modern wing
    for z in (0.6, 2.7, 4.8):
        box(-9.8, 5, z, 1.8, 5.06, z + 1.5, glass)
    box(2, -4, 0, 10, 5, 4, mat("blue", "#2e5c7a"))
    tx, ty, half = 6, 0, 1.7
    box(tx - half, ty - half, 0, tx + half, ty + half, 22, stone)
    for z in (5, 10, 15, 20):
        box(tx - half - 0.12, ty - half - 0.12, z, tx + half + 0.12, ty + half + 0.12, z + 0.35, band)
    for z in (6.5, 11.5, 16.5):
        for dx, dy, sx, sy in ((0, half, 1.1, 0.06), (0, -half - 0.06, 1.1, 0.06), (half, 0, 0.06, 1.1), (-half - 0.06, 0, 0.06, 1.1)):
            box(tx + dx - sx / 2 if sx > 0.1 else tx + dx, ty + dy if sy < 0.1 else ty - sy / 2, z,
                tx + dx + sx / 2 if sx > 0.1 else tx + dx + sx, ty + dy + sy if sy < 0.1 else ty + sy / 2, z + 2.6, dark)
    box(tx - 2, ty - 2, 22, tx + 2, ty + 2, 23.4, stone)    # belfry stage
    for dx in (-1.6, 1.6):
        for dy in (-1.6, 1.6):
            cylinder(tx + dx, ty + dy, 23.4, 24.6, 0.35, stone)
            dome(tx + dx, ty + dy, 24.6, 0.42, copper, 1.3)
    cylinder(tx, ty, 23.4, 25.8, 1.25, stone, seg=16)
    dome(tx, ty, 25.8, 1.45, copper, 1.5, seg=18)
    cylinder(tx, ty, 27.9, 29.2, 0.08, copper)


def kcl():
    stone, base, col, dark = mat("stone", "#ddd3bf"), mat("rustic", "#c3b79f"), mat("column", "#efe7d6"), mat("glass", "#33424e", 0.3)
    box(-10, -6, 0, 10, 5, 3, base)
    for z in (0.75, 1.5, 2.25):
        box(-10.05, 5, z, 10.05, 5.05, z + 0.06, mat("joint", "#a99d86"))
    box(-10, -6, 3, 10, 5, 11, stone)
    windows(-9.5, 9.5, 5.02, [4, 7.6], dark, gap=1.35, frame=base)
    windows(-9.5, 9.5, 5.02, [0.6], dark, gap=1.35, h=1.6, arch=True)
    box(-10.2, -6.2, 11, 10.2, 5.3, 11.6, base)
    box(-4, -3, 11.6, 4, 5, 13.6, stone)                   # attic
    for i in range(6):
        column(-3.3 + i * 1.32, 5.6, 3, 11, 0.28, col, base)
    prism(-4.2, 4.2, 5.4, 3.6, 13.6, 15.1, stone)
    cylinder(0, 4.4, 15.1, 18, 0.06, mat("pole", "#6b5a47"))
    box(0.05, 4.38, 17, 1.6, 4.42, 18, mat("flag", "#c84a59"))


def lse():
    dark, grid, glass, red, roof = mat("cladding", "#2a2f36", 0.6), mat("fins", "#1d2228"), mat("glass", "#7f99a8", 0.2, 0.2), mat("lse-red", "#a21d2c"), mat("roof", "#c8c3bb")
    box(-9, -6, 0, 9, 5, 15, dark)
    for x in [-8.6 + i * 1.2 for i in range(15)]:
        box(x, 5, 0.8, x + 0.8, 5.05, 14.4, glass)
    for z in [1.4 + i * 2.2 for i in range(7)]:
        box(-9, 5, z, 9, 5.25, z + 0.3, grid)
    box(-10, -6.5, 15, 7, 6.2, 18, dark)                    # cantilevered top floors
    for x in [-9.6 + i * 1.3 for i in range(13)]:
        box(x, 6.2, 15.4, x + 0.9, 6.25, 17.6, glass)
    box(-3, -2, 18, 6, 4, 19.2, roof)
    box(-8.5, 5.25, 0, -3.5, 6.5, 3.2, red)                 # entrance canopy
    box(1.5, 5.3, 5, 4, 5.35, 9, red)                       # banner


def kent():
    concrete, rib, glass, green = mat("concrete", "#b8b5ad"), mat("rib", "#9e9b93"), mat("glass", "#465766", 0.3), mat("grass", "#5a7f52")
    box(-11, -2, -0.05, 11, 9, 0.02, green)
    for x in (-8, -4, 0, 4, 8):
        cylinder(x, 3.4, 0, 3, 0.35, concrete)              # pilotis
    box(-10, -6, 3, 10, 4, 10, concrete)
    box(-10, -6, 0, -3, 1, 3, concrete)
    for z in (4, 7):
        box(-10, 4, z, 10, 4.05, z + 1.6, glass)
    for x in [-10 + i * 1.6 for i in range(13)]:
        box(x, 4, 3, x + 0.3, 4.4, 10.2, rib)
    box(-8, -5, 10, 8, 2.5, 12, concrete)
    box(-8.2, 2.5, 10, 8.2, 2.7, 10.9, rib)


def ntu():
    stone, trim, glass, face = mat("portland", "#e6dfcf"), mat("trim", "#cfc5b0"), mat("glass", "#3f4d58", 0.3), mat("clock", "#f6f1e4")
    box(-10, -6, 0, 10, 4, 10, stone)
    windows(-9.5, -2.6, 4.02, [1.2, 4.2, 7.2], glass, gap=1.15, frame=trim)
    windows(2.6, 9.5, 4.02, [1.2, 4.2, 7.2], glass, gap=1.15, frame=trim)
    box(-10.15, -6.15, 10, 10.15, 4.15, 10.5, trim)
    box(-2.4, -3, 0, 2.4, 5, 17, stone)                     # tower
    box(-1.1, 5, 0, 1.1, 5.08, 3.6, mat("door", "#2c3b46"))
    windows(-2, 2, 5.02, [5, 8.5], glass, gap=1.3, h=2.4, frame=trim)
    c = cylinder(0, 5.06, 13.6, 13.66, 1.1, face, seg=24)
    c.rotation_euler[0] = math.pi / 2
    c.location = (0, 5.06, 14.2)
    box(-0.06, 5.1, 14.2, 0.06, 5.14, 15.1, mat("hand", "#222222"))
    box(-2.6, -3.2, 17, 2.6, 5.2, 17.6, trim)
    for dx in (-2.2, 2.2):
        for dy in (-2.8, 4.8):
            cone(dx, dy, 17.6, 19.6, 0.32, stone)


def birmingham():
    brick, stone, copper = mat("brick", "#a24b37"), mat("stone", "#d7c9ad"), mat("copper", "#7e9a8f", 0.5, 0.3)
    glass = mat("glass", "#3a4752", 0.3)
    for i in range(9):                                      # the Aston Webb crescent
        a = math.pi * (i / 8)
        x, y = math.cos(a) * 9, 1 - math.sin(a) * 6
        # Follow the curve: turn each wing section along the crescent's tangent.
        turn = math.atan2(-math.cos(a) * 6, -math.sin(a) * 9)
        ob = box(x - 2.2, y - 1.2, 0, x + 2.2, y + 1.2, 6.5, brick)
        ob.rotation_euler[2] = turn
        b = box(x - 2.25, y - 1.3, 6.5, x + 2.25, y + 1.3, 7, stone)
        b.rotation_euler[2] = turn
    box(-3.5, -7, 0, 3.5, -2.5, 8, brick)                   # Great Hall
    box(-3.6, -7.1, 8, 3.6, -2.4, 8.6, stone)
    cylinder(0, -4.75, 8.6, 10.6, 2.2, stone, seg=20)
    dome(0, -4.75, 10.6, 2.4, copper, 1.1, seg=22)
    cylinder(0, -4.75, 13.2, 14.2, 0.35, stone)
    tx, ty = 0, 3                                          # Old Joe
    box(tx - 1.3, ty - 1.3, 0, tx + 1.3, ty + 1.3, 25, brick)
    for z in (6, 12, 18):
        box(tx - 1.4, ty - 1.4, z, tx + 1.4, ty + 1.4, z + 0.4, stone)
    box(tx - 1.55, ty - 1.55, 25, tx + 1.55, ty + 1.55, 27.4, stone)
    for dx, dy, rx in ((0, 1.56, math.pi / 2), (0, -1.56, math.pi / 2)):
        c = cylinder(tx + dx, ty + dy, 0, 0.06, 0.9, mat("face", "#f5efe0"), seg=20)
        c.rotation_euler[0] = rx
        c.location = (tx + dx, ty + dy, 26.2)
    for dx, dy in ((1.56, 0), (-1.56, 0)):
        c = cylinder(tx + dx, ty + dy, 0, 0.06, 0.9, mat("face", "#f5efe0"), seg=20)
        c.rotation_euler[1] = math.pi / 2
        c.location = (tx + dx, ty + dy, 26.2)
    cone(tx, ty, 27.4, 33.5, 1.9, copper)
    windows(-2.5, 2.5, -2.48, [1.2, 4.2], glass, gap=1.6, h=2.2, arch=True)


def manchester():
    sand, dark, slate, glass = mat("sandstone", "#8f7a5e"), mat("dark-sand", "#6e5c45"), mat("slate", "#4a4f52", 0.7), mat("glass", "#2e3a40", 0.3)
    box(-10, -5, 0, 10, 4, 8, sand)
    for x in [-9.2 + i * 1.6 for i in range(12)]:
        box(x, 4, 1.4, x + 0.75, 4.06, 3.6, glass)
        prism(x - 0.05, x + 0.8, 4.0, 4.12, 3.6, 4.3, dark)
        box(x, 4, 4.8, x + 0.75, 4.06, 6.6, glass)
        prism(x - 0.05, x + 0.8, 4.0, 4.12, 6.6, 7.3, dark)
    roof_x(-10.2, 10.2, -5.2, 4.2, 8, 11.5, slate)
    for x in (-6, 0, 6):                                     # gabled dormers
        prism(x - 1.2, x + 1.2, 4.3, 2, 8, 10.6, sand)
    tx, ty = -5, 2.5                                         # the tower
    box(tx - 1.9, ty - 1.9, 0, tx + 1.9, ty + 1.9, 16, sand)
    box(tx - 0.6, ty + 1.9, 9, tx + 0.6, ty + 1.96, 12.5, glass)
    prism(tx - 0.65, tx + 0.65, ty + 1.88, ty + 2.0, 12.5, 13.3, dark)
    box(tx - 2.1, ty - 2.1, 16, tx + 2.1, ty + 2.1, 16.6, dark)
    cone(tx, ty, 16.6, 23, 2.2, slate)
    for dx in (-1.8, 1.8):
        for dy in (-1.8, 1.8):
            cone(tx + dx, ty + dy, 16.6, 18.8, 0.3, dark)
    box(-1.2, 4, 0, 1.2, 4.3, 3.2, dark)                     # entrance arch
    prism(-1.3, 1.3, 3.95, 4.35, 3.2, 4.4, dark)


def edinburgh():
    stone, dark, col, copper, gold = mat("stone", "#7f7a70"), mat("dark-stone", "#6d685f"), mat("column", "#8d887e"), mat("copper", "#5e7c70", 0.5, 0.3), mat("gold", "#d6a21b", 0.3, 0.8)
    glass = mat("glass", "#2c3338", 0.3)
    box(-10, -7, 0, 10, 4, 10, stone)
    windows(-9.5, -3.4, 4.02, [1.4, 5.4], glass, gap=1.25, frame=dark)
    windows(3.4, 9.5, 4.02, [1.4, 5.4], glass, gap=1.25, frame=dark)
    box(-10.15, -7.15, 10, 10.15, 4.15, 10.7, dark)
    box(-3, 4, 0, 3, 5.4, 9, dark)                           # triumphal entrance
    box(-1.3, 5.4, 0, 1.3, 5.45, 5, mat("arch", "#2a2724"))
    cylinder(0, 5.42, 4.9, 5.0, 1.3, mat("arch", "#2a2724"), seg=14).rotation_euler[0] = math.pi / 2
    for x in (-2.5, -1.7, 1.7, 2.5):
        column(x, 5.8, 0, 7.6, 0.3, col, dark)
    box(-3.1, 5.4, 7.6, 3.1, 6.3, 9, dark)
    cylinder(0, 2, 10.7, 13.6, 2.4, stone, seg=22)           # drum
    for i in range(12):
        a = i / 12 * math.tau
        column(math.cos(a) * 2.6, 2 + math.sin(a) * 2.6, 10.7, 13.4, 0.13, col)
    dome(0, 2, 13.6, 2.6, copper, 1.25, seg=22)
    cylinder(0, 2, 16.8, 17.6, 0.4, stone)
    cylinder(0, 2, 17.6, 19.4, 0.22, gold, seg=8)           # the Golden Boy
    dome(0, 2, 19.4, 0.3, gold, 1.2, seg=8)


BUILDERS = {"ucl": ucl, "imperial": imperial, "kcl": kcl, "lse": lse, "kent": kent, "ntu": ntu,
            "birmingham": birmingham, "manchester": manchester, "edinburgh": edinburgh}

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--preview=")]
    previews = next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--preview=")), None)
    for name in args or list(BUILDERS):
        reset()
        PARTS.clear()
        MATS.clear()
        BUILDERS[name]()
        export(name, previews)
