import * as THREE from "three";

import { environmentPalette, type EnvironmentPhase } from "./environment-palette";

/** Bake a small HDR sky once. Outdoor glass and water should reflect a sky and
 * soft sun, rather than the rectangular studio lights of RoomEnvironment. */
export function outdoorEnvironment(renderer: THREE.WebGLRenderer, phase: EnvironmentPhase = "day", overcast = false) {
  const tone = environmentPalette(phase);
  const muted = new THREE.Color(tone.horizon);
  const scene = new THREE.Scene();
  const geometry = new THREE.SphereGeometry(20, 32, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      sky: { value: new THREE.Color(tone.zenith).lerp(muted, overcast ? .45 : 0) },
      horizon: { value: muted },
      earth: { value: new THREE.Color(tone.earth) },
      sunColour: { value: new THREE.Color(tone.sun) },
      sunStrength: { value: tone.sunGlow * (overcast ? .15 : 1) },
    },
    vertexShader: `varying vec3 vSkyDirection;
      void main(){vSkyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform vec3 sky,horizon,earth,sunColour; uniform float sunStrength; varying vec3 vSkyDirection;
      void main(){
        vec3 direction=normalize(vSkyDirection);
        vec3 colour=mix(earth*.45,horizon,smoothstep(-.35,.08,direction.y));
        colour=mix(colour,sky,smoothstep(.0,.8,direction.y));
        vec3 sunDirection=normalize(vec3(-10.0,22.0,12.0));
        float alignment=max(0.0,dot(direction,sunDirection));
        float glow=(pow(alignment,64.0)*.12+pow(alignment,700.0))*sunStrength;
        gl_FragColor=vec4(colour+sunColour*glow,1.0);
      }`,
  });
  scene.add(new THREE.Mesh(geometry, material));
  const generator = new THREE.PMREMGenerator(renderer);
  try {
    return generator.fromScene(scene, 0.04, 0.1, 50);
  } finally {
    geometry.dispose();
    material.dispose();
    generator.dispose();
  }
}
