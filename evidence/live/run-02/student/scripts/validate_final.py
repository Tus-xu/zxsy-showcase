# -*- coding: utf-8 -*-
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
base = Path(r"D:\zxsy-math-arena-showcase\evidence\live\run-02\student")
r = (base / "REPORT.md").read_text(encoding="utf-8")
print("placeholders:", re.findall(r"<!--[^>]*-->", r))
print("sections:", re.findall(r"^## (.+)$", r, flags=re.M))
refs = set(re.findall(r"`(shots/[^`]+)`", r))
missing = [p for p in sorted(refs) if not (base / p).exists()]
print("shot refs:", len(refs), "missing:", missing)
print("A ending row ok:", "| A 双曲线离心率 | **未到达" in r)
bad = []
for f in (base / "api").rglob("*"):
    if f.suffix.lower() in (".json", ".txt", ".md", ".html"):
        t = f.read_text(encoding="utf-8", errors="ignore")
        if (re.search(r"token=(?!<redacted>|%3Credacted)", t) and "vite-client" not in f.name) \
                or "MathArenaDemo2026" in t:
            bad.append(str(f.relative_to(base)))
print("sensitive files:", bad[:5])
print("shots count:", len(list((base / "shots").glob("*.png"))))
print("pages.json records:", len(json.load(open(base / "pages.json", encoding="utf-8"))["records"]))
for c in "ABC":
    d = json.load(open(base / f"api/flow-{c}.json", encoding="utf-8"))
    print(c, "turns", len(d["turns"]), "sse", sum(1 for t in d["turns"] if t["sse"]),
          "concluded", d["final_state"]["concluded"], "blocked", d["final_state"]["blocked_at"],
          "upload", d["upload"]["status"], "parse", d["parse"]["status"],
          "content", d["file_content"]["status"], "filename", d["upload_req_filename"],
          "sha", d["upload_req_sha256"][:12] if d["upload_req_sha256"] else None)
print("REPORT size:", len(r.encode("utf-8")))
print("body samples:", [t for t in ["①", "②", "③", "④", "⑤", "⑥", "⑦"] if t in r])