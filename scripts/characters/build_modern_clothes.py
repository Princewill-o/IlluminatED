"""Blender-authored modern wardrobe for the KayKit Rig_Medium characters.
Run: blender --background --python scripts/characters/build_modern_clothes.py
Retains each original face/headwear and armature, replacing fantasy garments.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/world3d/modern-clothes'
OUT.mkdir(parents=True,exist_ok=True)
bpy.context.preferences.filepaths.save_version=0
MODELS=['Ranger','Knight','Mage','Rogue','Rogue_Hooded','Barbarian']
STYLES=['tee','hoodie','polo','blazer']
# Blender coordinates: Z up, -Y forward. Measurements follow Rig_Medium's rest pose.
def material(name,color):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.86
 return m

def mesh(name,verts,faces,mat,weight):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
 for v in me.vertices:
  weights=weight(v.co)
  for bone,w in weights.items():
   g=o.vertex_groups.get(bone) or o.vertex_groups.new(name=bone);g.add([v.index],w,'REPLACE')
 mod=o.modifiers.new('Rig_Medium','ARMATURE');mod.object=ARM;o.parent=ARM
 return o

def solid(name,center,size,mat,bone,bevel=.03):
 bpy.ops.mesh.primitive_cube_add(size=1,location=center);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Soft low-poly edges','BEVEL');mod.width=bevel;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
 g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE');o.data.materials.append(mat);mod=o.modifiers.new('Rig_Medium','ARMATURE');mod.object=ARM;o.parent=ARM
 return o

def loft(name,rings,mat,weight,n=12):
 verts=[]
 for z,rx,ry,cx,cy in rings:
  verts.extend((cx+math.cos(2*math.pi*i/n)*rx,cy+math.sin(2*math.pi*i/n)*ry,z) for i in range(n))
 faces=[tuple(reversed(range(n)))]
 for j in range(len(rings)-1):
  for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 faces.append(tuple((len(rings)-1)*n+i for i in range(n)))
 return mesh(name,verts,faces,mat,weight)

def sleeve(name,side,sections,mat):
 verts=[];n=10
 for x,r in sections:
  # Follow the source arm centreline, including its slight elbow bend.
  cy=.014*max(0,1-abs(x-.453)/.26)
  verts.extend((side*x,cy+math.cos(2*math.pi*i/n)*r,1.107+math.sin(2*math.pi*i/n)*r) for i in range(n))
 faces=[]
 for j in range(len(sections)-1):
  for i in range(n):
   f=(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i);faces.append(f if side>0 else tuple(reversed(f)))
 def weight(v):
  t=max(0,min(1,(abs(v.x)-.41)/.09));s='l' if side>0 else 'r';return {f'upperarm.{s}':1-t,f'lowerarm.{s}':t}
 return mesh(name,verts,faces,mat,weight)

def torso_weight(v):
 t=max(0,min(1,(v.z-.64)/.38));return {'hips':1-t,'chest':t}

def create(style):
 top=material('Modern_Top',(.22,.35,.41));trim=material('Modern_Trim',(.15,.25,.29));white=material('Modern_White',(.85,.87,.81));skin=material('Modern_Skin',(.58,.33,.18));dark=material('Modern_Detail',(.06,.08,.09));bottom=material('Modern_Bottom',(.09,.14,.22));shoe=material('Modern_Shoes',(.76,.8,.77));sole=material('Modern_Sole',(.9,.91,.86))
 # Skin at the neck is visible between collar and head.
 loft('Modern_Neck',[(1.14,.135,.12,0,0),(1.28,.14,.12,0,0)],skin,lambda v:{'chest':1})
 roomy=style=='hoodie';rx=.31 if roomy else .285
 loft('Modern_Body',[(.55,rx*.88,.18,0,0),(.63,rx,.19,0,0),(.96,rx*1.03,.19,0,0),(1.105,.32,.17,0,0),(1.14,.28,.15,0,0),(1.18,.15,.115,0,0)],top,torso_weight)
 for side,s in [(1,'l'),(-1,'r')]:
  short=style in ['tee','polo']
  sections=[(.16,.152),(.235,.152),(.31,.15),(.39,.145)] if short else [(.16,.16),(.235,.16),(.36,.155),(.445,.143),(.5,.14),(.64,.12),(.72,.105)]
  sleeve('Modern_Sleeve_'+s,side,sections,top)
  if short:sleeve('Modern_Forearm_'+s,side,[(.388,.114),(.445,.113),(.51,.103),(.64,.095),(.745,.083)],skin)
  else:sleeve('Modern_Cuff_'+s,side,[(.695,.107),(.743,.102)],trim)
  # Rounded hands replace leather gauntlets; original hand bones drive them.
  solid('Modern_Hand_'+s,(side*.82,0,1.107),(.21,.17,.18),skin,f'hand.{s}',.05)
  solid('Modern_Thumb_'+s,(side*.79,-.085,1.058),(.085,.08,.09),skin,f'hand.{s}',.025)
  # Both leg shapes ship together and are selected by existing bottom IDs.
  for name,width in [('Denim',.145),('Tailored',.126)]:
   def leg_weight(v,s=s):
    t=max(0,min(1,(.34-v.z)/.09));return {f'upperleg.{s}':1-t,f'lowerleg.{s}':t}
   loft('Modern_'+name+'_'+s,[(.115,width*.88,.115,side*.171,.014),(.24,width,.115,side*.171,.008),(.3,width,.119,side*.171,0),(.43,width*1.06,.125,side*.171,0),(.57,width*1.08,.135,side*.171,0)],bottom,leg_weight)
  # Trainers have a distinct sole, toe cap, heel and three lace bands.
  solid('Modern_Trainer_'+s,(side*.171,-.067,.085),(.276,.41,.145),shoe,f'foot.{s}',.055)
  solid('Modern_TrainerSole_'+s,(side*.171,-.067,.027),(.285,.42,.055),sole,f'foot.{s}',.023)
  for y in [-.13,-.085,-.04]:solid('Modern_TrainerLace_'+s,(side*.171,y,.166),(.16,.018,.012),white,f'foot.{s}',.004)
  solid('Modern_SmartShoe_'+s,(side*.171,-.07,.07),(.252,.405,.12),shoe,f'foot.{s}',.045)
  solid('Modern_SmartSole_'+s,(side*.171,-.07,.021),(.26,.41,.035),dark,f'foot.{s}',.01)
 if style=='hoodie':
  loft('Modern_Hem',[(.55,.282,.185,0,0),(.61,.293,.195,0,0)],trim,torso_weight)
  # Hood rests behind the neck, below the oversized head.
  solid('Modern_Hood',(0,.155,1.105),(.43,.25,.25),top,'chest',.085)
  solid('Modern_KangarooPocket',(0,-.188,.75),(.37,.032,.18),trim,'chest',.035)
  for x in [-.085,.085]:solid('Modern_Drawstring',(x,-.187,1.045),(.018,.018,.18),white,'chest',.006)
 elif style=='polo':
  for side in [-1,1]:
   o=solid('Modern_Collar',(side*.085,-.14,1.115),(.15,.055,.1),trim,'chest',.015);o.rotation_euler.y=side*.35
  solid('Modern_Placket',(0,-.184,1.02),(.045,.016,.16),trim,'chest',.005)
  for z in [.98,1.03,1.08]:solid('Modern_Button',(0,-.198,z),(.014,.01,.014),white,'chest',.003)
 elif style=='blazer':
  # Contrasting shirt panel, not a repainted fantasy tunic.
  panel=[]
  for z in [.65,.75,.85,.96,1.05,1.14]:
   y=-.245 if z<1.05 else -.225
   panel.extend([(-.12,y,z),(.12,y,z)])
  mesh('Modern_ShirtPanel',panel,[(i,i+1,i+3,i+2) for i in range(0,10,2)],white,torso_weight)
  for side in [-1,1]:
   verts=[(side*.03,-.272,.83),(side*.21,-.259,1.045),(side*.11,-.245,1.15),(side*.015,-.27,.99)]
   mesh('Modern_Lapel_'+str(side),verts,[(0,1,2,3) if side<0 else (3,2,1,0)],trim,torso_weight)
   solid('Modern_WeltPocket',(side*.19,-.192,.77),(.12,.022,.022),trim,'chest',.004)
  for z in [.72,.82]:solid('Modern_BlazerButton',(.04,-.26,z),(.025,.018,.025),dark,'chest',.006)
 else:
  loft('Modern_TeeCollar',[(1.145,.16,.12,0,0),(1.185,.145,.116,0,0)],trim,lambda v:{'chest':1})

def batch_garments():
 # Join by material and visibility group, keeping trouser/shoe alternatives independently selectable.
 groups={}
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH' or not o.name.startswith('Modern_'):continue
  mat=o.data.materials[0].name
  if o.name.startswith('Modern_Denim'):key='Modern_Denim'
  elif o.name.startswith('Modern_Tailored'):key='Modern_Tailored'
  elif o.name.startswith('Modern_Trainer'):key='Modern_Trainer_'+mat
  elif o.name.startswith('Modern_Smart'):key='Modern_Smart_'+mat
  else:key='Modern_Body' if mat=='Modern_Top' else mat
  groups.setdefault(key,[]).append(o)
 for name,objects in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0]
  if len(objects)>1:bpy.ops.object.join()
  objects[0].name=name

manifest={'generator':'Blender','rig':'KayKit Rig_Medium','styles':STYLES,'models':MODELS,'assets':[]}
for model in MODELS:
 for style in STYLES:
  bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
  bpy.ops.import_scene.gltf(filepath=str(ROOT/f'public/world3d/kaykit-adventurers/characters/{model}.glb'))
  ARM=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
  for o in list(bpy.context.scene.objects):
   if o.type=='MESH' and not (o.name.endswith('_Head') or any(s in o.name for s in ['Hat','Helmet','Visor','Mask'])):bpy.data.objects.remove(o,do_unlink=True)
  create(style)
  batch_garments()
  filename=f'{model}-{style}.glb'
  bpy.ops.export_scene.gltf(filepath=str(OUT/filename),export_format='GLB',export_animations=False,export_yup=True,export_skins=True,export_extras=True)
  if model=='Ranger':
   blend=ROOT/'blender/modern-clothes';blend.mkdir(exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(blend/f'{style}.blend'))
  manifest['assets'].append({'file':filename,'bytes':(OUT/filename).stat().st_size})
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
(OUT/'README.txt').write_text('Modern garments authored in Blender for IlluminatED. Original KayKit character faces, headwear and skeletons are retained under the supplied CC0 licence in ../kaykit-adventurers/License.txt. Rebuild with scripts/characters/build_modern_clothes.py. Editable sources: blender/modern-clothes/*.blend.\n')
print('MODERN WARDROBE COMPLETE',len(manifest['assets']))
