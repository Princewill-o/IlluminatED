# Education content providers and answer grounding

Reviewed 18 October 2026. There is no verified single public API in this research that supplies licensed question-and-answer content for every UK exam board and qualification. Public availability and a school subscription do not establish commercial platform reuse rights.

## Recommended first integration: Oak Curriculum API

[Oak API overview](https://open-api.thenational.academy/docs/about-oaks-api/api-overview), [coverage](https://open-api.thenational.academy/docs/about-oaks-data/content-coverage), [key request](https://open-api.thenational.academy/docs/about-oaks-api/api-keys), [terms](https://www.thenational.academy/legal/terms-and-conditions-api-version).

Oak documents a free organisation-key API with lesson summaries, misconceptions, quizzes and answers. Its advertised coverage is Key Stages 1–4, with board-dependent GCSE pathways. It is not a complete UK exam-board, A-level, Scottish or vocational assessment feed. API lesson content is under OGL except where stated; excluded assets and attribution must be respected. The API software's MIT licence is separate from curriculum-content rights.

The current v1 contract was checked against `https://open-api.thenational.academy/api/v1/swagger.json`: Bearer authorisation, `/lessons/{lesson}/summary` and `/lessons/{lesson}/quiz`.

Implemented:

- Existing live quizzes retain source credit and the OGL link.
- `getOakSummary` loads validated, bounded learning points, keywords and misconceptions from the fixed Oak host. Redirects are rejected and requests time out after four seconds.
- Tiggy retrieves up to two relevant summaries matching the learner's stored course, year and compatible board. Unknown tier does not silently select a Higher/Foundation pathway. Post-16 requests do not fall back to GCSE material. Unsupported requests keep the existing reviewed local notes/general-knowledge behaviour with an instruction not to claim external verification.
- The answer prompt can use retrieved summaries to explain concepts and create original practice questions. It must credit the source and cannot label generated practice as an official paper or mark scheme. Retrieved text is explicitly reference data rather than executable instructions.
- Only public lesson slugs are sent to Oak. Learner names, profile details and question text are not sent to Oak. Existing AI-provider handling is unchanged.
- `/games/sources` and `/api/education/store` report provider capabilities and configuration gaps. Publisher links are not represented as imported question banks.

### Activation still required

No Oak API key was configured in the local project during this work. Request an organisation key using Oak's form, review its terms, and configure **`OAK_API_KEY` as a server-side deployment secret**. Do not commit it or paste it into a public issue. This work did not register an account, accept a provider agreement, purchase a service or send an enquiry. The integration was checked with contract/validation tests; a successful authenticated live content request remains to be checked once the key is configured.

## Official board services and remaining coverage

| Coverage | Service | Integration position |
| --- | --- | --- |
| AQA | [Exampro](https://www.exampro.co.uk/) and [AQA papers](https://www.aqa.org.uk/past-papers-and-mark-schemes-finder) | Exampro says created documents must not be shared outside the centre. Seek a publisher agreement; do not resell a school account's content. See [AQA copyright policy](https://www.aqa.org.uk/about-us/who-we-are/our-standards/copyright-and-intellectual-property-policy). |
| Pearson Edexcel, selected BTEC/Functional Skills | [examWizard](https://qualifications.pearson.com/en/support/Services/examwizard.html) | An official bank for teachers/centres, accessed through Edexcel Online. No public content API or commercial redistribution permission verified. |
| Cambridge OCR | [ExamBuilder](https://www.ocr.org.uk/qualifications/past-paper-finder/exambuilder/) | Restricted to OCR-centre staff. Its [terms](https://exambuilder.ocr.org.uk/marketing/terms/) restrict storing/reproducing/reselling the service. A separate agreement would be needed. |
| Wales | [WJEC Question Bank](https://www.wjec.co.uk/en/home/question-bank/) | Classroom question/paper construction, not a verified commercial feed. WJEC notes the legacy bank is no longer adding questions; freshness needs attention. |
| Eduqas | [Eduqas Question Bank](https://questionbank.resources.eduqas.co.uk/) | Official service; commercial ingestion/API rights not verified. Keep distinct from WJEC qualification mapping even though this app groups them under one board id. |
| Northern Ireland | [CCEA papers/mark schemes](https://ccea.org.uk/past-papers-mark-schemes) | Publisher links only; no public content API or commercial reuse agreement established. |
| Scotland | [Qualifications Scotland papers](https://www.sqa.org.uk/pastpapers/) | National Qualifications/Higher/Advanced Higher mapping remains separate work. [Commercial use needs written permission](https://qualifications.gov.scot/terms-and-conditions). |
| NCFE/CACHE | [NCFE past papers](https://www.ncfe.org.uk/customer-and-learner-support/learner-support/past-papers/) | Availability varies and not every qualification is externally examined. Some recent materials require centre access. No platform redistribution rights established. |
| City & Guilds | [Exams support](https://www.cityandguilds.com/delivering-our-qualifications/exams-and-admin) | Qualification/centre-specific resources; never import secure live assessments. |
| AAT | [Study support](https://www.aat.org.uk/qualifications-and-courses/how-to-study) | Registered student/provider access is not an integration licence. |
| CILEX | [Past papers](https://www.cilex.org.uk/study/information_for_students/exams/past_papers/) | Qualification-specific materials; publisher agreement needed before commercial import. |

This is the core national/general and app-relevant vocational shortlist, not an exhaustive inventory of every Ofqual-recognised awarding organisation. International GCSE/Cambridge International and additional awarding organisations require separate scope and licensing research. The application's regulator search remains the discovery mechanism for additional qualifications.

## Suggested publisher enquiry (draft only)

We operate IlluminatED, a UK study platform. Can you offer an API or licensed data feed covering your published specifications, questions, answers, mark schemes and examiner commentary for the qualifications we agree?

Please confirm rights for commercial student access; indexing and embeddings; retrieval into an AI answer context; original question generation based on the material; permitted quotation and attribution; third-party exclusions; update/version identifiers; school versus individual licences; download/retention/deletion requirements; request limits; and fees. Please identify which recent or secure assessment material must never be ingested.

Only enable additional provider ingestion after written permission and a documented endpoint/schema. Store provenance, qualification code, board, tier, exam series, review date, licence/expiry and permitted uses per content item. Preserve the source's mark scheme rather than using model-generated answers as an official answer key.

## Checks

`tests/education-grounding.test.mjs` covers schema rejection, source-URL control, evidence fields, attribution, relevance, board/year/course/tier isolation and provider coverage. Existing education checks validate local question answers and source mappings. No claim of full-board content coverage is made in the UI.
