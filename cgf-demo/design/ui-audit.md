# UI audit, 2026-10-29

Owner: Eevee. Reviewed against `design/PRINCIPLES.md` (P1 to P5, plus Ethical AI). Screens captured from `main` at `34abfda`, 1728 px wide, in `design/previews/`.

Each finding says who can fix it: **Eevee** (CSS or design files) or a **request** to the page owner, logged in `design/requests.md`.

## Previews

| File | Screen |
|---|---|
| `01-allocation-roster.jpg` | Allocation page: roster table and the first crew |
| `02-allocation-crews.jpg` | Allocation page: crew B seats |
| `03-allocation-run-options-handoff.jpg` | Allocation page: run options, envelope, hand-off |
| `04-host-empty.jpg` | Host page, no allocation saved yet |
| `05-runtime-map-trainee-tab.jpg` | Runtime: map, HUD, legend, Trainee tab |
| `06-runtime-trainee-why-summary.jpg` | Runtime Trainee tab: contacts, "Why is it reacting?", after-action summary |
| `07-runtime-trainee-log-controls.jpg` | Runtime Trainee tab: event log, keyboard controls |
| `08-runtime-instructor-tab.jpg` | Runtime Instructor tab: harnesses, prompt, injects, malfunctions |
| `09-runtime-cgf-log.jpg` | Runtime CGF log after two instructor escalations |
| `10-runtime-setup-scenario-llm.jpg` | Runtime Setup tab: scenario, harness library, local LLM |
| `11-runtime-setup-parameters.jpg` | Runtime Setup tab: live CGF parameters |

Not captured: the host page with a live run (needs a full allocation saved), and the LLM preview card (needs a local model running).

## What already works

- Allocation: faded bars for thin evidence and numbers beside every bar (P4 calibrated, colour is not the only signal). Columns that matter for the selected seat are highlighted (P2).
- Allocation: "Adaptive (practice)" names the mode's purpose, and "6 seats still to fill" explains why Start is disabled (P1 feedback, P5).
- Host: the empty state says what is missing and offers the next step (P1).
- Runtime: the CGF log gives a "Why" for every action (P4). The map legend keys every symbol and force (P3).
- Instructor tab: LLM commands are previewed before they apply by default (P4, P5).
- Muted text contrast is 5.8:1 or better, and body text 14:1, so the dark theme passes WCAG AA on a monitor.

## Cross-cutting findings

### A. Colour meanings collide (P3, P5, Ethical AI) — highest priority

Red currently means hostile force, error text, exercise failure, a "bad" chip, a low competency bar and rising tension. Green means neutral shipping, success, a "good" chip, a high competency bar and a "Cautious" posture. Error text and hostile log entries even share one hex value (`#ff9a9a`).

On the map, red and green are MIL-STD-2525 force identity and must stay. In the panels they are being reused for status, so an instructor cannot tell "hostile" from "something is wrong", and a trainee's low score reads as hostile.

