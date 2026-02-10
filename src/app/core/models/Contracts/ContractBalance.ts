// src/app/core/models/Contracts/ContractBalance.ts

export interface ContractBalance {
  contractId: string;
  contractNumber: string;
  totalContractAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  currentWeekDue: number;
  lateFees: number;
  totalPayments: number;
  paymentsMade: number;
  paymentsMissed: number;
  paymentsOverdue: number;
  nextPaymentDue?: Date;
  lastPaymentDate?: Date;

  // ✅ AJOUT : Propriétés manquantes pour le calcul
  weeklyAmount?: number;
  weeksRemaining?: number;
  paymentsPending?: number;
}
