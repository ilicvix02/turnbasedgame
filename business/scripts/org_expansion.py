"""The 450 agents that extend the 50-agent core org (build_org.py) to 500.

Service pivot: done-for-you spreadsheet/admin setup for small trade businesses.
- 20 trade pods x 14 roles = 280 (each pod specialises in one trade's costs, jargon and buyers)
- 50 metros x 3 roles + 5 regional directors = 155 (local lead research and outreach)
- 15 department heads, admin-ops and compliance roles
"""

WEB = "WebSearch, WebFetch, Read, Write"
DOC = "Read, Write, Edit, Glob, Grep"
BUILD = "Read, Write, Edit, Bash, Glob, Grep"
BROWSER = None  # no tools line: inherits all tools, incl. Claude in Chrome / computer use when connected

NEW_DEPTS = {
    "trades": ("Trade Pods", "business/trades/<trade>/"),
    "regional": ("Regional Ops", "business/regional/<metro>/ (leads: business/leads/, gitignored)"),
    "growth": ("Growth (lead gen, outreach, service sales)", "business/growth/"),
    "admin": ("Admin Ops (accounts, forms, payments, approvals)", "business/admin/ and business/approvals/"),
    "platforms": ("Freelance Platforms", "business/platforms/"),
}

# trade: (display, typical jobs, cost categories, key metric, classic money leak)
TRADES = {
    "roofing": ("Roofing", "tear-off and re-roofs, repairs, storm/insurance claims",
                "Labor, Shingles & materials, Dumpster & disposal, Permits, Subcontractors",
                "cost per square (100 sq ft)", "insurance-claim jobs paid months after the costs hit"),
    "plumbing": ("Plumbing", "service calls, water heaters, repipes, remodel rough-ins",
                 "Labor, Parts & fixtures, Truck stock, Permits, Subcontractors",
                 "revenue per service call and per truck", "parts pulled from truck stock and never billed"),
    "hvac": ("HVAC", "system installs, maintenance agreements, repairs",
             "Labor, Equipment (units), Materials, Permits, Subcontractors",
             "gross margin per install and agreement renewal rate", "seasonal cash swings between summer and shoulder months"),
    "electrical": ("Electrical", "panel upgrades, new-construction wiring, service calls, EV chargers",
                   "Labor, Wire & materials, Fixtures, Permits & inspections, Subcontractors",
                   "labor hours vs. bid", "failed or delayed inspections holding up final payments"),
    "general-contracting": ("General Contracting", "additions, new builds, commercial tenant improvements",
                            "Labor, Materials, Subcontractors, Equipment, Permits & fees",
                            "budget vs. actual by cost code", "sub invoices exceeding their budget unnoticed"),
    "remodeling": ("Remodeling", "kitchens, bathrooms, basements",
                   "Labor, Materials, Subcontractors, Dumpster, Permits",
                   "change-order capture rate", "change orders done but never billed"),
    "landscaping": ("Landscaping", "maintenance contracts, installs, hardscape",
                    "Labor, Plants & materials, Equipment & fuel, Disposal, Subcontractors",
                    "revenue per crew-hour", "fuel and equipment cost never allocated to jobs"),
    "concrete": ("Concrete", "driveways, slabs, foundations, flatwork",
                 "Labor, Concrete & rebar, Pump & equipment rental, Forms, Subcontractors",
                 "cost per cubic yard placed", "weather delays and short loads"),
    "painting": ("Painting", "interior/exterior residential, commercial repaints",
                 "Labor, Paint & supplies, Equipment & lifts, Subcontractors, Other",
                 "labor as % of contract", "underbidding prep time"),
    "flooring": ("Flooring", "hardwood, LVP and tile installs",
                 "Labor, Flooring material, Underlayment & supplies, Disposal, Subcontractors",
                 "installed cost per sq ft", "material waste overruns"),
    "carpentry": ("Carpentry", "framing, trim, cabinets, custom builds",
                  "Labor, Lumber, Hardware, Tools & equipment, Subcontractors",
                  "labor hours per job vs. bid", "lumber price swings between bid and build"),
    "drywall": ("Drywall", "hang, tape and finish, repairs",
                "Labor, Board & mud, Lifts & equipment, Subcontractors, Other",
                "cost per board / sq ft", "unpaid rework caused by other trades"),
    "masonry": ("Masonry", "brick, block, stone veneer, chimneys",
                "Labor, Brick/block/stone, Mortar & supplies, Scaffolding, Subcontractors",
                "cost per sq ft of wall", "scaffold rental days overrunning"),
    "fencing": ("Fencing", "residential wood/vinyl, chain-link, gates",
                "Labor, Fence materials, Concrete, Equipment (augers), Other",
                "cost per linear foot", "deposits too small to cover materials"),
    "decks": ("Decks & Outdoor Living", "decks, pergolas, porches",
              "Labor, Lumber/composite, Hardware & footings, Permits, Subcontractors",
              "margin per deck", "composite price changes after the bid"),
    "pools": ("Pools", "pool builds, renovations, service routes",
              "Labor, Equipment & chemicals, Materials, Subcontractors (excavation, electrical), Permits",
              "draw schedule vs. costs incurred", "big upfront costs before draws come in"),
    "solar": ("Solar", "residential installs, battery storage",
              "Labor, Panels & inverters, Racking & BOS, Permits & interconnection, Subcontractors",
              "cost per watt installed", "long gaps between install and final payment"),
    "cleaning": ("Commercial Cleaning", "recurring commercial contracts, move-out and deep cleans",
                 "Labor, Supplies, Equipment, Travel & fuel, Other",
                 "profit per contract per month", "underpriced recurring contracts"),
    "pest-control": ("Pest Control", "recurring service plans, termite treatments",
                     "Labor, Chemicals, Equipment, Vehicle, Other",
                     "revenue per route stop", "chemical cost creep"),
    "handyman": ("Handyman", "small repairs, punch lists, installs",
                 "Labor, Materials, Travel & fuel, Tools, Other",
                 "effective hourly rate per job", "drive time eating the margin"),
}

