"""
Builds the mountain ring and road tunnel models that close off every outdoor map.

Run headless:  python3 blender/terrain/build_terrain.py [--preview DIR]

Exports to public/world3d/terrain/:
  mountains-a.glb, mountains-b.glb, mountains-c.glb
      A 24 m wide, 16 m deep strip of low-poly peaks. The front edge (Blender y = 0,
      three.js z = 0) meets the map; the peaks rise away from it (Blender +y, three.js -z).
      Grass foothills, rock flanks, snow caps and a few pines.
  tunnel.glb
      A stone tunnel mouth cut into a hillside, 10 m wide and 8 m tall. The road runs
      along Blender +y into the dark bore, with lamps along the roof. The game stretches
      it across each road that leaves the map.

Faceted flat shading to match the game's low-poly look.
"""
import math
import os
import random
import sys

import bpy  # noqa: I001  (bpy must load before bmesh)
import bmesh

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "world3d", "terrain")
MATS = {}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()


def mat(name, colour, rough=0.9, emit=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    r, g, b = (int(colour[i:i + 2], 16) / 255 for i in (1, 3, 5))
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in (r, g, b)]
    bsdf.inputs["Base Color"].default_value = (*lin, 1)
    bsdf.inputs["Roughness"].default_value = rough
    if emit:
        bsdf.inputs["Emission Color"].default_value = (*lin, 1)
        bsdf.inputs["Emission Strength"].default_value = emit
    MATS[name] = m
    return m


def palette():
    return [
        mat("grass", "#7fae5a"),
        mat("grass-dark", "#5f8f45"),
        mat("rock", "#8b8378"),
        mat("rock-dark", "#6c655d"),
        mat("snow", "#f4f6f8"),
        mat("pine", "#3f6f3f"),
        mat("trunk", "#6b4a2f"),
    ]


def new_object(name, bm, materials):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    for m in materials:
        ob.data.materials.append(m)
    bpy.context.collection.objects.link(ob)
    for p in ob.data.polygons:
        p.use_smooth = False
    return ob


def peaks_height(x, y, peaks, front_soft=3.0):
    h = 0.0
    for (px, py, ph, pr) in peaks:
        d2 = (x - px) ** 2 + (y - py) ** 2
        h = max(h, ph * math.exp(-d2 / (2 * pr * pr)))
        h += 0.18 * ph * math.exp(-d2 / (2 * (pr * 2.2) ** 2))
    # The front edge settles to the map's ground; the back stays high so a second row overlaps.
    h *= min(1.0, max(0.0, y / front_soft)) ** 1.3
    return h


