import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';

// Modèles
import {
  TierRoleType,
  TierStatus,
  DocumentStatus,
  DocumentType,
} from '../../../../../core/models/Enums/Logistiks-enums';
import { Tier } from '../../../../../core/models/Tiers/Tiers';
import { User } from '../../../../../core/models/Core/Users/Entities/User';

// Services
import { Auth } from '../../../../../core/services/Auth/auth';
import { Tiers } from '../../../../../core/services/Tiers/tiers';
import { Token } from '../../../../../core/services/Token/token';

// Composants
import { ConfirmDialog } from "../../../../../core/components/confirm-dialog/confirm-dialog";

// Environnement
import { environment } from '../../../../../../environments/environment.development';

/**
 * Composant de gestion des documents manquants des tiers
 * @class DocumentsManagement
 * @implements {OnInit, OnDestroy}
 * @description Interface pour compléter et valider les documents manquants des tiers
 */
@Component({
  selector: 'app-documents-management',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, RouterLink, ConfirmDialog],
  templateUrl: './documents-management.html',
  styleUrl: './documents-management.scss',
})
export class DocumentsManagement implements OnInit, OnDestroy {
  // ===========================================================================
  // CONSTANTES ET CONFIGURATION
  // ===========================================================================

  /** Types de documents disponibles */
  DocumentType = DocumentType;

  /** Couleurs pour les avatars générés */
  private avatarColors = ['FF6B6B', '4ECDC4', 'FFD166', '06D6A0', '118AB2', 'EF476F', '7209B7', '3A86FF'];

  // ===========================================================================
  // DONNÉES ET ÉTATS
  // ===========================================================================

  /** Liste des tiers avec documents manquants */
  tiers: Tier[] = [];

  /** Tier sélectionné pour traitement */
  selectedTier: Tier | null = null;

  /** Dates courantes pour affichage */
  today: Date = new Date();
  now: Date = new Date();

  /** Indicateur de vue mobile */
  isMobileView: boolean = false;

  // ===========================================================================
  // FORMULAIRES
  // ===========================================================================

  /** Formulaire d'upload de document */
  uploadForm: FormGroup;

  /** Formulaire de recherche */
  searchForm: FormGroup;

  /** Formulaire de filtres */
  filterForm: FormGroup;

  /** Filtres actuellement appliqués */
  activeFilters = {
    role: null as TierRoleType | null,
    status: TierStatus.PendingValidation,
    searchTerm: '',
  };

  // ===========================================================================
  // ÉTATS D'INTERFACE
  // ===========================================================================

  /** État de chargement */
  isLoading: boolean = false;

  /** État d'affichage du modal d'upload */
  showUploadModal: boolean = false;

  /** État d'affichage du panneau de validation */
  showValidationPanel: boolean = false;

  /** État d'upload en cours */
  isUploading: boolean = false;

  /** Progression de l'upload */
  uploadProgress: number = 0;

  /** État d'affichage du menu utilisateur */
  showUserMenu: boolean = false;

  /** État de réduction de la sidebar */
  isSidebarCollapsed: boolean = false;

  // ===========================================================================
  // FICHIERS ET UPLOAD
  // ===========================================================================

  /** Fichier sélectionné pour upload */
  selectedFile: File | null = null;

  // ===========================================================================
  // DOCUMENTS EN TRAITEMENT
  // ===========================================================================

  /** Liste des IDs des documents en cours de traitement */
  documentsBeingProcessed: string[] = [];

  // ===========================================================================
  // DIALOGUES ET MODALES
  // ===========================================================================

  /** État d'affichage du dialogue de confirmation */
  showConfirmDialog = false;

  /** Configuration du dialogue de confirmation */
  confirmDialogConfig = {
    title: '',
    message: '',
    details: '',
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
  };

  /** Action à confirmer */
  private confirmAction: (() => void) | null = null;

  /** État d'affichage du modal de succès d'upload */
  showUploadSuccessModal: boolean = false;

  /** État d'affichage du modal d'erreur d'upload */
  showUploadErrorModal: boolean = false;

  /** État d'affichage du modal de succès de validation */
  showValidationSuccessModal: boolean = false;

