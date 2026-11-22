# -*- coding: utf-8 -*-
"""补齐「错题」页证据：进入时的自动详情浮窗态 + 关闭浮窗后的列表态（可复跑）。"""
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:5176"
OUT = Path(r"D:\zxsy-math-arena-showcase\evidence\live\run-02\student")
STATE = Path(r"D:\zxsy-math-arena-showcase\.work\state\run02-student.json")


def norm(s):
    return re.sub(r"\s+", " ", s or "").strip()


DUMP = r"""
() => {
  const vis = (el) => { if (!el) return false; const s = getComputedStyle(el);
    if (s.display==='none'||s.visibility==='hidden') return false;
    const r = el.getBoundingClientRect(); return r.width>2 && r.height>2; };
  const txt = (el) => (el.innerText||el.textContent||'').replace(/\s+/g,' ').trim();
  const q=(s)=>document.querySelector(s); const qa=(s)=>Array.from(document.querySelectorAll(s)).filter(vis);
  const rect=(el)=>{ if(!el) return null; const r=el.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; };
  return {
    title: document.title, url: location.pathname+location.search,
    overlay: qa('.entry-card, .errors-left.modal-mode, .modal').map(e=>({cls:e.className,text:txt(e).slice(0,160)})),
    headings: qa('h1,h2,h3,.modal-title,.detail-title').map(e=>txt(e).slice(0,90)).filter(Boolean),
    controls: qa('button, input:not([type=hidden]), select, textarea').filter(e=>!e.closest('.sidebar')).map(e=>({
      kind:e.tagName.toLowerCase(), text:txt(e).slice(0,70), title:(e.getAttribute('title')||'').slice(0,90),
      ph:(e.getAttribute('placeholder')||'').slice(0,70), disabled: !!e.disabled,
      cls:(typeof e.className==='string'?e.className:'').slice(0,70)})).slice(0,70),
    chips: qa('.badge,.pill,.tag,.chip,.num,.stat,.count').map(e=>txt(e).slice(0,40)).filter(Boolean).slice(0,30),
    bodyText: txt(document.body).slice(0,4000),
    sidebarRect: rect(q('.sidebar')), mainRect: rect(q('.main'))
  };
}
"""


def shot(page, name):
    page.mouse.move(8, 8)
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT / "shots" / name), full_page=True)
    return f"shots/{name}"


def main():
    records = []
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        kw = dict(viewport={"width": 1672, "height": 941}, device_scale_factor=1, locale="zh-CN")
        if STATE.exists():
            kw["storage_state"] = str(STATE)
        ctx = b.new_context(**kw)
        page = ctx.new_page()
        page.goto(BASE + "/errors", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(5000)
        rec = {"page": "学生端 · 错题（进入即自动弹出详情浮窗）", "route": "/errors",
               "reached_from": "左侧导航「错题」点击（进入后自动打开第 01 题详情）"}
        rec.update(page.evaluate(DUMP))
        rec["screenshot"] = shot(page, "s04-errors.png")
        records.append(rec)
        print("modal:", rec.get("headings"), flush=True)
        page.locator(".modal-close[title='关闭详情']").first.click(timeout=8000)
        page.wait_for_timeout(1500)
        rec2 = {"page": "学生端 · 错题（关闭详情浮窗后的列表态）", "route": "/errors",
                "reached_from": "错题详情浮窗「✕ 关闭」按钮"}
        rec2.update(page.evaluate(DUMP))
        rec2["screenshot"] = shot(page, "s04b-errors-list.png")
        records.append(rec2)
        print("list:", (rec2.get("bodyText") or "")[:200], flush=True)
        print("chips:", rec2.get("chips"), flush=True)
        ctx.close()
        b.close()
    (OUT / "api" / "errors-fix.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    print("saved", OUT / "api" / "errors-fix.json", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())