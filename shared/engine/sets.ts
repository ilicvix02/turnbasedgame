// Gear sets (Epic Seven parity) — stat sets are folded into pre-battle stats, effect sets are read by the battle core.
import type { Stats } from './types';

export interface GearSetDef {
  id: string;
  name: string;
  pieces: 2 | 4;
  desc: string;
  icon: string;
  color: string;
  /** Stat bonus applied when building the unit (percent for atk/hp/def/spd, absolute otherwise) */
  mods?: Partial<Stats>;
}

export const GEAR_SETS: Record<string, GearSetDef> = {
  speed: { id: 'speed', name: 'Speed', pieces: 4, desc: 'Speed +25%.', icon: 'sprint', color: '#4fd1ff', mods: { spd: 0.25 } },
  attack: { id: 'attack', name: 'Attack', pieces: 4, desc: 'Attack +45%.', icon: 'sword-brandish', color: '#ff5a5a', mods: { atk: 0.45 } },
  destruction: { id: 'destruction', name: 'Destruction', pieces: 4, desc: 'Critical Hit Damage +60%.', icon: 'barbed-arrow', color: '#ff2f6d', mods: { cd: 0.6 } },
  critical: { id: 'critical', name: 'Critical', pieces: 2, desc: 'Critical Hit Chance +12%.', icon: 'target-arrows', color: '#ff9b3d', mods: { cc: 0.12 } },
  hit: { id: 'hit', name: 'Hit', pieces: 2, desc: 'Effectiveness +20%.', icon: 'crystal-ball', color: '#b27aff', mods: { eff: 0.2 } },
  resist: { id: 'resist', name: 'Resist', pieces: 2, desc: 'Effect Resistance +20%.', icon: 'aura', color: '#7affc8', mods: { res: 0.2 } },
  health: { id: 'health', name: 'Health', pieces: 2, desc: 'Health +20%.', icon: 'heart-plus', color: '#57e389', mods: { hp: 0.2 } },
  defense: { id: 'defense', name: 'Defense', pieces: 2, desc: 'Defense +20%.', icon: 'checked-shield', color: '#8fb3ff', mods: { def: 0.2 } },
  counter: { id: 'counter', name: 'Counter', pieces: 4, desc: '20% chance to counterattack when attacked.', icon: 'return-arrow', color: '#ffd24a' },
  lifesteal: { id: 'lifesteal', name: 'Lifesteal', pieces: 4, desc: 'Recover 20% of damage dealt as Health.', icon: 'vampire-dracula', color: '#d0304f' },
  unity: { id: 'unity', name: 'Unity', pieces: 2, desc: 'Dual Attack chance +4%.', icon: 'crossed-swords', color: '#ffe9a6', mods: { dual: 0.04 } },
  immunity: { id: 'immunity', name: 'Immunity', pieces: 2, desc: 'Immunity for 1 turn at the start of battle.', icon: 'magic-shield', color: '#ffffff' },
  rage: { id: 'rage', name: 'Rage', pieces: 4, desc: 'Damage dealt to debuffed enemies +30%.', icon: 'screaming', color: '#ff6a00' },
  penetration: { id: 'penetration', name: 'Penetration', pieces: 2, desc: 'Single-target attacks ignore 15% of Defense.', icon: 'heavy-arrow', color: '#c0c0c0' },
  revenge: { id: 'revenge', name: 'Revenge', pieces: 4, desc: 'Speed +12%. When attacked below 50% Health, Combat Readiness +10%.', icon: 'sword-wound', color: '#a02040', mods: { spd: 0.12 } },
  injury: { id: 'injury', name: 'Injury', pieces: 4, desc: 'Attacks deal bonus damage equal to 4% of the target\'s max Health (max 2× own Attack).', icon: 'dripping-blade', color: '#902030' },
  protection: { id: 'protection', name: 'Protection', pieces: 4, desc: 'At battle start, all allies gain a Barrier equal to 15% of the wearer\'s Health for 2 turns.', icon: 'bolt-shield', color: '#7ac7ff' },
  torrent: { id: 'torrent', name: 'Torrent', pieces: 2, desc: 'Damage dealt +10%, Health −10%.', icon: 'tornado', color: '#46a0ff', mods: { hp: -0.1 } },
  reversal: { id: 'reversal', name: 'Reversal', pieces: 4, desc: 'Speed +15%. When a debuff is removed from the wearer, Combat Readiness +10%.', icon: 'divert', color: '#ffb0e0', mods: { spd: 0.15 } },
  warfare: { id: 'warfare', name: 'Warfare', pieces: 4, desc: 'Ignore 30% of Defense when attacking Bosses and Vanguard enemies.', icon: 'anvil', color: '#c58b4a' },
};

export const SET_IDS = Object.keys(GEAR_SETS);
