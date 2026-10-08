# Proposal

## Why

In the last week of the month, phase 2 treats every day absent from the sheet as a possible hidden folga. A live run chose 29/09/2026, a Tuesday that has no row on the page, as the origin of an adjustment, even though the week had no visible folga and the day was not a Sunday or holiday. Absence from the page does not show that a day is a folga; it is more likely an ordinary worked day. The popup accepted the swap and the run continued to the final field change, so the app can alter a worked day.

## What Changes

- Limit the hidden-folga candidates used by phase 2 to days that are non-worked by nature: hidden Sundays and hidden supported holidays. A hidden day that is neither SHALL NOT be used as the origin of an adjustment.
- Keep visible folgas as the first choice in phase 2, and keep destination selection, candidate de-duplication, attempt history, and the rest of the phase order unchanged.
- Update the phase 2 planning tests that currently use hidden weekdays as valid candidates, and add regression cases for a hidden weekday, a hidden Sunday, and a hidden holiday.
- Document in the page structure that a day with no row on the page does not by itself identify a folga.
- Intentional difference from the stable `main` line, which treats any absent day in the last week as a hidden folga. `main` is not modified.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `fpw-automation`: Add a requirement that hidden-folga origins in phase 2 are limited to hidden Sundays and hidden supported holidays.

## Impact

- `35-planejamento.js`: phase 2 hidden-candidate selection.
- `tests/planning.test.js`: updated phase 2 fixtures and new regression cases.
- `PAGE_STRUCTURE.md`: note on absent days.
- No change to `20-mapa.js` output, phase 1, phase 3, popup interaction, or `99-main.user.js`. Publication to the `test` branch and a read-only live check are part of the tasks.
