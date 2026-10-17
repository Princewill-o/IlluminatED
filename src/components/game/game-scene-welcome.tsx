"use client";
import {useState} from "react";

import {usePathname} from "next/navigation";

import {SceneIntro} from "./world/scene-intro";
const SCENES=[[/^\/games\/arcade/,"Games Hall","A thoughtful break. Choose a game and play fairly."],[/^\/games\/promotion-panic/,"Your next promotion","Read carefully, practise your subjects and build your skills."],[/^\/games\/careers/,"Your working life","Choose a role, practise real-world decisions and build simulated experience."],[/^\/games\/home/,"Make yourself at home","Recharge, furnish your space and plan your next chapter."]] as const;
export function GameSceneWelcome(){const path=usePathname(),[seen,setSeen]=useState<string|null>(null);const scene=SCENES.find(([match])=>match.test(path));if(!scene||seen===path)return null;return <div className="fixed inset-0 z-[100009]"><SceneIntro key={path} title={scene[1]} subtitle={scene[2]} onDone={()=>setSeen(path)}/></div>;}
