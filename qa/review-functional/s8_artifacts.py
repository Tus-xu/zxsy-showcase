# -*- coding: utf-8 -*-
"""用 python-pptx / python-docx / pypdf 打开本次导出与随包产物"""
import glob, os, json, sys
sys.stdout.reconfigure(encoding="utf-8")
from pptx import Presentation
from docx import Document
from pypdf import PdfReader

BASE = r"D:\zxsy-math-arena-showcase\qa\review-functional"
EXPORTS = os.path.join(BASE, "exports")
REL = r"D:\zxsy-math-arena-showcase\release\产物"
OUT = {}

def pptx_info(p):
    pr = Presentation(p)
    texts = []
    for i, slide in enumerate(pr.slides, 1):
        buf = []
        for sh in slide.shapes:
            if sh.has_text_frame:
                t = sh.text_frame.text.strip()
                if t: buf.append(t)
        texts.append({"page": i, "text": " | ".join(buf)[:180]})
    return {"file": os.path.basename(p), "slides": len(pr.slides), "texts": texts}

def docx_info(p):
    d = Document(p)
    paras = [x.text.strip() for x in d.paragraphs if x.text.strip()]
    return {"file": os.path.basename(p), "paras": len(paras), "head": paras[:6], "tail": paras[-3:]}

def pdf_info(p):
    r = PdfReader(p)
    txt = (r.pages[0].extract_text() or "")[:200]
    return {"file": os.path.basename(p), "pages": len(r.pages), "page1": " ".join(txt.split())[:150]}

for p in sorted(glob.glob(EXPORTS + r"\*.pptx")):
    OUT[os.path.basename(p)] = pptx_info(p)
for p in sorted(glob.glob(EXPORTS + r"\*.docx")):
    OUT[os.path.basename(p)] = docx_info(p)
for p in sorted(glob.glob(EXPORTS + r"\*.pdf")):
    OUT[os.path.basename(p)] = pdf_info(p)
REL_OUT = {}
for p in sorted(glob.glob(REL + r"\*")):
    ext = os.path.splitext(p)[1].lower()
    try:
        if ext == ".pptx": REL_OUT[os.path.basename(p)] = pptx_info(p)
        elif ext == ".docx": REL_OUT[os.path.basename(p)] = docx_info(p)
        elif ext == ".pdf": REL_OUT[os.path.basename(p)] = pdf_info(p)
    except Exception as e:
        REL_OUT[os.path.basename(p)] = {"error": str(e)}
with open(os.path.join(BASE, "_results", "artifacts-check.json"), "w", encoding="utf-8") as f:
    json.dump({"exports": OUT, "release_bundled": REL_OUT}, f, ensure_ascii=False, indent=1)
print(json.dumps(OUT, ensure_ascii=False, indent=1)[:5000])
print("=== BUNDLED ===")
print(json.dumps({k: (v.get("slides") or v.get("pages") or v.get("paras")) for k, v in REL_OUT.items()}, ensure_ascii=False, indent=1))
