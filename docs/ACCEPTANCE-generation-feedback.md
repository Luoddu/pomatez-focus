# P0-POMO-015 — visible generation feedback

Baseline `73f93a474690cc79205933ff1f7c5b7dca84ba56` (preview.40).
Contract/four-source precheck: [TASK-P0-POMO-015](TASK-P0-POMO-015.md).

## Behavior and boundaries

Repeat-generation used silentGenerating internally but exposed only generating
to the header, hiding progress and the busy state. Both paths now show the same
fixed-width button with a thin week-goal-style track and real stage text. No extra
row is inserted. A sweep animates while waiting; reduced-motion preference stops it.
The existing background path still allows selecting and starting a focus.

Progress weights are an explicit step estimate, not remaining time or transferred
bytes: connect 8, tasks 22, records 38, plan 52, write 55–85 (real written/total),
verify 90, refresh 96. Only successful generation plus refresh reaches 100.
The tooltip/accessibility text identifies the estimate. Existing generator,
Feishu API, permissions, storage and timer semantics are unchanged.

Result stays in the button for three seconds: updated, already latest, no eligible
tasks or skipped items. Failure shows retry feedback, retains the existing error
toast and never shows 100. Repeat click is blocked synchronously by an in-flight
ref and visually by the disabled generation button; other background interactions
remain available. Old finish timers are cancelled when a new attempt starts.

## Validation

- All focus unit/adapter tests: 164/164 PASS.
- Full desktop build: PASS.
- Updated silent-generate-desktop real main/preload/renderer scenario: PASS.
  Immediate progress, actual stage and batch fraction, duplicate click rejection,
  unchanged overview position, start focus during generation, held refresh at 96,
  real completion at 100, no-change feedback, error then successful retry, result
  clearing, first-generation path and narrow header/no overflow all checked.
  Synthetic isolated profile only; no live Feishu writes or visible test window.
- Desktop: 21/21 plus cold-process restart PASS.
- Portrait/landscape: 12/12 PASS.
- Local-first append: both cold-process phases PASS; new tomato usability retained.
- Test harness uses the existing <=2 DIP native-resize tolerance and actual
  session status `active`. Initial stale-build execution was discarded; the
  successful run followed completed production compilation. No product workaround.

Evidence: ignored artifacts/generation-*.log. Full shot-app flow reports zero
failed checks, including compact progress, write fraction and completion result.
Visually inspected its offscreen-rendered app-board-generating.png: header track
fits beside the window controls, with no extra row. This complements the real
main/preload test; it does not replace that lifecycle evidence.

## Review / Learning / rollback

Implementer diff/lifecycle review only; no independent-agent review claimed.
No other worktree/root file, private task, credential, user installation or network
setting changed. Source remains based on verified public mainline; release uses
the existing guarded helpers and standing user authorization. Previous installer
can be restored without data migration.

Learning-Review: none — real-owner lifecycle verification is already covered by
UI-129-01; this app display change adds no new cross-task engineering lesson.
