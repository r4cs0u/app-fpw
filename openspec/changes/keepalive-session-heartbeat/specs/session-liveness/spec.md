# Spec Delta

## Purpose

This capability keeps the experimental FPW session available during inactivity without disrupting the active page or changing employee data, and makes heartbeat outcomes diagnosable.

## ADDED Requirements

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