# Aethra: Seven Thrones

A full turn-based hero-collector RPG modelled on how *Epic Seven* works, with its own heroes, meta and new mechanics. It has accounts, a story intro and tutorial, a 50-stage campaign, async Arena, and a live RTA World Arena with draft and bans. Battles render in real-time 3D (three.js).

## Features
- **60 playable heroes** across seven Thrones, plus 12 monsters and 5 bosses. Every hero is a 3D model assembled in code from CC0 Quaternius bodies and outfits, with its own recolour, weapons, headwear, wings, capes and particle aura. Kits are in [docs/HEROES.md](docs/HEROES.md).
- **The Epic Seven core loop**: combat readiness, the 1.871 damage formula, the element triangle plus Radiant/Umbral, effectiveness and resistance (85% cap, 15% floor), souls and soul burn, counters, dual attacks, extra turns, revives, gear sets and substats, artifacts, imprints, awakening, skill enhancement and summon pity.
- **New mechanics**: Dominions (battlefield fields), Resonance, Echo, Overcharge, Fate Threads, Grudge, Vanguard/Pierce, stance heroes, and Tide of Ruin (an anti-stall timer).
- **Modes**: intro and tutorial, 5 chapters / 50 stages with story and bosses, Arena (Elo, defense teams, flags), and RTA (pre-ban 2, 1-2-2-2-2-1 picks, protected pick, post-ban 1, 30s timer, lockstep battle, bot fallback).
- **Server-authoritative**: the deterministic engine (seeded RNG) is shared by client and server. The server re-simulates every battle from its seed and inputs to verify the result.
- **Meta derived from simulation**: [docs/META.md](docs/META.md). In-game tiers are generated from win rates.

## Run
```bash
npm install
npm run build      # client → dist/client, server → dist/server.mjs
npm start          # http://localhost:8787  (env: PORT, DB_FILE, CLIENT_DIR, RTA_BOT_WAIT_MS)
```
Dev mode with hot reload: `npm run dev`. Docker: `docker build -t aethra . && docker run -p 8787:8787 -v aethra:/data aethra`.

Sign-ups are real: any player who can reach the server can register. To open it to the public, deploy the Docker image to any Node host (Fly.io, Render, a VPS).

## Develop
| Command | What |
|---|---|
| `npm test` | engine and end-to-end tests (auth, campaign, arena, RTA lockstep) |
| `npm run typecheck` | TypeScript |
| `npm run sim -- 1200 normal` | balance simulator → `docs/sim-results.json` |
| `npm run tiers` | regenerate `shared/meta/tiers.ts` from the sim |
| `npm run docs:heroes` | regenerate `docs/HEROES.md` |
| `npm run portraits` | pre-render hero portraits (needs `vite preview` on :4173) |

## Layout
- `shared/engine`: deterministic battle engine (battle, statuses, fields, sets, artifacts, AI)
- `shared/data`: heroes, monsters, bosses, campaign and story
- `shared/meta`: progression, profile, gacha, builds, draft rules, tiers
- `server/src`: HTTP API, SQLite (node:sqlite), scrypt auth, arena, RTA websocket
- `client/src`: UI screens, 3D hero pipeline (`g3d/`), battle view (`battle/`)
- `docs/RESEARCH.md`: the Epic Seven / HSR / Summoners War / RAID research this is built on

Asset credits: [CREDITS.md](CREDITS.md).
