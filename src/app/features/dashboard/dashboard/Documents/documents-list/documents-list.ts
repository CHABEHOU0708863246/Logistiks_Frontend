import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { map, Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../../environments/environment.development';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import { DocumentStatus, DocumentEntityType } from '../../../../../core/models/Enums/Logistiks-enums';
import { DocumentDto } from '../../../../../core/models/Documents/Document-response.models';
import { DocumentSearchCriteria } from '../../../../../core/models/Documents/Document-search.models';
import { Auth } from '../../../../../core/services/Auth/auth';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Token } from '../../../../../core/services/Token/token';
import { Document as DocumentService } from '../../../../../core/services/Document/document';
import { NotificationComponent } from '../../../../../core/components/notification-component/notification-component';

@Component({
  selector: 'app-documents-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NotificationComponent],
  templateUrl: './documents-list.html',
  styleUrl: './documents-list.scss',
})
export class DocumentsList implements OnInit, OnDestroy {
  // ============================================================================
  // SECTION 1: ÉNUMÉRATIONS ET CONSTANTES
  // ============================================================================

  /** Énumération des statuts de documents */
  DocumentStatus = DocumentStatus;

  activeMenuDocumentId: string | null = null;

  /** Énumération des types d'entités */
  DocumentEntityType = DocumentEntityType;

  /** Object pour accéder à Object.keys dans le template */
  Object = Object;

  // ============================================================================
  // SECTION 2: PROPRIÉTÉS DE DONNÉES
  // ============================================================================

  /** Liste des documents */
  documents: DocumentDto[] = [];

  /** Document sélectionné pour les détails */
  selectedDocument: DocumentDto | null = null;

  /** Documents expirant bientôt */
  expiringDocuments: DocumentDto[] = [];

  /** Fichier sélectionné pour l'upload */
  selectedFile: File | null = null;

  // ============================================================================
  // SECTION 3: STATISTIQUES
  // ============================================================================

  stats = {
    totalDocuments: 0,
    validatedDocuments: 0,
    pendingDocuments: 0,
    expiredDocuments: 0,
    expiringDocuments: 0,
    archivedDocuments: 0,
    documentsByType: {} as any,
    documentsByEntity: {} as any,
    totalStorageUsed: 0,
    totalStorageFormatted: '0 MB',
  };

  // ============================================================================
  // SECTION 4: PAGINATION
  // ============================================================================

  pagination = {
    currentPage: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  };

  pageSizeOptions = [10, 25, 50, 100];
  visiblePages: number[] = [];

  // ============================================================================
  // SECTION 5: FILTRES ET RECHERCHE
  // ============================================================================

  searchTerm: string = '';
  selectedType: number | null = null;
  selectedStatus: DocumentStatus | null = null;
  selectedEntityType: string | null = null;
  showOnlyExpired: boolean = false;
  showOnlySigned: boolean = false;
  showArchived: boolean = false;

  // ============================================================================
  // SECTION 6: TRI
  // ============================================================================

  selectedSort: string = 'createdAt';
  sortDescending: boolean = true;

  // ============================================================================
  // SECTION 7: ÉTATS DE CHARGEMENT
  // ============================================================================

  loading: boolean = false;
  expiringLoading: boolean = false;
  documentDetailsLoading: boolean = false;
  uploadLoading: boolean = false;
  error: string | null = null;

  // ============================================================================
  // SECTION 8: MODALES
  // ============================================================================

  showDetailsModal: boolean = false;
  showUploadModal: boolean = false;
  sidebarVisible: boolean = false;

  // ============================================================================
  // SECTION 9: FORMULAIRES
  // ============================================================================

  uploadForm!: FormGroup;

  // ============================================================================
  // SECTION 10: UTILISATEUR
  // ============================================================================

  currentUser: User | null = null;
  userName: string = 'Utilisateur';
  userPhotoUrl: string = '';
  showUserMenu: boolean = false;

  // ============================================================================
  // SECTION 11: UI
  // ============================================================================

  isSidebarCollapsed: boolean = false;
  today = new Date();

  // ============================================================================
  // SECTION 12: TYPES ET OPTIONS DE FILTRES
  // ============================================================================

