# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-host")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/login")
    s.page.wait_for_timeout(1200)
    s.page.keyboard.press("Control+Shift+H")
    s.page.wait_for_timeout(900)
    s.take("host-overlay")
    print("URL:", s.page.url)
    print("BODY:\n", s.body()[-3500:])
    s.dump_ui("host", RESULT + r"\_ui-host.json")
finally:
    s.finish()