  /** État d'affichage du modal d'erreur de validation */
  showValidationErrorModal: boolean = false;

  /** Informations sur le document uploadé */
  uploadedDocumentInfo: { tierName: string, documentType: string } | null = null;

  /** Informations sur le tier validé */
  validatedTierInfo: { name: string, id: string } | null = null;

  /** Message d'erreur d'upload */
  uploadErrorMessage: string = '';

  /** Message d'erreur de validation */
  validationErrorMessage: string = '';

  // ===========================================================================
  // STATISTIQUES
  // ===========================================================================

  /** Statistiques des documents */
  stats = {
    totalTiers: 0,
    tiersMissingDocuments: 0,
    documentsRequired: 0,
    documentsUploaded: 0,
    documentsValidated: 0,
  };

  /** Statistiques du tableau de bord */
  dashboardStats = {
    totalTiers: 0,
    activeTiers: 0,
    activeContracts: 0,
    recoveryRate: 0,
    documentsPending: 0,
    paymentsOverdue: 0,
    vehiclesNeedingAttention: 0,
    totalClients: 0,
    totalSuppliers: 0,
  };

  /** Service de notification toast (non implémenté) */
  showToast: any;

  // ===========================================================================
  // GESTION UTILISATEUR
  // ===========================================================================

  /** Utilisateur connecté */
  currentUser: any = null;

  /** Nom d'affichage de l'utilisateur */
  userName: string = 'Utilisateur';

  /** URL de la photo de l'utilisateur */
  userPhotoUrl: string = '';

  // ===========================================================================
  // SUBJECTS ET SERVICES
  // ===========================================================================

  private destroy$ = new Subject<void>();

  constructor(
    private tiersService: Tiers,
    private authService: Auth,
    private tokenService: Token,
    private router: Router,
    private fb: FormBuilder
  ) {
    // Initialisation des formulaires
    this.uploadForm = this.createUploadForm();
    this.searchForm = this.createSearchForm();
    this.filterForm = this.createFilterForm();
  }

  // ===========================================================================
  // LIFECYCLE HOOKS
  // ===========================================================================

  /**
   * Initialisation du composant
   */
  ngOnInit(): void {
    this.loadCurrentUser();
    this.checkToken();
    this.loadTiersToComplete();
    this.loadStats();
  }

  /**
   * Nettoyage à la destruction du composant
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===========================================================================
  // INITIALISATION DES FORMULAIRES
  // ===========================================================================

  /**
   * Crée le formulaire d'upload
   */
  private createUploadForm(): FormGroup {
    return this.fb.group({
      documentType: [null, Validators.required],
      expiryDate: [''],
      description: ['', Validators.maxLength(500)],
    });
  }

  /**
   * Crée le formulaire de recherche
   */
  private createSearchForm(): FormGroup {
    return this.fb.group({
      searchTerm: [''],
    });
  }

  /**
   * Crée le formulaire de filtres
   */
  private createFilterForm(): FormGroup {
    return this.fb.group({
      role: [null],
      status: [TierStatus.PendingValidation],
    });
  }

  /**
   * Getter pour le contrôle de rôle
   */
  get roleControl(): FormControl {
    return this.filterForm.get('role') as FormControl;
  }

  /**
   * Getter pour le contrôle de statut
   */
  get statusControl(): FormControl {
    return this.filterForm.get('status') as FormControl;
  }

  // ===========================================================================
  // GESTION D'AUTHENTIFICATION
  // ===========================================================================

  /**
   * Vérifie le token et redirige si nécessaire
   */
  checkToken(): void {
    const token = this.tokenService.getToken();
    if (!token) {
      this.router.navigate(['/auth/login']);
    }
  }

  // ===========================================================================
  // CHARGEMENT DES DONNÉES
  // ===========================================================================

