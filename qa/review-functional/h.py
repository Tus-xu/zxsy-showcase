# -*- coding: utf-8 -*-
"""Shared harness for functional acceptance runs (offline, file://)."""
import json, os, shutil, sys, time
sys.stdout.reconfigure(encoding="utf-8")
from playwright.sync_api import sync_playwright

BASE = r"D:\zxsy-math-arena-showcase\qa\review-functional"
FRESH = open(BASE + r"\_fresh_dir.txt", encoding="utf-8-sig").read().strip()
ENTRY = FRESH + r"\开始演示.html"
SHOTS = os.path.join(BASE, "shots")
PROFILE = os.path.join(BASE, "_profile")
RESULT = os.path.join(BASE, "_results")
EXPORTS = os.path.join(BASE, "exports")
for d in (SHOTS, RESULT, EXPORTS):
    os.makedirs(d, exist_ok=True)


def fresh_profile():
    if os.path.isdir(PROFILE):
        shutil.rmtree(PROFILE, ignore_errors=True)
    os.makedirs(PROFILE, exist_ok=True)


class Session:
    def __init__(self, name, width=1672, height=941, fresh=False, headless=True):
        self.name = name
        self.width, self.height = width, height
        self.log = []
        self.checks = []
        self.net = []
        self.ws = []
        self.console_errors = []
        self.page_errors = []
        self.shot_n = 0
        self._pw = sync_playwright().start()
        if fresh:
            fresh_profile()
        self.ctx = self._pw.chromium.launch_persistent_context(
            PROFILE, headless=headless, viewport={"width": width, "height": height},
            device_scale_factor=1, args=["--allow-file-access-from-files"])
        def route_handler(route):
            u = route.request.url
            if u.startswith(("http://", "https://", "ws://", "wss://")):
                self.net.append({"url": u, "type": route.request.resource_type, "method": route.request.method})
                route.abort()
            else:
                route.continue_()
        self.ctx.route("**/*", route_handler)
        self.ctx.on("websocket", lambda ws: self.ws.append({"url": ws.url}))
        self.page = self.ctx.pages[0] if self.ctx.pages else self.ctx.new_page()
        self.page.on("console", self._on_console)
        self.page.on("pageerror", lambda e: self.page_errors.append(str(e)))
        self.page.set_default_timeout(12000)

    # ---------- capture ----------
    def _on_console(self, m):
        d = {"type": m.type, "text": m.text, "loc": str(m.location)}
        if m.type in ("error", "warning", "assert"):
            self.console_errors.append(d)

    def step(self, title, shot=True):
        self.log.append({"t": time.strftime("%H:%M:%S"), "step": title, "url": self.page.url})
        if shot:
            self.take(title)

    def take(self, label):
        self.shot_n += 1
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in label)[:60]
        p = os.path.join(SHOTS, f"{self.name}-{self.shot_n:02d}-{safe}.png")
        self.page.screenshot(path=p, full_page=False)
        return p

    def body(self):
        return self.page.inner_text("body")

    def check(self, cond, label, detail=""):
        ok = bool(cond)
        self.checks.append({"label": label, "ok": ok, "detail": detail})
        if not ok:
            self.take("FAIL-" + label[:40])
            print(f"  [FAIL] {label} :: {detail}")
        else:
            print(f"  [ok] {label}")
        return ok

    def check_in(self, needle, label=""):
        b = self.body()
        return self.check(needle in b, label or f"text:{needle[:30]}", "" if needle in b else f"missing {needle!r}")

    def check_not_in(self, needle, label=""):
        b = self.body()
        return self.check(needle not in b, label or f"no-text:{needle[:30]}", "" if needle not in b else f"unexpected {needle!r}")

    # ---------- actions ----------
    def click_text(self, text, exact=False, nth=0, timeout=12000):
        loc = self.page.get_by_text(text, exact=exact)
        loc.nth(nth).click(timeout=timeout)
        self.page.wait_for_timeout(350)

    def click_btn(self, text, exact=False, nth=0, timeout=12000):
        loc = self.page.get_by_role("button", name=text, exact=exact)
        loc.nth(nth).click(timeout=timeout)
        self.page.wait_for_timeout(350)

    def click_sel(self, selector, nth=0, timeout=12000):
        self.page.locator(selector).nth(nth).click(timeout=timeout)
        self.page.wait_for_timeout(350)

    def goto(self, hash_=""):
        self.page.goto("file:///" + ENTRY.replace("\\", "/") + hash_)
        self.page.wait_for_timeout(1200)

    def reload(self, wait=2200):
        self.page.reload()
        self.page.wait_for_timeout(wait)

    def hash(self):
        return self.page.url.split("#")[-1] if "#" in self.page.url else ""

    def host_open(self):
        self.page.keyboard.press("Control+Shift+H")
        self.page.wait_for_timeout(800)

    def host_close(self):
        self.page.keyboard.press("Escape")
        self.page.wait_for_timeout(500)

    def switch_role(self, role_name):
        try:
            visible = self.page.get_by_role("button", name=role_name, exact=True).first.is_visible()
        except Exception:
            visible = False
        if not visible:
            self.host_open()
        self.page.get_by_role("button", name=role_name, exact=True).click()
        self.page.wait_for_timeout(1500)

    def upload(self, filename):
        with self.page.expect_file_chooser() as fc:
            self.page.get_by_role("button", name="选择题目图片").first.click()
        fc.value.set_files(FRESH + "\\素材\\" + filename)
        self.page.wait_for_timeout(3000)

    def send(self, txt, wait=2200):
        inp = self.page.locator("input.guide__input")
        inp.fill(txt)
        self.page.locator("button:has-text('发送')").last.click()
        self.page.wait_for_timeout(wait)

    def dump_ui(self, label, path):
        d = {"label": label, "url": self.page.url, "body": self.body(),
             "clickable": self.page.evaluate("""() => {
                const out=[];
                document.querySelectorAll('button,a,[role=button],input,textarea,select,[class*=card],[class*=btn],[class*=item],[class*=tab]').forEach(el=>{
                  const r=el.getBoundingClientRect();
                  if(r.width===0||r.height===0) return;
                  const t=(el.innerText||el.value||el.placeholder||'').trim().replace(/\\s+/g,' ').slice(0,120);
                  if(!t) return;
                  out.push({tag:el.tagName, cls:(el.className||'').toString().slice(0,90), text:t, x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height)});
                });
                return out.slice(0,400);
             }""")}
        with open(path, "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, indent=1)
        return d

    def summary(self):
        passed = sum(1 for c in self.checks if c["ok"])
        failed = [c for c in self.checks if not c["ok"]]
        return {"name": self.name, "checks": len(self.checks), "passed": passed,
                "failed": failed, "net": self.net, "ws": self.ws,
                "console_errors": self.console_errors, "page_errors": self.page_errors,
                "log": self.log, "shots": self.shot_n}

    def finish(self):
        res = self.summary()
        with open(os.path.join(RESULT, self.name + ".json"), "w", encoding="utf-8") as f:
            json.dump(res, f, ensure_ascii=False, indent=1)
        self.ctx.close()
        self._pw.stop()
        print(f"[{self.name}] checks={res['checks']} pass={res['passed']} fail={len(res['failed'])} "
              f"net={len(self.net)} ws={len(self.ws)} console_errors={len(self.console_errors)} page_errors={len(self.page_errors)} shots={self.shot_n}")
        return res
