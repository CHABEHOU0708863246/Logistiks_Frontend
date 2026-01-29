

// Critères de recherche de documents
export interface DocumentSearchCriteria {
  // Recherche textuelle
  searchTerm?: string;

  // Filtres
  type?: DocumentType;
  entityType?: string;
  entityId?: string;
  isSigned?: boolean;
  isExpired?: boolean;
  isArchived?: boolean;

  // Dates
  createdFrom?: Date;
  createdTo?: Date;
  expiringBefore?: Date;

  // Pagination
  page: number;
  pageSize: number;

  // Tri
  sortBy: string;
  sortDescending: boolean;
}

// Valeurs par défaut pour les critères de recherche
export const defaultDocumentSearchCriteria: DocumentSearchCriteria = {
  page: 1,
  pageSize: 50,
  sortBy: 'createdAt',
  sortDescending: true
};
