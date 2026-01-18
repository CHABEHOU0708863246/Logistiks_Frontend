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
import {
  TierRoleType,
  TierStatus,
  DocumentStatus,
  DocumentType,
} from '../../../../../core/models/Enums/Logistiks-enums';
import { Tier } from '../../../../../core/models/Tiers/Tiers';
import { Auth } from '../../../../../core/services/Auth/auth';
import { Tiers } from '../../../../../core/services/Tiers/tiers';
import { Token } from '../../../../../core/services/Token/token';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../../environments/environment.development';
import { User } from '../../../../../core/models/Core/Users/Entities/User';

@Component({
  selector: 'app-documents-management',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, RouterLink],
  templateUrl: './documents-management.html',
  styleUrl: './documents-management.scss',
})
export class DocumentsManagement implements OnInit, OnDestroy {
  // Liste des tiers avec documents manquants
  tiers: Tier[] = [];
  selectedTier: Tier | null = null;
  DocumentType = DocumentType;
  // Date pour affichage
  today: Date = new Date();
  now: Date = new Date();

  // Modale de validation de tier
  showValidationConfirmModal: boolean = false;
  showConfetti: boolean = false;
  validatedTier: Tier | null = null;

  // Modale de rejet/blocage
  showRejectConfirmModal: boolean = false;
  tierToReject: Tier | null = null;



  showValidationSuccessModal: boolean = false;
  validatedTierInfo: { name: string, id: string } | null = null;
  showValidationErrorModal: boolean = false;
  validationErrorMessage: string = '';

  showUploadSuccessModal: boolean = false;
  uploadedDocumentInfo: { tierName: string, documentType: string } | null = null;
  showUploadErrorModal: boolean = false;
  uploadErrorMessage: string = '';

  isMobileView: boolean = false;

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

  // États d'interface
  isLoading: boolean = false;
  showUploadModal: boolean = false;
  showValidationPanel: boolean = false;

  // Formulaires
  uploadForm: FormGroup;
  searchForm: FormGroup;

  // Upload
  selectedFile: File | null = null;
  uploadProgress: number = 0;
  isUploading: boolean = false;

  // Filtres
  filterForm: FormGroup;
  activeFilters = {
    role: null as TierRoleType | null,
    status: TierStatus.PendingValidation,
    searchTerm: '',
  };

  // Documents en cours de traitement
  documentsBeingProcessed: string[] = [];

  // Statistiques
  stats = {
    totalTiers: 0,
    tiersMissingDocuments: 0,
    documentsRequired: 0,
    documentsUploaded: 0,
    documentsValidated: 0,
  };
  showToast: any;

  toggleMenu(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    if (element && element.parentElement) {
      element.parentElement.classList.toggle('open');
    }
  }

  // Gestion utilisateur
  currentUser: any = null;
  userName: string = 'Utilisateur';
  userPhotoUrl: string = '';
  showUserMenu: boolean = false;

  // États des sous-menus ouverts
  isTiersMenuOpen: boolean = true;
  isVehiculesMenuOpen: boolean = false;
  isDocumentsMenuOpen: boolean = false;
  isContratsMenuOpen: boolean = false;
  isComptesMenuOpen: boolean = false;
  isPaiementsMenuOpen: boolean = false;
  isChargesMenuOpen: boolean = false;
  isReportingMenuOpen: boolean = false;
  isParametrageMenuOpen: boolean = false;

