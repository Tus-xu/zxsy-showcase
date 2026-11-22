# -*- coding: utf-8 -*-
"""Run-02 research-side live evidence harness.

Real UI only: Playwright drives the live frontend at 127.0.0.1:5176.
No direct API calls, no DB/file manipulation, no service restarts.
Captures screenshots, DOM facts, console errors and API traffic (sanitized).
"""
from __future__ import annotations

import json
import re
import time
import traceback
from pathlib import Path
from urllib.parse import urlsplit

BASE = "http://127.0.0.1:5176"
OUT = Path(r"D:\zxsy-math-arena-showcase\evidence\live\run-02\research")
SHOTS = OUT / "shots"
ARTIFACTS = OUT / "artifacts"
API_DIR = OUT / "api"
BODIES = API_DIR / "bodies"

for d in (SHOTS, ARTIFACTS, API_DIR, BODIES):
    d.mkdir(parents=True, exist_ok=True)

SENSITIVE = re.compile(r"(authorization|cookie|set-cookie|x-api-key|token)", re.I)
API_PORTS = {":8000", ":8300", ":8200", ":8201"}
API_PATH_HINTS = ("/api/", "/research-api", "/v1/")

state = {
    "step": "init",
    "steps": [],       # api records
    "console": [],     # console errors / warnings of interest
    "page_errors": [],
    "step_log": [],    # human timeline of actions
    "seq": 0,
    "step_api_start": 0,
}


def now() -> str:
    return time.strftime("%H:%M:%S")


def log(msg: str) -> None:
    print(f"[{now()}] {msg}", flush=True)


def sanitize_headers(headers: dict) -> dict:
    out = {}
    for k, v in headers.items():
        if SENSITIVE.search(k):
            out[k] = "<redacted>"
        else:
            out[k] = v
    return out


def sanitize_body(text: str) -> str:
    if not text:
        return text
    text = re.sub(r"(?i)(bearer\s+)[A-Za-z0-9._\-+/=]+", r"\1<redacted>", text)
    text = re.sub(r"(?i)(\"(?:access_token|refresh_token|token|password|otp|code)\"\s*:\s*\")[^\"]{6,}(\")",
                  r"\1<redacted>\2", text)
    return text


def is_api(url: str) -> bool:
    try:
        p = urlsplit(url)
    except Exception:
        return False
    if p.scheme not in ("http", "https"):
        return False
    port = f":{p.port}" if p.port else ""
    if port in API_PORTS:
        return True
    return any(h in p.path for h in API_PATH_HINTS)


def slug(url: str) -> str:
    p = urlsplit(url)
    s = (p.path or "/").strip("/").replace("/", "_")[:60] or "root"
    return re.sub(r"[^A-Za-z0-9_.\-]", "", s)[:60] or "root"


def next_id() -> int:
    state["seq"] += 1
    return state["seq"]


