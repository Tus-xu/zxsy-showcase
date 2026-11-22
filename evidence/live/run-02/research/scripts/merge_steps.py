# -*- coding: utf-8 -*-
"""Merge per-probe API evidence into api/steps.json and rebuild per-run body files.

Run labels and source files:
  p01  api/steps.json          (initial page inventory; used before harness split)
  p02  api/steps-p02.json      read probe
  p03  api/steps-p03.json      read deep (import / selection / chat / presets)
  p04  api/steps-p04.json      write attempt 1 (mode switch lost)
  p04b api/steps-p04b.json     write compile success
  p05  api/steps-p05.json      landing/account/start-modes/new project
  p06  api/steps-p06.json      error compile / agent / account tabs
  p07  api/steps-p07.json      blank PDF diagnostics / search / locate / quote
  p08  api/steps-p08.json      agent capabilities (derive/citation/locate)
  p09  api/steps-p09.json      selection verbs
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path
from urllib.parse import urlsplit

OUT = Path(r"D:\zxsy-math-arena-showcase\evidence\live\run-02\research")
API = OUT / "api"
BODIES = API / "bodies"
BODIES.mkdir(parents=True, exist_ok=True)
for f in BODIES.glob("*.txt"):
    f.unlink()

SOURCES = [
    ("p01", API / "steps.json"),
    ("p02", API / "steps-p02.json"),
    ("p03", API / "steps-p03.json"),
    ("p04", API / "steps-p04.json"),
    ("p04b", API / "steps-p04b.json"),
    ("p05", API / "steps-p05.json"),
    ("p06", API / "steps-p06.json"),
    ("p07", API / "steps-p07.json"),
    ("p08", API / "steps-p08.json"),
    ("p09", API / "steps-p09.json"),
    ("session", API / "steps-session.json"),
]


def slug(url: str) -> str:
    p = urlsplit(url)
    s = (p.path or "/").strip("/").replace("/", "_")[:55]
    cleaned = "".join(ch for ch in s if ch.isalnum() or ch in "._-")
    return cleaned[:55] or "root"


def main() -> int:
    merged = {
        "meta": {
            "base": "http://127.0.0.1:5176",
            "viewport": "1672x941 dpr=1 headless Chromium",
            "role": "researcher (林知远 13800001003)",
            "captured_at": "2026-11-22 02:04-02:36 Asia/Shanghai",
            "sanitization": "Authorization/Cookie/token/password/verification-code fields replaced with <redacted>; bodies truncated to first 4KB",
            "note": "Same-origin /api/* requests go through the Vite frontend (5176) to backend gateway; upstream ports 8000/8300 are not directly requested by the UI.",
        },
        "runs": [],
        "api_steps": [],
        "console_errors": [],
        "console_warnings": [],
        "page_errors": [],
    }
    gid = 0
    for label, path in SOURCES:
        if not path.exists():
            merged["runs"].append({"run": label, "source": str(path.name), "missing": True})
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        steps = data.get("api_steps", [])
        run_entry = {
            "run": label,
            "source": str(path.relative_to(OUT)),
            "steps_count": len(steps),
            "steps": data.get("captured_steps", []),
        }
        merged["runs"].append(run_entry)
        for rec in steps:
            gid += 1
            rec = dict(rec)
            rec["id"] = gid
            rec["run"] = label
            fn = BODIES / f"{gid:04d}_{label}_{rec.get('method','GET')}_{slug(rec.get('url',''))}.txt"
            payload = [
                f"# {rec.get('method')} {rec.get('url')}",
                f"# status={rec.get('status')} run={label} step={rec.get('step')} t={rec.get('t')}",
                "",
                "## request headers (sanitized)",
                json.dumps(rec.get("request_headers") or {}, ensure_ascii=False, indent=1),
                "",
                "## request body (first 4KB, sanitized)",
                rec.get("request_body") or "<empty>",
                "",
                "## response headers (sanitized)",
                json.dumps(rec.get("response_headers") or {}, ensure_ascii=False, indent=1),
                "",
                "## response body (first 4KB, sanitized)",
                rec.get("response_body") or "<binary/unavailable>",
            ]
            if rec.get("pdf_artifact"):
                payload.append(f"## binary PDF artifact: {rec['pdf_artifact']} ({rec.get('pdf_bytes')} bytes)")
            fn.write_text("\n".join(payload), encoding="utf-8")
            rec["body_file"] = str(fn.relative_to(OUT))
            merged["api_steps"].append(rec)
        for c in data.get("console_errors", []) or []:
            c = dict(c)
            c["run"] = label
            merged["console_errors"].append(c)
        for c in data.get("console_warnings", []) or []:
            c = dict(c)
            c["run"] = label
            merged["console_warnings"].append(c)
        for c in data.get("page_errors", []) or []:
            c = dict(c)
            c["run"] = label
            merged["page_errors"].append(c)

    (API / "steps.json").write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")

    # endpoint summary
    summary: dict = {}
    for rec in merged["api_steps"]:
        key = f"{rec.get('method')} {urlsplit(rec.get('url','')).path.split('?')[0]}"
        s = summary.setdefault(key, {"count": 0, "statuses": {}, "runs": set()})
        s["count"] += 1
        st = str(rec.get("status"))
        s["statuses"][st] = s["statuses"].get(st, 0) + 1
        s["runs"].add(rec.get("run"))
    for k, v in summary.items():
        v["runs"] = sorted(v["runs"])
    (API / "endpoints.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"runs={len(merged['runs'])} api_steps={len(merged['api_steps'])} bodies={len(list(BODIES.glob('*.txt')))}")
    print(f"console_errors={len(merged['console_errors'])} warnings={len(merged['console_warnings'])} page_errors={len(merged['page_errors'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())