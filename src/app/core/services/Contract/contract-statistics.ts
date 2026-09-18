import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponseData } from '../../models/Common/ApiResponseData';
import { ContractStatus } from '../../models/Enums/Logistiks-enums';
import {
  ContractStatisticsDetailResponse,
  ContractStatisticsResponse,
} from '../../models/Contracts/contract-statistics.models';

/**
 * Statistiques et rentabilité des contrats.
 * S'appuie sur /api/v1/Contracts/statistics et /api/v1/Contracts/{id}/statistics.
 */
@Injectable({
  providedIn: 'root',
})
export class ContractStatisticsService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Contracts`;

  constructor(private http: HttpClient) {}

  /**
   * Statistiques globales sur une période (filtres optionnels).
   */
  getStatistics(
    periodStart: Date,
    periodEnd: Date,
    vehicleId?: string,
    customerId?: string,
    status?: ContractStatus | null
  ): Observable<ApiResponseData<ContractStatisticsResponse>> {
    let params = new HttpParams()
      .set('periodStart', this.toDateParam(periodStart))
      .set('periodEnd', this.toDateParam(periodEnd));

    if (vehicleId) {
      params = params.set('vehicleId', vehicleId);
    }
    if (customerId) {
      params = params.set('customerId', customerId);
    }
    if (status !== undefined && status !== null) {
      params = params.set('status', status.toString());
    }

    return this.http
      .get<ApiResponseData<ContractStatisticsResponse>>(`${this.baseUrl}/statistics`, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Statistiques détaillées d'un contrat : synthèse, échéancier et ventilation mensuelle.
   */
  getContractStatistics(
    contractId: string,
    periodStart: Date,
    periodEnd: Date
  ): Observable<ApiResponseData<ContractStatisticsDetailResponse>> {
    const params = new HttpParams()
      .set('periodStart', this.toDateParam(periodStart))
      .set('periodEnd', this.toDateParam(periodEnd));

    return this.http
      .get<ApiResponseData<ContractStatisticsDetailResponse>>(
        `${this.baseUrl}/${contractId}/statistics`,
        { params }
      )
      .pipe(catchError(this.handleError));
  }

  /** Date locale au format yyyy-MM-dd (évite tout décalage de fuseau). */
  private toDateParam(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private handleError(error: any): Observable<never> {
    console.error('Une erreur est survenue:', error);

    let errorMessage = 'Une erreur inattendue est survenue';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else if (error.status === 0) {
      errorMessage = 'Impossible de contacter le serveur';
    } else if (error.status === 401) {
      errorMessage = 'Non autorisé - Veuillez vous connecter';
    } else if (error.status === 403) {
      errorMessage = "Accès refusé - Vous n'avez pas les permissions nécessaires";
    } else if (error.status === 404) {
      errorMessage = 'Ressource introuvable';
    } else if (error.status >= 500) {
      errorMessage = 'Erreur serveur - Veuillez réessayer plus tard';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    return throwError(() => new Error(errorMessage));
  }
}
