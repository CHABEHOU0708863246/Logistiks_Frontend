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
import { Tiers } from '../../../../../core/services/Tiers/tiers';
import { Vehicles } from '../../../../../core/services/Vehicles/vehicles';
import { CreateDocumentRequest } from '../../../../../core/models/Documents/Document-request.models';

@Component({
  selector: 'app-documents-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NotificationComponent],
  templateUrl: './documents-list.html',
  styleUrl: './documents-list.scss',
})
export class DocumentsList implements OnInit, OnDestroy {

  // ============================================================================
// SECTION 8: MODALES
// ============================================================================

showDetailsModal: boolean = false;
showUploadModal: boolean = false;
showEditMetadataModal: boolean = false;
showReplaceFileModal: boolean = false;
showRejectModal: boolean = false;
showSignModal: boolean = false;
showDeleteModal: boolean = false;
sidebarVisible: boolean = false;

// Pour les formulaires modaux
metadataForm!: FormGroup;
rejectForm!: FormGroup;
signForm!: FormGroup;
deleteForm!: FormGroup;
replaceFileForm!: FormGroup;

// Fichier pour remplacement
replacementFile: File | null = null;
  // ============================================================================
  // SECTION 1: ÉNUMÉRATIONS ET CONSTANTES
  // ============================================================================

  vehicles: any[] = [];
  drivers: any[] = [];
  customers: any[] = [];
  contracts: any[] = [];
  loadingEntities: boolean = false;
  selectedEntity: any = null;

  private destroy$ = new Subject<void>();
  private refreshInterval: any;

  tiers: any[] = [];
  expenses: any[] = [];
  maintenances: any[] = [];

  /** Énumération des statuts de documents */
  DocumentStatus = DocumentStatus;

