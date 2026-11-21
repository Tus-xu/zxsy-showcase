# -*- coding: utf-8 -*-
"""打开真实导出文件做产物校验：PPTX（python-pptx，页数/可编辑文本/编辑后标题）、
PDF（pypdf，页数与文字）、DOCX（python-docx，标题/章节/编辑后标题）、Markdown。

用法：
    python qa/teacher-prep/verify_artifacts.py
需先由 run_e2e.py 生成 qa/teacher-prep/artifacts/* 与 manifest.json。
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ART = ROOT / "artifacts"
MANIFEST = ROOT / "manifest.json"

RESULTS: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    RESULTS.append((name, bool(ok), detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" :: {detail}" if detail else ""))


def verify_pptx(entry: dict) -> None:
    from pptx import Presentation
    from pptx.enum.shapes import MSO_SHAPE_TYPE

    path = ART / entry["file"]
    check(f"{entry['file']} 存在", path.exists(), str(path))
    if not path.exists():
        return
    prs = Presentation(str(path))
    slides = list(prs.slides)
    check(
        f"{entry['file']} 页数 = {entry.get('slides')}",
        len(slides) == entry.get("slides"),
        f"实际 {len(slides)} 页",
    )
    full_text = []
    text_shapes = 0
    editable_rects = 0
    for slide in slides:
        for shape in slide.shapes:
            if shape.has_text_frame:
                content = shape.text_frame.text.strip()
                if content:
                    full_text.append(content)
                    text_shapes += 1
            if shape.shape_type in (MSO_SHAPE_TYPE.AUTO_SHAPE, MSO_SHAPE_TYPE.TEXT_BOX):
                editable_rects += 1
    joined = "\n".join(full_text)
    for needle in entry.get("contains", []):
        check(f"{entry['file']} 文本含「{needle}」", needle in joined, "")
    check(f"{entry['file']} 文本可编辑（非整页截图）", text_shapes >= 10, f"{text_shapes} 个文本形状")
    check(f"{entry['file']} 含可编辑形状", editable_rects >= len(slides), f"{editable_rects} 个形状")
    check(f"{entry['file']} 无图片伪装页", all(shape.shape_type != MSO_SHAPE_TYPE.PICTURE for slide in slides for shape in slide.shapes), "")
    titles = []
    for i, slide in enumerate(slides, 1):
        slide_text = " ".join(s.text_frame.text for s in slide.shapes if s.has_text_frame).replace("\n", " ")
        titles.append(f"{i}.{slide_text[:42]}")
    print("   PPTX 页序摘要: " + " | ".join(titles))


def verify_pdf(entry: dict) -> None:
    from pypdf import PdfReader

    path = ART / entry["file"]
    check(f"{entry['file']} 存在", path.exists(), str(path))
    if not path.exists():
        return
    reader = PdfReader(str(path))
    pages = reader.pages
    check(
        f"{entry['file']} 页数 ≥ {entry.get('minPages', 1)}",
        len(pages) >= entry.get("minPages", 1),
        f"实际 {len(pages)} 页",
    )
    text = "\n".join((p.extract_text() or "") for p in pages)
    check(f"{entry['file']} 可提取文字", len(text.strip()) > 200, f"{len(text.strip())} 字")
    for needle in entry.get("contains", []):
        check(f"{entry['file']} 文本含「{needle}」", needle in text, "")
    print("   PDF 首页摘要: " + text.replace("\n", " ")[:160])


def verify_docx(entry: dict) -> None:
    import docx

    path = ART / entry["file"]
    check(f"{entry['file']} 存在", path.exists(), str(path))
    if not path.exists():
        return
    doc = docx.Document(str(path))
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    joined = "\n".join(paragraphs)
    check(f"{entry['file']} 段落数 > 30", len(paragraphs) > 30, f"{len(paragraphs)} 段")
    for needle in entry.get("contains", []):
        check(f"{entry['file']} 文本含「{needle}」", needle in joined, "")
    check(
        f"{entry['file']} 标题为编辑后教案标题",
        any("终审版" in p and "教案" in p for p in paragraphs),
        paragraphs[0][:60] if paragraphs else "",
    )
    print(f"   DOCX 标题: {paragraphs[0][:80]}")
    print(f"   DOCX 前 6 段: {' | '.join(paragraphs[1:7])[:220]}")


def verify_markdown(entry: dict) -> None:
    path = ART / entry["file"]
    check(f"{entry['file']} 存在", path.exists(), str(path))
    if not path.exists():
        return
    content = path.read_text(encoding="utf-8")
    for needle in entry.get("contains", []):
        check(f"{entry['file']} 文本含「{needle}」", needle in content, "")
    check(f"{entry['file']} 行数 > 40", len(content.splitlines()) > 40, f"{len(content.splitlines())} 行")
    print("   MD 首行: " + content.splitlines()[0][:100])


def main() -> int:
    if not MANIFEST.exists():
        print("缺少 manifest.json，请先运行 run_e2e.py")
        return 1
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    print(f"校验时间：{manifest.get('生成时间')}")
    print(f"发布记录版本：{json.dumps(manifest.get('发布记录版本'), ensure_ascii=False)}")
    print("-" * 78)
    for entry in manifest.get("课件", []):
        kind = entry.get("kind")
        try:
            if kind == "pptx":
                verify_pptx(entry)
            elif kind == "pdf":
                verify_pdf(entry)
            elif kind == "docx":
                verify_docx(entry)
            elif kind == "markdown":
                verify_markdown(entry)
            else:
                check(f"未知格式 {kind}", False)
        except Exception as exc:  # noqa: BLE001
            check(f"{entry.get('file')} 打开失败", False, repr(exc)[:300])
        print("-" * 78)

    failed = [r for r in RESULTS if not r[1]]
    print(f"\n产物校验：PASS {len(RESULTS) - len(failed)} / {len(RESULTS)}")
    for name, ok, detail in failed:
        print(f"FAILED: {name} :: {detail}")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
