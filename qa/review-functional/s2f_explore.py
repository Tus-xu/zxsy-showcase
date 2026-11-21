# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-persist")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/teacher/prep/w/prep-ellipse/ppt")
    s.page.wait_for_timeout(2000)
    print("TITLE VALUE:", s.page.locator("input.sc-title-input").input_value())
    print("SIDE TITLES:", [s.page.locator(".slide-row__title").nth(i).inner_text() for i in range(s.page.locator(".slide-row__title").count())])
    print("PROP:", [s.page.locator("aside.property-panel input").nth(i).input_value() for i in range(s.page.locator("aside.property-panel input").count())])
    txt = s.page.locator(".slide-canvas").inner_text()
    for key in ["x²/36", "e = 0.745", "4.472", "演示修订版"]:
        print(f"CANVAS contains {key!r}:", key in txt)
    print("BODY has 修订:", "演示修订版" in s.body())
    s.take("after-reload-ppt")
    # check slide 3 in sidebar text
    print("SLIDE3 ROW:", s.page.locator(".slide-row").nth(2).inner_text()[:200])
finally:
    s.finish()
