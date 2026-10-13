// Class-restricted artifacts (Epic Seven parity). Level 0–30; passives scale with level.
import type { HeroClass, HeroHooks, Stats } from './types';
import { HookCtx } from './context';

export interface ArtifactDef {
  id: string;
  name: string;
  rarity: 3 | 4 | 5;
  cls?: HeroClass[]; // undefined = universal
  atk: number; // flat attack at lv 30
  hp: number; // flat health at lv 30
  desc: string;
  icon: string;
  mods?: Partial<Stats>; // scaled by (1 + lv/30)
  hooks?: HeroHooks;
}

const lvScale = (h: HookCtx, lo: number, hi: number) => {
  const lv = h.self.artifact?.level ?? 0;
  return lo + ((hi - lo) * lv) / 30;
};

export const ARTIFACTS: Record<string, ArtifactDef> = {};
function A(d: ArtifactDef) {
  ARTIFACTS[d.id] = d;
}

// ── Universal ──
A({ id: 'oath_ring', name: 'Oathbound Ring', rarity: 3, atk: 300, hp: 220, icon: 'ring', desc: 'Effect Resistance +12% (+24% at max).', mods: { res: 0.12 } });
A({ id: 'trail_compass', name: 'Wayfinder\'s Compass', rarity: 4, atk: 420, hp: 280, icon: 'compass', desc: 'At battle start, Combat Readiness +6% (+12% at max).', hooks: { onBattleStart: (h) => h.cr(h.self, lvScale(h, 6, 12)) } });

// ── Knight ──
A({ id: 'aegis_of_dawn', name: 'Aegis of Dawn', rarity: 5, cls: ['knight'], atk: 300, hp: 1200, icon: 'shield', desc: 'When an ally is attacked, 10% (20%) chance to grant them a Barrier equal to 10% of the wearer\'s Health for 1 turn.', hooks: { onAllyAttacked: (h, ally) => { if (ally.alive && h.chance(lvScale(h, 0.1, 0.2))) h.barrier(ally, h.maxHp() * 0.1, 1); } } });
A({ id: 'iron_vow', name: 'Iron Vow', rarity: 4, cls: ['knight', 'warrior'], atk: 400, hp: 900, icon: 'checked-shield', desc: 'Damage taken −8% (−16%).', hooks: { dmgIn: (u) => 1 - (0.08 + (0.08 * (u.artifact?.level ?? 0)) / 30) } });
A({ id: 'sentinel_horn', name: 'Sentinel\'s Horn', rarity: 5, cls: ['knight'], atk: 300, hp: 1100, icon: 'shouting', desc: 'When attacked, 25% (40%) chance to Provoke the attacker for 1 turn.', hooks: { onAttacked: (h, att, info) => { if (!info.isCounter && h.chance(lvScale(h, 0.25, 0.4))) h.debuff(att, 'provoke', 1, 1); } } });

// ── Warrior ──
A({ id: 'grudge_edge', name: 'Grudge Edge', rarity: 5, cls: ['warrior'], atk: 600, hp: 500, icon: 'sword-wound', desc: 'Damage dealt +2% (+4%) for every 10% Health lost.', hooks: { dmgOut: (u, _t, b) => 1 + (1 - b.hpPct(u)) * 10 * (0.02 + (0.02 * (u.artifact?.level ?? 0)) / 30) } });
A({ id: 'warlords_drum', name: 'Warlord\'s Drum', rarity: 4, cls: ['warrior', 'knight'], atk: 500, hp: 600, icon: 'drum', desc: 'After using a skill, 15% (25%) chance to grant all allies Increased Attack for 1 turn.', hooks: { afterSkill: (h) => { if (h.chance(lvScale(h, 0.15, 0.25))) for (const a of h.allies()) h.buff(a, 'atk_up', 1); } } });
A({ id: 'crimson_vow', name: 'Crimson Vow', rarity: 5, cls: ['warrior'], atk: 620, hp: 480, icon: 'blood', desc: 'Recover Health equal to 6% (12%) of damage dealt.', hooks: { onHit: (h, _t, info) => { if (info.dmg > 0) h.heal(h.self, info.dmg * lvScale(h, 0.06, 0.12)); } } });

