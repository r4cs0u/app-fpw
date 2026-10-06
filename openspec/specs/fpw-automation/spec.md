# fpw-automation Specification

## Purpose

This capability establishes a controlled experimental automation line for the FPW workflow and keeps its operational knowledge distinct from page-structure documentation.

## Requirements

### Requirement: Controlled experimental FPW automation line
The system shall support a dedicated experimental automation line that allows the team to test remodularization and product-brand changes without disrupting the stable production userscript.

#### Scenario: project separation for safe experimentation
- **WHEN** the team starts a new experimental iteration of the FPW automation
- **THEN** the project shall keep the current production setup isolated as the stable baseline
- **AND** the experimental line shall be versioned and documented as a separate test environment

#### Scenario: test branch identity
- **WHEN** the experimental line is versioned in the test branch
- **THEN** the userscript metadata and documentation shall clearly mark it as a test build
- **AND** the stable project shall remain identifiable as the original production reference line without redefining its official name

### Requirement: Structured knowledge for automation
The system shall maintain dedicated documentation that distinguishes the structure of the target page from the operational rules for automation and agent behavior.

#### Scenario: page structure is documented independently
- **WHEN** the project needs to understand the WebPonto DOM and workflow
- **THEN** the page structure documentation shall describe the available frames, selectors, and interaction constraints
- **AND** it shall not mix operational behavior rules with technical page mapping

#### Scenario: automation guardrails are documented independently
- **WHEN** an automated agent or userscript needs to act on the page
- **THEN** the agent guide shall define safe operating limits, stop conditions, and supervision expectations
- **AND** the guide shall remain distinct from the page structure contract

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

### Requirement: Adjustment waits terminate with explicit outcomes
The experimental adjustment workflow SHALL bound its waits for popup readiness, popup completion, body reload after a save, and employee-page readiness. It SHALL distinguish observed completion, timeout, user cancellation, and inspection failure. A timeout, an unexpected popup closure before save submission, or an inspection failure SHALL stop the current batch with the failed stage and reason visible, SHALL NOT be reported or counted as a successful action, and SHALL NOT cause automatic progression to another employee or automatic resubmission of an uncertain save.

The workflow SHALL determine completion from supported UI evidence under variable system response times, not from an assumed fixed response duration. It SHALL distinguish compatibility stabilization delays and polling cadence from maximum safety deadlines, and SHALL initially preserve existing compatibility delays pending focused evidence for any timing change. It SHALL observe body reload before save submission and retain post-submission reload evidence independently of popup closure. Missing a transient loading state SHALL NOT by itself cause failure when a new supported loaded document or recorded load generation establishes completion; elapsed time or the same old ready document alone SHALL NOT establish completion.

#### Scenario: Main page reloads before popup closure
- **WHEN** a submitted popup save produces a supported body reload before the popup finishes closing, including when loading completes between polling ticks
- **THEN** the workflow SHALL retain post-submission reload evidence while awaiting popup completion
- **AND** after closure without a supported rejection and any required stabilization delay, it SHALL recognize UI completion without requiring another reload

#### Scenario: System response time varies
- **WHEN** supported completion evidence arrives at different durations within the stage's safety deadline
- **THEN** the workflow SHALL recognize completion from that evidence, subject to any required compatibility stabilization delay, without assuming a fixed system response time
- **AND** expiration of a delay without completion evidence SHALL NOT by itself be reported as success

#### Scenario: Previously ready page remains unchanged
- **WHEN** a save has been submitted and a compatibility delay expires but only the same pre-submission ready body document is observable, with no recorded post-submission load evidence
- **THEN** the workflow SHALL continue awaiting completion within its safety deadline
- **AND** if the deadline expires without evidence it SHALL report an unconfirmed outcome, not infer completion from elapsed time

#### Scenario: Popup does not become ready
- **WHEN** an adjustment popup is unavailable, closes before save submission, or fails to reach its supported ready structure within the configured deadline
- **THEN** the workflow SHALL stop with the popup-readiness stage and reason visible
- **AND** it SHALL NOT continue editing, save, or advance to another employee

#### Scenario: Save completion is not observed
- **WHEN** a popup or footer save has been submitted but the required UI completion and supported body reload are not observed before the configured deadline, or inspection fails
- **THEN** the workflow SHALL report the outcome as unconfirmed and stop the batch
- **AND** it SHALL NOT count or report the action as successful, resubmit it automatically, or continue to another employee

#### Scenario: Employee page does not become ready
- **WHEN** an adjustment changes the selected employee but the expected loaded body structure is not observed within the configured deadline, or inspection fails
- **THEN** the workflow SHALL stop with an employee-page-readiness diagnostic before processing that page

