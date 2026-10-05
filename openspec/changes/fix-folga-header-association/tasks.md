# Tasks

## 1. Folga Mapping Regression and Fix

- [x] 1.1 Add a synthetic DOM regression in `tests/mapa.test.js` for the grouped-table structure: 03/10/2026 has a non-folga heading and a separate row with unrelated “Folga” text, while 04/10/2026 is the actual folga; verify the fixture reproduces the false classification before the fix.
- [x] 1.2 Update the mapper in `20-mapa.js` to associate each entry's date and folga category with its own date-bearing heading row; verify `node --test tests/mapa.test.js` passes, including the 03/10 and 04/10 cases and existing last-week and hidden-Sunday coverage.

## 2. Integration Verification

- [x] 2.1 Run `node --test` and verify the complete test suite passes without changing last-week inclusion, weekly planning, stable `main`, or write behavior.
