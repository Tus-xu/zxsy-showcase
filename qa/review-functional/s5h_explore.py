# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-formula2")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/research/read?project=p-fem")
    s.page.wait_for_timeout(2000)
    s.page.locator("button.acc__head", has_text="公式检查").click()
    s.page.wait_for_timeout(700)
    for i in [1,2]:
        s.page.locator("button.fc__tab").nth(i).click()
        s.page.wait_for_timeout(600)
        s.take(f"formula-case{i+1}")
        print(f"\n===== CASE {i+1} =====")
        print(s.page.locator("% 公式检查".replace("% ","")).inner_text() if False else "")
        # print only accordion content
        print(s.page.locator(".fc, .fc__body, [class*=fc]").first.inner_text()[:2200] if s.page.locator(".fc").count() else s.page.locator(".agent").inner_text()[-1800:])
    # also click 引用此结论 / 加入笔记 maybe
    print("\nAGENT BTNS:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('.agent button')).filter(e=>e.offsetParent!==null).map(e=>(e.className||'')+':'+(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,50))"""), ensure_ascii=False)[:3000])
finally:
    s.finish()
