// Campaign: Prologue + 5 chapters × 10 stages. Enemy teams are generated from monster/hero pools.
import type { TeamSetup } from '../engine/types';
import { npcSetup } from '../meta/progression';

export interface Line {
  who: string; // hero id or 'narrator' or 'you'
  text: string;
}

export interface StageDef {
  id: string;
  chapter: number;
  index: number;
  name: string;
  level: number;
  boss?: boolean;
  scene: string;
  waves: { id: string; level: number; mult?: number }[][];
  rewards: { gold: number; xp: number; crystals: number; firstCrystals: number; gearChance: number; gearTier: number; mola?: number; runes?: number };
  story?: Line[];
  after?: Line[];
  unlockHero?: string; // hero gifted on first clear
  stamina: number;
}

export interface ChapterDef {
  id: number;
  name: string;
  subtitle: string;
  scene: string;
  color: string;
  intro: Line[];
}

export const PROLOGUE: Line[] = [
  { who: 'narrator', text: 'For ten thousand years, the Great Clock beneath Aethra has turned, and the Seven Thrones have kept their oaths to it.' },
  { who: 'narrator', text: 'Then, one morning, the sun did not rise. Not for a minute. Not for an hour. For one whole hour, the world was simply... skipped.' },
  { who: 'narrator', text: 'Something is eating time.' },
  { who: 'seraphine', text: 'You — you\'re awake? You were lying in the Choir\'s courtyard when the dawn finally came. You were glowing.' },
  { who: 'seraphine', text: 'That mark on your hand... that\'s the Covenant Bell. It hasn\'t chosen a bearer since the Clock was built.' },
  { who: 'aurel', text: 'Then it chose poorly or it chose well, and we will learn which very soon. Something is coming over the wall.' },
  { who: 'verity', text: 'Hollow wisps. Pieces of the lost hour, wearing the shape of light. They owe us that hour, and I intend to collect.' },
  { who: 'seraphine', text: 'Bearer — ring the Bell. Call us. We\'ll answer.' },
];

export const CHAPTERS: ChapterDef[] = [
  { id: 1, name: 'Cindermount Ascent', subtitle: 'Where the forges went cold', scene: 'volcano', color: '#ff6a3a', intro: [
    { who: 'narrator', text: 'The missing hour left scars. In Cindermount, the eternal forges went out — for the first time in recorded history.' },
    { who: 'ignara', text: 'Cold. The heart of the mountain is COLD. Do you understand what that means, Bellbearer? Something drank the fire.' },
  ] },
  { id: 2, name: 'Frostveil Requiem', subtitle: 'A queen who refused to die', scene: 'glacier', color: '#5ac8ff', intro: [
    { who: 'narrator', text: 'North, beyond the Glacier Gate, the witch-clans report a different symptom: the snow is falling upward.' },
    { who: 'isolde', text: 'The Matriarch stirs beneath the ice. She remembers the last time the Clock faltered. She is... hungry for it.' },
  ] },
  { id: 3, name: 'Elderwood Hollow', subtitle: 'The forest that forgets', scene: 'forest', color: '#6ae36a', intro: [
    { who: 'narrator', text: 'In the Elderwood, trees are forgetting their own rings. Ancient oaks wake up as saplings, terrified.' },
    { who: 'thalia', text: 'The Colossus is awake. It thinks we are the ones eating time. It will tear the forest down to protect it.' },
  ] },
  { id: 4, name: 'Nethermarch Night', subtitle: 'The usurper\'s court', scene: 'night', color: '#b07aff', intro: [
    { who: 'narrator', text: 'Nethermarch never sees the sun, so it was the last to notice. And the first to profit.' },
    { who: 'nocturne', text: 'While I slept, a pale thing sat on my throne and sold my nights to the Clock-eater. I would like it back. All of it.' },
  ] },
  { id: 5, name: 'The Great Clock', subtitle: 'Devourer of Hours', scene: 'clock', color: '#ffd84a', intro: [
    { who: 'narrator', text: 'Beneath Aethra, the Great Clock grinds. Between its teeth, something with too many mouths is chewing the hours one by one.' },
    { who: 'chronarch', text: 'Bellbearer. I have seen this moment eleven thousand times. In every one, you go in. In some, you come back.' },
  ] },
];

