# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-teacher2")
try:
    # teacher classroom monitor
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/teacher/classroom")
    s.page.wait_for_timeout(1600)
    s.take("teacher-classroom")
    print("=== TEACHER CLASSROOM === URL:", s.page.url)
    print(s.body()[:2600])
    s.dump_ui("teacher-classroom", RESULT + r"\_ui-teacher-classroom.json")
    # grading
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/teacher/grading")
    s.page.wait_for_timeout(1600)
    s.take("teacher-grading")
    print("\n=== TEACHER GRADING === URL:", s.page.url)
    print(s.body()[:3200])
    print("\nVISIBLE:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('button,input,textarea,[class*=submission],[class*=queue],[class*=grade]')).filter(e=>e.offsetParent!==null).map(e=>(e.tagName+'.'+(e.className||'')+':'+(e.innerText||e.value||'').trim().replace(/\\s+/g,' ').slice(0,80))).slice(0,120)"""), ensure_ascii=False)[:6000])
    s.dump_ui("teacher-grading", RESULT + r"\_ui-teacher-grading.json")
finally:
    s.finish()
