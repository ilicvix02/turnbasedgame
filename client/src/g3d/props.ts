// Code-built 3D gear: weapons, headwear, back pieces, skirts and armour. Units: metres, character-space axes (Y up, Z forward).
import * as THREE from 'three';
import { gearMat } from './materials';
import type { Look } from '@shared/engine/types';

export interface PropColors { primary: string; secondary: string; accent: string; aura: string; hair: string; eyes: string }

// ───────────────────────── geometry helpers ─────────────────────────
function shapeFrom(pts: [number, number][]) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return s;
}
function extrude(pts: [number, number][], depth: number, bevel = 0.004) {
  const g = new THREE.ExtrudeGeometry(shapeFrom(pts), { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1 });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}
/** Tapered tube along a curve (horns, tails, antlers, whip). */
export function taperTube(points: THREE.Vector3[], r0: number, r1: number, segs = 24, radial = 10) {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(segs, false);
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = curve.getPointAt(t);
    const r = r0 + (r1 - r0) * t;
    const N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const v = p.clone().addScaledVector(N, Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r);
      pos.push(v.x, v.y, v.z);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => { const x = new THREE.Mesh(g, m); x.castShadow = true; return x; };
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ───────────────────────── weapons (held in the right hand, grip at origin, blade along +Y) ─────────────────────────
export function buildWeapon(kind: Look['weapon'], c: PropColors): { obj: THREE.Object3D; tip: THREE.Object3D } {
  const g = new THREE.Group();
  const tip = new THREE.Object3D();
  const steel = gearMat.metal(0xdfe6ee, 0.18);
  const dark = gearMat.metal(0x3a3a46, 0.4);
  const accent = gearMat.metal(c.accent, 0.3);
  const gold = gearMat.gold();
  const wood = gearMat.wood();
  const glow = gearMat.glow(c.aura, 4);
  const grip = (len = 0.18, r = 0.018) => { const m = mesh(new THREE.CylinderGeometry(r, r, len, 10), gearMat.leather(c.secondary)); m.position.y = 0; return m; };
  switch (kind) {
    case 'sword':
    case 'greatsword':
    case 'katana': {
      const L = kind === 'greatsword' ? 1.15 : kind === 'katana' ? 0.95 : 0.82;
      const W = kind === 'greatsword' ? 0.075 : kind === 'katana' ? 0.032 : 0.05;
      g.add(grip(kind === 'greatsword' ? 0.3 : 0.2));
      const guard = mesh(new THREE.BoxGeometry(kind === 'katana' ? 0.08 : 0.26, 0.035, 0.05), kind === 'katana' ? dark : gold);
      guard.position.y = 0.12;
      g.add(guard);
      const blade = kind === 'katana'
        ? mesh(extrude([[-W / 2, 0], [W / 2, 0], [W / 2 + 0.02, L * 0.7], [0.0, L], [-W / 2 + 0.01, L * 0.7]], 0.008, 0.002), steel)
        : mesh(extrude([[-W / 2, 0], [W / 2, 0], [W / 2, L * 0.86], [0, L], [-W / 2, L * 0.86]], 0.014, 0.003), steel);
      blade.position.y = 0.13;
      g.add(blade);
      const fuller = mesh(new THREE.BoxGeometry(W * 0.22, L * 0.7, 0.02), accent);
      fuller.position.y = 0.13 + L * 0.42;
      g.add(fuller);
      const pommel = mesh(new THREE.SphereGeometry(0.03, 12, 10), gold);
      pommel.position.y = -0.11;
      g.add(pommel);
      tip.position.y = 0.13 + L;
      break;
    }
    case 'dagger':
    case 'claws': {
      g.add(grip(0.12));
      if (kind === 'claws') {
        for (const o of [-0.035, 0, 0.035]) {
          const b = mesh(extrude([[-0.012, 0], [0.012, 0], [0.004, 0.32], [-0.004, 0.32]], 0.01, 0.002), steel);
          b.position.set(o, 0.06, 0.02);
          b.rotation.x = -0.25;
          g.add(b);
        }
      } else {
        const b = mesh(extrude([[-0.028, 0], [0.028, 0], [0.01, 0.34], [0, 0.38], [-0.01, 0.34]], 0.01, 0.002), steel);
        b.position.y = 0.07;
        g.add(b);
      }
      tip.position.y = 0.42;
      break;
    }
    case 'spear':
    case 'scythe':
    case 'staff': {
      const shaft = mesh(new THREE.CylinderGeometry(0.02, 0.022, 1.9, 10), kind === 'staff' ? wood : dark);
      shaft.position.y = 0.45;
      g.add(shaft);
      if (kind === 'spear') {
        const head = mesh(extrude([[-0.04, 0], [0.04, 0], [0.012, 0.32], [0, 0.36], [-0.012, 0.32]], 0.016, 0.003), steel);
        head.position.y = 1.4;
        g.add(head);
        const ring = mesh(new THREE.TorusGeometry(0.035, 0.012, 8, 16), accent);
        ring.position.y = 1.4;
        ring.rotation.x = Math.PI / 2;
        g.add(ring);
        tip.position.y = 1.75;
      } else if (kind === 'scythe') {
        const blade = mesh(extrude([[0, 0], [0.62, -0.08], [0.78, -0.3], [0.5, -0.12], [0, -0.08]], 0.012, 0.003), steel);
        blade.position.y = 1.36;
        g.add(blade);
        tip.position.set(0.75, 1.1, 0);
      } else {
        const head = new THREE.Group();
        const orb = mesh(new THREE.IcosahedronGeometry(0.075, 2), glow);
        head.add(orb);
        for (let i = 0; i < 4; i++) {
          const prong = mesh(taperTube([v3(0, -0.09, 0), v3(Math.cos(i * Math.PI / 2) * 0.09, 0.02, Math.sin(i * Math.PI / 2) * 0.09), v3(Math.cos(i * Math.PI / 2) * 0.04, 0.14, Math.sin(i * Math.PI / 2) * 0.04)], 0.012, 0.004, 12, 6), gold);
          head.add(prong);
        }
        head.position.y = 1.42;
        g.add(head);
        tip.position.y = 1.42;
      }
      break;
    }
    case 'hammer':
    case 'axe': {
      const shaft = mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.95, 10), wood);
      shaft.position.y = 0.3;
      g.add(shaft);
      if (kind === 'hammer') {
        const head = mesh(new THREE.BoxGeometry(0.34, 0.18, 0.18), gearMat.metal(0xb8c0cc, 0.35));
        head.position.y = 0.78;
        g.add(head);
        const band = mesh(new THREE.BoxGeometry(0.06, 0.2, 0.2), accent);
        band.position.y = 0.78;
        g.add(band);
      } else {
        const blade = mesh(extrude([[0, 0.12], [0.2, 0.22], [0.28, 0], [0.2, -0.22], [0, -0.1]], 0.016, 0.004), steel);
        blade.position.y = 0.66;
        g.add(blade);
        const back = mesh(extrude([[0, 0.05], [-0.1, 0.02], [-0.12, -0.04], [0, -0.04]], 0.016, 0.003), dark);
        back.position.y = 0.66;
        g.add(back);
      }
      tip.position.y = 0.78;
      break;
    }
    case 'bow': {
      const curve = [v3(0, -0.62, 0), v3(0, -0.3, 0.18), v3(0, 0, 0.08), v3(0, 0.3, 0.18), v3(0, 0.62, 0)];
      g.add(mesh(taperTube(curve, 0.02, 0.012, 30, 8), gearMat.leather(c.secondary)));
      const str = mesh(new THREE.CylinderGeometry(0.003, 0.003, 1.24, 4), gearMat.cloth(0xf0f0f0));
      g.add(str);
      const gem = mesh(new THREE.OctahedronGeometry(0.03), gearMat.gem(c.accent));
      gem.position.set(0, 0, 0.09);
      g.add(gem);
      tip.position.set(0, 0, 0.12);
      break;
    }
    case 'orb':
    case 'lantern':
    case 'clock': {
      if (kind === 'clock') {
        const rim = mesh(new THREE.TorusGeometry(0.11, 0.018, 10, 32), gold);
        const face = mesh(new THREE.CircleGeometry(0.1, 32), gearMat.glow(0xfff6dc, 1.2));
        const hand1 = mesh(new THREE.BoxGeometry(0.006, 0.08, 0.004), dark);
        hand1.position.set(0, 0.035, 0.005);
        const cl = new THREE.Group();
        cl.add(rim, face, hand1);
        cl.position.y = 0.16;
        g.add(cl);
      } else if (kind === 'lantern') {
        const chain = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 4), dark);
        chain.position.y = 0.07;
        const cage = mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.16, 6, 1, true), gold);
        cage.position.y = 0.21;
        const flame = mesh(new THREE.SphereGeometry(0.045, 12, 10), gearMat.glow(c.aura, 5));
        flame.position.y = 0.21;
        g.add(chain, cage, flame);
      } else {
        const orb = mesh(new THREE.IcosahedronGeometry(0.09, 3), gearMat.glow(c.aura, 3));
        orb.position.y = 0.14;
        const ring = mesh(new THREE.TorusGeometry(0.13, 0.008, 6, 40), gold);
        ring.position.y = 0.14;
        ring.rotation.x = 1.2;
        g.add(orb, ring);
      }
      tip.position.y = 0.18;
      break;
    }
    case 'book': {
      const book = mesh(new THREE.BoxGeometry(0.2, 0.26, 0.05), gearMat.leather(c.primary));
      book.position.y = 0.15;
      const pages = mesh(new THREE.BoxGeometry(0.18, 0.24, 0.052), gearMat.cloth(0xf4ecd8));
      pages.position.set(0.012, 0.15, 0);
      const sigil = mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 24), gearMat.glow(c.aura, 3));
      sigil.position.set(-0.002, 0.15, 0.03);
      g.add(book, pages, sigil);
      tip.position.set(0, 0.15, 0.06);
      break;
    }
    case 'fan': {
      for (let i = 0; i < 9; i++) {
        const a = -0.9 + i * 0.225;
        const blade = mesh(extrude([[-0.03, 0], [0.03, 0], [0.04, 0.38], [-0.04, 0.38]], 0.003, 0), gearMat.cloth(i % 2 ? c.accent : c.primary));
        blade.rotation.z = a;
        g.add(blade);
      }
      tip.position.y = 0.3;
      break;
    }
    case 'shield': {
      const s = mesh(extrude([[-0.26, 0.3], [0.26, 0.3], [0.24, -0.08], [0, -0.36], [-0.24, -0.08]], 0.04, 0.012), gearMat.metal(c.secondary, 0.35));
      s.rotation.y = Math.PI / 2;
      s.position.set(0, 0.05, 0);
      const boss = mesh(new THREE.SphereGeometry(0.07, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), gold);
      boss.rotation.z = -Math.PI / 2;
      boss.position.set(0.03, 0.05, 0);
      const cross = mesh(new THREE.BoxGeometry(0.02, 0.5, 0.06), accent);
      cross.position.set(0.025, 0.02, 0);
      g.add(s, boss, cross);
      tip.position.set(0.1, 0.05, 0);
      break;
    }
    case 'gun': {
      const barrel = mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.42, 12), dark);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.06, 0.2);
      const body = mesh(new THREE.BoxGeometry(0.06, 0.1, 0.18), gearMat.metal(c.accent, 0.3));
      body.position.set(0, 0.06, 0.02);
      const stock = mesh(new THREE.BoxGeometry(0.05, 0.14, 0.06), wood);
      stock.position.set(0, -0.02, -0.04);
      g.add(barrel, body, stock);
      tip.position.set(0, 0.06, 0.42);
      break;
    }
    case 'gauntlet': {
      const fist = mesh(new THREE.DodecahedronGeometry(0.075, 0), gearMat.metal(c.secondary, 0.3));
      fist.scale.set(1, 1.2, 1);
      fist.position.y = 0.03;
      for (let i = 0; i < 3; i++) {
        const spike = mesh(new THREE.ConeGeometry(0.018, 0.08, 8), gold);
        spike.position.set(-0.04 + i * 0.04, 0.07, 0.06);
        spike.rotation.x = Math.PI / 2;
        g.add(spike);
      }
      const core = mesh(new THREE.SphereGeometry(0.025, 10, 8), gearMat.glow(c.aura, 4));
      core.position.set(0, 0.03, 0.075);
      g.add(fist, core);
      tip.position.set(0, 0.03, 0.1);
      break;
    }
    case 'chakram': {
      const ring = mesh(new THREE.TorusGeometry(0.19, 0.02, 8, 40), steel);
      ring.position.y = 0.2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const sp = mesh(new THREE.ConeGeometry(0.02, 0.08, 6), accent);
        sp.position.set(Math.cos(a) * 0.23, 0.2 + Math.sin(a) * 0.23, 0);
        sp.rotation.z = a - Math.PI / 2;
        g.add(sp);
      }
      g.add(ring);
      tip.position.y = 0.2;
      break;
    }
    case 'whip': {
      const pts = [v3(0, 0, 0), v3(0.05, 0.25, 0.1), v3(-0.1, 0.5, 0.2), v3(0.1, 0.75, 0.15), v3(0.3, 0.85, 0.05)];
      g.add(mesh(taperTube(pts, 0.016, 0.004, 40, 6), gearMat.leather(c.accent)));
      for (let i = 1; i < 5; i++) {
        const thorn = mesh(new THREE.ConeGeometry(0.012, 0.04, 6), gearMat.horn(c.secondary));
        thorn.position.copy(pts[i]);
        g.add(thorn);
      }
      tip.position.copy(pts[4]);
      break;
    }
    case 'harp': {
      const frame = mesh(taperTube([v3(0, 0, 0), v3(-0.02, 0.18, 0.12), v3(0.04, 0.36, 0.05), v3(0.0, 0.4, -0.12)], 0.015, 0.01, 24, 8), gold);
      const pillar = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 8), gold);
      pillar.position.set(0, 0.2, -0.12);
      g.add(frame, pillar);
      for (let i = 0; i < 6; i++) {
        const s = mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.28 - i * 0.03, 3), gearMat.glow(c.aura, 2));
        s.position.set(0, 0.18, -0.1 + i * 0.035);
        g.add(s);
      }
      tip.position.set(0, 0.25, 0);
      break;
    }
  }
  g.add(tip);
  return { obj: g, tip };
}

