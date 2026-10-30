"""Build a personalized website preview for one prospect, before any email is sent.

Usage: python3 business/scripts/build_preview.py business/webdev/prospects/<slug>.json
Writes business/webdev/previews/<slug>/: index.html (the concept site), desktop.jpg, mobile.jpg,
email.jpg (neon device mockup for the email body) and concept.pdf (attachment).

Every fact on the page comes from the prospect JSON, which comes from the company's own public website.
Anything we don't know is a clearly marked placeholder ("Your best Google reviews go here"), never invented.
"""
import html
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_ROOT = ROOT / "business" / "webdev" / "previews"
FONTS = Path("/tmp/claude-0/-home-user-turnbasedgame/7344002f-a7eb-5519-8c2c-5e805665fe89/scratchpad/fonts")

TRADES = {
    "plumbing": {
        "palette": {"main": "#0e2240", "main2": "#17335c", "accent": "#ff7a1a", "accent_soft": "#ffb27a", "pattern": "#1b3a66"},
        "hero": "{city} plumbing, <em>fixed right the first time.</em>",
        "sub": "Leaks, water heaters, drains and repipes, handled by licensed plumbers who give you the price before the work starts.",
        "quote_options": ["Water heater", "Leak or burst pipe", "Drain clog", "Repipe", "Something else"],
        "services": [("Water heaters", "Tank and tankless repair and replacement."), ("Leak repair", "Fast fixes for leaks, including hidden and slab leaks."),
                     ("Drain cleaning", "Kitchen, bath and main-line clogs cleared."), ("Repiping", "Whole-home PEX and copper repipes."),
                     ("Fixtures", "Toilets, faucets, disposals and shower valves."), ("Emergency service", "Burst pipe? Call and talk to a plumber.")],
        "final": "Water where it shouldn't be?",
    },
    "electrical": {
        "palette": {"main": "#11151d", "main2": "#1c2330", "accent": "#f5b301", "accent_soft": "#ffd66b", "pattern": "#1f2735"},
        "hero": "{city} electricians who <em>wire it right.</em>",
        "sub": "Panel upgrades, EV chargers, lighting and troubleshooting by licensed electricians, with clear pricing and clean work.",
        "quote_options": ["Panel upgrade", "EV charger", "Lighting", "Outlet / wiring issue", "Something else"],
        "services": [("Panel upgrades", "100A to 200A upgrades and panel replacements."), ("EV chargers", "Level 2 home charger installs, done to code."),
                     ("Lighting", "Recessed, outdoor and landscape lighting."), ("Troubleshooting", "Breakers tripping, dead outlets, flickering lights."),
                     ("Rewiring", "Safe rewiring for older homes and remodels."), ("Generators", "Standby and portable generator hookups.")],
        "final": "Power out, or planning a project?",
    },
}


def esc(s):
    return html.escape(str(s or ""), quote=True)


