# Design

## Context

`20-mapa.js` reads the WebPonto frame and produces week/record objects. The first three adjustment phases already have deterministic planning functions that consume those objects; their callers in `40-fases.js` execute popups and interact with the page. The existing `tests/planning.test.js` exercises the planning decisions by loading the workflow module, which also contains browser-dependent code.

See [proposal.md](proposal.md) for motivation and scope. The existing automation capability describes environment and operational documentation, not this internal module boundary, so no behavior spec changes are needed.

## Goals / Non-Goals

**Goals:**

- Give the phase 1–3 decision functions a module that has no dependency on the DOM, frames, popup execution, or save controls.
- Keep structured map inputs, decision order, and returned action/result shapes unchanged.
- Preserve sequential remote module loading and make the planner available before workflow executors run.

**Non-Goals:**

- Change how `20-mapa.js` reads the page or the shape of the map it returns.
- Move analysis, phase 4, popup, persistence, or approval behavior.
- Change business rules, including ordering and fallback behavior, while extracting them.

## Decisions

### Add a dedicated `35-planejamento.js` module

Move `escolherAusenciaDestino`, `planejarFase1Rodada`, `planejarFase2Rodada`, and `planejarFase3` into `35-planejamento.js`, exposing the planners under `window.AutomacaoFolha.planejamento`. Load it after `10-utils.js` and before `40-fases.js`; phase 2's fallback week calculation uses `AF.utils.semanaIdBR`.

**Alternative considered:** leave the functions in `40-fases.js` and only add more tests. That would preserve co-location with popup/write code and keep the current boundary implicit. A dedicated module is a small structural step that can be tested without evaluating the executor module.

### Keep workflow orchestration in `40-fases.js`

The executors continue to map the page, maintain per-run history/used-date sets, invoke popups, and process results. They delegate only the deterministic decision step to `AF.planejamento`. Do not keep duplicate planner implementations or wrappers in `AF.fases`; the repository search shows the current call sites are the phase executors and tests.

**Alternative considered:** move entire phase loops into the planner. This would mix side effects into the rule boundary and undermine isolated tests.

### Preserve outputs and validate the integration seam

Keep the existing synthetic scenarios and expected outputs, updating their harness to load the new module. Add a focused assertion that the entrypoint loads `35-planejamento.js` before `40-fases.js`, and verify the executor delegates to the planner without invoking any page-interaction function in unit tests.

**Alternative considered:** compare only a few resulting actions manually. Existing tests already define representative behavior and are a stronger regression baseline for this mechanical extraction.

## Risks / Trade-offs

- [A missing or misordered remote module can prevent the userscript from initializing] -> Test the entrypoint module order and run syntax checks on both the new module and entrypoint.
- [A changed return shape can alter popup inputs] -> Retain the current synthetic result assertions and verify `40-fases.js` delegates without reshaping the planner result.
- [A broader refactor could accidentally include write-sensitive flows] -> Keep phase execution, phase 4, `gravar`, and approval outside the new module; no test invokes those paths.
- [A passing Node suite cannot prove the remote module deployment works in Tampermonkey] -> After implementation, perform a controlled non-writing startup/analysis smoke check on the `test` line before promotion.

## Migration Plan

No data migration is needed. Add and load the planner module, change executor call sites, update the unit-test harness and SSD module map, then run `node --test` and JavaScript syntax checks. If the controlled test-line startup check fails, restore the prior module list and phase implementation before promoting anything; do not make changes on `main` as part of this work.
