# Hourly website outreach run (owner's standing instruction, 2026-10-30: build custom websites and send emails, recurring)

**Owner does no work.** Claude runs everything 24/7. Owner decisions (2026-10-30): keep the 50% deposit (no pay-on-launch), plumbing and electrical only, no marketplaces, no calls.
- **Payment:** PayPal.me link **https://www.paypal.me/viktor0702**, with the amount in the URL (`/150USD`). Founding Starter $299 = $150 deposit + $149 at launch. Regular Starter $399 = $200 + $199. Pro founding $699 = $350 + $349.
  - PayPal notices go to the owner's other address (ilicv891@gmail.com), which Claude can't read. Proof of payment is EITHER a PayPal "You've got money" email forwarded into ilicvix@gmail.com (from service@paypal.com, naming the amount and the client's note) OR the owner confirming "paid" in chat. A client's own receipt or transaction ID alone is not proof.
  - When a client says they paid and there's no forwarded notice: ask for their PayPal transaction ID, tell the owner in chat ("{company} says they paid $X, transaction ID ..., please confirm"), and wait.
  - Start the build only after the deposit is proven. Ask the client to put their company name in the PayPal note.
  - Release the site files only after the final payment is proven the same way. Tell the owner in chat when each payment arrives.
- **Drafts:** show clients their draft as screenshots in the email (desktop + phone), never a public link to the files.
- **Launch:** the client hosts the site themselves. Email them a step-by-step for a free Netlify account and Netlify Drop (drag the site folder in), sent as a .zip only after the final payment, then DNS steps for their registrar. No owner involvement.

Offer: custom website for small US trade businesses (see OFFER.md). Every email carries that company's own demo inside it.

## Each run, in order
1. **Replies first, every run, 24/7.** Search Gmail for replies to TradeSheets outreach. Answer interested replies within the hour.
   - "no", stop, unsubscribe, or anything angry → label `TS-optout`. Never email again.
   - YES / interested → label `TS-interested`, reply with the questionnaire (client-emails.md W1 + intake-questionnaire.md), and tell the owner in chat.
   - Questionnaire answers in → continue the project flow (W2–W7) and build the real site per build-playbook.md.
2. **Queue.** Prospects with a built preview (`business/webdev/prospects/*.json` + `previews/<slug>/`) that haven't been emailed (check Gmail `in:sent to:<email>` and `label:TS-outreach`). Order: broken or hacked sites first, then dated sites, then the rest. Remaining ready on 2026-10-30: saltside-electric, pv-plumbing-services, knights-plumbing, maynard-electric, texas-pride-plumbing, choice-plumbers, space-city-plumbing, tower-plumbing, acme-electrical-services, fox-electrical-services, howards-electrical, second-opinion-electric, brick-plumbing, all-the-time-plumbing, lindsay-plumbing, safecircuit-electric, family-plumbing-cypress, we-the-plumbers, lightning-bay-electric, tailwind-electric, supercharged-electric, apollo-electric, gideon-electric, hendersons-electric-solutions, the-wire-guy-electric, 1twenty-electric.
   When the queue runs low (under 5), research up to 5 new small plumbing/electrical companies in a new US metro (own website only, real facts only, an email printed on their site), write the prospect JSON (schema: just-right-electric.json; rotate the `theme` across the 6 designs), and run `build_preview.py`. If their current site is hacked or broken, verify it yourself with curl, then add a short, helpful `site_note`.
3. **Publish + render.** Run `python3 business/scripts/audit_site.py <slug>` (current-site audit), then `build_preview.py`, then `python3 business/scripts/publish_previews.py <slug>` and push **/home/user/tradesheets-previews** (the dedicated, owner-created public previews repo: watermarked, noindex sites and images only, never research JSON). Then run `python3 business/scripts/render_email.py <slug>` (full-website email: images plus a "See your full website" button pointing at https://ilicvix02.github.io/tradesheets-previews/<slug>/).
   Before sending, confirm the site URL returns 200. If GitHub Pages isn't on yet (404), send with `--html-only` instead, or hold.
   **Never commit or push prospect research (prospects/*.json) or previews into the turnbasedgame repo.**
4. **Send** (first touches only during US business hours, Mon–Fri 8am–5pm Central; replies and project emails any time) the rendered previews/<slug>/email.html, plus email.txt as plain text, to email.json "to", with that subject. Rules:
   - **Never email anyone already contacted.** Owner instruction, 2026-10-30: no follow-ups or second pitches to earlier recipients. That covers Andress, Blue Moon, Brooks, Flow Bros, Just Right, P&P, NCT and Shalom, plus anyone under `label:TS-outreach`. Only reply if *they* write first.
   - Check `label:TS-optout` and `in:sent to:<address>` first.
   - Daily cap (all outreach combined): 20/day until 2026-11-06, 35/day until 2026-11-13, then 50/day. About 3–6 per run.
   - Label every sent first touch `TS-outreach`.
5. **Track.** Update the counts only (no names) in business/metrics/outreach-stats.md, then commit and push that file alone.

## Pause sending (keep building) if
A bounce rate above 5%, any spam complaint or Gmail warning, or 3+ angry replies in a day. Tell the owner.

## Never
Invent facts, reviews or credentials on a preview. Offer downloads of the preview. Send the preview HTML. Email a company that opted out. Make phone calls.
