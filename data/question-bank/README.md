# Illumed GCSE and A-level Question Bank — DRAFT

**3,344 original/draft questions** across 12 GCSE subjects and 14 A-level subjects. Includes 1255 questions brought forward from the previous mathematics collection.

## Important publication restrictions
- **None of these are authenticated AQA, Pearson Edexcel or OCR past-paper questions.**
- Board references are prospective *targets* only. Board-by-board specification mapping has NOT been performed or verified.
- **All questions are unreviewed drafts; do not publish directly.** Some open-ended items are rubric prompts requiring custom source texts and better marking criteria. The older generated maths questions have not been checked for correctness.
- Do not imply endorsement or affiliation with examination boards.
- This is an initial seed, **not sufficient for full exam readiness or a guaranteed grade 8/9 / A/A***.

## Files
- `questions.jsonl` comprehensive question records (best for database import)
- `illumed_questions.sqlite` indexed SQLite file (includes original metadata)
- `manifest.json` scope and counts
- `qa_report.json` QA coverage and warnings

## Database example
```sql
SELECT question, answer, topic FROM questions WHERE level='GCSE' AND subject='Biology' LIMIT 20;
```

## Before launch
1. Allocate each item to exact specification and teaching year; assess overlaps and differences.
2. Review fact accuracy, mark schemes, answer acceptance and difficulty.
3. Add text/extract-linked literary analysis, authentic practical work, unseen documents and source-based extended answers.
4. Check exam-board branding usage and licence terms.
5. Only switch `publish_ready` to true after approval in your content management system.
