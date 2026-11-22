# -*- coding: utf-8 -*-
"""Shared session helper: reuse the saved researcher storage_state (real login session),
falling back to the real login UI only when the session has expired.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, r"D:\zxsy-math-arena-showcase\.work\scripts")
sys.path.insert(0, str(Path(__file__).parent))

from playwright.sync_api import sync_playwright  # noqa: E402

import harness as H  # noqa: E402
from live_login import RESEARCH, login  # noqa: E402

BASE = "http://127.0.0.1:5176"
STATE = Path(__file__).parent / "session-researcher.json"


def open_page(p, accept_downloads: bool = True):
    browser = p.chromium.launch(headless=True)
    kwargs = dict(viewport={"width": 1672, "height": 941}, device_scale_factor=1,
                  locale="zh-CN", accept_downloads=accept_downloads)
    if STATE.exists():
        kwargs["storage_state"] = str(STATE)
    ctx = browser.new_context(**kwargs)
    page = ctx.new_page()
    H.attach(page, ctx)
    st = H.start_step("session", "复用已登录的 researcher 浏览器会话（storage_state）")
    try:
        page.goto(BASE + "/research-workspace", wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(4500)
        if "/login" in page.url:
            H.log("session expired -> real login UI fallback")
            login(page, RESEARCH, wait_after=4500)
            page.wait_for_timeout(1000)
        st["result"] = {"url": page.url, "title": page.title()}
        H.log("session ok: " + page.url + " / " + page.title())
    except Exception as exc:  # noqa: BLE001
        st["error"] = str(exc)[:400]
        H.log("session FAIL " + str(exc)[:200])
    H.end_step(st)
    return browser, ctx, page


def save_state(ctx) -> None:
    try:
        STATE.write_text(json.dumps(ctx.storage_state(), ensure_ascii=False, indent=1), encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass