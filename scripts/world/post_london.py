"""
Cel-shades, outlines and stitches the London render tiles, then cuts every tall
object out into its own depth-sorted sprite.

  python3 post_london.py raw_dir out_dir

Writes:
  london-base.webp     the whole city (ground + everything), ground squared to 32px tiles
  london-props-N.webp  atlas(es) of tall objects
  london.json          size, ground offset and the props list (atlas rect, position, sortY)
"""
import json, math, os, sys
import numpy as np
from PIL import Image

RAW, OUT = sys.argv[1], sys.argv[2]
PREFIX = sys.argv[3] if len(sys.argv) > 3 else "london"
os.makedirs(OUT, exist_ok=True)
meta = json.load(open(os.path.join(RAW, "meta.json")))
W, H = meta["width"], meta["height"]
INK = np.array([0x2a, 0x22, 0x33]) / 255
SHADOW = np.array([0.32, 0.27, 0.55])
LINE = 3  # px at 2x

ground_ids = {o["id"] for o in meta["objects"] if o["sortY"] is None}
GROUND_LUT = np.zeros(4097, bool)
for g in ground_ids:
    GROUND_LUT[g] = True


def shift(a, dy, dx, fill):
    out = np.full_like(a, fill)
    h, w = a.shape[:2]
    ys, yd = (slice(dy, h), slice(0, h - dy)) if dy >= 0 else (slice(0, h + dy), slice(-dy, h))
    xs, xd = (slice(dx, w), slice(0, w - dx)) if dx >= 0 else (slice(0, w + dx), slice(-dx, w))
    out[ys, xs] = a[yd, xd]
    return out


rgba = np.zeros((H, W, 4), np.uint8)
ids = np.zeros((H, W), np.uint16)
for t in meta["tiles"]:
    path = os.path.join(RAW, f"tile_{t['j']}_{t['i']}.npz")
    d = np.load(path)
    c = d["colour"].astype(np.float32)
    L = d["light"].astype(np.float32)
    raw = d["id"].astype(np.int32)
    alpha = c[..., 3] > 0.5
    oid = np.where(alpha, (raw[..., 0] // 17) + (raw[..., 1] // 17) * 16 + (raw[..., 2] // 17) * 256, 0)
    band = np.ones_like(L)[..., None] if meta.get("lit") else np.where(L > 0.62, 1.0, np.where(L > 0.38, 0.86, 0.72))[..., None]
    rgb = np.clip(c[..., :3] * band + (1 - band) * 0.5 * SHADOW, 0, 1)
    # Ink: object edges (dark) and changes of colour (softer, so roads and lawns read cleanly).
    key = (c[..., :3] * 255).round().astype(np.int32)
    key = (key[..., 0] << 16) | (key[..., 1] << 8) | key[..., 2]
    edge = np.zeros(alpha.shape, bool)
    soft = np.zeros(alpha.shape, bool)
    for dy in range(-LINE, LINE + 1):
        for dx in range(-LINE, LINE + 1):
            if dy * dy + dx * dx > LINE * LINE or (dy == 0 and dx == 0):
                continue
            nb = shift(oid, dy, dx, -1)
            diff = (nb != oid) & (nb != -1) & alpha
            both_ground = GROUND_LUT[np.clip(oid, 0, 4096)] & GROUND_LUT[np.clip(nb, 0, 4096)]
            edge |= diff & ~both_ground
            if not meta.get("lit"):
                soft |= diff & both_ground   # lit renders already show kerbs and edges with light
            if dy * dy + dx * dx <= 2:
                nk = shift(key, dy, dx, -1)
                soft |= (nk != key) & (nk != -1) & alpha & ~GROUND_LUT[np.clip(oid, 0, 4096)]
    rgb = np.where(soft[..., None], rgb * 0.62 + INK * 0.38, rgb)
    rgb = np.where(edge[..., None], INK, rgb)
    y0, x0 = t["y"], t["x"]
    rgba[y0:y0 + t["h"], x0:x0 + t["w"], :3] = (rgb * 255).round().astype(np.uint8)
    rgba[y0:y0 + t["h"], x0:x0 + t["w"], 3] = np.where(alpha, 255, 0)
    ids[y0:y0 + t["h"], x0:x0 + t["w"]] = oid
    print("tile", t["j"], t["i"], flush=True)

# Square the ground: render px per tile is ppu horizontally and ppu*sin(elev) vertically.
s = math.sin(math.radians(meta["elev"]))
FW = W // 2
FH = int(round(H / 2 / s))
base = Image.fromarray(rgba, "RGBA").resize((FW, FH), Image.LANCZOS)
idimg = Image.fromarray(ids.astype(np.int32), "I").resize((FW, FH), Image.NEAREST)
ids_f = np.array(idimg).astype(np.int32)
# Ground row 0 sits this many px below the top of the image.
offset = int(round(meta["top"] / s * 32))
base_np = np.array(base)
# Beyond the map's top edge: fill with lawn so nothing shows as a hole.
hole = base_np[..., 3] < 128
base_np[hole, :3] = (0x2a, 0x22, 0x33) if PREFIX.startswith("home") else (0x93, 0xc9, 0x7a)
base_np[..., 3] = 255
Image.fromarray(base_np, "RGBA").convert("RGB").save(os.path.join(OUT, f"{PREFIX}-base.webp"), quality=88, method=6)

# Cut out the tall objects into atlases.
props = []
by_id = {o["id"]: o for o in meta["objects"]}
src = np.array(base)
order = []
for oid_, o in by_id.items():
    if o["sortY"] is None:
        continue
    m = ids_f == oid_
    if not m.any():
        continue
    ys, xs = np.nonzero(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    # Grow the mask by a pixel so anti-aliased ink edges come along.
    mm = m[y0:y1, x0:x1]
    grow = mm.copy()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        grow |= shift(mm, dy, dx, False)
    patch = src[y0:y1, x0:x1].copy()
    patch[..., 3] = np.where(grow, 255, 0)
    order.append((o, int(x0), int(y0), patch))

# Shelf-pack into 2048-wide atlases.
ATLAS = 2048
order.sort(key=lambda r: -r[3].shape[0])
atlases, cur, shelf_y, shelf_h, cx = [], np.zeros((ATLAS, ATLAS, 4), np.uint8), 0, 0, 0
for o, x, y, patch in order:
    h, w = patch.shape[:2]
    if cx + w > ATLAS:
        shelf_y += shelf_h + 2
        cx, shelf_h = 0, 0
    if shelf_y + h > ATLAS:
        atlases.append(cur)
        cur, shelf_y, shelf_h, cx = np.zeros((ATLAS, ATLAS, 4), np.uint8), 0, 0, 0
    cur[shelf_y:shelf_y + h, cx:cx + w] = patch
    props.append({"id": o["name"], "a": len(atlases), "sx": cx, "sy": shelf_y, "w": int(w), "h": int(h), "x": x, "y": y - offset, "z": o["sortY"]})
    cx += w + 2
    shelf_h = max(shelf_h, h)
atlases.append(cur[: shelf_y + shelf_h + 2])
for i, a in enumerate(atlases):
    Image.fromarray(a, "RGBA").save(os.path.join(OUT, f"{PREFIX}-props-{i}.webp"), lossless=False, quality=90, method=6)

json.dump({"width": FW, "height": FH, "offset": offset, "atlases": len(atlases), "props": props},
          open(os.path.join(OUT, f"{PREFIX}.json"), "w"), separators=(",", ":"))
print("done", FW, FH, "offset", offset, "props", len(props), "atlases", len(atlases))
