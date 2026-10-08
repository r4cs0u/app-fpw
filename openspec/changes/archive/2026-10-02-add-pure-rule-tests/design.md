# Design

## Context

The userscript is built from browser-oriented IIFEs that attach functions to the global `window.AutomacaoFolha` namespace. There is no package manifest or test framework. Date helpers in `10-utils.js` and planning functions in `40-fases.js` can be loaded without a real page when the test provides a minimal namespace stub; DOM-reading and write workflows cannot.

See [proposal.md](proposal.md) for motivation and scope.

## Goals / Non-Goals

**Goals:**

- Exercise the existing browser-oriented source functions directly rather than maintaining duplicate implementations in tests.
- Keep the test environment isolated from the browser, WebPonto, real employee data, and write-capable workflows.
- Make the test command available with Node.js already used for local development.

**Non-Goals:**

- Refactor modules, change userscript behavior, or split business logic from the DOM.
- Test popup execution, DOM mapping, employee navigation, saving, approval, or live session behavior.
- Define new semantics for impossible calendar dates as part of a test-infrastructure change.

## Decisions

### Use Node.js built-in test runner and VM contexts

Load `10-utils.js` and `40-fases.js` in isolated `node:vm` contexts with a minimal `window.AutomacaoFolha` object. This exercises the actual source while avoiding browser APIs for the selected functions. Use Node's built-in `node:test` and assertions, invoked with `node --test`; do not add a dependency or package manifest solely for the test runner.

**Alternative considered:** introduce a third-party test framework. This adds dependency and configuration overhead without providing a needed capability for this small, synchronous rule suite.

### Limit coverage to deterministic pure rules

Cover date parsing/formatting, Monday-based week boundaries and IDs, month matching, and RJ holiday dates. Cover the pure planning functions for phases 1, 2, and 3 using synthetic maps and records, including selection order, duplicate/used-date handling, and no-candidate outcomes. Do not load or invoke functions that access documents, popups, or save controls.

**Alternative considered:** test complete phase processing flows. Those flows interact with live page state and popups; they would require broader browser mocking and would not be the isolated rules this change intends to establish.

### Preserve current runtime semantics

Tests should lock down valid date handling and explicitly defined outcomes such as malformed-format input returning `null`, but should not enshrine rollover behavior for impossible calendar dates. If invalid calendar dates need to be rejected, handle that as a separate behavior change with its own acceptance criteria.

**Alternative considered:** change date validation while introducing tests. This would combine test infrastructure with externally observable behavior and make regressions harder to isolate.

## Risks / Trade-offs

- [VM stubs may hide browser integration problems] -> Keep this suite scoped to pure rules and treat it as one layer, not a replacement for controlled page validation.
- [Synthetic cases may miss business edge cases] -> Use explicit boundary and selection-order examples, and expand cases when rules are clarified; never use real employee data.
- [Tests could accidentally load write-capable paths] -> Load only the utility and phase modules in a stub context and call only named planning/helper functions.

## Migration Plan

No runtime migration is required. Add the tests and README command, run `node --test`, and leave userscript modules and installed behavior unchanged. Roll back by removing the test files and README test instructions.
