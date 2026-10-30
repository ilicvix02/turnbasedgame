# TradeSheets email templates (v2): aggressive and honest

Every outreach email includes: the website link, the hosted preview image (linked to the website), and two answer buttons (**I want it** / **Not interested**). Every email is sent as HTML with a plain-text alternative.

## Constants
- SITE = https://claude.ai/artifact/MWmW8WZHKwMAxpy9sgmLiR  (owner must set Share → "anyone with the link")
- IMG  = https://raw.githubusercontent.com/ilicvix02/turnbasedgame/claude/bold-tesla-qg7syv/business/email-assets/preview-900.jpg
- FROM_ADDR = ilicvix@gmail.com
- POSTAL = Kajmakcalanska 21/1, 11420 Smederevska Palanka, Serbia
- SPOTS_LEFT = 5 minus paid founding clients (read `business/metrics/outreach-stats.md`). Never round down to fake scarcity. When it hits 0, drop the founding line and quote $250.
- YES_LINK = `mailto:ilicvix@gmail.com?subject=YES%20-%20send%20the%20free%20trial%20pack%20({COMPANY_URLENC})`
- NO_LINK  = `mailto:ilicvix@gmail.com?subject=NO%20-%20not%20interested%20({COMPANY_URLENC})`

## Honesty rules (aggressive ≠ deceptive)
Allowed: blunt subject lines, loss framing with transparent arithmetic, true scarcity (founding spots), strong single CTA, persistent but finite follow-up.
Never: fake deadlines or countdowns, invented stats, testimonials or case studies, "Re:"/"Fwd:" on a first touch, fake familiarity, claiming you've worked with them, threats or shaming.

---

## T1: First touch

**Subjects** (rotate A/B; log which one was used):
- Plumbing A: `you're probably giving away parts` · B: `which job lost you money last month?`
- Electrical A: `are your jobs running past the bid?` · B: `which job lost you money last month?`

**Preheader (hidden):** 3 free job-costing tools for {COMPANY}. One click to claim.

**HTML body:**
```html
<div style="display:none;max-height:0;overflow:hidden;">3 free job-costing tools for {COMPANY}. One click to claim.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f5f8;padding:16px 0;font-family:Arial,Helvetica,sans-serif;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;">
<tr><td style="padding:24px 28px 8px;color:#16222c;font-size:16px;line-height:1.55;">
<p style="margin:0 0 14px;">Hi {GREETING},</p>
<p style="margin:0 0 14px;">{OPENER}</p>
<p style="margin:0 0 14px;">{HOOK}</p>
<p style="margin:0 0 14px;">I build job-costing and cash-flow systems for {TRADE_PLURAL}: every receipt, labor hour and truck-stock part tied to a job, so the losing jobs show up <b>this week</b>, not at tax time. Done for you in 48 hours, Excel or Google Sheets.</p>
<p style="margin:0 0 6px;"><b>I'll send you 3 tools free</b>: a job profit calculator, a 90-day cash-flow forecaster and an unbilled-parts tracker. Yours to keep either way.</p>
</td></tr>
<tr><td style="padding:8px 28px;">
<a href="{SITE}"><img src="{IMG}" width="544" alt="TradeSheets: know which jobs make you money (click to see the page)" style="display:block;width:100%;max-width:544px;height:auto;border:0;border-radius:8px;"></a>
</td></tr>
<tr><td align="center" style="padding:18px 28px 6px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding:6px;"><a href="{YES_LINK}" style="display:inline-block;background:#ffcf4a;color:#1a1000;font-weight:bold;font-size:16px;text-decoration:none;padding:14px 26px;border-radius:999px;">✔ I want it</a></td>
<td style="padding:6px;"><a href="{NO_LINK}" style="display:inline-block;background:#d6e0e8;color:#33414d;font-weight:bold;font-size:16px;text-decoration:none;padding:14px 26px;border-radius:999px;">Not interested</a></td>
</tr></table>
<p style="margin:10px 0 0;font-size:13px;color:#5b6b78;">One click opens a pre-written reply. Just hit send. Or see everything first: <a href="{SITE}" style="color:#007a9e;">the full page</a>.</p>
</td></tr>
<tr><td style="padding:16px 28px 24px;color:#16222c;font-size:15px;line-height:1.55;">
<p style="margin:0 0 14px;">Viktor Ilic<br>TradeSheets</p>
<p style="margin:0;font-size:14px;"><b>P.S.</b> {PS}</p>
</td></tr>
<tr><td style="padding:14px 28px;background:#f7f9fb;color:#7a8894;font-size:12px;line-height:1.5;">
TradeSheets · {POSTAL}<br>You're getting this because {COMPANY} lists this address on its website. Click "Not interested" or reply "no" and you'll never hear from me again.
</td></tr>
</table></td></tr></table>
```

