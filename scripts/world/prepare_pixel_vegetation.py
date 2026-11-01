"""Convert the supplied MIT Godot vegetation tutorial meshes to self-contained Three.js GLBs.
Run in Blender; Godot scene scripts are reference data only and are never executed.
"""
import bpy,json,struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/pixel-vegetation-source'
OUT=ROOT/'public/world3d/pixel-vegetation';OUT.mkdir(parents=True,exist_ok=True)

def mat(name,texture=None,mask=None,color=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.95
 if texture:
  image=bpy.data.images.load(str(SOURCE/'Assets/Textures'/texture),check_existing=True)
 elif mask:
  original=bpy.data.images.load(str(SOURCE/'Assets/Textures'/mask),check_existing=True);original.colorspace_settings.name='Non-Color'
  data=list(original.pixels[:]);image=bpy.data.images.new(name+'_RGBA',width=original.size[0],height=original.size[1],alpha=True)
  for i in range(0,len(data),4):
   a=data[i];data[i:i+4]=[*(color or (.3,.58,.18)),a]
  image.pixels[:]=data;image.pack()
 else:return m
 t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=image;t.interpolation='Closest';m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
 if mask or texture=='flower.png':m.node_tree.links.new(t.outputs['Alpha'],p.inputs['Alpha']);m.use_backface_culling=False
 image.pack();return m

# Retain embedded alpha masks and nearest sampling without Godot-specific material resources.
def finish_glb(path):
 b=path.read_bytes();size=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+size]);binary=b[20+size:]
 for m in d.get('materials',[]):
  if any(s in m.get('name','')for s in ['Leaves','Grass','Flowers']):m['alphaMode']='MASK';m['alphaCutoff']=.5;m['doubleSided']=True
 for sampler in d.get('samplers',[]):sampler['magFilter']=9728;sampler['minFilter']=9984
 payload=json.dumps(d,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4)
 path.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(payload)+len(binary))+struct.pack('<I4s',len(payload),b'JSON')+payload+binary)

manifest=[]
for source,name in [('tree.glb','tree-a'),('tree3.glb','tree-b'),('rock2.glb','rock'),('flower.glb','flowers'),('grass_plane.glb','grass')]:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath=str(SOURCE/'Assets/Meshes'/source))
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH':continue
  o.data.materials.clear()
  if 'leaves' in o.name.lower():m=mat('Pixel_Leaves',mask='leaf_alpha.png',color=(.3,.57,.16))
  elif name.startswith('tree'):m=mat('Pixel_Bark',texture='tree_bark.png')
  elif name=='rock':m=mat('Pixel_Rock',texture='rock_color.png')
  elif name=='flowers':m=mat('Pixel_Flowers',texture='flower.png')
  else:m=mat('Pixel_Grass',mask='grass_round.png',color=(.32,.54,.18))
  o.data.materials.append(m)
  if not o.data.uv_layers:
   bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
   bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
  if name.startswith('tree')and 'leaves' not in o.name.lower() and o.data.uv_layers.active:
   for uv in o.data.uv_layers.active.data:uv.uv.x*=4.5;uv.uv.y*=3
  bpy.context.view_layer.objects.active=o;o.select_set(True)
  bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);o.select_set(False)
 if name=='grass':
  o=next(o for o in bpy.context.scene.objects if o.type=='MESH')
  dims=o.dimensions
  if dims.z<.01:o.rotation_euler.x=1.57079632679
  bpy.context.view_layer.update()
 # Ground-centred pivots, so the current placement helper can use the original map's tile footprint.
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];bounds=[o.matrix_world@Vector(v)for o in meshes for v in o.bound_box]
 low=Vector([min(v[i]for v in bounds)for i in range(3)]);high=Vector([max(v[i]for v in bounds)for i in range(3)]);shift=Vector(((low.x+high.x)/2,(low.y+high.y)/2,low.z))
 # All source models use independent mesh objects; no armatures or scripts are needed.
 for o in meshes:o.location-=shift
 target=OUT/(name+'.glb');bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_animations=False,export_yup=True,export_extras=True)
 finish_glb(target);manifest.append({'file':name+'.glb','source':source,'bytes':target.stat().st_size})
(OUT/'manifest.json').write_text(json.dumps({'source':'3DPixelArt_Tutorial_Vegetation.7z','author':'Eduardo Schildt','license':'MIT','conversion':'Static geometry, embedded bark/rock/flower textures and cutout leaf/grass materials; no Godot postprocessing or wind runtime.','assets':manifest},indent=2))
(OUT/'LICENSE').write_bytes((SOURCE/'LICENSE').read_bytes())
print('VEGETATION CONVERSION COMPLETE')
