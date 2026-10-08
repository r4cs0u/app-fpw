# Spec Delta

## ADDED Requirements

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
