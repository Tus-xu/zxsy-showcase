# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-write")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/research/read?project=p-fem")
    s.page.wait_for_timeout(1800)
    s.page.get_by_role("button", name="写作", exact=True).click()
    s.page.wait_for_timeout(2000)
    s.take("write-workspace")
    print("URL:", s.page.url)
    print("BODY:\n", s.body()[:4500])
    print("\nVISIBLE:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('button,input,textarea,select,[class*=file],[class*=log],[class*=editor],[class*=compile]')).filter(e=>e.offsetParent!==null).map(e=>(e.tagName+'.'+(e.className||'').toString().slice(0,50)+':'+(e.innerText||e.value||'').trim().replace(/\\s+/g,' ').slice(0,70))).slice(0,140)"""), ensure_ascii=False)[:8000])
    s.dump_ui("write", RESULT + r"\_ui-write.json")
finally:
    s.finish()
