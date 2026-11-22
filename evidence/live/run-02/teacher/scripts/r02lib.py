# -*- coding: utf-8 -*-
"""run-02 教师端实测采证库（仅写 evidence/live/run-02/teacher/**）。

提供：
- Rec：步骤记录 + 截图 + UI 快照 + 网络取证（Authorization/Cookie 脱敏）
- login_teacher：复用 .work/scripts/live_login.py 的真实登录流程
"""
from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

BASE = Path(r"D:\zxsy-math-arena-showcase")
ROOT = BASE / "evidence" / "live" / "run-02" / "teacher"
SHOTS = ROOT / "shots"
ARTIFACTS = ROOT / "artifacts"
API = ROOT / "api"
BODIES = API / "bodies"
for _p in (SHOTS, ARTIFACTS, API, BODIES):
    _p.mkdir(parents=True, exist_ok=True)

sys.path.insert(0, str(BASE / ".work" / "scripts"))
from live_login import TEACHER, login  # noqa: E402

URL = "http://127.0.0.1:5176"
VIEWPORT = {"width": 1672, "height": 941}
MASK = "***MASKED***"
SECRET_HEADERS = {"authorization", "cookie", "set-cookie", "x-auth-token", "x-csrf-token", "proxy-authorization"}


def mask_headers(h: dict) -> dict:
    out = {}
    for k, v in (h or {}).items():
        out[k] = MASK if k.lower() in SECRET_HEADERS else v
    return out


def mask_body(text: str) -> str:
    text = re.sub(r'("(?:access_token|refresh_token|id_token|token|password|otp|csrf_token|secret)"\s*:\s*")([^"]{4,})(")',
                  r"\1***MASKED***\3", text)
    return text


def _safe(name: str) -> str:
    return re.sub(r"[^0-9A-Za-z_.-]+", "_", name)[:120]


def clean_text(t: str) -> str:
    t = t.replace("\r", "")
    lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in t.split("\n")]
    return "\n".join([ln for ln in lines if ln])


