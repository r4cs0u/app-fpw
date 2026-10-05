# Design

## Context

See `proposal.md` for the motivation and file scope. The repository already has a working experimental `test` branch and separate README, agent guide, page-structure guide, system design, and roadmap documents. `TESTE_VERSION_PLAN.md` repeats branch and remodularization plans that now belong in the roadmap. The OpenSpec changes for the experimental line and heartbeat are archived; their durable capability specs live in `openspec/specs/`.

## Goals / Non-Goals

**Goals:**
- Give each retained root Markdown document one clear audience and responsibility.
- Make the roadmap a usable, ordered record of current state and next work, including the five agreed stages.
- Keep the SSD descriptive of the implementation that exists, clearly distinguishing verified behavior from limitations.
- Preserve useful decisions and links before removing the redundant test plan.

**Non-Goals:**
- Change userscript behavior, runtime architecture, branch policy, or product features.
- Merge the separate page contract or agent guardrails into the roadmap.
- Rewrite the README or introduce a new documentation framework.
- Treat historical OpenSpec change artifacts as current operating instructions.

## Decisions

### Keep five root-level project guides with distinct jobs

- `README.md`: short user-facing overview and purpose.
- `AGENT.md`: repository and operational rules for contributors and agents.
- `PAGE_STRUCTURE.md`: observed WebPonto page/frame contract and interaction constraints.
- `SSD.md`: current implementation map, runtime flow, architectural boundaries, and verified limitations.
- `ROADMAP.md`: current project status, confirmed direction, prioritized next steps, and completion criteria.

Alternative considered: combine all technical and operational material into one large Markdown file. Rejected because it would mix audiences and make high-risk page-operation guidance harder to find.

### Make the roadmap the single forward-looking plan

State that `test` in this repository is the experimental line and `main` remains the stable reference; a separate `app-fpw-teste` repository is not planned. Replace stale future-tense checklists with current status and five ordered stages:

1. Align and maintain the project plan and documentation.
2. Add automated tests for business rules that can run without the WebPonto page.
3. Gradually separate those rules from DOM reading and page interactions.
4. Strengthen safety checks, stop conditions, and diagnostics for actions that can alter records.
5. Resume larger functional evolution once the foundations are testable and predictable.

Each stage should say what outcome demonstrates completion. The order describes a recommended progression, not a promise to add every possible feature.

Alternative considered: keep the five steps only in the already long test-version plan. Rejected because the roadmap is the chosen ongoing project plan and the separate file duplicates it.

### Update the SSD as an implementation map, not a second roadmap

Describe the current module responsibilities using the files present in the repository: entrypoint and ordered module loading; shared state and frame helpers; date utilities and DOM mapping; popup and phased adjustment flow; read-only analysis; reports, panel, sounds, and test-environment identity. Keep the heartbeat design and validation evidence, but link the durable `session-liveness` spec and dated archive rather than an active change path. Explicitly distinguish the reported 16-minute observation from a guarantee beyond that duration.

Alternative considered: move all implementation history into the roadmap. Rejected because the roadmap should guide future work, while the SSD should explain the current system and important technical evidence.

### Retire the redundant test-version plan after transferring relevant content

Use `ROADMAP.md` for ongoing priorities and `SSD.md` for current architecture and evidence. Remove `TESTE_VERSION_PLAN.md` only after confirming its relevant decisions and useful material are represented in those documents or are already covered by `AGENT.md` and `PAGE_STRUCTURE.md`.

Alternative considered: retain the plan but mark it obsolete. Rejected because it would leave a sixth root-level Markdown file that readers could mistake for current guidance.

## Risks / Trade-offs

- [Risk] Concision could discard useful historical evidence → Preserve the heartbeat validation limits and durable OpenSpec links in `SSD.md`; keep operational procedures in `AGENT.md`.
- [Risk] The roadmap could become another stale checklist → Label completed/current work and future stages distinctly, and avoid duplicating task-level execution tracking that belongs in OpenSpec.
- [Risk] Removing the standalone plan could break a useful reference → Search current project guides for inbound links and transfer unique decisions before deletion; historical references in this OpenSpec change may remain to document the cleanup.

## Migration Plan

1. Check current project-guide references to `TESTE_VERSION_PLAN.md` and identify information not represented elsewhere; do not rewrite historical OpenSpec records solely to erase the old plan's name.
2. Rewrite `ROADMAP.md` around verified current state, the confirmed `test`-branch setup, and the five stages.
3. Update `SSD.md` with the current module map, accurate OpenSpec links, and evidence limits.
4. Remove `TESTE_VERSION_PLAN.md` after reviewing that its unique useful content has been transferred or is already covered.
5. Check all root Markdown links and search the current root guides for stale references to the retired file, the unchosen separate-repository plan, and active links to changes that have been archived.
6. Validate the OpenSpec change and review the documentation diff. No application test suite is needed because runtime code is unchanged.

Rollback is a Git revert of the documentation change; no runtime migration is involved.
