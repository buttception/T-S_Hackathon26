# Demo run-of-show (5 minutes)

**Owner**: JL. **Written**: 2026-10-29. **Status**: a script to rehearse, not yet timed on a real run. It replaces PLAN §8 for the real demo. Demo platform: a warship on `strait-transit` (JL, 2026-10-29). Say only what is built; anything else is roadmap.

**Setup before going on stage**: `allocate.html` open in Chrome or Edge from `file://`; the local LLM off or on (both work); a fixed-mode baseline run on the demo seed already saved (`compare.html` needs it); the fallback video one click away (see `fallback-plan.md`).

| Time | Beat | Page | What to say | Fallback if it fails |
|---|---|---|---|---|
| 0:00 | Problem | Title slide | One instructor, many trainees. Fixed scenarios train the average trainee. | None needed |
| 0:30 | Allocate | `allocate.html` | Pick the warship and the crew. "Suggest demo crew" fills the seats. Each seat shows the trainee's competencies and the likely first target; the hail-discipline trainee sits in the navigation seat. Point at the "Adaptive practice" badge and the envelope the instructor sets. | Screenshot of the page in the deck |
| 1:15 | Run | `host.html`, `runtime.html` | Start. The CGFs press hails at the navigation seat because that is the history-based target. Open the reasoning panel: each adjustment shows setting, old and new value, evidence, and a cause tag `history`, `live` or `team`. | Recorded clip of the run |
| 2:15 | Live signal | Reasoning panel | The scripted trainee keeps missing hails, so the pressure eases; a trainee who answers them would get the opposite. History chose the target; current behaviour set the intensity. | Same clip |
| 2:45 | Cooperating CGFs | Map and reasoning panel | One force's unit has its warning ignored; the other units in the force already know and escalate or shadow from another bearing. Entry tagged `team`. | Same clip |
| 3:15 | Steering and fixed mode | Instructor tab, steering box | Type a plain-language request. The parsed directive is shown before it applies. Then switch to "Fixed assessment": the badge changes and the log goes quiet. | Skip steering; show the fixed badge only |
| 3:45 | Debrief and update | `report.html`, then `allocate.html` | The report: code-computed figures, template narrative, one section per trainee. The profile bars move; the next predicted target changes. | Saved report page |
| 4:15 | Baseline and cohort | `compare.html`, `cohort.html` | Same seed, fixed run against adaptive run, with its caveat line. The cohort view is for improving the curriculum, never ranking. | Saved runs |
| 4:30 | Roadmap and business case | Two slides | HLA/DIS is roadmap, not built (`hla-dis-roadmap.md`). Savings slide (formula, placeholder inputs, `r` as a range, all labelled illustrative) then the development-effort and payback slide (about 30 s each; `savings-model.md`). | None needed |

## Known risks for this script

- **Too few events.** A 2400 s run yields only a few hail events, so `compare.html` can say "too few events to compare". Check before the pitch that the demo seed produces enough; if not, show the saved pair with its caveat or use the demo speed control.
- **Pages and iframes.** Run `runner/run-tests.ps1` and open `host.html` from `file://` on the demo laptop before going on stage.
- **Partners.** An AI partner seat plays from past runs. Use it only if rehearsed; it is not needed for the core story.
- **Timings are a plan.** Rehearse with a clock and trim to fit; the event's pitch length is still to be confirmed.
