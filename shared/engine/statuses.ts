// Buff / debuff registry. Values follow Epic Seven conventions where known (see docs/RESEARCH.md).
import type { Stats } from './types';

export interface StatusDef {
  id: string;
  name: string;
  kind: 'buff' | 'debuff' | 'state';
  icon: string; // game-icons id
  desc: string;
  /** Statuses in the same group don't stack — strongest applies */
  group?: string;
  /** percent for atk/hp/def/spd, absolute for cc/cd/eff/res/dual */
  mods?: Partial<Stats>;
  dot?: 'burn' | 'bleed' | 'poison';
  /** Can stack multiple instances (DoTs) */
  maxStacks?: number;
  /** Prevents acting */
  skipTurn?: boolean;
  /** Cannot be dispelled / cleansed */
  sticky?: boolean;
  /** hidden from UI */
  hidden?: boolean;
  color?: string;
}

const S: Record<string, StatusDef> = {};
export const STATUSES = S;

export function registerStatus(def: StatusDef) {
  S[def.id] = def;
}

function reg(defs: StatusDef[]) {
  for (const d of defs) registerStatus(d);
}

reg([
  // ── Buffs ──────────────────────────────────────────────────────────────
  { id: 'atk_up', name: 'Increased Attack', kind: 'buff', icon: 'sword-brandish', group: 'atk+', mods: { atk: 0.5 }, desc: 'Attack increased by 50%.' },
  { id: 'atk_up_g', name: 'Greater Attack', kind: 'buff', icon: 'mighty-force', group: 'atk+', mods: { atk: 0.75 }, desc: 'Attack increased by 75%.' },
  { id: 'def_up', name: 'Increased Defense', kind: 'buff', icon: 'checked-shield', group: 'def+', mods: { def: 0.6 }, desc: 'Defense increased by 60%.' },
  { id: 'spd_up', name: 'Increased Speed', kind: 'buff', icon: 'sprint', group: 'spd+', mods: { spd: 0.3 }, desc: 'Speed increased by 30%.' },
  { id: 'crit_up', name: 'Increased Critical Hit Chance', kind: 'buff', icon: 'target-arrows', group: 'cc+', mods: { cc: 0.3 }, desc: 'Critical Hit Chance increased by 30%.' },
  { id: 'cdmg_up', name: 'Increased Critical Hit Damage', kind: 'buff', icon: 'barbed-arrow', group: 'cd+', mods: { cd: 0.3 }, desc: 'Critical Hit Damage increased by 30%.' },
  { id: 'res_up', name: 'Increased Effect Resistance', kind: 'buff', icon: 'aura', group: 'res+', mods: { res: 0.5 }, desc: 'Effect Resistance increased by 50%.' },
  { id: 'eff_up', name: 'Increased Effectiveness', kind: 'buff', icon: 'crystal-ball', group: 'eff+', mods: { eff: 0.5 }, desc: 'Effectiveness increased by 50%.' },
  { id: 'immunity', name: 'Immunity', kind: 'buff', icon: 'magic-shield', desc: 'Immune to debuffs.' },
  { id: 'barrier', name: 'Barrier', kind: 'buff', icon: 'bolt-shield', desc: 'Absorbs damage until depleted.' },
  { id: 'invincible', name: 'Invincibility', kind: 'buff', icon: 'spiked-halo', desc: 'Takes no damage.' },
  { id: 'nullifier', name: 'Skill Nullifier', kind: 'buff', icon: 'shield-reflect', desc: 'Nullifies the next skill damage and its debuffs.' },
  { id: 'stealth', name: 'Stealth', kind: 'buff', icon: 'invisible', desc: 'Cannot be targeted by single-target skills.' },
  { id: 'counter', name: 'Counterattack', kind: 'buff', icon: 'return-arrow', desc: 'Counterattacks with its first skill when attacked.' },
  { id: 'regen', name: 'Continuous Heal', kind: 'buff', icon: 'regeneration', desc: 'Recovers 12% of max Health at the start of each turn.' },
  { id: 'vamp', name: 'Vampirism', kind: 'buff', icon: 'vampire-dracula', desc: 'Recovers 30% of damage dealt as Health.' },
  { id: 'resurrect', name: 'Resurrect', kind: 'buff', icon: 'angel-wings', desc: 'Revives with 30% Health upon death.' },
  { id: 'immortal', name: 'Immortality', kind: 'buff', icon: 'infinity', desc: 'Health cannot drop below 1.' },
  { id: 'critres_up', name: 'Critical Hit Resistance', kind: 'buff', icon: 'slashed-shield', mods: {}, desc: 'Chance of being critically hit decreased by 50%.' },
  { id: 'echo', name: 'Echo', kind: 'buff', icon: 'echo-ripples', desc: 'Next active skill repeats at 40% damage on the same target. Consumed on use.' },
  { id: 'bloom', name: 'Bloom', kind: 'buff', icon: 'lotus', desc: 'Healing received +30%; at turn end recovers 5% of max Health.' },
  { id: 'evasion', name: 'Increased Evasion', kind: 'buff', icon: 'ghost-ally', desc: '35% chance to evade single-target attacks (counts as a Miss).' },
  { id: 'guard', name: 'Guardian', kind: 'buff', icon: 'shield', desc: 'Damage taken by allies is reduced by 20%; 20% of it is redirected to the Guardian.' },
  { id: 'focus', name: 'Focus', kind: 'buff', icon: 'meditation', desc: 'Next attack is a guaranteed critical hit.' },

  // ── Debuffs ────────────────────────────────────────────────────────────
  { id: 'atk_down', name: 'Decreased Attack', kind: 'debuff', icon: 'arm', group: 'atk-', mods: { atk: -0.5 }, desc: 'Attack decreased by 50%.' },
  { id: 'def_down', name: 'Decreased Defense', kind: 'debuff', icon: 'broken-shield', group: 'def-', mods: { def: -0.7 }, desc: 'Defense decreased by 70%.' },
  { id: 'spd_down', name: 'Decreased Speed', kind: 'debuff', icon: 'snail', group: 'spd-', mods: { spd: -0.3 }, desc: 'Speed decreased by 30%.' },
  { id: 'hit_down', name: 'Decreased Hit Chance', kind: 'debuff', icon: 'cancel', desc: '50% chance to Miss when attacking.' },
  { id: 'unhealable', name: 'Unhealable', kind: 'debuff', icon: 'broken-heart', desc: 'Cannot recover Health.' },
  { id: 'unbuffable', name: 'Unbuffable', kind: 'debuff', icon: 'shield-disabled', desc: 'Cannot be granted buffs.' },
  { id: 'silence', name: 'Silence', kind: 'debuff', icon: 'silenced', desc: 'Can only use the first skill.' },
  { id: 'stun', name: 'Stun', kind: 'debuff', icon: 'stun-grenade', skipTurn: true, desc: 'Cannot act.' },
  { id: 'sleep', name: 'Sleep', kind: 'debuff', icon: 'sleepy', skipTurn: true, desc: 'Cannot act. Wakes up when attacked.' },
  { id: 'provoke', name: 'Provoke', kind: 'debuff', icon: 'shouting', desc: 'Forced to attack the caster with the first skill.' },
  { id: 'burn', name: 'Burn', kind: 'debuff', icon: 'flame', dot: 'burn', maxStacks: 10, desc: 'At turn start, takes damage equal to 60% of the caster\'s Attack, ignoring Defense.' },
  { id: 'bleed', name: 'Bleed', kind: 'debuff', icon: 'bleeding-wound', dot: 'bleed', maxStacks: 10, desc: 'At turn start, takes damage equal to 40% of the caster\'s Attack, ignoring Defense.' },
  { id: 'poison', name: 'Poison', kind: 'debuff', icon: 'poison-bottle', dot: 'poison', maxStacks: 10, desc: 'At turn start, takes damage equal to 6% of max Health.' },
  { id: 'curse', name: 'Curse', kind: 'debuff', icon: 'cursed-star', desc: 'When attacked, takes additional damage equal to 50% of the caster\'s Attack. Removed afterwards.' },
  { id: 'mark', name: 'Target', kind: 'debuff', icon: 'eye-target', desc: 'Damage taken increased by 25% and more likely to be attacked.' },
  { id: 'restrict', name: 'Restrict', kind: 'debuff', icon: 'padlock', desc: 'Cannot gain Combat Readiness from effects.' },
  { id: 'fear', name: 'Fear', kind: 'debuff', icon: 'terror', desc: 'Deals 25% less damage; cannot counterattack or dual attack.' },
  { id: 'extinction', name: 'Extinction', kind: 'debuff', icon: 'tombstone', sticky: true, desc: 'Cannot be revived. Cannot be removed.' },
  { id: 'grudge', name: 'Grudge', kind: 'debuff', icon: 'despair', group: 'grudge', mods: { hp: -0.2 }, desc: 'Returned from death: max Health decreased by 20%.' },
  { id: 'link', name: 'Fate Thread', kind: 'debuff', icon: 'spider-web', desc: '30% of damage taken is also dealt to the other threaded units.' },
  { id: 'imprison', name: 'Imprison', kind: 'debuff', icon: 'cage', skipTurn: true, desc: 'Removed from the battlefield: cannot act and cannot be targeted.' },
  { id: 'doom', name: 'Doom', kind: 'debuff', icon: 'death-skull', desc: 'When Doom expires naturally, takes damage equal to 30% of max Health.' },
  { id: 'crit_vuln', name: 'Exposed', kind: 'debuff', icon: 'cracked-shield', desc: 'Chance of being critically hit increased by 25%.' },
]);

export const isDebuff = (id: string) => S[id]?.kind === 'debuff';
export const isBuff = (id: string) => S[id]?.kind === 'buff';
