# Hackathon: trainee allocation page (plan)

> Historical (2026-10-29): this page describes the first, two-pane version. The A/B panes were removed; there is one crew and one runtime. For current truth see INTERFACES §3.1 and §11 and `link/README.md`.

**Summary**: This is a pre-run page. The instructor chooses the player role (fighter, warship or tank), seats a trainee from the seeded roster in every position of two crews (crew A in pane A, crew B in pane B), and sets the shared run options. The page outputs one `Allocation` (INTERFACES §3.1), which expands into one scenario config per pane (§3). The simulation run consumes it later. Linking to the run is out of scope for this build.

**Last updated**: 2026-10-29. Status: MVP built and on `main`. The first version (one trainee per pane) was pushed as `6085374`. The player-role and crews version replaces it (commit below). The branch `feat/allocation-page` still exists on `origin` at `6085374`. JL decided to skip branching because the project is one day long.

## Build state

- **Player role and crews (2026-10-29, JL's request)**: the page adapts to the platform type. A seat is a trainee station, not the vehicle's whole crew.

  | Type | Seats | Scenario domain | Models (source on each) |
  |---|---|---|---|
  | Fighter | 2: `pilot`, `weapon` | air | F-15E Strike Eagle; F/A-18F Super Hornet |
  | Warship | 3: `weapons`, `sensors`, `navigation` | sea | Formidable-class frigate (RSN); Independence-class LCS (US Navy) |
  | Tank | 2: `commander`, `driver` | land | Leopard 2SG (Singapore Army); M1A2 SEPv3 Abrams |

  - Each model has its own seat labels and descriptions, taken from the sources it cites (af.mil, defence.gov.au, mindef.gov.sg, Wikipedia, defencepioneer.sg, army.gov.au).
  - **Tank seats are my choice.** JL gave "2 people" and no roles. Real tanks carry 4 crew (both models), so the page seats a commander and a driver, because the driver takes heading and speed in the simulator and the commander takes hails and fire control. The gunner and loader are simulated. Changing the roles is a one-line edit in `fixtures/platforms.js` and `contracts/contracts.js`.
  - **Warship seats are not sourced watch positions.** The searches found no CIC watch roles. The seats are stations defined for this exercise, mapped to the systems the sources list (Herakles, Scanter 2001, Aster, Harpoon, 76 mm; Sea GIRAFFE, BridgeMaster E, ICMS).
  - The two "Independence-class" names are different ships. This page uses the US Navy LCS, not the RSN littoral mission vessel.
  - **Seat focus** (which competencies a seat mostly influences) is a provisional mapping in `fixtures/platforms.js`. The page only uses it to highlight roster columns. Every competency is covered by some seat of every type.
  - The scenario list follows the platform: a fighter needs an air scenario, a warship a sea one, a tank a land one. A scenario with no `domain` counts as sea, as in the engine. This replaces the earlier `strait-transit`-only limit.
- **Contract change**: §3 `trainee` is replaced by `platform` and `crew`, and §3.1 `slots` hold a `crew` instead of one trainee. INTERFACES §1, §3 and §3.1 were updated in the vault. `contracts/contracts.js` now has `validateAllocation`, `expandAllocation`, `validatePlatform` and `validateCrew`.
- **Files** (all inside `cgf-demo/`): `allocate.html`, `css/allocate.css`, `js/ui-allocate.js`, `contracts/contracts.js`, `fixtures/envelope-default.js`, `fixtures/platforms.js`, `fixtures/profiles/roster.js` (2 demo trainees and 20 cohort trainees), `tests/allocate.html`. Devin's files are untouched.
- **Checked**: `tests/allocate.html` passes 59 of 59 in headless Chrome under `file://`. That covers every earlier assertion plus the platform catalog, seat counts per type, the wrong-domain scenario, switching platform with seats part filled, trainees moving between seats, and malformed allocations. A scripted run of the page confirmed the seats and scenario change with the platform type, another model of the same type keeps the crews, and a saved allocation restores after a reload. An allocation saved in the older formats falls back to defaults without an error. Edge was not run.
- **Output and handoff**: the `Allocation`, saved in `localStorage` under `cgf.allocation`, with a `host.html?alloc=<encoded>` link and an Export JSON button as fallbacks. "Start run" is a disabled button. `created_at_session` is `null` until sessions get ids.
- **A0 done**: in Chrome and Edge, a value saved on one `file://` page is readable on another, and an iframe can `postMessage` its parent.
- **Not done**: A8 (likely-target column, waits for an Engine helper), A9 (suggest demo pair).
- **Placeholders**: `trainees/strong.js` and `trainees/weak_hail_discipline.js` are the Sim lane's S3 files and do not exist yet. `contracts/contracts.js` holds guessed values: hard range 0 to 3 for weight multipliers, and the setting names from §2.
- **Open for the Lead**: INTERFACES §11 says the engine holds one working profile per pane. With crews it is one per seat, which changes what "weakest competency" means for a pane (the weakest among the seat's focus competencies, or among the whole crew). Not decided, and not built.

The Scope, seam and Tasks sections below describe the first version (one trainee per pane). Read them with the crew change above: slots became crews, `buildRunConfigs` became `buildAllocation`, and the scenario limit became the domain match.

---

## Scope

| In | Out (later or another lane) |
|---|---|
| Roster of seeded trainees, showing each one's profile | Starting the run, the host page with two panes (Lead, C1) |
| Placing a trainee in slot A or B | Editing the envelope (Console C2). This page uses the default envelope fixture. |
| Shared run options: scenario, seed, mode, duration, eval interval | Choosing the competency to target (Engine E4) |
| Per-slot scripted agent profile | Cohort heatmap (C8) |
| Building and validating the §3 configs, then handing them off | A server, accounts, real names |

## The seam to the run

- The page's only output is `ScenarioConfig[]`, one per slot, exactly as INTERFACES §3 defines it.
- One pure function produces it: `buildRunConfigs(selection) -> ScenarioConfig[]`. The page calls the §3 validator from `contracts/` on each config before handing off.
- G1 needs both slots to share `scenario`, `seed`, `mode`, `duration_s` and `eval_interval_s`, with a different `trainee_id` in each.
- Handoff, in order of preference. Both depend on task A0.
  1. Write the configs to `localStorage` under a key the Lead sets, e.g. `cgf.allocation`.
  2. Fallback that always works: encode the configs into the URL of the run page, e.g. `host.html?alloc=<encoded>`.

## Tasks

Use the PLAN.md format. The MVP is A0 to A7. A8 to A10 come after the MVP.

| ID | Task | Lane | Acceptance |
|---|---|---|---|
| A0 | Spike: under `file://` in Chrome and Edge, check that a `localStorage` value written on one page can be read on another page in the same folder | Lead | Result recorded for both browsers. If either fails, the URL handoff becomes the main route. INTERFACES §5 profile persistence depends on this too. |
| A1 | Roster fixture `fixtures/profiles/roster.js`, assigning to `window.CGF_FIXTURES.profiles`. It holds the two demo trainees (`trainee_a` strong, `trainee_b` weak at `hail_discipline`) and 20 cohort trainees. Synthetic ids only. Each profile matches §5. | Lead (fixtures) | Every profile passes the §5 validator. Loads from `file://` with no fetch. |
| A2 | Default envelope fixture, e.g. `fixtures/envelope-default.js` | Lead | Passes the §2 validation. |
| A3 | Page shell: `cgf-demo/allocate.html` plus `js/ui-allocate.js` and its styles. It loads `config.js` and the scenario scripts with `CGF.util.loadScript`, the same way `main.js` does, so the scenario list comes from `CGF.scenarios`. It doesn't touch `index.html` or `ui.js`. | Console (new HTML file needs the Lead's OK) | Opens from `file://` with no console errors. Works at laptop and projector widths. |
| A4 | Roster table with one row per trainee: `trainee_id`, `sessions_completed`, one bar per competency at mean `alpha/(alpha+beta)`, and a "not enough evidence" mark when `alpha+beta < 8`. A competency missing from the profile shows the (1,1) prior as "no evidence". Sort by any competency, and filter by "weak at X". | Console | Values match a hand calculation for 3 fixture trainees. |
| A5 | Slots A and B: assign a trainee by clicking the slot, then the row (no drag and drop). Each slot also gets a scripted agent profile picker (`trainees/strong.js`, `trainees/weak_hail_discipline.js`, from Sim S3). The same trainee can't be in both slots. Clear and swap buttons. | Console | Both slots must be filled, with different trainees, before handoff is enabled. |
| A6 | Shared run options. Scenario is limited to `strait-transit` for G1; the other scenarios are listed but disabled, labelled "no competency signal yet". Seed is a number with a reroll button that derives a new seed from the old one, with no `Math.random`. Mode is adaptive or fixed. `duration_s` and `eval_interval_s` default to the §3 placeholder values. | Console | Invalid values (seed not an integer, duration ≤ 0, interval ≥ duration) block handoff with a message on the field. |
| A7 | `buildRunConfigs` plus handoff: validate each config, then write it to `localStorage` (try/catch) and show the URL fallback link. "Start run" stays disabled with "linking later". Also offer an "Export JSON" download. | Console (pure function) and Lead (key name) | The browser test page checks that the output is two valid §3 configs with a shared seed and scenario and different trainees. Breaking any field makes validation fail. |
| A8 | "Likely target" column. Calls an Engine-owned helper, e.g. `Adapt.predictTarget(profile)` in `js/adapt/`. Until that exists, show nothing rather than reimplementing E4 on the page. | Engine (helper), Console (column) | The column matches the engine's first target for both demo trainees. |
| A9 | "Suggest demo pair": picks two trainees who differ most on one competency, each with enough evidence. | Console | For the seeded roster it picks `trainee_a` and `trainee_b` on `hail_discipline`. |
| A10 | Browser test page `tests/allocate.html` covering `buildRunConfigs`, the mean and evidence calculation, and slot validation | Lead (`tests/`) | All pass in Chrome and Edge. Node isn't installed on this laptop, so this replaces `node:test`. |

## Contract questions for the Lead

These must be decided before A1 and A7. I haven't worked around any of them.

1. **Wrapper object. DECIDED 2026-10-29 (JL): add it.** The `Allocation` contract is in INTERFACES §3.1, with `expandAllocation` deriving the two §3 configs. The page's output and handoff (`cgf.allocation`) become the `Allocation`, not a bare pair; tasks A7 and A10 change accordingly. Original question: is a pair of §3 configs enough, or should there be an `Allocation` contract? If there is one, it would hold `allocation_id`, `created_at_session`, `shared` (scenario, seed, mode, duration_s, eval_interval_s, envelope) and `slots` (`[{pane: "A"|"B", trainee_id, agent_profile}]`). A pair is enough for G1. A wrapper only pays off if the run page needs to know which config goes in which pane.
2. **Human-driven slot.** §3 requires `agent_profile`, so a slot played by a person can't be represented. Either make the field nullable (null meaning human) or keep scripted-only for G1.
3. **Display name.** §5 has no name field, so the page labels trainees by `trainee_id`. Is a synthetic call sign wanted (for example "Trainee B")?
4. **Competency coverage.** The §5 example has 3 of the 5 competencies. Should seeded profiles carry all 5, or should missing ones fall back to the prior?

## Inputs changed by Devin's `0850c94` (pulled 2026-10-29)

- The harnesses were renamed and made domain-neutral: `hostile-state`, `non-hostile-state`, `grey-zone`, `raiders`, `civil-traffic`. `"force": "hostile-navy"` in INTERFACES §7 is stale.
- New scenarios were added: `border-patrol` (land), `airspace-patrol` (air) and `sea-air`. The competency list is maritime-only (hail, piracy, territorial), so those scenarios have no competency signal yet.
- PLAN §13 says "no new scenarios before G2", but the scenarios are already in `main`. Whether that rule still holds is a Lead decision.

## Constraints that apply

- Runs from `file://` with no server, no bundler and no fetch. Fixtures are `.js` files.
- Vanilla JS, matching the `window.CGF` style. Don't edit Devin's files.
- Every `localStorage` access is wrapped in try/catch, and the page still works without it.
- All data is synthetic.

## Instructor view (built 2026-10-29)

What the page now shows the instructor, beyond seating:

| Feature | Where | Notes |
|---|---|---|
| Sample names | Roster, seat cards, vehicle markers | Profile `name` (INTERFACES §5). `trainee_id` stays as a small secondary label. Names are synthetic. |
| Vehicle diagram | One per crew, above the seat cards | Inline SVG, drawn for the platform type chosen (`js/ui-allocate-vehicles.js`). A numbered marker per seat, filled with the trainee's initials; click a marker to pick that seat. Dashed markers are simulated crew (a tank's gunner and loader). |
| Trainee detail | Below the roster | Point at a row to read every competency with its evidence, a plain-language summary (code-computed), and a private note (`cgf.notes.<id>`). A pencil marks trainees with a note. |
| Seat summary | Each seat card | Weak, strong, thin and unmeasured competencies for that seat only. |
| Likely first target | Each seat card | From Devin's `Adapt.predictTarget` (`js/adapt/predict.js`, loaded by `allocate.html`), with the settings it would nudge. If it fails to load, a preview of the INTERFACES §5.1 rule is used and labelled "(preview)". Request: `request-devin-predict-target.md` (done). |
| Crew comparison | Under the crews | Per seat, the biggest gap between the two trainees, plus warnings when crews differ in experience by 3 or more sessions, or when no seat differs by 0.20. |
| Suggest demo pair | Button | The sharpest contrast on one competency (the "Weak at" filter, else `hail_discipline`) in one seat, trainees at most 2 sessions apart, the strong one in crew A. Other seats are matched on level and experience, preferring trainees with evidence. |
| Envelope editor | Setup panel | Min, base and max per setting, validated against the hard ranges. Saved with the allocation. "Reset envelope" restores the default. |

