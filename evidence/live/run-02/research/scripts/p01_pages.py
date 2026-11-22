# -*- coding: utf-8 -*-
"""P01: login as researcher (real UI) + inventory of the three entries.

Saves: screenshots (full + viewport), struct JSON, HTML dumps, api/steps.json.
"""
from __future__ import annotations

import json
import re
import sys
import traceback
from pathlib import Path

sys.path.insert(0, r"D:\zxsy-math-arena-showcase\.work\scripts")
sys.path.insert(0, str(Path(__file__).parent))

from playwright.sync_api import sync_playwright  # noqa: E402

import harness as H  # noqa: E402
from live_login import RESEARCH, login  # noqa: E402

RESULTS: dict = {}


def save_dom(page, name: str) -> None:
    try:
        html = page.evaluate("() => document.documentElement.outerHTML")
    except Exception as exc:  # noqa: BLE001
        html = f"<!-- dump failed: {exc} -->"
    (H.ARTIFACTS / f"dom-{name}.html").write_text(html[:400000], encoding="utf-8")


def capture(page, key: str, prefix: str, full: bool = True) -> dict:
    data = H.dom_snapshot(page)
    H.save_json(f"api/page-{prefix}.json", data)
    if full:
        H.shot(page, f"{prefix}-full.png", full=True)
    H.shot(page, f"{prefix}-viewport.png", full=False)
    save_dom(page, prefix)
    RESULTS[key] = {
        "url": data.get("url"),
        "title": data.get("title"),
        "bodyLen": data.get("bodyLen"),
        "headings": data.get("headings"),
        "navs": data.get("navs"),
        "buttons": data.get("buttons"),
        "inputs": data.get("inputs"),
        "canvases": data.get("canvases"),
        "pdfSpanCount": data.get("pdfSpanCount"),
        "bodyText": data.get("bodyText"),
        "screenshots": [f"{prefix}-full.png", f"{prefix}-viewport.png"],
        "json": f"api/page-{prefix}.json",
        "dom": f"artifacts/dom-{prefix}.html",
    }
    H.log(f"captured {prefix}: {data.get('url')} / {data.get('title')}")
    return data


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 1672, "height": 941},
            device_scale_factor=1,
            locale="zh-CN",
        )
        page = ctx.new_page()
        H.attach(page, ctx)

        # ---------- login ----------
        st = H.start_step("login", "打开 /login，选 researcher，13800001003，演示验证码，安全登录")
        try:
            info = login(page, RESEARCH, wait_after=4500)
            H.shot(page, "00-login-otp.png", full=False)
            page.wait_for_timeout(2500)
            st["result"] = {"url": page.url, "demo_code": info.get("code")}
            H.log(f"login ok url={page.url} code={info.get('code')}")
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:500]
            H.log("login FAILED: " + str(exc)[:300])
            H.shot(page, "00-login-fail.png", full=False)
        H.end_step(st)
        page.wait_for_timeout(1500)
        H.shot(page, "01-landing-after-login.png", full=True)

        # ---------- landing (启动页) ----------
        st = H.start_step("landing", "科研端启动页 /research-workspace")
        data = capture(page, "landing", "01-landing")
        # recent project card structure
        extra_js = r"""
        () => {
          const clean = s => (s||'').replace(/\s+/g,' ').trim();
          const cards = [...document.querySelectorAll('[class*=recent], [class*=project-card], [class*=projectCard], [class*=card]')]
            .filter(el => el.querySelectorAll('button').length > 0 && clean(el.innerText).length > 10)
            .slice(0, 20)
            .map(el => ({
              cls: (typeof el.className === 'string' ? el.className.slice(0,120) : ''),
              text: clean(el.innerText).slice(0, 500),
              buttons: [...el.querySelectorAll('button')].map(b => ({
                text: clean(b.innerText),
                cls: (typeof b.className === 'string' ? b.className.slice(0,120) : ''),
              })),
              anchors: [...el.querySelectorAll('a')].map(a => ({text: clean(a.innerText), href: a.getAttribute('href')})),
            }));
          const startModes = [...document.querySelectorAll('button')]
            .filter(b => /读论文|写论文|问 Agent|打开 Research Agent|继续 阅读|继续 写作/.test(b.innerText))
            .map(b => clean(b.innerText).slice(0,200));
          return {cards, startModes, recentHeading: [...document.querySelectorAll('h1,h2,h3')].map(h=>clean(h.innerText)).filter(Boolean)};
        }
        """
        try:
            RESULTS["landing"]["extra"] = page.evaluate(extra_js)
        except Exception as exc:  # noqa: BLE001
            RESULTS["landing"]["extra"] = {"error": str(exc)}
        # count 文献/草稿/笔记 numbers on cards
        H.end_step(st)

        # ---------- workspace (工作台) ----------
        st = H.start_step("workspace-nav", "点击顶栏「工作台」")
        try:
            page.get_by_role("button", name="工作台").first.click(timeout=10000)
            page.wait_for_timeout(4500)
            H.end_step(st)
            st2 = H.start_step("workspace", "工作台页面盘点")
            capture(page, "workspace", "02-workspace")
            arr = H.canvas_blank_check(page)
            RESULTS["workspace"]["canvasPixels"] = arr
            H.end_step(st2)
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:500]
            H.end_step(st)
            H.log("workspace nav failed " + str(exc)[:200])

        # ---------- account (个人中心) ----------
        st = H.start_step("account-nav", "点击顶栏「个人中心」")
        try:
            page.get_by_role("button", name="个人中心").first.click(timeout=10000)
            page.wait_for_timeout(4000)
            H.end_step(st)
            st2 = H.start_step("account", "个人中心页面盘点")
            capture(page, "account", "03-account")
            H.end_step(st2)
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:500]
            H.end_step(st)
            H.log("account nav failed " + str(exc)[:200])

        # ---------- back to landing, open a recent project via visible control ----------
        st = H.start_step("back-to-landing", "点击顶栏「启动页」")
        try:
            page.get_by_role("button", name="启动页").first.click(timeout=10000)
            page.wait_for_timeout(3500)
            capture(page, "landing-again", "04-landing-again")
            H.end_step(st)
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:400]
            H.end_step(st)

        st = H.start_step("open-recent-read", "启动页「最近项目」中点击「阅读」")
        try:
            page.get_by_role("button", name="阅读").first.click(timeout=10000)
            page.wait_for_timeout(6000)
            H.end_step(st)
            st2 = H.start_step("read-entry", "阅读视图初始状态盘点")
            rd = capture(page, "read-entry", "05-read-entry")
            RESULTS["read-entry"]["canvasPixels"] = H.canvas_blank_check(page)
            RESULTS["read-entry"]["apiReadCalls"] = [
                s for s in H.state["steps"] if "/research" in s["url"] or "doc" in s["url"].lower()
            ][-20:]
            H.end_step(st2)
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:500]
            H.end_step(st)
            H.log("open recent read failed " + str(exc)[:250])
            capture(page, "read-entry-fail", "05-read-entry-fail")

        H.finalize({"results": {k: {kk: vv for kk, vv in v.items() if kk != "bodyText"} for k, v in RESULTS.items()}})
        (H.OUT / "api" / "p01-results.json").write_text(json.dumps(RESULTS, ensure_ascii=False, indent=2), encoding="utf-8")
        ctx.close()
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())