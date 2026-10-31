# Design

## Context

See `proposal.md` for the incident and intended behavior. The map emits hidden dates as strings, while visible schedule entries are records. The popup flow can exhaust candidates without finding any in its date selector, and that outcome was previously indistinguishable to phase 2 from a real no-change after an available candidate.

## Goals / Non-Goals

**Goals:**
- Keep Analysis and pre-analysis counts consistent with the hidden-date forms produced by the map.
- Preserve the distinction between an unavailable popup date and a candidate that was offered but did not change the schedule.
- Preserve the existing candidate order, popup confirmation rules, and write safeguards.

**Non-Goals:**
- Rework week planning, change which dates the planner proposes, or change popup timing and save behavior.
- Treat a UI result as proof of server-side persistence.
- Perform write actions or validate against live employee sheets as part of this change.

## Decisions

1. Normalize the date at the counting boundary. Accept a string or a record with `dataStr`, then apply the same target-month and eligibility checks. This avoids changing the map's public shape or mutating its entries. Converting the whole map to one representation was rejected because it expands the change beyond the counting defect.

2. Track whether the popup selector offered at least one requested candidate. Return that evidence alongside the existing no-change outcome, and use it only when deciding whether phase 2 records a trapped hidden folga. The existing popup loop already avoids selecting or submitting a date that is absent from the selector. Relying on `no-change` alone was rejected because it conflates candidate exhaustion with rejection of an available date.

3. Keep the existing behavior for visible origins and for hidden candidates that were actually offered. A confirmed no-change after an available hidden candidate remains reportable as trapped; an unavailable candidate does not become a folga result.

4. Keep regression tests at the existing module boundaries: date-format counting in the rules suite, selector availability in popup tests, and phase-2 classification in adjustment tests. The full suite is the required regression gate because popup result metadata crosses module boundaries.

## Risks / Trade-offs

- The popup may still need to open to establish whether a hidden date is selectable; this design prevents a false trapped result but does not suppress that read-only candidate inspection. No save is submitted for a missing date.
- A candidate can be offered but rejected by FPW for a schedule-specific reason; retaining the trapped result in that case preserves existing reporting semantics.
- Live sheet layout or server behavior may differ from synthetic tests; any later runtime check must confirm the installed version and remain read-only unless separately authorized.

## Migration Plan

No persisted data migration is required. Validate with the repository test suite before publishing. The working-tree implementation can be rolled back by reverting only the scoped module/test changes; do not overwrite unrelated user changes. Live validation is a separate supervised step and is not implied by this proposal.