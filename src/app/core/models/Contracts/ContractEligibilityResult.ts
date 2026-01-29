/**
 * Résultat de vérification d'éligibilité
 */
export interface ContractEligibilityResult {
  customerId: string;
  customerName?: string;
  isEligible: boolean;
  reasons: string[];
  isActive: boolean;
  hasActiveContract: boolean;
  hasOutstandingBalance: boolean;
  hasExpiredDocuments: boolean;
  hasLatePayments: boolean;
  currentBalance: number;
  consecutiveLatePayments: number;
  activeContracts: number;
  expiredDocumentTypes: string[];
}