  uploadSubmitted: boolean = false;

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
    { value: 'Maintenance', label: 'Maintenance', icon: 'bx bx-wrench' },
    { value: 'Tier', label: 'Tier (Client/Fournisseur/Partenaire/Particulier)', icon: 'bx bx-user' },
    { value: 'Contract', label: 'Contrat', icon: 'bx bx-file' },
    { value: 'Expense', label: 'Dépense', icon: 'bx bx-dollar' },
  ];

  // ============================================================================
  // SECTION 13: DESTRUCTION DES OBSERVABLES
  // ============================================================================

  // ============================================================================
  // SECTION 14: CONSTRUCTEUR ET INJECTION DE DÉPENDANCES
  // ============================================================================

  constructor(
    private formBuilder: FormBuilder,
    private documentService: DocumentService,
    private notificationService: NotificationService,
    private authService: Auth,
    private tokenService: Token,
    private vehicleService: Vehicles,  // Ajoute ceci
    private tierService: Tiers,
    private router: Router
  ) {
    this.initializeForms();
  }

  // ============================================================================
  // SECTION : GESTION DES ENTITÉS
  // ============================================================================

  /**
   * Appelée quand le type d'entité change
   */
  onEntityTypeChange(): void {
    const entityType = this.uploadForm.get('entityType')?.value;

    // Réinitialiser l'entité sélectionnée
    this.uploadForm.patchValue({ entityId: '' });
    this.selectedEntity = null;

    // Charger les entités selon le type
    if (entityType) {
      this.loadEntitiesByType(entityType);
    }
  }

  /**
   * Charger les entités selon leur type
   */
  private loadEntitiesByType(entityType: string): void {
    this.loadingEntities = true;

    switch (entityType) {
      case 'Vehicle':
        this.loadVehicles();
        break;
      case 'Tier':
        this.loadTiers();
        break;
      case 'Contract':
        this.loadContracts();
        break;
      case 'Expense':
        this.loadExpenses();
        break;
      case 'Maintenance':
        this.loadMaintenances();
        break;
      default:
        this.loadingEntities = false;
    }
  }

  /**
   * Charger la liste des véhicules
   */
  private loadVehicles(): void {
    this.vehicleService
      .searchVehicles({
        page: 1,
        pageSize: 100,
        sortBy: 'code',
        sortDescending: false
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.vehicles = response.data || [];
          this.loadingEntities = false;
        },
        error: (error) => {
          console.error('Erreur chargement véhicules:', error);
          this.notificationService.error('Erreur', 'Impossible de charger les véhicules');
          this.loadingEntities = false;
        }
      });
  }

  /**
   * Charger la liste des tiers
   */
  private loadTiers(): void {
    this.tierService
      .getTiersList({
        pageNumber: 1,
        pageSize: 100,
        sortBy: 'firstName',
        sortDescending: false
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.tiers = response.data || [];
          this.loadingEntities = false;
        },
        error: (error) => {
          console.error('Erreur chargement tiers:', error);
          this.notificationService.error('Erreur', 'Impossible de charger les tiers');
          this.loadingEntities = false;
        }
      });
  }

  /**
   * Charger la liste des contrats (à implémenter avec ton service)
   */
  private loadContracts(): void {
    // TODO: Implémenter avec ton service de contrats
    this.contracts = [];
    this.loadingEntities = false;
    this.notificationService.info('Info', 'Chargement des contrats à implémenter');
  }

  /**
   * Charger la liste des dépenses (à implémenter)
   */
  private loadExpenses(): void {
    // TODO: Implémenter avec ton service de dépenses
    this.expenses = [];
    this.loadingEntities = false;
    this.notificationService.info('Info', 'Chargement des dépenses à implémenter');
  }

  /**
   * Charger la liste des maintenances (à implémenter)
   */
  private loadMaintenances(): void {
    // TODO: Implémenter avec ton service de maintenances
    this.maintenances = [];
    this.loadingEntities = false;
    this.notificationService.info('Info', 'Chargement des maintenances à implémenter');
  }

  /**
   * Appelée quand une entité est sélectionnée
   */
  onEntitySelected(): void {
    const entityType = this.uploadForm.get('entityType')?.value;
    const entityId = this.uploadForm.get('entityId')?.value;

    if (!entityType || !entityId) {
      this.selectedEntity = null;
      return;
    }

    // Trouver l'entité sélectionnée dans la liste appropriée
    switch (entityType) {
      case 'Vehicle':
        this.selectedEntity = this.vehicles.find(v => v.id === entityId);
        break;
      case 'Tier':
        this.selectedEntity = this.tiers.find(t => t.id === entityId);
        break;
      case 'Contract':
        this.selectedEntity = this.contracts.find(c => c.id === entityId);
        break;
      case 'Expense':
        this.selectedEntity = this.expenses.find(e => e.id === entityId);
        break;
      case 'Maintenance':
        this.selectedEntity = this.maintenances.find(m => m.id === entityId);
        break;
    }
  }

  /**
   * Obtenir le nom d'affichage de l'entité sélectionnée
   */
  getEntityDisplayName(entity: any): string {
    if (!entity) return '';

    const entityType = this.uploadForm.get('entityType')?.value;

    switch (entityType) {
      case 'Vehicle':
        return `${entity.code} - ${entity.brand} ${entity.model}`;
      case 'Tier':
        return `${entity.firstName} ${entity.lastName}`;
      case 'Contract':
        return entity.contractNumber || entity.id;
      case 'Expense':
        return entity.description || entity.id;
      case 'Maintenance':
        return entity.description || entity.id;
      default:
        return entity.name || entity.id;
    }
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
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopAutoRefresh();
  }

  /**
 * Démarrer l'actualisation automatique
 */
private startAutoRefresh(): void {
  // Actualiser toutes les données toutes les 30 secondes
  this.refreshInterval = setInterval(() => {
    this.refreshData();
  }, 30000); // 30 secondes
}

/**
 * Arrêter l'actualisation automatique
 */
private stopAutoRefresh(): void {
  if (this.refreshInterval) {
    clearInterval(this.refreshInterval);
  }
}


/**
 * Actualiser toutes les données
 */
