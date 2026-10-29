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
