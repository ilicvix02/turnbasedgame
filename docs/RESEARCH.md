# Research: How Epic Seven (and its genre) Works — and How We Build Ours

> Scope: a deep teardown of **Epic Seven** (primary reference), cross-checked against
> **Honkai: Star Rail**, **Summoners War** and **RAID: Shadow Legends**, followed by how
> these games are engineered and what *Aethra: Seven Thrones* (this repo) adopts and invents.
>
> Confidence legend — **[O]** official / in-game text, **[D]** datamined or live-stats
> aggregator, **[C]** community-derived (reverse-engineered, generally accepted),
> **[I]** our interpretation / design decision.

---

## 1. Epic Seven at a glance

| Item | Detail |
|---|---|
| Developer | Super Creative, published by Smilegate (2018) |
| Genre | Turn-based, speed-driven, 4-hero party RPG with hand-drawn Live2D-style animation |
| Team | 4 heroes (+1 *Supporter* in some PvE), 1 artifact each, 6 gear pieces each [O] |
| Elements | Fire › Earth › Ice › Fire triangle; Light ⟷ Dark mutual advantage [O] |
| Classes | Knight (tank), Warrior (bruiser), Thief (speed/evasion), Ranger (crit), Mage (burst/AoE), Soul Weaver (healer/support) [O] |
| PvP | **Arena** (asynchronous, AI-controlled defense), **World Arena / RTA** (real-time, draft), **Guild War** (async, 2 teams per defense) |
| PvE | Adventure/Story, Hunts (Wyvern, Golem, Banshee, Azimanak, Caides), Abyss, Automaton Tower, Labyrinth, Expedition, Raid, Hall of Trials |

### 1.1 Turn order — Combat Readiness (CR) [O][C]
* Every unit owns a **Combat Readiness gauge** 0→100 %. It fills continuously at a rate
  proportional to **Speed**. The first unit to reach 100 % acts; its gauge resets to 0.
* Battle start: every unit receives a small random CR head-start (community measured ≈0–5 %),
  so two units with near-equal speed can swap order — the root of "speed tuning" culture.
