export interface ContractFinancialReport {
  contractId: string;
  contractNumber: string;
  weeklyAmount: number;
  totalContractValue: number;
  securityDeposit: number;
  totalPaid: number;
  paymentsMade: number;
  paymentsMissed: number;
  totalLateFees: number;
  totalDamageFees: number;
  totalMileageOverageFees: number;
  grossRevenue: number;
  totalAdditionalCharges: number;
  netRevenue: number;
  profitMargin: number;
  totalOutstanding: number;
  generatedAt: Date;
}
