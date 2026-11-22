# -*- coding: utf-8 -*-
"""run-02 教师端 · 脚本 01：登录/身份/外框导航 + 左侧导航逐页盘点 + 备课中心入口卡可用性。

只读真实系统（不修改任何产品代码/数据）；产物写 evidence/live/run-02/teacher/**。
"""
from __future__ import annotations

import json
import sys

from playwright.sync_api import sync_playwright

sys.path.insert(0, r"D:\zxsy-math-arena-showcase\evidence\live\run-02\teacher\scripts")
from r02lib import Rec, login_teacher, URL, VIEWPORT  # noqa: E402

NAV = [
    ("备课中心", "/teacher-v3/prep"),
    ("课堂", "/teacher-v3/classroom"),
    ("题库与组卷", "/teacher-v3/bank"),
    ("作业与批改", "/teacher-v3/assign"),
    ("学情洞察", "/teacher-v3/insights"),
    ("资源中心", "/teacher-v3/resources"),
]


def click_entry(page, label: str):
    """备课中心入口卡 = button.pc-home__entry（name/desc 两行文本）。"""
    return page.locator("button.pc-home__entry", has_text=label).first


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport=VIEWPORT, device_scale_factor=1, locale="zh-CN", accept_downloads=True)
        page = ctx.new_page()
        rec = Rec(page, "01-identity-pages")
        info = login_teacher(page, rec)
        rec.snap("01-prep-home", action="登录后落地页（role=teacher）", note="记录落地路由/title/可见姓名/角色")
        storage = page.evaluate("() => ({ma_user: localStorage.getItem('ma_user'), keys: Object.keys(localStorage)})")
        nav = page.evaluate("""() => {
          const q = (s) => [...document.querySelectorAll(s)];
          return {groups:q('.tv3-nav__group-label').map(e=>e.innerText.trim()),
                  items:q('.tv3-nav__item').map(e=>({text:e.innerText.replace(/\\s+/g,' ').trim(),href:e.getAttribute('href'),active:e.classList.contains('is-active')})),
                  chips:q('.tv3-teacher-chip').map(e=>e.innerText.replace(/\\s+/g,' ').trim()),
                  top:(q('.tv3-topbar')[0]?.innerText||'').replace(/\\s+/g,' ').trim(),
                  brand:q('.tv3-nav__brand').map(e=>e.innerText.replace(/\\s+/g,' ').trim())};
        }""")
        pages: dict[str, dict] = {}
        # 任务按钮/任务面板（顶部右）
        try:
            page.locator('[data-testid=tv3-task-bell]').click(timeout=8000)
            page.wait_for_timeout(1200)
            rec.snap("01-top-task-panel", action="顶部「任务」按钮", note="后台任务面板")
            page.keyboard.press("Escape")
            page.wait_for_timeout(400)
        except Exception as exc:  # noqa: BLE001
            rec.steps.append({"name": "01-top-task-panel", "action": "顶部「任务」按钮", "error": str(exc)[:300]})

        # 左侧导航逐项真实点击
        for label, route in NAV:
            name = "02-nav-" + {"备课中心": "prep", "课堂": "classroom", "题库与组卷": "bank",
                                "作业与批改": "assign", "学情洞察": "insights", "资源中心": "resources"}[label]
            try:
                page.locator(".tv3-nav__item", has_text=label).first.click(timeout=10000)
                page.wait_for_timeout(3200)
                step = rec.snap(name, action=f"点击左侧导航「{label}」", note=f"期望路由 {route}")
                pages[label] = {"clicked_route": page.url, "ok": route in page.url,
                                "text_head": step.get("text", "")[:1500]}
            except Exception as exc:  # noqa: BLE001
                pages[label] = {"error": str(exc)[:300], "url": page.url}
                rec.steps.append({"name": name, "action": f"点击左侧导航「{label}」", "error": str(exc)[:300], "url": page.url})

        # ---- 备课中心首页：入口卡逐卡真实点击 ----
        page.goto(URL + "/teacher-v3/prep", wait_until="domcontentloaded")
        page.wait_for_timeout(2800)
        rec.snap("03-prep-home-detail", action="回到备课中心首页", note="入口卡与最近备课列表")

        # 入口卡文本与可点性
        try:
            cards = page.evaluate("""() => [...document.querySelectorAll('button.pc-home__entry, .pc-home__entry, [class*=entry]')].map(e=>({t:e.innerText.replace(/\\s+/g,' ').trim(),cls:e.className,disabled:!!e.disabled})).filter(x=>x.t).slice(0,12)""")
        except Exception:  # noqa: BLE001
            cards = []

        def nl_value() -> str:
            try:
                return page.locator("textarea.pc-home__nl-input").first.input_value()
            except Exception:  # noqa: BLE001
                return ""

        entry_results = {}
        # 每个入口卡：每次先回首页，点击，记录 1.2s 后的 URL + NL 输入框内容
        for label, key in [("从教材开始", "from_textbook"), ("从已有教案开始", "from_plan"),
                           ("从已有PPT开始", "from_ppt"), ("备课历史", "history")]:
            try:
                page.goto(URL + "/teacher-v3/prep", wait_until="domcontentloaded")
                page.wait_for_timeout(2600)
                before = nl_value()
                click_entry(page, label).click(timeout=10000)
                page.wait_for_timeout(1800)
                after = nl_value()
                entry_results[label] = {"url": page.url, "nl_before": before, "nl_after": after,
                                        "navigated": page.url.rstrip("/") != (URL + "/teacher-v3/prep").rstrip("/"),
                                        "focus": page.evaluate("() => document.activeElement ? (document.activeElement.className + '|' + document.activeElement.tagName) : ''"),
                                        "text": page.inner_text("body")[:1200]}
                rec.snap("04-entry-" + key, action=f"点击入口卡「{label}」", note=json.dumps(entry_results[label], ensure_ascii=False)[:600])
            except Exception as exc:  # noqa: BLE001
                entry_results[label] = {"error": str(exc)[:300], "url": page.url}
                rec.steps.append({"name": "04-entry-" + key, "action": f"点击入口卡「{label}」", "error": str(exc)[:300]})

        # 备课历史页（如果上一步没进入）→ 再从历史入口进入，记录列表与「椭圆的定义」行
        try:
            if "/prep/history" not in page.url:
                page.goto(URL + "/teacher-v3/prep/history", wait_until="domcontentloaded")
                page.wait_for_timeout(2600)
            rec.snap("05-prep-history", action="进入备课历史（/teacher-v3/prep/history）", note="真实会话列表")
            hist = page.evaluate("""() => [...document.querySelectorAll('[class*=row], li, article')].map(e=>({t:(e.innerText||'').replace(/\\s+/g,' ').trim(),cls:String(e.className).slice(0,50)})).filter(x=>x.t && x.t.length>4).slice(0,40)""")
        except Exception as exc:  # noqa: BLE001
            hist = [{"error": str(exc)[:300]}]
            rec.steps.append({"name": "05-prep-history", "action": "进入备课历史", "error": str(exc)[:300]})

        # 备用深链盘点（只读确认；不替代导航点击）
        deep = [("06-deep-prep-templates", "/teacher-v3/prep-templates", "入口卡「从已有教案开始」目标页"),
                ("07-deep-quiz", "/teacher-v3/quiz", "作业页「去组卷并发布」目标"),
                ("08-deep-grading", "/teacher-v3/grading", "批改工作台深链"),
                ("09-deep-classes", "/teacher-v3/classes", "班级管理深链"),
                ("10-deep-today", "/teacher-v3/today", "每日教学工作台深链")]
        for name, path, why in deep:
            try:
                page.goto(URL + path, wait_until="domcontentloaded")
                page.wait_for_timeout(2600)
                rec.snap(name, action=f"深链 {path}", note=why)
            except Exception as exc:  # noqa: BLE001
                rec.steps.append({"name": name, "action": f"深链 {path}", "error": str(exc)[:300]})

        rec.save(extra={"login": info, "storage": storage, "nav": nav, "nav_pages": pages,
                        "entry_cards_dom": cards, "entry_results": entry_results, "history_rows": hist},
                 filename="run-01-identity-pages.json")
        ctx.close()
        browser.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())