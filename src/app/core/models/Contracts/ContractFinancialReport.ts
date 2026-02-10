// src/app/core/models/Contracts/ContractFinancialReport.ts

export interface ContractFinancialReport {
  contractId: string;
  contractNumber: string;
  weeklyAmount: number;
  totalContractValue: number;
  securityDeposit: number;

  // Montants payés
  totalPaid: number;
  grossRevenue: number;
  netRevenue: number;

  // Charges
  totalLateFees: number;
  totalDamageFees: number;
  totalMileageOverageFees: number;
  totalAdditionalCharges: number;

  // Paiements
  paymentsMade: number;
  paymentsMissed: number;
  totalOutstanding: number;

  // Marge
  profitMargin: number;

  generatedAt: Date;
}
