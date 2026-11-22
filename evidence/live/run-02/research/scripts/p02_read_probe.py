# -*- coding: utf-8 -*-
"""P02: deep read-path probe on the existing literature project.

Real UI only: login -> 启动页 -> 工作台 (opens most recent project read view).
Probes: PDF canvas pixel content, pdf.js text layer spans, page nav/zoom, doc switch,
text selection, selection toolbar, Agent quick actions, composer ask.
"""
from __future__ import annotations

import json
import re
import sys
import time
import traceback
from pathlib import Path

sys.path.insert(0, r"D:\zxsy-math-arena-showcase\.work\scripts")
sys.path.insert(0, str(Path(__file__).parent))

from playwright.sync_api import sync_playwright  # noqa: E402

import harness as H  # noqa: E402
from live_login import RESEARCH, login  # noqa: E402

R: dict = {}


PDF_JS = r"""
() => {
  const clean = s => (s||'').replace(/\s+/g,' ').trim();
  const q = (s) => [...document.querySelectorAll(s)];
  const canvases = q('canvas').map((c, i) => {
    const out = {i, w: c.width, h: c.height,
      css: {w: Math.round(c.getBoundingClientRect().width), h: Math.round(c.getBoundingClientRect().height)},
      cls: typeof c.className === 'string' ? c.className : '',
      visible: (() => { const r = c.getBoundingClientRect(); return r.width>0 && r.height>0; })()
    };
    try {
      const ctx = c.getContext('2d');
      const data = ctx.getImageData(0,0,c.width,c.height).data;
      let nonWhite=0, colored=0, total=0, alpha0=0;
      const step = 4*11;
      for (let p=0; p<data.length; p+=step) {
        const r=data[p],g=data[p+1],b=data[p+2],a=data[p+3];
        total++;
        if (a===0) alpha0++;
        else if (r<245||g<245||b<245) nonWhite++;
        if (a>8 && (Math.abs(r-g)>12||Math.abs(g-b)>12||Math.abs(r-b)>12)) colored++;
      }
      out.sampled=total; out.nonWhite=nonWhite; out.colored=colored;
      out.nonWhiteRatio = total ? +(nonWhite/total).toFixed(4) : 0;
      out.alpha0Ratio = total ? +(alpha0/total).toFixed(3) : 0;
      out.topLeftPixel = [data[0],data[1],data[2],data[3]];
    } catch(e) { out.error=String(e).slice(0,200); }
    return out;
  });
  const tl = q('.rw-pdf__text, [class*=textLayer], [class*=text-layer]').map(el => ({
    cls: typeof el.className==='string'?el.className.slice(0,120):'',
    spans: el.querySelectorAll('span').length,
    len: clean(el.innerText).length,
    sample: clean(el.innerText).slice(0,200),
    rect: (()=>{const r=el.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)};})(),
    innerStart: (el.innerHTML||'').slice(0,300),
  }));
  const pageEl = q('.rw-pdf__page').map(el => ({
    cls: typeof el.className==='string'?el.className.slice(0,100):'',
    rect: (()=>{const r=el.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)};})(),
    children: [...el.children].map(c => ({tag:c.tagName.toLowerCase(), cls:typeof c.className==='string'?c.className.slice(0,100):'', rect: (()=>{const r=c.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)};})()})),
  }));
  const tabs = q('[class*=tab]').filter(el => clean(el.innerText).includes('.pdf')).map(el => clean(el.innerText).slice(0,120));
  const docList = q('.rw-doclist__item, [class*=doc-item], [class*=docItem], [class*=doclist] li, [class*=doclist] button')
    .filter(el => clean(el.innerText).includes('.pdf'))
    .map(el => ({text: clean(el.innerText).slice(0,200), cls: typeof el.className==='string'?el.className.slice(0,120):''}));
  const toast = clean((document.querySelector('.rw-pdf__toast')||{}).innerText||'');
  const toolbarText = clean((document.querySelector('[class*=toolbar]')||{}).innerText||'').slice(0,300);
  const sel = {selection: String(window.getSelection ? window.getSelection().toString() : '').slice(0,500)};
  const skeleton = q('.rw-pdf__skeleton').length;
  return {
    url: location.href, title: document.title,
    canvases, textLayers: tl, pages: pageEl, tabs, docList, toast, skeleton,
    selection: sel.selection,
    pageInputValue: (document.querySelector('.rw-ptb__pageinput')||{}).value,
    pageTotalText: clean((document.querySelector('.rw-ptb')||{}).innerText||'').slice(0,200),
    bodyText: (document.body.innerText||'').slice(0,30000),
  };
}
"""

