import * as THREE from "three";

/** The same wind function runs in colour and shadow shaders. Instance world
 * positions keep neighbouring plants in a coherent travelling breeze. */
export function vegetationShader(
  material: THREE.Material,
  time: { value: number },
  grass = false,
) {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.uBreezeTime = time;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uBreezeTime;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vec4 breezePosition=vec4(position,1.0);
        #ifdef USE_INSTANCING
          breezePosition=instanceMatrix*breezePosition;
        #endif
        breezePosition=modelMatrix*breezePosition;
        float breeze=sin(breezePosition.x*.7+breezePosition.z*.43+uBreezeTime*1.25)
          +.35*sin(breezePosition.z*1.3-uBreezeTime*1.8);
        float stem=${grass ? "clamp(position.y/.2,0.0,1.0)" : "clamp((position.y+1.1)*.5,0.1,1.0)"};
        transformed.x+=breeze*stem*${grass ? ".055" : ".085"};
        transformed.z+=cos(breezePosition.x*.55+uBreezeTime*.9)*stem*${grass ? ".025" : ".045"};
        ${grass ? "" : "transformed.y+=sin(position.x*17.0+position.z*13.0+uBreezeTime*3.2)*.012;"}
      `,
      );
  };
  material.customProgramCacheKey = () =>
    `vegetation-wind-${grass ? "grass" : "leaves"}-v1`;
}
