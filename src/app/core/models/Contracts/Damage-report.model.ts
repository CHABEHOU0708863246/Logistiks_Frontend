import { DamageSeverity } from "../Enums/Logistiks-enums";

/**
 * Rapport de dommage
 */
export interface DamageReport {
  description: string;
  severity: DamageSeverity;
  estimatedCost: number;
  photos: string[];
  notes?: string;
}
