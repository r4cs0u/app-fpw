# Spec Delta

## ADDED Requirements

### Requirement: Visible folga dates are counted once
The pre-analysis SHALL count movement sources only from visible folga dates in the target month, with each calendar date counted once even when the sheet has multiple marking rows for that date. Dates absent from the sheet SHALL NOT be counted as folga sources. The count SHALL match Analysis for the same sheet state.

#### Scenario: Multiple rows share one visible folga date
- **WHEN** a visible folga date has multiple marking rows with the same day header
- **THEN** Analysis and pre-analysis SHALL count and list that calendar date once

#### Scenario: Hidden date is absent from the sheet
- **WHEN** a date is missing from the sheet and appears only in the hidden-date map
- **THEN** it SHALL NOT be counted as a folga source

#### Scenario: Visible source has an eligible hidden destination
- **WHEN** a visible target-month folga has a hidden Sunday or supported hidden holiday in its week
- **THEN** the visible folga SHALL be counted once as a movement candidate, while the hidden date SHALL NOT be counted as a source

### Requirement: Folgas with hidden Phase 3 destinations are counted as candidates
The pre-analysis SHALL count each unique target-month visible folga as a movement candidate when its week has a hidden Sunday or supported hidden holiday that Phase 3 may use. This count indicates an eligible attempt, not a guarantee that the popup offers the date or that the adjustment succeeds. Arbitrary hidden weekdays SHALL NOT qualify.

#### Scenario: Hidden holiday is the only Phase 3 destination
- **WHEN** a target-month visible folga shares its week with a supported hidden holiday and no visible absence or holiday
- **THEN** Analysis and pre-analysis SHALL count that folga once as a movement candidate

#### Scenario: Multiple rows share a folga with a hidden destination
- **WHEN** multiple marking rows share a visible folga date and the week also has an eligible hidden Phase 3 destination
- **THEN** Analysis and pre-analysis SHALL count the visible folga date once

#### Scenario: Hidden Sunday is in the transition week
- **WHEN** a target-month visible folga is in the last week of the month and the only eligible Phase 3 destination is a hidden Sunday in the following month
- **THEN** Analysis and pre-analysis SHALL count the visible folga once as a movement candidate

#### Scenario: Only a hidden weekday is available
- **WHEN** a target-month visible folga has no visible destination, hidden Sunday, or supported hidden holiday in its week
- **THEN** it SHALL NOT be counted as a movement candidate solely because another weekday is absent from the sheet