REGIONS = {"northeast": "Northeast", "southeast": "Southeast", "midwest": "Midwest",
           "southwest": "Southwest", "west": "West"}

# slug: (display, state, region)
METROS = {
    "new-york": ("New York", "NY", "northeast"), "los-angeles": ("Los Angeles", "CA", "west"),
    "chicago": ("Chicago", "IL", "midwest"), "dallas": ("Dallas-Fort Worth", "TX", "southwest"),
    "houston": ("Houston", "TX", "southwest"), "washington-dc": ("Washington", "DC", "northeast"),
    "philadelphia": ("Philadelphia", "PA", "northeast"), "miami": ("Miami", "FL", "southeast"),
    "atlanta": ("Atlanta", "GA", "southeast"), "boston": ("Boston", "MA", "northeast"),
    "phoenix": ("Phoenix", "AZ", "southwest"), "san-francisco": ("San Francisco", "CA", "west"),
    "riverside": ("Riverside-San Bernardino", "CA", "west"), "detroit": ("Detroit", "MI", "midwest"),
    "seattle": ("Seattle", "WA", "west"), "minneapolis": ("Minneapolis-St. Paul", "MN", "midwest"),
    "san-diego": ("San Diego", "CA", "west"), "tampa": ("Tampa", "FL", "southeast"),
    "denver": ("Denver", "CO", "west"), "baltimore": ("Baltimore", "MD", "northeast"),
    "st-louis": ("St. Louis", "MO", "midwest"), "orlando": ("Orlando", "FL", "southeast"),
    "charlotte": ("Charlotte", "NC", "southeast"), "san-antonio": ("San Antonio", "TX", "southwest"),
    "portland": ("Portland", "OR", "west"), "sacramento": ("Sacramento", "CA", "west"),
    "pittsburgh": ("Pittsburgh", "PA", "northeast"), "austin": ("Austin", "TX", "southwest"),
    "las-vegas": ("Las Vegas", "NV", "west"), "cincinnati": ("Cincinnati", "OH", "midwest"),
    "kansas-city": ("Kansas City", "MO", "midwest"), "columbus": ("Columbus", "OH", "midwest"),
    "indianapolis": ("Indianapolis", "IN", "midwest"), "cleveland": ("Cleveland", "OH", "midwest"),
    "san-jose": ("San Jose", "CA", "west"), "nashville": ("Nashville", "TN", "southeast"),
    "virginia-beach": ("Virginia Beach", "VA", "southeast"), "providence": ("Providence", "RI", "northeast"),
    "jacksonville": ("Jacksonville", "FL", "southeast"), "milwaukee": ("Milwaukee", "WI", "midwest"),
    "raleigh": ("Raleigh", "NC", "southeast"), "oklahoma-city": ("Oklahoma City", "OK", "southwest"),
    "memphis": ("Memphis", "TN", "southeast"), "richmond": ("Richmond", "VA", "southeast"),
    "louisville": ("Louisville", "KY", "southeast"), "new-orleans": ("New Orleans", "LA", "southeast"),
    "salt-lake-city": ("Salt Lake City", "UT", "west"), "hartford": ("Hartford", "CT", "northeast"),
    "buffalo": ("Buffalo", "NY", "northeast"), "birmingham": ("Birmingham", "AL", "southeast"),
}

