# -*- coding: utf-8 -*-
"""P08: Agent capability triggers on a selected passage — 找证据 / 推导校验 / 引用补全,
locate-back action if produced, and toast feedback for 笔记/引用 toolbar verbs.
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

AGENT_TEXT = "() => (document.querySelector('.rw-agent')||{}).innerText||''"
TOAST_TEXT = "() => (document.querySelector('.rw-pdf__toast')||{}).innerText||''"


def agent(page) -> str:
    try:
        return page.evaluate(AGENT_TEXT)
    except Exception:
        return ""


def select_passage(page) -> str:
    box = page.evaluate("""() => {
      const el = document.querySelector('.rw-pdf__text');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {x:r.x,y:r.y,w:r.width,h:r.height};
    }""")
    if not box:
        return ""
    x0 = box["x"] + box["w"] * 0.18
    y0 = box["y"] + box["h"] * 0.25
    x1 = box["x"] + box["w"] * 0.80
    y1 = box["y"] + box["h"] * 0.33
    page.mouse.move(x0, y0)
    page.mouse.down()
    for k in range(1, 7):
        page.mouse.move(x0 + (x1 - x0) * k / 6, y0 + (y1 - y0) * k / 6)
        page.wait_for_timeout(50)
    page.mouse.up()
    page.wait_for_timeout(1000)
    return page.evaluate("() => String(window.getSelection ? window.getSelection().toString() : '').slice(0,400)")


def wait_agent_change(page, before: str, timeout_ms: int = 40000, screenshot: str | None = None) -> dict:
    start = time.time()
    polls = []
    last = len(before)
    while (time.time() - start) * 1000 < timeout_ms:
        page.wait_for_timeout(2500)
        t = agent(page)
        polls.append({"at": round(time.time() - start), "len": len(t)})
        if len(t) > last + 20:
            page.wait_for_timeout(2500)
            if screenshot:
                H.shot(page, screenshot, full=False)
            return {"text": agent(page), "polls": polls}
    if screenshot:
        H.shot(page, screenshot, full=False)
    return {"text": agent(page), "polls": polls, "timeout": True}


def main() -> int:
    with sync_playwright() as p:
        browser, ctx, page = S.open_page(p)

        stp = H.start_step("open-read", "打开阅读工作区（导入的 research-paper-1.pdf 可正常渲染）")
        try:
            page.goto(f"{BASE}/research-workspace/{PID}/read", wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(15000)
            page.get_by_role("button", name=re.compile("research-paper-1")).first.click(timeout=10000)
            page.wait_for_timeout(10000)
            R["state"] = page.evaluate("""() => ({
              url: location.href, page: (document.querySelector('.rw-ptb__pageinput')||{}).value,
              spans: (document.querySelector('.rw-pdf__text')||{querySelectorAll:()=>[]}).querySelectorAll('span').length,
              canvases: [...document.querySelectorAll('.rw-pdf__canvas')].map(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let nw=0,tot=0;const s=4*11;for(let p=0;p<d.length;p+=s){const r=d[p],g=d[p+1],b=d[p+2],a=d[p+3];tot++;if(a>8&&(r<245||g<245||b<245))nw++;}return {w:c.width,h:c.height,ratio:+(nw/tot).toFixed(4)};})
            })""")
            H.log("state " + json.dumps(R["state"], ensure_ascii=False))
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:400]
        H.end_step(stp)

        # 1) toolbar 笔记 toast
        stp = H.start_step("note-toast", "选中文字 → 工具条「笔记」→ 抓取真实 toast")
        try:
            sel = select_passage(page)
            page.locator(".rw-selbar__btn", has_text="笔记").first.click(timeout=6000)
            page.wait_for_timeout(900)
            R["note_toast"] = {"selection": sel, "toast": page.evaluate(TOAST_TEXT)}
            H.log("note toast=" + json.dumps(R["note_toast"], ensure_ascii=False)[:300])
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:400]
        H.end_step(stp)

        # 2) toolbar 引用 toast
        stp = H.start_step("cite-toast", "选中文字 → 工具条「引用」→ 抓取真实 toast")
        try:
            sel = select_passage(page)
            page.locator(".rw-selbar__btn", has_text="引用").first.click(timeout=6000)
            page.wait_for_timeout(900)
            R["cite_toast"] = {"selection": sel, "toast": page.evaluate(TOAST_TEXT)}
            H.log("cite toast=" + json.dumps(R["cite_toast"], ensure_ascii=False)[:300])
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:400]
        H.end_step(stp)

        # 3) 找证据 from selection toolbar
        stp = H.start_step("agent-evidence", "选中文字 → 工具条「找证据」→ Agent 结果原文")
        try:
            before = agent(page)
            sel = select_passage(page)
            page.locator(".rw-selbar__btn", has_text="找证据").first.click(timeout=6000)
            R["evidence"] = {"selection": sel, "before_len": len(before)}
            got = wait_agent_change(page, before, timeout_ms=60000, screenshot="16-agent-evidence.png")
            R["evidence"].update(got)
            H.log("evidence reply delta len=" + str(len(got["text"]) - len(before)))
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:400]
            H.log("evidence FAIL " + str(exc)[:250])
        H.end_step(stp)

        # 4) 推导校验 / 引用补全 from 快捷能力 row
        for label, tag, shot in (("推导校验", "derive", "16-agent-derive.png"),
                                 ("引用补全", "citation", "16-agent-citation.png")):
            stp = H.start_step(f"agent-{tag}", f"Agent 快捷能力「{label}」实测")
            try:
                before = agent(page)
                page.get_by_role("button", name=re.compile(label)).first.click(timeout=8000)
                got = wait_agent_change(page, before, timeout_ms=60000, screenshot=shot)
                R[tag] = {"before_len": len(before), "text": got["text"], "polls": got["polls"],
                          "timeout": got.get("timeout", False), "screenshot": shot}
                H.log(f"{label} reply delta len=" + str(len(got["text"]) - len(before)))
            except Exception as exc:  # noqa: BLE001
                stp["error"] = str(exc)[:400]
                H.log(f"{label} FAIL " + str(exc)[:200])
            H.end_step(stp)

        # 5) locate-back action from any result card
        stp = H.start_step("locate-back", "点击 Agent 结果卡「定位」动作，检查回到原文页并有定位高亮")
        try:
            btns = page.evaluate("""() => [...document.querySelectorAll('.rw-agent button')].map(b=>(b.innerText||'').trim())""")
            R["locate_buttons"] = btns
            target = None
            for b in btns:
                if b in ("定位", "定位原文", "定位到原文") or b.startswith("定位"):
                    target = b
                    break
            if target:
                page.get_by_role("button", name=target, exact=True).first.click(timeout=6000)
                page.wait_for_timeout(2500)
                R["locate"] = {"clicked": target,
                               "page": page.evaluate("() => (document.querySelector('.rw-ptb__pageinput')||{}).value"),
                               "marks": page.evaluate("() => [...document.querySelectorAll('.rw-pdf__mark')].map(e=>e.className)")}
                H.shot(page, "16-locate-back.png", full=False)
            else:
                R["locate"] = {"error": "no locate button in agent card", "buttons": btns}
            H.log("locate " + json.dumps(R.get("locate"), ensure_ascii=False)[:300])
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:400]
        H.end_step(stp)

        H.finalize({"p08": R}, "api/steps-p08.json")
        (H.OUT / "api" / "p08-results.json").write_text(json.dumps(R, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
        S.save_state(ctx)
        ctx.close()
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())