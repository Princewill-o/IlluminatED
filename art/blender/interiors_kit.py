"""IlluminatED interiors kit: furniture for cafés, diners, shops, the town hall,
staircases and the airport terminal. Original models.

  python3 art/blender/interiors_kit.py export             -> public/world3d/interiors/*.glb
  python3 art/blender/interiors_kit.py sheet out.png       (a preview of every piece)

1 Blender unit = 1 game tile, Z up, fronts face -Y (south in game). Each model
sits in a footprint starting at the origin: x 0..w, y 0..d.
"""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import london_kit as K
from london_kit import box, cyl, sphere, ring, prism, colour, reset

K.OUT = "/home/claude/illuminated/public/world3d/interiors"

def C(name, rgb, rough=0.6):
    return colour(name, rgb, rough)

# ── Café (warm wood, leather, mustard, brass) ───────────────────────────────
def cafe_counter():
    wood, top, brass = C("walnut", (0.34, 0.2, 0.11), 0.5), C("marble", (0.9, 0.88, 0.84), 0.25), C("brass2", (0.82, 0.62, 0.3), 0.3)
    box(wood, 0, 0.35, 0, 4, 1, 1.05, bevel=0.02)
    for k in range(9): box(C("slat", (0.27, 0.16, 0.09), 0.55), 0.1 + k * 0.43, 0.33, 0.1, 0.32 + k * 0.43, 0.36, 0.95)
    box(top, -0.05, 0.28, 1.05, 4.05, 1, 1.12, bevel=0.015)
    box(brass, 0, 0.3, 0.05, 4, 0.34, 0.12)
    # Pastry case.
    box("glass", 0.2, 0.4, 1.12, 1.5, 0.95, 1.5)
    box(top, 0.2, 0.4, 1.5, 1.5, 0.95, 1.53)
    for i, c in enumerate([(0.85, 0.6, 0.3), (0.55, 0.3, 0.15), (0.95, 0.85, 0.6), (0.7, 0.35, 0.3)]):
        sphere(C(f"pastry{i}", c, 0.7), 0.4 + i * 0.3, 0.68, 1.2, 0.1, sub=1, sz=0.6)
    # Espresso machine and grinder.
    box(C("steel", (0.75, 0.76, 0.78), 0.2), 2.2, 0.55, 1.12, 3.1, 0.95, 1.6, bevel=0.03)
    box("iron", 2.3, 0.53, 1.25, 3.0, 0.56, 1.35)
    for gx in (2.45, 2.85): cyl("iron", gx, 0.5, 1.2, 1.3, 0.05, v=10)
    cyl(C("steel", (0.75, 0.76, 0.78), 0.2), 3.4, 0.75, 1.12, 1.5, 0.12, v=12)
    cyl("glass", 3.4, 0.75, 1.5, 1.7, 0.1, v=12, r2=0.13)
    for i in range(5): cyl("trim", 3.55 + (i % 2) * 0.12, 0.45 + i * 0.1, 1.12, 1.24, 0.045, v=10)
    # Menu board on the back wall line.
    box(C("chalk", (0.12, 0.14, 0.13), 0.9), 0.4, 0.97, 1.9, 3.6, 1.0, 2.8)
    box(wood, 0.35, 0.99, 1.85, 3.65, 1.02, 2.85)
    for r in range(4): box("trim", 0.6, 0.955, 2.05 + r * 0.18, 2.2 + (r % 2) * 0.6, 0.965, 2.09 + r * 0.18)
    K.export("cafe-counter")

def armchair(name, leather):
    l = C(f"leather_{name}", leather, 0.45)
    box(l, 0.1, 0.15, 0.15, 0.9, 0.85, 0.45, bevel=0.06, segs=2)
    box(l, 0.1, 0.62, 0.15, 0.9, 0.88, 0.95, bevel=0.06, segs=2)
    for sx in (0.04, 0.78): box(l, sx, 0.15, 0.15, sx + 0.18, 0.88, 0.68, bevel=0.06, segs=2)
    for lx in (0.16, 0.84):
        for ly in (0.2, 0.8): cyl(C("walnut", (0.34, 0.2, 0.11), 0.5), lx, ly, 0, 0.16, 0.035, v=8)
    K.export(name)

