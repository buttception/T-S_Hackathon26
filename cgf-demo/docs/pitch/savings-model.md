# Savings model and development effort

**Owner**: JL. **Updated**: 2026-10-29. **Matches**: deck slides 16 (savings) and 17 (development effort and payback) in `Adaptive-CGF-Trainer.pptx`. **Do not present invented numbers**: every S$ input below is an ASSUMPTION or PLACEHOLDER until the division supplies its own, and both slides say they are illustrative.

Recompute everything with `python -I savings-calc.py` (git figures are read from commit `dc0e438`; pass another ref to refresh them). The same arithmetic is repeated in `deck/build-pptx.ps1`; change both together.

## 1. Savings for the company

```text
Value per avoided session = C_session + h x C_instructor
Annual saving             = N x S0 x r x Value per avoided session      (PLAN section 12)
Sessions avoided          = N x S0 x r
Time to proficiency       = S0 x (1 - r) sessions
```

| Symbol | Meaning (driver) | Slide value | Status | Source |
|---|---|---|---|---|
| N | Trainees a year on the system | 200 | PLACEHOLDER | Division |
| S0 | Simulator sessions to proficiency today (time to proficiency) | 30 | PLACEHOLDER | Division |
| r | Share of sessions avoided by targeted practice | 5%, 10%, 15% | ASSUMPTION, never measured; a trial would test it | None yet |
| C_session | Simulator running cost per session (range time) | S$1,500 | PLACEHOLDER | Division |
| h | Instructor hours per session | 2 | PLACEHOLDER | Division |
| C_instructor | Cost per instructor hour | S$250 | PLACEHOLDER | Division |
| Value per avoided session | C_session + h x C_instructor | S$2,000 mid (1,500 + 2 x 250); grid also shows S$1,000 and S$3,000 | derived from the above | |

Illustrative output (pool = 200 x 30 = 6,000 sessions a year):

| r | Sessions avoided | S$1,000 each | S$2,000 each (mid) | S$3,000 each | Mid case drivers |
|---|---|---|---|---|---|
| 5% | 300 | S$0.3M | S$0.6M | S$0.9M | 600 instructor hours; S$0.45M simulator; S$0.15M instructor; 30 to 28.5 sessions |
| 10% | 600 | S$0.6M | S$1.2M | S$1.8M | 1,200 instructor hours; S$0.9M simulator; S$0.3M instructor; 30 to 27 sessions |
| 15% | 900 | S$0.9M | S$1.8M | S$2.7M | 1,800 instructor hours; S$1.35M simulator; S$0.45M instructor; 30 to 25.5 sessions |

Not modelled (upside, no input yet): remedial retraining avoided, instructor hours freed for other work, earlier readiness for operations. Say "assumed" next to every `r`.

## 2. Development effort (measured from git, then labelled estimates)

Facts, from `git log` at `dc0e438` (merges excluded from line counts; images and the .pptx excluded):

| Fact | Value |
|---|---|
| Commits | 155, of which 123 non-merge and 32 merge |
| Active calendar days | 1 (2026-10-29) |
| Window, first to last commit | 10:33 to 16:47 (+08:00), 6.2 h |
| Contributors | 4: JL (allocation, link, assess, docs), Devin (runtime, CGF behaviour, simulation), Eevee (design and CSS), Glenda (report and history, committed through Claude sessions) |
| First-to-last commit span per person | Devin 5.5 h, JL 5.2 h, Eevee 4.2 h, Glenda 1.9 h (sum 16.8 h) |
| Lines, text files | 20,514 added, 3,455 deleted, 17,059 net |
| Code and test lines at the ref (no `docs/`, `design/`, `.md`) | 12,577 |

Method, written down:

- **Upper bound**: active days x contributors = 1 x 4 = **4 person-days** (each person counted for a full day).
- **Lower bound**: sum of each person's first-to-last commit span, divided by 8 h = 16.8 / 8 = **2.1 person-days**. It ignores uncommitted work such as reading, planning and rehearsal.
- Stated effort: **2.1 to 4 person-days**. The work was **AI-assisted** and on a hackathon timeline, so this is not a normal productivity rate and not a quote for a deployable system. Devin's first commits (the base simulator) may include work from before the window; this was not verified.
- **Conventional comparison (ASSUMPTION)**: 12,577 code and test lines / 50 to 20 delivered lines per person-day = **252 to 629 person-days**. The 20 to 50 range is a crude assumption, not a measurement; replace it with the division's or the team's own norm.
- **Cost (PLACEHOLDER)**: S$800 loaded cost per person-day. Prototype 4 x 800 = S$3,200; conventional S$0.20M to S$0.50M.
- **Not counted**: HLA/DIS adapter to a real simulator, a trial with real cohorts, approvals (local model on event laptops), maintenance. Productionisation effort is **blank** until it is estimated.

## 3. Payback

```text
Payback (months) = 12 x development cost / annual saving      (annual saving at the S$2,000 mid value)
```

| Build | Person-days | Cost | r = 5% | r = 10% | r = 15% |
|---|---|---|---|---|---|
| Prototype as built | 4 | S$3,200 | under 1 month | under 1 month | under 1 month |
| Conventional, fast | 252 | S$0.20M | 4.0 | 2.0 | 1.3 |
| Conventional, slow | 629 | S$0.50M | 10.1 | 5.0 | 3.4 |

Read with care: payback starts only after deployment and after a trial has shown that `r` is real; the prototype row ignores everything not counted above, so the conventional rows are the sober ones.

## 4. What the division must supply

N, S0, C_session, h, C_instructor (replace the placeholders), the loaded day rate, a norm for conventional development effort (or the real build estimate for the simulator adapter and trial), and, later, a measured `r` from a trial. Until then the slides keep the labels ASSUMED, PLACEHOLDER and ILLUSTRATIVE.