// ── Thief ──
A({ id: 'twin_fang', name: 'Twinfang Pact', rarity: 5, cls: ['thief'], atk: 640, hp: 420, icon: 'crossed-swords', desc: 'At the end of the turn, 10% (20%) chance to gain an extra turn. Once per turn.', hooks: { afterSkill: (h) => { if (h.chance(lvScale(h, 0.1, 0.2))) { h.text('Extra Turn', '#ffe680'); h.b.priority = h.self.uid; } } } });
A({ id: 'shadow_lantern', name: 'Shadow Lantern', rarity: 4, cls: ['thief', 'ranger'], atk: 520, hp: 380, icon: 'lantern-flame', desc: 'At battle start, gain Stealth for 1 turn (2 turns at max).', hooks: { onBattleStart: (h) => { h.buff(h.self, 'stealth', h.self.artifact && h.self.artifact.level >= 30 ? 2 : 1); } } });
A({ id: 'cutpurse_glove', name: 'Cutpurse Glove', rarity: 4, cls: ['thief'], atk: 520, hp: 380, icon: 'gloves', desc: 'When attacking, 15% (30%) chance to steal 1 buff.', hooks: { onHit: (h, t, info) => { if (!info.isCounter && t.alive && h.chance(lvScale(h, 0.15, 0.3))) h.steal(t, 1); } } });

// ── Ranger ──
A({ id: 'hunters_mark', name: 'Hunter\'s Mark', rarity: 5, cls: ['ranger'], atk: 650, hp: 400, icon: 'eye-target', desc: 'Critical Hit Damage +12% (+24%). Damage against Targeted enemies +10%.', mods: { cd: 0.12 }, hooks: { dmgOut: (_u, t) => (t.has('mark') ? 1.1 : 1) } });
A({ id: 'gale_quiver', name: 'Gale Quiver', rarity: 4, cls: ['ranger', 'thief'], atk: 540, hp: 380, icon: 'quiver', desc: 'After attacking, Combat Readiness +3% (+6%).', hooks: { afterSkill: (h) => h.cr(h.self, lvScale(h, 3, 6)) } });
A({ id: 'longshot', name: 'Longshot', rarity: 5, cls: ['ranger'], atk: 660, hp: 380, icon: 'crossbow', desc: 'Damage dealt to enemies with higher Health % than the wearer +12% (+24%).', hooks: { dmgOut: (u, t, b) => (b.hpPct(t) > b.hpPct(u) ? 1 + 0.12 + (0.12 * (u.artifact?.level ?? 0)) / 30 : 1) } });

// ── Mage ──
A({ id: 'ember_codex', name: 'Ember Codex', rarity: 5, cls: ['mage'], atk: 660, hp: 360, icon: 'spell-book', desc: 'Damage dealt with AoE skills +10% (+20%).', hooks: { dmgOut: (u, _t, b) => { const ax = b.actx; const sk = ax ? b.skillOf(u, ax.slot) : undefined; return sk?.target === 'allEnemies' ? 1.1 + (0.1 * (u.artifact?.level ?? 0)) / 30 : 1; } } });
A({ id: 'void_prism', name: 'Void Prism', rarity: 5, cls: ['mage', 'soulweaver'], atk: 560, hp: 420, icon: 'crystal-growth', desc: 'Effectiveness +15% (+30%).', mods: { eff: 0.15 } });
A({ id: 'chrono_shard', name: 'Chrono Shard', rarity: 4, cls: ['mage'], atk: 540, hp: 380, icon: 'pocket-watch', desc: 'When the wearer uses an S3, decrease all enemies\' Combat Readiness by 5% (10%).', hooks: { afterSkill: (h, slot) => { if (slot === 's3') for (const e of h.enemies()) h.cr(e, -lvScale(h, 5, 10)); } } });

// ── Soul Weaver ──
A({ id: 'everbloom', name: 'Everbloom Branch', rarity: 5, cls: ['soulweaver'], atk: 300, hp: 900, icon: 'flowers', desc: 'At the start of the wearer\'s turn, heal the ally with the lowest Health by 6% (12%) of the wearer\'s max Health.', hooks: { onTurnStart: (h) => { const t = h.lowestHp(h.allies()); if (t) h.heal(t, h.maxHp() * lvScale(h, 0.06, 0.12)); } } });
A({ id: 'sacred_bell', name: 'Sacred Bell', rarity: 5, cls: ['soulweaver', 'knight'], atk: 300, hp: 850, icon: 'ringing-bell', desc: 'When an ally receives a debuff, 15% (30%) chance to remove it. Once per turn.', hooks: { onTurnStart: (h) => h.set('bellUsed', 0), afterAnyAction: (h) => { if (h.get('bellUsed')) return; for (const a of h.allies()) { if (a.debuffs().length && h.chance(lvScale(h, 0.15, 0.3))) { h.cleanse(a, 1); h.set('bellUsed', 1); break; } } } } });
A({ id: 'mercy_censer', name: 'Mercy Censer', rarity: 4, cls: ['soulweaver'], atk: 280, hp: 820, icon: 'incense', desc: 'Healing dealt +10% (+20%) — applied as additional heal on allies below 50% Health.', hooks: { onTurnEnd: (h) => { for (const a of h.allies()) if (h.hpPct(a) < 0.5) h.heal(a, h.maxHp() * lvScale(h, 0.03, 0.06)); } } });
