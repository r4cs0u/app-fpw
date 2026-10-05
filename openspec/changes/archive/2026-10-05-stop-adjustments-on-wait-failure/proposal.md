# Proposal

## Why

The adjustment workflow currently allows popup and body-reload waits to finish on timeout or an inspection error without distinguishing those outcomes from completion. In particular, popup execution can return success without an observed completion, and footer save can log "Gravado" after an unconfirmed reload; this leaves a gap in roadmap stage 4 despite the existing structural preconditions.

The user reports that existing delays compensate for variable system response times and responses too fast for polling to capture. In particular, the main page can reload before the popup finishes closing, while the current executor only starts waiting for that reload afterward. Missing an intermediate event is therefore not proof of failure. These compatibility workarounds must be understood before changing them, rather than replaced with an assumed fixed response time.

## What Changes

- Give adjustment waits explicit, bounded completion, timeout, cancellation, and inspection-failure outcomes.
- Inventory existing waits by purpose and known workaround, separating variable system response, compatibility stabilization delays, polling cadence, and maximum safety deadlines; preserve compatibility delays initially rather than standardizing response time.
- Require observed popup readiness, completion after save submission, and a supported body reload before treating a popup action as completed; require a supported body reload before reporting footer-save completion.
- Observe popup completion and body reload concurrently from before submission, retain evidence regardless of their order, and recognize a completed reload even when its transient loading state was missed.
- Stop the current batch visibly on an uncertain outcome, without advancing employees, counting the action as successful, or automatically repeating the save.
- Cancel run-owned polling and delayed callbacks on stop, and prevent callbacks from an old run from editing or submitting during a later run.
- Preserve successful-path planning and candidate order, the existing supported rejection/candidate fallback, structural guards, and manual final approval.
- Cover failure, cancellation, variable response times, reload-before-popup-close, between-poll reloads, and successful paths with synthetic tests; update the related architecture, page contract, and roadmap during implementation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `fpw-automation`: require adjustment waits to distinguish observed completion from uncertain outcomes, stop safely on failure, and prevent delayed actions after stopping.

## Impact

- Runtime touchpoints: adjustment polling/interception in `00-core.js`, popup execution in `30-popup.js`, footer save and batch cleanup in `40-fases.js`, and stop/status handling in `80-painel.js`.
- Tests: synthetic timers, popup/frame structures, and action counters using the existing Node test runner; no live employee or sheet data and no new dependency required.
- Documentation: `PAGE_STRUCTURE.md`, `SSD.md`, `AGENT.md` where cleanup/stop guidance needs clarification, and `ROADMAP.md` progress.
- Intentional behavior change: uncertain operations stop instead of appearing successful. This does not add writes, approval, server APIs, rollback, or proof of server-side persistence.
- Deployment remains on `test`; the user's installation confirmation and the runtime smoke observation are separate evidence, not interchangeable completion criteria.
