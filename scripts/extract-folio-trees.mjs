// Offline asset conversion only. The source is pinned in the asset manifest.
// Usage: node scripts/extract-folio-trees.mjs <folio-checkout> <draco3dgltf-package>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const [source, decoderPath] = process.argv.slice(2);
if (!source || !decoderPath)
  throw new Error(
    "Provide the folio checkout and draco3dgltf package directory.",
  );
const require = createRequire(import.meta.url);
const draco = await require(path.resolve(decoderPath)).createDecoderModule();
const trees = {};
for (const kind of ["birch", "cherry"]) {
  const bytes = fs.readFileSync(
    path.join(source, `static/${kind}Trees/${kind}TreesVisual.glb`),
  );
  const jsonSize = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonSize).toString());
  const binary = bytes.subarray(28 + jsonSize);
  const body = gltf.nodes.find((node) => node.name.startsWith("treeBody"));
  const primitive = gltf.meshes[body.mesh].primitives[0];
  const compression = primitive.extensions.KHR_draco_mesh_compression;
  const view = gltf.bufferViews[compression.bufferView];
  const data = binary.subarray(
    view.byteOffset ?? 0,
    (view.byteOffset ?? 0) + view.byteLength,
  );
  const decoder = new draco.Decoder(),
    buffer = new draco.DecoderBuffer(),
    mesh = new draco.Mesh();
  buffer.Init(
    new Int8Array(data.buffer, data.byteOffset, data.byteLength),
    data.length,
  );
  const status = decoder.DecodeBufferToMesh(buffer, mesh);
  if (!status.ok()) throw new Error(`${kind}: ${status.error_msg()}`);
  const attributes = {};
  for (const [semantic, id] of Object.entries(compression.attributes)) {
    const attribute = decoder.GetAttributeByUniqueId(mesh, id);
    const values = new draco.DracoFloat32Array();
    decoder.GetAttributeFloatForAllPoints(mesh, attribute, values);
    attributes[semantic] = Array.from(
      { length: mesh.num_points() * attribute.num_components() },
      (_, i) => Number(values.GetValue(i).toFixed(6)),
    );
    draco.destroy(values);
  }
  const face = new draco.DracoInt32Array(),
    indices = [];
  for (let i = 0; i < mesh.num_faces(); i++) {
    decoder.GetFaceFromMesh(mesh, i, face);
    indices.push(face.GetValue(0), face.GetValue(1), face.GetValue(2));
  }
  trees[kind] = {
    attributes,
    indices,
    leaves: gltf.nodes
      .filter((node) => node.name.startsWith("treeLeaves"))
      .map((node) => ({ position: node.translation, scale: node.scale[0] })),
  };
  for (const object of [face, status, mesh, buffer, decoder])
    draco.destroy(object);
}
const destination = path.resolve("public/world3d/folio-reference/trees.json");
fs.writeFileSync(destination, JSON.stringify(trees));
console.log(`Decoded birch and cherry geometry to ${destination}`);
