// Dev gallery: /preview.html?ids=a,b,c&cols=6&anim=idle
import * as THREE from 'three';
import '@shared/data/index';
import { PLAYABLE } from '@shared/data/index';
import { HEROES } from '@shared/engine/registry';
import { Stage } from './g3d/stage';
import { Hero3D, type AnimName } from './g3d/hero3d';

const q = new URLSearchParams(location.search);
if (q.get('wrot')) (globalThis as any).__wrot = q.get('wrot')!.split(',').map(Number);
document.body.style.cssText = 'margin:0;background:#0b0a14;overflow:hidden;height:100vh';
const st = new Stage(document.body, { pixelRatio: Number(q.get('pr') || 1.5) });
st.scene.background = new THREE.Color(0x15122a);
st.lightRig();
const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: 0x24203a, roughness: 0.9 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
st.scene.add(ground);
let list = q.get('ids') ? q.get('ids')!.split(',').map((i) => HEROES[i]) : q.get('monsters') ? Object.values(HEROES).filter((h) => h.monster) : PLAYABLE();
const page = Number(q.get('page') || 0), per = Number(q.get('per') || 60);
list = list.slice(page * per, page * per + per);
const cols = Number(q.get('cols') || 10);
const sp = 1.15;
const rows = Math.ceil(list.length / cols);
st.camera.position.set(0, rows * 1.2 + 1.5, rows * 2.6 + 4.5);
st.camera.lookAt(0, 0.6, -rows * 0.9);
const heroes: Hero3D[] = [];
(async () => {
  await Promise.all(list.map(async (d, i) => {
    const h = await Hero3D.create(d);
    h.root.position.set((i % cols - (cols - 1) / 2) * sp, 0, -Math.floor(i / cols) * 1.9);
    h.root.rotation.y = Number(q.get('rot') || 0.25);
    st.scene.add(h.root);
    heroes.push(h);
    const a = q.get('anim') as AnimName | null;
    if (a) h.play(a);
  }));
  (window as any).__ready = true;
})();
st.tick((dt, t) => { for (const h of heroes) h.update(dt, t); });
