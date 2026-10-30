"""Audit a prospect's CURRENT website and save measurable findings, used to tailor their preview and email.

Usage: python3 business/scripts/audit_site.py <slug> [<slug> ...]
Reads business/webdev/prospects/<slug>.json (sources[0] = their site), writes "audit" into that JSON.
Only reports what was actually measured; nothing is guessed.
"""
import json
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def fetch(url):
    t0 = time.time()
    r = subprocess.run(["curl", "-sL", "--max-time", "30", "-o", "-", "-w", "\n__META__%{http_code} %{url_effective} %{size_download} %{time_total}", url],
                       capture_output=True, text=True, errors="replace")
    body, _, meta = r.stdout.rpartition("\n__META__")
    parts = meta.split()
    if len(parts) < 4:
        return None
    return {"html": body, "status": int(parts[0]), "final_url": parts[1], "bytes": int(float(parts[2])), "seconds": float(parts[3]), "wall": time.time() - t0}


def audit(p):
    url = (p.get("sources") or [f'https://{p.get("source_domain", "")}'])[0]
    r = fetch(url)
    if not r or r["status"] >= 400 or not r["html"]:
        return {"url": url, "reachable": False}
    h = r["html"]
    low = h.lower()
    text = re.sub(r"<script.*?</script>|<style.*?</style>|<[^>]+>", " ", h, flags=re.S | re.I)
    years = [int(y) for y in re.findall(r"(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(20\d\d|19\d\d)", h, flags=re.I)]
    imgs = re.findall(r"<img\b[^>]*>", h, flags=re.I)
    findings = {
        "url": url, "reachable": True,
        "https": r["final_url"].startswith("https://"),
        "load_seconds": round(r["seconds"], 2),
        "html_kb": round(r["bytes"] / 1024),
        "mobile_viewport": bool(re.search(r'<meta[^>]+name=["\']viewport', h, re.I)),
        "pinch_zoom_disabled": bool(re.search(r'user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b', h, re.I)),
        "click_to_call": "href=\"tel:" in low or "href='tel:" in low,
        "quote_form": "<form" in low,
        "title": (re.search(r"<title[^>]*>(.*?)</title>", h, re.S | re.I) or [None, ""])[1].strip()[:120],
        "meta_description": bool(re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'][^"\']{20,}', h, re.I)),
        "local_business_schema": bool(re.search(r'"@type"\s*:\s*"(LocalBusiness|Plumber|Electrician|HomeAndConstructionBusiness|HVACBusiness)"', h)),
        "h1_count": len(re.findall(r"<h1\b", h, re.I)),
        "images": len(imgs),
        "images_missing_alt": sum(1 for i in imgs if not re.search(r'\balt\s*=\s*["\'][^"\']+', i, re.I)),
        "copyright_year": max(years) if years else None,
        "word_count": len(text.split()),
        "placeholder_text": sorted(set(m.lower() for m in re.findall(r"lorem ipsum|slide title|write your caption here|your title here|sample page|hello world", h, re.I))),
        "spam_injection": bool(re.search(r"online casino|pokies|slot gacor|casino bonus", h, re.I)),
        "builder": next((b for b, pat in [("Wix", "wix.com"), ("Squarespace", "squarespace"), ("GoDaddy Website Builder", "godaddy|websitebuilder"),
                                           ("WordPress", "wp-content"), ("Joomla", "joomla"), ("Weebly", "weebly")] if re.search(pat, low)), "custom/unknown"),
    }
    issues = []
    if findings["spam_injection"]: issues.append("Hidden casino-spam links injected into the homepage (a hack)")
    if not findings["https"]: issues.append("No HTTPS: browsers show \"Not secure\"")
    if not findings["mobile_viewport"]: issues.append("Not set up for phones (no mobile viewport)")
    if findings["pinch_zoom_disabled"]: issues.append("Pinch-to-zoom is disabled on phones")
    if not findings["click_to_call"]: issues.append("No tap-to-call phone link")
    if not findings["quote_form"]: issues.append("No quote/contact form on the homepage")
    if findings["placeholder_text"]: issues.append("Template placeholder text left on the page: " + ", ".join(f'"{x}"' for x in findings["placeholder_text"]))
    if not findings["meta_description"]: issues.append("No Google search description (meta description)")
    if not findings["local_business_schema"]: issues.append("No local-business data for Google (schema)")
    if findings["copyright_year"] and findings["copyright_year"] <= 2022: issues.append(f'Footer still says © {findings["copyright_year"]}')
    if findings["load_seconds"] >= 3: issues.append(f'Slow: {findings["load_seconds"]}s just to load the page HTML')
    if findings["h1_count"] == 0: issues.append("No main headline (H1) for Google")
    if findings["images"] and findings["images_missing_alt"] >= max(3, findings["images"] // 2): issues.append(f'{findings["images_missing_alt"]} of {findings["images"]} images have no description for Google')
    findings["issues"] = issues
    findings["score"] = max(0, 100 - 12 * len(issues))
    return findings


def main(slugs):
    for slug in slugs:
        f = ROOT / "business/webdev/prospects" / f"{slug}.json"
        p = json.loads(f.read_text())
        p["audit"] = audit(p)
        f.write_text(json.dumps(p, indent=2, ensure_ascii=False))
        a = p["audit"]
        print(f'{slug:32} score {a.get("score", "n/a"):>3}  issues {len(a.get("issues", []))}  ' + "; ".join(a.get("issues", [])[:3]))


if __name__ == "__main__":
    main(sys.argv[1:])
