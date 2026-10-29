# CLAUDE.md

Rules for every Claude Code session in this repository. Read `cgf-demo/docs/PLAN.md`, `cgf-demo/docs/LANES.md` and `cgf-demo/docs/INTERFACES.md` before writing code. Then read `cgf-demo/README.md` for the existing simulator. Current project state, decisions and open threads are in `cgf-demo/docs/project/overview.md` (start with its "Resume here" block).

## Project

An adaptive CGF trainer, built on the maritime CGF simulator in `cgf-demo/`. An adaptation engine estimates each trainee's competencies from simulation events, keeps a profile across sessions, and adjusts CGF settings, inside an instructor-set envelope, to exercise the weakest competency. The profile (experience) decides which competency to target. The live signal (current behaviour) decides how hard to push. A web console runs one crew (trainees, plus AI partners built from older runs), explains each adjustment to the instructor, accepts plain-language steering, and produces an end-of-training report that feeds the trainee's history. The flow is: allocation (JL), then runtime and CGF adaptation (Devin), then report and history (Glenda), then competency update (JL); Eevee designs how it all looks.

## Lane boundaries

There are four people, each with their own lane. Full detail, tasks and hand-offs are in `cgf-demo/docs/LANES.md`. **At the start of the session, work out whose session this is from the user's first message ("I am Glenda"). If it is not clear, ask before editing anything.** Work only inside that person's files. Paths are inside `cgf-demo/`.

| Person | Lane | Files |
|---|---|---|
| JL | Allocation, hand-off and competency update | `allocate.html`, `js/ui-allocate*.js`, `host.html`, `link/` (JS and README), `js/assess/`, `contracts/`, `fixtures/` (profiles, platforms), `runner/`, `docs/`, their tests |
| Devin | Simulation runtime and CGF behaviour | `runtime.html`, `js/main.js`, `js/engine.js`, `js/factors.js`, `js/llm.js`, `js/adapt/`, `js/sim/`, `js/ui-reasoning.js`, `harnesses/`, `scenarios/`, `plugins/`, `projects/`, `demos/`, `trainees/`, `tests/runtime/`, their tests |
| Glenda | End-of-training report and trainee history | `report.html`, `js/ui-report.js`, `js/report/`, `js/history/`, `fixtures/history/`, `tests/report/` |
| Eevee | UI/UX design of the whole page | every `*.css` file, `css/`, `design/` |

Do not edit another lane's files. If the task needs a change there, stop and report the exact file, function and behaviour you need, and why; the user passes it to the owner.

- Devin wrote the existing runtime code. Do not reformat or restructure it.
- Eevee edits CSS and design files only. A layout that needs new markup or a class goes into `design/requests.md` for the page's owner. The other lanes use the classes and tokens from `design/` and do not hard-code colours or spacing.
- The one shared touch point in `runtime.html` is the `link/pane.js` script tag. It stays.
- Everyone pushes directly to `main` (decided 2026-10-29, JL). No lane branches and no merge gate. To keep `main` safe:
  - Commit only files in your own lane, in small commits, and push often.
  - Before each push, pull with `git pull --no-rebase` (a merge, never a rebase), run your lane's tests, and open the page you changed from `file://`. `main` must always open and run.
  - Never force-push, never rebase or reset commits that are already pushed, and never push with `--force` to "fix" a rejected push: pull, merge, push again. A force-push on 2026-10-29 dropped three commits from `main`.
  - If the pull brings a conflict in another lane's file, keep their version and tell them; do not resolve it for them.
  - Contracts (`contracts/`, `docs/INTERFACES.md`) still change only through JL.

## Contracts are frozen

`contracts/` and `docs/INTERFACES.md` define every message between lanes. Never change them, add fields to them, or work around them with ad hoc objects. If a contract blocks the task, stop and report the exact field or type you need. The Lead decides.

## Invariants

Tests must enforce each of these. Never weaken a test to make it pass.

1. No CGF setting ever leaves its envelope. All engine output passes through the clamp.
2. Fixed mode produces zero adjustments.
3. Same seed and same inputs produce byte-identical event logs under `CGF.step`.
4. Every LLM feature has a template fallback, and the full demo runs with the LLM disabled.
5. The LLM never produces a figure. Code computes every number in reports and explanations; the LLM only phrases them.
6. Steering text reaches the engine only as a schema-validated directive.
7. The demo opens and runs from `file://` with no server and no install.
8. Adjustments change CGF settings only. They never change the trainee's score, the scenario outcome or a unit's position.

## Conventions

- Vanilla JS loaded with `<script>` tags. No bundler, no framework, no package install for runtime code.
- Match the surrounding code: naming, comment density and the `window.CGF` registry style.
- Tests use Node's built-in `node:test` if Node is available, otherwise a browser test page. Do not add a test framework.
- No `Math.random` and no wall-clock time inside the simulation or the engine. Use a seeded generator.
- Fixtures that must load under `file://` are `.js` files that assign to `window.CGF_FIXTURES`, not `.json` files fetched at runtime.

## Data

All data is synthetic. Never add product code, customer data, real recordings, or real personnel names.

## When to stop and report

Stop and report instead of improvising when:

- a contract or invariant blocks the task
- the task needs another lane's files
- a dependency would need installing
- a test fails for a reason outside your lane

Report: what you were doing, what blocked you, the exact error or missing field, and the change you propose.

## Not now

Do not build: real simulator integration, HLA/DIS, team-level competencies and crew-level targeting (adaptation is per seat; see `docs/INTERFACES.md` §5.1 and §5.2), voice, VR, conversational CGFs, user accounts, a server or database, new scenarios before G2. See `cgf-demo/docs/PLAN.md` section 13.
