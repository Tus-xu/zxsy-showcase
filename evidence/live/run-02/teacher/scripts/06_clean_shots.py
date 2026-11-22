# -*- coding: utf-8 -*-
"""run-02 教师端 · 脚本 06：干净版登录流程 + 身份 + 外框导航 + 六个一级页面截图（无任务面板遮挡）。"""
from __future__ import annotations

import json
import re
import sys
import time

from playwright.sync_api import sync_playwright

sys.path.insert(0, r"D:\zxsy-math-arena-showcase\evidence\live\run-02\teacher\scripts")
from r02lib import API, Rec, SHOTS, URL, open_context  # noqa: E402

NAV = [("备课中心", "81-prep"), ("课堂", "82-classroom"), ("题库与组卷", "83-bank"),
       ("作业与批改", "84-assign"), ("学情洞察", "85-insights"), ("资源中心", "86-resources")]


def send_code(page):
    with page.expect_response(lambda r: "/auth/challenges/sms" in r.url, timeout=30000) as ri:
        page.get_by_role("button", name="获取验证码").click()
    r = ri.value
    body = ""
    try:
        body = r.text()[:600]
    except Exception:  # noqa: BLE001
        pass
    return r.status, body


def main() -> int:
    out = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = open_context(browser)
        page = ctx.new_page()
        rec = Rec(page, "06-clean-shots")
        # ---- 登录页与演示验证码 ----
        page.goto(URL + "/login", wait_until="load")
        page.wait_for_timeout(1600)
        rec.snap("80-login-page", action="打开 /login", note="记录角色选择/手机号/验证码登录方式")
        out["login_page"] = page.evaluate("""() => {
          const q=(s)=>[...document.querySelectorAll(s)];
          return {role_select_opts:[...document.querySelectorAll('#preferred-role option')].map(o=>({v:o.value,t:o.text})),
                  role_select_visible:!!document.querySelector('#preferred-role'),
                  inputs:q('input').map(e=>({id:e.id,type:e.type,ph:e.placeholder})),
                  tabs:q('[class*=tab],[role=tab]').map(e=>e.innerText.replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,8),
                  buttons:q('button').map(e=>(e.innerText||'').replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,15)};
        }""")
        page.select_option("#preferred-role", "teacher")
        page.fill("#auth-phone", "13800001002")
        st, body = send_code(page)
        if st == 429:
            m = re.search(r'"retry_after"\s*:\s*(\d+)', body)
            page.wait_for_timeout((int(m.group(1)) if m else 60) * 1000 + 2000)
            st, body = send_code(page)
        page.wait_for_timeout(2000)
        out["code_send"] = {"status": st, "body": body}
        rec.snap("81-login-demo-code", action="获取验证码（页面显示演示验证码）", note="截图保留演示码展示区")
        txt = page.inner_text("body")
        m = re.search(r"演示环境验证码[：:]\s*(\d{6})", txt) or re.search(r"验证码[^0-9]{0,20}(\d{6})", txt)
        code = m.group(1) if m else ""
        out["demo_code"] = code
        page.get_by_placeholder("6 位验证码").fill(code)
        page.get_by_role("button", name="安全登录").click()
        page.wait_for_url(lambda u: "/login" not in u, timeout=30000)
        page.wait_for_timeout(3000)
        rec.snap("82-prep-home-clean", action="安全登录 → 落地 /teacher-v3/prep", note="记录落地路由/姓名/角色")
        out["landed"] = {"url": page.url, "title": page.title()}
        out["shell"] = page.evaluate("""() => {
          const q=(s)=>[...document.querySelectorAll(s)];
          return {brand:q('.tv3-nav__brand').map(e=>e.innerText.replace(/\\s+/g,' ').trim()),
                  groups:q('.tv3-nav__group-label').map(e=>e.innerText.trim()),
                  nav:q('.tv3-nav__item').map(e=>({t:e.innerText.replace(/\\s+/g,' ').trim(),href:e.getAttribute('href'),active:e.classList.contains('is-active'),badge:[...e.querySelectorAll('[class*=badge]')].map(b=>b.innerText.trim())})),
                  topbar:(q('.tv3-topbar')[0]?.innerText||'').replace(/\\s+/g,' ').trim(),
                  chip:q('.tv3-teacher-chip').map(e=>e.innerText.replace(/\\s+/g,' ').trim()),
                  tags:q('[class*=tag]').map(e=>e.innerText.replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,6),
                  task_bell:q('[data-testid=tv3-task-bell]').map(e=>e.innerText.replace(/\\s+/g,' ').trim())};
        }""")
        out["home"] = page.evaluate("""() => {
          const q=(s)=>[...document.querySelectorAll(s)]; const t=(s)=>(q(s)[0]?.innerText||'').replace(/\\s+/g,' ').trim();
          return {title:t('.pc-home__title'), subtitle:t('.pc-home__subtitle'), entries:q('.pc-home__entry').map(e=>e.innerText.replace(/\\s+/g,' ').trim()),
                  recent_count:t('.pc-home__count'), rows:q('.pc-home__row').map(e=>e.innerText.replace(/\\s+/g,' ').trim()),
                  class_pill:t('.pc-home__class-pill, [class*=class-pill]')};
        }""")

        # ---- 六个一级页面：干净截图 ----
        nav_pages = {}
        for label, name in NAV:
            page.locator(".tv3-nav__item", has_text=label).first.click(timeout=10000)
            page.wait_for_timeout(3500)
            rec.snap(name, action=f"点击左侧导航「{label}」", note="干净版一级页面截图")
            nav_pages[label] = {"url": page.url, "title": page.title(),
                                "text": re.sub(r"\s+", " ", page.inner_text("body"))[:1800]}
        out["nav_pages"] = nav_pages

        # 备课历史：从备课中心页内入口进入
        page.locator(".tv3-nav__item", has_text="备课中心").first.click(timeout=10000)
        page.wait_for_timeout(3000)
        try:
            page.locator(".pc-home__link", has_text="查看全部").click(timeout=8000)
        except Exception:  # noqa: BLE001
            page.goto(URL + "/teacher-v3/prep/history", wait_until="domcontentloaded")
        page.wait_for_timeout(3000)
        rec.snap("87-prep-history-clean", action="备课中心「查看全部 ›」→ 备课历史", note="唯一会话与状态")
        out["history"] = {"url": page.url, "text": re.sub(r"\s+", " ", page.inner_text("body"))[:1500]}

        rec.save(extra=out, filename="run-06-clean.json")
        print(json.dumps({"landed": out["landed"], "nav": [x["t"] for x in out["shell"]["nav"]],
                          "groups": out["shell"]["groups"], "chip": out["shell"]["chip"]}, ensure_ascii=False), flush=True)
        ctx.close()
        browser.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())