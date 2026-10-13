# Meta Report

Generated from `docs/sim-results.json` (1200 random 4v4 battles, normal AI, reference endgame builds) by `npx tsx scripts/sim.ts`. Tiers in-game come from these win rates.

## Archetype matchups (row vs column win rate)

| | Cleave | Revive Sustain | DoT Rot | Bruiser Counter | Dominion Control | Soul Engine |
|---|---|---|---|---|---|---|
| **Cleave** | — | 31% | 100% | 38% | 94% | 100% |
| **Revive Sustain** | 75% | — | 19% | 100% | 88% | 63% |
| **DoT Rot** | 6% | 81% | — | 31% | 6% | 38% |
| **Bruiser Counter** | 69% | 0% | 63% | — | 13% | 56% |
| **Dominion Control** | 13% | 25% | 100% | 69% | — | 69% |
| **Soul Engine** | 6% | 38% | 75% | 19% | 19% | — |

Overall: Cleave 73% · Revive Sustain 69% · DoT Rot 33% · Bruiser Counter 40% · Dominion Control 55% · Soul Engine 31%

The intended loop: Cleave beats slow teams, Revive Sustain beats Cleave, Bruiser Counter punishes AoE, Dominion Control locks Bruisers, DoT Rot grinds Sustain.

## Hero win rates

| # | Hero | ★ | Games | Win rate |
|---|---|---|---|---|
| 1 | Seraphine | 5 | 164 | 74.4% |
| 2 | Arcanist Penumbra | 5 | 161 | 72.7% |
| 3 | Ignara | 5 | 179 | 72.1% |
| 4 | Nocturne Vael | 5 | 166 | 71.7% |
| 5 | Vulkar | 5 | 166 | 66.9% |
| 6 | Drakon | 5 | 158 | 66.5% |
| 7 | Tick & Tock | 5 | 167 | 65.3% |
| 8 | Brannoc | 4 | 163 | 65.0% |
| 9 | Orion Vex | 5 | 175 | 64.6% |
| 10 | Sable | 5 | 148 | 64.2% |
| 11 | Borea | 5 | 150 | 62.7% |
| 12 | Ragna | 5 | 152 | 62.5% |
| 13 | Professor Altair | 5 | 165 | 60.6% |
| 14 | Wren | 3 | 164 | 59.8% |
| 15 | Kaz | 4 | 176 | 59.1% |
| 16 | Aurel | 5 | 169 | 56.8% |
| 17 | Chronarch Ves | 5 | 162 | 56.8% |
| 18 | Nix | 4 | 163 | 56.4% |
| 19 | Thalia | 5 | 162 | 56.2% |
| 20 | Theodric | 4 | 152 | 55.3% |
| 21 | Fenra | 5 | 150 | 54.0% |
| 22 | Isolde | 5 | 176 | 53.4% |
| 23 | Myco | 4 | 157 | 52.9% |
| 24 | Bramblewitch Hesk | 5 | 160 | 51.9% |
| 25 | Ilyana | 5 | 143 | 50.3% |
| 26 | Caelum | 4 | 162 | 50.0% |
| 27 | Silvana | 4 | 129 | 48.8% |
| 28 | Elsbeth | 3 | 160 | 48.8% |
| 29 | Kael | 4 | 154 | 48.7% |
| 30 | Mordessa | 5 | 155 | 48.4% |
| 31 | Lilith | 4 | 159 | 47.8% |
| 32 | Solenne | 5 | 159 | 47.8% |
| 33 | Rexa | 4 | 168 | 47.0% |
| 34 | Grom | 4 | 160 | 46.9% |
| 35 | Ceres | 4 | 187 | 46.0% |
| 36 | Lyra | 4 | 156 | 45.5% |
| 37 | Gideon | 3 | 179 | 44.7% |
| 38 | Verity | 5 | 144 | 44.4% |
| 39 | Vesper | 3 | 156 | 44.2% |
| 40 | Count Orlov | 4 | 144 | 42.4% |
| 41 | Sir Osric | 4 | 173 | 41.6% |
| 42 | Halvard | 3 | 145 | 41.4% |
| 43 | Brakka | 4 | 154 | 40.9% |
| 44 | Pip | 3 | 154 | 40.9% |
| 45 | Anachron Zeph | 4 | 180 | 40.6% |
| 46 | Vega | 4 | 178 | 40.4% |
| 47 | Hearth-Mother Odda | 3 | 165 | 40.0% |
| 48 | Mirelle | 3 | 158 | 39.9% |
| 49 | Horologist Mira | 4 | 160 | 38.8% |
| 50 | Juno | 3 | 158 | 38.6% |
| 51 | Oakhart | 3 | 169 | 38.5% |
| 52 | Grimmald | 3 | 142 | 38.0% |
| 53 | Selene | 4 | 137 | 38.0% |
| 54 | Ilse | 3 | 136 | 36.8% |
| 55 | Sentinel Mk.II | 3 | 158 | 36.7% |
| 56 | Tobin | 3 | 164 | 36.6% |
| 57 | Nova | 3 | 147 | 35.4% |
| 58 | Yrsa | 4 | 151 | 33.8% |
| 59 | Lenny | 3 | 182 | 33.0% |
| 60 | Frida | 3 | 169 | 29.0% |
