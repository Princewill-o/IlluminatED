import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { projectData } from "../scripts/lib/project-data.mjs";

const { kitLook, residentLook, characterPreset, CREATIVE_KIT } = projectData("src/game/core/creative-looks.ts");
const { look, COSMETICS } = projectData("src/game/core/cosmetics.ts");
const { BLOCKY_OUTFITS } = projectData("src/game/core/blocky-outfits.ts");
const { ADVENTURERS } = projectData("src/game/core/adventurers.ts");

const glb = fs.readFileSync(`public${CREATIVE_KIT}`);
const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)));
const meshes = new Set(json.nodes.filter((n) => n.mesh !== undefined).map((n) => n.name));

test("the character kit has everyday animations only: no fighting, hits or deaths", () => {
  const clips = json.animations.map((a) => a.name);
  for (const clip of ["idle", "walk", "run", "jump", "look", "relaxed", "climb"]) assert.ok(clips.includes(clip), clip);
  for (const clip of clips) assert.doesNotMatch(clip, /attack|punch|kick|hit|death|block|sword/i);
  assert.equal(json.skins.length > 0, true);
});

test("every Locker top, bottom, pair of shoes and hairstyle maps to a piece in the kit", () => {
  const avatars = [
    ...COSMETICS.filter((c) => c.slot === "top").map((c) => ({ top: c.id })),
    ...COSMETICS.filter((c) => c.slot === "bottom").map((c) => ({ bottom: c.id })),
    ...COSMETICS.filter((c) => c.slot === "shoes").map((c) => ({ shoes: c.id })),
    ...COSMETICS.filter((c) => c.slot === "hair").map((c) => ({ hair: c.id })),
    ...COSMETICS.filter((c) => c.slot === "head").map((c) => ({ head: c.id })),
  ];
  for (const partial of avatars) {
    const k = kitLook(look(partial));
    for (const piece of [k.face, k.top.mesh, k.bottom.mesh, k.shoes.mesh, k.hair, k.kitHat, k.kitGlasses, k.moustache].filter(Boolean)) assert.ok(meshes.has(piece), `${JSON.stringify(partial)} → ${piece}`);
    for (const colour of [k.skin, k.top.colour, k.bottom.colour, k.shoes.colour, k.hairColour]) assert.match(colour, /^#[0-9a-f]{6}$/i);
  }
});

test("hero suits are one colour with trim gloves and an emblem; helmets cover the hair", () => {
  const k = kitLook(look({ top: "top-hero-photon" }));
  assert.equal(k.top.colour, k.bottom.colour);
  assert.ok(k.gloves && k.emblem);
  assert.equal(k.kitHat, "Hat_057");
  assert.equal(k.hair, null);
});

test("residents vary, and every Locker character and outfit has a rendered picture", () => {
  const looks = new Set(Array.from({ length: 24 }, (_, i) => JSON.stringify(kitLook(look(residentLook(i))))));
  assert.ok(looks.size >= 20, `only ${looks.size} distinct residents`);
  for (const m of ADVENTURERS) assert.ok(fs.existsSync(`public/world3d/creative-characters/thumbs/${m.id}.webp`), m.id);
  for (const o of BLOCKY_OUTFITS) assert.ok(fs.existsSync(`public/world3d/creative-characters/thumbs/${o.id}.webp`), o.id);
  // Picking a character only applies free skin, hair and colours.
  for (const m of ADVENTURERS) for (const [slot, id] of Object.entries(characterPreset(m.id))) {
    const item = COSMETICS.find((c) => c.id === id);
    if (slot !== "top" && item) assert.ok(item.price === 0 && !item.unlock, `${m.id} ${slot} ${id}`);
  }
});

test("the curvier build is a shape on every piece, so all clothes still fit", () => {
  const shaped = json.meshes.filter((m) => (m.extras?.targetNames ?? []).includes("female")).length;
  assert.ok(shaped >= json.meshes.length - 2, `${shaped}/${json.meshes.length} pieces have the female shape`);
  for (const piece of ["Hair_long", "Hair_bob", "Skirt"]) assert.ok(meshes.has(piece), piece);
  const k = kitLook(look({ body: "body-2", hair: "hair-long", top: "top-dress" }));
  assert.equal(k.female, true);
  assert.equal(k.hair, "Hair_long");
  assert.equal(k.bottom.mesh, "Skirt");
  assert.equal(k.bottom.colour, k.top.colour);
  const residents = Array.from({ length: 20 }, (_, i) => look(residentLook(i)));
  assert.ok(residents.filter((r) => r.body === "body-2").length >= 8);
});

test("outfit presets only use free pieces and each has a picture", () => {
  const { CHARACTER_STYLES } = projectData("src/game/core/character-styles.ts");
  assert.ok(CHARACTER_STYLES.length >= 20);
  for (const style of CHARACTER_STYLES) {
    for (const id of Object.values(style.wear)) {
      const item = COSMETICS.find((c) => c.id === id);
      assert.ok(item, `${style.id}: ${id}`);
      assert.ok(item.price === 0 && !item.unlock, `${style.id}: ${id} is not free`);
    }
    assert.ok(fs.existsSync(`public/world3d/creative-characters/thumbs/look-${style.id}.webp`), style.id);
  }
});
