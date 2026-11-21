from PIL import Image
from collections import Counter
READ = r'D:\zxsy-math-arena\docs\research-workspace\golden\READ-GOLDEN.png'
WRITE = r'D:\zxsy-math-arena\docs\research-workspace\golden\WRITE-GOLDEN.png'
r = Image.open(READ).convert('RGB'); pr = r.load()
w = Image.open(WRITE).convert('RGB'); pw = w.load()

def col_modal(px, x, y0, y1):
    c = Counter(px[x, y] for y in range(y0, y1))
    return c.most_common(1)[0]

print('READ columns modal colors x=0..1671 step 1 grouped runs for y 70..940:')
prev = None; start = 0
runs = []
for x in range(0, 1672):
    m = col_modal(pr, x, 70, 940)[0]
    # classify
    if m[2] >= m[0] and m[2] >= 248 and m[0] < 252:
        k = 'lightblue'
    elif min(m) >= 250:
        k = 'white'
    elif 225 <= min(m) and max(m) - min(m) < 22:
        k = 'border'
    else:
        k = 'other'
    if k != prev:
        if prev is not None:
            runs.append((start, x - 1, prev))
        start = x; prev = k
runs.append((start, 1671, prev))
for a, b, k in runs:
    if b - a > 3:
        print(a, b, k)

print('\nWRITE columns modal colors:')
prev = None; start = 0; runs = []
for x in range(0, 1672):
    m = col_modal(pw, x, 200, 940)[0]
    if m[2] >= m[0] and m[2] >= 248 and m[0] < 252:
        k = 'lightblue'
    elif min(m) >= 250:
        k = 'white'
    elif 225 <= min(m) and max(m) - min(m) < 22:
        k = 'border'
    else:
        k = 'other'
    if k != prev:
        if prev is not None:
            runs.append((start, x - 1, prev))
        start = x; prev = k
runs.append((start, 1671, prev))
for a, b, k in runs:
    if b - a > 3:
        print(a, b, k)

print('\nREAD row modal colors 0..940 at x=500..1000 (center):')
prev = None; start = 0; runs = []
for y in range(60, 941):
    m = col_modal(pr, 500, 1000, 1)[0] if False else None
    c = Counter(pr[x, y] for x in range(500, 1000)).most_common(1)[0][0]
    if min(c) >= 250:
        k = 'white'
    elif c[2] >= c[0] and c[2] >= 248:
        k = 'lightblue'
    elif max(c) - min(c) < 14:
        k = 'gray'
    else:
        k = 'other'
    if k != prev:
        if prev is not None:
            runs.append((start, y - 1, prev))
        start = y; prev = k
runs.append((start, 940, prev))
for a, b, k in runs:
    if b - a > 2:
        print(a, b, k)

print('\nWRITE row modal colors 60..940 at x=400..850 (editor):')
prev = None; start = 0; runs = []
for y in range(60, 941):
    c = Counter(pw[x, y] for x in range(400, 850)).most_common(1)[0][0]
    if min(c) >= 250:
        k = 'white'
    elif c[2] >= c[0] and c[2] >= 248:
        k = 'lightblue'
    elif max(c) - min(c) < 14:
        k = 'gray'
    else:
        k = 'other'
    if k != prev:
        if prev is not None:
            runs.append((start, y - 1, prev))
        start = y; prev = k
runs.append((start, 940, prev))
for a, b, k in runs:
    if b - a > 2:
        print(a, b, k)
