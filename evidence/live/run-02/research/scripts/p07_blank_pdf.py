# -*- coding: utf-8 -*-
"""P07: blank-PDF diagnostic — all console messages while loading a CID-font PDF,
full-text search comparison (CID vs embedded-font PDF), note -> locate original text,
quote-from-selection into composer.
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
CONSOLE: list = []

PDF_JS = r"""
() => {
  const clean = s => (s||'').replace(/\s+/g,' ').trim();
  const q = s => [...document.querySelectorAll(s)];
  const canvases = q('canvas').map((c,i) => {
    const out = {i, w:c.width, h:c.height, cls: typeof c.className==='string'?c.className:''};
    try { const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let nw=0,tot=0; const st=4*11;
      for(let p=0;p<d.length;p+=st){const r=d[p],g=d[p+1],b=d[p+2],a=d[p+3];tot++;if(a>8&&(r<245||g<245||b<245))nw++;}
      out.nonWhiteRatio = tot?+(nw/tot).toFixed(4):0; } catch(e){out.error=String(e).slice(0,120);}
    return out;
  });
  const tl = q('.rw-pdf__text').map(el=>({spans:el.querySelectorAll('span').length, len:clean(el.innerText).length,
      sample: clean(el.innerText).slice(0,120)}));
  return {
    url: location.href, title: document.title,
    canvases, textLayers: tl,
    pageTotal: clean((document.querySelector('.rw-ptb')||{}).innerText||''),
    pageInput: (document.querySelector('.rw-ptb__pageinput')||{}).value,
    searchbar: clean((document.querySelector('.rw-ptb__searchbar')||{}).innerText||''),
    marks: q('.rw-pdf__mark').map(e=>e.className),
    notes: q('.rw-notes__item').map(e=>clean(e.innerText).slice(0,200)),
    noteCount: q('.rw-notes__item').length,
    toast: clean((document.querySelector('.rw-read__toast, .rw-toast')||{}).innerText||''),
    selection: String(window.getSelection ? window.getSelection().toString() : '').slice(0,300),
    composerValue: ((document.querySelector('textarea.rw-composer__input')||{}).value||'').slice(0,300),
    bodyText: (document.body.innerText||'').slice(0,20000),
  };
}
"""


def snap(page, tag: str, shot_name: str | None = None) -> dict:
    d = page.evaluate(PDF_JS)
    d["tag"] = tag
    d["t"] = time.strftime("%H:%M:%S")
    d["console_since_mark"] = list(CONSOLE)
    CONSOLE.clear()
    H.save_json(f"api/pdf-{tag}.json", d)
    if shot_name:
        H.shot(page, shot_name, full=False)
    H.log(f"[{tag}] page={d['pageInput']!r} textLayers={d['textLayers']} canvases={json.dumps(d['canvases'])} "
          f"searchbar={d['searchbar']!r} marks={len(d['marks'])} console={len(d['console_since_mark'])}")
    return d


def switch_paper(page, title_part: str) -> bool:
    try:
        page.get_by_role("button", name=re.compile(title_part)).first.click(timeout=10000)
        page.wait_for_timeout(10000)
        return True
    except Exception as exc:  # noqa: BLE001
        H.log(f"switch to {title_part} FAIL " + str(exc)[:150])
        return False


def search(page, query: str) -> dict:
    out = {}
    try:
        page.get_by_role("button", name="全文搜索").first.click(timeout=8000)
        page.wait_for_timeout(800)
        page.locator(".rw-ptb__search-input").fill(query)
        page.wait_for_timeout(6000)
        out = {"query": query,
               "searchbar": page.evaluate("() => (document.querySelector('.rw-ptb__searchbar')||{}).innerText||''"),
               "marks": page.evaluate("() => [...document.querySelectorAll('.rw-pdf__mark')].map(e=>e.className)"),
               "toolbar": page.evaluate("() => (document.querySelector('.rw-ptb')||{}).innerText||''")}
        H.log(f"search[{query}] {out['searchbar']!r} marks={len(out['marks'])}")
        try:
            page.get_by_role("button", name="全文搜索").first.click(timeout=6000)
            page.wait_for_timeout(800)
        except Exception:
            pass
    except Exception as exc:  # noqa: BLE001
        out = {"query": query, "error": str(exc)[:300]}
    return out


def main() -> int:
    with sync_playwright() as p:
        browser, ctx, page = S.open_page(p)
        # capture all console messages + pdf-related requests
        page.on("console", lambda m: CONSOLE.append({"type": m.type, "text": (m.text or "")[:500]}))
        reqs: list = []
        page.on("request", lambda r: reqs.append({"method": r.method, "url": r.url[:200], "type": r.resource_type})
                if ("worker" in r.url or "pdf" in r.url.lower() or "cmap" in r.url.lower()) else None)

        stp = H.start_step("open-read", "打开阅读工作区（复用会话）")
        try:
            page.goto(f"{BASE}/research-workspace/{PID}/read", wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(12000)
            R["open"] = {"url": page.url, "title": page.title()}
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:400]
        H.end_step(stp)
        R["initial"] = snap(page, "16-initial", "16-read-initial.png")

        # ---------- CID-font PDF: research-01-cea-lemma.pdf ----------
        stp = H.start_step("cid-pdf", "打开 CID 字体 PDF research-01-cea-lemma.pdf，记录全部 console 与搜索")
        CONSOLE.clear()
        ok = switch_paper(page, "research-01-cea-lemma")
        page.wait_for_timeout(8000)
        R["cid"] = snap(page, "16-cid", "16-read-cid-blank.png")
        R["cid"]["search"] = search(page, "演示")
        R["cid"]["console_after_search"] = list(CONSOLE)
        CONSOLE.clear()
        H.shot(page, "16-read-cid-search.png", full=False)
        H.end_step(stp)

        # ---------- embedded-font PDF: research-paper-1.pdf ----------
        stp = H.start_step("embedded-pdf", "打开内嵌字体 PDF research-paper-1.pdf，同样搜索对照")
        CONSOLE.clear()
        ok2 = switch_paper(page, "research-paper-1")
        page.wait_for_timeout(8000)
        R["embedded"] = snap(page, "16-embedded", "16-read-embedded.png")
        R["embedded"]["search"] = search(page, "变分")
        R["embedded"]["console_after_search"] = list(CONSOLE)
        CONSOLE.clear()
        H.shot(page, "16-read-embedded-search.png", full=False)
        H.end_step(stp)

        # ---------- note -> locate original text ----------
        stp = H.start_step("note-locate", "点击「最近笔记」条目，检查是否回到原文页并出现定位高亮")
        try:
            before = page.evaluate("() => ({page: (document.querySelector('.rw-ptb__pageinput')||{}).value, marks: document.querySelectorAll('.rw-pdf__mark').length})")
            page.locator(".rw-notes__item").first.click(timeout=10000)
            page.wait_for_timeout(5000)
            after = page.evaluate("() => ({page: (document.querySelector('.rw-ptb__pageinput')||{}).value, marks: document.querySelectorAll('.rw-pdf__mark').length, markCls: [...document.querySelectorAll('.rw-pdf__mark')].map(e=>e.className)})")
            R["note_locate"] = {"before": before, "after": after}
            H.shot(page, "16-note-locate.png", full=False)
            H.log("note locate " + json.dumps(R["note_locate"], ensure_ascii=False))
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:400]
            H.log("note locate FAIL " + str(exc)[:200])
        H.end_step(stp)

        # ---------- selection -> 引用 inserts quote into composer ----------
        stp = H.start_step("selection-quote", "在可渲染 PDF 上选中文字 → 工具条「引用」→ 检查 composer 是否插入原文")
        try:
            box = page.evaluate("""() => {
              const el = document.querySelector('.rw-pdf__text');
              if (!el) return null;
              const r = el.getBoundingClientRect();
              return {x:r.x, y:r.y, w:r.width, h:r.height};
            }""")
            if box:
                x0 = box["x"] + box["w"] * 0.18
                y0 = box["y"] + box["h"] * 0.25
                x1 = box["x"] + box["w"] * 0.80
                y1 = box["y"] + box["h"] * 0.35
                page.mouse.move(x0, y0)
                page.mouse.down()
                for k in range(1, 9):
                    page.mouse.move(x0 + (x1 - x0) * k / 8, y0 + (y1 - y0) * k / 8)
                    page.wait_for_timeout(60)
                page.mouse.up()
                page.wait_for_timeout(1200)
                sel = page.evaluate("() => String(window.getSelection ? window.getSelection().toString() : '').slice(0,500)")
                R["selection_quote"] = {"selection": sel}
                H.shot(page, "16-selection-bar.png", full=False)
                # click 引用 in selection toolbar
                page.locator(".rw-selbar__btn", has_text="引用").first.click(timeout=6000)
                page.wait_for_timeout(1500)
                R["selection_quote"]["composer_after"] = page.evaluate("() => (document.querySelector('textarea.rw-composer__input')||{}).value||''")
                R["selection_quote"]["toast"] = page.evaluate("() => (document.querySelector('.rw-read__toast, .rw-toast')||{}).innerText||''")
                H.shot(page, "16-selection-quote.png", full=False)
                H.log("selection quote composer=" + R["selection_quote"]["composer_after"][:160])
            else:
                R["selection_quote"] = {"error": "no text layer"}
        except Exception as exc:  # noqa: BLE001
            stp["error"] = str(exc)[:400]
            H.log("selection quote FAIL " + str(exc)[:200])
        H.end_step(stp)

        R["pdf_requests"] = [r for r in reqs if "worker" in r["url"] or "cmap" in r["url"].lower() or ".pdf" in r["url"].lower()]
        R["all_pdf_related_request_count"] = len(R["pdf_requests"])
        R["console_all"] = []
        H.finalize({"p07": {k: v for k, v in R.items() if k not in ("console_all",)}}, "api/steps-p07.json")
        (H.OUT / "api" / "p07-results.json").write_text(json.dumps(R, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
        S.save_state(ctx)
        ctx.close()
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())