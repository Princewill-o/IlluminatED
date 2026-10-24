import * as THREE from "three";

/** Water exists only in river tiles, leaving sunken station plots dry. */
export function riverGeometry(tiles: string[]) {
  const positions:number[]=[],uv:number[]=[],banks:number[]=[],tileUv:number[]=[];
  const cols=tiles[0]?.length??1,rows=tiles.length;
  const waterAt=(x:number,z:number)=>tiles[z]?.[x]==="w";
  tiles.forEach((row,z)=>[...row].forEach((tile,x)=>{
    if(tile!=="w") return;
    for(const [dx,dz] of [[0,0],[0,1],[1,1],[0,0],[1,1],[1,0]]) {
      positions.push(x+dx,0,z+dz);uv.push((x+dx)/cols,1-(z+dz)/rows);
      tileUv.push(dx,dz);
      banks.push(Number(!waterAt(x-1,z)),Number(!waterAt(x+1,z)),Number(!waterAt(x,z-1)),Number(!waterAt(x,z+1)));
    }
  }));
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();
  geometry.setAttribute("riverBank",new THREE.Float32BufferAttribute(banks,4));
  geometry.setAttribute("riverTileUv",new THREE.Float32BufferAttribute(tileUv,2));
  return geometry;
}

/** One small repeating surface replaces a flat blue plane; no reflections pass. */
export function riverSurface(phase: "day" | "dusk" | "night", cols: number, rows: number) {
  const canvas=document.createElement("canvas");canvas.width=canvas.height=256;
  const ctx=canvas.getContext("2d")!;
  // Keep the albedo neutral: time-of-day belongs to live lighting/material tint.
  // Baking a night colour here would leave the river dark after sunrise.
  ctx.fillStyle="#c2d0c9";
  ctx.fillRect(0,0,256,256);
  // Broken, horizontal ripples stay quiet at the normal game camera distance.
  for(let i=0;i<80;i++) {
    const x=(i*67)%256,y=(i*31)%256;
    ctx.fillStyle="rgba(218,237,224,.12)";
    ctx.fillRect(x,y,3+i%13,1+i%2);
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(cols/9,rows/9);
  const material=new THREE.MeshStandardMaterial({roughness:.3,metalness:.12,envMapIntensity:.65,color:phase==="night"?"#63848b":"#a3c7bf",map:texture});
  const time = { value: 0 };
  const rain = { value: 0 };
  material.roughness = 0.22;
  material.envMapIntensity = 1.1;
  material.onBeforeCompile = shader => {
    shader.uniforms.uRiverTime = time;
    shader.uniforms.uRiverRain = rain;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec4 riverBank; attribute vec2 riverTileUv; varying vec4 vRiverBank; varying vec2 vRiverTileUv; varying vec2 vRiverPosition;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRiverPosition=position.xz; vRiverBank=riverBank; vRiverTileUv=riverTileUv;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform float uRiverTime,uRiverRain; varying vec2 vRiverPosition,vRiverTileUv; varying vec4 vRiverBank;
        float riverHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        vec2 ripple=vec2(sin(vRiverPosition.x*5.0+vRiverPosition.y*2.0+uRiverTime*.8),
          cos(vRiverPosition.y*7.0-vRiverPosition.x*1.7+uRiverTime*.65))*.065;
        normal=normalize(normal+vec3(ripple.x,ripple.y,0.0));`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        // Only exposed water-tile edges are banks: internal tile seams stay clear.
        vec4 bankDistance=mix(vec4(2.0),vec4(vRiverTileUv.x,1.0-vRiverTileUv.x,vRiverTileUv.y,1.0-vRiverTileUv.y),vRiverBank);
        float shore=min(min(bankDistance.x,bankDistance.y),min(bankDistance.z,bankDistance.w));
        float shoreWave=sin(shore*37.0-uRiverTime*1.35+sin(vRiverPosition.x*1.8+vRiverPosition.y*1.3)*.65)*.5+.5;
        float foam=(1.0-smoothstep(.015,.14,shore))*(.26+shoreWave*.44);
        // One bounded ring per repeating cell; no buffers, particles or reflection pass.
        vec2 rainCell=floor(vRiverPosition*2.4), rainUv=fract(vRiverPosition*2.4);
        float rainSeed=riverHash(rainCell), rainAge=fract(uRiverTime*.72+rainSeed*7.0);
        vec2 rainCentre=vec2(.25)+vec2(rainSeed,riverHash(rainCell+17.0))*.5;
        float rainDistance=length(rainUv-rainCentre);
        float rainRing=(1.0-smoothstep(.012,.032,abs(rainDistance-rainAge*.42)))*(1.0-rainAge)*uRiverRain*.22;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.72,.85,.78),clamp(foam+rainRing,0.0,.8));`);
  };
  material.customProgramCacheKey = () => "river-shore-rain-v2";
  return {material,texture,update:(seconds:number,rainAmount=0)=>{time.value=Number.isFinite(seconds)?seconds:0;rain.value=THREE.MathUtils.clamp(Number.isFinite(rainAmount)?rainAmount:0,0,1);},dispose:()=>{texture.dispose();material.dispose();}};
}
