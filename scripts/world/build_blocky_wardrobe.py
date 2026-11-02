"""Blender recipe: twelve modular clothing silhouettes, ten material palettes, 120 real GLBs.
Run with Blender --background --python scripts/world/build_blocky_wardrobe.py.
Pieces carry wearBone extras and source-rest transforms for runtime bone attachment.
"""
import argparse
import bpy, json, math, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/world3d/blocky-outfits';OUT.mkdir(parents=True,exist_ok=True)
manifest=json.loads((OUT/'manifest.json').read_text())
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--families', nargs='*', help='Rebuild only these garment families; catalogue IDs are unchanged.')
parser.add_argument('--skip-thumbnails', action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
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

def design_details(family):
 """Original, articulated tailoring details; no external logos or texture decals."""
 def detail(name,lo,hi,material='accent',bone='Spine1'):
  return front('design-'+family+'-'+name,lo,hi,material,bone)
 # Real, raised seam stitches suit the block-built character proportions.
 for side in [-1,1]:
  for index in range(4):
   x=side*.318;y=-.14+index*.075
   detail('side-stitch-%s-%s'%(side,index),(x-.005,y,.272),(x+.005,y+.035,.281),'light')
 # A tiny original stepped lozenge is the collection's sewn maker's mark.
 for index,(x,y) in enumerate([(0,.03),(.018,.048),(0,.066),(-.018,.048)]):
  detail('makers-mark-'+str(index),(x+.17,y+.135,.316),(x+.184,y+.149,.328),'accent')
 if family=='casual':
  for side in [-1,1]:
   detail('contrast-yoke-'+str(side),(side*.21-.09,.185,.272),(side*.21+.09,.22,.285))
  detail('double-hem',(-.30,-.173,.269),(.30,-.162,.28),'trim')
 elif family=='hoodie':
  for side in [-1,1]:
   x=side*.045
   detail('drawcord-'+str(side),(x-.007,.14,.287),(x+.007,.27,.298),'light')
   detail('cord-toggle-'+str(side),(x-.012,.128,.288),(x+.012,.151,.306),'trim')
  detail('pouch-binding',(-.275,-.122,.279),(.275,-.111,.289),'light')
 elif family=='business':
  detail('pocket-square',(.15,.08,.277),(.245,.122,.293),'light')
  for side in ['Left','Right']:
   for index in range(3):
    detail('cuff-button-%s-%s'%(side,index),(.104,.08+index*.02,-.02),(.116,.093+index*.02,.005),'light',side+'ForeArm')
 elif family=='workwear':
  for side in ['Left','Right']:
   detail('shoulder-panel-'+side,(-.114,.04,-.131),(.114,.1,-.119),'pants',side+'Arm')
   detail('sleeve-reflector-'+side,(-.114,.12,.128),(.114,.15,.139),'light',side+'Arm')
  detail('reinforced-pocket',(-.305,-.142,.303),(-.175,-.129,.314),'light')
 elif family=='sport':
  # A block-built number 11 replaces the plain chest patch with readable geometry.
  for x in [-.055,.025]:detail('number-eleven-'+str(x),(x,-.015,.273),(x+.03,.145,.287),'cloth')
  for side in ['Left','Right']:
   for index in range(2):detail('shoulder-stripe-%s-%s'%(side,index),(-.111,.045+index*.055,.128),(.111,.069+index*.055,.14),'accent',side+'Arm')
 elif family=='police':
  for index in range(8):
   x=-.28+index*.07
   detail('check-band-'+str(index),(x,-.04,.312),(x+.065,-.008,.324),'light' if index%2==0 else 'trim')
  detail('radio-aerial',(-.222,.28,.336),(-.212,.37,.347),'trim')
 elif family=='pharmacy':
  for index in range(3):
   x=.14+index*.023
   detail('pocket-pen-'+str(index),(x,-.01,.28),(x+.012,.065,.292),'accent' if index%2 else 'trim')
  detail('coat-placket',(-.009,-.18,.276),(.009,.05,.286),'light')
 elif family=='paramedic':
  for side in ['Left','Right']:
   for index in range(3):
    x=-.10+index*.075
    detail('segmented-reflector-%s-%s'%(side,index),(x,.08,.129),(x+.05,.13,.141),'accent',side+'Arm')
  detail('responder-cross-v',(-.205,.12,.32),(-.18,.23,.334),'light')
  detail('responder-cross-h',(-.245,.16,.32),(-.14,.19,.334),'light')
 elif family=='chef':
  for index in range(8):
   x=-.25+index*.065
   detail('apron-hem-stitch-'+str(index),(x,-.317,.289),(x+.03,-.308,.3),'cloth')
  detail('apron-pocket-binding',(-.19,-.15,.307),(.19,-.135,.318),'trim')
 elif family=='student':
  detail('satchel-clasp',(-.487,.07,.12),(-.467,.105,.165),'light','Hips')
  for side in [-1,1]:
   detail('knit-ribbing-'+str(side),(side*.3-.012,-.14,.278),(side*.3+.012,.1,.289),'pants')
  detail('cardigan-hem',(-.3,-.18,.279),(.3,-.155,.29),'pants')
 elif family=='raincoat':
  for side in [-1,1]:
   x=side*.28
   detail('weather-piping-'+str(side),(x-.009,-.12,.283),(x+.009,.22,.295),'light')
  detail('storm-flap',(-.055,-.18,.281),(.055,.13,.295),'cloth')
 elif family=='explorer':
  for side in [-1,1]:
   x=side*.205
   detail('strap-buckle-'+str(side),(x-.033,.08,.288),(x+.033,.13,.306),'trim')
   detail('buckle-highlight-'+str(side),(x-.019,.09,.307),(x+.019,.12,.317),'light')

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
 design_details(family)

# A fast material-colour product render of the exact generated outfit geometry.
scene=bpy.context.scene;scene.world=bpy.data.worlds.new('Wardrobe World');scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD';scene.world.color=(.045,.065,.09);scene.render.film_transparent=True;scene.render.resolution_x=256;scene.render.resolution_y=256;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
bpy.ops.object.camera_add(location=(3,-5,3));camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=2.5;target=Vector((0,0,.8));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
previous=None
selected=[outfit for outfit in manifest['outfits'] if not args.families or outfit['family'] in args.families]
for outfit in selected:
 if outfit['family']!=previous:
  for o in pieces:bpy.data.objects.remove(o,do_unlink=True)
  pieces=[];build(outfit['family']);previous=outfit['family']
 for name,key in [('cloth','primary'),('accent','accent'),('pants','pants')]:
  color=outfit[key];rgba=(*[int(color[i:i+2],16)/255 for i in (1,3,5)],1);materials[name].diffuse_color=rgba;materials[name].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=rgba
 bpy.ops.object.select_all(action='DESELECT')
 for o in pieces:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/outfit['file']),export_format='GLB',use_selection=True,export_animations=False,export_extras=True)
 if not args.skip_thumbnails:
  scene.render.filepath=str(OUT/(Path(outfit['thumbnail']).stem+'.png'));bpy.ops.render.render(write_still=True)
# Preserve a source .blend with all twelve silhouettes in named collections side by side.
for o in pieces:bpy.data.objects.remove(o,do_unlink=True)
pieces=[]
for i,family in enumerate(dict.fromkeys(o['family'] for o in manifest['outfits'])):
 before=len(pieces);build(family)
 for o in pieces[before:]:o.location.x+=i*2.2
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/blocky-wardrobe.blend'))
print('OUTFITS_COMPLETE',len(selected))
