import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
//import { environment } from '../../../../environments/environment.development';
import { ApiResponseData } from '../../models/Common/ApiResponseData';
import { ExportFormat, ReportStatus } from '../../models/Enums/Logistiks-enums';
import { GenerateReportRequest } from '../../models/Financials/Financial-requests.models';
import { ReportResultDto, ReportDto } from '../../models/Reports/report.models';
import { PeriodParams, ComparePeriodReportRequest, ReportSearchParams, ScheduleReportRequest } from '../../models/Reports/report.requests';

@Injectable({
  providedIn: 'root',
})
export class Reports {

  private readonly baseUrl = `${environment.apiUrl}/api/v1/reports`;

  constructor(private http: HttpClient) {}

  // ═══════════════════════════════════════════════════════════
  // SECTION 1 — POINT D'ENTRÉE UNIVERSEL
  // ═══════════════════════════════════════════════════════════

  /**
   * POST /api/v1/reports/generate
   * Génère n'importe quel rapport via un seul endpoint.
   * Rôles : SuperAdmin, Manager, Finance
   *
   * @param request - Corps de la requête avec le type et les filtres
   */
  generateReport(
    request: GenerateReportRequest
  ): Observable<ApiResponseData<ReportResultDto>> {
    return this.http
      .post<ApiResponseData<ReportResultDto>>(
        `${this.baseUrl}/generate`,
        request
      )
      .pipe(catchError(this.handleError));
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 2 — RACCOURCIS PAR TYPE DE RAPPORT
  // ═══════════════════════════════════════════════════════════

  /**
   * GET /api/v1/reports/monthly-activity
   * RPT-01 : Activité mensuelle de la flotte.
   * Rôles : SuperAdmin, Manager, Finance
   *
   * @param params - periodStart et periodEnd optionnels (défaut : mois en cours)
   */
  getMonthlyActivity(
    params?: PeriodParams
  ): Observable<ApiResponseData<ReportResultDto>> {
    const httpParams = this.buildPeriodParams(params);

    return this.http
      .get<ApiResponseData<ReportResultDto>>(
        `${this.baseUrl}/monthly-activity`,
        { params: httpParams }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * GET /api/v1/reports/vehicle-roi/{vehicleId}
   * RPT-02 : ROI détaillé pour un véhicule.
   * Rôles : SuperAdmin, Manager, Finance
   *
   * @param vehicleId - Identifiant du véhicule (obligatoire)
   * @param params - periodStart et periodEnd optionnels
   */
  getVehicleRoi(
    vehicleId: string,
    params?: PeriodParams
  ): Observable<ApiResponseData<ReportResultDto>> {
    const httpParams = this.buildPeriodParams(params);

    return this.http
      .get<ApiResponseData<ReportResultDto>>(
        `${this.baseUrl}/vehicle-roi/${vehicleId}`,
        { params: httpParams }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * GET /api/v1/reports/expenses-by-category
   * RPT-03 : Dépenses ventilées par catégorie.
   * Rôles : SuperAdmin, Manager, Finance
   *
   * @param params - periodStart, periodEnd optionnels
   * @param vehicleId - Filtre optionnel sur un véhicule
   */
  getExpensesByCategory(
    params?: PeriodParams,
    vehicleId?: string
  ): Observable<ApiResponseData<ReportResultDto>> {
    let httpParams = this.buildPeriodParams(params);
    if (vehicleId) {
      httpParams = httpParams.set('vehicleId', vehicleId);
    }

    return this.http
      .get<ApiResponseData<ReportResultDto>>(
        `${this.baseUrl}/expenses-by-category`,
        { params: httpParams }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * GET /api/v1/reports/expiring-contracts?daysThreshold=30
   * RPT-04 : Contrats arrivant à expiration.
   * Rôles : SuperAdmin, Manager, Finance, Consultant
   *
   * @param daysThreshold - Seuil en jours (défaut : 30, min : 1, max : 365)
   */
  getExpiringContracts(
    daysThreshold: number = 30
  ): Observable<ApiResponseData<ReportResultDto>> {
    const params = new HttpParams().set('daysThreshold', daysThreshold.toString());

    return this.http
      .get<ApiResponseData<ReportResultDto>>(
        `${this.baseUrl}/expiring-contracts`,
        { params }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * GET /api/v1/reports/client-payment-history/{customerId}
   * RPT-05 : Historique des paiements d'un client.
   * Rôles : SuperAdmin, Manager, Finance
   *
   * @param customerId - Identifiant du client (obligatoire)
   * @param params - periodStart et periodEnd optionnels (défaut : 12 derniers mois)
   */
  getClientPaymentHistory(
    customerId: string,
    params?: PeriodParams
  ): Observable<ApiResponseData<ReportResultDto>> {
    const httpParams = this.buildPeriodParams(params);

    return this.http
      .get<ApiResponseData<ReportResultDto>>(
        `${this.baseUrl}/client-payment-history/${customerId}`,
        { params: httpParams }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * GET /api/v1/reports/overdue-payments
   * RPT-06 : Impayés et retards (snapshot temps réel).
   * Rôles : SuperAdmin, Manager, Finance
   */
  getOverduePayments(): Observable<ApiResponseData<ReportResultDto>> {
    return this.http
      .get<ApiResponseData<ReportResultDto>>(
        `${this.baseUrl}/overdue-payments`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * GET /api/v1/reports/fleet-utilization
   * RPT-07 : Taux d'utilisation de la flotte.
   * Rôles : SuperAdmin, Manager, Finance, Consultant, Operations
   *
   * @param params - periodStart et periodEnd optionnels
   */
  getFleetUtilization(
    params?: PeriodParams
  ): Observable<ApiResponseData<ReportResultDto>> {
    const httpParams = this.buildPeriodParams(params);

    return this.http
      .get<ApiResponseData<ReportResultDto>>(
        `${this.baseUrl}/fleet-utilization`,
        { params: httpParams }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * GET /api/v1/reports/maintenance-summary
   * RPT-08 : Synthèse des coûts de maintenance.
   * Rôles : SuperAdmin, Manager, Finance, Consultant, Operations
   *
   * @param params - periodStart et periodEnd optionnels
   */
  getMaintenanceSummary(
    params?: PeriodParams
  ): Observable<ApiResponseData<ReportResultDto>> {
    const httpParams = this.buildPeriodParams(params);

    return this.http
      .get<ApiResponseData<ReportResultDto>>(
        `${this.baseUrl}/maintenance-summary`,
        { params: httpParams }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * GET /api/v1/reports/insurance-expiry?daysThreshold=30
   * RPT-09 : Véhicules avec assurance expirée ou à renouveler.
   * Rôles : SuperAdmin, Manager, Finance, Consultant, Operations
   *
   * @param daysThreshold - Seuil d'alerte en jours (défaut : 30)
   */
  getInsuranceExpiry(
    daysThreshold: number = 30
  ): Observable<ApiResponseData<ReportResultDto>> {
    const params = new HttpParams().set('daysThreshold', daysThreshold.toString());

    return this.http
      .get<ApiResponseData<ReportResultDto>>(
        `${this.baseUrl}/insurance-expiry`,
        { params }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * POST /api/v1/reports/compare
   * RPT-10 : Comparaison de deux périodes d'activité.
   * Rôles : SuperAdmin, Manager, Finance
   *
   * @param request - Les deux périodes et le filtre vehicleId optionnel
   */
  comparePeriods(
    request: ComparePeriodReportRequest
  ): Observable<ApiResponseData<ReportResultDto>> {
    return this.http
      .post<ApiResponseData<ReportResultDto>>(
        `${this.baseUrl}/compare`,
        request
      )
      .pipe(catchError(this.handleError));
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 3 — CONSULTATION & HISTORIQUE
  // ═══════════════════════════════════════════════════════════

  /**
   * GET /api/v1/reports
   * Liste paginée des rapports avec filtres optionnels.
   * Rôles : SuperAdmin, Manager, Finance, Consultant
   *
   * @param params - Filtres : type, status, fromDate, toDate, page, pageSize
   */
  searchReports(
    params?: ReportSearchParams
  ): Observable<ApiResponseData<ReportDto[]>> {
    let httpParams = new HttpParams();

    if (params?.type !== undefined) {
      httpParams = httpParams.set('type', params.type.toString());
    }
    if (params?.status !== undefined) {
      httpParams = httpParams.set('status', params.status.toString());
    }
    if (params?.fromDate) {
      httpParams = httpParams.set('fromDate', params.fromDate);
    }
    if (params?.toDate) {
      httpParams = httpParams.set('toDate', params.toDate);
    }
    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.pageSize !== undefined) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }

    return this.http
      .get<ApiResponseData<ReportDto[]>>(
        `${this.baseUrl}`,
        { params: httpParams }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * GET /api/v1/reports/{reportId}
   * Récupère un rapport par son Id avec ses données complètes.
   * Rôles : SuperAdmin, Manager, Finance, Consultant
   *
   * @param reportId - Identifiant du rapport
   */
  getReportById(
    reportId: string
  ): Observable<ApiResponseData<ReportResultDto>> {
    return this.http
      .get<ApiResponseData<ReportResultDto>>(
        `${this.baseUrl}/${reportId}`
      )
      .pipe(catchError(this.handleError));
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 4 — EXPORT
  // ═══════════════════════════════════════════════════════════

  /**
   * GET /api/v1/reports/{reportId}/export?format=1
   * Exporte un rapport existant et retourne les bytes du fichier.
   * Déclenche un téléchargement automatique dans le navigateur.
   * Rôles : SuperAdmin, Manager, Finance, Consultant
   *
   * @param reportId - Identifiant du rapport
   * @param format - Format d'export (1=PDF, 2=Excel, 3=CSV, 4=JSON)
   * @param fileName - Nom du fichier téléchargé (optionnel)
   */
  exportReport(
    reportId: string,
    format: ExportFormat = ExportFormat.Pdf,
    fileName?: string
  ): Observable<Blob> {
    const params = new HttpParams().set('format', format.toString());

    return this.http
      .get(
        `${this.baseUrl}/${reportId}/export`,
        { params, responseType: 'blob' }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Télécharge un rapport exporté avec déclenchement du download navigateur.
   * Encapsule exportReport + création du lien de téléchargement.
   *
   * @param reportId - Identifiant du rapport
   * @param format - Format d'export
   * @param fileName - Nom suggéré pour le fichier téléchargé
   */
  downloadReport(
    reportId: string,
    format: ExportFormat = ExportFormat.Pdf,
    fileName?: string
  ): void {
    const params = new HttpParams().set('format', format.toString());

    this.http
      .get(
        `${this.baseUrl}/${reportId}/export`,
        { params, responseType: 'blob' }
      )
      .pipe(catchError(this.handleError))
      .subscribe({
        next: (blob) => {
          const extension = this.getExtension(format);
          const name = fileName ?? `rapport-${reportId}.${extension}`;
          this.triggerBrowserDownload(blob, name);
        },
        error: (err) => console.error('Erreur téléchargement rapport', err),
      });
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 5 — PLANIFICATION
  // ═══════════════════════════════════════════════════════════

  /**
   * POST /api/v1/reports/schedule
   * Planifie la génération automatique d'un rapport.
   * Rôles : SuperAdmin, Manager, Finance
   *
   * @param request - Type, fréquence, format et filtres optionnels
   */
  scheduleReport(
    request: ScheduleReportRequest
  ): Observable<ApiResponseData<ReportDto>> {
    return this.http
      .post<ApiResponseData<ReportDto>>(
        `${this.baseUrl}/schedule`,
        request
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * DELETE /api/v1/reports/schedule/{reportId}
   * Annule un rapport planifié (soft delete côté serveur).
   * Rôles : SuperAdmin, Manager, Finance
   *
   * @param reportId - Identifiant du rapport planifié à annuler
   */
  cancelScheduledReport(
    reportId: string
  ): Observable<ApiResponseData<null>> {
    return this.http
      .delete<ApiResponseData<null>>(
        `${this.baseUrl}/schedule/${reportId}`
      )
      .pipe(catchError(this.handleError));
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 6 — MÉTHODES UTILITAIRES PUBLIQUES
  // ═══════════════════════════════════════════════════════════

  /**
   * Construit l'URL de téléchargement direct d'un rapport exporté.
   * Utile pour les liens <a href="..."> dans les templates.
   *
   * @param reportId - Identifiant du rapport
   * @param format - Format d'export
   */
  getExportUrl(reportId: string, format: ExportFormat = ExportFormat.Pdf): string {
    return `${this.baseUrl}/${reportId}/export?format=${format}`;
  }

  /**
   * Retourne true si le rapport est en cours de génération
   * (status Pending ou Running).
   */
  isGenerating(status: ReportStatus): boolean {
    return status === ReportStatus.Pending || status === ReportStatus.Running;
  }

  /**
   * Retourne true si le rapport a été généré avec succès.
   */
  isCompleted(status: ReportStatus): boolean {
    return status === ReportStatus.Completed;
  }

  /**
   * Retourne true si la génération a échoué.
   */
  hasFailed(status: ReportStatus): boolean {
    return status === ReportStatus.Failed;
  }

  /**
   * Formate la durée d'exécution en texte lisible.
   * Ex : 1523 → "1.5s" | 342 → "342ms"
   */
  formatExecutionTime(ms?: number): string {
    if (!ms) return '–';
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS PRIVÉS
  // ═══════════════════════════════════════════════════════════

  /**
   * Construit un HttpParams avec periodStart et periodEnd
   * si les valeurs sont définies.
   */
  private buildPeriodParams(params?: PeriodParams): HttpParams {
    let httpParams = new HttpParams();
    if (params?.periodStart) {
      httpParams = httpParams.set('periodStart', params.periodStart);
    }
    if (params?.periodEnd) {
      httpParams = httpParams.set('periodEnd', params.periodEnd);
    }
    return httpParams;
  }

  /**
   * Déclenche le téléchargement d'un Blob dans le navigateur
   * via un lien <a> temporaire.
   */
  private triggerBrowserDownload(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Retourne l'extension de fichier correspondant au format d'export.
   */
  private getExtension(format: ExportFormat): string {
    const extensions: Record<ExportFormat, string> = {
      [ExportFormat.Pdf]:   'pdf',
      [ExportFormat.Excel]: 'xlsx',
      [ExportFormat.Csv]:   'csv',
      [ExportFormat.Json]:  'json',
    };
    return extensions[format] ?? 'bin';
  }

  /**
   * Gestion centralisée des erreurs HTTP.
   * Suit le même pattern que les autres services du projet.
   */
  private handleError(error: any): Observable<never> {
    console.error('ReportService — Erreur HTTP :', error);

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
