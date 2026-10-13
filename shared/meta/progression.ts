// Account-side progression: hero instances, gear, stat building. Shared by server (authoritative) and client (preview).
import { Rng } from '../engine/rng';
import { getHero } from '../engine/registry';
import { GEAR_SETS, SET_IDS } from '../engine/sets';
import { ARTIFACTS } from '../engine/artifacts';
import type { GearPiece, GearStat, HeroDef, Stats, UnitSetup } from '../engine/types';

export interface HeroInstance {
  uid: string;
  heroId: string;
  level: number;
  stars: number; // 3..6
  awaken: number; // 0..6
  xp: number;
  skillLv: [number, number, number];
  imprint: number; // 0..6 (D..SSS)
  gear: Partial<Record<GearPiece['slot'], string>>;
  artifact?: { id: string; level: number } | null;
  locked?: boolean;
}

export const GEAR_SLOTS: GearPiece['slot'][] = ['weapon', 'helmet', 'armor', 'necklace', 'ring', 'boots'];
export const IMPRINT_GRADES = ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

export const levelCap = (stars: number) => stars * 10;

export function xpToNext(level: number) {
  return Math.floor(40 + level * level * 6);
}

export function baseStats(def: HeroDef, level: number, awaken: number): Stats {
  const f = 0.38 + (0.62 * (Math.max(1, level) - 1)) / 59;
  const aw = 1 + awaken * 0.03;
  return {
    atk: Math.round(def.base.atk * f * aw),
    hp: Math.round(def.base.hp * f * aw),
    def: Math.round(def.base.def * f * aw),
    spd: def.base.spd + (awaken >= 6 ? 5 : awaken >= 4 ? 3 : awaken >= 2 ? 1 : 0),
    cc: def.base.cc ?? 0.15,
    cd: def.base.cd ?? 1.5,
    eff: def.base.eff ?? 0,
    res: def.base.res ?? 0,
    dual: def.base.dual ?? 0.05,
  };
}

/** Compute final pre-battle stats. `releaseBonus` comes from allies' Imprint Release. */
export function computeStats(inst: HeroInstance, gear: GearPiece[], releaseBonus: Partial<Stats> = {}): { stats: Stats; sets: string[] } {
  const def = getHero(inst.heroId);
  const base = baseStats(def, inst.level, inst.awaken);
  const pct: Record<string, number> = { atk: 0, hp: 0, def: 0, spd: 0 };
  const flat: Record<string, number> = { atk: 0, hp: 0, def: 0, spd: 0, cc: 0, cd: 0, eff: 0, res: 0, dual: 0 };
  const addStat = (stat: GearStat, v: number) => {
    if (stat.endsWith('%')) pct[stat.slice(0, -1)] += v / 100;
    else if (stat === 'cc' || stat === 'cd' || stat === 'eff' || stat === 'res') flat[stat] += v / 100;
    else flat[stat] += v;
  };
  for (const g of gear) {
    addStat(g.main.stat, g.main.value);
    for (const s of g.subs) addStat(s.stat, s.value);
  }
  // sets
  const counts: Record<string, number> = {};
  for (const g of gear) counts[g.set] = (counts[g.set] || 0) + 1;
  const sets: string[] = [];
  for (const id of Object.keys(counts)) {
    const sd = GEAR_SETS[id];
    if (!sd) continue;
    const n = Math.floor(counts[id] / sd.pieces);
    for (let i = 0; i < n; i++) sets.push(id);
  }
  for (const id of sets) {
    const m = GEAR_SETS[id].mods || {};
    for (const k of Object.keys(m) as (keyof Stats)[]) {
      if (k === 'atk' || k === 'hp' || k === 'def' || k === 'spd') pct[k] += m[k]!;
      else flat[k] += m[k]!;
    }
  }
  // imprint concentration
  if (def.imprint.kind === 'concentration') {
    const v = def.imprint.values[inst.imprint] ?? 0;
    const k = def.imprint.stat;
    if (k === 'atk' || k === 'hp' || k === 'def' || k === 'spd') pct[k] += v;
    else flat[k] += v;
  }
  for (const k of Object.keys(releaseBonus) as (keyof Stats)[]) {
    if (k === 'atk' || k === 'hp' || k === 'def' || k === 'spd') pct[k] += releaseBonus[k]!;
    else flat[k] += releaseBonus[k]!;
  }
  // artifact flat stats
  if (inst.artifact) {
    const a = ARTIFACTS[inst.artifact.id];
    if (a) {
      const f = 0.3 + (0.7 * inst.artifact.level) / 30;
      flat.atk += Math.round(a.atk * f);
      flat.hp += Math.round(a.hp * f);
    }
  }
  const stats: Stats = {
    atk: Math.round(base.atk * (1 + pct.atk) + flat.atk),
    hp: Math.round(base.hp * (1 + pct.hp) + flat.hp),
    def: Math.round(base.def * (1 + pct.def) + flat.def),
    spd: Math.round(base.spd * (1 + pct.spd) + flat.spd),
    cc: Math.min(1, base.cc + flat.cc),
    cd: Math.min(3.5, base.cd + flat.cd),
    eff: base.eff + flat.eff,
    res: base.res + flat.res,
    dual: base.dual + flat.dual,
  };
  return { stats, sets };
}

