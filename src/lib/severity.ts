// src/lib/severity.ts
export type Severity = "urgent" | "medium" | "low";

export function normalizeScore(score: number) {
  return score > 1 ? Math.min(score / 100, 1) : Math.max(Math.min(score, 1), 0);
}

export function scoreToSeverity(
  rawScore: number,
  bounds = { urgent: 0.8, medium: 0.5 }
): Severity {
  const s = normalizeScore(rawScore);
  if (s >= bounds.urgent) return "urgent";
  if (s >= bounds.medium) return "medium";
  return "low";
}

export const severityStyles = {
  urgent: {
    label: "Urgent",
    twBadge: "bg-red-600 text-white",
    twBorder: "border-red-500",
    hex: "#dc2626",
  },
  medium: {
    label: "Medium",
    twBadge: "bg-yellow-400 text-black",
    twBorder: "border-yellow-400",
    hex: "#f59e0b",
  },
  low: {
    label: "Low",
    twBadge: "bg-green-600 text-white",
    twBorder: "border-green-500",
    hex: "#16a34a",
  },
} as const;

export function borderClassFor(score: number) {
  const sev = scoreToSeverity(score);
  return `border-l-4 ${severityStyles[sev].twBorder}`;
}
