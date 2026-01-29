/**
 * Résultat du retour de véhicule
 */
export interface VehicleReturnResult {
  contractId: string;
  success: boolean;
  message: string;
  mileageAtDelivery: number;
  mileageAtReturn: number;
  totalMileage: number;
  mileageLimit?: number;
  mileageOverage: number;
  mileageOverageFee: number;
  fuelLevelAtDelivery: number;
  fuelLevelAtReturn: number;
  fuelCharge: number;
  damages: any[];
  totalDamageCost: number;
  returnedAt: Date;
}
