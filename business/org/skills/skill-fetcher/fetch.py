"""Search and load TradeSheets agent role cards from business/org/registry.json.

  fetch.py "query words"          ranked matches
  fetch.py --show NAME            print the role card
  fetch.py --chain NAME           chain of command up to the owner
  fetch.py --team NAME            direct reports
Options: --top N (default 5), --dept TEXT (filter by department substring)
"""
import argparse
import difflib
import json
import os
import re
import sys
from pathlib import Path

# Words that are common across almost every card and only add noise to ranking.
STOP = {"a", "an", "the", "to", "for", "of", "and", "or", "in", "on", "with", "my", "our", "i", "me", "do", "make"}
SYNONYMS = {"invoice": ["payment", "paid", "invoices"], "pay": ["payment", "paid"], "signup": ["account", "create"],
            "email": ["outreach", "inbox", "emails"], "leads": ["lead", "contacts"], "form": ["forms", "submit"],
            "approve": ["approval", "signature"], "listing": ["listings", "gumroad", "etsy"], "client": ["clients"]}


def find_registry():
    env = os.environ.get("TRADESHEETS_REGISTRY")
    if env:
        return Path(env)
    for d in [Path.cwd(), *Path.cwd().parents, *Path(__file__).resolve().parents]:
        p = d / "business" / "org" / "registry.json"
        if p.exists():
            return p
    sys.exit("registry.json not found: run from the repo, or set TRADESHEETS_REGISTRY")


def tokens(text):
    return [t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOP]


def score(entry, query):
    name = set(tokens(entry["name"]))
    body = tokens(entry["description"] + " " + entry["department"])
    s = 0.0
    for q in query:
        variants = [q] + SYNONYMS.get(q, [])
        if any(v in name for v in variants):
            s += 3
        s += sum(body.count(v) for v in variants)
    return s / (1 + 0.02 * len(body))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("query", nargs="*")
    ap.add_argument("--show")
    ap.add_argument("--chain")
    ap.add_argument("--team")
    ap.add_argument("--top", type=int, default=5)
    ap.add_argument("--dept")
    a = ap.parse_args()

    reg_path = find_registry()
    reg = json.loads(reg_path.read_text())
    by_name = {e["name"]: e for e in reg}
    repo = reg_path.parents[2]

    def need(name):
        if name not in by_name:
            close = difflib.get_close_matches(name, by_name, n=3, cutoff=0.4)
            sys.exit(f"no agent named {name!r}. Did you mean: {', '.join(close)}?")
        return by_name[name]

    if a.show:
        print((repo / need(a.show)["path"]).read_text())
    elif a.chain:
        print(" → ".join([a.chain] + need(a.chain)["chain"]))
    elif a.team:
        need(a.team)
        for e in reg:
            if e["reports_to"] == a.team:
                print(f"{e['name']:40} {e['description']}")
    elif a.query:
        q = tokens(" ".join(a.query))
        pool = [e for e in reg if not a.dept or a.dept.lower() in e["department"].lower()]
        ranked = sorted(pool, key=lambda e: -score(e, q))[:a.top]
        for e in ranked:
            if score(e, q) == 0:
                break
            flag = "  [browser]" if e["browser"] else ""
            print(f"{e['name']}{flag}\n    {e['department']} · reports to {e['reports_to']}\n    {e['description']}\n    {e['path']}")
    else:
        ap.print_help()


if __name__ == "__main__":
    main()
