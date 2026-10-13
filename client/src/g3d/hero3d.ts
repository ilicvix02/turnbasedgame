// Assembles a unique 3D hero from the CC0 Quaternius base body + modular outfit parts + hair, recoloured per hero,
// with code-built weapons, headwear, back pieces, skirts and armour attached to bones. Animated by the Universal Animation Library.
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { HeroDef, Look } from '@shared/engine/types';
import { animClips, BASE, HAIR, loadGltf, MONSTERS, PARTS, type PartKey } from './assets';
import { recolor, gearMat, type RecolorMode } from './materials';
import { buildBack, buildHeadwear, buildPlate, buildSkirt, buildWeapon, type PropColors } from './props';
import { hashStr } from '../core/anim';

export type AnimName = 'idle' | 'attack' | 'attack2' | 'cast' | 'castLoop' | 'shoot' | 'hit' | 'death' | 'buff' | 'roll' | 'victory' | 'punch';

const CLIP_FOR: Record<AnimName, string[]> = {
  idle: ['Idle_Loop'],
  attack: ['Sword_Attack'],
  attack2: ['Punch_Cross'],
  punch: ['Punch_Jab'],
  cast: ['Spell_Simple_Shoot'],
  castLoop: ['Spell_Simple_Idle_Loop'],
  shoot: ['Pistol_Shoot'],
  hit: ['Hit_Chest', 'Hit_Head'],
  death: ['Death01'],
  buff: ['Spell_Simple_Enter'],
  roll: ['Roll'],
  victory: ['Dance_Loop'],
};

/** Grip rotation (x,y,z) + offset (x,y,z) in hand_r bone space for each weapon. */
export const GRIP: Record<string, number[]> = {
  default: [Math.PI, 0, 0, 0.08, 0, 0],
  orb: [0, 0, 0, 0.09, 0, 0.02], lantern: [0, 0, 0, 0.09, 0, 0.02], clock: [0, 0, 0, 0.09, 0, 0.02],
  book: [Math.PI, 0, 0, 0.1, 0, 0.03], harp: [Math.PI, 0, 0, 0.1, 0, 0.03],
  gun: [Math.PI / 2, 0, 0, 0.08, 0, 0], shield: [Math.PI, 0, Math.PI / 2, 0.06, 0, 0.05],
  bow: [Math.PI, 0, 0, 0.08, 0, 0.02],
};

const MELEE = new Set(['sword', 'greatsword', 'katana', 'spear', 'scythe', 'hammer', 'axe', 'dagger', 'claws', 'whip', 'gauntlet', 'shield', 'chakram']);

function partsFor(L: Look, id: string): PartKey[] {
  const h = hashStr(id);
  const style = L.outfit.style;
  const pick = (n: number) => (h >> n) & 1;
  let set: PartKey[];
  switch (style) {
    case 'plate': set = ['rangerBody', 'rangerArms', 'rangerLegs', 'rangerFeet', 'rangerPauldrons']; break;
    case 'leather': set = [pick(1) ? 'rangerBody' : 'peasantBody', 'rangerArms', 'rangerLegs', 'rangerFeet']; if (pick(2)) set.push('rangerPauldrons'); break;
    case 'bodysuit': set = ['rangerLegs', 'rangerFeet', 'rangerArms', 'peasantBody']; break;
    case 'tunic': set = ['peasantBody', pick(3) ? 'peasantArms' : 'rangerArms', 'peasantLegs', pick(4) ? 'peasantFeet' : 'rangerFeet']; break;
    case 'coat': set = ['rangerBody', 'peasantArms', 'rangerLegs', 'rangerFeet']; break;
    case 'robe':
    case 'dress':
    default: set = ['peasantBody', 'peasantArms', 'peasantFeet', 'peasantLegs'];
  }
  if (L.head === 'hood') set.push('rangerHood');
  return set;
}

