# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-read3")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/research/read?project=p-fem")
    s.page.wait_for_timeout(2000)
    s.page.get_by_text("定理 2.1（Céa 引理）", exact=False).first.click()
    s.page.wait_for_timeout(700)
    s.page.locator(".selbar__btn--primary").click()
    s.page.wait_for_timeout(2600)
    s.take("read-answer")
    print("BODY TAIL:\n", s.body()[-3000:])
    print("\nVISIBLE BUTTONS:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('button')).filter(e=>e.offsetParent!==null).map(e=>(e.className||'')+' :: '+(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,60)).slice(-40)"""), ensure_ascii=False)[:5000])
    s.dump_ui("read-answer", RESULT + r"\_ui-read-answer.json")
finally:
    s.finish()
