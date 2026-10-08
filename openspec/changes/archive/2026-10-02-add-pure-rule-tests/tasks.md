# Tasks

## 1. Date and calendar rule tests

- [x] 1.1 Add an isolated Node.js test harness that loads `10-utils.js` with a minimal `window.AutomacaoFolha` stub, and add tests for valid and malformed date strings, date formatting, Monday-based week boundaries/IDs, and target-month comparison; verify these tests pass with `node --test`.
- [x] 1.2 Add synthetic-data tests for fixed and movable RJ holidays across representative years, and verify the results with `node --test` without using live page or employee data.
- [x] 1.3 Document `node --test` and the synthetic-data/no-page-interaction boundary in `README.md`; verify the documented command runs from the repository root.

## 2. Pure adjustment-planning tests

- [x] 2.1 Load `40-fases.js` in an isolated stub context and test phase 1 planning decisions, including used dates, absence selection, and no available absence; verify with `node --test`.
- [x] 2.2 Test phase 2 and phase 3 planning decisions with synthetic maps, including candidate order, duplicate/used dates, missing week, and no-candidate outcomes; verify with `node --test`.
- [x] 2.3 Run the complete `node --test` suite and confirm tests invoke only pure helpers/planners, with no DOM, popup, save, or approval interactions.
