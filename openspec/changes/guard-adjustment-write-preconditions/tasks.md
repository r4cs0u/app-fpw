# Tasks

## 1. Define and test structural preconditions

- [x] 1.1 Add a structural descriptor and fail-closed validator for the documented Justificativas page, required frames, forms, and controls; add synthetic tests for valid, missing, and mismatched structure, and verify the focused tests pass without loading employee or sheet data.
- [x] 1.2 Gate adjustment startup and employee-to-employee continuation on the validator; add regression coverage that an invalid context reports the failure and stops the batch instead of advancing, and update `PAGE_STRUCTURE.md` with the verified required/optional structure and stop behavior.

## 2. Guard write-sensitive interactions

- [x] 2.1 Re-resolve and validate the current page and popup structure immediately before popup edits and popup save submission; add tests proving a failed check prevents those interactions and verify the focused test suite passes.
- [x] 2.2 Validate the current body/footer structure immediately before phase 4 field changes and footer save; propagate a failure as a fatal stop so no later employee is processed, and add regression coverage for the stop and no-save outcomes.

## 3. Validate the experimental runtime

- [x] 3.1 Run syntax checks for every changed JavaScript module and the complete `node --test` suite; verify valid-context behavior remains covered and invalid-context tests are synthetic, then review `git diff --check`.
- [ ] 3.2 Publish the completed change to `test`, follow the Tampermonkey confirmation protocol in `AGENT.md`, and after the user's “ok” verify only that the test runtime initializes on the supported Justificativas page; do not invoke **Ajustar**, save, or approval during the smoke test.
