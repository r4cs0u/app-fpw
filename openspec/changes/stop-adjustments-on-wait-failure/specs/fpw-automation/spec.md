# Spec Delta

## ADDED Requirements

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
