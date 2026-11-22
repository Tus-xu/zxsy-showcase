# -*- coding: utf-8 -*-
"""P04: write-path live probe — editor interactivity, create main.tex, autosave,
real XeLaTeX compile, compile log, produced PDF, deliberate error compile.
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

WRITE_JS = r"""
() => {
  const clean = s => (s||'').replace(/\s+/g,' ').trim();
  const q = s => [...document.querySelectorAll(s)];
  const vis = el => { const r = el.getBoundingClientRect(); return r.width>0 && r.height>0; };
  const buttons = q('button, [role=button]').filter(vis).map(b => ({
    text: clean(b.innerText || b.getAttribute('aria-label') || ''),
    label: b.getAttribute('aria-label') || '',
    disabled: b.disabled,
    cls: typeof b.className==='string' ? b.className.slice(0,100) : ''
  })).filter(b => b.text);
  const tree = q('.rw-tree__row').map(r => clean(r.innerText));
  const treeHint = clean((document.querySelector('.rw-tree__hint') || {}).innerText || '');
  const cm = document.querySelector('.cm-editor');
  const cmContent = document.querySelector('.cm-content');
  const cmLines = q('.cm-line').map(l => l.innerText);
  const ccb = clean((document.querySelector('.rw-ccb') || {}).innerText || '');
  const log = clean((document.querySelector('.rw-log') || {}).innerText || '');
  const previewCanvases = q('.rw-preview__canvas').map((c,i) => {
    const out = {i, w:c.width, h:c.height, css:{w:Math.round(c.getBoundingClientRect().width), h:Math.round(c.getBoundingClientRect().height)}};
    try {
      const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      let nw=0, tot=0;
      const step=4*11;
      for(let p=0;p<d.length;p+=step){const r=d[p],g=d[p+1],b=d[p+2],a=d[p+3];tot++;if(a>8&&(r<245||g<245||b<245))nw++;}
      out.nonWhiteRatio = tot ? +(nw/tot).toFixed(4) : 0;
    } catch(e){ out.error = String(e).slice(0,120); }
    return out;
  });
  const sel = window.getSelection();
  return {
    url: location.href, title: document.title,
    buttons: buttons.slice(0,120),
    tree, treeHint,
    editor: {
      present: !!cm, contentEditable: cmContent ? (cmContent.getAttribute('contenteditable') || '') : '',
      lines: cmLines.length, textSample: cmLines.slice(0,6).join('\n').slice(0,400),
      textLen: cmLines.join('\n').length,
      activeFile: clean((document.querySelector('.rw-tabrow') || {}).innerText || ''),
    },
    saveIndicator: clean((document.querySelector('.rw-save, [class*=save]') || {}).innerText || ''),
    compileBar: ccb,
    log, logCounts: clean((document.querySelector('.rw-log__tabs, .rw-log') || {}).innerText || '').slice(0,500),
    previewCanvases,
    previewText: clean((document.querySelector('.rw-preview') || {}).innerText || '').slice(0,800),
    toasts: q('[class*=toast], [role=status], [class*=notice]').map(e => clean(e.innerText)).filter(Boolean).slice(0,10),
    selection: sel ? sel.toString().slice(0,200) : '',
    bodyText: (document.body.innerText||'').slice(0,30000),
  };
}
"""


def state(page, tag: str) -> dict:
    data = page.evaluate(WRITE_JS)
    data["tag"] = tag
    H.save_json(f"api/write-{tag}.json", data)
    H.log(f"write[{tag}] editor={data['editor']['present']} lines={data['editor']['lines']} "
          f"tree={data['tree']} status='{data['compileBar'][:80]}' preview={data['previewCanvases']}")
    return data


def shot(page, name: str, full: bool = False) -> None:
    H.shot(page, name, full=full)


def wait_compile_done(page, timeout_ms: int = 120000) -> dict:
    """Poll until compile bar leaves 编译中/running state."""
    start = time.time()
    polls = []
    last = ""
    while (time.time() - start) * 1000 < timeout_ms:
        page.wait_for_timeout(2500)
        d = page.evaluate(WRITE_JS)
        bar = d.get("compileBar", "")
        polls.append({"at": round(time.time() - start), "bar": bar[:160]})
        H.log(f"  compile poll {round(time.time()-start)}s bar='{bar[:120]}'")
        if "编译中" not in bar and "正在编译" not in bar and round(time.time() - start) > 4 and bar == last:
            break
        last = bar
    return {"polls": polls}


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1672, "height": 941}, device_scale_factor=1, locale="zh-CN",
                                  accept_downloads=True)
        page = ctx.new_page()
        H.attach(page, ctx)

        st = H.start_step("login", "researcher 登录（真实 UI）")
        try:
            info = login(page, RESEARCH, wait_after=4000)
            st["result"] = {"url": page.url, "code": info.get("code")}
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:300]
        H.end_step(st)

        st = H.start_step("enter-write", "启动页「工作台」→ 顶部「写作」")
        try:
            page.get_by_role("button", name="工作台").first.click(timeout=12000)
            page.wait_for_timeout(9000)
            page.get_by_role("button", name="写作").first.click(timeout=10000)
            page.wait_for_timeout(9000)
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:400]
        H.end_step(st)
        shot(page, "10-write-initial-full.png", full=True)
        shot(page, "10-write-initial.png")
        R["initial"] = state(page, "10-initial")

        # ---------- create main.tex if tree is empty ----------
        st = H.start_step("create-main-tex", "写作侧「新建文件」→ main.tex")
        try:
            if R["initial"]["tree"]:
                existing = [t for t in R["initial"]["tree"] if "main.tex" in t]
                R["create_file"] = {"already": existing}
            else:
                page.get_by_role("button", name="新建文件").first.click(timeout=8000)
                page.wait_for_timeout(800)
                inp = page.locator(".rw-tree__input").first
                inp.fill("main.tex")
                inp.press("Enter")
                page.wait_for_timeout(4000)
                R["create_file"] = {"tree_after": page.evaluate(WRITE_JS)["tree"],
                                    "hint_after": page.evaluate(WRITE_JS)["treeHint"]}
                shot(page, "10-write-file-created.png")
            H.log(f"create_file -> {json.dumps(R.get('create_file'), ensure_ascii=False)[:300]}")
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:400]
            R["create_file"] = {"error": str(exc)[:400]}
            H.log("create file FAIL " + str(exc)[:250])
        H.end_step(st)

        # ---------- editor interactivity: click + type + cursor ----------
        st = H.start_step("editor-typing", "点击编辑器（CodeMirror）输入 LaTeX，检查行号/光标/字面内容")
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
            "本节由现役系统实测生成。\n"
            "\\end{document}\n"
        )
        try:
            editor = page.locator(".cm-content").first
            editor.click(timeout=8000)
            page.wait_for_timeout(800)
            before = page.evaluate(WRITE_JS)["editor"]
            page.keyboard.insert_text(latex)
            page.wait_for_timeout(1500)
            after = page.evaluate(WRITE_JS)["editor"]
            R["typing"] = {"before": before, "after": after, "expected_len": len(latex)}
            shot(page, "10-write-typed.png")
            # cursor / caret presence
            R["typing"]["caret"] = page.evaluate("""() => {
              const s = window.getSelection();
              const el = document.querySelector('.cm-content');
              return {selText: s ? s.toString().slice(0,80) : '', anchorInEditor: !!(s && s.anchorNode && el && el.contains(s.anchorNode)),
                      activeElement: document.activeElement ? document.activeElement.className.slice(0,80) : ''};
            }""")
            R["typing"]["lineNumbers"] = page.evaluate("() => document.querySelectorAll('.cm-gutters .cm-lineNumbers .cm-gutterElement').length")
            H.log(f"typing: len {before.get('textLen')} -> {after.get('textLen')} (expected {len(latex)}) caret={R['typing']['caret']}")
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:400]
            R["typing"] = {"error": str(exc)[:400]}
            H.log("typing FAIL " + str(exc)[:250])
        H.end_step(st)

        # ---------- autosave ----------
        st = H.start_step("autosave", "等待自动保存并核对保存态与 PUT /files")
        try:
            page.wait_for_timeout(6000)
            R["autosave"] = state(page, "10-autosave")
            R["autosave_puts"] = [s for s in H.state["steps"] if s["method"] in ("PUT", "POST") and "/files" in s["url"]]
            H.log("autosave indicator=" + R["autosave"].get("saveIndicator", "")[:100] +
                  f" puts={len(R['autosave_puts'])}")
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:300]
        H.end_step(st)

        # ---------- real compile (success path) ----------
        st = H.start_step("compile-success", "点击顶栏「重新编译」，等待真实 XeLaTeX 编译")
        R["compile_from"] = len(H.state["steps"])
        try:
            page.get_by_role("button", name=re.compile("重新编译")).first.click(timeout=10000)
            page.wait_for_timeout(3000)
            shot(page, "10-write-compiling.png")
            R["compile_wait"] = wait_compile_done(page, timeout_ms=150000)
            shot(page, "10-write-compiled.png")
            R["compiled"] = state(page, "10-compiled")
            R["compile_api"] = H.state["steps"][R["compile_from"]:]
            H.log("compiled bar=" + R["compiled"].get("compileBar", "")[:160] +
                  " canvases=" + json.dumps(R["compiled"].get("previewCanvases"), ensure_ascii=False))
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:500]
            H.log("compile FAIL " + str(exc)[:300])
            shot(page, "10-write-compile-error.png")
        H.end_step(st)

        # compile log detail + PDF artifact/open link
        try:
            R["compile_log"] = page.evaluate("""() => {
              const el = document.querySelector('.rw-log');
              return el ? {text: el.innerText.slice(0,4000), html: el.innerHTML.slice(0,2000)} : null;
            }""")
            R["preview_dom"] = page.evaluate("""() => ({
              previewText: (document.querySelector('.rw-preview')||{}).innerText||'',
              openBtn: (()=>{const b=document.querySelector('[aria-label=\"在新标签打开\"]');return b?{disabled:b.disabled}:null})(),
              pageTotal: (document.querySelector('.rw-preview__page-total')||{}).innerText||'',
              zoom: (document.querySelector('.rw-preview__zoom')||{}).innerText||'',
            })""")
        except Exception:
            pass

        # ---------- deliberate error compile ----------
        st = H.start_step("compile-error", "在文末追加未闭合 \\begin{equation}，重新编译并取错误日志原文")
        try:
            editor = page.locator(".cm-content").first
            editor.click(timeout=8000)
            page.keyboard.press("Control+End")
            page.wait_for_timeout(400)
            page.keyboard.insert_text("\n\\begin{equation}\n  broken\n")
            page.wait_for_timeout(5000)
            page.get_by_role("button", name=re.compile("重新编译")).first.click(timeout=10000)
            page.wait_for_timeout(2000)
            shot(page, "10-write-error-compiling.png")
            R["error_wait"] = wait_compile_done(page, timeout_ms=150000)
            R["error_state"] = state(page, "10-error-compiled")
            R["error_log"] = page.evaluate("""() => {
              const el = document.querySelector('.rw-log');
              return el ? el.innerText.slice(0,5000) : null;
            }""")
            shot(page, "10-write-error-log.png")
            H.log("error compile bar=" + R["error_state"].get("compileBar", "")[:160])
            H.log("error log=" + (R.get("error_log") or "")[:400].replace("\n", " | "))
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:400]
            H.log("error compile FAIL " + str(exc)[:250])
        H.end_step(st)

        # ---------- agent on compile error (write mode preset) ----------
        st = H.start_step("agent-write-preset", "写作侧 Agent「解释编译错误」能力实测")
        try:
            btn = page.get_by_role("button", name=re.compile("解释编译错误")).first
            btn.click(timeout=8000)
            page.wait_for_timeout(20000)
            R["agent_write"] = page.evaluate("""() => {
              const pane = document.querySelector('.rw-agent');
              return {text: pane ? pane.innerText.slice(0,6000) : ''};
            }""")
            shot(page, "10-write-agent-error.png")
            H.log("agent write reply len=" + str(len(R.get("agent_write", {}).get("text", ""))))
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:400]
            H.log("agent write preset FAIL " + str(exc)[:200])
        H.end_step(st)

        R["api_all"] = [{"id": s["id"], "step": s["step"], "method": s["method"], "status": s["status"],
                         "url": s["url"][:140], "pdf_artifact": s.get("pdf_artifact"), "pdf_bytes": s.get("pdf_bytes")}
                        for s in H.state["steps"]]
        H.finalize({"p04": {k: v for k, v in R.items() if k not in ("api_all",)}}, "api/steps-p04.json")
        (H.OUT / "api" / "p04-results.json").write_text(json.dumps(R, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
        ctx.close()
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())