  documentTypes = [
    { value: 0, label: 'Permis de conduire', icon: 'bx bx-id-card' },
    { value: 1, label: 'Carte d\'identité', icon: 'bx bx-id-card' },
    { value: 2, label: 'Passeport', icon: 'bx bx-book' },
    { value: 3, label: 'Certificat d\'immatriculation', icon: 'bx bx-car' },
    { value: 4, label: 'Assurance véhicule', icon: 'bx bx-shield' },
    { value: 5, label: 'Contrat de location', icon: 'bx bx-file' },
    { value: 6, label: 'Facture', icon: 'bx bx-receipt' },
    { value: 7, label: 'Quittance', icon: 'bx bx-dollar' },
    { value: 8, label: 'Rapport d\'inspection', icon: 'bx bx-clipboard' },
    { value: 9, label: 'Photo du véhicule', icon: 'bx bx-image' },
    { value: 10, label: 'Autre', icon: 'bx bx-file-blank' },
  ];

  documentStatuses = [
    { value: DocumentStatus.Pending, label: 'En attente', icon: 'bx bx-time' },
    { value: DocumentStatus.Validated, label: 'Validé', icon: 'bx bx-check-circle' },
    { value: DocumentStatus.Rejected, label: 'Rejeté', icon: 'bx bx-x-circle' },
  ];

  entityTypes = [
    { value: 'Vehicle', label: 'Véhicule', icon: 'bx bx-car' },
    { value: 'Driver', label: 'Conducteur', icon: 'bx bx-user' },
    { value: 'Customer', label: 'Client', icon: 'bx bx-group' },
    { value: 'Contract', label: 'Contrat', icon: 'bx bx-file' },
    { value: 'Payment', label: 'Paiement', icon: 'bx bx-dollar' },
    { value: 'Maintenance', label: 'Maintenance', icon: 'bx bx-wrench' },
    { value: 'Shipment', label: 'Expédition', icon: 'bx bx-package' },
  ];

  // ============================================================================
  // SECTION 13: DESTRUCTION DES OBSERVABLES
  // ============================================================================

  private destroy$ = new Subject<void>();

  // ============================================================================
  // SECTION 14: CONSTRUCTEUR ET INJECTION DE DÉPENDANCES
  // ============================================================================

  constructor(
    private formBuilder: FormBuilder,
    private documentService: DocumentService,
    private notificationService: NotificationService,
    private authService: Auth,
    private tokenService: Token,
    private router: Router
  ) {
    this.initializeForms();
  }

  // ============================================================================
  // SECTION 15: CYCLE DE VIE DU COMPOSANT
  // ============================================================================

