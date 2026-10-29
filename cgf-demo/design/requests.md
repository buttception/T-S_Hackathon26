# Design requests to page owners

Eevee edits CSS and `design/` only. Changes that need markup, JS or wording go here for the page's owner. Each request cites the finding in `design/ui-audit.md` and the principle it serves (`design/PRINCIPLES.md`).

Status: open, agreed, done, declined.

| ID | Owner | File | Request | Why | Status |
|---|---|---|---|---|---|
| R1 | JL | `js/ui-allocate.js` `barColor()` | Stop setting bar colours inline. Set a class instead (for example `bar--low`, `bar--mid`, `bar--high`, and `bar--focus` on the lowest well-evidenced competency); Eevee styles them | Audit A: red/green bars clash with force colours and read as judgement (P3, Ethical AI) | done (0291f1d; CSS override removed) |
| R2 | Devin | `js/ui.js` lines 27, 132, 150, 161, 183, 188 | Replace inline colours (posture label, hail-pending text, factor bars, chart colours) with classes or CSS variables from `css/tokens.css` once it exists | Audit A (P3); LANES rule that other lanes do not hard-code colours | open |
| R3 | Team (JL decides) | All pages | Agree one name pair for adaptation on or off (proposal: "Adaptive practice" and "Fixed assessment"), separate from Exercise/Freeplay, and show it as an always-visible badge on runtime and host | Audit B (P3, P5) | partly done: allocation page badge (0291f1d); runtime still says Exercise/Freeplay |
| R4 | All owners | Labels in HTML and JS | Apply the instructor-facing glossary (`design/glossary.md`, to be written) to labels such as harness, tension, posture, envelope, setting names | Audit D, finding 8 (P2, P3) | open |
| R5 | JL | `allocate.html`, `js/ui-allocate.js` | Collapse seat descriptions to one line with "more"; shorten the platform box to a summary plus a "Source" link | Findings 2, 5 (P1, P2) | done (0291f1d) |
| R6 | JL | `js/ui-allocate.js` | Default the roster to the selected seat's three competencies, with a "show all competencies" toggle | Finding 3 (P2) | done (0291f1d) |
| R7 | JL | `host.html` | In the empty state, show the flow as three steps (allocate, run, report) with the current step marked | Finding 6 (P2) | open |
| R8 | Devin | `js/render.js` | Avoid label overlap on the map (offset or declutter labels when units are close) | Finding 7 (P2) | open |
| R9 | Team (JL decides) | `runtime.html` Trainee tab | Decide whether "Why is it reacting?", tension and posture stay visible to trainees or move to the instructor view and debrief | Finding 9 (P4, Ethical AI) | open |
| R10 | Devin | `runtime.html` Trainee tab | Group the after-action summary; move keyboard help to a compact reference | Finding 10 (P2) | open |
| R11 | Devin | `runtime.html`, `js/ui.js` | Show the active parser (Local LLM or Keyword) as a badge with a state class (`is-llm`, `is-fallback`, `is-offline`) | Finding 12 (P4, P5) | open |
| R12 | Devin | `js/ui.js` CGF log entries | Add a source class to each entry (`src-engine`, `src-instructor`, `src-llm`) and wrap state changes in a `state-chip` span | Findings 13, 14 (P4) | open |
| R13 | Devin | `runtime.html` Setup tab | Put harness JSON and LLM server settings under an "Advanced" disclosure; confirm before "Load (restart)" | Findings 15, 17 (P2, P5) | open |
| R14 | Devin | Setup sliders | Show the instructor's envelope (min, base, max) on each adjustable setting, and mark a value that was clamped | Finding 16 (P4) | open |
| R15 | JL | `js/ui-allocate.js` `FOCUS_MARK` | Replace the ◆ focus-area marker with a shape that is not a symbology frame (for example ◎, or the word "focus"). A diamond is the hostile/suspect frame in MIL-STD-2525, and it sits next to trainee names | Review of 0291f1d (P3) | open |
| R16 | JL | `cohort.html` heatmap legend | The legend says "Darker cells mean a higher mean", but the scale runs dark = low, light = high. Change it to "Lighter cells mean a higher mean" | Review of 5e37aad (P2) | open |
