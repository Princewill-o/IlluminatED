# Subject study quests

Study entry points open the game: `/games/study` redirects to `/games/world?activity=study`, and the Learn dashboard's subject cards pass `subject={courseId}`. The game phone, Study Quarter and Today's tasks open the same quest system. Today's tasks keeps the study quest visible and displays the learner's saved choice. Clicking it opens the quest panel without leaving the world.

The server reads selected courses from `learner_details.subjects`, not from browser claims or editable auth metadata. The initial catalogue has 113 quests across all 43 selectable subjects, combining the existing topic lessons and every available topic in the server's larger scored question bank. Shared foundation topics are assigned to each course that lists them and labelled with their source course; they do not imply full coverage of the more advanced qualification. Only the learner's selected subjects appear. Quest content drawn from draft bank items is labelled as awaiting subject-expert approval.

Learners choose their subject and any topic in any order. Choosing another quest does not erase progress. The selected quest persists in `subject_quest_selection`; read acknowledgements and practice results persist separately for each topic. GCSE quests can load matching supplementary IllumED library lessons and the first match's wider unit inside the same panel (up to six title matches plus twenty unit lessons). The lesson picker validates the selected subject, topic, KS4, unrestricted status and returned candidate list on the server. Sixth-form quests use the existing sixth-form material rather than pretending the imported KS1–KS4 content covers KS5. Recall prompts and model answers add a self-check step before scored practice.

## Completion and rewards

- Lesson review is a self-reported acknowledgement after the lesson's final slide.
- Topic completion requires a reviewed lesson, two server-scored practice rounds at 80% or higher, and a successful round within the last 14 days.
- First topic completion awards 40 XP and 20 Clout. Removing/reselecting subjects or repeating an attempt cannot award it again.
- Completing every available topic in a subject unlocks an untimed practice exam checkpoint, up to 20 questions, sampling each available topic first before filling the remaining places.
- First checkpoint pass at 80% or higher awards 100 XP and 50 Clout for that subject. Saved results and currency updates occur atomically.

The UI distinguishes completed **available quest material** from full exam-board coverage. It says **ready for the practice exam checkpoint** and records practice performance; it does not promise a real exam grade or claim accredited/exam-board-approved preparation. Official specifications, teacher feedback and past papers remain necessary, particularly where topic coverage or expert review is incomplete.

## The 98% practice goal

The server reports a separate practice milestone. It requires all available topic quests to be current, at least forty available scored questions, no draft-labelled quest material, and three qualifying checkpoints from separate UK calendar days within fourteen days. Each checkpoint must contain at least ten questions and achieve at least 98% by its exact correct/total ratio. The union of those papers must contain at least forty distinct questions. The latest checkpoint on each day replaces earlier same-day results, and only the latest three days count, so a later lower score cannot hide behind an older high score. On the current papers of up to twenty questions, 98% requires 100%.

This is a practice goal, not a prediction or guarantee of a real examination result. Most subjects currently have too few questions; the two larger course pools contain draft material awaiting expert review. The UI explicitly reports those gaps. This work does not certify complete specification coverage or replace exam-board past papers, written/practical assessment or teacher review.

Checkpoint selection balances topics and prefers items the learner has not recently answered. Submitted choices are stored only with the user's own attempt and marked on the server. A latest incorrect answer creates a revision mission for the corresponding topic; a later correct answer clears that question's weakness. Earlier attempts without stored choices still retain their original results and rewards.

Choosing a mission and earning a first reward announce in-game events. The feedback layer displays animated updates, a bounded notification history for the visit, and skippable mission/achievement/checkpoint scenes featuring the player's own avatar. Cutscenes pause movement, can be disabled, and respect reduced-motion preferences.

Question answers remain on the server until submission. Attempts belong to one user, expire after 24 hours, enforce a minimum two seconds per question, and are rate-limited to 60 starts per hour. Retry submissions return the saved result without paying twice. The client freezes submitted choices if the response is lost and retries the same attempt. Public clients cannot write progress, completion, results or currency directly. Under-13 account and social restrictions remain unchanged; younger pupils still have the public lesson library.

## Catalogue updates and checks

`node scripts/build-subject-quests.mjs --sql-dir .education-export/quest-seeds` exports reproducible SQL seed batches from the checked-in topic definitions and the existing server question bank. Apply those with a privileged database tool after the schema migrations. Every scored key must exist in `private.study_question_bank`; unscored topics cannot unlock the checkpoint.

Run:

```text
node --test tests/subject-quests.test.mjs tests/subject-quests-ui.test.mjs tests/study-room.test.mjs tests/learning-awards.test.mjs
```

`tests/subject-quests-database.sql` checks selected-subject restrictions, review prerequisites, checkpoint locks, stale evidence, topic sampling, server grading, single rewards, idempotent retries and removal of a selected subject. Set `test.subject_quest_user` to an existing member UUID before running it. All fixture changes roll back. The legacy free-practice UI tests still exercise its existing exported component; the game's default StudyRoom now opens subject quests.

`tests/subject-mastery-database.sql` checks broad spaced evidence, latest-day failure handling, repeated small samples, draft gating, stored answers, revision suggestions and access grants. It also rolls back all fixtures, including temporary editorial-approval flags. `tests/game-feedback.test.mjs` covers notification history, scene preferences, pausing, skipping and timer cleanup.
