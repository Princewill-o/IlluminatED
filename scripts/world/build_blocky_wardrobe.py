"""Blender recipe: twelve modular clothing silhouettes, ten material palettes, 120 real GLBs.
Run with Blender --background --python scripts/world/build_blocky_wardrobe.py.
Pieces carry wearBone extras and source-rest transforms for runtime bone attachment.
"""
import bpy, json, math, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/world3d/blocky-outfits';OUT.mkdir(parents=True,exist_ok=True)
manifest=json.loads((OUT/'manifest.json').read_text())
source=ROOT/'public/world3d/blocky-characters/blocky_01_hero.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
arm.animation_data_clear()
for bone in arm.pose.bones:bone.matrix_basis.identity()
bpy.context.view_layer.update()
# Source geometry is hidden in outfit-only thumbnails; avatars retain the supplied head in game.
source_meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in source_meshes:o.hide_render=True;o.hide_set(True)
materials={}
for name,color in [('cloth','#23334d'),('accent','#e9edf4'),('pants','#223042'),('trim','#16202b'),('light','#e5e8dc')]:
 m=bpy.data.materials.new(name);m.diffuse_color=(*[int(color[i:i+2],16)/255 for i in (1,3,5)],1);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=m.diffuse_color;m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.9;materials[name]=m
pieces=[]
def part(name,bone,lo,hi,material='cloth'):
 bpy.ops.mesh.primitive_cube_add(size=1)
 o=bpy.context.object;o.name=name;o.dimensions=Vector(hi)-Vector(lo);o.location=(Vector(lo)+Vector(hi))/2;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.matrix_world=arm.matrix_world@arm.data.bones['mixamorig:'+bone].matrix_local@o.matrix_world
 o.data.materials.append(materials[material]);o['wearBone']=bone;o['wearPart']=name;pieces.append(o);return o

def torso(name='jacket',long=False):
 part(name,'Spine1',(-.345,-.19,-.231),(.345,.285,.244))
 if long:part('coat-tails','Hips',(-.35,-.15,-.23),(.35,.13,.23))

def front(name,lo,hi,material='accent',bone='Spine1'):
 # Anatomical front is the positive local Z side of this Mixamo torso.
 return part(name,bone,lo,hi,material)

def sleeves(long=True,shoulders=True):
 for side in ['Left','Right']:
  part('upper-sleeve-'+side,side+'Arm',(-.11,-.025,-.127),(.11,.235,.127))
  if long:part('lower-sleeve-'+side,side+'ForeArm',(-.102,-.012,-.119),(.102,.15,.119))
  part('cuff-'+side,side+'ForeArm',(-.106,.115,-.123),(.106,.15,.123),'accent')

def trousers(short=False):
 for side in ['Left','Right']:
  part('trouser-'+side,side+'UpLeg',(-.157,-.005,-.166),(.157,.218,.166),'pants')
  if not short:part('lower-trouser-'+side,side+'Leg',(-.15,.005,-.158),(.15,.226,.158),'pants')
  part('shoe-'+side,side+'Foot',(-.17,-.16,-.11),(.17,.245,.13),'trim')

def pockets(y=.0,accent='pants'):
 for side in [-1,1]:front('pocket-'+str(side),(side*.19-.09,y,.246),(side*.19+.09,y+.13,.268),accent)

def collar():
 for side in [-1,1]:front('lapel-'+str(side),(side*.1-.055,.14,.246),(side*.1+.055,.28,.284),'accent')

def stripe(bone='Spine1'):
 front('reflective-band',(-.346,-.08,.246),(.346,-.025,.269),'accent',bone)

def backpack():
 part('backpack','Spine1',(-.26,-.1,-.42),(.26,.25,-.235),'pants')
 for x in [-.23,.18]:front('backpack-strap',(x,-.12,.247),(x+.045,.27,.271),'accent')