private refreshData(): void {
  console.log('🔄 Actualisation automatique des données...');

  // Actualiser seulement si l'utilisateur est sur cette page
  if (!this.router.url.includes('/documents')) {
    return;
  }

  // Actualiser les documents expirants
  this.loadExpiringDocuments();

  // Actualiser les statistiques
  this.loadStatistics();

  // Vérifier si un document a changé de statut
  this.checkDocumentStatusChanges();
}

/**
 * Vérifier les changements de statut des documents
 */
private checkDocumentStatusChanges(): void {
  if (this.documents.length === 0) return;

  // Créer une copie des IDs actuels
  const currentDocumentIds = this.documents.map(doc => doc.id);

  this.documentService
    .searchDocuments({
      page: 1,
      pageSize: this.documents.length,
      sortBy: 'updatedAt',
      sortDescending: true
    } as DocumentSearchCriteria)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        const updatedDocuments = response.data || [];

        // Vérifier si des documents ont changé de statut
        let hasChanges = false;

        updatedDocuments.forEach(updatedDoc => {
          const existingDoc = this.documents.find(d => d.id === updatedDoc.id);

          if (existingDoc) {
            // Vérifier si le statut a changé
            if (existingDoc.isSigned !== updatedDoc.isSigned ||
                existingDoc.isArchived !== updatedDoc.isArchived ||
                existingDoc.isExpired !== updatedDoc.isExpired) {

              // Mettre à jour le document dans la liste
              const index = this.documents.findIndex(d => d.id === updatedDoc.id);
              if (index !== -1) {
                this.documents[index] = {
                  ...this.documents[index],
                  isSigned: updatedDoc.isSigned,
                  isArchived: updatedDoc.isArchived,
                  isExpired: updatedDoc.isExpired
                };
                hasChanges = true;
              }
            }

            // Vérifier si la date d'expiration a changé
            if (existingDoc.expiryDate?.toString() !== updatedDoc.expiryDate?.toString()) {
              const index = this.documents.findIndex(d => d.id === updatedDoc.id);
              if (index !== -1) {
                this.documents[index] = {
                  ...this.documents[index],
                  expiryDate: updatedDoc.expiryDate,
                  isExpired: updatedDoc.isExpired,
                  daysUntilExpiry: updatedDoc.daysUntilExpiry
                };
                hasChanges = true;
              }
            }
          }
        });

        if (hasChanges) {
          console.log('📄 Mise à jour automatique des statuts de documents');
          // Notifier l'utilisateur discrètement
          this.notificationService.info(
            'Mise à jour',
            'Les statuts des documents ont été actualisés',
          );
        }
      },
      error: (error) => {
        console.error('Erreur lors de la vérification des changements:', error);
      }
    });
}

/**
 * Rafraîchir les données manuellement
 */
refreshAllData(): void {
  this.loadDocuments();
  this.loadStatistics();
  this.loadExpiringDocuments();

  this.notificationService.success(
    'Actualisation',
    'Les données ont été actualisées'
  );
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

  this.metadataForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', Validators.maxLength(500)],
    type: ['', Validators.required],
    expiryDate: [null]
  });

  this.rejectForm = this.formBuilder.group({
    reason: ['', [Validators.required, Validators.maxLength(500)]],
    notifyOwner: [true]
  });

  this.signForm = this.formBuilder.group({
    signatureType: ['digital', Validators.required],
    comment: ['', Validators.maxLength(500)],
    password: ['', Validators.required]
  });

  this.deleteForm = this.formBuilder.group({
    reason: ['', Validators.maxLength(500)],
    permanentDelete: [false]
  });

  this.replaceFileForm = this.formBuilder.group({
    versionComment: ['', Validators.maxLength(500)]
  });
}



  getEntityLabel(lowercase: boolean = false): string {
    const entityType = this.uploadForm.get('entityType')?.value;

    if (!entityType) return lowercase ? 'une entité' : 'Entité';

    const entity = this.entityTypes.find(e => e.value === entityType);
    if (!entity) return lowercase ? 'une entité' : 'Entité';

    return lowercase ? entity.label.toLowerCase() : entity.label;
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

loadExpiringDocuments(forceRefresh: boolean = false): void {
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

        // Émettre un événement pour informer les autres composants
        this.emitExpiringDocumentsUpdated();
      },
      error: (error) => {
        console.error('Erreur chargement documents expirants:', error);
        this.expiringLoading = false;
      },
    });
}