Weak is a mean below 0.50 and strong is 0.70 or more, both with enough evidence (`alpha + beta >= 8`).

### Layout (2026-10-29)

The layout follows the instructor's workflow (`design/PRINCIPLES.md`, on Eevee's branch): the platform and the crews are the stage, the trainee pool is a side column used to fill them, and the hand-off stays in view.

| Area | Where | What |
|---|---|---|
| Header | Top | Title, an always-visible mode badge (outlined "Adaptive practice" or filled "Fixed assessment · no adjustments"), Open simulator |
| Platform | Stage, top | Type and model selectors, a one-line summary with a Source link; sourcing notes under "About these seats" |
| Crews | Stage, centre | Crew A and crew B side by side, each with its vehicle diagram and seat cards. A seat card shows the trainee, the seat's three competencies, the summary, the likely first target and the scripted agent; the seat description is under "About this seat" |
| Comparison and actions | Stage | Crew comparison, then Suggest demo pair, Swap crews, Reset |
| Run options, adaptation limits | Stage, collapsed | One-line summary each (scenario, seed, mode, duration, interval; number of settings). A section that holds an error opens by itself |
| Hand-off | Stage, pinned to the bottom | Readiness message, Start run, Save, Export JSON; link and config preview collapsed |
| Trainee pool | Side column | "Choosing for crew A, seat X", a focus-area filter, a Show all competencies toggle, the roster (name, sessions and, by default, only the selected seat's three competencies), and the trainee detail with notes |

Files: `allocate.html` (markup), `css/allocate-layout.css` (new; structure only, loaded after `allocate.css`, so Eevee's file is untouched and she can fold it in), `js/ui-allocate.js`, `js/ui-allocate-vehicles.js`.

### Eevee's requests, status on this page

From `design/requests.md` and `design/ui-audit.md` (Eevee's branches `eevee/ui-audit` and `eevee/design-principles`, not yet on `main`).

| Request or finding | Status |
|---|---|
| R1 bar colours as classes | Done. Bars carry `bar--low`, `bar--mid`, `bar--high` and `bar--focus` (the lowest competency with enough evidence, also marked with a ◆). No inline colours remain in `ui-allocate.js`. `allocate-layout.css` styles them as one neutral hue scaled by value; Eevee can restyle. |
| R5 collapse seat text and the platform box | Done. |
| R6 roster defaults to the seat's competencies | Done, with a "Show all competencies" toggle. |
| R3 mode names | Used her proposal, "Adaptive practice" and "Fixed assessment", on this page only. The team still has to decide; the runtime and host do not show it yet. |
| Finding 1 (page wider than the window) | Fixed by the layout. |
| Finding 2 (Start run far down) | Fixed: the hand-off is pinned to the bottom of the stage. |
| Finding 3 (eleven columns) | Fixed for the default view (name, sessions, three competencies). |
| Finding 4 (raw ids) | Fixed: sample names, ids as secondary labels. |
| Ethical AI wording ("focus area", not "weak") | Done on this page: "Focus areas", "Strengths", "Focus area: ..." in the filter. Internal field names (`weak`, `weakAt`) are unchanged. |
| R4 glossary, projector type scale, token groups (E1) | Waiting on Eevee. The page uses only tokens from `css/style.css`. |

What still needs Eevee: the look of the mode badge, bars and focus marker; moving the vehicle diagram's inline token colours (`js/ui-allocate-vehicles.js`) into classes; the inline `width:64px` on the limits inputs; the spacing and type size of the seat cards; the type scale for a projector.