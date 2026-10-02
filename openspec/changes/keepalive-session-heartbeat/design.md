- Session expiry recovery follows `AGENT.md`: close the blocked page, reopen Oracle Fusion, select **Ponto FPW**, then go to **Lançamentos** > **Justificativas** in the new FPW page. The heartbeat cannot restore an expired login.
# Design

## Context

See `proposal.md` for motivation and `specs/session-liveness/spec.md` for behavioral requirements. The userscript runs on the MyWay Justificativas frameset and already has a two-minute keepalive timer. The prior implementation reloaded a content frame. A same-origin GET to the current page returned HTTP 200 in the authenticated browser, but that short request does not establish that the application server will preserve the session beyond its inactivity timeout.

## Goals / Non-Goals

**Goals:**
- Avoid full-page and frame navigation as a keepalive side effect.
- Keep heartbeat behavior isolated to the experimental `test` branch.
- Make the last request timestamp and result inspectable in runtime state.

**Non-Goals:**
- Bypass Oracle authentication, extend server policy, or guarantee session duration without end-to-end evidence.
- Interact with employee controls or modify justifications/time entries.
- Change the stable `main` userscript.

## Decisions

- Use `fetch` with `GET`, `credentials: 'same-origin'`, and `cache: 'no-store'` against `window.location.href`. This uses the current browser session and avoids cross-origin frame access. A navigation fallback is intentionally excluded because it would recreate the disruptive behavior.
- Start one heartbeat immediately, then repeat every two minutes. Skip a scheduled request while the automation state is running; continue on the next interval.
- Store attempt and result timestamps with HTTP status, redirect state, response URL, or request error in the shared runtime state. A redirect or non-2xx response is a failure.
- Bump the test userscript and environment identity to `9.6-test`, so Tampermonkey can recognize the updated script. Raw module downloads may become available as soon as GitHub publishes the commit; the installed userscript wrapper may still require an explicit Tampermonkey update check.
- Verify in stages: parse checks; raw GitHub content/version checks; browser runtime state and heartbeat result; then unattended observation beyond the measured expiry interval. Do not mark server-side session preservation proven based only on HTTP 200.

## Risks / Trade-offs

- [The MyWay endpoint may return 200 without refreshing the server session] -> Observe the workflow for longer than the real inactivity timeout and record whether it remains authenticated.
- [A client-side timeout may expire independently of server activity] -> Monitor the visible workflow and redirect state; treat any expiry prompt as a failed test.
- [A request every two minutes adds low-volume traffic] -> Keep a single timer, skip during automation, and stop the timer through the existing stop helper when needed.
- [Tampermonkey may not immediately fetch a changed wrapper script] -> Increment `@version`, verify the installed runtime reports `9.6-test`, and use the extension's update check before the browser test.

## Migration Plan

1. Commit the implementation and planning artifacts to branch `test` only.
2. Verify the raw test files expose version `9.6-test` and the new heartbeat code.
3. Update the separate test installation in Tampermonkey and reload the authenticated Justificativas page.
4. Confirm runtime result and unchanged page/frame URLs, then observe beyond the measured inactivity timeout.
5. Roll back by reverting the test commit or restoring the previous test userscript version. `main` remains untouched.

## Open Questions

- What is the actual configured inactivity timeout for the MyWay/Oracle workflow? Measure it during controlled observation; the heartbeat is not considered proven until this interval is exceeded without expiry.