// Utility AI: one-ply lookahead on cloned battles with decorrelated RNG (so it cannot "see" future rolls).
import { Battle, Unit } from './battle';
import { Rng } from './rng';
import { STATUSES } from './statuses';
import type { Input, SkillSlot } from './types';

export type AiLevel = 'easy' | 'normal' | 'hard';

function evaluate(b: Battle, team: number): number {
  if (b.winner === team) return 1e6;
  if (b.winner >= 0 && b.winner !== team) return -1e6;
  let s = 0;
  for (const u of b.units) {
    const sign = u.team === team ? 1 : -1;
    if (!u.alive) {
      s += sign * -40;
      continue;
    }
    const pct = b.hpPct(u);
    let v = 100 + 140 * pct;
    for (const st of u.statuses) {
      const d = STATUSES[st.id];
      if (!d) continue;
      const w = d.skipTurn ? 22 : d.id === 'def_down' || d.id === 'unhealable' ? 9 : d.id === 'barrier' ? Math.min(25, (st.value / b.maxHp(u)) * 60) : 5;
      if (d.kind === 'buff') v += w;
      else if (d.kind === 'debuff') v -= w;
    }
    v += u.cr * 0.25;
    s += sign * v;
  }
  s += (b.souls[team] - b.souls[1 - team]) * 0.6;
  if (b.field) s += b.field.team === team ? 15 : -15;
  return s;
}

export function candidateInputs(b: Battle, u: Unit): Input[] {
  const out: Input[] = [];
  for (const o of b.options(u)) {
    if (!o.ok) continue;
    const sk = o.skill;
    let targets: number[] = [-1];
    if (sk.target === 'enemy' || sk.target === 'ally' || sk.target === 'deadAlly') {
      const v = b.validTargets(u, o.slot);
      if (!v.length) {
        if (sk.target === 'deadAlly') continue;
        targets = [-1];
      } else targets = v.map((t) => t.uid);
    }
    const sbs = sk.soulburn && b.souls[u.team] >= sk.soulburn.cost && !u.has('fear') ? [false, true] : [false];
    for (const t of targets) for (const sb of sbs) out.push({ actor: u.uid, skill: o.slot as SkillSlot, target: t, sb });
  }
  return out;
}

export function chooseAction(b: Battle, level: AiLevel = 'normal'): Input {
  if (b.pending === null) throw new Error('no pending actor');
  const u = b.unit(b.pending);
  const cands = candidateInputs(b, u);
  if (!cands.length) return { actor: u.uid, skill: 's1', target: -1, sb: false };
  if (cands.length === 1) return cands[0];
  const samples = level === 'hard' ? 3 : cands.length <= 10 ? 2 : 1;
  const scored: { inp: Input; score: number }[] = [];
  const seedBase = (b.rng.s[0] ^ (b.turnNo * 2654435761)) >>> 0;
  for (let i = 0; i < cands.length; i++) {
    const inp = cands[i];
    let total = 0;
    for (let k = 0; k < samples; k++) {
      const c = b.clone();
      c.rng = new Rng((seedBase + k * 7919 + 1) >>> 0);
      try {
        c.act(inp);
        total += evaluate(c, u.team);
      } catch {
        total += -1e7;
      }
    }
    let score = total / samples;
    const sk = b.skillOf(u, inp.skill)!;
    score += sk.aiWeight ?? 0;
    // small preference for using cooldown skills rather than hoarding
    if (inp.skill !== 's1') score += 2;
    scored.push({ inp, score });
  }
  scored.sort((a, b2) => b2.score - a.score);
  if (level === 'easy') {
    const r = new Rng(seedBase ^ 0xabcdef);
    if (r.chance(0.45)) return r.pick(scored.slice(0, Math.min(4, scored.length))).inp;
  }
  return scored[0].inp;
}

/** Fast heuristic AI for bulk simulation. */
export function quickAction(b: Battle): Input {
  const u = b.unit(b.pending!);
  const opts = b.options(u).filter((o) => o.ok);
  const order = ['s3', 's2', 's1'];
  opts.sort((a, c) => order.indexOf(a.slot) - order.indexOf(c.slot));
  for (const o of opts) {
    const sk = o.skill;
    if (sk.target === 'enemy') {
      const ts = b.validTargets(u, o.slot);
      if (!ts.length) continue;
      const t = ts.slice().sort((a, c) => b.hpPct(a) - b.hpPct(c))[0];
      const sb = !!sk.soulburn && b.souls[u.team] >= sk.soulburn.cost;
      return { actor: u.uid, skill: o.slot, target: t.uid, sb };
    }
    if (sk.target === 'ally') {
      const ts = b.validTargets(u, o.slot);
      const t = ts.slice().sort((a, c) => b.hpPct(a) - b.hpPct(c))[0];
      return { actor: u.uid, skill: o.slot, target: t ? t.uid : -1, sb: false };
    }
    if (sk.target === 'deadAlly') {
      const ts = b.validTargets(u, o.slot);
      if (!ts.length) continue;
      return { actor: u.uid, skill: o.slot, target: ts[0].uid, sb: false };
    }
    return { actor: u.uid, skill: o.slot, target: -1, sb: !!sk.soulburn && b.souls[u.team] >= sk.soulburn.cost };
  }
  return { actor: u.uid, skill: 's1', target: b.validTargets(u, 's1')[0]?.uid ?? -1, sb: false };
}

/** Run a battle to completion with AI on the given sides. */
export function autoRun(b: Battle, level: AiLevel | 'quick' = 'normal', inputsForTeam0?: Input[]) {
  b.start();
  let i = 0;
  let guard = 0;
  while (b.winner < 0) {
    if (++guard > 2000) break;
    const u = b.unit(b.pending!);
    let inp: Input;
    if (u.team === 0 && inputsForTeam0) {
      inp = inputsForTeam0[i++];
      if (!inp) throw new Error('ran out of inputs');
    } else inp = level === 'quick' ? quickAction(b) : chooseAction(b, level);
    b.act(inp);
  }
  return b.winner;
}
