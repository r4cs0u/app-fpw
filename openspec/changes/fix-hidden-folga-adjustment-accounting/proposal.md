# Proposal

## Why

The October 2026 run showed related inconsistencies: Analysis omitted eligible hidden folgas because the map stores their dates as strings and did not count visible folgas whose only Phase 3 destinations were hidden Sundays or holidays. Adjustment could also report a folga as trapped when the popup offered no matching origin date. This follow-up aligns Analysis with Phase 3 candidate eligibility and requires popup evidence before reporting a trapped folga.

## What Changes

- Normalize hidden-folga date values when counting target-month folgas, preserving Analysis and pre-analysis parity.
- Count a target-month folga as a movement candidate when its week has an eligible hidden Phase 3 destination: a hidden Sunday or supported hidden holiday.
- Report Phase 2 and Phase 3 folgas as trapped only when at least one requested origin date was actually available in the popup selector and the attempt made no change.
- Add regression coverage for date representations, hidden Phase 3 destinations, missing popup candidates, and rejected available candidates.
- Record full-suite and focused-test evidence; keep live MyWay validation read-only unless separately authorized.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `adjustment-preanalysis`: Count target-month folgas using the map's actual date forms and all eligible Phase 3 destinations, consistently with adjustment planning.
- `fpw-automation`: Distinguish unavailable Phase 2/3 origins from available candidates that remain unchanged before recording a trapped folga.

## Impact

- Affected modules: `37-regras-folha.js`, `30-popup.js`, and `40-fases.js`.
- Affected regression suites: `tests/regras-folha.test.js`, `tests/popup-waits.test.js`, and `tests/ajuste-log.test.js`.
- The initial implementation baseline is published in `main` as `b0b4180`; this follow-up records additional behavior observed in a supervised run and is not yet implemented. No new dependency or final-approval behavior is intended.