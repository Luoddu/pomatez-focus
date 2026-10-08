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
  time: number | null;
  restActions: RestKind[];
};
export type RestKind = "meal" | "nap" | "gym" | "night" | "break";
export type TemplateStage = {
  count: number;
  time: number | null;
  restActions: RestKind[];
};
export type JourneyTemplate = {
  id: string;
  name: string;
  endHour: number | null;
  stages: TemplateStage[];
};
export type TemplateLibrary = {
  version: 1;
  scope: string;
  defaultId: string;
  templates: JourneyTemplate[];
};
export type Journey = {
  version: 1;
  scope: string;
  day: string;
  stages: JourneyStage[];
  resting: string | null;
  passed: string[];
  restingAction: string | null;
  passedActions: string[];
  endHour: number | null;
};
export function journeyDay(now?: number, offset?: number): string;
export function journeyKey(scope: string, day: string): string;
export function newJourney(
  scope: string,
  day: string,
  id?: () => string,
  template?: JourneyTemplate
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
  rows: {
    id?: string;
    count: number;
    rest: string;
    time?: number | null;
    restActions?: RestKind[];
  }[],
  records?: FocusSession[],
  active?: FocusSession | null,
  id?: () => string
): Journey;
export function journeyRoad(total: number): {
  reached: number;
  next: number;
};
export function gymRestTarget(
  plan: Journey,
  records?: FocusSession[]
): { stageId: string; actionKey: string } | null;
export const REST_LABELS: Record<RestKind, string>;
export function restActions(stage: {
  rest: string;
  restActions?: RestKind[];
}): RestKind[];
export function defaultJourneyTemplate(): JourneyTemplate;
export function validateTemplate(v: unknown): JourneyTemplate;
export function templateLibraryKey(scope: string): string;
export function validateTemplateLibrary(
  v: unknown,
  scope: string
): TemplateLibrary;
export function readTemplateLibrary(
  storage: Pick<Storage, "getItem">,
  scope: string
): TemplateLibrary;
export function writeTemplateLibrary(
  storage: Pick<Storage, "setItem">,
  library: TemplateLibrary
): TemplateLibrary;
export function templateFromJourney(
  plan: Journey,
  name: string,
  id?: () => string
): JourneyTemplate;
export function applyJourneyTemplate(
  plan: Journey,
  template: JourneyTemplate,
  records?: FocusSession[],
  active?: FocusSession | null
): Journey;
