# Tasks

## 1. Hidden Folga Counting

- [x] 1.1 Normalize hidden-folga dates represented as strings or `dataStr` records; verify target-month dates are counted once and transition dates outside the month are excluded by the rules tests.
- [x] 1.2 Preserve Analysis and pre-analysis parity for the same sheet state; verify with the complete repository test suite.
- [x] 1.3 Count visible folgas whose week has a hidden Sunday or supported hidden holiday as Phase 3 candidates; add rules tests for hidden holiday, transition Sunday, and ineligible hidden weekday.

## 2. Popup Candidate Outcomes

- [x] 2.1 Track whether a requested hidden-origin date exists in the popup selector; verify candidate exhaustion is distinct from a rejection after an available candidate.
- [x] 2.2 Record phase-2 trapped folgas only after an available hidden candidate produces no change; verify unavailable candidates do not appear in the trapped results.
- [x] 2.3 Preserve compatibility with popup calls that omit the optional attempt object; verify popup structure tests still pass and invalid structure still prevents editing or saving.
- [x] 2.4 Apply popup candidate-availability evidence to Phase 3 trapped classification; test both unavailable hidden origins and rejected available origins.

## 3. Integration Verification

- [x] 3.1 Run `rtk node --test`; verify all 278 tests pass with zero failures.
- [ ] 3.2 If separately authorized, perform a read-only runtime check against the supported MyWay page; confirm script version and structure, and do not run Ajustar, save, approve, or modify any sheet.
- [x] 3.3 After implementing tasks 1.3 and 2.4, rerun focused rules/adjustment tests and the complete `rtk node --test` suite; 280 tests pass.

## Workflow follow-up

- Review this follow-up before archiving; the initial implementation baseline is published as commit `b0b4180`, while tasks 1.3 and 2.4 remain unimplemented.
- Keep any live MyWay check separate from this proposal and follow the project's read-only validation guardrails.