"""独立复算 practice.js 中所有结论（原题按封存基准、变式按自洽数学）。只做数学断言，不联网。"""
import math
from fractions import Fraction

ok = []


def check(name, cond, detail=""):
    ok.append(bool(cond))
    print(("PASS " if cond else "FAIL ") + name + (f" [{detail}]" if detail else ""))


# A 原题：b/a=√7 → e=√(1+7)=2√2（选 D）
check("A 原题 e=2√2", abs(math.sqrt(1 + 7) - 2 * math.sqrt(2)) < 1e-12)
# A 变式一：e=2 → b/a=√3（选 C）
check("A-v1 b/a=√3", abs(math.sqrt(2**2 - 1) - math.sqrt(3)) < 1e-12)
# A 变式二：b/a=2 → e=√5（填 √5）
check("A-v2 e=√5", abs(math.sqrt(1 + 2**2) - math.sqrt(5)) < 1e-12)

# C 原题：E(X)=5*(1-(4/5)^3)=61/25=2.44
e3 = 5 * (1 - Fraction(4, 5) ** 3)
check("C 原题 61/25", e3 == Fraction(61, 25), str(e3))
check("C 原题 2.44", abs(float(e3) - 2.44) < 1e-12)
# C 变式一：无放回三次 ⇒ X≡3 ⇒ E=3
check("C-v1 E(X)=3", 3 == 3)
# C 变式二：有放回四次 ⇒ E=5*(1-(4/5)^4)=369/125≈2.952
e4 = 5 * (1 - Fraction(4, 5) ** 4)
check("C-v2 369/125", e4 == Fraction(369, 125), str(e4))
check("C-v2 2.952", abs(float(e4) - 2.952) < 1e-12)
# 分类计数校验：125 个等可能有序结果 → 只出现 1 种 5 个、恰 2 种 60 个、3 种互异 60 个
check("C 分类计数 305/125", Fraction(5 * 1 + 60 * 2 + 60 * 3, 125) == Fraction(61, 25))

# B：坐标验算（D 原点，正三角形边长 2，h=2）
D, B, C, A = (0, 0, 0), (-1, 0, 0), (1, 0, 0), (0, math.sqrt(3), 0)
h = 2
A1, B1, C1 = (0, math.sqrt(3), h), (-1, 0, h), (1, 0, h)


def sub(p, q):
    return tuple(a - b for a, b in zip(p, q))


def dot(u, v):
    return sum(a * b for a, b in zip(u, v))


def cross(u, v):
    return (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])


def parallel(u, v):
    c = cross(u, v)
    return all(abs(x) < 1e-12 for x in c)


AD, BC, AA1 = sub(D, A), sub(C, B), sub(A1, A)
check("B 原题 AD·A1C=3≠0（A 错）", abs(dot(sub(D, A), sub(C, A1)) - 3) < 1e-12)
check("B 原题 BC⊥AD", abs(dot(BC, AD)) < 1e-12)
check("B 原题 BC⊥AA1", abs(dot(BC, AA1)) < 1e-12)
normal = cross(AD, AA1)
check("B 原题 BC ∥ 平面 AA1D 法向（⇒ BC⊥平面，B 对）", parallel(BC, normal))
CC1 = sub(C1, C)
check("B 原题 CC1∥AA1 且 C 不在平面（D 对）", parallel(CC1, AA1) and C[0] != 0)
check("B 原题 AD 与 A1B1 不平行（C 错）", not parallel(AD, sub(B1, A1)))
# B 变式一：A AD⊥BB1；B AD 与平面 BCC1B1 交于 D 不平行；C BC⊥AA1；D BC⊥A1D
check("B-v1 AD⊥BB1", abs(dot(AD, sub(B1, B))) < 1e-12)
check("B-v1 AD 与平面 BCC1B1 有公共点 D（⇒ 不平行）", D[1] == 0 and A[1] != 0)
check("B-v1 BC⊥A1D", abs(dot(BC, sub(D, A1))) < 1e-12)
# B 变式二：AD 与 A1C 不垂直也不平行（选 C）
check("B-v2 AD·A1C≠0", dot(AD, sub(C, A1)) != 0)
check("B-v2 方向不平行", not parallel(AD, sub(C, A1)))

print(f"\n{sum(ok)}/{len(ok)} math checks passed")
raise SystemExit(0 if all(ok) else 1)
