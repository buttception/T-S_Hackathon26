# Hackathon (Adaptive CGF Trainer): overview

**Summary**: JL's team entry for a hackathon. An engine adapts CGF behaviour, inside bounds the instructor sets, to exercise a trainee's weakest competency. It uses the trainee's history to pick the target and their current behaviour to set the intensity. The demo is a web console showing two instances side by side, with explanations, plain-language steering, a fixed mode, and reports. The team is four people: Lead (JL), Sim, Engine, Console. JL works in two Claude sessions: a Lead session in the vault, and a code session in the repo clone.

**Last updated**: 2026-10-29 (cleaned for the presentation)

---

## Resume here

- **Location**: public GitHub repo `buttception/T-S_Hackathon26`, folder `cgf-demo/`. The docs in `cgf-demo/docs/` are the source of truth.
- **State (2026-10-29)**: the core loop is built on `main`. One crew, one runtime, per-seat adaptation, AI partner seats, cooperating CGFs, the instructor reasoning panel (cause tags `live`, `history`, `team`), the session record, the end-of-training report and trainee history, the competency update, the cohort page, the baseline comparison, and the allocation and host pages with mode badges. Demo platform: a warship on `strait-transit`.
- **Tests**: `node --test tests/report tests/runtime` and `powershell -ExecutionPolicy Bypass -File runnerun-tests.ps1` (allocate, assess, g1, link, report pages) all pass as of `158bca0`. Run both before each push (`push-checklist.md`).
- **Read first**: `docs/pitch/run-of-show.md` (the 5-minute script) and `docs/pitch/deck-outline.md`, then `docs/LANES.md` for who owns what.
- **First command**: open `cgf-demo/allocate.html` in Chrome or Edge from `file://`, or `runtime.html?demo=tour&loop=1` for the captioned tour.

## Open threads

- **Not yet done, by a person**: rehearse and time the run-of-show; record the fallback video and save a fixed baseline and an adaptive run (`pitch/fallback-plan.md`); design the deck with Eevee's theme; run five back-to-back demos (G3).
- **Savings figures**: the division's numbers are still needed (`pitch/savings-model.md`). Do not present invented figures.
- **Event facts**: dates and clock, whether code written before the event is allowed, and IT approval for Node, a local LLM and Claude Code on the event laptops. If Node is not allowed, tests are the browser pages only.
- **Demo seed**: check that the demo run gives enough hail events for the baseline comparison; `compare.html` says "too few events" otherwise.
- **Eevee's styling**: the host and runtime mode badge, `--rp-chart-focus`, `rp-result--*`, `tr.rp-partner` (`requests-for-eevee-r3-r9.md`), then update `design/requests.md` and delete `NOTES-FOR-EEVEE.md`.
- **Sign-off**: Devin and Glenda have not formally signed off INTERFACES §9.1; it is built and flowing.
- **Competencies**: five of nine are measured (hail discipline, collision avoidance, territorial awareness, weapons discipline, speed management). Four have no events yet and are labelled "not measured yet".

## Decisions so far

- Lanes by person (2026-10-29, JL): JL allocation, hand-off and competency update; Devin runtime, CGF adaptation and the instructor-visible reasoning for raising or lowering difficulty and hostility; Glenda end-of-training report feeding the trainee history; Eevee UI/UX. Why: each person, with their own Claude, works without touching another's files. Detail: `docs/LANES.md`.

- Merge of the plan and the repo (2026-10-29, JL): adapt to the trainee's experience and current behaviour, tailored per trainee. Why: the repo already reacts to current behaviour and runs offline; the plan's competency model, envelope and explanations are what it lacks. See [[user/projects/Hackathon/repo-vs-plan]].
- The allocation page outputs an `Allocation` wrapper (INTERFACES §3.1) that pairs the two panes, not a bare pair of configs (2026-10-29, JL). `agent_profile` is required in every seat, so scripted-only seats hold for G1 (INTERFACES §3.1). Display names are the trainee's name (JL, 2026-10-29): INTERFACES §5 profile gains a `name` field; `contracts/contracts.js`, the roster fixture and the allocation page still need it (the validator rejects unknown keys). Names stay synthetic, per the data rule. Still undecided: competency coverage in seeded profiles and the "no new scenarios before G2" rule. Per-seat adaptation is decided (see above).
- Stack is vanilla JS with no build step, running from `file://`. This replaces the earlier Python 3.11 / FastAPI decision.
- Competencies vary by seat (2026-10-29, JL; INTERFACES §1.1). The catalog has 9, three per seat. Five are measured from counters the repo already keeps: hail discipline, collision avoidance, territorial awareness, weapons discipline and speed management (was piracy response). Four are not measured yet: threat evaluation, contact detection, picture reporting and escalation control. They stay at the prior until Devin adds events, and any he cannot measure honestly is dropped. The event mapping is still provisional until Devin confirms what the simulator can emit.
- Each lane owns a set of files. Contracts change only through the Lead.
- The LLM is never on the critical path, and every LLM feature has a template fallback.
- All data is synthetic.

## Decisions of 2026-10-29 (JL), after Devin's adaptive runtime

- **Band direction: challenge (reversed 2026-10-29, JL).** Raise the pressure while the trainee handles the target well, ease off while they struggle (INTERFACES §6, PLAN §2). One rule, no `band_mode` in the config. This replaces the same day's remediation decision; the rule is one line in `js/adapt/adapt.js`.
- **Run length: 2400 s** default. First hails come about 15 minutes in. A validation run showed only four hail events in 2400 s, so the live signal may engage late (see `replies-to-devin-decisions.md`).
- **Default envelope raised** to the runtime's defaults (aggression and sensitivity base 1.0, reaction delay base 30 s) and extended to every setting a tactic nudges.
- **Runtime validators added** in `contracts/`: `validateEvent`, `validateAdjustment`, `validateSessionRecord`. Checked against real sessions from the runtime.
- **G1 seating:** the hail-discipline trainee sits in the navigation seat.
- **Open:** whether the pane sends the session record to the host (Devin's item D, in `link/`, JL's lane).

## Decisions of 2026-10-29 (JL), after the lane review

- **R3 adopted:** the names are "Adaptive practice" and "Fixed assessment", separate from Exercise and Freeplay, shown as an always-visible badge on the host (JL) and runtime (Devin).
- **R9 decided:** "Why is it reacting?", tension and posture move out of the Trainee tab to the instructor view and the debrief. Devin implements it.
- **Demo platform:** a warship on `strait-transit`. Fighters and tanks stay "allocation only" until a scenario emits their events.
- **Done after that (JL's list):** `PARTNERS_RUN` on; `hostLink.forReport` passes the whole record; host mode badge (R3; Eevee styles it, see `requests-for-eevee-r3-r9.md`); runner includes `tests/report/`; pitch files in `docs/pitch/` (run-of-show, fallback plan, HLA/DIS roadmap, savings blanks); `project/push-checklist.md`. Not done: telling Devin and Eevee (the notes exist), rehearsal, video, deck design, savings figures, event rules, IT, and the event clock.
- **Glenda's open items** (partners in the report, R18, R20, R21, seeded history with sessions, validator fixtures) were handed to a separate agent on branch `glenda/outstanding`. When it pushes, `hostLink.forReport` in `link/host.js` can stop stripping partner entries; see `js/report/REQUESTS-FOR-JL.md`.
