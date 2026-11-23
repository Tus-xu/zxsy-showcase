#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Q3 (paper #14) independent verification.

Box has 5 balls labelled 1..5. Draw three times WITH replacement.
X = number of balls that are drawn at least once (= number of distinct labels).
Find E(X).

Method 1 (definition): X in {1,2,3}; enumerate all 5^3 = 125 ordered triples.
Method 2 (indicator): X = sum_{i=1}^{5} I(ball i appears at least once),
        P(I_i=1) = 1-(4/5)^3, so E(X) = 5*(1-64/125) = 61/25.
Method 3 (first occurrences): X = 3 - (Y2+Y3), where Yk = 1 if the k-th draw is a
        label already seen. E(Y2)=1/5, E(Y3)=1-(4/5)^2=9/25, so E(X)=3-1/5-9/25=61/25.
"""
from itertools import product
from collections import Counter
from fractions import Fraction
import random

M, N = 5, 3          # 5 balls, 3 draws
triples = list(product(range(1, M + 1), repeat=N))
total = len(triples)
assert total == M ** N == 125

print("=" * 72)
print("Q3 verification: 5 balls, 3 draws with replacement, X = #distinct labels")
print("=" * 72)
print("Method 1: exhaustive enumeration over all 5^3 = %d ordered triples" % total)
dist = Counter(len(set(t)) for t in triples)
E_num = Fraction(sum(len(set(t)) for t in triples), total)
for k in sorted(dist):
    print("  X = %d : %3d outcomes, P = %3d/%d = %-8s = %.6f"
          % (k, dist[k], dist[k], total, Fraction(dist[k], total), dist[k] / total))
print("  sum of probabilities = %s" % Fraction(sum(dist.values()), total))
print("  E(X) = %s = %.6f  (exact fraction %d/%d)"
      % (E_num, float(E_num), E_num.numerator, E_num.denominator))
print("")

print("Method 2: linearity of expectation over 5 indicator variables")
p_ball = Fraction(1) - Fraction(4, 5) ** 3
print("  P(ball i drawn at least once) = 1-(4/5)^3 = 1-64/125 = %s = %.6f" % (p_ball, float(p_ball)))
E2 = M * p_ball
print("  E(X) = 5 * %s = %s = %.6f" % (p_ball, E2, float(E2)))
print("")

print("Method 3: complement, X = 3 - (Y2 + Y3), Yk = 1 iff k-th label already seen")
EY2 = Fraction(1, M)
EY3 = 1 - Fraction(M - 1, M) ** 2
E3 = Fraction(N) - EY2 - EY3
print("  E(Y2) = 1/5 = %s" % EY2)
print("  E(Y3) = 1 - (4/5)^2 = 1 - 16/25 = 9/25 = %s" % EY3)
print("  E(X) = 3 - 1/5 - 9/25 = %s = %.6f" % (E3, float(E3)))
print("")

print("Cross-checks:")
assert E_num == E2 == E3 == Fraction(61, 25), (E_num, E2, E3)
print("  three methods agree exactly: 61/25 = 2.44")

# Monte-Carlo sanity (fixed seed, 1e6 reps)
random.seed(20261123)
mean = 0.0
T = 1000000
for _ in range(T):
    s = set()
    for _ in range(N):
        s.add(random.randint(1, M))
    mean += len(s)
mean /= T
print("  Monte-Carlo (%d reps, seed 20261123): mean X = %.4f  (theory 2.44)" % (T, mean))
print("")

print("Alternative-reading probes (to document ambiguity handling):")
# exactly-once reading (rejected by the wording 至少取出一次)
E_exactly_once = M * (Fraction(N, 1) * Fraction(1, M) * Fraction(M - 1, M) ** 2)
print("  if X counted balls drawn EXACTLY once: E = 5*3*(1/5)*(4/5)^2 = %s = %.6f (not the wording)"
      % (E_exactly_once, float(E_exactly_once)))
print("  if the 3 draws were WITHOUT replacement: X = 3 deterministically, E = 3. (wording says 有放回)")
print("")
print("RESULT Q3: E(X) = 61/25 = 2.44")