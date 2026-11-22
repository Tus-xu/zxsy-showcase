# -*- coding: utf-8 -*-
"""run-02 学生端 · 登录 + 逐页盘点（可复跑）。

产出：
  shots/s01-login.png, s01b-login-code.png, s02-home.png,
  shots/s03-practice.png ... s08-me.png, s09..s12-me-*.png, s13..s15-classroom-*.png
  pages.json（每页可见控件/状态/文案的结构化记录）
  api/steps-pages.json（盘点期间的 API 元数据）
"""
from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\.work\scripts")
from live_login import STUDENT, read_demo_code  # noqa: E402
from _capture import Recorder  # noqa: E402

BASE = "http://127.0.0.1:5176"
OUT = Path(r"D:\zxsy-math-arena-showcase\evidence\live\run-02\student")
SHOTS = OUT / "shots"
RESULT = OUT / "pages.json"
LOG = (OUT / "_p01.log.txt").open("w", encoding="utf-8")
CONSOLE: list[str] = []
BAD_NET: list[dict] = []


def log(*a):
    s = " ".join(str(x) for x in a)
    LOG.write(s + "\n")
    LOG.flush()
    print(s.encode("ascii", "replace").decode("ascii"), flush=True)


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip()


def shot(page, name: str, full: bool = True) -> str:
    try:
        page.mouse.move(8, 8)
    except Exception:  # noqa: BLE001
        pass
    page.wait_for_timeout(450)
    p = SHOTS / name
    page.screenshot(path=str(p), full_page=full)
    return f"shots/{name}"


DUMP_JS = r"""
() => {
  const vis = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const txt = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  const pick = (sel, f) => Array.from(document.querySelectorAll(sel)).filter(vis).map(f);
  const navItems = pick('.sidebar .nav-item', e => ({
    text: txt(e), tip: e.getAttribute('data-tip') || '', cls: e.className,
    href: e.getAttribute('href') || ''
  }));
  const navGroup = document.querySelector('.sidebar') ? Array.from(document.querySelectorAll('.sidebar *'))
      .filter(e => vis(e) && ['学习闭环','学习空间','工具','其他'].includes((e.innerText||'').trim()))
      .map(e => ({text: e.innerText.trim(), cls: e.className})).slice(0,5) : [];
  const controls = [];
  const seen = new Set();
  const push = (e, kind) => {
    if (!vis(e) || seen.has(e)) return;
    seen.add(e);
    controls.push({
      kind,
      text: txt(e).slice(0, 80),
      title: (e.getAttribute('title') || '').slice(0, 120),
      aria: (e.getAttribute('aria-label') || '').slice(0, 80),
      placeholder: (e.getAttribute('placeholder') || '').slice(0, 80),
      type: e.getAttribute('type') || '',
      disabled: !!e.disabled,
      cls: (typeof e.className === 'string' ? e.className : '').slice(0, 100)
    });
  };
  document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=tab], [role=button]').forEach(e => {
    if (e.closest('.sidebar')) return;
    push(e, e.tagName.toLowerCase());
  });
  const chips = pick('.badge, .pill, .tag, .chip, .num, .stat, .kpi, .corner, .counter, .count',
    e => ({ text: txt(e).slice(0, 40), cls: (typeof e.className === 'string' ? e.className : '').slice(0, 80) }))
    .filter(x => x.text);
  const empties = pick('.empty-state, .empty, .empty-tip, .placeholder, .no-data',
    e => txt(e).slice(0, 120)).filter(Boolean).slice(0, 6);
  const headings = pick('h1, h2, h3, .view-head, .page-title, .ttl, .v4-page-title, .hero-title, .view-title',
    e => txt(e).slice(0, 100)).filter(Boolean).slice(0, 14);
  const sidebar = document.querySelector('.sidebar');
  const header = document.querySelector('.dialog-header, .topbar, header, .topbar-l, .app-header');
  const overlay = Array.from(document.querySelectorAll('.entry-card, .errors-left.modal-mode, .modal, .dialog-mask, .mask'))
      .filter(vis).map(e => ({cls: e.className, text: txt(e).slice(0, 120)})).slice(0, 6);
  return {
    title: document.title,
    bodyText: txt(document.body).slice(0, 4500),
    headings,
    navItems, navGroup,
    sidebarText: sidebar ? txt(sidebar).slice(0, 1500) : '',
    headerText: header ? txt(header).slice(0, 400) : '',
    controls: controls.slice(0, 90),
    chips: chips.slice(0, 40),
    empties, overlay,
    hasStepBadge: txt(document.querySelector('.dialog-badges .step') || {}),
    meTabs: pick('.me-tabs button', e => ({ text: txt(e), active: /active|on/.test(e.className), cls: e.className })),
    clsTabs: pick('.cls-tabs button', e => ({ text: txt(e), active: /active|on/.test(e.className), cls: e.className })),
    scrollHeight: document.documentElement.scrollHeight,
    viewport: [window.innerWidth, window.innerHeight]
  };
}
"""