def sofa():
    m = C("mustard", (0.86, 0.6, 0.18), 0.6)
    box(m, 0.05, 0.15, 0.15, 1.95, 0.85, 0.42, bevel=0.06, segs=2)
    box(m, 0.05, 0.62, 0.15, 1.95, 0.9, 0.95, bevel=0.06, segs=2)
    for sx in (0.0, 1.82): box(m, sx, 0.15, 0.15, sx + 0.18, 0.9, 0.65, bevel=0.06, segs=2)
    for cx in (0.55, 1.45): box(C("cushion", (0.92, 0.82, 0.62), 0.8), cx - 0.18, 0.55, 0.42, cx + 0.18, 0.66, 0.78, bevel=0.05, segs=2)
    for lx in (0.12, 1.88):
        for ly in (0.22, 0.8): cyl(C("walnut", (0.34, 0.2, 0.11), 0.5), lx, ly, 0, 0.15, 0.035, v=8)
    K.export("cafe-sofa")

def cafe_table():
    w = C("oak", (0.62, 0.42, 0.24), 0.5)
    cyl(w, 0.5, 0.5, 0.72, 0.78, 0.4, v=24)
    cyl("iron", 0.5, 0.5, 0.05, 0.72, 0.04, v=10)
    cyl("iron", 0.5, 0.5, 0, 0.05, 0.22, v=16)
    cyl("trim", 0.42, 0.45, 0.78, 0.88, 0.05, v=10)
    cyl(C("coffee", (0.25, 0.14, 0.08), 0.3), 0.42, 0.45, 0.86, 0.885, 0.04, v=10)
    box(C("laptop", (0.6, 0.62, 0.66), 0.3), 0.5, 0.48, 0.78, 0.8, 0.7, 0.8)
    K.export("cafe-table")

def cafe_chair():
    w = C("oak", (0.62, 0.42, 0.24), 0.5)
    box(w, 0.2, 0.25, 0.45, 0.8, 0.8, 0.5, bevel=0.02)
    box(w, 0.22, 0.74, 0.5, 0.78, 0.8, 1.0, bevel=0.02)
    for lx in (0.24, 0.76):
        for ly in (0.28, 0.77): cyl(w, lx, ly, 0, 0.45, 0.025, v=6)
    K.export("cafe-chair")

def pendant():
    cyl("iron", 0.5, 0.5, 0.4, 1.4, 0.008, v=4)
    cyl(C("brass2", (0.82, 0.62, 0.3), 0.3), 0.5, 0.5, 0.18, 0.4, 0.2, v=16, r2=0.05, cap=False)
    sphere("lit", 0.5, 0.5, 0.2, 0.07, sub=2)
    K.export("pendant")

# ── Diners (Big Bun Burgers in red/yellow, Cluck & Co. in red/cream) ────────
def booth(name, seat, trim):
    s, t = C(f"seat_{name}", seat, 0.35), C(f"trim_{name}", trim, 0.4)
    for y0, back in ((0.0, 0.0), (1.4, 1.85)):
        box(s, 0.05, y0 + 0.05, 0.15, 1.95, y0 + 0.55, 0.45, bevel=0.05, segs=2)
        by = y0 + 0.05 if y0 == 0 else y0 + 0.45
        box(s, 0.05, by, 0.45, 1.95, by + 0.15, 1.05, bevel=0.05, segs=2)
        for k in range(4): box(t, 0.12 + k * 0.47, by - 0.01, 0.55, 0.42 + k * 0.47, by + 0.16, 0.6)
        box("steel" if "steel" in K.M else C("steel", (0.75, 0.76, 0.78), 0.2), 0.05, y0 + 0.05, 0, 1.95, y0 + 0.55, 0.15)
    box(C("formica", (0.95, 0.93, 0.88), 0.3), 0.25, 0.65, 0.72, 1.75, 1.35, 0.77, bevel=0.02)
    box(C("steel", (0.75, 0.76, 0.78), 0.2), 0.22, 0.62, 0.69, 1.78, 1.38, 0.72)
    cyl(C("steel", (0.75, 0.76, 0.78), 0.2), 1.0, 1.0, 0, 0.7, 0.05, v=10)
    # A tray of food on the table.
    box(t, 0.5, 0.8, 0.77, 0.95, 1.15, 0.79)
    cyl(C("bun", (0.85, 0.55, 0.22), 0.6), 0.7, 0.95, 0.79, 0.88, 0.09, v=12, r2=0.07)
    for i in range(4): box(C("fries", (0.98, 0.82, 0.3), 0.6), 0.85 + i * 0.03, 0.85, 0.79, 0.87 + i * 0.03, 0.87, 0.95)
    K.export(name)

