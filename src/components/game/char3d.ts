"use client";

import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { eyewear3d, held3d, hat3d, pet3d } from "./accessories3d";
import { ADVENTURERS, BLOCKY_BASE, adventurerFor } from "@/game/core/adventurers";
import { cosmeticById, type Avatar, look } from "@/game/core/cosmetics";
import { BRANDS } from "@/game/core/chibi-looks";
import { logoFor } from "@/game/core/logos";
import { blockyOutfitFor } from "@/game/core/blocky-outfits";
import { attachBlockyOutfit, clothedBodyGeometry } from "./blocky-garments";
import { outfitColours } from "@/game/core/outfits";

const loader = new GLTFLoader();
const models = new Map<string, Promise<GLTF>>();
function load(url: string) {
  let result = models.get(url);
  if (!result) { result = loader.loadAsync(url).catch(error => { models.delete(url); throw error; }); models.set(url, result); }
  return result;
}
export const avatarColours = outfitColours;
export interface Character3D {
  object: THREE.Group;
  mixer: THREE.AnimationMixer;
  play: (clip: string) => void;
  update: (dt: number, reducedMotion?: boolean) => void;
  dispose: () => void;
}
/** GLTFLoader removes punctuation from bone names when creating animation bindings. */
const bone = (object: THREE.Object3D, name: string) => object.getObjectByName(`mixamorig${name}`) ?? object.getObjectByName(`mixamorig:${name}`);

