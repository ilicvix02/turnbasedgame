// 3D visual effects: additive sprite particles, projectiles, slashes, shockwaves, beams, rains and auras.
import * as THREE from 'three';
import { fxTexture } from './fxtex';
import { softGlowTexture } from './hero3d';

interface Particle {
  s: THREE.Sprite;
  vel: THREE.Vector3;
  life: number;
  max: number;
  grow: number;
  spin: number;
  gravity: number;
  fade: number;
  size0: number;
  drag: number;
}

export interface BurstOpts {
  tex?: string; color?: number | string; count?: number; speed?: number; size?: number; life?: number; gravity?: number;
  spread?: number; up?: number; grow?: number; spin?: boolean; additive?: boolean; drag?: number; jitter?: number;
}

export class Fx {
  group = new THREE.Group();
  private parts: Particle[] = [];
  private pool: THREE.Sprite[] = [];
  private custom: { t: number; dur: number; f: (k: number) => void; done?: () => void }[] = [];

  constructor(public scene: THREE.Scene) {
    scene.add(this.group);
  }

  private sprite(tex: string, color: THREE.ColorRepresentation, additive = true): THREE.Sprite {
    let s = this.pool.pop();
    const map = tex === 'glow' ? softGlowTexture() : fxTexture(tex);
    if (!s) s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
    const m = s.material as THREE.SpriteMaterial;
    m.map = map;
    m.color.set(color);
    m.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    m.opacity = 1;
    m.rotation = 0;
    m.needsUpdate = true;
    s.visible = true;
    this.group.add(s);
    return s;
  }

