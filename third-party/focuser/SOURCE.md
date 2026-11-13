# Focuser thin adaptation

Upstream: https://github.com/aadeshrao123/Focuser

Fixed release: v0.11.5. Annotated tag object a0d8a3b1307b8114d171dd297fe19b0f77b6f7cd resolves to commit **14cbfdb3d55d3bc669bc9a39a6eddb9915e61844**. License: MIT, retained in LICENSE. No upstream binary, installer or downloaded code was executed.

`app/electron/src/focus/strict-supervision/focuserAdapter.ts` ports the narrow exact executable matching and domain-boundary matching, and the graceful-close state machine. Sources at that commit:

| File | Relevant lines | SHA-256 of UTF-8/LF evidence snapshot | Bytes |
|---|---|---|---|
| crates/focuser-common/src/block.rs | 114–138 AppRule | 68b90a955be79d5bf5dc1ec001b13da58829d50e59d941aaaf59be12f9689f9b | 11732 |
| crates/focuser-common/src/host.rs | 23–104 canonical_host/host_matches | bfef57a19c17e6bd36d7bb4af5d63cb6ec4a4dc85dc8f9749b4580263a019846 | 12437 |
| crates/focuser-common/src/process.rs | 21–36 process exclusions | b492d6561c87ff93ada5f2bbb60b697bf488b4ecf848f54cdf35b3c9b791c6a8 | 28082 |
| crates/focuser-ui/src/closing.rs | 22–106 Closer | e1c12f3c386d4b6ceb2e7fb327ef1bf12b283d5a31b30c4e02f1af32bf477e4e | 24304 |
| crates/focuser-ui/src/blocker.rs | 95–176 system integration | 40ba5ea875bea18d2e1a9b5aa631d7f7805c2755b9d7ec765978c0ab09bb735d | 35620 |
| LICENSE | whole | 9d64045de1251e62c7dcc6ed037b38738ea971c0cf193e681983db7094ce4749 | 1077 |

Retrieve each original at `https://raw.githubusercontent.com/aadeshrao123/Focuser/14cbfdb3d55d3bc669bc9a39a6eddb9915e61844/<file>`. Local evidence lives in ignored `artifacts/p089/upstream`; it is not a runtime dependency. Snapshots came from the fixed contents API, normalized to UTF-8/LF; hashes are snapshot hashes, not Git blob IDs.

## Deliberate adaptation

- TypeScript port runs in the existing Electron runtime. This machine has no cargo/rustc on PATH; no compiler installation is assumed. Full upstream engine would add its SQLite, pomodoro and allowance sources; Farm keeps its existing AW usage and confirmed-record progress.
- Explicit Windows game directory rules supplement upstream exact names. Normalization uses path-component boundaries, rejects drive roots/relative/UNC/device paths. Window title/keyword/all-internet rules are excluded to avoid matching work pages that discuss games.
- Host matching accepts only HTTP(S) and explicit dotted domains. Upstream bare-name and wildcard matching is excluded; network enforcement is not implemented by this pure matcher.
- Close state is keyed by PID, creation time and executable path, rather than the upstream name-only key. The eventual OS adapter must re-read that identity immediately before each action. It must report denial/failure rather than claim success.
- Each target receives 30 seconds of grace, even without a visible window; one terminate request per identity, not a repeated termination loop. Time input must be monotonic. Backward time invalidates pending actions.
- No upstream hosts edits, uninstall prevention, browser-closing enforcement, elevated login task, DB, tracker or scheduler is imported.

## Adoption / maintenance boundary

Whole-app adoption provides more enforcement but introduces a separate configuration, allowance source, privileged lifecycle and browser-closing behavior. The bounded port reuses three small mechanisms while keeping Farm policy authoritative. Building a new arbitrary wildcard/keyword engine offers no required benefit and is excluded. First checkpoint budget: fixed-source review, pure module and six regression tests; this is **not live enforcement**.

Updates require reviewing the same fixed source files plus regression tests; no floating download or self-update. Exit path: remove the one adapter and its tests/attribution if unused; no runtime state or system changes to unwind. A native process adapter, browser request enforcement and full lifecycle acceptance are still required before activation.
