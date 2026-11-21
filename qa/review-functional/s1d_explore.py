# -*- coding: utf-8 -*-
import sys, os
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-A2")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/student/guide/A")
    s.page.wait_for_timeout(1500)
    inp = s.page.locator("input.guide__input")
    definp = s.page.evaluate("""() => Array.from(document.querySelectorAll('input,textarea,button')).filter(e=>e.offsetParent!==null).map(e=>({tag:e.tagName,cls:e.className,ph:e.placeholder||'',txt:(e.innerText||'').slice(0,40),type:e.type||''}))""")
    print("VISIBLE INPUTS:", definp)
    def send(txt, wait=2200):
        inp.fill(txt)
        s.page.locator("button:has-text('发送')").last.click()
        s.page.wait_for_timeout(wait)
        print(f"\n===== SENT: {txt}\nTAIL:\n", s.body()[-900:])
    send("2√2", 2600)
    s.take("A-after-e")
    s.dump_ui("A-choice2", RESULT + r"\_ui-A-choice2.json")
    # dump visible buttons
    print("BTNS:", s.page.evaluate("""() => Array.from(document.querySelectorAll('button')).filter(e=>e.offsetParent!==null).map(e=>({cls:e.className,txt:(e.innerText||'').trim().slice(0,60),ph:0}))"""))
finally:
    s.finish()
