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
- The published raw entrypoint, core, and environment files all returned HTTP `200`; the entrypoint and environment report `9.6-test` and the core contains the observable fetch-based heartbeat.
- The Chrome MCP opened the Tampermonkey intermediate installation page, but only its generic website notice was available; no install confirmation was exposed. Native Tampermonkey installation is therefore not confirmed in this browser context.
- The published code was loaded in-memory into the authenticated MyWay page using a temporary `GM_xmlhttpRequest` shim. Runtime reported `AF.test` version `9.6-test`, an active timer, a visible five-action panel, and a real heartbeat response of HTTP `200` without redirect. This is a code/runtime check, not proof that Tampermonkey itself installed the update.
- Failure-path probes returned diagnostics for HTTP `500`, redirect, network error, and automation-running skip. The real heartbeat left the page and all three frame URLs unchanged.
- An unattended 145-second observation captured the scheduled two-minute heartbeat: HTTP `200`, no redirect, no expiry screen, and no change to the page or any of the three frame URLs. This proves one periodic cycle only, not preservation beyond the configured inactivity timeout.
- One selected employee's sheet was loaded through the legacy **Exibir** query and analyzed read-only. The selection, frame URLs, and fingerprint of all 872 input/select/textarea values were unchanged after analysis. No **Ajustar** action was invoked.
- The observed period has not exceeded the actual MyWay inactivity timeout. Server-side session preservation remains unproven; native Tampermonkey installation and long-duration observation are pending.