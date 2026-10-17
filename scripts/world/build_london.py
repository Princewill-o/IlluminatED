"""
Builds IlluminatED London in Blender from london.json (exported from
src/game/core/london.ts) and renders it in tiles: three Workbench passes per
tile (material colour, lighting, object id) saved as .npz for post_london.py.

  blender -b --python build_london.py -- london.json out_dir [tile_index]

Look: the City of London (Portland stone offices with gridded windows, red
brick Victorian corners with stone bands and arched windows, red shopfronts,
street trees, double yellow lines, bollards), finished in the same cel-shaded,
ink-outlined style as the characters.
"""
import bpy, bmesh, json, math, os, sys
import numpy as np
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1:]
SCENE = json.load(open(ARGS[0]))
OUT = ARGS[1]
PART = ARGS[2] if len(ARGS) > 2 else None  # "even", "odd" or a tile index
os.makedirs(OUT, exist_ok=True)

COLS, ROWS = SCENE["cols"], SCENE["rows"]
ELEV = math.radians(42)
PPU = 32 * 2                     # render px per tile (2x supersampling)
TOP = 15.0                        # camera-view units above row 0 (room for tall things)
BOTTOM = -ROWS * math.sin(ELEV) - 0.6
TILE_PX = 1024                    # render tile size (px)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.render.film_transparent = True
sc.display.render_aa = "OFF"
sc.render.dither_intensity = 0.0
sc.view_settings.view_transform = "Standard"
sh = sc.display.shading
sh.show_specular_highlight = False
sh.show_object_outline = False
sh.show_cavity = False
sh.show_shadows = False

def lin(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)

MATS = {}
def mat(h):
    m = MATS.get(h)
    if not m:
        m = bpy.data.materials.new(h)
        m.diffuse_color = (*lin(h), 1)
        m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (*lin(h), 1)
        b.inputs["Roughness"].default_value = 0.85
        MATS[h] = m
    return m

# ── Kenney CC0 kits (assets/kenney): real low-poly buildings, trees and street kit ──
KEN = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../assets/kenney"))
LIB = {}
def kenney(path):
    """Imports a Kenney model once; returns (mesh data, bbox min, bbox max) with transforms baked."""
    if path in LIB:
        return LIB[path]
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(KEN, path))
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    if len(meshes) > 1:
        bpy.ops.object.join()
    m = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in new:
        if o != m and o.name in bpy.data.objects:
            bpy.data.objects.remove(o)
    vs = [v.co for v in m.data.vertices]
    mn = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    mx = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    data = m.data
    bpy.data.objects.remove(m)
    LIB[path] = (data, mn, mx)
    return LIB[path]

def place(path, x, y, w, d, name, scale=None, rot=0.0, z=0.0):
    """Puts a Kenney model in a tile rectangle (x right, y south), fitted and centred, front to the camera."""
    me, mn, mx = kenney(path)
    sx, sy = mx.x - mn.x, mx.y - mn.y
    if rot:
        sx, sy = sy, sx
    s = scale or min(w / sx, d / sy)
    o = bpy.data.objects.new(name, me)
    sc.collection.objects.link(o)
    o.scale = (s, s, s)
    o.rotation_euler = (0, 0, rot)
    bpy.context.view_layer.update()
    cx0 = (mn.x + mx.x) / 2
    cy0 = (mn.y + mx.y) / 2
    c = Vector((cx0, cy0, 0))
    c.rotate(o.rotation_euler)
    o.location = (x + w / 2 - c.x * s, -(y + d / 2) - c.y * s, z - mn.z * s)
    return o

COMMERCIAL = "city-kit-commercial/"
SUBURBAN = "city-kit-suburban/"
MIDRISE = [f"building-{c}.glb" for c in "abcdefghijklmn"]
TOWERS = [f"building-skyscraper-{c}.glb" for c in "abcde"]
HOUSES = [f"building-type-{c}.glb" for c in "abcdefghijklmnopqrstu"]

