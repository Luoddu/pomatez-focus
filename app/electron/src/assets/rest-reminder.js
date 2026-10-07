"use strict";
let state = null, busy = false, received = false;
const buttons = Array.from(document.querySelectorAll("button"));
function render(value) {
  state = value;
  document.querySelector("p").textContent = value ? value.line : "提醒已结束";
  buttons.forEach(button => { button.disabled = busy || !state; });
}
window.restReminderApi.onState(value => { received = true; render(value); });
window.restReminderApi.state().then(value => { if (!received) render(value); }).catch(() => render(null));
for (const button of buttons) button.addEventListener("click", async () => {
  if (busy || !state) return;
  busy = true; buttons.forEach(button => { button.disabled = true; });
  try { await window.restReminderApi.act({ key: state.key, action: button.dataset.action }); }
  catch (_) { document.querySelector("p").textContent = "操作未完成，请重试"; }
  finally { busy = false; buttons.forEach(button => { button.disabled = !state; }); }
});
