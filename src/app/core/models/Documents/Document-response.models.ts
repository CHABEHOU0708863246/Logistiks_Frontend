import { Dictionary } from '../Enums/Logistiks-enums';
import { DocumentBase } from './Document-base.models';
// DTO pour afficher un document
export interface DocumentDto extends DocumentBase {
  // Hérite toutes les propriétés de DocumentBase
}

// Statistiques des documents
export interface DocumentStatistics {
  totalDocuments: number;
  signedDocuments: number;
  pendingSignature: number;
  expiredDocuments: number;
  expiringDocuments: number;
  archivedDocuments: number;
  documentsByType: Dictionary<string, number>;
  documentsByEntity: Dictionary<string, number>;
  totalStorageUsed: number;
  totalStorageFormatted: string;
}

// Document requis
export interface DocumentRequirement {
  type: DocumentType;
  typeLabel: string;
  isPresent: boolean;
  isValid: boolean;
  expiryDate?: Date;
  status?: string;
}

// Problème détecté dans les documents
export interface DocumentIssue {
  severity: 'Error' | 'Warning' | 'Info' | string;
  documentType?: DocumentType;
  message: string;
  recommendation?: string;
}

// Rapport de conformité des documents
export interface DocumentComplianceReport {
  entityId: string;
  entityType: string;
  entityName: string;
  isCompliant: boolean;
  requiredDocuments: DocumentRequirement[];
  issues: DocumentIssue[];
  checkedAt: Date;
}
