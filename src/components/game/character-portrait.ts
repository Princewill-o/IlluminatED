"use client";
import * as THREE from "three";
import { blockyThumbnail } from "@/game/core/adventurers";
import { buildCharacter } from "./char3d";
import type { Avatar } from "@/game/core/cosmetics";

/** All small avatars share one offscreen WebGL context instead of one GPU context per icon. */
let renderer:THREE.WebGLRenderer|null=null;
let queue:Promise<unknown>=Promise.resolve();
const cache=new Map<string,Promise<HTMLCanvasElement>>();
export function characterPortrait(avatar:Avatar,facing="S",headOnly=false,logo:string|null=null):Promise<HTMLCanvasElement>{
 const key=JSON.stringify([avatar,facing,headOnly,logo]);const existing=cache.get(key);if(existing)return existing;
 const task=queue.then(async()=>{
  try {
  if(!renderer){renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setSize(192,256);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;}
  const char=await buildCharacter(avatar,1.25,logo);
  try{const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#ffffff','#b8bfd1',2));const light=new THREE.DirectionalLight('#fff5e6',2);light.position.set(2,4,5);scene.add(light);scene.add(char.object);char.object.rotation.y={S:0,N:Math.PI,E:Math.PI/2,W:-Math.PI/2}[facing]??0;char.update(.3);const camera=new THREE.PerspectiveCamera(headOnly?22:28,192/256,.01,20);camera.position.set(0,headOnly?1.07:.8,headOnly?2.2:3.6);camera.lookAt(0,headOnly?1.02:.63,0);renderer.render(scene,camera);const canvas=document.createElement('canvas');canvas.width=192;canvas.height=256;canvas.getContext('2d')!.drawImage(renderer.domElement,0,0);return canvas;}finally{char.dispose();}
  } catch {
    const canvas=document.createElement('canvas');canvas.width=192;canvas.height=256;
    const image=new Image();image.src=blockyThumbnail(avatar.head);
    await image.decode();canvas.getContext('2d')!.drawImage(image,0,0,192,256);return canvas;
  }
 });
 queue=task.catch(()=>{});cache.set(key,task);task.catch(()=>cache.delete(key));if(cache.size>128)cache.delete(cache.keys().next().value!);return task;
}
