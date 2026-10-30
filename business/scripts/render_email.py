"""Render the outreach email for one built preview: the demo site lives INSIDE the email body.

Usage: python3 business/scripts/render_email.py <slug> [--to OVERRIDE] [--note "banner text"]
Writes business/webdev/previews/<slug>/email.html, email.txt and email.json (to, subject, attachment).

Email-safe only: tables, inline styles, no scripts, images from hosted URLs. Brand: black + royal cyan neon.
"""
import argparse
import html
import json
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = "https://raw.githubusercontent.com/ilicvix02/turnbasedgame/claude/bold-tesla-qg7syv/business"
PREVIEW_RAW = "https://raw.githubusercontent.com/ilicvix02/tradesheets-previews/main"
SITE = "https://ilicvix02.github.io/tradesheets-previews"
POSTAL = "Kajmakcalanska 21/1, 11420 Smederevska Palanka, Serbia"
FROM = "ilicvix@gmail.com"
CYAN, CYAN_DEEP, BLACK, CARD = "#18d6ff", "#0096c7", "#000000", "#070b0d"

TRADE = {
    "plumbing": {"main": "#0e2240", "accent": "#ff7a1a", "noun": "plumber"},
    "electrical": {"main": "#11151d", "accent": "#f5b301", "noun": "electrician"},
}


def e(s):
    return html.escape(str(s or ""), quote=True)


def mailto(subject):
    return f"mailto:{FROM}?subject={urllib.parse.quote(subject)}"


def pill(href, label, bg, fg, border=None):
    b = f"border:2px solid {border};" if border else ""
    return (f'<a href="{e(href)}" style="display:inline-block;background:{bg};color:{fg};{b}font-family:Arial,Helvetica,sans-serif;'
            f'font-weight:bold;font-size:16px;line-height:20px;text-decoration:none;padding:14px 24px;border-radius:999px;">{label}</a>')


def demo_block(p):
    t = TRADE[p["trade"]]
    main, acc = p.get("palette", {}).get("main", t["main"]), p.get("palette", {}).get("accent", t["accent"])
    phone = p.get("phone", "")
    digits = "".join(c for c in phone if c.isdigit())[-10:]
    head = p.get("headline") or f'{e(p["city"])} {t["noun"]}s, <em>done right.</em>'
    head = head.replace("<em>", f'<span style="color:{acc};">').replace("</em>", "</span>")
    services = (p.get("services") or [])[:6]
    rows = ""
    for i in range(0, len(services), 2):
        cells = ""
        for s in services[i:i + 2]:
            cells += (f'<td width="50%" valign="top" style="padding:6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
                      f'style="border:1px solid #e2ddd4;border-radius:10px;"><tr><td style="padding:12px 14px;font-family:Arial,Helvetica,sans-serif;">'
                      f'<div style="font-weight:bold;font-size:15px;color:{main};">{e(s["name"])}</div>'
                      f'<div style="font-size:13px;line-height:18px;color:#5a6472;padding-top:4px;">{e(s["desc"])}</div></td></tr></table></td>')
        rows += f"<tr>{cells}</tr>"
    proof = " &nbsp;·&nbsp; ".join(f'<b style="color:#ffffff;">{e(a)}</b> {e(b)}' for a, b in (p.get("proof") or [])[:3])
    call = (f'<a href="tel:+1{digits}" style="display:inline-block;background:{acc};color:#111111;font-family:Arial,Helvetica,sans-serif;font-weight:bold;'
            f'font-size:15px;text-decoration:none;padding:12px 18px;border-radius:8px;">&#128222; Call {e(phone)}</a>') if digits else ""
    site = p.get("source_domain", "yourcompany.com")
    return f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:14px;overflow:hidden;border:1px solid {CYAN};">
