/**
 * Structure standard de toutes les réponses de  API .NET
 */
export interface ApiResponseData<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
  metadata?: any;

  // Propriétés optionnelles pour la pagination intégrée
  totalCount?: number;
  pageNumber?: number;
  pageSize?: number;
  totalPages?: number;
}
