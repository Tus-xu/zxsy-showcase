# -*- coding: utf-8 -*-
"""核对最终包随包产物是否包含参数派生内容（4.472/0.745/x²/36）与 $ 转 Unicode"""
import sys, re, glob, os
sys.stdout.reconfigure(encoding="utf-8")
from pptx import Presentation
from pypdf import PdfReader

REL = r"C:\Users\徐超\AppData\Local\Temp\ms-final-recheck\产物"

def walk(shapes):
    for sh in shapes:
        if sh.shape_type == 6:
            yield from walk(sh.shapes)
        else:
            yield sh

def pptx_text(p):
    pr = Presentation(p)
    pages = []
    for i, sl in enumerate(pr.slides, 1):
        tx = [sh.text_frame.text for sh in walk(sl.shapes) if sh.has_text_frame and sh.text_frame.text.strip()]
        pages.append((i, " ".join(tx)))
    return len(pr.slides), pages

def check(f, text, pages=0):
    res = {"file": os.path.basename(f), "pages": pages,
           "has_4.472": "4.472" in text, "has_0.745": "0.745" in text,
           "has_x2_36": "x²/36" in text, "has_dollar": "$" in text,
           "has_current_param": "当前参数" in text}
    print(json_line(res))
    seg = [s for s in re.split(r"\s{2,}", text) if "4.472" in s or "0.745" in s]
    for s in seg[:3]:
        print("   SEG:", s[:300])
    return res

def json_line(d):
    import json
    return json.dumps(d, ensure_ascii=False)

results = []
for f in sorted(glob.glob(os.path.join(REL, "*.pptx"))):
    n, pages = pptx_text(f)
    r = check(f, " ".join(t for _, t in pages), n)
    for i, t in pages:
        if "4.472" in t or "0.745" in t:
            print(f"   page {i}: {t[:300]}")
    results.append(r)
for f in sorted(glob.glob(os.path.join(REL, "*.pdf"))):
    r = PdfReader(f)
    text = " ".join((p.extract_text() or "") for p in r.pages)
    results.append(check(f, text, len(r.pages)))

print("\nSUMMARY:",
      "pptx/pdf with 4.472:", sum(1 for x in results if x["has_4.472"]),
      "| with 0.745:", sum(1 for x in results if x["has_0.745"]),
      "| with x²/36:", sum(1 for x in results if x["has_x2_36"]),
      "| with $:", sum(1 for x in results if x["has_dollar"]))
