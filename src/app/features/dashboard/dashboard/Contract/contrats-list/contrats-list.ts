import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize, Subject, takeUntil } from 'rxjs';

// ============================================================================
// CORE IMPORTS
// ============================================================================
import { environment } from '../../../../../../environments/environment.development';
import { NotificationComponent } from '../../../../../core/components/notification-component/notification-component';
import { SidebarComponent } from "../../../../../core/components/sidebar-component/sidebar-component";

// ============================================================================
// MODELS IMPORTS
// ============================================================================
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import { ContractStatus, ContractType, DamageSeverity, PaymentFrequency, PaymentMethod, Permission, TierStatus, UserRole, VehicleStatus } from '../../../../../core/models/Enums/Logistiks-enums';
import { ApiResponseData } from '../../../../../core/models/Common/ApiResponseData';
import { PaginatedResponse } from '../../../../../core/models/Common/PaginatedResponse';
import { RecordPaymentRequest, RenewContractRequest, CreateContractRequest, ReportDamageRequest, VehicleReturnRequest, ActivateContractRequest } from '../../../../../core/models/Contracts/Contract-request.models';
import { ContractSearchCriteria, defaultContractSearchCriteria } from '../../../../../core/models/Contracts/Contract-search.models';
import { ContractBalance } from '../../../../../core/models/Contracts/ContractBalance';
import { ContractDto } from '../../../../../core/models/Contracts/ContractDto';
import { ContractEligibilityResult } from '../../../../../core/models/Contracts/ContractEligibilityResult';
import { ContractFinancialReport } from '../../../../../core/models/Contracts/ContractFinancialReport';
import { PaymentRecord } from '../../../../../core/models/Contracts/PaymentRecord';
import { LatePenaltyInfo, RenewalEligibilityResult } from '../../../../../core/models/Contracts/penalty.models';
import { VehicleDto, VehicleSearchCriteria } from '../../../../../core/models/Vehicles/Vehicle.dtos';
import { VehicleReturnResult } from '../../../../../core/models/Contracts/VehicleReturnResult';

// ============================================================================
// SERVICES IMPORTS
// ============================================================================
import { Auth } from '../../../../../core/services/Auth/auth';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Token } from '../../../../../core/services/Token/token';
import { Contract } from '../../../../../core/services/Contract/contract';
import { Tiers } from '../../../../../core/services/Tiers/tiers';
import { Vehicles } from '../../../../../core/services/Vehicles/vehicles';

@Component({
  selector: 'app-contrats-list',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NotificationComponent, SidebarComponent],
  templateUrl: './contrats-list.html',
  styleUrl: './contrats-list.scss',
})
export class ContratsList implements OnInit, OnDestroy {
  // ============================================================================
  // SECTION 1: ÉTAT GLOBAL ET DONNÉES PRINCIPALES
  // ============================================================================

  /** Données principales */
  contracts: ContractDto[] = [];
  currentUser: User | null = null;

  /** État de l'interface */
  loading: boolean = false;
  error: string | null = null;
  isMobileView: boolean = false;
  isSidebarCollapsed: boolean = false;

  /** Subject pour la gestion des abonnements */
  private destroy$ = new Subject<void>();

  activeMenuContractId: string | null = null;
  menuPosition = { top: 0, left: 0 };

  // ============================================================================
  // SECTION 2: STATISTIQUES DU TABLEAU DE BORD
  // ============================================================================

  dashboardStats = {
    totalContracts: 0,
    activeContracts: 0,
    draftContracts: 0,
    pendingContracts: 0,
    completedContracts: 0,
    terminatedContracts: 0,
    totalOutstanding: 0,
    paymentsOverdue: 0,
    contractsExpiring: 0
  };

  // ============================================================================
  // SECTION 3: FILTRES ET RECHERCHE
  // ============================================================================

  /** Filtres simples */
  searchTerm: string = '';
  selectedStatus: ContractStatus | null = null;
  selectedPaymentFrequency: PaymentFrequency | null = null;

  /** Filtres avancés */
  showAdvancedFilters: boolean = false;
  startDateFrom: string = '';
  startDateTo: string = '';
  endDateFrom: string = '';
  endDateTo: string = '';
  hasOutstandingBalance: boolean = false;

  /** Critères de recherche complets */
  searchCriteria: ContractSearchCriteria = { ...defaultContractSearchCriteria };

  // ============================================================================
  // SECTION 4: PAGINATION ET TRI
  // ============================================================================

  pagination = {
    currentPage: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false
  };

  pageSizeOptions = [10, 25, 50, 100];
  visiblePages: number[] = [];

  /** Options de tri */
  selectedSort: string = 'createdAt';
  sortDescending: boolean = true;

  // ============================================================================
  // SECTION 5: GESTION DES UTILISATEURS ET PERMISSIONS
  // ============================================================================

  userName: string = 'Utilisateur';
  userPhotoUrl: string = '';
  showUserMenu: boolean = false;
  userPermissions: Set<Permission> = new Set();

  // ============================================================================
  // SECTION 6: ÉNUMÉRATIONS ET OPTIONS DE LISTE
  // ============================================================================

  readonly contractStatus = ContractStatus;
  readonly paymentFrequency = PaymentFrequency;
  readonly paymentMethod = PaymentMethod;
  readonly contractType = ContractType;
  readonly userRole = UserRole;
  readonly permission = Permission;
  readonly vehicleStatusEnum = VehicleStatus;

  statusOptions = [
    { value: ContractStatus.Draft, label: 'Brouillon', icon: 'bx bx-edit', color: 'secondary' },
    { value: ContractStatus.Pending, label: 'En attente', icon: 'bx bx-time', color: 'warning' },
    { value: ContractStatus.Active, label: 'Actif', icon: 'bx bx-check-circle', color: 'success' },
    { value: ContractStatus.Suspended, label: 'Suspendu', icon: 'bx bx-pause-circle', color: 'warning' },
    { value: ContractStatus.Terminated, label: 'Terminé', icon: 'bx bx-x-circle', color: 'danger' },
    { value: ContractStatus.Completed, label: 'Complété', icon: 'bx bx-check-circle', color: 'success' }
  ];

  frequencyOptions = [
    { value: PaymentFrequency.Weekly, label: 'Hebdomadaire', icon: 'bx bx-calendar-week' },
    { value: PaymentFrequency.BiWeekly, label: 'Bi-hebdomadaire', icon: 'bx bx-calendar' },
    { value: PaymentFrequency.Monthly, label: 'Mensuel', icon: 'bx bx-calendar' }
  ];

  paymentMethodOptions = [
    { value: 1, label: 'Espèces', icon: 'bx bx-money' },
    { value: 2, label: 'Mobile Money', icon: 'bx bx-mobile-alt' },
    { value: 3, label: 'Virement bancaire', icon: 'bx bx-bank' },
    { value: 4, label: 'Chèque', icon: 'bx bx-receipt' }
  ];

  // ============================================================================
  // SECTION 7: GESTION DES MENUS D'ACTIONS
  // ============================================================================

  openedActionsMenu: string | null = null;

  // ============================================================================
  // SECTION 8: DONNÉES POUR SÉLECTEURS (CLIENTS/VÉHICULES)
  // ============================================================================

  availableTiers: any[] = [];
  availableVehicles: any[] = [];
  loadingTiers: boolean = false;
  loadingVehicles: boolean = false;
  searchTermCustomer: string = '';
  searchTermVehicle: string = '';
  selectedTier: any = null;
  selectedVehicle: any = null;

  // ============================================================================
  // SECTION 9: FORMULAIRES - DÉCLARATION
  // ============================================================================

  /** Formulaire de création */
  createForm!: FormGroup;

  /** Formulaire de paiement */
  paymentForm!: FormGroup;

  /** Formulaire de renouvellement */
  renewForm!: FormGroup;

  /** Formulaire de résiliation */
  terminateForm!: FormGroup;

  /** Formulaire de signature */
  signatureForm!: FormGroup;

  /** Formulaire d'activation */
  activateContractForm!: FormGroup;

  /** Formulaire de retour véhicule */
  vehicleReturnForm!: FormGroup;

  /** Formulaire de signalement dommage */
  damageReportForm!: FormGroup;

  /** Formulaire d'annulation */
  cancelContractForm!: FormGroup;

  /** Formulaire de rejet */
  rejectContractForm!: FormGroup;

  // ============================================================================
  // SECTION 10: MODALES - ÉTATS D'AFFICHAGE
  // ============================================================================

  /** Modales principales */
  showCreateModal: boolean = false;
  showDetailsModal: boolean = false;
  showPaymentModal: boolean = false;
  showRenewModal: boolean = false;
  showTerminateModal: boolean = false;
  showSignatureModal: boolean = false;
  showBalanceModal: boolean = false;
  showFinancialReportModal: boolean = false;
  showEligibilityModal: boolean = false;

  /** Modales d'activation et retour */
  showActivateContractModal: boolean = false;
  showVehicleReturnModal: boolean = false;

  /** Modales de gestion des incidents */
  showDamageReportModal: boolean = false;
  showCancelContractModal: boolean = false;
  showRejectContractModal: boolean = false;
  showPenaltiesModal: boolean = false;
  showRenewalEligibilityModal: boolean = false;

  // ============================================================================
  // SECTION 11: DONNÉES DES MODALES
  // ============================================================================

  /** Contrat sélectionné */
  selectedContract: ContractDto | null = null;
  selectedContractForPayment: ContractDto | null = null;

