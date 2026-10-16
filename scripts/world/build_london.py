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
        MATS[h] = m
    return m

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
def add(part, name, sort_y=None):
    o = part.finish(name)
    OBJECTS.append((o, sort_y))
    return o

# ── Palette (London, cel-shaded) ─────────────────────────────────────────────
STONE = "#e4dccb"; STONE_D = "#c9bfaa"; GLASS = "#3e4658"; GLASS_L = "#5a6478"
BRICK = "#b05a43"; BRICK_D = "#8c4433"; LBRICK = "#cdb58a"; SLATE = "#5d6070"
WHITE = "#f4f0ea"; INKY = "#2a2730"; RED = "#c8322d"; GOLD = "#e8b84a"
GRASS = "#93c97a"; GRASS_D = "#7fb868"; PAVE = "#d8d3ca"; KERB = "#bdb7ad"
ROAD = "#6f6b78"; PATH = "#e3cfa3"; WATER = "#5fb4c7"; EMB = "#cfc6b6"; LEAF = "#6fb35a"; LEAF_D = "#5a9d48"

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
    x0, y0, w, d, H = t["x"] + 0.06, t["y"] + 0.06, t["w"] - 0.12, t["h"] - 0.12, t["height"]
    x1, y1 = x0 + w, y0 + d
    style = t["style"]
    p = Part()
    if style in ("office", "stone", "company", "glass"):
        H = {"office": 6.0, "stone": 5.2, "company": 6.0, "glass": 8.0}[style] + (t["x"] % 3) * 0.6
        body = t.get("accent") if style == "company" else (STONE if style != "glass" else "#a8c4d8")
        frame = STONE if style == "company" else STONE_D
        p.box(x0, y0, 0, x1, y1, H, STONE if style != "glass" else "#9cb9cf")
        # Ground floor: a tall glazed base.
        p.box(x0 + 0.1, y1, 0.1, x1 - 0.1, y1 + 0.05, 1.3, "#2f3644")
        for k in range(int(w) + 1):
            p.box(x0 + 0.1 + k * (w - 0.2) / max(1, int(w)) - 0.04, y1, 0.1, x0 + 0.1 + k * (w - 0.2) / max(1, int(w)) + 0.04, y1 + 0.08, 1.3, frame)
        windows_grid(p, x0 + 0.1, x1 - 0.1, y1, 1.5, H - 0.6, 1.0, max(2, int(w * 1.4)), GLASS if style != "glass" else "#5b86a8", frame)
        # Cornice, parapet and rooftop plant.
        p.box(x0 - 0.06, y0 - 0.06, H - 0.25, x1 + 0.06, y1 + 0.06, H - 0.1, frame)
        p.box(x0, y0, H - 0.1, x1, y1, H + 0.2, STONE_D)
        p.box(x0 + 0.12, y0 + 0.12, H + 0.2, x1 - 0.12, y1 - 0.12, H + 0.22, "#b4ada0")             # roof membrane
        p.box(x0 + w * 0.15, y0 + d * 0.2, H + 0.2, x0 + w * 0.5, y0 + d * 0.5, H + 0.8, "#9a97a3")   # plant room
        for k_ in range(3):
            p.box(x0 + w * 0.6, y0 + d * (0.2 + k_ * 0.2), H + 0.22, x1 - 0.25, y0 + d * (0.2 + k_ * 0.2) + 0.12, H + 0.36, "#7d8fa3")  # skylights
        p.cyl(x0 + w * 0.3, y0 + d * 0.75, H + 0.2, H + 0.9, 0.22, "#8c8a94", seg=12)                # water tank
        if style == "company":
            # Company colour band and a sign plinth on the roof (logo drawn in-game).
            p.box(x0 - 0.02, y1 - 0.02, 1.3, x1 + 0.02, y1 + 0.09, 1.55, body)
            p.box(x0 + w / 2 - 0.7, y1 - 0.4, H + 0.2, x0 + w / 2 + 0.7, y1 - 0.2, H + 1.6, body)
    elif style == "brick":
        H = 4.6
        p.box(x0, y0, 0, x1, y1, H, BRICK)
        p.box(x0 + 0.1, y1, 0.1, x1 - 0.1, y1 + 0.06, 1.2, RED)          # red shopfront
        p.box(x0 + 0.25, y1 + 0.05, 0.25, x1 - 0.25, y1 + 0.09, 1.0, "#3a3f4d")
        for z in (1.3, 2.6, 3.8):
            p.box(x0 - 0.03, y1 - 0.02, z, x1 + 0.03, y1 + 0.06, z + 0.12, STONE)   # stone bands
        windows_grid(p, x0 + 0.1, x1 - 0.1, y1, 1.4, H - 0.6, 1.4, max(2, int(w)), GLASS, STONE, arched=True)
        p.box(x0 - 0.1, y0 - 0.1, H, x1 + 0.1, y1 + 0.1, H + 0.2, STONE)
        p.prism(x0, y0, x1, y1, H + 0.2, H + 1.1, SLATE)
    elif style == "shop":
        H = 4.0
        p.box(x0, y0, 0, x1, y1, H, LBRICK if t["x"] % 2 else BRICK)
        awn = ["#2d6a4f", RED, "#2d1b69", "#1f5f8b"][t["x"] % 4]
        p.box(x0 + 0.05, y1, 0.1, x1 - 0.05, y1 + 0.06, 1.3, awn)
        p.box(x0 + 0.25, y1 + 0.05, 0.2, x1 - 0.25, y1 + 0.09, 1.05, "#3a3f4d")
        p.box(x0 + 0.05, y1 + 0.05, 1.3, x1 - 0.05, y1 + 0.55, 1.42, awn)          # awning
        windows_grid(p, x0 + 0.1, x1 - 0.1, y1, 1.6, H - 0.4, 1.3, max(2, int(w)), GLASS, WHITE, sash=True)
        p.box(x0 - 0.06, y0 - 0.06, H, x1 + 0.06, y1 + 0.06, H + 0.18, STONE)
    else:  # terrace house
        H = 2.7
        col = t["colour"]
        p.box(x0, y0, 0, x1, y1, H, LBRICK if col == "#e8d6b9" else col)
        p.box(x0 - 0.02, y1 - 0.02, 0.0, x1 + 0.02, y1 + 0.05, 0.5, STONE)
        door = ["#c8322d", "#2d1b69", "#1f5f8b", "#2d6a4f", "#e8b84a"][(t["x"] // 3) % 5]
        p.box(x0 + w * 0.15, y1, 0.12, x0 + w * 0.15 + 0.5, y1 + 0.06, 1.35, door)
        p.box(x0 + w * 0.12, y1 - 0.02, 1.35, x0 + w * 0.15 + 0.62, y1 + 0.09, 1.45, WHITE)
        windows_grid(p, x0 + w * 0.42, x1 - 0.1, y1, 0.4, H - 0.2, 1.3, 1, GLASS, WHITE, sash=True)
        windows_grid(p, x0 + 0.1, x0 + w * 0.42, y1, 1.6, H - 0.2, 1.4, 1, GLASS, WHITE, sash=True)
        p.prism(x0 - 0.05, y0 - 0.05, x1 + 0.05, y1 + 0.05, H, H + 1.2, t["roof"] if t["roof"] else SLATE)
        p.box(x0 + 0.3, y0 + d * 0.4, H + 0.4, x0 + 0.65, y0 + d * 0.6, H + 1.5, BRICK_D)   # chimney
        p.cyl(x0 + 0.4, y0 + d * 0.5, H + 1.5, H + 1.7, 0.06, "#c46a4a")
        if t.get("label") == "Your house":
            p.box(x0 + 0.2, y1 + 0.3, 0.12, x1 - 0.2, y1 + 0.9, 0.14, "#7c4dff")   # welcome mat
    add(p, t["id"], (t["y"] + t["h"]) * 32)

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
    if k == "tree":
        p.cyl(x, y, 0.06, 1.5, 0.1, "#7a5a3c", seg=8)
        p.ball(x, y - 0.05, 2.1, 0.8, 0.75, 0.75, LEAF, seg=16)
        p.ball(x - 0.35, y + 0.1, 1.75, 0.5, 0.48, 0.48, LEAF_D, seg=12)
        p.ball(x + 0.38, y + 0.05, 1.85, 0.5, 0.48, 0.5, LEAF, seg=12)
    elif k == "lamp":
        p.cyl(x, y, 0.1, 2.6, 0.05, INKY, seg=8)
        p.box(x - 0.15, y - 0.15, 2.6, x + 0.15, y + 0.15, 2.95, "#f6e3a2")
        p.cyl(x, y, 2.95, 3.15, 0.2, INKY, seg=4, r2=0.02)
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
    add(p, t["id"], t["y"] * 32 + 26)

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

for t in SCENE["things"]:
    k = t["kind"]
    if k == "building":
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
for i, (o, sort_y) in enumerate(OBJECTS):
    k = i + 1
    r, g, b = (k % 16) * 17, ((k // 16) % 16) * 17, ((k // 256) % 16) * 17
    o.color = (srgb_to_lin(r / 255), srgb_to_lin(g / 255), srgb_to_lin(b / 255), 1)
    meta_objects.append({"name": o.name, "id": k, "sortY": sort_y})

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
        sh.light = "FLAT"; sh.color_type = "MATERIAL"
        colour = render("colour")
        sh.light = "STUDIO"; sh.color_type = "SINGLE"; sh.single_color = (1, 1, 1)
        light = render("light")[..., 0]
        sh.light = "FLAT"; sh.color_type = "OBJECT"
        ids = render("id")[..., :3]
        np.savez_compressed(out, colour=colour.astype(np.float16), light=light.astype(np.float16), id=(ids * 255).round().astype(np.uint8))
        print("TILE", j, i, flush=True)
        k += 1

json.dump({"cols": COLS, "rows": ROWS, "ppu": PPU, "elev": math.degrees(ELEV), "top": TOP, "bottom": BOTTOM,
           "width": total_w, "height": total_h, "tiles": tiles_meta, "objects": meta_objects},
          open(os.path.join(OUT, "meta.json"), "w"))