export function releaseBonusFor(team: HeroInstance[]): Partial<Stats> {
  const out: Partial<Stats> = {};
  for (const inst of team) {
    const def = getHero(inst.heroId);
    if (def.imprint.kind !== 'release') continue;
    const k = def.imprint.stat;
    out[k] = (out[k] || 0) + (def.imprint.values[inst.imprint] ?? 0);
  }
  return out;
}

export function unitSetup(inst: HeroInstance, gearById: Record<string, GearPiece>, team: HeroInstance[] = [inst]): UnitSetup {
  const gear = Object.values(inst.gear).map((id) => (id ? gearById[id] : undefined)).filter(Boolean) as GearPiece[];
  const { stats, sets } = computeStats(inst, gear, releaseBonusFor(team));
  const def = getHero(inst.heroId);
  let artifact = inst.artifact || undefined;
  if (artifact) {
    const a = ARTIFACTS[artifact.id];
    if (!a || (a.cls && !a.cls.includes(def.cls))) artifact = undefined;
  }
  return { heroId: inst.heroId, level: inst.level, stars: inst.stars, stats, sets, artifact, skillLv: [...inst.skillLv] as [number, number, number] };
}

/** Quick stat block for NPCs / bosses without gear. */
export function npcSetup(heroId: string, level: number, opts: { statMult?: number; spdBonus?: number; skillLv?: number; sets?: string[]; eff?: number; res?: number; cc?: number; cd?: number } = {}): UnitSetup {
  const def = getHero(heroId);
  const b = baseStats(def, level, Math.min(6, Math.floor(level / 10)));
  const m = opts.statMult ?? 1;
  // simulate typical gear for the level
  const g = Math.max(0, (level - 10) / 50);
  const stats: Stats = {
    atk: Math.round((b.atk * (1 + 0.6 * g) + 400 * g) * m),
    hp: Math.round((b.hp * (1 + 0.6 * g) + 3000 * g) * m),
    def: Math.round((b.def * (1 + 0.5 * g) + 150 * g) * (0.6 + 0.4 * m)),
    spd: Math.round(b.spd + 30 * g + (opts.spdBonus ?? 0)),
    cc: opts.cc ?? Math.min(1, b.cc + 0.25 * g),
    cd: opts.cd ?? b.cd + 0.4 * g,
    eff: opts.eff ?? b.eff + 0.4 * g,
    res: opts.res ?? b.res + 0.3 * g,
    dual: b.dual,
  };
  const sl = opts.skillLv ?? Math.floor(5 * g);
  return { heroId, level, stars: Math.min(6, Math.max(3, Math.ceil(level / 10))), stats, sets: opts.sets ?? [], skillLv: [sl, sl, sl] };
}

// ───────────────────────────── Gear generation ─────────────────────────────
const MAIN15: Record<GearStat, number> = { atk: 515, 'atk%': 65, hp: 2765, 'hp%': 65, def: 310, 'def%': 65, spd: 45, cc: 60, cd: 70, eff: 65, res: 65 };
const SUB_RANGE: Record<GearStat, [number, number]> = {
  atk: [33, 46], 'atk%': [4, 8], hp: [157, 202], 'hp%': [4, 8], def: [28, 35], 'def%': [4, 8], spd: [2, 5], cc: [3, 5], cd: [4, 7], eff: [4, 8], res: [4, 8],
};
const SLOT_MAINS: Record<GearPiece['slot'], GearStat[]> = {
  weapon: ['atk'],
  helmet: ['hp'],
  armor: ['def'],
  necklace: ['atk%', 'hp%', 'def%', 'cc', 'cd', 'atk', 'hp'],
  ring: ['atk%', 'hp%', 'def%', 'eff', 'res', 'atk', 'hp'],
  boots: ['spd', 'atk%', 'hp%', 'def%', 'atk', 'hp'],
};
const SUB_POOL: GearStat[] = ['atk', 'atk%', 'hp', 'hp%', 'def', 'def%', 'spd', 'cc', 'cd', 'eff', 'res'];

