# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-workbench")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/teacher/prep")
    s.page.wait_for_timeout(1500)
    s.page.locator("button.lesson-card").first.click()
    s.page.wait_for_timeout(2000)
    s.take("workbench")
    print("URL:", s.page.url)
    print("BODY:\n", s.body()[:4200])
    print("\nVISIBLE:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('button,input,textarea,select,[class*=tab],[class*=thumb],[class*=slide]')).filter(e=>e.offsetParent!==null).map(e=>({tag:e.tagName,cls:(e.className||'').toString().slice(0,60),txt:(e.innerText||e.value||e.placeholder||'').trim().replace(/\\s+/g,' ').slice(0,90),ph:e.placeholder||''})).slice(0,150)"""), ensure_ascii=False)[:8000])
    s.dump_ui("workbench", RESULT + r"\_ui-workbench.json")
finally:
    s.finish()