/**
 * Émettre un événement de mise à jour des documents expirants
 */
private emitExpiringDocumentsUpdated(): void {
  // Créer un événement personnalisé pour informer les autres parties de l'application
  const event = new CustomEvent('expiringDocumentsUpdated', {
    detail: { count: this.expiringDocuments.length }
  });
  window.dispatchEvent(event);
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

  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toUpperCase() || 'FILE';
  }


  removeFile(): void {
    this.selectedFile = null;
    // Réinitialiser l'input file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }



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
        this.notificationService.success(
          'Document validé avec succès',
          'Le document a été marqué comme validé.'
        );

        // Mettre à jour le statut localement immédiatement
        const index = this.documents.findIndex(d => d.id === document.id);
        if (index !== -1) {
          this.documents[index] = {
            ...this.documents[index],
            isSigned: true,
            isExpired: false
          };
        }

        // Mettre à jour les données
        this.loadStatistics();
        this.loadExpiringDocuments();
      },
      error: (error) => {
        console.error('Erreur validation document:', error);
        this.notificationService.error(
          'Erreur lors de la validation du document',
          'Veuillez réessayer plus tard.'
        );
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

      // Optionnel : mettre à jour le nom du document automatiquement
      if (!this.uploadForm.get('name')?.value) {
        this.uploadForm.patchValue({
          name: file.name.replace(/\.[^/.]+$/, "") // Enlever l'extension
        });
      }
    }
  }

  onUploadSubmit(): void {
    this.uploadSubmitted = true;

    if (this.uploadForm.invalid || !this.selectedFile) {
      this.notificationService.error(
        'Formulaire incomplet',
        'Veuillez remplir tous les champs requis et sélectionner un fichier.'
      );
      return;
    }

    this.uploadLoading = true;

    // Convertir les valeurs aux bons types
    const formValue = this.uploadForm.value;

    // Important: Convertir le type string en DocumentType enum
    const documentType: DocumentType = parseInt(formValue.type) as unknown as DocumentType;

    // Si entityType doit être DocumentEntityType, convertir également
    const entityType = formValue.entityType; // Laissez comme string si c'est ce qu'attend l'API
    // OU si c'est DocumentEntityType :
    // const entityType = parseInt(formValue.entityType) as DocumentEntityType;

    const request: CreateDocumentRequest = {
      entityType: entityType,
      entityId: formValue.entityId,
      type: documentType,
      name: formValue.name || this.selectedFile.name,
      description: formValue.description,
      expiryDate: formValue.expiryDate
        ? new Date(formValue.expiryDate)
        : undefined,
    };

    console.log('Envoi du document:', request); // Pour debug

    this.documentService
      .createDocument(request, this.selectedFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.success(
            'Succès',
            'Le document a été uploadé avec succès'
          );
          this.uploadLoading = false;
          this.closeUploadModal();
          this.loadDocuments();
          this.loadStatistics();
        },
        error: (error) => {
          console.error('Erreur upload document:', error);
          this.notificationService.error(
            'Erreur',
            error.message || 'Erreur lors de l\'upload du document'
          );
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

  getDocumentDisplayName(document: DocumentDto): string {
  // Si le document a déjà un nom en français, le garder
  if (document.name && document.name.trim() !== '') {
    return document.name;
  }

  // Sinon, utiliser le type traduit
  const typeName = this.getDocumentTypeName(document.type);
  return `${typeName} - ${document.relatedEntityName || ''}`.trim();
}


/**
 * Obtenir le label français du statut d'un document
 */
getDocumentStatusLabel(document: DocumentDto): string {
  if (document.isArchived) {
    return 'Archivé';
  }
  if (document.isExpired) {
    return 'Expiré';
  }
  if (document.isSigned) {
    return 'Signé';
  }
  // Vérifier si le document expire bientôt
  if (document.daysUntilExpiry !== undefined &&
      document.daysUntilExpiry > 0 &&
      document.daysUntilExpiry <= 30) {
    return 'Expire bientôt';
  }
  return 'En attente';
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
  this.selectedDocument = document;
  this.metadataForm.patchValue({
    name: document.name,
    description: document.description || '',
    type: document.type,
    expiryDate: document.expiryDate ? this.formatDateForInput(document.expiryDate) : null
  });
  this.showEditMetadataModal = true;
}


closeEditMetadataModal(): void {
  this.showEditMetadataModal = false;
  this.metadataForm.reset();
  this.selectedDocument = null;
}

onUpdateMetadata(): void {
  if (this.metadataForm.invalid || !this.selectedDocument) return;

  const updates = this.metadataForm.value;
  this.documentService.updateDocumentMetadata(this.selectedDocument.id, updates)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.notificationService.success(
          'Métadonnées mises à jour',
          'Les informations du document ont été modifiées.'
        );
        this.closeEditMetadataModal();
        this.loadDocuments();
      },
      error: (error) => {
        console.error('Erreur mise à jour métadonnées:', error);
        this.notificationService.error(
          'Erreur',
          'Impossible de mettre à jour les métadonnées.'
        );
      }
    });
}

  openReplaceFileModal(document: DocumentDto): void {
  this.selectedDocument = document;
  this.replacementFile = null;
  this.showReplaceFileModal = true;
}

