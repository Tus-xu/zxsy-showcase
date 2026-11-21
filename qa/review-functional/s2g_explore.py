# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

EXPORTS = os.path.join(BASE, "exports")
os.makedirs(EXPORTS, exist_ok=True)

s = Session("explore-export")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/teacher/prep/w/prep-ellipse/ppt")
    s.page.wait_for_timeout(1800)
    # PPTX
    with s.page.expect_download() as dl:
        s.page.get_by_role("button", name="导出 PPTX").click()
    d = dl.value
    p1 = os.path.join(EXPORTS, d.suggested_filename)
    d.save_as(p1)
    print("PPTX download:", d.suggested_filename, os.path.getsize(p1))
    s.page.wait_for_timeout(1200)
    s.take("after-export-pptx")
    print("BODY TAIL after pptx:", s.body()[-500:])
    # PDF
    with s.page.expect_download() as dl2:
        s.page.get_by_role("button", name="导出 PDF").click()
    d2 = dl2.value
    p2 = os.path.join(EXPORTS, d2.suggested_filename)
    d2.save_as(p2)
    print("PDF download:", d2.suggested_filename, os.path.getsize(p2))
    s.page.wait_for_timeout(1200)
    # publish
    s.page.get_by_role("button", name="发布课堂").click()
    s.page.wait_for_timeout(1000)
    s.take("publish-dialog")
    print("\nBODY TAIL after publish click:\n", s.body()[-1600:])
    print("\nDIALOGS:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('[class*=modal],[class*=dialog],[class*=publish],[role=dialog]')).filter(e=>e.offsetParent!==null).map(e=>({cls:(e.className||'').toString().slice(0,80),txt:(e.innerText||'').slice(0,600)}))"""), ensure_ascii=False)[:4000])
finally:
    s.finish()
