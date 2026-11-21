# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-B3")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/student/guide/B")
    s.page.wait_for_timeout(1800)
    s.take("B-current")
    print("BODY TAIL:\n", s.body()[-2200:])
    print("\nVISIBLE:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('input,textarea,button,[class*=choice],[class*=option],[class*=step]')).filter(e=>e.offsetParent!==null).map(e=>({tag:e.tagName,cls:(e.className||'').toString().slice(0,50),ph:e.placeholder||'',txt:(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,80)}))"""), ensure_ascii=False))
finally:
    s.finish()
