from PIL import Image
READ = r'D:\zxsy-math-arena\docs\research-workspace\golden\READ-GOLDEN.png'
WRITE = r'D:\zxsy-math-arena\docs\research-workspace\golden\WRITE-GOLDEN.png'
OUT = r'D:\zxsy-math-arena-showcase\qa\research\tmp\golden-crops'
r = Image.open(READ).convert('RGB')
w = Image.open(WRITE).convert('RGB')
def crop(im, name, box, scale=3):
    c = im.crop(box); c = c.resize((c.width*scale, c.height*scale), Image.LANCZOS); c.save(OUT + '\\' + name)
    print(name, c.size)
crop(r, 'read-topcorners-3x.png', (0, 55, 800, 260))
crop(r, 'read-right-header-3x.png', (1060, 55, 1672, 300))
crop(w, 'write-topcorners-3x.png', (0, 55, 800, 260))
crop(w, 'write-agent-top-3x.png', (1330, 55, 1672, 330))
crop(w, 'write-center-tabs-3x.png', (300, 90, 900, 260))
