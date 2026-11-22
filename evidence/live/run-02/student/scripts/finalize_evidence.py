# -*- coding: utf-8 -*-
"""收尾：把备用账号（tag=x）的三题证据统一重命名为 a-t1/a-t2/a-t3 规范命名，
更新 guide-results 路径、生成 canonical guide-results.json / steps.json，并清理失败轮次的旧截图。
"""
from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = Path(r"D:\zxsy-math-arena-showcase\evidence\live\run-02\student")
SHOTS = BASE / "shots"
API = BASE / "api"
DOM = API / "dom"
BODIES = API / "bodies"


def canon(p: str) -> str:
    return (p.replace("shots/x-ta-", "shots/a-t1-").replace("shots/x-tb-", "shots/a-t2-")
             .replace("shots/x-tc-", "shots/a-t3-")
             .replace("shots/xta-", "shots/a-t1-").replace("shots/xtb-", "shots/a-t2-")
             .replace("shots/xtc-", "shots/a-t3-")
             .replace("api/dom/xta-", "api/dom/a-t1-").replace("api/dom/xtb-", "api/dom/a-t2-")
             .replace("api/dom/xtc-", "api/dom/a-t3-")
             .replace("api/dom/x-ta-", "api/dom/a-t1-").replace("api/dom/x-tb-", "api/dom/a-t2-")
             .replace("api/dom/x-tc-", "api/dom/a-t3-")
             .replace("bodies/x-a-turn", "bodies/a-t1-turn").replace("bodies/x-b-turn", "bodies/a-t2-turn")
             .replace("bodies/x-c-turn", "bodies/a-t3-turn"))


def rename_all():
    # 1) 清理主账号失败轮次留下的旧截图/旧 SSE（避免与新证据混淆）
    stale = []
    for pat in ("a-ta-*", "a-tb-*", "a-tc-*"):
        stale += list(SHOTS.glob(pat))
    stale += [SHOTS / "_login-error.png"]
    for f in stale:
        try:
            f.unlink()
            print("removed stale", f.name)
        except Exception:  # noqa: BLE001
            pass
    old_sse = [BODIES / "a-turn0-0.sse.txt"]
    for f in old_sse:
        if f.exists():
            f.unlink()
            print("removed stale", f.name)
    # 2) 重命名 x-* -> a-t1/2/3
    moved = 0
    for f in list(SHOTS.glob("x-t*.png")) + list(SHOTS.glob("xt*.png")):
        new_name = (f.name.replace("x-ta-", "a-t1-").replace("x-tb-", "a-t2-").replace("x-tc-", "a-t3-")
                    .replace("xta-", "a-t1-").replace("xtb-", "a-t2-").replace("xtc-", "a-t3-"))
        try:
            f.rename(SHOTS / new_name)
            moved += 1
        except Exception as e:  # noqa: BLE001
            print("rename-fail", f.name, e)
    for f in list(BODIES.glob("x-*.sse.txt")):
        new_name = f.name.replace("x-a-turn", "a-t1-turn").replace("x-b-turn", "a-t2-turn") \
                          .replace("x-c-turn", "a-t3-turn")
        try:
            f.rename(BODIES / new_name)
            moved += 1
        except Exception as e:  # noqa: BLE001
            print("rename-fail", f.name, e)
    for f in list(DOM.glob("x-*.html")) + list(DOM.glob("xt*.html")):
        new_name = (f.name.replace("x-ta-", "a-t1-").replace("x-tb-", "a-t2-").replace("x-tc-", "a-t3-")
                    .replace("xta-", "a-t1-").replace("xtb-", "a-t2-").replace("xtc-", "a-t3-"))
        try:
            f.rename(DOM / new_name)
            moved += 1
        except Exception as e:  # noqa: BLE001
            print("rename-fail", f.name, e)
    print("renamed files:", moved)


def update_json():
    p = API / "guide-results-x-ABC.json"
    if not p.exists():
        print("missing", p)
        return
    raw = p.read_text(encoding="utf-8")
    # 递归字符串替换（对 path 字段最稳妥）
    def walk(o):
        if isinstance(o, str):
            return canon(o)
        if isinstance(o, list):
            return [walk(x) for x in o]
        if isinstance(o, dict):
            return {k: walk(v) for k, v in o.items()}
        return o
    d = json.loads(raw)
    d = walk(d)
    (API / "guide-results.json").write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
    p.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
    print("guide-results.json written; cases:", list(d.get("cases", {}).keys()))
    # canonical steps
    sx = API / "steps-x.json"
    if sx.exists():
        shutil.copyfile(sx, API / "steps.json")
        print("steps.json <= steps-x.json", sx.stat().st_size)


def main() -> int:
    rename_all()
    update_json()
    # 列出三题截图，确认命名
    for prefix in ("a-t1", "a-t2", "a-t3"):
        files = sorted(f.name for f in SHOTS.glob(prefix + "-*.png"))
        print(prefix, len(files), files[:5], "..." if len(files) > 5 else "")
    return 0


if __name__ == "__main__":
    sys.exit(main())