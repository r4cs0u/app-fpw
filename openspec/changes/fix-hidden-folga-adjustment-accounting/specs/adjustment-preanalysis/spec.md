# Spec Delta

## ADDED Requirements

### Requirement: Hidden folga dates are counted consistently
The pre-analysis SHALL interpret a hidden folga represented as a date string or a record containing that date as the same calendar date. It SHALL count only qualifying folgas in the target month and SHALL report the same count and dates as Analysis for the same sheet state.

#### Scenario: Hidden date is a string
- **WHEN** a qualifying hidden folga in the target month is represented as `dd/mm/yyyy`
- **THEN** Analysis and pre-analysis SHALL include that date once in their folga count and date list

#### Scenario: Hidden date is a record
- **WHEN** a qualifying hidden folga in the target month is represented as a record containing `dataStr`
- **THEN** Analysis and pre-analysis SHALL include that date once in their folga count and date list

#### Scenario: Hidden date is outside the target month
- **WHEN** a hidden date belongs to the transition week but falls outside the target month
- **THEN** it SHALL NOT be included in the target-month folga count or date list

### Requirement: Folgas with hidden Phase 3 destinations are counted as candidates
The pre-analysis SHALL count each target-month visible folga as a movement candidate when its week has a hidden Sunday or supported hidden holiday that Phase 3 may use. This count indicates an eligible attempt, not a guarantee that the popup offers the date or that the adjustment succeeds. Arbitrary hidden weekdays SHALL NOT qualify.

#### Scenario: Hidden holiday is the only Phase 3 destination
- **WHEN** a target-month visible folga shares its week with a supported hidden holiday and no visible absence or holiday
- **THEN** Analysis and pre-analysis SHALL count that folga once as a movement candidate

#### Scenario: Hidden Sunday is in the transition week
- **WHEN** a target-month visible folga is in the last week of the month and the only eligible Phase 3 destination is a hidden Sunday in the following month
- **THEN** Analysis and pre-analysis SHALL count the visible folga once as a movement candidate

#### Scenario: Only a hidden weekday is available
- **WHEN** a target-month visible folga has no visible destination, hidden Sunday, or supported hidden holiday in its week
- **THEN** it SHALL NOT be counted as a movement candidate solely because another weekday is absent from the sheet