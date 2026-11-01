import bpy, json, math
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[2]/'public/world3d/selected-city';root.mkdir(parents=True,exist_ok=True)
manifest=[]
for pack,targets in [('low_poly_city-pack',{'RESTAURANT':'restaurant','CLOTHES SHOP':'sports-store','COFFEE SHOP':'coffee-shop','FRUIT SHOP':'fruit-shop','SPORT CENTER':'sports-centre','WHITE BUILDING':'white-building','GREY BUILDING2':'grey-building','ORANGE BUILDING3':'orange-building'}),('low_poly_city_game-ready',{'Commercial 1_1':'commercial-1','Commercial 3_4':'commercial-3','Commercial 5_5':'commercial-5','Modern Office.001_42':'modern-office','Post Office_2':'post-office'})]:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(Path.home()/'Downloads'/pack/'scene.gltf'))
 for name,slug in targets.items():
  obj=bpy.data.objects.get(name)
  if not obj:print('MISSING',name);continue
  meshes=[o for o in [obj,*obj.children_recursive] if o.type=='MESH'];bpy.ops.object.select_all(action='DESELECT')
  for o in meshes:o.select_set(True)
  bpy.ops.export_scene.gltf(filepath=str(root/(slug+'.glb')),export_format='GLB',use_selection=True,export_animations=False)
  manifest.append({'file':slug+'.glb','source':pack,'node':name})
(root/'manifest.json').write_text(json.dumps(manifest,indent=2))
bpy.ops.wm.open_mainfile(filepath=str(Path.home()/'Downloads/LowPolyTreePack.blend'))
print('TREE_OBJECTS',[(o.name,o.type) for o in bpy.data.objects])
for i,name in enumerate(['Tree Type1 01 Model','Tree Type2 01 Model','Tree Type3 01 Model','Tree Type4 01 Model']):
 o=bpy.data.objects[name];mesh=o.data.copy();o.data=mesh;mesh.materials.clear()
 for col in [(0.16,.34,.14,1),(.22,.42,.18,1),(.32,.48,.2,1),(.25,.13,.06,1)]:
  m=bpy.data.materials.new('Glen tree');m.diffuse_color=col;mesh.materials.append(m)
 low=min(v.co.z for v in mesh.vertices);high=max(v.co.z for v in mesh.vertices);span=high-low
 for poly in mesh.polygons:poly.material_index=3 if poly.center.z<low+span*.28 else poly.index%3
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(root/('tree-'+str(i)+'.glb')),export_format='GLB',use_selection=True,export_animations=False)
