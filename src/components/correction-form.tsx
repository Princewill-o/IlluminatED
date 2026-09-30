"use client";

import { useState } from "react";

import { Copy, Mail } from "lucide-react";

import { fieldCls, labelCls } from "@/components/kit";
import { Button } from "@/components/ui/button";

const INBOX = process.env.NEXT_PUBLIC_CORRECTIONS_EMAIL;

export function CorrectionForm() {
  const [page, setPage] = useState("");
  const [issue, setIssue] = useState("");
  const [fix, setFix] = useState("");
  const [source, setSource] = useState("");
  const [copied, setCopied] = useState(false);

  const report = `IlluminatED correction request\nPage: ${page}\nWhat's wrong: ${issue}\nSuggested correction: ${fix}\nSource (e.g. specification page): ${source}`;
  const ready = page.trim() && issue.trim();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <form
      className="bg-card space-y-3 rounded-xl border p-5"
      onSubmit={(e) => e.preventDefault()}
      aria-label="Correction request"
    >
      <div>
        <label htmlFor="cr-page" className={labelCls}>
          Which page or topic?
        </label>
        <input
          id="cr-page"
          className={fieldCls}
          value={page}
          onChange={(e) => setPage(e.target.value)}
          placeholder="e.g. GCSE Chemistry › Atomic structure"
          maxLength={200}
        />
      </div>
      <div>
        <label htmlFor="cr-issue" className={labelCls}>
          What's wrong?
        </label>
        <textarea
          id="cr-issue"
          className={`${fieldCls} h-24 py-2`}
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          maxLength={1000}
        />
      </div>
      <div>
        <label htmlFor="cr-fix" className={labelCls}>
          Suggested correction{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          id="cr-fix"
          className={`${fieldCls} h-20 py-2`}
          value={fix}
          onChange={(e) => setFix(e.target.value)}
          maxLength={1000}
        />
      </div>
      <div>
        <label htmlFor="cr-source" className={labelCls}>
          Source{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          id="cr-source"
          className={fieldCls}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Link to the specification or textbook page"
          maxLength={300}
        />
      </div>
      <p className="text-muted-foreground text-xs">
        Please don't include your name, school or other personal details.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {INBOX ? (
          <Button asChild disabled={!ready}>
            <a
              href={`mailto:${INBOX}?subject=${encodeURIComponent("IlluminatED correction")}&body=${encodeURIComponent(report)}`}
              aria-disabled={!ready}
            >
              <Mail aria-hidden /> Email this report
            </a>
          </Button>
        ) : (
          <span className="bg-muted rounded-full border px-3 py-1.5 text-xs font-medium">
            Corrections inbox coming later
          </span>
        )}
        <Button
          variant="outline"
          type="button"
          onClick={copy}
          disabled={!ready}
        >
          <Copy aria-hidden /> {copied ? "Copied!" : "Copy report"}
        </Button>
      </div>
    </form>
  );
}
