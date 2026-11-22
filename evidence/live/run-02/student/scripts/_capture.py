# -*- coding: utf-8 -*-
"""API 网络取证 recorder（run-02 student）。

- 只记录本机回环（127.0.0.1/localhost 任何端口）的业务 API / SSE / 对象存储直传；
- 请求体/响应体各保留前 4096 字节；超过时整份落盘到 bodies/；
- Authorization / Cookie / Set-Cookie / *token* / 预签名签名参数 全部 <redacted>；
- 只对「浏览器侧已确认 requestfinished」的响应取 body，避免 SSE 长连接把采集阻塞。
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

SENSITIVE_HEADERS = {
    "authorization", "cookie", "set-cookie", "x-token", "x-auth-token",
    "x-api-key", "x-access-token", "proxy-authorization",
}
SENSITIVE_QUERY = {"x-amz-signature", "x-amz-credential", "x-amz-security-token",
                   "x-amz-date", "signature", "token", "access_token", "sig"}
BODY_LIMIT = 4096


def redact_headers(headers: dict) -> dict:
    out = {}
    for k, v in (headers or {}).items():
        lk = k.lower()
        if lk in SENSITIVE_HEADERS or "token" in lk or "secret" in lk or "authorization" in lk:
            out[k] = "<redacted>"
        else:
            out[k] = v
    return out


def redact_url(url: str) -> str:
    try:
        p = urlsplit(url)
        q = []
        for k, v in parse_qsl(p.query, keep_blank_values=True):
            q.append((k, "<redacted>" if k.lower() in SENSITIVE_QUERY else v))
        return urlunsplit((p.scheme, p.netloc, p.path, urlencode(q), p.fragment))
    except Exception:  # noqa: BLE001
        return url


def slug(url: str, method: str) -> str:
    p = urlsplit(url)
    s = f"{method.lower()}-{p.netloc.replace(':', '_')}{p.path}".strip("/")
    s = re.sub(r"[^0-9A-Za-z_.-]+", "-", s)
    return s[:80] or "req"


class Recorder:
    def __init__(self, out_dir: Path, step_name: str = "run"):
        self.out_dir = Path(out_dir)
        self.bodies = self.out_dir / "bodies"
        self.bodies.mkdir(parents=True, exist_ok=True)
        self.step_name = step_name
        self.entries: list[dict] = []
        self.pending: list[tuple[dict, object, object]] = []
        self.finished = set()
        self.failed = set()
        self.seq = 0
        self.step_prefix = ""
        self.page = None

    def attach(self, page, step_prefix: str = ""):
        self.page = page
        self.step_prefix = step_prefix

        def keep(resp):
            try:
                req = resp.request
                url = resp.url
                path = urlsplit(url).path
                if req.resource_type in ("script", "stylesheet", "image", "font", "media"):
                    return None
                if path.startswith(("/src/", "/@vite", "/node_modules/")):
                    return None
                if not (url.startswith("http://127.0.0.1") or url.startswith("http://localhost")
                        or "/api/" in url):
                    return None
                return req
            except Exception:  # noqa: BLE001
                return None

        def on_response(resp):
            try:
                req = keep(resp)
                if req is None:
                    return
                self.seq += 1
                e = {
                    "seq": self.seq,
                    "step": self.step_prefix,
                    "ts": time.strftime("%H:%M:%S"),
                    "method": req.method,
                    "url": redact_url(resp.url),
                    "resource_type": req.resource_type,
                    "status": None,
                    "resp_mime": "",
                    "req_headers": redact_headers(dict(req.headers)),
                    "req_body_head": "",
                    "req_body_note": "",
                    "req_body_path": "",
                    "resp_body_head": "",
                    "resp_body_path": "",
                    "resp_body_bytes": None,
                    "note": "",
                }
                self.entries.append(e)
                self.pending.append((e, resp, req))
            except Exception:  # noqa: BLE001
                pass

        def on_finished(req):
            try:
                self.finished.add(id(req))
            except Exception:  # noqa: BLE001
                pass

        def on_failed(req):
            try:
                self.failed.add(id(req))
                self.finished.add(id(req))
            except Exception:  # noqa: BLE001
                pass

        page.on("response", on_response)
        page.on("requestfinished", on_finished)
        page.on("requestfailed", on_failed)

    def flush(self, note: str = ""):
        """取已结束响应的 body；仍未结束（长连接 SSE/轮询）的留待下次。"""
        still = []
        for e, resp, req in self.pending:
            rid = id(req)
            if rid not in self.finished:
                e["note"] = (e.get("note", "") + " stream-open").strip()
                still.append((e, resp, req))
                continue
            try:
                e["status"] = resp.status
                e["resp_mime"] = (resp.headers or {}).get("content-type", "")
                pd = None
                try:
                    pd = req.post_data
                except Exception:  # noqa: BLE001
                    pd = None
                if pd:
                    e["req_body_head"] = pd[:BODY_LIMIT]
                    if len(pd) > BODY_LIMIT:
                        fn = f"{e['seq']:03d}-{slug(e['url'], e['method'])}-req.json"
                        (self.bodies / fn).write_text(pd, encoding="utf-8")
                        e["req_body_path"] = f"bodies/{fn}"
                        e["req_body_note"] = f"request body {len(pd)} bytes (full saved)"
                if rid in self.failed:
                    e["note"] = (e.get("note", "") + " request-failed").strip()
                else:
                    body = None
                    try:
                        body = resp.body()
                    except Exception as exc:  # noqa: BLE001
                        e["note"] = (e.get("note", "") + f" body-unavailable:{str(exc)[:80]}").strip()
                    if body:
                        e["resp_body_bytes"] = len(body)
                        content_type = e["resp_mime"].lower()
                        is_text = any(t in content_type for t in ("json", "text", "event-stream", "xml", "javascript"))
                        text = ""
                        if is_text:
                            text = body.decode("utf-8", errors="replace")
                        else:
                            e["note"] = (e.get("note", "") + " binary-body").strip()
                        if text:
                            e["resp_body_head"] = text[:BODY_LIMIT]
                            if len(text) > BODY_LIMIT:
                                if "json" in content_type:
                                    ext = ".json"
                                elif "event-stream" in content_type:
                                    ext = ".sse.txt"
                                else:
                                    ext = ".txt"
                                fn = f"{e['seq']:03d}-{slug(e['url'], e['method'])}{ext}"
                                (self.bodies / fn).write_text(text, encoding="utf-8")
                                e["resp_body_path"] = f"bodies/{fn}"
                if note:
                    e["note"] = (e.get("note", "") + " " + note).strip()
            except Exception as exc:  # noqa: BLE001
                e["note"] = (e.get("note", "") + f" flush-error:{str(exc)[:100]}").strip()
        self.pending = still

    def settle_remaining(self):
        """会话结束时把仍未结束的响应标注清楚（不阻塞取 body）。"""
        for e, _resp, _req in self.pending:
            e["note"] = (e.get("note", "") + " stream-never-finished; body-not-captured").strip()
        self.pending = []

    def save(self, filename: str = "steps.json"):
        path = self.out_dir / filename
        path.write_text(json.dumps({"captured_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
                                    "entries": self.entries}, ensure_ascii=False, indent=2),
                        encoding="utf-8")
        return str(path)