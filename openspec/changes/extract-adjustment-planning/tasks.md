# Tasks

## 1. Extract and test pure planning rules

- [x] 1.1 Move the phase 1–3 planners and shared absence-selection helper from `40-fases.js` into `35-planejamento.js` under `AF.planejamento`, with no DOM/frame/popup/write dependencies; verify `node --check 35-planejamento.js` and `node --test`.
- [x] 1.2 Update phase 1–3 executors in `40-fases.js` to delegate to `AF.planejamento` without changing their orchestration or action/result shapes; update `tests/planning.test.js` to load the planner module and preserve all synthetic scenarios, then verify `node --test`.

## 2. Integrate and document the module boundary

- [x] 2.1 Add `35-planejamento.js` to `99-main.user.js` before `40-fases.js`; add regression coverage for that load order and verify `node --test` plus `node --check 99-main.user.js`.
- [x] 2.2 Update the runtime module map and responsibility boundary in `SSD.md`; verify the documented order matches `99-main.user.js` and `git diff --check` passes.

## 3. Validate the experimental runtime

- [x] 3.1 Run syntax checks for the touched userscript modules and the complete `node --test` suite; verify all tests pass and no planner test invokes DOM, popup, save, or approval behavior.
- [ ] 3.2 Follow the test-installation procedure in `AGENT.md`: confirm the Tampermonkey action for `app-fpw` on branch `test` by clicking the available **Atualizar**, **Instalar**, **Reinstalar**, or equivalent button; then refresh the MyWay/Justificativas page, confirm the runtime loads the new planning module and the panel initializes, and do not invoke **Ajustar**, save, or approval. Record only technical results, without employee or sheet data. The update URL currently exposes only Tampermonkey's intermediate page in the available browser controls; the actual install confirmation/button is not exposed, so the live smoke test remains pending until installation can be confirmed.