  // Gestion sidebar
  isSidebarCollapsed: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private tiersService: Tiers,
    private authService: Auth,
    private tokenService: Token,
    private router: Router,
    private fb: FormBuilder
  ) {
    // Initialisation des formulaires
    this.uploadForm = this.fb.group({
      documentType: [null, Validators.required],
      expiryDate: [''],
      description: ['', Validators.maxLength(500)],
    });

    this.searchForm = this.fb.group({
      searchTerm: [''],
    });

    this.filterForm = this.fb.group({
      role: [null],
      status: [TierStatus.PendingValidation],
    });
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.checkToken();
    this.loadTiersToComplete();
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
 * Vérifier le token et rediriger si nécessaire
 */
  checkToken(): void {
    const token = this.tokenService.getToken();
    if (!token) {
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Charger les tiers avec documents manquants
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
   * Vérifier si un tier a des documents manquants
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
   * Obtenir les documents requis pour un tier selon ses rôles
   */
  getRequiredDocumentsForTier(tier: Tier): { type: string; label: string }[] {
    const required: { type: string; label: string }[] = [];

    if (!tier.roles) return required;

    // ClientLivreur
    if (tier.roles.some((r) => r.roleType === TierRoleType.ClientLivreur && r.isActive)) {
      required.push(
        { type: String(DocumentType.IdentityCard), label: 'CNI/Passeport' }, // IdentityCard = 1
        { type: String(DocumentType.DriverLicense), label: 'Permis de conduire' } // DriverLicense = 2
      );
    }

    // Supplier
    if (tier.roles.some((r) => r.roleType === TierRoleType.Supplier && r.isActive)) {
      required.push(
        { type: String(DocumentType.IdentityCard), label: 'CNI/Passeport' }, // IdentityCard = 1
        { type: String(DocumentType.BusinessLicense), label: 'Licence commerciale' } // BusinessLicense = 9
      );
    }

    return required;
  }

  /**
   * Obtenir les documents manquants pour un tier
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





  get roleControl(): FormControl {
    return this.filterForm.get('role') as FormControl;
  }

  get statusControl(): FormControl {
    return this.filterForm.get('status') as FormControl;
  }
  /**
   * Obtenir les documents existants avec statut
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

  /**
   * Sélectionner un tier pour traitement
   */
  selectTier(tier: Tier): void {
    this.selectedTier = tier;
    this.showUploadModal = true;
    this.uploadForm.reset();
    this.selectedFile = null;
  }

  /**
   * Ouvrir le panneau de validation des documents
   */
  openValidationPanel(tier: Tier): void {
    this.selectedTier = tier;
    this.showValidationPanel = true;
  }

  /**
   * Gérer la sélection de fichier
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
 * Uploader un document pour le tier sélectionné - CORRIGÉ
 */
  uploadDocument(): void {
    if (!this.selectedTier || !this.selectedFile || !this.uploadForm.valid) {
      // Utiliser un toast au lieu de alert()
      this.showToast('error', 'Veuillez sélectionner un fichier et un type de document');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    const formData = new FormData();
    formData.append('File', this.selectedFile);

    const documentTypeValue = this.uploadForm.get('documentType')?.value;
    formData.append('Type', String(documentTypeValue));

    const expiryDate = this.uploadForm.get('expiryDate')?.value;
    if (expiryDate) {
      const date = new Date(expiryDate);
      formData.append('ExpiryDate', date.toISOString());
    }

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

        // Suggérer la validation si tous documents présents
        if (this.selectedTier && !this.hasMissingDocuments(this.selectedTier)) {
          setTimeout(() => {
            this.suggestValidation(this.selectedTier!);
          }, 2000);
        }
      },
      error: (error) => {
        console.error('Erreur upload document:', error);
        this.isUploading = false;
        this.uploadErrorMessage = error.message || 'Erreur lors de l\'upload';
        this.showUploadErrorModal = true;
      }
    });
  }

  // Méthodes pour fermer les modales
  closeUploadSuccessModal(): void {
    this.showUploadSuccessModal = false;
    this.uploadedDocumentInfo = null;
  }

  closeUploadErrorModal(): void {
    this.showUploadErrorModal = false;
    this.uploadErrorMessage = '';
  }



  /**
   * Suggérer la validation du tier
   */
  suggestValidation(tier: Tier): void {
    if (
      confirm(
        `${tier.firstName} ${tier.lastName} a maintenant tous ses documents. Souhaitez-vous valider ce tier maintenant ?`
      )
    ) {
      this.validateTier(tier.id);
    }
  }

  /**
   * Valider un document spécifique
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

          // Vérifier si on peut maintenant valider le tier
          const tier = this.tiers.find((t) => t.id === tierId);
          if (tier && !this.hasMissingDocuments(tier)) {
            this.suggestValidation(tier);
          }
        },
        error: (error) => {
          console.error('Erreur validation document:', error);
          this.removeFromProcessing(documentId);
        },
      });
  }

  /**
   * Valider un tier (changer son statut à Actif)
   */
  validateTier(tierId: string): void {
    const tier = this.tiers.find(t => t.id === tierId);
    if (!tier) return;

    if (confirm(`Confirmez-vous la validation de ${tier.firstName} ${tier.lastName} ?`)) {
      this.tiersService
        .validateTier(tierId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              // Afficher le popup de succès au lieu de alert()
              this.validatedTierInfo = {
                name: `${tier.firstName} ${tier.lastName}`,
                id: tier.tierNumber || tierId
              };
              this.showValidationSuccessModal = true;

              // Recharger les données après un délai
              setTimeout(() => {
                this.loadTiersToComplete();
              }, 1500);
            } else {
              this.validationErrorMessage = response.message || 'Erreur lors de la validation';
              this.showValidationErrorModal = true;
            }
          },
          error: (error) => {
            console.error('Erreur validation tier:', error);
            this.validationErrorMessage = error.message || 'Erreur lors de la validation';
            this.showValidationErrorModal = true;
          },
        });
    }
  }

  /**
   * Fermer les modales de validation
   */
  closeValidationSuccessModal(): void {
    this.showValidationSuccessModal = false;
    this.validatedTierInfo = null;
  }

  closeValidationErrorModal(): void {
    this.showValidationErrorModal = false;
    this.validationErrorMessage = '';
  }

  /**
   * Calculer les statistiques
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

  /**
   * Charger les statistiques globales
   */
  loadStats(): void {
    this.tiersService
      .getTierStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          // Mettre à jour avec les stats réelles
        },
        error: (error) => {
          console.error('Erreur chargement stats:', error);
        },
      });
  }

  /**
   * Retirer un document de la liste de traitement
   */
  removeFromProcessing(documentId: string): void {
    this.documentsBeingProcessed = this.documentsBeingProcessed.filter((id) => id !== documentId);
  }

  /**
   * Naviguer vers la page de détail du tier
   */
  goToTierDetail(tierId: string): void {
    this.router.navigate(['/dashboard/tiers', tierId]);
  }

  /**
   * Obtenir le libellé du statut du document
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
   * Obtenir la classe CSS du statut du document
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
 * Obtenir le libellé du type de document
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

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  /**
   * Vérifier si un document est en cours de traitement
   */
  isDocumentBeingProcessed(documentId: string): boolean {
    return this.documentsBeingProcessed.includes(documentId);
  }

  // === GESTION UTILISATEUR ===

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
    // Si photoUrl est présent et c'est un ID MongoDB
    if (user.photoUrl && user.photoUrl.length === 24) {
      // URL CORRECTE pour récupérer la photo
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

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${colors[colorIndex]
      }&color=fff&size=128`;
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
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      this.userName
    )}&background=696cff&color=fff&size=128`;
  }

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
