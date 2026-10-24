import * as THREE from "three";

/** Lamp pools, small lens haloes and drifting insects/pollen, in three draws.
 * The existing lamp positions are authoritative; this adds no colliders/lights.
 * See folio-2025 World/PoleLights and Materials emissive radial gradients. */
export function ambientLife(parent: THREE.Group, lamps: THREE.Vector3[], mobile: boolean) {
  const group = new THREE.Group(); group.name = "Ambient lamp glow and motes";
  parent.add(group);
  const glow = { value: 0 }, elapsed = { value: 0 };
  const radial = (pool: boolean) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uGlow: glow },
    vertexShader: `varying vec2 vUv;
      #include <common>
      void main(){vUv=uv;
        #include <begin_vertex>
        #include <project_vertex>
      }`,
    fragmentShader: `uniform float uGlow;varying vec2 vUv;
      void main(){float r=length((vUv-.5)*2.0);if(r>1.0)discard;
        float falloff=pow(max(0.0,1.0-r),${pool ? "2.0" : "3.0"});
        gl_FragColor=vec4(vec3(${pool ? "1.0,.52,.16" : "2.2,1.1,.35"}),falloff*uGlow*${pool ? ".19" : ".3"});
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const limit = Math.min(lamps.length,mobile ? 6 : 16);
  const plane = new THREE.PlaneGeometry(1,1);
  const pools = new THREE.InstancedMesh(plane,radial(true),limit);
  const halos = new THREE.InstancedMesh(plane,radial(false),limit);
  pools.frustumCulled=halos.frustumCulled=false;
  group.add(pools,halos);
  const selected: THREE.Vector3[] = [];
  const dummy = new THREE.Object3D();
  let nextSelection = -Infinity;
  const count=mobile ? 24 : 72;
  const positions = new Float32Array(count*3);
  const seeds = new Float32Array(count);
  for(let i=0;i<count;i++) seeds[i]=(i*.61803398875)%1;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("aSeed",new THREE.BufferAttribute(seeds,1));
  const material = new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{uTime:elapsed,uNight:glow},
    vertexShader:`attribute float aSeed; varying float vPulse; uniform float uTime,uNight;
      #include <common>
      void main(){
        #include <begin_vertex>
        #include <project_vertex>
        gl_PointSize=clamp((14.0+uNight*12.0)/max(1.0,-mvPosition.z),1.0,3.0);
        vPulse=(.45+.55*sin(uTime*.8+aSeed*30.0)*sin(uTime*.8+aSeed*30.0))*(.18+uNight*.82);
      }`,
    fragmentShader:`varying float vPulse;void main(){
      float radius=length(gl_PointCoord-.5)*2.0;if(radius>1.0)discard;
      gl_FragColor=vec4(vec3(1.8,1.2,.45),pow(1.0-radius,2.0)*vPulse*.65);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const motes=new THREE.Points(geometry,material);motes.frustumCulled=false;group.add(motes);
  let disposed=false;
  return { group, motes,
    update(seconds:number,x:number,z:number,camera:THREE.Camera,night:number,reduced:boolean,dt:number) {
      if(disposed)return;
      motes.visible=!reduced;
      glow.value+=(night-glow.value)*(1-Math.exp(-Math.min(.1,dt)*2));
      elapsed.value=seconds;
      if(seconds>=nextSelection){
        nextSelection=seconds+.5;
        selected.length=0;
        selected.push(...lamps.filter(p=>Math.hypot(p.x-x,p.z-z)<28)
          .sort((a,b)=>(a.x-x)**2+(a.z-z)**2-((b.x-x)**2+(b.z-z)**2)).slice(0,limit));
        pools.count=halos.count=selected.length;
        for(let i=0;i<selected.length;i++){
          const p=selected[i];dummy.position.set(p.x,.135,p.z);
          dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(4.8,4.8,1);dummy.updateMatrix();pools.setMatrixAt(i,dummy.matrix);
        }
        pools.instanceMatrix.needsUpdate=true;
      }
      pools.visible=halos.visible=glow.value>.01;
      for(let i=0;i<selected.length;i++){
        dummy.position.copy(selected[i]);dummy.quaternion.copy(camera.quaternion);
        dummy.scale.setScalar(.85);dummy.updateMatrix();halos.setMatrixAt(i,dummy.matrix);
      }
      halos.instanceMatrix.needsUpdate=true;
      if(reduced)return;
      for(let i=0;i<count;i++){
        const p=selected.length&&night>.2 ? selected[i%selected.length] : null;
        const t=seconds*.18+i*2.39996;
        positions[i*3]=(p?.x??x+Math.cos(i*13.7)*11)+Math.sin(t)*1.1;
        positions[i*3+1]=(p?1.4:.4)+seeds[i]*1.6+Math.sin(t*1.3)*.25;
        positions[i*3+2]=(p?.z??z+Math.sin(i*7.3)*11)+Math.cos(t*.8)*1.1;
      }
      geometry.attributes.position.needsUpdate=true;
    },
    dispose(){if(disposed)return;disposed=true;group.removeFromParent();plane.dispose();geometry.dispose();
      pools.material.dispose();halos.material.dispose();material.dispose();pools.dispose();halos.dispose();},
  };
}
