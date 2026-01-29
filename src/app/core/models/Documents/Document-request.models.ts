import { CustomFields, DocumentStatus } from "../Enums/Logistiks-enums";

// Request pour créer un document
export interface CreateDocumentRequest {
  type: DocumentType;
  name: string;
  description?: string;

  // Entité liée
  entityType: string;
  entityId: string;
  entityName?: string;

  // Fichier (sera géré via FormData en pratique)
  file?: File;

  // Métadonnées optionnelles
  expiryDate?: Date;
  customFields?: CustomFields;
}

// Requête pour mettre à jour les métadonnées d'un document
export interface UpdateDocumentMetadataRequest {
  name?: string;
  description?: string;
  expiryDate?: Date;
  customFields?: CustomFields;
}

// Requête pour signer un document
export interface SignDocumentRequest {
  signatureData: string;
}

// Requête pour supprimer un document
export interface DeleteDocumentRequest {
  reason: string;
}

// Requête pour remplacer le fichier d'un document
export interface ReplaceDocumentFileRequest {
  file?: File;
}

// Requête pour mettre à jour le statut d'un document
export interface UpdateDocumentStatusRequest {
  newStatus: DocumentStatus;
  reason?: string;
}
