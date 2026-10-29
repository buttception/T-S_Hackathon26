# Pitch deck outline

**Owner**: JL (L5). **Written**: 2026-10-29. **Status**: an outline only: content and order, no design (Eevee owns the theme). A second owner for the deck and the fallback video is still wanted (`plan-gaps.md` #20).

**Rules for this deck**: say only what is built and was seen working. Mark anything else as roadmap. No invented figures: the savings model keeps its placeholders until division numbers exist. All trainee data is synthetic. The demo platform and scenario are not final: Devin has to confirm which one emits enough events (see "Open before the pitch").

**Scoring map** (PLAN §1): demonstrated potential 30%, readiness 30%, uniqueness 20%, AI adoption, market and savings 20%. Each slide below says which it serves.

## Slides

| # | Slide | Says | Shows | Serves |
|---|---|---|---|---|
| 1 | The problem | One instructor, many trainees. Fixed scenarios train the average trainee, so the weak spot of each person is practised by chance. | A single line, no chart | Potential |
| 2 | The idea | An adaptive trainer: the AI decides **what** to exercise from the trainee's history and **how hard** to push from what they are doing now. The instructor stays in command. | The two signals as one diagram: profile picks the target, live behaviour sets the pressure | Uniqueness |
| 3 | The loop | Allocate, run, report, update. Each step is a page that works offline from a file. | Four screenshots in a row: allocation, run, report, cohort | Readiness |
| 4 | Live demo, part 1: allocate | The instructor picks the platform and the crew. Each trainee's competencies and focus areas are shown; "Suggest demo crew" fills the seats. | The allocation page: vehicle diagram, seat cards, likely first target | Potential |
| 5 | Live demo, part 2: the run | The CGFs adapt inside limits the instructor set. Every adjustment shows what changed, the direction, the evidence and a reason, with its cause: live, history or team. | The reasoning panel during a run; the envelope; the mode badge (adaptive vs fixed) | Potential, uniqueness |
| 6 | Proof: a baseline | The same seed and crew, once in fixed mode and once adaptive. The comparison counts what changed. It is an illustration, not proof of training transfer. | `compare.html` for the two runs, including its caveat line | Potential, readiness |
| 7 | The debrief and the update | After the run: a report per trainee, then the profile updates, so the next session starts from it. Code computes every figure; narrative is a template the LLM may only rephrase. | The report page; a profile bar moving between two runs | AI adoption |
| 8 | Control and safety | Fixed mode for assessment, bounds the AI cannot leave, every action explained and reversible. Practice and assessment are kept visibly apart; no rankings. | The envelope editor; the fixed-mode badge; the cohort caption "for improving the curriculum, not for ranking" | Uniqueness, AI adoption |
| 9 | The cohort view | Where the whole intake is developing, to improve the curriculum. | `cohort.html` | Market |
| 10 | Where it goes next | Team-based training (crew view, team competencies), CGFs that cooperate and share what they know, AI partners built from older runs, HLA/DIS integration so it drives an existing simulator. | A roadmap line, each item labelled "not built" | Market |
| 11 | The business case | Fewer simulator sessions to reach proficiency, and less instructor time per trainee. The saving formula (PLAN §12) with the reduction `r` shown as a range and labelled an assumption. | The formula and a sensitivity table with blanks for division figures | Market |
| 12 | Close | One sentence: it exercises the weakness of each trainee, inside limits the instructor sets, and explains every step. | The title and the repository | Potential |

## Backup and fallback (gap #24)

Every beat needs a one-click fallback (PLAN §8): a recorded video of the full flow, and a saved pair of runs (fixed baseline and adaptive) so `compare.html` works without a live run. `Runs.save` already keeps the last ten runs in the browser; exporting them as JSON from the host page is the saved-run copy. Not yet recorded.

## Likely questions, with the honest answer

| Question | Answer |
|---|---|
| Does adaptation break standardised assessment? | Practice runs adapt; fixed mode is for qualification, shown by a different badge. |
| Can the AI teach the wrong lesson? | It acts only inside the instructor's limits, and every change shows its evidence and reason for the instructor to override. |
| Do you prove training improves? | No. The demo shows the mechanism. Proof needs a trial with real cohorts, which is the proposed next step. |
| How many competencies are measured? | Five of nine today (hail discipline, collision avoidance, territorial awareness, weapons discipline, speed management). The other four have no events yet and are labelled so. |
| Where does the data live? | In the browser, on the training laptop. No cloud service. |
| What if the local model is unavailable? | Every LLM feature has a template fallback; the whole demo runs with the LLM off. |

## Open before the pitch

- **Demo platform and scenario**: waiting on Devin. Only `strait-transit` emits competency events today, and a 2400 s run produces only a few hail events, so the comparison often says "too few events to compare". That needs richer scripted behaviour or a longer run before it can carry slide 6.
- **Savings figures**: need the division's numbers (`plan-gaps.md` #21). Do not present invented ones.
- **Event rules**: whether code written before the event is allowed (#18). Check first.
- **Pitch length and format**: PLAN says 5 minutes; confirm with the organisers.
- **Deck theme**: Eevee (E5).