def mountain_strip(name, seed):
    reset()
    rng = random.Random(seed)
    W, D, NX, NY = 24.0, 16.0, 16, 11
    peaks = []
    for i in range(3 + rng.randint(0, 1)):
        peaks.append((rng.uniform(-10, 10), rng.uniform(7, 14), rng.uniform(7, 13.5), rng.uniform(2.6, 4.2)))
    peaks.append((rng.uniform(-11, 11), rng.uniform(3.5, 6), rng.uniform(2.2, 3.6), rng.uniform(2.0, 3.0)))
    bm = bmesh.new()
    grid = []
    for j in range(NY + 1):
        row = []
        for i in range(NX + 1):
            x = -W / 2 + W * i / NX
            y = D * j / NY
            # Jitter interior points so the facets read as hand-cut, not a grid. Edges stay put so strips tile.
            jx = rng.uniform(-0.5, 0.5) if 0 < i < NX else 0
            jy = rng.uniform(-0.45, 0.45) if 0 < j < NY else 0
            z = peaks_height(x + jx, y + jy, peaks)
            # Matching edge profile so neighbouring strips meet: blend toward a shared ridge at the sides.
            side = min(i, NX - i) / 2.0
            if side < 1:
                ridge = 5.5 * min(1.0, (y / D) * 1.6) ** 1.2 * (1 if y > 2 else y / 2)
                z = ridge * (1 - side) + z * side
            row.append(bm.verts.new((x + jx, y + jy, z)))
        grid.append(row)
    for j in range(NY):
        for i in range(NX):
            a, b, c, d = grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]
            if (i + j) % 2:
                bm.faces.new((a, b, c))
                bm.faces.new((a, c, d))
            else:
                bm.faces.new((a, b, d))
                bm.faces.new((b, c, d))
    # A skirt down to y=-1 hides the ground seam at the front.
    bm.normal_update()
    for f in bm.faces:
        cz = sum(v.co.z for v in f.verts) / 3
        slope = 1 - abs(f.normal.z)
        snowline = 8.2 + rng.uniform(-0.6, 0.6)
        if cz > snowline:
            f.material_index = 4
        elif cz > 3.2 or slope > 0.55:
            f.material_index = 2 if rng.random() > 0.3 else 3
        else:
            f.material_index = 0 if rng.random() > 0.35 else 1
    mats = palette()
    land = new_object(name, bm, mats)
    # Pines on the low slopes.
    tb = bmesh.new()
    for _ in range(14):
        x, y = rng.uniform(-11, 11), rng.uniform(0.6, 6.5)
        z = peaks_height(x, y, peaks)
        if z > 3:
            continue
        s = rng.uniform(0.7, 1.25)
        trunk = bmesh.ops.create_cone(tb, cap_ends=True, segments=5, radius1=0.12 * s, radius2=0.12 * s, depth=0.5 * s)
        for v in trunk["verts"]:
            v.co += type(v.co)((x, y, z + 0.25 * s))
        for f in {f for v in trunk["verts"] for f in v.link_faces}:
            f.material_index = 6
        for k, (r, h, lift) in enumerate(((0.75, 1.3, 0.85), (0.55, 1.1, 1.5), (0.33, 0.9, 2.1))):
            cone = bmesh.ops.create_cone(tb, cap_ends=True, segments=6, radius1=r * s, radius2=0.0, depth=h * s)
            for v in cone["verts"]:
                v.co += type(v.co)((x, y, z + lift * s))
            for f in {f for v in cone["verts"] for f in v.link_faces}:
                f.material_index = 5
    trees = new_object(name + "-pines", tb, mats)
    return [land, trees]


def box(bm, x0, y0, z0, x1, y1, z1, mi):
    res = bmesh.ops.create_cube(bm, size=1.0)
    for v in res["verts"]:
        v.co.x = x0 if v.co.x < 0 else x1
        v.co.y = y0 if v.co.y < 0 else y1
        v.co.z = z0 if v.co.z < 0 else z1
    for f in {f for v in res["verts"] for f in v.link_faces}:
        f.material_index = mi
    return res