# ── Geometry builder: everything for one "thing" goes into one bmesh ────────
class Part:
    def __init__(self):
        self.bm = bmesh.new()
        self.mats = []

    def _mi(self, colour):
        if colour not in self.mats:
            self.mats.append(colour)
        return self.mats.index(colour)

    def box(self, x0, y0, z0, x1, y1, z1, colour):
        """Axis-aligned box in tile coords (x right, y SOUTH, z up)."""
        mi = self._mi(colour)
        r = bmesh.ops.create_cube(self.bm, size=1.0)
        vs = r["verts"]
        for v in vs:
            v.co.x = x0 if v.co.x < 0 else x1
            v.co.y = -(y0 if v.co.y > 0 else y1)
            v.co.z = z0 if v.co.z < 0 else z1
        for f in {f for v in vs for f in v.link_faces}:
            f.material_index = mi
            f.smooth = False

    def prism(self, x0, y0, x1, y1, z0, z1, colour, ridge="x"):
        """Pitched roof over a rectangle."""
        mi = self._mi(colour)
        b = self.bm
        if ridge == "x":
            ym = (y0 + y1) / 2
            p = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, ym, z1), (x1, ym, z1)]
            faces = [(0, 1, 5, 4), (3, 4, 5, 2), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)]
        else:
            xm = (x0 + x1) / 2
            p = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (xm, y0, z1), (xm, y1, z1)]
            faces = [(0, 4, 5, 3), (1, 2, 5, 4), (0, 1, 4), (3, 5, 2), (0, 3, 2, 1)]
        vs = [b.verts.new((x, -y, z)) for x, y, z in p]
        for f in faces:
            face = b.faces.new([vs[i] for i in f])
            face.material_index = mi

    def cyl(self, cx, cy, z0, z1, r, colour, seg=16, r2=None, sx=1.0, sy=1.0):
        mi = self._mi(colour)
        res = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=z1 - z0)
        for v in res["verts"]:
            v.co.x = v.co.x * sx + cx
            v.co.y = v.co.y * sy - cy
            v.co.z += (z0 + z1) / 2
        for f in {f for v in res["verts"] for f in v.link_faces}:
            f.material_index = mi
            f.smooth = True

    def ball(self, cx, cy, cz, rx, ry, rz, colour, seg=14):
        mi = self._mi(colour)
        res = bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=seg // 2 + 1, radius=1.0)
        for v in res["verts"]:
            v.co = Vector((v.co.x * rx + cx, v.co.y * ry - cy, v.co.z * rz + cz))
        for f in {f for v in res["verts"] for f in v.link_faces}:
            f.material_index = mi
            f.smooth = True

    def finish(self, name):
        me = bpy.data.meshes.new(name)
        self.bm.to_mesh(me)
        self.bm.free()
        for c in self.mats:
            me.materials.append(mat(c))
        o = bpy.data.objects.new(name, me)
        sc.collection.objects.link(o)
        return o

OBJECTS = []   # (object, sortY in world px or None for ground)
def add(part, name, sort_y=None, extra=()):
    o = part.finish(name) if part is not None else None
    objs = ([o] if o else []) + list(extra)
    OBJECTS.append((objs, sort_y))
    return objs[0]

# ── Palette (London, cel-shaded) ─────────────────────────────────────────────
STONE = "#e4dccb"; STONE_D = "#c9bfaa"; GLASS = "#3e4658"; GLASS_L = "#5a6478"
BRICK = "#b05a43"; BRICK_D = "#8c4433"; LBRICK = "#cdb58a"; SLATE = "#5d6070"
WHITE = "#f4f0ea"; INKY = "#2a2730"; RED = "#c8322d"; GOLD = "#e8b84a"
GRASS = "#93c97a"; GRASS_D = "#7fb868"; PAVE = "#d8d3ca"; KERB = "#bdb7ad"
ROAD = "#5f6270"; PAVE_2 = "#cfcac0"; GRASS_2 = "#8bc272"; PATH = "#e3cfa3"; WATER = "#5fb4c7"; EMB = "#cfc6b6"; LEAF = "#6fb35a"; LEAF_D = "#5a9d48"

# ── Ground ───────────────────────────────────────────────────────────────────
tiles = SCENE["tiles"]
def tile(x, y):
    return tiles[y][x] if 0 <= y < ROWS and 0 <= x < COLS else "g"

GROUND = {"g": (GRASS, 0.06), "f": (GRASS_D, 0.06), "-": (PAVE, 0.12), "_": (PATH, 0.08), "=": (ROAD, 0.0), ":": (ROAD, 0.0),
          "|": (STONE_D, 0.55), "X": (PAVE, 0.12), "T": (GRASS, 0.06), "L": (PAVE, 0.12), "B": (PATH, 0.08)}
ground = {}
for y in range(ROWS):
    for x in range(COLS):
        ch = tile(x, y)
        if ch == "w":
            continue
        colour, h = GROUND.get(ch, (GRASS, 0.06))
        if colour == PAVE and (x + y) % 2:
            colour = PAVE_2
        elif colour == GRASS and (x * 7 + y * 3) % 5 == 0:
            colour = GRASS_2
        # Bridges float over the water; everything else sits on the bank.
        over_water = any(tile(x + dx, y) == "w" for dx in (-2, -1, 1, 2)) and ch in "=|_"
        p = ground.setdefault(colour, Part())
        p.box(x, y, -0.25 if over_water else -0.6, x + 1, y + 1, h, colour)
        if ch == "-" and over_water is False and any(tile(x, y + d) in "=:" for d in (-1, 1)):
            # Kerb edge on the road side.
            yy = y + 1 if tile(x, y + 1) in "=:" else y
            p.box(x, yy - 0.05, h - 0.02, x + 1, yy + 0.05, h + 0.02, KERB)
for colour, p in ground.items():
    add(p, f"ground-{colour}")

# Water, a little below the banks, with stone embankment walls.
wp = Part()
for y in range(ROWS):
    for x in range(COLS):
        if tile(x, y) == "w":
            wp.box(x, y, -0.6, x + 1, y + 1, -0.3, WATER)
add(wp, "water")

