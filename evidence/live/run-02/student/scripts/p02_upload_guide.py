# -*- coding: utf-8 -*-
"""run-02 学生端 · 三题真实上传 + 逐轮自适应导学实测（可复跑）。

纪律：
- 只走正常学生 UI：首页「拍一道不会的题」或对话输入条「拍照识题」→ 系统文件选择器 → 原图；
- 每轮只发平台实际要求的下一条输入（选项就点选项、填空/交互就用平台控件或打字回退）；
- 不做任何 API 直调，不预喂答案；每题独立新对话；
- 每次输入/回复成对截图；网络取证由 _capture.Recorder 完成（脱敏）。

用法： python p02_upload_guide.py [ABC] [--case=A]
产出： shots/a-t*/…, api/guide-results.json, api/steps.json, api/bodies/*
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import time
import traceback
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\.work\scripts")
from live_login import STUDENT, read_demo_code  # noqa: E402
from _capture import Recorder  # noqa: E402

BASE = "http://127.0.0.1:5176"
TAG = os.environ.get("RUN_TAG", "a")
PHONE_OVERRIDE = os.environ.get("STUDENT_PHONE_OVERRIDE", "").strip()
STUDENT_PHONE = PHONE_OVERRIDE or STUDENT["phone"]
OUT = Path(r"D:\zxsy-math-arena-showcase\evidence\live\run-02\student")
SHOTS = OUT / "shots"
API = OUT / "api"
DOMDIR = API / "dom"
DOMDIR.mkdir(parents=True, exist_ok=True)
LOG = (OUT / "_p02.log.txt").open("w", encoding="utf-8")
CONSOLE: list[str] = []
BAD_NET: list[dict] = []

PROBLEMS = {
    "A": {
        "file": r"D:\zxsy-math-arena\docs\superpowers\plans\题1.png",
        "entry": "hero",
        "planned": [
            "已知虚轴长是实轴长的 √7 倍，也就是 2b = √7·2a，约掉 2 得 b/a = √7。",
            "离心率 e = c/a，而双曲线里 c² = a² + b²。",
            "所以 c² = a² + 7a² = 8a²，e = c/a = 2√2，选 D。",
        ],
        "problem_text": "若双曲线 C 的虚轴长为实轴长的 √7 倍，则 C 的离心率为（A √2，B 2，C √7，D 2√2）",
        "keywords": ["√7", "b/a", "b =", "b=", "c²", "c^2", "2√2", "离心率", "e =", "e=", "D"],
    },
    "B": {
        "file": r"D:\zxsy-math-arena\docs\superpowers\plans\题2.png",
        "entry": "camera",
        "planned": [
            "正三棱柱里 AA₁⊥底面 ABC，所以 AA₁⊥BC；又 D 是正三角形 ABC 的 BC 中点，所以 AD⊥BC。",
            "BC 垂直于平面 AA₁D 内的两条相交直线 AD、AA₁，所以 BC⊥平面 AA₁D，B 成立。",
            "CC₁∥AA₁，AA₁ 在平面 AA₁D 内，CC₁ 不在平面内，所以 CC₁∥平面 AA₁D，D 也成立。",
            "所以本题选 B、D。",
        ],
        "problem_text": "在正三棱柱 ABC-A₁B₁C₁ 中，D 为 BC 中点，则（A. AD⊥A₁C；B. BC⊥平面 AA₁D；C. AD∥A₁B₁；D. CC₁∥平面 AA₁D）",
        "keywords": ["AD", "BC", "AA₁", "AA1", "平面", "CC₁", "CC1", "B、D", "BD", "B,D"],
    },
    "C": {
        "file": r"D:\zxsy-math-arena\docs\superpowers\plans\题3.png",
        "entry": "camera",
        "planned": [
            "记 A_i 为第 i 号球至少被取出一次，一次不取到它的概率是 4/5，三次都没取到是 (4/5)³ = 64/125。",
            "所以 P(A_i) = 1 - 64/125 = 61/125。",
            "X 是至少取出一次的球的个数，X = A₁+A₂+…+A₅，用指示变量求期望。",
            "E(X) = 5 × 61/125 = 61/25 = 2.44。",
        ],
        "problem_text": "一个箱子里有 5 个球，分别以 1~5 标号，若有放回取三次，记至少取出一次的球的个数 X，则 E(X)=____。",
        "keywords": ["61/125", "4/5", "64/125", "指示", "61/25", "2.44", "5×", "5 *", "E(X)"],
    },
}

SSE_HOOK = r"""
(() => {
  if (window.__SSE_CAPTURE) return;
  window.__SSE_CAPTURE = [];
  const origFetch = window.fetch;
  window.fetch = async function(...args) {
    const resp = await origFetch.apply(this, args);
    try {
      const ct = (resp.headers && resp.headers.get('content-type')) || '';
      if (ct.includes('text/event-stream') && resp.body) {
        resp.body.__sseUrl = resp.url || ((typeof args[0] === 'string') ? args[0] : '');
      }
    } catch (e) {}
    return resp;
  };
  const origGetReader = ReadableStream.prototype.getReader;
  ReadableStream.prototype.getReader = function(...a) {
    const reader = origGetReader.apply(this, a);
    if (!this.__sseUrl) return reader;
    const rec = {url: this.__sseUrl, text: '', done: false, ts: Date.now()};
    window.__SSE_CAPTURE.push(rec);
    const dec = new TextDecoder('utf-8');
    return {
      read: async () => {
        const r = await reader.read();
        if (r.done) { rec.text += dec.decode(); rec.done = true; }
        else { rec.text += dec.decode(r.value, {stream: true}); }
        return r;
      },
      cancel: (...x) => reader.cancel(...x),
      releaseLock: () => reader.releaseLock(),
      closed: reader.closed
    };
  };
  window.__SSE_TAKE_NEW = (start) => window.__SSE_CAPTURE.slice(start).map(
    r => ({url: r.url, text: r.text, done: r.done, error: r.error || null}));
})();
"""


class CdpSseRecorder:
    """用 Chromium CDP Network 抓取 SSE 原文（不改页面运行时）。

    Network.responseReceived 记录 requestId/URL（content-type=text/event-stream）；
    流结束后用 Network.getResponseBody 取该请求完整响应体（含 event:/data: 行）。
    """

    def __init__(self, ctx, page):
        self.entries: list[dict] = []
        self.by_id: dict[str, dict] = {}
        self.finished: set[str] = set()
        self.failed: set[str] = set()
        self.session = ctx.new_cdp_session(page)
        try:
            self.session.send("Network.enable")
        except Exception:  # noqa: BLE001
            pass
        self.session.on("Network.responseReceived", self._on_response)
        self.session.on("Network.loadingFinished", self._on_finished)
        self.session.on("Network.loadingFailed", self._on_failed)

    def _on_response(self, params):
        try:
            resp = params.get("response") or {}
            url = resp.get("url") or ""
            headers = resp.get("headers") or {}
            ct = ""
            for k, v in headers.items():
                if k.lower() == "content-type":
                    ct = str(v)
                    break
            if "text/event-stream" not in ct.lower():
                return
            rec = {"id": params.get("requestId"), "url": url, "mime": ct,
                   "text": "", "done": False, "error": ""}
            self.entries.append(rec)
            self.by_id[rec["id"]] = rec
        except Exception:  # noqa: BLE001
            pass

    def _on_finished(self, params):
        try:
            self.finished.add(params.get("requestId"))
        except Exception:  # noqa: BLE001
            pass

    def _on_failed(self, params):
        try:
            rid = params.get("requestId")
            self.finished.add(rid)
            self.failed.add(rid)
            rec = self.by_id.get(rid)
            if rec:
                rec["error"] = str(params.get("errorText") or "loadingFailed")
        except Exception:  # noqa: BLE001
            pass

    def fetch_bodies(self) -> None:
        import base64
        for rec in self.entries:
            if rec.get("done"):
                continue
            try:
                r = self.session.send("Network.getResponseBody", {"requestId": rec["id"]})
                text = r.get("body") or ""
                if r.get("base64Encoded"):
                    text = base64.b64decode(text).decode("utf-8", errors="replace")
                rec["text"] = text
                rec["done"] = True
            except Exception as exc:  # noqa: BLE001
                rec["error"] = str(exc)[:120]

    def take_new(self, start: int) -> list[dict]:
        return [{"url": r["url"], "bytes": len((r.get("text") or "").encode("utf-8")),
                 "text": r.get("text") or "", "done": r.get("done"),
                 "error": r.get("error") or None} for r in self.entries[start:]]


def take_sse(rec: CdpSseRecorder, page, start: int, case: str, turn_idx: int) -> list[dict]:
    """把本轮新增 SSE 原文落盘，返回文件指针列表（最多等 ~6s 让流结束可读）。"""
    got: list[dict] = []
    for _ in range(12):
        rec.fetch_bodies()
        got = [g for g in rec.take_new(start) if g.get("text")]
        if got:
            break
        page.wait_for_timeout(500)
    out = []
    for i, g in enumerate(got):
        text = g.get("text") or ""
        item = {"url": g.get("url"), "bytes": g.get("bytes"),
                "done": g.get("done"), "file": None}
        if text:
            fn = (f"{case.lower()}-turn{turn_idx}-{i}.sse.txt" if TAG == "a"
                  else f"{TAG}-{case.lower()}-turn{turn_idx}-{i}.sse.txt")
            (API / "bodies" / fn).write_text(text, encoding="utf-8")
            item["file"] = f"bodies/{fn}"
        out.append(item)
    return out


def log(*a):
    s = " ".join(str(x) for x in a)
    LOG.write(s + "\n")
    LOG.flush()
    print(s.encode("ascii", "replace").decode("ascii"), flush=True)


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip()


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest().upper()


def shot(page, name: str, full: bool = False) -> str:
    try:
        page.mouse.move(8, 8)
    except Exception:  # noqa: BLE001
        pass
    page.wait_for_timeout(350)
    page.screenshot(path=str(SHOTS / name), full_page=full)
    return f"shots/{name}"


# ---------------- 登录 / 会话 ----------------
STATE = Path(r"D:\zxsy-math-arena-showcase\.work\state") / f"run02-student-{TAG}.json"


def do_login(page, ctx) -> dict:
    last = None
    for attempt in range(1, 4):
        try:
            page.goto(BASE + "/login", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(1800)
            page.select_option("#preferred-role", STUDENT["role"])
            page.fill("#auth-phone", STUDENT_PHONE)
            page.get_by_role("button", name="获取验证码").click()
            page.wait_for_timeout(2200)
            note = ""
            try:
                note = page.locator(".demo-note").first.inner_text().strip()
            except Exception:  # noqa: BLE001
                pass
            code = ""
            if note:
                m = re.search(r"(\d{6})", note)
                code = m.group(1) if m else ""
            if not code:
                # 短信发送受限时，若环境提供演示账号密码，则走密码登录（同一演示账号的普通 UI 路径）
                pwd = os.environ.get("DEMO_STUDENT_PASSWORD", "")
                body = page.inner_text("body")
                if pwd and ("过于频繁" in body or "限" in body):
                    page.get_by_role("tab", name="密码登录").click()
                    page.wait_for_timeout(600)
                    pin = page.locator("input[type='password']").first
                    pin.fill(pwd)
                    page.get_by_role("button", name="安全登录").click()
                    page.wait_for_timeout(2200)
                    try:
                        page.wait_for_url(lambda u: "/login" not in u, timeout=30000)
                    except Exception:  # noqa: BLE001
                        pass
                    page.wait_for_timeout(3000)
                    if "/login" in page.url:
                        raise RuntimeError("密码登录后仍在 /login")
                    note = "密码登录（短信限频时回退）"
                    code = ""
                    STATE.parent.mkdir(parents=True, exist_ok=True)
                    ctx.storage_state(path=str(STATE))
                    return {"demo_code": None, "demo_note": note, "url": page.url,
                            "attempt": attempt, "login_mode": "password_fallback"}
                code = read_demo_code(page)
            page.get_by_placeholder("6 位验证码").fill(code)
            shot(page, "s01b-login-code.png")
            page.get_by_role("button", name="安全登录").click()
            page.wait_for_timeout(2200)
            try:
                page.wait_for_url(lambda u: "/login" not in u, timeout=30000)
            except Exception:  # noqa: BLE001
                pass
            page.wait_for_timeout(3000)
            if "/login" in page.url:
                raise RuntimeError("登录后仍在 /login")
            STATE.parent.mkdir(parents=True, exist_ok=True)
            ctx.storage_state(path=str(STATE))
            return {"demo_code": code, "demo_note": note, "url": page.url, "attempt": attempt,
                    "login_mode": "sms_demo_code"}
        except Exception as exc:  # noqa: BLE001
            last = str(exc)[:300]
            log(f"[login-retry] attempt {attempt} failed: {last}")
            page.wait_for_timeout(2500)
    raise RuntimeError("登录失败：" + str(last))


def new_conversation(page) -> dict:
    page.goto(BASE + "/dialog", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(2500)
    before = page.url
    try:
        page.locator("button.sb-new").first.click(timeout=8000)
        page.wait_for_timeout(3200)
    except Exception as exc:  # noqa: BLE001
        log("[new-conv] click fail:", str(exc)[:120])
    return {"url_before": before, "url": page.url,
            "title": page.locator(".dialog-header .ttl").first.inner_text() if page.locator(".dialog-header .ttl").count() else ""}


# ---------------- 同屏状态采集 ----------------
STATE_JS = r"""
() => {
  const vis = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const txt = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}; };
  const q = (s) => document.querySelector(s);
  const qa = (s) => Array.from(document.querySelectorAll(s)).filter(vis);
  const att = qa('.att-card').map(e => ({
    cls: e.className,
    text: txt(e),
    name: txt(e.querySelector('.att-name') || {}),
    status: txt(e.querySelector('.att-status') || {}),
    engine: txt(e.querySelector('.att-engine') || {}),
    thumb: !!(e.querySelector('.att-thumb')),
    thumbSrc: (e.querySelector('.att-thumb') || {}).src || '',
    rect: rect(e)
  }));
  const send = q('.ci-send');
  const stop = q('.ci-stop');
  const ta = q('textarea.ci-ta');
  const body = txt(document.body);
  const hexes = (body.match(/\b[0-9a-fA-F]{64}\b/g) || []).slice(0, 3);
  const stepBadges = qa('.dialog-badges .step').map(txt).filter(Boolean);
  const msgs = qa('.dialog-messages .msg-row').map(e => ({cls: e.className, text: txt(e).slice(0, 220)}));
  const navItems = qa('.sidebar .nav-item').map(e => ({text: txt(e), tip: e.getAttribute('data-tip')||'', cls: e.className, hasBadge: !!e.querySelector('.badge, .corner, .dot, .count')}));
  const convs = qa('.sb-list-item, .conv-item, .sb-conv, .conversation-item').map(e => ({text: txt(e).slice(0, 80), cls: e.className}));
  const userBubble = qa('.msg-row.user .user-bubble, .msg-row.user .bubble').slice(-1).map(e => ({text: txt(e).slice(0, 500), html: e.outerHTML.slice(0, 1500)}));
  return {
    url: location.pathname + location.search,
    headerTitle: txt(q('.dialog-header .ttl') || {}),
    stepBadges,
    aiCount: document.querySelectorAll('.msg-row.ai').length,
    userCount: document.querySelectorAll('.msg-row.user').length,
    attachments: att,
    attachRowText: txt(q('.ci-attach-row') || {}),
    sendButton: send ? {disabled: send.disabled, text: txt(send), title: send.getAttribute('title')||'', cls: send.className} : null,
    stopButton: stop ? {text: txt(stop)} : null,
    textarea: ta ? {placeholder: ta.getAttribute('placeholder')||'', value: ta.value, rect: rect(ta)} : null,
    charCount: txt(q('.ci-count') || {}),
    thinkingOn: !!q('.ci-thinking-on'),
    bodyText: body.slice(0, 5200),
    sha256Visible: hexes,
    sha256Mentioned: /SHA-?256/i.test(body),
    questionLabel: (body.match(/第\s*\d+\s*题/g) || []).slice(0, 5),
    sidebarText: txt(q('.sidebar') || {}).slice(0, 1200),
    sidebarRect: rect(q('.sidebar')),
    mainRect: rect(q('.main') || q('.dialog-main')),
    chatRect: rect(q('.dialog-main') || {}),
    messagesRect: rect(q('.dialog-messages') || {}),
    inputRect: rect(q('.chat-input') || {}),
    navItems, convs, lastUserBubble: userBubble,
    suggestions: qa('.sugg button, .suggestion-chip').map(txt).filter(Boolean).slice(0, 12),
    toasts: qa('.toast, .toast-item').map(txt).filter(Boolean).slice(0, 5),
    consoleErrors: []
  };
}
"""


def capture_state(page) -> dict:
    st = page.evaluate(STATE_JS)
    return st


def compact_state(page) -> dict:
    st = capture_state(page)
    keys = ("url", "headerTitle", "stepBadges", "sendButton", "stopButton", "attachments",
            "attachRowText", "lastUserBubble", "charCount", "textarea", "toasts", "questionLabel")
    return {k: st.get(k) for k in keys}


def save_dom(page, tag: str):
    try:
        data = {
            "chat_input": page.eval_on_selector(".chat-input", "e => e.outerHTML") if page.locator(".chat-input").count() else "",
            "att_cards": page.eval_on_selector_all(".att-card", "els => els.map(e => e.outerHTML)"),
            "dialog_header": page.eval_on_selector(".dialog-header", "e => e.outerHTML") if page.locator(".dialog-header").count() else "",
            "sidebar_head": (page.eval_on_selector(".sidebar", "e => e.outerHTML") or "")[:20000],
        }
    except Exception as exc:  # noqa: BLE001
        data = {"error": str(exc)[:200]}
    (DOMDIR / f"{tag}.html").write_text(
        "<!doctype html><meta charset='utf-8'><pre>"
        + json.dumps(data, ensure_ascii=False, indent=1).replace("<", "&lt;")
        + "</pre>", encoding="utf-8")
    return f"api/dom/{tag}.html"


# ---------------- 上传 ----------------
def upload_via_picker(page, case: str, path: str, entry_kind: str) -> dict:
    info = {"case": case, "file": path, "size": Path(path).stat().st_size,
            "sha256_original": sha256_file(path), "entry_kind": entry_kind,
            "control_clicked": "", "picker_opened": False}
    try:
        if entry_kind == "hero":
            # 首页空态卡片「拍一道不会的题」：真实点击后由页面触发 input[type=file] 选择器
            ctrl = page.locator(".he-card", has_text="拍一道不会的题").first
            info["control_clicked"] = "首页空态卡片「📷 拍一道不会的题」（.he-card）"
            info["entry_total_cards"] = page.locator(".he-card").count()
            with page.expect_file_chooser(timeout=15000) as fc:
                ctrl.click(timeout=8000)
        else:
            ctrl = page.locator("button[title='拍照识题']").first
            info["control_clicked"] = "对话输入条相机图标按钮「拍照识题」（button[title='拍照识题']）"
            with page.expect_file_chooser(timeout=15000) as fc:
                ctrl.click(timeout=8000)
        chooser = fc.value
        info["picker_opened"] = True
        info["picker_is_multiple"] = chooser.is_multiple()
        chooser.set_files(path)
        info["set_files_ok"] = True
        # 上传早期状态（hashing/uploading/parsing）
        page.wait_for_timeout(600)
        early = capture_state(page)
        info["early_attach"] = early["attachments"]
        info["early_shot"] = shot(page, f"{TAG}t{case.lower()}-uploading.png")
        # 等 parsed（或 failed）
        parsed, failed = False, False
        for _ in range(120):
            page.wait_for_timeout(1500)
            if page.locator(".att-card.ready").count() > 0:
                parsed = True
                break
            if page.locator(".att-card.failed").count() > 0:
                failed = True
                break
        if failed:
            try:
                info["failed_text"] = norm(page.locator(".att-card.failed").first.inner_text())
            except Exception:  # noqa: BLE001
                info["failed_text"] = ""
            # 上传频率超限（42901）：等冷却后点卡片「重试」按钮（真实 UI），再等一次
            if "频繁" in info["failed_text"] or "频率" in info["failed_text"]:
                info["cooldown_retry"] = True
                page.wait_for_timeout(65000)
                try:
                    page.locator(".att-card.failed .att-act.retry").first.click(timeout=8000)
                except Exception:  # noqa: BLE001
                    pass
                for _ in range(80):
                    page.wait_for_timeout(1500)
                    if page.locator(".att-card.ready").count() > 0:
                        parsed, failed = True, False
                        break
                    if page.locator(".att-card.failed").count() > 0:
                        failed = True
                        break
        info["parsed"] = parsed
        info["failed"] = failed
        page.wait_for_timeout(600)
        state = capture_state(page)
        info["state"] = state
        info["dom_snapshot"] = save_dom(page, f"{TAG}t{case.lower()}-upload")
        info["upload_shot"] = shot(page, f"{TAG}t{case.lower()}-upload.png")
    except Exception as exc:  # noqa: BLE001
        info["error"] = str(exc)[:500]
        try:
            info["error_shot"] = shot(page, f"{TAG}t{case.lower()}-upload-error.png")
            info["state"] = capture_state(page)
        except Exception:  # noqa: BLE001
            pass
    return info


# ---------------- 回复等待/解析 ----------------
def ai_count(page) -> int:
    try:
        return page.locator(".msg-row.ai").count()
    except Exception:  # noqa: BLE001
        return 0


def user_count(page) -> int:
    try:
        return page.locator(".msg-row.user").count()
    except Exception:  # noqa: BLE001
        return 0


def streaming(page) -> bool:
    try:
        if page.locator("button.ci-stop").count() > 0:
            return True
        badge = page.locator(".dialog-badges .step").first
        if badge.count():
            btxt = (badge.inner_text() or "").strip()
            # DialogView 仅在 chat.streaming 时把步徽标写成「引导中…」；
            # 正常的引导进度徽标（如「第 1 步 / 共 2 步 · 引导中 · 提示档 …」）不是流式态。
            if btxt.startswith("引导中…") or btxt.startswith("引导中..."):
                return True
        if page.locator(".imd-caret").count() > 0:
            return True
    except Exception:  # noqa: BLE001
        pass
    return False


def wait_reply(page, prev_ai: int, timeout_s: int = 200) -> dict:
    started = time.time()
    seen = False
    stable = 0
    last_count = prev_ai
    while time.time() - started < timeout_s:
        c = ai_count(page)
        if c > prev_ai:
            seen = True
        if streaming(page):
            stable = 0
        else:
            if c == last_count and seen:
                stable += 1
            last_count = c
            if seen and stable >= 3:
                page.wait_for_timeout(1500)
                return {"ok": True, "elapsed_s": round(time.time() - started, 1),
                        "ai_count": ai_count(page), "timed_out": False}
        page.wait_for_timeout(1100)
    return {"ok": False, "elapsed_s": round(time.time() - started, 1),
            "ai_count": ai_count(page), "timed_out": True,
            "last_text": last_ai_text(page)}


def last_ai_text(page) -> str:
    try:
        loc = page.locator(".msg-row.ai .ai-bubble")
        n = loc.count()
        return loc.nth(n - 1).inner_text() if n else ""
    except Exception:  # noqa: BLE001
        return ""


NEW_ROWS_JS = r"""
(startAiIdx) => {
  const vis = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const txt = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  const rows = Array.from(document.querySelectorAll('.msg-row.ai'));
  const out = [];
  rows.slice(startAiIdx).forEach((row, i) => {
    const abs = startAiIdx + i;
    const cards = [];
    row.querySelectorAll('.soc-tag, .soc-progress, .soc-choices, .soc-ix, .soc-needprob, .confirm-bar, .action-card, .sc-shell, .socratic-complete, .sp-top, .soc-tier-shift, .soc-detour').forEach(c => {
      if (!vis(c)) return;
      const btns = Array.from(c.querySelectorAll('button')).filter(vis).map(b => ({
        text: txt(b).slice(0, 120), cls: b.className, disabled: !!b.disabled,
        title: b.getAttribute('title') || '', skip: /si-skip/.test(b.className)
      }));
      const inps = Array.from(c.querySelectorAll('input, textarea')).filter(vis).map(x => ({
        cls: x.className, placeholder: x.getAttribute('placeholder') || '', type: x.getAttribute('type') || '',
        value: x.value || '', disabled: !!x.disabled
      }));
      cards.push({
        cls: c.className, text: txt(c).slice(0, 800),
        form: c.getAttribute('data-soc-ix-form') || '',
        ixId: c.getAttribute('data-soc-ix-id') || '',
        choiceStep: c.getAttribute('data-soc-choice-step') || '',
        used: /used/.test(c.className + ' ' + (c.closest('.msg-row') ? c.closest('.msg-row').className : '')),
        buttons: btns, inputs: inps
      });
    });
    out.push({ abs, text: txt(row).slice(0, 1600), cards,
      complete: !!row.querySelector('.sc-title, [class*=complete]') && /引导完成|完成/.test(txt(row)),
      allButtons: Array.from(row.querySelectorAll('button')).filter(vis).map(b => ({text: txt(b).slice(0,100), cls: b.className, disabled: !!b.disabled, title: b.getAttribute('title')||''}))
    });
  });
  return out;
}
"""


def read_new_rows(page, prev_ai: int) -> list[dict]:
    try:
        return page.evaluate(NEW_ROWS_JS, prev_ai)
    except Exception as exc:  # noqa: BLE001
        return [{"error": str(exc)[:200]}]


def reply_text(rows: list[dict]) -> str:
    parts = []
    for r in rows:
        if r.get("text"):
            parts.append(r["text"])
    # 去重相邻重复
    out = []
    for p in parts:
        if not out or out[-1] != p:
            out.append(p)
    return "\n".join(out)


def toast_texts(page) -> list[str]:
    try:
        return [x for x in page.eval_on_selector_all(".toast, .toast-item", "els => els.map(e => (e.innerText||'').trim())") if x]
    except Exception:  # noqa: BLE001
        return []


def choose_option(opts: list[dict], keywords: list[str]) -> int:
    """按题目关键词优先挑一个“下一步思路”选项；无匹配选第一项。"""
    for kw in keywords:
        for i, o in enumerate(opts):
            if kw and kw.lower() in (o.get("text") or "").lower():
                return i
    return 0


def act_on_reply(page, rows: list[dict], case: str, keywords: list[str], planned_idx: int, turn: int = 0):
    """平台若给了控件，就按控件要求作答；否则返回 None 表示应发下一条文字。"""
    tag = f"{TAG}t{case.lower()}-turn{turn}.png" if turn else f"{TAG}t{case.lower()}-action.png"
    # 1) 防泄题确认条：学生选「我再想想」
    for r in rows:
        for c in r.get("cards", []):
            if "confirm-bar" in (c.get("cls") or "") and any("我再想想" in b["text"] for b in c.get("buttons", [])):
                sp = shot(page, tag)
                page.get_by_role("button", name="我再想想").first.click(timeout=8000)
                return {"type": "confirm", "text": "我再想想", "shot": sp,
                        "detail": "防泄题二次确认条 → 点「我再想想」"}
    # 2) 每步思路选项
    for r in rows:
        for c in r.get("cards", []):
            cls = c.get("cls") or ""
            if "soc-choices" in cls and "used" not in cls:
                opts = [b for b in c.get("buttons", []) if not b.get("disabled") and "soc-choice" in (b.get("cls") or "")]
                if not opts:
                    continue
                sel = choose_option(opts, keywords)
                loc = page.locator(".msg-row.ai").nth(r["abs"]).locator(".soc-choice").nth(sel)
                label = norm(loc.inner_text())
                sp = shot(page, tag)
                loc.click(timeout=8000)
                return {"type": "choice", "text": label, "shot": sp,
                        "detail": f"点击第 {sel + 1} 个思路选项（共 {len(opts)} 个）: {label}"}
    # 3) 免打字交互卡
    for r in rows:
        for c in r.get("cards", []):
            if "soc-ix" not in (c.get("cls") or ""):
                continue
            row_loc = page.locator(".msg-row.ai").nth(r["abs"])
            form = c.get("form") or "unknown"
            # 已经作答过的卡不重复点
            if page.locator(".msg-row.ai").nth(r["abs"]).locator(".si-usedmark").count():
                continue
            # 3-pre-A. 有专属结构化输入（expr_input）：直接填式子再点「写好了」
            if form == "expr_input":
                inp = row_loc.locator("input[data-soc-expr-input]")
                if inp.count() and inp.first.is_visible():
                    val = answer_expression(case, planned_idx)
                    inp.first.fill(val)
                    page.wait_for_timeout(250)
                    sp = shot(page, tag)
                    sub = row_loc.locator(".ix-submit:enabled")
                    if sub.count():
                        sub.first.click(timeout=8000)
                        return {"type": "form_expr", "text": val, "shot": sp,
                                "detail": f"交互卡 form=expr_input → 输入式子「{val}」并点「写好了」"}
            # 3-pre-B. 填空补全（cloze）：逐空点开选项面板选一个，再点「填好了」
            if form == "cloze":
                blanks = row_loc.locator(".ix-cz-blank")
                for bi in range(blanks.count()):
                    try:
                        blanks.nth(bi).click(timeout=4000)
                        page.wait_for_timeout(250)
                        opts = row_loc.locator(".ix-cz-opt")
                        if opts.count():
                            texts = [norm(opts.nth(j).inner_text()) for j in range(opts.count())]
                            pick = 0
                            for kw in keywords:
                                hit = next((j for j, t in enumerate(texts) if kw and kw.lower() in t.lower()), None)
                                if hit is not None:
                                    pick = hit
                                    break
                            opts.nth(pick).click(timeout=4000)
                    except Exception:  # noqa: BLE001
                        pass
                page.wait_for_timeout(250)
                sp = shot(page, tag)
                sub = row_loc.locator(".ix-submit:enabled")
                if sub.count():
                    sub.first.click(timeout=8000)
                    return {"type": "form_cloze", "text": "", "shot": sp,
                            "detail": f"交互卡 form=cloze → 逐空点选填 {blanks.count()} 空并点「填好了」"}
            # 3a. 优先用平台提供的打字回退入口（可及性通道，真实 UI）
            fb = row_loc.locator(".si-fallback input.si-input")
            if fb.count() and fb.first.is_visible():
                ans = planned_text_for_form(case, planned_idx, form)
                fb.first.fill(ans)
                page.wait_for_timeout(250)
                sp = shot(page, tag)
                row_loc.locator(".si-fallback button.si-send").first.click(timeout=8000)
                return {"type": "form_text", "text": ans, "shot": sp,
                        "detail": f"交互卡 form={form} → 卡底打字回退输入并点「改用打字」"}
            # 3b. 跳过
            sk = row_loc.locator(".si-skip")
            if sk.count() and sk.first.is_visible():
                label = norm(sk.first.inner_text())
                sp = shot(page, tag)
                sk.first.click(timeout=8000)
                return {"type": "form_skip", "text": label, "shot": sp, "detail": f"交互卡 form={form} → 点跳过「{label}」"}
            # 3c. 优先点「写好了/填好了」这类提交按钮（若其已可用）；否则退回第一个可用按钮
            subs = row_loc.locator(".ix-submit:enabled, .si-send:enabled")
            if subs.count():
                b = subs.first
                label = norm(b.inner_text()) or ""
                sp = shot(page, tag)
                b.click(timeout=8000)
                return {"type": "form_submit", "text": label, "shot": sp,
                        "detail": f"交互卡 form={form} → 点提交按钮「{label}」"}
            btns = row_loc.locator(".soc-ix button:enabled")
            if btns.count():
                b = btns.first
                label = norm(b.inner_text()) or b.get_attribute("title") or ""
                sp = shot(page, tag)
                b.click(timeout=8000)
                return {"type": "form_click", "text": label, "shot": sp,
                        "detail": f"交互卡 form={form} → 点按钮「{label}」"}
    # 4) 无题门禁卡：让平台知道题目已给（打字回退）
    for r in rows:
        for c in r.get("cards", []):
            if "soc-needprob" in (c.get("cls") or ""):
                return {"type": "need_problem", "text": "", "detail": "出现「无题不引导」门禁卡，下一轮以文字补题"}
    # 5) 引导完成卡
    for r in rows:
        if r.get("complete") or any("sc-title" in (c.get("cls") or "") or "complete" in (c.get("cls") or "") for c in r.get("cards", [])):
            return {"type": "complete", "text": "", "detail": "检测到引导完成卡（socratic_complete）"}
    # 6) 通用引导按钮（继续/下一步/开始引导等）
    continue_words = ["继续", "下一步", "开始引导", "开始", "再试一次", "继续引导", "进入下一步", "我知道了"]
    for r in rows:
        for b in r.get("allButtons", []):
            if b.get("disabled"):
                continue
            t = b.get("text") or ""
            if any(w in t for w in continue_words) and len(t) <= 24:
                sp = shot(page, tag)
                page.locator(".msg-row.ai").nth(r["abs"]).get_by_role("button", name=t, exact=False).first.click(timeout=8000)
                return {"type": "button", "text": t, "shot": sp, "detail": f"点引导按钮「{t}」"}
    return None


def planned_text_for_form(case: str, planned_idx: int, form: str) -> str:
    planned = PROBLEMS[case]["planned"]
    if not planned:
        return "我按这个思路继续。"
    return planned[min(planned_idx, len(planned) - 1)]


def answer_expression(case: str, planned_idx: int) -> str:
    """结构化式子输入（expr_input）用的学生答案；按题与轮次给。"""
    table = {
        "A": ["c^2=a^2+7a^2", "e=c/a=2√2", "e=2√2"],
        "B": ["AD⊥BC", "BC⊥平面AA1D", "CC1∥平面AA1D", "B、D"],
        "C": ["(4/5)^3=64/125", "1-64/125=61/125", "E(X)=5*61/125", "61/25"],
    }
    arr = table.get(case) or ["x"]
    return arr[min(planned_idx, len(arr) - 1)]


def send_text(page, text: str) -> dict:
    ta = page.locator("textarea.ci-ta").first
    ta.fill(text)
    page.wait_for_timeout(350)
    page.locator("button.ci-send").first.click(timeout=8000)
    page.wait_for_timeout(400)
    return {"input": text}


def send_empty(page) -> dict:
    page.locator("button.ci-send").first.click(timeout=8000)
    page.wait_for_timeout(400)
    return {"input": ""}


# ---------------- 单题会话 ----------------
def sse_len(page) -> int:
    try:
        return int(page.evaluate("() => window.__SSE_CAPTURE ? window.__SSE_CAPTURE.length : -1"))
    except Exception:  # noqa: BLE001
        return -1


def run_case(page, rec_api: Recorder, sse_rec: CdpSseRecorder, case: str) -> dict:
    p = PROBLEMS[case]
    result = {"case": case, "problem_file": p["file"], "turns": [], "started_at": time.strftime("%H:%M:%S")}
    log(f"===== case {case} =====")
    conv = new_conversation(page)
    result["conversation_new"] = conv
    log("[conv]", conv)

    # 入口截图（上传前控件）
    entry_shot = shot(page, f"{TAG}t{case.lower()}-entry.png")
    result["entry_shot"] = entry_shot

    rec_api.step_prefix = f"T{case}-upload"
    up = upload_via_picker(page, case, p["file"], p["entry"])
    result["upload"] = {k: v for k, v in up.items() if k != "state"}
    result["upload_state"] = up.get("state")
    log("[upload]", json.dumps({k: up.get(k) for k in ("parsed", "failed", "error", "control_clicked")},
                               ensure_ascii=False))
    if not up.get("parsed"):
        result["stopped"] = "upload_not_parsed"
        result["final_state"] = capture_state(page)
        result["final_shot"] = shot(page, f"{TAG}t{case.lower()}-final.png", full=True)
        return result

    # ---------- 首轮：只发图（平台默认指令） ----------
    rec_api.step_prefix = f"T{case}-send-image"
    prev_ai = ai_count(page)
    prev_user = user_count(page)
    pre_send_state = capture_state(page)
    result["pre_send_state"] = {
        "sendButton": pre_send_state.get("sendButton"),
        "attachRowText": pre_send_state.get("attachRowText"),
        "attachments": pre_send_state.get("attachments"),
        "stepBadges": pre_send_state.get("stepBadges"),
        "charCount": pre_send_state.get("charCount"),
        "suggestions": pre_send_state.get("suggestions"),
    }
    result["turns"].append({
        "turn": 0, "kind": "image-only", "input": "（不输入文字，仅点「发送」；前端自动补默认指令「请分析我上传的文件」）",
        "shot_input": shot(page, f"{TAG}t{case.lower()}-upload.png"),
    })
    sse0 = len(sse_rec.entries)
    send_empty(page)
    page.wait_for_timeout(500)
    result["turns"][0]["shot_sending"] = shot(page, f"{TAG}t{case.lower()}-sending0.png")
    wait = wait_reply(page, prev_ai)
    page.wait_for_timeout(600)
    rows = read_new_rows(page, prev_ai)
    result["turns"][0].update({
        "wait": wait, "reply": reply_text(rows)[:6000], "cards": summarize_cards(rows),
        "shot_reply": shot(page, f"{TAG}t{case.lower()}-reply1.png"),
        "url": page.url, "toasts": toast_texts(page),
        "state_after": compact_state(page),
        "sse": take_sse(sse_rec, page, sse0, case, 0),
    })
    rec_api.flush(f"T{case} image-only reply")
    log("[turn0]", json.dumps({"ok": wait["ok"], "elapsed": wait["elapsed_s"],
                               "reply": reply_text(rows)[:200]}, ensure_ascii=False))

    planned_i = 0
    blocked = None
    last_reply = reply_text(rows)
    case_started = time.time()
    for turn in range(1, 9):
        if result["turns"][-1].get("stopped"):
            break
        if time.time() - case_started > 780:
            blocked = "case_time_budget_13min"
            result["turns"][-1]["stopped"] = blocked
            break
        # 平台最后一句是否已是收束
        if detect_terminal(last_reply, rows):
            result["turns"][-1]["terminal_detected"] = True
            break
        # 决定动作
        rec_api.step_prefix = f"T{case}-turn{turn}"
        prev_ai = ai_count(page)
        s_start = len(sse_rec.entries)
        act = act_on_reply(page, rows, case, p["keywords"], planned_i, turn)
        turn_rec = {"turn": turn, "kind": act["type"] if act else "text"}
        if act:
            turn_rec["input"] = act.get("text") or act.get("detail") or ""
        if act and act.get("shot"):
            turn_rec["shot_input"] = act["shot"]
        if act and act["type"] == "complete":
            result["turns"][-1]["stopped"] = "socratic_complete_card"
            turn_rec["note"] = act["detail"]
            result["turns"].append(turn_rec)
            break
        if act and act["type"] == "need_problem":
            act = None  # 平台要求补题：以文字补题（真实学生行为）
            planned_i = max(planned_i, 0)
            text = "题目是：" + p["problem_text"]
            turn_rec.update({"kind": "text", "note": "平台出现「把题目给我」门禁/丢题迹象，学生以文字补题"})
        elif act:
            turn_rec["detail"] = act["detail"]
            text = None
            if act["type"] == "form_text":
                planned_i = min(planned_i + 1, len(p["planned"]) - 1)
        elif needs_problem_marker(last_reply) and not result.get("problem_restated"):
            # 平台原话要求补题（如「我还没看到题目」「把题目给我」）：按平台要求以文字补题
            result["problem_restated"] = True
            text = "题目是：" + p["problem_text"]
            turn_rec.update({"kind": "text_restate_problem",
                             "note": "平台回复称未看到题目/要求补题，学生按平台要求以文字补题"})
        else:
            planned_i = min(planned_i, len(p["planned"]) - 1)
            text = p["planned"][planned_i]
            planned_i += 1
        # 输入前截图
        if text is not None:
            page.wait_for_timeout(300)
            if page.locator("textarea.ci-ta").count():
                page.locator("textarea.ci-ta").first.fill(text)
                page.wait_for_timeout(300)
            turn_rec["shot_input"] = shot(page, f"{TAG}t{case.lower()}-turn{turn}.png")
            turn_rec["input"] = text
            send_text(page, text)
        else:
            page.wait_for_timeout(300)
            turn_rec.setdefault("shot_input", shot(page, f"{TAG}t{case.lower()}-turn{turn}.png"))
        page.wait_for_timeout(500)
        wait = wait_reply(page, prev_ai)
        page.wait_for_timeout(700)
        rows = read_new_rows(page, prev_ai)
        last_reply = reply_text(rows)
        turn_rec.update({
            "wait": wait, "reply": last_reply[:6000], "cards": summarize_cards(rows),
            "shot_reply": shot(page, f"{TAG}t{case.lower()}-reply{turn + 1}.png"),
            "url": page.url, "toasts": toast_texts(page),
            "state_after": compact_state(page),
            "sse": take_sse(sse_rec, page, s_start, case, turn),
        })
        result["turns"].append(turn_rec)
        rec_api.flush(f"T{case} turn{turn}")
        log(f"[turn{turn}]", json.dumps({"kind": turn_rec["kind"], "ok": wait["ok"],
                                        "elapsed": wait["elapsed_s"], "reply": last_reply[:220]},
                                       ensure_ascii=False))
        if not wait["ok"]:
            blocked = "reply_timeout"
            result["turns"][-1]["stopped"] = blocked
            break
        # 连续两轮回复几乎相同且没有新控件 → 卡住
        if turn >= 2:
            prior = result["turns"][-2].get("reply") or ""
            if norm(prior)[:120] == norm(last_reply)[:120] and not any(
                    c.get("buttons") for r in rows for c in r.get("cards", [])):
                blocked = "no_progress_repeat"
                result["turns"][-1]["stopped"] = blocked
                break

    result["final_state"] = capture_state(page)
    result["final_shot"] = shot(page, f"{TAG}t{case.lower()}-final.png", full=True)
    result["blocked"] = blocked
    result["conv_url"] = page.url
    result["conv_title"] = page.locator(".dialog-header .ttl").first.inner_text() if page.locator(".dialog-header .ttl").count() else ""
    rec_api.step_prefix = f"T{case}-final"
    rec_api.flush(f"T{case} final")
    return result


def summarize_cards(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        for c in r.get("cards", []):
            out.append({"cls": (c.get("cls") or "")[:120], "form": c.get("form"),
                        "text": norm(c.get("text") or "")[:300],
                        "buttons": [b.get("text") for b in c.get("buttons", [])][:8]})
    return out


def needs_problem_marker(text: str) -> bool:
    pats = ["我还没看到题目", "把题目给我", "需要先有一道题", "还没看到题目"]
    return any(p in (text or "") for p in pats)


def detect_terminal(text: str, rows: list[dict]) -> bool:
    pats = ["本次引导完成", "引导完成", "引导结束", "恭喜你", "最终答案", "答案：", "答案为",
            "独立完成", "你已经掌握", "本题结束", "引导到这里"]
    if any(p in (text or "") for p in pats):
        return True
    for r in rows:
        if r.get("complete"):
            return True
        for c in r.get("cards", []):
            if "complete" in (c.get("cls") or ""):
                return True
    return False


def persistence_check(page, case: str) -> dict:
    pre = capture_state(page)
    before_rows = pre.get("aiCount")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_timeout(5000)
    post = capture_state(page)
    return {
        "case": case,
        "before": {"url": pre.get("url"), "aiCount": before_rows, "userCount": pre.get("userCount"),
                   "headerTitle": pre.get("headerTitle"), "stepBadges": pre.get("stepBadges")},
        "after": {"url": post.get("url"), "aiCount": post.get("aiCount"), "userCount": post.get("userCount"),
                  "headerTitle": post.get("headerTitle"), "stepBadges": post.get("stepBadges"),
                  "bodyText": (post.get("bodyText") or "")[:2000],
                  "attachments": post.get("attachments"), "sidebarText": (post.get("sidebarText") or "")[:600]},
        "shot": shot(page, f"{TAG}t{case.lower()}-refresh.png", full=True),
        "messages_preserved": post.get("aiCount", 0) >= before_rows,
    }


def main() -> int:
    raw = "".join(sys.argv[1:]).upper()
    order = "".join(c for c in "ABC" if c in raw) or "ABC"
    results_name = (f"guide-results-{TAG}-{order}.json" if TAG != "a"
                    else ("guide-results.json" if order == "ABC" else f"guide-results-{order}.json"))
    results = {"started_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "cases": {}}
    rec_api = Recorder(API, step_name="guide")
    browser = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="msedge", headless=True,
                                       args=["--disable-gpu", "--disable-dev-shm-usage"])
            ctx_kwargs = dict(viewport={"width": 1672, "height": 941},
                              device_scale_factor=1, locale="zh-CN")
            ctx = browser.new_context(**ctx_kwargs)
            page = ctx.new_page()
            rec_api.attach(page, "login")
            page.on("console", lambda m: CONSOLE.append(f"{m.type}: {m.text[:240]}") if m.type == "error" else None)
            page.on("pageerror", lambda e: CONSOLE.append("pageerror: " + str(e)[:240]))
            page.on("response", lambda r: BAD_NET.append({"url": r.url, "status": r.status})
                    if "/api/" in r.url and r.status >= 400 else None)
            page.goto(BASE + "/login", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(1500)
            login = do_login(page, ctx)
            sse_rec = CdpSseRecorder(ctx, page)
            results["login"] = login
            log("[login]", login.get("url"))
            for case in order:
                try:
                    results["cases"][case] = run_case(page, rec_api, sse_rec, case)
                except Exception as exc:  # noqa: BLE001
                    results["cases"][case] = {"case": case, "error": str(exc)[:800],
                                              "traceback": traceback.format_exc()[:2500]}
                    try:
                        shot(page, f"{TAG}t{case.lower()}-error.png")
                    except Exception:  # noqa: BLE001
                        pass
                    log(f"[case {case} ERROR]", str(exc)[:300])
                # 每题之后做一次刷新持久化检查（A 与 C 必做；B 也做）
                if results["cases"].get(case, {}).get("upload", {}).get("parsed"):
                    try:
                        results.setdefault("persistence", {})[case] = persistence_check(page, case)
                        log("[persistence]", json.dumps(results["persistence"][case]["after"], ensure_ascii=False)[:300])
                    except Exception as exc:  # noqa: BLE001
                        results.setdefault("persistence", {})[case] = {"error": str(exc)[:300]}
                time.sleep(4)
            results["console_errors"] = CONSOLE[:40]
            results["bad_net"] = BAD_NET[:40]
            rec_api.flush("end")
            rec_api.settle_remaining()
            rec_api.save("steps.json" if TAG == "a" else f"steps-{TAG}.json")
            ctx.close()
    finally:
        if browser is not None:
            try:
                browser.close()
            except Exception:  # noqa: BLE001
                pass
        results["finished_at"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
        (API / results_name).write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
        LOG.close()
    log("saved", API / results_name)
    print("saved " + results_name, flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
