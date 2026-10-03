# Design

## Context

See [proposal.md](proposal.md) for motivation and [specs/fpw-automation/spec.md](specs/fpw-automation/spec.md) for the behavior contract. Existing structural validation checks the supported Justificativas frames and popup at selected action boundaries. It does not distinguish a completed wait from a timed-out one.

Observed implementation gaps:

- `aguardarPopupPronto` and `aguardarReloadPrincipal` in `30-popup.js` resolve without an outcome on timeout; the latter also resolves on some inspection exceptions.
- `executarAcaoFolga` can return `{ ok: true }` after its popup-close wait times out.
- `aguardarGravacao` in `40-fases.js` calculates a reload result but discards it, after which `gravar` logs "Gravado".
- Popup interception in `00-core.js` and candidate execution in `30-popup.js` own independent timers. Several delayed callbacks do not check cancellation before submitting.
- Adjustment employee selection uses readiness polls in `40-fases.js` and shared navigation in `00-core.js`; the analysis workflow also uses shared navigation, so adjustment-only changes must not silently change analysis behavior.
- Report readiness in `80-painel.js` can replace a detailed failure status with a generic report-ready status.

User-reported compatibility context: system response time varies, and some responses complete too quickly for the script to observe intermediate states. Existing waits were introduced to avoid losing functionality in those conditions. The main page can reload before popup closure finishes; the current executor begins `aguardarReloadPrincipal` only after its close wait. The rationale is reported operational history, not a timing measurement or a browser observation from this planning session.

## Goals / Non-Goals

**Goals:**

- Make wait outcomes explicit and testable with deterministic synthetic clocks and structures.
- Preserve valid fast and variable-speed responses without requiring popup closure to precede body reload or equating a missed intermediate event with failure.
- Stop uncertain adjustment actions before any further writes or employee processing.
- Ensure cleanup and stale-callback protection survive cancellation followed by a new run.

**Non-Goals:**

- Change rules in `20-mapa.js` or `35-planejamento.js`, candidate priorities, or final approval.
- Prove server-side persistence through UI observations, add backend requests, or implement rollback.
- Rewrite all navigation, heartbeat, analysis, or report generation.
- Automatically resubmit an uncertain save or auto-accept dirty-sheet dialogs.

## Decisions

### Inventory wait purposes, not a fixed system response time

Before modifying waits, map existing timers and `esperar` calls across the script in `SSD.md`: location, current timing or budget, trigger, purpose, expected completion signal, historical workaround where known, and whether they belong to adjustment work. Distinguish user-reported rationale from code observations and unknown behavior. Classify heartbeat, analysis, reports, and sounds as well, but leave their unrelated timers unchanged.

Separate four concepts:

- System response time is variable; completion must follow supported signals, not an assumed constant duration.
- Compatibility stabilization delays prevent premature actions. Preserve their existing values initially, make adjustment-owned delays cancellable, and do not reduce or remove them without focused evidence. Their expiry is not a completion signal.
- Polling cadence controls how often the script inspects state; a transient loading state can occur entirely between polls.
- Maximum safety deadlines bound uncertainty, not the expected response time. Name and document the initial stage budgets and their rationale separately from stabilization delays; do not standardize all stages to one duration or add unbounded extensions.

Record evidence gaps explicitly. Where no reliable completion signal exists, document the limitation and validate the compatibility behavior with synthetic cases and supervised observations; elapsed time alone must not silently become success. An alternative time-only continuation policy would require an explicit revision of this behavior contract before implementation.

### Use one bounded wait primitive with stage-specific predicates

Implement a shared adjustment wait helper in `AF.core`, using a stage, finite deadline, inspection predicate, and run identity. Return a discriminated outcome such as `ready`, `timeout`, `cancelled`, or `error`, including a structural reason where applicable. Missing or loading structures can remain pending until the deadline; an access/inspection exception is an error, not success. Settle exactly once, remove all owned timers, and make cancellation settle the promise immediately rather than merely clearing its interval.

Use named safety deadlines based on current stage budgets rather than unbounded retries or arbitrary reductions. Document their millisecond values and rationale during implementation, without presenting them as fixed system response times. Evaluate supported completion as it becomes observable, subject to any required compatibility stabilization delay; test multiple response durations, just-before-deadline readiness, and deadline exhaustion. Preserve existing compatibility delays initially as described above; they must be cancellable and cannot substitute for observed readiness.

**Alternative considered:** return a boolean from each existing polling loop independently. This still duplicates timer ownership and does not solve unresolved promises or stale work.

### Define structural UI completion, not persistence guarantees

| Stage | Required observation |
| --- | --- |
| Popup readiness | Current run's open popup, supported `TrocarHorario.aspx` path, complete document, expected form and usable date selector/save control. A popup closed before submission is failure. |
| Popup completion | Save submission recorded for that attempt, popup closure without a supported rejection outcome, and a supported post-submission body reload. Observe closure and reload concurrently; either can finish first. Closure alone is insufficient. |
| Body reload after save | A transition after the action, followed by the documented body path, complete document, and `myForm`; do not use counts of irregularity or text inputs as readiness evidence. |
| Employee readiness | A post-selection body transition followed by the supported loaded body/form before adjustment processing. |

Arm reload observation before the sensitive action to avoid missing a quick load. Resolve current frames from `window.top` for inspections. Use a body document/load generation baseline and structural ready metadata to distinguish a new load from the same previously ready page; document references, if used as identity baselines, must never be reused as interaction targets. Empty sheets are supported when their documented body form/structure is ready.

Keep the baseline and observations scoped to the run and attempt. Start body-reload observation before the popup save click, not after popup closure, and retain completion evidence while closure is pending. A newly loaded, structurally ready document or recorded load generation can establish a transition even if the loading interval was never seen. Do not require inputs to disappear, repeat an already observed reload wait after closure, or accept the same old ready document merely because a delay expired. Before subsequent actions, resolve and validate the current target structure again rather than interacting with a captured document.

Preserve supported popup rejection handling and candidate fallback, but timeouts and access failures are fatal rather than another candidate attempt. Track the attempt's submitted/rejected/exhausted state explicitly rather than treating absence of a sessionStorage failure flag as proof of success.

Use precise messages such as observed UI completion or unconfirmed save. No available page contract establishes a reliable server-side persistence acknowledgement, so do not claim that this change supplies one.

**Alternative considered:** retain the input-count disappear/reappear heuristic. A sheet may have no rows, and a quick reload may occur between polls.

### Allow only the documented empty-selection bootstrap

At adjustment startup, allow the complete `/WebPonto/blank.htm` body only when the header selector is on its empty placeholder, the header/footer structures are supported, and no `Selecionado` row flags are checked. Arm the normal body-transition observer before selecting the first non-empty option through the existing header functions. The supported header form does not route to the body through static `action`/`target` attributes; preserve `AjustaCodEmpresaEmpregado` and `AtualizaFuncionario`, then use the observed frame transition as the routing evidence. Require the loaded `justuser_corpo.asp` body contract before processing. Keep all other startup and in-run body checks strict; a blank body with a non-empty employee selection remains a fatal precondition failure.

Employee options are user-specific and can vary in content, count, and order. Enumerate the live selector options and determine the first non-empty option at runtime; do not hardcode employee names, IDs, counts, or ordering from another session.

### Scope asynchronous work to an adjustment run

Assign an adjustment-run identity and own its polling intervals, delayed candidate actions, and interceptor callbacks through one cleanup registry. Every action-capable callback checks both active-run identity and cancellation immediately before acting. Fatal stop, user stop, and normal completion release the run's asynchronous resources and pending sessionStorage intent; restore intercepted functions without overwriting unrelated replacements. Do not register the heartbeat or read-only analysis as adjustment-owned work.

Unify the popup-readiness observation used by the interceptor and executor so a ready selector cannot launch duplicate or orphan attempts. Preserve structural precondition checks before writes. A newly started run resetting `cancelado` must not make old callbacks eligible again.

**Alternative considered:** add only `if (cancelado)` before the save callback. That fails when a subsequent run resets the shared flag.

### Propagate failure to the batch and retain diagnostics

Use a single adjustment-stop path for wait failures, preserving the failed stage/reason and whether a save outcome is unconfirmed. The orchestration checks outcomes before counting moved records, reporting completion, or advancing employees. Use guaranteed final cleanup to restore `rodando` and controls on every exit.

Keep earlier confirmed results in the existing partial report where available; do not mark the interrupted sheet complete, fabricate successful counters, or imply rollback. Report readiness may enable the report button but must not overwrite the failure reason. If the current header is unavailable, retain the diagnostic in runtime state and log it to the console rather than losing it.

**Alternative considered:** catch and log locally, then return as if the action simply made no change. This permits unsafe continuation and masks an uncertain save.

## Risks / Trade-offs

- [UI reload or popup closure does not prove persistence] -> Label the observation and uncertainty precisely; retain human review and no automatic retry.
- [A valid page is slow or reloads faster than polling] -> Preserve existing compatibility delays and timeout allowances initially, distinguish them from variable response time, observe transitions before actions, retain reload evidence independently of closure, and test multiple durations, between-poll reloads, and near-deadline cases.
- [Stopping after submission cannot undo it] -> Report an unconfirmed outcome and forbid further automatic submissions; do not promise rollback.
- [Shared navigation changes could affect analysis] -> Gate adjustment-specific waits by run context and add a regression test for the unchanged analysis navigation contract.
- [Browser observations were previously conflated with installation confirmation] -> Record the user's confirmation and runtime observation separately; if browser tooling is unavailable, leave the runtime task pending and request concrete read-only evidence.

## Migration Plan

Inventory wait purposes and known compatibility workarounds first. Implement the shared lifecycle/wait primitive with synthetic tests, then wire popup, footer save, and adjustment employee readiness. Add regression coverage for success, rejection, variable response durations, reload before/during/after popup closure, reload between polls, timeout, cancellation, inspection errors, stale callbacks after restart, and no employee progression on failure. Update the page/architecture documentation and roadmap with measured evidence and remaining limits. Real operational examples can supplement synthetic coverage under explicit supervision; the read-only smoke test below does not validate adjustment timing or authorize writes.

Run changed-module syntax checks, the full `node --test` suite, OpenSpec validation, and `git diff --check`. Publish only to `test` and follow `AGENT.md`: wait for the user's installation confirmation before refreshing MyWay, then observe only runtime version, supported structural metadata, module availability, and panel initialization. Do not invoke **Ajustar**, save, or approval during the smoke test. Keep the smoke task pending until evidence is obtained.

If supported behavior is rejected incorrectly, stop the experimental run and revert only this change's commits on `test` with explicit supervision; do not touch unrelated local changes or promote to `main`.
