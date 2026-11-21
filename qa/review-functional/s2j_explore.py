# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

EXPORTS = os.path.join(BASE, "exports")
os.makedirs(EXPORTS, exist_ok=True)

s = Session("explore-lesson-export")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/teacher/prep/w/prep-ellipse/plan")
    s.page.wait_for_timeout(1800)
    for label in ["导出 DOCX", "导出 Markdown"]:
        with s.page.expect_download() as dl:
            s.page.get_by_role("button", name=label).click()
        d = dl.value
        p = os.path.join(EXPORTS, d.suggested_filename)
        d.save_as(p)
        print(label, "->", d.suggested_filename, os.path.getsize(p))
        s.page.wait_for_timeout(1200)
    s.take("after-lesson-export")
    print("BODY TAIL:", s.body()[-700:])
finally:
    s.finish()
print("FILES:", os.listdir(EXPORTS))
