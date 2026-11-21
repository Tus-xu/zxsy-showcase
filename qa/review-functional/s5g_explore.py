# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-formula")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/research/read?project=p-fem")
    s.page.wait_for_timeout(2000)
    # expand 公式检查 accordion
    s.page.get_by_role("button", name="% 公式检查 3").click() if s.page.get_by_role("button", name="% 公式检查 3").count() else None
    s.page.wait_for_timeout(700)
    print("AFTER EXPAND:", s.page.locator(".agent").inner_text()[:2500])
    s.take("formula-expanded")
    btns = s.page.evaluate("""() => Array.from(document.querySelectorAll('.agent button')).filter(e=>e.offsetParent!==null).map(e=>(e.className||'')+':'+(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,70))""")
    print("\nAGENT BTNS:", json.dumps(btns, ensure_ascii=False)[:4000])
finally:
    s.finish()