GATE = "Before acting, follow business/org/APPROVALS.md: no signed approval, no action."

# name, dept, reports_to, tools, description, duties, output
EXTRAS = [
    ("head-of-trades", "trades", "coo", DOC,
     "Runs the 20 trade pods and decides which trades get active outreach each month.",
     ["Rank trades by replies, calls booked and clients won (from crm-keeper). Keep at most 3 pods active at a time.",
      "Make sure every pod's spreadsheet build passes its QA tester before delivery.",
      "Move what one pod learns (a winning email angle, a common request) to the other pods."],
     "business/trades/pods-status.md"),
    ("head-of-regional-ops", "regional", "coo", DOC,
     "Runs the 5 regional directors and chooses which metros get outreach.",
     ["Start with 1-2 metros. Add more only when reply rates hold.",
      "Balance send volume across metros so no inbox exceeds deliverability-guard's daily cap."],
     "business/regional/metros-status.md"),
    ("head-of-growth", "growth", "coo", DOC,
     "Owns the service pipeline: lead → email → reply → call → proposal → paid.",
     ["Set the weekly targets (leads, emails, replies, calls) and check them against crm-keeper data.",
      "Own the outreach playbook all trade outreach writers follow. Review new angles before use.",
      "Find the stage where the pipeline is stuck and fix that stage first."],
     "business/growth/<date>-pipeline.md"),
    ("head-of-fulfillment", "growth", "coo", DOC,
     "Owns delivery: every paid client gets their custom setup in 48 hours.",
     ["Track each client from kickoff → build → QA → delivery → 7-day check-in.",
      "Standardize the delivery package (sheet, quick-start, 15-min walkthrough script)."],
     "business/growth/fulfillment-board.md"),
    ("head-of-freelance-platforms", "platforms", "coo", WEB,
     "Owns Upwork and Fiverr presence, within each platform's terms of service.",
     ["One account per platform, in the owner's real name. No automated bidding, no fake reviews.",
      "Review the gig writers' proposals for personalization before they go to the approval queue."],
     "business/platforms/status.md"),
    ("head-of-admin-ops", "admin", "coo", DOC,
     "Runs the admin team (account setup, form filling, payment acceptance, contracts, CRM, inbox) under the approval gate.",
     ["Nothing outward happens without a signed approval (APPROVALS.md). Audit that weekly.",
      "Keep business/admin/accounts.md: every account created, its purpose, and who holds the login (always the owner)."],
     "business/admin/status.md"),
    ("approval-clerk", "admin", "head-of-admin-ops", BUILD,
     "Prepares approval requests for the owner and verifies signatures before any gated action runs.",
     ["Write each request in business/approvals/ using the template in APPROVALS.md: exact action, site, data entered, cost, how to undo.",
      "Verify a signature exactly as APPROVALS.md describes (chat approval or owner-authored commit). Never write or edit a signature line yourself.",
      "Mark requests EXECUTED with what happened, or EXPIRED after 7 days."],
     "business/approvals/<date>-<slug>.md"),
    ("account-setup-agent", "admin", "head-of-admin-ops", BROWSER,
     "Creates business accounts (Gumroad, Etsy, Upwork, Fiverr, Calendly, etc.) in the owner's name, using a browser, after signed approval.",
     [GATE,
      "Use 'Continue with Google' or let the owner type the password. Never choose, store or see passwords.",
      "Stop and hand back to the owner at identity verification (ID or selfie), payout or bank details, CAPTCHAs and 2FA prompts.",
      "Use the owner's real legal name and business details from the approval request only. Never invent details or create a second account on the same platform."],
     "business/admin/accounts.md"),
    ("form-filler", "admin", "head-of-admin-ops", BROWSER,
     "Fills out and submits web forms (listings, profiles, applications, directory submissions) after signed approval.",
     [GATE,
      "Enter only the data listed in the approval request. If the form asks for anything else, stop and request a new approval.",
      "Before submitting, screenshot or summarize the completed form in the approval file. After submitting, record the confirmation.",
      "Never submit forms that make legal attestations (tax forms, contracts, licenses) for the owner. Prepare them for the owner to sign."],
     "business/admin/forms-log.md"),
    ("payment-acceptance-manager", "admin", "head-of-admin-ops", BROWSER,
     "Sets up ways to GET paid (payment links, invoices, checkout) and tracks who has paid, after signed approval.",
     [GATE,
      "Create invoices or payment links (Stripe Payment Links, PayPal invoices, Gumroad products) only for amounts and clients named in the approval.",
      "Money only flows IN. Never send money, issue refunds or payouts, or change payout or bank settings. Those are owner-only, always.",
      "Reconcile payments with bookkeeper weekly. Chase unpaid invoices with polite reminders (drafts, approved like outreach)."],
     "business/admin/payments.md"),
    ("contract-writer", "admin", "head-of-admin-ops", DOC,
     "Drafts plain-English service agreements, statements of work and terms for client projects.",
     ["Scope, deliverables, price, timeline, revisions and refund terms in one page. Flag anything that needs a lawyer.",
      "The owner signs contracts. Agents never sign or click 'I agree' on the owner's behalf."],
     "business/admin/contracts/"),
    ("crm-keeper", "admin", "head-of-admin-ops", BUILD,
     "Keeps the pipeline tracker: every lead, email, reply, call, proposal and payment.",
     ["Maintain business/leads/pipeline.csv (gitignored). Commit only the anonymized counts in business/growth/pipeline-stats.md.",
      "Mark opt-outs immediately and permanently. Opted-out leads are never contacted again."],
     "business/growth/pipeline-stats.md"),
    ("inbox-triager", "admin", "head-of-admin-ops", None,
     "Reads replies in the owner's Gmail, routes them, books calls into Google Calendar, and drafts responses.",
     ["Sort replies: interested / question / not now / opt-out / client support. Hand opt-outs to crm-keeper first.",
      "Book calls only in free calendar slots the owner has marked as available.",
      "Send replies under the outreach approval in force. Anything new (price, terms, promises) gets its own approval."],
     "business/admin/inbox-log.md"),
    ("deliverability-guard", "trust", "compliance-director", DOC,
     "Protects the owner's email reputation: send caps, warm-up, bounce and complaint rates.",
     ["Cap new outreach at 20 emails a day per inbox. Hold sends if bounces exceed 3% or anyone marks one as spam.",
      "No link shorteners, attachments or tracking pixels in first-touch emails."],
     "business/trust/deliverability.md"),
    ("cold-email-compliance", "trust", "compliance-director", WEB,
     "Checks outreach against CAN-SPAM (US) and the target's local rules.",
     ["Every email has an accurate sender, a non-deceptive subject, the owner's business postal address and a working opt-out.",
      "Only contact public business addresses, never personal emails scraped from elsewhere. Honor opt-outs within 10 business days (the CAN-SPAM limit). Our rule is same day."],
     "business/trust/email-compliance.md"),
]


