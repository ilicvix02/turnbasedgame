// Headless balance simulator.
//   npx tsx scripts/sim.ts [battles] [ai]
// Prints per-hero win rates, archetype matchup matrix and writes docs/sim-results.json.
import '../shared/data/index';
import { PLAYABLE } from '../shared/data/index';
import { Battle } from '../shared/engine/battle';
import { autoRun, type AiLevel } from '../shared/engine/ai';
import { metaBuild } from '../shared/meta/builds';
import { Rng } from '../shared/engine/rng';
import { ARCHETYPE_TEAMS } from '../shared/meta/meta';
import { writeFileSync } from 'node:fs';

const N = Number(process.argv[2] || 400);
const AI = (process.argv[3] || 'normal') as AiLevel | 'quick';
const heroes = PLAYABLE();
const rng = new Rng(20261013);

function fight(a: string[], b: string[], seed: number) {
  const bt = new Battle({ seed, mode: 'sim', teams: [{ name: 'A', units: a.map((h) => metaBuild(h)) }, { name: 'B', units: b.map((h) => metaBuild(h)) }], maxActions: 200 });
  const w = autoRun(bt, AI);
  return { w, actions: bt.actions };
}

const stats: Record<string, { g: number; w: number }> = {};
for (const h of heroes) stats[h.id] = { g: 0, w: 0 };
let errors = 0;
let draws = 0;
let totalActions = 0;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const focus = process.env.FOCUS;
  const pool = rng.shuffle(heroes.map((h) => h.id).filter((h) => h !== focus));
  const a = focus ? [focus, ...pool.slice(0, 3)] : pool.slice(0, 4);
  const b = focus ? pool.slice(3, 7) : pool.slice(4, 8);
  try {
    const { w, actions } = fight(a, b, rng.u32());
    totalActions += actions;
    if (w === 2) draws++;
    for (const h of a) { stats[h].g++; if (w === 0) stats[h].w++; }
    for (const h of b) { stats[h].g++; if (w === 1) stats[h].w++; }
  } catch (e) {
    errors++;
    console.error('ERROR', a, b, (e as Error).stack?.split('\n').slice(0, 4).join('\n'));
  }
}
const ms = Date.now() - t0;
const rows = heroes.map((h) => ({ id: h.id, name: h.name, rarity: h.rarity, g: stats[h.id].g, wr: stats[h.id].g ? stats[h.id].w / stats[h.id].g : 0 })).sort((x, y) => y.wr - x.wr);
console.log(`\n${N} random battles (${AI} AI) in ${ms}ms — ${errors} errors, ${draws} draws, avg ${(totalActions / N).toFixed(1)} actions`);
for (const r of rows) console.log(`${'★'.repeat(r.rarity).padEnd(5)} ${r.name.padEnd(22)} ${(r.wr * 100).toFixed(1).padStart(5)}%  (${r.g})`);
const byRarity = [3, 4, 5].map((r) => { const rs = rows.filter((x) => x.rarity === r); return { r, wr: rs.reduce((s, x) => s + x.wr, 0) / rs.length }; });
console.log('By rarity:', byRarity.map((x) => `${x.r}★ ${(x.wr * 100).toFixed(1)}%`).join('  '));

// archetype matrix
const arch = process.env.FOCUS ? [] : Object.keys(ARCHETYPE_TEAMS);
const M: Record<string, Record<string, number>> = {};
const R = Number(process.env.ARCH_ROUNDS || 12);
for (const x of arch) {
  M[x] = {};
  for (const y of arch) {
    if (x === y) continue;
    let wins = 0;
    for (let k = 0; k < R; k++) {
      const flip = k % 2 === 1;
      const { w } = flip ? fight(ARCHETYPE_TEAMS[y], ARCHETYPE_TEAMS[x], 1000 + k * 31) : fight(ARCHETYPE_TEAMS[x], ARCHETYPE_TEAMS[y], 1000 + k * 31);
      if ((!flip && w === 0) || (flip && w === 1)) wins++;
    }
    M[x][y] = wins / R;
  }
}
console.log('\nArchetype matchups (row win rate vs column):');
console.log(''.padEnd(18) + arch.map((a) => a.slice(0, 9).padStart(10)).join(''));
for (const x of arch) console.log(x.padEnd(18) + arch.map((y) => (x === y ? '—' : (M[x][y] * 100).toFixed(0) + '%').padStart(10)).join(''));
const overall = arch.map((x) => ({ x, wr: Object.values(M[x]).reduce((s, v) => s + v, 0) / (arch.length - 1) }));
console.log('Overall:', overall.map((o) => `${o.x} ${(o.wr * 100).toFixed(0)}%`).join(' | '));

writeFileSync('docs/sim-results.json', JSON.stringify({ generated: new Date().toISOString(), battles: N, ai: AI, heroes: rows, archetypes: M, overall }, null, 2));