def diner_counter(name, accent, screen):
    a = C(f"accent_{name}", accent, 0.35)
    box(a, 0, 0.35, 0, 4, 1, 1.05, bevel=0.02)
    box(C("steel", (0.75, 0.76, 0.78), 0.2), -0.05, 0.3, 1.05, 4.05, 1, 1.12)
    box(C("steelband", (0.6, 0.62, 0.65), 0.25), 0, 0.33, 0.1, 4, 0.36, 0.2)
    for tx in (0.6, 2.6):
        box("iron", tx, 0.5, 1.12, tx + 0.45, 0.75, 1.15)
        box(C("till", (0.2, 0.22, 0.25), 0.3), tx + 0.05, 0.55, 1.15, tx + 0.4, 0.62, 1.45)
        box(C("tillscreen", (0.35, 0.8, 0.95), 0.2), tx + 0.08, 0.545, 1.25, tx + 0.37, 0.55, 1.42)
    # Menu screens above the counter.
    for k in range(3):
        box("iron", 0.25 + k * 1.25, 0.95, 1.95, 1.35 + k * 1.25, 1.0, 2.6)
        box(C(f"screen_{name}_{k}", screen[k % len(screen)], 0.3), 0.3 + k * 1.25, 0.94, 2.0, 1.3 + k * 1.25, 0.955, 2.55)
        cyl(C("bun", (0.85, 0.55, 0.22), 0.6), 0.8 + k * 1.25, 0.93, 2.2, 2.32, 0.14, v=12)
    # Drinks fountain.
    box(C("steel", (0.75, 0.76, 0.78), 0.2), 3.3, 0.55, 1.12, 3.9, 0.95, 1.65)
    for i in range(3): cyl("iron", 3.4 + i * 0.2, 0.52, 1.35, 1.45, 0.03, v=6)
    K.export(name)

def stool(name, seat):
    cyl(C(f"seat_{name}", seat, 0.35), 0.5, 0.5, 0.7, 0.82, 0.24, v=16)
    cyl(C("steel", (0.75, 0.76, 0.78), 0.2), 0.5, 0.5, 0.05, 0.7, 0.04, v=10)
    ring(C("steel", (0.75, 0.76, 0.78), 0.2), 0.2, 0.17, 0.3, 0.33, v=16, x=0.5, y=0.5)
    cyl(C("steel", (0.75, 0.76, 0.78), 0.2), 0.5, 0.5, 0, 0.05, 0.22, v=16)
    K.export(name)

# ── Shop ────────────────────────────────────────────────────────────────────
def shelf():
    white = C("shelfwhite", (0.93, 0.94, 0.95), 0.4)
    box(white, 0, 0.2, 0, 2, 0.9, 0.15)
    box(white, 0, 0.75, 0, 2, 0.9, 1.9)
    for z in (0.45, 0.9, 1.35):
        box(white, 0, 0.2, z, 2, 0.88, z + 0.04)
        rnd = random.Random(int(z * 100))
        x = 0.06
        while x < 1.9:
            w = 0.12 + rnd.random() * 0.12
            col = [(0.9, 0.35, 0.3), (0.95, 0.75, 0.25), (0.35, 0.65, 0.4), (0.3, 0.5, 0.85), (0.85, 0.5, 0.75), (0.95, 0.95, 0.9)][rnd.randrange(6)]
            box(C(f"prod{int(col[0]*100)}{int(col[2]*100)}", col, 0.5), x, 0.3, z + 0.04, x + w, 0.7, z + 0.18 + rnd.random() * 0.16)
            x += w + 0.03
    box(C("pricestrip", (1.0, 0.85, 0.2), 0.5), 0, 0.19, 0.42, 2, 0.21, 0.47)
    K.export("shop-shelf")

