"""Six distinct website designs for prospect previews. Each renders a full 4-page site
(home, services, about, contact) from one prospect JSON. Used by build_preview.py.

Every fact comes from the prospect JSON (their own public website). Unknowns become clearly
marked placeholders, never invented claims.
"""
import hashlib
import html

THEMES = {
    "ironworks": {  # bold industrial, dark, uppercase condensed
        "fonts": "family=Archivo+Black&family=Archivo:wght@400;500;600&display=swap",
        "display": '"Archivo Black", Impact, sans-serif', "body": '"Archivo", system-ui, sans-serif',
        "bg": "#0f1114", "surface": "#181b20", "ink": "#f2f3f5", "muted": "#a3a9b3", "line": "#2a2f37",
        "hero": "stripes", "layout": "split", "radius": "4px", "upper": True, "cards": "outline", "dark": True,
    },
    "clean": {  # airy modern, white, soft rounded cards
        "fonts": "family=Manrope:wght@500;700;800&family=Inter+Tight:wght@400;500&display=swap",
        "display": '"Manrope", system-ui, sans-serif', "body": '"Inter Tight", system-ui, sans-serif',
        "bg": "#ffffff", "surface": "#f4f7fb", "ink": "#0f1b2d", "muted": "#5b6b80", "line": "#e3e9f1",
        "hero": "blob", "layout": "center", "radius": "22px", "upper": False, "cards": "soft", "dark": False,
    },
    "heritage": {  # classic, serif, cream, family-business trust
        "fonts": "family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Source+Sans+3:wght@400;600&display=swap",
        "display": '"Fraunces", Georgia, serif', "body": '"Source Sans 3", system-ui, sans-serif',
        "bg": "#fbf7f0", "surface": "#f3ece0", "ink": "#1f2a24", "muted": "#5f685f", "line": "#e2d8c6",
        "hero": "frame", "layout": "split", "radius": "6px", "upper": False, "cards": "rule", "dark": False,
    },
    "bright": {  # punchy local, color-block hero, chunky shapes
        "fonts": "family=Poppins:wght@500;700;800&family=Nunito+Sans:wght@400;600&display=swap",
        "display": '"Poppins", system-ui, sans-serif', "body": '"Nunito Sans", system-ui, sans-serif',
        "bg": "#ffffff", "surface": "#fff6ec", "ink": "#1b1b2b", "muted": "#5d5f73", "line": "#efe4d6",
        "hero": "block", "layout": "split", "radius": "18px", "upper": False, "cards": "solid", "dark": False,
    },
    "voltage": {  # dark tech glow, mono accents
        "fonts": "family=Sora:wght@600;800&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@500&display=swap",
        "display": '"Sora", system-ui, sans-serif', "body": '"IBM Plex Sans", system-ui, sans-serif',
        "bg": "#07090f", "surface": "#0e1320", "ink": "#eef2ff", "muted": "#94a0bd", "line": "#1d2640",
        "hero": "grid", "layout": "center", "radius": "14px", "upper": False, "cards": "glow", "dark": True,
    },
    "editorial": {  # big type, asymmetric, magazine
        "fonts": "family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,800&family=Figtree:wght@400;500&display=swap",
        "display": '"Bricolage Grotesque", system-ui, sans-serif', "body": '"Figtree", system-ui, sans-serif',
        "bg": "#f6f5f1", "surface": "#ffffff", "ink": "#111111", "muted": "#5e5e5e", "line": "#dddad2",
        "hero": "type", "layout": "stack", "radius": "0px", "upper": False, "cards": "numbered", "dark": False,
    },
}

PALETTES = {  # brand colors per trade: (primary, accent)
    "plumbing": [("#0b5fff", "#ff8a00"), ("#0e7c86", "#ffb703"), ("#1d3557", "#e63946"), ("#2563eb", "#22c55e"), ("#0f4c81", "#f59e0b"), ("#155e75", "#fb7185")],
    "electrical": [("#f5b301", "#111827"), ("#ffd400", "#2563eb"), ("#ff6b00", "#0f172a"), ("#22d3ee", "#facc15"), ("#e11d48", "#fbbf24"), ("#16a34a", "#fde047")],
}

