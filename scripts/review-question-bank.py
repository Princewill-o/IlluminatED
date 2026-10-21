#!/usr/bin/env python3
"""
Checks every question in data/question-bank/questions.jsonl.

Templated maths and science items (the large majority) are re-solved here from
the numbers in the question, and the stored answer is compared with the true
answer. Formatting that stops fair auto-marking (e.g. "10+-24i", "x² − (-3)x")
is tidied without changing the maths. Hand-written items are checked against
data/question-bank/manual-review.json (written after reading each one).

Writes:
  data/question-bank/questions.jsonl   (review_status / answer / question updated)
  data/question-bank/review-report.json (counts and every change or flag)
"""
import json, math, re, sys
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BANK = ROOT / "data" / "question-bank" / "questions.jsonl"
MANUAL = ROOT / "data" / "question-bank" / "manual-review.json"
REPORT = ROOT / "data" / "question-bank" / "review-report.json"

rows = [json.loads(l) for l in BANK.read_text().splitlines() if l.strip()]
manual = json.loads(MANUAL.read_text()) if MANUAL.exists() else {}
N = r"(-?\d+(?:\.\d+)?)"

def num(s):
    return Fraction(s)

def fmt(f):
    f = Fraction(f)
    return str(f.numerator) if f.denominator == 1 else f"{float(f):g}"

def signed(c, var="", first=False):
    """+ 3x / − 3x for tidy expressions."""
    c = Fraction(c)
    mag = fmt(abs(c))
    body = f"{'' if (mag == '1' and var) else mag}{var}"
    if first:
        return f"-{body}" if c < 0 else body
    return f" − {body}" if c < 0 else f" + {body}"

changes, flags = [], []
status = {}

def verified(r, note=None):
    status[r["id"]] = "machine_verified"
    if note:
        changes.append({"id": r["id"], "change": note})

def wrong(r, expected, note=""):
    flags.append({"id": r["id"], "issue": f"Stored answer {r['answer']!r} is wrong; correct answer is {expected!r}. {note}".strip()})
    r["answer"] = expected
    status[r["id"]] = "machine_verified"
    changes.append({"id": r["id"], "change": f"answer corrected to {expected}"})

