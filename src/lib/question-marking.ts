/** Marking for typed answers in the question bank (pure, shared with tests). */

const SUPERS: Record<string, string> = { "²": "^2", "³": "^3", "−": "-", "–": "-", "×": "*", "÷": "/" };

/** Lower-case, unify symbols and strip spaces, units and trailing full stops. */
export function normalise(s: string) {
  let t = s.toLowerCase().trim();
  for (const [k, v] of Object.entries(SUPERS)) t = t.split(k).join(v);
  t = t.replace(/^(x|y|answer)\s*=\s*/, "").replace(/\.$/, "");
  // Units only come off the end of a number ("15 cm" -> "15"), never off words.
  t = t.replace(/(\d)\s*(cm\^?2|cm\^?3|cm|mm|km|kg|g|m\/s\^?2|m\/s|ms|s|n|j|w|v|a|°|degrees|%|mol|dm\^?3|pa|kpa|hz|m)(?=$|[,\s])/g, "$1");
  return t.replace(/\s+/g, "").replace(/,+/g, ",");
}

const asNumber = (s: string) => {
  const f = s.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (f) return Number(f[1]) / Number(f[2]);
  return /^-?\d+(\.\d+)?(e-?\d+)?$/.test(s) ? Number(s) : NaN;
};

/**
 * Compare a learner's answer with the bank's answer. Numbers match within a
 * small tolerance (and fractions equal decimals); lists such as two roots match
 * in any order; otherwise the normalised text must match.
 */
export function markAnswer(given: string, expected: string): boolean {
  const g = normalise(given), e = normalise(expected);
  if (!g) return false;
  if (g === e) return true;
  const gl = g.split(/,|\bor\b|\band\b/).filter(Boolean), el = e.split(/,|\bor\b|\band\b/).filter(Boolean);
  if (el.length > 1 && gl.length === el.length) {
    const used = new Set<number>();
    return gl.every((x) => {
      const i = el.findIndex((y, j) => !used.has(j) && singleMatch(x, y));
      if (i < 0) return false;
      used.add(i);
      return true;
    });
  }
  return singleMatch(g, e);
}

function singleMatch(g: string, e: string) {
  if (g === e) return true;
  const gn = asNumber(g), en = asNumber(e);
  if (Number.isFinite(gn) && Number.isFinite(en)) return Math.abs(gn - en) <= Math.max(1e-9, Math.abs(en) * 0.005);
  return false;
}