def dump(page) -> dict:
    return page.evaluate(DUMP_JS)


def record(page, records, name, route, entry_from, shot_name, full=True):
    rec = {"page": name, "route": route, "reached_from": entry_from}
    try:
        rec.update(dump(page))
    except Exception as exc:  # noqa: BLE001
        rec["dump_error"] = str(exc)[:300]
    rec["url"] = page.url
    rec["screenshot"] = shot(page, shot_name, full=full)
    records.append(rec)
    log(f"[page] {name} -> {page.url} shot={shot_name}")
    return rec


def dismiss_overlays(page, save_prefix: str = "") -> list[str]:
    """关闭会拦截侧边栏点击的浮层（错题详情浮窗 / 入本方式引导卡）。"""
    dismissed = []
    try:
        op = page.locator(".modal-close[title='关闭详情'], .modal-close:not(.next)").first
        if op.count() and op.is_visible():
            if save_prefix:
                shot(page, save_prefix + "-modal.png")
            op.click(timeout=4000)
            dismissed.append("modal-close")
            page.wait_for_timeout(900)
    except Exception:  # noqa: BLE001
        pass
    try:
        op = page.locator(".entry-card .entry-close").first
        if op.count() and op.is_visible():
            if save_prefix:
                shot(page, save_prefix + "-entrycard.png")
            op.click(timeout=4000)
            dismissed.append("entry-close")
            page.wait_for_timeout(900)
    except Exception:  # noqa: BLE001
        pass
    try:
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)
    except Exception:  # noqa: BLE001
        pass
    return dismissed


def click_nav(page, label: str) -> bool:
    dismiss_overlays(page)
    try:
        page.locator(".sidebar .nav-item", has_text=label).first.click(timeout=10000)
        return True
    except Exception as exc:  # noqa: BLE001
        log(f"[nav-retry] {label}: {str(exc)[:160]}")
        dismiss_overlays(page)
        try:
            page.locator(".sidebar .nav-item", has_text=label).first.click(force=True, timeout=6000)
            return True
        except Exception as exc2:  # noqa: BLE001
            log(f"[nav-force-fail] {label}: {str(exc2)[:160]}")
            return False


STATE = Path(r"D:\zxsy-math-arena-showcase\.work\state\run02-student.json")