<tr><td style="background:#0d1417;padding:9px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8fb5c2;">
<span style="color:#ff5f57;">&#9679;</span> <span style="color:#febc2e;">&#9679;</span> <span style="color:#28c840;">&#9679;</span>
&nbsp;&nbsp;<span style="background:#05090b;border-radius:6px;padding:3px 10px;color:#bfe9f5;">&#128274; {e(site)}</span>
&nbsp;<span style="color:{CYAN};">· concept preview</span></td></tr>
<tr><td style="background:#ffffff;padding:12px 18px;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="font-weight:900;font-size:17px;color:{main};"><span style="display:inline-block;width:8px;height:22px;background:{acc};border-radius:2px;vertical-align:middle;"></span>&nbsp; {e(p["company"])}</td>
<td align="right">{call}</td></tr></table></td></tr>
<tr><td style="background:{main};padding:30px 22px;font-family:Arial,Helvetica,sans-serif;">
<div style="display:inline-block;font-size:12px;color:{acc};border:1px solid {acc};border-radius:999px;padding:4px 10px;">&#9679; {e(p.get("badge") or "Licensed · Insured · Local")}</div>
<div style="font-size:32px;line-height:36px;font-weight:900;color:#ffffff;padding:14px 0 10px;">{head}</div>
<div style="font-size:15px;line-height:22px;color:#cfd6e2;">{e(p.get("sub", ""))}</div>
<div style="padding-top:18px;">{call} &nbsp; <a href="{e(mailto("YES - make my site live (" + p["company"] + ")"))}" style="display:inline-block;border:2px solid #ffffff;color:#ffffff;font-weight:bold;font-size:15px;text-decoration:none;padding:10px 16px;border-radius:8px;">Get a free quote</a></div>
<div style="font-size:13px;line-height:20px;color:#cfd6e2;padding-top:16px;">{proof}</div></td></tr>
<tr><td style="background:#ffffff;padding:18px 14px 10px;font-family:Arial,Helvetica,sans-serif;">
<div style="font-size:11px;letter-spacing:2px;color:{acc};font-weight:bold;padding:0 6px 4px;">SERVICES</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{rows}</table></td></tr>
<tr><td style="background:#f6f4f0;padding:14px 20px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5a6472;">
<b style="color:{main};">Serving:</b> {e(", ".join(p.get("areas") or [p["city"]]))}</td></tr>
</table>"""


def compare_block(p):
    a = p.get("audit") or {}
    issues = a.get("issues") or []
    if not a.get("reachable") or not issues:
        return ""
    rows = "".join(
        f'<tr><td style="padding:7px 10px;border-top:1px solid #1d3a44;color:#ffb3b3;font-size:14px;line-height:20px;">&#10007; {e(i)}</td>'
        f'<td style="padding:7px 10px;border-top:1px solid #1d3a44;color:#8ff5e9;font-size:14px;line-height:20px;white-space:nowrap;">&#10004; Fixed</td></tr>'
        for i in issues[:4])
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 16px;border:1px solid #1d3a44;border-radius:12px;background:#0a1418;">'
            f'<tr><td style="padding:10px 10px 6px;color:#e6f7fb;font-weight:bold;font-size:14px;">Your site today</td><td style="padding:10px 10px 6px;color:#18d6ff;font-weight:bold;font-size:14px;">Your new site</td></tr>{rows}</table>')


def render(slug, to_override=None, note=None, img_base=None, html_only=False):
    d = ROOT / "business/webdev/previews" / slug
    p = json.loads((ROOT / "business/webdev/prospects" / f"{slug}.json").read_text())
    company = p["company"]
    img = (img_base or PREVIEW_RAW) + f"/{slug}"
    site = f"{SITE}/{slug}/"
    greeting = p.get("owner_first") or f"{company} team"
    yes = mailto(f"YES - make my site live ({company})")
    no = mailto(f"NO - not interested ({company})")
    attach = ""
    noun = TRADE[p["trade"]]["noun"]
    subject = f"I built {company} a new website (preview inside)"
    site_btn = f'<tr><td align="center" style="padding:20px 24px 4px;">{pill(site, "&#9654;&nbsp; See your full website &rarr;", CYAN, "#001218")}<div style="font-size:12px;color:#6f8f99;padding-top:8px;">All 4 pages, live in your browser. Try it on your phone.</div></td></tr>\n'
    if html_only:
        visual = f'<tr><td style="padding:14px 22px;">{demo_block(p)}</td></tr>\n<tr><td style="padding:10px 28px 0;color:#8fb5c2;font-size:13px;text-align:center;">This is your homepage. The full site also has Services, About and Contact pages, ready to go.</td></tr>\n'
    else:
        visual = f'''<tr><td style="padding:14px 24px 4px;"><a href="{e(site)}"><img src="{img}/email.jpg" width="552" alt="{e(company)} new website on a laptop and a phone" style="display:block;width:100%;max-width:552px;height:auto;border:0;border-radius:12px;"></a></td></tr>
<tr><td style="padding:22px 28px 8px;color:#e6f7fb;font-size:16px;line-height:24px;"><b style="color:{CYAN};">&#9660; Your full homepage, top to bottom</b></td></tr>
<tr><td style="padding:4px 24px;"><a href="{e(site)}"><img src="{img}/fullpage.jpg" width="552" alt="{e(company)} full homepage concept" style="display:block;width:100%;max-width:552px;height:auto;border:0;border-radius:10px;"></a></td></tr>
<tr><td style="padding:22px 28px 8px;color:#e6f7fb;font-size:16px;line-height:24px;"><b style="color:{CYAN};">&#10010; Plus Services, About and Contact pages</b></td></tr>
<tr><td style="padding:4px 24px 6px;"><a href="{e(site)}"><img src="{img}/pages.jpg" width="552" alt="{e(company)} services, about and contact pages" style="display:block;width:100%;max-width:552px;height:auto;border:0;border-radius:10px;"></a></td></tr>
'''
    banner = f'<tr><td style="background:#0b3a46;color:#bff3ff;font-size:13px;padding:10px 24px;">{e(note)}</td></tr>' if note else ""
    body = f"""<div style="display:none;max-height:0;overflow:hidden;">Your new homepage is in this email. Take a look, it takes 10 seconds.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BLACK};padding:20px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:{CARD};border:1px solid #0e3a46;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
{banner}
<tr><td><img src="{RAW}/email-assets/neon-header.gif" width="600" alt="TradeSheets: websites built for the trades" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>
<tr><td style="padding:26px 28px 6px;color:#e6f7fb;font-size:16px;line-height:25px;">
<p style="margin:0 0 14px;">Hi {e(greeting)},</p>
<p style="margin:0 0 14px;">{e(p["personalization"])}</p>
{f'<p style="margin:0 0 14px;padding:12px 14px;border-left:3px solid #ffb547;background:#1a1408;color:#ffe2b0;">{e(p["site_note"])}</p>' if p.get("site_note") else ""}
{compare_block(p) and "<p style=\"margin:0 0 8px;\">I ran a quick check of your current website. Here's what I found, and what the new one fixes:</p>" + compare_block(p)}
<p style="margin:0 0 6px;">So instead of a sales pitch, I built <b style="color:{CYAN};">{e(company)}</b> a complete new website. Here's the homepage:</p>
</td></tr>
{visual}{site_btn}<tr><td style="padding:22px 28px 6px;color:#e6f7fb;font-size:15px;line-height:24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:5px 0;color:#e6f7fb;font-size:15px;line-height:24px;font-family:Arial,Helvetica,sans-serif;"><span style="color:{CYAN};">&#9654;</span>&nbsp; A call button pinned to every phone screen</td></tr>
<tr><td style="padding:5px 0;color:#e6f7fb;font-size:15px;line-height:24px;font-family:Arial,Helvetica,sans-serif;"><span style="color:{CYAN};">&#9654;</span>&nbsp; A quote form that lands straight in your inbox</td></tr>
<tr><td style="padding:5px 0;color:#e6f7fb;font-size:15px;line-height:24px;font-family:Arial,Helvetica,sans-serif;"><span style="color:{CYAN};">&#9654;</span>&nbsp; Set up for local Google searches like "{noun} near me" in {e(p["city"])}</td></tr>
</table></td></tr>
<tr><td style="padding:16px 22px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#03171d;border:1px solid {CYAN};border-radius:14px;">
<tr><td align="center" style="padding:22px 18px;">
<div style="font-size:12px;letter-spacing:2px;color:{CYAN};font-weight:bold;">FOUNDING CLIENT PRICE &middot; 5 SPOTS</div>
<div style="font-size:30px;line-height:36px;color:#ffffff;font-weight:900;padding:8px 0 4px;">$299 <span style="font-size:17px;color:#6f8f99;text-decoration:line-through;font-weight:normal;">$399</span></div>
<div style="font-size:14px;line-height:21px;color:#9fc3cd;padding-bottom:18px;">Live on your own domain in 5 business days. No calls, everything by email.</div>
{pill(yes, "&#10004;&nbsp; Yes, make it live &rarr;", CYAN, "#001218")}
<div style="height:10px;line-height:10px;">&nbsp;</div>
{pill(no, "No thanks", "transparent", "#9fc3cd", "#2a4a54")}
<div style="font-size:12px;color:#6f8f99;padding-top:12px;">One tap opens a ready-made reply. Just hit send.</div>
</td></tr></table></td></tr>
<tr><td style="padding:10px 22px 24px;color:#e6f7fb;font-size:15px;line-height:24px;">
<img src="{RAW}/email-assets/founder-card.jpg" width="556" alt="Viktor Ilic, Founder, TradeSheets: websites built for the trades" style="display:block;width:100%;max-width:556px;height:auto;border:0;border-radius:14px;margin:0 0 14px;">
<p style="margin:0 0 12px;font-size:14px;"><a href="{SITE}/" style="color:{CYAN};text-decoration:none;font-weight:bold;">&#127760; tradesheets &middot; see all 6 designs &rarr;</a></p>
<p style="margin:0;font-size:14px;color:#9fc3cd;"><b style="color:#e6f7fb;">P.S.</b> I only take 5 founding clients at $299. Reply YES today and one of them is yours.</p>
</td></tr>
<tr><td style="padding:14px 28px;background:#05090b;color:#5f7d86;font-size:12px;line-height:18px;">TradeSheets &middot; {POSTAL}<br>You're getting this because {e(company)} lists this address on its website. Tap "No thanks" or reply "no" and you'll never hear from me again.</td></tr>
</table></td></tr></table>"""
    text = f"""Hi {greeting},