def attach(page, context) -> None:
    """Wire console + network evidence recording."""

    def on_console(m):
        if m.type in ("error", "warning"):
            txt = (m.text or "")[:600]
            state["console"].append({"t": now(), "step": state["step"], "type": m.type, "text": txt,
                                     "loc": f"{m.location.get('url','')}:{m.location.get('lineNumber','')}"[:400]})
            if m.type == "error":
                log(f"  console.{m.type}: {txt[:160]}")

    def on_pageerror(e):
        state["page_errors"].append({"t": now(), "step": state["step"], "text": str(e)[:600]})
        log(f"  pageerror: {str(e)[:160]}")

    def on_response(resp):
        url = resp.url
        if not is_api(url):
            return
        req = resp.request
        rec = {
            "id": next_id(),
            "step": state["step"],
            "t": now(),
            "method": req.method,
            "url": url,
            "resource_type": req.resource_type,
            "status": None,
            "request_body": None,
            "response_body": None,
            "response_headers": None,
            "request_headers": sanitize_headers(dict(req.headers)),
            "body_file": None,
            "note": "",
        }
        try:
            rec["status"] = resp.status
        except Exception as exc:  # noqa: BLE001
            rec["note"] += f"status_err:{exc};"
        try:
            pd = req.post_data
            if pd:
                rec["request_body"] = sanitize_body(pd[:4096])
        except Exception as exc:  # noqa: BLE001
            rec["note"] += f"req_err:{exc};"
        try:
            rec["response_headers"] = sanitize_headers(dict(resp.headers))
        except Exception:
            rec["response_headers"] = {}
        try:
            txt = resp.text()
            rec["response_body"] = sanitize_body(txt[:4096])
            rec["response_full_len"] = len(txt)
        except Exception as exc:  # noqa: BLE001
            rec["note"] += f"body_err:{str(exc)[:120]};"
        # Binary PDF responses: save the real bytes the browser received (evidence artifact,
        # never re-requested by us) so the produced/rendered PDF can be inspected offline.
        try:
            ctype = (resp.headers or {}).get("content-type", "")
            if "application/pdf" in ctype:
                body = resp.body()
                fn = ARTIFACTS / f"live-{rec['id']:04d}-{slug(url)[:40]}.pdf"
                fn.write_bytes(body)
                rec["pdf_artifact"] = str(fn.relative_to(OUT))
                rec["pdf_bytes"] = len(body)
        except Exception as exc:  # noqa: BLE001
            rec["note"] += f"pdf_save_err:{str(exc)[:120]};"
        # persist a per-call body file
        try:
            fn = BODIES / f"{rec['id']:04d}_{rec['method']}_{slug(url)[:45]}.txt"
            payload = [
                f"# {rec['method']} {url}",
                f"# status={rec['status']} step={rec['step']} t={rec['t']}",
                "",
                "## request headers (sanitized)",
                json.dumps(rec["request_headers"], ensure_ascii=False, indent=1),
                "",
                "## request body (first 4KB, sanitized)",
                rec["request_body"] or "<empty>",
                "",
                "## response headers (sanitized)",
                json.dumps(rec["response_headers"] or {}, ensure_ascii=False, indent=1),
                "",
                "## response body (first 4KB, sanitized)",
                rec["response_body"] or "<unavailable>",
            ]
            fn.write_text("\n".join(payload), encoding="utf-8")
            rec["body_file"] = str(fn.relative_to(OUT))
        except Exception as exc:  # noqa: BLE001
            rec["note"] += f"file_err:{exc};"
        state["steps"].append(rec)

    page.on("console", on_console)
    page.on("pageerror", on_pageerror)
    page.on("response", on_response)


def start_step(name: str, note: str = "") -> dict:
    entry = {"name": name, "started": now(), "note": note, "api_from": len(state["steps"])}
    state["step_log"].append(entry)
    state["step"] = name
    log(f"STEP: {name} {note}")
    return entry


def end_step(entry: dict) -> dict:
    entry["ended"] = now()
    entry["api_to"] = len(state["steps"])
    entry["api_count"] = entry["api_to"] - entry["api_from"]
    return entry


def shot(page, name: str, full: bool = True) -> str:
    path = SHOTS / name
    try:
        page.screenshot(path=str(path), full_page=full)
    except Exception as exc:  # noqa: BLE001
        log(f"  screenshot FAIL {name}: {exc}")
        return f"FAIL:{exc}"
    return str(path.relative_to(OUT))


def dump_text(page) -> str:
    try:
        return page.inner_text("body")
    except Exception:
        return ""


