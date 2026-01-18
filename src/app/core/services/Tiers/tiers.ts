import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ApiResponseData } from '../../models/Common/ApiResponseData';
import { PaginatedResponse } from '../../models/Common/PaginatedResponse';
import {
  TierRoleType,
  TierStatus,
  DocumentStatus,
  DocumentType ,
} from '../../models/Enums/Logistiks-enums';
import {
  CreateTierRequest,
  UpdateTierRequest,
  BlockTierRequest,
  SearchTiersRequest,
  RejectDocumentRequest,
} from '../../models/Tiers/Tier-requests';
import { Tier, TierDocument } from '../../models/Tiers/Tiers';

@Injectable({
  providedIn: 'root',
})
export class Tiers {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Tiers`;

  constructor(private http: HttpClient) {}

  // ============ CRUD ESSENTIEL ============

  /**
   * Obtenir la liste paginée des tiers avec filtres
   */
  getTiersList(params?: {
    search?: string;
    role?: TierRoleType;
    status?: TierStatus;
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    sortDescending?: boolean;
  }): Observable<PaginatedResponse<Tier>> {
    let httpParams = new HttpParams();

    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }

    if (params?.role !== undefined && params.role !== null) {
      httpParams = httpParams.set('role', params.role.toString());
    }

    if (params?.status !== undefined && params.status !== null) {
      httpParams = httpParams.set('status', params.status.toString());
    }

    if (params?.pageNumber !== undefined) {
      httpParams = httpParams.set('pageNumber', params.pageNumber.toString());
    } else {
      httpParams = httpParams.set('pageNumber', '1');
    }

    if (params?.pageSize !== undefined) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    } else {
      httpParams = httpParams.set('pageSize', '50');
    }

    if (params?.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }

    if (params?.sortDescending !== undefined) {
      httpParams = httpParams.set(
        'sortDescending',
        params.sortDescending.toString()
      );
    }

    return this.http
      .get<ApiResponseData<Tier[]>>(this.baseUrl, { params: httpParams })
      .pipe(
        map((response) => {
          const totalCount = response.totalCount || 0;
          const pageNumber = response.pageNumber || 1;
          const pageSize = response.pageSize || 50;
          const totalPages =
            response.totalPages || Math.ceil(totalCount / pageSize) || 1;

          const paginatedResponse: PaginatedResponse<Tier> = {
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
   * Créer un nouveau tier
   */
  createTier(request: CreateTierRequest): Observable<ApiResponseData<Tier>> {
    return this.http
      .post<ApiResponseData<Tier>>(this.baseUrl, request)
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupérer un tier par son ID
   */
  getTierById(id: string): Observable<ApiResponseData<Tier>> {
    return this.http
      .get<ApiResponseData<Tier>>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupérer un tier par téléphone
   */
  getTierByPhone(phone: string): Observable<ApiResponseData<Tier>> {
    return this.http
      .get<ApiResponseData<Tier>>(`${this.baseUrl}/by-phone/${phone}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Mettre à jour un tier
   */
  updateTier(
    id: string,
    request: UpdateTierRequest
  ): Observable<ApiResponseData<Tier>> {
    return this.http
      .put<ApiResponseData<Tier>>(`${this.baseUrl}/${id}`, request)
      .pipe(catchError(this.handleError));
  }

  // ============ GESTION DES STATUTS ============

  /**
   * Valider un tier (changer le statut à Actif)
   */
  validateTier(id: string): Observable<ApiResponseData<Tier>> {
    return this.http
      .post<ApiResponseData<Tier>>(`${this.baseUrl}/${id}/validate`, {})
      .pipe(catchError(this.handleError));
  }

  /**
   * Bloquer un tier
   */
  blockTier(
    id: string,
    request: BlockTierRequest
  ): Observable<ApiResponseData<Tier>> {
    return this.http
      .post<ApiResponseData<Tier>>(`${this.baseUrl}/${id}/block`, request)
      .pipe(catchError(this.handleError));
  }

