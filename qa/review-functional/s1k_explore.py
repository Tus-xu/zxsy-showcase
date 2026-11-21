# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-C")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/student/dialog")
    s.page.wait_for_timeout(1200)
    with s.page.expect_file_chooser() as fc:
        s.page.get_by_role("button", name="选择题目图片").first.click()
    fc.value.set_files(FRESH + r"\素材\题3.png")
    s.page.wait_for_timeout(3000)
    s.take("C-upload")
    print("URL:", s.page.url)
    print("TAIL:\n", s.body()[-2400:])
    print("PLACEHOLDER:", s.page.locator("input.guide__input").get_attribute("placeholder"))
    s.dump_ui("C", RESULT + r"\_ui-C.json")
finally:
    s.finish()
