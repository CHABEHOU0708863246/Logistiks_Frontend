import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ApiResponseData } from '../../models/Common/ApiResponseData';
import { PaginatedResponse } from '../../models/Common/PaginatedResponse';
import { CreateDocumentRequest, UpdateDocumentMetadataRequest, DeleteDocumentRequest, SignDocumentRequest, UpdateDocumentStatusRequest } from '../../models/Documents/Document-request.models';
import { DocumentDto, DocumentComplianceReport, DocumentStatistics } from '../../models/Documents/Document-response.models';
import { DocumentSearchCriteria } from '../../models/Documents/Document-search.models';
import { DocumentEntityType, DocumentStatus } from '../../models/Enums/Logistiks-enums';

@Injectable({
  providedIn: 'root',
})
export class Document {
  private readonly baseUrl = `${environment.apiUrl}/api/Documents`;

  constructor(private http: HttpClient) {}

  // ============ GESTION DE BASE (CRUD) ============

  /**
   * Créer/uploader un nouveau document
   */
  createDocument(
    request: CreateDocumentRequest,
    file: File
  ): Observable<ApiResponseData<Document>> {
    const formData = new FormData();

    // Ajouter le fichier
    formData.append('file', file);

    // Ajouter les autres champs
    formData.append('entityType', request.entityType);
    formData.append('entityId', request.entityId);
    formData.append('type', request.type.toString());
    formData.append('name', request.name || '');

    if (request.description) {
      formData.append('description', request.description);
    }

    if (request.expiryDate) {
      formData.append('expiryDate', request.expiryDate.toISOString());
    }

    if (request.customFields) {
      formData.append('customFields', JSON.stringify(request.customFields));
    }

    return this.http
      .post<ApiResponseData<Document>>(this.baseUrl, formData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtenir un document par son ID
   */
  getDocumentById(id: string): Observable<ApiResponseData<Document>> {
    return this.http
      .get<ApiResponseData<Document>>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtenir tous les documents d'une entité
   */
  getDocumentsByEntity(
    entityType: DocumentEntityType,
    entityId: string
  ): Observable<ApiResponseData<Document[]>> {
    return this.http
      .get<ApiResponseData<Document[]>>(
        `${this.baseUrl}/entity/${entityType}/${entityId}`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Mettre à jour les métadonnées d'un document
   */
  updateDocumentMetadata(
    id: string,
    request: UpdateDocumentMetadataRequest
  ): Observable<ApiResponseData<Document>> {
    return this.http
      .put<ApiResponseData<Document>>(`${this.baseUrl}/${id}/metadata`, request)
      .pipe(catchError(this.handleError));
  }

  /**
   * Remplacer le fichier d'un document
   */
  replaceDocumentFile(
    id: string,
    file: File
  ): Observable<ApiResponseData<Document>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .put<ApiResponseData<Document>>(`${this.baseUrl}/${id}/file`, formData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Télécharger un document
   */
  downloadDocument(id: string): Observable<Blob> {
    return this.http
      .get(`${this.baseUrl}/${id}/download`, {
        responseType: 'blob',
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Télécharger un document avec son nom de fichier
   */
  downloadDocumentWithName(
    id: string
  ): Observable<{ blob: Blob; filename: string }> {
    return this.http
      .get(`${this.baseUrl}/${id}/download`, {
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(
        map((response) => {
          // Extraire le nom du fichier depuis les headers
          const contentDisposition = response.headers.get('content-disposition');
          let filename = 'document';

          if (contentDisposition) {
            const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(
              contentDisposition
            );
            if (matches != null && matches[1]) {
              filename = matches[1].replace(/['"]/g, '');
            }
          }

          return {
            blob: response.body!,
            filename: filename,
          };
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Supprimer un document (soft delete - archivage)
   */
  deleteDocument(id: string, reason: string): Observable<Response> {
    const request: DeleteDocumentRequest = { reason };
    return this.http
      .delete<Response>(`${this.baseUrl}/${id}`, { body: request })
      .pipe(catchError(this.handleError));
  }

  // ============ GESTION DES SIGNATURES ============

  /**
   * Signer un document
   */
  signDocument(
    id: string,
    signatureData: string
  ): Observable<ApiResponseData<Document>> {
    const request: SignDocumentRequest = { signatureData };
    return this.http
      .post<ApiResponseData<Document>>(`${this.baseUrl}/${id}/sign`, request)
      .pipe(catchError(this.handleError));
  }

  /**
   * Vérifier si un document nécessite une signature
   */
  requiresSignature(id: string): Observable<ApiResponseData<boolean>> {
    return this.http
      .get<ApiResponseData<boolean>>(`${this.baseUrl}/${id}/requires-signature`)
      .pipe(catchError(this.handleError));
  }

  // ============ VALIDATION & EXPIRATION ============

  /**
   * Vérifier si un document est expiré
   */
  isDocumentExpired(id: string): Observable<ApiResponseData<boolean>> {
    return this.http
      .get<ApiResponseData<boolean>>(`${this.baseUrl}/${id}/expired`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtenir les documents expirant bientôt
   */
  getExpiringDocuments(
    daysThreshold: number = 30
  ): Observable<ApiResponseData<Document[]>> {
    const params = new HttpParams().set('daysThreshold', daysThreshold.toString());
    return this.http
      .get<ApiResponseData<Document[]>>(`${this.baseUrl}/expiring`, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Archiver automatiquement les documents expirés
   */
  archiveExpiredDocuments(): Observable<ApiResponseData<number>> {
    return this.http
      .post<ApiResponseData<number>>(
        `${this.baseUrl}/automations/archive-expired`,
        {}
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Mettre à jour le statut d'un document
   */
  updateDocumentStatus(
    id: string,
    newStatus: DocumentStatus,
    reason?: string
  ): Observable<ApiResponseData<Document>> {
    const request: UpdateDocumentStatusRequest = { newStatus, reason };
    return this.http
      .put<ApiResponseData<Document>>(`${this.baseUrl}/${id}/status`, request)
      .pipe(catchError(this.handleError));
  }

  // ============ RECHERCHE & CONSULTATION ============

  /**
   * Rechercher des documents avec critères multiples
   */
  searchDocuments(
    criteria: DocumentSearchCriteria
  ): Observable<PaginatedResponse<DocumentDto>> {
    let params = new HttpParams();

    if (criteria.searchTerm) {
      params = params.set('searchTerm', criteria.searchTerm);
    }

    if (criteria.type !== undefined && criteria.type !== null) {
      params = params.set('type', criteria.type.toString());
    }

    if (criteria.entityType) {
      params = params.set('entityType', criteria.entityType);
    }

    if (criteria.entityId) {
      params = params.set('entityId', criteria.entityId);
    }

    if (criteria.isSigned !== undefined) {
      params = params.set('isSigned', criteria.isSigned.toString());
    }

    if (criteria.isExpired !== undefined) {
      params = params.set('isExpired', criteria.isExpired.toString());
    }

    if (criteria.isArchived !== undefined) {
      params = params.set('isArchived', criteria.isArchived.toString());
    }

    if (criteria.createdFrom) {
      params = params.set('createdFrom', criteria.createdFrom.toISOString());
    }

    if (criteria.createdTo) {
      params = params.set('createdTo', criteria.createdTo.toISOString());
    }

    if (criteria.expiringBefore) {
      params = params.set(
        'expiringBefore',
        criteria.expiringBefore.toISOString()
      );
    }

    params = params.set('page', criteria.page.toString());
    params = params.set('pageSize', criteria.pageSize.toString());

    if (criteria.sortBy) {
      params = params.set('sortBy', criteria.sortBy);
    }

    if (criteria.sortDescending !== undefined) {
      params = params.set(
        'sortDescending',
        criteria.sortDescending.toString()
      );
    }

    return this.http
      .get<ApiResponseData<DocumentDto[]>>(`${this.baseUrl}/search`, { params })
      .pipe(
        map((response) => {
          const totalCount = response.totalCount || 0;
          const pageNumber = response.pageNumber || criteria.page;
          const pageSize = response.pageSize || criteria.pageSize;
          const totalPages =
            response.totalPages || Math.ceil(totalCount / pageSize) || 1;

          const paginatedResponse: PaginatedResponse<DocumentDto> = {
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
   * Obtenir les documents par type
   */
  getDocumentsByType(
    type: DocumentType,
    includeArchived: boolean = false
  ): Observable<ApiResponseData<Document[]>> {
    const params = new HttpParams().set(
      'includeArchived',
      includeArchived.toString()
    );
    return this.http
      .get<ApiResponseData<Document[]>>(`${this.baseUrl}/type/${type}`, {
        params,
      })
      .pipe(catchError(this.handleError));
  }

  // ============ INTÉGRITÉ & RÈGLES MÉTIER ============

  /**
   * Vérifier la conformité documentaire d'une entité
   */
  checkDocumentCompliance(
    entityType: DocumentEntityType,
    entityId: string
  ): Observable<ApiResponseData<DocumentComplianceReport>> {
    return this.http
      .get<ApiResponseData<DocumentComplianceReport>>(
        `${this.baseUrl}/compliance/${entityType}/${entityId}`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Vérifier si un document peut être supprimé
   */
  canDeleteDocument(id: string): Observable<ApiResponseData<boolean>> {
    return this.http
      .get<ApiResponseData<boolean>>(`${this.baseUrl}/${id}/can-delete`)
      .pipe(catchError(this.handleError));
  }

  // ============ STATISTIQUES ============

  /**
   * Obtenir les statistiques des documents
   */
  getDocumentStatistics(): Observable<ApiResponseData<DocumentStatistics>> {
    return this.http
      .get<ApiResponseData<DocumentStatistics>>(`${this.baseUrl}/statistics`)
      .pipe(catchError(this.handleError));
  }

  // ============ MÉTHODES UTILITAIRES ============

  /**
   * Télécharger et sauvegarder un document localement
   */
  downloadAndSaveDocument(id: string): Observable<void> {
    return this.downloadDocumentWithName(id).pipe(
      map((result) => {
        // Créer un lien de téléchargement temporaire
        const url = window.URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename;
        link.click();

        // Nettoyer
        window.URL.revokeObjectURL(url);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Valider un document (statut → Validated)
   */
  validateDocument(id: string, reason?: string): Observable<ApiResponseData<Document>> {
    return this.updateDocumentStatus(id, DocumentStatus.Validated, reason);
  }

  /**
   * Rejeter un document (statut → Rejected)
   */
  rejectDocument(id: string, reason: string): Observable<ApiResponseData<Document>> {
    return this.updateDocumentStatus(id, DocumentStatus.Rejected, reason);
  }

  /**
   * Mettre un document en attente (statut → Pending)
   */
  setPendingDocument(id: string, reason?: string): Observable<ApiResponseData<Document>> {
    return this.updateDocumentStatus(id, DocumentStatus.Pending, reason);
  }

  /**
   * Obtenir les documents nécessitant une validation
   */
  getDocumentsPendingValidation(): Observable<PaginatedResponse<DocumentDto>> {
    const criteria: DocumentSearchCriteria = {
      page: 1,
      pageSize: 100,
      sortBy: 'createdAt',
      sortDescending: false,
      isArchived: false,
    };

    return this.searchDocuments(criteria);
  }

  /**
   * Obtenir les documents signés d'une entité
   */
  getSignedDocumentsByEntity(
    entityType: DocumentEntityType,
    entityId: string
  ): Observable<PaginatedResponse<DocumentDto>> {
    const criteria: DocumentSearchCriteria = {
      entityType: entityType.toString(),
      entityId: entityId,
      isSigned: true,
      isArchived: false,
      page: 1,
      pageSize: 50,
      sortBy: 'signedAt',
      sortDescending: true,
    };

    return this.searchDocuments(criteria);
  }

  /**
   * Obtenir les documents expirés d'une entité
   */
  getExpiredDocumentsByEntity(
    entityType: DocumentEntityType,
    entityId: string
  ): Observable<PaginatedResponse<DocumentDto>> {
    const criteria: DocumentSearchCriteria = {
      entityType: entityType.toString(),
      entityId: entityId,
      isExpired: true,
      isArchived: false,
      page: 1,
      pageSize: 50,
      sortBy: 'expiryDate',
      sortDescending: true,
    };

    return this.searchDocuments(criteria);
  }

  /**
   * Obtenir un aperçu d'image du document (si c'est une image)
   */
  getDocumentPreviewUrl(id: string): string {
    return `${this.baseUrl}/${id}/download`;
  }

  /**
   * Vérifier si un fichier est un type de document valide
   */
  isValidDocumentType(file: File): boolean {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    return allowedTypes.includes(file.type);
  }

  /**
   * Vérifier si la taille du fichier est valide
   */
  isValidFileSize(file: File, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }

  /**
   * Formater la taille du fichier
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Obtenir l'icône appropriée pour un type de document
   */
  getDocumentTypeIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (mimeType === 'application/pdf') {
      return 'picture_as_pdf';
    } else if (
      mimeType.includes('word') ||
      mimeType.includes('document')
    ) {
      return 'description';
    } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return 'table_chart';
    } else {
      return 'insert_drive_file';
    }
  }

  /**
   * Obtenir la couleur du badge de statut
   */
  getStatusBadgeColor(status: DocumentStatus): string {
    switch (status) {
      case DocumentStatus.Validated:
        return 'success';
      case DocumentStatus.Rejected:
        return 'danger';
      case DocumentStatus.Pending:
        return 'warning';
      default:
        return 'secondary';
    }
  }

  /**
   * Vérifier si un document est proche de l'expiration (30 jours)
   */
  isNearExpiry(expiryDate?: Date): boolean {
    if (!expiryDate) return false;

    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  }

  /**
   * Calculer les jours jusqu'à l'expiration
   */
  getDaysUntilExpiry(expiryDate?: Date): number | null {
    if (!expiryDate) return null;

    const now = new Date();
    const expiry = new Date(expiryDate);
    const days = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return days;
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
        errorMessage =
          "Accès refusé - Vous n'avez pas les permissions nécessaires";
      } else if (error.status === 404) {
        errorMessage = 'Document introuvable';
      } else if (error.status === 413) {
        errorMessage = 'Fichier trop volumineux';
      } else if (error.status === 415) {
        errorMessage = 'Type de fichier non autorisé';
      } else if (error.status >= 500) {
        errorMessage = 'Erreur serveur - Veuillez réessayer plus tard';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
