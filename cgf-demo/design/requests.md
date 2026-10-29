# Design requests to page owners

Eevee edits CSS and `design/` only. Changes that need markup, JS or wording go here for the page's owner. Each request cites the finding in `design/ui-audit.md` and the principle it serves (`design/PRINCIPLES.md`).

Status: open, agreed, done, declined.

| ID | Owner | File | Request | Why | Status |
|---|---|---|---|---|---|
| R1 | JL | `js/ui-allocate.js` `barColor()` | Stop setting bar colours inline. Set a class instead (for example `bar--low`, `bar--mid`, `bar--high`, and `bar--focus` on the lowest well-evidenced competency); Eevee styles them | Audit A: red/green bars clash with force colours and read as judgement (P3, Ethical AI) | done (0291f1d; CSS override removed) |
| R2 | Devin | `js/ui.js` lines 27, 132, 150, 161, 183, 188 | Replace inline colours (posture label, hail-pending text, factor bars, chart colours) with classes or CSS variables from `css/tokens.css` once it exists | Audit A (P3); LANES rule that other lanes do not hard-code colours | done (e89c32e; all 8 spec items, no colours left in js/ui.js or runtime.html) |
| R3 | Team (JL decides) | All pages | Agree one name pair for adaptation on or off (proposal: "Adaptive practice" and "Fixed assessment"), separate from Exercise/Freeplay, and show it as an always-visible badge on runtime and host | Audit B (P3, P5) | partly done: allocation badge (0291f1d). Waiting on JL to adopt the names; then host badge (JL) and runtime badge (Devin) |
| R4 | All owners | Labels in HTML and JS | Apply the instructor-facing glossary (`design/glossary.md`, to be written) to labels such as harness, tension, posture, envelope, setting names | Audit D, finding 8 (P2, P3) | open: waiting on Eevee to write design/glossary.md |
| R5 | JL | `allocate.html`, `js/ui-allocate.js` | Collapse seat descriptions to one line with "more"; shorten the platform box to a summary plus a "Source" link | Findings 2, 5 (P1, P2) | done (0291f1d) |
| R6 | JL | `js/ui-allocate.js` | Default the roster to the selected seat's three competencies, with a "show all competencies" toggle | Finding 3 (P2) | done (0291f1d) |
| R7 | JL | `host.html` | In the empty state, show the flow as three steps (allocate, run, report) with the current step marked | Finding 6 (P2) | done (c0905e4); Eevee to style flowSteps |
| R8 | Devin | `js/render.js` | Avoid label overlap on the map (offset or declutter labels when units are close) | Finding 7 (P2) | open |
| R9 | Team (JL decides) | `runtime.html` Trainee tab | Decide whether "Why is it reacting?", tension and posture stay visible to trainees or move to the instructor view and debrief | Finding 9 (P4, Ethical AI) | open: JL recommends moving them (docs/project/eevee-requests-triage.md); needs JL's decision, then Devin |
| R10 | Devin | `runtime.html` Trainee tab | Group the after-action summary; move keyboard help to a compact reference | Finding 10 (P2) | open |
| R11 | Devin | `runtime.html`, `js/ui.js` | Show the active parser (Local LLM or Keyword) as a badge with a state class (`is-llm`, `is-fallback`, `is-offline`) | Finding 12 (P4, P5) | open |
| R12 | Devin | `js/ui.js` CGF log entries | Add a source class to each entry (`src-engine`, `src-instructor`, `src-llm`) and wrap state changes in a `state-chip` span | Findings 13, 14 (P4) | open |
| R13 | Devin | `runtime.html` Setup tab | Put harness JSON and LLM server settings under an "Advanced" disclosure; confirm before "Load (restart)" | Findings 15, 17 (P2, P5) | open |
| R14 | Devin | Setup sliders | Show the instructor's envelope (min, base, max) on each adjustable setting, and mark a value that was clamped | Finding 16 (P4) | open |
| R15 | JL | `js/ui-allocate.js` `FOCUS_MARK` | Replace the ◆ focus-area marker with a shape that is not a symbology frame (for example ◎, or the word "focus"). A diamond is the hostile/suspect frame in MIL-STD-2525, and it sits next to trainee names | Review of 0291f1d (P3) | done (c0905e4; now ◎) |
| R16 | JL | `cohort.html` heatmap legend | The legend says "Darker cells mean a higher mean", but the scale runs dark = low, light = high. Change it to "Lighter cells mean a higher mean" | Review of 5e37aad (P2) | done (c0905e4) |
| R17 | Glenda | `js/ui-report.js` | Split `rp-good` / `rp-bad` by meaning: `rp-outcome--success` / `--fail` for session outcomes, `rp-level--strength` / `--developing` / `--focus` / `--thin` / `--none` for competency levels, `rp-dir--up` / `--down` for CGF direction, `rp-error` for page errors. `css/report.css` tells them apart by context until then | Report review: one "bad" class meant failure, a weak skill and the AI pushing harder (P3, P4, Ethical AI) | done: classes by meaning (ea6ef4c, Glenda); report.css moved to them (Eevee). Glenda may now drop rp-good / rp-bad / rp-mid / rp-thin / rp-none |
| R18 | Glenda | `js/ui-report.js`, `js/report/charts.js` | Wording: "Needs work" / "Needs most work" / "weak" become "Focus area"; show the session date instead of the raw id (`s_20261030_01`) in headings; break the narrative's run of figures into short lines or a small table | Report review (P2, Ethical AI) | open |
| R19 | Glenda | `js/ui-report.js` print button | Open every `<details>` (competency table, history, key moments) before `window.print()` and restore them after, so the PDF holds the whole report | Report review: collapsed sections do not print (P1) | done (ea6ef4c, Glenda); verified on print; headless --print-to-pdf still misses closed sections |
| R20 | Glenda | `js/ui-report.js` Trainee events table, Result column | Give single-event results their own classes (for example `rp-result--met` / `rp-result--missed`) and words ("met" / "missed" instead of "success" / "fail"). They now reuse `rp-outcome--success` / `--fail`, the session-outcome classes, so restyling outcomes would turn every missed hail into a failure chip. `report.css` keeps them plain until then | R17 review: one event is evidence about a competency, not a failed session (P3, Ethical AI) | open |
| R21 | Glenda | `js/report/charts.js` chart roles | Split the `miss` role in two: `miss` for a missed event (success-rate chart) and `focus` for the focus area (competencies chart). Today both read `--rp-chart-miss`, so the focus area shows as an orange ring while the competency table outlines it in violet | R17 review (P3) | open |
| R22 | Devin | `js/ui.js` `updateRunButton()` | Also set `$('btnRun').dataset.state` to `play` (Start, Resume), `pause` (Pause) or `finished` (Finished). Keep the words. `style.css` then shows ▶, two pause bars or ■ beside the word and greys out Finished. One line, no markup change | Start, Restart and speed now read as one player bar; CSS cannot see whether the sim is running, so the icon needs the state (P3: player conventions, P5: state readable at a glance) | open |
| R23 | Devin, wording agreed with JL (R3) | `runtime.html` `#modeSel`, `js/ui.js` (`modeSel` listeners, status line) | Replace the Exercise/Freeplay dropdown with a two-option toggle so both choices are always visible: `<div class="segToggle" role="radiogroup" aria-label="Run ends"><span class="segLabel">Run ends</span><button role="radio" aria-checked="true" data-mode="exercise">At objective</button><button role="radio" aria-checked="false" data-mode="freeplay">Never (free play)</button></div>`. On click call `CGF.inject.setMode(btn.dataset.mode)`; on the `mode` event set `aria-checked` on both. Place it on its own row (it wraps there today) or the scenario line, not inside the player bar. Status line: "ENDS AT OBJECTIVE" / "FREE PLAY". `style.css` already styles `.segToggle` (preview: `design/previews/33-run-ends-toggle.jpg`) | A dropdown hides the other option and has no label, so it reads like a playback setting; "Exercise" is a third mode name next to Adaptive/Fixed (audit B, R3). Two visible options with a label say what the choice does (P2, Hick: two options need no menu), and a tick marks the choice without relying on colour (P5) | open |
| R24 | JL | `allocate.html` header and `<head>` | Two small edits now that the page's styles live in `css/allocate.css`: remove the leading "· " from the `<h1>` subtitle (`<small>choose the platform…`), which now sits on its own line; and remove the `css/allocate-layout.css` link, which is empty (folded into `allocate.css`). Until then `allocate.css` clips the dot | Allocation v2 type and spacing (P2: the subtitle reads as guidance, not as a stray bullet) | open |

