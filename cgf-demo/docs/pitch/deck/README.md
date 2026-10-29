# Pitch deck

**The PowerPoint file is `../Adaptive-CGF-Trainer.pptx`** (17 slides, speaker notes, Eevee's Ion blue theme from `css/tokens.css`, Segoe UI and Consolas). It is the deck to present. `build-pptx.ps1` regenerates it: it drives PowerPoint through COM on Windows (`powershell -ExecutionPolicy Bypass -File build-pptx.ps1 -Out <file.pptx> -Shots images`). Or edit the .pptx directly.

It is organised around the five judging criteria: slide 2 maps each criterion to the slides that answer it (potential 4 and 9, readiness 15, uniqueness 14, AI 13, market 16), and each of those slides carries its criterion and weight at the top right.

**Open before presenting**: the S$ figures on slide 16 are an assumed sensitivity grid (200 trainees a year, 30 sessions to proficiency, S$1,000 to S$3,000 per avoided session). Replace them with the division's numbers; `r` has never been measured. The screenshots in `images/` were taken from `main` on 2026-10-30 (`reasoning.png` is a crop of a real demo run); retake them if the pages change.

`../deck-outline.md`, `../run-of-show.md` and `../savings-model.md` hold the older outline and script. The web-slides files below (`project/`) are the superseded first version (13 slides, older palette and screenshots) and are kept only as a source copy.
