# Pitch deck

**The PowerPoint file is `../Adaptive-CGF-Trainer.pptx`** (18 slides, speaker notes, Eevee's Ion blue theme from `css/tokens.css`, Segoe UI and Consolas). It is the deck to present. `build-pptx.ps1` regenerates it: it drives PowerPoint through COM on Windows (`powershell -ExecutionPolicy Bypass -File build-pptx.ps1 -Out <file.pptx> -Shots images`). Or edit the .pptx directly.

The content was shaped by the judging criteria (the key challenge and what the prototype proves, readiness and what is left, novelty, how AI is used, and the value in S$), but the slides do not mention the criteria. They are not listed or tagged on any slide.

Slides 5 and 6 sell the learning-over-time point: the loop feeds itself, and a chart of `trainee_b`'s seeded history shows the estimate sharpening as evidence grows. Only the trainee model learns today; the policy that picks adjustments is rule-based, and a learning one (a bandit) is planned. The slides say so.

**Open before presenting**: the S$ figures on slides 16 and 17 are assumed. Slide 16 is a sensitivity grid from placeholders (200 trainees a year, 30 sessions to proficiency, S$1,500 per session, 2 instructor hours at S$250); slide 17 gives development effort measured from git (2.1 to 4 person-days) next to an assumed conventional estimate and a payback table (S$800 a day, a placeholder). Replace the placeholders with the division's numbers (see `../savings-model.md`, recompute with `../savings-calc.py`, then update the same values in `build-pptx.ps1`); `r` has never been measured. The screenshots in `images/` were taken from `main` on 2026-10-30 (`reasoning.png` is a crop of a real demo run); retake them if the pages change.

`../deck-outline.md`, `../run-of-show.md` and `../savings-model.md` hold the older outline and script. The web-slides files below (`project/`) are the superseded first version (13 slides, older palette and screenshots) and are kept only as a source copy.