// ───────────────────────── headwear (origin at head bone, Y up) ─────────────────────────
export function buildHeadwear(kind: Look['head'], c: PropColors): THREE.Object3D | null {
  if (!kind) return null;
  const g = new THREE.Group();
  const gold = gearMat.gold();
  switch (kind) {
    case 'crown': {
      const band = mesh(new THREE.CylinderGeometry(0.105, 0.11, 0.05, 24, 1, true), gold);
      band.position.y = 0.19;
      g.add(band);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const sp = mesh(new THREE.ConeGeometry(0.02, 0.09, 6), gold);
        sp.position.set(Math.cos(a) * 0.105, 0.25, Math.sin(a) * 0.105);
        g.add(sp);
        const gem = mesh(new THREE.OctahedronGeometry(0.014), gearMat.gem(c.accent));
        gem.position.set(Math.cos(a) * 0.112, 0.19, Math.sin(a) * 0.112);
        g.add(gem);
      }
      break;
    }
    case 'circlet': {
      const band = mesh(new THREE.TorusGeometry(0.105, 0.008, 8, 40), gold);
      band.rotation.x = Math.PI / 2 - 0.25;
      band.position.set(0, 0.15, 0.01);
      const gem = mesh(new THREE.OctahedronGeometry(0.022), gearMat.gem(c.accent));
      gem.position.set(0, 0.15, 0.115);
      g.add(band, gem);
      break;
    }
    case 'halo': {
      const halo = mesh(new THREE.TorusGeometry(0.15, 0.012, 10, 48), gearMat.glow(0xffe8a0, 4));
      halo.rotation.x = Math.PI / 2 - 0.3;
      halo.position.y = 0.36;
      g.add(halo);
      break;
    }
    case 'horns':
    case 'antlers': {
      for (const s of [-1, 1]) {
        if (kind === 'horns') {
          g.add(mesh(taperTube([v3(s * 0.07, 0.18, 0.02), v3(s * 0.16, 0.26, -0.02), v3(s * 0.2, 0.38, -0.1), v3(s * 0.15, 0.46, -0.18)], 0.03, 0.004, 24, 10), gearMat.horn(c.secondary)));
        } else {
          const col = gearMat.horn(0x8a6a48);
          g.add(mesh(taperTube([v3(s * 0.06, 0.18, 0), v3(s * 0.12, 0.3, -0.02), v3(s * 0.2, 0.44, -0.04)], 0.016, 0.006, 16, 8), col));
          g.add(mesh(taperTube([v3(s * 0.12, 0.3, -0.02), v3(s * 0.22, 0.34, 0.02), v3(s * 0.27, 0.4, 0.04)], 0.01, 0.004, 12, 6), col));
          g.add(mesh(taperTube([v3(s * 0.17, 0.38, -0.03), v3(s * 0.16, 0.5, -0.06)], 0.009, 0.003, 8, 6), col));
        }
      }
      break;
    }
    case 'helm': {
      const dome = mesh(new THREE.SphereGeometry(0.135, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), gearMat.metal(c.secondary, 0.3));
      dome.position.y = 0.1;
      const crest = mesh(extrude([[0, 0], [0.22, 0.02], [0.18, 0.1], [0.0, 0.08]], 0.02, 0.004), gearMat.cloth(c.accent));
      crest.rotation.y = Math.PI / 2;
      crest.position.set(0, 0.22, 0.08);
      const visor = mesh(new THREE.BoxGeometry(0.2, 0.02, 0.05), gearMat.metal(c.accent, 0.3));
      visor.position.set(0, 0.11, 0.12);
      g.add(dome, crest, visor);
      break;
    }
    case 'hat': {
      const brim = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.012, 32), gearMat.cloth(c.primary));
      brim.position.y = 0.17;
      const cone = mesh(taperTube([v3(0, 0.17, 0), v3(0, 0.32, -0.02), v3(0.02, 0.46, -0.08), v3(0.1, 0.52, -0.16)], 0.12, 0.01, 24, 20), gearMat.cloth(c.primary));
      const band = mesh(new THREE.CylinderGeometry(0.122, 0.122, 0.035, 24, 1, true), gearMat.cloth(c.accent));
      band.position.y = 0.195;
      g.add(brim, cone, band);
      break;
    }
    case 'mask': {
      const m = mesh(new THREE.SphereGeometry(0.115, 20, 12, -0.9, 1.8, Math.PI * 0.32, Math.PI * 0.2), gearMat.metal(c.secondary, 0.35));
      m.rotation.y = Math.PI / 2;
      m.position.set(0, 0.08, 0.005);
      g.add(m);
      break;
    }
    case 'ears': {
      for (const s of [-1, 1]) {
        const ear = mesh(new THREE.ConeGeometry(0.045, 0.14, 4), gearMat.cloth(c.hair));
        ear.position.set(s * 0.08, 0.27, -0.01);
        ear.rotation.z = -s * 0.25;
        g.add(ear);
      }
      break;
    }
    case 'hood':
      return null; // uses the real Ranger hood mesh
    case 'veil': {
      // sheer drape hanging from a gold band behind the head
      const geo = new THREE.CylinderGeometry(0.12, 0.2, 0.55, 28, 6, true, Math.PI * 0.55, Math.PI * 0.9);
      geo.translate(0, -0.2, -0.02);
      const v = mesh(geo, new THREE.MeshStandardMaterial({ color: new THREE.Color(c.secondary), transparent: true, opacity: 0.42, side: THREE.DoubleSide, roughness: 0.9, depthWrite: false }));
      v.position.y = 0.2;
      const band = mesh(new THREE.TorusGeometry(0.108, 0.008, 6, 32), gearMat.gold());
      band.rotation.x = Math.PI / 2 - 0.2;
      band.position.y = 0.17;
      const gem = mesh(new THREE.OctahedronGeometry(0.018), gearMat.gem(c.accent));
      gem.position.set(0, 0.16, 0.11);
      g.add(v, band, gem);
      break;
    }
    case 'goggles': {
      const strap = mesh(new THREE.TorusGeometry(0.118, 0.012, 6, 32), gearMat.leather(0x3a2a1a));
      strap.rotation.x = Math.PI / 2 - 0.3;
      strap.position.y = 0.18;
      g.add(strap);
      for (const s of [-1, 1]) {
        const lens = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16), gearMat.metal(0xb08a3a, 0.3));
        lens.rotation.x = Math.PI / 2 - 0.4;
        lens.position.set(s * 0.045, 0.2, 0.1);
        const glass = mesh(new THREE.CircleGeometry(0.028, 16), gearMat.glow(c.accent, 1.5));
        glass.position.set(s * 0.045, 0.207, 0.117);
        glass.rotation.x = -0.4;
        g.add(lens, glass);
      }
      break;
    }
    case 'flower': {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const p = mesh(new THREE.SphereGeometry(0.022, 10, 8), gearMat.cloth(c.accent));
        p.scale.set(1, 0.5, 1.4);
        p.position.set(0.09 + Math.cos(a) * 0.025, 0.18 + Math.sin(a) * 0.025, 0.05);
        g.add(p);
      }
      const center = mesh(new THREE.SphereGeometry(0.014, 8, 6), gearMat.glow(0xfff2a0, 1));
      center.position.set(0.09, 0.18, 0.055);
      g.add(center);
      break;
    }
  }
  return g;
}