def build(family):
 torso(long=family in ['pharmacy','raincoat']);sleeves(long=family not in ['casual','sport']);trousers(short=family=='sport')
 if family=='casual':
  front('tee-panel',(-.18,-.03,.246),(.18,.15,.268),'accent');front('tee-hem',(-.345,-.19,.245),(.345,-.15,.266),'accent')
 if family=='hoodie':
  part('hood-back','Spine2',(-.28,-.03,-.32),(.28,.2,-.16),'cloth');pockets(-.13,'accent');front('zip',(-.012,-.18,.269),(.012,.28,.283),'trim')
 if family=='business':
  collar();front('shirt',(-.08,.05,.245),(.08,.27,.269),'light');front('tie',(-.022,-.08,.271),(.022,.23,.29),'accent');pockets(-.1)
 if family=='workwear':
  pockets(-.12,'accent');part('utility-belt','Hips',(-.352,.04,-.232),(.352,.1,.236),'trim');front('tool-pocket',(-.31,-.15,.247),(-.17,.05,.3),'pants');stripe()
 if family=='sport':
  front('jersey-number',(-.08,-.03,.246),(.08,.16,.269),'accent');
  for side in ['Left','Right']:part('shorts-stripe-'+side,side+'UpLeg',(-.161,.01,-.171),(-.126,.2,.171),'accent')
 if family=='police':
  front('duty-vest',(-.3,-.16,.245),(.3,.23,.3),'pants');front('vest-label',(-.16,.09,.301),(.16,.15,.312),'light');part('duty-belt','Hips',(-.36,.04,-.24),(.36,.1,.24),'trim');front('radio',(-.24,.16,.302),(-.14,.29,.36),'trim');pockets(-.1,'trim')
 if family=='pharmacy':
  collar();pockets(-.12,'cloth');front('badge',(.15,.1,.247),(.28,.2,.276),'accent');front('medical-plus-v',(-.24,.12,.248),(-.21,.22,.278),'accent');front('medical-plus-h',(-.275,.155,.248),(-.175,.185,.278),'accent')
 if family=='paramedic':
  stripe();pockets(.07,'pants');part('medical-belt','Hips',(-.352,.04,-.232),(.352,.1,.236),'trim');
  for side in ['Left','Right']:part('reflective-leg-'+side,side+'Leg',(-.155,.07,-.164),(.155,.105,.164),'accent')
  front('medical-pouch',(.2,-.16,.245),(.33,-.02,.33),'pants')
 if family=='chef':
  front('apron',(-.285,-.34,.246),(.285,.26,.285),'accent');front('apron-pocket',(-.19,-.15,.286),(.19,-.02,.304),'cloth');
  for x in [-.1,.1]:
   for y in [.11,.2]:front('chef-button',(x-.018,y,.286),(x+.018,y+.03,.3),'trim')
 if family=='student':
  collar();part('satchel','Hips',(-.48,-.05,-.13),(-.32,.14,.18),'pants');front('satchel-strap',(-.28,-.18,.249),(-.23,.28,.28),'accent');pockets(-.13,'pants')
 if family=='raincoat':
  part('rain-hood','Spine2',(-.28,-.03,-.34),(.28,.2,-.15),'cloth');front('rain-zip',(-.02,-.18,.246),(.02,.28,.277),'accent');stripe();backpack()
 if family=='explorer':
  pockets(-.11,'accent');backpack();part('trail-belt','Hips',(-.352,.04,-.232),(.352,.1,.236),'trim');
  for side in ['Left','Right']:part('boot-cuff-'+side,side+'Leg',(-.16,.005,-.168),(.16,.1,.168),'trim')

# A fast material-colour product render of the exact generated outfit geometry.
scene=bpy.context.scene;scene.world=bpy.data.worlds.new('Wardrobe World');scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD';scene.world.color=(.045,.065,.09);scene.render.film_transparent=True;scene.render.resolution_x=256;scene.render.resolution_y=256;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
bpy.ops.object.camera_add(location=(3,-5,3));camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=2.5;target=Vector((0,0,.8));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
previous=None
for outfit in manifest['outfits']:
 if outfit['family']!=previous:
  for o in pieces:bpy.data.objects.remove(o,do_unlink=True)
  pieces=[];build(outfit['family']);previous=outfit['family']
 for name,key in [('cloth','primary'),('accent','accent'),('pants','pants')]:
  color=outfit[key];rgba=(*[int(color[i:i+2],16)/255 for i in (1,3,5)],1);materials[name].diffuse_color=rgba;materials[name].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=rgba
 bpy.ops.object.select_all(action='DESELECT')
 for o in pieces:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/outfit['file']),export_format='GLB',use_selection=True,export_animations=False,export_extras=True)
 scene.render.filepath=str(OUT/(Path(outfit['thumbnail']).stem+'.png'));bpy.ops.render.render(write_still=True)
# Preserve a source .blend with all twelve silhouettes in named collections side by side.
for o in pieces:bpy.data.objects.remove(o,do_unlink=True)
pieces=[]
for i,family in enumerate(dict.fromkeys(o['family'] for o in manifest['outfits'])):
 before=len(pieces);build(family)
 for o in pieces[before:]:o.location.x+=i*2.2
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/blocky-wardrobe.blend'))
print('OUTFITS_COMPLETE',len(manifest['outfits']))
