export const PROJECT_TYPES = [
  "research",
  "delivery",
  "longterm",
  "software",
  "personal",
  "misc",
] as const;
export type ProjectType = typeof PROJECT_TYPES[number];

// Only the six existing project-type options are recognized. An unknown or
// ambiguous value must not silently recolor historical work.
export function projectTypeOf(label: string): ProjectType | undefined {
  const value = label.trim();
  const matches: ProjectType[] = [];
  for (const [pattern, type] of [
    [/科研/, "research"],
    [/项目交付/, "delivery"],
    [/长线/, "longterm"],
    [/短线/, "software"],
    [/个人生活/, "personal"],
    [/杂事/, "misc"],
  ] as [RegExp, ProjectType][])
    if (pattern.test(value)) matches.push(type);
  return matches.length === 1 ? matches[0] : undefined;
}
