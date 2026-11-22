# -*- coding: utf-8 -*-
"""并排图 + 200% 关键区域放大图合成。
并排: live/<page>.png | offline/<page>.png → side/<page>.png (2880x900, 顶部标注)
放大: 每页 4 个关键区域裁切 x2 → zoom/<page>-<region>-200.png
"""
import os
from PIL import Image, ImageDraw, ImageFont

WT = r'D:\zxsy-math-arena-showcase-student'
VQA = os.path.join(WT, 'qa', 'student-showcase', 'vqa')

PAGES = ['p01-dialog-home', 'p02-library-docs', 'p03-library-bank', 'p04-resources',
         'p05-errors', 'p06-classroom-tasks', 'p07-dual-player', 'p08-task-graded',
         'p09-me-report', 'p10-me-map']

# 区域裁切 (left, top, right, bottom) — 1440x900 画布
REGIONS = {
    'topnav':      (0, 0, 1440, 170),
    'sidebar':     (0, 60, 230, 700),
    'content-top': (215, 130, 1440, 560),
    'content-mid': (215, 470, 1440, 900),
}


def font(size):
    for name in ('msyh.ttc', 'simhei.ttf', 'arial.ttf'):
        try:
            return ImageFont.truetype('C:/Windows/Fonts/' + name, size)
        except Exception:
            continue
    return ImageFont.load_default()


def load(side, page):
    path = os.path.join(VQA, side, page + '.png')
    if os.path.exists(path):
        return Image.open(path).convert('RGB')
    return None


def main():
    os.makedirs(os.path.join(VQA, 'side'), exist_ok=True)
    os.makedirs(os.path.join(VQA, 'zoom'), exist_ok=True)
    f = font(28)
    fs = font(22)
    made_side, made_zoom = [], []
    for page in PAGES:
        lv, off = load('live', page), load('offline', page)
        if not lv or not off:
            print('skip side (missing):', page, bool(lv), bool(off))
            continue
        w, h = 1440, 900
        canvas = Image.new('RGB', (w * 2, h + 36), (24, 26, 32))
        d = ImageDraw.Draw(canvas)
        canvas.paste(lv.resize((w, h)) if lv.size != (w, h) else lv, (0, 36))
        canvas.paste(off.resize((w, h)) if off.size != (w, h) else off, (w, 36))
        d.rectangle([0, 0, w, 36], fill=(13, 148, 136))
        d.rectangle([w, 0, w * 2, 36], fill=(217, 119, 6))
        d.text((w // 2 - 60, 4), 'LIVE', font=f, fill=(255, 255, 255))
        d.text((w + w // 2 - 90, 4), 'OFFLINE', font=f, fill=(255, 255, 255))
        out = os.path.join(VQA, 'side', page + '.png')
        canvas.save(out)
        made_side.append(page)

        for rname, box in REGIONS.items():
            cw = (box[2] - box[0]) * 2   # 放大后单侧宽
            strip = Image.new('RGB', (cw * 2, (box[3] - box[1]) * 2), (24, 26, 32))
            dd = ImageDraw.Draw(strip)
            for i, im in enumerate((lv, off)):
                crop = im.crop(box)
                crop = crop.resize((crop.width * 2, crop.height * 2), Image.LANCZOS)
                strip.paste(crop, (i * cw, 0))
            dd.rectangle([0, 0, 128, 30], fill=(13, 148, 136))
            dd.text((10, 4), 'LIVE', font=fs, fill=(255, 255, 255))
            dd.rectangle([cw, 0, cw + 168, 30], fill=(217, 119, 6))
            dd.text((cw + 10, 4), 'OFFLINE', font=fs, fill=(255, 255, 255))
            zo = os.path.join(VQA, 'zoom', '%s-%s-200.png' % (page, rname))
            strip.save(zo)
            made_zoom.append('%s-%s' % (page, rname))
    print('sides:', len(made_side), made_side)
    print('zooms:', len(made_zoom))


if __name__ == '__main__':
    main()
