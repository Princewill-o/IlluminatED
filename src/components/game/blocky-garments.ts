import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import { BLOCKY_BASE } from "@/game/core/adventurers";
import { blockyOutfitAsset, type BlockyOutfit } from "@/game/core/blocky-outfits";
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
  object:THREE.Group,outfit:BlockyOutfit,avatar:Avatar,
  load:(url:string)=>Promise<GLTF>,
  materials:Set<THREE.Material>,
) {
  const [garments,reference]=await Promise.all([load(blockyOutfitAsset(outfit.id)!),load(`${BLOCKY_BASE}/blocky_01_hero.glb`)]);
  reference.scene.updateMatrixWorld(true);garments.scene.updateMatrixWorld(true);
  let attached=0;
  garments.scene.traverse(child=>{
    const source=child as THREE.Mesh;
    if(!source.isMesh||typeof source.userData.wearBone!=='string')return;
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
  if(!attached)throw new Error('The outfit has no compatible supplied bones');
  object.userData.outfit=outfit.id;
}
