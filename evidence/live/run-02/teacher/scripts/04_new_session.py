# -*- coding: utf-8 -*-
"""run-02 教师端 · 脚本 04：从备课中心首页真实新建一次备课（任务书允许「或新建」），
观察 AI 是否能产出可确认的教学方案、课件、教案；不绕过任何阻塞。"""
from __future__ import annotations

import json
import re
import sys

from playwright.sync_api import sync_playwright

sys.path.insert(0, r"D:\zxsy-math-arena-showcase\evidence\live\run-02\teacher\scripts")
from r02lib import API, Rec, URL, fresh_login, open_context  # noqa: E402

TEXT = "椭圆第一课时：椭圆的定义与标准方程（R02 新建实测）"


def main() -> int:
    out: dict = {"input_text": TEXT}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = open_context(browser)
        page = ctx.new_page()
        rec = Rec(page, "04-new-session")
        fresh_login(page, rec)
        page.goto(URL + "/teacher-v3/prep", wait_until="domcontentloaded")
        page.wait_for_timeout(3500)
        page.fill("textarea.pc-home__nl-input", TEXT)
        page.wait_for_timeout(600)
        rec.snap("60-new-session-input", action="首页 NL 输入框填写备课主题", note=TEXT)
        page.locator("button.pc-home__nl-send").click(timeout=10000)
        page.wait_for_timeout(2500)
        rec.snap("61-new-session-creating", action="点击发送（开始创建备课会话）", note="创建中真实状态/已用时")
        out["creating_text"] = page.inner_text("body")[-1200:]
        try:
            page.wait_for_url(lambda u: "/teacher-v3/prep/w/" in u, timeout=240000)
            page.wait_for_timeout(4500)
            rec.snap("62-new-session-workspace", action="创建完成 → 进入新工作台", note="记录新会话 URL 与首屏")
            m = re.search(r"/teacher-v3/prep/w/([0-9a-f-]{36})", page.url)
            sid = m.group(1) if m else ""
            out["session_id"] = sid
            (API / "session-new.json").write_text(json.dumps({"session_id": sid, "url": page.url}, ensure_ascii=False, indent=2), encoding="utf-8")
            # 轮询等待 AI 回复/提案（最多 ~100s），每 20s 留一帧
            for i in range(5):
                page.wait_for_timeout(20000)
                txt = page.inner_text("body")
                has_flow = "这节课的教学流程" in txt or "教学目标" in txt
                has_card = page.locator("[class*=selection], [class*=proposal], [class*=confirm]").count()
                print(f"[poll {i}] flow={has_flow} cards={has_card} url={page.url}", flush=True)
                if i == 1:
                    rec.snap("63-new-session-wait-30s", action="等待 AI 回复 30s", note=f"教学流程={has_flow}")
                if has_flow or has_card:
                    break
            rec.snap("64-new-session-after-wait", action="等待 AI 回复后", note="记录 AI 是否给出可确认方案")
            out["after_text"] = re.sub(r"\s+", " ", page.inner_text("body"))[-3500:]
            # 结构：是否有可确认卡片/生成按钮
            out["structure"] = page.evaluate("""() => {
              const q=(s)=>[...document.querySelectorAll(s)];
              return {tabs:q('.pc-header__tab').map(e=>e.innerText.trim()),
                      confirm_buttons:q('button').map(e=>(e.innerText||'').replace(/\\s+/g,' ').trim()).filter(t=>t && /确认|生成|开始/.test(t)).slice(0,20),
                      cards:q('[class*=selection],[class*=proposal],[class*=confirm],[class*=choice]').map(e=>e.innerText.replace(/\\s+/g,' ').trim()).slice(0,8),
                      chat_messages:q('[class*=pc-msg],[class*=message]').length};
            }""")
            # PPT / 教案 / 本次备课 状态
            for key, name in [("ppt", "65-new-ws-ppt"), ("plan", "66-new-ws-plan"), ("overview", "67-new-ws-overview")]:
                page.goto(f"{URL}/teacher-v3/prep/w/{sid}/{key}", wait_until="domcontentloaded")
                page.wait_for_timeout(4000)
                rec.snap(name, action=f"新会话 {key} 视图", note="检查课件/教案是否生成")
                out[key] = page.evaluate("""() => {
                  const q=(s)=>[...document.querySelectorAll(s)]; const t=(s)=>(q(s)[0]?.innerText||'').replace(/\\s+/g,' ').trim();
                  return {text:document.body.innerText.replace(/\\s+/g,' ').slice(-2200),
                          thumbs:q('.pc-deck__item').length,
                          empty:q('[class*=empty]').map(e=>e.innerText.trim()).filter(Boolean).slice(0,6),
                          disabled_tools:q('.pc-deck__tool').map(e=>({t:(e.innerText||'').replace(/\\s+/g,' ').trim(),disabled:!!e.disabled})),
                          chips:q('[data-testid=ov-chip]').map(e=>({t:e.innerText.replace(/\\s+/g,' ').trim(),done:e.getAttribute('data-done')}))};}""")
        except Exception as exc:  # noqa: BLE001
            out["error"] = str(exc)[:500]
            rec.snap("62-new-session-failed", action="新建会话未完成", note=str(exc)[:300])
            out["text_at_failure"] = re.sub(r"\s+", " ", page.inner_text("body"))[-3000:]
        rec.save(extra=out, filename="run-04-new-session.json")
        print(json.dumps({k: out.get(k) for k in ("session_id", "error")}, ensure_ascii=False), flush=True)
        ctx.close()
        browser.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())