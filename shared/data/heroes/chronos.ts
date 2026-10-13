// CHRONOS WARDENS — keepers of the Great Clock beneath Aethra.
import type { HeroDef } from '../../engine/types';
import { registerStatus } from '../../engine/statuses';
import { E, imprint, stats } from '../kit';

registerStatus({ id: 'tick', name: 'Tick', kind: 'state', icon: 'pendulum-swing', desc: 'Tick persona: skills slow enemies and break armor.' });
registerStatus({ id: 'tock', name: 'Tock', kind: 'state', icon: 'stopwatch', desc: 'Tock persona: skills steal time and execute.' });

export const CHRONOS: HeroDef[] = [
  {
    id: 'chronarch', name: 'Chronarch Ves', title: 'Keeper of the Great Clock', rarity: 5, element: 'radiant', cls: 'mage', throne: 'chronos', role: 'anomaly',
    archetypes: ['Dominion Control', 'Soul Engine'],
    tagline: 'Rewinds allies, then locks the clock with Stillwater after a massive tempo swing.',
    base: stats('mage', 5, { spd: 114, hp: 1.06, atk: 0.95 }),
    imprint: imprint('release', 'spd'),
    skills: [
      { slot: 's1', name: 'Second Hand', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'clock', desc: 'Attacks the enemy, decreasing their Combat Readiness by 10% and increasing the caster\'s by 10%.', enhance: E.dmg,
        run: (c) => { c.hit(c.t, { atk: 1.0 }); c.cr(c.t, -10); c.cr(c.self, 10); } },
      { slot: 's2', name: 'Rewind', cd: 4, souls: 1, target: 'ally', anim: 'buff', vfx: 'rewind', desc: 'Removes all debuffs from an ally, heals them by 25% of their max Health, decreases their skill cooldowns by 2 turns and increases their Combat Readiness by 30%.', enhance: E.cdOnly,
        run: (c) => { c.cleanse(c.t, 99); c.heal(c.t, c.maxHp(c.t) * 0.25); c.reduceCd(c.t, 2); if (c.t !== c.self) c.cr(c.t, 30); } },
      { slot: 's3', name: 'Stillwater', cd: 6, souls: 3, target: 'allEnemies', anim: 'ult', vfx: 'stillwater', desc: 'Increases all allies\' Combat Readiness by 40% and decreases all enemies\' by 40%, then creates the Dominion "Stillwater" for 3 turns (Combat Readiness can no longer be changed by effects).', enhance: E.cdOnly, lockedCd: true,
        run: (c) => { for (const a of c.others()) c.cr(a, 40); for (const e of c.enemies()) c.cr(e, -40); c.field('stillwater', 3); } },
    ],
    lore: 'Ves has been the Chronarch for either nine years or nine centuries, depending on which side of the Clock you ask from.',
    quote: 'Again. From the moment before you fell.',
    look: { body: 'tall', skin: '#e8d8c8', hair: { style: 'long', color: '#f0e8c8' }, outfit: { primary: '#2a2418', secondary: '#e8c86a', accent: '#6ae8ff', style: 'robe' }, weapon: 'clock', head: 'halo', back: 'gears', eyes: '#6ae8ff', aura: '#e8c86a' },
  },
  {
    id: 'ticktock', name: 'Tick & Tock', title: 'the Pendulum Twins', rarity: 5, element: 'umbral', cls: 'thief', throne: 'chronos', role: 'dps',
    archetypes: ['Cleave', 'Dominion Control'],
    tagline: 'Alternates persona every turn: Tick breaks armor, Tock executes.',
    base: stats('thief', 5, { spd: 119 }),
    imprint: imprint('concentration', 'atk'),
    skills: [
      { slot: 's1', form: 'base', name: 'Tick', cd: 0, souls: 1, target: 'enemy', anim: 'dash', vfx: 'clock_slash', desc: '[Tick] Attacks with a 50% chance to Decrease Speed for 1 turn.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 1.0 }); c.debuff(c.t, 'spd_down', 1, 0.5); } },
      { slot: 's1', form: 'tock', name: 'Tock', cd: 0, souls: 1, target: 'enemy', anim: 'dash', vfx: 'clock_slash', desc: '[Tock] Attacks and decreases the target\'s Combat Readiness by 15%.', enhance: E.dmg,
        run: (c) => { c.hit(c.t, { atk: 1.0 }); c.cr(c.t, -15); } },
      { slot: 's2', name: 'Pendulum', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'At the end of each turn, switches persona. Becoming Tock grants Increased Critical Hit Chance for 1 turn; becoming Tick grants Increased Speed for 1 turn.', enhance: [] },
      { slot: 's3', form: 'base', name: 'Midnight', cd: 4, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'midnight', desc: '[Tick] Attacks all enemies with a 70% chance to Decrease Defense for 2 turns.', enhance: E.cd,
        run: (c) => { c.hitAll({ atk: 1.05 }); c.debuffAll('def_down', 2, 0.7); } },
      { slot: 's3', form: 'tock', name: 'Noon', cd: 4, souls: 2, target: 'enemy', anim: 'ult', vfx: 'noon', desc: '[Tock] Attacks the enemy. Grants an extra turn if the target is defeated.', enhance: E.cd,
        run: (c) => { const r = c.hit(c.t, { atk: 2.0 }); if (r.killed) c.extraTurn(); } },
    ],
    hooks: {
      onBattleStart: (h) => h.state(h.self, 'tick'),
      onTurnEnd: (h) => {
        if (h.self.form === 'tock') { h.form('base'); h.showStacks('tock', 0); h.state(h.self, 'tick'); h.buff(h.self, 'spd_up', 1); }
        else { h.form('tock'); h.showStacks('tick', 0); h.state(h.self, 'tock'); h.buff(h.self, 'crit_up', 1); }
      },
    },
    lore: 'Tick and Tock share one body, one heartbeat, and one long-running argument about whose turn it is.',
    quote: '"Tick." "Tock." "Tick." "Stop that."',
    look: { body: 'slim', skin: '#d8c8d0', hair: { style: 'bob', color: '#e8e8e8' }, outfit: { primary: '#1a1a1a', secondary: '#f0f0f0', accent: '#e8c86a', style: 'bodysuit' }, weapon: 'katana', head: 'mask', back: 'gears', eyes: '#e8c86a', aura: '#e8c86a' },
  },
  {
    id: 'mira', name: 'Horologist Mira', title: 'Clockmaker', rarity: 4, element: 'frost', cls: 'soulweaver', throne: 'chronos', role: 'support',
    archetypes: ['Cleave', 'Soul Engine'],
    tagline: 'Speeds the whole team up and resets everyone\'s cooldowns.',
    base: stats('soulweaver', 4, { spd: 114 }),
    imprint: imprint('release', 'spd'),
    skills: [
      { slot: 's1', name: 'Calibrate', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'clock', desc: 'Attacks the enemy and increases the Combat Readiness of the ally with the lowest Combat Readiness by 5%.', enhance: E.dmg,
        run: (c) => { c.hit(c.t, { atk: 0.9 }); const a = c.others().sort((x, y) => x.cr - y.cr)[0]; if (a) c.cr(a, 5); } },
      { slot: 's2', name: 'Synchronize', cd: 3, souls: 1, target: 'allAllies', anim: 'buff', vfx: 'clock_buff', desc: 'Increases all other allies\' Combat Readiness by 15% and grants all allies Increased Speed for 2 turns.', enhance: E.cdOnly,
        run: (c) => { for (const a of c.allies()) { if (a !== c.self) c.cr(a, 15); c.buff(a, 'spd_up', 2); } } },
      { slot: 's3', name: 'Recalibrate', cd: 5, souls: 2, target: 'allAllies', anim: 'heal', vfx: 'clock_big', desc: 'Decreases all other allies\' skill cooldowns by 1 turn, removes 1 debuff and heals all allies by 10% of the caster\'s max Health.', enhance: E.heal,
        run: (c) => { for (const a of c.allies()) { if (a !== c.self) c.reduceCd(a, 1); c.cleanse(a, 1); c.heal(a, c.maxHp() * 0.1); } } },
    ],
    lore: 'Mira builds clocks so precise that they occasionally tell the time before it happens.',
    quote: 'You\'re running slow. Let me fix that.',
    look: { body: 'slim', feminine: true, skin: '#f0e0d8', hair: { style: 'bob', color: '#8ac8e8' }, outfit: { primary: '#3a4a5a', secondary: '#e8d8a8', accent: '#8ac8e8', style: 'coat' }, weapon: 'clock', head: 'goggles', back: 'gears', eyes: '#8ac8e8', aura: '#8ac8e8' },
  },
  {
    id: 'osric', name: 'Sir Osric', title: 'the Sundial Knight', rarity: 4, element: 'radiant', cls: 'knight', throne: 'chronos', role: 'tank',
    archetypes: ['Bruiser Counter', 'Dominion Control'],
    tagline: 'Anti-push tank: every enemy push shields his team.',
    base: stats('knight', 4, { def: 1.1, spd: 103 }),
    imprint: imprint('release', 'def'),
    skills: [
      { slot: 's1', name: 'Gnomon Strike', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'holy_slash', desc: 'Attacks with damage proportional to Defense.', enhance: E.dmg, run: (c) => { c.hit(c.t, { atk: 0.5, def: 0.95 }); } },
      { slot: 's2', name: 'Shadow of Noon', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'Whenever an enemy gains Combat Readiness from an effect, grants all allies a Barrier equal to 5% of the caster\'s max Health for 1 turn (once per turn).', enhance: [] },
      { slot: 's3', name: 'High Noon', cd: 4, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'sun_flash', desc: 'Decreases all enemies\' Combat Readiness by 25% and grants the caster Increased Defense for 2 turns.', enhance: E.cdOnly,
        run: (c) => { for (const e of c.enemies()) c.cr(e, -25); c.buff(c.self, 'def_up', 2); } },
    ],
    hooks: {
      onEnemyCrGain: (h) => { if (h.once('noon')) for (const a of h.allies()) h.barrier(a, h.maxHp() * 0.05, 1); },
    },
    lore: 'Osric\'s armor is a working sundial. On cloudy days he is very, very late.',
    quote: 'It is exactly the hour I say it is.',
    look: { body: 'broad', skin: '#d8b898', hair: { style: 'short', color: '#e8c86a' }, outfit: { primary: '#d8c88a', secondary: '#5a4a2a', accent: '#ffffff', style: 'plate' }, weapon: 'shield', head: 'helm', back: 'cape', eyes: '#5a4a2a', aura: '#ffe8a8' },
  },
  {
    id: 'ragna', name: 'Ragna', title: 'the Epoch Breaker', rarity: 5, element: 'flame', cls: 'warrior', throne: 'chronos', role: 'dps',
    archetypes: ['Bruiser Counter', 'Dominion Control'],
    tagline: 'Late-game monster: grows every turn and delays enemy ultimates.',
    base: stats('warrior', 5, { hp: 1.06, spd: 104 }),
    imprint: imprint('concentration', 'atk'),
    skills: [
      { slot: 's1', name: 'Epoch Cleaver', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'fire_slash', desc: 'Attacks with a 50% chance to increase the target\'s third skill cooldown by 1 turn.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 1.05 }); if (c.t.alive && c.chance(0.5 + c.lv.chance)) c.increaseCd(c.t, 1, 's3'); } },
      { slot: 's2', name: 'Late Bloomer', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'Damage dealt +6% for every turn the caster has taken (max +60%).', enhance: [] },
      { slot: 's3', name: 'Shatter the Hour', cd: 4, souls: 2, target: 'enemy', anim: 'ult', vfx: 'fire_big', desc: 'Attacks the enemy and increases all enemies\' third skill cooldowns by 1 turn.', enhance: E.cd,
        soulburn: { cost: 20, desc: 'Increases cooldowns by 2 turns instead.' },
        run: (c) => { c.hit(c.t, { atk: 1.8 }); for (const e of c.enemies()) c.increaseCd(e, c.sb ? 2 : 1, 's3'); } },
    ],
    hooks: { dmgOut: (u) => 1 + Math.min(0.6, 0.06 * u.turns) },
    lore: 'Ragna was a smith who struck the Great Clock by accident. Now every hour she lives makes her a little more dangerous, and the Clock a little more nervous.',
    quote: 'Your time\'s not up. I\'m taking it.',
    look: { body: 'tall', feminine: true, skin: '#c8906a', hair: { style: 'wild', color: '#c83a1a' }, outfit: { primary: '#3a2a1a', secondary: '#e8c86a', accent: '#ff5a2a', style: 'plate' }, weapon: 'axe', head: 'circlet', back: 'gears', eyes: '#ffb24a', aura: '#ff7a2a' },
  },
  {
    id: 'lenny', name: 'Lenny', title: 'Gearspring', rarity: 3, element: 'verdant', cls: 'ranger', throne: 'chronos', role: 'control',
    archetypes: ['Dominion Control'],
    tagline: 'Budget Combat Readiness puller.',
    base: stats('ranger', 3),
    imprint: imprint('concentration', 'eff'),
    skills: [
      { slot: 's1', name: 'Spring Bolt', cd: 0, souls: 1, target: 'enemy', anim: 'ranged', vfx: 'gear_bolt', desc: 'Attacks the enemy.', enhance: E.dmg, run: (c) => { c.hit(c.t, { atk: 1.0 }); } },
      { slot: 's2', name: 'Unwind', cd: 3, souls: 1, target: 'enemy', anim: 'ranged', vfx: 'gear_bolt', desc: 'Attacks and decreases the target\'s Combat Readiness by 25%.', enhance: E.cd,
        run: (c) => { c.hit(c.t, { atk: 1.1 }); c.cr(c.t, -25); } },
      { slot: 's3', name: 'Gear Storm', cd: 4, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'gears', desc: 'Attacks all enemies.', enhance: E.cd, run: (c) => { c.hitAll({ atk: 0.85 }); } },
    ],
    lore: 'Lenny is a wind-up apprentice. He does not know who wound him up. He is too busy to care.',
    quote: 'Tk-tk-tk-tk-ready!',
    look: { body: 'small', skin: '#e8c8a8', hair: { style: 'short', color: '#6a4a2a' }, outfit: { primary: '#5a6a3a', secondary: '#c8a86a', accent: '#e8e8e8', style: 'tunic' }, weapon: 'gun', head: 'goggles', back: 'gears', eyes: '#3a8a3a', aura: '#c8a86a' },
  },
  {
    id: 'sentinel', name: 'Sentinel Mk.II', title: 'Clockwork Guard', rarity: 3, element: 'frost', cls: 'knight', throne: 'chronos', role: 'tank',
    archetypes: ['Bruiser Counter'],
    tagline: 'Wind-up shield bot: barriers for everyone.',
    base: stats('knight', 3, { def: 1.12 }),
    imprint: imprint('release', 'def'),
    skills: [
      { slot: 's1', name: 'Piston Jab', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'gear_bolt', desc: 'Attacks with damage proportional to Defense.', enhance: E.dmg, run: (c) => { c.hit(c.t, { atk: 0.3, def: 1.0 }); } },
      { slot: 's2', name: 'Reinforced Casing', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'At battle start gains a Barrier equal to 20% of max Health for 2 turns.', enhance: [] },
      { slot: 's3', name: 'Shield Protocol', cd: 4, souls: 2, target: 'allAllies', anim: 'buff', vfx: 'barrier', desc: 'Grants all allies a Barrier equal to 12% of the caster\'s max Health for 2 turns and has a 40% chance to Provoke all enemies for 1 turn.', enhance: E.chance,
        run: (c) => { for (const a of c.allies()) c.barrier(a, c.maxHp() * 0.12, 2); c.debuffAll('provoke', 1, 0.4); } },
    ],
    hooks: { onBattleStart: (h) => { h.barrier(h.self, h.maxHp() * 0.2, 2); } },
    lore: 'The first Sentinel wandered off. The second one has been instructed not to. It is very proud of this.',
    quote: 'PROTOCOL: STAND HERE. STANDING HERE.',
    look: { body: 'broad', skin: '#9aaabb', hair: { style: 'bald', color: '#000' }, outfit: { primary: '#6a7a8a', secondary: '#c8a86a', accent: '#6ae8ff', style: 'plate' }, weapon: 'shield', head: 'helm', back: 'gears', eyes: '#6ae8ff', aura: '#6ae8ff' },
  },
  {
    id: 'zeph', name: 'Anachron Zeph', title: 'Sandmaster', rarity: 4, element: 'umbral', cls: 'mage', throne: 'chronos', role: 'debuffer',
    archetypes: ['DoT Rot', 'Bruiser Counter'],
    tagline: 'Doom specialist — every hourglass runs out.',
    base: stats('mage', 4, { eff: 0.2, spd: 105 }),
    imprint: imprint('concentration', 'eff'),
    skills: [
      { slot: 's1', name: 'Hourglass Tap', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'sand', desc: 'Attacks the enemy. Deals 30% more damage to Doomed enemies.', enhance: E.dmg,
        run: (c) => { c.hit(c.t, { atk: 1.0, mult: c.t.has('doom') ? 1.3 : 1 }); } },
      { slot: 's2', name: 'Sands Run Out', cd: 3, souls: 1, target: 'enemy', anim: 'cast', vfx: 'sand_big', desc: 'Attacks with an 85% chance to inflict Doom for 2 turns (on natural expiry: damage equal to 30% of max Health).', enhance: E.chance,
        run: (c) => { c.hit(c.t, { atk: 0.9 }); c.debuff(c.t, 'doom', 2, 0.85); } },
      { slot: 's3', name: 'Endtime', cd: 5, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'sandstorm', desc: 'Attacks all enemies with a 60% chance to inflict Doom for 2 turns. Doomed enemies lose 15% Combat Readiness.', enhance: E.chance,
        run: (c) => { c.hitAll({ atk: 0.9 }); c.debuffAll('doom', 2, 0.6); for (const e of c.enemies()) if (e.has('doom')) c.cr(e, -15); } },
    ],
    lore: 'Zeph keeps every grain of sand that ever fell through an hourglass. He is not sure what he is saving them for. He has a feeling it\'s soon.',
    quote: 'Tick-tock. Oh — you hear it too?',
    look: { body: 'tall', skin: '#c8a888', hair: { style: 'long', color: '#e8d8a8' }, outfit: { primary: '#3a2a1a', secondary: '#e8c86a', accent: '#a07aff', style: 'robe' }, weapon: 'clock', head: 'hood', back: 'gears', eyes: '#a07aff', aura: '#e8c86a' },
  },
  {
    id: 'ilyana', name: 'Ilyana', title: 'the Last Second', rarity: 5, element: 'verdant', cls: 'thief', throne: 'chronos', role: 'control',
    archetypes: ['Cleave', 'DoT Rot'],
    tagline: 'Imprisons a key enemy outside of time for 2 turns.',
    base: stats('thief', 5, { spd: 118, eff: 0.15 }),
    imprint: imprint('concentration', 'spd'),
    skills: [
      { slot: 's1', name: 'Final Tick', cd: 0, souls: 1, target: 'enemy', anim: 'dash', vfx: 'clock_slash', desc: 'Attacks the enemy. Always critically hits targets below 30% Health.', enhance: E.dmg,
        run: (c) => { c.hit(c.t, { atk: 1.0, forceCrit: c.hpPct(c.t) < 0.3 }); } },
      { slot: 's2', name: 'Borrowed Time', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'Gains Immunity for 1 turn at the start of battle. Critical Hit Damage +25% against enemies with no buffs.', enhance: [] },
      { slot: 's3', name: 'Pocket of Nowhere', cd: 5, souls: 3, target: 'enemy', anim: 'ult', vfx: 'void_pocket', desc: 'Removes all buffs from the target and has an 85% chance to Imprison them for 2 turns (removed from the battlefield). Then attacks all other enemies.', enhance: E.chance,
        run: (c) => {
          const main = c.t;
          c.dispel(main, 99);
          c.imprison(main, 2, 0.85);
          for (const e of c.enemies()) if (e !== main && !e.has('imprison')) c.hit(e, { atk: 0.95, aoe: true, cdBonus: e.buffs().length === 0 ? 0.25 : 0 });
        } },
    ],
    hooks: { onBattleStart: (h) => { h.buff(h.self, 'immunity', 1); } },
    lore: 'Ilyana was born in the last second of the old calendar and has been living in it ever since. It is a very long second.',
    quote: 'There\'s a room between moments. You\'ll be staying there.',
    look: { body: 'slim', feminine: true, skin: '#d8c0a8', hair: { style: 'ponytail', color: '#3a6a4a' }, outfit: { primary: '#1a2a1a', secondary: '#c8e8a8', accent: '#e8c86a', style: 'bodysuit' }, weapon: 'dagger', head: 'mask', back: 'scarf', eyes: '#e8c86a', aura: '#a8ff8a' },
  },
  {
    id: 'wren', name: 'Wren', title: 'Quickstep', rarity: 3, element: 'radiant', cls: 'thief', throne: 'chronos', role: 'dps',
    archetypes: ['Cleave'],
    tagline: 'Speedy starter thief with crit extra turns.',
    base: stats('thief', 3, { spd: 116 }),
    imprint: imprint('concentration', 'cc'),
    skills: [
      { slot: 's1', name: 'Quickstep', cd: 0, souls: 1, target: 'enemy', anim: 'dash', vfx: 'slash', desc: 'Attacks the enemy.', enhance: E.dmg, run: (c) => { c.hit(c.t, { atk: 1.0 }); } },
      { slot: 's2', name: 'Fleet Foot', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'Speed +8%.', enhance: [] },
      { slot: 's3', name: 'Blink Strike', cd: 3, souls: 2, target: 'enemy', anim: 'ult', vfx: 'slash_big', desc: 'Attacks the enemy. Grants an extra turn on a critical hit.', enhance: E.cd,
        run: (c) => { const r = c.hit(c.t, { atk: 1.45 }); if (r.type === 'crit') c.extraTurn(); } },
    ],
    hooks: { stats: () => ({ spd: 0.08 }) },
    lore: 'Wren is the Wardens\' fastest runner. She has been fired twice for arriving before she was sent.',
    quote: 'Already there!',
    look: { body: 'small', feminine: true, skin: '#f0d0b0', hair: { style: 'short', color: '#e8a84a' }, outfit: { primary: '#e8e0c8', secondary: '#4a6a8a', accent: '#e8c86a', style: 'tunic' }, weapon: 'dagger', head: 'goggles', back: 'scarf', eyes: '#4a6a8a', aura: '#ffe8a8' },
  },
  {
    id: 'selene', name: 'Selene', title: 'Paradox Twin', rarity: 4, element: 'radiant', cls: 'ranger', throne: 'chronos', role: 'support',
    archetypes: ['Soul Engine', 'Cleave'],
    tagline: 'Hands out Echo — the next ultimate happens twice.',
    base: stats('ranger', 4, { spd: 111 }),
    imprint: imprint('release', 'cd'),
    skills: [
      { slot: 's1', name: 'Mirrored Shot', cd: 0, souls: 1, target: 'enemy', anim: 'ranged', vfx: 'mirror', desc: 'Attacks the enemy.', enhance: E.dmg, run: (c) => { c.hit(c.t, { atk: 1.0 }); } },
      { slot: 's2', name: 'Reflection', cd: 3, souls: 1, target: 'ally', anim: 'buff', vfx: 'mirror', desc: 'Grants an ally Echo for 2 turns (their next skill repeats at 40% damage) and increases their Combat Readiness by 10%.', enhance: E.cdOnly,
        run: (c) => { c.buff(c.t, 'echo', 2); if (c.t !== c.self) c.cr(c.t, 10); } },
      { slot: 's3', name: 'Paradox Volley', cd: 4, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'arrow_rain', desc: 'Attacks all enemies, then grants the caster Echo for 2 turns.', enhance: E.cd,
        soulburn: { cost: 10, desc: 'Grants Echo to all allies instead.' },
        run: (c) => { c.hitAll({ atk: 1.05 }); if (c.sb) c.buffAll('echo', 2); else c.buff(c.self, 'echo', 2); } },
    ],
    lore: 'Selene met herself in the Great Clock\'s mirror-hall and the two never quite separated. She is fairly sure she\'s the original.',
    quote: 'Did I say that already? I\'ll say it again.',
    look: { body: 'slim', feminine: true, skin: '#f0e0e0', hair: { style: 'twin', color: '#e8e8ff' }, outfit: { primary: '#e8e8ff', secondary: '#8a8ad8', accent: '#ffd76a', style: 'coat' }, weapon: 'bow', head: 'circlet', back: 'quiver', eyes: '#8a8ad8', aura: '#e8e8ff' },
  },
];

// Ilyana passive damage bonus on single-target S1 vs no-buff targets
const ily = CHRONOS.find((h) => h.id === 'ilyana')!;
ily.skills[0].run = (c) => { c.hit(c.t, { atk: 1.0, forceCrit: c.hpPct(c.t) < 0.3, cdBonus: c.t.buffs().length === 0 ? 0.25 : 0 }); };
