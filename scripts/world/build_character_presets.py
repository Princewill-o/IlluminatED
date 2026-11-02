"""Build 100 original clothed, bone-bound Blocky character presets and a Blender library.
Uses the supplied CC0 character skeleton/head and the original modular wardrobe recipe.
Run: Blender --background --python scripts/world/build_character_presets.py
"""
from pathlib import Path
import sys, json, math, os
ROOT=Path(__file__).resolve().parents[2]
recipe=ROOT/'scripts/world/build_blocky_wardrobe.py'
# Reuse the same tested body proportions and original tailoring geometry.
sys.argv=[str(recipe)]
exec(compile(recipe.read_text().split('# A fast material-colour product render')[0],str(recipe),'exec'),globals())
import bmesh
OUT=ROOT/'public/world3d/blocky-characters/presets';OUT.mkdir(parents=True,exist_ok=True)
for mat in bpy.data.materials:
 if mat.use_nodes:
  image_node=next((link.from_node for link in mat.node_tree.links if link.to_socket.name=='Base Color' and link.from_node.type=='TEX_IMAGE'),None)
  if image_node:mat.node_tree.nodes.active=image_node;image_node.select=True
for obj in source_meshes:
 obj.hide_render=False;obj.hide_set(False)
 keep={g.index for g in obj.vertex_groups if any(n in g.name.lower() for n in ['head','neck','hand'])}
 scores={v.index:sum(g.weight for g in v.groups if g.group in keep) for v in obj.data.vertices}
 bm=bmesh.new();bm.from_mesh(obj.data);bm.faces.ensure_lookup_table()
 discard=[f for f in bm.faces if sum(scores.get(v.index,0) for v in f.verts)/len(f.verts)<.5]
 bmesh.ops.delete(bm,geom=discard,context='FACES');bm.to_mesh(obj.data);bm.free()

skin_colours=['#fbe0cf','#f1c09a','#e3ac7c','#d09460','#b07548','#8a5636','#64402b','#42291c']
base_images=[]
for obj in source_meshes:
 for material in obj.data.materials:
  if material and material.use_nodes:
   for link in material.node_tree.links:
    if link.to_socket.name=='Base Color' and link.from_node.type=='TEX_IMAGE':
     node=link.from_node;image=node.image;base_images.append((node,image,list(image.pixels)))
hair_colours=['#24212b','#65452f','#b27a43','#342c45','#bf8b64','#47403d','#764539','#e4d3a2','#274b54','#7e617b']
families=['casual','hoodie','business','workwear','sport','police','pharmacy','paramedic','student','explorer']
names=['City Creative','Campus Coder','Studio Founder','Workshop Maker','Track Captain','Community Officer','Pharmacy Scientist','Emergency Responder','Design Student','Trail Explorer']
hair_names=['Quiff','Curls','Ponytail','Braids','Bob','Cap','Beanie','Headphones','Coils','Bun']
catalog=[];library=[]
resume=int(os.environ.get("ILLUMED_PRESET_START","0"))
scene=bpy.context.scene;scene.world=bpy.data.worlds.new('Character Presets World');scene.world.color=(.055,.085,.105)
scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='TEXTURE';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.render.film_transparent=True
scene.render.resolution_x=256;scene.render.resolution_y=320;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
bpy.ops.object.camera_add(location=(2.9,-5,2.8));camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=2.35;camera.rotation_euler=(Vector((0,0,.88))-camera.location).to_track_quat('-Z','Y').to_euler()
hair_mat=bpy.data.materials.new('Preset hair');hair_mat.diffuse_color=(.1,.08,.06,1);hair_mat.use_nodes=True;materials['hair']=hair_mat

def hair_part(name,lo,hi,material='hair'):
 obj=part('preset-'+name,'Head',lo,hi,material);obj['presetHair']=True;return obj
