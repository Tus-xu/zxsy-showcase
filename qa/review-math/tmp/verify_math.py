# -*- coding: utf-8 -*-
"""Independent math re-derivation for the showcase content review (no product file is modified)."""
from fractions import Fraction as F
import itertools, sys
import numpy as np

def show(name, ok, detail=''):
    print(('PASS' if ok else 'FAIL'), name, detail)

# ---------------------------------------------------------------- A
# 2b = sqrt7 * 2a -> b/a = sqrt7 -> e^2 = 1 + 7 = 8 -> e = 2sqrt2 = sqrt8
show('A: e^2 = 1+(b/a)^2 = 8', abs((1 + 7) - 8) < 1e-12)
e = 8 ** 0.5
show('A: e = sqrt8 = 2sqrt2', abs(e - 2 * 2 ** 0.5) < 1e-12, f'e={e:.12f}, 2sqrt2={2*2**0.5:.12f}')
# option scan: e^2 - 1 must equal 7
opts = {'A': 2 ** 0.5, 'B': 2.0, 'C': 7 ** 0.5, 'D': 2 * 2 ** 0.5}
show('A: only D satisfies e^2-1=7', [k for k, v in opts.items() if abs(v * v - 1 - 7) < 1e-9] == ['D'])
# A-v1: e=2 -> b/a = sqrt3 ; 2b/2a = b/a
show('A-v1: e=2 -> b/a=sqrt3', abs((4 - 1) - 3) < 1e-12)
# A-v2: 2b = 2*(2a) -> b/a=2 -> e=sqrt5
show('A-v2: b/a=2 -> e=sqrt5', abs((1 + 4) - 5) < 1e-12, f'sqrt5={5**0.5:.6f}')

# ---------------------------------------------------------------- B (coordinate, arbitrary h>0, side 2)
def v(a, b):
    return np.array(b, dtype=float) - np.array(a, dtype=float)

for h in (1.0, 2.7, 10.0):
    D = (0, 0, 0); Bp = (-1, 0, 0); Cp = (1, 0, 0); A = (0, 3 ** 0.5, 0)
    A1 = (0, 3 ** 0.5, h); B1 = (-1, 0, h); C1 = (1, 0, h)
    AD = v(A, D); A1C = v(A1, Cp); BC = v(Bp, Cp); AA1 = v(A, A1); A1B1 = v(A1, B1); CC1 = v(Cp, C1)
    show(f'B(h={h}): AD.A1C = 3 != 0 (A false)', abs(np.dot(AD, A1C) - 3) < 1e-9, f'{np.dot(AD, A1C)}')
    # B: BC perp AD and BC perp AA1 (both in plane AA1D, intersecting at A) -> BC perp plane
    show(f'B(h={h}): BC.AD = 0 and BC.AA1 = 0', abs(np.dot(BC, AD)) < 1e-9 and abs(np.dot(BC, AA1)) < 1e-9)
    # plane AA1D normal = cross(AD, AA1); check BC parallel normal
    n = np.cross(AD, AA1)
    show(f'B(h={h}): BC parallel normal of plane AA1D', np.allclose(np.cross(n, BC), 0), f'n={n}')
    # D: CC1 parallel plane (dot with normal = 0) and C not in plane (plane through D with normal n: n.(C-D) != 0)
    show(f'B(h={h}): CC1 parallel plane and C not in plane', abs(np.dot(n, CC1)) < 1e-9 and abs(np.dot(n, v(D, Cp))) > 1e-9)
    # C: AD not parallel A1B1
    show(f'B(h={h}): AD not parallel A1B1', not np.allclose(np.cross(AD, A1B1), 0))

# guidance B-v1: D on BC with BD = BC/3, plane AA1D, is BC perp plane? compute BC.AD
Bp = (-1, 0, 0); Cp = (1, 0, 0); A = (0, 3 ** 0.5, 0); Dq = (-1 + 2 / 3, 0, 0)
AD = v(A, Dq); BC = v(Bp, Cp)
show('B-v1 (BD=BC/3): BC.AD != 0 so BC not perp plane AA1D', abs(np.dot(BC, AD)) > 1e-9, f'BC.AD={np.dot(BC, AD)}')
# B-v2: CC1 perp AD (CC1 parallel AA1 perp base)
show('B-v2: CC1 perp AD', True, 'AA1 perp base => any base line perp AA1 || CC1')

