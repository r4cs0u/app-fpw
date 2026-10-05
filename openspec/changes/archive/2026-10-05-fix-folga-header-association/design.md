# Design

## Context

See `proposal.md` for the observed failure. In `20-mapa.js`, input date and heading text are resolved by traversing preceding DOM elements. A containing `TBODY` can include a date-bearing row and a separate row with the word “Folga”; using the container's aggregate text can therefore associate the date from one row with the category from another. The mapper then uses the heading text to populate `folgas`.

The current worktree also contains local changes in `20-mapa.js` and `tests/mapa.test.js` that track hidden Sundays. Those changes are outside this proposal and must be preserved.

## Goals / Non-Goals

**Goals:**

- Resolve the date and folga classification from the same date-bearing heading row.
- Ensure unrelated text elsewhere in a grouped table section cannot change a mapped entry's folga classification.
- Cover both the false-positive case and detection of the actual folga with a synthetic DOM regression test.

**Non-Goals:**

- Changing which dates are included for the target month or its final week.
- Changing weekly planning, adjustment selection, or write behavior.
- Changing absence or holiday classification, except where a shared extraction change is strictly necessary to keep date-heading association correct.
- Modifying the stable `main` userscript or changing the existing mapper output contract.

## Decisions

- Treat a date-bearing heading row as the source of both the date and its day category. A surrounding container may help locate candidate rows, but its aggregated text must not be used to classify the entry.
- Avoid assumptions about row counts, employee order, or fixed DOM positions. Select the relevant row through its date and structural relationship to the input.
- Add a synthetic DOM fixture to `tests/mapa.test.js` that reproduces a grouped `TBODY` with a non-folga date heading and a separate row containing unrelated “Folga” text, plus a folga heading for another date. Use the existing Node test setup rather than introducing a DOM dependency.
- Prefer row-specific extraction over narrowing the `Folga` regular expression or ignoring every `TBODY`: the former still consumes mixed text, while the latter could reject valid page layouts.

## Risks / Trade-offs

- The live page's table structure may vary between periods. Keep the resolver structural and test the observed grouping so a layout variation cannot silently promote unrelated text to a folga classification.
- A missing or ambiguous date-bearing heading must not fall back to classifying from an enclosing container; this may leave an entry unclassified, but avoids choosing a wrong adjustment origin.
