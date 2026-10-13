import { registerHeroes, HERO_LIST } from '../engine/registry';
import { AURELIAN } from './heroes/aurelian';
import { UMBRAL } from './heroes/umbral';
import { EMBERFORGE } from './heroes/emberforge';
import { FROSTVEIL } from './heroes/frostveil';
import { WILDROOT } from './heroes/wildroot';
import { STARFALL } from './heroes/starfall';
import { CHRONOS } from './heroes/chronos';
import { MONSTERS } from './heroes/monsters';

let done = false;
export function loadData() {
  if (done) return;
  done = true;
  registerHeroes([...AURELIAN, ...UMBRAL, ...EMBERFORGE, ...FROSTVEIL, ...WILDROOT, ...STARFALL, ...CHRONOS, ...MONSTERS]);
}
loadData();

/** Summonable heroes (excludes monsters/bosses). */
export const PLAYABLE = () => HERO_LIST.filter((h) => !h.monster);
export const THRONE_NAMES: Record<string, string> = {
  aurelian: 'Aurelian Throne', umbral: 'Umbral Court', emberforge: 'Emberforge', frostveil: 'Frostveil', wildroot: 'Wildroot', starfall: 'Starfall Academy', chronos: 'Chronos Wardens',
};
export const ELEMENT_NAMES: Record<string, string> = { flame: 'Flame', frost: 'Frost', verdant: 'Verdant', radiant: 'Radiant', umbral: 'Umbral' };
export const CLASS_NAMES: Record<string, string> = { knight: 'Knight', warrior: 'Warrior', thief: 'Thief', ranger: 'Ranger', mage: 'Mage', soulweaver: 'Soul Weaver' };
export const ELEMENT_COLORS: Record<string, string> = { flame: '#ff6a3a', frost: '#5ac8ff', verdant: '#6ae36a', radiant: '#ffd84a', umbral: '#b07aff' };
