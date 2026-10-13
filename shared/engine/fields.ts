// Dominions — battlefield-wide rule changes (invented system, generalising Notos' "Sanctuary of Battle").
// Only one Dominion may exist. Casting a new one shatters the old one.
import type { Element } from './types';

export interface FieldDef {
  id: string;
  name: string;
  desc: string;
  color: string;
  icon: string;
  /** Elemental advantage override */
  advantage?: (atk: Element, def: Element, normal: number) => number;
  /** Combat Readiness manipulation is disabled */
  crLocked?: boolean;
  /** Healing is converted into damage to a random enemy of the healed unit */
  healToDamage?: boolean;
  /** Buffs applied last +1 turn */
  buffBonus?: number;
  /** Debuffs applied last +1 turn */
  debuffBonus?: number;
  /** No buffs or debuffs can be applied */
  noStatus?: boolean;
  /** Global damage multiplier */
  dmgMult?: number;
  /** Damage multiplier for owner team only */
  ownerDmgMult?: number;
  /** Speed multiplier for everyone */
  spdMult?: number;
  /** Crit chance bonus for everyone */
  ccBonus?: number;
  /** Soul gain multiplier */
  soulMult?: number;
}

export const FIELDS: Record<string, FieldDef> = {
  eclipse: {
    id: 'eclipse', name: 'Eclipse', color: '#9a7cff', icon: 'eclipse',
    desc: 'Light and darkness trade places: Radiant and Umbral advantage is inverted (each takes double damage from itself). Crit chance +10% for all.',
    advantage: (a, d, n) => {
      if ((a === 'radiant' && d === 'radiant') || (a === 'umbral' && d === 'umbral')) return 1.2;
      if ((a === 'radiant' && d === 'umbral') || (a === 'umbral' && d === 'radiant')) return 1.0;
      return n;
    },
    ccBonus: 0.1,
  },
  stillwater: {
    id: 'stillwater', name: 'Stillwater', color: '#5fd4ff', icon: 'sands-of-time',
    desc: 'Time holds its breath: Combat Readiness cannot be increased or decreased by effects.',
    crLocked: true,
  },
  bloodmoon: {
    id: 'bloodmoon', name: 'Bloodmoon', color: '#ff3a4a', icon: 'moon',
    desc: 'Healing is inverted: any healing on the owner\'s enemies becomes damage, and enemies revived under it return Unhealable. Damage dealt +10%.',
    healToDamage: true, dmgMult: 1.1,
  },
  verdant_court: {
    id: 'verdant_court', name: 'Verdant Court', color: '#5be37a', icon: 'oak-leaf',
    desc: 'The forest remembers: buffs applied last 1 extra turn and soul gain is doubled.',
    buffBonus: 1, soulMult: 2,
  },
  sanctum: {
    id: 'sanctum', name: 'Sanctum of Judgment', color: '#ffe27a', icon: 'holy-symbol',
    desc: 'No buffs or debuffs can be applied to anyone.',
    noStatus: true,
  },
  inferno: {
    id: 'inferno', name: 'Inferno Crown', color: '#ff7a2a', icon: 'burning-embers',
    desc: 'The air burns: debuffs last 1 extra turn and the owner\'s team deals 15% more damage.',
    debuffBonus: 1, ownerDmgMult: 1.15,
  },
  frozen_hour: {
    id: 'frozen_hour', name: 'Frozen Hour', color: '#bfe8ff', icon: 'snowflake-1',
    desc: 'Everything slows: Speed of all units is decreased by 20%.',
    spdMult: 0.8,
  },
  starfield: {
    id: 'starfield', name: 'Starfield', color: '#7aa8ff', icon: 'galaxy',
    desc: 'Constellations align: critical hit chance +20% and critical hits deal damage as if element advantage applied.',
    ccBonus: 0.2,
  },
};
