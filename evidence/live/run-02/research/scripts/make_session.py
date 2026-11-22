# -*- coding: utf-8 -*-
"""Create a reusable researcher browser session (storage_state) through the real login UI.

Used to avoid SMS rate limiting when several probe scripts run back-to-back.
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, r"D:\zxsy-math-arena-showcase\.work\scripts")
sys.path.insert(0, str(Path(__file__).parent))

from playwright.sync_api import sync_playwright  # noqa: E402

import harness as H  # noqa: E402
from live_login import RESEARCH, login  # noqa: E402

STATE = Path(__file__).parent / "session-researcher.json"
BASE = "http://127.0.0.1:5176"


def attempt(page) -> dict:
    return login(page, RESEARCH, wait_after=5000)


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1672, "height": 941}, device_scale_factor=1, locale="zh-CN")
        page = ctx.new_page()
        ok = False
        last = ""
        for i in range(4):
            try:
                info = attempt(page)
                last = json.dumps(info, ensure_ascii=False)[:400]
                if "/login" not in page.url:
                    ok = True
                    break
                H.log(f"login landed on login page, retry {i+1}")
            except Exception as exc:  # noqa: BLE001
                last = str(exc)[:500]
                H.log(f"login attempt {i+1} failed: {last[:200]}")
                H.shot(page, f"14-login-retry-{i+1}.png", full=False)
                # SMS rate limit -> wait a bit longer each time
                page.wait_for_timeout(65000)
                H.log("waited 65s for SMS rate limit")
                continue
        if ok:
            STATE.write_text(json.dumps(ctx.storage_state(), ensure_ascii=False, indent=1), encoding="utf-8")
            H.log("session saved: " + str(STATE) + " url=" + page.url)
            H.shot(page, "14-session-landing.png", full=False)
        else:
            H.log("LOGIN FAILED: " + last[:300])
        H.finalize({"login_ok": ok, "last": last, "url": page.url}, "api/steps-session.json")
        ctx.close()
        browser.close()
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())