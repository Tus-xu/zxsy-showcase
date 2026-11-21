# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-B4")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/student/guide/B")
    s.page.wait_for_timeout(1500)
    # choose B only
    ch = s.page.locator("button.guide__choice")
    for i in range(ch.count()):
        t = ch.nth(i).inner_text()
        if t.strip().startswith("B"):
            ch.nth(i).click(); break
    s.page.wait_for_timeout(300)
    s.page.locator("button:has-text('提交')").last.click()
    s.page.wait_for_timeout(2600)
    s.take("B-after-B-only")
    print("TAIL:\n", s.body()[-1600:])
    print("\nVISIBLE:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('input,textarea,button')).filter(e=>e.offsetParent!==null).map(e=>({tag:e.tagName,cls:(e.className||'').toString().slice(0,50),ph:e.placeholder||'',txt:(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,90)})).slice(-12)"""), ensure_ascii=False))
finally:
    s.finish()