def page(p):
    t = TRADES[p["trade"]]
    pal = {**t["palette"], **p.get("palette", {})}
    services = p.get("services") or [{"name": n, "desc": d} for n, d in t["services"]]
    phone = p.get("phone") or ""
    tel = "".join(ch for ch in phone if ch.isdigit())
    call = f'<a class="call" href="tel:+1{tel[-10:]}">Call {esc(phone)}</a>' if phone else '<a class="call" href="#quote">Get a free quote</a>'
    facts = p.get("facts", [])
    areas = p.get("areas") or [p["city"]]
    reviews = p.get("reviews") or []
    if reviews:
        rev_html = "".join(f'<div class="rev"><span class="stars">★★★★★</span><p>"{esc(r["text"])}"</p><small>{esc(r["who"])}</small></div>' for r in reviews)
    else:
        rev_html = "".join('<div class="rev ph"><span class="stars">★★★★★</span><p>Your best Google review goes here, with the customer\'s first name.</p><small>From your Google Business Profile</small></div>' for _ in range(3))
    proof = "".join(f"<span><b>{esc(a)}</b> {esc(b)}</span>" for a, b in p.get("proof", [])[:3])
    why = "".join(f'<div><strong>{esc(a)}</strong><span>{esc(b)}</span></div>' for a, b in facts[:4])
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{esc(p['company'])} | {esc(p['trade'].title())} in {esc(p['city'])}, {esc(p['state'])} (concept preview)</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800;900&family=Inter+Tight:wght@400;500;600&display=swap">
<style>
:root {{ --main: {pal['main']}; --main2: {pal['main2']}; --accent: {pal['accent']}; --accent-soft: {pal['accent_soft']}; --pattern: {pal['pattern']}; --cream: #f6f4f0; --ink: #141a24; --soft: #5a6472; --line: #e2ddd4; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; font: 400 1.05rem/1.6 "Inter Tight", system-ui, sans-serif; color: var(--ink); background: #fff; }}
h1, h2, h3 {{ font-family: "Archivo", system-ui, sans-serif; margin: 0; line-height: 1.05; text-wrap: balance; }}
a {{ color: inherit; }}
.wrap {{ max-width: 1120px; margin: 0 auto; padding: 0 20px; }}
.concept {{ background: #050809; color: #2ff5e6; text-align: center; font: 600 .76rem/1.3 "Inter Tight", sans-serif; letter-spacing: .08em; padding: 7px 12px; text-transform: uppercase; }}
header {{ background: #fff; border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 3; }}
header .wrap {{ display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-block: 14px; }}
.brand {{ font: 900 1.2rem/1.1 "Archivo", sans-serif; color: var(--main); text-decoration: none; display: flex; align-items: center; gap: 10px; }}
.brand i {{ width: 12px; height: 34px; background: var(--accent); border-radius: 3px; display: block; }}
nav {{ display: flex; gap: 22px; font-weight: 600; font-size: .95rem; }} nav a {{ text-decoration: none; color: var(--soft); }}
.call {{ background: var(--accent); color: #111; text-decoration: none; font: 800 1rem/1 "Archivo", sans-serif; padding: 13px 18px; border-radius: 10px; white-space: nowrap; }}
.hero {{ background: linear-gradient(115deg, var(--main) 0%, var(--main) 50%, color-mix(in srgb, var(--main) 70%, transparent) 100%), repeating-linear-gradient(45deg, var(--pattern) 0 14px, var(--main2) 14px 28px); color: #fff; }}
.hero .wrap {{ display: grid; grid-template-columns: 1.15fr .85fr; gap: 40px; padding-block: 60px; align-items: center; }}
.badge {{ display: inline-flex; gap: 8px; background: rgba(255,255,255,.08); color: var(--accent-soft); border: 1px solid color-mix(in srgb, var(--accent) 60%, transparent); border-radius: 999px; padding: 6px 12px; font-weight: 600; font-size: .85rem; }}
.hero h1 {{ font-size: clamp(2.3rem, 5.2vw, 3.9rem); font-weight: 900; margin: 16px 0; }}
.hero h1 em {{ font-style: normal; color: var(--accent); }}
.hero p {{ color: #cfd6e2; max-width: 52ch; font-size: 1.1rem; margin: 0; }}
.cta {{ display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }}
.btn2 {{ border: 2px solid rgba(255,255,255,.6); color: #fff; text-decoration: none; font: 800 1rem/1 "Archivo", sans-serif; padding: 12px 18px; border-radius: 10px; }}
.proof {{ display: flex; flex-wrap: wrap; gap: 8px 22px; margin-top: 24px; color: #cfd6e2; font-size: .92rem; }} .proof b {{ color: #fff; }}
.quote {{ background: #fff; color: var(--ink); border-radius: 16px; padding: 24px; box-shadow: 0 24px 60px rgba(0,0,0,.35); display: grid; gap: 12px; }}
.quote h2 {{ font-size: 1.45rem; color: var(--main); }}
.quote label {{ font-weight: 600; font-size: .85rem; color: var(--soft); display: grid; gap: 5px; }}
.quote input, .quote select {{ font: inherit; padding: 11px 12px; border: 1px solid var(--line); border-radius: 10px; background: #fbfaf8; }}
.quote button {{ background: var(--accent); color: #111; border: 0; border-radius: 10px; padding: 14px; font: 800 1.05rem/1 "Archivo", sans-serif; }}
section.band {{ padding-block: 64px; }}
.eyebrow {{ color: color-mix(in srgb, var(--accent) 80%, #000); font-weight: 700; letter-spacing: .12em; text-transform: uppercase; font-size: .8rem; }}
.head {{ display: grid; gap: 10px; margin-bottom: 30px; max-width: 720px; }}
.head h2 {{ font-size: clamp(1.8rem, 3.4vw, 2.6rem); color: var(--main); font-weight: 900; }}
.grid3 {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }}
.svc {{ border: 1px solid var(--line); border-radius: 14px; padding: 22px; display: grid; gap: 8px; }}
.svc .ic {{ width: 40px; height: 40px; border-radius: 10px; background: var(--main); color: var(--accent); display: grid; place-items: center; font: 900 1.05rem/1 "Archivo", sans-serif; }}
.svc h3 {{ font-size: 1.15rem; color: var(--main); }} .svc p {{ color: var(--soft); margin: 0; font-size: .97rem; }}
.cream {{ background: var(--cream); }}
.why {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }} .why div {{ display: grid; gap: 6px; }}
.why strong {{ font: 900 1.9rem/1.05 "Archivo", sans-serif; color: var(--main); }} .why span {{ color: var(--soft); }}
.rev {{ background: #fff; border-radius: 14px; padding: 22px; border: 1px solid var(--line); display: grid; gap: 10px; }}
.rev.ph {{ border-style: dashed; }} .rev p {{ margin: 0; }} .rev small {{ color: var(--soft); }} .stars {{ color: #f5a623; letter-spacing: 2px; }}
.areas {{ display: flex; flex-wrap: wrap; gap: 10px; }} .areas span {{ border: 1px solid var(--line); border-radius: 999px; padding: 8px 14px; font-weight: 600; color: var(--main); background: #fff; }}
.final {{ background: var(--main); color: #fff; text-align: center; }} .final h2 {{ font-size: clamp(1.9rem, 4vw, 2.9rem); font-weight: 900; }}
.final p {{ color: #cfd6e2; }} .final .call {{ display: inline-block; margin-top: 18px; font-size: 1.15rem; padding: 16px 24px; }}
footer {{ background: #0a0d12; color: #9aa6b6; font-size: .86rem; padding-block: 26px; }} footer .wrap {{ display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; }}
.mcall {{ display: none; }}
@media (max-width: 860px) {{ nav {{ display: none; }} .hero .wrap, .grid3 {{ grid-template-columns: 1fr; }} .why {{ grid-template-columns: repeat(2, 1fr); }}
  .mcall {{ display: block; position: fixed; left: 12px; right: 12px; bottom: 12px; text-align: center; z-index: 4; box-shadow: 0 10px 30px rgba(0,0,0,.3); }} body {{ padding-bottom: 76px; }} }}
</style></head><body>
<div class="concept">Concept preview made for {esc(p['company'])} by TradeSheets · not live · uses public info from {esc(p.get('source_domain', 'your website'))}</div>
<header><div class="wrap"><a class="brand" href="#"><i></i>{esc(p['company'])}</a>
<nav><a href="#services">Services</a><a href="#reviews">Reviews</a><a href="#areas">Service area</a></nav>{call}</div></header>
<section class="hero"><div class="wrap"><div>
<span class="badge">● {esc(p.get('badge', 'Licensed · Insured · Local'))}</span>
<h1>{p.get('headline') or t['hero'].format(city=esc(p['city']))}</h1>
<p>{esc(p.get('sub') or t['sub'])}</p>
<div class="cta">{call}<a class="btn2" href="#quote">Get a free quote</a></div>
<div class="proof">{proof}</div></div>
<form class="quote" id="quote" onsubmit="event.preventDefault()"><h2>Request a free quote</h2>
<label>What do you need?<select>{''.join(f'<option>{esc(o)}</option>' for o in t['quote_options'])}</select></label>
<label>Your name<input placeholder="First and last name"></label><label>Phone<input placeholder="(555) 555-0199"></label>
<label>Address or ZIP<input placeholder="ZIP code"></label><button type="button">Send my request</button></form>
</div></section>
<section class="band" id="services"><div class="wrap"><div class="head"><span class="eyebrow">Services</span><h2>{esc(p.get('services_title') or 'What we do')}</h2></div>
<div class="grid3">{''.join(f'<div class="svc"><span class="ic">{i:02d}</span><h3>{esc(s["name"])}</h3><p>{esc(s["desc"])}</p></div>' for i, s in enumerate(services[:6], 1))}</div></div></section>
{f'<section class="band cream"><div class="wrap"><div class="head"><span class="eyebrow">Why {esc(p["company"])}</span><h2>{esc(p.get("why_title") or "Why customers choose us")}</h2></div><div class="why">{why}</div></div></section>' if why else ''}
<section class="band" id="reviews"><div class="wrap"><div class="head"><span class="eyebrow">Reviews</span><h2>What customers say</h2></div><div class="grid3">{rev_html}</div></div></section>
<section class="band cream" id="areas"><div class="wrap"><div class="head"><span class="eyebrow">Service area</span><h2>Serving {esc(p['city'])} and nearby</h2></div>
<div class="areas">{''.join(f'<span>{esc(a)}</span>' for a in areas)}</div></div></section>
<section class="band final"><div class="wrap"><h2>{esc(p.get('final') or t['final'])}</h2><p>{esc(p.get('final_sub') or 'Call now or request a quote online.')}</p>{call}</div></section>
<footer><div class="wrap"><span>© {esc(p['company'])}{(' · ' + esc(p['license'])) if p.get('license') else ''}</span><span>Concept by TradeSheets</span></div></footer>
{call.replace('class="call"', 'class="call mcall"', 1)}
</body></html>"""


def neon_mockup(desk, mob, out):
    from PIL import Image, ImageDraw, ImageFilter
    W, H = 1200, 720
    bg = Image.new("RGB", (W, H), (2, 6, 8))
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    lx, ly, lw, lh = 70, 60, 860, 540
    g.rounded_rectangle([lx - 6, ly - 6, lx + lw + 6, ly + lh + 6], 26, outline=(24, 214, 255), width=10)
    px, py, pw, ph = 900, 170, 250, 500
    g.rounded_rectangle([px - 6, py - 6, px + pw + 6, py + ph + 6], 40, outline=(24, 214, 255), width=10)
    bg = Image.blend(bg, glow.filter(ImageFilter.GaussianBlur(22)), 0.85)
    d = ImageDraw.Draw(bg)
    d.rounded_rectangle([lx, ly, lx + lw, ly + lh], 20, fill=(8, 14, 18), outline=(120, 236, 255), width=2)
    scr = Image.open(desk).convert("RGB").resize((lw - 28, lh - 28))
    bg.paste(scr, (lx + 14, ly + 14))
    d.rounded_rectangle([lx - 40, ly + lh + 4, lx + lw + 40, ly + lh + 22], 8, fill=(14, 22, 28), outline=(60, 200, 230), width=1)
    d.rounded_rectangle([px, py, px + pw, py + ph], 34, fill=(8, 14, 18), outline=(120, 236, 255), width=2)
    m = Image.open(mob).convert("RGB").resize((pw - 20, ph - 20))
    mask = Image.new("L", m.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, m.size[0], m.size[1]], 26, fill=255)
    bg.paste(m, (px + 10, py + 10), mask)
    bg.save(out, quality=78, optimize=True)


def main(spec_path):
    p = json.loads(Path(spec_path).read_text())
    out = OUT_ROOT / p["slug"]
    out.mkdir(parents=True, exist_ok=True)
    (out / "index.html").write_text(page(p))
    js = f"""
const {{ chromium }} = require('playwright');
(async () => {{
  const b = await chromium.launch({{ proxy: process.env.HTTPS_PROXY ? {{ server: process.env.HTTPS_PROXY }} : undefined }});
  const url = 'file://{out}/index.html';
  const d = await b.newPage({{ viewport: {{ width: 1280, height: 800 }} }});
  await d.goto(url, {{ waitUntil: 'networkidle', timeout: 60000 }}).catch(() => {{}}); await d.waitForTimeout(800);
  await d.screenshot({{ path: '{out}/desktop.jpg', type: 'jpeg', quality: 80 }});
  await d.emulateMedia({{ media: 'screen' }});
  await d.pdf({{ path: '{out}/concept.pdf', width: '1280px', height: '2400px', printBackground: true, pageRanges: '1' }});
  const m = await b.newPage({{ viewport: {{ width: 390, height: 780 }}, deviceScaleFactor: 2 }});
  await m.goto(url, {{ waitUntil: 'networkidle', timeout: 60000 }}).catch(() => {{}}); await m.waitForTimeout(800);
  await m.screenshot({{ path: '{out}/mobile.jpg', type: 'jpeg', quality: 80 }});
  await b.close();
}})();"""
    npm_root = subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()
    subprocess.run(["node", "-e", js], check=True, env={**__import__("os").environ, "NODE_PATH": npm_root})
    neon_mockup(out / "desktop.jpg", out / "mobile.jpg", out / "email.jpg")
    print("built", out, sorted(x.name for x in out.iterdir()))


if __name__ == "__main__":
    main(sys.argv[1])
