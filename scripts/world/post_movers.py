"""Cel-shade + outline the animated London pieces into frame strips (.webp)."""
import json, math, os, sys
import numpy as np
from PIL import Image

RAW, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
INK = np.array([0x2a, 0x22, 0x33]) / 255
SHADOW = np.array([0.32, 0.27, 0.55])
SIN = math.sin(math.radians(42))


def shift(a, dy, dx, fill):
    out = np.full_like(a, fill)
    h, w = a.shape[:2]
    ys, yd = (slice(dy, h), slice(0, h - dy)) if dy >= 0 else (slice(0, h + dy), slice(-dy, h))
    xs, xd = (slice(dx, w), slice(0, w - dx)) if dx >= 0 else (slice(0, w + dx), slice(-dx, w))
    out[ys, xs] = a[yd, xd]
    return out


def frame(colour, light, ids, line=3, tex=False):
    c = colour[..., :3].astype(np.float32)
    alpha = colour[..., 3] > 0.5
    L = light.astype(np.float32)
    band = np.where(L > 0.62, 1.0, np.where(L > 0.38, 0.86, 0.72))[..., None]
    rgb = np.clip(c * band + (1 - band) * 0.5 * SHADOW, 0, 1)
    k = (ids.astype(np.float32) * 255).round().astype(np.int32)
    k = np.where(alpha, (k[..., 0] << 16) | (k[..., 1] << 8) | k[..., 2], -1)
    ck = (c * 255).round().astype(np.int32)
    ck = np.where(alpha, (ck[..., 0] << 16) | (ck[..., 1] << 8) | ck[..., 2], -1)
    edge = np.zeros(alpha.shape, bool)
    for dy in range(-line, line + 1):
        for dx in range(-line, line + 1):
            if dy * dy + dx * dx > line * line or (dy == 0 and dx == 0):
                continue
            edge |= alpha & (shift(k, dy, dx, -1) != k)
            if not tex and dy * dy + dx * dx <= 2:
                edge |= alpha & (shift(ck, dy, dx, -1) != ck)
    rgb = np.where(edge[..., None], INK, rgb)
    out = np.concatenate([rgb, alpha[..., None].astype(np.float32)], -1)
    img = Image.fromarray((out * 255).round().astype(np.uint8), "RGBA")
    w, h = img.size
    return img.resize((w // 2, int(round(h / 2 / SIN))), Image.LANCZOS)


meta = json.load(open(os.path.join(RAW, "meta.json")))
for name, m in meta.items():
    d = np.load(os.path.join(RAW, f"{name}.npz"))
    frames = [frame(d["colour"][i], d["light"][i], d["id"][i], tex=m.get("tex", False)) for i in range(m["frames"])]
    w, h = frames[0].size
    strip = Image.new("RGBA", (w * len(frames), h))
    for i, f in enumerate(frames):
        strip.paste(f, (i * w, 0))
    strip.save(os.path.join(OUT, f"{name}.webp"), quality=92, method=6)
    m["w"], m["h"] = w, h
    print(name, w, h, len(frames))
json.dump(meta, open(os.path.join(OUT, "movers.json"), "w"), separators=(",", ":"))