// ───────────────────────── back pieces (origin at upper spine, Y up, -Z behind) ─────────────────────────
export function buildBack(kind: Look['back'], c: PropColors): { obj: THREE.Object3D; animated?: (t: number) => void } | null {
  if (!kind) return null;
  const g = new THREE.Group();
  switch (kind) {
    case 'cape': {
      const geo = new THREE.PlaneGeometry(0.5, 1.15, 8, 16);
      geo.translate(0, -0.575, 0);
      const base = geo.attributes.position.array.slice() as Float32Array;
      const m = mesh(geo, gearMat.cloth(c.accent === '#ffffff' ? c.secondary : c.accent));
      m.position.set(0, 0.12, -0.14);
      g.add(m);
      const anim = (t: number) => {
        const p = geo.attributes.position.array as Float32Array;
        for (let i = 0; i < p.length; i += 3) {
          const x = base[i], y = base[i + 1];
          const d = -y; // 0 at top → 1.15 at bottom
          p[i + 2] = base[i + 2] - d * 0.22 - Math.sin(t * 2 + d * 3 + x * 4) * 0.035 * d - Math.abs(x) * 0.12;
        }
        geo.attributes.position.needsUpdate = true;
        geo.computeVertexNormals();
      };
      anim(0);
      return { obj: g, animated: anim };
    }
    case 'scarf': {
      const pts = [v3(0, 0.22, 0.05), v3(0.08, 0.2, -0.12), v3(0.15, 0.12, -0.32), v3(0.3, 0.05, -0.5)];
      g.add(mesh(taperTube(pts, 0.05, 0.03, 20, 8), gearMat.cloth(c.accent)));
      return { obj: g };
    }
    case 'wings':
    case 'angel':
    case 'demon': {
      const wings: THREE.Object3D[] = [];
      for (const s of [-1, 1]) {
        const w = new THREE.Group();
        if (kind === 'demon') {
          const mem = mesh(extrude([[0, 0], [0.85, 0.55], [0.75, 0.05], [0.55, 0.2], [0.45, -0.25], [0.25, 0.0], [0.1, -0.2]], 0.01, 0.002), gearMat.cloth(c.secondary));
          w.add(mem);
          w.add(mesh(taperTube([v3(0, 0, 0), v3(0.4, 0.3, 0), v3(0.85, 0.55, 0)], 0.022, 0.008, 12, 6), gearMat.horn(0x2a1a22)));
        } else {
          const col = kind === 'angel' ? '#ffffff' : c.aura;
          for (let i = 0; i < 9; i++) {
            const len = 0.35 + (8 - Math.abs(i - 3)) * 0.06;
            const f = mesh(extrude([[0, -0.03], [len, -0.04], [len + 0.06, 0], [len, 0.04], [0, 0.03]], 0.006, 0.002), gearMat.feather(col));
            f.position.set(i * 0.05, i * 0.04, 0);
            f.rotation.z = 0.9 - i * 0.2;
            w.add(f);
          }
        }
        w.scale.set(s * 0.62, 0.62, 0.62);
        w.position.set(s * 0.08, 0.18, -0.16);
        w.rotation.y = s * 0.45;
        g.add(w);
        wings.push(w);
      }
      return { obj: g, animated: (t) => { for (const [i, w] of wings.entries()) w.rotation.y = (i ? 1 : -1) * (0.45 + Math.sin(t * 2.2) * 0.12); } };
    }
    case 'tail': {
      const pts = [v3(0, -0.25, -0.12), v3(0.05, -0.45, -0.3), v3(0.18, -0.4, -0.5), v3(0.25, -0.15, -0.58)];
      const tail = mesh(taperTube(pts, 0.07, 0.02, 24, 10), gearMat.cloth(c.hair));
      g.add(tail);
      return { obj: g, animated: (t) => { tail.rotation.y = Math.sin(t * 2.5) * 0.2; } };
    }
    case 'gears': {
      const gears: THREE.Mesh[] = [];
      for (const [x, y, r] of [[-0.18, 0.2, 0.13], [0.16, 0.28, 0.09], [0.05, 0.02, 0.07]] as [number, number, number][]) {
        const geo = new THREE.CylinderGeometry(r, r, 0.03, 14);
        const gm = mesh(geo, gearMat.gold());
        gm.rotation.x = Math.PI / 2;
        gm.position.set(x, y, -0.2);
        for (let i = 0; i < 12; i++) {
          const tooth = mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), gearMat.gold());
          const a = (i / 12) * Math.PI * 2;
          tooth.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
          gm.add(tooth);
        }
        const hub = mesh(new THREE.CylinderGeometry(r * 0.35, r * 0.35, 0.04, 12), gearMat.glow(c.aura, 2));
        gm.add(hub);
        g.add(gm);
        gears.push(gm);
      }
      return { obj: g, animated: (t) => gears.forEach((x, i) => { x.rotation.y = t * (i % 2 ? -0.8 : 0.6); }) };
    }
    case 'quiver': {
      const q = mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.5, 12), gearMat.leather(0x5a3a22));
      q.position.set(0.1, 0.05, -0.16);
      q.rotation.z = -0.4;
      g.add(q);
      for (let i = 0; i < 4; i++) {
        const a = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 4), gearMat.wood());
        a.position.set(0.2 + i * 0.012, 0.3, -0.16 + (i - 2) * 0.012);
        a.rotation.z = -0.4;
        const fl = mesh(new THREE.ConeGeometry(0.018, 0.06, 4), gearMat.cloth(c.accent));
        fl.position.set(0.24 + i * 0.012, 0.38, -0.16 + (i - 2) * 0.012);
        g.add(a, fl);
      }
      return { obj: g };
    }
    case 'banner': {
      const pole = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 8), gearMat.wood());
      pole.position.set(-0.12, 0.45, -0.17);
      const flag = mesh(new THREE.PlaneGeometry(0.4, 0.5, 6, 6), gearMat.cloth(c.accent));
      flag.position.set(-0.32, 0.85, -0.17);
      g.add(pole, flag);
      return { obj: g, animated: (t) => { flag.rotation.y = Math.sin(t * 2) * 0.25; } };
    }
    case 'orbs': {
      const orbs: THREE.Mesh[] = [];
      for (let i = 0; i < 3; i++) {
        const o = mesh(new THREE.IcosahedronGeometry(0.05, 2), gearMat.glow(c.aura, 4));
        g.add(o);
        orbs.push(o);
      }
      return { obj: g, animated: (t) => orbs.forEach((o, i) => { const a = t * 1.2 + (i * Math.PI * 2) / 3; o.position.set(Math.cos(a) * 0.45, 0.3 + Math.sin(t * 2 + i) * 0.08, Math.sin(a) * 0.3 - 0.1); }) };
    }
  }
  return null;
}