def tunnel():
    reset()
    stone = mat("stone", "#b9ae9c")
    stone_dark = mat("stone-dark", "#8f8676")
    bore = mat("bore", "#1d1f24")
    lamp = mat("lamp", "#ffd479", emit=4.0)
    grass = mat("grass", "#7fae5a")
    rock = mat("rock", "#8b8378")
    snow = mat("snow", "#f4f6f8")
    mats = [stone, stone_dark, bore, lamp, grass, rock, snow]
    bm = bmesh.new()
    W, H, SPRING = 10.0, 7.0, 4.2  # opening width, facade height, where the arch starts
    half = W / 2
    # Facade: side pillars and a stepped arch of voussoirs.
    box(bm, -half - 1.4, -0.2, 0, -half, 1.0, H, 0)
    box(bm, half, -0.2, 0, half + 1.4, 1.0, H, 0)
    segs = 9
    for k in range(segs):
        a0 = math.pi * k / segs
        a1 = math.pi * (k + 1) / segs
        xm = -math.cos((a0 + a1) / 2) * half
        zm = SPRING + math.sin((a0 + a1) / 2) * (H - SPRING - 0.9)
        w = max(0.9, abs(math.cos(a0) - math.cos(a1)) * half + 0.2)
        box(bm, xm - w / 2, -0.25, zm, xm + w / 2, 1.0, H, 1 if k % 2 else 0)
    box(bm, -half - 1.6, -0.35, H - 0.5, half + 1.6, 1.1, H + 0.2, 1)  # coping
    # Dark bore with roof lamps.
    box(bm, -half - 0.3, 1.0, -0.02, -half, 14, H - 1, 2)
    box(bm, half, 1.0, -0.02, half + 0.3, 14, H - 1, 2)
    box(bm, -half - 0.3, 1.0, H - 1.6, half + 0.3, 14, H - 1, 2)
    box(bm, -half, 13.6, -0.02, half, 14, H - 1, 2)  # back wall: fully dark
    for y in (2.5, 5.0, 7.5, 10.0, 12.5):
        box(bm, -0.8, y, H - 1.75, 0.8, y + 0.35, H - 1.6, 3)
    # Low-poly hillside over and around the mouth.
    hill = bmesh.new()
    rng = random.Random(7)
    NX, NY = 10, 7
    verts = []
    for j in range(NY + 1):
        row = []
        for i in range(NX + 1):
            x = -12 + 24 * i / NX
            y = 0.6 + 14 * j / NY
            edge = abs(x) / 12
            z = H + 0.3 + 4.5 * math.sin(math.pi * min(1, j / NY + 0.15)) * (1 - 0.35 * edge) + rng.uniform(-0.4, 0.5)
            if abs(x) > half + 1.4:
                z = max(z, 3.0 + (abs(x) - half) * 0.7)
            if j == 0:
                z = H + 0.15 if abs(x) <= half + 1.6 else 1.5 + (12 - abs(x)) * 0.5
            row.append(hill.verts.new((x, y, z)))
        verts.append(row)
    for j in range(NY):
        for i in range(NX):
            f = hill.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
            cz = sum(v.co.z for v in f.verts) / 4
            f.material_index = 6 if cz > 11.6 else 5 if cz > 9.5 else 4
    # Front faces of the hill either side of the portal, down to the ground.
    for side in (-1, 1):
        x0, x1 = (half + 1.4) * side, 12 * side
        a = hill.verts.new((x0, 0.6, 0))
        b = hill.verts.new((x1, 0.6, 0))
        c = verts[0][NX if side > 0 else 0]
        d = verts[0][7 if side > 0 else 3]
        f = hill.faces.new((a, b, c, d) if side > 0 else (b, a, d, c))
        f.material_index = 5
    bm_obj = new_object("tunnel-mouth", bm, mats)
    hill_obj = new_object("tunnel-hill", hill, mats)
    return [bm_obj, hill_obj]


def export(name, parts, preview_dir=None):
    bpy.ops.object.select_all(action="DESELECT")
    for ob in parts:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    joined.name = name
    if preview_dir:
        preview(name, preview_dir)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"{name}.glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True,
                              export_yup=True, export_materials="EXPORT", export_cameras=False, export_lights=False)
    tris = sum(len(p.vertices) - 2 for p in joined.data.polygons)
    print(f"{name}: ~{tris} tris, {os.path.getsize(path) // 1024} KB")


def preview(name, folder):
    scene = bpy.context.scene
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    scene.collection.objects.link(cam)
    cam.location = (0, -30, 16)
    cam.rotation_euler = (math.radians(66), 0, 0)
    scene.camera = cam
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy = 3.5
    sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(30))
    scene.collection.objects.link(sun)
    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.75, 0.85, 0.9, 1)
    scene.world = world
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 12
    scene.render.resolution_x, scene.render.resolution_y = 640, 360
    os.makedirs(folder, exist_ok=True)
    scene.render.filepath = os.path.join(folder, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)
    bpy.data.objects.remove(sun)


if __name__ == "__main__":
    pv = sys.argv[sys.argv.index("--preview") + 1] if "--preview" in sys.argv else None
    for name, seed in (("mountains-a", 11), ("mountains-b", 23), ("mountains-c", 41)):
        export(name, mountain_strip(name, seed), pv)
    export("tunnel", tunnel(), pv)
