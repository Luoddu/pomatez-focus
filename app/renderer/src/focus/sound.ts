// 提示音：Web Audio 实时合成，不使用任何音频素材文件。
// 开关独立存于 pomatez-focus-sound-v1，不改动既有 pomatez-focus-v1 记录键。
const SOUND_KEY = "pomatez-focus-sound-v1";

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "1" : "0");
  } catch {
    /* 私密模式等写入失败时按当次内存态处理 */
  }
}

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  try {
    const AC =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

// 正弦单音 + 指数衰减包络；8ms attack 避免爆音
function tone(
  c: AudioContext,
  freq: number,
  start: number,
  dur: number,
  peak = 0.18
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

// 计时到点：上行三音 chime（C5→E5→G5，约 0.6s）
export function playTimeUp() {
  if (!isSoundEnabled()) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  tone(c, 523.25, t, 0.22);
  tone(c, 659.25, t + 0.16, 0.22);
  tone(c, 783.99, t + 0.32, 0.3);
}

// 休息结束：下行两音（G5→E5，约 0.4s）
export function playRestEnd() {
  if (!isSoundEnabled()) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  tone(c, 783.99, t, 0.18);
  tone(c, 659.25, t + 0.15, 0.26);
}
