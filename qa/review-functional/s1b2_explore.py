# -*- coding: utf-8 -*-
import sys, os
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-upload2")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/student/dialog")
    s.page.wait_for_timeout(1500)
    print("BODY-BEFORE:\n", s.body()[:1200])
    print("INPUTS:", s.page.evaluate("""() => Array.from(document.querySelectorAll('input')).map(el=>({type:el.type,accept:el.accept||'',cls:el.className,hidden:el.offsetParent===null,outer:el.outerHTML.slice(0,200)}))"""))
    s.click_text("选择题目图片")
    s.page.wait_for_timeout(1200)
    print("URL-AFTER:", s.page.url)
    print("BODY-AFTER:\n", s.body()[:2500])
    s.take("after-click-upload")
    print("INPUTS2:", s.page.evaluate("""() => Array.from(document.querySelectorAll('input')).map(el=>({type:el.type,accept:el.accept||'',cls:el.className,hidden:el.offsetParent===null}))"""))
    print("DIALOGS:", s.page.evaluate("""() => Array.from(document.querySelectorAll('[class*=modal],[class*=dialog],[class*=drawer],[role=dialog]')).map(el=>({cls:el.className,text:(el.innerText||'').slice(0,300)}))"""))
finally:
    s.finish()