closeReplaceFileModal(): void {
  this.showReplaceFileModal = false;
  this.replaceFileForm.reset();
  this.replacementFile = null;
  this.selectedDocument = null;
}

onReplacementFileSelected(event: any): void {
  const file = event.target.files[0];
  if (file) {
    if (!this.documentService.isValidFileSize(file, 10)) {
      this.notificationService.error('Le fichier est trop volumineux', 'Max 10 MB');
      return;
    }

    if (!this.documentService.isValidDocumentType(file)) {
      this.notificationService.error('Type non autorisé', 'PDF, DOCX, JPG ou PNG uniquement');
      return;
    }

    this.replacementFile = file;
  }
}

onReplaceFile(): void {
  if (!this.selectedDocument || !this.replacementFile) return;

  this.documentService.replaceDocumentFile(
    this.selectedDocument.id,
    this.replacementFile
  ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.notificationService.success(
          'Fichier remplacé',
          'Le fichier a été mis à jour avec succès.'
        );
        this.closeReplaceFileModal();
        this.loadDocuments();
      },
      error: (error) => {
        console.error('Erreur remplacement fichier:', error);
        this.notificationService.error(
          'Erreur',
          'Impossible de remplacer le fichier.'
        );
      }
    });
}

openRejectModal(document: DocumentDto): void {
  this.selectedDocument = document;
  this.rejectForm.reset({
    notifyOwner: true
  });
  this.showRejectModal = true;
}

closeRejectModal(): void {
  this.showRejectModal = false;
  this.rejectForm.reset();
  this.selectedDocument = null;
}

onRejectDocument(): void {
  if (this.rejectForm.invalid || !this.selectedDocument) return;

  const rejectData = this.rejectForm.value;
  this.documentService.rejectDocument(this.selectedDocument.id, rejectData)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.notificationService.success(
          'Document rejeté',
          'Le document a été marqué comme rejeté.'
        );
        this.closeRejectModal();
        this.loadDocuments();
        this.loadStatistics();
      },
      error: (error) => {
        console.error('Erreur rejet document:', error);
        this.notificationService.error(
          'Erreur',
          'Impossible de rejeter le document.'
        );
      }
    });
}

