// src/app/core/models/Contracts/contract-statistics.models.ts
// Modèles alignés sur les DTOs backend de statistiques des contrats.

export interface ContractStatisticsResponse {
  periodStart: string;
  periodEnd: string;

  totalContractedValue: number;
  totalRevenueInPeriod: number;
  totalDueInPeriod: number;
  collectionRatePercent: number;
  collectionRateApplicable: boolean;
  totalOutstanding: number;
  totalOverdue: number;
  totalEstimatedExpenses: number;
  totalEstimatedNetProfit: number;
  averageMarginPercent: number;

  totalContracts: number;
  activeContracts: number;
  completedContracts: number;
  terminatedContracts: number;
  contractsWithOverdue: number;
  lateInstallmentsCount: number;
  onTimePaymentRatePercent: number;
  averageWeeklyAmount: number;
  averageContractValue: number;

  contracts: ContractStatEntry[];
}

export interface ContractStatEntry {
  contractId: string;
  contractNumber: string;

  customerId: string;
  customerName: string;
  customerPhone: string;

  vehicleId: string;
  vehicleCode: string;
  vehicleName: string;

  status: number;
  statusLabel: string;

  startDate: string;
  endDate: string;
  durationInWeeks: number;
  weeklyAmount: number;
  totalAmount: number;
  securityDeposit: number;

  rentedDays: number;
  progressPercent: number;

  revenueInPeriod: number;
  dueInPeriod: number;
  collectionRatePercent: number;
  collectionRateApplicable: boolean;

  totalPaid: number;
  outstandingAmount: number;
  overdueAmount: number;

  installmentsTotal: number;
  installmentsPaid: number;
  installmentsLate: number;
  maxDaysLate: number;

  estimatedExpenses: number;
  estimatedNetProfit: number;
  estimatedMarginPercent: number;

  performanceLevel: string;
}

export interface ContractStatisticsDetailResponse extends ContractStatEntry {
  installments: ContractInstallmentStat[];
  monthly: ContractMonthlyPoint[];
}

export interface ContractInstallmentStat {
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  lateFee: number;
  lateFeePaid: number;
  statusLabel: string;
  effectiveStatus: number;
  daysLate: number;
  paymentDate?: string;
  reference?: string;
}

export interface ContractMonthlyPoint {
  year: number;
  month: number;
  monthLabel: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}
