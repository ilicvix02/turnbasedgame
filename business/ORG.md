# TradeSheets org chart: 50 agents, 8 departments

The owner sits above the CEO and holds everything that touches money, accounts or publishing.

```
owner (human)
  └─ ceo
    └─ coo
      └─ research-director
        └─ demand-scout
        └─ competitor-analyst
        └─ keyword-researcher
        └─ community-listener
        └─ pricing-analyst
      └─ product-director
        └─ product-builder
        └─ spreadsheet-qa
        └─ formula-auditor
        └─ template-docs-writer
        └─ compatibility-tester
        └─ roadmap-planner
        └─ feature-request-triager
      └─ cmo
        └─ content-engine
        └─ listing-writer
        └─ seo-strategist
        └─ youtube-scriptwriter
        └─ short-form-planner
        └─ reddit-strategist
        └─ forum-answer-drafter
        └─ email-marketer
        └─ visual-brief-designer
        └─ pinterest-planner
      └─ sales-director
        └─ gumroad-manager
        └─ etsy-manager
        └─ bundle-designer
        └─ upsell-optimizer
        └─ launch-coordinator
      └─ support-lead
        └─ support-drafter
        └─ refund-reviewer
        └─ review-requester
        └─ faq-maintainer
    └─ cfo
      └─ ops-analyst
      └─ bookkeeper
      └─ revenue-forecaster
      └─ experiment-analyst
      └─ cost-controller
    └─ chief-of-staff
    └─ compliance-director
      └─ platform-policy-checker
      └─ honesty-reviewer
      └─ ip-licensing-checker
      └─ privacy-guard
```

| Department | Agents | Writes to |
|---|---|---|
| Executive | 4: ceo, coo, cfo, chief-of-staff | `business/exec/` |
| Research | 6: research-director, demand-scout, competitor-analyst, keyword-researcher, community-listener, pricing-analyst | `business/research/` |
| Product | 8: product-director, product-builder, spreadsheet-qa, formula-auditor, template-docs-writer, compatibility-tester, roadmap-planner, feature-request-triager | `business/products/ and business/product-docs/` |
| Content & Marketing | 11: cmo, content-engine, listing-writer, seo-strategist, youtube-scriptwriter, short-form-planner, reddit-strategist, forum-answer-drafter, email-marketer, visual-brief-designer, pinterest-planner | `business/content/ and business/marketing/` |
| Sales & Channels | 6: sales-director, gumroad-manager, etsy-manager, bundle-designer, upsell-optimizer, launch-coordinator | `business/sales/` |
| Customer Success | 5: support-lead, support-drafter, refund-reviewer, review-requester, faq-maintainer | `business/support/` |
| Finance & Analytics | 5: ops-analyst, bookkeeper, revenue-forecaster, experiment-analyst, cost-controller | `business/metrics/` |
| Legal & Trust | 5: compliance-director, platform-policy-checker, honesty-reviewer, ip-licensing-checker, privacy-guard | `business/trust/` |

## How it runs
Claude Code subagents can't spawn other subagents, so the **main session acts as the CEO's hands**: it reads the CEO's plan and calls each agent in turn. The weekly scheduled run follows this order:
1. **Monday:** ops-analyst → bookkeeper → cfo → ceo (weekly plan) → coo (task board).
2. **Departments** run only the tasks on the board. Most agents are idle most weeks, and that's intended. Agents for channels and products that don't exist yet stay idle until they do.
3. **Review gate:** product work passes spreadsheet-qa + formula-auditor. All outward copy passes honesty-reviewer + platform-policy-checker → compliance-director.
4. **Hand-off:** chief-of-staff writes `business/outbox/this-week.md`. The owner does the human steps and drops exports into `business/metrics/`.

Enable them: `mkdir -p .claude/agents && cp business/agents/*.md .claude/agents/`.
Regenerate after editing roles: `python3 business/scripts/build_org.py`.

## Rules for every agent
- You draft and prepare. Only the owner publishes, posts, uploads, sends, pays or opens accounts. Put those steps in `business/outbox/this-week.md`.
- No fake reviews, testimonials, personas, sales numbers or scarcity. Cite only sources you opened.
- $0 spend unless the CFO approves after $1,000 profit.
- Keep personal data out of git.
