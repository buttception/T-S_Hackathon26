# Class names for Eevee to style (runtime, Devin's lane)

Markup and JS are in place for R2, R3, R8 to R14 and R9. Colour and layout are Eevee's. Nothing here uses inline colour,
except force colours from scenario data (force identity). Files: `runtime.html`, `js/ui.js`, `js/render.js`.

| Class | Where | States and notes |
|---|---|---|
| `modeBadge` + `mode-adaptive` / `mode-fixed` / `mode-none` | `#modeBadge`, panel header | Same names as the allocation page and host. Text: "↻ Adaptive practice", "■ Fixed assessment · no adjustments". `mode-none` ("No adaptive session") is the runtime's own, for a free-play run with no config |
| `parserBadge` + `is-llm` / `is-fallback` / `is-offline` | `#parserBadge`, Instructor tab | "Local LLM", "Keyword parser", "Keyword parser · model unavailable", "Local LLM unavailable" |
| `act` + `src-engine` / `src-instructor` / `src-llm` | each CGF log entry | `srcTag` is the small label inside it ("Instructor", "LLM"); the engine's own entries have no tag |
| `state-chip` | CGF log, state changes | two per change: from and to (`from` → `to`) |
| `unit--none` | CGF log unit name with no force | muted text |
| `aarGroups`, `aarGroup`, `aar` | Trainee tab, after-action summary | groups Run, Trainee, Neutral traffic, Instructor; each group has an `h3` and a two-column `aar` grid |
| `keysRef` | Trainee tab, `details` | collapsed keyboard and mouse reference; `.keys` is the grid inside |
| `advanced` | Setup tab, `details` | harness JSON and LLM server settings |
| `envelope` + `clamped` | under each adjustable slider (`#env-<key>`) | `envelope` is hidden outside an adaptive session; `clamped` marks the last engine request that was clamped to the instructor's limits |
| `posture--cautious` / `--assertive` / `--provocative`, `chartKey--cgf`, `chartKey--trainee`, `hailPending`, `factor--raise` / `factor--lower`, `esc-0` to `esc-4`, `escState`, `escFill` | R2 spec | as in `design/requests.md` |

## R9 (decided by JL, built in e6564f1)

"Trainee posture", the tension chart and "Why is it reacting?" are at the top of the Instructor tab (same element ids).
Trainee contact cards show state, bearing, range and hail status only: no tension bar or number. Map tension bars are
drawn only in the instructor view. The after-action summary no longer lists maximum armed tension (instructor and
debrief data). See also `NOTES-FOR-EEVEE.md`.