def hairstyle(style):
 # A new sculpted silhouette sits around the supplied character's original face.
 hair_part('hair-base',(-.40,.46,-.34),(.40,.61,.28))
 if style==0:
  for i in range(4):hair_part('quiff-'+str(i),(-.36+i*.17,.56,-.08),(-.18+i*.17,.72-i*.025,.29))
 elif style in [1,8]:
  for i in range(9):
   x=(i%3-1)*.27;y=.59+(i//3)*.04;z=(i//3-1)*.22
   hair_part('curl-'+str(i),(x-.14,y-.05,z-.13),(x+.14,y+.16,z+.13))
  for side in[-1,1]:hair_part('side-curl-'+str(side),(side*.39-.09,.24,-.25),(side*.39+.09,.57,.15))
 elif style==2:
  hair_part('pony-tie',(-.13,.35,-.45),(.13,.58,-.3),'accent');hair_part('ponytail',(-.17,.10,-.64),(.17,.52,-.41))
 elif style==3:
  for side in[-1,1]:
   for i in range(4):hair_part('braid-%s-%s'%(side,i),(side*.39-.06,.34-i*.1,-.16),(side*.39+.06,.47-i*.1,.02))
 elif style==4:
  for side in[-1,1]:hair_part('bob-side-'+str(side),(side*.39-.07,.12,-.29),(side*.39+.07,.56,.21))
  hair_part('bob-back',(-.39,.13,-.4),(.39,.58,-.26))
 elif style==5:
  hair_part('cap-crown',(-.43,.54,-.36),(.43,.7,.31),'cloth');hair_part('cap-visor',(-.42,.53,.25),(.42,.58,.52),'accent')
 elif style==6:
  hair_part('beanie',(-.43,.53,-.36),(.43,.78,.32),'cloth');hair_part('beanie-rim',(-.46,.46,-.38),(.46,.55,.34),'accent')
 elif style==7:
  for side in[-1,1]:hair_part('earphone-'+str(side),(side*.46-.08,.14,-.12),(side*.46+.08,.42,.14),'accent')
  hair_part('headphone-band',(-.51,.59,-.06),(.51,.67,.07),'trim')
 else:
  hair_part('bun',(-.19,.65,-.36),(.19,.89,-.08));hair_part('bun-tie',(-.21,.63,-.36),(.21,.67,-.07),'accent')

def bind(obj):
 world=obj.matrix_world.copy();obj.parent=arm;obj.parent_type='BONE';obj.parent_bone='mixamorig:'+obj['wearBone'];obj.matrix_world=world

for index in range(int(os.environ.get('ILLUMED_PRESET_LIMIT','100'))):
 for obj in pieces:bpy.data.objects.remove(obj,do_unlink=True)
 pieces=[]
 family=families[index//10];palette=index%10
 outfit=next(o for o in manifest['outfits'] if o['family']==family and o['palette']==manifest['outfits'][palette]['palette'])
 style=(palette+index//10)%10
 file='blender-%03d'%(index+1)
 name=names[index//10]+' · '+outfit['name'].split(' · ')[-1]
 tone=skin_colours[(palette+index//10)%len(skin_colours)]
 catalog.append({'id':'head-preset-%03d'%(index+1),'name':name,'file':'presets/'+file,'style':'blocky','description':hair_names[style]+' silhouette, '+outfit['family']+' tailoring and original sewn details.','outfit':outfit['id'],'collection':names[index//10],'hair':hair_names[style],'skinTone':tone})
 if index<resume:
  if not (OUT/(file+'.glb')).is_file() or not (OUT/(file+'.png')).is_file():raise RuntimeError('Missing completed preset '+file)
  continue
 tone=skin_colours[(palette+index//10)%len(skin_colours)]
 skin_rgb=[int(tone[i:i+2],16)/255 for i in(1,3,5)]
 for node,original,pixels in base_images:
  image=original.copy();image.name='preset-skin-%03d'%(index+1);values=pixels.copy()
  for pi in range(0,len(values),4):
   r,g,b=values[pi:pi+3]
   if r>.45 and g>.25 and r>g*1.08 and g>b*1.1:
    values[pi:pi+3]=skin_rgb
  image.pixels.foreach_set(values);image.update();image.pack();node.image=image

 outfit=next(o for o in manifest['outfits'] if o['family']==family and o['palette']==manifest['outfits'][palette]['palette'])
 for name,key in [('cloth','primary'),('accent','accent'),('pants','pants')]:
  colour=outfit[key];rgba=(*[int(colour[i:i+2],16)/255 for i in(1,3,5)],1);materials[name].diffuse_color=rgba;materials[name].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=rgba
 build(family)
 for obj in pieces:obj['presetGarment']=True
 style=(palette+index//10)%10
 hair=hair_colours[(palette+index//20)%10];rgba=(*[int(hair[i:i+2],16)/255 for i in(1,3,5)],1);hair_mat.diffuse_color=rgba;hair_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=rgba
 hairstyle(style)
 # Individual shoulder patches and two-tone belt tabs distinguish all 100 compositions.
 patch=front('preset-number-'+str(index+1),(.21,.08,.33),(.28,.17,.35),'accent');patch['presetGarment']=True
 for obj in pieces:bind(obj)
 bpy.context.view_layer.update();bpy.ops.object.select_all(action='DESELECT')
 for obj in [arm,*source_meshes,*pieces]:obj.select_set(True)
 file='blender-%03d'%(index+1)
 bpy.ops.export_scene.gltf(filepath=str(OUT/(file+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_extras=True)
 scene.render.filepath=str(OUT/(file+'.png'));bpy.ops.render.render(write_still=True)
 print('PRESET',index+1,flush=True)

(OUT/'manifest.json').write_text(json.dumps({'version':1,'count':len(catalog),'presets':catalog},indent=2))
# Assemble after exports so the render/export scene stays small throughout generation.
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
for index,preset in enumerate(catalog):
 before=set(bpy.data.objects)
 bpy.ops.import_scene.gltf(filepath=str(OUT/(Path(preset['file']).name+'.glb')))
 imported=set(bpy.data.objects)-before
 collection=bpy.data.collections.new('%03d · %s'%(index+1,preset['name']));scene.collection.children.link(collection)
 for obj in imported:
  for existing in list(obj.users_collection):existing.objects.unlink(obj)
  collection.objects.link(obj)
  if obj.parent not in imported:
   obj.location.x+=(index%10)*2.4;obj.location.y+=(index//10)*2.4
 library.append(collection)
 print('LIBRARY',index+1,flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/character-presets-100.blend'))
print('COMPLETE',len(catalog),'Blender character presets',flush=True)