  burst(at: THREE.Vector3, o: BurstOpts = {}) {
    const n = o.count ?? 18;
    for (let i = 0; i < n; i++) {
      const s = this.sprite(o.tex ?? 'spark_01', o.color ?? 0xffffff, o.additive ?? true);
      const dir = new THREE.Vector3(Math.random() - 0.5, (Math.random() - 0.5) * (o.spread ?? 1) + (o.up ?? 0.3), Math.random() - 0.5).normalize();
      const sp = (o.speed ?? 4) * (0.4 + Math.random() * 0.8);
      const size = (o.size ?? 0.35) * (0.6 + Math.random() * 0.8);
      s.position.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * (o.jitter ?? 0.1), (Math.random() - 0.5) * (o.jitter ?? 0.1), (Math.random() - 0.5) * (o.jitter ?? 0.1)));
      s.scale.setScalar(size);
      (s.material as THREE.SpriteMaterial).rotation = Math.random() * Math.PI * 2;
      const life = (o.life ?? 0.7) * (0.6 + Math.random() * 0.7);
      this.parts.push({ s, vel: dir.multiplyScalar(sp), life, max: life, grow: o.grow ?? 0, spin: o.spin ? (Math.random() - 0.5) * 6 : 0, gravity: o.gravity ?? 0, fade: 1, size0: size, drag: o.drag ?? 1.5 });
    }
  }

  /** Single sprite that scales up & fades (impact flare, shockwave, slash). */
  flare(at: THREE.Vector3, o: { tex?: string; color?: number | string; size?: number; grow?: number; life?: number; rotation?: number; additive?: boolean } = {}) {
    const s = this.sprite(o.tex ?? 'flare_01', o.color ?? 0xffffff, o.additive ?? true);
    s.position.copy(at);
    const size = o.size ?? 1.5;
    s.scale.setScalar(size);
    (s.material as THREE.SpriteMaterial).rotation = o.rotation ?? Math.random() * Math.PI * 2;
    const life = o.life ?? 0.4;
    this.parts.push({ s, vel: new THREE.Vector3(), life, max: life, grow: o.grow ?? 1.5, spin: 0, gravity: 0, fade: 1, size0: size, drag: 0 });
    return s;
  }

  /** Flat ground ring shockwave. */
  ring(at: THREE.Vector3, color: number | string, radius = 2.5, life = 0.6, tex = 'circle_05') {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: fxTexture(tex === 'circle_05' ? 'light_01' : tex), color: new THREE.Color(color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.copy(at).setY(0.05);
    this.group.add(m);
    this.tween(life, (k) => { m.scale.setScalar(0.2 + k * radius * 2); (m.material as THREE.MeshBasicMaterial).opacity = 1 - k; }, () => { m.removeFromParent(); m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
  }

  /** Vertical light pillar (buffs, heals, revives). */
  pillar(at: THREE.Vector3, color: number | string, height = 3.5, life = 0.9, radius = 0.6) {
    const geo = new THREE.CylinderGeometry(radius, radius * 1.2, height, 24, 1, true);
    geo.translate(0, height / 2, 0);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, map: fxTexture('trace_01') });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(at).setY(0);
    this.group.add(m);
    this.tween(life, (k) => { mat.opacity = 0.7 * Math.sin(k * Math.PI); m.scale.set(1 - k * 0.3, 0.6 + k * 0.6, 1 - k * 0.3); m.rotation.y += 0.05; }, () => { m.removeFromParent(); geo.dispose(); mat.dispose(); });
  }

  /** Beam between two points. */
  beam(from: THREE.Vector3, to: THREE.Vector3, color: number | string, width = 0.35, life = 0.45) {
    const len = from.distanceTo(to);
    const geo = new THREE.CylinderGeometry(width, width, len, 12, 1, true);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, map: fxTexture('trace_03') });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(from).lerp(to, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    this.group.add(m);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.35, width * 0.35, len, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    core.position.copy(m.position);
    core.quaternion.copy(m.quaternion);
    this.group.add(core);
    this.tween(life, (k) => { const w = Math.sin(Math.min(1, k * 1.5) * Math.PI) + 0.05; m.scale.set(w, 1, w); core.scale.set(w, 1, w); mat.opacity = 1 - k; (core.material as THREE.MeshBasicMaterial).opacity = 1 - k; }, () => { for (const x of [m, core]) { x.removeFromParent(); x.geometry.dispose(); (x.material as THREE.Material).dispose(); } });
  }

  /** Homing projectile with a glowing trail; resolves on arrival. */
  projectile(from: THREE.Vector3, to: THREE.Vector3, o: { tex?: string; color?: number | string; size?: number; speed?: number; arc?: number; trail?: string } = {}): Promise<void> {
    return new Promise((resolve) => {
      const s = this.sprite(o.tex ?? 'flare_01', o.color ?? 0xffffff);
      const size = o.size ?? 0.7;
      s.scale.setScalar(size);
      const dist = from.distanceTo(to);
      const dur = dist / (o.speed ?? 14);
      const ctrl = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, o.arc ?? 0.8, 0));
      let lastTrail = 0;
      this.tween(dur, (k) => {
        const a = from.clone().lerp(ctrl, k), b = ctrl.clone().lerp(to, k);
        s.position.copy(a.lerp(b, k));
        (s.material as THREE.SpriteMaterial).rotation += 0.3;
        if (k - lastTrail > 0.04) {
          lastTrail = k;
          this.burst(s.position, { tex: o.trail ?? 'glow', color: o.color ?? 0xffffff, count: 2, speed: 0.4, size: size * 0.7, life: 0.35 });
        }
      }, () => { this.release(s); resolve(); });
    });
  }

  /** Slash arc sprite across the target. */
  slash(at: THREE.Vector3, color: number | string, size = 2.2, tex = 'slash_02') {
    for (let i = 0; i < 2; i++) this.flare(at.clone().add(new THREE.Vector3(0, i * 0.1, 0)), { tex, color, size: size * (1 - i * 0.2), grow: 0.6, life: 0.32, rotation: -0.6 + i * 1.2 + Math.random() * 0.3 });
    this.burst(at, { tex: 'spark_04', color, count: 14, speed: 6, size: 0.25, life: 0.45 });
  }

  /** Meteors / arrows falling on positions. */
  async rain(targets: THREE.Vector3[], color: number | string, tex = 'flare_01', perTarget = 3) {
    const ps: Promise<void>[] = [];
    for (const t of targets) for (let i = 0; i < perTarget; i++) {
      const from = t.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 8 + Math.random() * 3, (Math.random() - 0.5) * 3));
      const to = t.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.4, (Math.random() - 0.5) * 0.8));
      ps.push(new Promise((r) => setTimeout(() => { void this.projectile(from, to, { tex, color, size: 0.8, speed: 22, arc: 0 }).then(() => { this.flare(to, { tex: 'circle_05', color, size: 1.4, life: 0.35 }); this.burst(to, { tex: 'spark_01', color, count: 8, speed: 4, size: 0.2 }); r(); }); }, i * 90 + Math.random() * 120)));
    }
    await Promise.all(ps);
  }

  /** Rising sparkles around a unit (heals/buffs). */
  sparkle(at: THREE.Vector3, color: number | string, count = 22, tex = 'star_04') {
    for (let i = 0; i < count; i++) {
      const s = this.sprite(tex, color);
      const a = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 0.5;
      s.position.set(at.x + Math.cos(a) * r, at.y + Math.random() * 1.6, at.z + Math.sin(a) * r);
      const size = 0.12 + Math.random() * 0.18;
      s.scale.setScalar(size);
      const life = 0.8 + Math.random() * 0.6;
      this.parts.push({ s, vel: new THREE.Vector3(0, 1.2 + Math.random(), 0), life, max: life, grow: 0, spin: 2, gravity: 0, fade: 1, size0: size, drag: 0.5 });
    }
  }

  tween(dur: number, f: (k: number) => void, done?: () => void) {
    this.custom.push({ t: 0, dur: Math.max(0.001, dur), f, done });
  }

  private release(s: THREE.Sprite) {
    s.visible = false;
    s.removeFromParent();
    this.pool.push(s);
  }

  update(dt: number) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { this.parts.splice(i, 1); this.release(p.s); continue; }
      const k = 1 - p.life / p.max;
      p.vel.y -= p.gravity * dt;
      p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      p.s.position.addScaledVector(p.vel, dt);
      p.s.scale.setScalar(p.size0 * (1 + p.grow * k));
      const m = p.s.material as THREE.SpriteMaterial;
      m.opacity = Math.min(1, (1 - k) * 1.6);
      m.rotation += p.spin * dt;
    }
    for (let i = this.custom.length - 1; i >= 0; i--) {
      const c = this.custom[i];
      c.t += dt;
      const k = Math.min(1, c.t / c.dur);
      c.f(k);
      if (k >= 1) { this.custom.splice(i, 1); c.done?.(); }
    }
  }
}
