# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-C2")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/student/guide/C")
    s.page.wait_for_timeout(1500)
    inp = s.page.locator("input.guide__input")
    def send(txt, wait=2300):
        ph = inp.get_attribute("placeholder") if inp.count() else "(no input)"
        inp.fill(txt)
        s.page.locator("button:has-text('发送')").last.click()
        s.page.wait_for_timeout(wait)
        b = s.body()
        print(f"\n===== SENT: {txt}  [prev ph: {ph}]\nTAIL:\n", b[-900:])
    send("2")
    s.take("C-step1")
    send("X=1,2,3")
    s.take("C-step2")
finally:
    s.finish()
