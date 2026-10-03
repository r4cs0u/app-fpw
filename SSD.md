# System & Software Design (SSD)

## Purpose and scope

This document maps the current implementation of `app-fpw` and records important technical decisions and validation limits. The project direction and ordered improvement stages are in [ROADMAP.md](ROADMAP.md). The page contract and operational guardrails remain in [PAGE_STRUCTURE.md](PAGE_STRUCTURE.md) and [AGENT.md](AGENT.md), respectively.

The repository uses branch `main` as its stable production reference and branch `test` as the experimental line. Experimental changes are validated on `test` before any deliberate promotion; there is no separate test repository in the current plan.

## Runtime architecture

`99-main.user.js` is the Tampermonkey entrypoint. It declares the userscript metadata and loads the following modules sequentially from the `test` branch raw GitHub URL using `GM_xmlhttpRequest` and `eval`:

| Module | Current responsibility |
| --- | --- |
| `00-core.js` | Shared `AutomacaoFolha` state, frame access, logging, employee navigation, popup interception, and session heartbeat. |
| `10-utils.js` | Date parsing/formatting, week and target-month helpers, and RJ holiday calculation. |
| `35-planejamento.js` | Pure phase 1–3 adjustment planning over structured maps; no DOM, frame, popup, or write access. |
| `20-mapa.js` | Traverses the current body frame to extract descriptors (`coletarItensFolha`) and transforms them into weekly structured maps with classified absences, days off, and holidays (`construirMapaFolha`). |
| `30-popup.js` | Opens and interacts with the planned-schedule popup used by adjustment flows. |
| `40-fases.js` | Orchestrates adjustment phases and their popup interactions, changes applicable code 47 entries to 48, and invokes the footer save action when changes were made. Phase 1–3 decisions are delegated to `35-planejamento.js`. |
| `50-analisar.js` | Runs the read-only analysis across employees and aggregates sheet statistics. |
| `60-relatorios.js` | Builds TSV and HTML reports and supports report navigation and copying. |
| `70-sons.js` | Provides optional audio cues for execution and report events. |
| `80-painel.js` | Builds the injected controls, status display, and instruction side panel. |
| `85-ambiente.js` | Sets experimental environment, version, repository, and branch metadata. |

The modules share a global `window.AutomacaoFolha` namespace rather than using a bundler or module system. The core and workflow modules access the legacy same-origin frames through `window.top`; the analysis, mapping, popup, and adjustment flows are consequently coupled to the WebPonto DOM and its navigation behavior.

## Runtime flow

1. Tampermonkey runs `99-main.user.js` on the Justificativas entry page.
2. The entrypoint downloads and evaluates the modules in order, configures the `test` identity, starts the heartbeat, waits for the employee selector in `topFrame`, and injects the panel.
3. **Analisar** traverses the employee selector and reads sheets to build a report.
4. **Ajustar** runs the phased adjustment workflow. It can interact with adjustment popups and automatically click the footer `btnGravar` after applicable code changes; it is not a read-only operation. Final approval remains a separate human action.
5. The panel and report window display execution status and results.

See [PAGE_STRUCTURE.md](PAGE_STRUCTURE.md) for the observed frames, selectors, readiness conditions, and write-sensitive controls. Follow [AGENT.md](AGENT.md) for stop conditions and the test-installation and session-recovery procedures.

## Session-liveness design

The experimental userscript sends an immediate same-origin GET to the current Justificativas page, then repeats it every two minutes. It uses the browser's same-origin credentials, disables caching, and skips an interval while automation is running. It does not navigate or reload a frame. The most recent attempt and result are retained in shared runtime state; redirects and unsuccessful responses are reported as failures.

The [session-liveness specification](openspec/specs/session-liveness/spec.md) contains the durable behavior contract. The implementation decision and dated validation history are in the [archived keepalive-session-heartbeat change](openspec/changes/archive/2026-10-02-keepalive-session-heartbeat/proposal.md).

## Architectural constraints and known limitations

- Business rules and page access are not yet cleanly separated; many rules read or act on DOM nodes directly.
- Readiness and navigation handling use polling and timing assumptions in some workflows; a selector or page-contract change can affect automation.
- Error handling and runtime diagnostics are inconsistent, so some failures may be hard to distinguish from empty or completed results.
- Loading remote JavaScript with `eval` means runtime behavior depends on the ordered files published on the test branch and on Tampermonkey's cross-origin request grant.
- The automated adjustment flow includes write-sensitive interactions. Human supervision and the stop conditions in `AGENT.md` remain essential.

These are constraints for future work, not claims that the present workflow has already been remodularized or comprehensively tested. See [ROADMAP.md](ROADMAP.md) for the recommended order of improvement.

## Validation evidence and limits

Recorded on 2026-10-02:

- JavaScript syntax checks passed for all root modules.
- A same-origin GET to the authenticated MyWay Justificativas URL returned HTTP 200 without redirect. This proves endpoint connectivity for that observation, not session preservation beyond the inactivity timeout.
- Published raw entrypoint, core, and environment files returned HTTP 200 and identified version `9.6-test`; the active native Tampermonkey runtime was observed reporting that test version.
- Failure-path probes distinguished HTTP 500, redirect, network error, and automation-running skip outcomes. The observed heartbeat left the page URL and all three frame URLs unchanged.
- One scheduled two-minute heartbeat was observed without expiry or navigation. A later user-reported idle observation lasted 16 minutes without expiry. The configured inactivity timeout is unknown, so neither observation proves a guarantee beyond its measured interval.
- One selected sheet was analyzed read-only; the selected employee, frame URLs, and fingerprint of 872 input/select/textarea values remained unchanged. No **Ajustar** action was invoked in that analysis check.

The archived task list and design record the detailed test procedure and evidence. Re-run relevant checks when changing the heartbeat or its environment; do not treat a successful HTTP response alone as proof that server-side or client-side session expiry is prevented.
