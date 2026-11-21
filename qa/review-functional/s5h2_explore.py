# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-formula3")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/research/read?project=p-fem")
    s.page.wait_for_timeout(2200)
    heads = s.page.evaluate("""() => Array.from(document.querySelectorAll('.acc__head')).map(e=>(e.tagName+':'+e.innerText.trim().replace(/\\s+/g,' ')))""")
    print("HEADS:", heads)
    s.page.locator(".acc__head").nth(3).click()
    s.page.wait_for_timeout(900)
    print("TABS:", s.page.evaluate("""() => Array.from(document.querySelectorAll('.fc__tab')).map(e=>e.innerText.trim())"""))
    print("FORMULA PANEL:", s.page.locator(".agent__scroll, .agent").last.inner_text()[-1800:])
    for i in [1,2]:
        s.page.locator(".fc__tab").nth(i).click()
        s.page.wait_for_timeout(700)
        s.take(f"formula-case{i+1}")
        print(f"\n===== CASE {i+1} =====")
        print(s.page.locator(".agent").inner_text()[-2000:])
finally:
    s.finish()