**Plain-text alternative:** same words; buttons become "Reply YES for the free tools, or NO and I won't email again." Website: {SITE}

**Fill-ins:**
- GREETING: owner first name if their own site names them as owner; otherwise "{COMPANY} team"
- OPENER: one true, specific line from their site (source URL logged)
- HOOK (plumbing): `Quick math: miss billing one $40 part a week and that's $2,080 a year walking out of your trucks. Most shops can't say how many parts went unbilled last month.`
- HOOK (electrical): `Quick math: a job bid at 40 hours that runs to 46 costs you 6 hours of labor. At $42 an hour loaded, that's $252 gone, and it repeats on the next job unless you see it while it's happening.`
- PS (while founding spots remain): `I'm taking 5 founding clients at $150 instead of $250 for the full custom setup. {SPOTS_LEFT} left right now.`
- PS (after): `The free tools are yours whether or not you ever buy anything.`

---

## T2 / T3: Follow-ups for non-repliers (same thread, max 2)

**T2, day 3:** subject: reply in the original thread
> Hi {GREETING}, one tip whether or not we talk: price truck-stock parts at **replacement** cost, not what you paid last time. Otherwise every supplier price increase comes out of your margin. The 3 free tools are still yours if you want them: [✔ I want it]({YES_LINK}) · [Not interested]({NO_LINK}). Viktor

**T3, day 8 (last):**
> Hi {GREETING}, last note from me. If knowing your profit per job ever becomes a priority, the page is here: {SITE}. [✔ Send me the free tools]({YES_LINK}). Either way, I won't email again. Viktor

(Electrical T2 tip: `Track labor hours against the bid every week, not at the end. Halfway through a job you can still raise a change order. At the end, you just eat it.`)

Both follow-ups keep the image off (lighter, more personal) but include the link, the buttons and the footer.

---

## A-series: people who clicked "I want it" / replied YES (max 4 emails)

**A1, within the hour, reply in their thread.** Attach the 3 files from `business/email-assets/trial-pack/`.
> Subject: Re: (their subject)
> Hi {GREETING},
>
> Here are your 3 tools, attached:
> 1. **Job Profit Snapshot**: put in one recent job and see what it really made after overhead.
> 2. **90-Day Cash Flow Forecaster**: shows the week your balance would dip, before it happens.
> 3. **Truck Stock & Unbilled Parts Tracker**: log what leaves the truck and see what never got invoiced.
>
> Start with #1 on your last finished job. It takes 5 minutes, and it usually surprises people.
>
> If you want the full system built around **your** business, answer these 3 and I'll send a sample of your setup:
> 1. Your main job types (e.g. service calls, water heaters, repipes / panels, new construction)
> 2. How many trucks or techs
> 3. Excel or Google Sheets?
>
> Viktor Ilic, TradeSheets
> {POSTAL}

**A2, day 2 (if no answers yet):**
> Hi {GREETING}, did you get a chance to run a job through the Profit Snapshot? The number to look at is **Net margin** in the Actual column. If it's red, the job made less than your target after overhead. Send me those 3 answers and I'll build the full version around your jobs: {SITE}. Viktor

**A3, day 5 (offer):**
> Hi {GREETING}, here's the offer. I build your complete system (job dashboard, cost log, 12-month cash flow, true margin after overhead, change orders) set up with your job types and logo, in 48 hours. The founding price is **$150** (normally $250), and {SPOTS_LEFT} of 5 spots are left. Reply **BUILD IT** and I'll send a secure payment link. Viktor

**A4, day 10 (last):**
> Hi {GREETING}, I'll close your file after this one so I'm not crowding your inbox. The tools are yours to keep. If you want the full build later, just reply BUILD IT, any time. Viktor

Stop the A-series immediately on: a purchase, a NO, any request to stop, or BUILD IT (switch to fulfillment).

---

## Replies → labels (tracking)
| Reply | Label | Action |
|---|---|---|
| Subject starts "YES", or the body says yes / want it / send it | `TS-interested` | Send A1 within the hour. Tell the owner in chat. |
| Subject starts "NO", or the body says no / not interested / stop / unsubscribe / remove | `TS-optout` | Never email again. No confirmation email. |
| "BUILD IT" or asks to buy | `TS-interested` + `TS-buyer` | Tell the owner right away (payment link needed). |
| Question | `TS-interested` | Answer honestly, by email. |
| Angry | `TS-optout` | Never email again. Counts toward the pause trigger. |
| Bounce | `TS-bounced` | Remove. Counts toward the pause trigger. |

Every sent first touch gets the label `TS-outreach`, so `label:TS-outreach` = all prospects.
