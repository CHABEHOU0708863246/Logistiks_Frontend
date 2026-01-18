import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../../environments/environment.development';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../../../../core/services/Auth/auth';
import { Tiers } from '../../../../../core/services/Tiers/tiers';
import { Token } from '../../../../../core/services/Token/token';
import { CommonModule } from '@angular/common';
import { DocumentStatus, TierStatus, TierRoleType } from '../../../../../core/models/Enums/Logistiks-enums';
import { SearchTiersRequest } from '../../../../../core/models/Tiers/Tier-requests';
import { TierDocument, Tier } from '../../../../../core/models/Tiers/Tiers';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';


@Component({
  selector: 'app-documents-validation',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './documents-validation.html',
  styleUrl: './documents-validation.scss',
})
export class DocumentsValidation implements OnInit, OnDestroy {
  // Gestion utilisateur
  currentUser: any = null;
  userName: string = 'Utilisateur';
  userPhotoUrl: string = '';
  showUserMenu: boolean = false;

  selectedTierForUpload: Tier | null = null;
  isUploadModalOpen: boolean = false;
  isDragOver: boolean = false;
  selectedFile: File | null = null;
  uploadProgress: number = 0;
  isUploading: boolean = false;
  uploadForm!: FormGroup;

  // États des sous-menus ouverts
  isTiersMenuOpen: boolean = true;
  isVehiculesMenuOpen: boolean = false;
  isDocumentsMenuOpen: boolean = true;
  isContratsMenuOpen: boolean = false;
  isComptesMenuOpen: boolean = false;
  isPaiementsMenuOpen: boolean = false;
  isChargesMenuOpen: boolean = false;
  isReportingMenuOpen: boolean = false;
  isParametrageMenuOpen: boolean = false;

  dashboardStats = {
    totalTiers: 0,
    activeTiers: 0,
    blockedTiers: 0,
    activeContracts: 0,
    recoveryRate: 0,
    documentsPending: 0,
    paymentsOverdue: 0,
    vehiclesNeedingAttention: 0,
    totalClients: 0,
    totalSuppliers: 0
  };


  // Gestion sidebar
  isSidebarCollapsed: boolean = false;

  // === GESTION DES DOCUMENTS À VALIDER ===

  // Liste des documents à valider
  documentsToValidate: TierDocument[] = [];
  tiersWithDocuments: Tier[] = [];

  // Filtres de recherche
  searchForm: FormGroup;
  filterForm: FormGroup;

  // Filtres disponibles
  documentTypes = Object.values(DocumentType).filter(v => typeof v === 'number');
  documentStatuses = Object.values(DocumentStatus).filter(v => typeof v === 'number');
  tierStatuses = Object.values(TierStatus).filter(v => typeof v === 'number');
  tierRoles = Object.values(TierRoleType).filter(v => typeof v === 'number');

  // État de chargement
  isLoading: boolean = false;
  isExporting: boolean = false;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 20;
  totalDocuments: number = 0;
  totalPages: number = 1;

  // Statistiques
  stats = {
    pendingDocuments: 0,
    validatedDocuments: 0,
    rejectedDocuments: 0,
    expiredDocuments: 0,
    totalDocuments: 0,
    tiersWithPendingDocuments: 0
  };

  // Document sélectionné pour validation
  selectedDocument: TierDocument | null = null;
  selectedTier: Tier | null = null;

  // Formulaires de validation/rejet
  validationForm: FormGroup;
  rejectionForm: FormGroup;

  // Prévisualisation de document
  documentPreviewUrl: SafeResourceUrl | null = null;
  isPreviewModalOpen: boolean = false;

  // Filtres actifs
  activeFilters = {
    documentType: null as number | null,
    documentStatus: DocumentStatus.Pending, // Par défaut: documents en attente
    tierStatus: null as number | null,
    tierRole: null as number | null,
    searchTerm: '',
    hasExpiredOnly: false
  };

