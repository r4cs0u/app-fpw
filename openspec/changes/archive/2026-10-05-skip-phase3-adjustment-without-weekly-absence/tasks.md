# Tasks

## 1. Non-worked destination mapping and planning

- [x] 1.1 Extend the weekly map to expose an unregistered Sunday for every mapped week, not just the final week; add synthetic mapping coverage for a hidden Sunday in an earlier week and verify with `node --test tests/mapa.test.js`.
- [x] 1.2 Update phase 3 planning so absence markers, visible/hidden holidays, and hidden Sundays are eligible destinations, excluding the folga's current date; preserve holiday ordering and label hidden-Sunday actions accurately. Add synthetic cases for hidden/visible destinations, an all-worked week, and no self-destination, then verify with `node --test tests/planning.test.js`.

## 2. Integration verification

- [x] 2.1 Run `node --test`, JavaScript syntax checks for changed modules, `openspec validate skip-phase3-adjustment-without-weekly-absence --strict`, and `git diff --check`; confirm no popup, save, approval, phase 1/2, or employee-list behavior changed.
