# Proposal

## Why

The live Justificativas page showed 03/10/2026 as a non-folga day and 04/10/2026 as the folga, but the mapper classified an input for 03/10 as a folga. The mapper used text from a `TBODY` containing both the date heading and a separate row with the word “Folga”, combining the date from one row with the classification from another and potentially selecting the wrong adjustment origin.

## What Changes

- Associate each schedule input's date and folga classification with that date's actual heading, rather than classifying it from aggregate text on a surrounding table section.
- Add a regression test matching the observed structure, proving that unrelated “Folga” text in the same `TBODY` does not classify 03/10 as a folga when the corresponding heading says otherwise, while the actual 04/10 folga remains detectable.
- Preserve the existing month and final-week mapping rules. Changing which dates are included in the target period, or changing planning and adjustment behavior, is out of scope.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `fpw-automation`: Require folga classification to use the heading associated with the input's own date, not unrelated text aggregated from a surrounding DOM container.

## Impact

- `20-mapa.js`: date-heading association and folga classification during sheet mapping.
- `tests/mapa.test.js`: synthetic DOM regression coverage for the observed grouped-table structure.
- `PAGE_STRUCTURE.md` may be updated only if the implementation establishes a structural page-mapping contract that should be documented. No month-boundary, planning, or write behavior is included.