  // Statistiques pour le menu
  stat = {
    total: 0,
    active: 0,
    pending: 0,
    blocked: 0,
    clients: 0,
    suppliers: 0
  };

  // Tri
  sortColumn: string = 'uploadedAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private tiersService: Tiers,
    private authService: Auth,
    private sanitizer: DomSanitizer,
    private tokenService: Token,
    private router: Router
  ) {
    // Initialisation des formulaires
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      tierNumber: [''],
      phone: ['']
    });

    // Formulaire d'upload
    this.uploadForm = this.formBuilder.group({
      documentType: ['', Validators.required],
      expiryDate: [''],
      description: ['', Validators.maxLength(500)],
      file: [null, Validators.required]
    });

    this.filterForm = this.formBuilder.group({
      documentType: [null],
      documentStatus: [DocumentStatus.Pending],
      tierStatus: [null],
      tierRole: [null],
      dateFrom: [null],
      dateTo: [null],
      hasExpiredOnly: [false]
    });

    this.validationForm = this.formBuilder.group({
      comments: ['', Validators.maxLength(500)]
    });

    this.rejectionForm = this.formBuilder.group({
      reason: ['', [Validators.required, Validators.maxLength(500)]],
      comments: ['', Validators.maxLength(500)]
    });
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadDocumentsToValidate();
    this.loadStatistics();

    // Écouter les changements de filtres
    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this.loadDocumentsToValidate();
      });
  }

  hasDocumentsToValidate(tier: Tier | null): boolean {
    return !!tier?.documents?.some(d => d.status === 1);
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // === MÉTHODES DE CHARGEMENT DES DONNÉES ===

  /**
   * Charger les documents à valider
   */
  loadDocumentsToValidate(): void {
    this.isLoading = true;

    // Construire les critères de recherche
    const filterValues = this.filterForm.value;
    const searchValues = this.searchForm.value;

    const criteria: SearchTiersRequest = {
      page: this.currentPage,
      pageSize: this.pageSize,
      searchTerm: searchValues.searchTerm || undefined,
      roleType: filterValues.tierRole || undefined,
      status: filterValues.tierStatus || undefined,
      hasExpiredDocuments: filterValues.hasExpiredOnly || undefined
    };

    // Rechercher les tiers selon les critères
    this.tiersService.searchTiers(criteria)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.tiersWithDocuments = response.data || [];
          this.extractDocumentsFromTiers();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des documents:', error);
          this.isLoading = false;
        }
      });
  }

  /**
   * Extraire les documents des tiers
   */
  private extractDocumentsFromTiers(): void {
    this.documentsToValidate = [];

    const filterValues = this.filterForm.value;
    const documentStatus = filterValues.documentStatus;
    const documentType = filterValues.documentType;

    this.tiersWithDocuments.forEach(tier => {
      if (tier.documents && tier.documents.length > 0) {
        const filteredDocuments = tier.documents.filter(doc => {
          // Filtrer par statut
          if (documentStatus && doc.status !== documentStatus) {
            return false;
          }

          // Filtrer par type
          if (documentType && doc.type !== documentType) {
            return false;
          }

          // Ajouter la référence au tier
          (doc as any).tier = tier;
          return true;
        });

        this.documentsToValidate.push(...filteredDocuments);
      }
    });

    // Trier les documents
    this.sortDocuments();
  }

  /**
   * Charger les statistiques
   */
  loadStatistics(): void {
    this.isLoading = true;

    // Charger les statistiques des documents
    this.calculateStatistics();

    // Charger les statistiques des tiers
    this.tiersService.getTierStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          // Mettre à jour les statistiques avec les données du service
          this.stats.tiersWithPendingDocuments = this.calculateTiersWithPendingDocuments();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des statistiques:', error);
          this.isLoading = false;
        }
      });
  }

  /**
   * Calculer les statistiques locales
   */
  private calculateStatistics(): void {
    const allTiers = this.tiersWithDocuments;
    let pending = 0;
    let validated = 0;
    let rejected = 0;
    let expired = 0;
    let total = 0;

    allTiers.forEach(tier => {
      if (tier.documents) {
        tier.documents.forEach(doc => {
          total++;
          switch (doc.status) {
            case DocumentStatus.Pending:
              pending++;
              break;
            case DocumentStatus.Validated:
              validated++;
              break;
            case DocumentStatus.Rejected:
              rejected++;
              break;
            case DocumentStatus.Expired:
              expired++;
              break;
          }
        });
      }
    });

    this.stats = {
      pendingDocuments: pending,
      validatedDocuments: validated,
      rejectedDocuments: rejected,
      expiredDocuments: expired,
      totalDocuments: total,
      tiersWithPendingDocuments: this.calculateTiersWithPendingDocuments()
    };
  }

  /**
   * Calculer le nombre de tiers avec documents en attente
   */
  private calculateTiersWithPendingDocuments(): number {
    return this.tiersWithDocuments.filter(tier =>
      tier.documents && tier.documents.some(doc => doc.status === DocumentStatus.Pending)
    ).length;
  }

  // === MÉTHODES DE VALIDATION/REJET ===

  /**
   * Sélectionner un document pour validation
   */
  selectDocumentForValidation(document: TierDocument, tier: Tier): void {
    this.selectedDocument = document;
    this.selectedTier = tier;
    this.validationForm.reset();
    this.rejectionForm.reset();
  }

  /**
 * Valider un document
 */
  validateDocument(): void {
    if (!this.selectedDocument || !this.selectedTier) {
      console.error('Document ou tier non sélectionné');
      return;
    }

    this.isLoading = true;

    this.tiersService.validateDocument(this.selectedTier.id, this.selectedDocument.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Validation réussie:', response);

          // Mettre à jour le document localement
          if (this.selectedDocument) {
            this.selectedDocument.status = DocumentStatus.Validated;
            this.selectedDocument.validatedAt = new Date();
            this.selectedDocument.validatedBy = this.currentUser?.id || 'System';
          }

          // Mettre à jour les statistiques
          this.calculateStatistics();

          // Réinitialiser la sélection
          this.selectedDocument = null;
          this.selectedTier = null;
          this.validationForm.reset();
          this.isLoading = false;

          // Recharger la liste
          this.loadDocumentsToValidate();

          // Notification de succès
          alert('Document validé avec succès !');
        },
        error: (error) => {
          console.error('Erreur détaillée validation document:', error);
          console.error('Error object:', error);

          // Messages d'erreur spécifiques
          let errorMsg = "Erreur lors de la validation";

          if (error.error?.message) {
            errorMsg = error.error.message;
          }

          if (error.status === 404) {
            errorMsg = "Document ou tier non trouvé";
          } else if (error.status === 500) {
            errorMsg = "Erreur serveur. Vérifiez les logs backend.";
          }

          alert(`${errorMsg}: ${error.message}`);
          this.isLoading = false;
        }
      });
  }

  /**
   * Rejeter un document - CORRIGÉ avec meilleure gestion d'erreurs
   */
  rejectDocument(): void {
    if (!this.selectedDocument || !this.selectedTier || !this.rejectionForm.valid) {
      console.error('Données manquantes pour le rejet');
      alert('Veuillez sélectionner un document et fournir une raison de rejet');
      return;
    }

    const { reason } = this.rejectionForm.value;

    if (!reason || reason.trim().length === 0) {
      alert('Veuillez fournir une raison de rejet');
      return;
    }

    this.isLoading = true;

    this.tiersService.rejectDocument(this.selectedTier.id, this.selectedDocument.id, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Rejet réussi:', response);

          if (response.success) {
            // Mettre à jour le document localement
            if (this.selectedDocument) {
              this.selectedDocument.status = DocumentStatus.Rejected;
              this.selectedDocument.rejectionReason = reason;
            }

            // Mettre à jour les statistiques
            this.calculateStatistics();

            // Réinitialiser la sélection
            this.selectedDocument = null;
            this.selectedTier = null;
            this.rejectionForm.reset();

            // Notification de succès
            alert('Document rejeté avec succès !');

            // Recharger la liste
            this.loadDocumentsToValidate();
          } else {
            alert(`Erreur: ${response.message}`);
          }

          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur détaillée rejet document:', error);
          console.error('Error object:', error);

          // Messages d'erreur spécifiques
          let errorMsg = "Erreur lors du rejet du document";

          if (error.error?.message) {
            errorMsg = error.error.message;
          }

          if (error.status === 404) {
            errorMsg = "Document ou tier non trouvé";
          } else if (error.status === 500) {
            errorMsg = "Erreur serveur. Vérifiez les logs backend.";
          } else if (error.status === 400) {
            errorMsg = "Données invalides";
          }

          alert(`${errorMsg}: ${error.message}`);
          this.isLoading = false;
        }
      });
  }

  /**
   * Valider tous les documents d'un tier
   */
  validateAllDocumentsForTier(tier: Tier): void {
    if (!tier.documents || tier.documents.length === 0) {
      return;
    }

    const pendingDocuments = tier.documents.filter(doc => doc.status === DocumentStatus.Pending);

    if (pendingDocuments.length === 0) {
      return;
    }

    if (!confirm(`Valider tous les documents (${pendingDocuments.length}) de ${tier.firstName} ${tier.lastName} ?`)) {
      return;
    }

    this.isLoading = true;

    // Valider chaque document un par un
    const validationPromises = pendingDocuments.map(doc =>
      this.tiersService.validateDocument(tier.id, doc.id).toPromise()
    );

    Promise.all(validationPromises)
      .then(() => {
        // Recharger les données
        this.loadDocumentsToValidate();
        this.loadStatistics();
        this.isLoading = false;
      })
      .catch(error => {
        console.error('Erreur lors de la validation des documents:', error);
        this.isLoading = false;
      });
  }

  // === MÉTHODES DE GESTION DES DOCUMENTS ===

  /**
   * Télécharger un document
   */
  downloadDocument(document: TierDocument): void {
    // Implémentation du téléchargement
    const link = document.fileUrl;
    if (link) {
      window.open(link, '_blank');
    }
  }

  /**
 * Prévisualiser un document - CORRIGÉ
 */
  previewDocument(document: TierDocument): void {
    // Si c'est déjà une URL directe (http/https), l'utiliser directement
    if (document.fileUrl &&
      (document.fileUrl.startsWith('http://') ||
        document.fileUrl.startsWith('https://') ||
        document.fileUrl.startsWith('blob:'))) {

      this.documentPreviewUrl = this.sanitizeUrl(document.fileUrl);
      this.selectedDocument = document;
      this.isPreviewModalOpen = true;

    } else {
      // Sinon, télécharger via l'API
      this.loadDocumentForPreview(document);
    }
  }

  /**
   * Télécharger un document pour prévisualisation
   */
  private loadDocumentForPreview(document: TierDocument): void {
    if (!document.tier?.id) {
      console.error('Tier ID manquant pour le document');
      alert('Impossible de prévisualiser: Tier ID manquant');
      return;
    }

    this.isLoading = true;

    this.tiersService.downloadDocument(document.tier.id, document.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          console.log('Document téléchargé:', {
            size: blob.size,
            type: blob.type
          });

          // Créer une URL blob sécurisée
          const blobUrl = window.URL.createObjectURL(blob);
          this.documentPreviewUrl = this.sanitizeUrl(blobUrl);

          this.selectedDocument = document;
          this.isPreviewModalOpen = true;
          this.isLoading = false;

          console.log('Blob URL créée:', this.documentPreviewUrl);
        },
        error: (error) => {
          console.error('Erreur téléchargement prévisualisation:', error);

          // Fallback: essayer avec l'URL directe
          if (document.fileUrl) {
            console.log('Fallback vers URL directe');
            this.documentPreviewUrl = this.sanitizeUrl(document.fileUrl);
            this.selectedDocument = document;
            this.isPreviewModalOpen = true;
          } else {
            alert('Impossible de prévisualiser le document: ' + error.message);
          }

          this.isLoading = false;
        }
      });
  }

  /**
   * Sanitizer l'URL pour Angular (sécurité)
   */
  private sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /**
   * Fermer la prévisualisation
   */
  closePreview(): void {
    this.documentPreviewUrl = null;
    this.isPreviewModalOpen = false;
  }

  /**
   * Obtenir l'extension du fichier
   */
  getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toUpperCase() || '';
  }

  /**
   * Formatter la taille du fichier
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // === MÉTHODES DE FILTRAGE ET TRI ===

  /**
   * Appliquer les filtres de recherche
   */
  applySearch(): void {
    this.currentPage = 1;
    this.loadDocumentsToValidate();
  }

  /**
   * Réinitialiser les filtres
   */
  resetFilters(): void {
    this.searchForm.reset();
    this.filterForm.reset({
      documentStatus: DocumentStatus.Pending
    });
    this.currentPage = 1;
    this.loadDocumentsToValidate();
  }

  /**
   * Trier les documents
   */
  sortDocuments(column: string = this.sortColumn): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.documentsToValidate.sort((a, b) => {
      let valueA: any = a;
      let valueB: any = b;

      // Naviguer dans les propriétés imbriquées
      const properties = column.split('.');
      properties.forEach(prop => {
        valueA = valueA?.[prop];
        valueB = valueB?.[prop];
      });

      if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Obtenir l'icône de tri
   */
  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return 'sort';
    return this.sortDirection === 'asc' ? 'sort-up' : 'sort-down';
  }

  // === MÉTHODES D'EXPORT ===

  /**
   * Exporter la liste des documents
   */
  exportDocuments(format: 'csv' | 'xlsx' | 'pdf' = 'xlsx'): void {
    this.isExporting = true;

    this.tiersService.exportTiers({ format })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          this.downloadBlob(blob, `documents-a-valider.${format}`);
          this.isExporting = false;
        },
        error: (error: any) => {
          console.error('Erreur lors de l\'export:', error);
          this.isExporting = false;
        }
      });
  }

  /**
   * Télécharger un blob
   */
  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // === MÉTHODES DE PAGINATION ===

  /**
   * Aller à une page spécifique
   */
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;

    this.currentPage = page;
    this.loadDocumentsToValidate();
  }

  /**
   * Obtenir les numéros de page à afficher
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  // === MÉTHODES UTILITAIRES ===

  /**
   * Obtenir le libellé du type de document
   */
  getDocumentTypeLabel(type: DocumentType): string {
    const labels: Record<number, string> = {
      1: 'Carte d\'identité',
      2: 'Permis de conduire',
      3: 'Carte grise',
      4: 'Assurance',
      5: 'Contrat',
      6: 'Facture',
      7: 'Reçu',
      8: 'Rapport maintenance',
      9: 'Licence commerciale',
      10: 'Autre'
    };
    return labels[type as unknown as number] || 'Inconnu';
  }

  /**
   * Obtenir le libellé du statut du document
   */
  getDocumentStatusLabel(status: DocumentStatus): string {
    const labels: Record<number, string> = {
      1: 'En attente',
      2: 'Validé',
      3: 'Rejeté',
      4: 'Expiré'
    };
    return labels[status] || 'Inconnu';
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  /**
   * Obtenir la classe CSS du statut
   */
  getDocumentStatusClass(status: DocumentStatus): string {
    switch (status) {
      case DocumentStatus.Pending: return 'status-pending';
      case DocumentStatus.Validated: return 'status-validated';
      case DocumentStatus.Rejected: return 'status-rejected';
      case DocumentStatus.Expired: return 'status-expired';
      default: return 'status-unknown';
    }
  }

  /**
   * Vérifier si un document est expiré
   */
  isDocumentExpired(document: TierDocument): boolean {
    if (!document.expiryDate) return false;
    return new Date(document.expiryDate) < new Date();
  }

  /**
   * Calculer les jours avant expiration
   */
  getDaysUntilExpiry(document: TierDocument): number | null {
    if (!document.expiryDate) return null;

    const today = new Date();
    const expiryDate = new Date(document.expiryDate);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Obtenir la classe d'expiration
   */
  getExpirationClass(document: TierDocument): string {
    const days = this.getDaysUntilExpiry(document);

    if (days === null) return 'expiry-unknown';
    if (days < 0) return 'expiry-expired';
    if (days <= 30) return 'expiry-soon';
    if (days <= 90) return 'expiry-warning';
    return 'expiry-ok';
  }

  // === MÉTHODES DE NAVIGATION ===

  /**
   * Aller à la page du tier
   */
  goToTierPage(tierId: string): void {
    this.router.navigate(['/tiers', tierId]);
  }

  /**
   * Aller à la page d'upload de document
   */
  goToUploadDocument(tierId: string): void {
    this.router.navigate(['/tiers', tierId, 'documents', 'upload']);
  }

  // === GESTION UTILISATEUR (méthodes existantes) ===

  loadCurrentUser(): void {
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: User) => {
          this.currentUser = user;
          this.userName = this.formatUserName(user);
          this.userPhotoUrl = this.getUserPhotoUrl(user);
        },
        error: (error) => {
          console.error('Erreur chargement utilisateur:', error);
          if (error.status === 401) {
            this.tokenService.handleTokenExpired();
          } else {
            this.setDefaultUser();
          }
        }
      });
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
    // Si photoUrl est présent et c'est un ID MongoDB (24 caractères hexadécimaux)
    if (user.photoUrl && /^[0-9a-fA-F]{24}$/.test(user.photoUrl)) {
      return `${environment.apiUrl}/api/User/photo/${user.photoUrl}`;
    }

    // Si photoUrl est déjà une URL complète
    if (user.photoUrl && user.photoUrl.startsWith('http')) {
      return user.photoUrl;
    }

    // Sinon, générer un avatar
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

  logout(): void {
    console.log('🚪 Déconnexion en cours...');
    this.tokenService.logout();

    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['/auth/login']);
        },
        error: (error) => {
          this.router.navigate(['/auth/login']);
        }
      });
  }

  // === GESTION DES MENUS ===

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleMenu(menu: string): void {
    switch (menu) {
      case 'tiers':
        this.isTiersMenuOpen = !this.isTiersMenuOpen;
        break;
      case 'vehicules':
        this.isVehiculesMenuOpen = !this.isVehiculesMenuOpen;
        break;
      case 'documents':
        this.isDocumentsMenuOpen = !this.isDocumentsMenuOpen;
        break;
      case 'contrats':
        this.isContratsMenuOpen = !this.isContratsMenuOpen;
        break;
      case 'comptes':
        this.isComptesMenuOpen = !this.isComptesMenuOpen;
        break;
      case 'paiements':
        this.isPaiementsMenuOpen = !this.isPaiementsMenuOpen;
        break;
      case 'charges':
        this.isChargesMenuOpen = !this.isChargesMenuOpen;
        break;
      case 'reporting':
        this.isReportingMenuOpen = !this.isReportingMenuOpen;
        break;
      case 'parametrage':
        this.isParametrageMenuOpen = !this.isParametrageMenuOpen;
        break;
    }
  }
}

