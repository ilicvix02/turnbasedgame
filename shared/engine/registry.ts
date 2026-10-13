import type { HeroDef } from './types';

export const HEROES: Record<string, HeroDef> = {};
export const HERO_LIST: HeroDef[] = [];

export function registerHeroes(defs: HeroDef[]) {
  for (const d of defs) {
    if (HEROES[d.id]) throw new Error(`Duplicate hero id ${d.id}`);
    HEROES[d.id] = d;
    HERO_LIST.push(d);
  }
}

export function getHero(id: string): HeroDef {
  const h = HEROES[id];
  if (!h) throw new Error(`Unknown hero ${id}`);
  return h;
}