def fridge():
    box(C("fridgebody", (0.2, 0.22, 0.25), 0.4), 0, 0.2, 0, 2, 1, 2.1)
    box("lit", 0.08, 0.18, 0.15, 1.92, 0.22, 1.95)
    for z in (0.6, 1.05, 1.5):
        for i in range(8):
            cyl(C(["can_r", "can_b", "can_g", "can_o"][i % 4], [(0.85, 0.2, 0.2), (0.2, 0.4, 0.85), (0.3, 0.7, 0.3), (0.95, 0.6, 0.15)][i % 4], 0.3), 0.2 + i * 0.22, 0.4, z, z + 0.3, 0.07, v=10)
    box(C("steel", (0.75, 0.76, 0.78), 0.2), 0.98, 0.14, 0.15, 1.02, 0.2, 1.95)
    K.export("shop-fridge")

def checkout():
    box(C("checkoutbody", (0.95, 0.95, 0.96), 0.4), 0, 0.2, 0, 2, 0.85, 0.95, bevel=0.02)
    box("iron", 0.05, 0.2, 0.95, 1.5, 0.85, 0.98)
    for k in range(6): box(C("belt", (0.15, 0.15, 0.17), 0.6), 0.1 + k * 0.23, 0.25, 0.98, 0.3 + k * 0.23, 0.8, 0.99)
    box(C("till", (0.2, 0.22, 0.25), 0.3), 1.55, 0.3, 0.95, 1.95, 0.7, 1.3)
    box(C("tillscreen", (0.35, 0.8, 0.95), 0.2), 1.6, 0.29, 1.12, 1.9, 0.3, 1.28)
    cyl("iron", 1.85, 0.75, 0.95, 1.6, 0.025, v=6)
    box(C("lightsign", (0.95, 0.25, 0.25), 0.4), 1.7, 0.7, 1.6, 2.0, 0.8, 1.75)
    K.export("shop-checkout")

# ── Town hall ───────────────────────────────────────────────────────────────
def hall_desk():
    w = C("mahogany", (0.3, 0.12, 0.08), 0.45)
    box(w, 0, 0.35, 0, 4, 1, 1.1, bevel=0.02)
    for k in range(4): box(C("panel", (0.38, 0.17, 0.11), 0.45), 0.15 + k * 0.97, 0.33, 0.15, 0.95 + k * 0.97, 0.36, 0.95)
    box(C("marble", (0.9, 0.88, 0.84), 0.25), -0.05, 0.3, 1.1, 4.05, 1, 1.18, bevel=0.015)
    for k in range(4): box(C("brass2", (0.82, 0.62, 0.3), 0.3), 0.4 + k * 0.97, 0.32, 0.5, 0.6 + k * 0.97, 0.335, 0.62)
    box(C("lamp_green", (0.15, 0.4, 0.25), 0.3), 0.5, 0.6, 1.18, 0.9, 0.8, 1.45)
    box("lit", 0.55, 0.62, 1.18, 0.85, 0.78, 1.22)
    box("trim", 2.5, 0.55, 1.18, 3.2, 0.9, 1.2)
    K.export("hall-desk")

def hall_bench():
    w = C("mahogany", (0.3, 0.12, 0.08), 0.45)
    box(w, 0.05, 0.25, 0.4, 1.95, 0.75, 0.48, bevel=0.02)
    box(w, 0.05, 0.68, 0.48, 1.95, 0.75, 1.0, bevel=0.02)
    for lx in (0.1, 1.82): box(w, lx, 0.25, 0, lx + 0.08, 0.75, 0.7)
    box(C("velvet", (0.45, 0.08, 0.12), 0.8), 0.1, 0.28, 0.48, 1.9, 0.7, 0.53, bevel=0.02)
    K.export("hall-bench")

# ── Stairs (2 wide x 4 deep, rising toward +Y to an upper floor at 3.0) ──────
def stairs():
    wood = C("treads", (0.55, 0.38, 0.24), 0.5)
    steps = 12
    for i in range(steps):
        y0 = i * (4 / steps)
        box(wood, 0, y0, 0, 2, y0 + 4 / steps + 0.02, (i + 1) * 3 / steps)
        box(C("nosing", (0.4, 0.27, 0.17), 0.5), 0, y0 - 0.02, (i + 1) * 3 / steps - 0.04, 2, y0 + 0.03, (i + 1) * 3 / steps)
    for side in (0.0, 1.94):
        for i in range(0, steps, 2):
            y = i * (4 / steps) + 0.15
            box("iron", side, y, (i + 1) * 3 / steps, side + 0.04, y + 0.04, (i + 1) * 3 / steps + 0.9)
        # Handrail: a stepped run of short rail pieces following the pitch.
        for i in range(steps):
            y0 = i * (4 / steps)
            box(C("rail", (0.3, 0.2, 0.12), 0.4), side - 0.02, y0, (i + 1) * 3 / steps + 0.88, side + 0.06, y0 + 4 / steps + 0.01, (i + 1) * 3 / steps + 0.96)
    # Closed sides under the treads.
    for side in (0.0, 1.95):
        for i in range(steps):
            y0 = i * (4 / steps)
            box(C("stringer", (0.28, 0.2, 0.15), 0.5), side, y0, 0, side + 0.05, y0 + 4 / steps + 0.01, (i + 1) * 3 / steps)
    K.export("stairs")

