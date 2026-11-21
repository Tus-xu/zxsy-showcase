# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-read")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/research")
    s.page.wait_for_timeout(1400)
    s.page.get_by_role("button", name="进入阅读", exact=True).first.click()
    s.page.wait_for_timeout(1800)
    s.take("read-workspace")
    print("URL:", s.page.url)
    print("BODY:\n", s.body()[:4500])
    print("\nVISIBLE:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('button,input,[class*=page],[class*=para],[class*=selection],[class*=agent],[class*=note],[class*=tool]')).filter(e=>e.offsetParent!==null).map(e=>(e.tagName+'.'+(e.className||'').toString().slice(0,50)+':'+(e.innerText||e.value||'').trim().replace(/\\s+/g,' ').slice(0,70))).slice(0,160)"""), ensure_ascii=False)[:8000])
    s.dump_ui("read", RESULT + r"\_ui-read.json")
finally:
    s.finish()