#### Scenario: Adjustment starts with no employee selected
- **WHEN** the header selector is on its empty placeholder and the complete `mainFrame` is the documented blank page, with no checked row-selection controls
- **THEN** the workflow SHALL validate the supported shell, header, and footer, arm body-transition observation, and select the first non-empty employee through the existing header behavior without assuming static header-form action or target values
- **AND** it SHALL require the post-selection supported body structure before processing the first sheet
- **AND** any other invalid body structure or selected-row flag SHALL stop the workflow before processing or saving

#### Scenario: Employee options differ between users
- **WHEN** the current user's employee selector contains a different set, count, or ordering of options than another user's selector
- **THEN** the workflow SHALL use the non-empty options from the current session's selector
- **AND** it SHALL NOT rely on a fixed employee name, ID, list size, or another user's option list

#### Scenario: Adjustment popup is still redirecting
- **WHEN** the popup opened by the supported `Ajuste Jornada Plan` link is blank or on the observed `/RedirecionamentoAspx.asp` redirect route
- **THEN** the workflow SHALL continue waiting within the popup-readiness deadline rather than treating the transient route as a final path
- **AND** it SHALL require the final supported popup path and complete form/date-selector/save-control structure before editing
- **AND** it SHALL stop with the actual path in the diagnostic if a completed non-transient route is unsupported

#### Scenario: Supported completion is observed
- **WHEN** the popup reaches its supported ready structure, a save submission is followed by the expected popup completion and supported body reload, or a footer save is followed by the supported body reload
- **THEN** the workflow SHALL retain the existing planning, candidate ordering, and save behavior for the completed action
- **AND** it SHALL NOT describe the observed UI completion as proof of server-side persistence or trigger final approval

#### Scenario: Supported candidate rejection is observed
- **WHEN** a candidate produces the existing supported rejection message in the expected popup context
- **THEN** the workflow SHALL retain its existing candidate fallback order and no-change outcome if candidates are exhausted
- **AND** it SHALL NOT treat timeout or inspection failure as candidate rejection

#### Scenario: Equal selected hours are rejected even if the popup closes
- **WHEN** the popup reports `Dias selecionados possuem horários iguais!` and the user acknowledges the message
- **THEN** the workflow SHALL classify the attempt as rejected with no change
- **AND** it SHALL NOT count popup closure or a main-frame reload as success

#### Scenario: Popup confirms a schedule change
- **WHEN** the popup reports `Alteração realizada com sucesso!`, is acknowledged, and the supported body transition is observed
- **THEN** the workflow SHALL classify the attempt as UI-confirmed completion
- **AND** it SHALL NOT claim that this UI evidence proves server-side persistence

#### Scenario: Popup closes before its result can be read
- **WHEN** the popup closes before a recognized result message is captured
- **THEN** the workflow SHALL report the result as unconfirmed
- **AND** it SHALL NOT infer success only from popup closure and body reload

### Requirement: Stopped adjustments cannot issue delayed actions
After an adjustment is stopped by the user or a fatal failure, the workflow SHALL terminate its pending waits and prevent remaining delayed work from editing, saving, or advancing employees. Starting a new adjustment SHALL NOT re-enable delayed work belonging to the stopped run. Cleanup SHALL restore the non-running controls, preserve the stop reason, and retain any already-confirmed partial results without claiming rollback.

#### Scenario: User stops during a pending save delay
- **WHEN** the user stops an adjustment after a popup edit but before a delayed save callback executes
- **THEN** the callback SHALL NOT submit the save and the pending adjustment waits SHALL terminate

#### Scenario: Old callback executes after a new adjustment starts
- **WHEN** an old run has stopped and a pending callback from that run executes after a new adjustment begins
- **THEN** that callback SHALL NOT edit, save, or advance employees

#### Scenario: Batch cleanup follows a failure
- **WHEN** an adjustment wait fails or the user cancels the run
- **THEN** the workflow SHALL clean up run-owned polling and pending actions and restore non-running controls
- **AND** generating a partial report SHALL NOT replace the failure reason with a success indication

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

### Requirement: Folga classification uses the associated date heading
The system SHALL classify a mapped schedule entry as a folga only from the day heading associated with that entry's own date. Text from another row or an enclosing table section SHALL NOT classify the entry as a folga.

#### Scenario: A grouped table contains unrelated folga text
- **WHEN** the page groups a non-folga heading for 03/10/2026 and a separate row containing the word “Folga” in the same table section
- **THEN** the entry mapped to 03/10/2026 SHALL NOT be classified as a folga based on that separate row

#### Scenario: A folga heading remains detectable in the same weekly group
- **WHEN** the heading associated with 04/10/2026 identifies that date as a folga
- **THEN** the entry mapped to 04/10/2026 SHALL be classified as a folga independently of text associated with 03/10/2026

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
