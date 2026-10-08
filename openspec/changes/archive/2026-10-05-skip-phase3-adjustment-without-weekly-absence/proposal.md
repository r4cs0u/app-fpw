# Proposal

## Why

The planner currently treats a week without an absence-of-marking entry as having no valid place to move a folga. That is incomplete: holidays and hidden Sundays are also non-worked days and can be valid destinations, so the folga is not trapped when one of them exists.

## What Changes

- Consider absence markers, visible or hidden holidays, and hidden Sundays as eligible non-worked destinations before classifying a folga as trapped.
- Keep the existing phase 3 movement path available for holiday and hidden-Sunday destinations even when the week has no absence-of-marking entry.
- Exclude the folga's current date from destinations; preserve existing candidate ordering, phase 1/2 behavior, and popup rejection handling.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `fpw-automation`: classify a folga as trapped only when its week has no eligible alternative non-worked destination.

## Impact

- `20-mapa.js`: expose hidden Sundays for mapped weeks.
- `35-planejamento.js` and `40-fases.js`: plan and report phase 3 actions to hidden Sundays as well as existing holiday destinations.
- `tests/mapa.test.js` and `tests/planning.test.js`: synthetic coverage for hidden Sunday mapping, trapped weeks, and existing eligible phase 3 behavior.
- OpenSpec delta for `fpw-automation`; no page-structure, popup, or server behavior changes.
