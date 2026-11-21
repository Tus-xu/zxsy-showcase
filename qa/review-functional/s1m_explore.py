# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-C3")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/student/guide/C")
    s.page.wait_for_timeout(1500)
    inp = s.page.locator("input.guide__input")
    def send(txt, wait=2400):
        ph = inp.get_attribute("placeholder")
        inp.fill(txt)
        s.page.locator("button:has-text('发送')").last.click()
        s.page.wait_for_timeout(wait)
        print(f"\n===== SENT: {txt}  [prev ph: {ph}]\nTAIL:\n", s.body()[-850:])
    send("一次没取到 4/5，三次都没取到 (4/5)^3=64/125")
    s.take("C-step2ok")
    send("61/125")
    s.take("C-step3")
    send("61/25")
    s.take("C-step4")
finally:
    s.finish()
