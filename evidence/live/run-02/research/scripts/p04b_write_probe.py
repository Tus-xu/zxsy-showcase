# -*- coding: utf-8 -*-
"""P04b: write-path probe (retry) — wait for Shell's project redirect before switching
to 写作, create main.tex via UI, type, autosave, real XeLaTeX compile, log, PDF, error case.
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
from live_login import RESEARCH, login  # noqa: E402

R: dict = {}
PROJECT_HINT = "e49b27e2"
PROJECT_ID = "e49b27e2-b05f-45c3-ac99-dd0792d9ab80"

WRITE_JS = r"""
() => {
  const clean = s => (s||'').replace(/\s+/g,' ');
  const q = s => [...document.querySelectorAll(s)];
  const vis = el => { const r = el.getBoundingClientRect(); return r.width>0 && r.height>0; };
  const buttons = q('button, [role=button]').filter(vis).map(b => ({
    text: clean(b.innerText || b.getAttribute('aria-label') || '').trim(),
    label: b.getAttribute('aria-label') || '',
    disabled: b.disabled === true,
    cls: typeof b.className==='string' ? b.className.slice(0,110) : ''
  })).filter(b => b.text);
  const tree = q('.rw-tree__row').map(r => clean(r.innerText).trim());
  const treeHint = clean((document.querySelector('.rw-tree__hint') || {}).innerText || '').trim();
  const cm = document.querySelector('.cm-editor');
  const cmContent = document.querySelector('.cm-content');
  const cmLines = q('.cm-line').map(l => l.innerText);
  const ccb = clean((document.querySelector('.rw-ccb') || {}).innerText || '').trim();
  const log = clean((document.querySelector('.rw-log') || {}).innerText || '').trim();
  const previewCanvases = q('.rw-preview__canvas').map((c,i) => {
    const out = {i, w:c.width, h:c.height, css:{w:Math.round(c.getBoundingClientRect().width), h:Math.round(c.getBoundingClientRect().height)}};
    try {
      const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      let nw=0,tot=0;
      const step=4*11;
      for(let p=0;p<d.length;p+=step){const r=d[p],g=d[p+1],b=d[p+2],a=d[p+3];tot++;if(a>8&&(r<245||g<245||b<245))nw++;}
      out.nonWhiteRatio = tot ? +(nw/tot).toFixed(4) : 0;
    } catch(e){ out.error=String(e).slice(0,120); }
    return out;
  });
  return {
    url: location.href, title: document.title,
    buttons: buttons.slice(0,140), tree, treeHint,
    editor: {present: !!cm, contentEditable: cmContent ? (cmContent.getAttribute('contenteditable')||'') : '',
             lines: cmLines.length, textLen: cmLines.join('\n').length,
             textSample: cmLines.slice(0,8).join('\n').slice(0,500),
             gutters: document.querySelectorAll('.cm-gutters .cm-lineNumbers .cm-gutterElement').length,
             activeElement: document.activeElement ? String(document.activeElement.className).slice(0,80) : ''},
    saveIndicator: clean((document.querySelector('.rw-save, [class*=save-state], [class*=Save]') || {}).innerText || '').trim(),
    compileBar: ccb, log,
    previewCanvases,
    previewText: clean((document.querySelector('.rw-preview') || {}).innerText || '').trim().slice(0,800),
    toasts: q('[class*=toast], [role=status], [class*=notice]').map(e => clean(e.innerText).trim()).filter(Boolean).slice(0,10),
    bodyText: (document.body.innerText||'').slice(0,30000),
  };
}
"""


def state(page, tag: str, shot_name: str | None = None, full: bool = False) -> dict:
    data = page.evaluate(WRITE_JS)
    data["tag"] = tag
    H.save_json(f"api/write-{tag}.json", data)
    if shot_name:
        H.shot(page, shot_name, full=full)
    H.log(f"write[{tag}] url={data['url']} editor={data['editor']['present']} lines={data['editor']['lines']} "
          f"gutters={data['editor']['gutters']} tree={data['tree']} status={data['compileBar'][:100]!r}")
    return data


def wait_compile_done(page, timeout_ms: int = 150000) -> dict:
    start = time.time()
    polls = []
    last = ""
    while (time.time() - start) * 1000 < timeout_ms:
        page.wait_for_timeout(2500)
        bar = page.evaluate(WRITE_JS).get("compileBar", "")
        polls.append({"at": round(time.time() - start), "bar": bar[:200]})
        H.log(f"  compile poll {round(time.time()-start)}s bar={bar[:140]!r}")
        if bar and ("成功" in bar or "失败" in bar or "超时" in bar or "未编译" in bar):
            break
        if round(time.time() - start) > 8 and bar == last and bar:
            # status may be static success text already
            if "编译中" not in bar and "正在编译" not in bar:
                break
        last = bar
    return {"polls": polls}


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1672, "height": 941}, device_scale_factor=1,
                                  locale="zh-CN", accept_downloads=True)
        page = ctx.new_page()
        H.attach(page, ctx)

        st = H.start_step("login", "researcher 登录（真实 UI）")
        try:
            info = login(page, RESEARCH, wait_after=4500)
            st["result"] = {"url": page.url, "code": info.get("code")}
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:300]
        H.end_step(st)

        st = H.start_step("enter-workspace", "启动页「工作台」→ 等待 Shell 选中项目并重定向")
        try:
            page.get_by_role("button", name="工作台").first.click(timeout=12000)
            page.wait_for_url(re.compile(r"/research-workspace/[0-9a-f-]{36}/(read|write)"), timeout=30000)
            page.wait_for_timeout(6000)
            R["after_workspace_url"] = page.url
            H.log("workspace url=" + page.url)
            # switch to 写作 via the header segmented control (retry once)
            try:
                page.locator(".rw-seg__item", has_text="写作").first.click(timeout=8000)
                page.wait_for_timeout(5000)
            except Exception as exc:  # noqa: BLE001
                H.log("写作 tab click failed: " + str(exc)[:160])
            R["after_write_click_url"] = page.url
            H.log("after write click url=" + page.url)
            if not page.url.endswith("/write"):
                # UI click did not switch: navigate to the registered write route (same UI page)
                page.goto(f"http://127.0.0.1:5176/research-workspace/{PROJECT_ID}/write", wait_until="domcontentloaded", timeout=45000)
                page.wait_for_timeout(9000)
                R["write_entry_fallback"] = "写作 tab click did not change route; used UI route URL /research-workspace/<id>/write"
                H.log("fallback write url=" + page.url)
            R["write_url"] = page.url
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:500]
            H.log("enter workspace FAIL " + str(exc)[:300])
        H.end_step(st)
        page.wait_for_timeout(3000)
        R["initial"] = state(page, "11-initial", "11-write-initial-full.png", full=True)
        H.shot(page, "11-write-initial.png", full=False)

        # ---------- create main.tex via UI ----------
        st = H.start_step("create-main-tex", "写作侧「新建文件」→ main.tex（真实 UI）")
        try:
            if any("main.tex" in t for t in R["initial"]["tree"]):
                R["create_file"] = {"already_exists": True}
            else:
                page.get_by_role("button", name="新建文件").first.click(timeout=8000)
                page.wait_for_timeout(1000)
                inp = page.locator(".rw-tree__input").first
                inp.fill("main.tex")
                inp.press("Enter")
                page.wait_for_timeout(5000)
                R["create_file"] = {"tree_after": page.evaluate(WRITE_JS)["tree"],
                                    "hint_after": page.evaluate(WRITE_JS)["treeHint"]}
                H.shot(page, "11-write-file-created.png", full=False)
            H.log("create_file -> " + json.dumps(R.get("create_file"), ensure_ascii=False)[:300])
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:400]
            H.log("create main.tex FAIL " + str(exc)[:250])
        H.end_step(st)
        page.wait_for_timeout(2000)
        R["after_create"] = state(page, "11-after-create")

        # ---------- editor: click + type + cursor ----------
        st = H.start_step("editor-typing", "点击编辑器输入 LaTeX（点击/输入/光标/行号）")
        latex = (
            "\\documentclass{article}\n"
            "\\usepackage{ctex}\n"
            "\\usepackage{amsmath}\n"
            "\\begin{document}\n"
            "\\section{实测写作小节}\n"
            "变分形式与 Céa 引理：对任意 $v_h\\in V_h$，有\n"
            "\\begin{equation}\n"
            "  \\|u-u_h\\| \\le \\frac{M}{\\alpha}\\,\\inf_{v_h\\in V_h}\\|u-v_h\\|.\n"
            "\\end{equation}\n"
            "本节由现役系统实测输入生成。\n"
            "\\end{document}\n"
        )
        try:
            page.locator(".cm-content").first.click(timeout=10000)
            page.wait_for_timeout(700)
            before = page.evaluate(WRITE_JS)["editor"]
            page.keyboard.insert_text(latex)
            page.wait_for_timeout(2000)
            after = page.evaluate(WRITE_JS)["editor"]
            R["typing"] = {"before": before, "after": after, "input_len": len(latex),
                           "caret": page.evaluate("""() => {
                              const s = window.getSelection();
                              const el = document.querySelector('.cm-content');
                              return {selText: s ? s.toString().slice(0,100) : '',
                                      anchorInEditor: !!(s && s.anchorNode && el && el.contains(s.anchorNode)),
                                      activeElement: document.activeElement ? String(document.activeElement.className).slice(0,90) : ''};
                           }""")}
            H.shot(page, "11-write-typed.png", full=False)
            H.log(f"typing len {before.get('textLen')} -> {after.get('textLen')} caret={json.dumps(R['typing']['caret'], ensure_ascii=False)}")
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:500]
            R["typing"] = {"error": str(exc)[:500]}
            H.log("typing FAIL " + str(exc)[:250])
        H.end_step(st)

        # ---------- autosave ----------
        st = H.start_step("autosave", "等待自动保存；核对保存态与 PUT /files")
        try:
            page.wait_for_timeout(7000)
            R["autosave"] = state(page, "11-autosave")
            R["files_api"] = [{"id": s["id"], "step": s["step"], "method": s["method"], "status": s["status"],
                               "url": s["url"][:140], "req": (s.get("request_body") or "")[:200]}
                              for s in H.state["steps"] if "/files" in s["url"]]
            H.log("autosave indicator=" + R["autosave"].get("saveIndicator", "")[:120])
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:300]
        H.end_step(st)

        # ---------- real compile ----------
        st = H.start_step("compile-success", "点击顶栏「⇄ 重新编译」（.rw-ccb__primary），等待真实 XeLaTeX")
        R["compile_from"] = len(H.state["steps"])
        try:
            page.locator(".rw-ccb__primary").first.click(timeout=10000)
            page.wait_for_timeout(2000)
            H.shot(page, "11-write-compiling.png", full=False)
            R["compile_wait"] = wait_compile_done(page, timeout_ms=150000)
            R["compiled"] = state(page, "11-compiled", "11-write-compiled.png")
            H.shot(page, "11-write-compiled-full.png", full=True)
            R["compile_api"] = [{"id": s["id"], "step": s["step"], "method": s["method"], "status": s["status"],
                                 "url": s["url"][:150], "req": (s.get("request_body") or "")[:200],
                                 "resp": (s.get("response_body") or "")[:1500],
                                 "pdf_artifact": s.get("pdf_artifact"), "pdf_bytes": s.get("pdf_bytes")}
                                for s in H.state["steps"][R["compile_from"]:]]
            R["compile_log"] = page.evaluate("""() => {
              const el = document.querySelector('.rw-log');
              return el ? el.innerText.slice(0,6000) : null;
            }""")
            R["preview_dom"] = page.evaluate("""() => ({
              previewText: (document.querySelector('.rw-preview')||{}).innerText||'',
              openDisabled: (()=>{const b=document.querySelector('[aria-label=\"在新标签打开\"]');return b?b.disabled:null})(),
              pageTotal: (document.querySelector('.rw-preview__page-total')||{}).innerText||'',
              zoom: (document.querySelector('.rw-preview__zoom')||{}).innerText||'',
              downloadLike: [...document.querySelectorAll('a,button')].map(e=>(e.innerText||e.getAttribute('aria-label')||'').trim()).filter(t=>/下载|导出|PDF/.test(t)).slice(0,20),
            })""")
            H.log("compiled status=" + R["compiled"].get("compileBar", "")[:200])
            H.log("preview=" + json.dumps(R["compiled"].get("previewCanvases"), ensure_ascii=False) +
                  " previewText=" + (R["preview_dom"].get("previewText") or "")[:200].replace("\n", " | "))
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:500]
            H.log("compile FAIL " + str(exc)[:300])
            H.shot(page, "11-write-compile-error.png", full=False)
        H.end_step(st)

        # ---------- deliberate error compile ----------
        st = H.start_step("compile-error", "追加未闭合 \\begin{equation} → 重新编译；取错误日志原文")
        try:
            page.locator(".cm-content").first.click(timeout=10000)
            page.keyboard.press("Control+End")
            page.wait_for_timeout(400)
            page.keyboard.insert_text("\n\\begin{equation}\n  1 = 1\n")
            page.wait_for_timeout(6000)
            page.locator(".rw-ccb__primary").first.click(timeout=10000)
            page.wait_for_timeout(2000)
            H.shot(page, "11-write-error-compiling.png", full=False)
            R["error_wait"] = wait_compile_done(page, timeout_ms=150000)
            R["error_state"] = state(page, "11-error-compiled", "11-write-error-log.png")
            R["error_log"] = page.evaluate("""() => {
              const el = document.querySelector('.rw-log');
              return el ? el.innerText.slice(0,6000) : null;
            }""")
            R["error_preview"] = page.evaluate("""() => ({
              previewText: (document.querySelector('.rw-preview')||{}).innerText||'',
              canvases: [...document.querySelectorAll('.rw-preview__canvas')].map(c=>({w:c.width,h:c.height})),
            })""")
            H.log("error status=" + R["error_state"].get("compileBar", "")[:200])
            H.log("error log=" + (R.get("error_log") or "")[:500].replace("\n", " | "))
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:500]
            H.log("error compile FAIL " + str(exc)[:250])
        H.end_step(st)

        # ---------- agent write-mode preset: 解释编译错误 ----------
        st = H.start_step("agent-write-preset", "写作侧 Agent「解释编译错误」实测")
        try:
            btn = page.get_by_role("button", name=re.compile("解释编译错误")).first
            btn.click(timeout=8000)
            page.wait_for_timeout(25000)
            R["agent_write"] = page.evaluate("""() => (document.querySelector('.rw-agent')||{}).innerText||''""")
            H.shot(page, "11-write-agent-error.png", full=False)
            H.log("agent write reply len=" + str(len(R.get("agent_write") or "")))
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:400]
            H.log("agent write preset FAIL " + str(exc)[:200])
        H.end_step(st)

        R["api_all"] = [{"id": s["id"], "step": s["step"], "method": s["method"], "status": s["status"],
                         "url": s["url"][:150], "pdf_artifact": s.get("pdf_artifact"),
                         "pdf_bytes": s.get("pdf_bytes")} for s in H.state["steps"]]
        H.finalize({"p04b": {k: v for k, v in R.items() if k != "api_all"}}, "api/steps-p04b.json")
        (H.OUT / "api" / "p04b-results.json").write_text(json.dumps(R, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
        ctx.close()
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())