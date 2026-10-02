# Tasks

## 1. Safe heartbeat implementation

- [x] 1.1 Replace frame reload with an immediate and periodic same-origin GET; verify `node --check` passes and no navigation fallback remains
- [ ] 1.2 Skip the request while automation is running and retain attempt/result diagnostics; verify success, failure, redirect, and skip outcomes in runtime
- [x] 1.3 Bump only the test userscript identity to `9.6-test`; verify entrypoint and environment metadata agree

## 2. System documentation

- [x] 2.1 Document architecture, safety boundaries, heartbeat design, and evidence in `SSD.md`; verify it links this change and distinguishes observed facts from pending proof

## 3. Test-branch deployment and validation

- [x] 3.1 Run syntax checks and OpenSpec validation; verify all JavaScript files parse and the change artifacts validate
- [ ] 3.2 Commit and push the change to branch `test`; verify the remote raw entrypoint and core contain `9.6-test` and the heartbeat implementation
- [ ] 3.3 Update the separate Tampermonkey test installation and reload MyWay; verify `AF.test` reports `9.6-test`, the timer is active, and the page/frame URLs remain unchanged after a heartbeat
- [ ] 3.4 Run the approved read-only analysis interaction; verify completion/log state and confirm no update/adjustment action was triggered
- [ ] 3.5 Observe the authenticated workflow beyond the measured inactivity timeout; record duration and result, and only then mark session preservation as proven