# Tasks

## 1. Align current project documentation

- [x] 1.1 Rewrite `ROADMAP.md` to state the current repository/branch arrangement and current status, then record the five agreed stages in order with a clear goal and completion outcome for each; verify it no longer presents the already-created test branch or existing guides as future work.
- [x] 1.2 Update `SSD.md` with an accurate responsibility map for the existing userscript modules and runtime flow, preserve relevant heartbeat validation evidence, and link to the durable `session-liveness` spec and dated archive; verify every linked path exists and the 16-minute observation is not described as a guarantee beyond that interval.
- [x] 1.3 Transfer any unique, still-useful architecture or process decisions from `TESTE_VERSION_PLAN.md` into `ROADMAP.md`, `SSD.md`, `AGENT.md`, or `PAGE_STRUCTURE.md` as appropriate, then remove the redundant file; verify the current root guides have no stale references to it or to the unchosen separate-repository plan.

## 2. Verify the documentation set

- [x] 2.1 Review root Markdown responsibilities and links after consolidation; verify the five retained guides are `README.md`, `AGENT.md`, `PAGE_STRUCTURE.md`, `SSD.md`, and `ROADMAP.md`, with no duplicate test-version plan.
- [x] 2.2 Run `openspec validate align-project-documentation --type change` and review the documentation diff; verify the change is valid and no JavaScript or runtime files were modified.
