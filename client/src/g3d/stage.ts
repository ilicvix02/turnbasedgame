// three.js renderer + post-processing (bloom, ACES tone mapping, image-based lighting) shared by every 3D scene.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { onFrame } from '../core/anim';

export class Stage {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  private tickers = new Set<(dt: number, t: number) => void>();
  private off: () => void;

  constructor(container: HTMLElement, opts: { bloom?: number; pixelRatio?: number } = {}) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(opts.pixelRatio ?? Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setSize(container.clientWidth || innerWidth, container.clientHeight || innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.camera = new THREE.PerspectiveCamera(32, this.aspect(container), 0.1, 200);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), opts.bloom ?? 0.32, 0.5, 0.93);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    const resize = () => {
      const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
      this.renderer.setSize(w, h);
      this.composer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resize);
    resize();
    let t = 0;
    this.off = onFrame((dtMs) => {
      const dt = dtMs / 1000;
      t += dt;
      for (const f of this.tickers) f(dt, t);
      this.composer.render();
    });
    const prevOff = this.off;
    this.off = () => { prevOff(); window.removeEventListener('resize', resize); };
  }
  private aspect(c: HTMLElement) { return (c.clientWidth || innerWidth) / (c.clientHeight || innerHeight); }
  tick(f: (dt: number, t: number) => void) { this.tickers.add(f); return () => { this.tickers.delete(f); }; }

  /** Standard three-point lighting rig with an element-tinted rim. */
  lightRig(key = 0xfff2e0, rim = 0x9fb8ff, ambient = 0x8890b8) {
    const hemi = new THREE.HemisphereLight(ambient, 0x1a1420, 0.8);
    const k = new THREE.DirectionalLight(key, 2.1);
    k.position.set(4, 8, 6);
    k.castShadow = true;
    k.shadow.mapSize.set(2048, 2048);
    k.shadow.camera.left = -12; k.shadow.camera.right = 12; k.shadow.camera.top = 12; k.shadow.camera.bottom = -12;
    k.shadow.bias = -0.0004;
    k.shadow.normalBias = 0.02;
    const r = new THREE.DirectionalLight(rim, 2.4);
    r.position.set(-6, 4, -6);
    const f = new THREE.DirectionalLight(0xffffff, 0.6);
    f.position.set(0, 2, 10);
    this.scene.add(hemi, k, r, f);
    return { hemi, key: k, rim: r, fill: f };
  }

  dispose() {
    this.off();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
