import { ShaderChunk } from "three";

/** Contact-hardening sun shadows. A small blocker search estimates distance
 * from a surface to its occluder: feet stay grounded, high crowns soften. */
const source = ShaderChunk.shadowmap_pars_fragment;
const start = source.indexOf("#elif defined( SHADOWMAP_TYPE_PCF_SOFT )");
const end = source.indexOf("#elif defined( SHADOWMAP_TYPE_VSM )", start);
export const softSunShadows = start < 0 || end < 0 ? source : source.slice(0, start) + `
  #elif defined( SHADOWMAP_TYPE_PCF_SOFT )
    // A Vogel disk turned per pixel (interleaved gradient noise): smooth penumbras without the
    // ghosted copies a fixed pattern leaves, and a wider blocker search so edges never drop out.
    vec2 texelSize=1.0/shadowMapSize;
    float spin=6.2831853*fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
    float blockerSum=0.0;
    float blockerCount=0.0;
    for(int i=0;i<8;i++){
      float angle=float(i)*2.39996323+spin;
      vec2 offset=vec2(cos(angle),sin(angle))*sqrt((float(i)+.5)/8.0);
      float depth=unpackRGBAToDepth(texture2D(shadowMap,shadowCoord.xy+offset*texelSize*shadowRadius*2.5));
      if(depth<shadowCoord.z-.00015){blockerSum+=depth;blockerCount+=1.0;}
    }
    if(blockerCount>0.0){
      float separation=max(0.0,shadowCoord.z-blockerSum/blockerCount);
      float penumbra=clamp(separation*90.0,1.0,min(shadowRadius*2.0,5.0));
      shadow=0.0;
      for(int i=0;i<16;i++){
        float angle=float(i)*2.39996323+spin;
        vec2 offset=vec2(cos(angle),sin(angle))*sqrt((float(i)+.5)/16.0);
        shadow+=texture2DCompare(shadowMap,shadowCoord.xy+offset*texelSize*penumbra,shadowCoord.z);
      }
      shadow/=16.0;
    }
` + source.slice(end);
