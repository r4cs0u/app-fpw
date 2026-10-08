# session-liveness Specification

## Purpose

This capability keeps the experimental FPW session available during inactivity without disrupting the active page or changing employee data, and makes heartbeat outcomes diagnosable.

## Requirements

### Requirement: Non-disruptive authenticated heartbeat
The test userscript SHALL periodically send a same-origin authenticated GET request to the current MyWay page while the automation is idle, without navigating or reloading any page or frame.

#### Scenario: Heartbeat succeeds without reloading the page
- **WHEN** the test userscript starts or its heartbeat interval elapses while no automation is running
- **THEN** it SHALL issue a GET request using the current browser session
- **AND** it SHALL leave the current URL and frame documents unchanged
- **AND** it SHALL not submit forms or modify employee, justification, or time-entry data

#### Scenario: Heartbeat is paused during automation
- **WHEN** a data-processing automation is running at a scheduled heartbeat
- **THEN** the heartbeat SHALL be skipped for that interval
- **AND** it SHALL not interfere with the automation's page interactions

### Requirement: Observable heartbeat result
The test userscript SHALL retain the timestamp and outcome of its latest heartbeat attempt, including HTTP status when available, and SHALL treat a redirect as an unsuccessful heartbeat.

#### Scenario: Request failure is distinguishable from success
- **WHEN** the heartbeat request fails, returns a non-success status, or redirects away from the current MyWay page
- **THEN** the latest result SHALL indicate failure and retain available diagnostic details
- **AND** the request outcome SHALL not be represented as proof that the server session remains valid

#### Scenario: Server-side session preservation is verified
- **WHEN** the test runs unattended for longer than the observed inactivity timeout
- **THEN** the MyWay session SHALL remain on the authenticated FPW workflow without redirecting to an expiry screen
- **AND** the observation period and result SHALL be recorded before the capability is considered proven

### Requirement: Oracle companion session status
The test userscript SHALL track whether the Oracle companion session that the MyWay session depends on (pages under `https://elny.fa.la1.oraclecloud.com/`) is active, inactive or unknown, and SHALL show that state in the panel. The state SHALL be `unknown` until the userscript has evidence either way, `active` while there is recent evidence that an Oracle page is open and alive, and `inactive` when a previously active session shows no evidence of liveness within a defined window or an expiry is observed.

#### Scenario: No Oracle evidence yet
- **WHEN** the panel starts and no evidence about the Oracle session has been observed
- **THEN** the panel SHALL show the Oracle session as unknown

#### Scenario: Oracle page open and alive
- **WHEN** an Oracle page is open and reports liveness
- **THEN** the panel SHALL show the Oracle session as active

#### Scenario: Oracle page closed
- **WHEN** a previously active Oracle page is closed or stops reporting liveness beyond the defined window
- **THEN** the panel SHALL show the Oracle session as inactive

### Requirement: Warning when the Oracle session is lost
When the Oracle session changes from active to inactive, the test userscript SHALL show a visible warning in the panel and SHALL record an event in the activity log, once per loss. The warning SHALL NOT submit forms, navigate, reload or change employee, justification or time-entry data, and SHALL NOT by itself stop an automation that is running.

#### Scenario: Loss while idle
- **WHEN** the Oracle session becomes inactive while no automation is running
- **THEN** the panel SHALL show a warning and the log SHALL record one event for the loss

#### Scenario: Loss during automation
- **WHEN** the Oracle session becomes inactive while an Analysis or Adjustment is running
- **THEN** the warning and the log event SHALL still appear
- **AND** the running automation SHALL NOT be stopped or altered by the warning

#### Scenario: Recovery
- **WHEN** the Oracle session becomes active again after a loss
- **THEN** the panel SHALL clear the warning and show the session as active

### Requirement: Non-destructive Oracle session keepalive
While an Oracle page is open, the test userscript SHALL keep the Oracle session active using only means that do not navigate or reload the Oracle page, do not submit forms and do not change data. Any script running on the Oracle origin SHALL be limited to reporting liveness and keeping the session active, and SHALL NOT read or write employee, justification or time-entry data, and SHALL NOT run the FPW automation.

#### Scenario: Keepalive does not disturb the Oracle page
- **WHEN** the Oracle keepalive acts while the user has an Oracle page open
- **THEN** the Oracle page URL and content SHALL remain unchanged
- **AND** no form SHALL be submitted

#### Scenario: No automation on the Oracle origin
- **WHEN** the userscript loads on the Oracle origin
- **THEN** it SHALL NOT load the Analysis, Adjustment or report modules and SHALL NOT inject the FPW panel