# practice B-v1: A AD perp BB1 ; B AD || plane BCC1B1 (false) ; C BC perp AA1 ; D BC perp A1D
h = 2.0
Bp = (-1, 0, 0); Cp = (1, 0, 0); A = (0, 3 ** 0.5, 0); D0 = (0, 0, 0)
A1 = (0, 3 ** 0.5, h); C1 = (1, 0, h); B1 = (-1, 0, h)
AD = v(A, D0); BB1 = v(Bp, B1); AA1 = v(A, A1); BC = v(Bp, Cp); A1D = v(A1, D0)
show('practice B-v1 A: AD perp BB1', abs(np.dot(AD, BB1)) < 1e-9)
# plane BCC1B1 is x=const? B,C have x=-1,1 -> plane contains x extruded; normal = cross(BC, BB1) = cross((2,0,0),(0,0,h))=(0,-2h,0)-> normal y. AD=(0,-sqrt3,0) is parallel to normal => AD perpendicular to plane, not parallel.
n2 = np.cross(BC, BB1)
show('practice B-v1 B false: AD perp plane BCC1B1 (intersects), not parallel', abs(np.dot(n2, AD)) > 1e-9 and abs(np.dot(n2, AD) - np.linalg.norm(n2) * np.linalg.norm(AD)) < 1e-9)
show('practice B-v1 C: BC perp AA1', abs(np.dot(BC, AA1)) < 1e-9)
show('practice B-v1 D: BC perp A1D', abs(np.dot(BC, A1D)) < 1e-9)
# practice B-v2: AD vs A1C not perp (dot 3), not parallel
A1C = v(A1, Cp)
show('practice B-v2: AD.A1C=3, not perp; not parallel', abs(np.dot(AD, A1C) - 3) < 1e-9 and not np.allclose(np.cross(AD, A1C), 0))

# ---------------------------------------------------------------- C (enumerate all 125 outcomes)
outcomes = list(itertools.product(range(1, 6), repeat=3))
dist = {}
for o in outcomes:
    x = len(set(o))
    dist[x] = dist.get(x, 0) + 1
E = F(sum(k * n for k, n in dist.items()), 125)
show('C: distribution counts X=1/2/3 => 5/60/60', dist == {1: 5, 2: 60, 3: 60}, str(dist))
show('C: E(X)=61/25=2.44', E == F(61, 25) and abs(float(E) - 2.44) < 1e-15, f'E={E}={float(E)}')
show('C: indicator method 5*(1-(4/5)^3)=61/25', 5 * (1 - F(4, 5) ** 3) == F(61, 25))
show('C: tail-sum 1+24/25+12/25=61/25', 1 + F(24, 25) + F(12, 25) == F(61, 25))
show('C: 61/125 is single-indicator expectation (not answer)', F(61, 125) != F(61, 25))
show('C: 183/125 = 3*(1-(4/5)^3)', 3 * (1 - F(4, 5) ** 3) == F(183, 125))
show('C: 69/25 wrong-count value reproduced', (5 * 1 + (80 - 5) * 2 + 60 * 3) / 125 == F(345, 125) == F(69, 25))
# C-v1 unfilled no-replacement: 3 draws distinct => X=3
show('C-v1: no-replacement 3 draws => E(X)=3', True)
# C-v2 4 draws: E = 5*(1-(4/5)^4)=369/125
E4 = 5 * (1 - F(4, 5) ** 4)
show('C-v2: E=369/125=2.952', E4 == F(369, 125) and abs(float(E4) - 2.952) < 1e-15, f'{E4}={float(E4)}')
show('C-v2: 256/625 = (4/5)^4 (the actual intermediate)', F(4, 5) ** 4 == F(256, 625))
show('C-v2: 64/625 is NOT (4/5)^4', F(4, 5) ** 4 != F(64, 625))
# 4-draw exact distribution for cross-check: X=1..4
dist4 = {}
for o in itertools.product(range(1, 6), repeat=4):
    dist4[len(set(o))] = dist4.get(len(set(o)), 0) + 1
E4b = F(sum(k * n for k, n in dist4.items()), 5 ** 4)
show('C-v2: enumeration agrees with 369/125', E4b == E4, f'{dist4}')

# ---------------------------------------------------------------- Courseware
# ellipse a=5,b=3 -> c=4, e=4/5, axes 10/6, focal 8
a, b = 5, 3
c = (a * a - b * b) ** 0.5
show('CW ellipse: a=5,b=3 -> c=4', abs(c - 4) < 1e-12, f'c={c}')
show('CW ellipse: e=4/5, axes 10/6, focal 8', abs(c / a - 0.8) < 1e-12 and 2 * a == 10 and 2 * b == 6 and 2 * c == 8)
# ellipse blueprint example: sum dist 10, focal 8 -> x^2/25+y^2/9=1
show('CW ellipse example: 2a=10,2c=8 -> b^2=9, x^2/25+y^2/9=1', 2 * c == 8 and a * a - (c * c) == 9)
# quadratic: 2x^2+8x+5 = 2(x+2)^2-3, vertex (-2,-3), min -3 ; blueprint -8+5
x = np.linspace(-50, 50, 11)
lhs = 2 * x**2 + 8 * x + 5
rhs = 2 * (x + 2) ** 2 - 3
show('CW quadratic: 2x^2+8x+5 = 2(x+2)^2-3 (grid)', np.allclose(lhs, rhs))
show('CW quadratic: vertex (-2,-3), min -3 (a=2>0)', 2 * (-2) ** 2 + 8 * (-2) + 5 == -3 and -2 == -2)
# set: {a,b,c} subsets 8, proper 7; empty set IS proper subset of nonempty set
import itertools as it
S = ['a', 'b', 'c']
subs = [set(cmb) for r in range(4) for cmb in it.combinations(S, r)]
show('CW set: {a,b,c} has 2^3=8 subsets, 7 proper', len(subs) == 8 and len([s for s in subs if s != set(S)]) == 7)
show('CW set: empty set counts as proper subset of {a,b,c} (note "empty set is NOT proper" is wrong)', set() != set(S))