  /**
   * Charge les tiers avec documents manquants
   */
  loadTiersToComplete(): void {
    this.isLoading = true;

    const filters = this.filterForm.value;
    const search = this.searchForm.get('searchTerm')?.value;

    this.tiersService
      .getTiersList({
        search: search || undefined,
        role: filters.role || undefined,
        status: filters.status || undefined,
        pageNumber: 1,
        pageSize: 50,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.tiers = response.data.filter(
            (tier) => this.hasMissingDocuments(tier) || tier.status === TierStatus.PendingValidation
          );
          this.calculateStats();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur chargement tiers:', error);
          this.isLoading = false;
        },
      });
  }

  /**
   * Charge les statistiques globales
   */
  loadStats(): void {
    this.tiersService
      .getTierStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          // Mettre à jour avec les stats réelles
          // À implémenter selon la structure de retour du service
        },
        error: (error) => {
          console.error('Erreur chargement stats:', error);
        },
      });
  }

  // ===========================================================================
  // VÉRIFICATION DES DOCUMENTS
  // ===========================================================================

  /**
   * Vérifie si un tier a des documents manquants
   * @param tier - Tier à vérifier
   * @returns True si le tier a des documents manquants
   */
  hasMissingDocuments(tier: Tier): boolean {
    if (!tier.roles || tier.roles.length === 0) return false;

    // Déterminer les documents requis selon les rôles
    const requiredDocuments = this.getRequiredDocumentsForTier(tier);

    // Vérifier chaque document requis
    for (const requiredDoc of requiredDocuments) {
      const existingDoc = tier.documents?.find(
        (doc) =>
          String(doc.type) === requiredDoc.type &&
          doc.status === DocumentStatus.Validated &&
          (!doc.expiryDate || new Date(doc.expiryDate) > new Date())
      );

      if (!existingDoc) {
        return true; // Document manquant
      }
    }

    return false;
  }

  /**
   * Obtient les documents requis pour un tier selon ses rôles
   * @param tier - Tier à analyser
   * @returns Liste des documents requis
   */
  getRequiredDocumentsForTier(tier: Tier): { type: string; label: string }[] {
    const required: { type: string; label: string }[] = [];

    if (!tier.roles) return required;

    // ClientLivreur
    if (tier.roles.some((r) => r.roleType === TierRoleType.ClientLivreur && r.isActive)) {
      required.push(
        { type: String(DocumentType.IdentityCard), label: 'CNI/Passeport' },
        { type: String(DocumentType.DriverLicense), label: 'Permis de conduire' }
      );
    }

    // Supplier
    if (tier.roles.some((r) => r.roleType === TierRoleType.Supplier && r.isActive)) {
      required.push(
        { type: String(DocumentType.IdentityCard), label: 'CNI/Passeport' },
        { type: String(DocumentType.BusinessLicense), label: 'Licence commerciale' }
      );
    }

    return required;
  }

  /**
   * Obtient les documents manquants pour un tier
   * @param tier - Tier à analyser
   * @returns Liste des documents manquants
   */
  getMissingDocuments(tier: Tier): { type: string, label: string }[] {
    const required = this.getRequiredDocumentsForTier(tier);
    const missing: { type: string, label: string }[] = [];

    required.forEach(req => {
      const existingDoc = tier.documents?.find(doc =>
        String(doc.type) === req.type &&
        doc.status === DocumentStatus.Validated &&
        (!doc.expiryDate || new Date(doc.expiryDate) > new Date())
      );

      if (!existingDoc) {
        missing.push(req);
      }
    });

    return missing;
  }

  /**
   * Obtient les documents existants avec leurs statuts
   * @param tier - Tier à analyser
   * @returns Liste des documents avec statuts
   */
  getExistingDocumentsWithStatus(tier: Tier): any[] {
    if (!tier.documents) return [];

    return tier.documents.map((doc) => ({
      ...doc,
      statusLabel: this.getDocumentStatusLabel(doc.status),
      statusClass: this.getDocumentStatusClass(doc.status),
      isExpiring: doc.expiryDate && new Date(doc.expiryDate) < new Date(),
    }));
  }

  // ===========================================================================
  // GESTION DES DOCUMENTS
  // ===========================================================================

  /**
   * Sélectionne un tier pour traitement
   * @param tier - Tier à sélectionner
   */
  selectTier(tier: Tier): void {
    this.selectedTier = tier;
    this.showUploadModal = true;
    this.uploadForm.reset();
    this.selectedFile = null;
  }

  /**
   * Ouvre le panneau de validation des documents
   * @param tier - Tier à valider
   */
  openValidationPanel(tier: Tier): void {
    this.selectedTier = tier;
    this.showValidationPanel = true;
  }

  /**
   * Gère la sélection de fichier
   * @param event - Événement de sélection de fichier
   */
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;

      // Validation du type de fichier
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Type de fichier non supporté. Utilisez JPEG, PNG ou PDF.');
        this.selectedFile = null;
        return;
      }

      // Validation de la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Fichier trop volumineux. Maximum 5MB.');
        this.selectedFile = null;
        return;
      }
    }
  }

  /**
   * Upload un document pour le tier sélectionné
   */
  uploadDocument(): void {
    if (!this.selectedTier || !this.selectedFile || !this.uploadForm.valid) {
      // Note: showToast n'est pas implémenté dans ce composant
      console.error('Veuillez sélectionner un fichier et un type de document');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    const documentTypeValue = this.uploadForm.get('documentType')?.value;
    const expiryDate = this.uploadForm.get('expiryDate')?.value;

    this.tiersService.uploadDocument(
      this.selectedTier.id,
      this.selectedFile,
      documentTypeValue,
      expiryDate
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.isUploading = false;
        this.uploadProgress = 100;

        // Afficher le popup de succès
        this.uploadedDocumentInfo = {
          tierName: `${this.selectedTier?.firstName} ${this.selectedTier?.lastName}`,
          documentType: this.getDocumentTypeLabel(documentTypeValue)
        };
        this.showUploadSuccessModal = true;

        // Fermer la modale d'upload
        this.showUploadModal = false;

        // Recharger les données
        this.loadTiersToComplete();
      },
      error: (error) => {
        console.error('Erreur upload document:', error);
        this.isUploading = false;
        this.uploadErrorMessage = error.message || 'Erreur lors de l\'upload';
        this.showUploadErrorModal = true;
      }
    });
  }

  /**
   * Valide un document spécifique
   * @param tierId - ID du tier
   * @param documentId - ID du document
   */
  validateDocument(tierId: string, documentId: string): void {
    this.documentsBeingProcessed.push(documentId);

    this.tiersService
      .validateDocument(tierId, documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.removeFromProcessing(documentId);
          this.loadTiersToComplete();
        },
        error: (error) => {
          console.error('Erreur validation document:', error);
          this.removeFromProcessing(documentId);
        },
      });
  }

  // ===========================================================================
  // GESTION DES DIALOGUES DE CONFIRMATION
  // ===========================================================================

  /**
   * Ouvre un dialogue de confirmation
   * @param config - Configuration du dialogue
   * @param action - Action à exécuter sur confirmation
   */
  openConfirmDialog(
    config: {
      title: string;
      message: string;
      details?: string;
      confirmText?: string;
      cancelText?: string;
    },
    action: () => void
  ): void {
    this.confirmDialogConfig = {
      title: config.title,
      message: config.message,
      details: config.details || '',
      confirmText: config.confirmText || 'Confirmer',
      cancelText: config.cancelText || 'Annuler',
    };

    this.confirmAction = action;
    this.showConfirmDialog = true;
  }

  /**
   * Confirme l'action du dialogue
   */
  onConfirmDialog(): void {
    if (this.confirmAction) {
      this.confirmAction();
    }
    this.resetConfirmDialog();
  }

  /**
   * Annule l'action du dialogue
   */
  onCancelDialog(): void {
    this.resetConfirmDialog();
  }

  /**
   * Réinitialise le dialogue de confirmation
   */
  private resetConfirmDialog(): void {
    this.showConfirmDialog = false;
    this.confirmAction = null;
  }

  // ===========================================================================
  // VALIDATION DES TIERS
  // ===========================================================================


  /**
   * Valide un tier (change son statut à Actif)
   * @param tierId - ID du tier à valider
   */
  validateTier(tierId: string): void {
    const tier = this.tiers.find(t => t.id === tierId);
    if (!tier) return;

    this.openConfirmDialog(
      {
        title: 'Validation du tier',
        message: `Confirmez-vous la validation de ${tier.firstName} ${tier.lastName} ?`,
        details: 'Cette action activera définitivement ce compte.',
        confirmText: 'Valider',
        cancelText: 'Annuler'
      },
      () => {
        this.tiersService
          .validateTier(tierId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success) {
                this.validatedTierInfo = {
                  name: `${tier.firstName} ${tier.lastName}`,
                  id: tier.tierNumber || tierId
                };
                this.showValidationSuccessModal = true;
                this.loadTiersToComplete();
              } else {
                this.validationErrorMessage = response.message;
                this.showValidationErrorModal = true;
              }
            },
            error: (error) => {
              this.validationErrorMessage = error.message;
              this.showValidationErrorModal = true;
            }
          });
      }
    );
  }

  // ===========================================================================
  // GESTION DES MODALES
  // ===========================================================================

  /**
   * Ferme le modal de succès d'upload
   */
  closeUploadSuccessModal(): void {
    this.showUploadSuccessModal = false;
    this.uploadedDocumentInfo = null;
  }

  /**
   * Ferme le modal d'erreur d'upload
   */
  closeUploadErrorModal(): void {
    this.showUploadErrorModal = false;
    this.uploadErrorMessage = '';
  }

  /**
   * Ferme le modal de succès de validation
   */
  closeValidationSuccessModal(): void {
    this.showValidationSuccessModal = false;
    this.validatedTierInfo = null;
  }

  /**
   * Ferme le modal d'erreur de validation
   */
  closeValidationErrorModal(): void {
    this.showValidationErrorModal = false;
    this.validationErrorMessage = '';
  }

  // ===========================================================================
  // CALCUL DES STATISTIQUES
  // ===========================================================================

  /**
   * Calcule les statistiques des documents
   */
  calculateStats(): void {
    this.stats.totalTiers = this.tiers.length;
    this.stats.tiersMissingDocuments = this.tiers.filter((t) => this.hasMissingDocuments(t)).length;

    let required = 0;
    let uploaded = 0;
    let validated = 0;

    this.tiers.forEach((tier) => {
      const requiredDocs = this.getRequiredDocumentsForTier(tier);
      required += requiredDocs.length;

      if (tier.documents) {
        uploaded += tier.documents.length;
        validated += tier.documents.filter((d) => d.status === DocumentStatus.Validated).length;
      }
    });

    this.stats.documentsRequired = required;
    this.stats.documentsUploaded = uploaded;
    this.stats.documentsValidated = validated;
  }

  // ===========================================================================
  // UTILITAIRES DE TRAITEMENT
  // ===========================================================================

  /**
   * Retire un document de la liste de traitement
   * @param documentId - ID du document à retirer
   */
  removeFromProcessing(documentId: string): void {
    this.documentsBeingProcessed = this.documentsBeingProcessed.filter((id) => id !== documentId);
  }

  /**
   * Vérifie si un document est en cours de traitement
   * @param documentId - ID du document à vérifier
   * @returns True si le document est en cours de traitement
   */
  isDocumentBeingProcessed(documentId: string): boolean {
    return this.documentsBeingProcessed.includes(documentId);
  }

  // ===========================================================================
  // NAVIGATION
  // ===========================================================================

  /**
   * Navigue vers la page de détail d'un tier
   * @param tierId - ID du tier
   */
  goToTierDetail(tierId: string): void {
    this.router.navigate(['/dashboard/tiers', tierId]);
  }

  // ===========================================================================
  // UTILITAIRES D'AFFICHAGE
  // ===========================================================================

  /**
   * Obtient le libellé du statut d'un document
   * @param status - Statut du document
   * @returns Libellé du statut
   */
  getDocumentStatusLabel(status: DocumentStatus): string {
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
   * Obtient la classe CSS du statut d'un document
   * @param status - Statut du document
   * @returns Classe CSS
   */
  getDocumentStatusClass(status: DocumentStatus): string {
    switch (status) {
      case DocumentStatus.Pending:
        return 'badge bg-warning';
      case DocumentStatus.Validated:
        return 'badge bg-success';
      case DocumentStatus.Rejected:
        return 'badge bg-danger';
      case DocumentStatus.Expired:
        return 'badge bg-secondary';
      default:
        return 'badge bg-light text-dark';
    }
  }

  /**
   * Obtient le libellé du type d'un document
   * @param type - Type de document
   * @returns Libellé du type
   */
  getDocumentTypeLabel(type: DocumentType): string {
    switch (type) {
      case DocumentType.IdentityCard:
        return 'CNI/Passeport';
      case DocumentType.DriverLicense:
        return 'Permis de conduire';
      case DocumentType.VehicleRegistration:
        return 'Carte grise';
      case DocumentType.Insurance:
        return 'Assurance';
      case DocumentType.Contract:
        return 'Contrat signé';
      case DocumentType.Invoice:
        return 'Facture';
      case DocumentType.Receipt:
        return 'Reçu';
      case DocumentType.MaintenanceReport:
        return 'Rapport de maintenance';
      case DocumentType.BusinessLicense:
        return 'Licence commerciale';
      case DocumentType.Other:
        return 'Autre document';
      default:
        return 'Type inconnu';
    }
  }

  // ===========================================================================
  // GESTION DE L'INTERFACE UTILISATEUR
  // ===========================================================================

  /**
   * Basculer l'affichage d'un menu déroulant
   * @param event - Événement de clic
   */
  toggleMenu(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    element?.parentElement?.classList.toggle('open');
  }

  /**
   * Basculer l'état de la sidebar
   */
  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;

    const sidebar = document.getElementById('sidebar');
    const layoutPage = document.querySelector('.layout-page');

    if (sidebar && layoutPage) {
      if (this.isSidebarCollapsed) {
        sidebar.classList.add('collapsed');
        (layoutPage as HTMLElement).style.marginLeft = '0';
      } else {
        sidebar.classList.remove('collapsed');
        if (this.isMobileView) {
          (layoutPage as HTMLElement).style.marginLeft = '0';
        } else {
          (layoutPage as HTMLElement).style.marginLeft = '280px';
        }
      }
    }
  }

  /**
   * Basculer l'affichage du menu utilisateur
   */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  // ===========================================================================
  // GESTION UTILISATEUR
  // ===========================================================================

  /**
   * Charge l'utilisateur connecté
   */
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
          if (error.status === 401) {
            this.tokenService.handleTokenExpired();
          } else {
            this.setDefaultUser();
          }
        },
      });
  }

  /**
   * Définit un utilisateur par défaut
   */
  private setDefaultUser(): void {
    this.userName = 'Utilisateur Logistiks';
    this.userPhotoUrl = this.generateAvatarUrl({ firstName: 'Utilisateur' } as User);
  }

  /**
   * Formate le nom d'utilisateur
   * @param user - Utilisateur
   * @returns Nom formaté
   */
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

  /**
   * Obtient l'URL de la photo de l'utilisateur
   * @param user - Utilisateur
   * @returns URL de la photo
   */
  getUserPhotoUrl(user: User): string {
    // Si photoUrl est un ID MongoDB (24 caractères)
    if (user.photoUrl && user.photoUrl.length === 24) {
      return `${environment.apiUrl}/api/User/photo/${user.photoUrl}`;
    }

    // Si photoUrl est déjà une URL complète
    if (user.photoUrl && user.photoUrl.startsWith('http')) {
      return user.photoUrl;
    }

    // Sinon, générer un avatar
    return this.generateAvatarUrl(user);
  }

  /**
   * Génère un avatar URL
   * @param user - Utilisateur
   * @returns URL de l'avatar généré
   */
  generateAvatarUrl(user: User): string {
    const name = this.formatUserName(user);
    const colorIndex = name.length % this.avatarColors.length;

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${this.avatarColors[colorIndex]}&color=fff&size=128`;
  }

  /**
   * Obtient les initiales de l'utilisateur
   * @returns Initiales de l'utilisateur
   */
  getUserInitials(): string {
    const parts = this.userName.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return this.userName.charAt(0).toUpperCase();
  }

  /**
   * Obtient l'URL d'avatar par défaut
   * @returns URL de l'avatar par défaut
   */
  getDefaultAvatar(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      this.userName
    )}&background=696cff&color=fff&size=128`;
  }

  /**
   * Déconnecte l'utilisateur
   */
  logout(): void {
    console.log('🚪 Déconnexion en cours...');
    this.tokenService.logout();

    this.authService
      .logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['/auth/login']);
        },
        error: (error) => {
          this.router.navigate(['/auth/login']);
        },
      });
  }
}
