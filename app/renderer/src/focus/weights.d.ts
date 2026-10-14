import type { FocusSession } from "./session";
import type { Category } from "./classification";
export type TomatoWeights = Record<Category, number>;
export const WEIGHTS_KEY: string;
export const WEIGHT_CATEGORIES: Category[];
export const DEFAULT_WEIGHTS: TomatoWeights;
export function validateWeights(value: unknown): TomatoWeights;
export function loadWeights(storage: Pick<Storage, "getItem">): TomatoWeights;
export function saveWeights(storage: Pick<Storage, "setItem">, weights: TomatoWeights): TomatoWeights;
export function effectiveCount(records: FocusSession[], weights?: TomatoWeights): number;
export function effectiveWeekCount(records: FocusSession[], now: number, weights?: TomatoWeights): number;
export function hasDiscountedRecords(records: FocusSession[], weights?: TomatoWeights): boolean;
export function formatEffective(n: number): string;

export function tomatoWeight(record: Pick<FocusSession, "task" | "colorOverride">, weights?: TomatoWeights): number;
export function effectiveRecords(records: FocusSession[], weights?: TomatoWeights): FocusSession[];
export function effectiveToneRecords(records: FocusSession[], weights?: TomatoWeights, limit?: number): FocusSession[];

export function effectiveTaskProgress(task: FocusSession["task"], records: FocusSession[], now: number, weights?: TomatoWeights): {done:number; planned:number; missing:number};
