"""Replace only motor-car fallback sprites with the supplied realistic GLBs.
Keeps existing public/world/movers.json anchors and canvas sizes, so renderer code,
traffic footprints and map coordinate transforms do not change.
Run Blender --background --python scripts/world/render_realistic_car_sprites.py;
then convert each .png intermediate to its existing-size WebP with Pillow.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
repo=Path(__file__).resolve().parents[2]
metadata=json.loads((repo/'public/world/movers.json').read_text())
models={'sedan':'NormalCar1','van':'NormalCar2','delivery':'NormalCar2','suv':'SUV','ambulance':'SUV','police':'Cop','hatchback-sports':'SportsCar','cab':'Taxi'}
for kind,model in models.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(repo/'public/world3d/emergency'/('police.glb' if kind=='police' else 'ambulance.glb')) if kind in ['police','ambulance'] else str(repo/'public/world3d/cars-realistic'/(model+'.glb')))
    roots=[o for o in bpy.context.scene.objects if o.parent is None]
    root=bpy.data.objects.new('car-root',None);bpy.context.scene.collection.objects.link(root)
    for o in roots:o.parent=root
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    coords=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
    # Blender import maps GLB +Z nose to -Y. Heading zero is east (+X).
    width=max(v.x for v in coords)-min(v.x for v in coords)
    length=max(v.y for v in coords)-min(v.y for v in coords)
    scale=min(1.8/length,(1.8*1.65/3.8)/width);root.scale=(scale,)*3
    sc=bpy.context.scene;sc.render.engine='BLENDER_WORKBENCH';sc.render.film_transparent=True
    sc.display.shading.color_type='MATERIAL';sc.display.shading.light='STUDIO';sc.display.shading.show_shadows=True
    sc.render.image_settings.file_format='PNG';sc.render.resolution_percentage=100
    sc.view_settings.view_transform='Standard'
    elevation=math.radians(42);theta=math.pi/2-elevation
    up=Vector((0,math.cos(theta),math.sin(theta)));view=Vector((0,math.sin(theta),-math.cos(theta)))
    bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.rotation_euler=(theta,0,0);sc.camera=cam
    for direction,angle in [('E',0),('W',math.pi),('N',math.pi/2),('S',-math.pi/2)]:
        meta=metadata[kind+'-'+direction]
        sc.render.resolution_x=meta['w']*2;sc.render.resolution_y=192
        cam.data.ortho_scale=max(sc.render.resolution_x,192)/64
        cam.location=up*.5-view*200
        root.rotation_euler=(0,0,angle+math.pi/2)
        sc.render.filepath=str(repo/'public/world/movers'/(kind+'-'+direction+'.png'))
        bpy.ops.render.render(write_still=True)