ICONS = {
    "drop": '<path d="M12 2.5C9 7 6 10.2 6 14a6 6 0 0 0 12 0c0-3.8-3-7-6-11.5z"/>',
    "pipe": '<path d="M3 7h9a4 4 0 0 1 4 4v10h-4V11H3z"/><path d="M14 3h7v4h-7z"/>',
    "flame": '<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 1.5-4.5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z"/>',
    "drain": '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 6v12M6 12h12" stroke="currentColor" stroke-width="2.4"/>',
    "heater": '<rect x="6" y="2.5" width="12" height="19" rx="3"/><circle cx="12" cy="9" r="2.4" fill="#fff"/>',
    "bolt": '<path d="M13.5 2 4 13.5h6.5L9 22l11-12.5h-6.8z"/>',
    "plug": '<path d="M8 2v6M16 2v6M5 8h14v4a7 7 0 0 1-14 0zM12 19v3"/>',
    "bulb": '<path d="M12 2a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 12 2zM9 20h6v2H9z"/>',
    "panel": '<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M8 7h3M13 7h3M8 11h3M13 11h3M8 15h3M13 15h3" stroke="#fff" stroke-width="1.6"/>',
    "wrench": '<path d="M21 6.5a5 5 0 0 1-6.6 4.7L6 19.6 3.4 17l8.4-8.4A5 5 0 0 1 17.5 2l-3 3 1.5 3 3 1.5z"/>',
    "shield": '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/>',
    "clock": '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l4 2.5" stroke="#fff" stroke-width="2" fill="none"/>',
    "pin": '<path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/>',
    "star": '<path d="m12 2 3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.8 5.7 21.4l1.5-7.1L1.8 9.4 9 8.6z"/>',
}


def icon_for(name):
    n = name.lower()
    for keys, ic in [(("heater",), "heater"), (("gas",), "flame"), (("drain", "sewer", "clog"), "drain"), (("leak", "water", "filter"), "drop"),
                     (("pipe", "repipe", "remodel", "construction"), "pipe"), (("ev", "charger", "plug", "outlet"), "plug"),
                     (("light",), "bulb"), (("panel", "breaker"), "panel"), (("emergency", "troubleshoot", "repair"), "bolt" if "elect" in n else "wrench"),
                     (("wiring", "rewir", "electric", "generator", "smart"), "bolt")]:
        if any(k in n for k in keys):
            return ic
    return "wrench"


def svg(name, size=24, color="currentColor"):
    return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="{color}" aria-hidden="true">{ICONS[name]}</svg>'


