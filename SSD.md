# System & Software Design (SSD)

## Purpose and scope

This document maps the current implementation of `app-fpw` and records important technical decisions and validation limits. The project direction and ordered improvement stages are in [ROADMAP.md](ROADMAP.md). The page contract and operational guardrails remain in [PAGE_STRUCTURE.md](PAGE_STRUCTURE.md) and [AGENT.md](AGENT.md), respectively.

The repository uses branch `main` as its stable production reference and branch `test` as the experimental line. Experimental changes are validated on `test` before any deliberate promotion; there is no separate test repository in the current plan.

## Runtime architecture

`99-main.user.js` is the Tampermonkey entrypoint. It declares the userscript metadata and loads the following modules sequentially from the raw GitHub URL of its own branch (`main` in release 10.0; the `test` line points to `test`) using `GM_xmlhttpRequest` and `eval`:

| Module | Current responsibility |
| --- | --- |
| `00-core.js` | Shared `AutomacaoFolha` state, frame access, logging entry point (`AF.core.log`), employee navigation, popup interception, session heartbeat, and Oracle companion session liveness evaluation and monitor (`AF.sessao`). |
| `05-log.js` | Structured, accumulated activity log (events with time, execution, employee, phase, and data), plain-text rendering, `sessionStorage` persistence for the tab lifetime, and the log window (view/copy). |
| `10-utils.js` | Date parsing/formatting, week and target-month helpers, and RJ holiday calculation. |
| `35-planejamento.js` | Pure phase 1–3 adjustment planning over structured maps; no DOM, frame, popup, or write access. |
| `37-regras-folha.js` | Pure rules for listing and counting movable days off (`listarFolgasAMovimentar`, `contarFolgasAMovimentar`), selecting code 47 dates and fields (`selecionarCamposCod47`), totaling overtime codes 2/27, and interpreting the compensation balance. Receives structured inputs; no DOM or frame access. |
| `38-preanalise.js` | Pure read-only adjustment pre-analysis builder and plain-text renderer (interval, predicted days off and code 47 dates, irregularity and overtime summaries). Provides read-only sheet adapter without writes, navigation, or popup interaction. |
| `20-mapa.js` | Traverses the current body frame to extract descriptors (`coletarItensFolha`) and transforms them into weekly structured maps with classified absences, days off, and holidays (`construirMapaFolha`). |
| `25-detector.js` | Reads the body frame into structured day rows (read-only) and applies pure detection rules that return the days of each irregularity (Sem Entrada/Saída, Interjornada, Marcação britânica, Folha não preenchida). Shared by analysis and adjustment. |
| `27-modelo-relatorio.js` | Pure unified report state model for the team (Analysis and Adjustment coexisting), fraction progress, per-employee adjustment actions and converted code 47 dates, adjustment tree detail text, summary big numbers, additive indicator filtering (union) combined with name search (intersection), sorting, TSV and irregularity-text export, and tab-lifetime `sessionStorage` persistence. |
| `30-popup.js` | Opens and interacts with the planned-schedule popup used by adjustment flows. |
| `40-fases.js` | Orchestrates adjustment phases and their popup interactions, changes applicable code 47 entries to 48 (delegating field selection to `37-regras-folha.js`), and invokes the footer save action when changes were made. Phase 1–3 decisions are delegated to `35-planejamento.js`. Before each sheet is changed it records the sheet state (read-only pre-analysis), and it records the state again after the last action. Records per-employee adjustment actions and code 47 changes for the report model. |
| `50-analisar.js` | Reads the page and delegates rule calculations to `37-regras-folha.js`; runs read-only analysis across employees, aggregates sheet statistics, and records a per-employee event with counts and days. |
| `60-relatorios.js` | Builds the live HTML report, copies per-employee irregularity text, opens expandable per-employee adjustment detail rows, opens the team irregularity export window for the visible table rows (title lists active filters and search), provides the name-search field, and supports report navigation and TSV copying. |
| `65-supervisionado.js` | Orchestrates supervised adjustment mode workflow (idle, confirming, applying, completed, stopped, interrupted), confirmation popup with pre-analysis and adjustment detail results. |
| `70-sons.js` | Provides optional audio cues for execution events: start, completion, user stop, failure and attention cue. Opening the live report plays no sound. |
| `80-painel.js` | Builds the injected controls (including mode selector Automático/Supervisionado and the always-available Log button), status display, Oracle companion session status indicator/warning, and instruction side panel. |
| `85-ambiente.js` | Present only on the `test` line: sets experimental environment, version, repository, and branch metadata. Not part of release 10.0 (the loader sets the `main` identity itself). |

