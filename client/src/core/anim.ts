// Renderer-agnostic frame loop + tweens (requestAnimationFrame).
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
  outExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
};

interface Tw { obj: any; from: Record<string, number>; to: Record<string, number>; dur: number; t: number; ease: Ease; done: () => void; onUpdate?: (k: number) => void }
const tweens: Tw[] = [];
const callbacks = new Set<(dt: number, time: number) => void>();
export let timeScale = 1;
export function setTimeScale(s: number) { timeScale = s; }
let elapsed = 0;
let last = performance.now();

function getPath(o: any, p: string): number { const ks = p.split('.'); let x = o; for (const k of ks) x = x[k]; return x; }
function setPath(o: any, p: string, v: number) { const ks = p.split('.'); let x = o; for (let i = 0; i < ks.length - 1; i++) x = x[ks[i]]; x[ks[ks.length - 1]] = v; }

function frame(nowMs: number) {
  const dt = Math.min(100, nowMs - last);
  last = nowMs;
  elapsed += dt;
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t += dt * timeScale;
    const k = Math.min(1, tw.t / tw.dur);
    const e = tw.ease(k);
    for (const key in tw.to) setPath(tw.obj, key, tw.from[key] + (tw.to[key] - tw.from[key]) * e);
    tw.onUpdate?.(e);
    if (k >= 1) { tweens.splice(i, 1); tw.done(); }
  }
  for (const cb of callbacks) cb(dt, elapsed);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export function tween(obj: any, to: Record<string, number>, dur: number, e: Ease = ease.outCubic, onUpdate?: (k: number) => void): Promise<void> {
  return new Promise((resolve) => {
    const from: Record<string, number> = {};
    for (const k in to) from[k] = getPath(obj, k);
    for (let i = tweens.length - 1; i >= 0; i--) {
      const o = tweens[i];
      if (o.obj === obj && Object.keys(to).some((k) => k in o.to)) { tweens.splice(i, 1); o.done(); }
    }
    tweens.push({ obj, from, to, dur: Math.max(1, dur), t: 0, ease: e, done: resolve, onUpdate });
  });
}
export function onFrame(cb: (dt: number, time: number) => void) { callbacks.add(cb); return () => { callbacks.delete(cb); }; }
export function wait(ms: number) {
  return new Promise<void>((r) => { let left = ms; const off = onFrame((dt) => { left -= dt * timeScale; if (left <= 0) { off(); r(); } }); });
}
export const now = () => elapsed;
export function hashStr(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
