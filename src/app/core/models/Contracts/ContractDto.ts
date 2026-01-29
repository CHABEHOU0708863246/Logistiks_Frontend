import { ContractStatus, PaymentFrequency } from "../Enums/Logistiks-enums";

/**
 * DTO pour le contrat (correspondant à ContractDto en C#)
 */
export interface ContractDto {
  id: string;
  contractNumber: string;
  contractType: number;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  vehicleId: string;
  vehicleCode?: string;
  vehicleFullName?: string;
  startDate: Date;
  endDate: Date;
  durationInWeeks: number;
  weeklyAmount: number;
  totalAmount: number;
  securityDeposit: number;
  depositPaid: boolean;
  paymentFrequency: PaymentFrequency;
  paymentFrequencyLabel: string;
  paymentDay: number;
  paymentDayLabel: string;
  status: ContractStatus;
  statusLabel: string;
  isActive: boolean;
  isExpired: boolean;
  terms: any;
  weeklyMileageLimit?: number;
  deliveryInfo?: any;
  returnInfo?: any;
  documentsCount: number;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  weeksRemaining: number;
  daysRemaining: number;
}