  ngOnInit(): void {
    this.checkAuthentication();
    this.loadCurrentUser();
    this.loadDocuments();
    this.loadStatistics();
    this.loadExpiringDocuments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // SECTION 16: INITIALISATION DES FORMULAIRES
  // ============================================================================

  private initializeForms(): void {
    this.uploadForm = this.formBuilder.group({
      entityType: ['', Validators.required],
      entityId: ['', Validators.required],
      type: ['', Validators.required],
      name: [''],
      description: [''],
      expiryDate: [null],
    });
  }

  // ============================================================================
  // SECTION 17: AUTHENTIFICATION
  // ============================================================================

  private checkAuthentication(): void {
    const token = this.tokenService.getToken();
    if (!token) {
      this.router.navigate(['/auth/login']);
    }
  }

  loadCurrentUser(): void {
    this.authService
      .getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: User) => {
          this.currentUser = user;
          this.userName = this.formatUserName(user);
          this.userPhotoUrl = this.getUserPhotoUrl(user);
        },
        error: (error) => {
          console.error('Erreur chargement utilisateur:', error);
          this.handleUserLoadError(error);
        },
      });
  }

  private handleUserLoadError(error: any): void {
    if (error.status === 401) {
      this.tokenService.handleTokenExpired();
    } else {
      this.setDefaultUser();
    }
  }

  private setDefaultUser(): void {
    this.userName = 'Utilisateur Logistiks';
    this.userPhotoUrl = this.generateAvatarUrl({ firstName: 'Utilisateur' } as User);
  }

  formatUserName(user: any): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
      return user.firstName;
    } else if (user.username) {
      return user.username;
    } else if (user.email) {
      return user.email.split('@')[0];
    }
    return 'Utilisateur Logistiks';
  }

  getUserPhotoUrl(user: User): string {
    if (user.photoUrl && /^[0-9a-fA-F]{24}$/.test(user.photoUrl)) {
      return `${environment.apiUrl}/api/User/photo/${user.photoUrl}`;
    }

    if (user.photoUrl && user.photoUrl.startsWith('http')) {
      return user.photoUrl;
    }

    return this.generateAvatarUrl(user);
  }

  generateAvatarUrl(user: User): string {
    const name = this.formatUserName(user);
    const colors = ['FF6B6B', '4ECDC4', 'FFD166', '06D6A0', '118AB2', 'EF476F', '7209B7', '3A86FF'];
    const colorIndex = name.length % colors.length;

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${colors[colorIndex]}&color=fff&size=128`;
  }

  getUserInitials(): string {
    const name = this.userName;
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }

  getDefaultAvatar(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=696cff&color=fff&size=128`;
  }

  // ============================================================================
  // SECTION 18: CHARGEMENT DES DONNÉES
  // ============================================================================

  loadDocuments(): void {
    this.loading = true;
    this.error = null;

    // Construction sécurisée des critères
    const criteria: any = {
      page: this.pagination.currentPage,
      pageSize: this.pagination.pageSize,
      sortBy: this.selectedSort,
      sortDescending: this.sortDescending,
    };

    // Ajouter les filtres seulement s'ils ont une valeur significative
    if (this.searchTerm && this.searchTerm.trim()) {
      criteria.searchTerm = this.searchTerm.trim();
    }

    // IMPORTANT: Ne pas envoyer 0 comme type par défaut
    if (this.selectedType !== undefined && this.selectedType !== null && this.selectedType !== 0) {
      criteria.type = this.selectedType;
    }

    if (this.selectedEntityType && this.selectedEntityType.trim()) {
      criteria.entityType = this.selectedEntityType.trim();
    }

    if (this.showOnlyExpired === true) {
      criteria.isExpired = true;
    }

    if (this.showOnlySigned === true) {
      criteria.isSigned = true;
    }

    if (this.showArchived === true) {
      criteria.isArchived = true;
    }

    console.log('Critères de recherche:', criteria); // Pour déboguer

    this.documentService
      .searchDocuments(criteria as DocumentSearchCriteria)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Vérifier et sécuriser les données reçues
          this.documents = (response.data || []).map(doc => ({
            ...doc,
            relatedEntityId: doc.relatedEntityId || '', // Valeur par défaut
            relatedEntityType: doc.relatedEntityType || 'Non défini',
            description: doc.description || '',
            daysUntilExpiry: doc.daysUntilExpiry || 0
          }));

          this.pagination = {
            currentPage: response.currentPage || 1,
            pageSize: response.pageSize || this.pagination.pageSize,
            totalCount: response.totalCount || 0,
            totalPages: response.totalPages || 1,
            hasPreviousPage: response.hasPreviousPage || false,
            hasNextPage: response.hasNextPage || false,
          };

          this.calculateVisiblePages();
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur détaillée chargement documents:', {
            error: error,
            message: error.message,
            url: error.url,
            criteria: criteria
          });

          this.error = error.message || 'Erreur lors du chargement des documents';
          this.loading = false;
          this.notificationService.error(
            'Erreur lors du chargement des documents',
            error.message || 'Veuillez réessayer plus tard.'
          );
        },
      });
  }

  // Méthode utilitaire pour afficher les IDs d'entité
  getEntityIdPreview(entityId: string | undefined | null): string {
    if (!entityId || entityId.trim() === '') return '-';
    return entityId.length > 12 ? entityId.substring(0, 12) + '...' : entityId;
  }

  loadStatistics(): void {
    this.documentService
      .getDocumentStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.stats = {
              totalDocuments: (response.data as any).totalDocuments || 0,
              validatedDocuments: (response.data as any).signedDocuments || 0,
              pendingDocuments: (response.data as any).pendingSignature || 0,
              expiredDocuments: (response.data as any).expiredDocuments || 0,
              expiringDocuments: (response.data as any).expiringDocuments || 0,
              archivedDocuments: (response.data as any).archivedDocuments || 0,
              documentsByType: (response.data as any).documentsByType || {},
              documentsByEntity: (response.data as any).documentsByEntity || {},
              totalStorageUsed: (response.data as any).totalStorageUsed || 0,
              totalStorageFormatted: (response.data as any).totalStorageFormatted || '0 MB'
            };
          }
        },
        error: (error) => {
          console.error('Erreur chargement statistiques:', error);
        },
      });
  }

  loadExpiringDocuments(): void {
    this.expiringLoading = true;
    this.documentService
      .getExpiringDocuments(30)
      .pipe(
        map(response => ({
          ...response,
          data: (response.data || []).map(doc => this.mapDocumentToDto(doc))
        })),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.expiringDocuments = response.data;
          this.expiringLoading = false;
        },
        error: (error) => {
          console.error('Erreur chargement documents expirants:', error);
          this.expiringLoading = false;
        },
      });
  }

  // Fonction de mapping
  private mapDocumentToDto(document: any): DocumentDto {
    return {
      id: document.id,
      documentNumber: document.documentNumber,
      type: document.type,
      typeLabel: document.typeLabel,
      name: document.name,
      description: document.description,
      fileName: document.fileName,
      fileSize: document.fileSize,
      fileSizeFormatted: document.fileSizeFormatted,
      mimeType: document.mimeType,
      url: document.url,
      relatedEntityType: document.relatedEntityType,
      relatedEntityId: document.relatedEntityId,
      relatedEntityName: document.relatedEntityName,
      isSigned: document.isSigned,
      signedBy: document.signedBy,
      signedAt: document.signedAt,
      expiryDate: document.expiryDate,
      isExpired: document.isExpired,
      daysUntilExpiry: document.daysUntilExpiry,
      pages: document.pages,
      orientation: document.orientation,
      customFields: document.customFields,
      isArchived: document.isArchived,
      createdBy: document.createdBy,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    };
  }

  // ============================================================================
  // SECTION 19: PAGINATION
  // ============================================================================

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages) {
      this.pagination.currentPage = page;
      this.loadDocuments();
    }
  }

  onPageSizeChange(): void {
    this.pagination.currentPage = 1;
    this.loadDocuments();
  }

  calculateVisiblePages(): void {
    const totalPages = this.pagination.totalPages;
    const currentPage = this.pagination.currentPage;
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      this.visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
      let end = Math.min(totalPages, start + maxVisible - 1);

      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }

      this.visiblePages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }
  }

  // ============================================================================
  // SECTION 20: RECHERCHE ET FILTRES
  // ============================================================================

  onSearch(): void {
    this.pagination.currentPage = 1;
    this.loadDocuments();
  }

  onFilterByType(type: number | null): void {
    this.selectedType = type;
    this.pagination.currentPage = 1;
    this.loadDocuments();
  }

  onFilterByStatus(status: DocumentStatus | null): void {
    this.selectedStatus = status;
    this.pagination.currentPage = 1;
    this.loadDocuments();
  }

  onFilterByEntityType(entityType: string | null): void {
    this.selectedEntityType = entityType;
    this.pagination.currentPage = 1;
    this.loadDocuments();
  }

  toggleExpiredFilter(): void {
    this.showOnlyExpired = !this.showOnlyExpired;
    this.pagination.currentPage = 1;
    this.loadDocuments();
  }

  toggleSignedFilter(): void {
    this.showOnlySigned = !this.showOnlySigned;
    this.pagination.currentPage = 1;
    this.loadDocuments();
  }

  toggleArchivedFilter(): void {
    this.showArchived = !this.showArchived;
    this.pagination.currentPage = 1;
    this.loadDocuments();
  }

  toggleFiltersSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
  }

  // ============================================================================
  // SECTION 21: TRI
  // ============================================================================

  onSortChange(column: string): void {
    if (this.selectedSort === column) {
      this.sortDescending = !this.sortDescending;
    } else {
      this.selectedSort = column;
      this.sortDescending = false;
    }
    this.loadDocuments();
  }

  // ============================================================================
  // SECTION 22: ACTIONS SUR LES DOCUMENTS
  // ============================================================================

  showDocumentDetails(document: DocumentDto): void {
    this.selectedDocument = document;
    this.showDetailsModal = true;
    this.documentDetailsLoading = false;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedDocument = null;
  }

  downloadDocument(document: DocumentDto): void {
    if (!document.id) {
      this.notificationService.error('ID du document manquant', 'Impossible de télécharger le document.');
      return;
    }

    this.documentService
      .downloadAndSaveDocument(document.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.success('Document téléchargé avec succès', 'Le document a été enregistré sur votre appareil.');
        },
        error: (error) => {
          console.error('Erreur téléchargement document:', error);
          this.notificationService.error('Erreur lors du téléchargement du document', 'Veuillez réessayer plus tard.');
        },
      });
  }

  validateDocument(document: DocumentDto): void {
    if (!document.id) return;

    this.documentService
      .validateDocument(document.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.success('Document validé avec succès', 'Le document a été marqué comme validé.');
          this.loadDocuments();
          this.loadStatistics();
        },
        error: (error) => {
          console.error('Erreur validation document:', error);
          this.notificationService.error('Erreur lors de la validation du document', 'Veuillez réessayer plus tard.');
        },
      });
  }

  toggleActionsMenu(document: DocumentDto & { showActionsMenu?: boolean }, event: Event): void {
    event.stopPropagation();
    this.documents.forEach((d) => {
      if (d !== document) {
        (d as DocumentDto & { showActionsMenu?: boolean }).showActionsMenu = false;
      }
    });
    document.showActionsMenu = !document.showActionsMenu;
  }

  closeAllMenus(): void {
    this.activeMenuDocumentId = null;
  }

  // ============================================================================
  // SECTION 23: UPLOAD DE DOCUMENTS
  // ============================================================================

  openUploadModal(): void {
    this.showUploadModal = true;
    this.uploadForm.reset();
    this.selectedFile = null;
  }

  closeUploadModal(): void {
    this.showUploadModal = false;
    this.uploadForm.reset();
    this.selectedFile = null;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validation de la taille
      if (!this.documentService.isValidFileSize(file, 10)) {
        this.notificationService.error('Le fichier est trop volumineux (max 10 MB)', 'Veuillez sélectionner un fichier plus petit.');
        return;
      }

      // Validation du type
      if (!this.documentService.isValidDocumentType(file)) {
        this.notificationService.error('Type de fichier non autorisé', 'Veuillez sélectionner un fichier PDF, DOCX, JPG ou PNG.');
        return;
      }

      this.selectedFile = file;
    }
  }

  onUploadSubmit(): void {
    if (this.uploadForm.invalid || !this.selectedFile) {
      this.notificationService.error('Veuillez remplir tous les champs requis', 'et sélectionner un fichier à uploader.');
      return;
    }

    this.uploadLoading = true;

    const request = {
      entityType: this.uploadForm.value.entityType,
      entityId: this.uploadForm.value.entityId,
      type: this.uploadForm.value.type,
      name: this.uploadForm.value.name || this.selectedFile.name,
      description: this.uploadForm.value.description,
      expiryDate: this.uploadForm.value.expiryDate ? new Date(this.uploadForm.value.expiryDate) : undefined,
    };

    this.documentService
      .createDocument(request, this.selectedFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.success('Document uploadé avec succès', 'Le document a été ajouté à la liste.');
          this.uploadLoading = false;
          this.closeUploadModal();
          this.loadDocuments();
          this.loadStatistics();
        },
        error: (error) => {
          console.error('Erreur upload document:', error);
          this.notificationService.error('Erreur lors de l\'upload du document', 'Veuillez réessayer plus tard.');
          this.uploadLoading = false;
        },
      });
  }

  // ============================================================================
  // SECTION 24: HELPERS ET UTILITAIRES
  // ============================================================================

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  formatFileSize(bytes: number | undefined): string {
    if (!bytes) return '0 B';
    return this.documentService.formatFileSize(bytes);
  }

  getDocumentTypeIcon(mimeType: string | undefined): string {
    if (!mimeType) return 'bx bx-file';
    return this.documentService.getDocumentTypeIcon(mimeType);
  }

  getDocumentTypeName(type: number): string {
    const docType = this.documentTypes.find((t) => t.value === type);
    return docType ? docType.label : 'Inconnu';
  }

  getStatusBadgeClass(status: DocumentStatus): string {
    return this.documentService.getStatusBadgeColor(status);
  }

  getStatusIcon(status: DocumentStatus): string {
    switch (status) {
      case DocumentStatus.Validated:
        return 'bx bx-check-circle';
      case DocumentStatus.Rejected:
        return 'bx bx-x-circle';
      case DocumentStatus.Pending:
        return 'bx bx-time';
      default:
        return 'bx bx-file';
    }
  }

  getStatusText(status: DocumentStatus): string {
    switch (status) {
      case DocumentStatus.Validated:
        return 'Validé';
      case DocumentStatus.Rejected:
        return 'Rejeté';
      case DocumentStatus.Pending:
        return 'En attente';
      default:
        return 'Inconnu';
    }
  }

  getEntityTypeIcon(entityType: string): string {
    const entity = this.entityTypes.find((e) => e.value === entityType);
    return entity ? entity.icon : 'bx bx-file';
  }

  getEntityTypeBadgeClass(entityType: string): string {
    const classes: { [key: string]: string } = {
      Vehicle: 'bg-primary',
      Driver: 'bg-success',
      Customer: 'bg-info',
      Contract: 'bg-warning',
      Payment: 'bg-danger',
      Maintenance: 'bg-secondary',
      Shipment: 'bg-dark',
    };
    return classes[entityType] || 'bg-secondary';
  }

  isNearExpiry(expiryDate: Date | undefined): boolean {
    if (!expiryDate) return false;
    return this.documentService.isNearExpiry(expiryDate);
  }

  getDaysUntilExpiry(expiryDate: Date | undefined): string {
    if (!expiryDate) return '-';
    const days = this.documentService.getDaysUntilExpiry(expiryDate);
    if (days === null) return '-';
    if (days < 0) return 'Expiré';
    if (days === 0) return 'Expire aujourd\'hui';
    if (days === 1) return '1 jour restant';
    return `${days} jours restants`;
  }

  getExpiryBadgeClass(daysUntilExpiry: number | undefined): string {
    if (daysUntilExpiry === undefined || daysUntilExpiry === null) return 'bg-secondary';
    if (daysUntilExpiry < 0) return 'bg-danger';
    if (daysUntilExpiry <= 7) return 'bg-warning';
    if (daysUntilExpiry <= 30) return 'bg-info';
    return 'bg-success';
  }

  // ============================================================================
  // SECTION 25: ACTIONS MODALES (STUBS)
  // ============================================================================

  openEditMetadataModal(document: DocumentDto): void {
    this.notificationService.info('Fonctionnalité en cours de développement', 'La modification des métadonnées sera bientôt disponible.');
  }

  openReplaceFileModal(document: DocumentDto): void {
    this.notificationService.info('Fonctionnalité en cours de développement', 'Le remplacement du fichier sera bientôt disponible.');
  }

  openRejectModal(document: DocumentDto): void {
    this.notificationService.info('Fonctionnalité en cours de développement', 'Le rejet du document sera bientôt disponible.');
  }

  openSignModal(document: DocumentDto): void {
    this.notificationService.info('Fonctionnalité en cours de développement', 'La signature du document sera bientôt disponible.');
  }

  openDeleteModal(document: DocumentDto): void {
    this.notificationService.info('Fonctionnalité en cours de développement', 'La suppression du document sera bientôt disponible.');
  }

  // ============================================================================
  // SECTION 26: EXPORT
  // ============================================================================

  exportToExcel(): void {
    this.notificationService.info('Export en cours de développement', 'L\'export des documents sera bientôt disponible.');
  }

  getDocumentStatus(document: DocumentDto): DocumentStatus {
    if (document.isArchived) {
      return 'Archived' as unknown as DocumentStatus;
    }
    if (document.isExpired) {
      return 'Expired' as unknown as DocumentStatus;
    }
    if (document.isSigned) {
      return 'Signed' as unknown as DocumentStatus;
    }
    // Vérifier si le document expire bientôt
    if (document.daysUntilExpiry !== undefined && document.daysUntilExpiry > 0 && document.daysUntilExpiry <= 30) {
      return 'Expiring' as unknown as DocumentStatus;
    }
    return 'Pending' as unknown as DocumentStatus;
  }

  // ============================================================================
  // SECTION 27: INTERFACE UTILISATEUR
  // ============================================================================

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  @HostListener('document:click', ['$event'])
  closeUserMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-toggle') && !target.closest('.dropdown-menu')) {
      this.showUserMenu = false;
    }
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleMenu(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    if (element && element.parentElement) {
      element.parentElement.classList.toggle('open');
    }
  }

  // ============================================================================
  // SECTION 28: DÉCONNEXION
  // ============================================================================

  logout(): void {
    console.log('🚪 Déconnexion en cours...');
    this.tokenService.logout();

    this.authService
      .logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Déconnexion API réussie');
          this.router.navigate(['/auth/login']);
        },
        error: (error) => {
          console.warn('⚠️ Erreur API déconnexion (ignorée):', error);
          this.router.navigate(['/auth/login']);
        },
      });
  }
}