  /** Données financières */
  contractBalance: ContractBalance | null = null;
  financialReport: ContractFinancialReport | null = null;
  contractPayments: PaymentRecord[] = [];
  penaltiesInfo: LatePenaltyInfo | null = null;
  renewalEligibility: RenewalEligibilityResult | null = null;
  eligibilityResult: ContractEligibilityResult | null = null;

  // ============================================================================
  // SECTION 12: ÉTATS DE CHARGEMENT DES MODALES
  // ============================================================================

  /** États de chargement */
  createLoading: boolean = false;
  paymentLoading: boolean = false;
  renewLoading: boolean = false;
  terminateLoading: boolean = false;
  signatureLoading: boolean = false;
  balanceLoading: boolean = false;
  financialReportLoading: boolean = false;
  eligibilityLoading: boolean = false;
  activateContractLoading: boolean = false;
  vehicleReturnLoading: boolean = false;
  damageReportLoading: boolean = false;
  cancelContractLoading: boolean = false;
  rejectContractLoading: boolean = false;
  penaltiesLoading: boolean = false;
  renewalEligibilityLoading: boolean = false;
  contractDetailsLoading: boolean = false;

  // ============================================================================
  // SECTION 13: ÉTATS DE SOUMISSION DES FORMULAIRES
  // ============================================================================

  createSubmitted: boolean = false;
  paymentSubmitted: boolean = false;
  renewSubmitted: boolean = false;
  terminateSubmitted: boolean = false;
  signatureSubmitted: boolean = false;
  activateContractSubmitted: boolean = false;
  vehicleReturnSubmitted: boolean = false;
  damageReportSubmitted: boolean = false;
  cancelContractSubmitted: boolean = false;
  rejectContractSubmitted: boolean = false;

  // ============================================================================
  // SECTION 14: DONNÉES POUR GESTION DES DOMMAGES
  // ============================================================================

  damagePhotos: File[] = [];
  previewUrls: string[] = [];

  // ============================================================================
  // SECTION 15: CONSTRUCTEUR ET INITIALISATION
  // ============================================================================

  constructor(
    private formBuilder: FormBuilder,
    private contractService: Contract,
    private notificationService: NotificationService,
    private tierService: Tiers,
    private vehicleService: Vehicles,
    private authService: Auth,
    private tokenService: Token,
    private router: Router
  ) {
    this.initializeForms();
  }

