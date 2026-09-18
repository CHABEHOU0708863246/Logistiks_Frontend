import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponseData } from '../../models/Common/ApiResponseData';
import { AuditLog, AuditSearchFilters } from '../../models/Audit/audit.models';

/**
 * Service du journal d'audit (MODULE 14).
 * Consultation paginée, détail et export CSV.
 */
@Injectable({
  providedIn: 'root',
})
export class Audit {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/audit`;

  constructor(private http: HttpClient) {}

  /**
   * Recherche paginée du journal, de l'entrée la plus récente à la plus ancienne.
   * GET /api/v1/audit
   */
  search(filters: AuditSearchFilters): Observable<ApiResponseData<AuditLog[]>> {
    return this.http
      .get<ApiResponseData<AuditLog[]>>(this.baseUrl, {
        params: this.buildParams(filters, true)
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupère une entrée d'audit par son identifiant.
   * GET /api/v1/audit/{id}
   */
  getById(id: string): Observable<ApiResponseData<AuditLog>> {
    return this.http
      .get<ApiResponseData<AuditLog>>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Export CSV du journal filtré (5000 lignes max côté backend).
   * GET /api/v1/audit/export
   */
  exportCsv(filters: AuditSearchFilters): Observable<Blob> {
    return this.http
      .get(`${this.baseUrl}/export`, {
        params: this.buildParams(filters, false),
        responseType: 'blob'
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Construit les paramètres de requête ; les valeurs vides ou nulles sont omises.
   */
  private buildParams(filters: AuditSearchFilters, withPagination: boolean): HttpParams {
    let params = new HttpParams();

    if (filters.entityType) params = params.set('entityType', filters.entityType);
    if (filters.action) params = params.set('action', filters.action);
    if (filters.userId) params = params.set('userId', filters.userId);
    if (filters.fromDate) params = params.set('fromDate', filters.fromDate);
    if (filters.toDate) params = params.set('toDate', filters.toDate);
    if (filters.searchTerm) params = params.set('searchTerm', filters.searchTerm);

    if (withPagination) {
      params = params.set('page', String(filters.page ?? 1));
      params = params.set('pageSize', String(filters.pageSize ?? 20));
    }

    return params;
  }

  /**
   * Gestion centralisée des erreurs HTTP.
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = `Erreur ${error.status}: ${error.statusText}`;
      }

      if (error.error?.errors && Array.isArray(error.error.errors)) {
        errorMessage += '\n' + error.error.errors.join('\n');
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
