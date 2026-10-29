# Triage of Eevee's design requests

**Owner**: JL. **Date**: 2026-10-29. **Source**: `design/requests.md` (Eevee) and `design/ui-audit.md`. This answers gap #17 in `plan-gaps.md` ("nobody owns triaging it"). The status column in `design/requests.md` is Eevee's to update; this page says what was done and what is waiting.

## Mine (allocation, host, cohort, compare pages)

| ID | Request | Status | Notes |
|---|---|---|---|
| R1 | Bar colours as classes, focus marker | Done (`0291f1d`) | Bars carry `bar--low/mid/high` and `bar--focus`. Eevee removed my CSS override |
| R5 | Collapse seat text, short platform box | Done (`0291f1d`) | |
| R6 | Roster defaults to the seat's competencies | Done (`0291f1d`) | With a "Show all competencies" toggle |
| R7 | Host empty state shows allocate, run, report | Done 2026-10-29 | `host.html`: an ordered list with `aria-current="step"` and "you are here" in words. Classes `flowSteps`, `flowStep`, `flowStep--current` are waiting for her styling |
| R15 | Replace the ◆ focus marker (MIL-STD-2525 hostile frame) | Done 2026-10-29 | Now ◎. Good catch; the legend on the allocation page says ◎ too |
| R16 | Cohort legend said "Darker cells mean a higher mean" | Done 2026-10-29 | My error: the scale runs dark = low, light = high. Now "Lighter cells mean a higher mean" |
| R3 (my part) | Mode badge on the allocation page | Done (`0291f1d`) | "Adaptive practice" and "Fixed assessment · no adjustments" |

## Not mine: for Devin (runtime)

R2 (inline colours in `js/ui.js`), R8 (map label overlap), R10 (group the after-action summary), R11 (parser badge), R12 (source class per log entry; `cause` can share it, see `requests-for-devin-cause-and-partners.md`), R13 (Advanced disclosure, confirm before Load), R14 (show the envelope on the setup sliders). All open. Devin, please read `design/requests.md` for the exact wording.

## Needs a decision from JL

| ID | Question | Eevee's proposal | My recommendation |
|---|---|---|---|
| R3 | One name pair for adaptation on or off, on every page | "Adaptive practice" and "Fixed assessment", separate from Exercise and Freeplay, shown as an always-visible badge on runtime and host | Adopt it. The allocation page already does. The runtime still says Exercise and Freeplay, which mean something else (whether the run can end). The host needs a badge from me once you agree; the runtime one is Devin's |
| R9 | Should "Why is it reacting?", tension and posture stay visible to the trainee in the runtime? | Move them to the instructor view and the debrief | Move them. The trainee should not see the adaptation working (PRINCIPLES.md), and the debrief already explains what was targeted. This is Devin's file, so it needs your word first |
| R4 | The instructor-facing glossary (`design/glossary.md`) | Eevee writes it, all owners apply it | Waiting on her. Raw setting names ("weight.ignoredWarning") still appear on the allocation page and the comparison page |

## Waiting on Eevee

The look of: the mode badge, the bars and the focus mark, the vehicle diagram (inline token colours in `js/ui-allocate-vehicles.js`), the cohort heatmap and its legend, the comparison page, the host's flow steps. The pages use her tokens (`css/tokens.css`) and only structural classes, so she can restyle without touching markup. New CSS files I wrote as starting points, each marked as hers to restyle or fold in: `css/allocate-layout.css`, `css/cohort.css`, `css/compare.css`.
