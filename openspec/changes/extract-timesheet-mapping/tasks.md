# Tasks

## 1. Extract and test deterministic map construction

- [x] 1.1 Separate the `mainFrame` DOM collection in `20-mapa.js` from the date filtering, weekly grouping, classification, and hidden-day calculation; add synthetic unit tests for month boundaries, last-week records, absences, visible/hidden days off, and RJ holidays, and verify them with `node --test tests/mapa.test.js`.
- [x] 1.2 Keep `AF.mapa.mapearFolhaAtual()` delegating from collected descriptors to the pure transformation without changing its output fields or ordering; add a focused adapter test using only synthetic DOM-like inputs and verify map and consumer contract assertions with `node --test tests/mapa.test.js`.

## 2. Document and validate the refactor

- [x] 2.1 Update the `20-mapa.js` responsibility and DOM/pure-logic boundary in `SSD.md`; verify the description matches the implementation and does not claim page traversal is DOM-free.
- [x] 2.2 Run syntax checks on changed JavaScript modules, the full `node --test` suite, and `git diff --check`; verify all tests pass and no planning, popup, or write/save behavior was changed.

## 3. Validate the test runtime

- [ ] 3.1 Publish the completed change to `test`, then wait for the user's explicit “ok” before reloading MyWay/Justificativas; verify only that the updated mapping module loads and the application initializes, without invoking **Ajustar**, saving, or approving.

