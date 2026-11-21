"""构建产物验证：vite preview 打开 dist-student-practice，检查 5 个页面非白屏且关键区块存在。"""
import sys

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:5202"
PAGES = [
    ("/student/practice", ".prac-card", "practice"),
    ("/student/errors", ".err-list", "errors"),
    ("/student/library", ".lib-main", "library"),
    ("/student/resources", ".res-grid", "resources"),
    ("/student/me", ".me-tabs", "me"),
]

errors = []
ok = True
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1672, "height": 941}, device_scale_factor=1)
    pg = ctx.new_page()
    pg.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR: {e}"))
    for route, sel, name in PAGES:
        pg.goto(BASE + "/#" + route, wait_until="networkidle")
        pg.wait_for_timeout(700)
        count = pg.locator(sel).count()
        title = pg.locator(".page-title").first.inner_text() if pg.locator(".page-title").count() else "(none)"
        good = count > 0 and "error" not in title.lower()
        ok = ok and good
        print(("PASS " if good else "FAIL ") + name + f" | {title} | {sel}x{count}")
    b.close()

net = "n/a"
print("console errors:", errors if errors else "none")
sys.exit(0 if ok and not errors else 1)
