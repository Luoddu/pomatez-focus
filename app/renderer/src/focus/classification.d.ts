import type { FocusSession, ProjectType } from "./session";
export type Category = ProjectType | "unclassified";
export type CategoryFilter = Category | "all";
export const PROJECT_TYPES: ProjectType[];
export function recordCategory(
  record: Pick<FocusSession, "task" | "colorOverride">
): Category;
export function recolorSession(
  record: FocusSession,
  type?: ProjectType
): FocusSession;
export function mergeRecordColor(
  local: FocusSession,
  remote: FocusSession
): FocusSession;
