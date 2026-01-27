import { DamageReport } from "./Damage-report.model";

/**
 * Informations de retour du véhicule
 */
export interface ReturnInfo {
  date?: Date;
  location?: string;
  mileageAtReturn?: number;
  fuelLevel?: number;
  conditionNotes?: string;
  damages: DamageReport[];
  returnedBy?: string;
  receivedBy?: string;
  depositRefunded: boolean;
  refundAmount?: number;
}
