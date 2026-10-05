# Design

## Context

The current project already works as a functional browser automation tool, but it mixes domain logic, DOM access, execution flow, and reporting in a way that makes the system fragile over time. The production userscript remains the baseline reference, while the experimental branch focuses on a safer structure for future growth.

## Goals / Non-Goals

**Goals:**
- isolate the experimental line from the production userscript;
- establish a clearer product identity for the next version;
- document the page structure and automation guardrails separately;
- create a cleaner path for remodularization without destabilizing the stable workflow.

**Non-Goals:**
- rewriting the entire production automation in a single step;
- changing the core business logic before the test line is validated;
- removing human approval from final adjustments in the WebPonto workflow.

## Decisions

### Decision 1: keep the current production userscript as the stable reference
The current app remains the baseline and comparison point. This reduces risk and protects the operational workflow while the experimental version is being evaluated.

Alternative considered: replace the production line immediately. Rejected because it introduces downtime and weakens confidence during the migration period.

### Decision 2: introduce a dedicated experimental project line
The experimental version will be created in a separate repository and branch so that proof-of-concept work, testing, and remodularization can be validated independently from the production environment.

Alternative considered: making changes directly in the current app. Rejected because it couples risk and experimentation to the live workflow.

### Decision 3: separate page structure and agent behavior
The project will maintain one document for interface structure and another for operational guardrails. This keeps the technical map of the page separate from the behavioral rules that the automation must follow.

Alternative considered: mixing both concerns in one document. Rejected because it makes decisions harder to audit and increase ambiguity during automation changes.

### Decision 4: keep the experimental line identified only as the test branch
The test branch should remain clearly marked as an experimental version without redefining the official product name. This avoids mixing the stable identity of the application with the branch-specific validation work.

Alternative considered: naming the test branch after the product name. Rejected because it would blur the distinction between the stable application identity and the branch used for testing and iteration.

## Risks / Trade-offs

- [Risk] The production page may change in ways that break both the original and the experimental automation → Mitigation: keep the production line as the stable reference and validate the new structure in controlled test runs.
- [Risk] The test line could grow faster than the production baseline → Mitigation: keep the work scoped to architecture, branding, and validation before promotion.
- [Risk] Documentation can drift from the actual interface → Mitigation: keep page structure and agent rules in dedicated update cycles tied to validation runs.