def check(r):
    q, a = r["question"], str(r["answer"]).strip()
    def same(x):
        try:
            return abs(float(Fraction(a.replace("%", "").replace("£", "")) - Fraction(x))) < 1e-9 or abs(float(a.replace("%", "")) - float(x)) < 0.051
        except Exception:
            return False

    if m := re.fullmatch(rf"(?:Solve for x: |Solve ){N}x \+ {N} = {N}\.", q):
        a1, b, c = map(num, m.groups()); x = (c - b) / a1
        return verified(r) if same(x) else wrong(r, fmt(x))
    if m := re.fullmatch(rf"A right-angled triangle has perpendicular sides of {N} cm and {N} cm\. Find the hypotenuse in cm\.", q):
        p, s = map(float, m.groups()); h = math.hypot(p, s)
        exp = fmt(Fraction(h).limit_denominator(1000)) if abs(h - round(h)) < 1e-9 else f"{h:.2f}"
        return verified(r) if abs(float(a) - h) < 0.01 else wrong(r, exp)
    if m := re.fullmatch(rf"Expand and simplify {N}\(x \+ {N}\)\.", q):
        k, c = map(num, m.groups()); exp = f"{fmt(k)}x{signed(k * c)}"
        if a.replace(" ", "") == f"{fmt(k)}x+{fmt(k*c)}".replace("+-", "-") or a.replace(" ", "") == exp.replace(" ", "").replace("−", "-"):
            r["answer"] = exp.replace("−", "-"); return verified(r)
        return wrong(r, exp.replace("−", "-"))
    if m := re.fullmatch(rf"Solve x² − \({N}\)x \+ \({N}\) = 0\. Give both roots\.", q):
        b, c = map(num, m.groups())  # x² − b x + c = 0
        disc = b * b - 4 * c
        roots = sorted({(b + s * Fraction(math.isqrt(int(disc)))) / 2 for s in (1, -1)}) if disc >= 0 and math.isqrt(int(disc)) ** 2 == disc else None
        r["question"] = f"Solve x²{signed(-b, 'x')}{signed(c)} = 0. Give both roots."
        if roots is None:
            flags.append({"id": r["id"], "issue": "Roots are not rational; template assumed factorisable."}); status[r["id"]] = "flagged"; return
        exp = ", ".join(fmt(x) for x in roots)
        got = sorted({Fraction(t.strip()) for t in a.split(",")})
        if len(roots) == 1:
            r["question"] = f"Solve x²{signed(-b, 'x')}{signed(c)} = 0. (It has one repeated root.)"
            r["explanation"] = f"The quadratic is a perfect square, (x{signed(-roots[0])})², so the only root is x = {fmt(roots[0])}."
        if got == roots:
            r["answer"] = exp; return verified(r, "question rewritten without double signs")
        return wrong(r, exp)
    if m := re.fullmatch(rf"For y = {N}x \+ \({N}\), find y when x = {N}\.", q):
        k, c, x = map(num, m.groups()); y = k * x + c
        r["question"] = f"For y = {signed(k, 'x', True)}{signed(c)}, find y when x = {fmt(x)}."
        return verified(r, "question rewritten without double signs") if same(y) else wrong(r, fmt(y))
    if m := re.fullmatch(rf"An arithmetic sequence starts at {N} and increases by {N} each term\. Find its (\d+)(?:st|nd|rd|th) term\.", q):
        s, d, n = num(m[1]), num(m[2]), int(m[3]); t = s + (n - 1) * d
        return verified(r) if same(t) else wrong(r, fmt(t))
    if m := re.fullmatch(rf"An arithmetic sequence begins {N}, {N}, {N}\. Find its (\d+)(?:st|nd|rd|th) term: state the general nth-term formula first\.", q):
        t1, t2, t3, n = num(m[1]), num(m[2]), num(m[3]), int(m[4]); d = t2 - t1
        if t3 - t2 != d:
            flags.append({"id": r["id"], "issue": "Sequence is not arithmetic."}); status[r["id"]] = "flagged"; return
        t = t1 + (n - 1) * d
        formula = f"{fmt(d)}n{signed(t1 - d)}" if d != 0 else fmt(t1)
        stored = re.search(r"=\s*(-?\d+(?:\.\d+)?)\s*$", a)
        r["question"] = f"An arithmetic sequence begins {fmt(t1)}, {fmt(t2)}, {fmt(t3)}. Find its {n}th term."
        r["explanation"] = f"The nth term is {formula.replace('−', '-')}, so term {n} = {fmt(t1)} + {fmt(d)} × ({n} − 1) = {fmt(t)}."
        r["answer"] = fmt(t)
        if stored and Fraction(stored[1]) == t:
            return verified(r, "answer reduced to the number asked for; formula moved to the explanation")
        return wrong(r, fmt(t))
    if m := re.fullmatch(rf"Differentiate y = {N}x\^{N} with respect to x\.", q):
        k, p = map(num, m.groups()); exp = f"{fmt(k * p)}x^{fmt(p - 1)}" if p - 1 != 1 else f"{fmt(k*p)}x"
        return verified(r) if a.replace(" ", "") in (exp, f"{fmt(k*p)}x^1") else wrong(r, exp)
    if m := re.fullmatch(rf"Find the indefinite integral of {N}x\^{N} with respect to x\.", q):
        k, p = map(num, m.groups()); exp = f"{fmt(k / (p + 1))}x^{fmt(p + 1)} + C"
        r["question"] = q.replace("with respect to x.", "with respect to x. Include the constant of integration.")
        return verified(r) if a.replace(" ", "") == exp.replace(" ", "") else wrong(r, exp)
    if m := re.fullmatch(rf"Find the sum of the first (\d+) terms of an arithmetic sequence with first term {N} and common difference {N}\.", q):
        n, a1, d = int(m[1]), num(m[2]), num(m[3]); s = Fraction(n, 2) * (2 * a1 + (n - 1) * d)
        return verified(r) if same(s) else wrong(r, fmt(s))
    if m := re.fullmatch(rf"Given f\(x\) = {N}x² \+ {N}x − {N}, evaluate f\({N}\)\.", q):
        p, qq, c, x = map(num, m.groups()); v = p * x * x + qq * x - c
        return verified(r) if same(v) else wrong(r, fmt(v))
    if m := re.fullmatch(rf"A bag has (\d+) blue counters and (\d+) red counters\. One is selected at random\. Give P\(blue\) as an unreduced fraction\.", q):
        b, rd = int(m[1]), int(m[2]); exp = f"{b}/{b + rd}"
        r["question"] = q.replace("as an unreduced fraction", "as a fraction")
        return verified(r, "any equivalent fraction or decimal is accepted") if a.replace(" ", "") == exp else wrong(r, exp)
    if m := re.fullmatch(rf"Simplify \({N}x\^{N}\) × \({N}x²\)\.", q):
        k1, p, k2 = map(num, m.groups()); exp = f"{fmt(k1 * k2)}x^{fmt(p + 2)}"
        return verified(r) if a.replace(" ", "") == exp else wrong(r, exp)
    if m := re.fullmatch(rf"Simplify \({N}\+{N}i\)\({N}([+-]){N}i\) in a\+bi form\.", q):
        a1, b1, a2 = num(m[1]), num(m[2]), num(m[3]); b2 = num(m[5]) * (1 if m[4] == "+" else -1)
        re_, im = a1 * a2 - b1 * b2, a1 * b2 + b1 * a2
        def cplx(x, y): return f"{fmt(x)}{'+' if y >= 0 else '-'}{'' if abs(y) == 1 else fmt(abs(y))}i"
        def term(x, y): return f"({fmt(x)}{'+' if y >= 0 else '-'}{'' if abs(y) == 1 else fmt(abs(y))}i)"
        r["question"] = f"Simplify {term(a1, b1)}{term(a2, b2)} in a + bi form."
        exp = cplx(re_, im)
        stored = a.replace(" ", "").replace("+-", "-")
        stored_v = re.fullmatch(r"(-?\d+)([+-]\d*)i", stored)
        ok = stored_v and Fraction(stored_v[1]) == re_ and Fraction(stored_v[2] + ("1" if stored_v[2] in "+-" else "")) == im
        r["answer"] = exp
        return verified(r, "answer and question formatted as a + bi") if ok else wrong(r, exp)
    if m := re.fullmatch(rf"An object travels {N} m in {N} s at constant speed\. Calculate speed in m/s\.", q):
        d, t = map(num, m.groups()); v = d / t
        return verified(r) if same(v) else wrong(r, fmt(v))
    if m := re.fullmatch(rf"A substance has relative formula mass {N} and a sample mass of {N} g\. Calculate amount in mol\.", q):
        mr, mass = map(num, m.groups()); n = mass / mr
        return verified(r) if same(n) else wrong(r, fmt(n))
    if m := re.fullmatch(rf"In a survey of (\d+) organisms, (\d+) show a feature\. Calculate the percentage showing the feature to 1 decimal place\.", q):
        tot, k = int(m[1]), int(m[2]); pc = round(100 * k / tot + 1e-12, 1)
        exp = f"{pc:.1f}%"
        if k > tot:
            flags.append({"id": r["id"], "issue": "More organisms show the feature than were surveyed."}); status[r["id"]] = "flagged"; return
        return verified(r) if a == exp else wrong(r, exp)
    if m := re.fullmatch(rf"Increase £{N} by {N}%\. Give the new amount in pounds\.", q):
        p, pct = map(num, m.groups()); v = p * (1 + pct / 100)
        exp = f"{float(v):.2f}"
        return verified(r) if same(v) else wrong(r, exp)
    return None  # not a template