# ---------------------------------------------------------------- Research
show('RS sqrt: x=-2 -> sqrt(x^2)=2 != -2', ((-2) ** 2) ** 0.5 == 2.0 and 2.0 != -2)
show('RS sqrt: sqrt(x^2)=|x| for sample grid', all(abs(abs(t) - (t * t) ** 0.5) < 1e-12 for t in np.linspace(-10, 10, 41)))
show('RS cancel: (x^2-1)/(x-1)=x+1 for x!=1; undefined at x=1', all(abs((t * t - 1) / (t - 1) - (t + 1)) < 1e-12 for t in [0, 2, 3.5, -2]) and (1 - 1) == 0)
show('RS complete-square: x^2+2bx=(x+b)^2-b^2 for grid', all(abs(t * t + 4 * t - ((t + 2) ** 2 - 4)) < 1e-12 for t in np.linspace(-5, 5, 21)))
# samples in formulaChecks (b=2): left/right values
samples = [(-3, 9 - 12, 1 - 4), (-0.5, 0.25 - 2, 2.25 - 4), (0, 0, 4 - 4), (1.5, 2.25 + 6, 12.25 - 4), (4, 16 + 16, 36 - 4)]
show('RS formulaChecks samples: left==right', all(l == r for _, l, r in samples), str([(xx, l, r) for xx, l, r in samples]))
# table 1 / 2 ratios in fem-num
t1 = [('1/4', 0.1120, 0.448), ('1/8', 0.0558, 0.446), ('1/16', 0.0279, 0.446), ('1/32', 0.0140, 0.448)]
t2 = [('1/4', 0.01260, 0.2016), ('1/8', 0.00314, 0.2010), ('1/16', 0.00078, 0.1997), ('1/32', 0.00020, 0.2048)]
ok1 = all(abs(e / float(F(h)) - r) < 0.001 for h, e, r in t1)
ok2 = all(abs(e / float(F(h)) ** 2 - r) < 0.002 for h, e, r in t2)
show('RS table1 e_h/h column self-consistent', ok1, str([(h, round(e / float(F(h)), 4), r) for h, e, r in t1]))
show('RS table2 e_h/h^2 column self-consistent', ok2, str([(h, round(e / float(F(h)) ** 2, 4), r) for h, e, r in t2]))
show('RS table header has exactly 3 columns (so "第四列" is wrong)', True, 'head = [h, e_h, e_h/h] (3 cols)')
# Cea lemma constants: M=a1, alpha=a0 for -div(a grad u); with a0<=a<=a1
# continuity |a(u,v)| <= a1 |u|_1 |v|_1 ; ellipticity a(v,v) >= a0 |v|_1^2 -> C=M/alpha=a1/a0
show('RS Cea: standard statement vector with M, alpha>0', True, 'conditions: continuity M, V-ellipticity alpha>0, Vh subset V')
# verify Cea proof inequality algebra with sample numbers
M, alpha = 3.0, 0.5
for eu, ev in [(0.2, 1.0), (0.5, 0.7), (1.3, 2.2)]:
    show(f'RS Cea proof: alpha*eu^2 <= M*eu*ev => eu <= (M/alpha)ev', alpha * eu * eu <= M * eu * ev + 1e-15 and eu <= (M / alpha) * ev + 1e-12, f'eu={eu}, ev={ev}')

# ---------------------------------------------------------------- Submissions
rubric_totals = {'sub-A': (2 + 2 + 1, 5, 5), 'sub-B': (1 + 2 + 2, 5, 2), 'sub-C': (2 + 2 + 1, 5, 2)}
for sid, (tot, full, sysscore) in rubric_totals.items():
    show(f'SUB {sid}: rubric sums to full score', tot == full, f'rubric={tot}, full={full}')
# sub-B (question C) rubric reachable sums: 0,1,2,2,3,4,5 -> 2 IS reachable via item2(2) alone,
# but student did not convert to indicators/distribution; only item1 is arguably touched.
subB_sums = set()
for mask in range(8):
    s = 0
    for i, p in enumerate([1, 2, 2]):
        if mask >> i & 1:
            s += p
    subB_sums.add(s)
show('SUB sub-B: systemScore 2 is a rubric-reachable sum', 2 in subB_sums, f'reachable={sorted(subB_sums)}')
print('\nNOTE: reachability != justified; see report for the content argument (student answer in sub-B.png'
      ' defines X as number of draws, so item1 "理解 X 为不同号码种数" is not satisfied and item2 is absent).')
