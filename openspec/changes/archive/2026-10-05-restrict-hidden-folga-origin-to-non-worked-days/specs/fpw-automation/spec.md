# Spec Delta

## ADDED Requirements

### Requirement: Hidden folga origins are limited to non-worked days
When the adjustment planner uses a day that is absent from the sheet in the last week of the month as the origin of a hidden-folga adjustment, it SHALL consider only hidden Sundays and hidden supported holidays. A hidden day that is neither a Sunday nor a supported holiday SHALL NOT be used as the origin of an adjustment, because its absence from the sheet does not show that it is a folga. Visible folgas SHALL keep priority over hidden candidates.

#### Scenario: Last week has only a hidden weekday
- **WHEN** the last week has an absence in the target month and no visible folga
- **AND** the only day absent from the sheet is a weekday that is not a supported holiday
- **THEN** the planner SHALL NOT propose an adjustment using that day as the origin
- **AND** the adjustment workflow SHALL NOT open the adjustment popup for it

#### Scenario: A hidden Sunday is available
- **WHEN** the last week has an absence in the target month, no visible folga, and a hidden Sunday
- **THEN** the planner SHALL propose an adjustment with the hidden Sunday as the origin

#### Scenario: A hidden supported holiday is available
- **WHEN** the last week has an absence in the target month, no visible folga, and a hidden supported holiday
- **THEN** the planner SHALL propose an adjustment with the hidden holiday as the origin

#### Scenario: Hidden days include both eligible and ineligible dates
- **WHEN** the last week has several days absent from the sheet, some of them hidden weekdays and one a hidden Sunday or holiday
- **THEN** the planner SHALL ignore the hidden weekdays and select only from the eligible hidden dates
- **AND** it SHALL still skip dates already used or already attempted

#### Scenario: A visible folga exists
- **WHEN** the last week has an unused visible folga
- **THEN** the planner SHALL select the visible folga before any hidden candidate
