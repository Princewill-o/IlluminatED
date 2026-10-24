import * as THREE from "three";

/** Water exists only in river tiles, leaving sunken station plots dry. */
export function riverGeometry(tiles: string[]) {
  const positions:number[]=[],uv:number[]=[];
  const cols=tiles[0]?.length??1,rows=tiles.length;
  tiles.forEach((row,z)=>[...row].forEach((tile,x)=>{
    if(tile!=="w") return;
    for(const [dx,dz] of [[0,0],[0,1],[1,1],[0,0],[1,1],[1,0]]) {
      positions.push(x+dx,0,z+dz);uv.push((x+dx)/cols,1-(z+dz)/rows);
    }
  }));
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();
  return geometry;
}

/** One small repeating surface replaces a flat blue plane; no reflections pass. */
export function riverSurface(phase: "day" | "dusk" | "night", cols: number, rows: number) {
  const canvas=document.createElement("canvas");canvas.width=canvas.height=256;
  const ctx=canvas.getContext("2d")!;
  ctx.fillStyle=phase==="night"?"#42636e":phase==="dusk"?"#86a9a5":"#94bbb5";
  ctx.fillRect(0,0,256,256);
  // Broken, horizontal ripples stay quiet at the normal game camera distance.
  for(let i=0;i<80;i++) {
    const x=(i*67)%256,y=(i*31)%256;
    ctx.fillStyle=i%7===0&&phase!=="day"?"rgba(243,194,117,.28)":"rgba(218,237,224,.12)";
    ctx.fillRect(x,y,3+i%13,1+i%2);
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(cols/9,rows/9);
  const material=new THREE.MeshStandardMaterial({roughness:.3,metalness:.12,envMapIntensity:.65,color:phase==="night"?"#63848b":"#a3c7bf",map:texture});
  const time = { value: 0 };
  material.roughness = 0.22;
  material.envMapIntensity = 1.1;
  material.onBeforeCompile = shader => {
    shader.uniforms.uRiverTime = time;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vRiverPosition;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRiverPosition=position.xz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uRiverTime; varying vec2 vRiverPosition;")
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        vec2 ripple=vec2(sin(vRiverPosition.x*5.0+vRiverPosition.y*2.0+uRiverTime*.8),
          cos(vRiverPosition.y*7.0-vRiverPosition.x*1.7+uRiverTime*.65))*.065;
        normal=normalize(normal+vec3(ripple.x,ripple.y,0.0));`);
  };
  material.customProgramCacheKey = () => "river-ripples-v1";
  return {material,texture,update:(seconds:number)=>{time.value=seconds;},dispose:()=>{texture.dispose();material.dispose();}};
}
