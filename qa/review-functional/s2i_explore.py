# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

EXPORTS = os.path.join(BASE, "exports")
os.makedirs(EXPORTS, exist_ok=True)

s = Session("explore-lesson")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/teacher/prep/w/prep-ellipse/ppt")
    s.page.wait_for_timeout(1800)
    # close any publish dialog if present
    if s.page.get_by_role("button", name="完成", exact=True).count():
        try:
            s.page.get_by_role("button", name="完成", exact=True).click()
            s.page.wait_for_timeout(600)
        except Exception as e:
            print("close err", e)
    s.page.locator("nav.pw-tabs button", has_text="教案").click()
    s.page.wait_for_timeout(1800)
    s.take("lessonplan-tab")
    print("URL:", s.page.url)
    print("LESSON BODY:\n", s.body()[:4200])
    print("\nVISIBLE:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('button,input,textarea')).filter(e=>e.offsetParent!==null).map(e=>(e.tagName+'.'+(e.className||'')+':'+(e.innerText||e.value||'').trim().replace(/\\s+/g,' ').slice(0,50))).slice(0,80)"""), ensure_ascii=False)[:5000])
    s.dump_ui("lessonplan", RESULT + r"\_ui-lessonplan.json")
finally:
    s.finish()