### Requirement: Observable Oracle session result
The test userscript SHALL retain the timestamp and outcome of the latest Oracle liveness evidence and of the latest state change, so that a failure to keep the Oracle session alive is distinguishable from success and can be diagnosed. The outcome SHALL NOT be presented as proof that the server-side session remains valid.

#### Scenario: Latest evidence is inspectable
- **WHEN** the user or a maintainer inspects the session diagnostics
- **THEN** the latest Oracle liveness timestamp, the current state and the time of the last state change SHALL be available

#### Scenario: Server-side validity verified over time
- **WHEN** the test runs unattended for longer than the observed inactivity timeout with the Oracle page open
- **THEN** the MyWay session SHALL remain on the authenticated FPW workflow
- **AND** the observation period and result SHALL be recorded before the capability is considered proven

### Requirement: Oracle inactivity diagnostics
The test userscript SHALL, on the Oracle origin and without reading or writing business data, record passive diagnostic events about the Oracle session lifetime: when the page was opened, the time since the last observed activity, any on-page expiry warning, and the moment the session is observed as expired. The diagnostics SHALL be inspectable by the user or a maintainer and SHALL NOT include credentials, tokens, cookie values or full URLs with parameters.

#### Scenario: Diagnostics available after an expiry
- **WHEN** the Oracle session expires while the Oracle page is open
- **THEN** the diagnostics SHALL contain the time since page open and since last observed activity at the moment of expiry

#### Scenario: Diagnostics contain no secrets
- **WHEN** the diagnostics are inspected
- **THEN** they SHALL NOT contain credentials, tokens, cookie values or URLs with query parameters

### Requirement: Expired Oracle session state
The test userscript SHALL distinguish an expired Oracle session from a closed Oracle page. When the Oracle page shows an expiry indication (redirect to a sign-in page or an on-page session-expired notice), the userscript SHALL report the state as `expired` to the MyWay tab, and the panel SHALL show a warning, once per expiry, and the log SHALL record one event.

#### Scenario: Expiry while the page stays open
- **WHEN** the Oracle page remains open but the session expires
- **THEN** the panel SHALL show the Oracle session as expired with a visible warning
- **AND** the log SHALL record one event

#### Scenario: Closed page is not reported as expired
- **WHEN** the Oracle page is closed
- **THEN** the panel SHALL show the session as inactive and SHALL NOT show it as expired

### Requirement: Active Oracle session keepalive
While an Oracle page is open with the active keepalive enabled, the Oracle-side script SHALL periodically perform a keepalive action chosen from the measured inactivity behavior, at an interval safely below the measured inactivity timeout. The action SHALL NOT navigate or reload the page, SHALL NOT submit forms, SHALL NOT change data and SHALL NOT read employee, justification or time-entry data.

#### Scenario: Pulse at a safe interval
- **WHEN** the active keepalive is enabled and an Oracle page is open
- **THEN** a keepalive action SHALL occur repeatedly at an interval shorter than the measured inactivity timeout

#### Scenario: Page unchanged by the keepalive
- **WHEN** a keepalive action occurs
- **THEN** the Oracle page URL and content SHALL remain unchanged and no form SHALL be submitted

### Requirement: User-controlled and bounded keepalive
The active keepalive SHALL be controlled by an on/off option in the panel whose choice is persisted, SHALL stop acting as soon as the session is observed as expired, and SHALL NOT attempt to sign in again, fill credentials or reload the page to recover a session.

#### Scenario: Keepalive turned off
- **WHEN** the user turns the active keepalive off
- **THEN** no keepalive action SHALL occur on the Oracle page and the passive monitor SHALL keep working

#### Scenario: Stops on expiry
- **WHEN** the session is observed as expired while the keepalive is enabled
- **THEN** the keepalive SHALL stop acting
- **AND** it SHALL NOT attempt to authenticate or reload

### Requirement: Observable active keepalive result
The test userscript SHALL retain the timestamp and outcome (success, failure and available status) of the latest active keepalive action and SHALL show it in the panel. A failed action SHALL be logged. A successful action SHALL NOT be presented as proof that the server session remains valid.

#### Scenario: Failure is visible
- **WHEN** a keepalive action fails
- **THEN** the panel SHALL show the failure with its time and the log SHALL record it

#### Scenario: Success is not proof
- **WHEN** the latest keepalive action succeeded
- **THEN** the panel SHALL show it as the latest action result without claiming a valid server session

### Requirement: Keepalive effectiveness verified over time
The active keepalive SHALL NOT be considered proven until a run longer than the measured inactivity timeout, with the Oracle page open and the MyWay page idle, ends without session loss, and the observation period and outcome are recorded.

#### Scenario: Recorded unattended run
- **WHEN** the unattended validation run exceeds the measured inactivity timeout
- **THEN** the period and the result (session kept or lost) SHALL be recorded in the project roadmap before the capability is considered proven
