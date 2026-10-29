# Hackathon: plan gaps

**Summary**: What the plan (`PLAN.md`, `LANES.md`, `INTERFACES.md`) leaves out or leaves unfinished, checked against `main` at `34abfda` on 2026-10-29. Ordered by how much each one threatens Gate G1. Owner is who should act.

**Last updated**: 2026-10-29

---

## A. Critical path: nothing downstream can start

| # | Gap | Evidence | Owner |
|---|---|---|---|
| 1 | **Devin's lane is empty and it gates everyone.** No `js/adapt/`, `trainees/`, `js/ui-reasoning.js`. No event emission, no fixed-step API contract use, no session record (D1 to D5). Glenda and JL cannot test against real input. | `ls cgf-demo/js` shows only the original files | Devin; JL to unblock with a fixture session record |
| 2 | **Session record and history contracts are still "proposed".** Devin and Glenda have not agreed to INTERFACES §9.1. | LANES hand-off table | JL to get both sign-offs, then freeze |
| 3 | **Phase 0 is not done.** `contracts/` covers allocation and link only. No validators for events (§4), adjustments (§7), session record (§9.1), profile updates. No `runner/`. The plan's G0 and L2 (integration runner) have no files. | `contracts/` holds `contracts.js`, `link.js`; no `runner/` | JL |
| 4 | **No invariant tests exist.** CLAUDE.md lists 8 invariants that "tests must enforce". None is tested (clamp, fixed mode, byte-identical logs, LLM-off, `file://`). The clamp has no code yet. | `tests/` has `allocate.html`, `link.html` only | JL writes the harness; Devin the engine tests |
| 5 | **G1 is written per trainee, but the system is now per seat and per crew.** G1 still says "Trainee B's CGFs shift toward hail pressure". Seat-based acceptance (which seat, which competency, what a crew pane shows) is not written. | PLAN §6 vs INTERFACES §5.1 | JL rewrites G1 |
| 6 | **Competency signal exists for one scenario only.** Fighters and tanks are selectable, but only `strait-transit` emits anything. The 9-competency catalog (3 per seat) has no mapping to engine counters for air or land seats. | overview "Still open from the crew change" | JL and Devin: pick one demo platform for G1 and mark the rest "allocation only" |
| 7 | **Panes play identically.** No scripted trainee (S3) and no tailoring from the profile (R3 on `link-init`). Without both, there is no divergence to demo, which is 30% of the score. | overview "Next build step" | Devin (S3), JL (hand-off) |

## B. Unverified assumptions that can break the demo

| # | Gap | Owner |
|---|---|---|
| 8 | Two panes via iframes and `postMessage` from `file://` have never been run. `tests/link.html` exists but has not been run in a browser by anyone on record. Run it first. | JL |
| 9 | No Node on this machine (`which node` fails). The plan prefers `node:test`; with no Node, tests are browser pages only, so there is no command-line run for CI or pre-merge checks. Decide now: browser test pages only, and say so in CLAUDE.md. | JL |
| 10 | Determinism is untested. `CGF.tick` depends on frame timing; `CGF.step` exists but nothing uses it or checks it. A human-driven pane can never be byte-identical, so the demo must use scripted trainees. | Devin |
| 11 | Engine issues from the read of `engine.js` (repeated `failState` log, silent unknown-factor weights, uncapped catch-up sub-steps, unclamped `opening`) are still unfixed and untested. | Devin (S6) |
| 12 | Two stores for one trainee: Glenda's history (`js/history/`) and JL's profile (`js/assess/`). The `localStorage` keys, who writes which, and what happens when they disagree are not specified. | JL and Glenda |

## C. Decisions nobody has made

| # | Decision | Needed by |
|---|---|---|
| 13 | **Event length and start time.** All timing is in percentages. The 50% hard check cannot be scheduled without a clock. | Before the event |
| 14 | **Envelope scale.** The fixture's values are about a fifth of the runtime defaults, so the link does not apply them. | Before J2 is real |
| 15 | **Rule for a crew's weakest competency** (INTERFACES §5.1 says the seat's focus competencies; the crew-level rule is open). | Before J4 |
| 16 | Order report, then competency update, then `History.attachAssessment` is proposed, not agreed. | With #2 |
| 17 | May Eevee edit HTML markup? Assumed no (CSS and `design/` only). Her `eevee/ui-audit` branch (`e8675fa`) holds `design/requests.md` and a UI audit; nobody owns triaging it. | JL |
| 18 | Whether code written before the event is allowed (PLAN puts Phase 0 at hour 0). If not, everything built so far is at risk. **Check the event rules.** | Now |
| 19 | IT confirmation for the event laptops: Node, a local open-weight LLM, installing packages, using Claude Code. | Before the event |

## D. Missing from the plan entirely

