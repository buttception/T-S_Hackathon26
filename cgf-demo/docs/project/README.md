# Adaptive CGF Trainer (working title)

## Pitch

Instructors define CGFs and set the bounds within which each one may adapt. Each trainee has a performance profile built across sessions. During the exercise, an AI engine combines that experience with what the trainee is doing right now. The profile picks the competency to exercise. The live behaviour sets how hard to push. The engine shapes CGF behaviour inside the bounds to exercise the weakness. Every adjustment carries a plain-language reason, the instructor can steer the AI mid-exercise in plain language, and a fixed-difficulty mode keeps qualification runs standardised. At the end, the instructor receives a report per trainee and a cohort view of where a whole intake is weak.

## What the demo shows

The beat-by-beat script is `docs/pitch/run-of-show.md`. In short:

1. One crew on a warship in a strait transit. The trainee with weak hail discipline sits in the navigation seat, and the CGFs press hails there because that is the history-based target.
2. An instructor panel explains every adjustment (setting, old and new value, evidence, and a cause tag `live`, `history` or `team`). The pressure follows how the trainee is doing now.
3. CGFs in one force share what they know and respond together.
4. The instructor steers in plain language; the parsed directive is shown before it applies.
5. A switch to "Fixed assessment" stops all adjustments.
6. An end-of-training report, a profile that updates for the next session, a fixed-versus-adaptive comparison, and a cohort view for improving the curriculum.

## Ground rules

- The base is the team repo `buttception/T-S_Hackathon26`, folder `cgf-demo/`. The adaptation layer is added on top.
- No product code, no customer data, no real recordings. All scenarios, trainees and history are synthetic.
- The AI runs on-prem by design. Every LLM feature has a template fallback so the demo runs offline.
- The demo runs from `file://` with no server and no install.

## Read in this order

1. `PLAN.md`: the merged idea, roles, phases, gates, demo script, cut list.
2. `docs/LANES.md`: who works where, each person's tasks, and the hand-offs.
3. `docs/INTERFACES.md`: frozen contracts between lanes.
4. `CLAUDE.md`: rules for Claude Code sessions. Claude Code loads it automatically.
5. `repo-vs-plan.md`: why the two designs were merged and what each side contributed.
6. `project-map.html`: a picture of how one session runs (messages between pages, the simulation and adaptation loops, where data is kept), which files each page loads, and the files nothing uses. Open it in a browser. `node runner/find-unused.js . out.json` (from `cgf-demo/`) re-runs the unused-file check.

## Layout (inside `cgf-demo/`)

```text
allocate.html, js/ui-allocate.js   Trainee allocation page              Owner: JL
host.html, link/                   Host page, link to the runtime       Owner: JL
js/assess/                         Competency update, profiles, cohort  Owner: JL
runtime.html, js/engine.js, ...    Simulator, harnesses, scenarios      Owner: Devin
js/adapt/, js/ui-reasoning.js      In-run adaptation, instructor reasons Owner: Devin
trainees/                          Scripted trainees                    Owner: Devin
report.html, js/report/            End-of-training report               Owner: Glenda
js/history/, fixtures/history/     Trainee history                      Owner: Glenda
css/, design/                      Look, feel, layout specs             Owner: Eevee
contracts/, runner/, docs/         Contracts, integration, plan docs    Owner: JL
tests/                             Tests                                Each owner for their own
```

Who works where, with tasks and hand-offs: `docs/LANES.md`.
