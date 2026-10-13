// World Arena (RTA) draft rules — Epic Seven Champion+ format.
// Pre-ban 2 each (secret, simultaneous) → coin flip → picks 1-2-2-2-2-1 → each side's 3rd pick protected → post-ban 1 each → 4v4.

export type Side = 0 | 1;
export type DraftPhase = 'preban' | 'pick' | 'postban' | 'done';

export interface DraftState {
  phase: DraftPhase;
  first: Side; // side with first pick
  prebans: [string[], string[]];
  picks: [string[], string[]];
  postbans: [string | null, string | null];
  step: number; // index in PICK_ORDER during 'pick'
  deadline: number; // epoch ms
}

/** [side relative to first pick (0 = first picker), number of heroes] */
export const PICK_ORDER: [0 | 1, number][] = [[0, 1], [1, 2], [0, 2], [1, 2], [0, 2], [1, 1]];
export const PREBAN_COUNT = 2;
export const PROTECTED_PICK = 2; // zero-based index → 3rd pick
export const TIMERS = { preban: 30_000, pick: 30_000, postban: 20_000, turn: 30_000 };

export function newDraft(first: Side, now: number): DraftState {
  return { phase: 'preban', first, prebans: [[], []], picks: [[], []], postbans: [null, null], step: 0, deadline: now + TIMERS.preban };
}

export function currentPicker(d: DraftState): { side: Side; count: number } | null {
  if (d.phase !== 'pick') return null;
  const [rel, count] = PICK_ORDER[d.step];
  const side = (rel === 0 ? d.first : 1 - d.first) as Side;
  return { side, count };
}

export function bannedHeroes(d: DraftState): Set<string> {
  return new Set([...d.prebans[0], ...d.prebans[1]]);
}

export function isAvailable(d: DraftState, heroId: string): boolean {
  if (bannedHeroes(d).has(heroId)) return false;
  if (d.picks[0].includes(heroId) || d.picks[1].includes(heroId)) return false;
  return true;
}

export function finalTeams(d: DraftState): [string[], string[]] {
  return [
    d.picks[0].filter((h) => h !== d.postbans[1]),
    d.picks[1].filter((h) => h !== d.postbans[0]),
  ];
}

export function protectedOf(d: DraftState, side: Side): string | undefined {
  return d.picks[side][PROTECTED_PICK];
}