def do_login(page, ctx):
    """正常 UI 登录；失败重试 3 次（验证码为页面显示的演示码）。成功后保存 storage_state。"""
    last = None
    for attempt in range(1, 4):
        try:
            page.goto(BASE + "/login", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(1800)
            page.select_option("#preferred-role", STUDENT["role"])
            page.fill("#auth-phone", STUDENT["phone"])
            page.get_by_role("button", name="获取验证码").click()
            page.wait_for_timeout(2200)
            code = ""
            try:
                code = norm(page.locator(".demo-note").first.inner_text())
            except Exception:  # noqa: BLE001
                pass
            if not code:
                code = read_demo_code(page)
            else:
                m = re.search(r"(\d{6})", code)
                code = m.group(1) if m else read_demo_code(page)
            note = ""
            try:
                note = norm(page.locator(".demo-note").first.inner_text())
            except Exception:  # noqa: BLE001
                pass
            page.get_by_placeholder("6 位验证码").fill(code)
            shot(page, "s01b-login-code.png")
            page.get_by_role("button", name="安全登录").click()
            page.wait_for_timeout(2200)
            try:
                page.wait_for_url(lambda u: "/login" not in u, timeout=30000)
            except Exception:  # noqa: BLE001
                pass
            page.wait_for_timeout(3200)
            if "/login" in page.url:
                raise RuntimeError("登录后仍在 /login")
            STATE.parent.mkdir(parents=True, exist_ok=True)
            ctx.storage_state(path=str(STATE))
            return {"demo_code": code, "demo_note": note, "url": page.url, "attempt": attempt,
                    "body_head": norm(page.inner_text("body"))[:1200],
                    "cookies_count": len(ctx.cookies())}
        except Exception as exc:  # noqa: BLE001
            last = str(exc)[:300]
            log(f"[login-retry] attempt {attempt} failed: {last}")
            page.wait_for_timeout(2500)
    raise RuntimeError("登录失败：" + str(last))


def main() -> int:
    SHOTS.mkdir(parents=True, exist_ok=True)
    records: list[dict] = []
    login_result: dict = {}
    rec_api = Recorder(OUT / "api", step_name="inventory")
    browser = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            ctx = browser.new_context(viewport={"width": 1672, "height": 941},
                                      device_scale_factor=1, locale="zh-CN")
            page = ctx.new_page()
            rec_api.attach(page, "pages")
            page.on("console", lambda m: CONSOLE.append(f"{m.type}: {m.text[:240]}") if m.type == "error" else None)
            page.on("pageerror", lambda e: CONSOLE.append("pageerror: " + str(e)[:240]))
            page.on("response", lambda r: BAD_NET.append({"url": r.url, "status": r.status})
                    if "/api/" in r.url and r.status >= 400 else None)

            # ---------- 1. 登录页 ----------
            page.goto(BASE + "/login", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(1500)
            login_rec = record(page, records, "登录页", "/login", "直接访问", "s01-login.png")
            role_opts = page.eval_on_selector_all(
                "#preferred-role option",
                "els => els.map(e => ({value: e.value, label: e.textContent.trim()}))")
            login_rec["role_options"] = role_opts
            log("[login] role options:", role_opts)

            # ---------- 2. 真实登录（页面演示码） ----------
            login_result = do_login(page, ctx)
            ctx = page.context
            records.append({"page": "登录页-验证码态", "route": "/login",
                            "demo_code_visible": login_result.get("demo_code"),
                            "demo_note": login_result.get("demo_note"),
                            "screenshot": "shots/s01b-login-code.png"})
            log("[login] demo note:", login_result.get("demo_note"), "landed:", login_result["url"])

            # ---------- 3. 首页 ----------
            home = record(page, records, "首页（对话学习）", "/dialog", "登录成功落地", "s02-home.png")
            login_result["nav_count"] = len(home.get("navItems", []))
            login_result["nav_items"] = [n.get("tip") or n.get("text") for n in home.get("navItems", [])]
            login_result["sidebar_text"] = home.get("sidebarText", "")[:900]
            records.append({"page": "登录结果", "route": "/login -> " + page.url, "result": login_result})

            # ---------- 4. 左侧导航逐项 ----------
            nav_plan = [
                ("练题", "/practice", "s03-practice.png"),
                ("错题", "/errors", "s04-errors.png"),
                ("知识库", "/library", "s05-library.png"),
                ("资源中心", "/resources", "s06-resources.png"),
                ("课堂", "/classroom", "s07-classroom.png"),
                ("我的", "/me", "s08-me.png"),
            ]
            for label, route, shot_name in nav_plan:
                # 每次从首页出发，避免上一页浮层/过渡态干扰侧边栏点击
                page.goto(BASE + "/dialog", wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(2400)
                ok = click_nav(page, label)
                page.wait_for_timeout(3800)
                expected_ok = page.url.rstrip("/").endswith(route)
                if not expected_ok:
                    # 点击后的落地页与预期不符（或点击被浮层拦截）：记录后改地址栏直访并二次确认
                    log(f"[nav-mismatch] {label}: click_ok={ok} url={page.url} expected={route}")
                    page.goto(BASE + route, wait_until="domcontentloaded", timeout=45000)
                    page.wait_for_timeout(3200)
                rec = record(page, records, f"学生端 · {label}", route,
                             f"左侧导航「{label}」点击" + ("" if ok else "（点击被浮层拦截，改地址栏，已记录）"),
                             shot_name)
                rec["nav_click_ok"] = ok
                rec["nav_landed_expected_route"] = page.url.rstrip("/").endswith(route)
                rec["nav_landed_url"] = page.url
                # 错题页若自动弹出详情浮窗：先记录遮挡态，再关闭取列表态
                if label == "错题":
                    dismissed = dismiss_overlays(page, save_prefix="s04-errors")
                    if dismissed:
                        rec["overlay_dismissed"] = dismissed
                        page.wait_for_timeout(800)
                        record(page, records, "学生端 · 错题（关闭详情浮窗后的列表态）",
                               "/errors", "关闭错题详情浮窗「✕ 关闭」", "s04b-errors-list.png")

            # ---------- 5. 我的 · 四个 Tab ----------
            page.goto(BASE + "/dialog", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(2200)
            click_nav(page, "我的")
            page.wait_for_timeout(2500)
            if not page.url.rstrip("/").endswith("/me"):
                page.goto(BASE + "/me", wait_until="domcontentloaded", timeout=45000)
                page.wait_for_timeout(2600)
            for label, key, shot_name in [("学情报告", "report", "s09-me-report.png"),
                                           ("掌握地图", "graph", "s10-me-graph.png"),
                                           ("体验反馈", "trial", "s11-me-trial.png"),
                                           ("个人设置", "profile", "s12-me-profile.png")]:
                try:
                    page.locator(".me-tabs button", has_text=label).first.click(timeout=9000)
                    page.wait_for_timeout(3000)
                    record(page, records, f"我的 · {label}", f"/me?tab={key}", "我的页顶部 Tab", shot_name)
                except Exception as exc:  # noqa: BLE001
                    records.append({"page": f"我的 · {label}", "route": f"/me?tab={key}",
                                    "error": str(exc)[:300], "url": page.url,
                                    "screenshot": shot(page, shot_name)})
                    log(f"[FAIL] me tab {label}: {exc}")

            # ---------- 6. 课堂 · 三个 Tab ----------
            page.goto(BASE + "/classroom", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(3200)
            record(page, records, "课堂 · 课堂任务（默认 Tab）", "/classroom", "左侧导航「课堂」", "s13-classroom-tasks.png")
            for label, key, shot_name in [("我的班级", "class", "s14-classroom-class.png"),
                                           ("双师课堂", "dual", "s15-classroom-dual.png")]:
                try:
                    page.locator(".cls-tabs button", has_text=label).first.click(timeout=9000)
                    page.wait_for_timeout(3200)
                    record(page, records, f"课堂 · {label}", f"/classroom?tab={key}", "课堂页顶部 Tab", shot_name)
                except Exception as exc:  # noqa: BLE001
                    records.append({"page": f"课堂 · {label}", "route": f"/classroom?tab={key}",
                                    "error": str(exc)[:300], "url": page.url,
                                    "screenshot": shot(page, shot_name)})
                    log(f"[FAIL] classroom tab {label}: {exc}")

            # ---------- 7. 导航/用户名汇总 ----------
            try:
                nav_all = page.eval_on_selector_all(
                    ".sidebar .nav-item",
                    "els => els.map(e => ({text: (e.innerText||'').replace(/\\s+/g,' ').trim(), "
                    "tip: e.getAttribute('data-tip')||'', cls: e.className}))")
                user_area = page.eval_on_selector_all(
                    ".sidebar .sb-user, .sidebar .user, .sidebar .profile, .sidebar .sb-footer, .topbar .user, header .user",
                    "els => els.map(e => (e.innerText||'').replace(/\\s+/g,' ').trim())")
                top_right = page.eval_on_selector_all(
                    ".topbar-r, .topbar-right, header .right, .v4-top-right",
                    "els => els.map(e => (e.innerText||'').replace(/\\s+/g,' ').trim())")
            except Exception:  # noqa: BLE001
                nav_all, user_area, top_right = [], [], []
            records.append({"page": "导航/用户名汇总", "nav_all": nav_all, "user_area": user_area,
                            "top_right": top_right,
                            "console_errors": CONSOLE[:20], "bad_net": BAD_NET[:20]})
            log("[summary] nav:", nav_all)

            rec_api.flush("inventory-end")
            rec_api.save("steps-pages.json")
            page.wait_for_timeout(300)
            ctx.close()
    finally:
        if browser is not None:
            try:
                browser.close()
            except Exception:  # noqa: BLE001
                pass
        RESULT.write_text(json.dumps({"captured_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
                                      "base": BASE, "login_result": login_result,
                                      "records": records}, ensure_ascii=False, indent=2), encoding="utf-8")
        LOG.close()
    print("saved", RESULT, flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())