// ───────────────────────── waist (robes/dresses/coats) & plate armour ─────────────────────────
export function buildSkirt(style: Look['outfit']['style'], c: PropColors, feminine: boolean): { obj: THREE.Object3D; animated?: (t: number) => void } | null {
  if (style !== 'robe' && style !== 'dress' && style !== 'coat') return null;
  const len = style === 'robe' ? 0.92 : style === 'dress' ? 0.66 : 0.78;
  const flare = style === 'dress' ? 0.3 : style === 'robe' ? 0.27 : 0.25;
  const top = feminine ? 0.15 : 0.17;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(new THREE.Vector2(top + (flare - top) * Math.pow(t, 1.4) + Math.sin(t * Math.PI) * 0.015, -t * len));
  }
  const geo = new THREE.LatheGeometry(pts, 40, style === 'coat' ? Math.PI * 0.62 : 0, style === 'coat' ? Math.PI * 1.76 : Math.PI * 2);
  // pleats: ripple the radius around the circumference, deeper toward the hem
  {
    const p = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < p.length; i += 3) {
      const a = Math.atan2(p[i + 2], p[i]);
      const d = -p[i + 1] / len;
      const k = 1 + Math.sin(a * 14) * 0.035 * d;
      p[i] *= k;
      p[i + 2] *= k;
    }
    geo.computeVertexNormals();
  }
  const base = (geo.attributes.position.array as Float32Array).slice();
  const clothCol = new THREE.Color(style === 'coat' ? c.primary : c.secondary).multiplyScalar(0.78);
  const m = mesh(geo, gearMat.cloth(clothCol.getHex()));
  const g = new THREE.Group();
  g.add(m);
  const hem = mesh(new THREE.TorusGeometry(flare, 0.012, 6, 48), gearMat.metal(c.accent, 0.4));
  hem.rotation.x = Math.PI / 2;
  hem.position.y = -len;
  if (style !== 'coat') g.add(hem);
  const anim = (t: number) => {
    const p = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < p.length; i += 3) {
      const d = -base[i + 1] / len;
      const a = Math.atan2(base[i + 2], base[i]);
      const k = 1 + Math.sin(t * 2 + a * 4) * 0.025 * d;
      p[i] = base[i] * k;
      p[i + 2] = base[i + 2] * k;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return { obj: g, animated: anim };
}