# Road markings: double yellow lines along the kerbs, white dashes in the middle.
mk = Part()
for y in range(ROWS):
    for x in range(COLS):
        ch = tile(x, y)
        if ch not in "=:":
            continue
        if tile(x, y - 1) == "-" and ch == "=":
            mk.box(x, y + 0.12, 0.0, x + 1, y + 0.17, 0.02, "#f2c33d"); mk.box(x, y + 0.24, 0.0, x + 1, y + 0.29, 0.02, "#f2c33d")
        if tile(x, y + 1) == "-" and ch == ":":
            mk.box(x, y + 0.71, 0.0, x + 1, y + 0.76, 0.02, "#f2c33d"); mk.box(x, y + 0.83, 0.0, x + 1, y + 0.88, 0.02, "#f2c33d")
        if ch == "=" and tile(x, y + 1) == ":" and x % 2 == 0:
            mk.box(x + 0.15, y + 0.95, 0.0, x + 0.85, y + 1.05, 0.02, WHITE)
        if ch == "=" and tile(x + 1, y) == "=" and tile(x - 1, y) in "-|" and y % 2 == 0:
            mk.box(x + 0.95, y + 0.15, 0.0, x + 1.05, y + 0.85, 0.02, WHITE)
add(mk, "markings")

# ── Building facades (south faces are the ones the camera sees) ─────────────
def windows_grid(p, x0, x1, y_front, z0, z1, floor_h, cols, glass=GLASS, frame=STONE, arched=False, sash=False):
    width = x1 - x0
    floors = max(1, int((z1 - z0) / floor_h))
    cw = width / cols
    for f in range(floors):
        zb = z0 + f * floor_h + floor_h * 0.22
        zt = z0 + f * floor_h + floor_h * 0.82
        for c in range(cols):
            wx0 = x0 + c * cw + cw * 0.18
            wx1 = x0 + (c + 1) * cw - cw * 0.18
            p.box(wx0 - 0.04, y_front - 0.02, zb - 0.04, wx1 + 0.04, y_front + 0.03, zt + 0.04, frame)
            p.box(wx0, y_front, zb, wx1, y_front + 0.05, zt, glass)
            if sash:
                p.box(wx0, y_front + 0.04, (zb + zt) / 2 - 0.02, wx1, y_front + 0.07, (zb + zt) / 2 + 0.02, WHITE)
                p.box((wx0 + wx1) / 2 - 0.015, y_front + 0.04, zb, (wx0 + wx1) / 2 + 0.015, y_front + 0.07, zt, WHITE)
            elif not arched:
                p.box((wx0 + wx1) / 2 - 0.02, y_front + 0.04, zb, (wx0 + wx1) / 2 + 0.02, y_front + 0.07, zt, frame)
            if arched:
                p.ball((wx0 + wx1) / 2, y_front + 0.025, zt, (wx1 - wx0) / 2, 0.03, (wx1 - wx0) / 2, glass, seg=12)
                p.box(wx0 - 0.04, y_front - 0.02, zt - 0.02, wx1 + 0.04, y_front + 0.03, zt + 0.02, frame)

