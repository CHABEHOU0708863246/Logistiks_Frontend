import { IdentityType, TierRoleType, TierStatus } from "../Enums/Logistiks-enums";
import { Address } from "./Tier-details";

export interface AddRoleRequest {
  roleType: TierRoleType;
}

export interface BlockTierRequest {
  reason: string;
}

export interface CreateTierRequest {
  firstName: string;
  lastName: string;
  companyName?: string;
  phone: string;
  email?: string;
  identityNumber: string;
  identityType: IdentityType;
  address?: Address;
  roles: TierRoleType[];
}

export interface RejectDocumentRequest {
  reason: string;
}

export interface SearchTiersRequest {
  searchTerm?: string;
  roleType?: TierRoleType;
  status?: TierStatus;
  hasExpiredDocuments?: boolean;
  page: number;
  pageSize: number;
}

export interface TierSearchCriteria {
  searchTerm?: string;
  roleType?: TierRoleType;
  status?: TierStatus;
  hasExpiredDocuments?: boolean;
  page: number;
  pageSize: number;
}

export interface TierUpdateDto {
  phone?: string;
  email?: string;
  address?: Address;
  notes?: string;
}

export interface UpdateTierRequest {
  phone?: string;
  email?: string;
  address?: Address;
  notes?: string;
}

// ==================== DOCUMENT UPLOAD ====================

export interface UploadDocumentRequest {
  type: DocumentType;
  file: File;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  expiryDate?: Date | string;
}

// Classe utilitaire pour la création de FormData pour l'upload
export class UploadDocumentFormData {
  static toFormData(request: UploadDocumentRequest): FormData {
    const formData = new FormData();

    formData.append('Type', request.type.toString());
    formData.append('File', request.file);

    if (request.expiryDate) {
      const dateValue = request.expiryDate instanceof Date
        ? request.expiryDate.toISOString()
        : request.expiryDate;
      formData.append('ExpiryDate', dateValue);
    }

    return formData;
  }
}