| Option | Pros | Cons |
|---|---|---|
| 1. Reserve red, blue, green and yellow for force identity; give status its own hues plus an icon (recommended) | No clash with symbology; fits P3 for military users | Breaks the web habit of red = error, so status must always carry an icon or word |
| 2. Keep red/green for status as on the web | Familiar to web users (Jakob's law) | Collides with force colours on the same screen; fails colour-blind users; reads as judgement on trainees |
| 3. Status by shape and text only, no colour | Fully accessible | Slower to scan during a live run |

Competency bars are a special case: red/amber/green frames a trainee as "bad". Prefer one neutral hue scaled by value, with a separate "focus area" marker on the lowest well-evidenced competency.

Fix: Eevee defines force, status and data colours as separate token groups in `css/tokens.css` (E1). Colours hard-coded in JS need requests (R1, R2).

### B. Mode names differ between pages (P3, P5)

The allocation page says "Adaptive (practice)" / fixed. The runtime says "Exercise" / "Freeplay", which mean something else (whether the run can end). The contract uses `adaptive` / `fixed`. An instructor can't tell from the runtime whether adaptation is on, and an accidentally adaptive qualification run is the most serious error this product can make.

Fix: one vocabulary across pages, and an always-visible mode badge on the runtime and host pages, styled very differently for Adaptive and Fixed. This needs a team decision on wording (R3), then markup from Devin and JL.

### C. Text is too small for a projector (P2)

The base size is 13 px, and 11 px is used 15 times (headings, meta lines, chips, help text). On a projector in a dim room this is hard to read beyond the front row. Dark themes also lose contrast on projectors.

| Option | Pros | Cons |
|---|---|---|
| Raise the base to 15 to 16 px and the minimum to 13 px everywhere | Simple, readable | Less fits in the 400 px side panel, so more scrolling |
| Add a "projector" class (larger type, lighter background) switched on for the demo | Keeps density for daily use | Two looks to maintain and test |

Fix: Eevee, in the type scale (E1). Recommend the projector class, because instructors are expert users who benefit from density day to day.

### D. Vocabulary is code-facing (P2)

Instructors see "harness", "tension", "posture (as assessed by CGF)", "envelope", `reaction_delay_s`, `weight.ignoredWarning`, "Net +0.0/min after aggression ×1.30". Fix: a glossary of instructor-facing labels (Eevee writes it in `design/glossary.md`), applied by each page owner (R4).

## Per-screen findings

### Allocation page (owner JL)

1. **Page is 19 px wider than the window**, so the right panel is clipped: dropdowns, the envelope's Max column and the Copy button are cut off (screens 01, 03). Eevee, CSS.
2. **Start run sits about 1,900 px down** a scrolling side panel, after six long seat descriptions (P1, P2). Make the hand-off block sticky at the bottom of the panel (Eevee, CSS, if the block has a stable selector) and collapse seat descriptions after the first read (R5).
3. **Eleven columns** (trainee, sessions, nine competencies) exceed what can be compared at once (P2). The seat highlight helps; stronger dimming of non-seat columns is CSS (Eevee). Defaulting to the seat's three competencies with a "show all" toggle is R6.
4. **Raw ids** like `trainee_c01` (P2). Waits on the open contract question about display names.
5. **Platform box** inlines long URLs and sourcing notes (P2). Keep a short summary and a "Source" link (R5).

### Host page (owner JL)

6. Empty state works, but the heading and text are small and disabled buttons fade to 45% opacity, which is hard to read (P2). Eevee, CSS. Showing the three-step flow (allocate, run, report) would guide first-time users (R7).

### Runtime map (owner Devin)

7. **Map labels overlap** where units cluster (B-41 over B-43, MV Lumen over MT Halcyon), which is clutter at the moment it matters most (P2). Canvas drawing, so R8.
8. The same word means different things: "Cautious" is the trainee's posture (green) and also a merchant's state (yellow) (P3). R4.

### Runtime Trainee tab (owner Devin)

9. **The trainee can see the CGF's reasoning**: "Why is it reacting?", tension values and "posture as assessed by CGF" (screens 05, 06). This conflicts with "the trainee should not see the adaptation working".

| Option | Pros | Cons |
|---|---|---|
| Keep it visible to trainees | Teaches cause and effect; useful in freeplay | Trainees can game the CGFs; realism drops; once adaptation lands it exposes the targeting |
| Move it to the instructor view and show it to trainees only in the debrief (recommended) | Keeps the exercise honest; matches the ethics rule that the debrief explains what was targeted | Less in-run feedback for trainees |

Team decision (R9).

10. The after-action summary, event log and keyboard help are one long scroll (P2). Group them, and move keyboard help to a compact reference (R10).

### Runtime Instructor tab (owner Devin)

11. **High-impact actions look like routine ones** (P5): Escalate, Force state, Spawn, Fog and the six malfunctions share the default button style. Eevee can style them by their existing `data-inj` attributes in CSS, with no markup change.
12. **Parser status is a small grey line** ("qwen2.5:3b @ localhost · keyword fallback on") (P4, P5). Whether the LLM or the keyword parser is active should be a clear badge (R11).

### Runtime CGF log (owner Devin)

13. Instructor-caused and automatic actions differ only in text ("Why: instructor" vs "calmed down over time") (P4). Once the engine adds adjustments, three sources (engine, instructor, LLM-parsed) need distinct styling. A source class on each entry is R12; Eevee then styles it.
14. Dense monospace with state changes as plain text ("Harass → Warn"). State chips would scan faster (R12).

### Runtime Setup tab (owner Devin)

15. Everyday settings (scenario) sit beside technical ones (harness JSON, LLM server URL) (P2). Put the technical ones under an "Advanced" disclosure (R13).
16. Live sliders show a value but not the instructor's envelope (min, base, max), so the bounds the AI must respect are invisible (P4). Ties into PLAN task C2 / LANES D2 (R14).
17. "Load (restart)" discards the running exercise without confirmation (P5) (R13).

## Suggested order

1. A. Colour token groups (E1), Eevee. Unblocks most other fixes.
2. Allocation overflow, sticky hand-off and column dimming (findings 1 to 3), Eevee, CSS only.
3. Consequential-action styling (11), Eevee, CSS only.
4. C. Type scale and projector class (E1), Eevee.
5. B. Mode vocabulary and badge: team decision first.
6. Trainee-tab exposure (9): team decision.
7. Remaining requests, in the order owners can take them.
