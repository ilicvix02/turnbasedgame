// Audio: CC0 music tracks with crossfades and pooled sound effects (Web Audio API).
let ctx: AudioContext | null = null;
let master: GainNode;
let musicGain: GainNode;
let sfxGain: GainNode;
const buffers = new Map<string, AudioBuffer | Promise<AudioBuffer | null>>();
let current: { name: string; src: AudioBufferSourceNode; gain: GainNode } | null = null;
let wanted: string | null = null;

const SETTINGS_KEY = 'aethra.audio';
export const settings = (() => {
  try { return { music: 0.55, sfx: 0.8, muted: false, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { return { music: 0.55, sfx: 0.8, muted: false }; }
})();
export function saveAudioSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  if (!ctx) return;
  master.gain.value = settings.muted ? 0 : 1;
  musicGain.gain.value = settings.music;
  sfxGain.gain.value = settings.sfx;
}

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return;
  }
  try {
    ctx = new AudioContext();
  } catch {
    return;
  }
  master = ctx.createGain();
  musicGain = ctx.createGain();
  sfxGain = ctx.createGain();
  musicGain.connect(master);
  sfxGain.connect(master);
  master.connect(ctx.destination);
  saveAudioSettings();
  if (wanted) void music(wanted);
}

async function load(url: string): Promise<AudioBuffer | null> {
  const got = buffers.get(url);
  if (got) return got;
  const p = (async () => {
    try {
      const r = await fetch(url);
      const ab = await r.arrayBuffer();
      const buf = await ctx!.decodeAudioData(ab);
      buffers.set(url, buf);
      return buf;
    } catch {
      return null;
    }
  })();
  buffers.set(url, p as Promise<AudioBuffer | null>);
  return p;
}

export async function music(name: string) {
  wanted = name;
  if (!ctx) return;
  if (current?.name === name) return;
  const buf = await load(`/assets/music/${name}.mp3`);
  if (!buf || wanted !== name) return;
  const old = current;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const g = ctx.createGain();
  g.gain.value = 0;
  src.connect(g).connect(musicGain);
  src.start();
  g.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
  current = { name, src, gain: g };
  if (old) {
    old.gain.gain.cancelScheduledValues(ctx.currentTime);
    old.gain.gain.setValueAtTime(old.gain.gain.value, ctx.currentTime);
    old.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
    setTimeout(() => { try { old.src.stop(); } catch { /* ignore */ } }, 1400);
  }
}

const lastPlayed = new Map<string, number>();
export function sfx(name: string, opts: { vol?: number; rate?: number; delay?: number } = {}) {
  if (!ctx || settings.muted) return;
  const now = performance.now();
  if ((lastPlayed.get(name) || 0) > now - 40) return; // de-dupe bursts
  lastPlayed.set(name, now);
  void load(`/assets/sfx/${name}.mp3`).then((buf) => {
    if (!buf || !ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = opts.rate ?? 1;
    const g = ctx.createGain();
    g.gain.value = opts.vol ?? 1;
    src.connect(g).connect(sfxGain);
    src.start(ctx.currentTime + (opts.delay ?? 0) / 1000);
  });
}

export function preloadSfx(names: string[]) {
  if (!ctx) return;
  for (const n of names) void load(`/assets/sfx/${n}.mp3`);
}