const POOLS: Record<number, string[]> = {
  1: ['ash_hound', 'cinder_imp', 'wisp', 'ash_hound', 'cinder_imp', 'drone'],
  2: ['frost_wraith', 'glacier_golem', 'frost_wraith', 'wisp', 'bone_archer'],
  3: ['thornling', 'bog_lurker', 'thornling', 'drone', 'wisp'],
  4: ['shade_knight', 'bone_archer', 'void_acolyte', 'shade_knight', 'bog_lurker'],
  5: ['drone', 'automaton', 'shade_knight', 'void_acolyte', 'frost_wraith', 'cinder_imp'],
};
const ELITES: Record<number, string[]> = {
  1: ['brakka', 'tobin', 'rexa', 'solenne'],
  2: ['kael', 'nix', 'elsbeth', 'borea'],
  3: ['fenra', 'myco', 'silvana', 'grom'],
  4: ['kaz', 'mordessa', 'lilith', 'orlov'],
  5: ['ticktock', 'zeph', 'osric', 'ragna'],
};
const BOSSES: Record<number, string> = { 1: 'ashmaw', 2: 'matriarch', 3: 'colossus', 4: 'regent', 5: 'chronophage' };
const NAMES: Record<number, string[]> = {
  1: ['Smoldering Road', 'Ashfall Steps', 'Hound Warrens', 'The Cold Anvil', 'Imp Chimneys', 'Slag Bridges', 'Hall of Bellows', 'The Dragon\'s Stair', 'Cinder Gate', 'Heart of the Mountain'],
  2: ['Glacier Gate', 'Upward Snow', 'Wraith Hollow', 'Frozen Choir', 'Golem Pass', 'Rimeheart Lake', 'The Silent Library', 'Aurora Ridge', 'Matriarch\'s Steps', 'Throne Beneath the Ice'],
  3: ['Forgetting Trail', 'Sapling Grove', 'Thornling Thicket', 'Bog of Echoes', 'Mycelial Deep', 'Ring-Count Hollow', 'The Hunter\'s Moon', 'Briar Weave', 'Rootgate', 'The Elder\'s Heart'],
  4: ['Moonless Road', 'Ossuary Gardens', 'Night Hospital', 'Shade Barracks', 'The Mirror Hall', 'Blood Market', 'Ashen Castle', 'Hall of Pale Kings', 'Regent\'s Gallery', 'The Usurped Throne'],
  5: ['Clockwork Descent', 'Gear Galleries', 'The Pendulum Bridge', 'Sandglass Vault', 'Hall of Lost Hours', 'Escapement', 'The Last Second', 'Stillwater Basin', 'Mainspring', 'The Devourer'],
};
const SCENES: Record<number, string> = { 1: 'volcano', 2: 'glacier', 3: 'forest', 4: 'night', 5: 'clock' };

const STORY: Record<string, { pre?: Line[]; post?: Line[]; gift?: string }> = {
  '1-1': { pre: [{ who: 'ignara', text: 'Hounds made of cold ash. I\'ve never been so insulted in my life.' }, { who: 'seraphine', text: 'Stay together. Speed matters — whoever reaches the end of the Combat Readiness bar first, acts first.' }] },
  '1-3': { pre: [{ who: 'narrator', text: 'Tip: Soul Burn spends Souls to empower a skill. Watch the soul gauge — your opponent can see it too.' }], gift: 'tobin' },
  '1-5': { pre: [{ who: 'brakka', text: 'Oi! You lot here to fix my forge or stand around looking holy?' }], post: [{ who: 'brakka', text: 'Fine. You can hit things. I\'m coming with you.' }], gift: 'brakka' },
  '1-8': { pre: [{ who: 'solenne', text: 'The dragon\'s stair. Ashmaw sleeps at the top — or should. Something woke it and fed it our fire.' }] },
  '1-10': { pre: [{ who: 'narrator', text: 'Ashmaw, the Cinder Wyrm. Bosses are Colossal: immune to Stun, Sleep, Provoke and Imprison.' }, { who: 'ignara', text: 'Give me back my fire, you overgrown lizard.' }], post: [{ who: 'ignara', text: 'The fire\'s back. But look — teeth marks. On the FLAME. Something bigger chewed on this.' }], gift: 'ignara' },
  '2-1': { pre: [{ who: 'kael', text: 'Outsiders. The Gate does not open for outsiders. ...But the Gate is broken, so.' }] },
  '2-4': { pre: [{ who: 'yrsa', text: 'The Choir of Frostveil sang for nine hundred years. It stopped last Tuesday.' }], gift: 'yrsa' },
  '2-7': { pre: [{ who: 'elsbeth', text: 'I found the record! The last time the Clock skipped, the Matriarch was the one who wound it back. She wants the job again.' }] },
  '2-10': { pre: [{ who: 'isolde', text: 'Mother.' }, { who: 'narrator', text: 'The Frozen Matriarch rises.' }], post: [{ who: 'isolde', text: 'She says the Clock is being eaten from the inside. She says we\'re too late. She has always been dramatic.' }], gift: 'isolde' },
  '3-1': { pre: [{ who: 'pip', text: 'You\'re the Bellbearer? You\'re shorter than the letters said.' }] },
  '3-5': { pre: [{ who: 'myco', text: 'WE remember. The trees do not. WE will remember for them.' }], gift: 'myco' },
  '3-7': { pre: [{ who: 'fenra', text: 'The hunter\'s moon is wrong. It rose twice tonight. I hunted both.' }] },
  '3-10': { pre: [{ who: 'thalia', text: 'Colossus, old friend. It\'s me. ...It doesn\'t remember me.' }], post: [{ who: 'thalia', text: 'It remembers now. The roots say the hours are flowing DOWN. Toward the Clock.' }], gift: 'thalia' },
  '4-1': { pre: [{ who: 'kaz', text: 'Don\'t use the front door. Nobody in Nethermarch uses the front door.' }] },
  '4-3': { pre: [{ who: 'lilith', text: 'Welcome to the night hospital. Please don\'t bleed on the floors; we sell that.' }], gift: 'lilith' },
  '4-5': { pre: [{ who: 'sable', text: 'Mirrors everywhere. I love it here. Let me show you a trick.' }] },
  '4-10': { pre: [{ who: 'nocturne', text: 'Get off my throne.' }, { who: 'narrator', text: 'The Pale Regent will cast Bloodmoon. Under Bloodmoon, healing your units turns into damage.' }], post: [{ who: 'nocturne', text: 'He sold our nights by the hour. To something below. The ledger says: "Chronophage."' }, { who: 'verity', text: 'And now we know what owes us.' }], gift: 'nocturne' },
  '5-1': { pre: [{ who: 'mira', text: 'Mind the gears. Some of them are hungry now.' }] },
  '5-4': { pre: [{ who: 'zeph', text: 'All the sand that ever fell. I kept it for this. Let\'s see what happens when it falls back up.' }], gift: 'zeph' },
  '5-7': { pre: [{ who: 'ilyana', text: 'There is a room between moments. I live there. It\'s getting crowded.' }] },
  '5-9': { pre: [{ who: 'ticktock', text: '"It\'s right behind this door." "It\'s ALWAYS right behind this door." "Well this time it is."' }] },
  '5-10': { pre: [{ who: 'chronarch', text: 'This is the moment. Ring the Bell, and do not let it eat the next one.' }, { who: 'narrator', text: 'The Chronophage enrages after 20 of its turns. End it quickly.' }], post: [{ who: 'narrator', text: 'The Chronophage unravels into a cloud of stolen hours, and every one of them rushes home.' }, { who: 'seraphine', text: 'Listen. The bells in Solmere — they\'re ringing on time.' }, { who: 'chronarch', text: 'For now. Something taught it to eat. Something will try again. The Seven Thrones will need their Bellbearer in the Arena of Ages.' }], gift: 'chronarch' },
};