{p["personalization"]}

{(p["site_note"] + chr(10) + chr(10)) if p.get("site_note") else ""}{("I ran a quick check of your current website and found: " + "; ".join(p.get("audit",{}).get("issues",[])[:4]) + ". The new one fixes all of that." + chr(10)+chr(10)) if p.get("audit",{}).get("issues") else ""}So instead of a sales pitch, I built {company} a complete new website (home, services, about and contact pages). See it here: {SITE}/{slug}/ Open this email in HTML view (most email apps do this automatically) to see it.

What's in it:
- A call button pinned to every phone screen
- A quote form that lands straight in your inbox
- Set up for local Google searches like "{noun} near me" in {p["city"]}

Founding client price: $299 (normally $399), live on your own domain in 5 business days. No calls, everything by email.

Reply YES and I'll make it live. Reply NO and I won't email again.

Viktor Ilic
TradeSheets, websites for the trades
{SITE}/

P.S. I only take 5 founding clients at $299. Reply YES today and one of them is yours.

TradeSheets, {POSTAL}
You're getting this because {company} lists this address on its website."""
    (d / "email.html").write_text(body)
    (d / "email.txt").write_text(text)
    (d / "email.json").write_text(json.dumps({"to": to_override or p["email"], "subject": subject}, indent=1))
    print(slug, "->", to_override or p["email"], "|", subject, "|", len(body), "chars")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--to")
    ap.add_argument("--note")
    ap.add_argument("--html-only", action="store_true", help="no per-prospect images: homepage demo built from HTML inside the email")
    ap.add_argument("--img-base", help="public URL folder that holds <slug>/email.jpg, fullpage.jpg, pages.jpg")
    a = ap.parse_args()
    render(a.slug, a.to, a.note, a.img_base, a.html_only)
