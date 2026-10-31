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