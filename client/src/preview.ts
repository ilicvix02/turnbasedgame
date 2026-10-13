import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(2);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1830);
const cam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 100);
cam.position.set(0, 1.6, 9);
cam.lookAt(0, 1.0, 0);
scene.add(new THREE.HemisphereLight(0xcfd8ff, 0x2a2030, 1.4));
const key = new THREE.DirectionalLight(0xffffff, 2.6);
key.position.set(3, 6, 5);
key.castShadow = true;
scene.add(key);
const rim = new THREE.DirectionalLight(0x9fb8ff, 2.0);
rim.position.set(-4, 3, -4);
scene.add(rim);
const ground = new THREE.Mesh(new THREE.CircleGeometry(8, 64), new THREE.MeshStandardMaterial({ color: 0x2a2640 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const loader = new GLTFLoader();
const load = (u: string) => new Promise<any>((r, j) => loader.load(u, r, undefined, j));
const mixers: THREE.AnimationMixer[] = [];
const q = new URLSearchParams(location.search);
(async () => {
  const anims = await load('/models/q/anims.glb');
  const kkAnim = await load('/models/kk/Rig_Medium_General.glb');
  const items: [string, number, string][] = [
    ['/models/qo/Female_Ranger.gltf', -3.2, q.get('a1') || 'Sword_Idle'],
    ['/models/qo/Male_Ranger.gltf', -1.6, q.get('a2') || 'Spell_Simple_Idle_Loop'],
    ['/models/q/Superhero_Female_FullBody.gltf', 0, 'Idle_Loop'],
    ['/models/kk/Knight.glb', 1.6, 'Idle_A'],
    ['/models/kk/Mage.glb', 2.8, 'Idle_B'],
    ['/models/mon/Imp.glb', 4.0, ''],
  ];
  for (const [u, x, an] of items) {
    const g = await load(u);
    const m = g.scene;
    m.position.x = x;
    m.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; } });
    scene.add(m);
    const mixer = new THREE.AnimationMixer(m);
    const clips = u.includes('/kk/') ? kkAnim.animations : g.animations.length ? g.animations : anims.animations;
    const clip = clips.find((c: any) => c.name === an) || clips.find((c: any) => /idle/i.test(c.name)) || clips[0];
    if (clip) mixer.clipAction(clip).play();
    mixers.push(mixer);
    (window as any).__names = (window as any).__names || {};
    (window as any).__names[u] = g.animations.map((a: any) => a.name).join(',');
  }
  (window as any).__ready = true;
})();
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => { const dt = clock.getDelta(); for (const m of mixers) m.update(dt); renderer.render(scene, cam); });
