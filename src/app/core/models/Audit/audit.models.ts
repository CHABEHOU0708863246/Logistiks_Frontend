/**
 * Modèles du journal d'audit (MODULE 14).
 * Reflet du DTO backend AuditLogDto (module 14 — traçabilité légale).
 */

/** Un changement individuel d'une propriété (avant -> après). */
export interface AuditChange {
  property: string;
  oldValue?: string | null;
  newValue?: string | null;
}

/** Entrée du journal d'audit. */
export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  changes: AuditChange[];
  /** Valeurs avant/après au format JSON texte (BsonDocument sérialisé). */
  oldValues?: string | null;
  newValues?: string | null;
}

/** Filtres de recherche du journal d'audit. */
export interface AuditSearchFilters {
  entityType?: string | null;
  action?: string | null;
  userId?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  searchTerm?: string | null;
  page?: number;
  pageSize?: number;
}
