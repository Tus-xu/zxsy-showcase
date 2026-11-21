# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-student", fresh=True)
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/"))
    s.page.wait_for_timeout(1500)
    s.click_text("学生 · 林一川")
    s.page.wait_for_timeout(1200)
    s.dump_ui("student-home", RESULT + r"\_ui-student-home.json")
    s.take("student-home")
    print("HOME BODY:\n", s.body()[:1500])
    print("HASH:", s.url_hash())
finally:
    s.finish()