| # | Gap | Notes |
|---|---|---|
| 20 | **Nobody owns the pitch beyond JL.** L4 (five back-to-back runs, fallback video), L5 (savings model, deck, Q&A) and L6 (merging) are all JL, on top of contracts, runner, assessment and cohort. JL's lane is the most overloaded after Devin's. Give the deck content and the fallback video a second owner, for example Glenda once the report is done. |
| 21 | **Savings model has no figures** (PLAN §12). Division figures are needed before the pitch; do not present invented ones. Start asking now. |
| 22 | **No run-of-show for the demo with real seats.** PLAN §8 is written for one trainee pair on the strait. It does not say which platform, which crew and which seat the 5 minutes show. |
| 23 | **HLA/DIS roadmap slides** (demo beat at 4:15) have no owner and no content. |
| 24 | **Fallback path for every demo beat** ("one click away") has no spec. Needs the recorded video plus a saved-session replay if live fails. |
| 25 | **Session replay** is listed in the repo README as a next idea and would double as the fallback, but is not in the plan. |
| 26 | **Report validator** (no number in the narrative that is not in the facts) is in the plan but has no named test fixture or failure examples. Glenda to add. |
| 27 | **Line endings.** Git warns that LF becomes CRLF on this machine. Add a `.gitattributes` (`* text=auto eol=lf`) before four people on different machines commit, or diffs and file-hash checks will churn. |
| 28 | **Public repo hygiene.** The repo is public. Roster names and trainee data must stay synthetic; add a one-line check to the merge checklist. Personal emails stay out of docs. |

## D2. CGF capabilities added 2026-10-29 (JL)

Devin's CGFs must (1) work together and share information, (2) react to the trainee's current actions, (3) customise from the trainee's past training. Now in `LANES.md` (D6, D7) and `PLAN.md` §2a.

| # | Gap | Owner |
|---|---|---|
| 29 | **Cooperation does not exist.** Units are independent in `engine.js`; only the `conflict` factor links them, and only for civil traffic. A shared picture, group escalation and handover need new engine state. | Devin (D6) |
| 30 | **No contract for shared information.** Events (§4) and adjustments (§7) have no `team` cause and no field saying which unit informed which. Needs a Lead decision before D6 and D7 emit anything. | JL |
| 31 | **Determinism and cost.** Sharing must be order-independent (units updated in a fixed order, picture read before write) or invariant 3 breaks. | Devin |
| 32 | **Demo beat is missing.** PLAN §8 shows history and live behaviour, not two CGFs cooperating. Add one beat or the feature earns no marks. | JL |
| 33 | **Competency link.** Which competencies cooperation exercises (for example `hail_discipline` ignored, so the whole force escalates) is not mapped. | JL and Devin |

## D3. Plan change 2026-10-29: one crew, AI partners

Gaps #7 and #8 (identical panes, two panes from `file://`) now read as: one runtime must diverge between run 1 and run 2, and one iframe must load from `file://`. New gaps:

| # | Gap | Owner |
|---|---|---|
| 34 | Code still builds two panes: `contracts.js`, `ui-allocate.js`, `host.html`, `link/`, and `tests/allocate.html` and `tests/link.html` (J8) | JL |
| 35 | No `History.entries`, so partners have no source of older runs; `Assess.partnerParams` does not exist (J7) | Glenda, JL |
| 36 | Partner agents are not built; `crew-agent.js` takes a profile path only (D8). Devin must also confirm the policy skips partner seats | Devin |
| 37 | A partner with no history falls back to profile means, then a default. The seeded history in `fixtures/history/` must include at least one trainee with session records, or the demo never shows `basis.source = history` | Glenda |
| 38 | The report and `Assess.update` must skip partners; the validators do not know `role` or `derived_from` yet | JL, Glenda |
| 39 | Demo proof of adaptation is now a run-after-run comparison. Needs a saved run-1 session and a fixed-mode run on the same seed as a baseline, or the divergence is hard to show | JL |

## D4. Status after the clean-up pass (2026-10-29, JL)

**Cleared**

| Gap | How |
|---|---|
| #3, #4 (contracts, invariants) | Event, adjustment and session-record validators (`6fd6bd0`). `tests/g1.html` (9 tests, browser) checks invariants 1, 2 and 3 on the real runtime. Devin's `node --test tests/runtime/` needs Node, which this machine lacks, so only the browser tests run here |
| #7, #8 (panes, iframes) | One runtime, one pane (J8). `tests/link.html` loads the runtime in an iframe from `file://` and 30 of 31 pass; the 31st ("sim time advances") is flaky in headless Chrome because Chrome pauses animation frames in off-screen iframes |
| #12 (two stores) | Profile: `cgf.profile.<id>` (JL, `Assess`). History: `cgf.history.<id>` (Glenda). Linked only by `History.attachAssessment`. No overlap |
| #14, #15 (envelope scale, crew rule) | Default envelope raised (`6fd6bd0`) and `calm_down_rate` and `detection` added (runtime defaults 1 and 20). The crew-weakest rule is replaced by per-seat targets (INTERFACES §5.1) |
| #16 (order) | The host runs report, then `Assess.update`, then `History.attachAssessment`, in that order (`link/host.js`) |
| #27 (line endings) | `.gitattributes` and `.gitignore` added |
| J4, J5, J8 | `Assess.update`, `Assess.cohort`, the allocation page reads saved profiles, single crew. `tests/assess.html` 12, `tests/allocate.html` 88, `tests/g1.html` 9 |
| Decision D (record to host) | `8239de9` |
| G0 integration runner | `tests/g1.html` is the runner: run, report, update, run again on the same seed |

