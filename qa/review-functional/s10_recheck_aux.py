# -*- coding: utf-8 -*-
"""收口复验补充：导出物派生内容/Unicode、主持人工具路径文本、批改队列回归"""
import sys, os, json, glob, re
sys.stdout.reconfigure(encoding="utf-8")
from pptx import Presentation
from pypdf import PdfReader
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
import h
RECHECK = r"C:\Users\徐超\AppData\Local\Temp\ms-final-recheck"
h.ENTRY = RECHECK + r"\开始演示.html"
h.PROFILE = r"D:\zxsy-math-arena-showcase\qa\review-functional\_profile-recheck"
EXP = os.path.join(h.BASE, "exports-recheck")

def walk(shapes):
    for sh in shapes:
        if sh.shape_type == 6:
            yield from walk(sh.shapes)
        else:
            yield sh

rep = {}
# ---- 1) 本次复验导出物 ----
for f in sorted(glob.glob(EXP + r"\recheck-*.pptx")):
    pr = Presentation(f)
    pages = []
    for i, sl in enumerate(pr.slides, 1):
        tx = " ".join(sh.text_frame.text for sh in walk(sl.shapes) if sh.has_text_frame and sh.text_frame.text.strip())
        pages.append(tx)
    full = " ".join(pages)
    rep[os.path.basename(f)] = {"slides": len(pr.slides),
        "has_4.472": "4.472" in full, "has_0.745": "0.745" in full,
        "has_x2_36": "x²/36" in full, "has_current_param": "当前参数" in full,
        "has_dollar": "$" in full, "has_revised_title": "演示修订版" in full}
for f in sorted(glob.glob(EXP + r"\recheck-*.pdf")):
    r = PdfReader(f); full = " ".join((p.extract_text() or "") for p in r.pages)
    rep[os.path.basename(f)] = {"pages": len(r.pages),
        "has_4.472": "4.472" in full, "has_0.745": "0.745" in full,
        "has_x2_36": "x²/36" in full, "has_current_param": "当前参数" in full,
        "has_dollar": "$" in full, "has_revised_title": "演示修订版" in full}
print("=== RECHECK EXPORTS ===")
for k, v in rep.items(): print(k, json.dumps(v, ensure_ascii=False))

# ---- 2) 主持人工具文本 + 批改队列（运行时） ----
s = h.Session("s-recheck-aux")
aux = {}
try:
    s.goto("")
    s.page.keyboard.press("Control+Shift+H"); s.page.wait_for_timeout(900)
    host = s.page.inner_text("body")
    tail = host[host.find("三张原图位置"):]
    aux["host_path_section"] = tail[:400]
    print("\n=== HOST PATH SECTION ===\n", tail[:400])
    s.page.keyboard.press("Escape"); s.page.wait_for_timeout(500)
    # 教师 -> 批改工作台（走 作业发布页入口，与手册一致）
    s.switch_role("教师端")
    s.page.get_by_role("button", name="作业与批改", exact=True).click(); s.page.wait_for_timeout(2000)
    aux["nav_default_title"] = "作业发布" if "作业发布" in s.page.inner_text("body") else "未知"
    s.page.get_by_text("批改工作台").first.click(); s.page.wait_for_timeout(2000)
    q = s.page.locator("button.queue__item")
    aux["queue_count"] = q.count()
    s.check(q.count() == 3, "批改队列 3 份（经作业发布页进入）", f"{q.count()}")
    if q.count() == 3:
        q.nth(0).click(); s.page.wait_for_timeout(800)
        s.page.locator("input.field__score").fill("4.5")
        s.page.locator("textarea.field__comment").fill("验收复核：推导完整，给 4.5 分。")
        s.page.get_by_role("button", name="✓ 确认批改（写入终分）").click(); s.page.wait_for_timeout(2000)
        s.check_in("已确认", "批改确认写入")
        s.check_in("终评 4.5 / 5", "批改终评 4.5")
        s.reload(2200)
        s.check_in("终评 4.5 / 5", "批改刷新保留")
        s.step("复验-批改回归")
finally:
    ms = s.finish()
    with open(os.path.join(h.RESULT, "s-recheck-aux.json"), "w", encoding="utf-8") as f:
        json.dump({"exports": rep, "aux": aux, "summary": ms}, f, ensure_ascii=False, indent=1)
