import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponseData } from '../../models/Common/ApiResponseData';
import { ContractPerformanceDto } from '../../models/Dashboard/ContractPerformanceDto';
import { FleetStatsDto } from '../../models/Dashboard/FleetStatsDto';
import { MonthlyChartPoint } from '../../models/Dashboard/MonthlyChartPoint';
import { DashboardSummaryDto } from '../../models/Dashboard/DashboardSummaryDto';
import { DashboardKpiDto } from '../../models/Dashboard/DashboardKpiDto';

@Injectable({
  providedIn: 'root',
})
export class Dashboard {
  private readonly baseUrl = `${environment.apiUrl}/api/v2/dashboard`;

  constructor(private http: HttpClient) {}

  // ═══════════════════════════════════════════════════════════
  // GET /api/v2/dashboard
  // Tableau de bord complet (KPIs + graphiques + alertes)
  // ═══════════════════════════════════════════════════════════

  /**
   * Retourne la synthèse complète du tableau de bord.
   * Si periodStart / periodEnd sont omis, la période est le mois courant.
   *
   * @param periodStart - Début de période (optionnel)
   * @param periodEnd   - Fin de période (optionnel)
   */
  getDashboardSummary(
    periodStart?: string,
    periodEnd?: string
  ): Observable<ApiResponseData<DashboardSummaryDto>> {
    const params = this.buildPeriodParams(periodStart, periodEnd);

    return this.http
      .get<ApiResponseData<DashboardSummaryDto>>(
        `${this.baseUrl}`,
        { params }
      )
      .pipe(catchError(this.handleError));
  }

  // ═══════════════════════════════════════════════════════════
  // GET /api/v2/dashboard/kpis
  // KPIs uniquement (appel léger pour refresh fréquent)
  // ═══════════════════════════════════════════════════════════

  /**
   * Retourne uniquement les indicateurs clés de performance.
   * Endpoint léger pour les actualisations automatiques.
   *
   * @param periodStart - Début de période (optionnel)
   * @param periodEnd   - Fin de période (optionnel)
   */
  getKpis(
    periodStart?: string,
    periodEnd?: string
  ): Observable<ApiResponseData<DashboardKpiDto>> {
    const params = this.buildPeriodParams(periodStart, periodEnd);

    return this.http
      .get<ApiResponseData<DashboardKpiDto>>(
        `${this.baseUrl}/kpis`,
        { params }
      )
      .pipe(catchError(this.handleError));
  }

  // ═══════════════════════════════════════════════════════════
  // GET /api/v2/dashboard/revenue-chart?months=12
  // Graphique revenus / dépenses / profit — N mois glissants
  // ═══════════════════════════════════════════════════════════

  /**
   * Retourne les données du graphique d'évolution financière
   * sur les derniers mois glissants.
   *
   * @param months - Nombre de mois à inclure (défaut : 12, min : 1, max : 36)
   */
  getRevenueChart(
    months: number = 12
  ): Observable<ApiResponseData<MonthlyChartPoint[]>> {
    const params = new HttpParams().set('months', months.toString());

    return this.http
      .get<ApiResponseData<MonthlyChartPoint[]>>(
        `${this.baseUrl}/revenue-chart`,
        { params }
      )
      .pipe(catchError(this.handleError));
  }

  // ═══════════════════════════════════════════════════════════
  // GET /api/v2/dashboard/fleet
  // Statistiques et répartition de la flotte
  // ═══════════════════════════════════════════════════════════

  /**
   * Retourne la répartition de la flotte par statut et par type.
   */
  getFleetStats(): Observable<ApiResponseData<FleetStatsDto>> {
    return this.http
      .get<ApiResponseData<FleetStatsDto>>(
        `${this.baseUrl}/fleet`
      )
      .pipe(catchError(this.handleError));
  }

  // ═══════════════════════════════════════════════════════════
  // GET /api/v2/dashboard/contracts
  // Performance des contrats (CA, taux de recouvrement, top 10)
  // ═══════════════════════════════════════════════════════════

  /**
   * Retourne la performance des contrats sur la période demandée :
   * chiffre d'affaires généré, taux de recouvrement et top 10.
   *
   * @param periodStart - Début de période (optionnel)
   * @param periodEnd   - Fin de période (optionnel)
   */
  getContractPerformance(
    periodStart?: string,
    periodEnd?: string
  ): Observable<ApiResponseData<ContractPerformanceDto>> {
    const params = this.buildPeriodParams(periodStart, periodEnd);

    return this.http
      .get<ApiResponseData<ContractPerformanceDto>>(
        `${this.baseUrl}/contracts`,
        { params }
      )
      .pipe(catchError(this.handleError));
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS PRIVÉS
  // ═══════════════════════════════════════════════════════════

  /**
   * Construit un HttpParams avec periodStart et periodEnd
   * si les valeurs sont définies.
   */
  private buildPeriodParams(periodStart?: string, periodEnd?: string): HttpParams {
    let params = new HttpParams();
    if (periodStart) params = params.set('periodStart', periodStart);
    if (periodEnd)   params = params.set('periodEnd', periodEnd);
    return params;
  }

  /**
   * Gestion centralisée des erreurs HTTP.
   */
  private handleError(error: any): Observable<never> {
    console.error('DashboardService — Erreur HTTP :', error);

    let errorMessage = 'Une erreur est survenue';

    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.error?.errors?.length) {
      errorMessage = error.error.errors.join(', ');
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return throwError(() => new Error(errorMessage));
  }
}
