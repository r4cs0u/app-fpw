# Spec Delta

## ADDED Requirements

### Requirement: Adjustment actions fail closed outside the supported page context
The experimental adjustment workflow SHALL verify the expected Justificativas page structure before beginning adjustment actions and again before each write-sensitive interaction. If the current page, required frame, form, or action control is missing or inconsistent with the documented page contract, the workflow SHALL stop the current adjustment before performing that interaction, report the failed technical precondition, and SHALL NOT continue to another employee automatically.

#### Scenario: Adjustment starts on an unexpected or incomplete page
- **WHEN** the user starts an adjustment and the Justificativas page or any required frame or form is unavailable or inconsistent with the documented contract
- **THEN** the workflow SHALL report the unmet precondition and stop before interacting with adjustment controls

#### Scenario: Page context changes before a write-sensitive interaction
- **WHEN** an adjustment is in progress and the current page or required controls no longer satisfy the documented contract before a popup edit, field change, or save action
- **THEN** the workflow SHALL report the unmet precondition and stop before performing that interaction
- **AND** it SHALL NOT continue the adjustment for the next employee automatically

#### Scenario: Expected page structure remains valid
- **WHEN** the expected page, frames, forms, and controls are present at the adjustment start and at each write-sensitive boundary
- **THEN** the adjustment workflow SHALL retain its existing planning, interaction, and save behavior
- **AND** it SHALL NOT trigger final approval