def building(t):
    """Kenney buildings fitted into the footprint: towers in the City, mid-rise
    offices and shops in the West End, suburban houses in the residential streets."""
    x0, y0, w, d = t["x"] + 0.08, t["y"] + 0.08, t["w"] - 0.16, t["h"] - 0.16
    style = t["style"]
    seed = t["x"] * 7 + t["y"] * 13
    p = Part()
    # A paved forecourt so nothing floats on the grass.
    p.box(x0 - 0.05, y0 - 0.05, 0.0, x0 + w + 0.05, y0 + d + 0.05, 0.13, PAVE)
    objs = []
    if style in ("office", "stone", "company", "glass"):
        lib = TOWERS if style in ("glass", "company") else MIDRISE
        cols = max(1, round(w / 3.2)); rows = max(1, round(d / 3.6))
        cw, chh = w / cols, d / rows
        for r in range(rows):
            for c in range(cols):
                m = lib[(seed + r * 3 + c) % len(lib)]
                objs.append(place(COMMERCIAL + m, x0 + c * cw, y0 + r * chh, cw, chh, f"{t['id']}-k{r}{c}"))
        if style == "company":
            # Company colour plinth on the roof line for the logo (drawn in-game).
            body = t.get("accent") or RED
            p.box(x0 + 0.1, y0 + d - 0.12, 0.12, x0 + w - 0.1, y0 + d + 0.02, 0.9, body)
    elif style in ("brick", "shop"):
        cols = max(1, round(w / 2.2))
        cw = w / cols
        for c in range(cols):
            m = MIDRISE[(seed + c * 5) % len(MIDRISE)]
            objs.append(place(COMMERCIAL + m, x0 + c * cw, y0, cw, d, f"{t['id']}-k{c}"))
        if style == "shop":
            awn = ["#2d6a4f", RED, "#1b3a6b", "#1f5f8b"][t["x"] % 4]
            p.box(x0 + 0.1, y0 + d - 0.02, 1.05, x0 + w - 0.1, y0 + d + 0.55, 1.18, awn)       # awning over the pavement
    else:  # London terraces (or Highland cottages): built here, not suburban kit houses
        highland = SCENE.get("region") == "highlands"
        wall = ["#f2ead8", "#e6dcc6", "#d9c7a6", "#efe6d4"][seed % 4] if highland else [BRICK, "#a65840", LBRICK, "#e8dcc4", "#c26b4f"][seed % 5]
        roof = SLATE if highland or seed % 3 else "#6b4a3f"
        floors = 2 if highland else 3
        fh = 0.95
        top = 0.15 + floors * fh
        p.box(x0, y0 + 0.25, 0.13, x0 + w, y0 + d, top, wall)                                  # body
        p.box(x0 - 0.04, y0 + d - 0.06, top - 0.12, x0 + w + 0.04, y0 + d + 0.04, top, WHITE)   # cornice
        p.prism(x0 - 0.05, y0 + 0.2, x0 + w + 0.05, y0 + d + 0.05, top, top + 0.9, roof, ridge="x")  # pitched slate roof
        bays = max(2, round(w / 1.3))
        bw = w / bays
        for b in range(bays):
            # Chimney stacks on the party walls with pots.
            if b % 2 == 0:
                cx = x0 + b * bw + 0.15
                p.box(cx, y0 + d * 0.45, top + 0.3, cx + 0.35, y0 + d * 0.45 + 0.3, top + 1.25, BRICK_D if not highland else STONE_D)
                p.cyl(cx + 0.1, y0 + d * 0.45 + 0.15, top + 1.25, top + 1.4, 0.06, "#c46a3c", seg=8)
                p.cyl(cx + 0.25, y0 + d * 0.45 + 0.15, top + 1.25, top + 1.4, 0.06, "#c46a3c", seg=8)
            for f in range(floors):
                z0 = 0.15 + f * fh
                wx0, wx1 = x0 + b * bw + bw * 0.28, x0 + b * bw + bw * 0.72
                if f == 0 and b == bays // 2:
                    # Front door with a fanlight and a step.
                    door = ["#1b3a6b", "#2d6a4f", INKY, RED][seed % 4]
                    p.box(wx0, y0 + d - 0.02, z0, wx1, y0 + d + 0.03, z0 + 0.72, door)
                    p.box(wx0 - 0.05, y0 + d - 0.02, z0 + 0.72, wx1 + 0.05, y0 + d + 0.04, z0 + 0.8, WHITE)
                    p.box(wx0 - 0.1, y0 + d, 0.13, wx1 + 0.1, y0 + d + 0.25, 0.2, STONE_D)
                    continue
                # Sash window: white frame, glass, glazing bar, sill.
                p.box(wx0 - 0.05, y0 + d - 0.02, z0 + 0.18, wx1 + 0.05, y0 + d + 0.02, z0 + 0.78, WHITE)
                p.box(wx0, y0 + d - 0.01, z0 + 0.23, wx1, y0 + d + 0.03, z0 + 0.73, GLASS)
                p.box(wx0, y0 + d - 0.01, z0 + 0.47, wx1, y0 + d + 0.04, z0 + 0.49, WHITE)
                p.box(wx0 - 0.08, y0 + d, z0 + 0.14, wx1 + 0.08, y0 + d + 0.1, z0 + 0.18, WHITE)
                if not highland and f == 1:
                    p.box(wx0 - 0.04, y0 + d + 0.04, z0 + 0.14, wx1 + 0.04, y0 + d + 0.18, z0 + 0.4, INKY)   # little balcony rail
        p.box(x0 + w * 0.25, y0 + d - 0.05, 0.13, x0 + w * 0.75, y0 + d + 0.3, 0.15, "#e3cfa3")  # front path
        if t.get("label") == "Your house":
            p.box(x0 + w * 0.3, y0 + d + 0.35, 0.13, x0 + w * 0.7, y0 + d + 0.8, 0.16, "#2b5fd9")   # welcome mat
    add(p, t["id"], (t["y"] + t["h"]) * 32, objs)

