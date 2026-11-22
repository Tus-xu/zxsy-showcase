# -*- coding: utf-8 -*-
"""Inspect saved DOM dumps (read-only helper)."""
import json
import re
import sys
from pathlib import Path

OUT = Path(r"D:\zxsy-math-arena-showcase\evidence\live\run-02\research")


def body_part(fname: str) -> str:
    h = (OUT / "artifacts" / fname).read_text(encoding="utf-8")
    i = h.find('<div id="app')
    return h[i:] if i >= 0 else h


def around(text: str, needle: str, before: int = 2000, after: int = 3000) -> None:
    i = text.find(needle)
    print(f"--- {needle} idx={i} ---")
    if i >= 0:
        print(text[max(0, i - before):i + after])


if __name__ == "__main__":
    fname = sys.argv[1] if len(sys.argv) > 1 else "dom-05-read-entry-fail.html"
    text = body_part(fname)
    for needle in sys.argv[2:] or ["rw-composer"]:
        around(text, needle)