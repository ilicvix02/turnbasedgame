// Battle/lobby environments built in code: sky dome, arena platform with rune circle, set dressing and ambient particles.
import * as THREE from 'three';
import { softGlowTexture } from './hero3d';

export interface EnvTheme {
  sky: [string, string, string]; // zenith, horizon, ground haze
  fog: string;
  floor: string;
  rune: string;
  key: number;
  rim: number;
  ambient: number;
  particles: 'embers' | 'snow' | 'leaves' | 'motes' | 'dust' | 'stars' | 'petals';
  props: 'volcano' | 'glacier' | 'forest' | 'night' | 'clock' | 'temple' | 'void';
}

export const THEMES: Record<string, EnvTheme> = {
  volcano: { sky: ['#1a0604', '#7a2410', '#2a0a06'], fog: '#3a1208', floor: '#3a2a26', rune: '#ff7a2a', key: 0xffb070, rim: 0xff5a2a, ambient: 0x8a5040, particles: 'embers', props: 'volcano' },
  glacier: { sky: ['#0a1a3a', '#6aa8d8', '#c8e8ff'], fog: '#9ac8e8', floor: '#8aa8c0', rune: '#7ae0ff', key: 0xe8f4ff, rim: 0x7ac8ff, ambient: 0x8ab0d8, particles: 'snow', props: 'glacier' },
  forest: { sky: ['#06140a', '#2a5a2a', '#1a2a12'], fog: '#1a3a1a', floor: '#3a4a26', rune: '#8aff6a', key: 0xfff0c0, rim: 0x8aff9a, ambient: 0x5a8050, particles: 'leaves', props: 'forest' },
  night: { sky: ['#05030c', '#2a1440', '#140a1a'], fog: '#1a0e2a', floor: '#2a2236', rune: '#c87aff', key: 0xc8b0ff, rim: 0xff4a6a, ambient: 0x5a4a80, particles: 'motes', props: 'night' },
  clock: { sky: ['#0a0804', '#5a4418', '#1a1408'], fog: '#2a2010', floor: '#4a4030', rune: '#ffd84a', key: 0xfff0c8, rim: 0x6ae8ff, ambient: 0x807050, particles: 'dust', props: 'clock' },
  arena: { sky: ['#07061a', '#3a2a6a', '#140e2a'], fog: '#1a1430', floor: '#3a3448', rune: '#e8c86a', key: 0xfff2e0, rim: 0x9fb8ff, ambient: 0x8890b8, particles: 'stars', props: 'temple' },
  lobby: { sky: ['#0a0718', '#3a2560', '#1a1028'], fog: '#1a1230', floor: '#2a2440', rune: '#e8c86a', key: 0xfff0e0, rim: 0xb090ff, ambient: 0x7a70b0, particles: 'petals', props: 'temple' },
  void: { sky: ['#000000', '#1a1030', '#05030a'], fog: '#0a0614', floor: '#1a1626', rune: '#b07aff', key: 0xd0c0ff, rim: 0x7a5aff, ambient: 0x403860, particles: 'stars', props: 'void' },
};

