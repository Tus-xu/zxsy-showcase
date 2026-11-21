# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-B5")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/student/guide/B")
    s.page.wait_for_timeout(1500)
    ch = s.page.locator("button.guide__choice")
    for i in range(ch.count()):
        if ch.nth(i).inner_text().strip().startswith("B"):
            ch.nth(i).click(); break
    s.page.locator("button:has-text('提交（多选）')").click()
    s.page.wait_for_timeout(2500)
    s.take("B-multi-onlyB")
    print("TAIL-AFTER-ONLY-B:\n", s.body()[-1400:])
    # now select D and resubmit
    print("\nCHOICE-BTNS:", [ch.nth(i).inner_text()[:12] for i in range(ch.count())])
    for i in range(ch.count()):
        if ch.nth(i).inner_text().strip().startswith("D"):
            ch.nth(i).click(); break
    s.page.locator("button:has-text('提交')").last.click()
    s.page.wait_for_timeout(2600)
    s.take("B-conclusion")
    print("\nTAIL-AFTER-BD:\n", s.body()[-1600:])
finally:
    s.finish()
