import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError, catchError, tap, map } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ApiResponseData } from '../../models/Common/ApiResponseData';
import { ValidateContractRequest, CreateContractRequest, UpdateContractRequest, ActivateContractRequest, RecordPaymentRequest, ReportDamageRequest, VehicleReturnRequest, RenewContractRequest, CancelContractRequest, DeleteContractRequest, RejectContractRequest, TerminateContractRequest } from '../../models/Contracts/Contract-request.models';
import { ContractSearchCriteria } from '../../models/Contracts/Contract-search.models';
import { ContractBalance } from '../../models/Contracts/ContractBalance';
import { ContractDto } from '../../models/Contracts/ContractDto';
import { ContractEligibilityResult } from '../../models/Contracts/ContractEligibilityResult';
import { ContractFinancialReport } from '../../models/Contracts/ContractFinancialReport';
import { ContractValidationResult } from '../../models/Contracts/ContractValidationResult';
import { PaymentRecord } from '../../models/Contracts/PaymentRecord';
import { VehicleReturnResult } from '../../models/Contracts/VehicleReturnResult';
import { PaginatedResponse } from '../../models/Common/PaginatedResponse';

@Injectable({
  providedIn: 'root',
})
export class Contract {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Contracts`;

  constructor(private http: HttpClient) {}

  // ============ ÉLIGIBILITÉ & VÉRIFICATIONS ============

  /**
   * Vérifier l'éligibilité d'un client à la location
   */
  checkCustomerEligibility(
    customerId: string
  ): Observable<ApiResponseData<ContractEligibilityResult>> {
    return this.http
      .get<ApiResponseData<ContractEligibilityResult>>(
        `${this.baseUrl}/eligibility/customer/${customerId}`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Vérifier la disponibilité d'un véhicule pour une période donnée
   */
  checkVehicleAvailability(
    vehicleId: string,
    startDate: Date,
    endDate: Date
  ): Observable<ApiResponseData<boolean>> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());

    return this.http
      .get<ApiResponseData<boolean>>(
        `${this.baseUrl}/availability/vehicle/${vehicleId}`,
        { params }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Valider un contrat avant création/activation
   */
  validateContract(
    request: ValidateContractRequest
  ): Observable<ApiResponseData<ContractValidationResult>> {
    return this.http
      .post<ApiResponseData<ContractValidationResult>>(
        `${this.baseUrl}/validate`,
        request
      )
      .pipe(catchError(this.handleError));
  }

  // ============ GESTION DE BASE (CRUD) ============

  /**
   * Créer un nouveau contrat de location (statut: Draft)
   */
  createContract(
    request: CreateContractRequest
  ): Observable<ApiResponseData<ContractDto>> {
    return this.http
      .post<ApiResponseData<ContractDto>>(this.baseUrl, request)
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtenir un contrat par son ID
   */
  getContractById(id: string): Observable<ApiResponseData<ContractDto>> {
    return this.http
      .get<ApiResponseData<ContractDto>>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtenir un contrat par son numéro
   */
  getContractByNumber(
    contractNumber: string
  ): Observable<ApiResponseData<ContractDto>> {
    return this.http
      .get<ApiResponseData<ContractDto>>(
        `${this.baseUrl}/by-number/${contractNumber}`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Mettre à jour un contrat (uniquement si Draft ou Pending)
   */
  updateContract(
    id: string,
    request: UpdateContractRequest
  ): Observable<ApiResponseData<ContractDto>> {
    return this.http
      .put<ApiResponseData<ContractDto>>(`${this.baseUrl}/${id}`, request)
      .pipe(catchError(this.handleError));
  }

  /**
   * Supprimer un contrat (soft delete - motif obligatoire)
   */
  deleteContract(id: string, reason: string): Observable<Response> {
    const request: DeleteContractRequest = { reason };
    return this.http
      .delete<Response>(`${this.baseUrl}/${id}`, { body: request })
      .pipe(catchError(this.handleError));
  }

  // ============ WORKFLOW D'ACTIVATION ============

  /**
   * Activer un contrat (passe du statut Draft/Pending à Active)
   */
  activateContract(
    id: string,
    request: ActivateContractRequest
  ): Observable<ApiResponseData<ContractDto>> {
    return this.http
      .post<ApiResponseData<ContractDto>>(
        `${this.baseUrl}/${id}/activate`,
        request
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Rejeter un contrat (avec motif obligatoire)
   */
  rejectContract(id: string, reason: string): Observable<ApiResponseData<ContractDto>> {
    const request: RejectContractRequest = { reason };
    return this.http
      .post<ApiResponseData<ContractDto>>(
        `${this.baseUrl}/${id}/reject`,
        request
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Annuler un contrat actif (avec motif obligatoire)
   */
  cancelContract(id: string, reason: string): Observable<ApiResponseData<ContractDto>> {
    const request: CancelContractRequest = { reason };
    return this.http
      .post<ApiResponseData<ContractDto>>(
        `${this.baseUrl}/${id}/cancel`,
        request
      )
      .pipe(catchError(this.handleError));
  }

  // ============ GESTION DES PAIEMENTS ============

  /**
   * Enregistrer un paiement pour un contrat
   */
  recordPayment(
    contractId: string,
    request: RecordPaymentRequest
  ): Observable<ApiResponseData<PaymentRecord>> {
    return this.http
      .post<ApiResponseData<PaymentRecord>>(
        `${this.baseUrl}/${contractId}/payments`,
        request
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtenir tous les paiements d'un contrat
   */
  getContractPayments(
    contractId: string
  ): Observable<ApiResponseData<PaymentRecord[]>> {
    return this.http
      .get<ApiResponseData<PaymentRecord[]>>(
        `${this.baseUrl}/${contractId}/payments`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtenir le solde détaillé d'un contrat
   */
  getContractBalance(
    contractId: string
  ): Observable<ApiResponseData<ContractBalance>> {
    return this.http
      .get<ApiResponseData<ContractBalance>>(
        `${this.baseUrl}/${contractId}/balance`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Appliquer automatiquement les pénalités de retard
   */
  applyLatePenalties(): Observable<ApiResponseData<number>> {
    return this.http
      .post<ApiResponseData<number>>(
        `${this.baseUrl}/payments/apply-late-penalties`,
        {}
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtenir tous les paiements en retard
   */
  getOverduePayments(): Observable<ApiResponseData<PaymentRecord[]>> {
    return this.http
      .get<ApiResponseData<PaymentRecord[]>>(`${this.baseUrl}/payments/overdue`)
      .pipe(catchError(this.handleError));
  }

  // ============ GESTION DU VÉHICULE ============

  /**
   * Signaler un dommage sur le véhicule
   */
  reportDamage(
    contractId: string,
    request: ReportDamageRequest
  ): Observable<Response> {
    return this.http
      .post<Response>(`${this.baseUrl}/${contractId}/damages`, request)
      .pipe(catchError(this.handleError));
  }

  /**
   * Enregistrer le retour du véhicule et clôturer la location
   */
  recordVehicleReturn(
    contractId: string,
    request: VehicleReturnRequest
  ): Observable<ApiResponseData<VehicleReturnResult>> {
    return this.http
      .post<ApiResponseData<VehicleReturnResult>>(
        `${this.baseUrl}/${contractId}/return`,
        request
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Terminer un contrat actif (résiliation anticipée)
   */
  terminateContract(
    contractId: string,
    reason: string
  ): Observable<ApiResponseData<ContractDto>> {
    const request: TerminateContractRequest = { reason };
    return this.http
      .post<ApiResponseData<ContractDto>>(
        `${this.baseUrl}/${contractId}/terminate`,
        request
      )
      .pipe(catchError(this.handleError));
  }

  // ============ RENOUVELLEMENT & SUIVI ============

  /**
   * Renouveler un contrat (créer un nouveau contrat successeur)
   */
  renewContract(
    contractId: string,
    request: RenewContractRequest
  ): Observable<ApiResponseData<ContractDto>> {
    return this.http
      .post<ApiResponseData<ContractDto>>(
        `${this.baseUrl}/${contractId}/renew`,
        request
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtenir tous les contrats actifs
   */
  getActiveContracts(): Observable<ApiResponseData<ContractDto[]>> {
    return this.http
      .get<ApiResponseData<ContractDto[]>>(`${this.baseUrl}/active`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtenir les contrats qui arrivent à expiration
   */
  getExpiringContracts(
    daysThreshold: number = 7
  ): Observable<ApiResponseData<ContractDto[]>> {
    const params = new HttpParams().set('daysThreshold', daysThreshold.toString());
    return this.http
      .get<ApiResponseData<ContractDto[]>>(`${this.baseUrl}/expiring`, { params })
      .pipe(catchError(this.handleError));
  }

  // ============ RECHERCHE & CONSULTATION ============

  /**
   * Rechercher des contrats avec critères avancés et pagination
   */
  searchContracts(
    criteria: ContractSearchCriteria
  ): Observable<PaginatedResponse<ContractDto>> {
    return this.http
      .post<ApiResponseData<ContractDto[]>>(`${this.baseUrl}/search`, criteria)
      .pipe(
        map((response) => {
          const totalCount = response.totalCount || 0;
          const pageNumber = response.pageNumber || criteria.page;
          const pageSize = response.pageSize || criteria.pageSize;
          const totalPages =
            response.totalPages || Math.ceil(totalCount / pageSize) || 1;

          const paginatedResponse: PaginatedResponse<ContractDto> = {
            data: response.data || [],
            currentPage: pageNumber,
            pageSize: pageSize,
            totalCount: totalCount,
            totalPages: totalPages,
            hasPreviousPage: pageNumber > 1,
            hasNextPage: pageNumber < totalPages,
          };
          return paginatedResponse;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Obtenir tous les contrats d'un client
   */
  getContractsByCustomer(
    customerId: string
  ): Observable<ApiResponseData<ContractDto[]>> {
    return this.http
      .get<ApiResponseData<ContractDto[]>>(
        `${this.baseUrl}/customer/${customerId}`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtenir tous les contrats d'un véhicule (historique)
   */
  getContractsByVehicle(
    vehicleId: string
  ): Observable<ApiResponseData<ContractDto[]>> {
    return this.http
      .get<ApiResponseData<ContractDto[]>>(`${this.baseUrl}/vehicle/${vehicleId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtenir le rapport financier d'un contrat
   */
  getContractFinancialReport(
    contractId: string
  ): Observable<ApiResponseData<ContractFinancialReport>> {
    return this.http
      .get<ApiResponseData<ContractFinancialReport>>(
        `${this.baseUrl}/${contractId}/financial-report`
      )
      .pipe(catchError(this.handleError));
  }

  // ============ GÉNÉRATION DE DOCUMENTS ============

  /**
   * Générer le PDF du contrat
   */
  generateContractPdf(
    contractId: string
  ): Observable<ApiResponseData<Document>> {
    return this.http
      .post<ApiResponseData<Document>>(
        `${this.baseUrl}/${contractId}/generate-pdf`,
        {}
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Télécharger le PDF du contrat
   */
  downloadContractPdf(contractId: string): Observable<Blob> {
    return this.http
      .get(`${this.baseUrl}/${contractId}/download-pdf`, {
        responseType: 'blob',
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Uploader un contrat signé (PDF scanné)
   */
  uploadSignedContract(
    contractId: string,
    file: File
  ): Observable<ApiResponseData<Document>> {
    const formData = new FormData();
    formData.append('signedContractFile', file);

    return this.http
      .post<ApiResponseData<Document>>(
        `${this.baseUrl}/${contractId}/upload-signed`,
        formData
      )
      .pipe(catchError(this.handleError));
  }

  // ============ GESTION DES ERREURS ============

  private handleError(error: any): Observable<never> {
    console.error('Une erreur est survenue:', error);

    let errorMessage = 'Une erreur inattendue est survenue';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      if (error.status === 0) {
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
    }

    return throwError(() => new Error(errorMessage));
  }
}
