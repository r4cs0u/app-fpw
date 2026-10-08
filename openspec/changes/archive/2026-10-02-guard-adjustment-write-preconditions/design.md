# Design

## Context

See [proposal.md](proposal.md) for motivation and scope. `PAGE_STRUCTURE.md` documents the Justificativas entry page, its header/body/footer frames, forms, readiness conditions, and write-sensitive controls. `40-fases.js` orchestrates the batch and changes applicable fields; `30-popup.js` interacts with a schedule popup and can submit its save control; `00-core.js` resolves the current frames. Existing automated tests load pure rules with Node and synthetic inputs rather than a live page.

## Goals / Non-Goals

**Goals:**

- Make structural preconditions explicit and reusable at the adjustment start and immediately before each write-sensitive interaction.
- Fail closed with an actionable technical diagnostic when the page context is not supported.
- Keep the validation logic testable without employee, sheet, DOM, or browser data.

**Non-Goals:**

- Change adjustment planning rules, target records, or normal outcomes on a valid page.
- Add a confirmation prompt for each employee, change the existing save policy, or automate approval.
- Attempt to repair or navigate an unexpected page automatically.

## Decisions

### Validate live frame context at the action boundary

Resolve frames from the current `window.top` whenever checking context; do not keep `Document` references across frame navigation. Check only structural facts documented by the page contract: expected entry/frame paths, loaded documents, required forms and selectors, and the relevant action control. Run a start check before the batch begins, then recheck immediately before popup edits/submission, phase 4 field changes, and footer save.

**Alternative considered:** validate only once at startup. That does not cover frame reloads or page changes during a multi-employee run, the main reason for checking again at write boundaries.

### Separate structural data collection from the decision

Keep DOM/frame inspection at the browser boundary and express the pass/fail decision over a small structural descriptor. Unit tests can cover valid, missing, and mismatched structure using synthetic descriptors, without invoking page actions. Validation failures must be surfaced through the existing visible logging/status path; they must not be converted into success, an empty result, or an automatic retry.

**Alternative considered:** add browser mocks for the legacy frames and popups to unit tests. This would couple pure regression tests to substantial simulated DOM behavior without improving coverage of the structural decision itself.

### Stop the batch on an invalid context

Treat a failed precondition as a fatal stop for the current adjustment run, not as a skipped employee or failed planned move. Do not advance to another employee after the failure. Preserve the current user-visible automatic adjustment behavior when every check passes.

**Alternative considered:** skip the current employee and continue. A context mismatch may affect every following employee and makes a partially applied run difficult to interpret.

## Risks / Trade-offs

- [Legacy frame URLs or controls may vary legitimately] -> Base the accepted structure on `PAGE_STRUCTURE.md`, distinguish optional from required controls, and test representative supported variants before enabling the guard.
- [A context change can occur between a check and an interaction] -> Keep checks immediately adjacent to sensitive operations and re-resolve the target frame/document at each boundary; browser scripting cannot make the entire legacy interaction atomic.
- [Stopping after earlier actions may leave already-applied changes in place] -> Report the stop clearly, do not continue the batch, and do not claim rollback; retain the existing result/report path where possible.

## Migration Plan

Add the structural descriptor/check and call it at the specified boundaries, add synthetic unit tests for pass/fail cases, and update `PAGE_STRUCTURE.md` only where the confirmed preconditions require clarification. Validate syntax and the complete `node --test` suite. Publish to `test` and use the supervised Tampermonkey update and non-writing runtime smoke-test procedure in `AGENT.md`; do not promote to `main` as part of this change. Roll back by reverting the test-branch change if a supported page is incorrectly rejected.
