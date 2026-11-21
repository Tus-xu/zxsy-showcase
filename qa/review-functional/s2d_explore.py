# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-ppt")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/teacher/prep/w/prep-ellipse/classroom")
    s.page.wait_for_timeout(1500)
    s.page.locator("nav.pw-tabs button", has_text="PPT").click()
    s.page.wait_for_timeout(1500)
    s.take("ppt-tab")
    print("URL:", s.page.url)
    print("BODY:\n", s.body()[:4000])
    print("\nVISIBLE:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('button,input,textarea,select,[class*=tabs],[class*=thumb],[class*=slide],[class*=prop]')).filter(e=>e.offsetParent!==null).map(e=>({tag:e.tagName,cls:(e.className||'').toString().slice(0,60),txt:(e.innerText||e.value||e.placeholder||'').trim().replace(/\\s+/g,' ').slice(0,100),ph:e.placeholder||''})).slice(0,200)"""), ensure_ascii=False)[:10000])
    s.dump_ui("ppt", RESULT + r"\_ui-ppt.json")
finally:
    s.finish()