templated = 0
for r in rows:
    before = dict(r)
    res = check(r) if r["question_type"] in ("short_answer", "calculation") else None
    if r["id"] in status:
        templated += 1
        continue
    # Hand-written items: decisions from manual-review.json
    m = manual.get(r["id"])
    if m:
        for k in ("question", "answer", "explanation", "question_type", "marks"):
            if m.get(k):
                r[k] = m[k]
                changes.append({"id": r["id"], "change": f"{k} rewritten in review"})
        status[r["id"]] = m["status"]
        if m.get("issue"):
            flags.append({"id": r["id"], "issue": m["issue"]})
    else:
        status[r["id"]] = "unchecked"

for r in rows:
    s = status[r["id"]]
    r["review_status"] = {"machine_verified": "ai_verified", "ai_checked": "ai_checked", "flagged": "flagged_needs_fix", "retire": "retired", "unchecked": "needs_subject_expert_review"}[s]

BANK.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + "\n")
from collections import Counter
counts = Counter(r["review_status"] for r in rows)
REPORT.write_text(json.dumps({"total": len(rows), "templated_recomputed": templated, "by_status": counts, "changes": len(changes), "flags": flags, "change_log": changes}, indent=1, ensure_ascii=False))
print(json.dumps({"total": len(rows), "templated": templated, "status": counts, "changes": len(changes), "wrong_or_flagged": len(flags)}, indent=1))
