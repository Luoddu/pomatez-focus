# P0-POMO-028 Mac personal release receipt · 2026-09-27

Status: REVIEW / published personal preview; actual friend-device acceptance remains open.

- Baseline: 032317872ea6c57c260e5babacf95c052f899f5b, Windows preview.62.
- Shipped source: 4b976a40534f87f1134cc3fbc5c44d1d88d3bdd9.
- [Mac v0.1.0-mac.1 release](https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-mac.1), published 2026-09-27 04:19:23 UTC; prerelease, not Latest.
- [Native arm64 macOS CI](https://github.com/Luoddu/pomatez-focus/actions/runs/36293342572): all steps passed. Node22.23.2, frozen yarn.lock, Electron34.5.8, builder25.1.8, osx-sign1.3.1; no credentials or personal data supplied.

## Evidence and scope

Four-source precheck and allowed scope: [task card](TASK-P0-POMO-028.md). Mac config/version/signing extension, guarded native package command, manual CI, manual Mac update UI, native menu roles/icon, environment-specific About version; one shared build helper switched preload compilation to the public esbuild API. Windows NSIS settings and source preview counter unchanged.

1. Windows `npm run test:focus:all`: 225/225, including real pinned GitHubProvider mixed Mac/Windows feed test. `npm run build:focus`: passed both before and after cross-platform esbuild change; same renderer main hash. Hidden muted updater test: normal check/download/install flow plus actual HTTP404 and SHA512 rejection passed. Hidden muted desktop test: 21/21.
2. Mac clean install + `test:focus:all`: 225/225. Native arm64 DMG and ZIP generated. Actual packaged executable architecture is arm64; `codesign --verify --deep --strict` passed. Packaged production renderer launched hidden with isolated temporary profile and `--mute-audio`, then exited successfully. ASAR metadata/version/provenance checked, runtime-file exclusions checked.
3. Mac real Electron main/preload/renderer desktop regression: 21/21 (timer, pause, overtime, save/discard, isolation, window sizing, suspend, reload). Separate actual process restart preserved focus and excluded offline gap.
4. Downloaded CI assets were hashed locally, then GitHub server SHA256 and byte lengths for all four assets matched before publishing. DMG: 98,421,507 bytes, `4a67d244b60570b83135859c56d3e4f1e592e2a68f9c8c021469465dc31ee0c8`. ZIP: 95,037,882 bytes, `183e0b4ed8fb0c15f4ecfe0e2ab6c60a79e0cfa5245712ca5303c4bf21a40c81`.
5. After Mac publication, actual electron-updater6.8.3 GitHubProvider consumed live public releases.atom (read via gh HTTPS transport), selected **v0.1.0-preview.62**, and fetched only that release's preview.yml. Windows's six existing asset digests unchanged; preview.yml remains `4de7e78c86c229f3f55695e88c6c57ba08e4ab04c8849391e09c6aefcb9290b9`. No Windows package/tag/feed was replaced.

Initial CI failures were understood setup issues, not hidden failures: run36293052199 missed generated shareables declarations after disabled install scripts; added the existing Rollup prerequisite. Run36293175232 identified native esbuild CLI being passed to node on Mac; switched to the same supported buildSync interface already used for updater bundling. Final run verifies both fixes end-to-end.

## Limitations / handoff

- Ad-hoc integrity signing, **no Developer ID or notarization**. Friend's first Gatekeeper installation, sounds, actual keyboard/menu interaction and their own Feishu connection not yet tested on a personal Mac. CI is not a substitute for those checks. Instructions: [Mac guide](MAC-PERSONAL.md), [Apple installation guidance](https://support.apple.com/102445).
- Mac release is a manual monthly snapshot; no automatic monthly job or unsigned auto-installer. Continue shared-source development on the one public branch. Next monthly release increments only Mac config/version, reruns CI, verifies artifacts and publishes a new Mac prerelease. See guide for exact process.
- No root repository changes, Windows user installation/restart, real Feishu writes or credential copying. Root concurrent changes excluded. No new runtime dependency or schema/data migration.
- Rollback: revert task's Mac adaptation commits or withdraw this Mac release; existing Windows preview.62 binaries remain available. Mac users replace app bundle while preserving local data.
- Learning review: none. Reused pinned official updater-channel, mac.sign/osx-sign and esbuild interfaces; task-specific platform/build evidence is recorded here, without a new root Learning entry.

Concurrent source update: after the Mac build was frozen and published, independent P0-POMO-029 source d942d3e advanced the public branch. This handoff's four documentation files do not overlap it. Reapplied only documentation on that new baseline in a fresh task branch; no merge/rebase/history rewrite, product changes or replacement of the shipped Mac snapshot.
