"""Copy built previews into the public previews repo (ilicvix02/tradesheets-previews), watermarked.

Usage: python3 business/scripts/publish_previews.py [slug ...]   (no slugs = all built previews)
Each prospect gets <repo>/<slug>/ with index/services/about/contact.html plus email.jpg, fullpage.jpg, pages.jpg.
Pages are noindex and carry a fixed "CONCEPT PREVIEW" overlay, so they can't pass as a finished site.
Prospect research JSON is never copied.
"""
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "business/webdev/previews"
DEST = Path("/home/user/tradesheets-previews")
ASSETS = ROOT / "business/email-assets"

OVERLAY = """<style>
.ts-wm{position:fixed;inset:0;pointer-events:none;z-index:2147483647;overflow:hidden}
.ts-wm div{position:absolute;inset:-50%;transform:rotate(-24deg);display:flex;flex-wrap:wrap;align-content:center;gap:90px 120px;
font:800 34px/1 system-ui,sans-serif;letter-spacing:.12em;color:rgba(0,180,210,.13);text-transform:uppercase;white-space:nowrap}
.ts-bar{position:fixed;left:0;right:0;bottom:0;z-index:2147483646;background:#050809;color:#bff3ff;font:600 14px/1.4 system-ui,sans-serif;
text-align:center;padding:10px 12px;border-top:1px solid #18d6ff}
.ts-bar a{color:#18d6ff}
body{padding-bottom:46px}
</style>
<div class="ts-wm" aria-hidden="true"><div>""" + "<span>Concept preview · TradeSheets</span>" * 60 + """</div></div>
<div class="ts-bar">Concept preview built by TradeSheets. Want this live on your domain? Reply YES to the email you got this from.</div>
</body>"""


def publish(slug):
    src, out = SRC / slug, DEST / slug
    out.mkdir(parents=True, exist_ok=True)
    for page in ["index.html", "services.html", "about.html", "contact.html"]:
        if (src / page).exists():
            (out / page).write_text((src / page).read_text().replace("</body>", OVERLAY, 1))
    for img in ["email.jpg", "fullpage.jpg", "pages.jpg"]:
        if (src / img).exists():
            shutil.copy2(src / img, out / img)
    return out


def main(slugs):
    DEST.mkdir(exist_ok=True)
    (DEST / "assets").mkdir(exist_ok=True)
    for a in ["neon-header.gif", "founder-card.jpg"]:
        shutil.copy2(ASSETS / a, DEST / "assets" / a)
    (DEST / "robots.txt").write_text("User-agent: *\nDisallow: /\n")
    (DEST / ".nojekyll").write_text("")
    (DEST / "index.html").write_text('<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex,nofollow">'
                                    '<title>TradeSheets previews</title><body style="font:16px system-ui;padding:40px;background:#050809;color:#bff3ff">'
                                    'TradeSheets website concept previews. Each preview is private to the business it was made for.</body>')
    (DEST / "README.md").write_text("# TradeSheets previews\n\nWatermarked website concept previews and email images for TradeSheets outreach. Not indexed.\n")
    slugs = slugs or sorted(p.name for p in SRC.iterdir() if (p / "index.html").exists())
    for s in slugs:
        publish(s)
    print("published", len(slugs), "previews")


if __name__ == "__main__":
    main(sys.argv[1:])
