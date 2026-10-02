# System & Software Design (SSD)

## Purpose and scope

This document records the current runtime design and significant implementation decisions for `app-fpw`. The stable userscript is the production reference; experimental behavior is developed and validated only on branch `test` until explicitly promoted.

## Runtime architecture

- `99-main.user.js` is the Tampermonkey entrypoint. It loads the ordered JavaScript modules from the selected branch's GitHub raw URL.
- `00-core.js` owns shared state and cross-frame helpers. `80-painel.js` provides the UI, and the analysis/processing modules implement the workflows.
- The target is the legacy MyWay/WebPonto frameset. See [PAGE_STRUCTURE.md](PAGE_STRUCTURE.md) for its page/frame contract and [AGENT.md](AGENT.md) for operating guardrails.
- `85-ambiente.js` identifies the experimental runtime. The heartbeat work targets `9.6-test`; the stable `main` line is unchanged.

For the repeatable Tampermonkey update and Oracle/MyWay session-recovery procedures, follow [AGENT.md](AGENT.md).

## Session-liveness design

The `test` line replaces the prior content-frame reload with a same-origin GET to the current Justificativas page. It uses the browser's same-origin credentials, disables cache, runs immediately and then every two minutes, and skips a tick while an automation is running. The latest attempt and result are retained in shared runtime state. No navigation fallback is used.

The request is intended to refresh server activity without changing employee data. It cannot override Oracle/MyWay authentication policy, and a successful HTTP response alone does not prove that either server-side or client-side inactivity expiration has been prevented.

## Safety boundaries

- Keep all changes in branch `test` until reviewed; do not alter `main` during this experiment.
- The heartbeat uses GET only and must not submit forms or trigger employee/justification updates.
- Do not run the panel's `Executar/Ajustar` action as a keepalive test. The `Analisar` action is read-only but may process multiple visible employees and is validated separately.
- Stop treating the feature as successful if the request redirects, the expiry screen appears, a frame navigates, or the automation is running.

## OpenSpec traceability

The requirements, technical decisions, and implementation checklist are tracked in [keepalive-session-heartbeat](openspec/changes/keepalive-session-heartbeat/proposal.md). The test remains experimental until all end-to-end criteria in its tasks are satisfied.

## Validation evidence

Recorded 2026-10-02:

- Node syntax checks passed for the changed modules; a full root-module syntax check also completed before OpenSpec validation.
- A same-origin GET to the authenticated MyWay Justificativas URL returned HTTP `200` without redirect. This verifies endpoint connectivity only, not preservation beyond the inactivity timeout.
- The reopened Justificativas page exposes frames `justuser_cabec.asp`, `blank.htm`, and `justuser_rodape.asp`, but the current browser runtime has no `window.AutomacaoFolha`. Therefore the installed test script has not yet been verified active in this page.
- Publication, Tampermonkey update, heartbeat timer/result inspection, and observation beyond the actual inactivity timeout remain pending.