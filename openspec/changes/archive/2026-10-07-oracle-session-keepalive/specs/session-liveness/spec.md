# Spec Delta

## ADDED Requirements

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
