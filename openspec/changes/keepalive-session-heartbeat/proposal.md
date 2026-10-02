# Proposal

## Why

The FPW/MyWay session expires during periods without direct interaction, interrupting the workflow. The existing keepalive reloads a frame and is disruptive, while a successful request alone does not prove that the server session remains active.

## What Changes

- Replace frame reloads with a periodic same-origin authenticated GET from the test userscript.
- Skip heartbeats while an automation is running and expose the latest attempt/result for diagnosis.
- Validate session preservation across the observed inactivity timeout before treating the behavior as proven.
- Keep the change isolated to branch `test` and record implementation and validation evidence in the system design notes.

## Capabilities

### New Capabilities

- `session-liveness`: Controlled, observable heartbeat behavior for the experimental FPW userscript.

### Modified Capabilities

None.

## Impact

The change affects `00-core.js`, `99-main.user.js`, and test environment metadata in `85-ambiente.js`. It sends same-origin GET requests to the current MyWay page using the existing authenticated browser context. It does not change the stable `main` branch or perform employee/justification updates.