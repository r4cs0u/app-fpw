# Design

## Context

See `proposal.md` for the incident and intended behavior. The map emits hidden dates as strings, while visible schedule entries are records. Analysis currently counts visible folgas when a week has visible absences or holidays, while Phase 3 can also attempt hidden Sundays and supported hidden holidays. Phase 2 distinguishes an unavailable popup candidate from a rejected available candidate; Phase 3 does not yet apply that distinction.

## Goals / Non-Goals

**Goals:**
- Keep Analysis and pre-analysis counts consistent with the hidden-date forms produced by the map.
- Count a visible folga when its week has an eligible Phase 3 hidden destination, without claiming that the popup will accept it.
- Preserve the distinction between an unavailable popup date and an available candidate that did not change the schedule in both Phase 2 and Phase 3.
- Preserve the existing candidate order, popup confirmation rules, and write safeguards.

**Non-Goals:**
- Rework week planning, change which dates the planner proposes, or change popup timing and save behavior.
- Treat a UI result as proof of server-side persistence.
- Perform write actions or validate against live employee sheets as part of this change.

## Decisions

1. Normalize the date at the counting boundary. Accept a string or a record with `dataStr`, then apply the same target-month and eligibility checks. This avoids changing the map's public shape or mutating its entries. Converting the whole map to one representation was rejected because it expands the change beyond the counting defect.

2. Track whether the popup selector offered at least one requested candidate. Use that evidence when deciding whether Phase 2 or Phase 3 records a trapped folga. The existing popup loop already avoids selecting or submitting a date that is absent from the selector. Relying on `no-change` alone was rejected because it conflates candidate exhaustion with rejection of an available date.

3. Align the Analysis candidate count with the planner's existing eligible Phase 3 destinations: hidden Sundays and supported hidden holidays only. Do not treat arbitrary absent weekdays as folgas or candidates. This makes the count describe attempts the adjustment can plan, not guaranteed popup success.

4. Keep regression tests at the existing module boundaries: candidate counting in rules tests, selector availability in popup tests, and Phase 2/3 classification in adjustment tests. The full suite is the required regression gate because popup result metadata crosses module boundaries.

## Risks / Trade-offs

- The popup may still need to open to establish whether a hidden date is selectable; this design prevents a false trapped result but does not suppress that read-only candidate inspection. No save is submitted for a missing date.
- A candidate can be offered but rejected by FPW for a schedule-specific reason; retaining the trapped result in that case preserves existing reporting semantics.
- Analysis can count a hidden-destination candidate that the popup later does not offer; the adjustment must then avoid classifying it as trapped solely from candidate exhaustion.
- Live sheet layout or server behavior may differ from synthetic tests; any later runtime check must confirm the installed version and remain read-only unless separately authorized.

## Migration Plan

No persisted data migration is required. Validate with the repository test suite before publishing. The working-tree implementation can be rolled back by reverting only the scoped module/test changes; do not overwrite unrelated user changes. Live validation is a separate supervised step and is not implied by this proposal.