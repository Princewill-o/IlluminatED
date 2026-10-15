"""Turn raw Blender passes into cel-shaded, ink-outlined sprite sheets (.webp)."""
import json, os, sys
import numpy as np
from PIL import Image

RAW, OUT = sys.argv[1], sys.argv[2]
ONLY = sys.argv[3].split(",") if len(sys.argv) > 3 else None
os.makedirs(OUT, exist_ok=True)
COLS = 7
INK = np.array([0x1b, 0x16, 0x22]) / 255
SHADOW = np.array([0.36, 0.27, 0.62])   # purple-tinted shade, like Messenger's cool shadows


def shift(a, dy, dx, fill):
    out = np.full_like(a, fill)
    h, w = a.shape[:2]
    ys, yd = (slice(dy, h), slice(0, h - dy)) if dy >= 0 else (slice(0, h + dy), slice(-dy, h))
    xs, xd = (slice(dx, w), slice(0, w - dx)) if dx >= 0 else (slice(0, w + dx), slice(-dx, w))
    out[ys, xs] = a[yd, xd]
    return out


def frame(colour, light, ids, line=3):
    c = colour[..., :3].astype(np.float32)
    alpha = colour[..., 3] > 0.5
    key = alpha & (c[..., 0] > 0.97) & (c[..., 1] < 0.03) & (c[..., 2] > 0.97)
    own = alpha & ~key
    L = light.astype(np.float32)
    band = np.where(L > 0.6, 1.0, np.where(L > 0.36, 0.84, 0.7))[..., None]
    rgb = c * band + (1 - band) * 0.55 * SHADOW
    rgb = np.clip(rgb, 0, 1)
    # Ink lines: where the object id changes, or at the edge of the layer.
    idk = (ids.astype(np.float32) * 255).round().astype(np.int32)
    idk = (idk[..., 0] << 16) | (idk[..., 1] << 8) | idk[..., 2]
    idk = np.where(alpha, idk, -1)
    edge = np.zeros_like(own)
    for dy in range(-line, line + 1):
        for dx in range(-line, line + 1):
            if dy * dy + dx * dx > line * line or (dy == 0 and dx == 0):
                continue
            nb = shift(idk, dy, dx, -1)
            nb_key = shift(key, dy, dx, False)
            diff = nb != idk
            # Don't draw lines on our side where a holdout part sits in front (we're hidden there anyway).
            edge |= own & diff & ~(nb_key & False)
    rgb = np.where(edge[..., None], INK, rgb)
    out = np.zeros(c.shape[:2] + (4,), np.float32)
    out[..., :3] = rgb
    out[..., 3] = own.astype(np.float32)
    # 2x2 box downsample with premultiplied alpha.
    h, w = out.shape[:2]
    pm = out[..., :3] * out[..., 3:4]
    pm = pm.reshape(h // 2, 2, w // 2, 2, 3).mean(axis=(1, 3))
    a = out[..., 3].reshape(h // 2, 2, w // 2, 2).mean(axis=(1, 3))
    rgb = np.where(a[..., None] > 0, pm / np.maximum(a[..., None], 1e-6), 0)
    return np.concatenate([rgb, a[..., None]], axis=-1)


meta = json.load(open(os.path.join(RAW, "meta.json")))
size = meta["size"]
files = sorted(f[:-4] for f in os.listdir(RAW) if f.endswith(".npz"))
for name in files:
    if ONLY and name not in ONLY:
        continue
    d = np.load(os.path.join(RAW, f"{name}.npz"))
    n = d["colour"].shape[0]
    rows = (n + COLS - 1) // COLS
    sheet = np.zeros((rows * size, COLS * size, 4), np.float32)
    for i in range(n):
        f = frame(d["colour"][i], d["light"][i], d["id"][i])
        r, col = divmod(i, COLS)
        sheet[r * size:(r + 1) * size, col * size:(col + 1) * size] = f
    img = Image.fromarray((sheet * 255).round().astype(np.uint8), "RGBA")
    img.save(os.path.join(OUT, f"{name}.webp"), lossless=True, method=6)
    print(name, os.path.getsize(os.path.join(OUT, f"{name}.webp")) // 1024, "KB", flush=True)
