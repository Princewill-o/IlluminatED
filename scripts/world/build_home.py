"""
Your home, in Blender: a cut-away room (low front and side walls, like a doll's
house) with a bed, wardrobe, bookshelf, revision desk, TV and sofa, rug, plants
and a pet bed. Rendered in three colourways with the same camera and finish as
London, in the same raw format post_london.py reads.

  blender -b --python build_home.py -- home.json out_dir style
"""
import bpy, bmesh, json, math, os, sys
import numpy as np
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1:]
SCENE = json.load(open(ARGS[0]))
OUT = ARGS[1]
STYLE = int(ARGS[2])
# "furniture": render only the things (the shop catalogue), no room shell.
ONLY_THINGS = len(ARGS) > 3 and ARGS[3] == "furniture"
os.makedirs(OUT, exist_ok=True)
COLS, ROWS = SCENE["cols"], SCENE["rows"]
ELEV = math.radians(42)
PPU = 64
TOP = 6.0
BOTTOM = -ROWS * math.sin(ELEV) - 0.6

WALLS = [("#d9ccf5", "#b9a7ea"), ("#cfeedd", "#a9dcc2"), ("#ffe0c8", "#f5c3a0")][STYLE]
FLOOR = [("#c99b6d", "#b88a5c"), ("#d8b48a", "#c9a276"), ("#a77a55", "#946847")][STYLE]
RUG = ["#7c4dff", "#2d6a4f", "#c8322d"][STYLE]

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

class Part:
    def __init__(self):
        self.bm = bmesh.new(); self.mats = []
    def _mi(self, c):
        if c not in self.mats: self.mats.append(c)
        return self.mats.index(c)
    def box(self, x0, y0, z0, x1, y1, z1, c):
        mi = self._mi(c)
        r = bmesh.ops.create_cube(self.bm, size=1.0)
        for v in r["verts"]:
            v.co.x = x0 if v.co.x < 0 else x1
            v.co.y = -(y0 if v.co.y > 0 else y1)
            v.co.z = z0 if v.co.z < 0 else z1
        for f in {f for v in r["verts"] for f in v.link_faces}: f.material_index = mi
    def cyl(self, cx, cy, z0, z1, r, c, seg=16, r2=None):
        mi = self._mi(c)
        res = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=z1 - z0)
        for v in res["verts"]:
            v.co.x += cx; v.co.y -= cy; v.co.z += (z0 + z1) / 2
        for f in {f for v in res["verts"] for f in v.link_faces}: f.material_index = mi; f.smooth = True
    def ball(self, cx, cy, cz, rx, ry, rz, c, seg=14):
        mi = self._mi(c)
        res = bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=seg // 2 + 1, radius=1.0)
        for v in res["verts"]:
            v.co = Vector((v.co.x * rx + cx, v.co.y * ry - cy, v.co.z * rz + cz))
        for f in {f for v in res["verts"] for f in v.link_faces}: f.material_index = mi; f.smooth = True
    def finish(self, name):
        me = bpy.data.meshes.new(name); self.bm.to_mesh(me); self.bm.free()
        for c in self.mats: me.materials.append(mat(c))
        o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); return o

OBJECTS = []
def add(p, name, sort_y=None):
    OBJECTS.append((p.finish(name), sort_y))

INK = "#2a2730"; WHITE = "#f4f0ea"; GLASS = "#9fd2ef"

