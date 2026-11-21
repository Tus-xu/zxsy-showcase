# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-read2")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/research/read?project=p-fem")
    s.page.wait_for_timeout(2000)
    els = s.page.evaluate("""() => Array.from(document.querySelectorAll('.pdfpage *')).filter(e=>e.children.length===0 && (e.innerText||'').trim().length>8).slice(0,80).map(e=>({tag:e.tagName,cls:(e.className||'').toString().slice(0,50),txt:(e.innerText||'').trim().slice(0,70)}))""")
    print(json.dumps(els, ensure_ascii=False, indent=1)[:6000])
    # try click on theorem text
    s.page.get_by_text("定理 2.1（Céa 引理）", exact=False).first.click()
    s.page.wait_for_timeout(900)
    s.take("read-selected")
    print("\nAFTER CLICK BODY TAIL:\n", s.body()[-1600:])
    print("\nFLOAT:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('[class*=float],[class*=select],[class*=selbar],[class*=toolbar2],[class*=pop]')).filter(e=>e.offsetParent!==null).map(e=>({cls:(e.className||'').toString().slice(0,60),txt:(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,200)})).slice(0,20)"""), ensure_ascii=False)[:3000])
finally:
    s.finish()
