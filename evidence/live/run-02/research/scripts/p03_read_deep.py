# -*- coding: utf-8 -*-
"""P03: read-path continued — long render wait, full-text search, real PDF import via UI,
open imported PDF, selection, note, agent composer + preset capabilities.
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
import p02_read_probe as P  # noqa: E402
from live_login import RESEARCH, login  # noqa: E402

R: dict = {}
IMPORT_PDF = Path(r"D:\zxsy-math-arena-showcase\qa\research\artifacts\research-paper-1.pdf")
if not IMPORT_PDF.exists():
    IMPORT_PDF = Path(r"D:\zxsy-math-arena-showcase\release\产物\research-paper-1.pdf")


def shot(page, name: str) -> str:
    H.shot(page, name, full=False)
    return name


def text_of(page, sel: str) -> str:
    try:
        return page.inner_text(sel)
    except Exception:
        return ""


def body_text(page) -> str:
    try:
        return page.inner_text("body")
    except Exception:
        return ""


def agent_state(page, tag: str) -> dict:
    return P.agent_state(page, tag)


def ask_agent2(page, question: str, tag: str, wait_ms: int = 90000) -> dict:
    res = {"question": question, "sent": False, "pane_before": "", "pane_after": "", "reply_delta": "",
           "polls": [], "screenshots": [], "api_from": len(H.state["steps"])}
    try:
        before = page.evaluate(P.AGENT_JS).get("paneText", "")
        res["pane_before"] = before
        box = page.locator("textarea.rw-composer__input").first
        box.click()
        box.fill(question)
        page.wait_for_timeout(600)
        send = page.locator("button.rw-composer__send").first
        state = {"value": box.input_value(), "disabled": send.is_disabled()}
        res["send_state"] = state
        H.log(f"ask2[{tag}] textarea='{state['value'][:40]}' send_disabled={state['disabled']}")
        if state["disabled"]:
            # force a native input event then re-check
            page.evaluate("""() => {
              const t = document.querySelector('textarea.rw-composer__input');
              t.dispatchEvent(new Event('input', { bubbles: true }));
            }""")
            page.wait_for_timeout(500)
            res["send_state_after"] = {"disabled": send.is_disabled()}
        shot(page, f"09-agent-{tag}-typed.png")
        res["screenshots"].append(f"09-agent-{tag}-typed.png")
        send.click(timeout=10000)
        res["sent"] = True
        H.log(f"ask2[{tag}] send clicked")
        start = time.time()
        idx = 0
        last = ""
        quiet = 0
        best = ""
        while (time.time() - start) * 1000 < wait_ms:
            page.wait_for_timeout(3000)
            cur = page.evaluate(P.AGENT_JS)
            pane = cur.get("paneText", "")
            idx += 1
            res["polls"].append({"at": round(time.time() - start), "paneLen": len(pane)})
            if len(pane) > len(best):
                best = pane
            if idx in (1, 2, 4, 8, 15, 25):
                name = f"09-agent-{tag}-poll{idx}.png"
                shot(page, name)
                res["screenshots"].append(name)
            if pane == last:
                quiet += 1
                if quiet >= 3 and len(pane) > len(before):
                    break
            else:
                quiet = 0
            last = pane
        res["pane_after"] = page.evaluate(P.AGENT_JS).get("paneText", "")
        res["reply_delta"] = res["pane_after"][len(res["pane_before"]):] if res["pane_after"].startswith(res["pane_before"]) else res["pane_after"]
        name = f"09-agent-{tag}-final.png"
        shot(page, name)
        res["screenshots"].append(name)
        res["api"] = H.state["steps"][res["api_from"]:]
        H.log(f"ask2[{tag}] reply delta len={len(res['reply_delta'])}: {res['reply_delta'][:150]}")
    except Exception as exc:  # noqa: BLE001
        res["error"] = str(exc)[:500]
        H.log(f"ask2[{tag}] FAIL {str(exc)[:250]}")
        shot(page, f"09-agent-{tag}-error.png")
    return res


def try_click_preset(page, label: str, tag: str, wait_ms: int = 30000) -> dict:
    res = {"label": label, "clicked": False, "pane_after": "", "error": ""}
    try:
        btn = page.get_by_role("button", name=re.compile(label)).first
        btn.click(timeout=8000)
        res["clicked"] = True
        start = time.time()
        last = ""
        quiet = 0
        while (time.time() - start) * 1000 < wait_ms:
            page.wait_for_timeout(2500)
            pane = page.evaluate(P.AGENT_JS).get("paneText", "")
            if pane == last:
                quiet += 1
                if quiet >= 2:
                    break
            else:
                quiet = 0
            last = pane
        res["pane_after"] = page.evaluate(P.AGENT_JS).get("paneText", "")
        shot(page, f"09-agent-preset-{tag}.png")
        H.log(f"preset[{label}] ok paneLen={len(res['pane_after'])}")
    except Exception as exc:  # noqa: BLE001
        res["error"] = str(exc)[:400]
        H.log(f"preset[{label}] FAIL {str(exc)[:200]}")
    return res


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1672, "height": 941}, device_scale_factor=1, locale="zh-CN")
        page = ctx.new_page()
        H.attach(page, ctx)

        st = H.start_step("login", "researcher 登录（真实 UI）")
        try:
            info = login(page, RESEARCH, wait_after=4000)
            st["result"] = {"url": page.url, "code": info.get("code")}
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:300]
        H.end_step(st)

        st = H.start_step("enter-read", "启动页点击「工作台」→ 阅读视图")
        try:
            page.get_by_role("button", name="工作台").first.click(timeout=12000)
            page.wait_for_timeout(15000)
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:300]
        H.end_step(st)
        shot(page, "08-read-wait-00.png")
        R["wait_00"] = P.pdf_state(page, "08-wait-00")

        st = H.start_step("read-wait", "保持阅读页 45 秒，观察 canvas 是否后来渲染")
        for i, wait in enumerate((15000, 15000, 15000), start=1):
            page.wait_for_timeout(wait)
            shot(page, f"08-read-wait-{i*15:02d}.png")
            R[f"wait_{i*15:02d}"] = P.pdf_state(page, f"08-wait-{i*15:02d}")
        H.end_step(st)

        st = H.start_step("read-search", "PDF 工具条「全文搜索」，搜索 Céa")
        try:
            page.get_by_role("button", name="全文搜索").first.click(timeout=8000)
            page.wait_for_timeout(1000)
            page.locator(".rw-ptb__search-input").fill("Céa")
            page.wait_for_timeout(5000)
            R["search"] = {
                "toolbar": text_of(page, ".rw-ptb"),
                "marks": page.evaluate("() => document.querySelectorAll('.rw-pdf__mark').length"),
                "markKinds": page.evaluate("() => [...document.querySelectorAll('.rw-pdf__mark')].map(e=>e.className)"),
                "searchbarText": text_of(page, ".rw-ptb__searchbar"),
            }
            shot(page, "08-read-search-cea.png")
            H.log(f"search: {json.dumps(R['search'], ensure_ascii=False)[:300]}")
            # close search
            page.get_by_role("button", name="全文搜索").first.click(timeout=8000)
            page.wait_for_timeout(1000)
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:400]
            H.log("search FAIL " + str(exc)[:200])
        H.end_step(st)

        # ---------- real import via the page file input ----------
        st = H.start_step("import-pdf", f"点击「导入 PDF」并选择真实 PDF：{IMPORT_PDF.name}")
        try:
            try:
                page.get_by_role("button", name=re.compile("导入 PDF")).first.click(timeout=6000)
            except Exception:
                pass
            page.set_input_files("input.rw-read__file", str(IMPORT_PDF))
            page.wait_for_timeout(1500)
            deadline = time.time() + 150
            found = False
            while time.time() < deadline:
                page.wait_for_timeout(4000)
                txt = body_text(page)
                if "research-paper-1" in txt:
                    found = True
                    break
            R["import"] = {
                "file": str(IMPORT_PDF),
                "found_in_list": found,
                "toast": text_of(page, ".rw-read__toast, .rw-toast"),
                "body_has_title": "research-paper-1" in body_text(page),
            }
            shot(page, "08-read-imported.png")
            H.log(f"import found={found} toast={R['import']['toast']!r}")
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:500]
            R["import"] = {"error": str(exc)[:500]}
            H.log("import FAIL " + str(exc)[:300])
        H.end_step(st)
        R["api_import"] = [s for s in H.state["steps"] if s["method"] in ("POST", "PUT") and "papers" in s["url"].lower()]

        # ---------- open imported PDF ----------
        st = H.start_step("open-imported", "在左侧文献列表点击 research-paper-1.pdf")
        try:
            page.get_by_role("button", name=re.compile("research-paper-1")).first.click(timeout=10000)
            page.wait_for_timeout(15000)
            shot(page, "08-read-imported-paper.png")
            R["imported_paper"] = P.pdf_state(page, "08-imported-paper")
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:400]
            H.log("open imported FAIL " + str(exc)[:200])
        H.end_step(st)

        # ---------- selection attempt on imported paper ----------
        st = H.start_step("select-imported", "在导入 PDF 上拖选文字，检查选区与浮动工具条")
        R["selection_imported"] = P.try_selection(page)
        selbar = []
        try:
            selbar = page.evaluate("""() => [...document.querySelectorAll('.rw-selbar button')].map(b=>(b.innerText||'').trim()||b.getAttribute('aria-label'))""")
        except Exception:
            pass
        R["selection_imported"]["selbarButtons"] = selbar
        H.end_step(st)

        # if selection worked -> toolbar 笔记 then 解释
        if R["selection_imported"].get("selection"):
            st = H.start_step("note-from-selection", "选区工具条点击「笔记」，检查是否真实加入笔记")
            try:
                page.locator(".rw-selbar__btn", has_text="笔记").first.click(timeout=6000)
                page.wait_for_timeout(5000)
                R["note_after"] = {"toast": text_of(page, ".rw-read__toast, .rw-toast, .rw-agent__feedback"),
                                   "recent_notes": text_of(page, ".rw-read__notes, [class*=recent-notes]"),
                                   "body_has_note": "选中文本笔记" in body_text(page)}
                shot(page, "08-read-note-created.png")
                H.log(f"note: {json.dumps(R['note_after'], ensure_ascii=False)[:300]}")
            except Exception as exc:  # noqa: BLE001
                st["error"] = str(exc)[:300]
            H.end_step(st)
            st = H.start_step("judge-from-selection", "选区工具条点击「评判」")
            try:
                page.locator(".rw-selbar__btn--primary").first.click(timeout=6000)
                page.wait_for_timeout(20000)
                R["judge_after"] = agent_state(page, "09-14-judge")
                shot(page, "08-read-judge.png")
            except Exception as exc:  # noqa: BLE001
                st["error"] = str(exc)[:300]
            H.end_step(st)
        else:
            R["note_after"] = {"skipped": "no text selection possible; textLayer spans=" +
                               str((R.get("imported_paper") or {}).get("textLayers", [{}])[0].get("spans"))}

        # ---------- agent composer free chat ----------
        st = H.start_step("agent-chat", "右栏 composer 输入自然语言问题并点击发送（真实对话端点）")
        R["chat"] = ask_agent2(page, "这篇论文第 1 页讲了什么？请用两句话概括，并指出原文依据。", "chat", wait_ms=90000)
        H.end_step(st)

        # ---------- agent preset capabilities ----------
        st = H.start_step("agent-presets", "点击 Agent 快捷能力：翻译与改写 / 找相关证据 / 推导校验")
        for label, tag in (("翻译与改写", "translate"), ("找相关证据|找证据", "evidence"), ("推导校验", "derive")):
            R[f"preset_{tag}"] = try_click_preset(page, label, tag, wait_ms=30000)
        H.end_step(st)

        H.finalize({"p03": R}, "api/steps-p03.json")
        (H.OUT / "api" / "p03-results.json").write_text(json.dumps(R, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
        ctx.close()
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())