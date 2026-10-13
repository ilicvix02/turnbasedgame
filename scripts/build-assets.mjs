// Builds client/public/assets from downloaded free asset packs and npm icon sets.
//   node scripts/build-assets.mjs <dir-with-extracted-packs> <dir-with-music>
// Packs (CC0): Kenney particle-pack, rpg-audio, impact-sounds, interface-sounds, sci-fi-sounds, music-jingles
// Music (CC0): OpenGameArt — cynicmusic "Battle Theme A/B", "Town Theme RPG", "Mysterious Ambience"; CodeManu "Magic Space";
//              CleytonKauffman "Boss Battle Theme".
// Icons (CC BY 3.0): game-icons.net via @iconify-json/game-icons — see CREDITS.md
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const [packs, musicDir] = process.argv.slice(2);
const OUT = 'client/public/assets';
for (const d of ['sfx', 'fx', 'music']) mkdirSync(join(OUT, d), { recursive: true });

function ff(args) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
}

if (packs) {
  // ── particles: downscale to 256px transparent PNGs ──
  const P = join(packs, 'particle-pack', 'PNG (Transparent)');
  const particles = ['circle_05', 'flare_01', 'light_01', 'light_02', 'light_03', 'magic_01', 'magic_02', 'magic_03', 'magic_04', 'magic_05', 'fire_01', 'fire_02', 'flame_01', 'flame_03', 'flame_05', 'smoke_01', 'smoke_04', 'smoke_07', 'spark_01', 'spark_04', 'spark_06', 'star_01', 'star_04', 'star_06', 'star_08', 'slash_01', 'slash_02', 'slash_03', 'slash_04', 'scorch_01', 'twirl_01', 'twirl_02', 'trace_01', 'trace_03', 'symbol_01', 'symbol_02', 'dirt_01', 'muzzle_01', 'scratch_01', 'window_01'];
  for (const p of particles) execFileSync('convert', [join(P, `${p}.png`), '-resize', '256x256', '-strip', join(OUT, 'fx', `${p}.png`)]);

  // ── sound effects ──
  const S = {
    ui_click: ['interface-sounds', 'click_002'], ui_select: ['interface-sounds', 'select_002'], ui_confirm: ['interface-sounds', 'confirmation_001'],
    ui_back: ['interface-sounds', 'back_002'], ui_error: ['interface-sounds', 'error_004'], ui_open: ['interface-sounds', 'open_002'], ui_close: ['interface-sounds', 'close_002'],
    ui_toggle: ['interface-sounds', 'toggle_002'], ui_tick: ['interface-sounds', 'tick_002'], ui_bong: ['interface-sounds', 'bong_001'], ui_glass: ['interface-sounds', 'glass_002'],
    ui_pluck: ['interface-sounds', 'pluck_002'], ui_scroll: ['interface-sounds', 'scroll_002'], ui_maximize: ['interface-sounds', 'maximize_006'],
    slash1: ['rpg-audio', 'knifeSlice'], slash2: ['rpg-audio', 'knifeSlice2'], draw: ['rpg-audio', 'drawKnife2'], chop: ['rpg-audio', 'chop'],
    coins: ['rpg-audio', 'handleCoins'], book: ['rpg-audio', 'bookFlip2'], cloth: ['rpg-audio', 'cloth2'], latch: ['rpg-audio', 'metalLatch'], step: ['rpg-audio', 'footstep04'],
    punch: ['impact-sounds', 'impactPunch_heavy_000'], punch2: ['impact-sounds', 'impactPunch_medium_001'], metal: ['impact-sounds', 'impactMetal_heavy_001'], plate: ['impact-sounds', 'impactPlate_heavy_000'],
    bell: ['impact-sounds', 'impactBell_heavy_000'], glass: ['impact-sounds', 'impactGlass_heavy_001'], soft: ['impact-sounds', 'impactSoft_heavy_001'], wood: ['impact-sounds', 'impactWood_heavy_001'], mining: ['impact-sounds', 'impactMining_002'],
    shield: ['sci-fi-sounds', 'forceField_000'], beam: ['sci-fi-sounds', 'laserLarge_001'], boom: ['sci-fi-sounds', 'lowFrequency_explosion_000'], crunch: ['sci-fi-sounds', 'explosionCrunch_000'],
    slime: ['sci-fi-sounds', 'slime_000'], fire: ['sci-fi-sounds', 'thrusterFire_002'], bolt: ['sci-fi-sounds', 'laserSmall_002'], retro: ['sci-fi-sounds', 'laserRetro_002'], whoosh: ['sci-fi-sounds', 'spaceEngineSmall_001'],
    j_victory: ['music-jingles/Audio/Steel jingles', 'jingles_STEEL00'], j_defeat: ['music-jingles/Audio/Steel jingles', 'jingles_STEEL06'], j_level: ['music-jingles/Audio/Hit jingles', 'jingles_HIT00'],
    j_summon: ['music-jingles/Audio/Pizzicato jingles', 'jingles_PIZZI10'], j_rare: ['music-jingles/Audio/Steel jingles', 'jingles_STEEL16'], j_match: ['music-jingles/Audio/Hit jingles', 'jingles_HIT05'],
  };
  for (const [name, [pack, file]] of Object.entries(S)) {
    const src = pack.includes('/') ? join(packs, pack, `${file}.ogg`) : join(packs, pack, 'Audio', `${file}.ogg`);
    if (!existsSync(src)) { console.warn('missing', src); continue; }
    ff(['-i', src, '-ac', '1', '-b:a', '64k', join(OUT, 'sfx', `${name}.mp3`)]);
  }
}

if (musicDir) {
  const M = { title: 'magicspace', lobby: 'town', map: 'song21', battle: 'battleA', arena: 'battleB', boss: 'boss' };
  for (const [name, src] of Object.entries(M)) ff(['-i', join(musicDir, `${src}.mp3`), '-ac', '2', '-b:a', '96k', join(OUT, 'music', `${name}.mp3`)]);
}

// ── icons: subset of game-icons used by the client ──
const require = createRequire(import.meta.url);
const set = require('@iconify-json/game-icons/icons.json');
const wanted = new Set(JSON.parse(readFileSync('scripts/icon-list.json', 'utf8')));
// pull every icon name referenced in shared data (statuses, sets, artifacts, fields)
for (const f of ['shared/engine/statuses.ts', 'shared/engine/sets.ts', 'shared/engine/artifacts.ts', 'shared/engine/fields.ts', 'shared/meta/profile.ts', ...['aurelian', 'umbral', 'emberforge', 'frostveil', 'wildroot', 'starfall', 'chronos', 'monsters'].map((x) => `shared/data/heroes/${x}.ts`)]) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/icon: '([a-z0-9-]+)'/g)) wanted.add(m[1]);
}
const out = {};
for (const name of wanted) {
  const ic = set.icons[name] || (set.aliases?.[name] && set.icons[set.aliases[name].parent]);
  if (!ic) { console.warn('icon missing', name); continue; }
  out[name] = ic.body;
}
mkdirSync('client/src/gen', { recursive: true });
writeFileSync('client/src/gen/icons.json', JSON.stringify(out));
console.log('icons:', Object.keys(out).length);
