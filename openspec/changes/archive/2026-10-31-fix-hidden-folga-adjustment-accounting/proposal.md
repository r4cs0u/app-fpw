# Proposal

## Why

The October 2026 run showed related inconsistencies: Analysis counted multiple marking rows for the same visible folga as separate folgas, while other cases with hidden Phase 3 destinations were omitted. Adjustment could also report a folga as trapped when the popup offered no matching origin date. This follow-up counts unique visible folga dates, treats hidden Sundays/holidays only as possible destinations, and requires popup evidence before reporting a trapped folga.

## What Changes

- Count each target-month visible folga date once, even when multiple marking rows share its header; do not count absent hidden dates as folga sources.
- Count a visible folga as a movement candidate when its week has an eligible hidden Phase 3 destination: a hidden Sunday or supported hidden holiday.
- Report Phase 2 and Phase 3 folgas as trapped only when at least one requested origin date was actually available in the popup selector and the attempt made no change.
- Add regression coverage for date representations, hidden Phase 3 destinations, missing popup candidates, and rejected available candidates.
- Record full-suite and focused-test evidence; keep live MyWay validation read-only unless separately authorized.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `adjustment-preanalysis`: Count unique visible target-month folgas and include eligible hidden Phase 3 destinations as candidate opportunities, without counting hidden dates as sources.
- `fpw-automation`: Distinguish unavailable Phase 2/3 origins from available candidates that remain unchanged before recording a trapped folga.

## Impact

- Affected modules: `37-regras-folha.js`, `30-popup.js`, and `40-fases.js`.
- Affected regression suites: `tests/regras-folha.test.js`, `tests/popup-waits.test.js`, and `tests/ajuste-log.test.js`.
- The initial implementation baseline is published in `main` as `b0b4180`; this follow-up records additional behavior observed in a supervised run and is not yet implemented. No new dependency or final-approval behavior is intended.