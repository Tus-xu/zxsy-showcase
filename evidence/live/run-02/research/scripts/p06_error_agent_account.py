# -*- coding: utf-8 -*-
"""P06: error-compile path (real failed XeLaTeX), compile-log原文, Agent「解释编译错误」,
recover to success, write/read Agent starter capability inventory, account tabs.
"""
from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, r"D:\zxsy-math-arena-showcase\.work\scripts")
sys.path.insert(0, str(Path(__file__).parent))

from playwright.sync_api import sync_playwright  # noqa: E402

import harness as H  # noqa: E402
import sess as S  # noqa: E402

R: dict = {}
BASE = "http://127.0.0.1:5176"
PID = "e49b27e2-b05f-45c3-ac99-dd0792d9ab80"

WRITE_JS = r"""
() => {
  const clean = s => (s||'').replace(/\s+/g,' ');
  const q = s => [...document.querySelectorAll(s)];
  const cmLines = q('.cm-line').map(l => l.innerText);
  const log = clean((document.querySelector('.rw-log') || {}).innerText || '').trim();
  const canvases = q('.rw-preview__canvas').map(c => {
    const o = {w:c.width, h:c.height};
    try { const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let nw=0,tot=0; const st=4*11;
      for(let p=0;p<d.length;p+=st){const r=d[p],g=d[p+1],b=d[p+2],a=d[p+3];tot++;if(a>8&&(r<245||g<245||b<245))nw++;}
      o.nonWhiteRatio = tot?+(nw/tot).toFixed(4):0; } catch(e){o.error=String(e).slice(0,100);}
    return o;
  });
  return {
    url: location.href, title: document.title,
    compileBar: clean((document.querySelector('.rw-ccb')||{}).innerText||'').trim(),
    log,
    logTabs: clean((document.querySelector('.rw-log__tabs, .rw-log header')||{}).innerText||'').trim(),
    editor: {lines: cmLines.length, text: cmLines.join('\n')},
    preview: {text: clean((document.querySelector('.rw-preview')||{}).innerText||'').trim().slice(0,600), canvases,
              pageTotal: (document.querySelector('.rw-preview__page-total')||{}).innerText||'',
              zoom: (document.querySelector('.rw-preview__zoom')||{}).innerText||''},
    toasts: q('[class*=toast],[role=status],[class*=notice]').map(e=>clean(e.innerText).trim()).filter(Boolean).slice(0,10),
    agent: clean((document.querySelector('.rw-agent')||{}).innerText||'').slice(0,6000),
    bodyText: (document.body.innerText||'').slice(0,30000),
  };
}
"""


def st(page, tag: str, shot_name: str | None = None, full: bool = False) -> dict:
    d = page.evaluate(WRITE_JS)
    d["tag"] = tag
    H.save_json(f"api/write-{tag}.json", d)
    if shot_name:
        H.shot(page, shot_name, full=full)
    H.log(f"[{tag}] bar={d['compileBar'][:120]!r} log={d['log'][:140]!r} preview={json.dumps(d['preview']['canvases'])}")
    return d


def wait_status(page, timeout_ms: int = 150000) -> dict:
    start = time.time()
    polls = []
    while (time.time() - start) * 1000 < timeout_ms:
        page.wait_for_timeout(2500)
        bar = page.evaluate("() => (document.querySelector('.rw-ccb')||{}).innerText||''")
        bar = re.sub(r"\s+", " ", bar).strip()
        polls.append({"at": round(time.time() - start), "bar": bar[:200]})
        H.log(f"  poll {round(time.time()-start)}s {bar[:150]!r}")
        if "编译成功" in bar or "编译失败" in bar or "编译超时" in bar:
            break
    return {"polls": polls}


def click_new_chat(page) -> bool:
    try:
        page.get_by_role("button", name=re.compile("新对话")).first.click(timeout=8000)
        page.wait_for_timeout(3000)
        return True
    except Exception as exc:  # noqa: BLE001
        H.log("new chat FAIL " + str(exc)[:160])
        return False


