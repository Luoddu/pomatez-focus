export function durationText(value: number): string;
export function clockText(value: number): string;
export function quotaDisplay(seconds: number, quotaMinutes: number): { over: boolean; ratio: number; clock: string; label: string; excess: string; laps: number };
export function displayUsage<
  T extends { usage: any; status: string; live?: any }
>(state: T, now: number): T["usage"];
export function monitorDetail(
  state: {
    status: string;
    message: string;
    updatedAt: number | null;
    live?: any;
  },
  now: number
): string;
