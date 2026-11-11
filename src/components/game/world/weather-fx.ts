import * as THREE from "three";

/**
 * Weather you can see everywhere you look: rain and snow fall through a box
 * that follows the camera (so it fills the view in every camera mode), snow
 * settles on roofs, pavements and parked cars, rain darkens and shines the
 * streets and splashes in puddles, storms flash with lightning, and low-poly
 * clouds drift over the city. A sky with sun, moon and stars shows when you
 * look up in the behind and first-person views.
 *
 * Everything here is a handful of draw calls, sized by the graphics tier.
 */

/** Shared by every world material (wired in through the bend shader hook). */
export const SURFACE = {
  snow: { value: 0 },
  wet: { value: 0 },
};

/** Settled snow and wet streets on any lit material. Up-facing surfaces catch it. */
export function surfaceWeatherShader(sh: THREE.WebGLProgramParametersWithUniforms) {
  if (!sh.vertexShader.includes("#include <project_vertex>") || !sh.fragmentShader.includes("#include <normal_fragment_maps>")) return;
  sh.uniforms.uSurfaceSnow = SURFACE.snow;
  sh.uniforms.uSurfaceWet = SURFACE.wet;
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec2 vWeatherXZ;")
    .replace("#include <project_vertex>", `
      vec4 weatherPoint=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        weatherPoint=instanceMatrix*weatherPoint;
      #endif
      vWeatherXZ=(modelMatrix*weatherPoint).xz;
      #include <project_vertex>`);
  sh.fragmentShader = sh.fragmentShader
    .replace("#include <common>", "#include <common>\nuniform float uSurfaceSnow,uSurfaceWet;\nvarying vec2 vWeatherXZ;")
    .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      #ifndef WEATHER_PROOF
      {
        float weatherUp=inverseTransformDirection(normal,viewMatrix).y;
        // Snow: up-facing faces turn white, in soft drifts that break up a little at the edges.
        float drift=fract(sin(dot(floor(vWeatherXZ*1.7),vec2(12.9898,78.233)))*43758.5453);
        float snowCover=smoothstep(.35,.8,weatherUp)*smoothstep(0.0,.35,uSurfaceSnow*1.25-drift*.35);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.86,.9,.97),snowCover*.9);
        // Rain: surfaces darken and the ground turns glossy.
        float wetUp=smoothstep(.2,.9,weatherUp)*uSurfaceWet*(1.0-snowCover);
        diffuseColor.rgb*=1.0-wetUp*.28;
        #ifdef STANDARD
          roughnessFactor=mix(roughnessFactor,.18,wetUp*.85);
          roughnessFactor=mix(roughnessFactor,.95,snowCover);
        #endif
      }
      #endif`);
}

export type WeatherTier = "high" | "balanced" | "performance";
const RAIN_KINDS = ["Drizzle", "Light rain", "Heavy rain", "Thunderstorm"];
export const isRain = (kind: string) => RAIN_KINDS.includes(kind);
export const isSnow = (kind: string) => kind === "Snow" || kind === "Heavy snow";

/** How much falls, how fast, and how the sky looks for each kind of weather. */
export function weatherLook(kind: string) {
  const rain = kind === "Drizzle" ? .35 : kind === "Light rain" ? .6 : kind === "Heavy rain" ? 1 : kind === "Thunderstorm" ? 1 : 0;
  const snow = kind === "Snow" ? .75 : kind === "Heavy snow" ? 1 : 0;
  const clouds = rain || snow ? 1 : kind === "Cloudy" || kind === "Fog" ? .85 : kind === "Windy" ? .55 : kind === "Bright" ? .2 : .3;
  const grey = kind === "Thunderstorm" ? .75 : kind === "Heavy rain" ? .6 : rain ? .45 : snow ? .25 : kind === "Cloudy" || kind === "Fog" ? .3 : 0;
  const wind = kind === "Windy" ? 1 : kind === "Thunderstorm" ? .8 : kind === "Heavy rain" ? .5 : kind === "Heavy snow" ? .45 : .15;
  return { rain, snow, clouds, grey, wind, storm: kind === "Thunderstorm" };
}

