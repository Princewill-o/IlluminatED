import { Vector2 } from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

/** r169 GLSL adaptation of folio-2025's screen-band cheapDOF idea (MIT).
 * Ultra only: the central gameplay band stays sharp; outer scenery softens by
 * at most two physical pixels. This pass never touches the HTML study/game UI. */
export function miniatureFocus() {
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      resolution: { value: new Vector2(1, 1) },
    },
    vertexShader:
      "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader: `uniform sampler2D tDiffuse;uniform vec2 resolution;varying vec2 vUv;
      void main(){
        float band=smoothstep(.26,.5,abs(vUv.y-.5));
        vec4 centre=texture2D(tDiffuse,vUv);
        vec2 radius=vec2(1.6*band)/max(resolution,vec2(1.0));
        vec4 soft=centre*4.0;
        soft+=texture2D(tDiffuse,clamp(vUv+vec2(radius.x,0.0),0.0,1.0))*2.0;
        soft+=texture2D(tDiffuse,clamp(vUv-vec2(radius.x,0.0),0.0,1.0))*2.0;
        soft+=texture2D(tDiffuse,clamp(vUv+vec2(0.0,radius.y),0.0,1.0))*2.0;
        soft+=texture2D(tDiffuse,clamp(vUv-vec2(0.0,radius.y),0.0,1.0))*2.0;
        soft+=texture2D(tDiffuse,clamp(vUv+radius,0.0,1.0));
        soft+=texture2D(tDiffuse,clamp(vUv-radius,0.0,1.0));
        soft+=texture2D(tDiffuse,clamp(vUv+vec2(radius.x,-radius.y),0.0,1.0));
        soft+=texture2D(tDiffuse,clamp(vUv+vec2(-radius.x,radius.y),0.0,1.0));
        gl_FragColor=mix(centre,soft/16.0,band*.65);
      }`,
  });
}