# ── Landmarks ────────────────────────────────────────────────────────────────
def landmark(t):
    n, x0, y0, w, d = t["name"], t["x"], t["y"], t["w"], t["h"]
    x1, y1 = x0 + w, y0 + d
    p = Part()
    SAND = "#e2c99a"
    if n == "big-ben":
        cx, cy = x0 + 1, y0 + 1
        p.box(x0 + 0.15, y0 + 0.15, 0, x1 - 0.15, y1 - 0.15, 9.5, SAND)
        for z in range(1, 9):
            p.box(x0 + 0.3, y1 - 0.15, z + 0.2, x1 - 0.3, y1 - 0.1, z + 0.7, "#c9a96e")
        p.box(x0 + 0.05, y0 + 0.05, 9.5, x1 - 0.05, y1 - 0.05, 11.2, SAND)
        p.box(cx - 0.75, y1 - 0.06, 9.6, cx + 0.75, y1 - 0.0, 11.05, "#c9a96e")
        p.ball(cx, y1 + 0.02, 10.33, 0.62, 0.04, 0.62, "#f6ecd2", seg=24)
        p.box(cx - 0.03, y1 + 0.05, 10.3, cx + 0.03, y1 + 0.09, 10.8, INKY); p.box(cx - 0.03, y1 + 0.05, 10.3, cx + 0.35, y1 + 0.09, 10.36, INKY)
        p.cyl(cx, cy, 11.2, 13.6, 0.85, "#4b5a4f", seg=4, r2=0.05)
        p.cyl(cx, cy, 13.6, 14.2, 0.04, GOLD)
    elif n == "parliament":
        p.box(x0, y0 + 0.5, 0, x1, y1, 3.2, SAND)
        windows_grid(p, x0 + 0.2, x1 - 0.2, y1, 0.4, 3.0, 0.9, int(w * 2.2), "#4a4f5c", "#c9a96e", arched=True)
        p.prism(x0, y0 + 0.5, x1, y1, 3.2, 4.0, "#5b6a5f")
        for i in range(int(w) + 1):
            p.cyl(x0 + i, y1 - 0.1, 3.2, 4.8, 0.12, SAND, seg=6, r2=0.0)
        p.box(x0 + 0.2, y0, 0, x0 + 1.8, y0 + 1.8, 6.5, SAND); p.cyl(x0 + 1, y0 + 0.9, 6.5, 8.0, 0.9, "#5b6a5f", seg=4, r2=0.05)
    elif n == "st-pauls":
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        p.box(x0 + 0.5, y0 + 0.5, 0, x1 - 0.5, y1 - 0.5, 3.0, STONE)
        windows_grid(p, x0 + 1, x1 - 1, y1 - 0.5, 0.4, 2.8, 1.2, 6, "#4a4f5c", STONE_D, arched=True)
        p.box(x0 + 2.5, y1 - 0.5, 0, x1 - 2.5, y1 + 0.4, 3.4, STONE)            # portico
        for i in range(6):
            p.cyl(x0 + 2.8 + i * 0.88, y1 + 0.2, 0.1, 3.0, 0.14, WHITE, seg=10)
        p.prism(x0 + 2.5, y1 - 0.5, x1 - 2.5, y1 + 0.4, 3.4, 4.2, STONE, ridge="y")
        for tx in (x0 + 1.3, x1 - 1.3):
            p.box(tx - 0.7, y1 - 1.6, 0, tx + 0.7, y1 - 0.4, 5.0, STONE); p.cyl(tx, y1 - 1.0, 5.0, 6.4, 0.55, "#7f9b8e", seg=12, r2=0.1)
        p.cyl(cx, cy, 3.0, 5.0, 2.6, STONE, seg=32)
        for i in range(16):
            a = i / 16 * math.tau
            p.cyl(cx + math.cos(a) * 2.65, cy + math.sin(a) * 2.65, 3.0, 4.9, 0.1, WHITE, seg=6)
        p.ball(cx, cy, 5.0, 2.4, 2.4, 2.4, "#8fb3a6", seg=28)
        p.cyl(cx, cy, 7.2, 8.6, 0.35, STONE, seg=12); p.ball(cx, cy, 8.8, 0.28, 0.28, 0.35, GOLD); p.box(cx - 0.04, cy - 0.04, 9.0, cx + 0.04, cy + 0.04, 9.6, GOLD)
    elif n == "shard":
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        p.cyl(cx, cy, 0, 17.0, 1.9, "#a9c7dc", seg=4, r2=0.12)
        for z in range(1, 16, 2):
            r = 1.9 * (1 - z / 17)
            p.cyl(cx, cy, z, z + 0.08, r * 1.01, "#d6e6f0", seg=4)
    elif n == "gherkin":
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        p.ball(cx, cy, 4.2, 1.9, 1.9, 4.6, "#4f8a7a", seg=24)
        for z in (2.0, 3.6, 5.2, 6.8):
            r = 1.9 * math.sqrt(max(0.0, 1 - ((z - 4.2) / 4.6) ** 2))
            p.cyl(cx, cy, z, z + 0.15, r * 1.02, "#a7d3c4", seg=24)
    elif n == "tower-bridge":
        for tx in (x0 + 0.0, x1 - 1.0):
            p.box(tx - 0.2, y0 + 1.5, -0.3, tx + 1.2, y0 + 3.5, 6.5, "#d8cfbd")
            for cx in (tx - 0.1, tx + 1.1):
                p.cyl(cx, y0 + 3.5, 6.5, 8.0, 0.32, "#d8cfbd", seg=8, r2=0.05)
            windows_grid(p, tx, tx + 1.0, y0 + 3.5, 1.0, 6.0, 1.6, 1, "#3c4458", "#b9ae98", arched=True)
        p.box(x0 + 0.9, y0 + 2.0, 5.6, x1 - 0.9, y0 + 3.0, 6.2, "#7aaed6")
        p.box(x0 + 0.9, y0 + 2.0, 6.2, x1 - 0.9, y0 + 3.0, 6.35, "#d8cfbd")
    elif n == "tower":
        p.box(x0, y0, 0, x1, y1, 1.6, "#d9d0be")
        for cx, cy in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)):
            p.cyl(cx, cy, 0, 2.2, 0.5, "#d9d0be", seg=12)
        p.box(x0 + 2, y0 + 1, 0, x1 - 2, y1 - 1, 4.2, "#ece5d6")
        for cx, cy in ((x0 + 2, y0 + 1), (x1 - 2, y0 + 1), (x0 + 2, y1 - 1), (x1 - 2, y1 - 1)):
            p.cyl(cx, cy, 4.2, 5.3, 0.35, "#ece5d6", seg=10); p.cyl(cx, cy, 5.3, 6.0, 0.36, "#5d6070", seg=10, r2=0.05)
    elif n == "battersea":
        p.box(x0 + 1, y0 + 1, 0, x1 - 1, y1, 4.5, "#b8664d")
        windows_grid(p, x0 + 1.4, x1 - 1.4, y1, 0.6, 4.2, 1.4, 6, "#4a4f5c", "#d9a48a")
        for cx, cy in ((x0 + 1, y0 + 1), (x1 - 1, y0 + 1), (x0 + 1, y1 - 0.5), (x1 - 1, y1 - 0.5)):
            p.cyl(cx, cy, 0, 10.0, 0.42, WHITE, seg=16, r2=0.34)
            p.cyl(cx, cy, 9.0, 9.3, 0.4, "#d9d0be", seg=16)
    elif n == "tate":
        p.box(x0, y0, 0, x1, y1, 4.0, BRICK_D)
        windows_grid(p, x0 + 0.3, x1 - 0.3, y1, 0.4, 3.6, 3.2, 4, "#3a3f4d", "#7a3a2a")
        p.box(x0 + w / 2 - 0.5, y0 + 1, 4.0, x0 + w / 2 + 0.5, y0 + 2, 11.0, BRICK_D)
        p.box(x0 + w / 2 - 0.55, y0 + 0.95, 10.6, x0 + w / 2 + 0.55, y0 + 2.05, 10.9, "#e9e3d6")
    elif n == "palace":
        p.box(x0, y0 + 2, 0, x1, y1, 3.6, "#efe6d2")
        windows_grid(p, x0 + 0.3, x1 - 0.3, y1, 0.3, 3.4, 1.1, int(w * 2), "#4a4f5c", WHITE, sash=True)
        p.box(x0 + w / 2 - 1.5, y1 - 0.2, 0, x0 + w / 2 + 1.5, y1 + 0.4, 4.2, "#efe6d2")
        for i in range(5):
            p.cyl(x0 + w / 2 - 1.2 + i * 0.6, y1 + 0.2, 0.1, 3.6, 0.1, WHITE, seg=8)
        p.box(x0 + w / 2 - 0.02, y1 - 0.5, 4.2, x0 + w / 2 + 0.02, y1 - 0.46, 5.8, INKY)
        p.box(x0 + w / 2, y1 - 0.5, 5.2, x0 + w / 2 + 0.9, y1 - 0.47, 5.75, "#7c4dff")
        p.box(x0, y1 + 0.6, 0.1, x1, y1 + 0.75, 0.9, INKY)                       # railings
        p.cyl(x0 + w / 2, y1 + 2.2, 0.1, 0.6, 1.0, WHITE, seg=24)                  # memorial
        p.cyl(x0 + w / 2, y1 + 2.2, 0.6, 2.4, 0.25, GOLD, seg=12)
    elif n == "eye":
        # Legs and the boarding platform; the wheel itself is an animated sprite.
        cx = x0 + w / 2
        p.box(x0 + 0.5, y0 + 0.4, 0.1, x1 - 0.5, y1 - 0.2, 0.5, "#cfd6de")
        for dx in (-1.6, 1.6):
            p.cyl(cx + dx * 0.5, y0 + 1.0, 0.0, 6.0, 0.12, "#e4e8ee", seg=8)
    elif n == "canary":
        for i, (ox, hh) in enumerate(((0.5, 12.0), (4.5, 16.0), (8.5, 11.0))):
            p.box(x0 + ox, y0 + 0.5, 0, x0 + ox + 3.0, y1 - 0.5, hh, "#b9cbe0")
            windows_grid(p, x0 + ox + 0.15, x0 + ox + 2.85, y1 - 0.5, 0.5, hh - 0.3, 0.8, 5, "#6d8fb3", "#d5e1ee")
            if i == 1:
                p.cyl(x0 + ox + 1.5, (y0 + y1) / 2, hh, hh + 2.2, 2.0, "#d5e1ee", seg=4, r2=0.05)
    add(p, t["id"], (y1) * 32)

