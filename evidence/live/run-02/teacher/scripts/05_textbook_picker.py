# -*- coding: utf-8 -*-
"""run-02 教师端 · 脚本 05：新建会话里 AI 要求「选一本教材开始」，点开卡片核实真实可选教材（预期为空）。"""
from __future__ import annotations

import json
import re
import sys

from playwright.sync_api import sync_playwright

sys.path.insert(0, r"D:\zxsy-math-arena-showcase\evidence\live\run-02\teacher\scripts")
from r02lib import API, Rec, URL, fresh_login, open_context  # noqa: E402

SID = json.loads((API / "session-new.json").read_text(encoding="utf-8"))["session_id"]


def main() -> int:
    out = {"session_id": SID}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = open_context(browser)
        page = ctx.new_page()
        rec = Rec(page, "05-textbook-picker")
        fresh_login(page, rec)
        page.goto(f"{URL}/teacher-v3/prep/w/{SID}/classroom", wait_until="domcontentloaded")
        page.wait_for_timeout(4500)
        rec.snap("70-new-session-classroom", action="打开新建会话工作台", note="确认 AI 要求选教材")
        out["before"] = re.sub(r"\s+", " ", page.inner_text("body"))[-2200:]
        try:
            page.get_by_text("选一本教材开始", exact=False).first.click(timeout=8000)
            page.wait_for_timeout(2200)
            rec.snap("71-textbook-picker", action="点击 AI 卡片「选一本教材开始」", note="记录真实可选教材列表")
            out["picker_text"] = page.evaluate("""() => {
              const q=(s)=>[...document.querySelectorAll(s)];
              return {dialogs:q('[role=dialog],[class*=drawer],[class*=picker],[class*=modal]').map(e=>e.innerText.replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,6),
                      options:q('[role=option], option, [class*=option], [class*=textbook-item], [class*=book-item]').map(e=>e.innerText.replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,20),
                      empty:q('[class*=empty]').map(e=>e.innerText.replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,6),
                      text:document.body.innerText.replace(/\\s+/g,' ').slice(-1800)};
            }""")
            # 卡片内可见按钮（不点击不存在的确认，避免伪造进度）
            out["buttons"] = page.evaluate("""() => [...document.querySelectorAll('button')].map(e=>({t:(e.innerText||'').replace(/\\s+/g,' ').trim(),disabled:!!e.disabled})).filter(x=>x.t).slice(-30)""")
            page.keyboard.press("Escape")
            page.wait_for_timeout(600)
            rec.snap("72-textbook-picker-closed", action="关闭教材选择层", note="回到工作台")
        except Exception as exc:  # noqa: BLE001
            out["error"] = str(exc)[:400]
            rec.snap("71-textbook-picker-failed", action="点击教材卡未成功", note=str(exc)[:300])
        rec.save(extra=out, filename="run-05-textbook-picker.json")
        print(json.dumps(out, ensure_ascii=False)[:2000], flush=True)
        ctx.close()
        browser.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())