# Proposal

## Why

The project has no automated test suite, so changes to date calculations, holiday handling, and adjustment planning can regress without detection. Adding focused tests for rules that do not require the WebPonto page will provide a repeatable safety check before broader separation of business rules from the DOM.

## What Changes

- Add dependency-free automated tests using Node.js's built-in test runner for date/week/holiday helpers and pure adjustment-planning functions.
- Document the command to run these tests and the boundary that tests must use synthetic data and must not perform page interactions or writes.
- Preserve current userscript behavior; any behavioral corrections discovered while testing are outside this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change adds development test tooling and does not change runtime behavior; `skip_specs: true` is set in `.openspec.yaml`.

## Impact

- Adds test files for selected rules in `10-utils.js` and the planning functions in `40-fases.js`.
- Documents the test command in the project README.
- Uses the Node.js built-in test runner; no runtime or development dependency is added.