AGENT_JS = r"""
() => {
  const clean = s => (s||'').replace(/\s+/g,' ').trim();
  const q = s => [...document.querySelectorAll(s)];
  const pane = document.querySelector('.rw-agent, [class*=agent]');
  const msgs = q('[class*=msg], [class*=message], [class*=bubble], [class*=answer], [class*=reply]')
    .map(el => ({cls: typeof el.className==='string'?el.className.slice(0,100):'', text: clean(el.innerText).slice(0,800)}))
    .filter(m => m.text.length > 2);
  return {
    paneText: clean(pane ? pane.innerText : '').slice(0, 8000),
    msgCandidates: msgs.slice(-20),
    composer: (()=>{const t=document.querySelector('.rw-composer__input');return t?{value:t.value,disabled:t.disabled}:null;})(),
    sendButtons: q('button').filter(b=>/发送/.test(b.innerText)).map(b=>({text:clean(b.innerText),disabled:b.disabled,cls:typeof b.className==='string'?b.className.slice(0,100):''})),
  };
}
"""


def pdf_state(page, tag: str) -> dict:
    try:
        data = page.evaluate(PDF_JS)
    except Exception as exc:  # noqa: BLE001
        data = {"error": str(exc)}
    data["tag"] = tag
    data["t"] = time.strftime("%H:%M:%S")
    H.save_json(f"api/pdf-{tag}.json", data)
    c = (data.get("canvases") or [{}])[0]
    tl = (data.get("textLayers") or [{}])[0]
    H.log(f"pdf[{tag}] canvas nonWhiteRatio={c.get('nonWhiteRatio')} size={c.get('w')}x{c.get('h')} "
          f"textLayerSpans={tl.get('spans')} textLen={tl.get('len')} toast='{data.get('toast','')}'")
    return data


def shot(page, name: str) -> None:
    H.shot(page, name, full=False)


def agent_state(page, tag: str) -> dict:
    try:
        data = page.evaluate(AGENT_JS)
    except Exception as exc:  # noqa: BLE001
        data = {"error": str(exc)}
    H.save_json(f"api/agent-{tag}.json", data)
    H.log(f"agent[{tag}] composer={bool(data.get('composer'))} texts={[m['text'][:60] for m in data.get('msgCandidates',[])[-3:]]}")
    return data


def try_selection(page) -> dict:
    """Drag across the PDF page (text layer if present, else canvas) and read selection."""
    res = {"method": None, "selection": "", "toolbar": ""}
    try:
        box = page.evaluate(r"""
        () => {
          const el = document.querySelector('.rw-pdf__text') || document.querySelector('.rw-pdf__canvas');
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {x:r.x, y:r.y, w:r.width, h:r.height, hasTextLayer: !!document.querySelector('.rw-pdf__text')};
        }""")
        if not box:
            return {"method": "none", "error": "no pdf element"}
        res["box"] = box
        x0 = box["x"] + box["w"] * 0.18
        y0 = box["y"] + box["h"] * 0.22
        x1 = box["x"] + box["w"] * 0.82
        y1 = box["y"] + box["h"] * 0.34
        page.mouse.move(x0, y0)
        page.mouse.down()
        for k in range(1, 9):
            page.mouse.move(x0 + (x1 - x0) * k / 8, y0 + (y1 - y0) * k / 8)
            page.wait_for_timeout(60)
        page.mouse.up()
        page.wait_for_timeout(1200)
        res["method"] = "drag-on-" + ("text-layer" if box["hasTextLayer"] else "canvas")
        res["selection"] = page.evaluate("() => String(window.getSelection ? window.getSelection().toString() : '')")[:1000]
        res["toolbar"] = page.evaluate(r"""() => {
          const els=[...document.querySelectorAll('[class*=selbar], [class*=selection], [class*=toolbar], [class*=floating]')];
          return els.map(e=>({cls:typeof e.className==='string'?e.className.slice(0,100):'', text:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,200)}))
                    .filter(e=>e.text.length>0).slice(0,10);
        }""")
        shot(page, "06-read-selection-attempt.png")
        H.log(f"selection[{res['method']}] '{res['selection'][:80]}' toolbar={res['toolbar']}")
    except Exception as exc:  # noqa: BLE001
        res["error"] = str(exc)[:400]
        H.log("selection FAILED " + str(exc)[:200])
    return res


