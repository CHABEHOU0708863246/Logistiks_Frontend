export interface PenaltyCalculationResult {
  paymentId: string;
  contractId: string;
  baseAmount: number;
  daysLate: number;
  gracePeriodDays: number;
  penaltyApplies: boolean;
  penaltyAmount: number;
  totalAmountDue: number;
  calculatedAt: Date;
}

export interface PaymentPenaltyDetail {
  paymentId: string;
  paymentNumber: number;
  dueDate: Date;
  amountDue: number;
  daysLate: number;
  penaltyApplies: boolean;
  penaltyAmount: number;
  totalAmountDue: number;
}

export interface LatePenaltyInfo {
  contractId: string;
  contractNumber: string;
  lateFeePerPayment: number;
  gracePeriodDays: number;
  totalPenalties: number;
  paymentsWithPenalties: number;
  totalOverduePayments: number;
  payments: PaymentPenaltyDetail[];
}

export interface RenewalEligibilityResult {
  isEligible: boolean;
  contractId: string;
  contractNumber: string;
  currentEndDate: Date;
  outstandingBalance: number;
  consecutiveLatePayments: number;
  eligibilityIssues: string[];
  recommendations: string[];
}
