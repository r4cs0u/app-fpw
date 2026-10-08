# Design

## Context

See `proposal.md` and the spec delta for the corrected rule. A week with no absence marker can still contain a non-worked destination: a visible/hidden holiday or a Sunday omitted from the page's day records. The current map computes missing dates in `folgasOcultas` only for the target month's final week, so phase 3 cannot reliably consider hidden Sundays in other mapped weeks.

## Goals / Non-Goals

**Goals:**
- Determine whether a week has an eligible non-worked destination before retaining a folga as trapped.
- Expose a hidden Sunday for every mapped week when that Sunday has no registered day record.
- Keep existing visible-holiday and hidden-holiday phase 3 behavior.

**Non-Goals:**
- Treat arbitrary missing weekdays as non-worked destinations.
- Change Sunday priority when choosing an eligible absence in phases 1 or 2.
- Change popup handling, retries, approvals, or the employee list.

## Decisions

- Derive each mapped week's Sunday from its Monday-based `semanaId`; expose it as hidden only when `datasRegistradas` has no entry for that date. This avoids assuming that every missing weekday is a rest day.
- Keep phase 3's existing visible-holiday then hidden-holiday priority, and consider the hidden Sunday after those candidates. A visible or hidden holiday remains eligible even when there is no absence marker.
- Retain a folga as trapped only when no absence marker, supported holiday, or hidden Sunday destination is available. Exclude the folga's current date from destination candidates. When the only destination is a hidden Sunday, use the existing folga row as the popup anchor and label the action distinctly for logging.
- Test the map and planner independently with synthetic weeks, including a hidden Sunday outside the final week, no eligible destination, and preservation of current holiday ordering.

## Risks / Trade-offs

- A missing Sunday record might reflect incomplete page data rather than a hidden rest day. → Derive only the known Sunday date from a mapped week and leave other missing dates unclassified.
- The hidden-Sunday route differs from the legacy planner's holiday fallback. → Keep it in the pure planner, give it a distinct action type, and test it without live sheet data.

## Migration Plan

No data migration is required. Validate with the full synthetic Node test suite before publishing the experimental module; live validation, if performed, must remain supervised and must not trigger approval.
