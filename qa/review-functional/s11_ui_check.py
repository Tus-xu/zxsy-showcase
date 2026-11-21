# -*- coding: utf-8 -*-
"""检查 PPT UI 是否注明 c 精度/自动保存，以及是否仍有“保存”按钮"""
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
import h
h.ENTRY = r"C:\Users\徐超\AppData\Local\Temp\ms-final-recheck\开始演示.html"
h.PROFILE = r"D:\zxsy-math-arena-showcase\qa\review-functional\_profile-recheck"
s = h.Session("s-recheck-ui")
try:
    s.goto("#/login")
    s.click_text("教师 · 张老师"); s.page.wait_for_timeout(1500)
    s.goto("#/teacher/prep/w/prep-ellipse/ppt"); s.page.wait_for_timeout(1800)
    s.page.locator(".slide-row").nth(2).click(); s.page.wait_for_timeout(800)
    panel = s.page.locator("aside.property-panel").inner_text()
    print("PANEL:", panel[:900])
    btnnames = s.page.evaluate("""() => Array.from(document.querySelectorAll('button')).filter(e=>e.offsetParent!==null).map(e=>e.innerText.trim()).filter(x=>x.includes('保存')||x.includes('精度')||x.includes('小数'))""")
    print("SAVE/PRECISION BTNS:", btnnames)
    # title/aria attributes mentioning 精度/小数/保留
    tips = s.page.evaluate("""() => Array.from(document.querySelectorAll('[title],[aria-label]')).map(e=>(e.getAttribute('title')||e.getAttribute('aria-label'))).filter(t=>t && (t.includes('精度')||t.includes('小数')||t.includes('保留')||t.includes('自动保存')))""")
    print("TIPS:", tips)
    body = s.body()
    for k in ["精度", "小数", "自动保存", "保留两位", "保留一位"]:
        print(f"body contains {k}:", k in body)
finally:
    s.finish()
