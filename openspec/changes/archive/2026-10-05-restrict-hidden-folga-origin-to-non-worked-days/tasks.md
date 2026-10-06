# Tasks

## 1. Phase 2 Hidden Candidate Rule

- [x] 1.1 In `tests/planning.test.js`, update the phase 2 fixtures that use hidden weekdays as valid candidates, and add regression cases for: only a hidden weekday (no action, no valid hidden candidate), a hidden Sunday, a hidden supported holiday, mixed eligible and ineligible hidden dates, and visible-folga priority. Verify the hidden-weekday case fails before the fix.
- [x] 1.2 In `35-planejamento.js`, restrict the hidden candidates in `planejarFase2Rodada` to dates also present in the week's hidden Sundays or hidden holidays, keeping date order, de-duplication, used-date and attempt-history handling; verify `node --test tests/planning.test.js` passes.

## 2. Documentation

- [x] 2.1 In `PAGE_STRUCTURE.md`, note that a day with no row on the page does not by itself identify a folga, without employee names, values, or counts; verify the note is present and `git diff --check` is clean.

## 3. Integration Verification

- [x] 3.1 Run `node --test` and verify the full suite passes, and verify `20-mapa.js`, `99-main.user.js`, and the stable `main` line are unchanged by this work.

## 4. Publication and Live Verification

- [x] 4.1 Commit and publish this work to the `test` branch, then verify the remote `test` branch head contains the commit.
- [x] 4.2 After the remote modules have propagated, run the published planning read-only against the live Justificativas sheet through MCP, and verify phase 2 proposes no adjustment from a hidden weekday such as 29/09/2026; do not run adjustment or save actions.