# ── Airport terminal ────────────────────────────────────────────────────────
def checkin_desk():
    white = C("deskwhite", (0.93, 0.93, 0.92), 0.35)
    wood = C("lightwood", (0.72, 0.55, 0.36), 0.5)
    box(wood, 0, 0.45, 0, 3, 1, 1.05, bevel=0.03)
    box(white, -0.05, 0.4, 1.05, 3.05, 1, 1.12, bevel=0.02)
    for sx in (0.4, 1.9):
        box("iron", sx, 0.65, 1.12, sx + 0.7, 0.7, 1.55)
        box(C("checkscreen", (0.15, 0.35, 0.75), 0.2), sx + 0.04, 0.64, 1.16, sx + 0.66, 0.645, 1.51)
    # Baggage scale / belt at the front.
    box(C("belt", (0.15, 0.15, 0.17), 0.6), 1.15, 0.0, 0.0, 1.85, 0.45, 0.35)
    box(C("steel", (0.75, 0.76, 0.78), 0.2), 1.12, -0.02, 0.33, 1.88, 0.47, 0.37)
    # Number sign on a post.
    cyl("iron", 2.85, 0.9, 1.12, 2.4, 0.03, v=6)
    box(C("signyellow", (1.0, 0.82, 0.1), 0.4), 2.55, 0.86, 2.2, 3.15, 0.94, 2.6)
    K.export("checkin-desk")

def kiosk():
    body = C("kioskbody", (0.92, 0.92, 0.9), 0.35)
    box(body, 0.2, 0.3, 0, 0.8, 0.75, 1.0, bevel=0.03)
    o = box(body, 0.15, 0.25, 1.0, 0.85, 0.8, 1.55, bevel=0.03)
    box(C("kioskscreen", (0.12, 0.3, 0.7), 0.2), 0.2, 0.24, 1.08, 0.8, 0.25, 1.48)
    box(C("signyellow", (1.0, 0.82, 0.1), 0.4), 0.15, 0.24, 1.55, 0.85, 0.8, 1.65)
    box("iron", 0.35, 0.22, 0.85, 0.65, 0.3, 0.92)
    K.export("kiosk")

def departures():
    box("iron", 0, 0.4, 0, 0.08, 0.5, 2.4)
    box("iron", 2.92, 0.4, 0, 3.0, 0.5, 2.4)
    box(C("boardframe", (0.12, 0.13, 0.15), 0.4), 0, 0.35, 2.3, 3, 0.55, 3.5)
    box(C("boardscreen", (0.05, 0.1, 0.25), 0.3), 0.08, 0.33, 2.38, 2.92, 0.35, 3.42)
    box(C("signyellow", (1.0, 0.82, 0.1), 0.4), 0.08, 0.32, 3.2, 1.4, 0.34, 3.4)
    for r in range(5):
        for c, w in ((0.15, 0.5), (0.75, 1.0), (1.85, 0.5), (2.45, 0.35)):
            box(C("rowtext" if c != 2.45 else "rowgreen", (0.9, 0.9, 0.85) if c != 2.45 else (0.3, 0.85, 0.4), 0.3), c, 0.31, 2.48 + r * 0.14, c + w, 0.32, 2.56 + r * 0.14)
    K.export("departures")

def gate_seats():
    seat = C("seatblack", (0.12, 0.13, 0.15), 0.4)
    box(C("steel", (0.75, 0.76, 0.78), 0.2), 0, 0.3, 0.3, 3, 0.7, 0.36)
    for k in range(4):
        x = 0.1 + k * 0.72
        box(seat, x, 0.2, 0.36, x + 0.62, 0.75, 0.46, bevel=0.03)
        box(seat, x, 0.65, 0.42, x + 0.62, 0.78, 0.95, bevel=0.03)
    for lx in (0.2, 2.8): box(C("steel", (0.75, 0.76, 0.78), 0.2), lx, 0.35, 0, lx + 0.06, 0.65, 0.3)
    K.export("gate-seats")

