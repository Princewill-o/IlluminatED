"""Render emergency rigs for visual review and thumbnail use."""
import bpy
from pathlib import Path
from mathutils import Vector
repo=Path(__file__).resolve().parents[2];root=repo/'public/world3d/emergency';out=root/'previews';out.mkdir(exist_ok=True)
for kind in ['ambulance','police']:
 for opened in [False,True] if kind=='ambulance' else [False]:
  bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(root/(kind+'.glb')))
  if opened:
   bpy.data.objects['RearDoorLeft'].rotation_mode='XYZ';bpy.data.objects['RearDoorRight'].rotation_mode='XYZ';bpy.data.objects['RearDoorLeft'].rotation_euler.z=1.65;bpy.data.objects['RearDoorRight'].rotation_euler.z=-1.65
  coords=[o.matrix_world@Vector(v) for o in bpy.context.scene.objects if o.type=='MESH' for v in o.bound_box];lo=Vector([min(v[i] for v in coords) for i in range(3)]);hi=Vector([max(v[i] for v in coords) for i in range(3)]);c=(lo+hi)/2;extent=max(hi-lo)
  bpy.ops.object.camera_add(location=c+Vector((1.1,1.3 if opened else -1.3,.8))*extent);cam=bpy.context.object;cam.rotation_euler=(c-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent*1.3;bpy.context.scene.camera=cam
  for offset,power in [((1,-1,2),1700),((-1,1,2),1200)]:
   bpy.ops.object.light_add(type='AREA',location=c+Vector(offset)*extent);o=bpy.context.object;o.data.energy=power;o.data.size=extent*1.8;o.rotation_euler=(c-o.location).to_track_quat('-Z','Y').to_euler()
  sc=bpy.context.scene;sc.world=bpy.data.worlds.new('World');sc.world.color=(.6,.6,.6);sc.render.engine='CYCLES';sc.cycles.samples=20;sc.render.resolution_x=640;sc.render.resolution_y=400;sc.render.resolution_percentage=100;sc.render.film_transparent=True;sc.render.filepath=str(out/(kind+('-open' if opened else '')+'.png'));bpy.ops.render.render(write_still=True)
