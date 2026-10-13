// The designed meta: archetypes, their cores and their intended counters.

export interface ArchetypeInfo {
  id: string;
  name: string;
  color: string;
  core: string[];
  flex: string[];
  plan: string;
  beats: string[];
  losesTo: string[];
}

export const ARCHETYPES: Record<string, ArchetypeInfo> = {
  'Cleave': {
    id: 'Cleave', name: 'Cleave', color: '#ff6a3a',
    core: ['ignara', 'ticktock', 'orion', 'mira'],
    flex: ['kaz', 'borea', 'altair', 'yrsa', 'nix', 'drakon', 'selene', 'wren'],
    plan: 'Out-speed, break Defense with an AoE opener and delete the enemy before their first turn. Mira and Yrsa push the team; Ignara and Tick & Tock chain extra turns on kills.',
    beats: ['DoT Rot', 'Soul Engine'],
    losesTo: ['Bruiser Counter', 'Revive Sustain'],
  },
  'Revive Sustain': {
    id: 'Revive Sustain', name: 'Revive Sustain', color: '#ffe27a',
    core: ['seraphine', 'aurel', 'verity', 'thalia'],
    flex: ['lilith', 'yrsa', 'chronarch', 'ceres', 'mirelle', 'odda'],
    plan: 'Survive the burst: Lumen revives, Deep Roots and Bloom keep everyone up while Aurel\'s Sanctum shuts down the enemy\'s debuffs. Wins long games.',
    beats: ['Cleave', 'Bruiser Counter'],
    losesTo: ['DoT Rot', 'Dominion Control'],
  },
  'DoT Rot': {
    id: 'DoT Rot', name: 'DoT Rot', color: '#9aff5a',
    core: ['nocturne', 'mordessa', 'myco', 'solenne'],
    flex: ['brakka', 'rexa', 'zeph', 'grimmald', 'hesk', 'fenra', 'lilith'],
    plan: 'Unhealable + Bloodmoon turns healing into damage; Burns, Bleeds, Poisons and Dooms ignore Defense; Crown of Ash inflicts Extinction so revivers have nothing to revive.',
    beats: ['Revive Sustain', 'Bruiser Counter'],
    losesTo: ['Cleave', 'Dominion Control'],
  },
  'Bruiser Counter': {
    id: 'Bruiser Counter', name: 'Bruiser Counter', color: '#c58b4a',
    core: ['vulkar', 'brannoc', 'orlov', 'ragna'],
    flex: ['caelum', 'theodric', 'grom', 'osric', 'drakon', 'frida', 'sentinel'],
    plan: 'Tanky frontline with counterattacks and Combat Readiness gain on hit. Cleave teams kill themselves on Vulkar\'s counters; Ragna grows stronger the longer the fight lasts.',
    beats: ['Cleave', 'Soul Engine'],
    losesTo: ['DoT Rot', 'Revive Sustain'],
  },
  'Dominion Control': {
    id: 'Dominion Control', name: 'Dominion Control', color: '#7aa8ff',
    core: ['isolde', 'chronarch', 'penumbra', 'osric'],
    flex: ['verity', 'kael', 'nix', 'vega', 'lenny', 'theodric', 'ilyana'],
    plan: 'Control the clock and the field: Frozen Hour slows, Stillwater locks a massive tempo swing in place, Eclipse inverts light and dark, and Penumbra feeds on every shattered Dominion.',
    beats: ['Revive Sustain', 'DoT Rot'],
    losesTo: ['Soul Engine', 'Bruiser Counter'],
  },
  'Soul Engine': {
    id: 'Soul Engine', name: 'Soul Engine', color: '#c7a6ff',
    core: ['ceres', 'lyra', 'sable', 'altair'],
    flex: ['thalia', 'chronarch', 'mira', 'selene', 'orion'],
    plan: 'Overcharge the soul cap to 30, spam soulburns and Echoes. Sable copies every enemy ultimate as an Echo; Selene doubles the team\'s best skill.',
    beats: ['Dominion Control', 'Revive Sustain'],
    losesTo: ['Cleave', 'Bruiser Counter'],
  },
};

export const ARCHETYPE_TEAMS: Record<string, string[]> = Object.fromEntries(Object.values(ARCHETYPES).map((a) => [a.id, a.core]));