  /**
   * Activer un tier précédemment bloqué
   */
  activateTier(id: string): Observable<ApiResponseData<Tier>> {
    return this.http
      .post<ApiResponseData<Tier>>(`${this.baseUrl}/${id}/activate`, {})
      .pipe(catchError(this.handleError));
  }

  // ============ GESTION DES RÔLES ============

  /**
   * Ajouter un rôle à un tier
   */
  addRoleToTier(
    id: string,
    roleType: TierRoleType
  ): Observable<ApiResponseData<Tier>> {
    return this.http
      .post<ApiResponseData<Tier>>(`${this.baseUrl}/${id}/roles`, { roleType })
      .pipe(catchError(this.handleError));
  }

  /**
   * Retirer un rôle d'un tier
   */
  removeRoleFromTier(
    id: string,
    roleType: TierRoleType
  ): Observable<ApiResponseData<Tier>> {
    return this.http
      .delete<ApiResponseData<Tier>>(`${this.baseUrl}/${id}/roles/${roleType}`)
      .pipe(catchError(this.handleError));
  }

  // ============ GESTION DES DOCUMENTS ============

  /**
   * Uploader un document pour un tier
   * Compatible avec le contrôleur backend (FormData avec champ 'File')
   */
  uploadDocument(
    tierId: string,
    file: File,
    documentType: DocumentType,
    expiryDate?: Date | string
  ): Observable<ApiResponseData<Tier>> {
    const formData = new FormData();
    formData.append('File', file, file.name);
    formData.append('Type', documentType.toString());

    if (expiryDate) {
      const dateValue = expiryDate instanceof Date
        ? expiryDate.toISOString()
        : expiryDate;
      formData.append('ExpiryDate', dateValue);
    }

    return this.http
      .post<ApiResponseData<Tier>>(
        `${this.baseUrl}/${tierId}/documents`,
        formData,
        {
          headers: new HttpHeaders({ 'Accept': 'application/json' })
        }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Exporter la liste des tiers
   */
  exportTiers(params?: {
    search?: string;
    role?: TierRoleType;
    status?: TierStatus;
    format?: 'csv' | 'excel' | 'pdf' | 'xlsx';
  }): Observable<Blob> {
    let httpParams = new HttpParams();

    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }

    if (params?.role !== undefined) {
      httpParams = httpParams.set('role', params.role.toString());
    }

    if (params?.status !== undefined) {
      httpParams = httpParams.set('status', params.status.toString());
    }

    if (params?.format) {
      httpParams = httpParams.set('format', params.format);
    }

    return this.http
      .get(`${this.baseUrl}/export`, {
        params: httpParams,
        responseType: 'blob'
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Valider un document d'un tier
   */
  validateDocument(
    tierId: string,
    documentId: string
  ): Observable<ApiResponseData<TierDocument>> {
    return this.http
      .post<ApiResponseData<TierDocument>>(
        `${this.baseUrl}/${tierId}/documents/${documentId}/validate`,
        {}
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Rejeter un document d'un tier
   */
  rejectDocument(
    tierId: string,
    documentId: string,
    reason: string
  ): Observable<ApiResponseData<TierDocument>> {
    const request: RejectDocumentRequest = { reason };

    return this.http
      .post<ApiResponseData<TierDocument>>(
        `${this.baseUrl}/${tierId}/documents/${documentId}/reject`,
        request
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtenir la liste des documents d'un tier
   */
  getTierDocuments(
    tierId: string
  ): Observable<ApiResponseData<TierDocument[]>> {
    return this.http
      .get<ApiResponseData<TierDocument[]>>(
        `${this.baseUrl}/${tierId}/documents`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Télécharger un document d'un tier
   */
  downloadDocument(tierId: string, documentId: string): Observable<Blob> {
    return this.http
      .get(`${this.baseUrl}/${tierId}/documents/${documentId}/download`, {
        responseType: 'blob',
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Télécharger un document et déclencher le téléchargement dans le navigateur
   */
  downloadDocumentAndSave(
    tierId: string,
    documentId: string,
    fileName: string
  ): Observable<void> {
    return this.downloadDocument(tierId, documentId).pipe(
      map((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || 'document';
        link.click();
        window.URL.revokeObjectURL(url);
      })
    );
  }

  // ============ NOUVELLES MÉTHODES DE VALIDATION ============

  /**
   * Valider l'expiration de la CNI d'un tier
   */
  validateCniExpiry(tierId: string): Observable<ApiResponseData<boolean>> {
    return this.http
      .get<ApiResponseData<boolean>>(`${this.baseUrl}/${tierId}/validate-cni`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Valider le permis de conduire d'un tier (ClientLivreur)
   */
  validateDriverLicense(tierId: string): Observable<ApiResponseData<boolean>> {
    return this.http
      .get<ApiResponseData<boolean>>(`${this.baseUrl}/${tierId}/validate-driver-license`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Vérifier tous les documents requis d'un tier
   */
  checkAllRequiredDocuments(tierId: string): Observable<ApiResponseData<boolean>> {
    return this.http
      .get<ApiResponseData<boolean>>(`${this.baseUrl}/${tierId}/check-documents`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Vérifier et appliquer le blocage automatique
   */
  checkAndApplyAutoBlock(): Observable<ApiResponseData<number>> {
    return this.http
      .post<ApiResponseData<number>>(`${this.baseUrl}/check-auto-block`, {})
      .pipe(catchError(this.handleError));
  }

  // ============ RECHERCHE ET CONSULTATION ============

  /**
   * Rechercher des tiers avec filtres
   */
  searchTiers(
    criteria: SearchTiersRequest
  ): Observable<ApiResponseData<Tier[]>> {
    let params = new HttpParams()
      .set('page', criteria.page.toString())
      .set('pageSize', criteria.pageSize.toString());

    if (criteria.searchTerm) {
      params = params.set('searchTerm', criteria.searchTerm);
    }

    if (criteria.roleType !== undefined && criteria.roleType !== null) {
      params = params.set('roleType', criteria.roleType.toString());
    }

    if (criteria.status !== undefined && criteria.status !== null) {
      params = params.set('status', criteria.status.toString());
    }

    if (criteria.hasExpiredDocuments !== undefined) {
      params = params.set(
        'hasExpiredDocuments',
        criteria.hasExpiredDocuments.toString()
      );
    }

    return this.http
      .get<ApiResponseData<Tier[]>>(`${this.baseUrl}/search`, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtenir les tiers par rôle
   */
  getTiersByRole(
    roleType: TierRoleType,
    activeOnly: boolean = true
  ): Observable<ApiResponseData<Tier[]>> {
    let params = new HttpParams();
    if (activeOnly !== undefined) {
      params = params.set('activeOnly', activeOnly.toString());
    }

    return this.http
      .get<ApiResponseData<Tier[]>>(`${this.baseUrl}/by-role/${roleType}`, {
        params,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtenir les tiers avec des documents expirant bientôt
   */
  getTiersWithExpiringDocuments(): Observable<ApiResponseData<Tier[]>> {
    return this.http
      .get<ApiResponseData<Tier[]>>(`${this.baseUrl}/expiring-documents`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtenir les statistiques des tiers
   */
  getTierStatistics(): Observable<ApiResponseData<any>> {
    return this.http
      .get<ApiResponseData<any>>(`${this.baseUrl}/statistics`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtenir les documents expirant bientôt (30 jours)
   */
  getExpiringDocuments(daysThreshold: number = 30): Observable<ApiResponseData<TierDocument[]>> {
    let params = new HttpParams();
    if (daysThreshold !== undefined) {
      params = params.set('daysThreshold', daysThreshold.toString());
    }

    return this.http
      .get<ApiResponseData<TierDocument[]>>(`${this.baseUrl}/expiring-documents-list`, { params })
      .pipe(catchError(this.handleError));
  }

  // ============ MÉTHODES UTILITAIRES ============

  /**
   * Vérifier si un tier peut signer un contrat
   */
  canSignContract(id: string): Observable<ApiResponseData<boolean>> {
    return this.http
      .get<ApiResponseData<boolean>>(`${this.baseUrl}/${id}/can-sign-contract`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Vérifier si un tier peut être désactivé
   */
  canBeDeactivated(id: string): Observable<ApiResponseData<boolean>> {
    return this.http
      .get<ApiResponseData<boolean>>(
        `${this.baseUrl}/${id}/can-be-deactivated`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Vérifier si un tier peut modifier son identité
   */
  canModifyIdentity(id: string): Observable<ApiResponseData<boolean>> {
    return this.http
      .get<ApiResponseData<boolean>>(`${this.baseUrl}/${id}/can-modify-identity`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Vérifier si un tier peut signer un nouveau contrat
   */
  canSignNewContract(id: string): Observable<ApiResponseData<boolean>> {
    return this.http
      .get<ApiResponseData<boolean>>(`${this.baseUrl}/${id}/can-sign-new-contract`)
      .pipe(catchError(this.handleError));
  }

  // ============ MÉTHODES UTILITAIRES POUR LE FRONT ============

  /**
   * Générer le numéro de tier (simulation - le vrai est généré côté backend)
   */
  generateTierNumber(): string {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const count = Math.floor(Math.random() * 9999)
      .toString()
      .padStart(4, '0');
    return `TIER-${year}${month}-${count}`;
  }

  /**
   * Vérifier si un tier est actif
   */
  isTierActive(tier: Tier): boolean {
    return tier.status === TierStatus.Active;
  }

  /**
   * Vérifier si un tier peut signer des contrats (version locale)
   */
  canTierSignContracts(tier: Tier): boolean {
    const hasRequiredDocuments = this.checkRequiredDocuments(tier);
    const isActive = this.isTierActive(tier);
    const hasNoExpiredDocuments = !this.hasExpiredDocuments(tier);
    const hasNoActiveContracts = tier.activeContracts === 0;
    const hasNoBalance = tier.balance === 0;

    return hasRequiredDocuments && isActive && hasNoExpiredDocuments &&
           hasNoActiveContracts && hasNoBalance;
  }

  /**
   * Vérifier les documents requis selon les rôles
   */
  private checkRequiredDocuments(tier: Tier): boolean {
    const requiredDocuments: DocumentType[] = [];

    // ClientLivreur
    if (this.tierHasRole(tier, TierRoleType.ClientLivreur)) {
      requiredDocuments.push(
        DocumentType.IdentityCard,
        DocumentType.DriverLicense
      );
    }

    // Supplier
    if (this.tierHasRole(tier, TierRoleType.Supplier)) {
      requiredDocuments.push(
        DocumentType.IdentityCard,
        DocumentType.BusinessLicense
      );
    }

    // Vérifier que tous les documents requis sont présents, validés et non expirés
    return requiredDocuments.every((docType) =>
      tier.documents?.some(
        (doc) =>
          String(doc.type) === String(docType) &&
          doc.status === DocumentStatus.Validated &&
          (!doc.expiryDate || new Date(doc.expiryDate) > new Date())
      )
    );
  }

  /**
   * Vérifier si un tier a un rôle spécifique
   */
  tierHasRole(tier: Tier, roleType: TierRoleType): boolean {
    return (
      tier.roles?.some(
        (role) => role.roleType === roleType && role.isActive
      ) || false
    );
  }

  /**
   * Vérifier si un tier a des documents expirés
   */
  hasExpiredDocuments(tier: Tier): boolean {
    const now = new Date();
    return (
      tier.documents?.some(
        (doc) => doc.expiryDate && new Date(doc.expiryDate) < now
      ) || false
    );
  }

  /**
   * Vérifier si un document expire bientôt (dans les X jours)
   */
  isDocumentExpiringSoon(document: TierDocument, days: number = 30): boolean {
    if (!document.expiryDate) return false;

    const expiryDate = new Date(document.expiryDate);
    const now = new Date();
    const daysFromNow = new Date();
    daysFromNow.setDate(daysFromNow.getDate() + days);

    return expiryDate > now && expiryDate <= daysFromNow;
  }

  /**
   * Obtenir le nom complet du tier
   */
  getFullName(tier: Tier): string {
    if (tier.companyName) {
      return tier.companyName;
    }
    return `${tier.firstName} ${tier.lastName}`.trim();
  }

  /**
   * Obtenir le statut sous forme de texte (français)
   */
  getStatusText(status: TierStatus): string {
    switch (status) {
      case TierStatus.Active:
        return 'Actif';
      case TierStatus.Blocked:
        return 'Bloqué';
      case TierStatus.PendingValidation:
        return 'En attente de validation';
      case TierStatus.Inactive:
        return 'Inactif';
      case TierStatus.Suspended:
        return 'Suspendu';
      case TierStatus.Blacklisted:
        return 'Liste noire';
      case TierStatus.None:
        return 'Aucun';
      default:
        return 'Inconnu';
    }
  }

  /**
   * Obtenir la couleur du statut pour l'UI
   */
  getStatusColor(status: TierStatus): string {
    switch (status) {
      case TierStatus.Active:
        return 'success';
      case TierStatus.Blocked:
      case TierStatus.Blacklisted:
        return 'error';
      case TierStatus.PendingValidation:
        return 'warning';
      case TierStatus.Suspended:
        return 'info';
      case TierStatus.Inactive:
      case TierStatus.None:
        return 'default';
      default:
        return 'default';
    }
  }

  /**
   * Obtenir le texte du statut de document
   */
  getDocumentStatusText(status: DocumentStatus): string {
    switch (status) {
      case DocumentStatus.Pending:
        return 'En attente';
      case DocumentStatus.Validated:
        return 'Validé';
      case DocumentStatus.Rejected:
        return 'Rejeté';
      case DocumentStatus.Expired:
        return 'Expiré';
      default:
        return 'Inconnu';
    }
  }

  /**
   * Obtenir la couleur du statut de document
   */
  getDocumentStatusColor(status: DocumentStatus): string {
    switch (status) {
      case DocumentStatus.Validated:
        return 'success';
      case DocumentStatus.Rejected:
      case DocumentStatus.Expired:
        return 'error';
      case DocumentStatus.Pending:
        return 'warning';
      default:
        return 'default';
    }
  }

  /**
   * Obtenir le nom du type de document
   */
  getDocumentTypeName(type: DocumentType): string {
    switch (type) {
      case DocumentType.IdentityCard:
        return "Carte d'identité";
      case DocumentType.DriverLicense:
        return 'Permis de conduire';
      case DocumentType.VehicleRegistration:
        return 'Carte grise';
      case DocumentType.Insurance:
        return 'Assurance';
      case DocumentType.Contract:
        return 'Contrat';
      case DocumentType.Invoice:
        return 'Facture';
      case DocumentType.Receipt:
        return 'Reçu';
      case DocumentType.MaintenanceReport:
        return 'Rapport de maintenance';
      case DocumentType.BusinessLicense:
        return 'Licence commerciale';
      case DocumentType.Other:
        return 'Autre';
      default:
        return 'Inconnu';
    }
  }

  /**
   * Obtenir le nom du rôle
   */
  getRoleName(roleType: TierRoleType): string {
    switch (roleType) {
      case TierRoleType.ClientLivreur:
        return 'Client-Livreur';
      case TierRoleType.ClientParticulier:
        return 'Client Particulier';
      case TierRoleType.Supplier:
        return 'Fournisseur';
      case TierRoleType.Partner:
        return 'Partenaire';
      default:
        return 'Inconnu';
    }
  }

  /**
   * Formater le numéro de téléphone (format CI)
   */
  formatPhoneNumber(phone: string): string {
    if (!phone) return '';

    const cleaned = phone.replace(/\D/g, '');

    // Format ivoirien : 07 12 34 56 78 ou 05 12 34 56 78
    if (
      cleaned.length === 10 &&
      (cleaned.startsWith('07') || cleaned.startsWith('05'))
    ) {
      return cleaned.replace(
        /(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
        '$1 $2 $3 $4 $5'
      );
    }

    // Format international : +225 07 12 34 56 78
    if (cleaned.length === 13 && cleaned.startsWith('225')) {
      return cleaned.replace(
        /(\d{3})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
        '+$1 $2 $3 $4 $5 $6'
      );
    }

    return phone;
  }

  /**
   * Formater la taille de fichier
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Valider un numéro de téléphone ivoirien
   */
  isValidIvorianPhone(phone: string): boolean {
    if (!phone) return false;

    const cleaned = phone.replace(/\D/g, '');

    // Vérifier le format ivoirien : 10 chiffres commençant par 05 ou 07
    if (cleaned.length === 10) {
      return cleaned.startsWith('07') || cleaned.startsWith('05');
    }

    // Format international : +225 suivi de 10 chiffres
    if (cleaned.length === 13 && cleaned.startsWith('225')) {
      const localPart = cleaned.substring(3);
      return localPart.startsWith('07') || localPart.startsWith('05');
    }

    return false;
  }

  /**
   * Valider une adresse email
   */
  isValidEmail(email: string): boolean {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valider une date d'expiration (CNI > 6 mois)
   */
  isValidCniExpiry(expiryDate: Date): boolean {
    const now = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    return expiryDate > sixMonthsFromNow;
  }

  /**
   * Calculer les jours restants avant expiration
   */
  getDaysUntilExpiry(expiryDate: Date): number {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Obtenir un message d'alerte pour les documents expirant
   */
  getExpiryAlertMessage(document: TierDocument): string {
    if (!document.expiryDate) return '';

    const days = this.getDaysUntilExpiry(new Date(document.expiryDate));

    if (days <= 0) {
      return `Expiré depuis ${Math.abs(days)} jour(s)`;
    } else if (days <= 7) {
      return `Expire dans ${days} jour(s) - URGENT`;
    } else if (days <= 30) {
      return `Expire dans ${days} jour(s)`;
    } else if (days <= 60) {
      return `Expire dans ${days} jour(s)`;
    }

    return '';
  }

  /**
   * Filtrer les documents par type
   */
  filterDocumentsByType(tier: Tier, type: DocumentType): TierDocument[] {
    return tier.documents?.filter(doc => String(doc.type) === String(type)) || [];
  }

  /**
   * Obtenir les documents en attente de validation
   */
  getPendingDocuments(tier: Tier): TierDocument[] {
    return tier.documents?.filter(doc => doc.status === DocumentStatus.Pending) || [];
  }

  /**
   * Obtenir les documents expirés
   */
  getExpiredDocuments(tier: Tier): TierDocument[] {
    const now = new Date();
    return tier.documents?.filter(doc =>
      doc.expiryDate && new Date(doc.expiryDate) < now
    ) || [];
  }

  /**
   * Gestion centralisée des erreurs
   */
  private handleError(error: any): Observable<never> {
    let errorMessage =
      "Une erreur est survenue lors de l'opération sur les tiers";

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400:
          errorMessage =
            error.error?.message ||
            error.error?.errors?.join(', ') ||
            'Données invalides';
          break;
        case 401:
          errorMessage = 'Non autorisé. Veuillez vous reconnecter.';
          break;
        case 403:
          errorMessage =
            "Accès refusé. Vous n'avez pas les permissions nécessaires.";
          break;
        case 404:
          errorMessage = error.error?.message || 'Tier non trouvé';
          break;
        case 409:
          errorMessage =
            error.error?.message ||
            'Un tier avec ce numéro de téléphone existe déjà';
          break;
        case 422:
          errorMessage =
            error.error?.errors?.join(', ') ||
            'Validation des données échouée';
          break;
        case 500:
          errorMessage = 'Erreur serveur interne';
          break;
        default:
          errorMessage = `Erreur ${error.status}: ${error.message}`;
      }
    }

    console.error('TiersService error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
