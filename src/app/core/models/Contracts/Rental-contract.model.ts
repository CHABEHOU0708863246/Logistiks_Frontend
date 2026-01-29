import { PaymentFrequency, ContractStatus, ContractType } from "../Enums/Logistiks-enums";
import { ContractTerms } from "./Contract-terms.model";
import { DeliveryInfo } from "./Delivery-info.model";
import { ReturnInfo } from "./Return-info.model";

/**
 * Interface pour les références de documents (basé sur DocumentReference en C#)
 */
export interface DocumentReference {
  id: string;
  documentType: any;
  url: string;
}

/**
 * Contrat de location entre client et Logistiks
 */
export interface RentalContract {
  id: string;
  contractNumber: string;
  customerId?: string;
  vehicleId?: string;
  startDate: Date;
  endDate: Date;
  durationInWeeks: number;
  weeklyAmount: number;
  totalAmount: number;
  securityDeposit: number;
  depositPaid: boolean;
  paymentFrequency: PaymentFrequency;
  paymentDay: number;
  contractType: ContractType;
  status: ContractStatus;
  terms: ContractTerms;
  weeklyMileageLimit?: number;
  deliveryInfo?: DeliveryInfo;
  returnInfo?: ReturnInfo;
  documents?: DocumentReference[];
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;

  // Champs calculés
  isActive?: boolean;
  isExpired?: boolean;
  weeksRemaining?: number;
}

// Créez une interface intermédiaire pour la compatibilité
export interface ContractBasic extends Omit<RentalContract, 'documents'> {
  documents?: DocumentReference[];
  customerName?: string;
  customerPhone?: string;
  vehicleCode?: string;
  vehicleFullName?: string;
}