# ── Street furniture, trees and stations ────────────────────────────────────
def small(t):
    x, y, k = t["x"] + 0.5, t["y"] + 0.5, t["kind"]
    p = Part()
    extra = []
    if k == "tree":
        kind = ["tree-large.glb", "tree-small.glb", "tree-large.glb"][(t["x"] * 3 + t["y"]) % 3]
        extra.append(place(SUBURBAN + kind, x - 0.9, y - 0.9, 1.8, 1.8, t["id"] + "-k"))
        p.cyl(x, y, 0.0, 0.08, 0.45, "#7fb868", seg=12)
    elif k == "lamp":
        extra.append(place("city-kit-roads/light-square.glb", x - 0.5, y - 0.5, 1.0, 1.0, t["id"] + "-k", scale=5.0))
    elif k == "bench":
        p.box(x - 0.45, y - 0.1, 0.35, x + 0.45, y + 0.2, 0.42, "#8a5a36"); p.box(x - 0.45, y - 0.15, 0.42, x + 0.45, y - 0.1, 0.75, "#8a5a36")
        for dx in (-0.4, 0.4):
            p.box(x + dx - 0.03, y - 0.1, 0.08, x + dx + 0.03, y + 0.2, 0.35, INKY)
    elif k == "phonebox":
        p.box(x - 0.3, y - 0.3, 0.1, x + 0.3, y + 0.3, 2.0, RED)
        p.box(x - 0.22, y + 0.3, 0.5, x + 0.22, y + 0.33, 1.7, "#c9e3f0")
        p.prism(x - 0.32, y - 0.32, x + 0.32, y + 0.32, 2.0, 2.25, RED, ridge="y")
    elif k == "postbox":
        p.cyl(x, y, 0.1, 1.1, 0.24, RED, seg=14); p.ball(x, y, 1.1, 0.25, 0.25, 0.14, RED, seg=12)
        p.box(x - 0.12, y + 0.22, 0.85, x + 0.12, y + 0.26, 0.9, INKY)
    elif k == "busstop":
        p.box(x - 0.6, y - 0.25, 1.9, x + 0.6, y + 0.25, 2.0, RED)
        p.box(x - 0.6, y - 0.25, 0.1, x - 0.55, y + 0.25, 1.9, INKY); p.box(x + 0.55, y - 0.25, 0.1, x + 0.6, y + 0.25, 1.9, INKY)
        p.box(x - 0.55, y - 0.25, 0.4, x + 0.55, y - 0.2, 1.8, "#cfe6ef")
        p.cyl(x + 0.75, y + 0.2, 0.1, 2.4, 0.04, INKY); p.cyl(x + 0.75, y + 0.2, 2.4, 2.45, 0.25, RED)
    add(p, t["id"], t["y"] * 32 + 26, extra)

