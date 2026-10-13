// Reference "endgame" builds per role — used by the balance simulator, NPC arena defenders and RTA bots.
import { getHero } from '../engine/registry';
import type { Role, Stats, UnitSetup } from '../engine/types';

interface Profile {
  atk: [number, number];
  hp: [number, number];
  def: [number, number];
  spd: [number, number];
  cc: number;
  cd: number;
  eff: number;
  res: number;
  sets: string[];
}

const P: Record<Role, Profile> = {
  dps: { atk: [2.8, 900], hp: [1.6, 3600], def: [1.3, 150], spd: [1.0, 82], cc: 0.95, cd: 2.9, eff: 0.1, res: 0.15, sets: ['attack', 'critical'] },
  bruiser: { atk: [1.7, 350], hp: [2.6, 6000], def: [1.6, 300], spd: [1.0, 80], cc: 0.6, cd: 2.0, eff: 0.2, res: 0.6, sets: ['health', 'critical'] },
  tank: { atk: [1.3, 150], hp: [2.5, 7000], def: [1.9, 400], spd: [1.0, 62], cc: 0.2, cd: 1.6, eff: 0.4, res: 1.0, sets: ['immunity', 'defense'] },
  healer: { atk: [1.6, 200], hp: [2.2, 4500], def: [1.4, 250], spd: [1.25, 70], cc: 0.2, cd: 1.6, eff: 0.3, res: 1.0, sets: ['speed', 'immunity'] },
  support: { atk: [1.7, 250], hp: [2.2, 4500], def: [1.4, 260], spd: [1.25, 74], cc: 0.3, cd: 1.7, eff: 0.6, res: 0.9, sets: ['speed', 'immunity'] },
  debuffer: { atk: [2.0, 400], hp: [1.9, 4200], def: [1.4, 200], spd: [1.25, 70], cc: 0.5, cd: 2.0, eff: 1.5, res: 0.5, sets: ['speed', 'hit'] },
  control: { atk: [2.0, 400], hp: [2.0, 4500], def: [1.4, 220], spd: [1.25, 72], cc: 0.55, cd: 2.0, eff: 1.3, res: 0.6, sets: ['speed', 'hit'] },
  anomaly: { atk: [2.1, 500], hp: [1.9, 4200], def: [1.4, 220], spd: [1.25, 76], cc: 0.75, cd: 2.25, eff: 0.7, res: 0.6, sets: ['speed', 'critical'] },
};

export function metaBuild(heroId: string, opts: { level?: number; skillLv?: number; spdBonus?: number } = {}): UnitSetup {
  const d = getHero(heroId);
  const p = { ...P[d.role] };
  let sets = [...p.sets];
  // archetype-informed gear choices
  if (d.archetypes.includes('Cleave') && (d.role === 'dps' || d.role === 'anomaly')) { p.spd = [1.25, 78]; sets = ['speed', 'critical']; p.atk = [2.5, 750]; }
  if (d.archetypes.includes('Bruiser Counter') && (d.role === 'bruiser' || d.role === 'tank')) sets = [...sets.filter((s) => s !== 'critical' && s !== 'defense'), 'counter'];
  if (d.archetypes.includes('DoT Rot') && d.role === 'dps') sets = ['rage', 'critical'];
  // hp/def scalers want those stats
  const hpScaler = d.skills.some((s) => s.desc.includes('max Health') && s.desc.includes('proportional'));
  const defScaler = d.skills.some((s) => s.desc.includes('proportional to Defense'));
  const b = d.base;
  const stats: Stats = {
    atk: Math.round(b.atk * p.atk[0] + p.atk[1]),
    hp: Math.round(b.hp * p.hp[0] * (hpScaler ? 1.15 : 1) + p.hp[1]),
    def: Math.round(b.def * p.def[0] * (defScaler ? 1.25 : 1) + p.def[1]),
    spd: Math.round(b.spd * p.spd[0] + p.spd[1] + (opts.spdBonus ?? 0)),
    cc: Math.max(b.cc ?? 0.15, p.cc),
    cd: Math.max(b.cd ?? 1.5, p.cd),
    eff: (b.eff ?? 0) + p.eff,
    res: (b.res ?? 0) + p.res,
    dual: b.dual ?? 0.05,
  };
  // rarity still matters at max investment
  const rf = d.rarity === 5 ? 1 : d.rarity === 4 ? 0.95 : 0.9;
  stats.atk = Math.round(stats.atk * rf);
  stats.hp = Math.round(stats.hp * rf);
  stats.def = Math.round(stats.def * rf);
  const sl = opts.skillLv ?? 5;
  return { heroId, level: opts.level ?? 60, stars: 6, stats, sets, skillLv: [sl, sl, sl] };
}
