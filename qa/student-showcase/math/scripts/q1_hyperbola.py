#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Q1 (paper #3) independent verification.
Hyperbola C: length of imaginary axis = sqrt(7) * length of real axis.
Find eccentricity e.

Convention (PEP textbook, 人教A版):
  x^2/a^2 - y^2/b^2 = 1, a,b>0
  real axis length = 2a, imaginary axis length = 2b, c^2 = a^2 + b^2, e = c/a.
Given 2b = sqrt(7)*2a  =>  b/a = sqrt(7)  =>  e = sqrt(1 + (b/a)^2) = sqrt(8) = 2*sqrt(2).
"""
import math
from fractions import Fraction

SQ7 = math.sqrt(7.0)
OPT = {"A": math.sqrt(2.0), "B": 2.0, "C": math.sqrt(7.0), "D": 2.0 * math.sqrt(2.0)}


def e_from_b_over_a(r):
    """e = c/a = sqrt(a^2+b^2)/a = sqrt(1+(b/a)^2)."""
    return math.sqrt(1.0 + r * r)


def b_over_a_from_e(e):
    """Inverse: for a hyperbola e >= 1 and e^2 = 1 + (b/a)^2 => b/a = sqrt(e^2-1)."""
    return math.sqrt(max(e * e - 1.0, 0.0))


print("=" * 72)
print("Q1 verification: imaginary axis = sqrt(7) * real axis  =>  b/a = sqrt(7)")
print("=" * 72)
print("given b/a = sqrt(7) = %.12f" % SQ7)
e_exact = e_from_b_over_a(SQ7)
print("direct  e = sqrt(1 + (b/a)^2) = sqrt(1+7) = sqrt(8) = 2*sqrt(2) = %.12f"
      % e_exact)
print("true e^2 (should be 8, exact) = %s" % Fraction((2 * math.sqrt(2.0)) ** 2).limit_denominator(10 ** 6))
print("")

print("-- check 1: substitute each option, recover b/a, compare with sqrt(7) --")
for key in "ABCD":
    e = OPT[key]
    r = b_over_a_from_e(e)
    ok = abs(r - SQ7) < 1e-12
    print("  option %s: e = %.12f  ->  b/a = sqrt(e^2-1) = %.12f   %s"
          % (key, e, r, "MATCH sqrt(7)" if ok else "no"))
print("  => only option D is compatible with b/a = sqrt(7).")
print("")

print("-- check 2: the opposite reading (real axis = sqrt(7)*imaginary axis, a/b = sqrt(7)) --")
e_rev = e_from_b_over_a(1.0 / SQ7)
print("  then e = sqrt(1 + 1/7) = sqrt(8/7) = %.12f = 2*sqrt(2/7)" % e_rev)
print("  this value is NOT among options A..D  => the stated reading is the intended one.")
print("")

print("-- check 3: concrete hyperbola x^2/1 - y^2/7 = 1, focus-directrix ratio of points on it --")
a, b = 1.0, SQ7
c = math.sqrt(a * a + b * b)
print("  a = 1, b = %.10f, c = sqrt(a^2+b^2) = %.10f, e = c/a = %.10f" % (b, c, c / a))
print("  right focus F = (%.10f, 0), right directrix x = a^2/c = %.10f" % (c, a * a / c))
for x in (1.5, 2.0, 3.0, 5.0):
    y = math.sqrt(7.0 * (x * x - 1.0))          # from x^2 - y^2/7 = 1
    PF = math.hypot(x - c, y)
    PD = abs(x - a * a / c)
    print("    P=(%6.3f, %12.8f): |PF| = %.12f, dist to directrix = %.12f, |PF|/PD = %.12f"
          % (x, y, PF, PD, PF / PD))
print("  every ratio equals e = 2*sqrt(2) = %.12f  (focus-directrix definition)" % (c / a))
print("")

print("-- check 4: asymptote slope -> e = sec(theta), tan(theta) = b/a --")
theta = math.atan(b / a)
print("  tan(theta) = %.12f, theta = %.12f rad, e = 1/cos(theta) = %.12f"
      % (b / a, theta, 1.0 / math.cos(theta)))
print("")

print("-- check 5: scale invariance (e does not depend on a) --")
for aa in (0.5, 1.0, 7.0, 123.0):
    bb = SQ7 * aa
    cc = math.hypot(aa, bb)
    print("  a = %8.3f, b = %12.6f, c = %12.6f, e = %.12f" % (aa, bb, cc, cc / aa))
print("")
print("RESULT Q1: e = sqrt(8) = 2*sqrt(2)  ->  option D")