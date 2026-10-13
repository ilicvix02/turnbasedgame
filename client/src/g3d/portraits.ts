// Renders hero card portraits from the 3D models (offscreen), cached as data URLs.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { getHero } from '@shared/engine/registry';
import { Hero3D } from './hero3d';
import { animClips } from './assets';

const W = 240, H = 320;
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
const cache = new Map<string, string>();
const waiting = new Map<string, Promise<string>>();
let chain: Promise<unknown> = Promise.resolve();
const ELEM_BG: Record<string, [string, string]> = {
  flame: ['#5a1a10', '#1a0606'], frost: ['#14365a', '#060e1a'], verdant: ['#1a4a22', '#061206'], radiant: ['#5a4a14', '#1a1406'], umbral: ['#3a1a5a', '#0e0618'],
};

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  camera = new THREE.PerspectiveCamera(24, W / H, 0.1, 50);
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(2, 3, 4);
  const rim = new THREE.DirectionalLight(0xaac0ff, 3);
  rim.position.set(-3, 2, -3);
  scene.add(new THREE.HemisphereLight(0xc8d0ff, 0x302838, 1.0), key, rim);
}

function bgTexture(el: string) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  const [a, b] = ELEM_BG[el] || ELEM_BG.umbral;
  const g = x.createRadialGradient(W / 2, H * 0.35, 10, W / 2, H * 0.45, H * 0.75);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  x.globalAlpha = 0.15;
  x.strokeStyle = '#ffffff';
  for (let i = 0; i < 14; i++) { x.beginPath(); x.arc(W / 2, H * 0.35, 30 + i * 18, 0, Math.PI * 2); x.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Portrait data URL for a hero (bust shot); `full` frames the whole body. */
export function portrait(heroId: string, full = false): Promise<string> {
  const key = heroId + (full ? ':f' : '');
  const got = cache.get(key);
  if (got) return Promise.resolve(got);
  const w = waiting.get(key);
  if (w) return w;
  const p = (chain = chain.then(async () => {
    if (!renderer) init();
    await animClips();
    const def = getHero(heroId);
    const h = await Hero3D.create(def);
    scene.background = bgTexture(def.element);
    scene.add(h.root);
    h.root.rotation.y = 0.35;
    h.update(0.4, 0.4);
    h.update(0.6, 1.0);
    h.root.updateMatrixWorld(true);
    const head = h.headWorld();
    if (full) {
      camera.position.set(0.5, h.height * 0.6, 5.2 * (h.height / 1.8));
      camera.lookAt(0, h.height * 0.5, 0);
    } else {
      camera.position.set(head.x + 0.4, head.y + 0.1, head.z + 1.75);
      camera.lookAt(head.x, head.y - 0.06, head.z);
    }
    h.aura.visible = false;
    renderer!.render(scene, camera);
    const url = renderer!.domElement.toDataURL('image/webp', 0.9);
    h.dispose();
    (scene.background as THREE.Texture).dispose();
    cache.set(key, url);
    return url;
  })) as Promise<string>;
  waiting.set(key, p);
  return p;
}

/** Fill an <img> lazily. */
export function portraitImg(heroId: string, cls = 'port', full = false): HTMLImageElement {
  const img = document.createElement('img');
  img.className = cls;
  img.alt = '';
  img.draggable = false;
  img.decoding = 'async';
  const c = cache.get(heroId + (full ? ':f' : ''));
  if (c) img.src = c;
  else {
    // pre-rendered at build time (scripts/build-portraits.ts); fall back to rendering live
    img.src = `/portraits/${heroId}${full ? '_full' : ''}.webp`;
    img.onerror = () => { img.onerror = null; void portrait(heroId, full).then((u) => { img.src = u; }); };
  }
  return img;
}
