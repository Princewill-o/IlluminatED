import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { projectData } from "../scripts/lib/project-data.mjs";

const { DEFAULT_AVATAR } = projectData("src/game/core/cosmetics.ts");
const { uniformFor } = projectData("src/game/core/careers.ts");

test("a supplied work top does not inherit a personal dye or change saved clothing", () => {
  const personal = { ...DEFAULT_AVATAR, top: "top-tee", topColor: "topcol-pink", bottomColor: "botcol-teal", shoesColor: "shoecol-red" };
  const dressed = uniformFor({ workplace: "st-plasters", role: "hca" }, personal);
  assert.equal(dressed.top, "top-labcoat");
  assert.equal(dressed.topColor, "topcol-auto");
  assert.equal(dressed.bottomColor, "botcol-teal");
  assert.equal(dressed.shoesColor, "shoecol-red");
  assert.equal(personal.topColor, "topcol-pink");
  assert.equal(personal.top, "top-tee");
  assert.equal(uniformFor(null, personal), personal);
});

test("uniform dye resets are limited to replaced garments and allow an explicit uniform colour", () => {
  const { applyUniform } = projectData("src/game/core/outfits.ts");
  const personal = { ...DEFAULT_AVATAR, topColor: "topcol-pink", bottomColor: "botcol-teal", shoesColor: "shoecol-red" };
  const dressed = applyUniform(personal, { bottom: "bottom-smart", shoes: "shoes-smart", top: "top-polo", topColor: "topcol-blue" });
  assert.equal(dressed.topColor, "topcol-blue");
  assert.equal(dressed.bottomColor, "botcol-auto");
  assert.equal(dressed.shoesColor, "shoecol-auto");
  assert.equal(applyUniform(personal, { hat: "hat-cap" }).topColor, "topcol-pink");
});

test("outfit colours and source shapes independently follow every selected slot", () => {
  const { outfitColours, outfitVariants } = projectData("src/game/core/outfits.ts");
  const a = { ...DEFAULT_AVATAR, top: "top-labcoat", bottom: "bottom-skirt", shoes: "shoes-boots", topColor: "topcol-orange" };
  const cols = outfitColours(a);
  assert.equal(cols.top, "#e98a1f");
  assert.equal(cols.bottom, "#2d1b69");
  assert.equal(cols.shoes, "#5a3824");
  const variants = outfitVariants(a);
  assert.equal(variants.top, "female-d");
  assert.equal(variants.bottom, "female-c");
  assert.equal(variants.shoes, "male-c");
});

test("warm fabric texels are distinct from the Kenney skin palette", () => {
  const { isSkinTexel } = projectData("src/game/core/outfits.ts");
  assert.equal(isSkinTexel(5.5 / 16, 2.5 / 4), false, "orange shirt is fabric");
  assert.equal(isSkinTexel(7.5 / 16, 2.5 / 4), false, "red shirt is fabric");
  assert.equal(isSkinTexel(13.5 / 16, 3.5 / 4), true, "hand/neck palette is skin");
  assert.equal(isSkinTexel(9.5 / 16, 3.5 / 4), false, "dark printed details are recolourable fabric");
});

test("garment clipping shares exact seams with no overlapping torso or missing crossing triangles", () => {
  const { bodyBand, clipOutfitTriangle } = projectData("src/game/core/outfits.ts");
  const top = bodyBand("top"), bottom = bodyBand("bottom"), shoes = bodyBand("shoes");
  assert.equal(top.min, bottom.max);
  assert.equal(bottom.min, shoes.max);
  const points = [[0,0.15,0],[1,0.21,0],[0,0.21,1]];
  let pieces = 0;
  for (const region of ["top", "bottom"]) {
    const band = bodyBand(region);
    const triangles = clipOutfitTriangle(points, band);
    assert.ok(triangles.length > 0, `${region} keeps its side of a crossing triangle`);
    for (const triangle of triangles) for (const weights of triangle) {
      assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-8);
      const y = weights.reduce((sum,w,i)=>sum+w*points[i][1],0);
      assert.ok(y>=band.min-1e-8 && y<=band.max+1e-8, `${region} stays in its own band`);
    }
    pieces += triangles.length;
  }
  assert.equal(pieces,3,"crossing triangle split into one triangle and a two-triangle quad");
  assert.equal(clipOutfitTriangle([[0,.3,0],[1,.3,0],[0,.32,1]],bottom).length,0);
});


test("every shipped body variant supports the same outfit rig and all three garment bands", () => {
  const { bodyBand, clipOutfitTriangle } = projectData("src/game/core/outfits.ts");
  const { TOP_LOOK, BOTTOM_LOOK, SHOES_LOOK } = projectData("src/game/core/looks.ts");
  const variants = new Set([...Object.values(TOP_LOOK), ...Object.values(BOTTOM_LOOK), ...Object.values(SHOES_LOOK)]);
  const sizes = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  for (const variant of variants) {
    const buffer = fs.readFileSync(`public/world3d/chars/character-${variant}.glb`);
    const jsonLength = buffer.readUInt32LE(12);
    const model = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString());
    const binary = buffer.subarray(28 + jsonLength);
    const attribute = (index) => {
      const accessor = model.accessors[index], view = model.bufferViews[accessor.bufferView];
      const Type = accessor.componentType === 5126 ? Float32Array : Uint16Array;
      return new Type(binary.buffer, binary.byteOffset + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0), accessor.count * sizes[accessor.type]);
    };
    const body = model.nodes.find((node) => node.name === "body-mesh");
    const joints = model.skins[body.skin].joints.map((index) => model.nodes[index].name);
    assert.equal([...joints].sort().join(), "arm-left,arm-right,head,leg-left,leg-right,root,torso", `${variant} uses the common rig`);
    const primitive = model.meshes[body.mesh].primitives[0];
    const positions = attribute(primitive.attributes.POSITION);
    const indices = attribute(primitive.indices);
    const counts = { top: 0, bottom: 0, shoes: 0 };
    for (let i = 0; i < indices.length; i += 3) {
      const points = [indices[i], indices[i + 1], indices[i + 2]].map((j) => [positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]]);
      for (const piece of Object.keys(counts)) counts[piece] += clipOutfitTriangle(points, bodyBand(piece)).length;
    }
    for (const [piece, count] of Object.entries(counts)) assert.ok(count > 0, `${variant} has usable ${piece} geometry`);
  }
});

test("garments cover source bare waist/chest and long trousers cover leg patches", () => {
  const { garmentSurface } = projectData("src/game/core/outfits.ts");
  assert.equal(garmentSurface("top", "torso", true, "top-hoodie", .20), "top");
  assert.equal(garmentSurface("top", "torso", true, "top-tee", .19), "top");
  assert.equal(garmentSurface("top", "arm-left", true, "top-tee", .27), "skin");
  assert.equal(garmentSurface("bottom", "leg-left", true, "bottom-jeans", .08), "bottom");
  assert.equal(garmentSurface("bottom", "leg-left", false, "bottom-skirt", .08), "skin");
  assert.equal(garmentSurface("bottom", "leg-left", true, "bottom-shorts", .15), "bottom");
  assert.equal(garmentSurface("bottom", "leg-left", false, "bottom-shorts", .08), "skin");
});