  /**
   * Initialise tous les formulaires du composant
   */
  private initializeForms(): void {
    this.createForm = this.formBuilder.group({
      customerId: ['', Validators.required],
      vehicleId: ['', Validators.required],
      startDate: [new Date().toISOString().split('T')[0], Validators.required],
      durationInWeeks: [4, [Validators.required, Validators.min(1), Validators.max(52)]],
      weeklyAmount: [0, [Validators.required, Validators.min(0.01)]],
      securityDeposit: [0, [Validators.min(0)]],
      paymentFrequency: [PaymentFrequency.Weekly, Validators.required],
      paymentDay: [1, [Validators.required, Validators.min(1), Validators.max(7)]],
      weeklyMileageLimit: [1000, [Validators.min(0)]],
      notes: ['']
    });

    this.paymentForm = this.formBuilder.group({
      paymentDate: [new Date().toISOString().split('T')[0], Validators.required],
      amountPaid: [0, [Validators.required, Validators.min(0.01)]],
      method: [1, Validators.required],
      reference: [''],
      notes: ['']
    });

    this.renewForm = this.formBuilder.group({
      durationInWeeks: [4, [Validators.required, Validators.min(1), Validators.max(52)]],
      newWeeklyAmount: [0, [Validators.required, Validators.min(0.01)]],
      newSecurityDeposit: [0, [Validators.min(0)]],
      notes: ['']
    });

    this.terminateForm = this.formBuilder.group({
      reason: ['', [Validators.required, Validators.minLength(5)]]
    });

    this.signatureForm = this.formBuilder.group({
      signatureDate: [new Date().toISOString().split('T')[0], Validators.required],
      notes: ['']
    });

    this.activateContractForm = this.formBuilder.group({
      depositPaid: [true, Validators.required],
      paymentReference: [''],
      deliveryDate: [new Date().toISOString().split('T')[0], Validators.required],
      deliveryLocation: ['Siège social', [Validators.required, Validators.minLength(3)]],
      mileageAtDelivery: [0, [Validators.required, Validators.min(0)]],
      fuelLevel: [100, [Validators.required, Validators.min(0), Validators.max(100)]],
      conditionNotes: ['Véhicule en bon état'],
      deliveredBy: ['', [Validators.required, Validators.minLength(2)]],
      receivedBy: ['', [Validators.required, Validators.minLength(2)]]
    });

    this.vehicleReturnForm = this.formBuilder.group({
      returnDate: [new Date().toISOString().split('T')[0], Validators.required],
      endMileage: [0, [Validators.required, Validators.min(0)]],
      fuelLevel: ['FULL', Validators.required],
      vehicleCondition: ['GOOD', Validators.required],
      notes: [''],
      hasDamage: [false],
      hasOverdueMileage: [false]
    });

    this.damageReportForm = this.formBuilder.group({
      damageDate: [new Date().toISOString().split('T')[0], Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      estimatedRepairCost: [0, [Validators.required, Validators.min(0)]],
      severity: [DamageSeverity.Minor, Validators.required],
      locationOnVehicle: ['', Validators.required],
      responsibleParty: ['CUSTOMER', Validators.required],
      notes: ['']
    });

    this.cancelContractForm = this.formBuilder.group({
      reason: ['', [Validators.required, Validators.minLength(10)]],
      refundAmount: [0, [Validators.min(0)]],
      cancellationFee: [0, [Validators.min(0)]],
      effectiveDate: [new Date().toISOString().split('T')[0], Validators.required]
    });

    this.rejectContractForm = this.formBuilder.group({
      reason: ['', [Validators.required, Validators.minLength(10)]],
      notes: ['']
    });
  }

  // ============================================================================
  // SECTION 16: CYCLE DE VIE DU COMPOSANT
  // ============================================================================

  ngOnInit(): void {
    this.checkAuthentication();
    this.loadCurrentUser();
    this.loadContracts();
    this.loadDashboardStats();
    this.setupSearchObservable();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // SECTION 17: GESTION DE L'AUTHENTIFICATION
  // ============================================================================

  /**
   * Vérifie la présence d'un token valide
   */
  private checkAuthentication(): void {
    const token = this.tokenService.getToken();
    if (!token) {
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Charge les informations de l'utilisateur connecté
   */
  loadCurrentUser(): void {
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: User) => {
          this.currentUser = user;
          this.userName = this.formatUserName(user);
          this.userPhotoUrl = this.getUserPhotoUrl(user);
          this.loadUserPermissions();
        },
        error: (error) => {
          console.error('Erreur chargement utilisateur:', error);
          this.setDefaultUser();
        }
      });
  }

  /**
   * Formate le nom d'utilisateur pour l'affichage
   */
  private formatUserName(user: User): string {
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
   * Obtient l'URL de la photo de profil
   */
  private getUserPhotoUrl(user: User): string {
    if (user.photoUrl && /^[0-9a-fA-F]{24}$/.test(user.photoUrl)) {
      return `${environment.apiUrl}/api/User/photo/${user.photoUrl}`;
    }
    if (user.photoUrl && user.photoUrl.startsWith('http')) {
      return user.photoUrl;
    }
    return this.generateAvatarUrl(user);
  }

  /**
   * Génère une URL d'avatar par défaut
   */
  private generateAvatarUrl(user: User): string {
    const name = this.formatUserName(user);
    const colors = ['FF6B6B', '4ECDC4', 'FFD166', '06D6A0', '118AB2', 'EF476F', '7209B7', '3A86FF'];
    const colorIndex = name.length % colors.length;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${colors[colorIndex]}&color=fff&size=128`;
  }

  /**
   * Définit les valeurs par défaut pour l'utilisateur
   */
  private setDefaultUser(): void {
    this.userName = 'Utilisateur Logistiks';
    this.userPhotoUrl = this.generateAvatarUrl({ firstName: 'Utilisateur' } as User);
  }

  /**
   * Charge les permissions de l'utilisateur
   */
  private loadUserPermissions(): void {
    this.userPermissions.add(Permission.Contract_Read);
    this.userPermissions.add(Permission.Contract_Create);
  }

  /**
   * Vérifie si l'utilisateur a une permission spécifique
   */
  hasPermission(permission: Permission): boolean {
    return this.userPermissions.has(permission);
  }

  // ============================================================================
  // SECTION 18: CHARGEMENT DES DONNÉES PRINCIPALES
  // ============================================================================

  /**
   * Charge la liste des contrats avec les filtres appliqués
   */
  loadContracts(): void {
    this.loading = true;
    this.error = null;

    this.updateSearchCriteria();

    this.contractService.searchContracts(this.searchCriteria)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (response: PaginatedResponse<ContractDto>) => {
          this.contracts = response.data;
          this.updatePagination(response);
          this.updateVisiblePages();
          this.updateDashboardStatsFromContracts();
        },
        error: (error) => {
          console.error('Erreur chargement contrats:', error);
          this.error = error.message || 'Erreur lors du chargement des contrats';
          this.notificationService.error('Erreur chargement contrats', "Impossible de charger les contrats. Veuillez réessayer plus tard.");
        }
      });
  }

  /**
   * Met à jour les critères de recherche depuis les filtres
   */
  private updateSearchCriteria(): void {
    this.searchCriteria.searchTerm = this.searchTerm || undefined;
    this.searchCriteria.status = this.selectedStatus || undefined;
    this.searchCriteria.paymentFrequency = this.selectedPaymentFrequency || undefined;
    this.searchCriteria.hasOutstandingBalance = this.hasOutstandingBalance || undefined;
    this.searchCriteria.page = this.pagination.currentPage;
    this.searchCriteria.pageSize = this.pagination.pageSize;
    this.searchCriteria.sortBy = this.selectedSort;
    this.searchCriteria.sortDescending = this.sortDescending;

    if (this.startDateFrom) {
      this.searchCriteria.startDateFrom = new Date(this.startDateFrom);
    }
    if (this.startDateTo) {
      this.searchCriteria.startDateTo = new Date(this.startDateTo);
    }
    if (this.endDateFrom) {
      this.searchCriteria.endDateFrom = new Date(this.endDateFrom);
    }
    if (this.endDateTo) {
      this.searchCriteria.endDateTo = new Date(this.endDateTo);
    }
  }

  /**
   * Met à jour les informations de pagination
   */
  private updatePagination(response: PaginatedResponse<ContractDto>): void {
    this.pagination = {
      currentPage: response.currentPage,
      pageSize: response.pageSize,
      totalCount: response.totalCount,
      totalPages: response.totalPages,
      hasPreviousPage: response.hasPreviousPage,
      hasNextPage: response.hasNextPage
    };
  }

  /**
   * Charge les statistiques du tableau de bord
   */
  loadDashboardStats(): void {
    this.loadActiveContractsCount();
    this.loadOverduePayments();
    this.loadExpiringContracts();
  }

  /**
   * Charge le nombre de contrats actifs
   */
  private loadActiveContractsCount(): void {
    this.contractService.getActiveContracts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponseData<ContractDto[]>) => {
          this.dashboardStats.activeContracts = response.data.length;
        },
        error: (error) => console.error('Erreur chargement contrats actifs:', error)
      });
  }

  /**
   * Charge les paiements en retard
   */
  private loadOverduePayments(): void {
    this.contractService.getOverduePayments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponseData<PaymentRecord[]>) => {
          this.dashboardStats.paymentsOverdue = response.data.length;
          this.dashboardStats.totalOutstanding = response.data.reduce(
            (sum, payment) => sum + payment.amountDue, 0
          );
        },
        error: (error) => console.error('Erreur chargement paiements retard:', error)
      });
  }

  /**
   * Charge les contrats expirant bientôt
   */
  private loadExpiringContracts(): void {
    this.contractService.getExpiringContracts(7)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponseData<ContractDto[]>) => {
          this.dashboardStats.contractsExpiring = response.data.length;
        },
        error: (error) => console.error('Erreur chargement contrats expirants:', error)
      });
  }

  /**
   * Met à jour les statistiques à partir de la liste des contrats
   */
  private updateDashboardStatsFromContracts(): void {
    if (!this.contracts?.length) return;

    this.dashboardStats.totalContracts = this.contracts.length;
    this.dashboardStats.draftContracts = this.contracts.filter(c => c.status === ContractStatus.Draft).length;
    this.dashboardStats.pendingContracts = this.contracts.filter(c => c.status === ContractStatus.Pending).length;
    this.dashboardStats.completedContracts = this.contracts.filter(c => c.status === ContractStatus.Completed).length;
    this.dashboardStats.terminatedContracts = this.contracts.filter(c => c.status === ContractStatus.Terminated).length;
  }

  /**
   * Configure la recherche en temps réel
   */
  private setupSearchObservable(): void {
    // Implémentation de la recherche différée si nécessaire
  }

  // ============================================================================
  // SECTION 19: GESTION DES FILTRES
  // ============================================================================

  /**
   * Exécute la recherche avec les filtres actuels
   */
  onSearch(): void {
    this.pagination.currentPage = 1;
    this.loadContracts();
  }

  /**
   * Réinitialise tous les filtres
   */
  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = null;
    this.selectedPaymentFrequency = null;
    this.startDateFrom = '';
    this.startDateTo = '';
    this.endDateFrom = '';
    this.endDateTo = '';
    this.hasOutstandingBalance = false;
    this.onSearch();
  }

  /**
   * Filtre par statut
   */
  onFilterByStatus(status: ContractStatus | null = null): void {
    this.selectedStatus = status;
    this.onSearch();
  }

  /**
   * Filtre par fréquence de paiement
   */
  onFilterByFrequency(frequency: PaymentFrequency | null = null): void {
    this.selectedPaymentFrequency = frequency;
    this.onSearch();
  }

  /**
   * Change l'ordre de tri
   */
  onSortChange(column: string): void {
    if (this.selectedSort === column) {
      this.sortDescending = !this.sortDescending;
    } else {
      this.selectedSort = column;
      this.sortDescending = true;
    }
    this.loadContracts();
  }

  /**
   * Bascule l'affichage des filtres avancés
   */
  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  // ============================================================================
  // SECTION 20: GESTION DE LA PAGINATION
  // ============================================================================

  /**
   * Change de page
   */
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages && page !== this.pagination.currentPage) {
      this.pagination.currentPage = page;
      this.loadContracts();
    }
  }

  /**
   * Change la taille de la page
   */
  onPageSizeChange(event: any): void {
    const size = Number(event.target.value);
    this.pagination.pageSize = size;
    this.pagination.currentPage = 1;
    this.loadContracts();
  }

  /**
   * Met à jour les pages visibles pour la pagination
   */
  updateVisiblePages(): void {
    const current = this.pagination.currentPage;
    const total = this.pagination.totalPages;
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 4) {
        pages.push(1, 2, 3, 4, 5, -1, total);
      } else if (current >= total - 3) {
        pages.push(1, -1, total - 4, total - 3, total - 2, total - 1, total);
      } else {
        pages.push(1, -1, current - 1, current, current + 1, -1, total);
      }
    }

    this.visiblePages = pages;
  }

  // ============================================================================
  // SECTION 21: GESTION DES MENUS D'ACTIONS
  // ============================================================================

  /**
   * Bascule l'affichage du menu d'actions
   */
  // ============================================================================
// SECTION 21: GESTION DES MENUS D'ACTIONS
// ============================================================================

toggleActionsMenu(contract: ContractDto, event: MouseEvent): void {
  event.stopPropagation();

  if (this.activeMenuContractId === contract.id) {
    this.closeActionsMenu();
    return;
  }

  const btn = event.currentTarget as HTMLElement;
  const rect = btn.getBoundingClientRect();

  const menuWidth = 240;
  const menuHeight = 380;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = rect.right + 8;
  let top = rect.top;

  if (left + menuWidth > viewportWidth) {
    left = rect.left - menuWidth - 8;
  }

  if (top + menuHeight > viewportHeight) {
    top = viewportHeight - menuHeight - 16;
  }

  this.menuPosition = { top, left };
  this.activeMenuContractId = contract.id;
}

closeActionsMenu(): void {
  this.activeMenuContractId = null;
}

getActiveContract(): ContractDto | null {
  return this.contracts.find(c => c.id === this.activeMenuContractId) ?? null;
}

@HostListener('window:scroll')
@HostListener('window:resize')
onWindowEvent(): void {
  this.closeActionsMenu();
}
  /**
   * Charge les tiers actifs pour le sélecteur
   */
  loadAvailableTiers(searchTerm: string = ''): void {
    this.loadingTiers = true;
    const params = {
      search: searchTerm,
      status: TierStatus.Active,
      pageNumber: 1,
      pageSize: 50,
      sortBy: 'fullName',
      sortDescending: false
    };

    this.tierService.getTiersList(params)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loadingTiers = false)
      )
      .subscribe({
        next: (response: PaginatedResponse<any>) => {
          this.availableTiers = response.data.map(tier => ({
            id: tier.id,
            value: tier.id,
            label: `${tier.fullName} - ${tier.phone}`,
            fullName: tier.fullName,
            phone: tier.phone,
            email: tier.email,
            address: tier.address
          }));
        },
        error: (error) => {
          console.error('Erreur chargement tiers:', error);
          this.notificationService.error('Erreur lors du chargement des clients', error.message || '');
        }
      });
  }

  /**
   * Charge les véhicules disponibles
   */
  loadAvailableVehicles(searchTerm: string = ''): void {
    this.loadingVehicles = true;
    const criteria: VehicleSearchCriteria = {
      searchTerm: searchTerm,
      status: undefined,
      page: 1,
      pageSize: 50,
      sortBy: 'plateNumber',
      sortDescending: false
    };

    this.vehicleService.searchVehicles(criteria)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loadingVehicles = false)
      )
      .subscribe({
        next: (response: ApiResponseData<VehicleDto[]>) => {
          this.availableVehicles = (response.data || [])
            .filter(vehicle =>
              vehicle.status === VehicleStatus.Available ||
              vehicle.status === VehicleStatus.Reserved
            )
            .map(vehicle => ({
              id: vehicle.id,
              value: vehicle.id,
              label: `${vehicle.plateNumber} - ${vehicle.brand} ${vehicle.model}`,
              plateNumber: vehicle.plateNumber,
              brand: vehicle.brand,
              model: vehicle.model,
              code: vehicle.code,
              status: vehicle.status,
              statusLabel: this.getVehicleStatusLabel(vehicle.status)
            }));
        },
        error: (error) => {
          console.error('Erreur chargement véhicules:', error);
          this.notificationService.error('Erreur lors du chargement des véhicules', error.message || '');
        }
      });
  }

  /**
   * Obtient le libellé du statut du véhicule
   */
  getVehicleStatusLabel(status: VehicleStatus): string {
    const labels: Record<VehicleStatus, string> = {
      [VehicleStatus.Available]: 'Disponible',
      [VehicleStatus.Reserved]: 'Réservé',
      [VehicleStatus.Rented]: 'Loué',
      [VehicleStatus.Maintenance]: 'Maintenance',
      [VehicleStatus.OutOfService]: 'Hors service'
    };
    return labels[status] || 'Inconnu';
  }

  /**
   * Recherche en temps réel pour les clients
   */
  onSearchCustomer(): void {
    this.loadAvailableTiers(this.searchTermCustomer);
  }

  /**
   * Recherche en temps réel pour les véhicules
   */
  onSearchVehicle(): void {
    this.loadAvailableVehicles(this.searchTermVehicle);
  }

  /**
   * Sélectionne un client
   */
  selectTier(tier: any): void {
    this.selectedTier = tier;
    this.searchTermCustomer = tier.fullName;
    this.createForm.patchValue({ customerId: tier.id });
    this.availableTiers = [];
  }

  /**
   * Sélectionne un véhicule
   */
  selectVehicle(vehicle: any): void {
    this.selectedVehicle = vehicle;
    this.searchTermVehicle = `${vehicle.plateNumber} - ${vehicle.brand} ${vehicle.model}`;
    this.createForm.patchValue({ vehicleId: vehicle.id });
    this.availableVehicles = [];
  }

  /**
   * Efface la sélection du client
   */
  clearTierSelection(): void {
    this.selectedTier = null;
    this.searchTermCustomer = '';
    this.createForm.patchValue({ customerId: '' });
  }

  /**
   * Efface la sélection du véhicule
   */
  clearVehicleSelection(): void {
    this.selectedVehicle = null;
    this.searchTermVehicle = '';
    this.createForm.patchValue({ vehicleId: '' });
  }

  // ============================================================================
  // SECTION 23: GESTION DES MODALES PRINCIPALES
  // ============================================================================

  /**
   * Ouvre la modal de création de contrat
   */
  openCreateModal(): void {
    this.showCreateModal = true;
    this.createSubmitted = false;
    this.loadAvailableTiers();
    this.loadAvailableVehicles();
    this.resetCreateForm();
  }

  /**
   * Réinitialise le formulaire de création
   */
  private resetCreateForm(): void {
    const today = new Date().toISOString().split('T')[0];
    this.createForm.reset({
      customerId: '',
      vehicleId: '',
      startDate: today,
      durationInWeeks: 4,
      weeklyAmount: 0,
      securityDeposit: 0,
      paymentFrequency: PaymentFrequency.Weekly,
      paymentDay: 1,
      weeklyMileageLimit: 1000,
      notes: ''
    });
    this.selectedTier = null;
    this.selectedVehicle = null;
    this.searchTermCustomer = '';
    this.searchTermVehicle = '';
  }

  /**
   * Ferme la modal de création
   */
  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  /**
   * Soumet le formulaire de création
   */
  onCreateSubmit(): void {
    this.createSubmitted = true;

    if (this.createForm.invalid) {
      const errors = this.getFormErrors();
      if (errors.length) {
        this.notificationService.error('Formulaire incomplet', errors.join(', '));
      }
      return;
    }

    this.createLoading = true;
    const request: CreateContractRequest = this.buildCreateRequest();

    this.contractService.createContract(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.createLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<ContractDto>) => {
          if (response.success) {
            this.notificationService.success('Contrat créé', `Contrat ${response.data.contractNumber} créé avec succès`);
            this.closeCreateModal();
            this.loadContracts();
          } else {
            this.notificationService.error('Échec de la création', this.extractErrorMessage(response));
          }
        },
        error: (error) => {
          console.error('Erreur création contrat:', error);
          this.notificationService.error('Erreur création', this.extractApiError(error));
        }
      });
  }

  /**
   * Construit la requête de création
   */
  private buildCreateRequest(): CreateContractRequest {
    return {
      customerId: this.createForm.value.customerId,
      vehicleId: this.createForm.value.vehicleId,
      startDate: new Date(this.createForm.value.startDate),
      durationInWeeks: this.createForm.value.durationInWeeks,
      weeklyAmount: this.createForm.value.weeklyAmount,
      securityDeposit: this.createForm.value.securityDeposit,
      paymentFrequency: this.createForm.value.paymentFrequency,
      paymentDay: this.createForm.value.paymentDay,
      weeklyMileageLimit: this.createForm.value.weeklyMileageLimit,
      notes: this.createForm.value.notes
    };
  }

  /**
   * Obtient les erreurs de validation du formulaire
   */
  private getFormErrors(): string[] {
    const errors: string[] = [];
    const controls = this.createForm.controls;

    if (controls['customerId']?.errors?.['required']) errors.push('Client requis');
    if (controls['vehicleId']?.errors?.['required']) errors.push('Véhicule requis');
    if (controls['startDate']?.errors?.['required']) errors.push('Date de début requise');
    if (controls['durationInWeeks']?.errors?.['required']) errors.push('Durée requise');
    if (controls['durationInWeeks']?.errors?.['min']) errors.push('Durée minimum 1 semaine');
    if (controls['durationInWeeks']?.errors?.['max']) errors.push('Durée maximum 52 semaines');
    if (controls['weeklyAmount']?.errors?.['required']) errors.push('Montant hebdomadaire requis');
    if (controls['weeklyAmount']?.errors?.['min']) errors.push('Montant hebdomadaire doit être positif');
    if (controls['paymentDay']?.errors?.['required']) errors.push('Jour de paiement requis');
    if (controls['paymentDay']?.errors?.['min'] || controls['paymentDay']?.errors?.['max']) {
      errors.push('Jour de paiement entre 1 (lundi) et 7 (dimanche)');
    }

    return errors;
  }

  // ============================================================================
  // SECTION 24: GESTION DES PAIEMENTS
  // ============================================================================

  /**
   * Ouvre la modal de paiement
   */
  openPaymentModal(contract: ContractDto): void {
    this.selectedContractForPayment = contract;
    this.penaltiesLoading = true;

    this.contractService.getContractPenalties(contract.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.penaltiesLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<LatePenaltyInfo>) => {
          this.penaltiesInfo = response.data;
          const currentPenalty = this.calculateCurrentPenalty(response.data);
          this.paymentForm.patchValue({
            amountPaid: contract.weeklyAmount + currentPenalty,
            paymentDate: new Date().toISOString().split('T')[0]
          });
        },
        error: (error) => {
          console.error('Erreur chargement pénalités:', error);
          this.paymentForm.patchValue({
            amountPaid: contract.weeklyAmount,
            paymentDate: new Date().toISOString().split('T')[0]
          });
        }
      });

    this.showPaymentModal = true;
    this.paymentSubmitted = false;
  }

  /**
   * Calcule le montant des pénalités courantes
   */
  private calculateCurrentPenalty(penaltiesInfo: LatePenaltyInfo | null): number {
    return penaltiesInfo?.payments
      .filter(p => p.daysLate > 0 && p.penaltyApplies)
      .reduce((sum, p) => sum + p.penaltyAmount, 0) || 0;
  }

  /**
   * Ferme la modal de paiement
   */
  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.selectedContractForPayment = null;
    this.paymentForm.reset({
      paymentDate: new Date().toISOString().split('T')[0],
      amountPaid: 0,
      method: PaymentMethod.Cash
    });
  }

  /**
   * Soumet le formulaire de paiement
   */
  onPaymentSubmit(): void {
    this.paymentSubmitted = true;

    if (this.paymentForm.invalid || !this.selectedContractForPayment) {
      return;
    }

    this.paymentLoading = true;
    const request: RecordPaymentRequest = {
      paymentDate: new Date(this.paymentForm.value.paymentDate),
      amountPaid: Number(this.paymentForm.value.amountPaid),
      method: Number(this.paymentForm.value.method),
      reference: this.paymentForm.value.reference || '',
      notes: this.paymentForm.value.notes || ''
    };

    this.contractService.recordPayment(this.selectedContractForPayment.id, request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.paymentLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<PaymentRecord>) => {
          this.notificationService.success('Paiement enregistré', 'Paiement enregistré avec succès');
          this.recalculateAmountsAfterPayment(this.selectedContractForPayment!.id, request.amountPaid);

          if (this.showBalanceModal && this.selectedContract) {
            this.loadBalanceForCurrentContract();
          }

          this.closePaymentModal();
          this.loadContracts();
          this.loadDashboardStats();
        },
        error: (error) => {
          console.error('Erreur enregistrement paiement:', error);
          this.notificationService.error('Erreur paiement', this.extractApiError(error));
        }
      });
  }

  /**
   * Recharge le solde du contrat courant
   */
  private loadBalanceForCurrentContract(): void {
    if (!this.selectedContract) return;

    this.balanceLoading = true;
    this.contractService.getContractBalance(this.selectedContract.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.balanceLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<ContractBalance>) => {
          this.contractBalance = response.data;
        },
        error: (error) => console.error('Erreur rechargement solde:', error)
      });
  }

  /**
   * Recalcule les montants après paiement
   */
  private recalculateAmountsAfterPayment(contractId: string, paymentAmount: number): void {
    const contractIndex = this.contracts.findIndex(c => c.id === contractId);
    if (contractIndex === -1) return;

    const contract = this.contracts[contractIndex];
    const currentTotalDue = contract.weeksRemaining * contract.weeklyAmount;
    const newTotalDue = Math.max(0, currentTotalDue - paymentAmount);
    const newWeeksRemaining = Math.ceil(newTotalDue / contract.weeklyAmount);

    this.contracts[contractIndex] = {
      ...contract,
      weeksRemaining: newWeeksRemaining,
      daysRemaining: this.calculateUpdatedDaysRemaining(contract, newWeeksRemaining)
    };

    this.updateDashboardStatsFromContracts();
  }

  /**
   * Calcule les jours restants mis à jour
   */
  private calculateUpdatedDaysRemaining(contract: ContractDto, weeksRemaining: number): number {
    if (weeksRemaining <= 0) return 0;

    const today = new Date();
    const originalEndDate = new Date(contract.endDate);

    if (weeksRemaining < contract.weeksRemaining) {
      const daysPerWeek = 7;
      const daysReduced = (contract.weeksRemaining - weeksRemaining) * daysPerWeek;
      const newEndDate = new Date(originalEndDate);
      newEndDate.setDate(originalEndDate.getDate() - daysReduced);
      const diffTime = newEndDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const diffTime = originalEndDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // ============================================================================
  // SECTION 25: GESTION DES RENOUVELLEMENTS
  // ============================================================================

  /**
   * Ouvre la modal de renouvellement
   */
  openRenewModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.renewForm.patchValue({
      durationInWeeks: 4,
      newWeeklyAmount: contract.weeklyAmount,
      newSecurityDeposit: contract.securityDeposit
    });
    this.showRenewModal = true;
    this.renewSubmitted = false;
  }

  /**
   * Ferme la modal de renouvellement
   */
  closeRenewModal(): void {
    this.showRenewModal = false;
    this.selectedContract = null;
    this.renewForm.reset({ durationInWeeks: 4, newWeeklyAmount: 0, newSecurityDeposit: 0 });
  }

  /**
   * Soumet le formulaire de renouvellement
   */
  onRenewSubmit(): void {
    this.renewSubmitted = true;

    if (this.renewForm.invalid || !this.selectedContract) {
      return;
    }

    this.renewLoading = true;
    const request: RenewContractRequest = {
      durationInWeeks: this.renewForm.value.durationInWeeks,
      newWeeklyAmount: this.renewForm.value.newWeeklyAmount,
      newSecurityDeposit: this.renewForm.value.newSecurityDeposit,
      notes: this.renewForm.value.notes
    };

    this.contractService.renewContract(this.selectedContract.id, request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.renewLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<ContractDto>) => {
          this.notificationService.success('Contrat renouvelé', 'Contrat renouvelé avec succès');
          this.closeRenewModal();
          this.loadContracts();
        },
        error: (error) => {
          console.error('Erreur renouvellement:', error);
          this.notificationService.error('Erreur renouvellement', error.message || '');
        }
      });
  }

  /**
   * Ouvre la modal d'éligibilité au renouvellement
   */
  openRenewalEligibilityModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.renewalEligibilityLoading = true;
    this.showRenewalEligibilityModal = true;

    this.contractService.checkRenewalEligibility(contract.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.renewalEligibilityLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<RenewalEligibilityResult>) => {
          this.renewalEligibility = response.data;
          if (this.renewalEligibility?.isEligible) {
            this.renewForm.patchValue({
              durationInWeeks: 4,
              newWeeklyAmount: contract.weeklyAmount,
              newSecurityDeposit: contract.securityDeposit
            });
          }
        },
        error: (error) => {
          console.error('Erreur vérification éligibilité:', error);
          this.notificationService.error('Erreur', error.message || '');
          this.closeRenewalEligibilityModal();
        }
      });
  }

  /**
   * Ferme la modal d'éligibilité
   */
  closeRenewalEligibilityModal(): void {
    this.showRenewalEligibilityModal = false;
    this.selectedContract = null;
    this.renewalEligibility = null;
  }

  /**
   * Procède au renouvellement depuis l'éligibilité
   */
  proceedToRenewal(): void {
    if (this.selectedContract && this.renewalEligibility?.isEligible) {
      this.closeRenewalEligibilityModal();
      this.openRenewModal(this.selectedContract);
    }
  }

  // ============================================================================
  // SECTION 26: GESTION DE L'ACTIVATION DES CONTRATS
  // ============================================================================

  /**
   * Ouvre la modal d'activation
   */
  openActivateContractModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.showActivateContractModal = true;
    this.activateContractSubmitted = false;

    this.activateContractForm.patchValue({
      depositPaid: true,
      deliveryDate: new Date().toISOString().split('T')[0],
      deliveryLocation: 'Siège social',
      mileageAtDelivery: 0,
      fuelLevel: 100,
      conditionNotes: 'Véhicule en bon état',
      deliveredBy: this.currentUser?.username || 'Livreur',
      receivedBy: contract.customerName || 'Client'
    });
  }

  /**
   * Ferme la modal d'activation
   */
  closeActivateContractModal(): void {
    this.showActivateContractModal = false;
    this.selectedContract = null;
    this.activateContractForm.reset({
      depositPaid: true,
      deliveryDate: new Date().toISOString().split('T')[0],
      deliveryLocation: 'Siège social',
      mileageAtDelivery: 0,
      fuelLevel: 100,
      conditionNotes: 'Véhicule en bon état'
    });
  }

  /**
   * Soumet le formulaire d'activation
   */
  onActivateContractSubmit(): void {
    this.activateContractSubmitted = true;

    if (this.activateContractForm.invalid || !this.selectedContract) {
      this.notificationService.error('Formulaire incomplet', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.activateContractLoading = true;
    const request: ActivateContractRequest = {
      depositPaid: this.activateContractForm.value.depositPaid,
      paymentReference: this.activateContractForm.value.paymentReference || '',
      deliveryDate: new Date(this.activateContractForm.value.deliveryDate),
      deliveryLocation: this.activateContractForm.value.deliveryLocation,
      mileageAtDelivery: Number(this.activateContractForm.value.mileageAtDelivery),
      fuelLevel: Number(this.activateContractForm.value.fuelLevel),
      conditionNotes: this.activateContractForm.value.conditionNotes || '',
      deliveredBy: this.activateContractForm.value.deliveredBy,
      receivedBy: this.activateContractForm.value.receivedBy
    };

    this.contractService.activateContract(this.selectedContract.id, request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.activateContractLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<ContractDto>) => {
          this.notificationService.success(
            'Contrat activé',
            `Le contrat ${this.selectedContract?.contractNumber} a été activé`
          );
          this.closeActivateContractModal();
          this.loadContracts();
          this.loadDashboardStats();
        },
        error: (error) => {
          console.error('Erreur activation:', error);
          this.notificationService.error('Erreur activation', this.extractApiError(error));
        }
      });
  }

  /**
   * Vérifie si un contrat peut être activé
   */
  canActivateContract(contract: ContractDto): boolean {
    return contract.status === ContractStatus.Pending || contract.status === ContractStatus.Draft;
  }

  // ============================================================================
  // SECTION 27: GESTION DU RETOUR DES VÉHICULES
  // ============================================================================

  /**
   * Ouvre la modal de retour du véhicule
   */
  openVehicleReturnModal(contract: ContractDto): void {
    if (!contract.deliveryInfo) {
      this.notificationService.error(
        'Impossible d\'enregistrer le retour',
        'Ce contrat n\'a pas d\'informations de livraison'
      );
      return;
    }

    this.selectedContract = contract;
    this.showVehicleReturnModal = true;
    this.vehicleReturnSubmitted = false;

    this.vehicleReturnForm.patchValue({
      returnDate: new Date().toISOString().split('T')[0],
      endMileage: 0,
      fuelLevel: 'FULL',
      vehicleCondition: 'GOOD'
    });
  }

  /**
   * Ferme la modal de retour
   */
  closeVehicleReturnModal(): void {
    this.showVehicleReturnModal = false;
    this.selectedContract = null;
    this.vehicleReturnForm.reset({
      returnDate: new Date().toISOString().split('T')[0],
      endMileage: 0,
      fuelLevel: 'FULL',
      vehicleCondition: 'GOOD',
      hasDamage: false,
      hasOverdueMileage: false
    });
  }

  /**
   * Soumet le formulaire de retour
   */
  onVehicleReturnSubmit(): void {
    this.vehicleReturnSubmitted = true;

    if (this.vehicleReturnForm.invalid || !this.selectedContract) {
      this.notificationService.error('Formulaire incomplet', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!this.selectedContract.deliveryInfo) {
      this.notificationService.error('Erreur', 'Informations de livraison manquantes');
      return;
    }

    this.vehicleReturnLoading = true;
    const request: VehicleReturnRequest = this.buildVehicleReturnRequest();

    this.contractService.recordVehicleReturn(this.selectedContract.id, request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.vehicleReturnLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<VehicleReturnResult>) => {
          this.notificationService.success('Retour enregistré', `Véhicule retourné - Contrat ${this.selectedContract?.contractNumber}`);
          if (response.data) this.showReturnSummary(response.data);
          this.closeVehicleReturnModal();
          this.loadContracts();
          this.loadDashboardStats();
        },
        error: (error) => {
          console.error('Erreur retour:', error);
          this.notificationService.error('Erreur retour', this.extractApiError(error));
        }
      });
  }

  /**
   * Construit la requête de retour véhicule
   */
  private buildVehicleReturnRequest(): VehicleReturnRequest {
    const fuelLevelMap: Record<string, number> = {
      'EMPTY': 0, 'QUARTER': 25, 'HALF': 50, 'THREE_QUARTERS': 75, 'FULL': 100
    };

    const currentUserName = this.currentUser?.username || 'System';

    return {
      returnDate: new Date(this.vehicleReturnForm.value.returnDate),
      returnLocation: this.selectedContract!.deliveryInfo,
      mileageAtReturn: Number(this.vehicleReturnForm.value.endMileage),
      fuelLevel: fuelLevelMap[this.vehicleReturnForm.value.fuelLevel] || 100,
      conditionNotes: this.vehicleReturnForm.value.vehicleCondition,
      photos: [],
      damages: [],
      returnedBy: this.selectedContract!.customerName || 'Client',
      receivedBy: currentUserName
    };
  }

  /**
   * Affiche le résumé du retour
   */
  private showReturnSummary(result: VehicleReturnResult): void {
    const hasExtraCharges = result.mileageOverageFee > 0 || result.fuelCharge > 0 || result.totalDamageCost > 0;
    const totalExtraCharges = result.mileageOverageFee + result.fuelCharge + result.totalDamageCost;
    const hasDamages = result.damages && result.damages.length > 0;

    const summary = `
      <div class="return-summary">
        <h6>📋 Récapitulatif du retour</h6>
        <div class="row">
          <div class="col-6">
            <p><strong>Date:</strong> ${this.formatDate(result.returnedAt)}</p>
            <p><strong>Kilométrage:</strong> ${result.mileageAtReturn} km</p>
          </div>
          <div class="col-6">
            <p><strong>Carburant:</strong> ${this.getFuelLevelLabel(result.fuelLevelAtReturn)}</p>
            <p><strong>Total parcouru:</strong> ${result.totalMileage} km</p>
          </div>
        </div>
        ${hasExtraCharges ? `
          <div class="alert alert-warning">
            <strong>Frais supplémentaires: ${this.formatCurrency(totalExtraCharges)}</strong>
          </div>
        ` : `
          <div class="alert alert-success">
            <strong>Retour validé sans frais</strong>
          </div>
        `}
      </div>
    `;

    this.notificationService.info('Retour véhicule', summary, 8000);
  }

  /**
   * Vérifie si un véhicule peut être retourné
   */
  canReturnVehicle(contract: ContractDto): boolean {
    if (contract.status !== ContractStatus.Active || !contract.deliveryInfo) return false;
    const today = new Date();
    const startDate = new Date(contract.startDate);
    return today >= startDate;
  }

  // ============================================================================
  // SECTION 28: GESTION DES DOMMAGES
  // ============================================================================

  /**
   * Ouvre la modal de signalement de dommage
   */
  openDamageReportModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.showDamageReportModal = true;
    this.damageReportSubmitted = false;
    this.damagePhotos = [];
    this.previewUrls = [];

    this.damageReportForm.patchValue({
      damageDate: new Date().toISOString().split('T')[0],
      severity: DamageSeverity.Minor,
      responsibleParty: 'CUSTOMER',
      estimatedRepairCost: 0
    });
  }

  /**
   * Ferme la modal de signalement de dommage
   */
  closeDamageReportModal(): void {
    this.showDamageReportModal = false;
    this.selectedContract = null;
    this.damagePhotos = [];
    this.previewUrls = [];
    this.damageReportForm.reset({
      damageDate: new Date().toISOString().split('T')[0],
      severity: 'MINOR',
      responsibleParty: 'CUSTOMER',
      estimatedRepairCost: 0
    });
  }

  /**
   * Gère la sélection des photos
   */
  onDamagePhotoSelected(event: any): void {
    const files: FileList = event.target.files;
    const maxFiles = 5;

    if (files.length) {
      const filesToAdd = Array.from(files).slice(0, maxFiles - this.damagePhotos.length);

      filesToAdd.forEach(file => {
        if (file.type.startsWith('image/')) {
          this.damagePhotos.push(file);
          const reader = new FileReader();
          reader.onload = (e: any) => this.previewUrls.push(e.target.result);
          reader.readAsDataURL(file);
        }
      });

      if (files.length > maxFiles) {
        this.notificationService.warning('Limite', `Maximum ${maxFiles} photos`);
      }
    }
  }

  /**
   * Supprime une photo
   */
  removeDamagePhoto(index: number): void {
    this.damagePhotos.splice(index, 1);
    this.previewUrls.splice(index, 1);
  }

  /**
   * Soumet le formulaire de dommage
   */
  onDamageReportSubmit(): void {
    this.damageReportSubmitted = true;

    if (this.damageReportForm.invalid || !this.selectedContract) {
      this.notificationService.error('Formulaire incomplet', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    let severityValue = this.damageReportForm.value.severity;
    if (typeof severityValue === 'string') {
      severityValue = this.getDamageSeverityValue(severityValue);
    }

    if (!severityValue || severityValue < 1 || severityValue > 4) {
      this.notificationService.error('Sévérité invalide', 'Veuillez sélectionner une sévérité valide');
      return;
    }

    if ((severityValue === DamageSeverity.Major || severityValue === DamageSeverity.Total) && !this.damagePhotos.length) {
      this.notificationService.warning('Photos requises', 'Ajoutez au moins une photo pour les dommages graves');
      return;
    }

    this.damageReportLoading = true;
    const request: ReportDamageRequest = {
      description: this.damageReportForm.value.description,
      severity: Number(severityValue),
      estimatedCost: Number(this.damageReportForm.value.estimatedRepairCost),
      photoUrls: this.damagePhotos.map((_, i) => `damage_${this.selectedContract!.id}_${Date.now()}_${i}.jpg`),
      notes: this.damageReportForm.value.notes || ''
    };

    this.contractService.reportDamage(this.selectedContract.id, request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.damageReportLoading = false)
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Dommage signalé', `Signalé pour le contrat ${this.selectedContract?.contractNumber}`);
          this.closeDamageReportModal();
          this.loadContracts();
        },
        error: (error) => {
          console.error('Erreur signalement:', error);
          this.notificationService.error('Erreur', this.extractApiError(error));
        }
      });
  }

  /**
   * Vérifie si un dommage peut être signalé
   */
  canReportDamage(contract: ContractDto): boolean {
    if (contract.status !== ContractStatus.Active) return false;
    const today = new Date();
    const startDate = new Date(contract.startDate);
    const endDate = new Date(contract.endDate);
    return today >= startDate && today <= endDate;
  }

  // ============================================================================
  // SECTION 29: GESTION DES PÉNALITÉS
  // ============================================================================

  /**
   * Ouvre la modal des pénalités
   */
  openPenaltiesModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.penaltiesLoading = true;
    this.showPenaltiesModal = true;

    this.contractService.getContractPenalties(contract.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.penaltiesLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<LatePenaltyInfo>) => {
          this.penaltiesInfo = response.data;
        },
        error: (error) => {
          console.error('Erreur chargement pénalités:', error);
          this.notificationService.error('Erreur', error.message || '');
          this.closePenaltiesModal();
        }
      });
  }

  /**
   * Ferme la modal des pénalités
   */
  closePenaltiesModal(): void {
    this.showPenaltiesModal = false;
    this.selectedContract = null;
    this.penaltiesInfo = null;
  }

  // ============================================================================
  // SECTION 30: GESTION DE LA RÉSILIATION
  // ============================================================================

  /**
   * Ouvre la modal de résiliation
   */
  openTerminateModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.showTerminateModal = true;
    this.terminateSubmitted = false;
  }

  /**
   * Ferme la modal de résiliation
   */
  closeTerminateModal(): void {
    this.showTerminateModal = false;
    this.selectedContract = null;
    this.terminateForm.reset();
  }

  /**
   * Soumet la résiliation
   */
  onTerminateSubmit(): void {
    this.terminateSubmitted = true;

    if (this.terminateForm.invalid || !this.selectedContract) {
      return;
    }

    this.terminateLoading = true;
    this.contractService.terminateContract(this.selectedContract.id, this.terminateForm.value.reason)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.terminateLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<ContractDto>) => {
          this.notificationService.success('Contrat résilié', 'Contrat résilié avec succès');
          this.closeTerminateModal();
          this.loadContracts();
        },
        error: (error) => {
          console.error('Erreur résiliation:', error);
          this.notificationService.error('Erreur', error.message || '');
        }
      });
  }

  // ============================================================================
  // SECTION 31: GESTION DE L'ANNULATION ET DU REJET
  // ============================================================================

  /**
   * Ouvre la modal d'annulation
   */
  openCancelContractModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.showCancelContractModal = true;
    this.cancelContractSubmitted = false;
    this.calculateCancellationFees(contract);
  }

  /**
   * Calcule les frais d'annulation
   */
  private calculateCancellationFees(contract: ContractDto): void {
    const today = new Date();
    const startDate = new Date(contract.startDate);
    const endDate = new Date(contract.endDate);
    const totalWeeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const elapsedWeeks = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const percentageElapsed = (elapsedWeeks / totalWeeks) * 100;

    let cancellationFee = 0;
    let refundAmount = 0;
    const remainingValue = contract.weeklyAmount * (totalWeeks - elapsedWeeks);

    if (percentageElapsed <= 25) {
      cancellationFee = remainingValue * 0.5;
      refundAmount = remainingValue - cancellationFee;
    } else if (percentageElapsed <= 50) {
      cancellationFee = remainingValue * 0.75;
      refundAmount = remainingValue - cancellationFee;
    } else {
      cancellationFee = remainingValue;
      refundAmount = 0;
    }

    this.cancelContractForm.patchValue({
      cancellationFee: Math.round(cancellationFee),
      refundAmount: Math.round(refundAmount),
      effectiveDate: new Date().toISOString().split('T')[0]
    });
  }

  /**
   * Ferme la modal d'annulation
   */
  closeCancelContractModal(): void {
    this.showCancelContractModal = false;
    this.selectedContract = null;
    this.cancelContractForm.reset({
      reason: '', refundAmount: 0, cancellationFee: 0,
      effectiveDate: new Date().toISOString().split('T')[0]
    });
  }

  /**
   * Soumet l'annulation
   */
  onCancelContractSubmit(): void {
    this.cancelContractSubmitted = true;

    if (this.cancelContractForm.invalid || !this.selectedContract) {
      this.notificationService.error('Formulaire incomplet', 'Indiquez la raison de l\'annulation');
      return;
    }

    if (!confirm('Confirmer l\'annulation ? Cette action est irréversible.')) {
      return;
    }

    this.cancelContractLoading = true;
    this.contractService.cancelContract(this.selectedContract.id, this.cancelContractForm.value.reason)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cancelContractLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<ContractDto>) => {
          this.notificationService.success('Contrat annulé', `Contrat ${this.selectedContract?.contractNumber} annulé`);
          this.showCancellationSummary();
          this.closeCancelContractModal();
          this.loadContracts();
          this.loadDashboardStats();
        },
        error: (error) => {
          console.error('Erreur annulation:', error);
          this.notificationService.error('Erreur', this.extractApiError(error));
        }
      });
  }

  /**
   * Affiche le résumé de l'annulation
   */
  private showCancellationSummary(): void {
    const summary = `
      <div>
        <p><strong>Contrat:</strong> ${this.selectedContract?.contractNumber}</p>
        <p><strong>Frais:</strong> ${this.formatCurrency(this.cancelContractForm.value.cancellationFee)}</p>
        <p><strong>Remboursement:</strong> ${this.formatCurrency(this.cancelContractForm.value.refundAmount)}</p>
      </div>
    `;
    this.notificationService.info('Détails annulation', summary, 5000);
  }

  /**
   * Vérifie si un contrat peut être annulé
   */
  canCancelContract(contract: ContractDto): boolean {
    if (contract.status !== ContractStatus.Active) return false;
    return new Date() < new Date(contract.endDate);
  }

  /**
   * Ouvre la modal de rejet
   */
  openRejectContractModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.showRejectContractModal = true;
    this.rejectContractSubmitted = false;
    this.rejectContractForm.patchValue({ reason: 'Documentation incomplète' });
  }

  /**
   * Ferme la modal de rejet
   */
  closeRejectContractModal(): void {
    this.showRejectContractModal = false;
    this.selectedContract = null;
    this.rejectContractForm.reset({ reason: '', notes: '' });
  }

  /**
   * Soumet le rejet
   */
  onRejectContractSubmit(): void {
    this.rejectContractSubmitted = true;

    if (this.rejectContractForm.invalid || !this.selectedContract) {
      this.notificationService.error('Formulaire incomplet', 'Indiquez le motif du rejet');
      return;
    }

    if (!confirm('Confirmer le rejet ? Cette action est irréversible.')) {
      return;
    }

    this.rejectContractLoading = true;
    this.contractService.rejectContract(this.selectedContract.id, this.rejectContractForm.value.reason)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.rejectContractLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<ContractDto>) => {
          this.notificationService.success('Contrat rejeté', `Contrat ${this.selectedContract?.contractNumber} rejeté`);
          this.closeRejectContractModal();
          this.loadContracts();
        },
        error: (error) => {
          console.error('Erreur rejet:', error);
          this.notificationService.error('Erreur', this.extractApiError(error));
        }
      });
  }

  /**
   * Vérifie si un contrat peut être rejeté
   */
  canRejectContract(contract: ContractDto): boolean {
    return contract.status === ContractStatus.Draft || contract.status === ContractStatus.Pending;
  }

  /**
   * Gère le changement de motif
   */
  onReasonChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.rejectContractForm.patchValue({ reason: selectElement.value });
  }

  // ============================================================================
  // SECTION 32: GESTION DU SOLDE ET RAPPORTS FINANCIERS
  // ============================================================================

  /**
   * Ouvre la modal de solde
   */
  openBalanceModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.balanceLoading = true;
    this.showBalanceModal = true;

    this.contractService.getContractBalance(contract.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponseData<ContractBalance>) => {
          this.contractBalance = response.data;
        }
      });

    this.contractService.getContractPayments(contract.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.balanceLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<PaymentRecord[]>) => {
          this.contractPayments = response.data;
        }
      });
  }

  /**
   * Ferme la modal de solde
   */
  closeBalanceModal(): void {
    this.showBalanceModal = false;
    this.selectedContract = null;
    this.contractBalance = null;
    if (this.contracts.length) this.loadContracts();
  }

  /**
   * Ouvre la modal de rapport financier
   */
  openFinancialReportModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.financialReportLoading = true;
    this.showFinancialReportModal = true;

    this.contractService.getContractFinancialReport(contract.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponseData<ContractFinancialReport>) => {
          this.financialReport = response.data;
        }
      });

    this.contractService.getContractPayments(contract.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.financialReportLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<PaymentRecord[]>) => {
          this.contractPayments = response.data;
        },
        error: (error) => console.error('Erreur chargement paiements:', error)
      });
  }

  /**
   * Ferme la modal de rapport financier
   */
  closeFinancialReportModal(): void {
    this.showFinancialReportModal = false;
    this.selectedContract = null;
    this.financialReport = null;
  }

  /**
   * Ouvre la modal d'éligibilité client
   */
  openEligibilityModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.eligibilityLoading = true;
    this.showEligibilityModal = true;

    this.contractService.checkCustomerEligibility(contract.customerId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.eligibilityLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<ContractEligibilityResult>) => {
          this.eligibilityResult = response.data;
        },
        error: (error) => {
          console.error('Erreur éligibilité:', error);
          this.notificationService.error('Erreur', error.message || '');
          this.closeEligibilityModal();
        }
      });
  }

  /**
   * Ferme la modal d'éligibilité
   */
  closeEligibilityModal(): void {
    this.showEligibilityModal = false;
    this.selectedContract = null;
    this.eligibilityResult = null;
  }

  // ============================================================================
  // SECTION 33: GESTION DES SIGNATURES
  // ============================================================================

  /**
   * Ouvre la modal de signature
   */
  openSignatureModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.showSignatureModal = true;
    this.signatureSubmitted = false;
  }

  /**
   * Ferme la modal de signature
   */
  closeSignatureModal(): void {
    this.showSignatureModal = false;
    this.selectedContract = null;
    this.signatureForm.reset({ signatureDate: new Date().toISOString().split('T')[0] });
    this.signatureFile = null;
  }

  /**
   * Gère la sélection du fichier
   */
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.signatureFile = file;
    } else {
      this.notificationService.error('Fichier invalide', 'Sélectionnez un fichier PDF');
    }
  }

  signatureFile: File | null = null;

  /**
   * Soumet la signature
   */
  onSignatureSubmit(): void {
    this.signatureSubmitted = true;

    if (this.signatureForm.invalid || !this.signatureFile || !this.selectedContract) {
      return;
    }

    this.signatureLoading = true;
    this.contractService.uploadSignedContract(this.selectedContract.id, this.signatureFile)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.signatureLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<any>) => {
          this.notificationService.success('Contrat signé uploadé', 'Succès');
          this.closeSignatureModal();
        },
        error: (error) => {
          console.error('Erreur upload:', error);
          this.notificationService.error('Erreur', error.message || '');
        }
      });
  }

  // ============================================================================
  // SECTION 34: GÉNÉRATION DE DOCUMENTS
  // ============================================================================

  /**
   * Génère le PDF du contrat
   */
  generatePdf(contract: ContractDto): void {
    this.contractService.generateContractPdf(contract.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponseData<any>) => {
          this.notificationService.success('PDF généré', 'Succès');
          this.downloadPdf(contract.id);
        },
        error: (error) => {
          console.error('Erreur génération PDF:', error);
          this.notificationService.error('Erreur PDF', error.message || '');
        }
      });
  }

  /**
   * Télécharge le PDF
   */
  downloadPdf(contractId: string): void {
    this.contractService.downloadContractPdf(contractId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `CONTRAT-${new Date().getTime()}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        },
        error: (error) => {
          console.error('Erreur téléchargement PDF:', error);
          this.notificationService.error('Erreur téléchargement', error.message || '');
        }
      });
  }

  // ============================================================================
  // SECTION 35: HELPER METHODS - AFFICHAGE
  // ============================================================================

  /**
   * Obtient le libellé du statut
   */
  getStatusLabel(status: ContractStatus): string {
    return this.statusOptions.find(opt => opt.value === status)?.label || 'Inconnu';
  }

  /**
   * Obtient la classe CSS du badge de statut
   */
  getStatusBadgeClass(status: ContractStatus): string {
    const option = this.statusOptions.find(opt => opt.value === status);
    return option ? `badge bg-${option.color}` : 'badge bg-secondary';
  }

  /**
   * Obtient l'icône du statut
   */
  getStatusIcon(status: ContractStatus): string {
    return this.statusOptions.find(opt => opt.value === status)?.icon || 'bx bx-question-mark';
  }

  /**
   * Formate une date
   */
  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  /**
   * Formate un montant
   */
  formatCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '0 FCFA';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Obtient le libellé de la fréquence de paiement
   */
  getPaymentFrequencyLabel(frequency: PaymentFrequency): string {
    return this.frequencyOptions.find(opt => opt.value === frequency)?.label || 'Inconnu';
  }

  /**
   * Obtient le libellé de la méthode de paiement
   */
  getPaymentMethodLabel(method: PaymentMethod): string {
    return this.paymentMethodOptions.find(opt => opt.value === method)?.label || 'Inconnu';
  }

  /**
   * Obtient le libellé de la sévérité
   */
  getDamageSeverityLabel(severityValue: number): string {
    const severities: Record<number, string> = {
      1: 'Mineur', 2: 'Modéré', 3: 'Majeur', 4: 'Critique'
    };
    return severities[severityValue] || 'Inconnu';
  }

  /**
   * Obtient le libellé du niveau de carburant
   */
  getFuelLevelLabel(levelValue: number): string {
    const levels: Record<number, string> = {
      0: 'Vide', 25: '¼', 50: '½', 75: '¾', 100: 'Plein'
    };
    return levels[levelValue] || `${levelValue}%`;
  }

  /**
   * Obtient le libellé de l'état du véhicule
   */
  getVehicleConditionLabel(condition: string): string {
    const conditions: Record<string, string> = {
      'EXCELLENT': 'Excellent', 'GOOD': 'Bon', 'FAIR': 'Correct',
      'POOR': 'Mauvais', 'DAMAGED': 'Endommagé'
    };
    return conditions[condition] || condition;
  }

  /**
   * Obtient le libellé de la partie responsable
   */
  getResponsiblePartyLabel(party: string): string {
    const parties: Record<string, string> = {
      'CUSTOMER': 'Client', 'COMPANY': 'Société',
      'THIRD_PARTY': 'Tiers', 'UNKNOWN': 'Inconnu'
    };
    return parties[party] || party;
  }

  /**
   * Convertit la sévérité string en nombre
   */
  getDamageSeverityValue(severityString: string): number {
    const map: Record<string, number> = {
      'MINOR': 1, 'MODERATE': 2, 'MAJOR': 3, 'CRITICAL': 4, 'TOTAL': 4
    };
    return map[severityString.toUpperCase()] || 1;
  }

  /**
   * Obtient les initiales de l'utilisateur
   */
  getUserInitials(): string {
    const parts = this.userName.split(' ');
    return parts.length >= 2
      ? (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
      : this.userName.charAt(0).toUpperCase();
  }

  /**
   * Obtient l'avatar par défaut
   */
  getDefaultAvatar(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=696cff&color=fff&size=128`;
  }

  // ============================================================================
  // SECTION 36: CALCULS STATISTIQUES
  // ============================================================================

  /**
   * Calcule le montant total dû
   */
  getTotalPaymentsDue(): number {
    return this.contracts
      .filter(c => c.status === ContractStatus.Active)
      .reduce((sum, c) => sum + ((c.weeksRemaining || 0) * (c.weeklyAmount || 0)), 0);
  }

  /**
   * Calcule le taux de recouvrement
   */
  get recoveryRate(): number {
    const totalValue = this.contracts
      .filter(c => c.status === ContractStatus.Active || c.status === ContractStatus.Completed)
      .reduce((sum, c) => sum + c.totalAmount, 0);
    const paid = totalValue - (this.dashboardStats.totalOutstanding || 0);
    return totalValue ? (paid / totalValue) * 100 : 0;
  }

  /**
   * Calcule la valeur totale des contrats actifs
   */
  get totalActiveContractsValue(): number {
    return this.contracts
      .filter(c => c.status === ContractStatus.Active)
      .reduce((sum, c) => sum + c.totalAmount, 0);
  }

  /**
   * Calcule le total des semaines restantes
   */
  get totalWeeksRemaining(): number {
    return this.contracts
      .filter(c => c.status === ContractStatus.Active)
      .reduce((sum, c) => sum + (c.weeksRemaining || 0), 0);
  }

  /**
   * Obtient les contrats avec paiements en retard
   */
  get contractsWithOverduePayments(): ContractDto[] {
    return this.contracts.filter(c => c.status === ContractStatus.Active && this.isPaymentOverdue(c));
  }

  /**
   * Vérifie si un paiement est en retard
   */
  isPaymentOverdue(contract: ContractDto): boolean {
    if (!contract || contract.status !== ContractStatus.Active) return false;
    const nextPayment = this.getNextPaymentDate(contract);
    return nextPayment ? nextPayment < new Date() : false;
  }

  /**
   * Obtient la date du prochain paiement
   */
  getNextPaymentDate(contract: ContractDto): Date | null {
    if (!contract || contract.status !== ContractStatus.Active) return null;
    const today = new Date();
    const startDate = new Date(contract.startDate);
    const weeksPassed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const nextPayment = new Date(startDate);
    nextPayment.setDate(nextPayment.getDate() + ((weeksPassed + 1) * 7));
    return nextPayment;
  }

  /**
   * Obtient le nombre de jours de retard
   */
  getDaysOverdue(contract: ContractDto): number {
    if (!this.isPaymentOverdue(contract)) return 0;
    const nextPayment = this.getNextPaymentDate(contract);
    if (!nextPayment) return 0;
    return Math.ceil((new Date().getTime() - nextPayment.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Calcule le pourcentage de paiements effectués
   */
  getPaymentCompletionPercentage(): number {
    if (!this.financialReport) return 0;
    const total = this.financialReport.paymentsMade + this.financialReport.paymentsMissed;
    return total ? Math.round((this.financialReport.paymentsMade / total) * 100) : 0;
  }

  /**
   * Calcule le pourcentage de paiements manqués
   */
  getMissedPaymentPercentage(): number {
    if (!this.financialReport) return 0;
    const total = this.financialReport.paymentsMade + this.financialReport.paymentsMissed;
    return total ? Math.round((this.financialReport.paymentsMissed / total) * 100) : 0;
  }

  /**
   * Calcule le pourcentage d'impayés
   */
  getOutstandingPercentage(): number {
    if (!this.financialReport || this.financialReport.totalContractValue === 0) return 0;
    return Math.round((this.financialReport.totalOutstanding / this.financialReport.totalContractValue) * 100);
  }

  // ============================================================================
  // SECTION 37: GESTION DE L'INTERFACE UTILISATEUR
  // ============================================================================

  /**
   * Bascule le menu utilisateur
   */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  /**
   * Bascule la sidebar
   */
  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    const layoutPage = document.querySelector('.layout-page');

    if (sidebar && layoutPage) {
      sidebar.classList.toggle('collapsed', this.isSidebarCollapsed);
      (layoutPage as HTMLElement).style.marginLeft =
        this.isSidebarCollapsed || this.isMobileView ? '0' : '280px';
    }
  }

  /**
   * Bascule le menu (dropdown)
   */
  toggleMenu(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    element.parentElement?.classList.toggle('open');
  }

  /**
   * Gère la déconnexion
   */
  logout(): void {
    this.tokenService.logout();
    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.router.navigate(['/auth/login']),
        error: () => this.router.navigate(['/auth/login'])
      });
  }

  // ============================================================================
  // SECTION 39: GESTION DES ERREURS API
  // ============================================================================

  /**
   * Extrait le message d'erreur d'une réponse API
   */
  private extractErrorMessage(response: any): string {
    if (!response) return 'Erreur inconnue';
    if (response.message) return response.message;
    if (response.errors?.length) return response.errors.join(', ');
    if (response.data && typeof response.data === 'string') return response.data;
    if (response.statusText) return response.statusText;
    return 'Erreur lors de l\'opération';
  }

  /**
   * Extrait l'erreur d'une réponse HTTP
   */
  private extractApiError(error: any): string {
    if (error.error?.errors?.includes('DELIVERY_INFO_MISSING')) {
      return 'Informations de livraison manquantes. Activez d\'abord le contrat.';
    }

    if (error.error) {
      if (error.error.message) return error.error.message;
      if (Array.isArray(error.error.errors)) return error.error.errors.join(', ');
      if (typeof error.error.errors === 'object') {
        return Object.entries(error.error.errors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('; ');
      }
      if (typeof error.error === 'string') return error.error;
    }

    if (error.status === 400) return 'Données invalides';
    if (error.status === 401) return 'Session expirée';
    if (error.status === 403) return 'Autorisation insuffisante';
    if (error.status >= 500) return 'Erreur serveur';

    return error.message || 'Erreur lors de l\'opération';
  }

  // ============================================================================
  // SECTION 40: GETTERS POUR LES FORMULAIRES (CONTROLS)
  // ============================================================================

  get cf() { return this.createForm.controls; }
  get pf() { return this.paymentForm.controls; }
  get rf() { return this.renewForm.controls; }
  get tf() { return this.terminateForm.controls; }
  get sf() { return this.signatureForm.controls; }
  get acf() { return this.activateContractForm.controls; }
  get vrf() { return this.vehicleReturnForm.controls; }
  get drf() { return this.damageReportForm.controls; }
  get ccf() { return this.cancelContractForm.controls; }
  get rjf() { return this.rejectContractForm.controls; }

  // ============================================================================
  // FIN DU COMPOSANT
  // ============================================================================
}
