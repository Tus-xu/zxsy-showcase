# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-research")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/login")
    s.page.wait_for_timeout(1200)
    s.page.keyboard.press("Control+Shift+H")
    s.page.wait_for_timeout(600)
    s.page.get_by_role("button", name="科研端", exact=True).click()
    s.page.wait_for_timeout(1800)
    s.take("research-home")
    print("URL:", s.page.url)
    print("BODY:\n", s.body()[:4000])
    print("\nVISIBLE:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('button,a,[class*=card],[class*=nav],[class*=proj]')).filter(e=>e.offsetParent!==null).map(e=>(e.tagName+'.'+(e.className||'')+':'+(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,90))).slice(0,120)"""), ensure_ascii=False)[:6000])
    s.dump_ui("research-home", RESULT + r"\_ui-research-home.json")
finally:
    s.finish()
