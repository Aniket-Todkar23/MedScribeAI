import type { LucideIcon } from "lucide-react";

export type PatientTabId = "health" | "reports" | "medications" | "appointments" | "chat";

export interface PatientTab {
  id: PatientTabId;
  label: string;
  icon: LucideIcon;
}