function hairFor(L: Look): (keyof typeof HAIR)[] {
  const fem = !!L.feminine;
  const st = L.hair.style;
  const out: (keyof typeof HAIR)[] = [fem ? 'browF' : 'browM'];
  if (L.head === 'hood' || L.head === 'helm') return out;
  if (st === 'bald') return out;
  if (st === 'long' || st === 'flowing' || st === 'wild') out.push('long');
  else if (st === 'ponytail' || st === 'twin' || st === 'braid') out.push(fem ? 'buns' : 'long');
  else if (st === 'bob') out.push(fem ? 'long' : 'parted');
  else if (st === 'short') out.push('parted');
  else if (st === 'spiky' || st === 'mohawk') out.push(fem ? 'buzzedF' : 'buzzed');
  if (!fem && (L.body === 'giant' || L.body === 'broad') && st !== 'spiky') out.push('beard');
  return out;
}

const col = (c: string) => new THREE.Color(c);
let glowTex: THREE.Texture | null = null;
export function softGlowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

export class Hero3D {
  root = new THREE.Group();
  model!: THREE.Object3D;
  mixer!: THREE.AnimationMixer;
  bones: Record<string, THREE.Bone> = {};
  tip = new THREE.Object3D();
  aura!: THREE.Sprite;
  ring!: THREE.Mesh;
  height = 1.8;
  melee = true;
  def!: HeroDef;
  private actions = new Map<string, THREE.AnimationAction>();
  private current?: THREE.AnimationAction;
  private updaters: ((t: number) => void)[] = [];
  private flashMats: THREE.MeshStandardMaterial[] = [];
  private flashT = 0;
  private motes?: THREE.Points;
  disposed = false;

  static async create(def: HeroDef): Promise<Hero3D> {
    const h = new Hero3D();
    await h.build(def);
    return h;
  }

