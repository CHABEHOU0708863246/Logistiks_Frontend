/**
 * Conditions du contrat
 */
export interface ContractTerms {
  latePaymentFee: number;      // Pénalité retard (Défaut: 5000)
  damageFee: number;           // Franchise dommages (Défaut: 100000)
  earlyTerminationFee: number; // 2 semaines (Défaut: 2)
  mileageOverFee: number;      // par km supplémentaire (Défaut: 500)
  insuranceDeductible: number; // Défaut: 50000
  additionalTerms: string[];
}