class Rec:
    def __init__(self, page, tag: str):
        self.page = page
        self.tag = tag
        self.steps: list[dict] = []
        self.calls: list[dict] = []
        self.pending = []  # responses waiting to be flushed
        self.console: list[str] = []
        self.page_errors: list[str] = []
        self.fail_requests: list[dict] = []
        self._net_seq = 0
        self._step_seq = 0
        page.on("response", lambda r: self.pending.append(r))
        page.on("console", lambda m: self.console.append(f"{m.type}: {m.text}"[:300]) if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: self.page_errors.append(str(e)[:300]))
        page.on("requestfailed", lambda r: self.fail_requests.append({"url": r.url, "method": r.method, "failure": str(r.failure)[:200]}))

    # ---------- network ----------
    def flush_net(self) -> list[int]:
        ids = []
        pending, self.pending = self.pending, []
        for r in pending:
            try:
                req = r.request
                url = r.url
                if "/api/" not in url:
                    continue
                self._net_seq += 1
                seq = self._net_seq
                ids.append(seq)
                ctype = (r.headers or {}).get("content-type", "")
                entry = {
                    "seq": seq, "method": req.method, "url": url, "status": r.status,
                    "resource_type": r.request.resource_type, "content_type": ctype,
                    "request_headers": mask_headers(req.headers),
                    "request_body": mask_body((req.post_data or ""))[:4096],
                    "response_headers": mask_headers(r.headers),
                    "body_file": None, "body_bytes": None, "body_preview": "",
                }
                # SSE / binary 不取 body（避免阻塞或落盘巨大）
                skip = ("text/event-stream" in ctype) or ctype.startswith(("image/", "font/", "video/"))
                if not skip:
                    try:
                        body = r.body()
                        entry["body_bytes"] = len(body)
                        raw = body[:4096]
                        try:
                            txt = raw.decode("utf-8", errors="replace")
                        except Exception:
                            txt = repr(raw)
                        txt = mask_body(txt)
                        entry["body_preview"] = txt
                        fn = f"{seq:03d}_{req.method}_{_safe(url.split('/api/')[-1].split('?')[0].replace('/', '_'))[:70]}.txt".strip("_")
                        (BODIES / fn).write_text(txt, encoding="utf-8")
                        entry["body_file"] = f"api/bodies/{fn}"
                    except Exception as exc:  # noqa: BLE001
                        entry["body_error"] = str(exc)[:200]
                self.calls.append(entry)
            except Exception as exc:  # noqa: BLE001
                self.calls.append({"error": str(exc)[:200]})
        return ids

    # ---------- ui ----------
    def ui(self) -> dict:
        page = self.page
        data = {}
        try:
            data["url"] = page.url
            data["title"] = page.title()
        except Exception:
            pass
        js = {
            "buttons": "els => els.map(e => ({t:(e.innerText||'').replace(/\\s+/g,' ').trim(), aria:e.getAttribute('aria-label')||'', disabled: !!e.disabled, cls:String(e.className).slice(0,60)})).filter(x=>x.t||x.aria).slice(0,80)",
            "inputs": "els => els.map(e => ({type:e.type, ph:e.placeholder||'', aria:e.getAttribute('aria-label')||'', value:String(e.value||'').slice(0,60), disabled:!!e.disabled})).slice(0,50)",
            "selects": "els => els.map(e => ({aria:e.getAttribute('aria-label')||'', value:e.value, opts:[...e.options].map(o=>o.text).slice(0,20)})).slice(0,20)",
            "links": "els => els.map(e => ({t:(e.innerText||'').replace(/\\s+/g,' ').trim(), h:e.getAttribute('href')})).filter(x=>x.t||x.h).slice(0,40)",
            "headings": "els => els.map(e => (e.innerText||'').replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,20)",
            "nav": "els => els.map(e => (e.innerText||'').replace(/\\s+/g,' ').trim()).filter(Boolean)",
            "badges": "els => els.map(e => (e.innerText||'').trim()).filter(Boolean).slice(0,30)",
        }
        for key, expr in js.items():
            try:
                data[key] = page.eval_on_selector_all(
                    {"buttons": "button", "inputs": "input", "selects": "select", "links": "a",
                     "headings": "h1,h2,h3", "nav": ".tv3-nav__item", "badges": "[class*=badge], [class*=count], [class*=num]"}[key], expr)
            except Exception as exc:  # noqa: BLE001
                data[key] = f"ERR:{exc}"[:100]
        try:
            data["text"] = clean_text(page.inner_text("body"))[:12000]
        except Exception:
            data["text"] = ""
        return data

    def snap(self, name: str, action: str = "", note: str = "", full_page: bool = False) -> dict:
        self._step_seq += 1
        self.page.wait_for_timeout(300)
        ids = self.flush_net()
        shot = SHOTS / f"{name}.png"
        try:
            self.page.screenshot(path=str(shot), full_page=full_page)
            shot_ok = True
        except Exception as exc:  # noqa: BLE001
            shot_ok = f"FAIL:{exc}"
        ui = self.ui()
        step = {
            "n": self._step_seq, "name": name, "action": action, "note": note,
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "shot": f"shots/{name}.png" if shot_ok is True else str(shot_ok),
            "net": ids, **ui,
        }
        (SHOTS / f"{name}.json").write_text(json.dumps(ui, ensure_ascii=False, indent=2), encoding="utf-8")
        self.steps.append(step)
        print(f"[snap {self._step_seq:02d}] {name} -> {self.page.url} ({len(ids)} api)", flush=True)
        return step

    def save(self, extra: dict | None = None, filename: str = "steps.json") -> Path:
        self.flush_net()
        payload = {
            "role": "teacher", "tag": self.tag,
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "steps": self.steps, "api_calls": self.calls,
            "console": self.console[-80:], "page_errors": self.page_errors[-40:],
            "request_failed": self.fail_requests[-40:],
        }
        if extra:
            payload.update(extra)
        out = API / filename
        out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[save] steps={len(self.steps)} api={len(self.calls)} -> {out}", flush=True)
        return out


