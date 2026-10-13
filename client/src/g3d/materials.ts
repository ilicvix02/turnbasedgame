// Per-hero recolouring of the CC0 Quaternius textures via shader patches (hue-band remapping keeps all texture detail).
import * as THREE from 'three';

export type RecolorMode = 'ranger' | 'peasant' | 'skin' | 'hair' | 'eyes' | 'monster' | 'base';

const GLSL_HSV = `
vec3 rgb2hsv_(vec3 c){vec4 K=vec4(0.,-1./3.,2./3.,-1.);vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));float d=q.x-min(q.w,q.y);float e=1.0e-10;return vec3(abs(q.z+(q.w-q.y)/(6.*d+e)),d/(q.x+e),q.x);}
float lum_(vec3 c){return dot(c,vec3(0.299,0.587,0.114));}
vec3 paint_(vec3 col, float v){ float l = max(0.08, lum_(col)); return col * (v / l) * 0.85 + col * 0.12 * v; }
`;

export interface Palette {
  primary: THREE.Color;
  secondary: THREE.Color;
  accent: THREE.Color;
  amount: number;
}

/** Clone a glTF material and patch its fragment shader to remap colours. */
export function recolor(src: THREE.Material, mode: RecolorMode, pal: Palette, emissive?: THREE.Color, keepJoints?: number[]): THREE.MeshStandardMaterial {
  const m = (src as THREE.MeshStandardMaterial).clone();
  m.envMapIntensity = 0.9;
  if (emissive) { m.emissive = emissive.clone(); m.emissiveIntensity = 0.6; }
  const uniforms = {
    uP: { value: pal.primary.clone() },
    uS: { value: pal.secondary.clone() },
    uA: { value: pal.accent.clone() },
    uAmt: { value: pal.amount },
  };
  const modeId = { ranger: 0, peasant: 1, skin: 2, hair: 3, eyes: 4, monster: 5, base: 6 }[mode];
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    if (keepJoints) {
      // Shrink every vertex not driven by the kept joints (head/neck) so the outfit parts cover the base body cleanly.
      const cond = (c: string) => keepJoints.map((j) => `abs(skinIndex.${c} - ${j.toFixed(1)}) < 0.5`).join(' || ');
      sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      {
        float hw = 0.0;
        if (${cond('x')}) hw += skinWeight.x;
        if (${cond('y')}) hw += skinWeight.y;
        if (${cond('z')}) hw += skinWeight.z;
        if (${cond('w')}) hw += skinWeight.w;
        transformed -= objectNormal * 0.035 * (1.0 - clamp(hw * 1.6, 0.0, 1.0));
      }`);
    }
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform vec3 uP; uniform vec3 uS; uniform vec3 uA; uniform float uAmt;\n${GLSL_HSV}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec3 c = diffuseColor.rgb;
        vec3 hsv = rgb2hsv_(c);
        float v = lum_(c);
        vec3 o = c;
        int MODE = ${modeId};
        if (MODE == 0) {
          float green = smoothstep(0.17, 0.22, hsv.x) * (1.0 - smoothstep(0.45, 0.52, hsv.x)) * smoothstep(0.15, 0.3, hsv.y);
          float brown = (1.0 - smoothstep(0.1, 0.16, hsv.x)) * smoothstep(0.2, 0.35, hsv.y);
          float metal = 1.0 - smoothstep(0.08, 0.22, hsv.y);
          o = mix(o, paint_(uP, v * 1.0), green);
          o = mix(o, paint_(uS, v * 1.05), brown * 0.92);
          o = mix(o, o * mix(vec3(1.0), uA * 1.6, 0.35), metal);
        } else if (MODE == 1) {
          float light = smoothstep(0.42, 0.62, hsv.z) * (1.0 - smoothstep(0.25, 0.45, hsv.y));
          float tan = smoothstep(0.35, 0.55, hsv.y) * smoothstep(0.35, 0.6, hsv.z);
          float dark = 1.0 - max(light, tan);
          o = mix(o, paint_(uP, v * 0.95), light);
          o = mix(o, paint_(uA, v * 1.1), tan * 0.85);
          o = mix(o, paint_(uS, v * 1.35), dark * 0.9);
        } else if (MODE == 2) {
          float clothy = 1.0 - smoothstep(0.08, 0.2, hsv.z); // underwear dark bits
          o = mix(uP * pow(clamp(v / 0.6, 0.0, 1.6), 1.1) * 0.92, paint_(uS, v), clothy);
        } else if (MODE == 3) {
          o = paint_(uP, pow(v, 1.15) * 0.95);
        } else if (MODE == 4) {
          float iris = smoothstep(0.1, 0.3, hsv.y);
          o = mix(o, paint_(uP, v * 1.4), iris);
        } else if (MODE == 5) {
          o = mix(o, paint_(uP, v * 1.1), 0.75);
        }
        diffuseColor.rgb = mix(c, o, uAmt);
      }`);
  };
  m.customProgramCacheKey = () => `rc${modeId}${keepJoints ? 'k' + keepJoints.join('_') : ''}`;
  m.needsUpdate = true;
  return m;
}

/** Simple lit materials for code-built gear. */
export const gearMat = {
  metal: (c: string | number, rough = 0.28) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), metalness: 0.92, roughness: rough, envMapIntensity: 1.2 }),
  gold: () => new THREE.MeshStandardMaterial({ color: 0xffcf6a, metalness: 1, roughness: 0.22, envMapIntensity: 1.4 }),
  cloth: (c: string | number) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), metalness: 0, roughness: 0.85, side: THREE.DoubleSide }),
  leather: (c: string | number) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), metalness: 0.05, roughness: 0.6 }),
  wood: () => new THREE.MeshStandardMaterial({ color: 0x6a4424, metalness: 0, roughness: 0.7 }),
  glow: (c: string | number, intensity = 3) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), emissive: new THREE.Color(c), emissiveIntensity: intensity, roughness: 0.3, toneMapped: false }),
  gem: (c: string | number) => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c), metalness: 0, roughness: 0.05, transmission: 0.2, emissive: new THREE.Color(c), emissiveIntensity: 0.8, clearcoat: 1 }),
  horn: (c: string | number) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), metalness: 0.1, roughness: 0.45 }),
  feather: (c: string | number) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.9, side: THREE.DoubleSide, emissive: new THREE.Color(c), emissiveIntensity: 0.15 }),
};