def room():
  fl = Part()
  for y in range(2, ROWS - 1):
      for x in range(1, COLS - 1):
          fl.box(x, y, -0.2, x + 1, y + 1, 0.0, FLOOR[(x // 2 + y) % 2])
  add(fl, "floor")
  rug = Part(); rug.box(6.1, 6.1, 0.0, 11.9, 10.9, 0.03, RUG); rug.box(6.4, 6.4, 0.03, 11.6, 10.6, 0.04, "#f4f0ea" if STYLE != 2 else "#ffd166"); rug.box(6.6, 6.6, 0.04, 11.4, 10.4, 0.05, RUG)
  add(rug, "rug")

  # Back wall with skirting, a big window and pictures; low side and front walls (cut away).
  bw = Part()
  bw.box(0, 0, 0, COLS, 2, 4.2, WALLS[0])
  bw.box(0, 1.95, 0, COLS, 2.02, 0.3, WHITE)
  for x0 in (3.0, 14.5):
      bw.box(x0, 1.96, 1.4, x0 + 2.5, 2.02, 3.4, WHITE)
      bw.box(x0 + 0.12, 1.98, 1.52, x0 + 2.38, 2.04, 3.28, GLASS)
      bw.box(x0 + 1.22, 2.0, 1.52, x0 + 1.28, 2.06, 3.28, WHITE)
  bw.box(9.3, 1.97, 2.0, 11.0, 2.03, 3.2, "#ffd166"); bw.box(9.45, 2.0, 2.15, 10.85, 2.05, 3.05, "#7c4dff")   # poster
  bw.box(0, 0, 4.2, COLS, 2, 4.35, WALLS[1])
  add(bw, "back-wall", 2 * 32)
  sw = Part()
  sw.box(0, 0, 0, 1, ROWS, 0.7, WALLS[1]); sw.box(COLS - 1, 0, 0, COLS, ROWS, 0.7, WALLS[1])
  sw.box(0, ROWS - 1, 0, 9, ROWS, 0.7, WALLS[1]); sw.box(11, ROWS - 1, 0, COLS, ROWS, 0.7, WALLS[1])
  sw.box(9, ROWS - 1, 0, 11, ROWS, 0.04, "#5a3f2b")   # threshold
  add(sw, "low-walls")
if not ONLY_THINGS:
    room()


def thing(t):
    n, x0, y0, w, d = t["name"], t["x"], t["y"], t["w"], t["h"]
    x1, y1 = x0 + w, y0 + d
    p = Part()
    if n == "bed":
        p.box(x0 + 0.1, y0, 0, x1 - 0.1, y1 - 0.1, 0.55, "#8a5a36")
        p.box(x0 + 0.15, y0 + 0.05, 0.55, x1 - 0.15, y1 - 0.15, 0.85, WHITE)
        p.box(x0 + 0.15, y0 + 1.4, 0.85, x1 - 0.15, y1 - 0.15, 0.95, RUG)
        p.ball(x0 + 1.0, y0 + 0.7, 0.95, 0.6, 0.35, 0.18, WHITE); p.ball(x1 - 1.0, y0 + 0.7, 0.95, 0.6, 0.35, 0.18, WHITE)
        p.box(x0 + 0.1, y0 - 0.05, 0, x1 - 0.1, y0 + 0.15, 1.7, "#8a5a36")
    elif n == "wardrobe":
        p.box(x0 + 0.1, y0 + 0.05, 0, x1 - 0.1, y1, 3.2, "#b5835a")
        p.box(x0 + w / 2 - 0.03, y1, 0.2, x0 + w / 2 + 0.03, y1 + 0.03, 3.0, "#7a5536")
        for hx in (x0 + w / 2 - 0.25, x0 + w / 2 + 0.25):
            p.box(hx - 0.03, y1, 1.5, hx + 0.03, y1 + 0.08, 1.9, "#e8b84a")
    elif n == "shelf":
        p.box(x0 + 0.1, y0 + 0.05, 0, x1 - 0.1, y0 + 0.2, 3.0, "#8a5a36")                       # back
        p.box(x0 + 0.1, y0 + 0.05, 0, x0 + 0.22, y1, 3.0, "#8a5a36"); p.box(x1 - 0.22, y0 + 0.05, 0, x1 - 0.1, y1, 3.0, "#8a5a36")
        p.box(x0 + 0.1, y0 + 0.05, 2.9, x1 - 0.1, y1, 3.05, "#8a5a36")
        cols = ["#7c4dff", "#ff7a6b", "#5fd3a5", "#ffd166", "#6bc6ff", "#c8322d"]
        for k, z in enumerate((0.3, 1.2, 2.1)):
            p.box(x0 + 0.15, y1 - 0.05, z - 0.06, x1 - 0.15, y1, z, "#6b4429")
            for b in range(8):
                bx = x0 + 0.25 + b * (w - 0.5) / 8
                p.box(bx, y0 + 0.25, z, bx + 0.25, y1 - 0.02, z + 0.6 + (b % 3) * 0.08, cols[(b + k) % len(cols)])
    elif n == "desk":
        p.box(x0 + 0.1, y0 + 0.1, 1.2, x1 - 0.1, y1 - 0.2, 1.35, "#e9e3d6")
        for lx, ly in ((x0 + 0.2, y0 + 0.2), (x1 - 0.3, y0 + 0.2), (x0 + 0.2, y1 - 0.4), (x1 - 0.3, y1 - 0.4)):
            p.box(lx, ly, 0, lx + 0.1, ly + 0.1, 1.2, INK)
        p.box(x0 + 1.0, y0 + 0.4, 1.35, x0 + 2.4, y0 + 0.5, 2.2, INK); p.box(x0 + 1.05, y0 + 0.5, 1.4, x0 + 2.35, y0 + 0.52, 2.15, "#6bc6ff")
        p.box(x0 + 2.8, y0 + 0.6, 1.35, x0 + 3.5, y0 + 1.1, 1.5, "#ff7a6b")         # books
        p.cyl(x0 + 0.6, y0 + 0.7, 1.35, 1.6, 0.12, WHITE)                         # mug
        p.box(x0 + 1.4, y1 - 0.1, 0, x0 + 2.2, y1 + 0.6, 0.8, "#7c4dff")             # chair
        p.box(x0 + 1.4, y1 + 0.5, 0.8, x0 + 2.2, y1 + 0.6, 1.8, "#7c4dff")
    elif n == "tv":
        p.box(x0 + 0.2, y0 + 0.1, 0, x1 - 0.2, y1 - 0.1, 0.8, "#4a3f5a")
        p.box(x0 + 0.4, y0 + 0.4, 0.8, x1 - 0.4, y0 + 0.5, 2.6, INK)
        p.box(x0 + 0.5, y0 + 0.5, 0.9, x1 - 0.5, y0 + 0.52, 2.5, "#c6f36b")
    elif n == "sofa":
        p.box(x0 + 0.1, y0 + 0.2, 0, x1 - 0.1, y1, 0.8, RUG)
        p.box(x0 + 0.1, y1 - 0.45, 0.8, x1 - 0.1, y1, 1.8, RUG)
        p.box(x0 + 0.05, y0 + 0.2, 0, x0 + 0.45, y1, 1.2, RUG); p.box(x1 - 0.45, y0 + 0.2, 0, x1 - 0.05, y1, 1.2, RUG)
        p.ball(x0 + 1.2, y1 - 0.6, 1.1, 0.35, 0.15, 0.3, "#ffd166"); p.ball(x1 - 1.2, y1 - 0.6, 1.1, 0.35, 0.15, 0.3, WHITE)
    elif n == "table":
        p.box(x0 + 0.2, y0 + 0.2, 0.8, x1 - 0.2, y1 - 0.2, 0.92, "#b5835a")
        for lx, ly in ((x0 + 0.3, y0 + 0.3), (x1 - 0.4, y0 + 0.3), (x0 + 0.3, y1 - 0.4), (x1 - 0.4, y1 - 0.4)):
            p.box(lx, ly, 0, lx + 0.1, ly + 0.1, 0.8, "#7a5536")
        p.cyl(x0 + 1.5, y0 + 1.0, 0.92, 1.2, 0.25, "#5fd3a5"); p.ball(x0 + 1.5, y0 + 1.0, 1.4, 0.3, 0.3, 0.3, "#6fb35a")
    elif n == "petbed":
        p.cyl(x0 + 1, y0 + 1, 0, 0.35, 0.85, "#ffb26b", seg=24); p.cyl(x0 + 1, y0 + 1, 0.2, 0.4, 0.6, WHITE, seg=24)
    elif n == "plant":
        p.cyl(x0 + 0.5, y0 + 0.5, 0, 0.7, 0.32, "#c46a4a", r2=0.4)
        for dx, dy, r in ((0, 0, 0.5), (-0.2, 0.1, 0.38), (0.22, 0.05, 0.4)):
            p.ball(x0 + 0.5 + dx, y0 + 0.5 + dy, 1.3 + r * 0.6, r, r, r * 1.1, "#5aa04a")
    elif n == "lamp":
        p.cyl(x0 + 0.5, y0 + 0.5, 0, 2.6, 0.05, INK); p.cyl(x0 + 0.5, y0 + 0.5, 2.6, 3.2, 0.4, "#ffe6a8", r2=0.22)
    elif n == "armchair":
        p.box(x0 + 0.15, y0 + 0.3, 0, x1 - 0.15, y1 - 0.1, 0.8, "#c46a4a")
        p.box(x0 + 0.15, y0 + 0.2, 0.8, x1 - 0.15, y0 + 0.6, 2.0, "#c46a4a")
        p.box(x0 + 0.05, y0 + 0.2, 0, x0 + 0.4, y1 - 0.1, 1.3, "#a8553a"); p.box(x1 - 0.4, y0 + 0.2, 0, x1 - 0.05, y1 - 0.1, 1.3, "#a8553a")
        p.ball(x0 + 1, y0 + 1.1, 0.95, 0.5, 0.4, 0.15, WHITE)
    elif n == "beanbag":
        p.ball(x0 + 1, y0 + 1, 0.55, 0.9, 0.85, 0.6, RUG, seg=20); p.ball(x0 + 1, y0 + 0.75, 1.0, 0.6, 0.35, 0.45, RUG, seg=16)
    elif n == "rug":
        p.cyl(x0 + 1.5, y0 + 1.5, 0, 0.03, 1.45, "#ffd166", seg=32); p.cyl(x0 + 1.5, y0 + 1.5, 0.03, 0.05, 1.05, RUG, seg=32); p.cyl(x0 + 1.5, y0 + 1.5, 0.05, 0.06, 0.55, WHITE, seg=32)
    elif n == "fridge":
        p.box(x0 + 0.15, y0 + 0.05, 0, x1 - 0.15, y1, 3.4, "#e9edf2")
        p.box(x0 + 0.15, y1, 2.1, x1 - 0.15, y1 + 0.02, 2.14, "#9aa3ad")
        p.box(x0 + 0.35, y1, 2.4, x0 + 0.45, y1 + 0.1, 3.1, "#9aa3ad"); p.box(x0 + 0.35, y1, 0.9, x0 + 0.45, y1 + 0.1, 1.8, "#9aa3ad")
        p.box(x0 + 1.0, y1, 2.5, x0 + 1.3, y1 + 0.03, 2.8, "#ff7a6b")
    elif n == "fishtank":
        p.box(x0 + 0.1, y0 + 0.1, 0, x1 - 0.1, y1 - 0.05, 1.0, "#4a3f5a")
        p.box(x0 + 0.15, y0 + 0.15, 1.0, x1 - 0.15, y1 - 0.1, 2.2, "#6bc6ff")
        p.box(x0 + 0.15, y0 + 0.15, 2.2, x1 - 0.15, y1 - 0.1, 2.35, INK)
        for fx, fz, c in ((x0 + 0.9, 1.6, "#ffb26b"), (x0 + 1.9, 1.35, "#ffd166"), (x0 + 2.2, 1.85, "#ff7a6b")):
            p.ball(fx, y1 - 0.12, fz, 0.18, 0.05, 0.1, c, seg=10)
        p.ball(x0 + 0.5, y1 - 0.15, 1.15, 0.2, 0.05, 0.2, "#5aa04a", seg=10)
    elif n == "gaming":
        p.box(x0 + 0.1, y0 + 0.1, 1.2, x1 - 0.1, y0 + 1.2, 1.32, INK)
        for lx in (x0 + 0.2, x1 - 0.3):
            p.box(lx, y0 + 0.2, 0, lx + 0.1, y0 + 1.1, 1.2, INK)
        p.box(x0 + 0.5, y0 + 0.2, 1.32, x1 - 0.5, y0 + 0.3, 2.4, INK); p.box(x0 + 0.55, y0 + 0.3, 1.4, x1 - 0.55, y0 + 0.32, 2.3, "#7c4dff")
        p.box(x0 + 0.6, y0 + 0.31, 1.6, x1 - 0.6, y0 + 0.33, 1.7, "#c6f36b")
        p.box(x0 + 0.8, y0 + 0.6, 1.32, x1 - 0.8, y0 + 0.9, 1.38, "#ff7a6b")
        p.box(x0 + 0.9, y1 - 0.7, 0, x1 - 0.9, y1 - 0.1, 0.9, "#c8322d"); p.box(x0 + 0.9, y1 - 0.25, 0.9, x1 - 0.9, y1 - 0.1, 2.0, "#c8322d")
    elif n == "telescope":
        for a in (0, 2.1, 4.2):
            p.box(x0 + 0.5 + 0.3 * math.cos(a) - 0.03, y0 + 0.5 + 0.3 * math.sin(a) - 0.03, 0, x0 + 0.5 + 0.3 * math.cos(a) + 0.03, y0 + 0.5 + 0.3 * math.sin(a) + 0.03, 1.4, INK)
        p.ball(x0 + 0.5, y0 + 0.5, 1.6, 0.18, 0.18, 0.5, WHITE, seg=12); p.ball(x0 + 0.5, y0 + 0.3, 2.1, 0.12, 0.12, 0.15, INK, seg=10)
    elif n == "trophies":
        p.box(x0 + 0.1, y0 + 0.05, 0, x1 - 0.1, y1, 3.0, "#6b4429")
        p.box(x0 + 0.2, y1 - 0.02, 0.2, x1 - 0.2, y1, 2.8, "#cfe9f5")
        for k, z in enumerate((0.3, 1.2, 2.1)):
            p.box(x0 + 0.2, y0 + 0.2, z - 0.05, x1 - 0.2, y1 - 0.05, z, "#8a5a36")
            for b in range(3):
                bx = x0 + 0.6 + b * 0.9
                c = ("#ffd166", "#d9d9e3", "#d08b4a")[(b + k) % 3]
                p.cyl(bx, y0 + 0.6, z, z + 0.15, 0.12, c); p.cyl(bx, y0 + 0.6, z + 0.15, z + 0.55, 0.22, c, r2=0.1)
    elif n == "piano":
        p.box(x0 + 0.1, y0 + 0.1, 0, x1 - 0.1, y0 + 0.9, 2.6, INK)
        p.box(x0 + 0.1, y0 + 0.9, 1.1, x1 - 0.1, y0 + 1.4, 1.3, INK)
        p.box(x0 + 0.15, y0 + 0.9, 1.3, x1 - 0.15, y0 + 1.35, 1.36, WHITE)
        for k in range(14):
            if k % 7 in (2, 6): continue
            kx = x0 + 0.3 + k * 0.17
            p.box(kx, y0 + 0.9, 1.36, kx + 0.08, y0 + 1.1, 1.42, INK)
        for lx in (x0 + 0.2, x1 - 0.3):
            p.box(lx, y0 + 1.2, 0, lx + 0.1, y0 + 1.3, 1.1, INK)
        p.box(x0 + 0.9, y1 - 0.5, 0, x1 - 0.9, y1 - 0.1, 0.8, "#4a3f5a")
    elif n == "arcade":
        p.box(x0 + 0.2, y0 + 0.05, 0, x1 - 0.2, y1, 3.6, "#7c4dff")
        p.box(x0 + 0.3, y1, 2.0, x1 - 0.3, y1 + 0.03, 3.0, INK); p.box(x0 + 0.38, y1 + 0.03, 2.1, x1 - 0.38, y1 + 0.05, 2.9, "#c6f36b")
        p.box(x0 + 0.2, y1, 1.5, x1 - 0.2, y1 + 0.5, 1.7, "#4a3f5a")
        p.ball(x0 + 0.7, y1 + 0.25, 1.8, 0.08, 0.08, 0.12, "#ff7a6b", seg=8); p.ball(x0 + 1.2, y1 + 0.25, 1.75, 0.07, 0.07, 0.05, "#ffd166", seg=8)
        p.box(x0 + 0.2, y1 - 0.2, 3.3, x1 - 0.2, y1 + 0.05, 3.6, "#ffd166")
    add(p, t["id"], 1 if n == "rug" else (y1) * 32)

for t in SCENE["things"]:
    thing(t)

def srgb_to_lin(v):
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
meta_objects = []
for i, (o, sort_y) in enumerate(OBJECTS):
    k = i + 1
    o.color = (srgb_to_lin((k % 16) * 17 / 255), srgb_to_lin(((k // 16) % 16) * 17 / 255), srgb_to_lin(((k // 256) % 16) * 17 / 255), 1)
    meta_objects.append({"name": o.name, "id": k, "sortY": sort_y})

cam_data = bpy.data.cameras.new("cam"); cam_data.type = "ORTHO"
cam = bpy.data.objects.new("cam", cam_data); sc.collection.objects.link(cam); sc.camera = cam
theta = math.radians(90) - ELEV
cam.rotation_euler = (theta, 0, 0)
up = Vector((0, math.cos(theta), math.sin(theta))); view = Vector((0, math.sin(theta), -math.cos(theta)))
W = COLS * PPU
Hpx = int(math.ceil((TOP - BOTTOM) * PPU))
sc.render.resolution_x, sc.render.resolution_y = W, Hpx
cam_data.ortho_scale = max(W, Hpx) / PPU
cam.location = Vector((W / PPU / 2, 0, 0)) + up * (TOP - Hpx / PPU / 2) - view * 200

def render():
    path = f"/tmp/_home{os.getpid()}.png"
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]
    bpy.data.images.remove(img)
    return a

sh.light = "FLAT"; sh.color_type = "MATERIAL"; colour = render()
sh.light = "STUDIO"; sh.color_type = "SINGLE"; sh.single_color = (1, 1, 1); light = render()[..., 0]
sh.light = "FLAT"; sh.color_type = "OBJECT"; ids = render()[..., :3]
np.savez_compressed(os.path.join(OUT, "tile_0_0.npz"), colour=colour.astype(np.float16), light=light.astype(np.float16), id=(ids * 255).round().astype(np.uint8))
json.dump({"cols": COLS, "rows": ROWS, "ppu": PPU, "elev": math.degrees(ELEV), "top": TOP, "bottom": BOTTOM, "width": W, "height": Hpx,
           "tiles": [{"i": 0, "j": 0, "x": 0, "y": 0, "w": W, "h": Hpx}], "objects": meta_objects}, open(os.path.join(OUT, "meta.json"), "w"))
print("HOME DONE", STYLE)
