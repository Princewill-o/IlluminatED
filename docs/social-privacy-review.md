# IlluminatED Social privacy and child-safety review

Status: **draft; owner review required before enabling private messaging**.

This release adds optional private school/college storage and mutual friend
requests. It does **not** launch direct messages or claim end-to-end encryption.
Social can be used by people aged 13+, so messaging needs a separate data
protection impact assessment (DPIA), safeguarding design and security review.

## Data and defaults

| Data | Purpose | Default visibility | Removal |
| --- | --- | --- | --- |
| School/college name | Learner's optional private account note | Account owner, authorised operators and processors; never other members | Clear field or delete account |
| Friend request/connection | Opt-in connection between two usernames | Requests off by default; connection visible only to the two participants | Decline/remove, block, or delete account |
| Quiz answer streak | Encourage study | On-device, per account/browser; not public | Clear browser data |

No school name is copied into the public `profiles` table. Row-level security
restricts school and connection queries for ordinary signed-in users. Requests
must be enabled by the recipient first. Blocking
removes a connection. No school matching, people suggestions or contact import
is used. The school field is optional and not part of onboarding.

## Before launching private messaging

1. Complete a DPIA that assesses the risks for ages 13–15 and 16–17, including
   grooming, bullying, unwanted contact, sharing personal information, and
   loss of device encryption keys. Consult safeguarding and data protection
   specialists, and document the decision on age eligibility.
2. Design mutual-consent messaging controls: block, report, rate limits,
   sender restrictions, clear retention/deletion, and an abuse escalation path.
   Decide how reporting can work with end-to-end encryption without claiming
   that moderators can read ciphertext.
3. Specify and independently review the cryptographic protocol, key
   verification, multi-device and recovery behavior before claiming end-to-end
   encryption. TLS or encrypted database storage alone is not E2EE.
4. Update privacy information, terms, age-appropriate explanations, and data
   export/deletion flows before enabling messages. Test RLS with two users and
   a blocked user.

UK ICO guidance: [Children's code](https://ico.org.uk/for-the-public/the-children-s-code-and-children-s-online-privacy/)
and [DPIAs for children's services](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/2-data-protection-impact-assessments/).