/** The supplied Blocky Characters have their own meshes, rig, texture atlas and clips. */
async function buildBlockyCharacter(a:Avatar,height:number,workplaceLogo:string|null,model:typeof ADVENTURERS[number]):Promise<Character3D>{
  const source=await load(`${BLOCKY_BASE}/${model.file}.glb`);
  const outfit=blockyOutfitFor(a.top);
  const object=clone(source.scene) as THREE.Group;
  object.userData.characterModel=model.file;
  const skeletons=new Set<THREE.Skeleton>();
  const extraOutfitMaterials=new Set<THREE.Material>();
  const originalBodies=new Map<THREE.SkinnedMesh,THREE.BufferGeometry>();
  const materials=new Set<THREE.Material>(),geometries=new Set<THREE.BufferGeometry>(),generatedTextures=new Set<THREE.Texture>();
  object.traverse(o=>{const mesh=o as THREE.SkinnedMesh;if(!mesh.isMesh)return;if(outfit&&mesh.isSkinnedMesh){originalBodies.set(mesh,mesh.geometry);mesh.geometry=clothedBodyGeometry(mesh);geometries.add(mesh.geometry);}const old=Array.isArray(mesh.material)?mesh.material:[mesh.material];const next=old.map(m=>{const copy=m.clone() as THREE.MeshStandardMaterial;copy.roughness=.82;copy.metalness=0;if(mesh.isSkinnedMesh&&copy.map){const recoloured=blockyOutfitTexture(mesh,copy.map,a,!!workplaceLogo);if(recoloured){copy.map=recoloured;generatedTextures.add(recoloured);}}materials.add(copy);return copy;});mesh.material=Array.isArray(mesh.material)?next:next[0];mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;if(mesh.isSkinnedMesh)skeletons.add(mesh.skeleton);/* Source geometry is shared by independently cloned characters. */});
  const animationSource = source.animations.length < 10 ? await load(`${BLOCKY_BASE}/blocky_01_hero.glb`) : source;
  const mixer=new THREE.AnimationMixer(object),clips=new Map(animationSource.animations.map(original=>{const clip=original.clone();for(const track of clip.tracks){if(/mixamorig:?Hips\.position$/.test(track.name))for(let i=0;i<track.values.length;i+=3){track.values[i]=track.values[0];track.values[i+2]=track.values[2];}}return[clip.name.toLowerCase(),clip] as const;}));
  const aliases:Record<string,string>={static:'idle',sprint:'run',die:'death','pick-up':'cheer','emote-yes':'cheer','emote-no':'idle',celebrate:'cheer',attack:'punch','attack-melee-right':'punch','attack-melee-left':'punch','attack-kick-right':'punch','interact-right':'cheer','interact-left':'cheer',sit:'idle',drive:'idle','wheelchair-sit':'idle',crouch:'idle',cycle:'walk','cycle-coast':'idle','holding-right':'idle','holding-left':'idle','holding-both':'idle','holding-right-shoot':'punch','holding-left-shoot':'punch','holding-both-shoot':'punch'};
  let current:THREE.AnimationAction|null=null,currentName='idle',disposed=false;
  const play=(name:string)=>{const canonical=(aliases[name]??name).toLowerCase();const clip=clips.get(canonical)??clips.get('idle')??source.animations[0];if(!clip)return;const action=mixer.clipAction(clip);if(action===current)return;currentName=name;const once=['jump','death','punch'].includes(canonical)||name==='pick-up';action.reset().setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);action.clampWhenFinished=once;action.play();if(current)current.crossFadeTo(action,.15,false);current=action;};
  play('idle');mixer.update(0);object.updateMatrixWorld(true);
  const bodyBounds = new THREE.Box3().setFromObject(object);
  if(outfit) {
    try { await attachBlockyOutfit(object,outfit,a,load,extraOutfitMaterials,geometries); }
    catch {
      // Keep the supplied character visible if an outfit cannot be downloaded.
      for(const [mesh,original] of originalBodies){geometries.delete(mesh.geometry);mesh.geometry.dispose();mesh.geometry=original;}
      object.userData.outfitUnavailable=outfit.id;
    }
  }
  const head=bone(object,'Head'),hand=bone(object,'RightHand');
  const extraMaterials=new Set<THREE.Material>();
  if(head){
    const hat=a.hat==='hat-none'?null:hat3d(a.hat,outfitColours(a).top);if(hat){hat.scale.setScalar(.36);hat.position.set(0,.12,0);hat.name='avatar-headwear';head.add(hat);hat.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){geometries.add(m.geometry);const mats=Array.isArray(m.material)?m.material:[m.material];mats.forEach(x=>extraMaterials.add(x));}});}
    const glasses=eyewear3d(a.face,'#1b1622');if(glasses){glasses.scale.setScalar(.3);glasses.position.set(0,.02,.14);glasses.name='avatar-eyewear';head.add(glasses);glasses.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){geometries.add(m.geometry);const mats=Array.isArray(m.material)?m.material:[m.material];mats.forEach(x=>extraMaterials.add(x));}});}
  }
  const held=held3d(a.held);if(held&&hand){held.scale.setScalar(.2);held.position.set(0,-.07,.04);held.name='avatar-held-item';hand.add(held);held.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){geometries.add(m.geometry);const mats=Array.isArray(m.material)?m.material:[m.material];mats.forEach(x=>extraMaterials.add(x));}});}
  // An actual trailing cape follows the character's upper spine.
  if(a.cape!=='cape-none'||a.top.startsWith('top-cape')){
    const spine=bone(object,'Spine2')??bone(object,'Spine');
    if(spine){const shape=new THREE.Shape();shape.moveTo(-.22,.16);shape.lineTo(.22,.16);shape.lineTo(.34,-.46);shape.lineTo(0,-.68);shape.lineTo(-.34,-.46);shape.closePath();const color=cosmeticById(a.cape)?.color??outfitColours(a).top;const material=new THREE.MeshStandardMaterial({color,roughness:.9,side:THREE.DoubleSide});const cape=new THREE.Mesh(new THREE.ShapeGeometry(shape),material);cape.name='avatar-cape';cape.position.set(0,-.08,-.13);cape.castShadow=true;spine.add(cape);geometries.add(cape.geometry);extraMaterials.add(material);}
  }
  const brand=BRANDS[a.brand],employer=workplaceLogo ? logoFor(workplaceLogo) : null,chest=bone(object,'Spine2')??bone(object,'Spine');
  if((brand||employer)&&chest){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
    const ctx=canvas.getContext('2d')!;
    if(employer){
      ctx.translate(64,0);ctx.scale(2,2);ctx.fillStyle=employer.bg;ctx.beginPath();ctx.roundRect(0,0,64,64,12);ctx.fill();
      for(const shape of employer.shapes) if(shape.fill!=='none'){ctx.fillStyle=shape.fill;ctx.fill(new Path2D(shape.d));}
    } else if(brand) {
      ctx.fillStyle=brand.bg;ctx.beginPath();ctx.roundRect(0,0,256,128,brand.shape==='square'?12:64);ctx.fill();ctx.fillStyle=brand.fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 54px system-ui';ctx.fillText(brand.text,128,66);
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const badge=new THREE.Mesh(new THREE.PlaneGeometry(.2,.1),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));badge.position.set(.1,-.05,.18);badge.name=employer?'uniform-workplace-logo':'avatar-brand-badge';chest.add(badge);geometries.add(badge.geometry);extraMaterials.add(badge.material);(badge.material as THREE.MeshBasicMaterial).userData.generatedTexture=texture;
  }
  const targetHeight=height*.9;
  const scale=targetHeight/Math.max(.01,bodyBounds.max.y-bodyBounds.min.y);object.scale.setScalar(scale);object.position.y=-bodyBounds.min.y*scale;
  const holder=new THREE.Group();holder.userData.characterModel=model.file;holder.add(object);
  const pet=pet3d(a.pet);if(pet){pet.scale.setScalar(targetHeight/1.15);pet.position.set(targetHeight*.5,0,-targetHeight*.15);holder.add(pet);pet.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){geometries.add(m.geometry);(Array.isArray(m.material)?m.material:[m.material]).forEach(x=>extraMaterials.add(x));}});}
  return{object:holder,mixer,play,update:(dt,reduced=false)=>{if(!disposed)mixer.update(reduced&&currentName==='idle'?0:Math.min(.1,Math.max(0,dt)));},dispose:()=>{if(disposed)return;disposed=true;mixer.stopAllAction();mixer.uncacheRoot(object);skeletons.forEach(s=>s.dispose());materials.forEach(m=>m.dispose());extraOutfitMaterials.forEach(m=>m.dispose());generatedTextures.forEach(t=>t.dispose());extraMaterials.forEach(m=>{const mtl=m as THREE.Material&{userData?:Record<string,unknown>};const texture=mtl.userData?.generatedTexture as THREE.Texture|undefined;texture?.dispose();m.dispose();});geometries.forEach(g=>g.dispose());holder.removeFromParent();holder.clear();}};
}

