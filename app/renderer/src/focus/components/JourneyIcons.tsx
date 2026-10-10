import React from "react";
import { RestKind } from "../journey.js";

export function JourneyRestIcon({ kind, lit = false }: { kind: RestKind; lit?: boolean }) {
  return (
    <svg
      className={`journey-rest-icon icon-${kind}${lit ? " is-lit" : ""}`}
      width="15"
      height="15"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === "meal" ? (
        <>
          <ellipse cx="12" cy="8" rx="9" ry="2" />
          <path d="M3 8c0 7 4 10 9 10s9-3 9-10M8 21h8" />
        </>
      ) : kind === "nap" ? (
        <g
          fill="var(--card)"
          strokeWidth=".85"
          fontFamily="Segoe UI, sans-serif"
          fontWeight="600"
        >
          <text x="1" y="22" fontSize="9">
            Z
          </text>
          <text x="7" y="16" fontSize="12">
            Z
          </text>
          <text x="12" y="11" fontSize="14">
            Z
          </text>
        </g>
      ) : kind === "night" ? (
        <path d="M19 15a8.5 8.5 0 0 1-10-10A9 9 0 1 0 19 15Z" />
      ) : kind === "gym" ? (
        <>
          <path d="m8 8 8 8M4 9 9 4M15 20l5-5M2 7l5-5M17 22l5-5M4 4l16 16" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 8v8M15 8v8" />
        </>
      )}
    </svg>
  );
}
export function JourneyOutline({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="13.5"
        r="8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M8 4l4 2 3-4"
        fill="none"
        stroke="#789878"
        strokeWidth="1.5"
      />
    </svg>
  );
}
export function JourneySettingsIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M3 6h18M3 12h18M3 18h18M8 3v6M16 9v6M10 15v6" />
    </svg>
  );
}
