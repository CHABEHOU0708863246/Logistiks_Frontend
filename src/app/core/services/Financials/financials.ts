import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
//import { environment } from '../../../../environments/environment.development';
import { ApiResponseData } from '../../models/Common/ApiResponseData';
import { CreateTransactionRequest, CalculateProfitabilityRequest, GenerateReportRequest } from '../../models/Financials/Financial-requests.models';
import { VehicleProfitabilityResponse, FinancialDashboardResponse, MonthlyFinancialSummary, FinancialReportResponse } from '../../models/Financials/Financial-responses.models';
import { FinancialTransaction, TransactionCategory, VehicleProfitability } from '../../models/Financials/Financial.models';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Financials {
  private readonly baseUrl = `${environment.apiUrl}/api/Finance`;

  constructor(private http: HttpClient) {}

  // ============================================
  // SECTION 1: TRANSACTIONS
  // ============================================

  /**
   * Créer une nouvelle transaction financière
   * POST /api/Finance/transactions
   */
  createTransaction(
    request: CreateTransactionRequest
  ): Observable<ApiResponseData<FinancialTransaction>> {
    return this.http
      .post<ApiResponseData<FinancialTransaction>>(
        `${this.baseUrl}/transactions`,
        request
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupérer les transactions par période
   * GET /api/Finance/transactions?startDate=...&endDate=...
   */
  getTransactionsByPeriod(
    startDate: Date,
    endDate: Date
  ): Observable<ApiResponseData<FinancialTransaction[]>> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());

    return this.http
      .get<ApiResponseData<FinancialTransaction[]>>(
        `${this.baseUrl}/transactions`,
        { params }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupérer les transactions d'un véhicule spécifique
   * GET /api/Finance/transactions/vehicle/{vehicleId}?startDate=...&endDate=...
   */
  getTransactionsByVehicle(
    vehicleId: string,
    startDate?: Date,
    endDate?: Date
  ): Observable<ApiResponseData<FinancialTransaction[]>> {
    let params = new HttpParams();

    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }

    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http
      .get<ApiResponseData<FinancialTransaction[]>>(
        `${this.baseUrl}/transactions/vehicle/${vehicleId}`,
        { params }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Vérifier et valider une transaction
   * PUT /api/Finance/transactions/{transactionId}/verify
   */
  verifyTransaction(
    transactionId: string
  ): Observable<ApiResponseData<FinancialTransaction>> {
    return this.http
      .put<ApiResponseData<FinancialTransaction>>(
        `${this.baseUrl}/transactions/${transactionId}/verify`,
        {}
      )
      .pipe(catchError(this.handleError));
  }

  // ============================================
  // SECTION 2: RENTABILITÉ & ROI
  // ============================================

  /**
   * Calculer la rentabilité d'un véhicule sur une période
   * POST /api/Finance/profitability/vehicle
   */
  calculateVehicleProfitability(
    request: CalculateProfitabilityRequest
  ): Observable<ApiResponseData<VehicleProfitability>> {
    return this.http
      .post<ApiResponseData<VehicleProfitability>>(
        `${this.baseUrl}/profitability/vehicle`,
        request
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupérer la rentabilité de toute la flotte
   * GET /api/Finance/profitability/fleet?periodStart=...&periodEnd=...
   */
  getFleetProfitability(
    periodStart: Date,
    periodEnd: Date
  ): Observable<ApiResponseData<VehicleProfitability[]>> {
    const params = new HttpParams()
      .set('periodStart', periodStart.toISOString())
      .set('periodEnd', periodEnd.toISOString());

    return this.http
      .get<ApiResponseData<VehicleProfitability[]>>(
        `${this.baseUrl}/profitability/fleet`,
        { params }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupérer les détails de rentabilité d'un véhicule (historique complet)
   * GET /api/Finance/profitability/vehicle/{vehicleId}/details
   */
  getVehicleProfitabilityDetails(
    vehicleId: string
  ): Observable<ApiResponseData<VehicleProfitabilityResponse>> {
    return this.http
      .get<ApiResponseData<VehicleProfitabilityResponse>>(
        `${this.baseUrl}/profitability/vehicle/${vehicleId}/details`
      )
      .pipe(catchError(this.handleError));
  }

  // ============================================
  // SECTION 3: TABLEAUX DE BORD
  // ============================================

  /**
   * Récupérer le tableau de bord financier global
   * GET /api/Finance/dashboard?startDate=...&endDate=...
   */
  getFinancialDashboard(
    startDate?: Date,
    endDate?: Date
  ): Observable<ApiResponseData<FinancialDashboardResponse>> {
    let params = new HttpParams();

    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }

    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http
      .get<ApiResponseData<FinancialDashboardResponse>>(
        `${this.baseUrl}/dashboard`,
        { params }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupérer le résumé financier mensuel
   * GET /api/Finance/summary/monthly?year=...&month=...
   */
  getMonthlyFinancialSummary(
    year: number,
    month: number
  ): Observable<ApiResponseData<MonthlyFinancialSummary>> {
    const params = new HttpParams()
      .set('year', year.toString())
      .set('month', month.toString());

    return this.http
      .get<ApiResponseData<MonthlyFinancialSummary>>(
        `${this.baseUrl}/summary/monthly`,
        { params }
      )
      .pipe(catchError(this.handleError));
  }

  // ============================================
  // SECTION 4: RAPPORTS
  // ============================================

  /**
   * Générer un rapport financier détaillé
   * POST /api/Finance/reports/generate
   */
  generateFinancialReport(
    request: GenerateReportRequest
  ): Observable<ApiResponseData<FinancialReportResponse>> {
    return this.http
      .post<ApiResponseData<FinancialReportResponse>>(
        `${this.baseUrl}/reports/generate`,
        request
      )
      .pipe(catchError(this.handleError));
  }

  // ============================================
  // MÉTHODES UTILITAIRES
  // ============================================

  /**
   * Récupérer les transactions non vérifiées (pour validation)
   * Utilise getTransactionsByPeriod mais filtre côté client
   */
  getUnverifiedTransactions(
    startDate: Date,
    endDate: Date
  ): Observable<ApiResponseData<FinancialTransaction[]>> {
    return this.getTransactionsByPeriod(startDate, endDate).pipe(
      map((response) => {
        if (response.success && response.data) {
          const unverified = response.data.filter(
            (t) => !t.verifiedBy || !t.verifiedAt
          );
          return {
            ...response,
            data: unverified,
            message: `${unverified.length} transaction(s) non vérifiée(s)`,
          };
        }
        return response;
      })
    );
  }

  /**
   * Calculer la rentabilité d'un véhicule pour le mois en cours
   */
  calculateCurrentMonthProfitability(
    vehicleId: string
  ): Observable<ApiResponseData<VehicleProfitability>> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const request: CalculateProfitabilityRequest = {
      vehicleId,
      periodStart: startOfMonth,
      periodEnd: endOfMonth,
    };

    return this.calculateVehicleProfitability(request);
  }

  /**
   * Récupérer le dashboard du mois en cours
   */
  getCurrentMonthDashboard(): Observable<
    ApiResponseData<FinancialDashboardResponse>
  > {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date();

    return this.getFinancialDashboard(startOfMonth, endOfMonth);
  }

  /**
   * Récupérer le résumé du mois en cours
   */
  getCurrentMonthSummary(): Observable<
    ApiResponseData<MonthlyFinancialSummary>
  > {
    const now = new Date();
    return this.getMonthlyFinancialSummary(
      now.getFullYear(),
      now.getMonth() + 1
    );
  }

  /**
   * Générer un rapport pour le mois en cours
   */
  generateCurrentMonthReport(): Observable<
    ApiResponseData<FinancialReportResponse>
  > {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const request: GenerateReportRequest = {
      startDate: startOfMonth,
      endDate: endOfMonth,
      includeVehicleDetails: true,
      includeExpenseBreakdown: true,
      includeComparisons: false,
    };

    return this.generateFinancialReport(request);
  }

  /**
   * Comparer deux périodes pour un véhicule
   */
  comparePeriods(
    vehicleId: string,
    period1Start: Date,
    period1End: Date,
    period2Start: Date,
    period2End: Date
  ): Observable<{
    period1: ApiResponseData<VehicleProfitability>;
    period2: ApiResponseData<VehicleProfitability>;
  }> {
    const request1: CalculateProfitabilityRequest = {
      vehicleId,
      periodStart: period1Start,
      periodEnd: period1End,
    };

    const request2: CalculateProfitabilityRequest = {
      vehicleId,
      periodStart: period2Start,
      periodEnd: period2End,
    };

    return this.http
      .post<ApiResponseData<VehicleProfitability>>(
        `${this.baseUrl}/profitability/vehicle`,
        request1
      )
      .pipe(
        map((period1Response) => {
          return this.http
            .post<ApiResponseData<VehicleProfitability>>(
              `${this.baseUrl}/profitability/vehicle`,
              request2
            )
            .pipe(
              map((period2Response) => ({
                period1: period1Response,
                period2: period2Response,
              }))
            );
        }),
        catchError(this.handleError)
      )
      .pipe(
        // Flatten the nested observable
        (obs) => {
          return new Observable((observer) => {
            obs.subscribe({
              next: (innerObs) => {
                innerObs.subscribe({
                  next: (result) => observer.next(result),
                  error: (err) => observer.error(err),
                  complete: () => observer.complete(),
                });
              },
              error: (err) => observer.error(err),
            });
          });
        }
      );
  }

  /**
   * Calculer le total des transactions par catégorie
   * Utile pour les graphiques
   */
  calculateTotalsByCategory(
    transactions: FinancialTransaction[]
  ): { [key: string]: number } {
    const totals: { [key: string]: number } = {};

    transactions.forEach((transaction) => {
      const categoryName =
        this.getCategoryName(transaction.category) || 'Autre';
      if (!totals[categoryName]) {
        totals[categoryName] = 0;
      }
      totals[categoryName] += transaction.amount;
    });

    return totals;
  }

  /**
   * Obtenir le nom de la catégorie en français
   */
  getCategoryName(category: number): string {
    const categories: { [key: number]: string } = {
      1: 'Location',
      2: 'Caution',
      3: 'Service',
      4: 'Carburant',
      5: 'Maintenance',
      6: 'Assurance',
      7: 'Taxe',
      8: 'Salaire',
      9: 'Autre',
    };
    return categories[category] || 'Inconnu';
  }

  /**
   * Calculer le taux de croissance entre deux valeurs
   */
  calculateGrowthRate(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

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
   * Formater une date selon la locale française
   */
  formatDate(date: Date | string): string {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Vérifier si la date est valide
    if (isNaN(dateObj.getTime())) {
      return 'Date invalide';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  }

  /**
   * Formater une date courte (sans l'heure)
   */
  formatShortDate(date: Date | string): string {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return 'Date invalide';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(dateObj);
  }


  /**
   * Vérifier si une transaction est récente (moins de 24h)
   */
  isRecentTransaction(transaction: FinancialTransaction): boolean {
    if (!transaction || !transaction.createdAt) return false;

    const transactionDate = new Date(transaction.createdAt);
    const now = new Date();
    const diffHours = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60);

    return diffHours < 24;
  }

  /**
   * Obtenir l'icône pour une catégorie de transaction
   */
  getCategoryIcon(category: TransactionCategory): string {
    const icons: { [key: number]: string } = {
      [TransactionCategory.Rental]: 'bx-car',
      [TransactionCategory.Deposit]: 'bx-lock',
      [TransactionCategory.Service]: 'bx-wrench',
      [TransactionCategory.Fuel]: 'bx-gas-pump',
      [TransactionCategory.Maintenance]: 'bx-brush',
      [TransactionCategory.Insurance]: 'bx-shield',
      [TransactionCategory.Tax]: 'bx-taxi',
      [TransactionCategory.Salary]: 'bx-money',
      [TransactionCategory.Other]: 'bx-category'
    };
    return icons[category] || 'bx-help-circle';
  }

  /**
   * Gestion centralisée des erreurs HTTP
   */
  private handleError(error: any): Observable<never> {
    console.error('❌ Erreur Financial Service:', error);

    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = `Erreur ${error.status}: ${error.statusText}`;
      }

      // Ajouter les erreurs détaillées si disponibles
      if (error.error?.errors && Array.isArray(error.error.errors)) {
        errorMessage += '\n' + error.error.errors.join('\n');
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
