# -*- coding: utf-8 -*-
import sys, os
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-A")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/student/guide/A")
    s.page.wait_for_timeout(1500)
    inp = s.page.locator("input.guide__input")

    def send(txt, wait=2200):
        inp.fill(txt)
        s.page.locator("button:has-text('发送')").last.click()
        s.page.wait_for_timeout(wait)
        tail = s.body()
        print(f"\n===== SENT: {txt}\nTAIL:\n", tail[-1800:])
        print("SHOTS ...")
    send("我选 C，因为比值就是 √7", 2600)
    s.take("A-wrong")
    # click hint
    s.click_btn("🙋 给个提示")
    s.page.wait_for_timeout(1500)
    print("\n===== HINT TAIL:\n", s.body()[-1500:])
    s.take("A-hint")
    send("2b=√7·2a，所以 b/a=√7")
    s.take("A-step2")
    send("c²=a²+b²")
    s.take("A-step3")
    send("8")
    s.take("A-step4")
    print("\nFULL BODY:\n", s.body()[-3000:])
    s.dump_ui("A-choice", RESULT + r"\_ui-A-choice.json")
finally:
    s.finish()
