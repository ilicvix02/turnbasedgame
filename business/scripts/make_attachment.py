"""Make the email attachment for a built preview: a full-page JPG of the concept homepage, sized for email.

Usage: python3 business/scripts/make_attachment.py <slug> [<slug> ...]
Writes business/webdev/previews/<slug>/<Company>-homepage-concept.jpg (about 150-250 KB).
"""
import json
import os
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]


def main(slugs):
    npm_root = subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()
    for slug in slugs:
        out = ROOT / "business/webdev/previews" / slug
        spec = json.loads((ROOT / "business/webdev/prospects" / f"{slug}.json").read_text())
        raw = out / "full.png"
        js = f"""const {{ chromium }} = require('playwright');
(async () => {{ const b = await chromium.launch({{ proxy: process.env.HTTPS_PROXY ? {{ server: process.env.HTTPS_PROXY }} : undefined }});
const p = await b.newPage({{ viewport: {{ width: 1280, height: 800 }} }});
await p.goto('file://{out}/index.html', {{ waitUntil: 'networkidle', timeout: 60000 }}).catch(() => {{}});
await p.addStyleTag({{ content: 'header{{position:static!important}} .mcall{{display:none!important}}' }});
await p.waitForTimeout(600); await p.screenshot({{ path: '{raw}', fullPage: true }}); await b.close(); }})();"""
        subprocess.run(["node", "-e", js], check=True, env={**os.environ, "NODE_PATH": npm_root})
        im = Image.open(raw).convert("RGB")
        im = im.resize((900, int(im.height * 900 / im.width)), Image.LANCZOS)
        name = "".join(ch if ch.isalnum() else "-" for ch in spec["company"]).strip("-").replace("--", "-")
        dest = out / f"{name}-homepage-concept.jpg"
        im.save(dest, quality=62, optimize=True, progressive=True)
        raw.unlink()
        print(dest.name, os.path.getsize(dest))


if __name__ == "__main__":
    main(sys.argv[1:])
