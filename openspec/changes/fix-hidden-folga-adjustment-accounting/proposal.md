# Proposal

## Why

The October 2026 run showed two related inconsistencies: Analysis omitted eligible hidden folgas because the real map stores their dates as strings, and Adjustment could report a hidden folga as trapped even when its date was absent from the popup selector. This change defines and verifies consistent counting and outcome classification so the report does not undercount folgas or invent trapped ones.

## What Changes

- Normalize hidden-folga date values when counting target-month folgas, preserving Analysis and pre-analysis parity.
- Report a hidden folga as trapped only when at least one hidden-origin date was actually available in the popup selector and the attempt made no change.
- Add regression coverage for string/object date representations, missing popup candidates, and rejected available candidates.
- Record full-suite and focused-test evidence; keep live MyWay validation read-only unless separately authorized.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `adjustment-preanalysis`: Count target-month hidden folgas using the date forms emitted by the map, consistently with Analysis.
- `fpw-automation`: Distinguish an unavailable hidden-origin date from an available candidate that remains unchanged before recording a trapped folga.

## Impact

- Affected modules: `37-regras-folha.js`, `30-popup.js`, and `40-fases.js`.
- Affected regression suites: `tests/regras-folha.test.js`, `tests/popup-waits.test.js`, and `tests/ajuste-log.test.js`.
- No API, dependency, page-write, or final-approval behavior is intended to change. The existing working-tree implementation is uncommitted; this proposal records its contract and verification, not a claim that it has been merged or operationally validated in MyWay.