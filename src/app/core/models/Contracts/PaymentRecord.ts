import { PaymentMethod } from "../Enums/Logistiks-enums";

/**
 * Enregistrement de paiement
 */
export interface PaymentRecord {
  id: string;
  contractId: string;
  contractNumber: string;
  paymentDate: Date;
  dueDate: Date;
  amountDue: number;
  amountPaid: number;
  lateFee: number;
  totalPaid: number;
  method: PaymentMethod;
  methodLabel: string;
  status: any;
  statusLabel: string;
  reference?: string;
  notes?: string;
  recordedBy: string;
  recordedAt: Date;
  isLate: boolean;
  daysLate: number;
}
