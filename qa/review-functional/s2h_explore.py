# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

EXPORTS = os.path.join(BASE, "exports")
os.makedirs(EXPORTS, exist_ok=True)

s = Session("explore-publish")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/teacher/prep/w/prep-ellipse/ppt")
    s.page.wait_for_timeout(1800)
    s.page.get_by_role("button", name="发布课堂").click()
    s.page.wait_for_timeout(900)
    s.take("publish-ready")
    s.page.get_by_role("button", name="开始发布").click()
    s.page.wait_for_timeout(2500)
    s.take("publish-success")
    print("AFTER PUBLISH BODY TAIL:\n", s.body()[-1800:])
    print("\nDIALOGS:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('[class*=modal],[class*=dialog],[class*=publish],[role=dialog]')).filter(e=>e.offsetParent!==null).map(e=>({cls:(e.className||'').toString().slice(0,80),txt:(e.innerText||'').slice(0,800)}))"""), ensure_ascii=False)[:3000])
    # lesson plan tab
    s.page.get_by_role("button", name="教案", exact=True).click()
    s.page.wait_for_timeout(1800)
    s.take("lessonplan-tab")
    print("\nLESSON BODY:\n", s.body()[:3500])
    print("\nLESSON BTNS:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('button')).filter(e=>e.offsetParent!==null).map(e=>(e.className||'')+':'+(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,40)).slice(0,60)"""), ensure_ascii=False)[:3000])
    s.dump_ui("lessonplan", RESULT + r"\_ui-lessonplan.json")
finally:
    s.finish()