def login_teacher(page, rec: Rec | None = None) -> dict:
    info = login(page, TEACHER, wait_after=2500)
    if rec:
        rec.snap("00-login-landed", action="登录：/login → teacher 角色 → 手机号 13800001002 → 页面随机演示验证码 → 安全登录",
                 note=f"demo_code={info.get('code')}")
    return info


def open_context(browser, fresh: bool = False):
    """开一个新的浏览器上下文（每次都真实走 UI 登录；不依赖可能已轮换失效的 storage_state）。"""
    return browser.new_context(viewport=VIEWPORT, device_scale_factor=1, locale="zh-CN", accept_downloads=True)


def _send_code(page):
    with page.expect_response(lambda r: "/auth/challenges/sms" in r.url, timeout=30000) as ri:
        page.get_by_role("button", name="获取验证码").click()
    r = ri.value
    body = ""
    try:
        body = r.text()[:800]
    except Exception:  # noqa: BLE001
        pass
    return {"status": r.status, "body": body}


def fresh_login(page, rec=None) -> dict:
    """真实 UI 登录（teacher/13800001002/页面演示验证码）；遇到 60s 频控按 retry_after 等待后重试一次。"""
    page.goto(URL + "/login", wait_until="load")
    page.wait_for_timeout(1200)
    page.select_option("#preferred-role", "teacher")
    page.fill("#auth-phone", "13800001002")
    page.wait_for_timeout(300)
    first = _send_code(page)
    second = None
    if first["status"] == 429:
        m = re.search(r'"retry_after"\s*:\s*(\d+)', first["body"])
        wait_s = (int(m.group(1)) if m else 60) + 2
        print(f"[login] rate-limited, wait {wait_s}s", flush=True)
        page.wait_for_timeout(wait_s * 1000)
        second = _send_code(page)
    page.wait_for_timeout(2200)
    txt = page.inner_text("body")
    m = re.search(r"演示环境验证码[：:]\s*(\d{6})", txt) or re.search(r"验证码[^0-9]{0,20}(\d{6})", txt)
    if not m:
        raise RuntimeError("登录页未显示演示验证码：" + txt[-600:])
    code = m.group(1)
    page.get_by_placeholder("6 位验证码").fill(code)
    page.get_by_role("button", name="安全登录").click()
    page.wait_for_url(lambda u: "/login" not in u, timeout=30000)
    page.wait_for_timeout(2200)
    info = {"first_send": first["status"], "second_send": second["status"] if second else None, "demo_code": code,
            "url": page.url, "title": page.title(), "has_teacher": "张老师" in page.inner_text("body")}
    try:
        log_path = API / "login-log.json"
        log = json.loads(log_path.read_text(encoding="utf-8")) if log_path.exists() else []
        log.append({"at": time.strftime("%Y-%m-%dT%H:%M:%S%z"), **info})
        log_path.write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass
    if rec:
        rec.snap("00-login-landed-" + time.strftime("%H%M%S"), action="真实登录（teacher 13800001002 + 演示验证码）",
                 note=json.dumps(info, ensure_ascii=False)[:400])
    return info


def open_download_ctx(page, timeout_ms: int = 60000):
    return page.expect_download(timeout=timeout_ms)


def save_download(download, prefix: str) -> dict:
    suggested = download.suggested_filename
    path = ARTIFACTS / f"{prefix}_{suggested}"
    # 防止覆盖：若已存在加序号
    i = 1
    while path.exists():
        path = ARTIFACTS / f"{prefix}_{i}_{suggested}"
        i += 1
    download.save_as(str(path))
    size = path.stat().st_size if path.exists() else -1
    return {"filename": suggested, "saved_as": str(path.relative_to(ROOT)), "abs_path": str(path), "bytes": size,
            "url": download.url}