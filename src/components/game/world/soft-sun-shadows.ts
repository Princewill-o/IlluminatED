import { ShaderChunk } from "three";

/** Contact-hardening sun shadows. A small blocker search estimates distance
 * from a surface to its occluder: feet stay grounded, high crowns soften. */
const source = ShaderChunk.shadowmap_pars_fragment;
const start = source.indexOf("#elif defined( SHADOWMAP_TYPE_PCF_SOFT )");
const end = source.indexOf("#elif defined( SHADOWMAP_TYPE_VSM )", start);
/** Filter taps per pixel for this device's graphics tier (the blocker search uses half). */
let taps = 16;
export const setShadowTaps = (n: number) => { taps = Math.max(4, Math.min(16, Math.round(n))); };
export const shadowTaps = () => taps;
export const softSunShadowsChunk = () => softSunShadows.replace(/__BLOCK__/g, String(Math.max(4, taps >> 1))).replace(/__TAPS__/g, String(taps)).replace(/__TAPSF__/g, taps.toFixed(1)).replace(/__BLOCKF__/g, Math.max(4, taps >> 1).toFixed(1));
const softSunShadows = start < 0 || end < 0 ? source : source.slice(0, start) + `
  #elif defined( SHADOWMAP_TYPE_PCF_SOFT )
    // A Vogel disk turned per pixel (interleaved gradient noise): smooth penumbras without the
    // ghosted copies a fixed pattern leaves, and a wider blocker search so edges never drop out.
    vec2 texelSize=1.0/shadowMapSize;
    float spin=6.2831853*fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
    float blockerSum=0.0;
    float blockerCount=0.0;
    for(int i=0;i<__BLOCK__;i++){
      float angle=float(i)*2.39996323+spin;
      vec2 offset=vec2(cos(angle),sin(angle))*sqrt((float(i)+.5)/__BLOCKF__);
      float depth=unpackRGBAToDepth(texture2D(shadowMap,shadowCoord.xy+offset*texelSize*shadowRadius*2.5));
      if(depth<shadowCoord.z-.00015){blockerSum+=depth;blockerCount+=1.0;}
    }
    if(blockerCount>0.0){
      float separation=max(0.0,shadowCoord.z-blockerSum/blockerCount);
      float penumbra=clamp(separation*90.0,1.0,min(shadowRadius*2.0,5.0));
      shadow=0.0;
      for(int i=0;i<__TAPS__;i++){
        float angle=float(i)*2.39996323+spin;
        vec2 offset=vec2(cos(angle),sin(angle))*sqrt((float(i)+.5)/__TAPSF__);
        shadow+=texture2DCompare(shadowMap,shadowCoord.xy+offset*texelSize*penumbra,shadowCoord.z);
      }
      shadow/=__TAPSF__;
    }
` + source.slice(end);
