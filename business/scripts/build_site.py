"""Build the TradeSheets sales page with the live demo embedded.

Usage: python business/scripts/build_site.py
Reads business/site/sales.template.html and business/site/tracker.html, writes business/site/index.html.
The tracker app goes into an <iframe srcdoc> so its styles and script stay separate from the page's.
"""
import html
from pathlib import Path

SITE = Path(__file__).resolve().parents[1] / "site"


def main():
    tracker = (SITE / "tracker.html").read_text()
    doc = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
           '<meta name="viewport" content="width=device-width, initial-scale=1">'
           '<style>body{margin:0}</style></head><body>' + tracker + '</body></html>')
    page = (SITE / "sales.template.html").read_text()
    assert "__DEMO_SRCDOC__" in page
    (SITE / "index.html").write_text(page.replace("__DEMO_SRCDOC__", html.escape(doc, quote=True)))
    print("built", SITE / "index.html")


if __name__ == "__main__":
    main()
