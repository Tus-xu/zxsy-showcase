# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-dual")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/student/classroom")
    s.page.wait_for_timeout(1500)
    s.page.locator("button.deck-task").first.click()
    s.page.wait_for_timeout(2500)
    s.take("dual-page1")
    print("URL:", s.page.url)
    print("BODY:\n", s.body()[:4500])
    print("\nVISIBLE:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('button,input,[class*=page],[class*=slide],[class*=progress],[class*=teach]')).filter(e=>e.offsetParent!==null).map(e=>(e.tagName+'.'+(e.className||'')+':'+(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,80))).slice(0,140)"""), ensure_ascii=False)[:7000])
    s.dump_ui("dual", RESULT + r"\_ui-dual.json")
finally:
    s.finish()
