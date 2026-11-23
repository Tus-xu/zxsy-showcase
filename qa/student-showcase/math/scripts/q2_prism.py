#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Q2 (paper #9) independent verification.

Regular triangular prism ABC-A1B1C1 (正三棱柱: base ABC equilateral, lateral edges
perpendicular to the base). D = midpoint of BC. Decide the four statements:

  A. AD is perpendicular to A1C
  B. BC is perpendicular to plane AA1D
  C. AD is parallel to A1B1
  D. CC1 is parallel to plane AA1D

Coordinates: D origin, BC along x-axis, A on +y.
  D=(0,0,0), B=(-a/2,0,0), C=(a/2,0,0), A=(0,s3*a/2,0),
  A1=(0,s3*a/2,h), B1=(-a/2,0,h), C1=(a/2,0,h),  s3=sqrt(3).
Nothing below depends on a or h (verified by sweep).
"""
import math
import random

s3 = math.sqrt(3.0)


def points(a, h):
    return {
        "A": (0.0, s3 * a / 2.0, 0.0),
        "B": (-a / 2.0, 0.0, 0.0),
        "C": (a / 2.0, 0.0, 0.0),
        "D": (0.0, 0.0, 0.0),
        "A1": (0.0, s3 * a / 2.0, h),
        "B1": (-a / 2.0, 0.0, h),
        "C1": (a / 2.0, 0.0, h),
    }


def vec(FROM, TO):
    """Arrow FROM -> TO, i.e. the vector TO - FROM."""
    return tuple(t - f for f, t in zip(FROM, TO))


def dot(u, v):
    return sum(x * y for x, y in zip(u, v))


def cross(u, v):
    return (u[1] * v[2] - u[2] * v[1],
            u[2] * v[0] - u[0] * v[2],
            u[0] * v[1] - u[1] * v[0])


def norm(u):
    return math.sqrt(dot(u, u))


def unit(u):
    n = norm(u)
    return tuple(x / n for x in u)


def parallel(u, v, tol=1e-9):
    return norm(cross(u, v)) < tol * norm(u) * norm(v)


def plane_through(P, Q, R):
    """Return (normal, point) of plane PQR."""
    n = cross(vec(P, Q), vec(P, R))
    return n, P


def signed_dist(X, n, p0):
    return dot(vec(p0, X), n) / norm(n)


def decide(a, h):
    P = points(a, h)
    AD = vec(P["A"], P["D"])
    A1C = vec(P["A1"], P["C"])
    BC = vec(P["B"], P["C"])
    AA1 = vec(P["A"], P["A1"])
    A1B1 = vec(P["A1"], P["B1"])
    CC1 = vec(P["C"], P["C1"])
    nB, pB = plane_through(P["A"], P["A1"], P["D"])       # normal of plane AA1D
    res = {}
    res["A"] = abs(dot(AD, A1C)) < 1e-9
    # line BC perpendicular to plane AA1D: direction BC parallel to plane normal
    res["B"] = parallel(BC, nB)
    res["C"] = parallel(AD, A1B1)
    # CC1 parallel to plane: direction perpendicular to normal, and C not on the plane
    res["D"] = (abs(dot(CC1, nB)) < 1e-9 * norm(CC1) * norm(nB)
                and abs(signed_dist(P["C"], nB, pB)) > 1e-9)
    extra = {
        "cos_AD_A1C": dot(AD, A1C) / (norm(AD) * norm(A1C)),
        "dist_C_to_planeAA1D": signed_dist(P["C"], nB, pB),
        "dist_A1_to_planeBCC1B1": signed_dist(P["A1"], *plane_through(P["B"], P["C"], P["C1"])),
        "dist_B1_to_planeBCC1B1": signed_dist(P["B1"], *plane_through(P["B"], P["C"], P["C1"])),
    }
    return res, extra, dict(AD=AD, A1C=A1C, BC=BC, AA1=AA1, A1B1=A1B1, CC1=CC1, nB=nB)


print("=" * 72)
print("Q2 verification: regular triangular prism, D = midpoint of BC")
print("=" * 72)
a0, h0 = 2.0, 3.0
res, extra, vecs = decide(a0, h0)
print("sample prism: a = %.1f (side of equilateral base), h = %.1f" % (a0, h0))
for name in ("AD", "A1C", "BC", "AA1", "A1B1", "CC1"):
    print("  %-5s = (%8.4f, %8.4f, %8.4f)" % (name, *vecs[name]))
print("  plane AA1D normal n = (%g, %g, %g)  [i.e. plane is x = 0]" % vecs["nB"])
print("")
print("  AD . A1C = %.6f  -> angle not 90 deg (cos = %.6f)" % (dot(vecs["AD"], vecs["A1C"]), extra["cos_AD_A1C"]))
print("  BC . AD  = %.6f   BC . AA1 = %.6f   (both zero)" % (dot(vecs["BC"], vecs["AD"]), dot(vecs["BC"], vecs["AA1"])))
print("  signed distance from C to plane AA1D = %.6f (nonzero -> C not in the plane)" % extra["dist_C_to_planeAA1D"])
print("  signed distance from A1 to face plane BCC1B1 = %.6f (A1 not in that face)" % extra["dist_A1_to_planeBCC1B1"])
print("")
truth = {k: res[k] for k in "ABCD"}
for k in "ABCD":
    print("  option %s: %s" % (k, "TRUE" if truth[k] else "FALSE"))
print("  true option set = {%s}" % ", ".join(k for k in "ABCD" if truth[k]))
print("")

print("-- sweep: truth values for many (a,h), incl. tiny/large heights --")
grid = [(a, h) for a in (0.1, 0.5, 1, 1.5, 2, 3.7, 10, 57)
        for h in (0.1, 0.5, 1, 2, 3, 5, 10, 1000)]
random.seed(20261123)
for _ in range(200):
    grid.append((random.uniform(0.05, 100.0), random.uniform(0.05, 1000.0)))
sigs = set()
for (a, h) in grid:
    r, _, _ = decide(a, h)
    sigs.add((r["A"], r["B"], r["C"], r["D"]))
print("  tested %d prisms; distinct truth signatures = %s" % (len(grid), sigs))
assert sigs == {(False, True, False, True)}, "unexpected truth signature"
print("  => A false, B true, C false, D true, for every right prism (independent of a, h).")
print("")

print("-- why the word 正 (right prism) matters: oblique prism with the same equilateral base --")
print("  take lateral vector v = (p, 0, h) with p != 0 (lateral edges NOT perpendicular to the base):")
bad = 0
for p in (0.2, -0.4, 0.7):
    a, h = 2.0, 3.0
    P = points(a, h)
    A = (0.0, s3 * a / 2.0, 0.0)
    # shift the top face by (p,0.0,0) in addition to height: A1=A+(p,0,0)+(0,0,h)
    v = (p, 0.0, h)
    P = {"A": A,
         "B": (-a / 2.0, 0.0, 0.0),
         "C": (a / 2.0, 0.0, 0.0),
         "D": (0.0, 0.0, 0.0)}
    for name, base in (("A1", "A"), ("B1", "B"), ("C1", "C")):
        P[name] = tuple(base_ + d for base_, d in zip(P[base], v))
    AD = vec(P["A"], P["D"]); AA1 = vec(P["A"], P["A1"]); BC = vec(P["B"], P["C"])
    nB = cross(vec(P["A"], P["A1"]), vec(P["A"], P["D"]))
    okB = parallel(BC, nB)
    print("  p = %+0.2f: BC . AA1 = %+.6f, so B = %s" % (p, dot(BC, AA1), "TRUE" if okB else "FALSE"))
    bad += 0 if okB else 1
print("  => for an oblique prism B fails; answer BD relies on the standard definition 正三棱柱 = right prism.")
print("")
print("RESULT Q2: B and D true, A and C false  ->  {B, D} (multi-select)")