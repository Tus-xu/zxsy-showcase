# -*- coding: utf-8 -*-
"""run-02 教师端 · 脚本 02a：打开既有「椭圆的定义」备课会话，盘点工作台结构与真实状态。

不新建会话、不改任何数据；只读观察课堂设计/PPT/教案/资料/本次备课/对话六个视图。
"""
from __future__ import annotations

import json
import re
import sys

from playwright.sync_api import sync_playwright

sys.path.insert(0, r"D:\zxsy-math-arena-showcase\evidence\live\run-02\teacher\scripts")
from r02lib import API, Rec, open_context, URL, VIEWPORT  # noqa: E402


def state(page) -> dict:
    return page.evaluate("""() => {
      const q = (s) => [...document.querySelectorAll(s)];
      const t = (s) => (q(s)[0]?.innerText || '').replace(/\\s+/g,' ').trim();
      return {
        url: location.href, title: document.title,
        header_tabs: q('.pc-header__tab').map(e=>({t:e.innerText.trim(),active:e.classList.contains('is-active'),aria:e.getAttribute('aria-selected')})),
        header_title: t('.pc-header__course-title'),
        header_meta: t('.pc-header__meta, .pc-header__meta-text, .pc-header__course-meta'),
        header_tools: q('.pc-header__tool').map(e=>({t:(e.innerText||'').replace(/\\s+/g,' ').trim(),title:e.getAttribute('title'),disabled:!!e.disabled})),
        save_state: q('.pc-header__save').map(e=>e.innerText.trim()),
        deck_thumbs: q('.pc-deck__thumb, .pc-deck__slide-thumb').length,
        deck_toolbar: q('.pc-deck__tool').map(e=>({t:(e.innerText||'').replace(/\\s+/g,' ').trim(),title:e.getAttribute('title'),disabled:!!e.disabled})),
        deck_empty: t('[class*=empty-title], .pc-deck__empty'),
        deck_text: t('.pc-deck__center').slice(0,600),
        props_text: t('[class*=pc-props]').slice(0,400),
        panes: {classroom: t('.pc-flow, .pc-classroom').slice(0,1200), plan: t('.pc-plan').slice(0,600)},
      };
    }""")


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = open_context(browser)
        page = ctx.new_page()
        rec = Rec(page, "02a-workspace")
        page.goto(URL + "/teacher-v3/prep", wait_until="domcontentloaded")
        page.wait_for_timeout(4200)
        rec.snap("09-prep-home-reuse-login", action="复用登录态打开 /teacher-v3/prep", note="确认已登录：左上姓名/角色")
        page.wait_for_timeout(1500)
        # 从首页最近备课行真实点击进入
        page.locator(".pc-home__row", has_text="椭圆").first.click(timeout=15000)
        page.wait_for_timeout(5000)
        rec.snap("10-ws-open-classroom", action="点击最近备课行「椭圆的定义」（教学设计进行中）", note="进入备课工作台")
        m = re.search(r"/teacher-v3/prep/w/([0-9a-f-]{36})", page.url)
        sid = m.group(1) if m else ""
        (API / "session.json").write_text(json.dumps({"session_id": sid, "url": page.url}, ensure_ascii=False, indent=2), encoding="utf-8")
        out = {"session_id": sid, "views": {}}
        out["views"]["classroom"] = state(page)
        rec.save(extra={"phase": "open+classroom", "state": out}, filename="run-02a-workspace.json")
        print("[session]", sid, flush=True)

        # 顶部三个 Tab（真实点击）
        for key, label, name in [("ppt", "PPT", "11-ws-ppt"), ("plan", "教案", "12-ws-plan"),
                                 ("classroom", "课堂设计", "13-ws-classroom-again")]:
            try:
                page.locator(".pc-header__tab", has_text=label).first.click(timeout=10000)
                page.wait_for_timeout(4500)
                rec.snap(name, action=f"点击工作台 Tab「{label}」", note="Tab 真实切换")
                out["views"][key] = state(page)
            except Exception as exc:  # noqa: BLE001
                out["views"][key] = {"error": str(exc)[:300]}
                rec.steps.append({"name": name, "action": f"点击 Tab「{label}」", "error": str(exc)[:300]})
        rec.save(extra={"phase": "tabs", "state": out}, filename="run-02a-workspace.json")

        # 资料 / 本次备课 / 对话（视图级深链，同路由族）
        for key, name in [("materials", "14-ws-materials"), ("overview", "15-ws-overview"), ("chat", "16-ws-chat")]:
            try:
                page.goto(f"{URL}/teacher-v3/prep/w/{sid}/{key}", wait_until="domcontentloaded", timeout=45000)
                page.wait_for_timeout(4500)
                rec.snap(name, action=f"进入视图 {key}", note="URL 视图（无独立 Tab 按钮）")
                out["views"][key] = state(page)
            except Exception as exc:  # noqa: BLE001
                out["views"][key] = {"error": str(exc)[:300]}
                rec.steps.append({"name": name, "action": f"进入视图 {key}", "error": str(exc)[:300]})
        rec.save(extra={"phase": "views", "state": out}, filename="run-02a-workspace.json")

        # 关键状态文本（用于报告）
        print(json.dumps({"sid": sid, "ppt": out["views"].get("ppt", {}).get("deck_empty"),
                          "thumbs": out["views"].get("ppt", {}).get("deck_thumbs"),
                          "tools": out["views"].get("ppt", {}).get("deck_toolbar"),
                          "plan": out["views"].get("plan", {}).get("header_title")}, ensure_ascii=False)[:1500], flush=True)
        ctx.close()
        browser.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())