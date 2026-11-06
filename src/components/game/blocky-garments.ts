import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import { BLOCKY_BASE } from "@/game/core/adventurers";
import { blockyOutfitAsset, wearSlotFor, type BlockyOutfit, type Wardrobe, type WearSlot } from "@/game/core/blocky-outfits";
import { cosmeticById, type Avatar } from "@/game/core/cosmetics";

const findBone=(object:THREE.Object3D,name:string)=>object.getObjectByName(`mixamorig${name}`)??object.getObjectByName(`mixamorig:${name}`);
/** Keep authored head, neck and hands; replace the existing body surface with the Blender outfit. */
export function clothedBodyGeometry(mesh:THREE.SkinnedMesh):THREE.BufferGeometry {
  const geometry=mesh.geometry,indices=geometry.index,weights=geometry.getAttribute('skinWeight'),joints=geometry.getAttribute('skinIndex');
  if(!indices||!weights||!joints)return geometry.clone();
  const keep=mesh.skeleton.bones.map(b=>/head|neck|hand/i.test(b.name));
  const selected:number[]=[];
  for(let triangle=0;triangle<indices.count;triangle+=3){
    let coverage=0;
    for(let corner=0;corner<3;corner++){const vertex=indices.getX(triangle+corner);for(let influence=0;influence<4;influence++)if(keep[joints.getComponent(vertex,influence)])coverage+=weights.getComponent(vertex,influence);}
    if(coverage>1.5)for(let corner=0;corner<3;corner++)selected.push(indices.getX(triangle+corner));
  }
  const result=geometry.clone();result.setIndex(selected);result.clearGroups();return result;
}
/** Blender nodes retain source rest transforms; convert each piece into its supplied bone's local frame. */
export async function attachBlockyOutfit(
  object:THREE.Group,pieces:Wardrobe|BlockyOutfit,avatar:Avatar,
  load:(url:string)=>Promise<GLTF>,
  materials:Set<THREE.Material>,
) {
  // A single outfit set still works: every slot comes from that set.
  const wardrobe:Wardrobe='file' in pieces?{top:pieces,bottom:pieces,shoes:pieces}:pieces;
  // Mix and match: each slot can come from a different outfit set (one download per distinct set).
  const sets=[...new Set([wardrobe.top.id,wardrobe.bottom.id,wardrobe.shoes.id])];
  const [reference,...files]=await Promise.all([load(`${BLOCKY_BASE}/blocky_01_hero.glb`),...sets.map(id=>load(blockyOutfitAsset(id)!))]);
  reference.scene.updateMatrixWorld(true);
  let attached=0;
  sets.forEach((id,i)=>{
  const garments=files[i];garments.scene.updateMatrixWorld(true);
  const wanted=new Set<WearSlot>((["top","bottom","shoes"] as const).filter(slot=>wardrobe[slot].id===id));
  garments.scene.traverse(child=>{
    const source=child as THREE.Mesh;
    if(!source.isMesh||typeof source.userData.wearBone!=='string')return;
    if(!wanted.has(wearSlotFor(source.userData.wearBone,String(source.userData.wearPart??''))))return;
    const rest=findBone(reference.scene,source.userData.wearBone),target=findBone(object,source.userData.wearBone);
    if(!rest||!target)return;
    const mesh=source.clone();
    const original=Array.isArray(source.material)?source.material:[source.material];
    const next=original.map(material=>{
      const clone=material.clone() as THREE.MeshStandardMaterial;
      const part=String(source.userData.wearPart??'');
      const dye=/shoe|boot-cuff/.test(part)?avatar.shoesColor:material.name==='cloth'?avatar.topColor:material.name==='pants'?avatar.bottomColor:null;
      if(dye&&!dye.endsWith('-auto')){const color=cosmeticById(dye)?.color;if(color)clone.color.set(color);}
      clone.roughness=.87;clone.metalness=0;materials.add(clone);return clone;
    });
    mesh.material=Array.isArray(source.material)?next:next[0];
    const local=new THREE.Matrix4().copy(rest.matrixWorld).invert().multiply(source.matrixWorld);
    local.decompose(mesh.position,mesh.quaternion,mesh.scale);
    mesh.castShadow=mesh.receiveShadow=true;mesh.name=`outfit-${source.userData.wearPart}`;
    target.add(mesh);attached++;
  });
  });
  if(!attached)throw new Error('The outfit has no compatible supplied bones');
  object.userData.outfit=wardrobe.top.id;
}
