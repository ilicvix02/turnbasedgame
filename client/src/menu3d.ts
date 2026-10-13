// Shared animated 3D backdrop for menu screens (lobby, heroes, summon...).
import * as THREE from 'three';
import { getHero } from '@shared/engine/registry';
import { Stage } from './g3d/stage';
import { Environment } from './g3d/env';
import { Hero3D } from './g3d/hero3d';
import { Fx } from './g3d/fx';

let stage: Stage | null = null;
let env: Environment | null = null;
let fx: Fx | null = null;
let showcase: Hero3D[] = [];
let off: (() => void) | null = null;
let token = 0;
let camGoal = { pos: new THREE.Vector3(0, 1.5, 6.5), look: new THREE.Vector3(0, 1.1, 0) };
let spin = 0;

export function menuStage() {
  if (!stage) {
    stage = new Stage(document.getElementById('stage')!, { bloom: 0.38 });
    env = new Environment('lobby', { radius: 4.5 });
    stage.scene.add(env.group);
    stage.scene.fog = new THREE.Fog(new THREE.Color(env.theme.fog), 14, 60);
    fx = new Fx(stage.scene);
    stage.camera.position.set(0, 2, 9);
    off = stage.tick((dt, t) => {
      env!.update(dt, t);
      fx!.update(dt);
      for (const h of showcase) h.update(dt, t);
      if (spin && showcase[0]) showcase[0].root.rotation.y += dt * spin;
      stage!.camera.position.lerp(camGoal.pos, 1 - Math.pow(0.05, dt));
      stage!.camera.lookAt(camGoal.look);
    });
  }
  stage.renderer.domElement.style.display = '';
  return { stage, env: env!, fx: fx! };
}

export function hideMenuStage() {
  if (stage) {
    off?.();
    for (const h of showcase) h.dispose();
    showcase = [];
    stage.dispose();
    stage = null;
    env = null;
    fx = null;
  }
}

export type ShowcaseLayout = 'lobby' | 'detail' | 'pair' | 'summon' | 'title';

/** Show one or more heroes on the backdrop. */
export async function showHeroes(ids: string[], layout: ShowcaseLayout = 'lobby') {
  const my = ++token;
  const { stage: st, fx: f } = menuStage();
  const built = await Promise.all(ids.map((id) => Hero3D.create(getHero(id))));
  if (my !== token) { built.forEach((b) => b.dispose()); return; }
  for (const h of showcase) h.dispose();
  showcase = built;
  spin = 0;
  built.forEach((h, i) => {
    st.scene.add(h.root);
    if (layout === 'pair' || layout === 'title') {
      const n = built.length;
      h.root.position.set((i - (n - 1) / 2) * 1.6, 0, i % 2 ? -0.6 : 0);
      h.root.rotation.y = (i - (n - 1) / 2) * -0.25;
    } else if (layout === 'lobby') {
      h.root.position.set(-1.3, 0, 0);
      h.root.rotation.y = 0.35;
    } else if (layout === 'detail') {
      h.root.position.set(-1.2, 0, 0);
      h.root.rotation.y = 0.3;
    } else {
      h.root.position.set(0, 0, 0);
      h.root.rotation.y = 0;
    }
    f.pillar(h.root.position, getHero(ids[i]).look.aura, 4, 1.2, 0.9);
  });
  const hh = built[0]?.height ?? 1.8;
  if (layout === 'lobby') camGoal = { pos: new THREE.Vector3(0.2, 1.5, 5.4 * (hh / 1.8)), look: new THREE.Vector3(0.2, 1.05 * (hh / 1.8), 0) };
  else if (layout === 'detail') camGoal = { pos: new THREE.Vector3(0.6, 1.3, 4.6 * (hh / 1.8)), look: new THREE.Vector3(0.4, 0.95 * (hh / 1.8), 0) };
  else if (layout === 'summon') camGoal = { pos: new THREE.Vector3(0, 1.3, 4.3), look: new THREE.Vector3(0, 1.0, 0) };
  else camGoal = { pos: new THREE.Vector3(0, 1.8, 7.5), look: new THREE.Vector3(0, 1.1, 0) };
}

export function setSpin(v: number) { spin = v; }
export function rotateShowcase(d: number) { if (showcase[0]) showcase[0].root.rotation.y += d; }
export function showcaseHero() { return showcase[0]; }
export function menuFx() { return fx; }
export function setCam(pos: THREE.Vector3, look: THREE.Vector3) { camGoal = { pos, look }; }
