// Player profile model shared by server (authoritative) and client (display).
import type { GearPiece } from '../engine/types';
import type { HeroInstance } from './progression';

export interface ArtifactItem {
  uid: string;
  id: string;
  level: number;
  equippedBy?: string | null;
}

export interface Profile {
  v: 1;
  name: string;
  created: number;
  gold: number;
  crystals: number;
  mola: number;
  runes: number;
  stamina: number;
  staminaAt: number;
  heroes: (HeroInstance & { artifactUid?: string | null })[];
  gear: GearPiece[];
  artifacts: ArtifactItem[];
  campaign: { cleared: Record<string, number>; tutorialDone: boolean };
  summon: { pity: number; total: number };
  arena: { flags: number; flagsAt: number; defense: string[] };
  daily: { last: string };
  seq: number;
  lastTeam?: string[];
  rtaFavorites?: string[];
}

export const STAMINA_MAX = 120;
export const STAMINA_REGEN_MS = 4 * 60 * 1000; // 1 stamina / 4 min
export const FLAGS_MAX = 5;
export const FLAG_REGEN_MS = 30 * 60 * 1000;

export const SUMMON_RATES = { 5: 0.03, 4: 0.15, 3: 0.82 };
export const SUMMON_COST = 100;
export const PITY = 60;

export function arenaRank(points: number) {
  if (points >= 2000) return { name: 'Champion', color: '#ff5a5a', icon: 'crowned-skull' };
  if (points >= 1700) return { name: 'Challenger', color: '#ffb24a', icon: 'laurel-crown' };
  if (points >= 1450) return { name: 'Master', color: '#b07aff', icon: 'crown' };
  if (points >= 1250) return { name: 'Gold', color: '#ffd84a', icon: 'medal' };
  if (points >= 1100) return { name: 'Silver', color: '#c8d8e8', icon: 'medal' };
  return { name: 'Bronze', color: '#c88a5a', icon: 'medal' };
}

export function rtaTier(mmr: number) {
  const tiers = [
    { min: 2400, name: 'Legend', color: '#ff4a6a' },
    { min: 2100, name: 'Emperor', color: '#ff8a3a' },
    { min: 1850, name: 'Champion', color: '#ffd84a' },
    { min: 1650, name: 'Challenger', color: '#b07aff' },
    { min: 1450, name: 'Master', color: '#7aa8ff' },
    { min: 1300, name: 'Gold', color: '#e8c86a' },
    { min: 1150, name: 'Silver', color: '#c8d8e8' },
    { min: 0, name: 'Bronze', color: '#c88a5a' },
  ];
  return tiers.find((t) => mmr >= t.min)!;
}
