// glTF loading + caching for the CC0 Quaternius packs (base bodies, modular outfit parts, hair, animations, monsters).
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map<string, Promise<GLTF>>();

/**
 * Standalone build (scripts/build-standalone.mjs) ships models as .json glTF with base64 buffers.
 * Some hosts' CSP blocks fetching data: URIs, so decode the buffers here and hand three.js a GLB.
 */
async function loadPacked(url: string): Promise<GLTF> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`model ${url}: HTTP ${r.status}`);
  const j = await r.json();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let len = 0;
  for (const b of j.buffers || []) {
    const bin = atob(String(b.uri).slice(String(b.uri).indexOf(',') + 1));
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    offsets.push(len);
    parts.push(u);
    len += (u.length + 3) & ~3;
  }
  for (const v of j.bufferViews || []) { v.byteOffset = (v.byteOffset || 0) + offsets[v.buffer || 0]; v.buffer = 0; }
  j.buffers = len ? [{ byteLength: len }] : [];
  let jsonBytes = new TextEncoder().encode(JSON.stringify(j));
  const jsonLen = (jsonBytes.length + 3) & ~3;
  const total = 12 + 8 + jsonLen + (len ? 8 + len : 0);
  const glb = new Uint8Array(total);
  const dv = new DataView(glb.buffer);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  dv.setUint32(12, jsonLen, true); dv.setUint32(16, 0x4e4f534a, true);
  glb.fill(0x20, 20, 20 + jsonLen);
  glb.set(jsonBytes, 20);
  jsonBytes = new Uint8Array(0);
  if (len) {
    const o = 20 + jsonLen;
    dv.setUint32(o, len, true); dv.setUint32(o + 4, 0x004e4942, true);
    for (let i = 0; i < parts.length; i++) glb.set(parts[i], o + 8 + offsets[i]);
  }
  return new Promise((res, rej) => loader.parse(glb.buffer, url.slice(0, url.lastIndexOf('/') + 1), res, rej));
}

export function loadGltf(url: string): Promise<GLTF> {
  let p = cache.get(url);
  if (!p) {
    p = url.endsWith('.json') ? loadPacked(url) : new Promise((res, rej) => loader.load(url, res, undefined, rej));
    cache.set(url, p);
  }
  return p;
}

export const BASE = { f: 'models/base/Superhero_Female_FullBody.gltf', m: 'models/base/Superhero_Male_FullBody.gltf' };
export const HAIR = {
  long: 'models/hair/Hair_Long.gltf', buns: 'models/hair/Hair_Buns.gltf', parted: 'models/hair/Hair_SimpleParted.gltf',
  buzzed: 'models/hair/Hair_Buzzed.gltf', buzzedF: 'models/hair/Hair_BuzzedFemale.gltf', beard: 'models/hair/Hair_Beard.gltf',
  browF: 'models/hair/Eyebrows_Female.gltf', browM: 'models/hair/Eyebrows_Regular.gltf',
};
const P = 'models/parts/';
export const PARTS = {
  f: {
    rangerBody: P + 'Female_Ranger_Body.gltf', rangerArms: P + 'Female_Ranger_Arms.gltf', rangerLegs: P + 'Female_Ranger_Legs.gltf', rangerFeet: P + 'Female_Ranger_Feet.gltf',
    rangerHood: P + 'Female_Ranger_Head_Hood.gltf', rangerPauldrons: P + 'Female_Ranger_Acc_Pauldrons.gltf',
    peasantBody: P + 'Female_Peasant_Body.gltf', peasantArms: P + 'Female_Peasant_Arms.gltf', peasantLegs: P + 'Female_Peasant_Legs.gltf', peasantFeet: P + 'Female_Peasant_Feet.gltf',
  },
  m: {
    rangerBody: P + 'Male_Ranger_Body.gltf', rangerArms: P + 'Male_Ranger_Arms.gltf', rangerLegs: P + 'Male_Ranger_Legs.gltf', rangerFeet: P + 'Male_Ranger_Feet_Boots.gltf',
    rangerHood: P + 'Male_Ranger_Head_Hood.gltf', rangerPauldrons: P + 'Male_Ranger_Acc_Pauldron.gltf',
    peasantBody: P + 'Male_Peasant_Body.gltf', peasantArms: P + 'Male_Peasant_Arms.gltf', peasantLegs: P + 'Male_Peasant_Legs.gltf', peasantFeet: P + 'Male_Peasant_Feet.gltf',
  },
};
export type PartKey = keyof typeof PARTS.f;
export const MONSTERS = { imp: 'models/monsters/Imp.glb', puglin: 'models/monsters/Puglin.glb' };
export const ANIMS = 'models/anim/ual.glb';

let clips: THREE.AnimationClip[] | null = null;
export async function animClips(): Promise<THREE.AnimationClip[]> {
  if (clips) return clips;
  const g = await loadGltf(ANIMS);
  // strip finger/leaf tracks the outfits don't need → fewer binding warnings, faster mixing
  clips = g.animations.map((c) => {
    const k = c.clone();
    k.tracks = k.tracks.filter((t) => !/leaf|pinky|ring_0|middle_0|index_0|thumb_0/.test(t.name) && !t.name.endsWith('.scale'));
    return k;
  });
  return clips;
}

export async function preloadCore() {
  await Promise.all([loadGltf(BASE.f), loadGltf(BASE.m), animClips()]);
}
