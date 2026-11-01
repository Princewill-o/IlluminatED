"use client";

import { useEffect, useRef, useState } from "react";
import { HeartPulse } from "lucide-react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { buildCharacter, npcLook, type Character3D } from "../char3d";
import { createEmergencyVehicle } from "./emergency-vehicle3d";
import { rescueFrame, rescuePatientPose, RESCUE_DURATION_MS, type RescuePhase } from "@/game/core/rescue";
import type { Avatar } from "@/game/core/cosmetics";

const MESSAGES: Record<RescuePhase,string> = {
  downed: "You collapsed. Help is on its way.",
  approaching: "The ambulance is arriving.",
  loading: "Paramedics are helping you onto the stretcher.",
  departing: "You are travelling to St Tomas' Hospital.",
  arrived: "Arriving at the hospital.",
};

/** A complete rescue runs before the hospital transition; network failures cannot strand it. */
export function AmbulanceRescue({ avatar, onArrive }: { avatar: Avatar; onArrive: () => void }) {
  const host=useRef<HTMLDivElement>(null);
  const finish=useRef(onArrive);finish.current=onArrive;
  const arrived=useRef(false);
  const wallDeadline=useRef(0);
  if (!wallDeadline.current) wallDeadline.current=Date.now()+5000+RESCUE_DURATION_MS+300;
  const [phase,setPhase]=useState<RescuePhase>("downed");
  const [fallback,setFallback]=useState(false);

  useEffect(()=>{
    const element=host.current;if(!element)return;
    let alive=true,raf=0,renderer:THREE.WebGLRenderer|null=null,observer:ResizeObserver|null=null;
    let vehicle: Awaited<ReturnType<typeof createEmergencyVehicle>> | null=null;
    let readyAt:number|null=null,last=performance.now(),lastRendered=0,currentPhase:RescuePhase="downed",rearOffset=-3.12;
    const characters:Character3D[]=[];
    const disposables:THREE.Object3D[]=[];
    const scene=new THREE.Scene();scene.background=new THREE.Color("#bdccd0");scene.fog=new THREE.Fog("#bdccd0",24,60);
    const camera=new THREE.PerspectiveCamera(42,1,.1,80);camera.position.set(-6,4.3,9);camera.lookAt(-.5,.7,0);
    let player:Character3D|null=null;const medics:Character3D[]=[];
    const start=()=>{if(alive&&readyAt===null)readyAt=performance.now();};
    const complete=()=>{if(!alive||arrived.current)return;arrived.current=true;finish.current();};
    // Includes a bounded asset-loading budget, then the full fifteen-second trip.
    const loadBudget=window.setTimeout(start,5000);
    const hardStop=window.setTimeout(complete,Math.max(0,wallDeadline.current-Date.now()));
    const material=(colour:string)=>new THREE.MeshStandardMaterial({color:colour,roughness:.86});
    const block=(parent:THREE.Object3D,colour:string,x:number,y:number,z:number,w:number,h:number,d:number)=>{
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(colour));mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
    };
    const ground=new THREE.Group();scene.add(ground);disposables.push(ground);
    block(ground,"#475961",0,-.12,0,80,.2,12);
    block(ground,"#d8d3c3",0,-.04,-4.7,80,.18,3);
    for(let x=-35;x<35;x+=4)block(ground,"#e9ddaf",x,.001,1.8,1.8,.02,.13);
    for(const x of [-12,-6,6,12]){
      block(ground,x%12===0?"#bccebf":"#d0c4b3",x,3.6,-7,4.3,7.2,3);
      for(let y=1;y<6;y+=1.6)for(const offset of [-1,1])block(ground,"#75949c",x+offset,y,-5.47,.8,.95,.06);
    }
    const stretcher=new THREE.Group();scene.add(stretcher);disposables.push(stretcher);
    block(stretcher,"#c2ced0",0,.48,0,1.45,.1,.55);block(stretcher,"#397f76",0,.59,0,1.35,.12,.5);
    for(const x of [-.5,.5])for(const z of [-.23,.23]){
      block(stretcher,"#95a9ac",x,.28,z,.045,.45,.045);
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.055,12),material("#253c40"));wheel.rotation.x=Math.PI/2;wheel.position.set(x,.08,z);stretcher.add(wheel);
    }
    stretcher.visible=false;
    scene.add(new THREE.HemisphereLight("#fff6e5","#748a87",2.2));const sun=new THREE.DirectionalLight("#fff4df",2);sun.position.set(-5,12,8);sun.castShadow=true;scene.add(sun);
    const paramedic={top:"top-blocky-paramedic-emerald",topColor:"topcol-auto",bottomColor:"botcol-auto",shoesColor:"shoecol-auto",hat:"hat-none",cape:"cape-none"} as const;
    const tasks:Promise<unknown>[]=[];
    tasks.push(buildCharacter({...avatar,pet:"pet-none",held:"held-none"},1.15).then(character=>{
      if(!alive){character.dispose();return;}player=character;characters.push(character);scene.add(character.object);character.play("idle");
    }).catch(()=>{}));
    for(let index=0;index<2;index++)tasks.push(buildCharacter({...npcLook(index+4),...paramedic,head:index?"head-blocky-classic-hero":"head-blocky-hero",pet:"pet-none",held:"held-none"},1.12).then(character=>{
      if(!alive){character.dispose();return;}medics.push(character);characters.push(character);scene.add(character.object);character.play("idle");
    }).catch(()=>{}));
    const loader=new GLTFLoader();
    tasks.push(createEmergencyVehicle("ambulance",url=>loader.loadAsync(url),()=>{}).then(value=>{
      if(!alive){value.dispose();return;}vehicle=value;vehicle.root.scale.setScalar(1.3);vehicle.root.updateMatrixWorld(true);rearOffset=new THREE.Box3().setFromObject(vehicle.root).min.x;scene.add(vehicle.root);
    }).catch(()=>{if(alive)setFallback(true);}));
    void Promise.allSettled(tasks).then(start);
    try {
      renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;renderer.shadowMap.enabled=true;element.appendChild(renderer.domElement);
      const fit=()=>{if(!renderer)return;renderer.setSize(element.clientWidth,element.clientHeight);camera.aspect=element.clientWidth/Math.max(1,element.clientHeight);camera.updateProjectionMatrix();};fit();observer=new ResizeObserver(fit);observer.observe(element);
    }catch{setFallback(true);start();}
    const frame=(now:number)=>{
      if(!alive)return;
      if(Date.now()>=wallDeadline.current){complete();return;}
      const dt=Math.min(.05,(now-last)/1000);last=now;
      const elapsed=readyAt===null?0:now-readyAt,state=rescueFrame(elapsed);
      if(state.phase!==currentPhase){currentPhase=state.phase;setPhase(currentPhase);}
      const vanX=state.ambulanceX;
      if(vehicle){vehicle.root.position.set(vanX,.02,-.35);vehicle.openRearDoors(state.doors);vehicle.update(now/1000);}
      const rearX=vanX+rearOffset;
      const {patientX,patientY,stretcherX,stretcherY}=rescuePatientPose(state,rearX);
      if(player){
        player.object.visible=!state.playerInAmbulance;
        player.object.rotation.set(0,0,-Math.PI/2);player.object.position.set(patientX-.45,patientY,.1);
      }
      stretcher.visible=state.stretcherVisible;stretcher.position.set(stretcherX,stretcherY,.1);
      medics.forEach((character,index)=>{
        character.object.visible=state.crewVisible;
        const z=index?-.65:.8,walking=elapsed<7900||elapsed>9800;
        const walk=THREE.MathUtils.clamp((elapsed-6500)/1400,0,1);
        const x=THREE.MathUtils.lerp(rearX+.4,-2.4,walk)+state.loading*1.05;
        character.object.position.set(x,0,z);character.object.rotation.y=index?Math.PI:0;character.play(walking?"walk":"idle");
      });
      for(const character of characters)character.update(dt);
      if(state.phase==="departing"){camera.position.x=THREE.MathUtils.lerp(-6,1,state.depart);camera.lookAt(vanX*.35,.9,0);}
      if(now-lastRendered>=1000/30){renderer?.render(scene,camera);lastRendered=now;}
      if(state.complete){complete();return;}
      raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);
    return ()=>{
      alive=false;window.clearTimeout(loadBudget);window.clearTimeout(hardStop);cancelAnimationFrame(raf);observer?.disconnect();
      characters.forEach(character=>character.dispose());vehicle?.dispose();
      for(const object of disposables)object.traverse(child=>{const mesh=child as THREE.Mesh;if(!mesh.isMesh)return;mesh.geometry.dispose();for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.dispose();});
      renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();scene.clear();
    };
    // One rescue instance owns one full sequence and releases its listeners/resources on exit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  return <div className="fixed inset-0 z-[100030] overflow-hidden bg-[#9eafb6] text-white" role="status" aria-live="polite">
    <div ref={host} className="absolute inset-0" aria-hidden/>
    <div className="absolute left-1/2 top-8 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-[#f7f1e6] px-5 py-3 text-[#17524b] shadow-xl"><HeartPulse className="size-7"/><div><p className="text-xs font-black uppercase tracking-widest">St Tomas' Ambulance</p><p className="text-sm font-bold">Care and recovery</p></div></div>
    <div className="absolute inset-x-4 bottom-8 mx-auto max-w-xl rounded-3xl bg-[#102d31]/95 p-5 text-center shadow-xl"><p className="text-xl font-black">{MESSAGES[phase]}</p><p className="mt-2 text-sm text-white/75">{fallback?"The rescue team is on its way. Your hospital transfer will complete shortly.":"You will recover after the paramedics take you to hospital."}</p></div>
  </div>;
}
