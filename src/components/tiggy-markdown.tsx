"use client";

import Link from "next/link";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Tiggy is asked to write maths in plain Unicode, but models sometimes slip
 * into LaTeX. Turn the common bits into readable symbols and show the rest as
 * code, so nothing renders as raw markup. Raw HTML in replies is never rendered.
 */
const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  n: "ⁿ",
  "-": "⁻",
};

function latexToText(tex: string): string {
  let s = tex;
  for (let i = 0; i < 3; i++) {
    s = s
      .replace(/\\(?:d|t)?frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)")
      .replace(/\\sqrt\{([^{}]*)\}/g, "√($1)")
      .replace(
        /\\(?:text|mathrm|mathbf|textbf|operatorname)\{([^{}]*)\}/g,
        "$1",
      );
  }
  s = s
    .replace(/\^\{([0-9n-]+)\}|\^([0-9n])/g, (_, a: string, b: string) =>
      [...(a ?? b)].map((c) => SUPERSCRIPT[c] ?? c).join(""),
    )
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\cdot/g, "·")
    .replace(/\\pm/g, "±")
    .replace(/\\(?:leq|le)\b/g, "≤")
    .replace(/\\(?:geq|ge)\b/g, "≥")
    .replace(/\\(?:neq|ne)\b/g, "≠")
    .replace(/\\approx/g, "≈")
    .replace(/\\infty/g, "∞")
    .replace(/\\pi/g, "π")
    .replace(/\\theta/g, "θ")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\lambda/g, "λ")
    .replace(/\\mu/g, "μ")
    .replace(/\\Delta/g, "Δ")
    .replace(/\\rightarrow|\\to\b/g, "→")
    .replace(/\\degree|\^\\circ|\\circ/g, "°")
    .replace(/\\left|\\right/g, "")
    .replace(/\\[,;: ]/g, " ")
    .replace(/[{}]/g, "")
    .trim();
  return s;
}

export function tidyMaths(md: string): string {
  return (
    md
      // Display maths: \[ ... \] and $$ ... $$ become their own line.
      .replace(/\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$/g, (_, a, b) => {
        const t = latexToText(a ?? b).replace(/`/g, "'");
        return `\n\n\`${t}\`\n\n`;
      })
      // Inline maths: \( ... \), and $...$ only when it clearly holds maths (not "$5 and $10").
      .replace(
        /\\\(([\s\S]+?)\\\)/g,
        (_, a: string) => `\`${latexToText(a).replace(/`/g, "'")}\``,
      )
      .replace(
        /\$([^$\n]*[\\^_=][^$\n]*)\$/g,
        (_, a: string) => `\`${latexToText(a).replace(/`/g, "'")}\``,
      )
  );
}

const components: Components = {
  a({ href, children }) {
    if (href?.startsWith("/") && !href.startsWith("//"))
      return (
        <Link href={href} className="text-primary font-medium">
          {children}
        </Link>
      );
    return (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow">
        {children}
      </a>
    );
  },
};

export function TiggyMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={components}
      disallowedElements={["img"]}
      unwrapDisallowed
    >
      {tidyMaths(text)}
    </ReactMarkdown>
  );
}
