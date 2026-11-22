# -*- coding: utf-8 -*-
"""run-02 教师端 · 脚本 02b：在「椭圆的定义」工作台里真实尝试 编辑 / 导出 / 发布，并记录阻塞点。

不做任何绕过（不改库、不调管理接口）；disabled 控件用真实 click 尝试并记录异常/无响应。
"""
from __future__ import annotations

import json
import re
import sys

from playwright.sync_api import sync_playwright

sys.path.insert(0, r"D:\zxsy-math-arena-showcase\evidence\live\run-02\teacher\scripts")
from r02lib import API, Rec, URL, fresh_login, open_context  # noqa: E402

SID = json.loads((API / "session.json").read_text(encoding="utf-8"))["session_id"]
BASE = f"{URL}/teacher-v3/prep/w/{SID}"


def click_attempt(page, loc, label: str, timeout: int = 2500) -> dict:
    before = page.url
    try:
        loc.first.click(timeout=timeout)
        page.wait_for_timeout(1200)
        return {"label": label, "clicked": True, "url_before": before, "url_after": page.url}
    except Exception as exc:  # noqa: BLE001
        return {"label": label, "clicked": False, "url_before": before, "url_after": page.url,
                "error": str(exc).replace("\n", " ")[:300]}


def main() -> int:
    out: dict = {"session_id": SID, "attempts": {}, "states": {}}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = open_context(browser)
        page = ctx.new_page()
        rec = Rec(page, "02b-edit-export-publish")
        fresh_login(page, rec)

        # ---------- 课堂设计：工作台结构 + 重试（平台自己提供的恢复入口） ----------
        page.goto(BASE + "/classroom", wait_until="domcontentloaded")
        page.wait_for_timeout(4500)
        rec.snap("20-ws-classroom-detail", action="打开工作台 课堂设计", note="记录工作台结构/对话/错误条")
        out["states"]["classroom"] = page.evaluate("""() => {
          const q=(s)=>[...document.querySelectorAll(s)]; const t=(s)=>(q(s)[0]?.innerText||'').replace(/\\s+/g,' ').trim();
          return {error_banner:q('[class*=error],[class*=alert]').map(e=>e.innerText.replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,6),
                  actions:q('.pc-actions__btn').map(e=>({t:e.innerText.trim(),disabled:!!e.disabled})),
                  composer:q('[class*=composer]').length, flow_empty:t('.pc-classroom__empty, .pc-flow__empty, [class*=empty]'),
                  conversation_cards:q('[class*=pc-conv]').length};
        }""")
        # 重试按钮（界面错误条自带入口；只试一次）
        out["attempts"]["retry"] = click_attempt(page, page.locator(".pc-actions__btn", has_text="重试"), "错误条「重试」")
        page.wait_for_timeout(4000)
        rec.snap("21-retry-result", action="点击错误条「重试」", note="平台提供的唯一恢复入口")
        out["states"]["retry_after_text"] = re.sub(r"\s+", " ", page.inner_text("body"))[-1500:]

        # ---------- PPT：编辑对象/参数/发布控件 ----------
        page.goto(BASE + "/ppt", wait_until="domcontentloaded")
        page.wait_for_timeout(4000)
        rec.snap("22-ws-ppt-detail", action="打开 PPT Tab", note="记录课件空态、工具条 disabled、属性面板、发布按钮")
        out["states"]["ppt"] = page.evaluate("""() => {
          const q=(s)=>[...document.querySelectorAll(s)]; const t=(s)=>(q(s)[0]?.innerText||'').replace(/\\s+/g,' ').trim();
          return {strip_empty:t('.pc-deck__strip-empty'), thumbs:q('.pc-deck__item').length,
                  slide_title_nodes:q('.pc-slide__title').length, props_text:t('[class*=pc-props]'),
                  tools:q('.pc-deck__tool').map(e=>({t:(e.innerText||'').replace(/\\s+/g,' ').trim(),title:e.getAttribute('title'),disabled:!!e.disabled})),
                  stages:t('.pc-deck__stage'), zoom:q('[class*=zoom]').map(e=>e.innerText.trim()).slice(0,3)};
        }""")
        # 编辑尝试 1：双击画布页标题（控件不存在）
        try:
            canvas = page.locator(".pc-slide, .pc-deck__stage").first
            canvas.dblclick(timeout=2500)
            page.wait_for_timeout(800)
            page.keyboard.press("Escape")
            out["attempts"]["edit_slide_title"] = {"ran": True, "editor_inputs_after": page.locator(".pc-slide__title-edit").count(),
                                                   "note": "双击画布后检查是否出现页标题编辑框"}
        except Exception as exc:  # noqa: BLE001
            out["attempts"]["edit_slide_title"] = {"ran": False, "error": str(exc)[:300]}
        # 编辑尝试 2：图形参数 a/b（属性面板无控件）
        out["attempts"]["edit_params"] = {
            "a_inputs": page.get_by_label("长半轴 a").count(),
            "b_inputs": page.get_by_label("短半轴 b").count(),
            "props_text": page.locator("[class*=pc-props]").first.inner_text()[:400] if page.locator("[class*=pc-props]").count() else "",
        }
        # 发布尝试：发布课堂（disabled）
        out["attempts"]["publish_deck_tool"] = click_attempt(page, page.locator('[data-testid=pc-deck-publish]'), "PPT 工具条「发布课堂」")
        out["states"]["publish_dialog_after_tool_click"] = page.locator("[data-testid=publish-dialog]").count()
        rec.snap("23-publish-tool-blocked", action="点击「发布课堂」", note="disabled 控件真实点击尝试")

        # 导出：顶栏「导出」对话框
        try:
            page.locator(".pc-header__tool", has_text="导出").first.click(timeout=6000)
            page.wait_for_timeout(1500)
            rec.snap("24-export-dialog", action="点击顶栏「导出」", note="导出对话框（PPTX/教案 PDF/教案 Markdown）")
            out["states"]["export_dialog"] = page.evaluate("""() => {
              const q=(s)=>[...document.querySelectorAll(s)];
              return {open:q('.pc-export').length, hint:(q('.pc-export__hint')[0]?.innerText||''),
                      cards:q('.pc-export__card').map(c=>({title:(c.querySelector('.pc-export__card-title')?.innerText||''),
                        desc:(c.querySelector('.pc-export__card-desc')?.innerText||''),
                        file:(c.querySelector('.pc-export__card-file')?.innerText||''),
                        stage:(c.querySelector('.pc-export__card-stage')?.innerText||''),
                        error:(c.querySelector('.pc-export__card-error')?.innerText||''),
                        buttons:[...c.querySelectorAll('button')].map(b=>({t:b.innerText.trim(),disabled:!!b.disabled,title:b.getAttribute('title')}))}))};
            }""")
            # 逐卡点击「开始导出」（disabled → 记录异常）
            cards = page.locator(".pc-export__card")
            for i in range(cards.count()):
                title = cards.nth(i).locator(".pc-export__card-title").inner_text()
                btn = cards.nth(i).locator(".pc-export__btn").first
                out.setdefault("attempts", {}).setdefault("export_cards", []).append(
                    {"card": title, **click_attempt(page, btn, f"导出卡「{title}」-{btn.inner_text().strip()}")})
            rec.snap("25-export-cards-blocked", action="逐卡点击「开始导出」", note="三张格式卡均为 disabled")
            page.keyboard.press("Escape")
            page.wait_for_timeout(600)
        except Exception as exc:  # noqa: BLE001
            out["attempts"]["export_dialog_open"] = {"error": str(exc)[:400]}
            rec.steps.append({"name": "24-export-dialog", "action": "点击顶栏「导出」", "error": str(exc)[:400]})

        # ---------- 教案：编辑器空态 ----------
        page.goto(BASE + "/plan", wait_until="domcontentloaded")
        page.wait_for_timeout(3500)
        rec.snap("26-ws-plan-detail", action="打开教案 Tab", note="记录教案空态与编辑器区域")
        out["states"]["plan"] = page.evaluate("""() => {
          const q=(s)=>[...document.querySelectorAll(s)]; const t=(s)=>(q(s)[0]?.innerText||'').replace(/\\s+/g,' ').trim();
          const ce=q('[contenteditable=true]');
          return {empty:t('[class*=empty]'), toolbar:q('[class*=plan-tool], .pc-plan__toolbar button').map(e=>e.innerText.trim()).slice(0,20),
                  contenteditable:ce.length, doc_text:t('.pc-plan-doc, .pc-plan__doc, .pc-plan').slice(0,600),
                  sync_btn:q('.pc-header__tool').map(e=>e.innerText.trim())};
        }""")

        # ---------- 本次备课：导出卡 / 发布入口 ----------
        page.goto(BASE + "/overview", wait_until="domcontentloaded")
        page.wait_for_timeout(3500)
        rec.snap("27-ws-overview-detail", action="进入「本次备课」视图", note="导出卡/发布入口/版本/一致性")
        out["states"]["overview"] = page.evaluate("""() => {
          const q=(s)=>[...document.querySelectorAll(s)]; const t=(s)=>(q(s)[0]?.innerText||'').replace(/\\s+/g,' ').trim();
          return {kicker:t('.pc-ov__kicker'), badge:t('.pc-ov__badge'), modified:t('.pc-ov__modified'), info:t('.pc-ov__info'),
                  chips:q('[data-testid=ov-chip]').map(e=>({t:e.innerText.replace(/\\s+/g,' ').trim(),done:e.getAttribute('data-done')})),
                  versions:t('.pc-ov__revs'), versions_empty:q('.pc-ov__state').map(e=>e.innerText.trim()),
                  export_cards:q('.pc-ov__export').map(e=>({t:e.innerText.replace(/\\s+/g,' ').trim(),buttons:[...e.querySelectorAll('button')].map(b=>({t:b.innerText.trim(),disabled:!!b.disabled,title:b.getAttribute('title')}))})),
                  publish_row:t('[data-testid=ov-publish-row]'),
                  consistency:t('[data-testid=ov-consistency]').replace(/\\s+/g,' ').slice(0,400)};
        }""")
        # 概览页三张导出卡 + 发布按钮真实点击尝试
        cards = page.locator(".pc-ov__export")
        for i in range(cards.count()):
            btn = cards.nth(i).locator("button")
            out.setdefault("attempts", {}).setdefault("overview_export", []).append(
                {"card": cards.nth(i).locator(".pc-ov__export-title").inner_text(), **click_attempt(page, btn, "本次备课-导出卡")})
        out["attempts"]["overview_publish"] = click_attempt(page, page.locator("[data-testid=ov-publish]"), "本次备课「发布到班级课堂」")
        out["states"]["publish_dialog_after_overview_click"] = page.locator("[data-testid=publish-dialog]").count()
        rec.snap("28-overview-blocked", action="点击概览页导出卡 / 发布按钮", note="disabled 控件真实点击")

        # ---------- 对话 / 资料（结构记录） ----------
        page.goto(BASE + "/chat", wait_until="domcontentloaded")
        page.wait_for_timeout(4000)
        rec.snap("29-ws-chat-detail", action="进入对话视图", note="真实消息列表与错误卡片")
        page.goto(BASE + "/materials", wait_until="domcontentloaded")
        page.wait_for_timeout(3500)
        rec.snap("30-ws-materials-detail", action="进入教材与资料视图", note="真实 0 数据")

        rec.save(extra=out, filename="run-02b-edit-export-publish.json")
        print(json.dumps({"retry": out["attempts"].get("retry", {}).get("clicked"),
                          "publish_tool": out["attempts"].get("publish_deck_tool", {}).get("error", ""),
                          "export_cards": [(c["card"], c.get("clicked"), c.get("error", "")[:80]) for c in out["attempts"].get("export_cards", [])],
                          "overview_publish": out["attempts"].get("overview_publish", {}).get("error", "")},
                         ensure_ascii=False, indent=1)[:2500], flush=True)
        ctx.close()
        browser.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())