def ask_agent(page, question: str, tag: str, wait_ms: int = 60000) -> dict:
    res = {"question": question, "sent": False, "reply_text": "", "pane_before": "", "pane_after": "",
           "screenshots": [], "polls": []}
    try:
        before = page.evaluate(AGENT_JS).get("paneText", "")
        res["pane_before"] = before
        box = page.locator("textarea.rw-composer__input").first
        box.click()
        box.fill(question)
        page.wait_for_timeout(400)
        shot(page, f"07-agent-{tag}-typed.png")
        page.evaluate("""() => {
          const t=document.querySelector('textarea.rw-composer__input');
          if (t) { t.dispatchEvent(new Event('input',{bubbles:true})); }
        }""")
        page.wait_for_timeout(300)
        btn = page.locator("button:has-text('发送')").first
        try:
            btn.click(timeout=8000)
        except Exception:
            box.press("Enter")
        res["sent"] = True
        H.log(f"agent ask [{tag}] sent: {question[:50]}")
        start = time.time()
        stable = 0
        last = ""
        idx = 0
        while (time.time() - start) * 1000 < wait_ms:
            page.wait_for_timeout(3000)
            cur = page.evaluate(AGENT_JS)
            pane = cur.get("paneText", "")
            idx += 1
            res["polls"].append({"at": round(time.time() - start), "paneLen": len(pane)})
            if idx in (1, 2, 5, 10, 20):
                shot(page, f"07-agent-{tag}-poll{idx}.png")
                res["screenshots"].append(f"07-agent-{tag}-poll{idx}.png")
            if pane == last:
                stable += 1
                if stable >= 2 and pane != before:
                    break
            else:
                stable = 0
            last = pane
        res["pane_after"] = page.evaluate(AGENT_JS).get("paneText", "")
        res["reply_text"] = res["pane_after"] if res["pane_after"] != res["pane_before"] else ""
        shot(page, f"07-agent-{tag}-final.png")
        res["screenshots"].append(f"07-agent-{tag}-final.png")
        H.save_json(f"api/agent-{tag}.json", {"before": res["pane_before"], "after": res["pane_after"],
                                              "question": question, "polls": res["polls"]})
        H.log(f"agent reply [{tag}] len_before={len(res['pane_before'])} len_after={len(res['pane_after'])}")
    except Exception as exc:  # noqa: BLE001
        res["error"] = str(exc)[:500]
        H.log("ask_agent FAILED " + str(exc)[:300])
        try:
            shot(page, f"07-agent-{tag}-error.png")
        except Exception:
            pass
    return res


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1672, "height": 941}, device_scale_factor=1, locale="zh-CN")
        page = ctx.new_page()
        H.attach(page, ctx)

        st = H.start_step("login", "researcher 登录（真实 UI）")
        try:
            info = login(page, RESEARCH, wait_after=4000)
            st["result"] = {"url": page.url, "code": info.get("code")}
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:400]
            shot(page, "00b-login-fail.png")
            H.log("login FAIL " + str(exc)[:200])
        H.end_step(st)

        st = H.start_step("enter-workspace", "启动页点击顶栏「工作台」进入科研工作台")
        try:
            page.get_by_role("button", name="工作台").first.click(timeout=12000)
            page.wait_for_timeout(12000)
            R["workspace_url"] = page.url
            R["workspace_title"] = page.title()
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:400]
            H.log("enter workspace FAIL " + str(exc)[:250])
        H.end_step(st)
        page.wait_for_timeout(2000)
        shot(page, "06-read-initial.png")
        R["initial"] = pdf_state(page, "06-initial")

        # wait for any late render
        page.wait_for_timeout(6000)
        shot(page, "06-read-initial-plus6s.png")
        R["initial_plus6s"] = pdf_state(page, "06-initial-plus6s")

        # page navigation attempts
        st = H.start_step("read-paging", "点击 PDF 工具栏「下一页」/「上一页」")
        try:
            page.get_by_role("button", name="下一页").first.click(timeout=8000)
            page.wait_for_timeout(5000)
            shot(page, "06-read-next-page.png")
            R["next_page"] = pdf_state(page, "06-next-page")
            page.get_by_role("button", name="上一页").first.click(timeout=8000)
            page.wait_for_timeout(3000)
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:300]
        H.end_step(st)

        # zoom attempt
        st = H.start_step("read-zoom", "点击 PDF 工具栏「放大」「适宽」")
        try:
            for name in ("放大", "适宽"):
                page.get_by_role("button", name=name).first.click(timeout=8000)
                page.wait_for_timeout(2500)
            shot(page, "06-read-zoom-width.png")
            R["zoom_width"] = pdf_state(page, "06-zoom-width")
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:300]
        H.end_step(st)

        # switch to second document from the visible list
        st = H.start_step("read-switch-doc", "点击左侧文献列表第 2 篇 PDF")
        try:
            page.locator("text=research-02-formula-conditions.pdf").first.click(timeout=10000)
            page.wait_for_timeout(8000)
            shot(page, "06-read-doc2.png")
            R["doc2"] = pdf_state(page, "06-doc2")
        except Exception as exc:  # noqa: BLE001
            st["error"] = str(exc)[:400]
            H.log("switch doc FAIL " + str(exc)[:200])
        H.end_step(st)
        R["api_pdf"] = [s for s in H.state["steps"] if s["url"].lower().endswith(".pdf") or "pdf" in s["url"].lower() or "doc" in s["url"].lower()][-25:]

        # selection attempt
        st = H.start_step("read-select", "在 PDF 页面上拖选文字，检查是否有文本层/选区/浮动工具条")
        R["selection"] = try_selection(page)
        H.end_step(st)

        # Agent: quick action buttons
        st = H.start_step("agent-quick", "点击右栏 Agent 快捷能力「检查公式」「评判选中内容」")
        R["agent_before"] = agent_state(page, "07-before")
        for label in ("检查公式", "评判选中内容"):
            try:
                page.get_by_role("button", name=re.compile(label)).first.click(timeout=8000)
                page.wait_for_timeout(12000)
                shot(page, f"07-agent-quick-{label}.png")
                R[f"after_{label}"] = agent_state(page, f"07-quick-{label}")
            except Exception as exc:  # noqa: BLE001
                R[f"after_{label}"] = {"error": str(exc)[:300]}
                H.log(f"quick {label} FAIL " + str(exc)[:150])
        H.end_step(st)

        # Agent: composer question
        st = H.start_step("agent-ask", "在右栏 composer 输入问题并点击发送，记录真实回复")
        R["ask"] = ask_agent(page, "请用一句话解释这篇文献第 1 页的主要结论，并给出原文出处。", "main", wait_ms=75000)
        H.end_step(st)

        R["api_agent"] = [s for s in H.state["steps"] if "agent" in s["url"].lower() or "chat" in s["url"].lower() or "ask" in s["url"].lower()][-25:]
        H.finalize({"p02": R}, "api/steps-p02.json")
        (H.OUT / "api" / "p02-results.json").write_text(json.dumps(R, ensure_ascii=False, indent=2), encoding="utf-8")
        ctx.close()
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())