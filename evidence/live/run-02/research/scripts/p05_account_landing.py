# -*- coding: utf-8 -*-
"""P05: account page inventory, landing (fresh state + recent projects), three start modes,
real project creation via UI and its default files.
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
import sess as S  # noqa: E402
from live_login import RESEARCH, login  # noqa: E402

R: dict = {}
BASE = "http://127.0.0.1:5176"

PAGE_JS = r"""
() => {
  const clean = s => (s||'').replace(/\s+/g,' ').trim();
  const q = s => [...document.querySelectorAll(s)];
  const vis = el => { const r = el.getBoundingClientRect(); return r.width>0 && r.height>0; };
  const buttons = q('button, [role=button], a.btn').filter(vis).map(b => ({
    text: clean(b.innerText || b.getAttribute('aria-label') || ''),
    label: b.getAttribute('aria-label') || '',
    cls: typeof b.className==='string' ? b.className.slice(0,110) : '',
    disabled: b.disabled === true,
  })).filter(b => b.text);
  const headings = q('h1,h2,h3,h4').filter(vis).map(h => ({tag:h.tagName.toLowerCase(), text: clean(h.innerText)})).filter(h=>h.text);
  const inputs = q('input,textarea,select').filter(vis).map(el => ({tag:el.tagName.toLowerCase(), type:el.type||'', placeholder:el.getAttribute('placeholder')||'', value:(el.value||'').slice(0,60), label:el.getAttribute('aria-label')||''}));
  const cards = q('[class*=recent], [class*=project-card], [class*=card], [class*=start], [class*=mode]').filter(vis)
    .map(el => ({cls: typeof el.className==='string'?el.className.slice(0,110):'', text: clean(el.innerText).slice(0,600)}))
    .filter(c => c.text.length > 8).slice(0,25);
  const kv = q('dt, dd, [class*=field], [class*=kv], [class*=row]').filter(vis).map(el => clean(el.innerText)).filter(t=>t.length>0 && t.length<200).slice(0,80);
  return {
    url: location.href, title: document.title,
    headings, buttons: buttons.slice(0,120), inputs, cards, kv,
    bodyText: (document.body.innerText||'').slice(0,30000),
    htmlLang: document.documentElement.lang,
    modals: q('[role=dialog], [class*=modal], [class*=dialog]').filter(vis).map(el=>clean(el.innerText).slice(0,1000)),
  };
}
"""


def capture(page, key: str, prefix: str) -> dict:
    d = page.evaluate(PAGE_JS)
    H.save_json(f"api/page-{prefix}.json", d)
    H.shot(page, f"{prefix}-full.png", full=True)
    H.shot(page, f"{prefix}-viewport.png", full=False)
    R[key] = {"url": d["url"], "title": d["title"], "headings": d["headings"],
              "buttons": [b["text"] for b in d["buttons"]], "inputs": d["inputs"],
              "cards": d["cards"], "kv": d["kv"], "bodyText": d["bodyText"],
              "screenshots": [f"{prefix}-full.png", f"{prefix}-viewport.png"],
              "json": f"api/page-{prefix}.json"}
    H.log(f"capture[{prefix}] {d['url']} / {d['title']}")
    return d


def goto_landing(page) -> None:
    page.goto(BASE + "/research-workspace", wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(5000)


def main() -> int:
    with sync_playwright() as p:
        browser, ctx, page = S.open_page(p)

        # anonymous login page facts + screenshot (separate clean context, no SMS)
        st = H.start_step("login-page", "匿名打开 /login，记录登录页 URL/title/身份选择/登录方式")
        anon_browser = None
        try:
            anon_browser = p.chromium.launch(headless=True)
            actx = anon_browser.new_context(viewport={"width": 1672, "height": 941}, device_scale_factor=1, locale="zh-CN")
            apage = actx.new_page()
            apage.goto(BASE + "/login", wait_until="load", timeout=45000)
            apage.wait_for_timeout(2000)
            R["login_page"] = {"url": apage.url, "title": apage.title(),
                               "body": apage.inner_text("body")[:2000],
                               "roles": apage.evaluate("() => [...document.querySelectorAll('#preferred-role option')].map(o=>({v:o.value,t:(o.innerText||'').trim()}))")}
            H.shot(apage, "12-login-page.png", full=False)
            actx.close()
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:400]
        finally:
            if anon_browser:
                anon_browser.close()
        H.end_step(st)

        # ---------- landing fresh inventory ----------
        st = H.start_step("landing", "启动页盘点（项目/计数/描述/三种开始方式/最近项目）")
        try:
            goto_landing(page)
            d = capture(page, "landing", "12-landing")
            R["landing"]["recent"] = page.evaluate(r"""
            () => {
              const clean = s => (s||'').replace(/\s+/g,' ').trim();
              const secs = [...document.querySelectorAll('section, div')].filter(el => clean(el.innerText).includes('RECENT PROJECTS') || clean(el.innerText).includes('最近项目'));
              const sec = secs[secs.length-1];
              if (!sec) return [];
              return [...sec.querySelectorAll('button')].map(b => ({
                text: clean(b.innerText), cls: typeof b.className==='string'?b.className.slice(0,100):''
              }));
            }""")
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:400]
        H.end_step(st)

        # ---------- account (个人中心) via header nav ----------
        st = H.start_step("account", "启动页顶栏「个人中心」→ 全字段盘点")
        try:
            page.get_by_role("button", name="个人中心").first.click(timeout=10000)
            page.wait_for_url(re.compile(r"/research-workspace/account"), timeout=20000)
            page.wait_for_timeout(4000)
            capture(page, "account", "13-account")
            # tab clicks: 个人资料 / 账号安全 / 科研概览 (if tabs exist)
            tabs = []
            try:
                tabs = page.evaluate("""() => [...document.querySelectorAll('.ra-tab, [role=tab], .ra-nav button')].map(b=>(b.innerText||'').trim()).filter(Boolean)""")
            except Exception:
                pass
            R["account"]["tabs"] = tabs
            R["account"]["tabPages"] = {}
            for label in ("账号安全", "科研概览"):
                if any(label in t for t in tabs):
                    try:
                        page.get_by_role("button", name=re.compile(label)).first.click(timeout=6000)
                        page.wait_for_timeout(2500)
                        dd = page.evaluate(PAGE_JS)
                        H.shot(page, f"13-account-{label}.png", full=False)
                        R["account"]["tabPages"][label] = {"bodyText": dd["bodyText"][:4000],
                                                           "screenshot": f"13-account-{label}.png"}
                    except Exception as exc:  # noqa: BLE001
                        R["account"]["tabPages"][label] = {"error": str(exc)[:300]}
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:400]
            H.log("account FAIL " + str(exc)[:250])
        H.end_step(st)

        # ---------- three start modes from landing ----------
        st = H.start_step("start-modes", "启动页三种开始方式逐一点击：读论文 / 写论文 / 问 Agent")
        R["start_modes"] = {}
        for label, key in (("读论文", "read"), ("写论文", "write"), ("问 Agent", "agent")):
            try:
                goto_landing(page)
                # the three start cards are buttons containing 0N + label
                page.locator("button", has_text=label).first.click(timeout=10000)
                page.wait_for_timeout(7000)
                dd = page.evaluate(PAGE_JS)
                H.shot(page, f"12-start-{key}.png", full=False)
                R["start_modes"][label] = {"url": dd["url"], "title": dd["title"], "headings": dd["headings"][:6],
                                            "bodyHead": dd["bodyText"][:600], "screenshot": f"12-start-{key}.png"}
                H.log(f"start[{label}] -> {dd['url']}")
            except Exception as exc:  # noqa: BLE001
                R["start_modes"][label] = {"error": str(exc)[:400]}
                H.log(f"start[{label}] FAIL " + str(exc)[:200])
        H.end_step(st)

        # ---------- create a new project via UI ----------
        st = H.start_step("new-project", "启动页「＋ 新建项目」真实创建，记录落点与默认文件")
        try:
            goto_landing(page)
            before = [s for s in H.state["steps"] if "/projects" in s["url"] and s["method"] == "POST"]
            page.get_by_role("button", name=re.compile("新建项目")).first.click(timeout=10000)
            page.wait_for_timeout(9000)
            dd = page.evaluate(PAGE_JS)
            m = re.search(r"/research-workspace/([0-9a-f-]{36})/(read|write)", dd["url"])
            R["new_project"] = {"url": dd["url"], "title": dd["title"],
                                 "project_id": m.group(1) if m else None,
                                 "mode": m.group(2) if m else None,
                                 "bodyHead": dd["bodyText"][:1500],
                                 "screenshot": "12-new-project.png"}
            H.shot(page, "12-new-project.png", full=False)
            H.shot(page, "12-new-project-full.png", full=True)
            R["new_project"]["api"] = [{"id": s["id"], "step": s["step"], "method": s["method"], "status": s["status"],
                                        "url": s["url"][:150], "req": (s.get("request_body") or "")[:400],
                                        "resp": (s.get("response_body") or "")[:500]}
                                       for s in H.state["steps"] if s["id"] > (before[-1]["id"] if before else 0)
                                       and "/projects" in s["url"]][:20]
            # defaults: file tree in write mode
            if m:
                pid = m.group(1)
                page.goto(f"{BASE}/research-workspace/{pid}/write", wait_until="domcontentloaded", timeout=45000)
                page.wait_for_timeout(9000)
                dd2 = page.evaluate(PAGE_JS)
                page.wait_for_timeout(1500)
                tree = page.evaluate("""() => [...document.querySelectorAll('.rw-tree__row')].map(r=>(r.innerText||'').trim())""")
                R["new_project"]["write"] = {"url": dd2["url"], "tree": tree,
                                              "bodyHead": dd2["bodyText"][:2000],
                                              "screenshot": "12-new-project-write.png"}
                H.shot(page, "12-new-project-write.png", full=False)
                H.log("new project write tree=" + json.dumps(tree, ensure_ascii=False))
            H.log("new_project -> " + json.dumps({k: R['new_project'][k] for k in ('url', 'project_id', 'mode')}, ensure_ascii=False))
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:500]
            H.log("new project FAIL " + str(exc)[:300])
        H.end_step(st)

        # ---------- landing again: recent projects now show counts ----------
        st = H.start_step("landing-after", "返回启动页，记录最近项目区（新建后）")
        try:
            goto_landing(page)
            d = capture(page, "landing_after", "12-landing-after")
            R["landing_after"] = {"url": d["url"], "bodyText": d["bodyText"][:6000]}
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:300]
        H.end_step(st)

        R["api_all"] = [{"id": s["id"], "step": s["step"], "method": s["method"], "status": s["status"],
                         "url": s["url"][:150]} for s in H.state["steps"]]
        H.finalize({"p05": {k: v for k, v in R.items() if k != "api_all"}}, "api/steps-p05.json")
        (H.OUT / "api" / "p05-results.json").write_text(json.dumps(R, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
        S.save_state(ctx)
        ctx.close()
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())