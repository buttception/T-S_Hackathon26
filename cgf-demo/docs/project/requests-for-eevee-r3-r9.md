# For Eevee: decisions and styling requests

**From**: JL. **To**: Eevee (CSS and `design/`). **Date**: 2026-10-29. **Status**: open.

**Decided by JL**
- **R3**: adopted. "Adaptive practice" and "Fixed assessment" are the names. The host now shows the badge (`host.html`, id `modeBadge`, classes `modeBadge mode-adaptive` or `modeBadge mode-fixed`, the same as the allocation page). Devin adds the runtime badge.
- **R9**: decided. "Why is it reacting?", tension and posture move to the instructor view and the debrief (Devin).

**Styling needed**
1. `host.html` loads `css/style.css` and `link/host.css`, not `css/allocate-layout.css`, so the host badge is unstyled. Give `.modeBadge`, `.mode-adaptive` and `.mode-fixed` to the host (a shared sheet, or add them to `link/host.css`).
2. From Glenda's report work (`js/report/REQUESTS-FOR-JL.md`, "For Eevee"): add `--rp-chart-focus` to `css/tokens.css`; style `rp-result--met`, `rp-result--missed` and `tr.rp-partner` in `css/report.css`.
3. Update `design/requests.md`: R3 and R9 decided; R18, R20 and R21 done on the report side.
