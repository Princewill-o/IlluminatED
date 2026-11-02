import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { projectData } from "../scripts/lib/project-data.mjs";

const { CHARACTER_STYLES, stylesForCharacter, applyCharacterStyle, characterArchetype } = projectData("src/game/core/character-styles.ts");
const { ADVENTURERS } = projectData("src/game/core/adventurers.ts");
const { DEFAULT_AVATAR, cosmeticById, isFree, sanitiseAvatar } = projectData("src/game/core/cosmetics.ts");
const { blockyOutfitFor } = projectData("src/game/core/blocky-outfits.ts");
const { BLOCKY_OUTFITS } = projectData("src/game/core/blocky-outfits.ts");

test("all garment families contain original stitched seams and purpose-made design detail attached to the rig", () => {
  for (const outfit of BLOCKY_OUTFITS) {
    const bytes = fs.readFileSync(`public/world3d/blocky-outfits/${outfit.file}`);
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
    const details = gltf.nodes.filter(node => node.extras?.wearPart?.startsWith("design-"));
    assert.ok(details.length >= 8, `${outfit.id}: original seam/panel geometry`);
    assert.ok(details.some(node => node.extras.wearPart.includes(outfit.family)), `${outfit.id}: family-specific design`);
    for (const node of details) assert.ok(node.extras.wearBone, `${outfit.id}: articulated design detail`);
  }
});

test("24 coordinated designs use actual free garments and accessories without unlock bypasses", () => {
  assert.equal(CHARACTER_STYLES.length, 24);
  assert.equal(new Set(CHARACTER_STYLES.map(style => style.id)).size, 24);
  assert.equal(new Set(CHARACTER_STYLES.map(style => style.wear.top)).size, 24);
  assert.deepEqual([...new Set(CHARACTER_STYLES.map(style => style.collection))].sort(), ["Kent", "London", "Nottingham", "Road crew", "Signature"]);
  for (const style of CHARACTER_STYLES) {
    assert.ok(style.name && style.description && style.archetypes.length);
    assert.ok(blockyOutfitFor(style.wear.top), style.id);
    for (const [slot, id] of Object.entries(style.wear)) {
      const item = cosmeticById(id);
      assert.equal(item?.slot, slot, `${style.id}: ${slot}`);
      assert.ok(isFree(item), `${style.id}: ${id} is free without an unlock`);
    }
  }
});

test("every supplied and Blender character has recommendations and access to every design", () => {
  for (const character of ADVENTURERS) {
    const styles = stylesForCharacter(character.id);
    assert.equal(styles.length, CHARACTER_STYLES.length);
    const archetype = characterArchetype(character.id);
    assert.ok(styles[0].archetypes.includes(archetype), character.id);
    const classic = character.id.replace("head-blocky-", "head-blocky-classic-").replace("classic-classic-", "classic-");
    assert.deepEqual(styles.map(style => style.id), stylesForCharacter(classic).map(style => style.id));
  }
});

test("trying a look preserves character, face, skin, hair and companion, keeps the saved object unchanged, and is valid for saving", () => {
  const identity = ["head", "skin", "eyes", "brows", "mouth", "extras", "hair", "hairColor", "pet"];
  for (const character of ADVENTURERS) {
    const avatar = { ...DEFAULT_AVATAR, head: character.id, skin: "skin-8", hairColor: "haircol-ginger" };
    const before = JSON.stringify(avatar);
    for (const style of CHARACTER_STYLES) {
      const result = applyCharacterStyle(avatar, style.id);
      for (const key of identity) assert.equal(result[key], avatar[key], `${character.id}: ${style.id}: ${key}`);
      assert.equal(result.topColor, "topcol-auto");
      assert.equal(result.bottomColor, "botcol-auto");
      assert.equal(result.shoesColor, "shoecol-auto");
      assert.equal(JSON.stringify(sanitiseAvatar(result, new Set())), JSON.stringify(result));
      assert.equal(JSON.stringify(avatar), before);
    }
  }
  assert.equal(JSON.stringify(applyCharacterStyle(DEFAULT_AVATAR, "missing-style")), JSON.stringify(DEFAULT_AVATAR));
});
