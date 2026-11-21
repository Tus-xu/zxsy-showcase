# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-params")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/teacher/prep/w/prep-ellipse/ppt")
    s.page.wait_for_timeout(1600)
    # find property inputs
    inp = s.page.locator("aside.property-panel input")
    print("PROP INPUTS:", inp.count(), [inp.nth(i).input_value() for i in range(inp.count())])
    def canvas_text():
        return s.page.locator(".slide-canvas").inner_text()
    print("\nCANVAS BEFORE:\n", canvas_text()[:1500])
    inp.nth(0).fill("6"); inp.nth(0).press("Enter"); s.page.wait_for_timeout(800)
    inp.nth(1).fill("4"); inp.nth(1).press("Enter"); s.page.wait_for_timeout(1200)
    s.take("params-a6b4")
    print("\nCANVAS AFTER:\n", canvas_text()[:1500])
    print("\nPANEL AFTER:\n", s.page.locator("aside.property-panel").inner_text()[:1200])
    print("\nBODY TAIL:\n", s.body()[-1200:])
    # title edit
    t = s.page.locator("input.sc-title-input")
    print("\nTITLE INPUT:", t.count(), t.input_value())
    t.fill("椭圆的定义（演示修订版）")
    t.press("Enter")
    s.page.wait_for_timeout(900)
    s.take("title-edited")
    print("AFTER TITLE EDIT BODY TAIL:\n", s.body()[-900:])
    print("\nVISIBLE BUTTONS:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('button')).filter(e=>e.offsetParent!==null).map(e=>(e.className||'')+':'+(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,20)).filter(x=>/保存|save|草稿/u.test(x)||true).slice(0,80)"""), ensure_ascii=False)[:4000])
    s.dump_ui("ppt-edited", RESULT + r"\_ui-ppt-edited.json")
finally:
    s.finish()
