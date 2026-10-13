// Generates docs/HEROES.md — every hero's full kit, straight from the game data.
import '../shared/data/index';
import { PLAYABLE, THRONE_NAMES, ELEMENT_NAMES, CLASS_NAMES } from '../shared/data/index';
import { HERO_TIER, HERO_TIER_LETTER } from '../shared/meta/tiers';
import { writeFileSync } from 'node:fs';

const heroes = PLAYABLE().sort((a, b) => a.throne.localeCompare(b.throne) || b.rarity - a.rarity || a.name.localeCompare(b.name));
let md = `# Hero Encyclopedia\n\n${heroes.length} playable heroes across seven Thrones. Generated from \`shared/data/heroes/*\` by \`npm run docs:heroes\`.\nTier = win rate in the balance simulator (see [META.md](META.md)).\n\n`;
md += '| Hero | ★ | Element | Class | Throne | Role | Tier |\n|---|---|---|---|---|---|---|\n';
for (const h of heroes) md += `| [${h.name}](#${h.id}) | ${h.rarity} | ${ELEMENT_NAMES[h.element]} | ${CLASS_NAMES[h.cls]} | ${THRONE_NAMES[h.throne]} | ${h.role} | ${HERO_TIER_LETTER[h.id] ?? '-'} (${HERO_TIER[h.id] ?? '-'}%) |\n`;
let throne = '';
for (const h of heroes) {
  if (h.throne !== throne) { throne = h.throne; md += `\n## ${THRONE_NAMES[throne]}\n`; }
  md += `\n### <a id="${h.id}"></a>${h.name} — *${h.title}*\n${'★'.repeat(h.rarity)} · ${ELEMENT_NAMES[h.element]} ${CLASS_NAMES[h.cls]} · ${h.role} · archetypes: ${h.archetypes.join(', ') || '—'}\n\n> ${h.tagline}\n\n`;
  for (const s of h.skills) {
    md += `- **${s.slot.toUpperCase()} · ${s.name}**${s.form ? ` *(${s.form} form)*` : ''} — ${s.passive ? 'Passive' : s.cd ? `Cooldown ${s.cd}` : 'No cooldown'}${!s.passive ? `, +${s.souls} soul` : ''}\n  ${s.desc}\n`;
    if (s.soulburn) md += `  *Soul Burn (${s.soulburn.cost}):* ${s.soulburn.desc}\n`;
  }
  md += `\n*Imprint ${h.imprint.kind}:* ${h.imprint.stat.toUpperCase()} · *Lore:* ${h.lore}\n`;
}
writeFileSync('docs/HEROES.md', md);
console.log('wrote docs/HEROES.md');
