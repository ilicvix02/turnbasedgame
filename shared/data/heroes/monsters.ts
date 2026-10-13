// Monsters and bosses — campaign enemies (not summonable).
import type { HeroDef } from '../../engine/types';
import { registerStatus } from '../../engine/statuses';
import { E, imprint, stats } from '../kit';

registerStatus({ id: 'enrage', name: 'Enraged', kind: 'state', icon: 'screaming', mods: { atk: 0.5, spd: 0.15 }, desc: 'Attack +50%, Speed +15%. Cannot be removed.', sticky: true });
registerStatus({ id: 'boss_ward', name: 'Colossal', kind: 'state', icon: 'crowned-skull', sticky: true, desc: 'Boss: immune to Stun, Sleep, Provoke and Imprison; Combat Readiness reductions are halved.' });

const imp = imprint('concentration', 'atk');
const M = (d: Omit<HeroDef, 'imprint' | 'lore' | 'quote' | 'archetypes' | 'tagline'> & { lore?: string; quote?: string; tagline?: string }): HeroDef => ({
  imprint: imp, archetypes: [], lore: d.lore ?? '', quote: d.quote ?? '', tagline: d.tagline ?? '', monster: true, ...d,
});

const bossWard = {
  onBattleStart: (h: import('../../engine/context').HookCtx) => h.state(h.self, 'boss_ward'),
  onDebuffed: (h: import('../../engine/context').HookCtx, id: string) => {
    if (['stun', 'sleep', 'provoke', 'imprison'].includes(id)) { const s = h.self.get(id); if (s) { h.b.removeInst(h.self, s, 'cleanse'); h.text('Colossal', '#ffb24a'); } }
  },
};

