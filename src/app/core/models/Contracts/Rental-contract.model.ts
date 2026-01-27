import { PaymentFrequency, ContractStatus } from "../Enums/Logistiks-enums";
import { ContractTerms } from "./Contract-terms.model";
import { DeliveryInfo } from "./Delivery-info.model";
import { ReturnInfo } from "./Return-info.model";

/**
 * Interface pour les références de documents (basé sur DocumentReference en C#)
 */
export interface DocumentReference {
  id: string;
  documentType: any; // Vous pouvez utiliser DocumentType de votre enum
  url: string;
}

/**
 * Contrat de location entre client et Logistiks
 */
export interface RentalContract {
  id: string;
  contractNumber: string;
  customerId: string;
  vehicleId: string;
  startDate: Date;
  endDate: Date;
  durationInWeeks: number;
  weeklyAmount: number;
  totalAmount: number; // Calculé (WeeklyAmount * DurationInWeeks)
  securityDeposit: number;
  depositPaid: boolean;
  paymentFrequency: PaymentFrequency;
  paymentDay: number; // DayOfWeek en C# est 0 (Dimanche) à 6 (Samedi)
  status: ContractStatus;
  terms: ContractTerms;
  weeklyMileageLimit?: number;
  deliveryInfo?: DeliveryInfo;
  returnInfo?: ReturnInfo;
  documents: DocumentReference[];
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;

  // Champs calculés (Note: En TS, ce sont des propriétés simples si elles viennent de l'API)
  isActive?: boolean;
  isExpired?: boolean;
  weeksRemaining?: number;
}
