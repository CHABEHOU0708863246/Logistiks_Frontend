import { DamageSeverity, PaymentStatus } from "../Enums/Logistiks-enums";

// Informations de base pour les modèles de contrat
export interface ContractAuditInfo {
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
}

// Informations de livraison
export interface DeliveryInfo {
  date: Date;
  location: string;
  mileage: number;
  fuelLevel: number;
  conditionNotes?: string;
  deliveredBy: string;
  receivedBy: string;
}

// Informations de retour
export interface ReturnInfo {
  date: Date;
  location: string;
  mileage: number;
  fuelLevel: number;
  conditionNotes?: string;
  returnedBy: string;
  receivedBy: string;
}

// Rapport de dommages
export interface DamageReport {
  id?: string;
  description: string;
  severity: DamageSeverity;
  estimatedCost: number;
  actualCost?: number;
  photoUrls: string[];
  reportedDate: Date;
  reportedBy: string;
  repairedDate?: Date;
  notes?: string;
}

// Conditions du contrat
export interface ContractTerms {
  id?: string;
  title: string;
  content: string;
  version: string;
  effectiveDate: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

// Base pour les paiements
export interface PaymentBase {
  id: string;
  contractId: string;
  contractNumber: string;
  paymentDate: Date;
  dueDate: Date;
  amountDue: number;
  amountPaid: number;
  lateFee: number;
  totalPaid: number;
  method: PaymentMethodData;
  methodLabel: string;
  status: PaymentStatus;
  statusLabel: string;
  reference?: string;
  notes?: string;
  isLate: boolean;
  daysLate: number;
  recordedBy: string;
  recordedAt: Date;
}
