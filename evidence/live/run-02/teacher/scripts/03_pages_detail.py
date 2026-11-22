# -*- coding: utf-8 -*-
"""run-02 教师端 · 脚本 03：课堂 / 作业与批改 / 题库与组卷 / 批改工作台 / 学情洞察 / 资源中心 实测盘点。

只读盘点 + 真实点击（含 disabled 控件点击尝试）；不写分、不发布、不修改任何数据。
"""
from __future__ import annotations

import json
import re
import sys

from playwright.sync_api import sync_playwright

sys.path.insert(0, r"D:\zxsy-math-arena-showcase\evidence\live\run-02\teacher\scripts")
from r02lib import API, Rec, URL, fresh_login, open_context  # noqa: E402


def attempt(page, locator, label: str, timeout: int = 2500) -> dict:
    try:
        locator.first.click(timeout=timeout)
        page.wait_for_timeout(1200)
        return {"label": label, "clicked": True, "url": page.url}
    except Exception as exc:  # noqa: BLE001
        return {"label": label, "clicked": False, "url": page.url, "error": str(exc).replace("\n", " ")[:260]}


def main() -> int:
    out: dict = {"pages": {}, "attempts": {}}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = open_context(browser)
        page = ctx.new_page()
        rec = Rec(page, "03-pages")
        fresh_login(page, rec)

        # ---------- 课堂 ----------
        page.locator(".tv3-nav__item", has_text="课堂").first.click(timeout=10000)
        page.wait_for_timeout(3800)
        rec.snap("40-classroom", action="左侧导航「课堂」", note="双师课堂/已发布课件学习进度")
        out["pages"]["classroom"] = {
            "url": page.url,
            "cards": page.evaluate("""() => {
              const q=(s)=>[...document.querySelectorAll(s)]; const t=(s)=>(q(s)[0]?.innerText||'').replace(/\\s+/g,' ').trim();
              return {sub_tabs:t('[class*=tab]'), empty:q('[class*=empty]').map(e=>(e.innerText||'').trim()).filter(Boolean),
                      rows:[...document.querySelectorAll('[class*=courseware],[class*=ware-card],[class*=card]')].map(e=>(e.innerText||'').replace(/\\s+/g,' ').trim()).filter(x=>x.length>20).slice(0,8),
                      data:q('[class*=courseware]').length};}"""),
            "text": page.inner_text("body")[-2500:],
        }
        out["attempts"]["classroom_refresh"] = attempt(page, page.get_by_role("button", name="刷新"), "课堂「刷新」")
        page.wait_for_timeout(2200)
        rec.snap("41-classroom-refreshed", action="课堂「刷新」后", note="确认列表与进度未变化、无新发布对象")
        out["pages"]["classroom"]["text_after_refresh"] = re.sub(r"\s+", " ", page.inner_text("body"))[-1800:]

        # ---------- 作业与批改 ----------
        page.locator(".tv3-nav__item", has_text="作业与批改").first.click(timeout=10000)
        page.wait_for_timeout(3500)
        rec.snap("42-assign", action="左侧导航「作业与批改」", note="默认进入发布作业四步流程 + 作业列表")
        out["pages"]["assign"] = page.evaluate("""() => {
          const q=(s)=>[...document.querySelectorAll(s)]; const t=(s)=>(q(s)[0]?.innerText||'').replace(/\\s+/g,' ').trim();
          return {steps:q('[class*=step],[class*=stepper]').map(e=>(e.innerText||'').replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,8),
                  classes:q('select').map(e=>({aria:e.getAttribute('aria-label')||'',opts:[...e.options].map(o=>o.text)})),
                  buttons:q('button').map(e=>({t:(e.innerText||'').replace(/\\s+/g,' ').trim(),disabled:!!e.disabled})).filter(x=>x.t).slice(0,40),
                  rows:q('[class*=assignment],[class*=task-row],[class*=paper]').map(e=>(e.innerText||'').replace(/\\s+/g,' ').trim()).filter(x=>x.length>15).slice(0,10),
                  empty:q('[class*=empty]').map(e=>(e.innerText||'').trim()).filter(Boolean)};}""")
        out["attempts"]["assign_goto_quiz"] = attempt(page, page.get_by_text("去组卷并发布", exact=False), "作业页「去组卷并发布」")

        # ---------- 组卷中心（0 题空态） ----------
        if "/teacher-v3/quiz" in page.url:
            page.wait_for_timeout(3200)
            rec.snap("43-quiz", action="作业页 → 组卷中心 /teacher-v3/quiz", note="题库 0/0 空态")
            out["pages"]["quiz"] = page.evaluate("""() => {
              const q=(s)=>[...document.querySelectorAll(s)]; const t=(s)=>(q(s)[0]?.innerText||'').replace(/\\s+/g,' ').trim();
              return {bank_count:t('[class*=count]'), empty:q('[class*=empty]').map(e=>(e.innerText||'').trim()).filter(Boolean),
                      buttons:q('button').map(e=>({t:(e.innerText||'').replace(/\\s+/g,' ').trim(),disabled:!!e.disabled,title:e.getAttribute('title')})).filter(x=>x.t).slice(0,30),
                      text:document.body.innerText.replace(/\\s+/g,' ').slice(-2000)};}""")
            out["attempts"]["quiz_publish_as_homework"] = attempt(page, page.get_by_role("button", name="发布为作业"), "组卷中心「发布为作业」")
            out["attempts"]["quiz_export_pdf"] = attempt(page, page.get_by_role("button", name="导出 PDF"), "组卷中心「导出 PDF」")
            rec.snap("44-quiz-attempts", action="点击「发布为作业」/「导出 PDF」", note="空题库下的按钮状态")

        # ---------- 批改工作台 ----------
        page.goto(URL + "/teacher-v3/grading", wait_until="domcontentloaded")
        page.wait_for_timeout(3800)
        rec.snap("45-grading", action="批改工作台 /teacher-v3/grading", note="真实队列与已批/待批数量")
        out["pages"]["grading"] = page.evaluate("""() => {
          const q=(s)=>[...document.querySelectorAll(s)]; const t=(s)=>(q(s)[0]?.innerText||'').replace(/\\s+/g,' ').trim();
          return {summary:q('[class*=progress],[class*=summary],[class*=stat]').map(e=>(e.innerText||'').replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,10),
                  resolved:t('[class*=queue]'), tabs:q('[class*=tab]').map(e=>(e.innerText||'').trim()).filter(Boolean).slice(0,15),
                  text:document.body.innerText.replace(/\\s+/g,' ').slice(-2600)};}""")

        # ---------- 学情洞察 ----------
        page.locator(".tv3-nav__item", has_text="学情洞察").first.click(timeout=10000)
        page.wait_for_timeout(3500)
        rec.snap("46-insights", action="左侧导航「学情洞察」", note="真实数字/图表/每生学情")
        out["pages"]["insights"] = page.evaluate("""() => {
          const q=(s)=>[...document.querySelectorAll(s)];
          return {stats:q('[class*=stat],[class*=metric],[class*=kpi]').map(e=>(e.innerText||'').replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,20),
                  tables:[...document.querySelectorAll('table')].map(t=>(t.innerText||'').replace(/\\s+/g,' ').trim().slice(0,800)),
                  canvases:q('canvas, svg[class*=chart]').length,
                  text:document.body.innerText.replace(/\\s+/g,' ').slice(-2800)};}""")

        # ---------- 资源中心 ----------
        page.locator(".tv3-nav__item", has_text="资源中心").first.click(timeout=10000)
        page.wait_for_timeout(3500)
        rec.snap("47-resources", action="左侧导航「资源中心」", note="B 站备课视频资源")
        out["pages"]["resources"] = page.evaluate("""() => {
          const q=(s)=>[...document.querySelectorAll(s)];
          return {cats:q('[class*=cat],[class*=filter]').map(e=>(e.innerText||'').replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,12),
                  cards:q('[class*=video],[class*=card]').map(e=>(e.innerText||'').replace(/\\s+/g,' ').trim()).filter(x=>x.length>15).slice(0,6),
                  text:document.body.innerText.replace(/\\s+/g,' ').slice(-2500)};}""")
        out["attempts"]["resources_refresh"] = attempt(page, page.get_by_text("↻ 刷新", exact=False), "资源中心「↻ 刷新」")
        page.wait_for_timeout(2000)
        rec.snap("48-resources-refresh", action="资源中心刷新", note="刷新后列表")

        # ---------- 题库与组卷（一级导航） ----------
        page.locator(".tv3-nav__item", has_text="题库与组卷").first.click(timeout=10000)
        page.wait_for_timeout(3500)
        rec.snap("49-bank", action="左侧导航「题库与组卷」", note="题库空态 0/0")
        out["pages"]["bank"] = page.evaluate("""() => {
          const q=(s)=>[...document.querySelectorAll(s)]; const t=(s)=>(q(s)[0]?.innerText||'').replace(/\\s+/g,' ').trim();
          return {count:t('[class*=count]'), empty:q('[class*=empty]').map(e=>(e.innerText||'').trim()).filter(Boolean),
                  text:document.body.innerText.replace(/\\s+/g,' ').slice(-2200)};}""")

        # ---------- 备课历史（状态列） ----------
        page.goto(URL + "/teacher-v3/prep/history", wait_until="domcontentloaded")
        page.wait_for_timeout(3500)
        rec.snap("50-prep-history", action="备课历史 /teacher-v3/prep/history", note="唯一会话与状态徽标")
        out["pages"]["history"] = page.evaluate("""() => {
          const q=(s)=>[...document.querySelectorAll(s)];
          return {rows:q('.pc-hist__row').map(e=>(e.innerText||'').replace(/\\s+/g,' ').trim()).slice(0,5),
                  badges:q('[class*=badge],[class*=status]').map(e=>(e.innerText||'').trim()).filter(Boolean).slice(0,10),
                  text:document.body.innerText.replace(/\\s+/g,' ').slice(-1500)};}""")

        rec.save(extra=out, filename="run-03-pages-detail.json")
        print(json.dumps({k: (v.get("text", "")[:300] if isinstance(v, dict) else "") for k, v in out["pages"].items()},
                         ensure_ascii=False, indent=1)[:3000], flush=True)
        ctx.close()
        browser.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())