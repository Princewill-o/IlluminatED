"use client";

import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import { buildCreativeCharacter, type Character3D } from "./creative-character";

import { look, type Avatar } from "@/game/core/cosmetics";
import { residentLook } from "@/game/core/creative-looks";
import { outfitColours } from "@/game/core/outfits";

export type { Character3D } from "./creative-character";

const loader = new GLTFLoader();
const models = new Map<string, Promise<GLTF>>();
function load(url: string) {
  let result = models.get(url);
  if (!result) { result = loader.loadAsync(url).catch((error) => { models.delete(url); throw error; }); models.set(url, result); }
  return result;
}
export const avatarColours = outfitColours;

/**
 * Players, portraits, residents and passengers are all built from the creative character kit:
 * one rigged body dressed in the avatar's clothes, hair and skin tone.
 * `outfit: false` (distant residents) still dresses them, but skips hats, held items and pets.
 */
export async function buildCharacter(avatar: Avatar, height = 1.15, workplaceLogo: string | null = null, options: { outfit?: boolean } = {}): Promise<Character3D> {
  return buildCreativeCharacter(look(avatar), height, workplaceLogo, load, options.outfit !== false);
}

/** Everyday residents: varied skin tones, hair and city clothes. No costumes, no uniforms unless on duty. */
export const npcLook = (i: number) => look(residentLook(i));
