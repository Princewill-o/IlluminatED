"""Render dealership images from the same supplied GLBs used by live traffic.
Run: Blender --background --python scripts/world/render_realistic_cars.py
PNG intermediates are converted to WebP by the calling image tool / Pillow.
"""
import bpy
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[2]/'public/world3d/cars-realistic'
out=root/'previews';out.mkdir(parents=True,exist_ok=True)
for p in root.glob('*.glb'):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(p))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    coords=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
    lo=Vector([min(v[i] for v in coords) for i in range(3)])
    hi=Vector([max(v[i] for v in coords) for i in range(3)])
    centre=(lo+hi)/2;extent=max(hi-lo)
    bpy.ops.object.camera_add(location=centre+Vector((1.1,-1.4,.85))*extent)
    cam=bpy.context.object;cam.rotation_euler=(centre-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO';cam.data.ortho_scale=extent*1.35;bpy.context.scene.camera=cam
    for offset,power in [((1,-1,2),1400),((-1,.4,1),900)]:
        bpy.ops.object.light_add(type='AREA',location=centre+Vector(offset)*extent)
        lamp=bpy.context.object;lamp.data.energy=power;lamp.data.size=extent*2
        lamp.rotation_euler=(centre-lamp.location).to_track_quat('-Z','Y').to_euler()
    sc=bpy.context.scene;sc.world=bpy.data.worlds.new('Studio');sc.world.color=(.6,.6,.6)
    sc.render.engine='CYCLES';sc.cycles.samples=20
    sc.render.resolution_x=420;sc.render.resolution_y=260;sc.render.resolution_percentage=100
    sc.render.film_transparent=True;sc.render.image_settings.file_format='PNG'
    sc.render.filepath=str(out/(p.stem+'.png'));bpy.ops.render.render(write_still=True)
