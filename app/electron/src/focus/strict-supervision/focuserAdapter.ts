// Derived from Focuser v0.11.5, MIT, Copyright (c) 2026 Focuser Contributors.
// See third-party/focuser/LICENSE and SOURCE.md for the frozen source and changes.
// Pure policy only: OS operations must be supplied by the reviewed host adapter.
import path from "path";

export type ProcessIdentity = { pid: number; name: string; executable: string; startedAt: string };
export type AppRules = { executables: readonly string[]; directories: readonly string[] };
// Wallpaper Engine is a desktop utility distributed inside Steam's game tree.
// Only its known runtime files qualify; never exempt the directory or a basename
// globally (projects and unrelated executables remain subject to game rules).
const WALLPAPER_RUNTIME = new Set([
  'wallpaper32.exe', 'wallpaper64.exe', 'launcher.exe',
  'bin\\webwallpaper32.exe', 'bin\\webwallpaper64.exe',
  'bin\\edgewallpaper64.exe', 'bin\\wallpaperui.exe',
  'bin\\wallpaperservice32.exe', 'bin\\wallpaperservice64.exe',
  'bin\\applicationwallpaperinject32.exe', 'bin\\applicationwallpaperinject64.exe',
  'bin\\apputil32.exe', 'bin\\winrtutil32.exe', 'bin\\winrtutil64.exe',
]);
function isWallpaperRuntime(exe: string, root: string): boolean {
  if (!root.endsWith('\\steamapps\\common')) return false;
  const appRoot = root + '\\wallpaper_engine\\';
  return exe.startsWith(appRoot) && WALLPAPER_RUNTIME.has(exe.slice(appRoot.length));
}
function windowsPath(value: string): string | null {
  // Reject relative, device and UNC paths. No filesystem resolution or traversal.
  if (!/^[a-z]:[\\/]/i.test(value) || /[\x00-\x1f]/.test(value)) return null;
  return path.win32.normalize(value).replace(/\\+$/, "").toLowerCase();
}

/** Narrow adaptation of block.rs AppRule: exact names or explicit game roots. */
export function matchesGame(p: ProcessIdentity, rules: AppRules, ownPid: number): boolean {
  if (!Number.isSafeInteger(p.pid) || p.pid <= 4 || p.pid === ownPid || !p.startedAt) return false;
  const exe = windowsPath(p.executable);
  if (!exe || path.win32.basename(exe) !== p.name.toLowerCase()) return false;
  if (rules.executables.some(n => /^[^\\/:]+\.exe$/i.test(n) && n.toLowerCase() === p.name.toLowerCase())) return true;
  return rules.directories.some(d => {
    const root = windowsPath(d);
    // A drive root must never become an app-block rule.
    return !!root && root.length > 2 && exe.startsWith(root + "\\") && !isWallpaperRuntime(exe, root);
  });
}

/** host.rs domain-boundary matching, restricted to explicit HTTP(S) domains. */
export function matchesDomain(url: string, domains: readonly string[]): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase().replace(/\.+$/, "").replace(/^www\./, "");
    return domains.some(d => {
      const rule = d.toLowerCase().replace(/^www\./, "");
      return /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(rule) && (host === rule || host.endsWith("." + rule));
    });
  } catch (_) { return false; }
}

export type CloseAction = { kind: "ask" | "terminate"; process: ProcessIdentity };
const identity = (p: ProcessIdentity) => JSON.stringify([p.pid, p.startedAt, p.executable.toLowerCase()]);

/** Adapted from closing.rs Closer. The caller revalidates identity before acting.
 * Unlike upstream's name-only state, PID/start-time/path distinguish replacements.
 * Every process gets a grace interval, including headless ones. A failed action
 * does not create an unbounded force-close loop; the host reports it explicitly.
 */
export class GameCloser {
  private closing = new Map<string, { since: number; forced: boolean }>();
  private lastNow = -Infinity;
  update(blocked: readonly ProcessIdentity[], now: number): CloseAction[] {
    if (!Number.isFinite(now)) { this.closing.clear(); this.lastNow = -Infinity; return []; }
    if (now < this.lastNow) { this.closing.clear(); this.lastNow = now; return []; }
    this.lastNow = now;
    const current = new Map(blocked.map(p => [identity(p), p]));
    for (const key of Array.from(this.closing.keys())) if (!current.has(key)) this.closing.delete(key);
    const actions: CloseAction[] = [];
    for (const [key, p] of Array.from(current.entries())) {
      const stage = this.closing.get(key);
      if (!stage) {
        this.closing.set(key, { since: now, forced: false });
        actions.push({ kind: "ask", process: { ...p } });
      } else if (!stage.forced && now - stage.since >= 30000) {
        stage.forced = true;
        actions.push({ kind: "terminate", process: { ...p } });
      }
    }
    return actions;
  }
}

export function sameProcess(expected: ProcessIdentity, actual: ProcessIdentity | null): boolean {
  return !!actual && identity(expected) === identity(actual) && expected.name.toLowerCase() === actual.name.toLowerCase();
}