The modules share a global `window.AutomacaoFolha` namespace rather than using a bundler or module system. The core and workflow modules access the legacy same-origin frames through `window.top`; the analysis, mapping, popup, and adjustment flows are consequently coupled to the WebPonto DOM and its navigation behavior.

## Runtime flow

1. Tampermonkey runs `99-main.user.js` on the Justificativas entry page.
2. The entrypoint downloads and evaluates the modules in order, configures the `test` identity, starts the heartbeat, waits for the employee selector in `topFrame`, and injects the panel.
3. **Analisar** traverses the employee selector and reads sheets to build a report.
4. **Ajustar** runs the phased adjustment workflow. It can interact with adjustment popups and automatically click the footer `btnGravar` after applicable code changes; it is not a read-only operation. Final approval remains a separate human action.
5. The panel and report window display execution status and results.

See [PAGE_STRUCTURE.md](PAGE_STRUCTURE.md) for the observed frames, selectors, readiness conditions, and write-sensitive controls. Follow [AGENT.md](AGENT.md) for stop conditions and the test-installation and session-recovery procedures.

## Sheet detection and activity log

Analysis and adjustment now share one detection path. `25-detector.js` first reads the body frame into rows (day heading, `Marc1N`/`Marc2N`, `IrreN`, `CodJustN`) and then applies pure rules that return the **days** of each occurrence; every count is the length of its day list.

| Category | Rule |
| --- | --- |
| Sem Entrada/Saída | Each irregularity row of the target month whose normalized text contains `marcacao irregular`, `hora extra irregular` or `s/marc` (a day with two such rows counts twice). `Ausência de Marcação` rows do not count. |
| Interjornada | Each target-month day whose **heading** contains the interjornada marker, counted once per day. Row text is never used because it includes the justification select options. |
| Marcação britânica | Manual (`*`) day entries and exits of the target month, in date order and per field; runs of 3 or more with equal minutes. The value is the number of days in those runs. |
| Folha não preenchida | Visible target-month days with no mark in any row. Flagged when filled days ≤ `floor(visible / 4)`, or when unfilled consecutive visible days span 7 or more calendar days; the percentage not filled is reported. |

Differences from the previous counters: the two former implementations used different text criteria (`s/marc` versus `s/marc de entrada/saida`; `Interjornada` versus `[Interjornada]`), and `irregs` is now the single Sem Entrada/Saída count. The report table and TSV still show the previous columns; the new categories are stored with each employee entry and written to the log until the report is reworked.

`05-log.js` keeps one accumulated list of structured events for the page session. `AF.core.log` creates events with the current execution, employee and phase, so existing call sites are unchanged. The log persists in `sessionStorage` (debounced writes, flushed at the end of each sheet execution and on `pagehide`), survives a page reload, and is discarded when the tab closes. It is bounded by a conservative character limit because the storage is shared with the site; the oldest events are dropped with a notice, and storage failures never stop a run. An execution still marked as running after a reload is marked as interrupted. Messages and data are sanitized so cookies, tokens, authorization values, and URL query strings are not recorded.

## Timer and wait inventory

This inventory records the current code, not measured FPW response times. Polling ceilings below are approximate: the code increments its counter on each interval and may stop on the following tick, and browser scheduling can delay callbacks. Existing values are compatibility references only; they do not define a fixed system response time and their expiration is not evidence of completion. The user reports that waits generally compensate for variable or too-fast-to-observe system responses, including the main page reloading before its popup closes; which individual legacy delay was added for which observed case is not known.

