# Provider setup (checked 3 October 2026)

| Provider | Purpose | Key requirement | Application status |
| --- | --- | --- | --- |
| [Oak Curriculum API](https://open-api.thenational.academy/docs/about-oaks-api/api-keys) | School lessons and authorised quizzes | Request a key; set server-only `OAK_API_KEY` | Existing lesson quiz adapter; bundled public lesson catalogue works without a key |
| [DfE Display Advert API](https://developer.apprenticeships.education.gov.uk/) | English apprenticeship vacancies | [Register as a third party](https://developer.apprenticeships.education.gov.uk/third-party-accounts/register); set `APPRENTICESHIPS_API_KEY` | Version 2 adapter; recent 100-advert sample, not all UK listings |
| [Reed Jobseeker API](https://www.reed.co.uk/developers/jobseeker) | UK job search by keyword and location | Register for a key; set `REED_API_KEY` | New `/api/jobs` adapter; up to 50 results per search, cached for an hour |
| [Discover Uni dataset](https://www.hesa.ac.uk/data-and-analysis/discover-uni-dataset) | Official UK course and student-outcomes data | Public download, no API key | Research option, not imported; current university suggestions use a small curated set of official course links |

Do not put secret keys in `NEXT_PUBLIC_*` variables or commit them. Configure keys in local `.env.local` and the production host's server environment, then restart/redeploy. Provider approval, quotas and usage terms still apply; this document does not promise unlimited/free commercial access. No keys have been requested on the user's behalf.

## Board behaviour

`/jobs` starts from the signed-in learner's subjects and saved university/apprenticeship preference. Signed-in learners can override interest, region, study mode, job keywords, location and listing type. Feed errors and missing keys are distinguished from empty results; provider searches remain available. Searches send only keywords and location to Reed. Responses are validated and output as plain text, with HTTPS provider links. Credentials remain server-side; redirects are refused for authenticated provider calls.

The apprenticeship feed only has location text (often postcodes); this filter does not infer travel distance. Reed searches have the provider's location matching. Adverts are not guaranteed suitable for under-18 applicants. No claim is made that a job is entry-level unless the advert says so. Applications happen on provider sites.

University suggestions cover computing, business, psychology and engineering in a small curated collection. They are explicitly subject/region/study-style matches, not admission predictions, rankings, full UK coverage or current availability promises. Exact entry year, grades and required subjects must be checked on official course pages. Unsupported preferences show no matches plus UCAS/Discover Uni discovery links. Source URLs are stored alongside every suggestion.

Saved adverts and university links use the existing private Supabase `saved-opportunities` namespace; the shared save hook also supports device-only guest state, although the site currently requires sign-in for this page. Exploration filters are temporary; durable study/career preferences are edited in account settings. Automatic feed checks run every 15 minutes while the board is open. The APIs cache provider responses for up to an hour; production deployment is required to expose this new page.

Validation: 13 automated tests, TypeScript, ESLint and production build passed. Local HTTP checks verified missing-key status and oversized-query rejection. The browser correctly redirected `/jobs` to sign-in; a signed-in visual walkthrough and real-key Reed/DfE requests have not been performed.
