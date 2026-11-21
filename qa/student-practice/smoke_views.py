"""学生端 练习/错题/知识库/资源/我的 —— 首轮冒烟：加载五页、收集控制台错误、截初始图。"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:5201"
OUT = Path(__file__).parent / "smoke"
OUT.mkdir(parents=True, exist_ok=True)

PAGES = [
    ("practice", "/#/student/practice"),
    ("errors", "/#/student/errors"),
    ("library", "/#/student/library"),
    ("resources", "/#/student/resources"),
    ("me-report", "/#/student/me"),
]


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1672, "height": 941}, device_scale_factor=1)
        page = ctx.new_page()
        page.on("console", lambda m: errors.append(f"[console:{m.type}] {m.text}") if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(f"[pageerror] {e}"))
        page.goto(BASE + "/#/login", wait_until="networkidle")
        page.wait_for_timeout(600)
        page.screenshot(path=str(OUT / "00-login.png"))

        for name, route in PAGES:
            page.goto(BASE + route, wait_until="networkidle")
            page.wait_for_timeout(700)
            page.screenshot(path=str(OUT / f"{name}.png"))
            print(f"shot {name}: {page.title()}")

        browser.close()

    print("\n--- console/page errors ---")
    if errors:
        for e in errors:
            print(e)
        sys.exit(1)
    print("none")


if __name__ == "__main__":
    main()
