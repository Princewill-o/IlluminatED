"""Build the original IlluminatED paramedic van and enhance supplied Cop GLB.
Blender --background --python scripts/world/build_emergency_vehicles.py
Both exports face glTF +Z; app helper turns them to +X. All geometry uses solid
opaque materials. Rear door names are stable animation hooks in runtime.
"""
import bpy,math,bmesh
from pathlib import Path
from mathutils import Vector
repo=Path(__file__).resolve().parents[2];out=repo/'public/world3d/emergency';out.mkdir(parents=True,exist_ok=True)

def material(name,color,emission=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=.52
 if emission:b.inputs['Emission Color'].default_value=(*color,1);b.inputs['Emission Strength'].default_value=emission
 return m

def cube(name,mat,loc,size,parent=None,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('Soft panel edge','BEVEL');mod.width=bevel;mod.segments=2;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 if parent:o.parent=parent
 return o

def text(name,value,mat,loc,rot,size=.17,parent=None):
 bpy.ops.object.text_add(location=loc,rotation=rot);o=bpy.context.object;o.name=name;o.data.body=value;o.data.align_x='CENTER';o.data.align_y='CENTER';o.data.size=size;o.data.extrude=.001;o.data.materials.append(mat)
 if parent:o.parent=parent
 return o

def empty(name,loc):
 o=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(o);o.location=loc;return o

def wheel(x,y,r=.36):
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=.12,location=(x,y,r),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='Wheel';o.data.materials.append(mats['rubber'])
 bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r*.52,depth=.135,location=(x,y,r),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='Wheel rim';o.data.materials.append(mats['silver'])

bpy.ops.wm.read_factory_settings(use_empty=True)
mats={n:material(n,c,em) for n,c,em in [('Van white',(.87,.9,.87),0),('Medical yellow',(.8,.95,.015),0),('Medical green',(.035,.29,.12),0),('Window',(.025,.075,.11),0),('rubber',(.018,.024,.026),0),('silver',(.46,.52,.52),0),('Interior',(.66,.73,.71),0),('Stretcher',(.06,.28,.31),0),('SirenBlueLeft',(.025,.16,1),3),('SirenBlueRight',(.025,.16,1),3),('Lamp',(.95,.94,.7),1),('Tail',(.85,.045,.025),1)]}
white=mats['Van white'];yellow=mats['Medical yellow'];green=mats['Medical green'];window=mats['Window'];black=mats['rubber'];silver=mats['silver']
# Blender front is -Y: imported glTF +Z; rear is +Y.
cube('Chassis',black,(0,0,.39),(1.52,4.5,.22),bevel=.04)
cube('Cab lower',white,(0,-1.35,.91),(1.55,1.65,.96),bevel=.1)
cube('Cab roof',white,(0,-1.23,1.96),(1.6,1.3,.18),bevel=.05)
cube('Cab back',white,(0,-.68,1.58),(1.54,.15,.68))
cube('Windscreen',window,(0,-1.94,1.54),(1.31,.04,.65),bevel=.055)
cube('Bonnet',white,(0,-2.03,1.11),(1.5,.48,.14),bevel=.055)
cube('Front bumper',black,(0,-2.28,.5),(1.6,.14,.23),bevel=.025)
cube('Grille',black,(0,-2.285,.81),(.84,.025,.23))
for side in [-1,1]:
 cube('Cab side glass',window,(side*.785,-1.23,1.56),(.025,1.03,.59),bevel=.03)
 cube('Door seam',silver,(side*.793,-.88,.91),(.018,.025,.8))
 cube('Cab handle',black,(side*.808,-.85,1.15),(.025,.2,.04))
 cube('Mirror',black,(side*.845,-1.78,1.51),(.11,.16,.2),bevel=.02)
 cube('Headlamp',mats['Lamp'],(side*.59,-2.28,.94),(.27,.04,.2),bevel=.02)
# Patient compartment: actual hollow cabin, leaving rear open when the doors move.
cube('Patient floor',mats['Interior'],(0,.72,.53),(1.6,2.92,.13))
cube('Patient roof',white,(0,.72,2.26),(1.64,2.97,.16),bevel=.035)
for side in [-1,1]:
 cube('Patient wall',yellow,(side*.79,.72,1.4),(.09,2.96,1.67))
 cube('Upper white panel',white,(side*.843,.69,1.99),(.025,2.9,.26))
 for i in range(6):
  y=-.49+i*.47
  cube('Battenburg green',green,(side*.849,y,1.15),(.025,.46,.29) if i%2 else (.025,.46,.29)) if i%2 else None
  cube('Battenburg green',green,(side*.849,y,1.45),(.025,.46,.29)) if not i%2 else None
 text('Paramedic side','PARAMEDIC',green,(side*.87,.55,1.89),(math.pi/2,0,side*math.pi/2),.22)
 # Generic medical plus on white side squares; no Red Cross artwork.
 cube('Medical plus vertical',white,(side*.86,1.51,1.75),(.025,.13,.45))
 cube('Medical plus horizontal',white,(side*.861,1.51,1.75),(.025,.42,.13))
 cube('Rear tail lamp',mats['Tail'],(side*.68,2.22,.87),(.12,.04,.28))
# A stretcher inside the patient compartment; separate node for future loading.
cube('Stretcher frame',silver,(0,.85,.76),(.65,1.8,.08))
cube('Patient stretcher',mats['Stretcher'],(0,.85,.84),(.64,1.78,.12),bevel=.03)
for side in [-1,1]:cube('Stretcher rail',silver,(side*.35,.85,.92),(.03,1.75,.035))
cube('Rear step',silver,(0,2.27,.3),(1.4,.18,.12))
# Pivots parent local geometry; rotating opens outward around each hinge.
for side,name in [(-1,'RearDoorLeft'),(1,'RearDoorRight')]:
 pivot=empty(name,(side*.78,2.21,.55));x=-side*.39
 cube(name+' panel',yellow,(x,0,.79),(.76,.09,1.58),pivot)
 cube(name+' glass',window,(x,.058,1.12),(.5,.02,.45),pivot,bevel=.02)
 cube(name+' handle',black,(-side*.08,.075,.69),(.045,.035,.2),pivot)
 for i in range(3):
  for j in range(2):
   if (i+j)%2==0:cube(name+' chevron',green,(x+(i-1)*.23,.058,.31+j*.22),(.22,.025,.2),pivot)
 text(name+' AMBULANCE','AMBULANCE',green,(x,.065,.86),(math.pi/2,0,math.pi),.085,pivot)
for x in [-.42,.42]:
 cube('Roof lamp base',black,(x,-1.28,2.09),(.45,.25,.07))
 cube('SirenBlueLeft' if x<0 else 'SirenBlueRight',mats['SirenBlueLeft' if x<0 else 'SirenBlueRight'],(x,-1.28,2.16),(.45,.25,.12),bevel=.025)
for side in [-1,1]:
 for y in [-1.46,1.42]:wheel(side*.78,y)
# Export text as mesh so labels are part of the geometry.
for obj in list(bpy.context.scene.objects):
 if obj.type=='FONT':bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.convert(target='MESH');obj.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'ambulance.glb'),export_format='GLB',export_animations=False)
# Enhance supplied Cop: preserve original shape and add bright UK-style blue/yellow side panels.
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(repo/'public/world3d/cars-realistic/Cop.glb'))
# Remove the original tiny red/blue roof-lamp faces before fitting the larger blue lightbar.
for obj in list(bpy.context.scene.objects):
 if obj.type!='MESH':continue
 bm=bmesh.new();bm.from_mesh(obj.data)
 remove=[]
 for face in bm.faces:
  mat=obj.data.materials[face.material_index] if face.material_index<len(obj.data.materials) else None
  if mat and any(n in mat.name for n in ['BlueLights','WhiteLights','TailLights']) and all((obj.matrix_world@v.co).z>1.1 for v in face.verts):remove.append(face)
 if remove:bmesh.ops.delete(bm,geom=remove,context='FACES')
 bm.to_mesh(obj.data);bm.free()
blue=material('Police blue',(.025,.08,.35));yellow=material('Police yellow',(.82,.93,.01));white=material('Police lettering',(.92,.96,.96));lampL=material('SirenBlueLeft',(.02,.17,1),4);lampR=material('SirenBlueRight',(.02,.17,1),4);black=material('Lightbar base',(.025,.03,.045))
for o in bpy.context.scene.objects:
 if o.type=='MESH':
  for m in o.data.materials:
   if m and ('BlueLights' in m.name or 'WhiteLights' in m.name):m.diffuse_color=(.025,.17,1,1)
for side in [-1,1]:
 for i in range(5):
  for row in range(2):
   cube('Police Battenburg',blue if (i+row)%2 else yellow,(side*.81,-.65+i*.32,.6+row*.18),(.028,.31,.17))
 text('Police label','POLICE',white,(side*.84,.2,.94),(math.pi/2,0,side*math.pi/2),.18)
cube('Police lightbar base',black,(0,.4,1.245),(1.15,.24,.08))
cube('SirenBlueLeft',lampL,(-.38,.4,1.33),(.36,.26,.15),bevel=.025)
cube('SirenBlueRight',lampR,(.38,.4,1.33),(.36,.26,.15),bevel=.025)
for obj in list(bpy.context.scene.objects):
 if obj.type=='FONT':bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.convert(target='MESH');obj.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'police.glb'),export_format='GLB',export_animations=False)