def dom_snapshot(page, js_extra: str | None = None) -> dict:
    """Structured DOM facts: headings, buttons, nav, controls, main regions."""
    js = r"""
    () => {
      const clean = s => (s||'').replace(/\s+/g,' ').trim();
      const uniq = a => [...new Set(a)];
      const els = (sel, n=120) => [...document.querySelectorAll(sel)];
      const info = el => ({
        tag: el.tagName.toLowerCase(),
        text: clean(el.innerText || el.value || el.getAttribute('aria-label') || el.title || ''),
        cls: (el.className && typeof el.className === 'string') ? el.className.slice(0,120) : '',
        id: el.id || '',
        role: el.getAttribute('role') || '',
        type: el.getAttribute('type') || '',
        pid: el.getAttribute('data-project-id') || el.getAttribute('data-id') || '',
        href: el.getAttribute('href') || '',
      });
      const visible = el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const buttons = uniq(els('button, [role=button], a.btn').filter(visible).map(el => clean(el.innerText || el.getAttribute('aria-label') || '')).filter(Boolean));
      const headings = uniq(els('h1,h2,h3,h4').filter(visible).map(el => clean(el.innerText)).filter(Boolean));
      const navs = uniq(els('nav a, nav button, header a, header button, [class*=nav] button, [class*=nav] a').filter(visible).map(el => clean(el.innerText)).filter(Boolean));
      const inputs = els('input, textarea, select').filter(visible).map(el => ({
        tag: el.tagName.toLowerCase(), type: el.type || '', placeholder: el.getAttribute('placeholder') || '',
        id: el.id || '', value: (el.value||'').slice(0,80), cls: (typeof el.className==='string'?el.className.slice(0,80):'')
      }));
      const mains = els('main, [class*=main], [class*=layout], [class*=workspace], [class*=pane], [class*=panel]')
        .filter(visible).slice(0,40).map(el => ({
          tag: el.tagName.toLowerCase(), cls: (typeof el.className==='string'?el.className.slice(0,140):''),
          id: el.id||'', text: clean(el.innerText).slice(0,160)
        }));
      const canvases = els('canvas').map(el => ({
        w: el.width, h: el.height,
        rect: { w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) },
        cls: (typeof el.className==='string'?el.className.slice(0,100):''),
      }));
      const pdfSpans = els('[class*=textLayer] span, .textLayer span, [class*=text-layer] span');
      const pdfLayerInfo = els('[class*=textLayer], [class*=text-layer], .textLayer').map(el => ({
        cls: (typeof el.className==='string'?el.className.slice(0,120):''),
        spanCount: el.querySelectorAll('span').length,
        sample: clean(el.innerText).slice(0,120),
      }));
      const iframes = els('iframe').map(el => ({src: el.src, w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height)}));
      return {
        title: document.title,
        url: location.href,
        bodyLen: (document.body.innerText||'').length,
        bodyText: (document.body.innerText||'').slice(0, 20000),
        headings, buttons: buttons.slice(0,120), navs, inputs, mains,
        canvases, pdfSpanCount: pdfSpans.length,
        pdfSpanSamples: pdfSpans.slice(0,5).map(el => clean(el.innerText).slice(0,80)),
        pdfLayerInfo, iframes,
        htmlLang: document.documentElement.lang,
        scrollHeight: document.documentElement.scrollHeight,
        viewport: {w: innerWidth, h: innerHeight},
      };
    }
    """
    try:
        data = page.evaluate(js)
    except Exception as exc:  # noqa: BLE001
        data = {"error": str(exc)}
    if js_extra:
        try:
            data["extra"] = page.evaluate(js_extra)
        except Exception as exc:  # noqa: BLE001
            data["extra"] = {"error": str(exc)}
    return data


def save_json(name: str, data) -> str:
    path = OUT / name
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(path)


def canvas_blank_check(page) -> list:
    """Sample pixels of every canvas; report share of non-background pixels."""
    js = r"""
    () => [...document.querySelectorAll('canvas')].map((c, i) => {
      const out = {i, w: c.width, h: c.height, rect: {w: Math.round(c.getBoundingClientRect().width), h: Math.round(c.getBoundingClientRect().height)}};
      try {
        const ctx = c.getContext('2d');
        if (!ctx || !c.width || !c.height) { out.error = 'no-2d-context'; return out; }
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        let nonWhite = 0, total = 0, colored = 0;
        const step = 4 * 7; // sample every 7th pixel
        for (let p = 0; p < data.length; p += step) {
          const r = data[p], g = data[p+1], b = data[p+2], a = data[p+3];
          total++;
          if (a > 8 && (r < 245 || g < 245 || b < 245)) nonWhite++;
          if (a > 8 && (Math.abs(r-g) > 12 || Math.abs(g-b) > 12 || Math.abs(r-b) > 12)) colored++;
        }
        out.sampled = total; out.nonWhite = nonWhite; out.colored = colored;
        out.nonWhiteRatio = total ? +(nonWhite/total).toFixed(3) : 0;
      } catch (e) { out.error = String(e).slice(0,160); }
      return out;
    })
    """
    try:
        return page.evaluate(js)
    except Exception as exc:  # noqa: BLE001
        return [{"error": str(exc)}]


def finalize(extra: dict | None = None, fname: str = "api/steps.json") -> None:
    data = {
        "base": BASE,
        "viewport": "1672x941 dpr=1",
        "captured_steps": state["step_log"],
        "console_errors": [c for c in state["console"] if c["type"] == "error"],
        "console_warnings": [c for c in state["console"] if c["type"] == "warning"],
        "page_errors": state["page_errors"],
        "api_steps": state["steps"],
    }
    if extra:
        data.update(extra)
    save_json(fname, data)
    log(f"wrote {fname}: {len(state['steps'])} API calls, {len(data['console_errors'])} console errors")