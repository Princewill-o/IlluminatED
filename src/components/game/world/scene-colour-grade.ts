/** Apply the miniature palette in linear HDR, before tone mapping. */
export const sceneColourGrade = `vec4 sceneColourGrade(vec4 c,vec2 uv){
float l=dot(c.rgb,vec3(.2126,.7152,.0722));
// Linear HDR split toning: warm highlights, blue-green shadow fill.
float highlight=smoothstep(.25,1.8,l);
c.rgb*=mix(vec3(.9,.93,1.1),vec3(1.07,1.01,.91),highlight);
l=dot(c.rgb,vec3(.2126,.7152,.0722));
c.rgb=mix(vec3(l),c.rgb,1.12);
// Preserve black detail while giving the miniature scene more separation.
c.rgb*=mix(.91,1.025,smoothstep(.04,.8,l));
vec2 p=uv*(1.0-uv.yx);float edge=clamp(pow(16.0*p.x*p.y,.12),0.0,1.0);
c.rgb*=mix(.91,1.0,edge);return vec4(max(c.rgb,vec3(0.0)),c.a);}`;

/** Fold the same grade into OutputPass, avoiding another full-resolution target
 * read/write. Keep the tone mapping and colour-space conversion after it. */
export function gradedOutputShader(fragmentShader: string) {
  return fragmentShader
    .replace("void main()", `${sceneColourGrade}\nvoid main()`)
    .replace(
      "gl_FragColor = texture2D( tDiffuse, vUv );",
      "gl_FragColor = sceneColourGrade( texture2D( tDiffuse, vUv ), vUv );",
    );
}