def pick(p):
    h = int(hashlib.sha256(p["slug"].encode()).hexdigest(), 16)
    theme_name = p.get("theme") or list(THEMES)[h % len(THEMES)]
    pal = PALETTES[p["trade"]][(h // 7) % len(PALETTES[p["trade"]])]
    return theme_name, THEMES[theme_name], pal


def e(s):
    return html.escape(str(s or ""), quote=True)


def hero_art(t, pal, trade):
    """Trade-specific vector artwork for the hero (no stock photos)."""
    p, a = pal
    if trade == "plumbing":
        lines = (f'<path d="M20 300 H170 Q210 300 210 260 V120 Q210 80 250 80 H380" stroke="{p}" stroke-width="34" fill="none" stroke-linecap="round"/>'
                 f'<path d="M60 360 H300 Q340 360 340 320 V200" stroke="{a}" stroke-width="22" fill="none" stroke-linecap="round"/>'
                 f'<circle cx="210" cy="190" r="26" fill="{a}"/><circle cx="340" cy="200" r="16" fill="{p}"/>'
                 f'<path d="M380 60 v40 M372 80 h16" stroke="{p}" stroke-width="10" stroke-linecap="round"/>'
                 f'<path d="M300 110c-14 20-22 30-22 42a22 22 0 0 0 44 0c0-12-8-22-22-42z" fill="{a}" opacity=".9"/>')
    else:
        lines = (f'<path d="M30 340 H140 V220 H260 V100 H390" stroke="{p}" stroke-width="10" fill="none"/>'
                 f'<path d="M30 260 H90 V160 H200 V60" stroke="{a}" stroke-width="10" fill="none" opacity=".85"/>'
                 + "".join(f'<circle cx="{x}" cy="{y}" r="12" fill="{c}"/>' for x, y, c in [(140, 340, p), (260, 220, p), (390, 100, p), (90, 260, a), (200, 160, a)])
                 + f'<path d="M290 150 236 230h34l-14 70 66-96h-36l20-54z" fill="{a if t["dark"] else p}"/>')
    return f'<svg viewBox="0 0 420 420" class="art" aria-hidden="true">{lines}</svg>'


def css(t, pal):
    p, a = pal
    up = "text-transform:uppercase;letter-spacing:.01em;" if t["upper"] else "letter-spacing:-.02em;"
    on_p = "#111" if p in ("#f5b301", "#ffd400", "#22d3ee", "#facc15") else "#fff"
    card = {
        "outline": f"border:1px solid var(--line);background:transparent;",
        "soft": "background:var(--surface);border:0;",
        "rule": "border-top:3px solid var(--p);background:transparent;border-radius:0;",
        "solid": "background:var(--surface);border:2px solid var(--ink);box-shadow:6px 6px 0 var(--ink);",
        "glow": f"background:var(--surface);border:1px solid {p}55;box-shadow:0 0 24px {p}22;",
        "numbered": "background:var(--surface);border:1px solid var(--line);",
    }[t["cards"]]
    return f"""
:root{{--bg:{t['bg']};--surface:{t['surface']};--ink:{t['ink']};--muted:{t['muted']};--line:{t['line']};--p:{p};--a:{a};--onp:{on_p};--r:{t['radius']};}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:400 17px/1.6 {t['body']};}}
h1,h2,h3{{font-family:{t['display']};margin:0;line-height:1.04;{up}text-wrap:balance}}
a{{color:inherit}} .wrap{{max-width:1160px;margin:0 auto;padding:0 28px}}
.concept{{background:#050809;color:#2ff5e6;text-align:center;font:600 12px/1.4 system-ui;letter-spacing:.08em;text-transform:uppercase;padding:7px}}
.nav{{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--line)}}
.nav .wrap{{display:flex;align-items:center;justify-content:space-between;gap:20px;padding-block:16px}}
.logo{{display:flex;align-items:center;gap:10px;font-family:{t['display']};font-size:21px;text-decoration:none;{up}}}
.logo i{{width:34px;height:34px;border-radius:calc(var(--r)/2 + 4px);background:var(--p);color:var(--onp);display:grid;place-items:center}}
.links{{display:flex;gap:26px;font-weight:600;font-size:15px}} .links a{{text-decoration:none;color:var(--muted)}} .links a.on{{color:var(--ink)}}
.btn{{display:inline-flex;align-items:center;gap:8px;background:var(--p);color:var(--onp);text-decoration:none;font-weight:700;padding:14px 22px;border-radius:var(--r);border:0;font-size:16px}}
.btn.ghost{{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 2px var(--ink)}}
.hero{{position:relative;overflow:hidden;padding-block:84px}}
.hero .wrap{{display:grid;gap:48px;align-items:center;{'grid-template-columns:1.1fr .9fr' if t['layout']=='split' else 'grid-template-columns:1fr;text-align:center;justify-items:center'}}}
.hero h1{{font-size:{'64px' if t['layout']!='stack' else '96px'};max-width:{'13ch' if t['layout']=='split' else '16ch'}}}
.hero h1 em{{font-style:normal;color:var(--p)}}
.hero p.lead{{font-size:20px;color:var(--muted);max-width:56ch;margin:18px 0 0}}
.chips{{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px;{'justify-content:center' if t['layout']!='split' else ''}}}
.chip{{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:var(--surface);font-weight:600;font-size:14px;border:1px solid var(--line)}}
.chip svg{{color:var(--p)}}
.cta{{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px;{'justify-content:center' if t['layout']!='split' else ''}}}
.art{{width:100%;max-width:440px;justify-self:center}}
.hero.stripes{{background:repeating-linear-gradient(135deg,var(--bg) 0 28px,var(--surface) 28px 56px)}}
.hero.blob::before{{content:"";position:absolute;width:760px;height:760px;border-radius:50%;background:radial-gradient(circle,var(--p) 0,transparent 65%);opacity:.14;top:-380px;left:50%;transform:translateX(-50%)}}
.hero.frame .wrap{{border:2px solid var(--ink);padding:56px;border-radius:var(--r);background:var(--surface)}}
.hero.block{{background:linear-gradient(90deg,var(--p) 0 52%,var(--bg) 52%)}} .hero.block h1,.hero.block p.lead,.hero.block .chip{{color:var(--onp)}}
.hero.block .chip{{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.3)}} .hero.block .chip svg{{color:var(--onp)}} .hero.block .btn{{background:var(--ink);color:var(--bg)}} .hero.block .btn.ghost{{background:transparent;color:var(--onp);box-shadow:inset 0 0 0 2px var(--onp)}} .hero.block h1 em{{color:var(--ink)}}
.hero.grid{{background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:44px 44px}}
.hero.grid h1 em{{text-shadow:0 0 28px {p}88}}
.hero.type h1{{font-size:104px;line-height:.92}} .hero.type .wrap{{text-align:left;justify-items:start}} .hero.type .chips,.hero.type .cta{{justify-content:flex-start}}
.strip{{background:var(--ink);color:var(--bg)}} .strip .wrap{{display:flex;flex-wrap:wrap;justify-content:space-between;gap:18px;padding-block:22px;font-weight:700}}
.strip span{{display:flex;align-items:center;gap:10px}} .strip svg{{color:var(--p)}}
section.band{{padding-block:88px}} .alt{{background:var(--surface)}}
.head{{max-width:720px;margin-bottom:40px}} .eyebrow{{font-weight:700;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--p)}}
.head h2{{font-size:46px;margin-top:10px}} .head p{{color:var(--muted);font-size:18px;margin:14px 0 0}}
.grid3{{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}}
.card{{{card}border-radius:var(--r);padding:28px;display:grid;gap:12px;align-content:start}}
.card .ic{{width:52px;height:52px;border-radius:calc(var(--r)/1.5 + 6px);background:var(--p);color:var(--onp);display:grid;place-items:center}}
.card h3{{font-size:22px}} .card p{{margin:0;color:var(--muted)}} .card .num{{font-family:{t['display']};font-size:42px;color:var(--p)}}
.split{{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}}
.facts{{display:grid;grid-template-columns:1fr 1fr;gap:18px}} .fact{{padding:24px;border-radius:var(--r);background:var(--bg);border:1px solid var(--line)}}
.fact b{{display:block;font-family:{t['display']};font-size:34px;color:var(--p);line-height:1.1}} .fact span{{color:var(--muted)}}
.reviews{{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}} .rev{{border:2px dashed var(--line);border-radius:var(--r);padding:26px;display:grid;gap:10px;color:var(--muted)}}
.stars{{display:flex;gap:2px;color:#f5a623}}
.areas{{display:flex;flex-wrap:wrap;gap:12px}} .areas span{{display:inline-flex;align-items:center;gap:8px;padding:12px 18px;border-radius:999px;background:var(--bg);border:1px solid var(--line);font-weight:600}} .areas svg{{color:var(--p)}}
.final{{background:var(--p);color:var(--onp);text-align:center}} .final h2{{font-size:54px}} .final p{{opacity:.85;font-size:19px}} .final .btn{{background:var(--ink);color:var(--bg);margin-top:18px;font-size:19px;padding:18px 28px}}
.pagehead{{padding-block:72px;background:var(--surface);border-bottom:1px solid var(--line)}} .pagehead h1{{font-size:62px}} .pagehead p{{color:var(--muted);font-size:20px;max-width:60ch}}
.svc-row{{display:grid;grid-template-columns:72px 1fr auto;gap:24px;align-items:center;padding:28px 0;border-bottom:1px solid var(--line)}} .svc-row .ic{{width:72px;height:72px;border-radius:var(--r);background:var(--p);color:var(--onp);display:grid;place-items:center}}
.svc-row h3{{font-size:26px}} .svc-row p{{margin:6px 0 0;color:var(--muted)}}
.form{{display:grid;gap:14px;background:var(--surface);padding:32px;border-radius:var(--r);border:1px solid var(--line)}} .form label{{display:grid;gap:6px;font-weight:600;font-size:14px;color:var(--muted)}}
.form input,.form select,.form textarea{{font:inherit;padding:14px;border-radius:calc(var(--r)/2 + 4px);border:1px solid var(--line);background:var(--bg);color:var(--ink)}}
.map{{border-radius:var(--r);min-height:260px;background:linear-gradient(135deg,var(--surface),var(--bg));border:1px solid var(--line);display:grid;place-items:center;color:var(--muted);font-weight:600;position:relative;overflow:hidden}}
.map::before{{content:"";position:absolute;inset:0;background-image:linear-gradient(var(--line) 2px,transparent 2px),linear-gradient(90deg,var(--line) 2px,transparent 2px);background-size:60px 60px;opacity:.6}} .map span{{position:relative;display:flex;gap:8px;align-items:center}} .map svg{{color:var(--p)}}
footer{{background:var(--ink);color:var(--bg);padding-block:44px}} footer .wrap{{display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;opacity:.85}}
.mcall{{display:none}}
@media(max-width:860px){{.links{{display:none}}.hero .wrap,.grid3,.split,.reviews{{grid-template-columns:1fr}}.hero{{padding-block:52px}}.hero h1,.hero.type h1{{font-size:42px}}.head h2,.final h2,.pagehead h1{{font-size:34px}}
.hero.block{{background:var(--p)}}.hero.frame .wrap{{padding:28px}}.facts{{grid-template-columns:1fr}}.svc-row{{grid-template-columns:56px 1fr}}.svc-row .btn{{display:none}}.art{{max-width:260px}}
.mcall{{display:flex;justify-content:center;position:fixed;left:12px;right:12px;bottom:12px;z-index:9;box-shadow:0 10px 30px rgba(0,0,0,.35)}}body{{padding-bottom:80px}}}}
"""


def site(p):
    """Return {filename: html} for the 4-page concept site."""
    name, t, pal = pick(p)
    company, city, state = e(p["company"]), e(p["city"]), e(p["state"])
    phone = p.get("phone") or ""
    digits = "".join(c for c in phone if c.isdigit())[-10:]
    call = f'<a class="btn" href="tel:+1{digits}">{svg("bolt" if p["trade"]=="electrical" else "drop", 18)} Call {e(phone)}</a>' if digits else '<a class="btn" href="contact.html">Get a free quote</a>'
    services = (p.get("services") or [])[:6]
    proof = p.get("proof") or []
    facts = p.get("facts") or []
    areas = p.get("areas") or [p["city"]]
    noun = "plumbing" if p["trade"] == "plumbing" else "electrical"
    headline = p.get("headline") or f"{city} {noun}, <em>done right.</em>"
    chips = "".join(f'<span class="chip">{svg(["shield","clock","star"][i % 3], 16)}<b>{e(a)}</b>&nbsp;{e(b)}</span>' for i, (a, b) in enumerate(proof[:3]))
    schema = html.escape(__import__("json").dumps({"@context": "https://schema.org", "@type": "Plumber" if p["trade"] == "plumbing" else "Electrician",
                          "name": p["company"], "telephone": phone, "areaServed": areas,
                          "address": {"@type": "PostalAddress", "addressLocality": p["city"], "addressRegion": p["state"], "addressCountry": "US"}}), quote=False)
    head = (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<meta name="robots" content="noindex,nofollow"><title>{{title}} | {company}</title>'
            f'<meta name="description" content="{e(p.get("sub",""))[:155]}">'
            f'<script type="application/ld+json">{schema}</script>'
            f'<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
            f'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?{t["fonts"]}"><style>{css(t, pal)}</style></head><body>'
            f'<div class="concept">Concept preview made for {company} by TradeSheets · not live · design "{name}"</div>')

    def nav(active):
        links = "".join(f'<a href="{f}" class="{"on" if f == active else ""}">{l}</a>' for f, l in [("index.html", "Home"), ("services.html", "Services"), ("about.html", "About"), ("contact.html", "Contact")])
        return f'<header class="nav"><div class="wrap"><a class="logo" href="index.html"><i>{svg("drop" if p["trade"]=="plumbing" else "bolt", 20)}</i>{company}</a><nav class="links">{links}</nav>{call}</div></header>'

    foot = (f'<footer><div class="wrap"><span>© {company} · {city}, {state}{(" · " + e(p["license"])) if p.get("license") else ""}</span>'
            f'<span>{e(phone)}</span><span>Concept by TradeSheets</span></div></footer>{call.replace(chr(34)+"btn"+chr(34), chr(34)+"btn mcall"+chr(34), 1)}</body></html>')
    stars = '<div class="stars">' + svg("star", 18, "#f5a623") * 5 + "</div>"
    reviews = "".join(f'<div class="rev">{stars}<p>Your best Google review goes here, with the customer\'s first name.</p><small>From your Google Business Profile</small></div>' for _ in range(3))
    svc_cards = "".join(
        (f'<div class="card"><span class="num">{i:02d}</span><h3>{e(s["name"])}</h3><p>{e(s["desc"])}</p></div>' if t["cards"] == "numbered"
         else f'<div class="card"><span class="ic">{svg(icon_for(s["name"]), 26)}</span><h3>{e(s["name"])}</h3><p>{e(s["desc"])}</p></div>')
        for i, s in enumerate(services, 1))
    fact_html = "".join(f'<div class="fact"><b>{e(a)}</b><span>{e(b)}</span></div>' for a, b in facts[:4])
    area_html = "".join(f'<span>{svg("pin", 16)}{e(a)}</span>' for a in areas)
    strip = "".join(f'<span>{svg(ic, 20)}{e(a)} {e(b)}</span>' for ic, (a, b) in zip(["shield", "clock", "star"], proof[:3]))

    home = (head.replace("{title}", f"{noun.title()} in {city}, {state}") + nav("index.html") +
            f'<section class="hero {t["hero"]}"><div class="wrap"><div><span class="eyebrow">{e(p.get("badge") or "Licensed · Local")}</span>'
            f'<h1>{headline}</h1><p class="lead">{e(p.get("sub",""))}</p><div class="chips">{chips}</div>'
            f'<div class="cta">{call}<a class="btn ghost" href="contact.html">Free quote</a></div></div>'
            f'{hero_art(t, pal, p["trade"]) if t["layout"]=="split" else ""}</div></section>'
            f'<div class="strip"><div class="wrap">{strip}</div></div>'
            f'<section class="band"><div class="wrap"><div class="head"><span class="eyebrow">Services</span><h2>What we do best</h2>'
            f'<p>Everything {company} handles across {city} and nearby.</p></div><div class="grid3">{svc_cards}</div></div></section>'
            + (f'<section class="band alt"><div class="wrap split"><div class="head"><span class="eyebrow">Why us</span><h2>Why {city} calls {company}</h2>'
               f'<p>{e(p.get("sub",""))}</p></div><div class="facts">{fact_html}</div></div></section>' if fact_html else "")
            + f'<section class="band"><div class="wrap"><div class="head"><span class="eyebrow">Reviews</span><h2>What customers say</h2></div><div class="reviews">{reviews}</div></div></section>'
            f'<section class="band alt"><div class="wrap"><div class="head"><span class="eyebrow">Service area</span><h2>Proudly serving {city}</h2></div><div class="areas">{area_html}</div></div></section>'
            f'<section class="band final"><div class="wrap"><h2>{e(p.get("final") or "Ready when you are.")}</h2><p>Call now or request a free quote online.</p>{call}</div></section>' + foot)

    rows = "".join(f'<div class="svc-row"><span class="ic">{svg(icon_for(s["name"]), 34)}</span><div><h3>{e(s["name"])}</h3><p>{e(s["desc"])}</p></div><a class="btn ghost" href="contact.html">Get a quote</a></div>' for s in services)
    services_pg = (head.replace("{title}", "Services") + nav("services.html") +
                   f'<section class="pagehead"><div class="wrap"><span class="eyebrow">Services</span><h1>{noun.title()} services in {city}</h1><p>{e(p.get("sub",""))}</p></div></section>'
                   f'<section class="band"><div class="wrap">{rows}</div></section>'
                   f'<section class="band final"><div class="wrap"><h2>Not sure what you need?</h2><p>Describe the problem and we\'ll tell you straight.</p>{call}</div></section>' + foot)

    about = (head.replace("{title}", "About") + nav("about.html") +
             f'<section class="pagehead"><div class="wrap"><span class="eyebrow">About</span><h1>About {company}</h1><p>{e(p.get("personalization","").replace("I saw ", "").replace("I liked that ", "").replace("I noticed ", "").replace("I read that ", ""))}</p></div></section>'
             f'<section class="band"><div class="wrap split"><div class="head"><span class="eyebrow">Our story</span><h2>Local, licensed and here when you call</h2>'
             f'<p>Your story goes here in your own words: how you started, who\'s on the crew, and what you promise every customer.</p></div>'
             f'<div class="facts">{fact_html or "".join(f"<div class=fact><b>{e(a)}</b><span>{e(b)}</span></div>" for a, b in proof[:3])}</div></div></section>'
             f'<section class="band alt"><div class="wrap"><div class="head"><span class="eyebrow">Reviews</span><h2>Trusted by your neighbors</h2></div><div class="reviews">{reviews}</div></div></section>' + foot)

    opts = "".join(f"<option>{e(s['name'])}</option>" for s in services) + "<option>Something else</option>"
    contact = (head.replace("{title}", "Contact") + nav("contact.html") +
               f'<section class="pagehead"><div class="wrap"><span class="eyebrow">Contact</span><h1>Get a free quote</h1><p>Tell us what\'s going on. Or just call {e(phone)}.</p></div></section>'
               f'<section class="band"><div class="wrap split"><form class="form" onsubmit="event.preventDefault()"><label>What do you need?<select>{opts}</select></label>'
               f'<label>Your name<input placeholder="First and last name"></label><label>Phone<input placeholder="(555) 555-0199"></label>'
               f'<label>Address or ZIP<input placeholder="ZIP code"></label><label>Details<textarea rows="4" placeholder="Describe the problem"></textarea></label>'
               f'<button class="btn" type="button">Send my request</button></form>'
               f'<div style="display:grid;gap:18px"><div class="map"><span>{svg("pin", 22)} Serving {e(", ".join(areas[:4]))}</span></div>'
               f'<div class="facts"><div class="fact"><b>{svg("clock", 26)}</b><span>{e(next((b for a, b in proof if "am" in b or "pm" in b), "Your hours here"))}</span></div>'
               f'<div class="fact"><b>{svg("pin", 26)}</b><span>{city}, {state}</span></div></div></div></div></section>' + foot)
    return name, {"index.html": home, "services.html": services_pg, "about.html": about, "contact.html": contact}
