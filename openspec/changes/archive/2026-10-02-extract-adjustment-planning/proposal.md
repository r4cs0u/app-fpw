# Proposal

## Why

The phase 1–3 planning functions already consume structured maps and return decisions, but currently live beside DOM, popup, and write-capable workflow code in `40-fases.js`. Giving these deterministic rules their own module makes the boundary explicit and allows the existing synthetic tests to exercise them without loading page-interaction code.

## What Changes

- Move the pure phase 1–3 planning functions and their shared absence-selection helper into a dedicated module loaded before `40-fases.js`.
- Update the phase executors to call the planning module while preserving current input/output shapes and decision order.
- Run the existing synthetic planning tests against the extracted module and add regression coverage for the module-loading/delegation boundary.
- Update the SSD module map to describe the new responsibility split.
- Leave DOM mapping, phase 4 field changes, popup execution, saving, and approval behavior unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is an internal, behavior-preserving module extraction with no change to user-visible requirements; `skip_specs: true` is set in `.openspec.yaml`.

## Impact

- Adds `35-planejamento.js` for pure phase 1–3 planning decisions.
- Updates `99-main.user.js` module loading and `40-fases.js` delegation.
- Moves the planning test harness to load the new module and retains its synthetic cases.
- Updates `SSD.md`; no new runtime dependencies or package manifest.
