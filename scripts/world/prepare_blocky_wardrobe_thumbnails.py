"""Convert Blender product renders to runtime WebP thumbnails. Requires Pillow."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[2]/'public/world3d/blocky-outfits'
for path in root.glob('*.png'):
    with Image.open(path) as image:
        image.save(path.with_suffix('.webp'),'WEBP',quality=88)
    path.unlink()
