# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-teacher")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/login")
    s.page.wait_for_timeout(1200)
    s.page.keyboard.press("Control+Shift+H")
    s.page.wait_for_timeout(700)
    s.page.get_by_role("button", name="教师端", exact=True).click()
    s.page.wait_for_timeout(1500)
    s.take("teacher-home")
    print("URL:", s.page.url)
    print("BODY:\n", s.body()[:2400])
    print("\nCLICKABLE:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('button,a,[class*=card],[class*=item],[class*=nav]')).filter(e=>e.offsetParent!==null).map(e=>({tag:e.tagName,cls:(e.className||'').toString().slice(0,60),txt:(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,80)})).slice(0,120)"""), ensure_ascii=False)[:5000])
    s.dump_ui("teacher-home", RESULT + r"\_ui-teacher-home.json")
finally:
    s.finish()
