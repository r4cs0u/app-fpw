# Proposal

## Why

The current timesheet mapping logic (`20-mapa.js`) mixes DOM traversal in `mainFrame` with calendar grouping and classification of absences, days off, and holidays. Extracting the deterministic mapping step will let it be tested with synthetic data while preserving the existing map consumed by the adjustment workflow.

## What Changes

- Separate extraction of page data from the deterministic transformation that groups records into weeks and classifies absences, visible/hidden days off, and RJ holidays.
- Add focused unit tests for the pure transformation using synthetic entries only.
- Keep the existing `AF.mapa.mapearFolhaAtual()` entry point and returned structure compatible with its current consumers in `40-fases.js` and `35-planejamento.js`.
- Do not change the planning rules, action ordering, popup behavior, or write/save behavior.

## Capabilities

### New Capabilities
None. This is an internal refactoring with no spec-level behavior change; `skip_specs: true` is set for this change.

### Modified Capabilities
None.

## Impact

- Runtime touchpoint: `20-mapa.js`.
- Tests touchpoint: new `tests/mapa.test.js`.
- No intended observable behavior change: `mapearFolhaAtual()` must retain its current structure and semantics for existing consumers.
- No live employee data used in testing.