export function buildPlate(c: PropColors): THREE.Object3D[] {
  // [chest piece (spine_03), left pauldron, right pauldron]
  const chest = new THREE.Group();
  const plate = mesh(new THREE.SphereGeometry(0.19, 24, 16, -Math.PI * 0.5, Math.PI, Math.PI * 0.18, Math.PI * 0.55), gearMat.metal(c.secondary, 0.25));
  plate.scale.set(1.0, 1.1, 0.7);
  plate.rotation.y = 0;
  chest.add(plate);
  const emblem = mesh(new THREE.OctahedronGeometry(0.035), gearMat.gem(c.accent));
  emblem.position.set(0, 0.02, 0.135);
  chest.add(emblem);
  const pauldrons = [-1, 1].map((s) => {
    const p = new THREE.Group();
    const dome = mesh(new THREE.SphereGeometry(0.11, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), gearMat.metal(c.secondary, 0.25));
    dome.scale.set(1.1, 0.75, 1);
    const trim = mesh(new THREE.TorusGeometry(0.11, 0.012, 6, 24), gearMat.gold());
    trim.rotation.x = Math.PI / 2;
    trim.scale.set(1.1, 1, 1);
    p.add(dome, trim);
    p.userData.side = s;
    return p;
  });
  return [chest, ...pauldrons];
}
