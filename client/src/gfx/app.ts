// Pixi application singleton + tiny tween engine driven by the ticker.
import { Application, Container, Ticker } from 'pixi.js';

export let app: Application;
export const layers = { bg: new Container(), world: new Container(), fx: new Container(), ui: new Container() };
export let quality: 'high' | 'low' = (() => { try { return (localStorage.getItem('aethra.quality') as 'high' | 'low') || 'high'; } catch { return 'high'; } })();
export function setQuality(q: 'high' | 'low') { quality = q; try { localStorage.setItem('aethra.quality', q); } catch { /* ignore */ } }

export async function initApp() {
  app = new Application();
  await app.init({
    resizeTo: window,
    antialias: true,
    backgroundColor: 0x07060d,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    autoDensity: true,
    preference: 'webgl',
  });
  document.getElementById('stage')!.appendChild(app.canvas);
  app.stage.addChild(layers.bg, layers.world, layers.fx, layers.ui);
  app.ticker.add(tick);
  return app;
}

export const W = () => app.screen.width;
export const H = () => app.screen.height;

// ───────────────────────── tweens ─────────────────────────
export type Ease = (t: number) => number;
export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inCubic: (t: number) => t * t * t,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t: number) => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  outExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
};

interface Tw { obj: any; from: Record<string, number>; to: Record<string, number>; dur: number; t: number; ease: Ease; done: () => void; onUpdate?: (k: number) => void }
const tweens: Tw[] = [];
const callbacks = new Set<(dt: number, time: number) => void>();
export let timeScale = 1;
export function setTimeScale(s: number) { timeScale = s; }
let elapsed = 0;

function tick(t: Ticker) {
  const dtMs = t.deltaMS;
  elapsed += dtMs;
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    if (tw.obj?.destroyed) { tweens.splice(i, 1); tw.done(); continue; }
    tw.t += dtMs * timeScale;
    const k = Math.min(1, tw.t / tw.dur);
    const e = tw.ease(k);
    for (const key in tw.to) setPath(tw.obj, key, tw.from[key] + (tw.to[key] - tw.from[key]) * e);
    tw.onUpdate?.(e);
    if (k >= 1) { tweens.splice(i, 1); tw.done(); }
  }
  for (const cb of callbacks) cb(dtMs, elapsed);
}

function getPath(o: any, p: string): number {
  if (!p.includes('.')) return o[p];
  const [a, b] = p.split('.');
  return o[a][b];
}
function setPath(o: any, p: string, v: number) {
  if (!p.includes('.')) { o[p] = v; return; }
  const [a, b] = p.split('.');
  o[a][b] = v;
}

export function tween(obj: any, to: Record<string, number>, dur: number, e: Ease = ease.outCubic, onUpdate?: (k: number) => void): Promise<void> {
  return new Promise((resolve) => {
    const from: Record<string, number> = {};
    for (const k in to) from[k] = getPath(obj, k);
    // replace conflicting tweens on the same props
    for (let i = tweens.length - 1; i >= 0; i--) {
      const o = tweens[i];
      if (o.obj === obj && Object.keys(to).some((k) => k in o.to)) { tweens.splice(i, 1); o.done(); }
    }
    tweens.push({ obj, from, to, dur: Math.max(1, dur), t: 0, ease: e, done: resolve, onUpdate });
  });
}

export function onFrame(cb: (dt: number, time: number) => void) {
  callbacks.add(cb);
  return () => callbacks.delete(cb);
}

export function wait(ms: number) {
  return new Promise<void>((r) => {
    let left = ms;
    const off = onFrame((dt) => { left -= dt * timeScale; if (left <= 0) { off(); r(); } });
  });
}

export const now = () => elapsed;
export function hex(c: string): number { return parseInt(c.replace('#', '').slice(0, 6), 16); }
export function mix(a: string, b: string, t: number): string {
  const x = hex(a), y = hex(b);
  const r = Math.round(((x >> 16) & 255) * (1 - t) + ((y >> 16) & 255) * t);
  const g = Math.round(((x >> 8) & 255) * (1 - t) + ((y >> 8) & 255) * t);
  const bl = Math.round((x & 255) * (1 - t) + (y & 255) * t);
  return '#' + ((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0');
}
export const shade = (c: string, t: number) => (t < 0 ? mix(c, '#000000', -t) : mix(c, '#ffffff', t));
