# -*- coding: utf-8 -*-
"""run-02 教师端 · 证据统计：后端 API 调用汇总（排除 Vite 静态源码请求）+ 产物目录检查。"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

API = Path(r"D:\zxsy-math-arena-showcase\evidence\live\run-02\teacher\api")
ART = Path(r"D:\zxsy-math-arena-showcase\evidence\live\run-02\teacher\artifacts")
FILES = ["run-01-identity-pages.json", "run-02a-workspace.json", "run-02b-edit-export-publish.json",
         "run-03-pages-detail.json", "run-04-new-session.json", "run-05-textbook-picker.json", "run-06-clean.json"]
rows = []
for fn in FILES:
    d = json.loads((API / fn).read_text(encoding="utf-8"))
    for x in d.get("api_calls", []):
        u = x.get("url", "")
        if "/api/" not in u or "/src/" in u:
            continue
        path = u.split("?")[0].replace("http://127.0.0.1:5176", "")
        rows.append({"file": fn, "method": x["method"], "status": x.get("status"), "path": path,
                     "req": x.get("request_body", ""), "resp": x.get("body_preview", ""), "body_file": x.get("body_file")})
agg = Counter((r["method"], r["status"], r["path"]) for r in rows)
summary = {"backend_api_calls": len(rows),
           "by_status": dict(Counter(str(r["status"]) for r in rows)),
           "unique_endpoints": [{"method": m, "status": s, "path": p, "count": c} for (m, s, p), c in sorted(agg.items())],
           "artifacts": {"files": [p.name for p in ART.iterdir() if p.is_file()] if ART.exists() else [], "count": len([p for p in ART.iterdir() if p.is_file()]) if ART.exists() else 0},
           "server_errors": [r for r in rows if isinstance(r["status"], int) and r["status"] >= 400]}
(API / "SUMMARY.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
print("backend_api_calls", len(rows), "status", summary["by_status"], "artifacts", summary["artifacts"]["count"])
for e in summary["unique_endpoints"]:
    print(f'{e["count"]:3d} {e["method"]:5s} {e["status"]} {e["path"]}')