# Design

## Context

See `proposal.md` for the observed failure. In `20-mapa.js`, every day of the last week that has no row on the page is added to `semana.folgasOcultas`. Phase 2 in `35-planejamento.js` (`planejarFase2Rodada`) tries visible folgas first and then every entry of `folgasOcultas`, de-duplicated and skipping used or already attempted dates. The mapper also already records `semana.domingosOcultos` (hidden Sundays of every mapped week) and `semana.feriadosOcultos` (hidden supported holidays), which phase 3 uses.

Phase 2 and the mapper behave the same way in the stable `main` line. This change is an intentional, user-approved difference.

## Goals / Non-Goals

**Goals:**

- Stop phase 2 from using a hidden ordinary weekday as an adjustment origin.
- Reuse data the mapper already produces, keeping the planner pure and free of page dependencies.

**Non-Goals:**

- Changing the mapper output, including `folgasOcultas`.
- Changing visible-folga priority, destination selection, attempt history, phase 1, phase 3, popup interaction, or the rejection and fixed-hours handling.
- Changing which dates belong to the target month or last week.
- Modifying `main` or `99-main.user.js`.

## Decisions

- Filter in the planner, not the mapper. The hidden-candidate list in `planejarFase2Rodada` is reduced to dates that also appear in the same week's `domingosOcultos` or `feriadosOcultos`, preserving the original date order and the existing de-duplication. Alternative considered: change `folgasOcultas` in the mapper. Rejected because it changes an existing output contract and its tests for a rule that belongs to planning.
- Keep a candidate key per date, so the existing attempt history and used-date handling apply unchanged to the reduced list.
- Report an empty reduced list through the existing "no valid hidden candidate" outcome, so the workflow ends phase 2 without opening a popup.
- Treat existing phase 2 tests that use hidden weekdays as valid candidates as encoding the old behavior. Update their fixtures to supply hidden Sundays and holidays, and add explicit cases for the three situations in the spec.

## Risks / Trade-offs

- A real folga that falls on a weekday and is absent from the sheet will no longer be moved by phase 2. The evidence so far shows no case where a folga is hidden, and a visible folga is found by heading. Review live results and widen the rule with evidence if such a case appears.
- Holiday detection relies on the supported holiday list already used by the mapper. A local holiday missing from that list is not treated as a hidden folga origin; this fails safe because no adjustment is attempted.
- The popup remains the final arbiter of an actual swap, but it cannot tell whether a day was a folga. Narrowing the candidates is therefore the only protection against moving a worked day.
