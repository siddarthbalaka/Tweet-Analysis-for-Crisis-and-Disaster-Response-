// src/components/ui/severity-badge.tsx
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { scoreToSeverity, severityStyles } from "@/lib/severity";

export function SeverityBadge({ score }: { score: number }) {
  const s = scoreToSeverity(score);
  return <Badge className={severityStyles[s].twBadge}>{severityStyles[s].label}</Badge>;
}
