# -*- coding: utf-8 -*-
"""List fonts embedded in candidate PDFs (diagnostic, read-only)."""
import glob
import sys

import fitz

paths = sys.argv[1:] or glob.glob(r"D:\zxsy-math-arena-showcase\qa\**\*.pdf", recursive=True)
for p in paths:
    try:
        doc = fitz.open(p)
        fonts = set()
        for page in doc:
            for f in page.get_fonts(full=True):
                fonts.add((f[3], f[4]))  # ext, type-ish
            if len(fonts) > 8:
                break
        text = doc[0].get_text()[:60].replace("\n", " ")
        print(f"{p}\n   pages={doc.page_count} fonts={sorted(fonts)} first='{text}'")
        doc.close()
    except Exception as exc:  # noqa: BLE001
        print(f"{p}  ERROR {exc}")