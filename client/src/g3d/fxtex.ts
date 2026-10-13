// Kenney CC0 particle sprites as three.js textures.
import * as THREE from 'three';
const loader = new THREE.TextureLoader();
const cache = new Map<string, THREE.Texture>();
export function fxTexture(name: string): THREE.Texture {
  let t = cache.get(name);
  if (!t) {
    t = loader.load(`/assets/fx/${name}.png`);
    t.colorSpace = THREE.SRGBColorSpace;
    cache.set(name, t);
  }
  return t;
}
export const FX = ['circle_05', 'flare_01', 'light_01', 'light_02', 'light_03', 'magic_01', 'magic_02', 'magic_03', 'magic_04', 'magic_05', 'fire_01', 'fire_02', 'flame_01', 'flame_03', 'flame_05', 'smoke_01', 'smoke_04', 'smoke_07', 'spark_01', 'spark_04', 'spark_06', 'star_01', 'star_04', 'star_06', 'star_08', 'slash_01', 'slash_02', 'slash_03', 'slash_04', 'scorch_01', 'twirl_01', 'twirl_02', 'trace_01', 'trace_03', 'symbol_01', 'symbol_02', 'dirt_01', 'muzzle_01', 'scratch_01', 'window_01'];
export function preloadFx() { for (const n of FX) fxTexture(n); }