## R2 spec: runtime colours as classes (for Devin)

Agreed 2026-10-29 (Eevee): solution A. Every colour moves out of `js/ui.js` and `runtime.html` into a class or a token; the CSS is already in `css/style.css` and `css/tokens.css`, so each change shows the new colour as soon as it lands. Previews: today in `design/previews/23` to `25`; the spec applied in `29` and `30` (simulated in the browser, Devin's files untouched).

| # | Where | Today | Change to | Styled as |
|---|---|---|---|---|
| 1 | `js/ui.js` ~132, posture label | `style.color` green / yellow / red | Set `className` to `posture--cautious`, `posture--assertive` or `posture--provocative`; remove the `style.color` line | none (normal), caution orange, critical magenta |
| 2 | `runtime.html` ~97, `#postureBar` | inline `background:var(--accent)` | Remove the inline `background` (keep `width`) | `--rt-chart-trainee`, matching the chart line |
| 3 | `js/ui.js` ~150, "HAIL PENDING (H)" | `<b style="color:#ffb347">` | `<b class="hailPending">` | caution orange with a warning sign |
| 4 | `js/ui.js` ~161, "Why is it reacting?" bars | inline `background` `#ff7b54` / `#4dd17a` | Keep the inline `width`; add class `factor--raise` (value > 0) or `factor--lower` | caution orange / neutral data colour |
| 5 | `js/ui.js` ~183-188, `drawChart` | `#0d1726`, `rgba(138,160,184,.15)`, `#ff7b7b`, `#4da6ff` | Read the colours once per draw: `const cs = getComputedStyle(document.documentElement), tok = n => cs.getPropertyValue('--rt-chart-' + n).trim();` then use `tok('bg')`, `tok('grid')`, `tok('cgf')`, `tok('trainee')` | tokens in `css/tokens.css` |
| 6 | `runtime.html` ~99, chart legend | `<span style="color:#ff7b7b">` and `#4da6ff` | `<span class="chartKey--cgf">` and `<span class="chartKey--trainee">` | same tokens as the chart lines |
| 7 | `js/ui.js` ~27, CGF log name with no force | fallback `'#d7a8ff'` | When there is no force, give the name `class="unit--none"` instead of an inline colour (force colours from the scenario stay inline: they are force identity) | muted text |
| 8 | `js/engine.js` 19, `CGF.style.stateColors` (used by `js/render.js` 179 and `js/ui.js` 145) | grey, yellow, orange, orange-red, red by escalation level | Read the five values from `--escalation-0` to `--escalation-4` once at start-up (same `getComputedStyle` helper as #5), keeping the array as the fallback. On contact cards, put `class="esc-<n>"` on the card, `escState` on the state name and `escFill` on the tension bar, instead of the inline colour | calm levels uncoloured, then caution orange, then critical magenta |

Done when: `grep -nE "#[0-9a-fA-F]{3,6}|rgba?\(" js/ui.js runtime.html` finds no colours outside scenario force data, and the runtime still opens from `file://`.

## Open requests by problem category

Updated 2026-10-29 against `main` at `5cf8223`. Each request sits in its main category; a second principle is noted where it applies. JL's triage is in `docs/project/eevee-requests-triage.md`.

### 1. Colour meaning (P3: consistent)
Colours that mean more than one thing, or that are hard-coded outside the tokens.
| ID | Owner | Problem |
|---|---|---|
| R2 | Devin | Done (e89c32e): runtime colours are classes and tokens |
| R20 | Glenda | Single trainee events reuse the session pass/fail classes, so a missed hail could be styled as a failed session (also Ethical AI) |
| R21 | Glenda | One chart colour role means both "missed event" and "focus area", so the focus area is orange in the chart and violet in the table |

### 2. Mode and state clarity (P5: safe under pressure)
The instructor can't always tell which mode or system state is active.
| ID | Owner | Problem |
|---|---|---|
| R3 | JL decides, then JL and Devin | Adaptation on/off is named three ways; runtime and host have no mode badge |
| R11 | Devin | Whether the LLM or the keyword fallback is active is a small grey line |
| R22 | Devin | Start/Pause button has no play/pause state for an icon |
| R23 | Devin, JL on wording | Exercise/Freeplay is an unlabelled dropdown that hides the other option and looks like a playback setting |

### 3. AI transparency (P4: transparent AI, human in command)
What the AI did, why, and within which bounds, isn't visible enough.
| ID | Owner | Problem |
|---|---|---|
| R12 | Devin | CGF log doesn't mark who acted (engine, instructor, LLM) |
| R14 | Devin | Setup sliders don't show the envelope or mark a clamped value |

### 4. Clutter and cognitive load (P2: clarity)
Too much at once, or the wrong things competing for attention.
| ID | Owner | Problem |
|---|---|---|
| R8 | Devin | Map labels overlap where units cluster |
| R10 | Devin | Trainee tab is one long scroll (summary, log, keyboard help) |
| R13 | Devin | Setup mixes everyday and technical settings; "Load (restart)" has no confirmation (also P5) |

### 5. Language (P2, Ethical AI)
Code terms or judgemental words shown to instructors and trainees.
| ID | Owner | Problem |
|---|---|---|
| R4 | Eevee, then all owners | Raw names such as `weight.ignoredWarning`, "harness", "tension"; needs the glossary first |
| R18 | Glenda | Report says "Needs work" / "weak", shows raw session ids, and packs figures into one paragraph |

### 6. Ethics and fairness (Ethical AI)
| ID | Owner | Problem |
|---|---|---|
| R9 | JL decides, then Devin | Trainees can see the CGF's reasoning during a run |

### 7. Broken output (P1)
None open. R19 is done; known gap: headless `--print-to-pdf` does not fire `beforeprint`, so automated PDFs still miss closed sections.

## Eevee's own design backlog
Not requests: styling work in the Eevee lane, from JL's triage and the audit.
- Write `design/glossary.md` (unblocks R4).
- Style the host's flow steps (`flowSteps`, `flowStep`, `flowStep--current`, from R7).
- Review `css/compare.css` (comparison page) and `css/cohort.css` (heatmap and legend), both JL's starting points.
- Vehicle diagram on the allocation page: inline token colours in `js/ui-allocate-vehicles.js`; move to classes if needed (would be a request to JL).
- Type scale and projector mode (audit finding C).
- Consequential-action button styling on the runtime Instructor tab (audit finding 11).
