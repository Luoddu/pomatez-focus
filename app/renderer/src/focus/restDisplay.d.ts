export function durationText(value: number): string;
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