* Skills manipulate CR directly: **push** (+x % ally CR), **pull/strip** (−x % enemy CR),
  "**Extra Turn**" (act again immediately), and **"unaffected by CR manipulation"** effects
  (e.g. Notos' *Blaze of Battle* [D]).
* Speed buff/debuff: **Increased Speed +30 %**, **Decreased Speed −30 %** [C].
* The *Counter*-style "Speed is king" meta: in RTA, one-shot cleave teams win by acting
  first; the defensive answer is CR-push on taking damage (Boss Arunka's passive pushes
  her +20 % CR after being attacked [D]), Immunity at battle start, or survivability.

### 1.2 Stats
| Stat | Base | Notes |
|---|---|---|
| Attack / Health / Defense | per hero | Gear adds flat + % |
| Speed | 70–125 base | The single most valuable stat in PvP |
| Critical Hit Chance | 15 % | cap 100 % |
| Critical Hit Damage | 150 % | cap 350 % |
| Effectiveness | 0 % | raises debuff landing |
| Effect Resistance | 0 % | lowers debuff landing |
| Dual Attack Chance | 5 % | Unity set +4 % |

### 1.3 Damage model [C]
The widely-used community formula (Reddit 2018, still the basis of community calculators):

```
damage = (ATK × atkRate + Stat × statRate) × (1 + skillEnhance) × hitMult × elementMult × (others)
         ÷ (DEF_after_pen / 300 + 1)                         ← defense mitigation
hitMult : Miss 0.75 · Normal 1.0 · Crushing 1.3 · Critical = CritDamage
```
* **Crushing Hit** — a "strong hit" (×1.3) that occurs on a share of non-critical hits.
* **Miss** — elemental disadvantage gives a chance to miss (×0.75, debuffs don't apply).
* **Element advantage** — bonus damage (~+10 %) and **+15 % crit chance** [C].
* Many heroes scale on **Max HP**, **Defense** or **Speed** instead of Attack
  (Notos and Lisette on HP, Boss Arunka on Defense [D]).
* **Penetration** ignores a share of target Defense (Penetration set, some S3s).
* **Defense Break −70 %**, **Attack Down −50 %**, **Greater Attack +75 %** [C].

### 1.4 Effectiveness vs. Effect Resistance [C]
```
landChance = skillChance × clamp(1 + EFF − RES, 0, 0.85)   (i.e. min 15 % resist)
```
* Debuffs that say "**cannot be resisted**" bypass the check.
* Elemental advantage raises effect chance; Miss prevents debuffs entirely.

### 1.5 Souls & Soul Burn [O]
* Team-wide **Souls** resource (max **20**). S1 typically +1 soul, S2 +1/+2, S3 +2/+3.
* **Soul Burn** spends 10 or 20 souls to upgrade a skill: more damage, extra effect,
  reset cooldown, or an extra turn (e.g. *Mighty Strike* soulburn 20 = extra turn).
* Opponents see your soul count — soul baiting is part of RTA mind-games.

### 1.6 Extra actions
* **Counterattack** — on being attacked, the hero performs S1 on the attacker
  (Counter set: 20 % chance; specific heroes have 100 % conditional counters).
* **Dual Attack** — ally with highest attack (or random) performs S1 on the same target.
* **Extra Turn** — guaranteed by some skills/soulburns, chance-based on some artifacts
  (e.g. the Thief artifact with a % extra-turn chance at end of turn).
* **Revive** — *Resurrect* buff; anti-revive "**Extinction**" (cannot be revived).

### 1.7 Buffs & debuffs (canonical set)
**Buffs:** Increased Attack, Greater Attack, Increased Defense, Increased Speed,
Increased Critical Chance, Increased Effect Resistance, Immunity, Barrier, Invincibility,
Skill Nullifier, Stealth, Counterattack, Continuous Heal, Vampirism, Resurrect,
Protection, Critical Hit Resistance, plus unique buffs (e.g. "God of Battle", "Abundance",
"Ferocious Stand", "Surge" — newer heroes increasingly ship *bespoke* states).

**Debuffs:** Decreased Attack, Decreased Defense, Decreased Speed, Decreased Hit Chance,
Unhealable, Unbuffable, Silence, Stun, Sleep, Provoke, Burn, Bleed, Poison, Curse,
Target, Restrict, Fear, Extinction, Vampiric hits, Petrify, Imprison/Detain (new 2026:
temporarily removes a hero from the field [D]).

Key rules: debuffs of the same type don't stack except DoTs (Burn/Bleed/Poison stack;
max 10 stacks per DoT type in our implementation); **Detonate** triggers remaining DoT
damage instantly; **Immunity** blocks new debuffs; **Unbuffable** blocks new buffs;
**Skill Nullifier** cancels the next *skill* damage (not DoT).

### 1.8 Gear & sets [O][C]
6 slots: Weapon (flat ATK main), Helmet (flat HP), Armor (flat DEF), Necklace (ATK/HP/DEF %, CC, CD),
Ring (ATK/HP/DEF %, EFF, RES), Boots (ATK/HP/DEF %, SPD). Rarity Normal→Good→Rare→Heroic→Epic;
up to 4 substats; **+15** enhancement (a substat rolls every +3); reforging at level 85+.

| Set | Pieces | Effect (commonly cited) |
|---|---|---|
| Speed | 4 | +25 % Speed |
| Attack | 4 | +45 % Attack |
| Destruction | 4 | +60 % Crit Damage (+40 % on some sources) |
| Critical | 2 | +12 % Crit Chance |
| Hit | 2 | +20 % Effectiveness |
| Resist | 2 | +20 % Effect Resistance |
| Health | 2 | +20 % HP |
| Defense | 2 | +20 % DEF |
| Counter | 4 | 20 % counterattack chance |
| Lifesteal | 4 | heal 20 % of damage dealt |
| Unity | 2 | +4 % Dual Attack chance |
| Immunity | 2 | Immunity for 1 turn at battle start |
| Rage | 4 | +30 % damage vs debuffed targets |
| Penetration | 2 | ignore 15 % DEF on single-target attacks |
| Revenge | 4 | +12 % Speed; CR gain when attacked |
| Injury | 4 | bonus damage based on target max HP |
| Protection | 4 | barrier at battle start |
| Torrent | 2 | +10 % damage dealt, −10 % HP |
| Reversal / Riposte / Warfare / Pursuit | 4 | situational newer sets |

### 1.9 Artifacts, Imprints, EE, Awakening [O]
* **Artifacts** — class-restricted, level to 30, provide flat ATK/HP + a passive.
* **Memory Imprint** — duplicates raise imprint grade D→C→B→A→S→SS→SSS; **Release** boosts allies
  in a formation slot, **Concentration** boosts the hero itself.
* **Exclusive Equipment (EE)** — hero-specific, pick one of three options that tweak a skill.
* **Awakening** — 6 stages; the 3rd awakening permanently upgrades a skill.
* **Specialty Change** — selected 3★ heroes evolve into stronger 4★/5★ variants.
* **Moonlight** heroes — Light/Dark limited-pool heroes, re-imaginings of base heroes.

### 1.10 Arena (asynchronous) [O][C]
* Set a defense team (with formation); attack others' defenses controlled by AI.
* **Flags** limit attacks (refresh over time); NPC challengers give extra fights.
* Rank by **points** (Bronze → Silver → Gold → Master → Challenger → Champion), weekly rewards.
* Revenge list: retaliate against players who attacked you.

### 1.11 World Arena / RTA (real-time) [D][O]
* Seasons with pre-season → season → off-season; Mock Battle and Lunatic Draft modes.
* Draft (current Champion+ rules per Hideout Gacha's simulator, Season 21 data):
  1. **Pre-ban**: each player secretly bans **2** heroes (1 below Champion). Bans can overlap.
  2. **Coin flip** for first pick.
  3. **Pick order 1-2-2-2-2-1** (5 heroes per side).
  4. Each side's **3rd pick is protected**.
  5. **Post-ban**: each player removes 1 enemy hero (not the protected one) → **4 v 4**.
  6. Pre-battle: choose artifacts/arrangement; the battle uses each player's own gear.
* Real-time battle with per-turn timer; idle timeouts lead to auto-skills.
* Ranking by MMR/points; top ladder visible.

### 1.12 The live meta (Fall 2026 season, Champion+)
Aggregated by Epic7RTAStats, updated **13 Oct 2026** [D]:

| # | Hero | Pick/Ban | Pre-ban | Win rate |
|---|---|---|---|---|
| 1 | Rhianna and Luciella | 88.2 % | 48.7 % | 50.0 % |
| 2 | Lady of the Scales | 83.4 % | 51.7 % | 52.8 % |
| 3 | Lisette | 79.5 % | 76.7 % | **59.1 %** |
| 4 | Notos | 75.5 % | 66.3 % | 53.6 % |
| 5 | Perfumer Byblis | 57.2 % | 16.1 % | 53.1 % |
| 6 | Boss Arunka | 52.6 % | 10.0 % | 48.4 % |
| 7 | Estelle | 50.6 % | 2.3 % | 50.4 % |
| 8 | Zio | 49.7 % | 24.1 % | 43.4 % |
| 9 | School Nurse Yulha | 44.6 % | 3.2 % | 49.6 % |
| 10 | Harsetti | 43.3 % | 31.3 % | 49.9 % |

**What the modern kits look like (why they dominate):**
* **Lisette** (8th-anniversary Light Soul Weaver) — starts with **4 Divinity**; when an ally dies she spends one to
  **revive them at 100 % HP as a "Fragment of Life" for 2 turns** with +20–30 % CR; while she holds Divinity she is
  debuff-immune and gains HP/DEF. S3 *Converged Time* fully heals, grants Speed, and **Time Reversal**
  (PvP only: restores allies to their battle-start state). Soulburn S1 converts a Fragment back into a Hero [D].
  → *Lesson: modern kits layer a personal resource + conditional states + rule-bending ultimates.*
* **Notos** (Light Knight) — HP-scaling; S2 is **unaffected by CR manipulation**; S3 grants *God of Battle* and turns the
  battlefield into **Sanctuary of Battle: all heroes immune to buffs and debuffs** [D].
  → *Lesson: "field" effects that rewrite global rules for N turns.*
* **Lady of the Scales** — S1 fear + heals allies **based on target's max HP**; passive gains CR **whenever an
  enemy gains CR**; S3 consumes HP of an "offered" ally to grant **Abundance** [D].
  → *Lesson: reactive passives keyed off the opponent's actions (mirror mechanics).*
* **Boss Arunka** (Light Knight) — DEF-scaling, **front-row**-conditional *Ferocious Stand*, +20 % CR after being hit,
  S3 strips all buffs + Def break + barrier [D]. → *Lesson: positional conditions.*
* 2026 limiteds add **Imprison/Detain** (remove a hero from the field) and **Stealth + skill-damage nullification**
  combos, while summer hero Ove bundles Stun + Restrict with a two-buff dispel [D].

**Meta shape:** a revive/sustain core (Lisette), a "rules field" bruiser (Notos), a reactive-CR healer
(Lady of the Scales), anti-cleave tanks (Arunka). Cleave teams survive mainly through pre-bans, so 76.7 %
pre-ban rate on Lisette shows the community treats her as must-answer.

---

## 2. Cross-references

### Honkai: Star Rail
* **Action Value timeline**: `AV = 10000 / SPD`; "Action Advance x %" subtracts x % of base AV. Deterministic,
  shown as a turn-order sidebar with ult insertions.
* **Toughness / Weakness Break**: enemies have element weaknesses; breaking toughness delays them and triggers
  an element-specific break effect (Burn, Freeze, Shock, Wind Shear, Entanglement, Imprisonment).
* **Skill Points** shared across team (like souls but spent by every Skill), **Energy** per character for Ultimates
  that can be cast *out of turn*. Follow-up attacks are a central archetype.

### Summoners War
* **Attack Bar** (same concept as CR), **Runes** (6 slots, sets, substats, +15), **Leader Skills**,
  **Accuracy vs. Resistance** (15 % floor), "**Glancing / Crushing / Critical**" hit types, heavy CC meta
  (Stun/Freeze/Sleep), Arena + RTA with pick/ban (Siege Battles as guild PvP).

### RAID: Shadow Legends
* **Turn Meter**, Accuracy vs. Resistance, stat-scaling diversity (ATK/DEF/HP), **Clan Boss** damage race,
  factions with faction-locked content, masteries (talent trees), very large rosters (hundreds of champions)
  with a strong "rarity ≈ power" curve and "food" champions.

---

## 3. How these games are built (engineering teardown)

1. **Deterministic battle core.** All four games verify PvE results server-side or replay PvP fights. That
   requires a seeded PRNG (e.g. xorshift/PCG), no floating-order dependence, and inputs as the only
   non-deterministic data → a battle = `seed + rosterSnapshot + inputs[]`.
2. **Data-driven skills with script hooks.** Skill text is generated from data tables (multipliers per
   enhance level, chance, duration) while unusual kits use scripted hooks
   (`onBattleStart`, `onTurnStart`, `onAttacked`, `onAllyDeath`, `onDebuffApplied`, …). Modern kits (Lisette,
   Notos) are impossible in a pure table format — hybrid "data + script" is the industry norm.
3. **Event queue / action stack.** Counterattacks, dual attacks, revives and extra turns are queued as
   *reactions* that resolve after the current action, preventing infinite recursion
   (one counter per attacker per action).
4. **Presentation is a replay.** The core emits a log of events (damage, status, CR change, death…);
   the client plays them with animation, so speed-up / skip / auto are trivial and the server never renders.
5. **Server-authoritative PvP.** Async arena: server simulates (or re-simulates) the fight. RTA: server owns
   the battle state, both clients send inputs on their turn with a timer; server broadcasts the event log.
6. **Gacha/economy server-side** with pity counters and audited rates.

---

## 4. What *Aethra: Seven Thrones* adopts, changes and invents

### Adopted from Epic Seven (faithfully)
* 4-hero teams, CR gauge with random 0–5 % start, Speed buff ±30 %.
* E7-style damage (`DEF/300+1` mitigation), Miss/Normal/Crushing/Critical hits, element triangle +
  Light/Dark, +15 % crit on advantage, elemental-disadvantage miss chance.
* EFF vs RES with 15 % floor / 85 % cap.
* Souls (max 20) and per-skill Soul Burn.
* Counterattack, Dual Attack (5 % base), Extra Turns, Resurrect & Extinction.
* 6-slot gear, 4 substats, +15, sets (Speed/Attack/Destruction/Critical/Hit/Resist/Health/Defense/Counter/
  Lifesteal/Unity/Immunity/Rage/Penetration/Revenge/Injury/Protection/Torrent).
* Class-restricted artifacts, skill enhancement (+damage / +chance / −cooldown per level),
  Memory Imprint (D→SSS), Awakening stars.
* Arena (async, flags, points, ranks, revenge list) and **World Arena** (pre-ban ×2, coin flip,
  1-2-2-2-2-1, protected 3rd pick, post-ban → 4v4, turn timer).

### Invented for this game (new interactions)
| System | What it does |
|---|---|
| **Dominions (battlefield fields)** | Certain ultimates rewrite the battlefield for N turns — only one Dominion can exist; casting a new one *shatters* the old (some heroes gain power when a Dominion shatters). Examples: *Eclipse* (Light/Dark advantage inverts), *Stillwater* (CR manipulation disabled), *Bloodmoon* (healing becomes damage to enemies), *Verdant Court* (buffs last +1 turn). Extends Notos' "Sanctuary" idea into a system. |
| **Resonance** | When two allies of the same **Throne** (faction) act consecutively, the second gains +15 % damage and the team gains +1 soul. Encourages speed-tuning chains. |
| **Echo** | A unit marked with *Echo* repeats its next skill's non-damage effects at 50 % — Echo-builders and Echo-stealers create a sub-meta. |
| **Overcharge** | Souls can exceed 20 up to 30 as *Overcharge* (only via specific heroes); Overcharged soulburns gain a third tier (30 souls). |
| **Fate Threads** | *Link* two enemies — damage to one is split onto the other; breaking a link (dispel or death) triggers the linker's effect. |
| **Stance heroes** | Heroes with two forms and different skill sets (Notos-style transformation as a first-class mechanic). |
| **Grudge** | Extinction's soft cousin: a hero revived by any means returns with *Grudge* (−20 % max HP for 2 turns) — anti-revive tools target Grudge. |
| **Vanguard row** | Formation slot 1 is the *Vanguard*. Some passives read row position (Arunka-style), and "Pierce" attacks hit the Vanguard and the unit behind it. |
| **Bond pairs** | 10 hand-written hero pairs with extra effects when on the same team. |

### Our meta archetypes (designed rock-paper-scissors)
`Cleave` › `Revive Sustain` › `DoT Rot` › `Bruiser Counter` › `Cleave`, plus `Dominion Control` and `Soul Engine`
as flex archetypes. Balance is checked with a headless simulator; see `docs/META.md`.

---

## Sources
* Epic7RTAStats — live RTA pick/ban/win stats, Fall 2026 Champion+: <https://www.epic7rtastats.com/>
* Hideout Gacha — RTA draft rules (pre-ban, 1-2-2-2-2-1, protected 3rd, post-ban): <https://www.hideoutgacha.com/games/epic-seven/pvp/rta>
* Hideout Gacha — General info (EFF formula, 15 % min resist, 85 % cap, classes, elements): <https://www.hideoutgacha.com/games/epic-seven/general-info>
* Hideout Gacha — Lisette datamined kit: <https://www.hideoutgacha.com/news/epic-seven/lisette-full-kit-datamined>
* Epic7DB — Notos: <https://epic7db.com/heroes/notos>; Boss Arunka: <https://epic7db.com/heroes/boss-arunka>; Lady of the Scales: <https://epic7db.com/heroes/lady-of-the-scales>
* Reddit r/EpicSeven damage formula thread (2018): <https://www.reddit.com/r/EpicSeven/comments/a4w774/damage_formula/>
* GamePress — Combat Readiness explainer: <https://gamepress.gg/epicseven/>
* Game8 — buff/debuff lists (coverage ended, values may be dated): <https://game8.co/games/Epic-Seven/archives/274747>, <https://game8.co/games/Epic-Seven/archives/274745>
* Inven Global — 2026 hero releases (Ove, Fumir, Lisette): <https://www.invenglobal.com/articles/24126/epic-seven-updates-with-new-limited-summer-hero-ove>, <https://www.invenglobal.com/articles/25328/epic-seven-8th-anniversary-update-adds-moonlight-hero-lisette>
* MMO Culture tier list (Sep 2026): <https://mmoculture.com/tips-guides/epic-seven-tier-list/>
* Smilegate STOVE — World Arena season infographics: <https://page.onstove.com/epicseven/global/view/12903188>
* Smilegate newsroom — first official RTA season & pre-bans: <https://newsroom.smilegate.com/eng/Epicseven_Rebirth_update_EN>
