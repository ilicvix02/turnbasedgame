# Hourly website outreach run (owner's standing instruction, 2026-10-30: build custom websites and send emails, recurring)

**Owner does no work.** Claude runs everything 24/7. Owner decisions (2026-10-30): keep the 50% deposit (no pay-on-launch), plumbing and electrical only, no marketplaces, no calls.
- **Payment:** use the owner's PayPal.me link from business/private/owner.md (PAYPAL_ME). If it's missing, send the proposal anyway, say "I'll send the secure payment link shortly", tell the owner in chat ONCE per client, and don't start the build until a deposit is possible.
- **Drafts:** show clients their draft as screenshots in the email (desktop + phone), never a public link to the files.
- **Launch:** the client hosts the site themselves. Email them a step-by-step for a free Netlify account and Netlify Drop (drag the site folder in), sent as a .zip only after the final payment, then DNS steps for their registrar. No owner involvement.

Offer: custom website for small US trade businesses (see OFFER.md). Every email carries that company's own demo inside it.

## Each run, in order
1. **Replies first, every run, 24/7.** Search Gmail for replies to TradeSheets outreach. Answer interested replies within the hour.
   - "no", stop, unsubscribe, or anything angry → label `TS-optout`. Never email again.
   - YES / interested → label `TS-interested`, reply with the questionnaire (client-emails.md W1 + intake-questionnaire.md), and tell the owner in chat.
   - Questionnaire answers in → continue the project flow (W2–W7) and build the real site per build-playbook.md.
2. **Build.** Take prospects that have a JSON but no email sent yet (`business/webdev/prospects/*.json`), or research up to 5 new ones (own website only, real facts only, an email printed on their site). For each:
   `python3 business/scripts/build_preview.py business/webdev/prospects/<slug>.json` then `python3 business/scripts/render_email.py <slug>`.
   Look at previews/<slug>/email.jpg once. Fix anything wrong (bad text, broken layout) before sending.
3. **Push before sending.** `git add business/webdev/prospects business/webdev/previews/*/email.jpg business/webdev/previews/*/email.json`, commit and push, because the email images load from GitHub.
4. **Send** (first touches only during US business hours, Mon–Fri 8am–5pm Central, when owners read email; replies and project emails any time) the rendered previews/<slug>/email.html (+ email.txt as plain text) to email.json "to", with that subject. Rules:
   - Check `label:TS-optout` and `in:sent to:<address>` first.
   - Companies already emailed the spreadsheet offer (Andress, Blue Moon, Brooks, Flow Bros): send the website email **as a reply in their existing thread**, no sooner than 3 days after the first email (on or after 2026-11-02).
   - Daily cap (all outreach combined): 20/day until 2026-11-06, 35/day until 2026-11-13, then 50/day. About 3–6 per run.
   - Label every sent first touch `TS-outreach`.
5. **Track.** Update counts in business/metrics/outreach-stats.md, commit and push.

## Pause sending (keep building) if
A bounce rate above 5%, any spam complaint or Gmail warning, or 3+ angry replies in a day. Tell the owner.

## Never
Invent facts, reviews or credentials on a preview. Offer downloads of the preview. Send the preview HTML. Email a company that opted out. Make phone calls.