def main() -> int:
    with sync_playwright() as p:
        browser, ctx, page = S.open_page(p)

        # ---------- write page ----------
        stp = H.start_step("open-write", "直接打开本项目写作工作区（注册路由 /research-workspace/:id/write）")
        try:
            page.goto(f"{BASE}/research-workspace/{PID}/write", wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(10000)
            R["entry"] = {"url": page.url, "title": page.title()}
            H.shot(page, "15-write-entry.png", full=False)
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:400]
        H.end_step(stp)

        # ---------- inject a real LaTeX error inside document body ----------
        stp = H.start_step("inject-error", "编辑器内第 10 行插入未闭合 \\begin{equation}（真实键入）")
        try:
            page.locator(".cm-content").first.click(timeout=10000)
            page.keyboard.press("Control+Home")
            page.wait_for_timeout(300)
            for _ in range(9):
                page.keyboard.press("ArrowDown")
            page.keyboard.press("End")
            page.wait_for_timeout(300)
            page.keyboard.insert_text("\\begin{equation}\n")
            page.wait_for_timeout(1000)
            R["injected"] = st(page, "15-injected", "15-write-injected.png")
            # wait for autosave
            page.wait_for_timeout(6000)
            R["inject_saved"] = page.evaluate("""() => ({
              saveIndicator: (document.querySelector('.rw-save, [class*=save]')||{}).innerText||'',
              files: [...document.querySelectorAll('.rw-tabrow, [class*=tab]')].map(e=>(e.innerText||'').trim()).slice(0,5)
            })""")
            H.log("inject saved: " + json.dumps(R["inject_saved"], ensure_ascii=False)[:200])
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:500]
            H.log("inject FAIL " + str(exc)[:250])
        H.end_step(stp)

        # ---------- failing compile ----------
        stp = H.start_step("compile-fail", "点击「重新编译」，期待真实失败 + 错误日志原文")
        R["fail_from"] = len(H.state["steps"])
        try:
            page.locator(".rw-ccb__primary").first.click(timeout=10000)
            page.wait_for_timeout(2500)
            H.shot(page, "15-write-fail-compiling.png", full=False)
            R["fail_wait"] = wait_status(page, timeout_ms=180000)
            R["fail_state"] = st(page, "15-failed", "15-write-failed.png")
            H.shot(page, "15-write-failed-full.png", full=True)
            R["fail_api"] = [{"id": s["id"], "step": s["step"], "method": s["method"], "status": s["status"],
                              "url": s["url"][:140],
                              "req": (s.get("request_body") or "")[:200],
                              "resp": (s.get("response_body") or "")[:5000],
                              "pdf_artifact": s.get("pdf_artifact")} for s in H.state["steps"][R["fail_from"]:]]
            H.log("fail status=" + R["fail_state"]["compileBar"][:200])
            H.log("fail log=" + R["fail_state"]["log"][:800].replace("\n", " | "))
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:500]
            H.log("fail compile FAIL " + str(exc)[:250])
        H.end_step(stp)

        # ---------- agent: explain compile error (write mode) ----------
        stp = H.start_step("agent-explain-error", "Agent「解释编译错误」能力（基于真实失败日志）")
        try:
            click_new_chat(page)
            H.shot(page, "15-write-agent-empty.png", full=False)
            R["write_agent_starters"] = page.evaluate("""() => {
              const clean = s => (s||'').replace(/\s+/g,' ').trim();
              return [...document.querySelectorAll('.rw-agent button')].map(b => clean(b.innerText || b.getAttribute('aria-label') || '')).filter(Boolean);
            }""")
            page.get_by_role("button", name=re.compile("解释编译错误")).first.click(timeout=8000)
            page.wait_for_timeout(30000)
            R["agent_error_reply"] = page.evaluate("() => (document.querySelector('.rw-agent')||{}).innerText||''")
            H.shot(page, "15-write-agent-error.png", full=False)
            H.log("agent reply len=" + str(len(R["agent_error_reply"])))
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:500]
            H.log("agent explain FAIL " + str(exc)[:250])
        H.end_step(stp)

        # ---------- recover: undo injection and compile success again ----------
        stp = H.start_step("recover", "撤销注入的错误行 → 重新编译成功（可恢复性）")
        R["recover_from"] = len(H.state["steps"])
        try:
            page.locator(".cm-content").first.click(timeout=10000)
            page.keyboard.press("Control+z")
            page.wait_for_timeout(3000)
            R["after_undo"] = st(page, "15-undone")
            page.wait_for_timeout(5000)
            page.locator(".rw-ccb__primary").first.click(timeout=10000)
            page.wait_for_timeout(2500)
            R["recover_wait"] = wait_status(page, timeout_ms=180000)
            R["recovered"] = st(page, "15-recovered", "15-write-recovered.png")
            R["recover_api"] = [{"id": s["id"], "method": s["method"], "status": s["status"], "url": s["url"][:140],
                                 "resp": (s.get("response_body") or "")[:900], "pdf_artifact": s.get("pdf_artifact"),
                                 "pdf_bytes": s.get("pdf_bytes")} for s in H.state["steps"][R["recover_from"]:]]
            H.log("recovered status=" + R["recovered"]["compileBar"][:200])
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:500]
            H.log("recover FAIL " + str(exc)[:250])
        H.end_step(stp)

        # ---------- read-mode agent starters ----------
        stp = H.start_step("agent-read-starters", "阅读侧 Agent 新对话初始能力入口盘点")
        try:
            page.goto(f"{BASE}/research-workspace/{PID}/read", wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(9000)
            click_new_chat(page)
            R["read_agent_starters"] = page.evaluate("""() => {
              const clean = s => (s||'').replace(/\s+/g,' ').trim();
              return [...document.querySelectorAll('.rw-agent button')].map(b => clean(b.innerText || b.getAttribute('aria-label') || '')).filter(Boolean);
            }""")
            R["read_agent_pane"] = page.evaluate("() => (document.querySelector('.rw-agent')||{}).innerText||''")
            H.shot(page, "15-read-agent-empty.png", full=False)
            H.log("read starters=" + json.dumps(R["read_agent_starters"], ensure_ascii=False)[:800])
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:400]
        H.end_step(stp)

        # ---------- account tabs ----------
        stp = H.start_step("account-tabs", "个人中心「账号安全」「科研概览」页签内容")
        try:
            page.goto(BASE + "/research-workspace/account", wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(5000)
            R["account_tabs"] = {}
            for label in ("账号安全", "科研概览"):
                try:
                    page.get_by_role("button", name=re.compile(label)).first.click(timeout=8000)
                    page.wait_for_timeout(3500)
                    R["account_tabs"][label] = page.evaluate("() => (document.querySelector('main, .ra-main, [class*=account]')||document.body).innerText.slice(0,6000)")
                    H.shot(page, f"15-account-{label}.png", full=False)
                except Exception as exc:  # noqa: BLE001
                    R["account_tabs"][label] = {"error": str(exc)[:300]}
                    H.log(f"account tab {label} FAIL " + str(exc)[:160])
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:400]
        H.end_step(stp)

        R["api_all"] = [{"id": s["id"], "step": s["step"], "method": s["method"], "status": s["status"],
                         "url": s["url"][:150], "pdf_artifact": s.get("pdf_artifact")} for s in H.state["steps"]]
        H.finalize({"p06": {k: v for k, v in R.items() if k != "api_all"}}, "api/steps-p06.json")
        (H.OUT / "api" / "p06-results.json").write_text(json.dumps(R, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
        S.save_state(ctx)
        ctx.close()
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())