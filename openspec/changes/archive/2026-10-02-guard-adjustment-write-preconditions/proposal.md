# Proposal

## Why

The adjustment workflow can interact with schedule popups and change time-entry fields before saving, but its structural assumptions are not checked consistently at the start of a run or immediately before write actions. A stale, incomplete, or unexpected MyWay page should stop the adjustment with a clear diagnostic instead of continuing against an uncertain context.

## What Changes

- Define structural preconditions for starting and continuing an adjustment, based on the documented Justificativas page, frames, forms, and required controls.
- Stop the current adjustment before further mutation or save when a precondition fails, and report which technical condition was not met.
- Preserve current behavior in the supported page context; do not change planning rules, add per-sheet confirmations, or automate approval.
- Add isolated tests for the precondition decisions and their fail-closed behavior, using synthetic structures only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `fpw-automation`: require adjustment flows to verify the expected page structure before starting and before write-sensitive actions, and to stop visibly when that structure is unavailable or inconsistent.

## Impact

- Likely runtime touchpoints: `00-core.js`, `40-fases.js`, `30-popup.js`, and the adjustment entrypoint in `80-painel.js`.
- Update the existing `fpw-automation` capability delta and the relevant operational/page-structure documentation if the accepted preconditions clarify current contracts.
- Add Node tests using synthetic page descriptors; no live employee or time-sheet data, new dependencies, or changes to the stable `main` line.
