# -*- coding: utf-8 -*-
"""清理临时脚本/失败产物，并对全部证据 JSON/文本做 token 脱敏复检。"""
from __future__ import annotations

import io
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = Path(r"D:\zxsy-math-arena-showcase\evidence\live\run-02\student")
API = BASE / "api"
SCRIPTS = BASE / "scripts"

# 1) 临时调试脚本
temp = [
    "_probe_library.py", "_probe_login.py", "_probe_cdp.py",
    "_patch_finalize.py", "_patch_sse.py", "_patch_tag.py",
    "_patch_genflows.py", "_patch_genflows2.py", "_patch_report.py", "_patch_sections.py",
]
for name in temp:
    f = SCRIPTS / name
    if f.exists():
        f.unlink()
        print("removed script", name)

# 2) 失败轮次产物
for name in ("guide-results-A.json", "flow-A-cont.json", "report-sections.md"):
    f = API / name
    if f.exists():
        f.unlink()
        print("removed api artifact", name)

# 3) 证据脱敏（响应体里可能有 local-upload token / raw token / 预签名签名）
PATTERNS = [
    (re.compile(r"(token=)[A-Za-z0-9_\-]{6,}"), r"\1<redacted>"),
    (re.compile(r'("(?:token|access_token|refresh_token)"\s*:\s*")[^"]*'), r"\1<redacted>"),
    (re.compile(r"(X-Amz-Signature=)[A-Fa-f0-9]+"), r"\1<redacted>"),
    (re.compile(r"(X-Amz-Credential=)[^&\"\s]+"), r"\1<redacted>"),
    (re.compile(r'("(?:cookie|set-cookie|authorization)"\s*:\s*")[^"]*', re.I), r"\1<redacted>"),
]


def sanitize_text(path: Path) -> bool:
    try:
        raw = path.read_text(encoding="utf-8")
    except Exception:  # noqa: BLE001
        return False
    new = raw
    for pat, rep in PATTERNS:
        new = pat.sub(rep, new)
    if new != raw:
        path.write_text(new, encoding="utf-8")
        return True
    return False


changed = []
for f in list(API.glob("*.json")) + list(API.glob("bodies/*.json")) + list(API.glob("bodies/*.txt")) + list(API.glob("bodies/*.sse.txt")):
    if sanitize_text(f):
        changed.append(f.name)
print("sanitized files:", len(changed))
print(changed[:30])

# 4) 残留敏感串复检
BAD = [re.compile(r"token=(?!<redacted>)"), re.compile(r'"Authorization"\s*:\s*"(?!<redacted>)', re.I),
       re.compile(r'"Cookie"\s*:\s*"(?!<redacted>)', re.I), re.compile(r"MathArenaDemo2026")]
hits = []
for f in list(API.rglob("*.*")):
    if f.suffix.lower() not in (".json", ".txt", ".md", ".html"):
        continue
    try:
        t = f.read_text(encoding="utf-8", errors="ignore")
    except Exception:  # noqa: BLE001
        continue
    for pat in BAD:
        if pat.search(t):
            hits.append((str(f.relative_to(BASE)), pat.pattern))
print("sensitive hits:", hits[:20])

# 5) 关键文件结构校验
for c in "ABC":
    f = API / f"flow-{c}.json"
    d = json.loads(f.read_text(encoding="utf-8"))
    print(c, "flow ok turns=", len(d["turns"]), "sse=", sum(1 for t in d["turns"] if t["sse"]),
          "concluded=", d["final_state"]["concluded"], "blocked=", d["final_state"]["blocked_at"])
print("REPORT bytes:", (BASE / "REPORT.md").stat().st_size)
print("shots:", len(list((BASE / "shots").glob("*.png"))))