def station(t):
    x0, y0, w, d = t["x"] + 0.05, t["y"] + 0.05, t["w"] - 0.1, t["h"] - 0.1
    x1, y1 = x0 + w, y0 + d
    p = Part()
    p.box(x0, y0, 0, x1, y1, 2.6, "#b5463a")                      # glazed terracotta, like the old tube stations
    p.box(x0 + 0.5, y1, 0.12, x1 - 0.5, y1 + 0.05, 1.7, "#2a2730")
    p.ball((x0 + x1) / 2, y1 + 0.02, 1.7, (w - 1.0) / 2, 0.03, (w - 1.0) / 2 * 0.7, "#2a2730", seg=16)
    p.box(x0 - 0.05, y1 - 0.02, 2.0, x1 + 0.05, y1 + 0.1, 2.35, "#2d1b69")   # name band (text drawn in-game)
    p.box(x0 - 0.08, y0 - 0.08, 2.6, x1 + 0.08, y1 + 0.08, 2.8, "#8a3229")
    # Sign post with our own hexagon badge (not the real roundel).
    p.cyl(x1 + 0.35, y1 + 0.3, 0.1, 2.7, 0.05, INKY)
    p.cyl(x1 + 0.35, y1 + 0.33, 2.7, 2.72, 0.42, "#7c4dff", seg=6)
    p.box(x1 - 0.15, y1 + 0.32, 2.62, x1 + 0.85, y1 + 0.38, 2.8, "#c6f36b")
    add(p, t["id"], (t["y"] + t["h"]) * 32)

# ── Highlands and other regions: mountains, pines, rocks, campsite ─────────
NATURE = "nature-kit/"
def mountain(t):
    """Stepped voxel mountain: grass on the lower slopes, rock above, snow on top."""
    x0, y0, w, d, peak = t["x"], t["y"], t["w"], t["h"], t["peak"]
    cx, cy = x0 + w / 2, y0 + d / 2
    p = Part()
    seed = x0 * 31 + y0 * 17
    for y in range(y0, y0 + d):
        for x in range(x0, x0 + w):
            dd = math.hypot((x + 0.5 - cx) / (w / 2), (y + 0.5 - cy) / (d / 2))
            if dd > 1:
                continue
            n = math.sin(x * 0.9 + seed) * 0.35 + math.cos(y * 1.3 + seed) * 0.35
            h = max(0.4, peak * (1 - dd ** 1.25) + n)
            h = round(h * 2) / 2
            f = h / peak
            colour = "#f4f6fa" if f > 0.72 else ("#9a98a2" if f > 0.42 else ("#8c8a93" if f > 0.3 else ("#7fb35e" if (x + y) % 3 else "#74a956")))
            p.box(x, y, 0, x + 1, y + 1, h, colour)
            if 0.42 < f <= 0.72 and (x * 7 + y) % 11 == 0:
                p.box(x + 0.2, y + 0.2, h, x + 0.8, y + 0.8, h + 0.35, "#86848d")
    extra = []
    for k in range(3):
        a = (seed + k * 2.1)
        rx = cx + math.cos(a) * w * 0.42
        ry = cy + abs(math.sin(a)) * d * 0.4
        extra.append(place(NATURE + f"tree_pineTall{'ABCD'[k % 4]}.glb", rx - 0.7, ry - 0.7, 1.4, 1.4, f"{t['id']}-p{k}"))
    add(p, t["id"], (y0 + d) * 32, extra)

def nature(t):
    x, y, k = t["x"], t["y"], t["kind"]
    seed = x * 7 + y * 3
    p = Part()
    extra = []
    if k == "pine":
        m = ["tree_pineTallA.glb", "tree_pineRoundB.glb", "tree_pineDefaultA.glb", "tree_pineTallC.glb", "tree_pineRoundD.glb"][seed % 5]
        extra.append(place(NATURE + m, x - 0.25, y - 0.25, 1.5, 1.5, t["id"] + "-k"))
    elif k == "rock":
        extra.append(place(NATURE + f"rock_large{'ABCDEF'[seed % 6]}.glb", x + 0.05, y + 0.05, 0.9, 0.9, t["id"] + "-k"))
    elif k == "flower":
        m = ["flower_redA.glb", "flower_yellowB.glb", "flower_purpleA.glb", "flower_yellowA.glb"][seed % 4]
        extra.append(place(NATURE + m, x + 0.25, y + 0.25, 0.5, 0.5, t["id"] + "-k"))
    elif k == "tent":
        extra.append(place(NATURE + "tent_detailedOpen.glb", x + 0.1, y + 0.1, 1.8, 1.8, t["id"] + "-k"))
    elif k == "campfire":
        extra.append(place(NATURE + "campfire_stones.glb", x + 0.1, y + 0.1, 0.8, 0.8, t["id"] + "-k"))
    p.box(x + 0.45, y + 0.45, 0.0, x + 0.55, y + 0.55, 0.01, GRASS)
    add(p, t["id"], (y + (2 if k == "tent" else 1)) * 32 - 6, extra)