**Still open**

| Gap | Owner |
|---|---|
| #13 event length and start time; #18 pre-written code rule; #19 IT checks (Node, local LLM, Claude Code) | JL, outside the repo |
| #20 second owner for the deck and fallback video; #21 savings figures; #22 run-of-show; #23 HLA/DIS slides; #24, #25 fallback and replay | JL |
| #17 triage of Eevee's `design/requests.md` | JL |
| #29 to #33 CGFs that cooperate (D6, D7) and the `team` cause in the contracts | JL (contract), Devin |
| J6 cohort heatmap view (the data exists: `Assess.cohort()`); first on the cut list | JL |
| Tentative: AI partners (#34 to #39 apply only if confirmed) | JL |
| Devin's node tests unrun on this machine | Devin, or install Node |

## E. Housekeeping found while reading

- The vault copy of `overview.md` says "Nothing is built yet" in Status, while the same page lists the allocation page and link as built. The repo copy is the source of truth; sync the vault copy.
- The vault `PLAN.md` still lists five maritime competencies and `piracy_response`; the repo has a 9-competency catalog and renamed it `speed_management` (`90ccaa3`). The vault `PLAN.md` §7 mapping table is stale.
- The JL clone had **uncommitted work** at the time of this check (vehicle selection in the allocation page: `allocate.html`, `contracts/contracts.js`, `fixtures/profiles/roster.js`, `js/ui-allocate.js`, `tests/allocate.html`, new `js/ui-allocate-vehicles.js`, about 410 lines). It is not in `main`. Commit it on a `jl/` branch or to `main` after running `tests/allocate.html`.
- `.claude/` and worktree paths are not ignored; there is no `.gitignore`.

## Suggested order

1. Check the event rules on pre-written code (#18) and IT items (#19).
2. Run `tests/link.html` and `tests/allocate.html` in Chrome (#8).
3. Commit the vehicle work; add `.gitattributes` (#27).
4. Write the event, adjustment and session-record validators and a fixture session record (#2, #3), so Glenda and JL stop waiting on Devin.
5. Rewrite G1 per seat and pick the one demo platform (#5, #6).
6. Get Devin's sign-off on §9.1, then freeze contracts.
7. Add the invariant test harness (#4, #9).
8. Triage `eevee/ui-audit` requests (#17).
9. Start the savings-figure request and the second owner for the deck (#20, #21).

## D5. Status after the assess, runner and partner pass (2026-10-29, JL)

**Cleared**

| Gap | How |
|---|---|
| #17 triage of Eevee's requests | `docs/project/eevee-requests-triage.md`. R7, R15 and R16 done; R1, R5, R6 done earlier; R3, R4 and R9 need a decision or Eevee; the rest are Devin's |
| #4, #9 (no command-line test run; no Node) | `runner/run-tests.ps1` runs every browser test page headless and exits non-zero on failure: allocate 104, assess 35, g1 9, link 36 |
| #30 (no contract for the cause of an adjustment) | `adjustment.cause`: `live`, `history`, `team`, optional until Devin emits it (INTERFACES §7) |
| #35, #38 (partners: no source, validators) | `Assess.partnerParams`, partner crew validators, `Assess.update` and the host skip partners. The report still needs Glenda (`requests-for-glenda-partners.md`) |
| #39 (demo proof of adaptation) | `compare.html`: a fixed baseline beside an adaptive run on the same seed and crew. Rehearsed end to end through the real host and runtime |
| J6 cohort view | `cohort.html` |

**New findings**

- A 2400 s run with the scripted crew produces only about two hail events, so the comparison reports "too few events to compare" and every run ends `fail`. The demo cannot yet show a measured change. Needs Devin (richer scripted behaviour or more hails). See `replies-to-devin-decisions.md`.
- `origin/main` was force-updated once (dropped three commits; restored by a merge). Rules against force-push are in `CLAUDE.md`.

**Still open**: #13, #18, #19, #20 to #25 (event length, pre-written code rule, IT checks, second owner for the deck, savings figures, run-of-show, HLA/DIS slides, fallback and replay), #29 to #33 (cooperating CGFs, Devin), #36 and #37 (partner agents in the runtime; seeded history for partners), the demo platform (waiting on Devin). The deck outline is in `docs/pitch/deck-outline.md`.
