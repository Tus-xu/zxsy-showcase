# -*- coding: utf-8 -*-
import sys, os
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-A3")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/student/guide/A")
    s.page.wait_for_timeout(1500)
    print("CHOICES:", s.page.locator("button.guide__choice").count())
    s.page.locator("button.guide__choice").nth(3).click()
    s.page.wait_for_timeout(300)
    s.take("A-selected-D")
    s.page.locator("button:has-text('提交')").last.click()
    s.page.wait_for_timeout(3000)
    s.take("A-conclusion")
    print("TAIL:\n", s.body()[-2600:])
    print("BTNS:", s.page.evaluate("""() => Array.from(document.querySelectorAll('button')).filter(e=>e.offsetParent!==null).map(e=>e.className+' :: '+(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,50))"""))
    # refresh
    s.page.reload()
    s.page.wait_for_timeout(2500)
    s.take("A-after-refresh")
    print("\nAFTER REFRESH URL:", s.page.url)
    b = s.body()
    print("AFTER REFRESH TAIL:\n", b[-1800:])
    print("HAS CONCLUSION:", "已完成本题" in b, "| HAS D:", "D" in b)
finally:
    s.finish()