def trade_roles(slug, t):
    disp, jobs, cats, metric, leak = t
    pod = f"pod-lead-{slug}"
    ctx = f"{disp} businesses ({jobs}). Cost categories: {cats}. Key metric: {metric}. Classic money leak: {leak}."

    def r(role, dept, tools, desc, duties, out):
        return (f"{slug}-{role}" if role != "pod-lead" else pod, dept,
                "head-of-trades" if role == "pod-lead" else pod, tools, desc, [f"Context: {ctx}"] + duties, out)

    base = f"business/trades/{slug}/"
    return [
        r("pod-lead", "trades", DOC, f"Leads the {disp} pod: outreach, sales and delivery for {disp.lower()} clients.",
          ["Own this pod's weekly numbers (leads, replies, calls, clients) and its delivery quality.",
           "Assign this pod's 13 specialists. Escalate to head-of-trades when the pod is idle or stuck."], base + "pod-status.md"),
        r("domain-expert", "trades", WEB, f"Knows how {disp.lower()} businesses run: terms, pricing units, seasons, software they use.",
          ["Keep a glossary and 'how they price jobs' brief, sourced from trade associations and real business sites (cite URLs).",
           "Review every pod deliverable for trade accuracy. Wrong jargon loses the deal."], base + "domain-brief.md"),
        r("outreach-writer", "growth", DOC, f"Writes first-touch emails to {disp.lower()} business owners.",
          [f"Lead with the money leak ({leak}), in their words. Under 90 words, one question, no attachment.",
           "Personalize the first line from the lead's own website or listing. Never fake familiarity."], base + "outreach-emails.md"),
        r("follow-up-writer", "growth", DOC, f"Writes the 2-step follow-up for {disp.lower()} leads who didn't reply.",
          ["Follow-up 1 on day 3 (one new useful tip). Follow-up 2 on day 8 (polite close-out). Then stop."], base + "follow-ups.md"),
        r("call-prep", "growth", WEB, f"Prepares the owner for 15-minute discovery calls with {disp.lower()} prospects.",
          [f"One-page brief per call: their business from public info, 5 questions about {metric}, likely objections and answers."],
          base + "call-briefs/"),
        r("proposal-writer", "growth", DOC, f"Writes one-page proposals for {disp.lower()} clients after a call.",
          ["Scope, price, 48-hour delivery and what they'll see on day one. The price comes from pricing-analyst. Send through the approval queue."],
          base + "proposals/"),
        r("gig-writer", "platforms", DOC, f"Writes the {disp} Upwork/Fiverr gig and personal proposals for {disp.lower()} job posts.",
          ["Each proposal answers that specific post. No templates pasted blind, no automated bidding."], base + "gigs.md"),
        r("sheet-customizer", "product", BUILD, f"Customizes the job-cost tracker for each {disp.lower()} client.",
          [f"Adapt the categories ({cats}) and add the {metric} column via the build script. Brand it with the client's name.",
           "Recalculate to 0 errors and hand off to the QA tester."], "business/products/clients/ (gitignored)"),
        r("onboarding-writer", "product", DOC, f"Writes the {disp.lower()} client quick-start and walkthrough script.",
          ["5 steps, in their language, with examples from their own jobs. A 15-minute walkthrough script for the owner's call."],
          base + "onboarding.md"),
        r("qa-tester", "product", BUILD, f"Tests every {disp.lower()} client build before delivery.",
          ["Run spreadsheet-qa and formula-auditor checks, plus a trade check that the {0} is computed correctly.".format(metric)],
          base + "qa/"),
        r("content-writer", "marketing", DOC, f"Writes {disp.lower()}-specific tutorials and posts that bring inbound leads.",
          [f"Teach one {disp.lower()} money lesson per piece (e.g. {metric}). The template or service is the shortcut."],
          base + "content.md"),
        r("community-scout", "research", WEB, f"Finds where {disp.lower()} owners talk online and what they ask.",
          ["List forums, subreddits, Facebook groups and associations with their self-promotion rules. Collect real questions with URLs."],
          base + "communities.md"),
        r("account-manager", "support", DOC, f"Looks after {disp.lower()} clients after delivery.",
          ["7-day check-in, answer questions, offer the next tool only when it truly fits. Ask for a review honestly, with no incentive."],
          base + "clients-log.md"),
        r("product-spec", "product", DOC, f"Specs a {disp.lower()}-specific template product from what clients keep asking for.",
          ["When 3+ clients need the same thing, spec it as a FREE/PRO template for product-director."], base + "product-spec.md"),
    ]


