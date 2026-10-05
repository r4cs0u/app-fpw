# Spec Delta

## ADDED Requirements

### Requirement: Consider all eligible non-worked destinations before classifying a folga as trapped
The adjustment planner SHALL treat an absence-of-marking entry, a visible or hidden holiday, and a hidden Sunday as eligible non-worked destinations for a folga. It SHALL classify a folga as trapped only when its week has no eligible alternative non-worked destination.

#### Scenario: Week has no absence marker but has a holiday or hidden Sunday destination
- **WHEN** a folga has no absence-of-marking destination in its week
- **AND** the week contains a visible holiday, hidden holiday, or hidden Sunday that can receive the folga
- **THEN** the planner SHALL preserve an adjustment action for that destination
- **AND** SHALL NOT classify the folga as trapped solely because the week has no absence-of-marking entry
- **AND** any selected destination SHALL differ from the folga's current date

#### Scenario: Every alternative day in the week is worked
- **WHEN** a folga's week has no absence-of-marking entry, visible or hidden holiday, or hidden Sunday destination
- **THEN** the planner SHALL emit no phase 3 adjustment action for that folga
- **AND** SHALL retain it in the trapped/no-change results

#### Scenario: Existing absence and holiday planning remains available
- **WHEN** a folga's week contains an absence-of-marking entry or a supported holiday destination
- **THEN** the existing phase 1 through phase 3 candidate order and popup rejection behavior SHALL remain unchanged, except that a hidden Sunday is added as a phase 3 destination when no existing higher-priority destination is selected
