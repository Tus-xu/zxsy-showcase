"""Reproduce the algebra and exact probability checks for the V5 sample pack."""
from fractions import Fraction
from itertools import permutations
from pathlib import Path
import json
import sys

import sympy as sp


tested = []


def check(name, condition):
    if not bool(condition):
        raise AssertionError(name)
    tested.append(name)


x, h, d = sp.symbols("x h d", real=True)
g = 2 * x**3 - 3 * x**2 - 12 * x + 1
dg = sp.diff(g, x)
check("g 的导数因式分解", sp.expand(6 * (x + 1) * (x - 2)) == dg)
check("g 的两个候选点", sp.solve(dg, x) == [-1, 2])
check("g 的函数值", [g.subs(x, a) for a in (-1, 0, 2)] == [8, 1, -19])
check("g 的测试斜率", [dg.subs(x, a) for a in (-2, 0, 1, 3)] == [24, -12, -12, 24])
check("−1 左右取点", dg.subs(x, sp.Rational(-11, 10)) > 0 and dg.subs(x, sp.Rational(-9, 10)) < 0)
check("g(x) 与 g(−1) 的差", sp.expand((x + 1)**2 * (2 * x - 7)) == g - 8)
check("g(x) 与 g(2) 的差", sp.expand((x - 2)**2 * (2 * x + 5)) == g + 19)
check("−1 邻域严格负差", sp.simplify(2 * x - 7).subs(x, 0) < 0)
check("2 邻域严格正差", sp.simplify(2 * x + 5).subs(x, 1) > 0)
check("g 无全局最小值", sp.limit(g, x, -sp.oo) == -sp.oo)

fx = x**3 - 3 * x
dfx = sp.diff(fx, x)
points = [sp.Rational(-7, 5), -1, sp.Rational(-3, 5), 1]
check("动态图两个驻点", sp.solve(dfx, x) == [-1, 1])
check("动态图极值坐标", [(a, fx.subs(x, a)) for a in [-1, 1]] == [(-1, 2), (1, -2)])
check("动态预设斜率", [dfx.subs(x, a) for a in points] == [sp.Rational(72, 25), 0, sp.Rational(-48, 25), 0])
check("键盘右移目标斜率", dfx.subs(x, sp.Rational(-13, 10)) == sp.Rational(207, 100))
check("x³ 反例的符号", sp.diff(x**3, x) == 3 * x**2 and (-sp.Rational(1, 10))**3 < 0 < sp.Rational(1, 10)**3)
check("x³ 反例滑块斜率", sp.diff(x**3, x).subs(x, sp.Rational(4, 5)) == sp.Rational(48, 25))
check("x² 左右邻域异号", [sp.diff(x**2, x).subs(x, a) for a in (-1, 1)] == [-2, 2])
check("绝对值左右差商", sp.limit(d / -d, d, 0, dir='+') == -1 and sp.limit(d / d, d, 0, dir='+') == 1)
quotient = ((1 + h)**2 - 1) / h
check("割线斜率，h 非零", sp.cancel(quotient) == h + 2)
check("割线极限与切线", sp.limit(quotient, h, 0) == sp.diff(x**2, x).subs(x, 1) == 2)

v1, v2, v3 = x**3 - 12 * x, -x**3 + 3 * x, (x - 1)**3
dv1, dv2, dv3 = [sp.diff(q, x) for q in (v1, v2, v3)]
check("变式一的两个驻点与走势", sp.solve(dv1, x) == [-2, 2] and [sp.sign(dv1.subs(x, a)) for a in (-3, 0, 3)] == [1, -1, 1])
check("变式一误选 4 的斜率", dv1.subs(x, 4) == 36)
check("变式二的两个驻点与走势", sp.solve(dv2, x) == [-1, 1] and [dv2.subs(x, a) for a in (-2, 0, 2)] == [-9, 3, -9])
check("变式三两侧导数同正", sp.factor(dv3) == 3 * (x - 1)**2 and sp.solve(dv3, x) == [1])

balls = tuple("RRRBB")
draws = list(permutations(range(5), 2))
pattern = [(balls[i], balls[j]) for i, j in draws]
joint = sum(a == b == "R" for a, b in pattern)
first = sum(a == "R" for a, b in pattern)
second = sum(b == "R" for a, b in pattern)
check("抽球等可能有序结果", len(draws) == 20 and joint == 6 and first == second == 12)
check("条件、边际和交集", (Fraction(joint, first), Fraction(second, len(draws)), Fraction(joint, len(draws))) ==
      (Fraction(1, 2), Fraction(3, 5), Fraction(3, 10)))
check("第二次边际概率全概率验算", Fraction(3, 5) * Fraction(1, 2) + Fraction(2, 5) * Fraction(3, 4) == Fraction(3, 5))

a, b = 5, 3
c = sp.sqrt(a**2 - b**2)
check("椭圆焦距和离心率", c == 4 and c / a == sp.Rational(4, 5))
check("椭圆短轴端点的两焦点距离和", (2 * sp.sqrt(b**2 + c**2)) == 2 * a)
check("双曲线示例的 c 与 e", sp.sqrt(a**2 + b**2) == sp.sqrt(34) and sp.sqrt(34) / a > 1)
check("椭圆数值反例换轴", (c, 0) != (0, c) and c / a == sp.Rational(4, 5))

doc = json.loads((Path(__file__).parent.parent / "samples/V5教学样本与分支.json").read_text(encoding="utf-8"))
check("四道选择题的键值与推导一致", {k: data["correct"] for k, data in doc["problems"].items()} ==
      {"g": "C", "v1": "B", "v2": "A", "v3": "C"})
sys.stdout.reconfigure(encoding="utf-8")
print(json.dumps({"sympy": sp.__version__, "passed": len(tested), "results": tested}, ensure_ascii=False, indent=2))