  private async build(def: HeroDef) {
    this.def = def;
    const L = def.look;
    this.melee = MELEE.has(L.weapon);
    const pal: PropColors = { primary: L.outfit.primary, secondary: L.outfit.secondary, accent: L.outfit.accent, aura: L.aura, hair: L.hair.color, eyes: L.eyes };
    const monsterKind = def.id === 'ash_hound' || def.id === 'cinder_imp' || def.id === 'ashmaw' ? 'imp' : def.id === 'thornling' || def.id === 'bog_lurker' || def.id === 'colossus' ? 'puglin' : null;
    const clips = await animClips();

    if (monsterKind) {
      const g = await loadGltf(MONSTERS[monsterKind]);
      this.model = SkeletonUtils.clone(g.scene);
      this.model.traverse((o: any) => {
        if (o.isBone) this.bones[o.name] = o;
        if (o.isMesh) {
          o.castShadow = true;
          o.frustumCulled = false;
          o.material = recolor(o.material, 'monster', { primary: col(L.outfit.primary), secondary: col(L.outfit.secondary), accent: col(L.outfit.accent), amount: 0.55 });
          this.flashMats.push(o.material);
        }
      });
    } else {
      const fem = !!L.feminine;
      const base = await loadGltf(fem ? BASE.f : BASE.m);
      this.model = SkeletonUtils.clone(base.scene);
      let armature: THREE.Object3D | undefined;
      this.model.traverse((o: any) => {
        if (o.isBone) this.bones[o.name] = o;
        if (o.name === 'Armature') armature = o;
      });
      const skinPal = { primary: col(L.skin), secondary: col(L.outfit.secondary), accent: col(L.outfit.accent), amount: 1 };
      const gender = fem ? 'f' : 'm';
      const parts = partsFor(L, def.id);
      const partGltfs = await Promise.all(parts.map((p) => loadGltf(PARTS[gender][p])));
      const hairGltfs = await Promise.all(hairFor(L).map((k) => loadGltf(HAIR[k])));
      const attach = (scene: THREE.Object3D) => {
        const clone = SkeletonUtils.clone(scene);
        const meshes: THREE.SkinnedMesh[] = [];
        clone.traverse((o: any) => { if (o.isSkinnedMesh) meshes.push(o); });
        for (const m of meshes) {
          const bones = m.skeleton.bones.map((b) => this.bones[b.name] || b);
          m.bind(new THREE.Skeleton(bones, m.skeleton.boneInverses), m.bindMatrix);
          (armature || this.model).add(m);
        }
      };
      for (const g of partGltfs) attach(g.scene);
      for (const g of hairGltfs) attach(g.scene);
      // materials
      const outfitPal = { primary: col(L.outfit.primary), secondary: col(L.outfit.secondary), accent: col(L.outfit.accent), amount: 1 };
      const hairPal = { primary: col(L.hair.color), secondary: col(L.hair.color), accent: col(L.hair.color), amount: 1 };
      const eyePal = { primary: col(L.eyes), secondary: col(L.eyes), accent: col(L.eyes), amount: 1 };
      const special = def.id === 'wisp' || def.id === 'frost_wraith' ? 'ghost' : def.id === 'automaton' || def.id === 'sentinel' || def.id === 'drone' ? 'metal' : def.id === 'glacier_golem' || def.id === 'matriarch' ? 'ice' : def.id === 'bone_archer' ? 'bone' : null;
      this.model.traverse((o: any) => {
        if (!o.isMesh) return;
        o.castShadow = true;
        o.frustumCulled = false;
        const name: string = o.material?.name || '';
        let mode: RecolorMode = 'base';
        let p = outfitPal;
        if (/Ranger/.test(name)) mode = 'ranger';
        else if (/Peasant/.test(name)) mode = 'peasant';
        else if (/Superhero|Regular/.test(name)) { mode = 'skin'; p = skinPal; }
        else if (/Hair/.test(name)) { mode = 'hair'; p = hairPal; }
        else if (/Eye/.test(name)) { mode = 'eyes'; p = eyePal; }
        const emissive = mode === 'eyes' ? col(L.eyes) : undefined;
        let keep: number[] | undefined;
        if (o.isSkinnedMesh && /Superhero/.test(name)) {
          const names = (o as THREE.SkinnedMesh).skeleton.bones.map((b) => b.name);
          keep = ['Head', 'neck_01'].map((n) => names.indexOf(n)).filter((i) => i >= 0);
        }
        const m = recolor(o.material, mode, p, emissive, keep);
        if (special === 'ghost') { m.transparent = true; m.opacity = 0.72; m.emissive = col(L.aura); m.emissiveIntensity = 0.55; }
        if (special === 'metal' && mode === 'skin') { m.metalness = 0.85; m.roughness = 0.3; }
        if (special === 'ice' && mode === 'skin') { m.emissive = col('#5ac8ff'); m.emissiveIntensity = 0.25; m.roughness = 0.15; }
        if (special === 'bone' && mode === 'skin') { m.color = col('#e8e0d0'); }
        // the base body sits under the clothes: push it back in depth so outfit parts always win
        o.material = m;
        this.flashMats.push(m);
      });
    }

    // animations
    this.mixer = new THREE.AnimationMixer(this.model);
    for (const [k, names] of Object.entries(CLIP_FOR)) {
      const clip = clips.find((c) => names.includes(c.name));
      if (!clip) continue;
      const a = this.mixer.clipAction(clip);
      if (k !== 'idle' && k !== 'castLoop' && k !== 'victory') { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      this.actions.set(k, a);
    }
    // idle variant per weapon type
    const idleName = this.melee ? 'Sword_Idle' : L.weapon === 'gun' ? 'Pistol_Idle_Loop' : ['staff', 'orb', 'book', 'lantern', 'clock', 'harp', 'fan'].includes(L.weapon) ? 'Spell_Simple_Idle_Loop' : 'Idle_Loop';
    const idleClip = clips.find((c) => c.name === idleName);
    if (idleClip) this.actions.set('idle', this.mixer.clipAction(idleClip));
    this.play('idle', 0);

    // bind pose world transforms for sockets
    this.model.updateMatrixWorld(true);
    this.addGear(L, pal);

    // scale per body type
    const S: Record<Look['body'], [number, number]> = { slim: [0.96, 1.0], normal: [1, 1], broad: [1.1, 1.02], tall: [1, 1.07], small: [0.95, 0.9], giant: [1.18, 1.16] };
    const [sx, sy] = S[L.body];
    const extra = L.scale ?? 1;
    this.model.scale.set(sx * extra, sy * extra, sx * extra);
    this.root.add(this.model);
    this.height = 1.8 * sy * extra;

    // aura glow + ground ring + motes
    this.aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: softGlowTexture(), color: col(L.aura), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.aura.scale.set(1.9 * sx * extra, 2.6 * sy * extra, 1);
    this.aura.position.y = 0.95 * sy * extra;
    this.aura.renderOrder = -1;
    this.root.add(this.aura);
    const ringMat = new THREE.MeshBasicMaterial({ map: softGlowTexture(), color: col(L.aura), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
    this.ring = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.01;
    this.root.add(this.ring);
    const n = def.rarity === 5 ? 26 : def.rarity === 4 ? 14 : 6;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const seeds = new Float32Array(n);
    for (let i = 0; i < n; i++) seeds[i] = Math.random() * 100;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.motes = new THREE.Points(geo, new THREE.PointsMaterial({ map: softGlowTexture(), color: col(L.aura), size: 0.09, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.root.add(this.motes);
    this.updaters.push((t) => {
      for (let i = 0; i < n; i++) {
        const s = seeds[i];
        const k = ((t * 0.25 + s) % 1);
        const a = s * 6.28 + t * 0.6;
        pos[i * 3] = Math.cos(a) * (0.35 + (s % 0.3));
        pos[i * 3 + 1] = k * this.height * 1.1;
        pos[i * 3 + 2] = Math.sin(a) * (0.3 + (s % 0.25));
      }
      geo.attributes.position.needsUpdate = true;
      (this.motes!.material as THREE.PointsMaterial).opacity = 0.6;
    });
  }

  /** Create a socket under a bone whose axes match character space in the bind pose. */
  private socket(boneName: string): THREE.Object3D | null {
    const bone = this.bones[boneName];
    if (!bone) return null;
    const s = new THREE.Object3D();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    const p = new THREE.Vector3();
    bone.matrixWorld.decompose(p, q, sc);
    const rootQ = new THREE.Quaternion();
    this.model.getWorldQuaternion(rootQ);
    s.quaternion.copy(q.invert().multiply(rootQ));
    s.scale.set(1 / sc.x, 1 / sc.y, 1 / sc.z);
    bone.add(s);
    return s;
  }

  private addGear(L: Look, pal: PropColors) {
    // weapon in right hand
    const handBone = this.bones['hand_r'];
    let hand: THREE.Object3D | null = null;
    if (handBone) {
      hand = new THREE.Object3D();
      const sc = new THREE.Vector3();
      handBone.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), sc);
      hand.scale.set(1 / sc.x, 1 / sc.y, 1 / sc.z);
      handBone.add(hand);
    }
    if (hand) {
      const { obj, tip } = buildWeapon(L.weapon, pal);
      const holder = new THREE.Group();
      holder.add(obj);
      // grip orientation (tuned for the UAL rig: hand_r in T-pose, palm down, fingers along -X)
      const dbg = (globalThis as any).__wrot as number[] | undefined;
      const r = dbg ?? GRIP[L.weapon] ?? GRIP.default;
      holder.rotation.set(r[0], r[1], r[2]);
      holder.position.set(r[3] ?? 0.08, r[4] ?? 0.0, r[5] ?? 0.0);
      hand.add(holder);
      this.tip = tip;
    }
    const head = this.socket('Head');
    const hw = buildHeadwear(L.head, pal);
    if (head && hw) { hw.position.y = -0.04; head.add(hw); }
    const spine = this.socket('spine_03');
    const back = buildBack(L.back, pal);
    if (spine && back) {
      spine.add(back.obj);
      if (back.animated) this.updaters.push(back.animated);
    }
    const pelvis = this.socket('pelvis');
    const skirt = buildSkirt(L.outfit.style, pal, !!L.feminine);
    if (pelvis && skirt) {
      skirt.obj.position.y = 0.06;
      pelvis.add(skirt.obj);
      if (skirt.animated) this.updaters.push(skirt.animated);
    }
    if (L.outfit.style === 'plate') {
      const [chest, pl, pr] = buildPlate(pal);
      if (spine) { chest.position.set(0, 0.0, 0.03); spine.add(chest); }
      const cl = this.socket('upperarm_l'), cr = this.socket('upperarm_r');
      if (cl) { pl.position.set(0, 0.04, 0); cl.add(pl); }
      if (cr) { pr.position.set(0, 0.04, 0); cr.add(pr); }
    }
  }

  play(name: AnimName, fade = 0.18, timeScale = 1): number {
    const a = this.actions.get(name) || this.actions.get('idle');
    if (!a) return 0;
    if (this.current === a && (name === 'idle' || name === 'castLoop')) return a.getClip().duration;
    a.reset();
    a.timeScale = timeScale;
    a.enabled = true;
    a.setEffectiveWeight(1);
    if (this.current && this.current !== a) a.crossFadeFrom(this.current, fade, false);
    a.play();
    this.current = a;
    return a.getClip().duration / timeScale;
  }

  /** Play a one-shot then return to idle. Resolves at `at` fraction of the clip (impact moment). */
  async oneShot(name: AnimName, impactAt = 0.5, speed = 1): Promise<() => Promise<void>> {
    const dur = this.play(name, 0.12, speed);
    await sleepReal(dur * 1000 * impactAt);
    return async () => {
      await sleepReal(dur * 1000 * (1 - impactAt));
      if (!this.disposed && this.current === this.actions.get(name) && name !== 'death') this.play('idle', 0.25);
    };
  }

  flash(color = 0xffffff) {
    this.flashT = 1;
    for (const m of this.flashMats) { if (!m.userData.e0) m.userData.e0 = m.emissive.clone(); m.emissive.set(color); }
  }

  update(dt: number, t: number) {
    if (this.disposed) return;
    this.mixer.update(dt);
    for (const u of this.updaters) u(t);
    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt * 4);
      for (const m of this.flashMats) { const e0 = m.userData.e0 as THREE.Color; m.emissive.copy(e0).lerp(new THREE.Color(0xffffff), this.flashT * 0.85); m.emissiveIntensity = Math.max(m.emissiveIntensity, this.flashT * 1.2); }
    }
    this.aura.material.opacity = 0.16 + Math.sin(t * 2.2) * 0.05;
  }

  tipWorld(out = new THREE.Vector3()) { return this.tip.getWorldPosition(out); }
  chestWorld(out = new THREE.Vector3()) { const b = this.bones['spine_03']; return b ? b.getWorldPosition(out) : this.root.getWorldPosition(out).setY(1.2); }
  headWorld(out = new THREE.Vector3()) { const b = this.bones['Head']; return b ? b.getWorldPosition(out) : this.root.getWorldPosition(out).setY(1.7); }

  dispose() {
    this.disposed = true;
    this.mixer.stopAllAction();
    this.root.removeFromParent();
    this.root.traverse((o: any) => { if (o.isMesh && !o.isSkinnedMesh) o.geometry?.dispose(); });
  }
}

const sleepReal = (ms: number) => new Promise((r) => setTimeout(r, ms));
export { gearMat };
