import { FocusTask, FocusSession } from "./session";
export type JourneyTask = {
  source: "local" | "feishu";
  key: string;
  sourceKey: string | null;
  title: string;
};
export type JourneySlot = {
  id: string;
  task: JourneyTask | null;
  binding: { sessionId: string; unit: number } | null;
};
export type JourneyStage = {
  id: string;
  rest: string;
  slots: JourneySlot[];
};
export type Journey = {
  version: 1;
  scope: string;
  day: string;
  stages: JourneyStage[];
  resting: string | null;
  passed: string[];
};
export function journeyDay(now?: number, offset?: number): string;
export function journeyKey(scope: string, day: string): string;
export function newJourney(
  scope: string,
  day: string,
  id?: () => string
): Journey;
export function taskRef(task: FocusTask): JourneyTask;
export function resolveTask(
  ref: JourneyTask | null,
  tasks: FocusTask[],
  scope: string
): FocusTask | null;
export function validateJourney(
  v: unknown,
  scope: string,
  day: string
): Journey;
export function readJourney(
  storage: Pick<Storage, "getItem">,
  scope: string,
  day: string
): Journey;
export function writeJourney(
  storage: Pick<Storage, "setItem">,
  plan: Journey
): Journey;
export function completion(
  plan: Journey,
  records: FocusSession[]
): Record<string, FocusSession>;
export function reconcileJourney(
  plan: Journey,
  records: FocusSession[],
  active: FocusSession | null
): Journey;
export function locked(
  plan: Journey,
  slot: JourneySlot,
  records: FocusSession[],
  active: FocusSession | null
): boolean;
export function moveSlot(
  plan: Journey,
  id: string,
  stageId: string,
  beforeId: string | null,
  records?: FocusSession[],
  active?: FocusSession | null
): Journey;
export function resizeStages(
  plan: Journey,
  rows: { id?: string; count: number; rest: string }[],
  records?: FocusSession[],
  active?: FocusSession | null,
  id?: () => string
): Journey;
export function journeyRoad(total: number): {
  reached: number;
  next: number;
};
