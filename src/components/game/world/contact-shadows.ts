import * as THREE from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

/** Sample the actual rendered depth, so curved roads, instancing and animated
 * characters agree with their contact shadows. No override-material scene pass. */
export function contactShadows(camera: THREE.Camera, samples: number) {
  const pass = new ShaderPass({
    defines: { OCCLUSION_SAMPLES: samples },
    uniforms: {
      tDiffuse: { value: null },
      tDepth: { value: null },
      projectionInverse: { value: camera.projectionMatrixInverse },
      projection: { value: camera.projectionMatrix },
      radius: { value: 0.65 },
    },
    vertexShader: `varying vec2 vUv;
      void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform sampler2D tDiffuse, tDepth;
      uniform mat4 projectionInverse, projection;
      uniform float radius;
      varying vec2 vUv;
      vec3 viewPosition(vec2 uv, float depth) {
        vec4 p=projectionInverse*vec4(uv*2.0-1.0,depth*2.0-1.0,1.0);
        return p.xyz/p.w;
      }
      void main(){
        vec4 colour=texture2D(tDiffuse,vUv);
        float depth=texture2D(tDepth,vUv).x;
        vec3 p=viewPosition(vUv,depth);
        vec3 normal=normalize(cross(dFdx(p),dFdy(p)));
        if(dot(normal,-p)<0.0) normal=-normal;
        float screenRadius=clamp(radius*projection[1][1]/max(-p.z,0.1)*0.5,0.001,0.12);
        float aspect=projection[1][1]/projection[0][0];
        float occlusion=0.0;
        // A fixed spiral is stable while walking; no temporal shimmer or noise texture.
        for(int i=0;i<OCCLUSION_SAMPLES;i++){
          float f=(float(i)+0.5)/float(OCCLUSION_SAMPLES);
          float angle=float(i)*2.39996323;
          vec2 uv=vUv+vec2(cos(angle)/aspect,sin(angle))*sqrt(f)*screenRadius;
          if(uv.x<=0.0||uv.x>=1.0||uv.y<=0.0||uv.y>=1.0) continue;
          float sampleDepth=texture2D(tDepth,uv).x;
          vec3 delta=viewPosition(uv,sampleDepth)-p;
          float distanceToSample=length(delta);
          float horizon=max(0.0,dot(normal,delta)/max(distanceToSample,0.001)-0.07);
          float range=1.0-smoothstep(radius*0.25,radius,distanceToSample);
          occlusion+=horizon*range*step(0.02,distanceToSample)*step(sampleDepth,0.99999);
        }
        float shade=1.0-clamp(occlusion/float(OCCLUSION_SAMPLES)*2.2,0.0,0.48);
        if(depth>=0.99999) shade=1.0;
        // Slightly cool occlusion preserves the warm sunlit surfaces.
        colour.rgb*=mix(vec3(0.86,0.91,1.0),vec3(1.0),shade)*shade;
        gl_FragColor=colour;
      }`,
  });
  const render = pass.render.bind(pass);
  pass.render = (renderer, writeBuffer, readBuffer, deltaTime, maskActive) => {
    // ShaderPass clones uniforms; refresh projection after zoom/viewport changes.
    pass.uniforms.projectionInverse.value.copy(camera.projectionMatrixInverse);
    pass.uniforms.projection.value.copy(camera.projectionMatrix);
    pass.uniforms.tDepth.value = readBuffer.depthTexture;
    render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
  };
  return pass;
}