| Location | Trigger and current timing | Purpose / current completion signal | Ownership and evidence |
| --- | --- | --- | --- |
| `00-core.js`: `core.esperar(ms)` | Caller-supplied timeout | Generic delay; no completion signal other than elapsed time. | Shared helper. Its callers are classified separately below. |
| `00-core.js`: `avancarFuncionario` | After employee change: fixed 6,000 ms, then poll every 500 ms for up to about 10.5 seconds (21st tick); input counts or empty-page text end the poll. | Stabilization plus heuristic employee-page readiness; poll expiry also returns `"ok"`. | Shared by adjustment and read-only analysis; changing it globally risks analysis behavior. |
| `00-core.js`: popup interceptor | Synchronously captures the returned popup while an adjustment attempt is active; no longer starts a separate readiness poll. | Associates the opened window with the current run/attempt; the executor then waits for its supported structure. | Wrapper installation and restoration are owned by the active run. |
| `00-core.js`: session keepalive | Immediate request, then interval every 2 minutes by default. | Same-origin GET, skipped while automation is running; not a UI readiness wait. | Session liveness, not adjustment-owned; leave unchanged by adjustment wait work. |
| `30-popup.js`: popup readiness | Poll every 300 ms up to the named 18,300 ms safety deadline for an open supported popup with a complete document, form, usable date selector, and save control. | Missing popup/structure remains pending; early closure and inspection exceptions produce explicit error outcomes. | Uses the shared wait and active run cancellation; no interceptor-side duplicate poll. |
| `30-popup.js`: body reload and popup completion | Observe `mainFrame` load generation and current document identity from before save; inspect structural readiness every 300 ms up to 24,600 ms for body reload, with up to 36,300 ms total when only popup closure remains after reload evidence. | New supported loaded body document (including an empty sheet) establishes transition; popup closure and reload can be observed in either order. Elapsed time alone cannot establish success. | One attempt keeps evidence until both required outcomes are observed; stop removes its listener and waits. |
| `30-popup.js`: candidate edit/save | Preserve 1,400 ms between editing a date and clicking save. | Compatibility stabilization before save; its expiry is not completion evidence. | Cancellable run wait; no next candidate after uncertain submission. |
| `30-popup.js`: rejection/attempt cleanup | Preserve 1,700 ms after accepting a supported rejection and 800 ms before closing after candidate exhaustion. | Allows the popup to settle before the next candidate and before closing an exhausted attempt. | Delays are cancellable and run-owned; timeout/error is distinct from rejection and cannot trigger fallback. |
| `30-popup.js`: action sequencing | 800 ms after clicking the sheet radio; 400 ms after supported no-change outcome. | Stabilizes before finding/clicking the popup link and separates no-change logging from subsequent work. | Both are cancellable run waits. |
| `40-fases.js`: footer save | Observe body document/load generation every 300 ms up to 12,300 ms, then preserve a further fixed 5,000 ms stabilization after supported reload. | Requires a post-save transition and the supported loaded body structure; no input disappearance/count heuristic. A timeout or inspection error is unconfirmed, not success. | Adjustment-owned and run-cancellable. |
| `40-fases.js`: first employee selection | Preserve a 6,000 ms minimum stabilization while polling every 500 ms up to the 16,500 ms employee-readiness deadline. | Requires a post-selection transition and supported body structure; empty sheets are ready; timeout/error stops before processing that page. | Adjustment startup only. Later adjustment selection passes its run to `core.avancarFuncionario`; read-only analysis without a run retains legacy navigation. |
| `99-main.user.js`: panel setup | Poll every 500 ms for up to about 60.5 seconds (121st tick) for the header selector; a frame `load` schedules a zero-delay recheck; watchdog every 2 seconds. | Waits for initial panel prerequisites and restores the panel after header navigation. | Application startup/UI lifecycle, not adjustment-owned. |
| `60-relatorios.js`: report copy feedback | 2,500 ms after successful clipboard write. | Resets temporary visual “copied” button feedback. | Report UI only; no automation readiness meaning. |
| `60-relatorios.js`: irregularity-copy feedback and export window | 2,000 ms after a successful row or team-text copy; 3,000 ms for an inline clipboard-failure notice. The team export window has no polling timer and keeps the snapshot from its last open/refresh action. | Resets copy feedback and clipboard-failure notice; the window shows the generation time outside the selectable/copied text. | Report UI only; no automation readiness meaning. |
| `05-log.js`: persistence debounce | 400 ms after the last logged event; immediate flush at execution start/end and on `pagehide`. | Batches `sessionStorage` writes. | Diagnostics only; no automation readiness meaning and no wait is added to any adjustment step. |
| `05-log.js`: log window refresh and copy feedback | Refresh every 1,000 ms while the log window is open (only when the text changed); 2,000 ms after a copy. | Keeps the log window current and resets button feedback. | Log UI only; no automation readiness meaning. |
| `27-modelo-relatorio.js`: persistence debounce | 400 ms after model change; immediate flush on execution start/end and on `pagehide`. | Batches `sessionStorage` writes for report model. | UI/State persistence only; no automation readiness meaning. |
| `60-relatorios.js`: live window refresh | Polls model version every ~1,000 ms when window is open; updates DOM only on version change. | Keeps live report window in sync during analysis and adjustment. | Report UI only; no automation readiness meaning. |
| `70-sons.js`: audio sequences | Per-note offsets derived from note durations/delays; no fixed initial offset on any cue. | Schedules optional audio cues. | Sound/UI only; no automation readiness meaning. |