def security_arch():
    grey = C("archgrey", (0.82, 0.83, 0.85), 0.35)
    for x in (0.0, 1.1): box(grey, x, 0.2, 0, x + 0.2, 0.8, 2.3, bevel=0.03)
    box(grey, 0, 0.2, 2.3, 1.3, 0.8, 2.55, bevel=0.03)
    box(C("archlight", (0.3, 0.9, 0.4), 0.3), 0.5, 0.18, 2.4, 0.8, 0.2, 2.48)
    box(C("belt", (0.15, 0.15, 0.17), 0.6), 1.5, 0.1, 0, 3.0, 0.9, 0.75)
    box(C("xray", (0.55, 0.58, 0.62), 0.4), 1.7, 0.08, 0.75, 2.8, 0.92, 1.55, bevel=0.04)
    box(C("xraymouth", (0.08, 0.08, 0.1), 0.6), 1.72, 0.06, 0.78, 2.78, 0.1, 1.2)
    K.export("security-arch")

def tall_plant():
    cyl(C("planter", (0.85, 0.83, 0.78), 0.5), 0.5, 0.5, 0, 0.7, 0.38, v=12, r2=0.42)
    cyl(C("soil", (0.25, 0.18, 0.12), 0.9), 0.5, 0.5, 0.66, 0.7, 0.38, v=12)
    rnd = random.Random(9)
    cyl("bark", 0.5, 0.5, 0.7, 2.2, 0.04, v=6)
    for k in range(16):
        a = rnd.random() * math.tau; h = 1.0 + rnd.random() * 1.6; r = 0.15 + rnd.random() * 0.35
        sphere("leaf" if k % 2 else "leaf2", 0.5 + math.cos(a) * r, 0.5 + math.sin(a) * r, h, 0.2 + rnd.random() * 0.1, sub=1, sz=0.45)
    K.export("tall-plant")

MODELS = {
    "cafe-counter": cafe_counter, "cafe-armchair": lambda: armchair("cafe-armchair", (0.45, 0.24, 0.12)),
    "cafe-sofa": sofa, "cafe-table": cafe_table, "cafe-chair": cafe_chair, "pendant": pendant,
    "booth-burger": lambda: booth("booth-burger", (0.78, 0.12, 0.12), (1.0, 0.78, 0.2)),
    "booth-chicken": lambda: booth("booth-chicken", (0.72, 0.1, 0.13), (0.98, 0.94, 0.86)),
    "counter-burger": lambda: diner_counter("counter-burger", (0.82, 0.16, 0.12), [(0.95, 0.75, 0.2), (0.95, 0.55, 0.2), (0.9, 0.3, 0.2)]),
    "counter-chicken": lambda: diner_counter("counter-chicken", (0.7, 0.1, 0.13), [(0.95, 0.92, 0.85), (0.85, 0.2, 0.2), (0.95, 0.92, 0.85)]),
    "stool-burger": lambda: stool("stool-burger", (0.85, 0.15, 0.12)), "stool-chicken": lambda: stool("stool-chicken", (0.75, 0.1, 0.13)),
    "shop-shelf": shelf, "shop-fridge": fridge, "shop-checkout": checkout,
    "hall-desk": hall_desk, "hall-bench": hall_bench, "stairs": stairs,
    "checkin-desk": checkin_desk, "kiosk": kiosk, "departures": departures, "gate-seats": gate_seats,
    "security-arch": security_arch, "tall-plant": tall_plant,
}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "export"
    if cmd == "export":
        for n in sys.argv[2:] or list(MODELS):
            reset(); MODELS[n]()
    elif cmd == "sheet":
        K.NO_EXPORT = True
        reset()
        names = list(MODELS)
        for i, n in enumerate(names):
            MODELS[n]()
            o = bpy.context.object
            o.location = ((i % 6) * 5.0 - 12, (i // 6) * 5.0, 0)
            K.OBJS.clear()
        K.render_setup((14, -26, 22), (1, 7, 0.5), lens=30, res=(1600, 1100))
        bpy.context.scene.render.filepath = sys.argv[2]; bpy.ops.render.render(write_still=True)
