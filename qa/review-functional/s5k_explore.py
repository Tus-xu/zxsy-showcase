# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

EXPORTS = os.path.join(BASE, "exports")
os.makedirs(EXPORTS, exist_ok=True)

s = Session("explore-write3")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/research/write")
    s.page.wait_for_timeout(2200)
    # click locate button
    s.page.get_by_role("button", name="定位到第 25 行").click()
    s.page.wait_for_timeout(800)
    s.take("write-located")
    print("AFTER LOCATE BODY TAIL:", s.body()[-500:])
    # fix editor
    ta = s.page.locator("textarea.ed__input")
    val = ta.input_value()
    fixed = val.replace("\\undefinedcommandhere\n", "")
    ta.fill(fixed)
    s.page.wait_for_timeout(500)
    s.page.get_by_role("button", name="⟳ 重新编译").click()
    s.page.wait_for_timeout(2500)
    s.take("write-recompiled")
    print("\nAFTER RECOMPILE TAIL:\n", s.body()[-1200:])
    with s.page.expect_download() as dl:
        s.page.get_by_role("button", name="导出 PDF").click()
    d = dl.value
    p = os.path.join(EXPORTS, "research-write-" + d.suggested_filename)
    d.save_as(p)
    print("\nEXPORTED:", p, os.path.getsize(p))
    s.page.wait_for_timeout(1000)
    print("AFTER EXPORT TAIL:", s.body()[-400:])
finally:
    s.finish()