export const MONSTERS: HeroDef[] = [
  M({ id: 'wisp', name: 'Hollow Wisp', title: 'Monster', rarity: 3, element: 'radiant', cls: 'soulweaver', throne: 'aurelian', role: 'healer', base: stats('soulweaver', 3, { hp: 0.8 }),
    skills: [
      { slot: 's1', name: 'Flicker', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'holy', desc: 'Attacks.', run: (c) => { c.hit(c.t, { atk: 1.0 }); } },
      { slot: 's2', name: 'Glow', cd: 3, souls: 1, target: 'allAllies', anim: 'heal', vfx: 'heal', desc: 'Heals all allies by 10% of max Health.', run: (c) => c.healAll(c.maxHp() * 0.1) },
    ],
    look: { body: 'small', skin: '#fff8d0', hair: { style: 'bald', color: '#fff' }, outfit: { primary: '#fff2b0', secondary: '#ffe070', accent: '#ffffff', style: 'robe' }, weapon: 'orb', head: 'halo', eyes: '#ffffff', aura: '#fff2a0', scale: 0.8 } }),
  M({ id: 'ash_hound', name: 'Ash Hound', title: 'Monster', rarity: 3, element: 'flame', cls: 'thief', throne: 'emberforge', role: 'dps', base: stats('thief', 3, { hp: 0.85 }),
    skills: [
      { slot: 's1', name: 'Bite', cd: 0, souls: 1, target: 'enemy', anim: 'dash', vfx: 'claw', desc: 'Attacks with a 40% chance to inflict Bleed for 2 turns.', run: (c) => { c.hit(c.t, { atk: 1.0 }); c.debuff(c.t, 'bleed', 2, 0.4); } },
      { slot: 's3', name: 'Ember Howl', cd: 4, souls: 2, target: 'allEnemies', anim: 'spin', vfx: 'fire_wave', desc: 'Attacks all enemies.', run: (c) => { c.hitAll({ atk: 0.8 }); } },
    ],
    look: { body: 'small', skin: '#5a2a1a', hair: { style: 'spiky', color: '#ff5a1a' }, outfit: { primary: '#3a1a0a', secondary: '#ff5a1a', accent: '#ffd24a', style: 'leather' }, weapon: 'claws', head: 'ears', back: 'tail', eyes: '#ffd24a', aura: '#ff5a1a', scale: 0.85 } }),
  M({ id: 'frost_wraith', name: 'Frost Wraith', title: 'Monster', rarity: 3, element: 'frost', cls: 'mage', throne: 'frostveil', role: 'control', base: stats('mage', 3, { hp: 0.85 }),
    skills: [
      { slot: 's1', name: 'Chill Touch', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'ice_bolt', desc: 'Attacks with a 40% chance to Decrease Speed for 2 turns.', run: (c) => { c.hit(c.t, { atk: 1.0 }); c.debuff(c.t, 'spd_down', 2, 0.4); } },
      { slot: 's3', name: 'Wail', cd: 4, souls: 2, target: 'allEnemies', anim: 'cast', vfx: 'ice_wave', desc: 'Attacks all enemies, decreasing Combat Readiness by 10%.', run: (c) => { c.hitAll({ atk: 0.75 }); for (const e of c.enemies()) c.cr(e, -10); } },
    ],
    look: { body: 'tall', skin: '#d8f0ff', hair: { style: 'flowing', color: '#bfe8ff' }, outfit: { primary: '#8ab8d8', secondary: '#e8f8ff', accent: '#4a8acf', style: 'robe' }, weapon: 'orb', head: 'veil', eyes: '#4ad0ff', aura: '#9fe3ff' } }),
  M({ id: 'thornling', name: 'Thornling', title: 'Monster', rarity: 3, element: 'verdant', cls: 'warrior', throne: 'wildroot', role: 'debuffer', base: stats('warrior', 3, { hp: 0.9 }),
    skills: [
      { slot: 's1', name: 'Barb', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'thorns', desc: 'Attacks with a 50% chance to inflict Poison for 2 turns.', run: (c) => { c.hit(c.t, { atk: 1.0 }); c.debuff(c.t, 'poison', 2, 0.5); } },
    ],
    look: { body: 'small', skin: '#5a8a3a', hair: { style: 'spiky', color: '#3a6a2a' }, outfit: { primary: '#3a5a2a', secondary: '#8aaa5a', accent: '#d84a6a', style: 'leather' }, weapon: 'claws', head: 'antlers', eyes: '#d8ff6a', aura: '#8aff6a', scale: 0.8 } }),
  M({ id: 'shade_knight', name: 'Shade Knight', title: 'Monster', rarity: 4, element: 'umbral', cls: 'knight', throne: 'umbral', role: 'tank', base: stats('knight', 4),
    skills: [
      { slot: 's1', name: 'Shadow Bash', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'dark_slash', desc: 'Attacks with damage proportional to Defense.', run: (c) => { c.hit(c.t, { atk: 0.5, def: 0.8 }); } },
      { slot: 's3', name: 'Umbral Taunt', cd: 4, souls: 2, target: 'allEnemies', anim: 'buff', vfx: 'dark_wave', desc: 'Has a 50% chance to Provoke all enemies for 1 turn and gains a Barrier of 15% max Health.', run: (c) => { c.debuffAll('provoke', 1, 0.5); c.barrier(c.self, c.maxHp() * 0.15, 2); } },
    ],
    look: { body: 'broad', skin: '#3a3a4a', hair: { style: 'bald', color: '#000' }, outfit: { primary: '#1a1a2a', secondary: '#4a4a6a', accent: '#8a6aff', style: 'plate' }, weapon: 'sword', head: 'helm', back: 'cape', eyes: '#8a6aff', aura: '#5a3aff' } }),
  M({ id: 'automaton', name: 'Gilded Automaton', title: 'Monster', rarity: 4, element: 'radiant', cls: 'knight', throne: 'chronos', role: 'tank', base: stats('knight', 4, { def: 1.2 }),
    skills: [
      { slot: 's1', name: 'Gear Punch', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'gear_bolt', desc: 'Attacks with damage proportional to Defense.', run: (c) => { c.hit(c.t, { atk: 0.3, def: 1.0 }); } },
      { slot: 's2', name: 'Counterweight', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: '25% chance to counterattack when attacked.' },
    ],
    hooks: { onAttacked: (h, att, info) => { if (!info.isCounter && !info.isDot && att.alive && h.once('cw') && h.chance(0.25)) h.react('counter', att); } },
    look: { body: 'broad', skin: '#c8a84a', hair: { style: 'bald', color: '#000' }, outfit: { primary: '#d8b84a', secondary: '#5a4a2a', accent: '#6ae8ff', style: 'plate' }, weapon: 'gauntlet', head: 'helm', back: 'gears', eyes: '#6ae8ff', aura: '#e8c86a' } }),
  M({ id: 'cinder_imp', name: 'Cinder Imp', title: 'Monster', rarity: 3, element: 'flame', cls: 'mage', throne: 'emberforge', role: 'debuffer', base: stats('mage', 3, { hp: 0.8 }),
    skills: [
      { slot: 's1', name: 'Spit Fire', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'fire_bolt', desc: 'Attacks with a 50% chance to inflict Burn for 1 turn.', run: (c) => { c.hit(c.t, { atk: 1.0 }); c.debuff(c.t, 'burn', 1, 0.5); } },
    ],
    look: { body: 'small', skin: '#c83a1a', hair: { style: 'mohawk', color: '#ffb24a' }, outfit: { primary: '#5a1a0a', secondary: '#ff7a2a', accent: '#ffd24a', style: 'bodysuit' }, weapon: 'orb', head: 'horns', back: 'demon', eyes: '#ffd24a', aura: '#ff7a2a', scale: 0.75 } }),
  M({ id: 'glacier_golem', name: 'Glacier Golem', title: 'Monster', rarity: 4, element: 'frost', cls: 'knight', throne: 'frostveil', role: 'tank', base: stats('knight', 4, { hp: 1.25, spd: 90 }),
    skills: [
      { slot: 's1', name: 'Glacier Fist', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'ice_smash', desc: 'Attacks with damage proportional to max Health.', run: (c) => { c.hit(c.t, { atk: 0.4, hp: 0.08 }); } },
      { slot: 's3', name: 'Avalanche', cd: 4, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'blizzard', desc: 'Attacks all enemies with a 25% chance to Stun for 1 turn.', run: (c) => { c.hitAll({ atk: 0.3, hp: 0.06 }); c.debuffAll('stun', 1, 0.25); } },
    ],
    look: { body: 'giant', skin: '#a8d8f0', hair: { style: 'bald', color: '#000' }, outfit: { primary: '#8ab8d8', secondary: '#e8f8ff', accent: '#4a8acf', style: 'plate' }, weapon: 'gauntlet', head: 'horns', eyes: '#4ad0ff', aura: '#9fe3ff' } }),
  M({ id: 'void_acolyte', name: 'Void Acolyte', title: 'Monster', rarity: 4, element: 'umbral', cls: 'soulweaver', throne: 'umbral', role: 'healer', base: stats('soulweaver', 4),
    skills: [
      { slot: 's1', name: 'Void Lash', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'dark_bolt', desc: 'Attacks with a 40% chance to inflict Unhealable for 1 turn.', run: (c) => { c.hit(c.t, { atk: 1.0 }); c.debuff(c.t, 'unhealable', 1, 0.4); } },
      { slot: 's2', name: 'Dark Mending', cd: 3, souls: 1, target: 'allAllies', anim: 'heal', vfx: 'dark_heal', desc: 'Heals all allies by 12% of max Health.', run: (c) => c.healAll(c.maxHp() * 0.12) },
    ],
    look: { body: 'slim', skin: '#b8a8c8', hair: { style: 'long', color: '#2a1a3a' }, outfit: { primary: '#1a0a2a', secondary: '#5a3a7a', accent: '#c87aff', style: 'robe' }, weapon: 'book', head: 'hood', eyes: '#c87aff', aura: '#8a5aff' } }),
  M({ id: 'drone', name: 'Clockwork Drone', title: 'Monster', rarity: 3, element: 'verdant', cls: 'thief', throne: 'chronos', role: 'control', base: stats('thief', 3, { hp: 0.8 }),
    skills: [
      { slot: 's1', name: 'Tick Shot', cd: 0, souls: 1, target: 'enemy', anim: 'ranged', vfx: 'gear_bolt', desc: 'Attacks and decreases Combat Readiness by 10%.', run: (c) => { c.hit(c.t, { atk: 1.0 }); c.cr(c.t, -10); } },
    ],
    look: { body: 'small', skin: '#8a9aaa', hair: { style: 'bald', color: '#000' }, outfit: { primary: '#5a6a7a', secondary: '#c8a86a', accent: '#8aff6a', style: 'plate' }, weapon: 'gun', head: 'goggles', back: 'gears', eyes: '#8aff6a', aura: '#8aff6a', scale: 0.75 } }),
  M({ id: 'bone_archer', name: 'Bone Archer', title: 'Monster', rarity: 3, element: 'umbral', cls: 'ranger', throne: 'umbral', role: 'dps', base: stats('ranger', 3),
    skills: [
      { slot: 's1', name: 'Rattle Shot', cd: 0, souls: 1, target: 'enemy', anim: 'ranged', vfx: 'arrow_dark', desc: 'Attacks.', run: (c) => { c.hit(c.t, { atk: 1.05 }); } },
      { slot: 's3', name: 'Bone Volley', cd: 4, souls: 2, target: 'allEnemies', anim: 'ranged', vfx: 'arrow_rain', desc: 'Attacks all enemies.', run: (c) => { c.hitAll({ atk: 0.8 }); } },
    ],
    look: { body: 'slim', skin: '#e8e0d0', hair: { style: 'bald', color: '#000' }, outfit: { primary: '#3a3a3a', secondary: '#e8e0d0', accent: '#8a6aff', style: 'leather' }, weapon: 'bow', head: 'hood', back: 'quiver', eyes: '#8a6aff', aura: '#8a6aff' } }),
  M({ id: 'bog_lurker', name: 'Bog Lurker', title: 'Monster', rarity: 4, element: 'verdant', cls: 'warrior', throne: 'wildroot', role: 'bruiser', base: stats('warrior', 4, { hp: 1.1 }),
    skills: [
      { slot: 's1', name: 'Drag Under', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'water', desc: 'Attacks with a 35% chance to Decrease Speed for 1 turn.', run: (c) => { c.hit(c.t, { atk: 1.0 }); c.debuff(c.t, 'spd_down', 1, 0.35); } },
      { slot: 's3', name: 'Swamp Maw', cd: 4, souls: 2, target: 'enemy', anim: 'ult', vfx: 'poison_big', desc: 'Attacks and heals for 30% of damage dealt.', run: (c) => { const r = c.hit(c.t, { atk: 1.6 }); c.heal(c.self, r.dmg * 0.3); } },
    ],
    look: { body: 'broad', skin: '#4a6a3a', hair: { style: 'wild', color: '#2a4a2a' }, outfit: { primary: '#2a3a1a', secondary: '#6a8a4a', accent: '#d8ff6a', style: 'leather' }, weapon: 'claws', head: 'horns', back: 'tail', eyes: '#d8ff6a', aura: '#6a8a4a' } }),

  // ─── Bosses ───
  M({ id: 'ashmaw', name: 'Ashmaw', title: 'the Cinder Wyrm', rarity: 5, element: 'flame', cls: 'warrior', throne: 'emberforge', role: 'dps', boss: true, base: stats('warrior', 5, { hp: 5.5, def: 1.1, spd: 100 }),
    tagline: 'Chapter 1 boss. Enrages below 50% Health.',
    skills: [
      { slot: 's1', name: 'Searing Bite', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'fire_smash', desc: 'Attacks with a 60% chance to inflict Burn for 2 turns.', run: (c) => { c.hit(c.t, { atk: 1.0 }); c.debuff(c.t, 'burn', 2, 0.6); } },
      { slot: 's2', name: 'Cinder Breath', cd: 3, souls: 1, target: 'allEnemies', anim: 'cast', vfx: 'fire_wave', desc: 'Attacks all enemies with a 50% chance to inflict Burn for 2 turns.', run: (c) => { c.hitAll({ atk: 0.85 }); c.debuffAll('burn', 2, 0.5); } },
      { slot: 's3', name: 'Molten Rage', cd: 5, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'fire_big', desc: 'Detonates all Burns on enemies, then attacks all enemies.', run: (c) => { for (const e of c.enemies()) c.detonate(e, 'burn', 0.7); c.hitAll({ atk: 1.0 }); } },
    ],
    hooks: { ...bossWard, onAttacked: (h) => { if (!h.get('rage') && h.hpPct() < 0.5) { h.set('rage', 1); h.state(h.self, 'enrage'); h.text('ENRAGED', '#ff3a1a'); } }, dmgIn: () => 0.85 },
    lore: 'An old dragon that fell asleep in the forge-fires of Cindermount and woke up hungry.', quote: 'ROOOAAAR.',
    look: { body: 'giant', skin: '#8a2a1a', hair: { style: 'spiky', color: '#ff7a2a' }, outfit: { primary: '#3a0a0a', secondary: '#ff5a1a', accent: '#ffd24a', style: 'plate' }, weapon: 'claws', head: 'horns', back: 'wings', eyes: '#ffd24a', aura: '#ff5a1a', scale: 1.35 } }),
  M({ id: 'matriarch', name: 'The Frozen Matriarch', title: 'Queen Beneath the Ice', rarity: 5, element: 'frost', cls: 'mage', throne: 'frostveil', role: 'control', boss: true, base: stats('mage', 5, { hp: 6, def: 1.2, spd: 105 }),
    tagline: 'Chapter 2 boss. Freezes the battlefield.',
    skills: [
      { slot: 's1', name: 'Hoarfrost', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'ice_bolt', desc: 'Attacks with a 60% chance to Decrease Speed for 2 turns.', run: (c) => { c.hit(c.t, { atk: 1.0 }); c.debuff(c.t, 'spd_down', 2, 0.6); } },
      { slot: 's2', name: 'Winter\'s Embrace', cd: 3, souls: 1, target: 'allEnemies', anim: 'cast', vfx: 'blizzard', desc: 'Attacks all enemies with a 35% chance to Stun for 1 turn.', run: (c) => { c.hitAll({ atk: 0.8 }); c.debuffAll('stun', 1, 0.35); } },
      { slot: 's3', name: 'Eternal Winter', cd: 5, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'blizzard', desc: 'Creates Frozen Hour for 3 turns and heals herself by 10% of max Health.', run: (c) => { c.field('frozen_hour', 3); c.heal(c.self, c.maxHp() * 0.1); c.hitAll({ atk: 0.7 }); } },
    ],
    hooks: { ...bossWard, dmgIn: () => 0.85 },
    lore: 'The first queen of Frostveil, who refused to die and instead simply froze.', quote: 'Sleep, children.',
    look: { body: 'giant', feminine: true, skin: '#e0f4ff', hair: { style: 'flowing', color: '#ffffff' }, outfit: { primary: '#bfe8ff', secondary: '#ffffff', accent: '#2a6aaa', style: 'dress' }, weapon: 'staff', head: 'crown', back: 'cape', eyes: '#4ad0ff', aura: '#9fe3ff', scale: 1.3 } }),
  M({ id: 'colossus', name: 'Root Colossus', title: 'Heart of the Elderwood', rarity: 5, element: 'verdant', cls: 'knight', throne: 'wildroot', role: 'tank', boss: true, base: stats('knight', 5, { hp: 6.5, def: 1.3, spd: 92 }),
    tagline: 'Chapter 3 boss. Counterattacks and poisons.',
    skills: [
      { slot: 's1', name: 'Root Slam', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'earth_smash', desc: 'Attacks with damage proportional to max Health and a 50% chance to inflict Poison.', run: (c) => { c.hit(c.t, { atk: 0.4, hp: 0.04 }); c.debuff(c.t, 'poison', 2, 0.5); } },
      { slot: 's2', name: 'Bark Reflex', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: '30% chance to counterattack when attacked.' },
      { slot: 's3', name: 'Overgrowth', cd: 4, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'thorns', desc: 'Attacks all enemies, inflicting Poison (2 turns) and Decreased Speed (1 turn) with 60% chance.', run: (c) => { c.hitAll({ atk: 0.4, hp: 0.03 }); c.debuffAll('poison', 2, 0.6); c.debuffAll('spd_down', 1, 0.6); } },
    ],
    hooks: { ...bossWard, dmgIn: () => 0.85, onAttacked: (h, att, info) => { if (!info.isCounter && !info.isDot && att.alive && h.once('rc') && h.chance(0.3)) h.react('counter', att); } },
    lore: 'The Elderwood grew a guardian when the first axe touched it. It has not stopped growing.', quote: '...',
    look: { body: 'giant', skin: '#6a4a2a', hair: { style: 'wild', color: '#4a8a3a' }, outfit: { primary: '#4a3a1a', secondary: '#6aaa4a', accent: '#d8ff6a', style: 'plate' }, weapon: 'gauntlet', head: 'antlers', eyes: '#d8ff6a', aura: '#6aaa4a', scale: 1.4 } }),
  M({ id: 'regent', name: 'The Pale Regent', title: 'Usurper of Night', rarity: 5, element: 'umbral', cls: 'warrior', throne: 'umbral', role: 'dps', boss: true, base: stats('warrior', 5, { hp: 6, def: 1.15, spd: 112 }),
    tagline: 'Chapter 4 boss. Casts Bloodmoon and drains life.',
    skills: [
      { slot: 's1', name: 'Pale Claw', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'blood_slash', desc: 'Attacks and recovers 30% of damage dealt.', run: (c) => { const r = c.hit(c.t, { atk: 1.0 }); c.heal(c.self, r.dmg * 0.3); } },
      { slot: 's2', name: 'Sanguine Tide', cd: 3, souls: 1, target: 'allEnemies', anim: 'cast', vfx: 'dark_wave', desc: 'Attacks all enemies with a 60% chance to inflict Bleed for 2 turns.', run: (c) => { c.hitAll({ atk: 0.8 }); c.debuffAll('bleed', 2, 0.6); } },
      { slot: 's3', name: 'Crimson Eclipse', cd: 5, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'bloodmoon', desc: 'Creates Bloodmoon for 3 turns and attacks all enemies with Unhealable (60%).', run: (c) => { c.field('bloodmoon', 3); c.hitAll({ atk: 0.9 }); c.debuffAll('unhealable', 2, 0.6); } },
    ],
    hooks: { ...bossWard, dmgIn: () => 0.85 },
    lore: 'The Regent stole the Umbral crown while Nocturne slept. Nocturne has been awake ever since.', quote: 'Your blood is mine by law.',
    look: { body: 'giant', skin: '#f0f0f8', hair: { style: 'long', color: '#ffffff' }, outfit: { primary: '#f0f0f8', secondary: '#3a0a1a', accent: '#ff2b48', style: 'coat' }, weapon: 'scythe', head: 'crown', back: 'demon', eyes: '#ff2b48', aura: '#ff2b48', scale: 1.3 } }),
  M({ id: 'chronophage', name: 'Chronophage', title: 'Devourer of Hours', rarity: 5, element: 'radiant', cls: 'mage', throne: 'chronos', role: 'anomaly', boss: true, base: stats('mage', 5, { hp: 7, def: 1.25, spd: 115 }),
    tagline: 'Final boss. Steals turns, locks time, and enrages after 20 turns.',
    skills: [
      { slot: 's1', name: 'Hour Gnaw', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'clock', desc: 'Attacks and steals 15% Combat Readiness.', run: (c) => { c.hit(c.t, { atk: 1.0 }); c.cr(c.t, -15); c.cr(c.self, 15); } },
      { slot: 's2', name: 'Paradox Bloom', cd: 3, souls: 1, target: 'allEnemies', anim: 'cast', vfx: 'clock_big', desc: 'Attacks all enemies with a 50% chance to inflict Doom for 2 turns.', run: (c) => { c.hitAll({ atk: 0.8 }); c.debuffAll('doom', 2, 0.5); } },
      { slot: 's3', name: 'Devour the Hour', cd: 5, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'stillwater', desc: 'Decreases all enemies\' Combat Readiness by 50%, creates Stillwater for 2 turns, and attacks all enemies.', run: (c) => { for (const e of c.enemies()) c.cr(e, -50); c.field('stillwater', 2); c.hitAll({ atk: 1.0 }); } },
    ],
    hooks: { ...bossWard, dmgIn: () => 0.85, onTurnStart: (h) => { if (h.self.turns >= 20 && !h.get('rage')) { h.set('rage', 1); h.state(h.self, 'enrage'); h.text('TIME\'S UP', '#ff3a1a'); } } },
    lore: 'It lives in the space between ticks and eats them, one by one. Aethra has been getting shorter days for a century.', quote: 'More. MORE.',
    look: { body: 'giant', skin: '#e8e0c8', hair: { style: 'flowing', color: '#e8c86a' }, outfit: { primary: '#1a1a1a', secondary: '#e8c86a', accent: '#6ae8ff', style: 'robe' }, weapon: 'clock', head: 'halo', back: 'gears', eyes: '#6ae8ff', aura: '#e8c86a', scale: 1.4 } }),
];
