from PIL import Image
READ = r'D:\zxsy-math-arena\docs\research-workspace\golden\READ-GOLDEN.png'
WRITE = r'D:\zxsy-math-arena\docs\research-workspace\golden\WRITE-GOLDEN.png'
r = Image.open(READ).convert('RGB'); pr = r.load()
w = Image.open(WRITE).convert('RGB'); pw = w.load()
print('READ samples:')
for xy in [(10,500),(150,600),(315,500),(330,200),(700,90),(700,120),(700,160),(700,200),(700,700),(400,700),(1068,700),(1100,700),(1300,700),(1660,700),(1660,900),(400,930)]:
    print(xy, pr[xy])
print('READ row scan y=700 transition summary:')
prev = pr[0,700]
for x in range(1,1672):
    c = pr[x,700]
    d = sum(abs(a-b) for a,b in zip(c,prev))
    if d > 18:
        print(' x=',x,prev,'->',c)
    prev = c
print('\nWRITE samples:')
for xy in [(10,500),(75,500),(120,500),(305,500),(400,500),(895,500),(1000,500),(1345,500),(1400,500),(1500,500),(1660,500),(400,900),(400,820),(700,800),(700,790)]:
    print(xy, pw[xy])
print('WRITE row scan y=700 transitions:')
prev = pw[0,700]
for x in range(1,1672):
    c = pw[x,700]
    d = sum(abs(a-b) for a,b in zip(c,prev))
    if d > 18:
        print(' x=',x,prev,'->',c)
    prev = c
print('\nWRITE column scan x=1400 (agent bg) y=60..941 changes:')
prev = pw[1400,60]
for y in range(61,941):
    c = pw[1400,y]
    d = sum(abs(a-b) for a,b in zip(c,prev))
    if d > 30:
        print(' y=',y,prev,'->',c)
    prev = c
print('\nREAD column scan x=1100 y=60..941 changes:')
prev = pr[1100,60]
for y in range(61,941):
    c = pr[1100,y]
    d = sum(abs(a-b) for a,b in zip(c,prev))
    if d > 30:
        print(' y=',y,prev,'->',c)
    prev = c
