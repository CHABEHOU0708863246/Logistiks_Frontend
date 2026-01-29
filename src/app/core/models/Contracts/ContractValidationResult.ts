/**
 * Résultat de validation de contrat
 */
export interface ContractValidationResult {
  customerEligible: boolean;
  vehicleAvailable: boolean;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  calculatedTotalAmount: number;
  calculatedEndDate: Date;
}
