# -*- coding: utf-8 -*-
import sys, os
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-B2")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/student/guide/B")
    s.page.wait_for_timeout(1500)
    inp = s.page.locator("input.guide__input")
    def send(txt, wait=2300):
        inp.fill(txt)
        s.page.locator("button:has-text('发送')").last.click()
        s.page.wait_for_timeout(wait)
        b = s.body()
        # last assistant messages: take tail
        print(f"\n===== SENT: {txt}\nPH: {inp.get_attribute('placeholder')}\nTAIL:\n", b[-1100:])
        print("CHOICES:", s.page.locator("button.guide__choice").count())
    send("正三角形；D 是 BC 中点，所以 AD⊥BC")
    s.take("B-step1")
    send("AA₁⊥底面 ABC，所以 AA₁⊥BC，又 AD⊥BC，AD∩AA₁=A，所以 BC⊥平面 AA₁D")
    s.take("B-step2")
finally:
    s.finish()