export const STAGES: StageDef[] = [];
for (let ch = 1; ch <= 5; ch++) {
  for (let i = 1; i <= 10; i++) {
    const level = Math.round(2 + (ch - 1) * 12 + (i - 1) * 1.3);
    const boss = i === 10;
    const pool = POOLS[ch];
    const waves: StageDef['waves'] = [];
    const nWaves = boss ? 2 : i >= 6 ? 3 : 2;
    for (let w = 0; w < nWaves; w++) {
      const isLast = w === nWaves - 1;
      const wave: { id: string; level: number; mult?: number }[] = [];
      if (boss && isLast) {
        wave.push({ id: BOSSES[ch], level: level + 2, mult: 0.7 + ch * 0.06 });
        wave.push({ id: ELITES[ch][0], level, mult: 0.85 });
        wave.push({ id: pool[1], level, mult: 0.9 });
      } else {
        const size = Math.min(4, 2 + Math.floor((i + w) / 3));
        for (let k = 0; k < size; k++) wave.push({ id: pool[(i * 3 + w * 2 + k) % pool.length], level: level - 1 + (k % 2), mult: 0.75 + 0.02 * i });
        if (isLast && i >= 4) wave[0] = { id: ELITES[ch][(i + w) % ELITES[ch].length], level: level + 1, mult: 0.75 + 0.02 * i };
      }
      waves.push(wave);
    }
    const key = `${ch}-${i}`;
    const s = STORY[key] || {};
    STAGES.push({
      id: key, chapter: ch, index: i, name: NAMES[ch][i - 1], level, boss, scene: SCENES[ch], waves,
      rewards: { gold: 600 + level * 120, xp: 60 + level * 26, crystals: boss ? 50 : 10, firstCrystals: boss ? 300 : 60, gearChance: boss ? 1 : 0.45, gearTier: Math.min(85, 20 + level + 15), mola: boss ? 3 : i % 3 === 0 ? 1 : 0, runes: boss ? 10 : 2 },
      story: s.pre, after: s.post, unlockHero: s.gift, stamina: 6 + ch,
    });
  }
}

export const STAGE_BY_ID: Record<string, StageDef> = Object.fromEntries(STAGES.map((s) => [s.id, s]));

export function stageTeams(stage: StageDef): { first: TeamSetup; waves: TeamSetup[] } {
  const mk = (w: StageDef['waves'][number], n: number): TeamSetup => ({ name: `${stage.name} ${n + 1}`, units: w.map((m) => npcSetup(m.id, m.level, { statMult: m.mult ?? 1 })) });
  const [first, ...rest] = stage.waves;
  return { first: mk(first, 0), waves: rest.map((w, i) => mk(w, i + 1)) };
}

/** Prologue tutorial battle: preset heroes vs wisps. */
export const TUTORIAL = {
  heroes: ['seraphine', 'aurel', 'verity', 'ignara'],
  enemies: [{ id: 'wisp', level: 8 }, { id: 'wisp', level: 8 }, { id: 'shade_knight', level: 10 }],
};
