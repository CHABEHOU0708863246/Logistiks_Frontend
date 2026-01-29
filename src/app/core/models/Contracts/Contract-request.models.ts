import { PaymentFrequency, PaymentMethod, DamageSeverity } from "../Enums/Logistiks-enums";
import { ContractTerms } from "./Contract-terms.model";
import { DamageReport } from "./Damage-report.model";

// Request pour créer un contrat
export interface CreateContractRequest {
  customerId: string;
  vehicleId: string;

  startDate: Date;
  durationInWeeks: number;

  weeklyAmount: number;
  securityDeposit: number;

  paymentFrequency: PaymentFrequency;
  paymentDay: number; // DayOfWeek

  terms?: ContractTerms;
  weeklyMileageLimit?: number;

  notes?: string;
}

// Request pour valider les conditions du contrat
export interface ValidateContractRequest {
  customerId: string;
  vehicleId: string;
  startDate: Date;
  endDate: Date;
  weeklyAmount: number;
  securityDeposit: number;
}

// Request pour activer un contrat
export interface ActivateContractRequest {
  depositPaid: boolean;
  paymentReference?: string;

  // Informations de livraison obligatoires
  deliveryDate: Date;
  deliveryLocation: string;
  mileageAtDelivery: number;
  fuelLevel: number;
  conditionNotes?: string;
  deliveredBy: string;
  receivedBy: string;
}

// Request pour mettre à jour un contrat
export interface UpdateContractRequest {
  startDate?: Date;
  durationInWeeks?: number;
  weeklyAmount?: number;
  securityDeposit?: number;
  paymentFrequency?: PaymentFrequency;
  paymentDay?: number;
  weeklyMileageLimit?: number;
  terms?: ContractTerms;
  notes?: string;
}

// Request pour renouveler un contrat
export interface RenewContractRequest {
  durationInWeeks: number;
  newWeeklyAmount?: number;
  newSecurityDeposit?: number;
  newTerms?: ContractTerms;
  notes?: string;
}

// Request pour enregistrer un paiement
export interface RecordPaymentRequest {
  paymentDate: Date;
  amountPaid: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

// Request pour signaler un dommage
export interface ReportDamageRequest {
  description: string;
  severity: DamageSeverity;
  estimatedCost: number;
  photoUrls: string[];
  notes?: string;
}

// Request pour enregistrer le retour du véhicule
export interface VehicleReturnRequest {
  returnDate: Date;
  returnLocation: string;
  mileageAtReturn: number;
  fuelLevel: number;
  conditionNotes?: string;
  photos: string[];
  damages: DamageReport[];
  returnedBy: string;
  receivedBy: string;
}

// Request pour annuler un contrat
export interface CancelContractRequest {
  reason: string;
}

// Request pour rejeter un contrat
export interface RejectContractRequest {
  reason: string;
}

// Request pour terminer un contrat
export interface TerminateContractRequest {
  reason: string;
}

// Request pour supprimer un contrat
export interface DeleteContractRequest {
  reason: string;
}

// Request pour uploader un contrat signé
export interface UploadSignedContractRequest {
  signedContractFile: File; // FormData sera utilisé en pratique
}
