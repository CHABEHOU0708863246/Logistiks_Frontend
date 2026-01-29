import { DocumentType, CustomFields } from '../Enums/Logistiks-enums';

// Base pour les entités avec audit
export interface Auditable {
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Base pour les documents
export interface DocumentBase extends Auditable {
  id: string;
  documentNumber: string;
  type: DocumentType;
  typeLabel: string;
  name: string;
  description?: string;
  fileName: string;
  fileSize: number;
  fileSizeFormatted: string;
  mimeType: string;
  url: string;

  // Entité liée
  relatedEntityType: string;
  relatedEntityId: string;
  relatedEntityName?: string;

  // Signature
  isSigned: boolean;
  signedBy?: string;
  signedAt?: Date;

  // Expiration
  expiryDate?: Date;
  isExpired: boolean;
  daysUntilExpiry?: number;

  // Métadonnées
  pages?: number;
  orientation?: string;
  customFields: CustomFields;

  // Statut
  isArchived: boolean;
}
