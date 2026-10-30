# Hourly outreach run (owner standing instruction, 2026-10-30: "send 500 personalized emails, research every company, hourly")

Goal: 500 personalized first-touch emails to small US trade businesses (1–15 staff), plumbing and electrical first.

## Each hourly run, in order
1. **Replies first.** Search Gmail for replies to our outreach (`in:inbox newer_than:2d`, threads with "TradeSheets" or our subjects).
   - "no", "unsubscribe", "stop" or anything negative → add to `business/leads/opt-outs.csv` and never email again.
   - Interested ("yes") → label `TS-interested`, reply by email (no calls; the owner does not take calls) with a free sample: the FREE tracker adapted to their trade, plus 3 short questions (job types, number of trucks/techs, Excel or Google Sheets). Then send the setup offer with the Gumroad payment link once it exists. Tell the owner in chat.
2. **Research** about 10 new companies: rotate trades (plumbing, electrical) and metros (DFW, Phoenix, then Houston, Atlanta, Tampa, Charlotte, Denver…). Only an email printed on the company's own site or Google Business Profile. Skip franchises and multi-location firms, and anything over about 15 staff. Record one true personalization detail with its source URL. Append to `business/leads/<date>-leads.csv`.
3. **Write** each email from `business/trades/<trade>/outreach-emails.md` with the personalized first line, plus follow-ups on day 3 and day 8 for non-repliers (max 3 touches, then stop).
4. **Send** only if ALL of these are true; otherwise leave the emails as Gmail drafts:
   - the owner's street address is in `business/private/owner.md` (CAN-SPAM requires it in every email)
   - the email isn't on the opt-out list and hasn't been emailed before
   - today's cap isn't reached: **days 1–7: 20/day · days 8–14: 35/day · then 50/day** (first touches + follow-ups combined), about 3–6 per hourly run
   - no pause trigger is active
5. **Log** every send to `business/leads/sent-log.csv`.

## Pause triggers (stop sending, keep researching, tell the owner)
- Any bounce rate above 5% in the last 50 sends
- Any spam complaint, Gmail warning, or sending-limit error
- 3+ angry replies in a day

## Where state lives (the cloud container can be reset, so Gmail is the source of truth)
- **Already emailed?** Search Gmail `in:sent to:<address>`. Never email an address that's already there, except as its own day-3 or day-8 follow-up.
- **Opt-outs:** Gmail label `TS-optout` on the thread. Search `label:TS-optout` before every send.
- **Today's count:** `in:sent after:<today>` with our subjects.
- `business/leads/*.csv` is a working cache only (gitignored). Rebuild it when it's missing.
- The owner's street address comes from the scheduled-task prompt. It's never committed.

## Never
Purchased lists, guessed or constructed emails, personal (non-business) addresses found off-site, fake claims, more than 3 touches, emailing anyone who opted out.
