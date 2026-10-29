# Requests from the report lane (Glenda) to JL and Eevee

Written 2026-10-29. This file lives in `js/report/` because `docs/` is JL's lane.

## For JL

### 1. `hostLink.forReport` can stop stripping AI partners (link/host.js)

The report now accepts crew entries with `role: "partner"` (or any `partner_<seat>` id):

- `Report.finishSession(record)` builds a report and a history entry for each **trainee** only. Partner entries are skipped.
- `Report.build` / `Report.buildWith` throw `"<id> is an AI partner: partners get no report"` if asked for a partner id.
- `History.append` throws if `entry.trainee_id` starts with `partner_`.
- Partner events (`trainee_id` `partner_<seat>`) are never counted in any trainee's `events_by_competency`.
- `report.html` lists each partner in the crew table as "AI partner in the weapons seat, based on trainee_b; not assessed" and shows no trainee section for it.

So in `link/host.js`, function `hostLink.forReport` (the lines that return `Object.assign({}, record, { crew: record.crew.filter(m => !(m && m.role === 'partner')) })`): **return `record` unchanged**, with the partner entries (`role`, `derived_from`) kept in `crew`. The report then shows the crew table line. The comment above it ("left out until it lists them...") can go.

### 2. The runner does not see `tests/report/outstanding.html`

`runner/run-tests.ps1` runs `tests/*.html` only. The report lane has no Node on this laptop, so its new tests are in `tests/report/outstanding.html`, which loads `outstanding.test.js` (the same file also runs under `node --test`). Please either point the runner at `tests/report/*.html`, or tell me if you want the page copied up to `tests/` (that folder is not in the report lane). Result today when opened in headless Edge from `file://`: `16 / 16 passed`. The page sets `data-done` on `#summary`, as the runner expects.

## For Eevee (CSS and design; nothing here needs a contract change)

Done in `js/ui-report.js` and `js/report/charts.js`; `css/report.css` and `css/tokens.css` still need to use the new names.

**R20, single-event results** (Trainee events table, Result column). Class on the `<td>` and its words:

| Class | Word | Was |
|---|---|---|
| `rp-result--met` | `met` | `rp-outcome--success rp-good`, "success" |
| `rp-result--missed` | `missed` | `rp-outcome--fail rp-bad`, "fail" |

An event with no outcome shows "—" and no class. The session outcome chip (`rp-outcome--success` / `--fail`) and the history table's Outcome column are unchanged. The legacy `rp-good` / `rp-bad` are no longer on these cells.

**R21, chart roles** (`js/report/charts.js`). Colours are `var(--rp-chart-<role>, var(--<fallback>))`. New role:

| Role | Variable | Fallback today | Used for |
|---|---|---|---|
| `miss` | `--rp-chart-miss` | `--warn` | a missed event: the hollow dots on the success-rate chart (the second panel of the timeline) |
| `focus` (new) | `--rp-chart-focus` | `--warn` | a focus area: the ring on the competencies chart and its legend entry "focus area" |

Please add `--rp-chart-focus` to `css/tokens.css` (the violet that the competency table already uses for the focus level). Until then it falls back to the same orange as `miss`, so nothing breaks.

**R18, wording and headings.** "Focus area" is the only wording for a weak competency. Headings show the date ("30 Oct 2026, run 2"); the raw id stays in tooltips and the small meta line. The narrative renders as `ul.rp-narrative.rp-narrative-lines`, one sentence per `li`.

**New hook:** `tr.rp-partner` in the crew table, one row per AI partner (id, seat, then a muted cell spanning four columns).