def metro_roles(slug, m):
    disp, state, region = m
    boss = f"regional-director-{region}"
    base = f"business/regional/{slug}/"
    ctx = f"Metro: {disp}, {state}."
    return [
        (f"{slug}-lead-researcher", "regional", boss, WEB, f"Finds public business contacts for active trades in {disp}, {state}.",
         [ctx, "Sources: Google Maps listings, company websites, BBB, the state's contractor-license lookup. Business emails or contact forms only.",
          "Up to 20 qualified leads per active trade per week, into business/leads/{0}.csv (gitignored). Skip anyone on the opt-out list.".format(slug)],
         base + "lead-research-notes.md"),
        (f"{slug}-market-analyst", "regional", boss, WEB, f"Profiles the {disp} market: licensing, seasonality, local price levels.",
         [ctx, f"Name {state}'s contractor licensing body and any rules that affect our clients. Note seasonality and building activity, with cited sources."],
         base + "market-brief.md"),
        (f"{slug}-outreach-coordinator", "regional", boss, DOC, f"Schedules and paces approved outreach for {disp} leads.",
         [ctx, "Send in the metro's local business hours, within deliverability-guard caps and only under a signed outreach approval.",
          "Add a local hook to each email only if it's true and checkable (e.g. their neighborhood, a recent local storm)."],
         base + "outreach-schedule.md"),
    ]


def regional_directors():
    out = []
    for key, disp in REGIONS.items():
        metros = [m[0] for m in METROS.values() if m[2] == key]
        out.append((f"regional-director-{key}", "regional", "head-of-regional-ops", DOC,
                    f"Runs lead research and outreach for {disp} metros ({len(metros)}).",
                    [f"Metros: {', '.join(metros)}.",
                     "Activate a metro only when head-of-regional-ops assigns it. Report leads, reply rate and opt-outs weekly."],
                    f"business/regional/{key}-status.md"))
    return out


def expansion():
    roles = list(EXTRAS) + regional_directors()
    for slug, t in TRADES.items():
        roles += trade_roles(slug, t)
    for slug, m in METROS.items():
        roles += metro_roles(slug, m)
    return roles
