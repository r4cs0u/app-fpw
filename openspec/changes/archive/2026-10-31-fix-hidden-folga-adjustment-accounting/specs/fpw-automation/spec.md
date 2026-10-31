# Spec Delta

## ADDED Requirements

### Requirement: Phase 3 trapped status requires an available popup origin
The adjustment SHALL report a Phase 3 folga as trapped after no change only when at least one requested origin date is available in the popup selector. A missing candidate date SHALL NOT be reported as a trapped folga.

#### Scenario: Phase 3 origin is absent from the popup
- **WHEN** a Phase 3 hidden holiday or Sunday candidate is not present in the popup selector
- **THEN** the adjustment SHALL NOT add that folga to the trapped results

#### Scenario: Phase 3 origin is offered but produces no change
- **WHEN** at least one Phase 3 origin candidate is present in the popup selector but the attempt ends without a schedule change
- **THEN** the adjustment SHALL report the folga as trapped with its Phase 3 reason

## MODIFIED Requirements

### Requirement: Hidden folga origins are limited to non-worked days
In the last week of the month, the planner SHALL use hidden origins only for Sundays or supported holidays; a missing weekday alone SHALL NOT qualify. Unused visible folgas SHALL have priority. A hidden folga SHALL be reported as trapped after no change only if a candidate origin was available in the popup selector.

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

#### Scenario: No hidden origin is offered by the popup
- **WHEN** a hidden-origin attempt finds that none of its candidate dates is available in the popup selector
- **THEN** the adjustment SHALL NOT report the origin folga as trapped

#### Scenario: An available hidden origin produces no change
- **WHEN** at least one hidden-origin candidate is available in the popup selector but the attempt ends without a schedule change
- **THEN** the adjustment SHALL report that folga as trapped with its existing phase and reason