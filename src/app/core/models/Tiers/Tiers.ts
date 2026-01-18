import { TierStatus, DocumentStatus, IdentityType, TierRoleType } from "../Enums/Logistiks-enums";
import { Address, EmergencyContact, DriverLicenseInfo, BankingInfo } from "./Tier-details";

export interface Tier {
  id: string;
  tierNumber: string;
  roles: TierRole[];
  firstName: string;
  lastName: string;
  companyName?: string;
  birthDate?: Date;
  placeOfBirth?: string;
  identityNumber: string;
  identityType: IdentityType;
  phone: string;
  secondaryPhone?: string;
  email?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
  driverLicense?: DriverLicenseInfo;
  bankingInfo?: BankingInfo;
  status: TierStatus;
  statusHistory: TierStatusHistory[];
  validatedAt?: Date;
  validatedBy?: string;
  blockReason?: string;
  documents: TierDocument[];
  rating: number;
  consecutiveLatePayments: number;
  totalContracts: number;
  activeContracts: number;
  balance: number;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
  createdBy: string;
  updatedBy?: string;
  // Champs calculés (virtuels)
  fullName?: string;
}

export interface TierRole {
  roleType: TierRoleType;
  isActive: boolean;
  assignedAt: Date;
  assignedBy: string;
  revokedAt?: Date;
  revokedBy?: string;
}

export interface TierDocument {
  id: string;
  type: DocumentType;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: DocumentStatus;
  expiryDate?: Date;
  validatedAt?: Date;
  validatedBy?: string;
  rejectionReason?: string;
  uploadedAt: Date;
  uploadedBy: string;
  tier?: Tier;
}

export interface TierStatusHistory {
  fromStatus: TierStatus;
  toStatus: TierStatus;
  reason: string;
  changedAt: Date;
  changedBy: string;
}
