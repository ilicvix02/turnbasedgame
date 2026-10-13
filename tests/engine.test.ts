import { describe, it, expect } from 'vitest';
import '../shared/data/index';
import { PLAYABLE } from '../shared/data/index';
import { Battle, advantage } from '../shared/engine/battle';
import { autoRun, chooseAction } from '../shared/engine/ai';
import { metaBuild } from '../shared/meta/builds';
import { npcSetup } from '../shared/meta/progression';
import { Rng } from '../shared/engine/rng';
import { HERO_LIST } from '../shared/engine/registry';
import { STATUSES } from '../shared/engine/statuses';
import type { BattleConfig } from '../shared/engine/types';

const cfg = (a: string[], b: string[], seed = 1): BattleConfig => ({ seed, mode: 'sim', teams: [{ name: 'A', units: a.map((h) => metaBuild(h)) }, { name: 'B', units: b.map((h) => metaBuild(h)) }] });

describe('roster', () => {
  it('has at least 50 unique playable heroes across all rarities', () => {
    const p = PLAYABLE();
    expect(p.length).toBeGreaterThanOrEqual(50);
    expect(new Set(p.map((h) => h.id)).size).toBe(p.length);
    for (const r of [3, 4, 5]) expect(p.filter((h) => h.rarity === r).length).toBeGreaterThan(10);
  });
  it('every hero has three skills with text and a look', () => {
    for (const h of HERO_LIST) {
      expect(h.skills.some((s) => s.slot === 's1')).toBe(true);
      for (const s of h.skills) expect(s.desc.length).toBeGreaterThan(5);
      expect(h.look.outfit.primary).toMatch(/^#/);
    }
  });
});

describe('rules', () => {
  it('element triangle and light/dark', () => {
    expect(advantage('flame', 'verdant')).toBe('adv');
    expect(advantage('verdant', 'frost')).toBe('adv');
    expect(advantage('frost', 'flame')).toBe('adv');
    expect(advantage('verdant', 'flame')).toBe('dis');
    expect(advantage('radiant', 'umbral')).toBe('adv');
    expect(advantage('umbral', 'radiant')).toBe('adv');
    expect(advantage('radiant', 'flame')).toBe('neutral');
  });

  it('is fully deterministic: same seed + inputs → same event log', () => {
    const c = cfg(['ignara', 'seraphine', 'vulkar', 'orion'], ['nocturne', 'mordessa', 'isolde', 'chronarch'], 99);
    const a = new Battle(c);
    autoRun(a, 'normal');
    const b = new Battle(c);
    b.start();
    for (const inp of a.inputs) b.act(inp);
    expect(b.winner).toBe(a.winner);
    expect(JSON.stringify(b.events)).toBe(JSON.stringify(a.events));
  });

  it('fastest unit acts first', () => {
    const c = cfg(['wren'], ['grom']);
    c.teams[0].units[0].stats.spd = 300;
    c.teams[1].units[0].stats.spd = 80;
    const b = new Battle(c);
    b.start();
    expect(b.unit(b.pending!).team).toBe(0);
  });

  it('debuff land chance caps at 85% (15% minimum resist)', () => {
    let landed = 0;
    const N = 2000;
    const rng = new Rng(5);
    for (let i = 0; i < N; i++) {
      const b = new Battle({ ...cfg(['isolde'], ['grom']), seed: rng.u32() });
      const [src, tgt] = b.units;
      src.base.eff = 5;
      tgt.base.res = 0;
      if (b.applyStatus(src, tgt, 'spd_down', 2)) landed++;
    }
    expect(landed / N).toBeGreaterThan(0.8);
    expect(landed / N).toBeLessThan(0.9);
  });

  it('immunity blocks debuffs; unbuffable blocks buffs', () => {
    const b = new Battle(cfg(['isolde'], ['grom']));
    const [src, tgt] = b.units;
    b.applyStatus(src, tgt, 'immunity', 2);
    expect(b.applyStatus(src, tgt, 'stun', 1, { unres: true })).toBe(false);
    b.applyStatus(tgt, src, 'unbuffable', 2, { unres: true });
    expect(b.applyStatus(src, src, 'atk_up', 2)).toBe(false);
  });

  it('defense break increases damage taken', () => {
    const avg = (broken: boolean) => {
      let total = 0;
      for (let i = 0; i < 200; i++) {
        const b = new Battle({ ...cfg(['gideon'], ['grom']), seed: i + 1 });
        const [src, tgt] = b.units;
        if (broken) b.applyStatus(src, tgt, 'def_down', 2, { unres: true });
        total += b.dealDamage(src, tgt, { atk: 1, noCrit: true, noMiss: true }).dmg;
      }
      return total / 200;
    };
    expect(avg(true)).toBeGreaterThan(avg(false) * 1.5);
  });

  it('Extinction prevents revival; Resurrect revives', () => {
    const b = new Battle(cfg(['seraphine', 'gideon'], ['mordessa']));
    const g = b.units[1];
    b.applyStatus(undefined, g, 'resurrect', 3, { value: 0.5 });
    b.kill(g);
    expect(g.alive).toBe(true);
    expect(g.has('grudge')).toBe(true);
    b.applyStatus(undefined, g, 'extinction', 99, { unres: true });
    b.kill(g);
    expect(g.alive).toBe(false);
    expect(b.revive(g, 1)).toBe(false);
  });

  it('Dominion: Stillwater locks combat readiness, Sanctum blocks statuses', () => {
    const b = new Battle(cfg(['chronarch'], ['grom']));
    const [c, g] = b.units;
    b.setField(c, 'stillwater', 2);
    const before = g.cr;
    b.changeCr(g, -50);
    expect(g.cr).toBe(before);
    b.setField(c, 'sanctum', 2);
    expect(b.applyStatus(c, g, 'stun', 1, { unres: true })).toBe(false);
  });

  it('Lumen revives a fallen ally', () => {
    const b = new Battle(cfg(['seraphine', 'gideon'], ['grom']));
    b.start();
    const g = b.units[1];
    b.kill(g);
    expect(g.alive).toBe(true);
  });

  it('every hero can fight a full battle without errors (fuzz)', () => {
    const ids = PLAYABLE().map((h) => h.id);
    const rng = new Rng(2026);
    for (let i = 0; i < 60; i++) {
      const p = rng.shuffle(ids);
      const b = new Battle({ ...cfg(p.slice(0, 4), p.slice(4, 8)), seed: rng.u32() });
      expect(() => autoRun(b, 'quick')).not.toThrow();
      expect(b.winner).toBeGreaterThanOrEqual(0);
    }
    for (const id of ids) {
      const b = new Battle(cfg([id, 'gideon'], ['ashmaw']));
      expect(() => autoRun(b, 'quick')).not.toThrow();
    }
  });

  it('bosses resist hard crowd control', () => {
    const b = new Battle({ seed: 1, mode: 'campaign', teams: [{ name: 'a', units: [npcSetup('isolde', 40)] }, { name: 'b', units: [npcSetup('ashmaw', 40)] }] });
    b.start();
    const boss = b.units[1];
    b.applyStatus(b.units[0], boss, 'stun', 1, { unres: true });
    expect(boss.has('stun')).toBe(false);
  });

  it('AI never picks an illegal action', () => {
    const b = new Battle(cfg(['tickTock'.toLowerCase(), 'fenra', 'sable', 'hesk'], ['vulkar', 'brannoc', 'verity', 'ilyana'], 11));
    b.start();
    let n = 0;
    while (b.winner < 0 && n++ < 400) b.act(chooseAction(b, 'normal'));
    expect(b.winner).toBeGreaterThanOrEqual(0);
  });

  it('status registry is consistent', () => {
    for (const s of Object.values(STATUSES)) expect(['buff', 'debuff', 'state']).toContain(s.kind);
  });
});
