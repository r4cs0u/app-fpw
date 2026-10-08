# Proposal

## Why

The project documentation describes parts of the current setup as future work, even though a `test` branch and operational guides already exist. It also alternates between using that branch and creating a separate test repository, leaving the intended project structure unclear before further architectural work begins.

## What Changes

- Replace the stale and overlapping roadmap content with an accurate current state, the confirmed use of the `test` branch in this repository, and the agreed five-step order for future work.
- Update `SSD.md` to describe the current modules, runtime flow, and known limitations without duplicating the roadmap.
- Transfer any still-useful information from `TESTE_VERSION_PLAN.md` into the roadmap or SSD, then remove the redundant standalone plan.
- Keep this change documentation-only; do not modify application behavior, source code, or the production workflow.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a documentation-only change and does not change system behavior.

## Impact

Documentation only: `ROADMAP.md`, `SSD.md`, and removal of `TESTE_VERSION_PLAN.md`. Keep `README.md`, `AGENT.md`, and `PAGE_STRUCTURE.md` focused on their existing distinct purposes. No code, APIs, dependencies, or runtime behavior are affected.
