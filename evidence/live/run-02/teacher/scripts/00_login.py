# -*- coding: utf-8 -*-
"""run-02 教师端 · 脚本 00：稳健登录一次并把登录态存到 api/auth.json（供后续脚本复用，避免反复发验证码）。

流程与任务书一致：/login → #preferred-role=teacher → #auth-phone=13800001002 → 获取验证码
→ 页面显示的随机 6 位演示验证码 → 6 位验证码输入框 → 安全登录。
"""
from __future__ import annotations

import json
import re
import sys
import time

from playwright.sync_api import sync_playwright

sys.path.insert(0, r"D:\zxsy-math-arena-showcase\evidence\live\run-02\teacher\scripts")
from r02lib import API, SHOTS, URL, VIEWPORT  # noqa: E402


def send_code(page) -> dict:
    with page.expect_response(lambda r: "/auth/challenges/sms" in r.url, timeout=30000) as ri:
        page.get_by_role("button", name="获取验证码").click()
    r = ri.value
    body = ""
    try:
        body = r.text()[:800]
    except Exception:  # noqa: BLE001
        pass
    return {"status": r.status, "body": body}


def main() -> int:
    out = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport=VIEWPORT, device_scale_factor=1, locale="zh-CN", accept_downloads=True)
        page = ctx.new_page()
        page.goto(URL + "/login", wait_until="load")
        page.wait_for_timeout(1500)
        page.select_option("#preferred-role", "teacher")
        page.fill("#auth-phone", "13800001002")
        page.wait_for_timeout(300)
        r1 = send_code(page)
        out["first_send"] = r1
        if r1["status"] == 429:
            m = re.search(r'"retry_after"\s*:\s*(\d+)', r1["body"])
            wait = (int(m.group(1)) if m else 60) + 3
            print(f"[rate-limited] wait {wait}s", flush=True)
            page.wait_for_timeout(wait * 1000)
            out["second_send"] = send_code(page)
        page.wait_for_timeout(2200)
        body_txt = page.inner_text("body")
        m = re.search(r"验证码[^0-9]{0,20}(\d{6})", body_txt) or re.search(r"\b(\d{6})\b", body_txt)
        out["page_after_send"] = body_txt[-900:]
        if not m:
            out["error"] = "no demo code on page"
            (API / "login.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
            page.screenshot(path=str(SHOTS / "00a-login-failed.png"))
            print(json.dumps(out, ensure_ascii=False)[:1500], flush=True)
            return 2
        code = m.group(1)
        out["demo_code"] = code
        page.get_by_placeholder("6 位验证码").fill(code)
        page.screenshot(path=str(SHOTS / "00a-login-code.png"))
        page.get_by_role("button", name="安全登录").click()
        page.wait_for_url(lambda u: "/login" not in u, timeout=30000)
        page.wait_for_timeout(2500)
        out["url"] = page.url
        out["title"] = page.title()
        out["text"] = page.inner_text("body")[:800]
        ctx.storage_state(path=str(API / "auth.json"))
        page.screenshot(path=str(SHOTS / "00b-login-landed.png"))
        (API / "login.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps({k: out[k] for k in ("url", "title", "demo_code")}, ensure_ascii=False), flush=True)
        ctx.close()
        browser.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())