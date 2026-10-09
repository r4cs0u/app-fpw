# Spec Delta

## MODIFIED Requirements

### Requirement: Oracle companion session status
The test userscript SHALL track whether the Oracle companion session that the MyWay session depends on (pages under `https://elny.fa.la1.oraclecloud.com/`) is active, inactive, expired, or unknown, and SHALL show that state in the panel. The state SHALL be `unknown` until the userscript has evidence either way, `active` while there is recent evidence that an authenticated Oracle page is open and alive, and `inactive` when a previously active session shows no evidence of liveness within a defined window. When an authenticated Oracle page is loaded or restored, any previous `expired` state SHALL be cleared and the state SHALL recover to `active`.

#### Scenario: No Oracle evidence yet
- **WHEN** the panel starts and no evidence about the Oracle session has been observed
- **THEN** the panel SHALL show the Oracle session as unknown

#### Scenario: Oracle page open and alive
- **WHEN** an authenticated Oracle page is open and reports liveness
- **THEN** the panel SHALL show the Oracle session as active

#### Scenario: Oracle page closed
- **WHEN** a previously active Oracle page is closed or stops reporting liveness beyond the defined window
- **THEN** the panel SHALL show the Oracle session as inactive

#### Scenario: Automatic recovery from expired to active
- **WHEN** a user logs in again or navigates to an authenticated Oracle welcome page while the state was previously expired
- **THEN** the userscript SHALL clear the explicit expired status
- **AND** the panel SHALL recover the Oracle session to active

### Requirement: Expired Oracle session state
The test userscript SHALL distinguish an expired Oracle session from a closed Oracle page. The userscript SHALL report the state as `expired` only upon strict confirmation of an unauthenticated state (such as top-level URL redirect to sign-in or HTTP auth redirection during keepalive pulse) and SHALL NOT classify pages as expired based solely on substring matches in body text. When confirmed expired, the panel SHALL show a warning and the log SHALL record one event.

#### Scenario: Expiry while the page stays open
- **WHEN** the Oracle top-level window redirects to an authentication or login endpoint
- **THEN** the panel SHALL show the Oracle session as expired with a visible warning
- **AND** the log SHALL record one event

#### Scenario: Closed page is not reported as expired
- **WHEN** the Oracle page is closed without a confirmed expiry redirect
- **THEN** the panel SHALL show the session as inactive and SHALL NOT show it as expired

#### Scenario: Transient or hidden text does not trigger expiry
- **WHEN** an authenticated Oracle application page contains secondary or hidden labels matching session terms while remaining on an authenticated path
- **THEN** the userscript SHALL NOT transition the session state to expired

### Requirement: User-controlled and bounded keepalive
The active keepalive SHALL be controlled by an on/off option in the panel whose choice is persisted, SHALL pause keepalive pulses while the session is confirmed expired, and SHALL automatically resume pulse activity once the Oracle session recovers to active. It SHALL NOT attempt to sign in again, fill credentials, or reload the page to recover a session.

#### Scenario: Keepalive turned off
- **WHEN** the user turns the active keepalive off
- **THEN** no keepalive action SHALL occur on the Oracle page and the passive monitor SHALL keep working

#### Scenario: Stops on expiry
- **WHEN** the session is observed as expired while the keepalive is enabled
- **THEN** the keepalive SHALL stop acting
- **AND** it SHALL NOT attempt to authenticate or reload

#### Scenario: Resumes on recovery
- **WHEN** the session recovers from expired to active after user authentication
- **THEN** the active keepalive SHALL resume sending safe pulse requests at the designated interval
