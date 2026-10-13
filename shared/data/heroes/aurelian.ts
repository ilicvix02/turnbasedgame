// AURELIAN THRONE — the sun-sworn holy order of Solmere.
import type { HeroDef } from '../../engine/types';
import { registerStatus } from '../../engine/statuses';
import { E, imprint, stats } from '../kit';

registerStatus({ id: 'lumen', name: 'Lumen', kind: 'state', icon: 'sun-radiations', sticky: true, desc: 'Lumen stacks. Consumed to revive fallen allies. While holding Lumen, debuffs are purged instantly.' });
registerStatus({ id: 'ascendant', name: 'Ascendant', kind: 'state', icon: 'sun', desc: 'Transformed into the Sun Throne. Skills gain additional Health-scaling damage.' });
registerStatus({ id: 'penance', name: 'Penance', kind: 'state', icon: 'prayer', sticky: true, desc: 'Penance stacks: Attack +6% each (max 5).' });
registerStatus({ id: 'ironstand', name: 'Ironstand', kind: 'buff', icon: 'anvil', group: 'def+', mods: { def: 0.25 }, desc: 'Defense +25%. Granted to the Vanguard.' });

export const AURELIAN: HeroDef[] = [
  {
    id: 'seraphine', name: 'Seraphine', title: 'the Lumen Choir', rarity: 5, element: 'radiant', cls: 'soulweaver', throne: 'aurelian', role: 'healer',
    archetypes: ['Revive Sustain'],
    tagline: 'Revives the fallen with Lumen; the pillar of every sustain team.',
    base: stats('soulweaver', 5, { hp: 1.12, spd: 109, def: 1.05 }),
    imprint: imprint('release', 'hp'),
    skills: [
      {
        slot: 's1', name: 'Lumen Strike', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'holy',
        desc: 'Attacks with damage proportional to max Health, then heals all allies by 5% of the caster\'s max Health.',
        soulburn: { cost: 10, desc: 'Also removes 2 debuffs from the ally with the most debuffs and increases their Combat Readiness by 20%.' },
        enhance: E.heal,
        run: (c) => {
          c.hit(c.t, { atk: 0.35, hp: 0.07 });
          c.healAll(c.maxHp() * 0.05);
          if (c.sb) {
            const a = c.allies().slice().sort((x, y) => y.debuffs().length - x.debuffs().length)[0];
            if (a) { c.cleanse(a, 2); c.cr(a, 20); }
          }
        },
      },
      {
        slot: 's2', name: 'Vigil of Lumen', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff',
        desc: 'Begins battle with 1 Lumen (2 if Aurel is an ally). When another ally dies, consumes 1 Lumen to revive them at 30% Health with +15% Combat Readiness. While holding Lumen, the first debuff inflicted on the caster each turn is purged and max Health is increased by 5% per Lumen.',
      },
      {
        slot: 's3', name: 'Dawnchorus', cd: 7, souls: 2, target: 'allAllies', anim: 'heal', vfx: 'holy_big',
        desc: 'Removes all debuffs from all allies, heals them by 22% of the caster\'s max Health and grants Increased Speed for 2 turns. If the caster has no Lumen, restores 1 Lumen (once per battle).',
        enhance: [{ heal: 0.1 }, { cd: 1 }, { heal: 0.1 }],
        run: (c) => {
          for (const a of c.allies()) { c.cleanse(a, 99); c.heal(a, c.maxHp() * 0.22); c.buff(a, 'spd_up', 2); }
          if (c.get('lumen') === 0 && !c.get('chorusUsed')) { c.set('chorusUsed', 1); c.set('lumen', 1); c.showStacks('lumen', 1); c.text('Lumen restored', '#fff3a0'); }
        },
      },
    ],
    hooks: {
      onBattleStart: (h) => { const n = h.hasAlly('aurel') ? 2 : 1; h.set('lumen', n); h.showStacks('lumen', n); },
      stats: (u) => ({ hp: 0.05 * (u.data.lumen || 0) }),
      onDebuffed: (h, id) => {
        if (h.get('lumen') > 0 && id !== 'extinction' && h.once('lumenward')) { const s = h.self.statuses.find((x) => x.id === id); if (s) { h.b.removeInst(h.self, s, 'cleanse'); h.text('Lumen ward', '#fff3a0'); } }
      },
      onAllyDeath: (h, ally) => {
        if (h.get('lumen') <= 0 || ally.has('extinction')) return;
        if (h.b.revive(ally, 0.3, h.self)) {
          const n = h.add('lumen', -1);
          h.showStacks('lumen', n);
          h.text('Afterlight', '#fff3a0', ally);
          h.cr(ally, 15);
        }
      },
    },
    lore: 'The youngest Choir-Mother in Solmere\'s history, Seraphine carries three motes of the first dawn in her voice. Every note she sings is a promise that no one dies on her watch — a promise she has kept, at terrible cost to herself.',
    quote: 'Not yet. Not while I can still sing.',
    look: { body: 'slim', feminine: true, skin: '#f6dcc8', hair: { style: 'flowing', color: '#fff2c4' }, outfit: { primary: '#fffaf0', secondary: '#f2c14e', accent: '#7ec8ff', style: 'robe' }, weapon: 'harp', head: 'halo', back: 'angel', eyes: '#7ec8ff', aura: '#ffe9a0' },
    bonds: ['aurel'],
  },
  {
    id: 'aurel', name: 'Aurel', title: 'the Sun Throne', rarity: 5, element: 'radiant', cls: 'knight', throne: 'aurelian', role: 'bruiser',
    archetypes: ['Dominion Control', 'Revive Sustain'],
    tagline: 'Health-scaling titan who ascends and seals all buffs and debuffs in a Sanctum.',
    base: stats('knight', 5, { hp: 1.1, atk: 1.02, spd: 96 }),
    imprint: imprint('concentration', 'hp'),
    skills: [
      {
        slot: 's1', name: 'Solar Edict', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'holy_slash',
        desc: 'Attacks with damage proportional to max Health with a 75% chance to Decrease Defense for 1 turn. While Ascendant, deals additional damage equal to 7% of max Health.',
        enhance: E.dmg,
        run: (c) => {
          const asc = c.self.form === 'ascendant';
          c.hit(c.t, { atk: 0.5, hp: asc ? 0.17 : 0.1 });
          c.debuff(c.t, 'def_down', 1, 0.75);
        },
      },
      {
        slot: 's2', name: 'Gilded Charge', cd: 2, souls: 1, target: 'allEnemies', anim: 'dash', vfx: 'holy_wave',
        desc: 'Attacks all enemies with damage proportional to max Health. While Ascendant, also grants the caster a Barrier equal to 15% of max Health for 2 turns.',
        enhance: E.cd,
        run: (c) => {
          const asc = c.self.form === 'ascendant';
          c.hitAll({ atk: 0.35, hp: asc ? 0.11 : 0.07 });
          if (asc) c.barrier(c.self, c.maxHp() * 0.15, 2);
        },
      },
      {
        slot: 's3', name: 'Throne of the Sun', cd: 7, souls: 3, target: 'self', anim: 'ult', vfx: 'sun_throne', startOnCd: true,
        desc: 'Ascends for 3 turns and fully recovers Health. Creates the Dominion "Sanctum of Judgment" for 2 turns: no buffs or debuffs can be applied to anyone. Starts battle on cooldown.',
        enhance: E.cdOnly,
        run: (c) => {
          c.form('ascendant');
          c.state(c.self, 'ascendant', 3);
          c.heal(c.self, c.maxHp());
          c.field('sanctum', 2);
        },
      },
    ],
    hooks: {
      onTurnStart: (h) => { if (h.self.form === 'ascendant' && !h.self.has('ascendant')) h.form('base'); },
    },
    lore: 'Once a shepherd, Aurel was struck by a falling sunbeam and stood up wearing it like armor. The Aurelian Throne crowned him because no one could find a crown heavy enough to keep him down.',
    quote: 'Kneel, or be lit.',
    look: { body: 'giant', skin: '#d9a77a', hair: { style: 'short', color: '#f7d046' }, outfit: { primary: '#f2c14e', secondary: '#fff5d6', accent: '#ff8a3d', style: 'plate' }, weapon: 'greatsword', head: 'crown', back: 'cape', eyes: '#ffd34a', aura: '#ffd34a' },
    bonds: ['seraphine'],
  },
  {
    id: 'brannoc', name: 'Brannoc', title: 'Ironpsalm', rarity: 4, element: 'frost', cls: 'knight', throne: 'aurelian', role: 'tank',
    archetypes: ['Bruiser Counter'],
    tagline: 'Defense-scaling Vanguard that answers every hit with a faster turn.',
    base: stats('knight', 4, { def: 1.18, hp: 1.02, spd: 101 }),
    imprint: imprint('release', 'def'),
    skills: [
      {
        slot: 's1', name: 'Psalm Hammer', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'frost_smash',
        desc: 'Attacks with damage proportional to Defense, with a 60% chance to Decrease Defense for 1 turn.',
        enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 0.3, def: 1.0 }); c.debuff(c.t, 'def_down', 1, 0.6); },
      },
      {
        slot: 's2', name: 'Bulwark Vow', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff',
        desc: 'At battle start and at the end of each turn, if the caster is the Vanguard, grants Ironstand (Defense +25%) for 1 turn. After being attacked, Combat Readiness +10% (once per turn).',
        enhance: [{}],
      },
      {
        slot: 's3', name: 'Shatterpsalm', cd: 4, souls: 2, target: 'enemy', anim: 'ult', vfx: 'frost_big',
        desc: 'Attacks with damage proportional to Defense, removes all buffs and Decreases Defense for 2 turns. Grants the caster a Barrier equal to 100% of Defense for 2 turns.',
        enhance: E.cd,
        run: (c) => {
          c.hit(c.t, { atk: 0.3, def: 1.4 });
          c.dispel(c.t, 99);
          c.debuff(c.t, 'def_down', 2, 1);
          c.barrier(c.self, c.stat(c.self, 'def') * 1.0, 2);
        },
      },
    ],
    hooks: {
      onBattleStart: (h) => { if (h.isVanguard()) h.buff(h.self, 'ironstand', 1); },
      onTurnEnd: (h) => { if (h.isVanguard()) h.buff(h.self, 'ironstand', 1); },
      onAttacked: (h, _a, info) => { if (!info.isDot && h.once('bulwark')) h.cr(h.self, 10); },
    },
    lore: 'Brannoc sings psalms while he fights because the hymn\'s rhythm tells his shield arm when to rise. Frostveil sent him south as a hostage; Solmere kept him as a wall.',
    quote: 'Strike me again. I am still singing.',
    look: { body: 'broad', skin: '#e8c4a8', hair: { style: 'braid', color: '#c7d9e8' }, outfit: { primary: '#9fb8cc', secondary: '#e8f4ff', accent: '#3d6f9a', style: 'plate' }, weapon: 'hammer', head: 'helm', back: 'banner', eyes: '#9fe3ff', aura: '#9fe3ff' },
  },
  {
    id: 'ilse', name: 'Ilse', title: 'Dawnwarden', rarity: 3, element: 'radiant', cls: 'knight', throne: 'aurelian', role: 'tank',
    archetypes: ['Bruiser Counter'],
    tagline: 'Budget tank: AoE provoke and team barrier.',
    base: stats('knight', 3, { hp: 1.05 }),
    imprint: imprint('release', 'hp'),
    skills: [
      { slot: 's1', name: 'Morning Bash', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'holy_slash', desc: 'Attacks with damage proportional to Defense with a 50% chance to Decrease Attack for 1 turn.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 0.5, def: 0.8 }); c.debuff(c.t, 'atk_down', 1, 0.5); } },
      { slot: 's2', name: 'Wall of Morning', cd: 3, souls: 1, target: 'allEnemies', anim: 'buff', vfx: 'holy_wave', desc: 'Has a 55% chance to Provoke all enemies for 1 turn and grants the caster Increased Defense for 2 turns.', enhance: E.chance,
        run: (c) => { c.debuffAll('provoke', 1, 0.55); c.buff(c.self, 'def_up', 2); } },
      { slot: 's3', name: 'Haven', cd: 5, souls: 2, target: 'allAllies', anim: 'buff', vfx: 'barrier', desc: 'Grants all allies a Barrier equal to 14% of the caster\'s max Health for 2 turns.', enhance: E.cd2,
        run: (c) => { for (const a of c.allies()) c.barrier(a, c.maxHp() * 0.14, 2); } },
    ],
    lore: 'Ilse keeps the city gate of Solmere. She has never lost it, mostly because nobody important has ever tried.',
    quote: 'Behind me. All of you.',
    look: { body: 'normal', feminine: true, skin: '#f1cfb4', hair: { style: 'ponytail', color: '#e8a64e' }, outfit: { primary: '#f7f0d8', secondary: '#c9a24a', accent: '#5f7fc2', style: 'plate' }, weapon: 'shield', head: 'circlet', eyes: '#5f7fc2', aura: '#ffe9a0' },
  },
  {
    id: 'caelum', name: 'Caelum', title: 'the Penitent', rarity: 4, element: 'umbral', cls: 'warrior', throne: 'aurelian', role: 'bruiser',
    archetypes: ['Bruiser Counter'],
    tagline: 'Gathers Penance whenever allies bleed, then pays it back in one blow.',
    base: stats('warrior', 4, { hp: 1.06, spd: 102 }),
    imprint: imprint('concentration', 'atk'),
    skills: [
      { slot: 's1', name: 'Flagellant Swing', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'dark_slash', desc: 'Attacks the enemy and recovers Health equal to 20% of damage dealt.', enhance: E.dmg,
        run: (c) => { const r = c.hit(c.t, { atk: 1.0 }); c.heal(c.self, r.dmg * 0.2); } },
      { slot: 's2', name: 'Penance', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'Whenever another ally is attacked, gains 1 Penance (max 5). Each Penance increases Attack by 6%.', enhance: [] },
      { slot: 's3', name: 'Absolution', cd: 4, souls: 2, target: 'enemy', anim: 'ult', vfx: 'dark_big', desc: 'Attacks the enemy, consuming all Penance. Damage increases by 25% per Penance consumed. Grants an extra turn if the target is defeated.', enhance: E.cd,
        soulburn: { cost: 10, desc: 'Penance is not consumed.' },
        run: (c) => {
          const p = c.get('penance');
          const r = c.hit(c.t, { atk: 1.55, mult: 1 + 0.25 * p });
          if (!c.sb) { c.set('penance', 0); c.showStacks('penance', 0); }
          if (r.killed) c.extraTurn();
        } },
    ],
    hooks: {
      stats: (u) => ({ atk: 0.06 * (u.data.penance || 0) }),
      onAllyAttacked: (h, _ally, _att, info) => { if (info.isDot) return; const n = h.add('penance', 1, 5); h.showStacks('penance', n); },
    },
    lore: 'A knight of the Umbral Court who defected to the light, Caelum wears his old crest branded backwards on his chest. Every wound his new family suffers, he counts.',
    quote: 'I keep the ledger. I always settle it.',
    look: { body: 'tall', skin: '#c99f86', hair: { style: 'long', color: '#2b2433' }, outfit: { primary: '#2d2638', secondary: '#c9b27a', accent: '#8e2a3c', style: 'coat' }, weapon: 'axe', head: 'veil', back: 'scarf', eyes: '#c9b27a', aura: '#8e5aff' },
  },
  {
    id: 'mirelle', name: 'Mirelle', title: 'Lightwright', rarity: 3, element: 'verdant', cls: 'soulweaver', throne: 'aurelian', role: 'healer',
    archetypes: ['Revive Sustain'],
    tagline: 'Reliable early healer with a cleanse and Continuous Heal.',
    base: stats('soulweaver', 3, { hp: 1.04 }),
    imprint: imprint('release', 'res'),
    skills: [
      { slot: 's1', name: 'Sprig Lash', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'leaf', desc: 'Attacks the enemy.', enhance: E.dmg, run: (c) => { c.hit(c.t, { atk: 1.0 }); } },
      { slot: 's2', name: 'Mending Light', cd: 2, souls: 1, target: 'ally', anim: 'heal', vfx: 'heal', desc: 'Heals an ally by 20% of the caster\'s max Health and removes 1 debuff.', enhance: E.heal,
        run: (c) => { c.heal(c.t, c.maxHp() * 0.2); c.cleanse(c.t, 1); } },
      { slot: 's3', name: 'Garden Prayer', cd: 4, souls: 2, target: 'allAllies', anim: 'heal', vfx: 'heal_big', desc: 'Heals all allies by 14% of the caster\'s max Health and grants Continuous Heal for 2 turns.', enhance: E.heal,
        run: (c) => { for (const a of c.allies()) { c.heal(a, c.maxHp() * 0.14); c.buff(a, 'regen', 2); } } },
    ],
    lore: 'Mirelle grows lamps. Not candles — lamps, living ones, out of moss and sunlight, in the cloisters of Solmere.',
    quote: 'Hold still, the light needs to find the wound.',
    look: { body: 'small', feminine: true, skin: '#f6dcc8', hair: { style: 'bob', color: '#7fcf6a' }, outfit: { primary: '#e9f7dc', secondary: '#7fcf6a', accent: '#ffd76a', style: 'robe' }, weapon: 'lantern', head: 'flower', eyes: '#3c9a4b', aura: '#b8ffb0' },
  },
  {
    id: 'gideon', name: 'Gideon', title: 'of the Long Halberd', rarity: 3, element: 'flame', cls: 'warrior', throne: 'aurelian', role: 'dps',
    archetypes: ['Cleave'],
    tagline: 'Simple Defense breaker who executes broken targets.',
    base: stats('warrior', 3),
    imprint: imprint('concentration', 'atk'),
    skills: [
      { slot: 's1', name: 'Halberd Sweep', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'fire_slash', desc: 'Attacks the enemy.', enhance: E.dmg, run: (c) => { c.hit(c.t, { atk: 1.0 }); } },
      { slot: 's2', name: 'Armor Rend', cd: 2, souls: 1, target: 'enemy', anim: 'melee', vfx: 'fire_slash', desc: 'Attacks with a 75% chance to Decrease Defense for 2 turns.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 1.1 }); c.debuff(c.t, 'def_down', 2, 0.75); } },
      { slot: 's3', name: 'Execution Line', cd: 4, souls: 2, target: 'enemy', anim: 'ult', vfx: 'fire_big', desc: 'Attacks the enemy. Deals 60% more damage if the target has Decreased Defense.', enhance: E.cd,
        run: (c) => { c.hit(c.t, { atk: 1.6, mult: c.t.has('def_down') ? 1.6 : 1 }); } },
    ],
    lore: 'Gideon\'s halberd is three times older than he is and has outlived four previous owners. He talks to it. It has not answered yet.',
    quote: 'Line up. It\'s faster.',
    look: { body: 'broad', skin: '#d8a88a', hair: { style: 'short', color: '#7a3b1f' }, outfit: { primary: '#b8442a', secondary: '#e3c08a', accent: '#3d2b1f', style: 'leather' }, weapon: 'spear', head: 'helm', eyes: '#ff9a3d', aura: '#ff7a3d' },
  },
  {
    id: 'verity', name: 'Verity', title: 'Lady of the Scales', rarity: 5, element: 'umbral', cls: 'soulweaver', throne: 'aurelian', role: 'support',
    archetypes: ['Revive Sustain', 'Dominion Control'],
    tagline: 'Fears, heals from the enemy\'s Health, and steals tempo whenever the enemy is pushed.',
    base: stats('soulweaver', 5, { hp: 1.05, spd: 113 }),
    imprint: imprint('concentration', 'spd'),
    skills: [
      { slot: 's1', name: 'Weighed and Found', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'scales', desc: 'Attacks with a 75% chance to inflict Fear for 1 turn, then heals all allies by 3% of the target\'s max Health.',
        soulburn: { cost: 10, desc: 'Attacks all enemies instead, inflicting Fear with 100% chance.' }, enhance: E.mix,
        run: (c) => {
          const targets = c.sb ? c.enemies() : [c.t];
          for (const t of targets) { c.hit(t, { atk: 0.9, aoe: c.sb }); c.debuff(t, 'fear', 1, c.sb ? 1 : 0.75); }
          c.healAll(c.maxHp(c.t) * 0.03);
        } },
      { slot: 's2', name: 'Equilibrium', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'Whenever an enemy gains Combat Readiness from an effect, the caster gains 50% of that amount (max 25% per turn).', enhance: [] },
      { slot: 's3', name: 'Scales of Mercy', cd: 5, souls: 3, target: 'allAllies', anim: 'heal', vfx: 'scales_big', desc: 'Removes all debuffs from all allies and increases their Combat Readiness by 25%. Then Tithe: the ally with the highest current Health loses 15% of it, and all other allies gain Bloom for 2 turns.', enhance: E.cdOnly,
        run: (c) => {
          for (const a of c.allies()) { c.cleanse(a, 99); c.cr(a, 25); }
          const tithe = c.allies().slice().sort((x, y) => y.hp - x.hp)[0];
          if (tithe) { tithe.hp = Math.max(1, Math.floor(tithe.hp * 0.85)); c.text('Tithe', '#c9b27a', tithe); c.b.emit({ t: 'dmg', src: c.self.uid, u: tithe.uid, v: 0, hit: 'normal', hp: tithe.hp, absorbed: 0 }); }
          for (const a of c.allies()) if (a !== tithe) c.buff(a, 'bloom', 2);
        } },
    ],
    hooks: {
      onTurnStart: (h) => h.set('eqGain', 0),
      onEnemyCrGain: (h, _e, amount) => {
        const room = 25 - h.get('eqGain');
        if (room <= 0) return;
        const g = Math.min(room, amount * 0.5);
        h.add('eqGain', g);
        h.cr(h.self, g);
      },
    },
    lore: 'Verity was a court accountant in the Umbral Court who audited a god and found it in debt. The Aurelian Throne took her in; nobody in either court wants to owe her anything.',
    quote: 'Everything is paid for. Everything.',
    look: { body: 'tall', feminine: true, skin: '#e9d2c9', hair: { style: 'long', color: '#1d1b2e' }, outfit: { primary: '#1d1b2e', secondary: '#c9b27a', accent: '#6a4cff', style: 'dress' }, weapon: 'orb', head: 'veil', back: 'orbs', eyes: '#c9b27a', aura: '#b79bff' },
  },
  {
    id: 'theodric', name: 'Theodric', title: 'Sunhammer', rarity: 4, element: 'radiant', cls: 'warrior', throne: 'aurelian', role: 'control',
    archetypes: ['Dominion Control', 'Bruiser Counter'],
    tagline: 'AoE stunner who refuses to die the first time he should.',
    base: stats('warrior', 4, { hp: 1.08, def: 1.05, spd: 100 }),
    imprint: imprint('release', 'atk'),
    skills: [
      { slot: 's1', name: 'Sunhammer', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'holy_smash', desc: 'Attacks with a 25% chance to Stun for 1 turn.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 1.0 }); c.debuff(c.t, 'stun', 1, 0.25); } },
      { slot: 's2', name: 'Radiant Stand', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'The first time Health falls below 50%, gains Immortality for 1 turn and Greater Attack for 2 turns.', enhance: [] },
      { slot: 's3', name: 'Dawnbreaker', cd: 4, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'holy_big', desc: 'Attacks all enemies with a 45% chance to Stun for 1 turn.', enhance: [{ chance: 0.05 }, { dmg: 0.1 }, { cd: 1 }, { chance: 0.1 }],
        run: (c) => { for (const r of c.hitAll({ atk: 0.95 })) void r; c.debuffAll('stun', 1, 0.45); } },
    ],
    hooks: {
      onAttacked: (h) => {
        if (!h.get('stood') && h.hpPct() < 0.5 && h.self.alive) { h.set('stood', 1); h.buff(h.self, 'immortal', 1); h.buff(h.self, 'atk_up_g', 2); h.text('Radiant Stand', '#ffd34a'); }
      },
    },
    lore: 'Theodric forged his hammer from the bell of a burned chapel. When it rings against armor, people swear they hear the old hymns.',
    quote: 'Wake up. The sun is.',
    look: { body: 'broad', skin: '#b8835f', hair: { style: 'bald', color: '#000000' }, outfit: { primary: '#e8c25a', secondary: '#7a4f2a', accent: '#fff4c2', style: 'plate' }, weapon: 'hammer', back: 'cape', eyes: '#ffe680', aura: '#ffe680' },
  },
];