function skyDome(t: EnvTheme) {
  const geo = new THREE.SphereGeometry(90, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(t.sky[0]) }, mid: { value: new THREE.Color(t.sky[1]) }, bot: { value: new THREE.Color(t.sky[2]) }, time: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform float time; varying vec3 vP;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        float y = vP.y;
        vec3 c = y > 0.0 ? mix(mid, top, pow(y, 0.6)) : mix(mid, bot, pow(-y, 0.5));
        // stars
        vec2 g = floor(vec2(atan(vP.z, vP.x) * 90.0, asin(vP.y) * 90.0));
        float s = step(0.996, h(g)) * smoothstep(0.05, 0.4, y) * (0.6 + 0.4 * sin(time * 2.0 + h(g) * 50.0));
        c += vec3(s);
        // aurora-like band
        c += mid * 0.25 * smoothstep(0.12, 0.0, abs(y - 0.18 - sin(vP.x * 3.0 + time * 0.1) * 0.05));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

function runeTexture(color: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const x = c.getContext('2d')!;
  x.translate(512, 512);
  x.strokeStyle = color;
  x.fillStyle = color;
  x.shadowColor = color;
  x.shadowBlur = 18;
  const ring = (r: number, w: number) => { x.lineWidth = w; x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.stroke(); };
  ring(500, 6); ring(470, 2); ring(330, 4); ring(300, 2); ring(140, 3);
  x.font = 'bold 34px serif';
  const glyphs = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
  for (let i = 0; i < 36; i++) {
    x.save();
    x.rotate((i / 36) * Math.PI * 2);
    x.fillText(glyphs[i % glyphs.length], -12, -400);
    x.restore();
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    x.beginPath();
    x.moveTo(Math.cos(a) * 300, Math.sin(a) * 300);
    x.lineTo(Math.cos(a + (Math.PI * 4) / 7) * 300, Math.sin(a + (Math.PI * 4) / 7) * 300);
    x.lineWidth = 3;
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function stoneTexture(base: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = base;
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1600; i++) {
    x.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.06})`;
    const s = Math.random() * 18;
    x.fillRect(Math.random() * 512, Math.random() * 512, s, s);
  }
  x.strokeStyle = 'rgba(0,0,0,0.35)';
  x.lineWidth = 3;
  for (let r = 0; r < 8; r++) for (let k = 0; k < 8; k++) x.strokeRect(k * 64 + (r % 2) * 32, r * 64, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 10);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Environment {
  group = new THREE.Group();
  private updaters: ((dt: number, t: number) => void)[] = [];
  theme: EnvTheme;
  fieldTint?: THREE.Mesh;
  rune!: THREE.Mesh;
  lights!: { key: THREE.DirectionalLight; rim: THREE.DirectionalLight; hemi: THREE.HemisphereLight };

  constructor(themeKey: string, opts: { radius?: number } = {}) {
    const t = (this.theme = THEMES[themeKey] || THEMES.arena);
    const R = opts.radius ?? 7;
    const sky = skyDome(t);
    this.group.add(sky);
    this.updaters.push((_d, time) => { (sky.material as THREE.ShaderMaterial).uniforms.time.value = time; });
    // ground
    const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: new THREE.Color(t.floor).multiplyScalar(0.55), roughness: 0.95, map: stoneTexture(t.floor) }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);
    // platform
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.3, 0.35, 64), new THREE.MeshStandardMaterial({ color: new THREE.Color(t.floor), roughness: 0.75, metalness: 0.1, map: stoneTexture(t.floor) }));
    (plat.material as THREE.MeshStandardMaterial).map!.repeat.set(4, 4);
    plat.position.y = -0.17;
    plat.receiveShadow = true;
    this.group.add(plat);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(R, 0.06, 8, 96), new THREE.MeshStandardMaterial({ color: new THREE.Color(t.rune), emissive: new THREE.Color(t.rune), emissiveIntensity: 1.6, toneMapped: false }));
    edge.rotation.x = Math.PI / 2;
    edge.position.y = 0.01;
    this.group.add(edge);
    this.rune = new THREE.Mesh(new THREE.PlaneGeometry(R * 1.7, R * 1.7), new THREE.MeshBasicMaterial({ map: runeTexture(t.rune), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.rune.rotation.x = -Math.PI / 2;
    this.rune.position.y = 0.012;
    this.group.add(this.rune);
    this.updaters.push((d) => { this.rune.rotation.z += d * 0.03; });
    // lights
    const hemi = new THREE.HemisphereLight(t.ambient, 0x100c18, 0.85);
    const key = new THREE.DirectionalLight(t.key, 2.2);
    key.position.set(5, 10, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 40;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.03;
    const rim = new THREE.DirectionalLight(t.rim, 2.6);
    rim.position.set(-7, 5, -8);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(0, 3, 12);
    this.group.add(hemi, key, rim, fill);
    this.lights = { key, rim, hemi };
    this.dress(t, R);
    this.addParticles(t);
  }

  private dress(t: EnvTheme, R: number) {
    const rnd = mulberry(7);
    const mat = (c: string, e = 0) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.8, emissive: new THREE.Color(c), emissiveIntensity: e });
    const ringPositions = (n: number, r0: number, r1: number) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + rnd() * 0.3; const r = r0 + rnd() * (r1 - r0); return [Math.cos(a) * r, Math.sin(a) * r] as [number, number]; });
    const add = (o: THREE.Object3D) => { o.traverse((m: any) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); this.group.add(o); };
    switch (t.props) {
      case 'volcano': {
        for (const [x, z] of ringPositions(14, R + 4, R + 16)) {
          const h = 2 + rnd() * 6;
          const rock = new THREE.Mesh(new THREE.ConeGeometry(1 + rnd() * 2, h, 6), mat('#2a1a16'));
          rock.position.set(x, h / 2 - 0.2, z);
          rock.rotation.y = rnd() * 3;
          add(rock);
          if (rnd() < 0.5) { const lava = new THREE.Mesh(new THREE.ConeGeometry(0.3, h * 0.6, 6), mat('#ff5a1a', 2.5)); lava.position.set(x, h * 0.3, z + 0.6); add(lava); }
        }
        const pool = new THREE.Mesh(new THREE.RingGeometry(R + 0.6, R + 3, 64), new THREE.MeshStandardMaterial({ color: 0xff4a10, emissive: 0xff3a00, emissiveIntensity: 1.8, toneMapped: false }));
        pool.rotation.x = -Math.PI / 2;
        pool.position.y = -0.3;
        this.group.add(pool);
        break;
      }
      case 'glacier': {
        for (const [x, z] of ringPositions(22, R + 3, R + 15)) {
          const h = 1.5 + rnd() * 5;
          const c = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshPhysicalMaterial({ color: 0xbfe8ff, roughness: 0.1, transmission: 0.3, emissive: 0x2a6aaa, emissiveIntensity: 0.25 }));
          c.scale.set(0.6 + rnd(), h, 0.6 + rnd());
          c.position.set(x, h * 0.6, z);
          c.rotation.set(rnd() * 0.3, rnd() * 3, rnd() * 0.3);
          add(c);
        }
        break;
      }
      case 'forest': {
        for (const [x, z] of ringPositions(26, R + 3, R + 18)) {
          const h = 4 + rnd() * 6;
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, h, 8), mat('#3a2a1a'));
          trunk.position.set(x, h / 2, z);
          const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + rnd() * 1.2, 1), mat(rnd() < 0.5 ? '#1f4a24' : '#2a5a2a'));
          crown.position.set(x, h + 0.6, z);
          add(trunk); add(crown);
        }
        for (const [x, z] of ringPositions(12, R + 0.6, R + 2.5)) {
          const shroom = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#7affb0', 1.6));
          shroom.position.set(x, 0.25, z);
          add(shroom);
        }
        break;
      }
      case 'night': {
        for (const [x, z] of ringPositions(10, R + 4, R + 12)) {
          const h = 5 + rnd() * 8;
          const spire = new THREE.Mesh(new THREE.ConeGeometry(0.7, h, 4), mat('#1a1424'));
          spire.position.set(x, h / 2, z);
          add(spire);
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.05), mat('#ff4a6a', 3));
          win.position.set(x, h * 0.4, z + 0.5);
          add(win);
        }
        const moon = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffd0d8, toneMapped: false }));
        moon.position.set(-25, 30, -60);
        this.group.add(moon);
        break;
      }
      case 'clock': {
        for (const [x, z] of ringPositions(9, R + 4, R + 10)) {
          const r = 1 + rnd() * 2.5;
          const gear = new THREE.Mesh(new THREE.TorusGeometry(r, 0.18, 6, 24), new THREE.MeshStandardMaterial({ color: 0xc8a84a, metalness: 1, roughness: 0.3 }));
          gear.position.set(x, r + 0.5, z);
          gear.lookAt(0, r, 0);
          add(gear);
          this.updaters.push((d) => { gear.rotation.z += d * 0.2 * (r > 2 ? -1 : 1); });
        }
        const face = new THREE.Mesh(new THREE.RingGeometry(9, 10, 64), new THREE.MeshStandardMaterial({ color: 0xffd84a, emissive: 0xffb02a, emissiveIntensity: 1.2 }));
        face.position.set(0, 9, -22);
        this.group.add(face);
        break;
      }
      case 'temple':
      case 'void': {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          const pillar = new THREE.Group();
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 6, 16), new THREE.MeshStandardMaterial({ color: 0x5a5470, roughness: 0.7, map: stoneTexture('#6a6480') }));
          col.position.y = 3;
          const cap = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.2), new THREE.MeshStandardMaterial({ color: 0xc8b07a, metalness: 0.6, roughness: 0.35 }));
          cap.position.y = 6.1;
          const brazier = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), new THREE.MeshStandardMaterial({ color: new THREE.Color(t.rune), emissive: new THREE.Color(t.rune), emissiveIntensity: 3, toneMapped: false }));
          brazier.position.y = 6.6;
          pillar.add(col, cap, brazier);
          pillar.position.set(Math.cos(a) * (R + 3.5), 0, Math.sin(a) * (R + 3.5));
          if (t.props === 'void') pillar.rotation.z = (rnd() - 0.5) * 0.3;
          add(pillar);
        }
        break;
      }
    }
  }

  private addParticles(t: EnvTheme) {
    const N = 260;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    for (let i = 0; i < N; i++) { seed[i] = Math.random(); pos[i * 3] = (Math.random() - 0.5) * 30; pos[i * 3 + 1] = Math.random() * 10; pos[i * 3 + 2] = (Math.random() - 0.5) * 30; }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const color = { embers: 0xff8a3a, snow: 0xffffff, leaves: 0x9aff6a, motes: 0xc89aff, dust: 0xffe0a0, stars: 0xd0d8ff, petals: 0xffb0d8 }[t.particles];
    const tex = softGlowTexture();
    const mat = new THREE.PointsMaterial({ color, size: t.particles === 'snow' ? 0.12 : 0.09, map: tex, transparent: true, opacity: 0.85, blending: t.particles === 'snow' ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    this.group.add(pts);
    const fall = t.particles === 'snow' || t.particles === 'leaves' || t.particles === 'petals';
    this.updaters.push((dt, time) => {
      for (let i = 0; i < N; i++) {
        const s = seed[i];
        pos[i * 3 + 1] += (fall ? -0.6 - s * 0.6 : 0.3 + s * 0.6) * dt;
        pos[i * 3] += Math.sin(time * 0.7 + s * 20) * dt * 0.4;
        if (pos[i * 3 + 1] > 10) pos[i * 3 + 1] = 0;
        if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 10;
      }
      geo.attributes.position.needsUpdate = true;
    });
  }

  /** Tint the arena while a Dominion is active. */
  setField(color: string | null) {
    const target = color ? new THREE.Color(color) : new THREE.Color(this.theme.rune);
    const m = this.rune.material as THREE.MeshBasicMaterial;
    m.color.copy(color ? target : new THREE.Color(0xffffff));
    m.opacity = color ? 0.95 : 0.55;
    this.lights.rim.color.copy(color ? target : new THREE.Color(this.theme.rim));
  }

  update(dt: number, t: number) { for (const u of this.updaters) u(dt, t); }
}

function mulberry(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