export const RARITY_NAMES = ['', 'Normal', 'Good', 'Rare', 'Heroic', 'Epic'];

export function mainValue(stat: GearStat, enhance: number, tier: number) {
  const tierF = 0.55 + (0.45 * Math.min(90, tier)) / 90;
  return Math.round(MAIN15[stat] * tierF * (0.2 + (0.8 * enhance) / 15));
}

function rollSub(rng: Rng, stat: GearStat, tier: number) {
  const [lo, hi] = SUB_RANGE[stat];
  const f = 0.55 + (0.45 * Math.min(90, tier)) / 90;
  return Math.max(1, Math.round(rng.int(lo, hi) * f));
}

let gearSeq = 0;
export function rollGear(rng: Rng, o: { slot?: GearPiece['slot']; set?: string; rarity?: number; tier?: number; id?: string }): GearPiece {
  const slot = o.slot ?? rng.pick(GEAR_SLOTS);
  const set = o.set ?? rng.pick(SET_IDS);
  const rarity = (o.rarity ?? rng.int(2, 5)) as GearPiece['rarity'];
  const tier = o.tier ?? 85;
  const mains = SLOT_MAINS[slot];
  const mainStat = rng.pick(mains);
  const piece: GearPiece = {
    id: o.id ?? `g${Date.now().toString(36)}${(gearSeq++).toString(36)}${rng.u32().toString(36)}`,
    slot, set, rarity, level: tier, enhance: 0,
    main: { stat: mainStat, value: mainValue(mainStat, 0, tier) },
    subs: [],
  };
  const subCount = Math.max(0, rarity - 1);
  const pool = SUB_POOL.filter((s) => s !== mainStat);
  for (const st of rng.shuffle(pool).slice(0, subCount)) piece.subs.push({ stat: st, value: rollSub(rng, st, tier), rolls: 1 });
  return piece;
}

/** Enhance by one level. Every 3 levels a substat is added or upgraded. */
export function enhanceGear(rng: Rng, g: GearPiece): GearPiece {
  if (g.enhance >= 15) return g;
  g.enhance += 1;
  g.main.value = mainValue(g.main.stat, g.enhance, g.level);
  if (g.enhance % 3 === 0) {
    if (g.subs.length < 4) {
      const pool = SUB_POOL.filter((s) => s !== g.main.stat && !g.subs.some((x) => x.stat === s));
      const st = rng.pick(pool);
      g.subs.push({ stat: st, value: rollSub(rng, st, g.level), rolls: 1 });
    } else {
      const s = rng.pick(g.subs);
      s.value += rollSub(rng, s.stat, g.level);
      s.rolls += 1;
    }
  }
  return g;
}

export function gearEnhanceCost(g: GearPiece) {
  return Math.floor((800 + g.enhance * 900) * (0.6 + g.rarity * 0.2) * (g.level / 85));
}

export function gearScore(g: GearPiece) {
  let s = 0;
  for (const x of g.subs) {
    const w = x.stat === 'spd' ? 2 : x.stat === 'cc' ? 1.6 : x.stat === 'cd' ? 1.14 : x.stat === 'atk' || x.stat === 'hp' || x.stat === 'def' ? 0.3 : 1;
    s += x.value * w;
  }
  return Math.round(s);
}

export const fmtGearStat = (stat: GearStat, v: number) => {
  const pct = stat.endsWith('%') || stat === 'cc' || stat === 'cd' || stat === 'eff' || stat === 'res';
  return `${v}${pct ? '%' : ''}`;
};
export const GEAR_STAT_NAMES: Record<GearStat, string> = {
  atk: 'Attack', 'atk%': 'Attack', hp: 'Health', 'hp%': 'Health', def: 'Defense', 'def%': 'Defense', spd: 'Speed', cc: 'Crit Chance', cd: 'Crit Damage', eff: 'Effectiveness', res: 'Effect Resistance',
};

// ───────────────────────────── Costs ─────────────────────────────
export const skillEnhanceCost = (lv: number) => ({ gold: 8000 + lv * 12000, mola: 1 + Math.floor(lv / 2) });
export const promoteCost = (stars: number) => ({ gold: [0, 0, 0, 10000, 40000, 120000, 300000][stars] ?? 999999, crystals: stars * 2 });
export const awakenCost = (aw: number) => ({ gold: 10000 + aw * 30000, runes: 5 + aw * 5 });
export const artifactEnhanceCost = (lv: number) => 2000 + lv * 1500;