for t in SCENE["things"]:
    k = t["kind"]
    if k == "mountain":
        mountain(t)
    elif k in ("pine", "rock", "flower", "tent", "campfire"):
        nature(t)
    elif k == "building":
        building(t)
    elif k == "landmark":
        landmark(t)
    elif k == "station":
        station(t)
    else:
        small(t)

# Object ids: every object gets an exact colour for the id pass.
def srgb_to_lin(v):
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

meta_objects = []
for i, (objs, sort_y) in enumerate(OBJECTS):
    k = i + 1
    r, g, b = (k % 16) * 17, ((k // 16) % 16) * 17, ((k // 256) % 16) * 17
    for o in objs:
        o.color = (srgb_to_lin(r / 255), srgb_to_lin(g / 255), srgb_to_lin(b / 255), 1)
    meta_objects.append({"name": objs[0].name, "id": k, "sortY": sort_y})

# ── Camera and tiled rendering ───────────────────────────────────────────────
cam_data = bpy.data.cameras.new("cam")
cam_data.type = "ORTHO"
cam = bpy.data.objects.new("cam", cam_data)
sc.collection.objects.link(cam)
sc.camera = cam
theta = math.radians(90) - ELEV
cam.rotation_euler = (theta, 0, 0)
right = Vector((1, 0, 0))
up = Vector((0, math.cos(theta), math.sin(theta)))
view = Vector((0, math.sin(theta), -math.cos(theta)))

total_w = COLS * PPU
total_h = int(math.ceil((TOP - BOTTOM) * PPU))
nx = math.ceil(total_w / TILE_PX)
ny = math.ceil(total_h / TILE_PX)
tiles_meta = []

def place(u0, v_top, wpx, hpx):
    """Point the camera so the tile's top-left is (u0, v_top) in view units."""
    sc.render.resolution_x = wpx
    sc.render.resolution_y = hpx
    span = max(wpx, hpx) / PPU
    cam_data.ortho_scale = span
    cu = u0 + wpx / PPU / 2
    cv = v_top - hpx / PPU / 2
    # A world point p has view coords u = p.x, v = p . up. Pick a point with those, then back off.
    target = right * cu + up * cv
    cam.location = target - view * 200

def render(path_kind):
    path = f"/tmp/_city{os.getpid()}.png"
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]
    bpy.data.images.remove(img)
    return a

# Lighting for the colour pass: a warm sun from the south-west (shadows fall behind
# buildings, away from the streets you walk) and a soft sky fill, like Kenney's previews.
sun_d = bpy.data.lights.new("sun", "SUN"); sun_d.energy = 3.2; sun_d.angle = math.radians(8); sun_d.color = (1.0, 0.96, 0.9)
sun = bpy.data.objects.new("sun", sun_d); sc.collection.objects.link(sun)
sun.rotation_euler = (math.radians(38), math.radians(-18), math.radians(-28))
world = bpy.data.worlds.new("sky"); sc.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.78, 0.84, 0.95, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.55
sc.eevee.taa_render_samples = 32

k = 0
for j in range(ny):
    for i in range(nx):
        wpx = min(TILE_PX, total_w - i * TILE_PX)
        hpx = min(TILE_PX, total_h - j * TILE_PX)
        tiles_meta.append({"i": i, "j": j, "x": i * TILE_PX, "y": j * TILE_PX, "w": wpx, "h": hpx})
        skip = PART is not None and ((PART == "even" and k % 2) or (PART == "odd" and not k % 2) or (PART.isdigit() and k != int(PART)))
        if skip:
            k += 1
            continue
        out = os.path.join(OUT, f"tile_{j}_{i}.npz")
        if os.path.exists(out) and os.environ.get("SKIP_DONE"):
            k += 1
            continue
        place(i * TILE_PX / PPU, TOP - j * TILE_PX / PPU, wpx, hpx)
        sc.render.engine = "BLENDER_EEVEE_NEXT"
        colour = render("colour")
        sc.render.engine = "BLENDER_WORKBENCH"
        light = np.ones(colour.shape[:2], np.float32)
        sh.light = "FLAT"; sh.color_type = "OBJECT"
        ids = render("id")[..., :3]
        np.savez_compressed(out, colour=colour.astype(np.float16), light=light.astype(np.float16), id=(ids * 255).round().astype(np.uint8))
        print("TILE", j, i, flush=True)
        k += 1

json.dump({"lit": True, "cols": COLS, "rows": ROWS, "ppu": PPU, "elev": math.degrees(ELEV), "top": TOP, "bottom": BOTTOM,
           "width": total_w, "height": total_h, "tiles": tiles_meta, "objects": meta_objects},
          open(os.path.join(OUT, "meta.json"), "w"))
