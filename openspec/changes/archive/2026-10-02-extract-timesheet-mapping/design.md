# Design

## Context

See [proposal.md](proposal.md) for motivation and scope. `20-mapa.js` currently reads `mainFrame` inputs and traverses table rows to find each entry's date and day header, then uses `10-utils.js` to filter the target month, group entries by week, classify records, and calculate hidden day-off and holiday dates. `35-planejamento.js` consumes the resulting weekly collections; `40-fases.js` invokes the page mapper during adjustment execution.

## Goals / Non-Goals

**Goals:**

- Make the grouping and classification logic callable with synthetic descriptors and no DOM or frame access.
- Preserve all returned map fields, entry fields, collection ordering, and current classification behavior.
- Keep the existing page-facing mapping function as the integration boundary.

**Non-Goals:**

- Change date, week, holiday, absence, or day-off rules.
- Change planning decisions, adjustment actions, or write/save behavior.
- Remove DOM references from mapped entries if existing consumers depend on that field.

## Decisions

### Separate DOM collection from deterministic map construction

Keep `obterDataDoInput`, `obterCabecalhoDoDia`, and the `mainFrame` query in the page-facing layer. That layer collects descriptors containing the input reference, its numeric suffix, displayed value, date string, and day header. Move date parsing, target-month/last-week filtering, weekly grouping, classification, and hidden-date calculation into a deterministic function that accepts the target date and descriptor list. The transformation may carry the original input reference through as opaque data, but it must not inspect or mutate DOM elements.

**Alternative considered:** mock the complete legacy frame/table DOM in unit tests. This would test collection and transformation together but make tests brittle and obscure the calculation boundary being extracted.

### Preserve the existing map contract

Retain `mapearFolhaAtual()` and its current result shape: `alvo`, `ultimaSemanaId`, `semanas`, and `lista`; retain each week's current collections and each entry's current properties. Keep input iteration order and the existing filtering distinctions: visible records are retained for the target month and the last week, absences outside the target month do not enter `ausenciasMes`, hidden days off are calculated for the last week only, and hidden RJ holidays are calculated for mapped weeks.

**Alternative considered:** normalize the map into a smaller new model. That would change the planner contract and combine refactoring with behavior changes.

### Reuse deterministic date and classification utilities

Use the existing `AF.utils` date, week, holiday, and classification helpers in the transformation. These helpers already define project behavior and do not require DOM access. Unit tests should load the real utility module and pass synthetic descriptors and target dates.

**Alternative considered:** copy the calculations into a new helper or module. Duplicating utility rules risks divergence and is not necessary to isolate DOM traversal.

## Risks / Trade-offs

- [A moved condition or changed ordering can alter adjustment choices] → Add synthetic mapping tests for week boundaries, target-month versus last-week filtering, classifications, and hidden dates; preserve input order and compare the complete expected structure.
- [Mapped entries carry page input references] → Treat the reference as opaque in the transformation and test its identity only; tests must not inspect real page or employee data.
- [Existing structure contains implicit quirks] → Record and preserve current semantics, including hidden day-off calculation only for the last week, rather than correcting behavior in this refactor.
- [Unit tests do not verify the real page traversal] → Keep traversal limited to the existing mapping boundary and use only the supervised, non-writing test-line validation procedure for integration.

## Migration Plan

No data migration is needed. Extract the deterministic transformation, have `mapearFolhaAtual()` collect descriptors and delegate to it, and add focused synthetic tests in the same implementation group. Run the complete `node --test` suite and syntax checks. Validate the experimental runtime on `test` using the Tampermonkey confirmation process in `AGENT.md`; do not invoke **Ajustar**, save, or approval as part of the smoke check. If mapping results differ, restore the prior page-facing implementation before promoting any change.
