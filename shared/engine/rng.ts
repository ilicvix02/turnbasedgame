// Deterministic PRNG (sfc32). State is four uint32 so battles can be cloned and replayed bit-exactly.

export class Rng {
  s: [number, number, number, number];
  constructor(seed: number | [number, number, number, number]) {
    if (Array.isArray(seed)) {
      this.s = [seed[0], seed[1], seed[2], seed[3]];
    } else {
      // splitmix32 to expand seed
      let x = seed >>> 0;
      const next = () => {
        x = (x + 0x9e3779b9) >>> 0;
        let z = x;
        z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
        z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
        return (z ^ (z >>> 16)) >>> 0;
      };
      this.s = [next(), next(), next(), next()];
      for (let i = 0; i < 12; i++) this.u32();
    }
  }
  u32(): number {
    let [a, b, c, d] = this.s;
    const t = (((a + b) >>> 0) + d) >>> 0;
    d = (d + 1) >>> 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) >>> 0;
    c = ((c << 21) | (c >>> 11)) >>> 0;
    c = (c + t) >>> 0;
    this.s = [a >>> 0, b, c, d];
    return t;
  }
  /** float in [0,1) */
  next(): number {
    return this.u32() / 4294967296;
  }
  chance(p: number): boolean {
    if (p >= 1) return true;
    if (p <= 0) return false;
    return this.next() < p;
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  clone(): Rng {
    return new Rng(this.s);
  }
}

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
