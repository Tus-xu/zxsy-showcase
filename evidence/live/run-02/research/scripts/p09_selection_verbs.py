# -*- coding: utf-8 -*-
"""P09: selection-toolbar verbs end-to-end — 评判 / 引用(clipboard toast) / 高亮 / 找证据.
"""
from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, r"D:\zxsy-math-arena-showcase\.work\scripts")
sys.path.insert(0, str(Path(__file__).parent))

from playwright.sync_api import sync_playwright  # noqa: E402

import harness as H  # noqa: E402
import sess as S  # noqa: E402

R: dict = {}
BASE = "http://127.0.0.1:5176"
PID = "e49b27e2-b05f-45c3-ac99-dd0792d9ab80"
AGENT = "() => (document.querySelector('.rw-agent')||{}).innerText||''"
TOAST = "() => (document.querySelector('.rw-pdf__toast')||{}).innerText||''"


def select_passage(page) -> str:
    box = page.evaluate("""() => {
      const el = document.querySelector('.rw-pdf__text');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {x:r.x,y:r.y,w:r.width,h:r.height};
    }""")
    if not box:
        return ""
    x0 = box["x"] + box["w"] * 0.20
    y0 = box["y"] + box["h"] * 0.27
    x1 = box["x"] + box["w"] * 0.72
    y1 = box["y"] + box["h"] * 0.33
    page.mouse.move(x0, y0)
    page.mouse.down()
    for k in range(1, 7):
        page.mouse.move(x0 + (x1 - x0) * k / 6, y0 + (y1 - y0) * k / 6)
        page.wait_for_timeout(50)
    page.mouse.up()
    page.wait_for_timeout(1200)
    return page.evaluate("() => String(window.getSelection ? window.getSelection().toString() : '').slice(0,300)")


def click_verb(page, verb: str) -> bool:
    try:
        page.locator(".rw-selbar__btn", has_text=verb).first.click(timeout=6000)
        return True
    except Exception as exc:  # noqa: BLE001
        H.log(f"verb {verb} click FAIL " + str(exc)[:160])
        return False


def agent_after(page, before_len: int, wait_ms: int = 45000) -> dict:
    start = time.time()
    last = agent(page)
    lazy = 0
    while (time.time() - start) * 1000 < wait_ms:
        page.wait_for_timeout(2500)
        cur = agent(page)
        if len(cur) > before_len + 20:
            page.wait_for_timeout(3000)
            return {"text": agent(page), "seconds": round(time.time() - start)}
        if cur == last:
            lazy += 1
        else:
            lazy = 0
        last = cur
    return {"text": agent(page), "seconds": round(time.time() - start), "timeout": True}


def main() -> int:
    with sync_playwright() as p:
        browser, ctx, page = S.open_page(p)
        try:
            ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
        except Exception as exc:  # noqa: BLE001
            H.log("grant clipboard FAIL " + str(exc)[:120])

        stp = H.start_step("open-read", "打开阅读工作区，选中可渲染 PDF")
        try:
            page.goto(f"{BASE}/research-workspace/{PID}/read", wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(14000)
            page.get_by_role("button", name=re.compile("research-paper-1")).first.click(timeout=10000)
            page.wait_for_timeout(9000)
            H.shot(page, "17-read-ready.png", full=False)
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:300]
        H.end_step(stp)

        # 评判
        stp = H.start_step("verb-judge", "选区工具条「评判」")
        try:
            before = len(page.evaluate(AGENT))
            sel = select_passage(page)
            ok = click_verb(page, "评判")
            R["judge"] = {"selection": sel, "clicked": ok}
            R["judge"].update(agent_after(page, before, 45000))
            H.shot(page, "17-agent-judge.png", full=False)
            H.log("judge reply delta=" + str(len(R["judge"].get("text", "")) - before))
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:300]
        H.end_step(stp)

        # 引用 (clipboard + toast)
        stp = H.start_step("verb-cite", "选区工具条「引用」→ toast + 剪贴板文本")
        try:
            sel = select_passage(page)
            ok = click_verb(page, "引用")
            page.wait_for_timeout(800)
            toast = page.evaluate(TOAST)
            clip = ""
            try:
                clip = page.evaluate("() => navigator.clipboard.readText()")[:400]
            except Exception as exc:  # noqa: BLE001
                clip = "CLIPBOARD_ERR:" + str(exc)[:120]
            R["cite"] = {"selection": sel, "clicked": ok, "toast": toast, "clipboard": clip}
            H.shot(page, "17-cite-toast.png", full=False)
            H.log("cite " + json.dumps(R["cite"], ensure_ascii=False)[:400])
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:300]
        H.end_step(stp)

        # 高亮
        stp = H.start_step("verb-highlight", "选区工具条「高亮选中文字」→ 叠层标记")
        try:
            sel = select_passage(page)
            ok = False
            try:
                page.locator(".rw-selbar__icon").first.click(timeout=6000)
                ok = True
            except Exception as exc:  # noqa: BLE001
                H.log("highlight click FAIL " + str(exc)[:140])
            page.wait_for_timeout(1500)
            marks = page.evaluate("() => [...document.querySelectorAll('.rw-pdf__mark')].map(e=>e.className)")
            R["highlight"] = {"selection": sel, "clicked": ok, "marks": marks}
            H.shot(page, "17-highlight.png", full=False)
            H.log("highlight " + json.dumps(R["highlight"], ensure_ascii=False)[:300])
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:300]
        H.end_step(stp)

        # 找证据
        stp = H.start_step("verb-evidence", "选区工具条「找证据」→ Agent 结果")
        try:
            before = len(page.evaluate(AGENT))
            sel = select_passage(page)
            ok = click_verb(page, "找证据")
            R["evidence"] = {"selection": sel, "clicked": ok}
            R["evidence"].update(agent_after(page, before, 50000))
            H.shot(page, "17-agent-evidence.png", full=False)
            H.log("evidence reply delta=" + str(len(R["evidence"].get("text", "")) - before))
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:300]
        H.end_step(stp)

        H.finalize({"p09": R}, "api/steps-p09.json")
        (H.OUT / "api" / "p09-results.json").write_text(json.dumps(R, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
        S.save_state(ctx)
        ctx.close()
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())