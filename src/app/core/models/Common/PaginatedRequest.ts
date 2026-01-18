/**
 * Requête envoyée au serveur pour filtrer et paginer
 */
export interface PaginatedRequest {
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  searchTerm?: string;
  filters?: { [key: string]: any }; // Équivalent du Dictionary<string, object>
}
