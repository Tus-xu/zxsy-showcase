# -*- coding: utf-8 -*-
import sys, os
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-upload")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/student/dialog")
    s.page.wait_for_timeout(1200)
    with s.page.expect_file_chooser() as fc:
        s.click_text("选择题目图片")
    chooser = fc.value
    chooser.set_files(FRESH + r"\素材\题1.png")
    s.page.wait_for_timeout(3000)
    s.take("after-upload")
    s.dump_ui("guideA", RESULT + r"\_ui-guideA.json")
    print("URL:", s.page.url)
    print("BODY:\n", s.body()[:4000])
finally:
    s.finish()
