"""Convert selected MariaIsMe office OBJ files into textured runtime GLBs."""
import bpy
import json
from pathlib import Path

SOURCE = Path('/Users/princewillokube/Downloads/3D Voxel Office Pack - Obj File')
OUTPUT = Path(__file__).resolve().parents[2] / 'public/world3d/voxel-office'
ASSETS = {
    'computer-a': 'Misc/Electronics/Office_Misc_PC_01.obj',
    'computer-b': 'Misc/Electronics/Office_Misc_PC_02.obj',
    'coffee-machine': 'Misc/Coffee/Office_Misc_Coffee_Machine_01.obj',
    'plant-a': 'Misc/Office_Misc_Plant_01.obj',
    'plant-b': 'Misc/Office_Misc_Plant_02.obj',
    'chair-brown': 'Chairs/Office_Chair_Brown_01.obj',
    'chair-black': 'Chairs/Office_Chair_Black_01.obj',
    'chair-white': 'Chairs/Office_Chair_White_01.obj',
    'desk-brown': 'Tables/Office_Table_Brown_3x1_01.obj',
    'desk-white': 'Tables/Office_Table_White_3x1_01.obj',
    'meeting-table': 'Tables/Office_Table_White_2x2_01.obj',
    'coffee-table': 'Tables/Office_Table_Coffee_01_Black.obj',
}
OUTPUT.mkdir(parents=True, exist_ok=True)
for stale in OUTPUT.glob('*.glb'):
    stale.unlink()
manifest = {'source': '3D Voxel Office Pack - Obj File', 'author': 'MariaIsMe (Maria Is Me)', 'license': 'CC BY 4.0', 'assets': []}
for name, rel in ASSETS.items():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.wm.obj_import(filepath=str(SOURCE / rel), forward_axis='NEGATIVE_Z', up_axis='Y')
    objects = list(bpy.context.selected_objects)
    bpy.context.view_layer.objects.active = objects[0] if objects else None
    for image in bpy.data.images:
        if image.source == 'FILE':
            try: image.pack()
            except RuntimeError: pass
    target = OUTPUT / f'{name}.glb'
    bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True,
        export_image_format='AUTO', export_materials='EXPORT', export_texcoords=True,
        export_normals=True, export_cameras=False, export_lights=False, export_apply=True)
    manifest['assets'].append({'name': name, 'source': rel, 'file': target.name, 'bytes': target.stat().st_size})
(OUTPUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('Converted', len(manifest['assets']), 'office models to', OUTPUT)
