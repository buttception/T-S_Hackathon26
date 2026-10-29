# Design principles

Owner: Eevee (UI/UX lane, see `docs/LANES.md`). Adopted 2026-10-29.

These five principles govern the look and flow of every page: allocation, host, runtime, instructor reasoning panel, and report. Any design decision, by any lane, is checked against them. When a decision conflicts with a principle, raise it, note the pros and cons, and agree the trade-off with Eevee rather than working around it.

## Who we design for

| Audience | Needs | Where |
|---|---|---|
| Instructor (primary) | Control and situational awareness while running several trainees under time pressure | Allocation, host, reasoning panel, report |
| Trainee | A believable exercise; should not see the adaptation working | Runtime |
| Judges | Grasp each screen in seconds during a 5-minute demo | Everything shown in the demo |

The instructor is an expert user. Dense screens are fine when they are well chunked; screens that hide what experts need are not. Design for a projector in a dim room, read at a glance and from a distance.

The instructor's workflow orders the information hierarchy: brief, allocate trainees, set the envelope, run and monitor, steer, switch to fixed mode for assessment, report and debrief, review the cohort.

## 1. Simple without compromising capabilities

Tesler's law: every system has complexity that cannot be removed, only moved. The system carries it, not the instructor.

- Plan and organise the information hierarchy around the training workflow above, not around the code's structure.
- Smooth transitions with constant feedback: every action shows that it happened and what changed.
- Sensible defaults and presets (envelope, scenario, seed) so the common path is short, with full control one step away.
- Result: the instructor feels in control.

## 2. Clarity and guidance amid lots of data and choices

Miller's law: working memory holds about 7 (plus or minus 2) items. Hick's law: decision time grows with the number and complexity of choices.

- Cluster, not clutter: group related information into meaningful chunks rather than removing it.
- Concise, plain language on busy screens. Use instructor-facing words, not code terms ("harness", "tension", "Beta posterior", "envelope" need agreed instructor-facing labels; see the glossary in this folder once written).
- Break complex tasks into small steps.
- Progressive disclosure: the two or three most likely actions in front, the rest one step away; recognition over recall during a live exercise.

## 3. Consistent

Jakob's law: users prefer an interface that works like the ones they already know. For our users those are military simulators and command-and-control tools.

- Use common design patterns to reinforce familiarity.
- One visual system and one set of behaviours across every page, from `css/tokens.css` and the class names in `design/`.
- Keep MIL-STD-2525 / APP-6 symbology. Its colours carry force identity (blue friendly, red hostile, green neutral, yellow unknown), so status colours (error, warning, success) must be distinct from them, and colour is never the only carrier of meaning: always pair it with an icon, shape or text.
- Same vocabulary everywhere: screens, LLM output, reports and the pitch deck.

## 4. Transparent AI, human in command

The AI shapes practice; people make the decisions.

- Visible: every AI action is shown, and visually distinct from instructor actions and LLM-parsed commands (the adjustment `source` field).
- Explained: each adjustment shows what changed, the direction, the evidence events and a one-line reason, in factual, non-anthropomorphic language ("hail discipline targeted: 7 of 11 hails ignored", not "the AI thinks the trainee is weak").
- Bounded: show the instructor's envelope as visible limits with the current value inside them, and mark when a value was clamped.
- Reversible: preview before apply (the `js/llm.js` pattern), undo, and a visible control to pause adaptation at once.
- Calibrated: show how much evidence sits behind an estimate ("not enough evidence" when it is thin); never present an estimate as more certain than it is.
- Honest outputs: in reports, code-computed figures and LLM-written narrative look different, and the narrative is labelled as AI-written.
- When the model asks a clarifying question, treat it as a dialogue step, not an error.

## 5. Safe under pressure

Prevent errors, and make recovery easy when they happen.

- Unmistakable modes: adaptive and fixed must look clearly different. A qualification run that is accidentally adaptive is a serious error.
- Confirm only consequential actions; do not interrupt routine ones.
- Undo wherever possible.
- Graceful, visible degradation: show which parser is active (local LLM or keyword fallback), show progress and allow cancel while the model works, and say so plainly when it falls back.
- Never pre-select "Apply" for actions that affect a trainee's record.

## Ethical AI

- Fair assessment: adaptive runs give trainees different exercises, so adaptive scores are never compared or shown as qualification results. Keep practice and assessment visibly separate.
- Respectful language: say "focus area" or "developing", not "weak". No leaderboards or rankings. The cohort heatmap is for improving the curriculum, not for performance management, and its caption says so.
- Transparency toward trainees: the debrief shows what was targeted and why.
- Proxies are not competencies: show the evidence events behind an estimate so instructors can judge it, and give them a way to dispute or correct it.
- Privacy: profiles live in `localStorage` on possibly shared laptops. Design for viewing, resetting and deleting a profile. Demo data stays synthetic, with no real names.

## Checking a decision

For each screen or change, ask:

1. Does it follow the instructor's workflow, and give feedback for every action? (1)
2. Is information chunked, is the language plain, and are choices staged? (2)
3. Does it reuse existing patterns, tokens and symbology, without status colours clashing with force colours? (3)
4. Is every AI action visible, explained, bounded, reversible and honestly certain? (4)
5. Can a stressed instructor tell the mode, avoid a costly mistake and recover from one? (5)
6. Is it fair and respectful to the trainee? (Ethical AI)