const rand = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function createWeatherFx(scene: THREE.Scene, opts: { tier: WeatherTier; focus: { value: THREE.Vector3 }; bend: { value: THREE.Vector2 } }) {
  const group = new THREE.Group();
  group.name = "Weather";
  scene.add(group);
  const big = opts.tier === "high" ? 1 : opts.tier === "balanced" ? .65 : .4;
  const HALF = 22, SNOW_HALF = 15, HEIGHT = 16;
  const curve = `uniform vec3 uFocus;uniform vec2 uBend;
    vec3 curved(vec3 w){float z=w.z-uFocus.z,x=w.x-uFocus.x;w.y-=z*z*uBend.x+x*x*uBend.y;return w;}`;
  const shared = { uFocus: opts.focus, uBend: opts.bend };

  // ── Rain: streaks that fall fast and lean with the wind ──
  const RAIN = Math.round(1800 * Math.max(.55, big));
  const rainPos = new Float32Array(RAIN * 6);
  const rainSeed = Float32Array.from({ length: RAIN }, (_, i) => rand(i));
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3).setUsage(THREE.DynamicDrawUsage));
  const rainOpacity = { value: 0 };
  const rainMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { ...shared, uOpacity: rainOpacity },
    vertexShader: `${curve}void main(){vec4 w=modelMatrix*vec4(position,1.0);gl_Position=projectionMatrix*viewMatrix*vec4(curved(w.xyz),1.0);}`,
    fragmentShader: "uniform float uOpacity;void main(){gl_FragColor=vec4(.86,.92,1.0,uOpacity);}",
  });
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.frustumCulled = false; rain.visible = false; rain.renderOrder = 5;
  group.add(rain);

  // ── Snow: soft round flakes that drift and sway ──
  const SNOW = Math.round(2400 * Math.max(.6, big));
  const snowPos = new Float32Array(SNOW * 3);
  const snowSeed = Float32Array.from({ length: SNOW }, (_, i) => rand(i + 9000));
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3).setUsage(THREE.DynamicDrawUsage));
  snowGeo.setAttribute("aSeed", new THREE.BufferAttribute(snowSeed, 1));
  const snowOpacity = { value: 0 }, pixel = { value: 1 };
  const snowMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { ...shared, uOpacity: snowOpacity, uPixel: pixel },
    vertexShader: `${curve}attribute float aSeed;uniform float uPixel;varying float vSeed;
      void main(){vec4 w=modelMatrix*vec4(position,1.0);vec4 v=viewMatrix*vec4(curved(w.xyz),1.0);gl_Position=projectionMatrix*v;
        vSeed=aSeed;gl_PointSize=clamp((70.0+aSeed*70.0)*uPixel/max(.5,-v.z),2.5,26.0);}`,
    fragmentShader: `uniform float uOpacity;varying float vSeed;void main(){
      float r=length(gl_PointCoord-.5)*2.0;if(r>1.0)discard;
      vec3 c=mix(vec3(1.0),vec3(.62,.7,.84),smoothstep(.35,.95,r));
      gl_FragColor=vec4(c,(1.0-smoothstep(.75,1.0,r))*uOpacity*(.75+vSeed*.25));}`,
  });
  const snow = new THREE.Points(snowGeo, snowMat);
  snow.frustumCulled = false; snow.visible = false; snow.renderOrder = 5;
  group.add(snow);

  // ── Splashes: little rings popping in puddles near you ──
  const SPLASH = Math.round(40 * big);
  const splashGeo = new THREE.RingGeometry(.07, .09, 10);
  splashGeo.rotateX(-Math.PI / 2);
  const splashMat = new THREE.MeshBasicMaterial({ color: "#d6e6f5", transparent: true, opacity: .55, depthWrite: false });
  splashMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, shared);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>\n${curve}`)
      .replace("#include <project_vertex>", `vec4 mvPosition=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          mvPosition=instanceMatrix*mvPosition;
        #endif
        mvPosition=viewMatrix*vec4(curved((modelMatrix*mvPosition).xyz),1.0);gl_Position=projectionMatrix*mvPosition;`);
  };
  const splashes = new THREE.InstancedMesh(splashGeo, splashMat, SPLASH);
  splashes.frustumCulled = false; splashes.visible = false;
  group.add(splashes);
  const dummy = new THREE.Object3D();

  // ── Low-poly clouds: faceted puffs drifting high over the city ──
  const cloudMat = new THREE.MeshLambertMaterial({ color: "#ffffff", flatShading: true, fog: false });
  const puff = new THREE.IcosahedronGeometry(1, 0);
  const CLOUDS = Math.round(18 * Math.max(.6, big));
  const clouds: { g: THREE.Group; x: number; z: number; speed: number }[] = [];
  for (let i = 0; i < CLOUDS; i++) {
    const g = new THREE.Group();
    const n = 3 + Math.floor(rand(i + 50) * 3);
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(puff, cloudMat);
      const s = 2.2 + rand(i * 7 + k) * 2.4;
      m.scale.set(s * 1.3, s * .75, s);
      m.position.set((k - n / 2) * 2.6 + rand(i + k * 3) * 1.4, rand(i * 3 + k) * 1.2, rand(i * 5 + k) * 2 - 1);
      m.rotation.set(rand(i + k) * 3, rand(i * 2 + k) * 3, 0);
      g.add(m);
    }
    g.position.y = 30 + rand(i + 300) * 8;
    group.add(g);
    clouds.push({ g, x: (rand(i + 100) - .5) * 160, z: (rand(i + 200) - .5) * 160, speed: .6 + rand(i + 400) * .6 });
  }

  // ── Sky: sun, moon and stars, seen when you look up ──
  const disc = (colour: string, size: number, soft: number) => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, colour); grad.addColorStop(soft, colour); grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, fog: false, depthWrite: false, transparent: true }));
    s.scale.setScalar(size); s.renderOrder = -9000;
    return s;
  };
  const sunDisc = disc("#fff4d6", 16, .35), moonDisc = disc("#e9efff", 9, .55);
  group.add(sunDisc, moonDisc);
  const STARS = 600;
  const starPos = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) {
    const a = rand(i + 5000) * Math.PI * 2, h = .15 + rand(i + 6000) * .85;
    const r = Math.sqrt(1 - h * h);
    starPos.set([Math.cos(a) * r * 70, h * 70, Math.sin(a) * r * 70], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starOpacity = { value: 0 };
  const starMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, uniforms: { uOpacity: starOpacity },
    vertexShader: "varying float vTwinkle;void main(){vTwinkle=fract(sin(dot(position.xz,vec2(12.9,78.2)))*43758.5);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=1.5+vTwinkle*1.5;}",
    fragmentShader: "uniform float uOpacity;varying float vTwinkle;void main(){gl_FragColor=vec4(1.0,1.0,.95,uOpacity*(.5+vTwinkle*.5));}",
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false; stars.renderOrder = -9500;
  group.add(stars);

  // ── State that eases between kinds of weather ──
  let rainAmount = 0, snowAmount = 0, cloudAmount = .3, grey = 0, wind = .15, flash = 0, flashAt = -99, nextFlash = 3, windX = .6, first = true;
  const cloudColour = new THREE.Color();

  return {
    group,
    /** Current lightning brightness, 0..1 (for lights and a screen flash). */
    get flash() { return flash; },
    /** How deep the settled snow is, 0..1. */
    get snowCover() { return SURFACE.snow.value; },
    update(o: { kind: string; camera: THREE.PerspectiveCamera; x: number; z: number; dt: number; secs: number; night: number; reduced: boolean; pixelRatio: number; indoors: boolean; /** Seen from a moving vehicle: everything streams back at this speed. */ travel?: number }) {
      const back = (o.travel ?? 0) * o.secs;
      const look = weatherLook(o.kind);
      const dt = Math.min(.1, o.dt), ease = 1 - Math.exp(-dt * .8);
      rainAmount += (look.rain - rainAmount) * ease;
      snowAmount += (look.snow - snowAmount) * ease;
      cloudAmount += (look.clouds - cloudAmount) * ease * .5;
      grey += (look.grey - grey) * ease;
      wind += (look.wind - wind) * ease;
      // Snow settles over about half a minute and melts over two; puddles dry a little faster.
      const snowTarget = look.snow > 0 ? 1 : 0;
      SURFACE.snow.value = Math.max(0, Math.min(1, SURFACE.snow.value + (snowTarget ? dt / 30 : -dt / 120)));
      // Arriving somewhere it's already snowing or raining: it's already settled.
      if (first) { first = false; SURFACE.snow.value = snowTarget ? .8 : 0; SURFACE.wet.value = look.rain > 0 ? .9 : 0; rainAmount = look.rain; snowAmount = look.snow; cloudAmount = look.clouds; grey = look.grey; }
      const wetTarget = look.rain > 0 ? Math.min(1, look.rain + .3) : 0;
      SURFACE.wet.value += (wetTarget - SURFACE.wet.value) * (1 - Math.exp(-dt * (wetTarget > SURFACE.wet.value ? .4 : .05)));
      group.visible = !o.indoors;
      if (o.indoors) { flash = 0; return; }

      const cam = o.camera.position;
      // Centre the falling box between you and the camera so it fills every view.
      const cx = (o.x + cam.x) / 2, cz = (o.z + cam.z) / 2, top = Math.max(cam.y + 3, HEIGHT);
      windX = .6 + wind * 3.2;
      const wrap = (v: number, c: number, h: number) => c + ((((v - c + h) % (2 * h)) + 2 * h) % (2 * h)) - h;

      rain.visible = rainAmount > .02 && !o.reduced;
      if (rain.visible) {
        const live = Math.round(RAIN * Math.min(1, rainAmount)), fall = 20 + rainAmount * 8, len = .5 + rainAmount * .6;
        for (let i = 0; i < RAIN; i++) {
          const s = rainSeed[i], k = i * 6;
          if (i >= live) { rainPos[k + 1] = rainPos[k + 4] = -50; continue; }
          const y = top - (((o.secs * fall * (.8 + s * .4) + s * 97.3) % top));
          const x = wrap(o.x + (rand(i + 1) - .5) * 2 * HALF + o.secs * windX * .8 - back, cx, HALF);
          const z = wrap(o.z + (rand(i + 2) - .5) * 2 * HALF, cz, HALF);
          rainPos[k] = x; rainPos[k + 1] = y; rainPos[k + 2] = z;
          rainPos[k + 3] = x - windX * .03 * len * 10; rainPos[k + 4] = y + len; rainPos[k + 5] = z;
        }
        rainGeo.attributes.position.needsUpdate = true;
        rainOpacity.value = .35 + rainAmount * .35;
      }
      splashes.visible = rain.visible && rainAmount > .25;
      if (splashes.visible) {
        for (let i = 0; i < SPLASH; i++) {
          const life = ((o.secs * 1.7 + rand(i + 700)) % 1);
          const slot = Math.floor(o.secs * 1.7 + rand(i + 700));
          dummy.position.set(o.x + (rand(i * 13 + slot) - .5) * 14, .14, o.z + (rand(i * 17 + slot) - .5) * 12);
          dummy.scale.setScalar(.3 + life * 1.5);
          dummy.updateMatrix(); splashes.setMatrixAt(i, dummy.matrix);
        }
        splashes.instanceMatrix.needsUpdate = true;
        splashMat.opacity = .32 * rainAmount;
      }

      snow.visible = snowAmount > .02 && !o.reduced;
      if (snow.visible) {
        const live = Math.round(SNOW * Math.min(1, snowAmount));
        for (let i = 0; i < SNOW; i++) {
          const s = snowSeed[i], k = i * 3;
          if (i >= live) { snowPos[k + 1] = -50; continue; }
          const t = o.secs * (.9 + s * .7);
          const y = top - (((t * (1.1 + s * .6) + s * 53.1) % top));
          snowPos[k] = wrap(o.x + (rand(i + 11) - .5) * 2 * SNOW_HALF + Math.sin(t * .9 + s * 20) * .6 + o.secs * windX * .35 - back, cx, SNOW_HALF);
          snowPos[k + 1] = y;
          snowPos[k + 2] = wrap(o.z + (rand(i + 12) - .5) * 2 * SNOW_HALF + Math.cos(t * .7 + s * 13) * .5, cz, SNOW_HALF);
        }
        snowGeo.attributes.position.needsUpdate = true;
        snowOpacity.value = .55 + snowAmount * .4;
        pixel.value = o.pixelRatio;
      }

      // Lightning: a quick double flicker every 6–14 seconds in a storm.
      if (look.storm && !o.reduced) {
        if (o.secs > nextFlash) { flashAt = o.secs; nextFlash = o.secs + 6 + rand(Math.floor(o.secs)) * 8; }
        const t = o.secs - flashAt;
        flash = t < .08 ? 1 : t < .18 ? .25 : t < .27 ? .85 : Math.max(0, .85 - (t - .27) * 2.5);
      } else flash = 0;

      // Clouds drift with the wind and wrap round you; they grey and thicken with bad weather.
      const shown = Math.round(CLOUDS * Math.min(1, .25 + cloudAmount));
      cloudColour.set("#ffffff").lerp(new THREE.Color("#7d8696"), grey).multiplyScalar(1 - o.night * .7);
      if (flash > .2) cloudColour.lerp(new THREE.Color("#e8eeff"), flash * .7);
      cloudMat.color.copy(cloudColour);
      clouds.forEach((c, i) => {
        c.x += (windX * .9 + .3) * c.speed * dt - (o.travel ?? 0) * dt * .3;
        c.g.visible = i < shown;
        c.g.position.x = wrap(c.x, o.x, 80);
        c.g.position.z = wrap(c.z, o.z, 80);
      });

      // Sun and moon sit high to the south-west and north-east; stars come out on clear nights.
      const day = 1 - o.night;
      sunDisc.position.set(cam.x - 38, cam.y + 42, cam.z - 30);
      moonDisc.position.set(cam.x + 34, cam.y + 40, cam.z - 34);
      (sunDisc.material as THREE.SpriteMaterial).opacity = day * (1 - grey * 1.1);
      (moonDisc.material as THREE.SpriteMaterial).opacity = o.night * (1 - grey);
      stars.position.copy(cam);
      starOpacity.value = Math.max(0, o.night - cloudAmount * .6) * .9;
    },
    dispose() {
      group.removeFromParent();
      for (const g of [rainGeo, snowGeo, splashGeo, puff, starGeo]) g.dispose();
      for (const m of [rainMat, snowMat, splashMat, cloudMat, starMat]) m.dispose();
      for (const s of [sunDisc, moonDisc]) { (s.material as THREE.SpriteMaterial).map?.dispose(); s.material.dispose(); }
      splashes.dispose();
    },
  };
}
