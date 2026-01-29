/**
 * Solde du contrat
 */
export interface ContractBalance {
  contractId: string;
  contractNumber: string;
  totalContractAmount: number;
  totalPaid: number;
  lateFees: number;
  totalPayments: number;
  paymentsMade: number;
  paymentsMissed: number;
  paymentsOverdue: number;
  currentWeekDue: number;
  nextPaymentDue: Date;
  lastPaymentDate?: Date;
  totalOutstanding: number;
  overdueAmount: number;
}