For adjustment work, preserve the existing compatibility delays initially and distinguish them from polling cadence and newly named maximum safety deadlines. Deadlines bound unresolved uncertainty; their values and rationale must not be represented as expected system response times. No per-delay historical cause or live adjustment timing measurement is established by this inventory. Heartbeat, analysis, report, sound, startup, and shared-navigation behavior are classified here to make scope explicit, not authorized for unrelated changes.

The initial named adjustment wait budgets in `AF.core.prazosEsperaAjuste` are provisional safety ceilings derived from current polling windows, not FPW response-time guarantees:

| Stage | Initial safety deadline | Basis |
| --- | ---: | --- |
| `popupReadiness` | 18,300 ms | Existing 300 ms polling window, approximately 61 ticks. |
| `popupCompletion` | 36,300 ms | Existing 300 ms popup-close window, approximately 121 ticks. |
| `bodyReload` | 24,600 ms | Both sequential 300 ms body-reload phases, approximately 41 ticks each. |
| `footerReload` | 12,300 ms | Existing single 300 ms footer-save poll, approximately 41 ticks. |
| `employeeReadiness` | 16,500 ms | Existing 6,000 ms stabilization plus approximately 10,500 ms of 500 ms polling. |

The wait primitive returns `ready`, `timeout`, `cancelled`, or `error`; it accepts an optional minimum stabilization interval that cannot itself produce `ready`. A readiness observation made during that interval is retained until the minimum has elapsed. Callers must supply a supported predicate and, for user-stop responsiveness, a run cancellation subscription. Each adjustment execution has a monotonically increasing in-memory identity, owns its delayed candidate callbacks, interceptor polling, and interceptor restoration, and becomes ineligible immediately on cancellation or replacement by a new run. Cleanup restores `window.open` only when the wrapper still belongs to that run; heartbeat and shared read-only employee navigation are not registered as run resources. Popup readiness/close/reload, footer save, and adjustment navigation still need the shared wait integration in the remaining tasks.

## Session-liveness design

The experimental userscript sends an immediate same-origin GET to the current Justificativas page, then repeats it every two minutes. It uses the browser's same-origin credentials, disables caching, and skips an interval while automation is running. It does not navigate or reload a frame. The most recent attempt and result are retained in shared runtime state; redirects and unsuccessful responses are reported as failures.

The [session-liveness specification](openspec/specs/session-liveness/spec.md) contains the durable behavior contract. The implementation decision and dated validation history are in the [archived keepalive-session-heartbeat change](openspec/changes/archive/2026-10-02-keepalive-session-heartbeat/proposal.md).

## Architectural constraints and known limitations

- Business rules and page access are not yet cleanly separated; many rules read or act on DOM nodes directly.
- Readiness and navigation handling use polling and timing assumptions in some workflows; a selector or page-contract change can affect automation.
- Error handling and runtime diagnostics are inconsistent, so some failures may be hard to distinguish from empty or completed results.
- Loading remote JavaScript with `eval` means runtime behavior depends on the ordered files published on the test branch and on Tampermonkey's cross-origin request grant.
- Mark-based rules (British marking and Folha não preenchida) depend on the `Marc1N`/`Marc2N` fields observed on the page; if those fields are absent the categories are reported as not evaluated rather than as zero.
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
