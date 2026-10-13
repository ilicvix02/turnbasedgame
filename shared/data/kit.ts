// Authoring helpers for hero definitions.
import type { EnhanceStep, HeroClass, HeroDef, StatKey } from '../engine/types';

type Base = HeroDef['base'];

const CLASS_BASE: Record<HeroClass, Base> = {
  knight: { atk: 790, hp: 6800, def: 700, spd: 100 },
  warrior: { atk: 1110, hp: 6000, def: 600, spd: 105 },
  thief: { atk: 1080, hp: 5100, def: 500, spd: 117 },
  ranger: { atk: 1120, hp: 5300, def: 560, spd: 108 },
  mage: { atk: 1250, hp: 4950, def: 630, spd: 104 },
  soulweaver: { atk: 700, hp: 5500, def: 690, spd: 104 },
};
const RARITY_MULT = { 3: 0.86, 4: 0.94, 5: 1 } as const;

/** Base stats by class & rarity with optional overrides (multipliers for atk/hp/def, absolute speed). */
export function stats(cls: HeroClass, rarity: 3 | 4 | 5, o: { atk?: number; hp?: number; def?: number; spd?: number; cc?: number; cd?: number; eff?: number; res?: number; dual?: number } = {}): Base {
  const b = CLASS_BASE[cls];
  const r = RARITY_MULT[rarity];
  return {
    atk: Math.round(b.atk * r * (o.atk ?? 1)),
    hp: Math.round(b.hp * r * (o.hp ?? 1)),
    def: Math.round(b.def * r * (o.def ?? 1)),
    spd: o.spd ?? b.spd - (5 - rarity) * 3,
    cc: o.cc,
    cd: o.cd,
    eff: o.eff,
    res: o.res,
    dual: o.dual,
  };
}

export const E = {
  /** standard damage S1: +45% */
  dmg: [{ dmg: 0.05 }, { dmg: 0.05 }, { dmg: 0.1 }, { dmg: 0.1 }, { dmg: 0.15 }] as EnhanceStep[],
  /** damage + chance */
  mix: [{ dmg: 0.05 }, { chance: 0.05 }, { dmg: 0.1 }, { chance: 0.1 }, { dmg: 0.15 }] as EnhanceStep[],
  /** damage + cooldown */
  cd: [{ dmg: 0.05 }, { dmg: 0.1 }, { cd: 1 }, { dmg: 0.15 }] as EnhanceStep[],
  cd2: [{ dmg: 0.05 }, { cd: 1 }, { dmg: 0.1 }, { cd: 1 }] as EnhanceStep[],
  /** chance focused */
  chance: [{ chance: 0.05 }, { dmg: 0.05 }, { chance: 0.1 }, { dmg: 0.1 }, { chance: 0.1 }] as EnhanceStep[],
  /** heal focused */
  heal: [{ heal: 0.05 }, { heal: 0.05 }, { heal: 0.1 }, { cd: 1 }, { heal: 0.1 }] as EnhanceStep[],
  /** pure cooldown */
  cdOnly: [{ cd: 1 }] as EnhanceStep[],
  /** passive (stacks shown in text) */
  passive: [] as EnhanceStep[],
};

const IMP: Record<string, number[]> = {
  atk: [0.04, 0.06, 0.08, 0.1, 0.12, 0.14, 0.16],
  hp: [0.04, 0.06, 0.08, 0.1, 0.12, 0.14, 0.16],
  def: [0.04, 0.06, 0.08, 0.1, 0.12, 0.14, 0.16],
  spd: [0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08],
  cc: [0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08],
  cd: [0.04, 0.06, 0.08, 0.1, 0.12, 0.14, 0.16],
  eff: [0.06, 0.09, 0.12, 0.15, 0.18, 0.21, 0.24],
  res: [0.06, 0.09, 0.12, 0.15, 0.18, 0.21, 0.24],
  dual: [0.01, 0.015, 0.02, 0.025, 0.03, 0.035, 0.04],
};
export function imprint(kind: 'release' | 'concentration', stat: StatKey) {
  const v = IMP[stat];
  return { kind, stat, values: kind === 'release' ? v.map((x) => Math.round(x * 0.5 * 1000) / 1000) : v };
}
