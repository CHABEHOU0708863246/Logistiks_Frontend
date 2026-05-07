import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
//import { environment } from '../../../../environments/environment.development';
import { ApiResponseData } from '../../models/Common/ApiResponseData';
import { FleetKpiResponse, VehicleRoiResponse, PeriodComparisonRequest, PeriodComparisonResponse } from '../../models/Rentability/Rentability.types';

@Injectable({
  providedIn: 'root',
})
export class Rentability {
  private readonly baseUrl = `${environment.apiUrl}/api/Rentability`;

  constructor(private http: HttpClient) {}

  // ─────────────────────────────────────────────────────────────
  // 1. KPI FLOTTE
  // GET /api/Rentability/fleet/kpi?periodStart=...&periodEnd=...
  // ─────────────────────────────────────────────────────────────

  /**
   * Tableau de bord KPI de la flotte entière sur une période.
   * Retourne revenus, dépenses, profit, taux d'utilisation, Top 3 et Bottom 3.
   */
  getFleetKpi(
    periodStart: Date,
    periodEnd: Date
  ): Observable<ApiResponseData<FleetKpiResponse>> {
    const params = new HttpParams()
      .set('periodStart', periodStart.toISOString())
      .set('periodEnd', periodEnd.toISOString());

    return this.http
      .get<ApiResponseData<FleetKpiResponse>>(
        `${this.baseUrl}/fleet/kpi`,
        { params }
      )
      .pipe(catchError(this.handleError));
  }

  // ─────────────────────────────────────────────────────────────
  // 2. ROI PAR VÉHICULE
  // GET /api/Rentability/vehicle/{vehicleId}/roi?periodStart=...&periodEnd=...
  // ─────────────────────────────────────────────────────────────

  /**
   * ROI détaillé d'un véhicule sur une période.
   * Inclut dépenses ventilées par catégorie et évolution mensuelle.
   */
  getVehicleRoi(
    vehicleId: string,
    periodStart: Date,
    periodEnd: Date
  ): Observable<ApiResponseData<VehicleRoiResponse>> {
    const params = new HttpParams()
      .set('periodStart', periodStart.toISOString())
      .set('periodEnd', periodEnd.toISOString());

    return this.http
      .get<ApiResponseData<VehicleRoiResponse>>(
        `${this.baseUrl}/vehicle/${vehicleId}/roi`,
        { params }
      )
      .pipe(catchError(this.handleError));
  }

  // ─────────────────────────────────────────────────────────────
  // 3. COMPARAISON DE PÉRIODES
  // POST /api/Rentability/compare
  // ─────────────────────────────────────────────────────────────

  /**
   * Compare deux périodes et retourne les variations en % pour chaque KPI.
   * vehicleId optionnel : null = flotte entière, string = un seul véhicule.
   */
  comparePeriods(
    request: PeriodComparisonRequest
  ): Observable<ApiResponseData<PeriodComparisonResponse>> {
    return this.http
      .post<ApiResponseData<PeriodComparisonResponse>>(
        `${this.baseUrl}/compare`,
        request
      )
      .pipe(catchError(this.handleError));
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS MÉTIER (équivalent des méthodes utilitaires Financials)
  // ─────────────────────────────────────────────────────────────

  /**
   * KPI du mois en cours (raccourci fréquent)
   */
  getCurrentMonthFleetKpi(): Observable<ApiResponseData<FleetKpiResponse>> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date();
    return this.getFleetKpi(start, end);
  }

  /**
   * ROI d'un véhicule pour le mois en cours
   */
  getCurrentMonthVehicleRoi(
    vehicleId: string
  ): Observable<ApiResponseData<VehicleRoiResponse>> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date();
    return this.getVehicleRoi(vehicleId, start, end);
  }

  /**
   * Comparaison mois en cours vs mois précédent (flotte entière)
   * Cas d'usage le plus fréquent : "est-ce qu'on progresse ?"
   */
  compareCurrentVsPreviousMonth(
    vehicleId?: string
  ): Observable<ApiResponseData<PeriodComparisonResponse>> {
    const now = new Date();

    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentEnd = new Date();

    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0); // dernier jour du mois précédent

    const currentLabel = currentStart.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
    const prevLabel = prevStart.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });

    const request: PeriodComparisonRequest = {
      periodAStart: prevStart,
      periodAEnd: prevEnd,
      periodALabel: prevLabel,
      periodBStart: currentStart,
      periodBEnd: currentEnd,
      periodBLabel: currentLabel,
      vehicleId: vehicleId ?? null,
    };

    return this.comparePeriods(request);
  }

  // ─────────────────────────────────────────────────────────────
  // FORMATAGE (cohérent avec Financials service)
  // ─────────────────────────────────────────────────────────────

  /**
   * Formater un montant en FCFA
   */
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Formater un pourcentage avec signe (ex: +12.5% ou -3.2%)
   * Utile pour afficher les variations de la comparaison
   */
  formatGrowth(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  /**
   * Couleur CSS selon la variation (vert = positif, rouge = négatif)
   */
  getGrowthClass(value: number): string {
    if (value > 0) return 'text-success';
    if (value < 0) return 'text-danger';
    return 'text-muted';
  }

  /**
   * Icône selon la variation
   */
  getGrowthIcon(value: number): string {
    if (value > 0) return 'bx-trending-up';
    if (value < 0) return 'bx-trending-down';
    return 'bx-minus';
  }

  /**
   * Formater un taux de pourcentage simple
   */
  formatPercent(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  // ─────────────────────────────────────────────────────────────
  // GESTION DES ERREURS
  // ─────────────────────────────────────────────────────────────

  private handleError(error: any): Observable<never> {
    console.error('❌ Erreur RentabilityService:', error);

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
