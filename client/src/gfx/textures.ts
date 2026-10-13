// Texture registry: Kenney CC0 particle sprites + game-icons rendered to textures.
import { Assets, Texture } from 'pixi.js';
import ICONS from '../gen/icons.json';

export const FX_NAMES = ['circle_05', 'flare_01', 'light_01', 'light_02', 'light_03', 'magic_01', 'magic_02', 'magic_03', 'magic_04', 'magic_05', 'fire_01', 'fire_02', 'flame_01', 'flame_03', 'flame_05', 'smoke_01', 'smoke_04', 'smoke_07', 'spark_01', 'spark_04', 'spark_06', 'star_01', 'star_04', 'star_06', 'star_08', 'slash_01', 'slash_02', 'slash_03', 'slash_04', 'scorch_01', 'twirl_01', 'twirl_02', 'trace_01', 'trace_03', 'symbol_01', 'symbol_02', 'dirt_01', 'muzzle_01', 'scratch_01', 'window_01'] as const;
export type FxName = (typeof FX_NAMES)[number];
const fx = new Map<string, Texture>();

export async function loadTextures() {
  await Promise.all(FX_NAMES.map(async (n) => {
    try { fx.set(n, await Assets.load<Texture>(`/assets/fx/${n}.png`)); } catch { fx.set(n, Texture.WHITE); }
  }));
}
export function fxTex(n: FxName | string): Texture {
  return fx.get(n) || Texture.WHITE;
}

const iconCache = new Map<string, Texture>();
const ICON_MAP = ICONS as Record<string, string>;
/** Rasterise a game-icons SVG into a texture (cached). Returns WHITE until loaded, then swaps in place. */
export function iconTex(name: string, color = '#ffffff', size = 64): Texture {
  const key = `${name}|${color}|${size}`;
  const got = iconCache.get(key);
  if (got) return got;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const tex = Texture.from(canvas);
  iconCache.set(key, tex);
  const body = ICON_MAP[name] || ICON_MAP['sparkles'] || '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}"><g fill="${color}">${body}</g></svg>`;
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, size, size);
    tex.source.update();
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return tex;
}