openSignModal(document: DocumentDto): void {
  this.selectedDocument = document;
  this.signForm.reset({
    signatureType: 'digital'
  });
  this.showSignModal = true;
}

closeSignModal(): void {
  this.showSignModal = false;
  this.signForm.reset();
  this.selectedDocument = null;
}

onSignDocument(): void {
  if (this.signForm.invalid || !this.selectedDocument) return;

  const signData = this.signForm.value;
  this.documentService.signDocument(this.selectedDocument.id, signData)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.notificationService.success(
          'Document signé',
          'Le document a été signé avec succès.'
        );
        this.closeSignModal();
        this.loadDocuments();
        this.loadStatistics();
      },
      error: (error) => {
        console.error('Erreur signature document:', error);
        this.notificationService.error(
          'Erreur',
          error.message || 'Impossible de signer le document.'
        );
      }
    });
}

openDeleteModal(document: DocumentDto): void {
  this.selectedDocument = document;
  this.deleteForm.reset({
    permanentDelete: false
  });
  this.showDeleteModal = true;
}

closeDeleteModal(): void {
  this.showDeleteModal = false;
  this.deleteForm.reset();
  this.selectedDocument = null;
}

onDeleteDocument(): void {
  if (!this.selectedDocument) return;

  const deleteData = this.deleteForm.value;
  const isPermanent = deleteData.permanentDelete;
  const reason = deleteData.reason || 'Suppression manuelle';

  if (isPermanent) {
    // Suppression permanente
    this.documentService.deleteDocument(this.selectedDocument.id, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.success(
            'Document supprimé',
            'Le document a été supprimé définitivement.'
          );
          this.closeDeleteModal();
          this.loadDocuments();
          this.loadStatistics();
        },
        error: (error) => {
          console.error('Erreur suppression document:', error);
          this.notificationService.error(
            'Erreur',
            error.message || 'Impossible de supprimer le document.'
          );
        }
      });
  } else {
    // Archivage via mise à jour du statut
    this.documentService.updateDocumentStatus(
      this.selectedDocument.id,
      'Archived' as any, // Ou utilisez l'enum approprié
      reason
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.success(
            'Document archivé',
            'Le document a été déplacé vers les archives.'
          );
          this.closeDeleteModal();
          this.loadDocuments();
          this.loadStatistics();
        },
        error: (error: any) => {
          console.error('Erreur archivage document:', error);
          this.notificationService.error(
            'Erreur',
            error.message || 'Impossible d\'archiver le document.'
          );
        }
      });
  }
}

navigateToEntity(entityType: string, entityId: string): void {
  switch (entityType) {
    case 'Vehicle':
      this.router.navigate(['/vehicles/details', entityId]);
      break;
    case 'Tier':
      this.router.navigate(['/tiers/details', entityId]);
      break;
    case 'Contract':
      this.router.navigate(['/contracts/details', entityId]);
      break;
    case 'Expense':
      this.router.navigate(['/expenses/details', entityId]);
      break;
    case 'Maintenance':
      this.router.navigate(['/maintenances/details', entityId]);
      break;
    default:
      this.notificationService.info(
        'Navigation',
        `La navigation vers les détails des ${entityType.toLowerCase()}s n'est pas encore implémentée.`
      );
  }
}

// Méthode utilitaire pour formater la date pour l'input
private formatDateForInput(date: Date | string): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// Obtenir les informations complètes d'une entité
getEntityDetails(entityType: string, entityId: string): any {
  // Ici, vous devriez implémenter la logique pour récupérer les détails de l'entité
  // selon son type (véhicule, tier, etc.)
  switch (entityType) {
    case 'Vehicle':
      return this.vehicles.find(v => v.id === entityId);
    case 'Tier':
      return this.tiers.find(t => t.id === entityId);
    case 'Contract':
      return this.contracts.find(c => c.id === entityId);
    default:
      return null;
  }
}

closeDetailsModal(): void {
  this.showDetailsModal = false;
  this.selectedDocument = null;
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