/** Recolour only palette swatches predominantly used by each skinned body region. */
function blockyOutfitTexture(mesh:THREE.SkinnedMesh,source:THREE.Texture,a:Avatar,uniform=false):THREE.Texture|null{
  const image=source.image as CanvasImageSource&{width?:number;height?:number};
  const width=image.width??0,height=image.height??0;if(!width||!height)return null;
  const uv=mesh.geometry.getAttribute('uv'),joints=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');
  const index=mesh.geometry.index;if(!uv||!joints||!weights||!index)return null;
  const boneKinds=mesh.skeleton.bones.map(b=>{const n=b.name.toLowerCase();return /head|neck|hand/.test(n)?'skin':/spine|arm|shoulder/.test(n)?'top':/upleg|leg/.test(n)?'bottom':/foot|toe/.test(n)?'shoes':null;});
  const counts=new Map<string,Record<string,number>>();
  for(let tri=0;tri<index.count;tri+=3){const votes:Record<string,number>={top:0,bottom:0,shoes:0,skin:0};let u=0,v=0;
    for(let corner=0;corner<3;corner++){const vi=index.getX(tri+corner);u+=uv.getX(vi);v+=uv.getY(vi);for(let k=0;k<4;k++){const kind=boneKinds[joints.getComponent(vi,k)];if(kind)votes[kind]+=weights.getComponent(vi,k);}}
    const cell=`${Math.min(15,Math.floor(u/3*16))},${Math.min(15,Math.floor(v/3*16))}`;
    const kind=Object.entries(votes).sort((x,y)=>y[1]-x[1])[0][0] as keyof typeof votes;const row=counts.get(cell)??{top:0,bottom:0,shoes:0,skin:0};row[kind]++;counts.set(cell,row);
  }
  const cells=new Map<string,string>();const colours=outfitColours(a);
  for(const [cell,row] of counts) {
    const ranked=Object.entries(row).sort((x,y)=>y[1]-x[1]);
    const kind=ranked[0][0];
    if(kind==='skin' || ranked[0][1]<4 || ranked[0][1]<=ranked[1][1]*1.35) continue;
    const piece=kind as 'top'|'bottom'|'shoes';
    if(uniform || !a[`${piece}Color`].endsWith('-auto')) cells.set(cell,colours[piece]);
  }
  if(!cells.size)return null;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)return null;ctx.drawImage(image,0,0,width,height);
  for(const[cell,colour]of cells){const [cx,cy]=cell.split(',').map(Number);ctx.fillStyle=colour;ctx.fillRect(Math.floor(cx*width/16),Math.floor((15-cy)*height/16),Math.ceil(width/16),Math.ceil(height/16));}
  const texture=source.clone();texture.image=canvas;texture.needsUpdate=true;return texture;
}


/** Players, portraits, residents and legacy avatar fallbacks share this supplied rig. */
export async function buildCharacter(avatar: Avatar, height=1.15, workplaceLogo:string|null=null):Promise<Character3D>{
  const a = look(avatar);
  return buildBlockyCharacter(a, height, workplaceLogo, adventurerFor(a.head));
}
export const npcLook=(i:number)=>look({head:ADVENTURERS[((i%ADVENTURERS.length)+ADVENTURERS.length)%ADVENTURERS.length].id,topColor:'topcol-auto',bottomColor:'botcol-auto',shoesColor:'shoecol-auto'});
