import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NotificationComponent } from '../../../../../core/components/notification-component/notification-component';
import { finalize, Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../../environments/environment.development';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import { VehicleType, FuelType, ContractStatus, ContractType, PaymentFrequency, PaymentMethod, Permission, UserRole } from '../../../../../core/models/Enums/Logistiks-enums';
import { VehicleDto } from '../../../../../core/models/Vehicles/Vehicle.dtos';
import { Auth } from '../../../../../core/services/Auth/auth';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Token } from '../../../../../core/services/Token/token';
import { Vehicles } from '../../../../../core/services/Vehicles/vehicles';
import { ApiResponseData } from '../../../../../core/models/Common/ApiResponseData';
import { PaginatedResponse } from '../../../../../core/models/Common/PaginatedResponse';
import { RecordPaymentRequest, RenewContractRequest, CreateContractRequest } from '../../../../../core/models/Contracts/Contract-request.models';
import { ContractSearchCriteria, defaultContractSearchCriteria } from '../../../../../core/models/Contracts/Contract-search.models';
import { ContractBalance } from '../../../../../core/models/Contracts/ContractBalance';
import { ContractDto } from '../../../../../core/models/Contracts/ContractDto';
import { ContractEligibilityResult } from '../../../../../core/models/Contracts/ContractEligibilityResult';
import { ContractFinancialReport } from '../../../../../core/models/Contracts/ContractFinancialReport';
import { PaymentRecord } from '../../../../../core/models/Contracts/PaymentRecord';
import { Contract } from '../../../../../core/services/Contract/contract';

@Component({
  selector: 'app-contrats-list',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NotificationComponent],
  templateUrl: './contrats-list.html',
  styleUrl: './contrats-list.scss',
})
export class ContratsList  implements OnInit, OnDestroy {
  // ============================================================================
  // SECTION 1: PROPRIÉTÉS DE DONNÉES ET D'ÉTAT
  // ============================================================================

  /** Liste des contrats */
  contracts: ContractDto[] = [];
  isMobileView: boolean = false;
  /** Statistiques du tableau de bord */
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

  /** Filtres */
  searchTerm: string = '';
  selectedStatus: ContractStatus | null = null;
  selectedPaymentFrequency: PaymentFrequency | null = null;
  startDateFrom: string = '';
  startDateTo: string = '';
  endDateFrom: string = '';
  endDateTo: string = '';
  hasOutstandingBalance: boolean = false;

  /** Critères de recherche */
  searchCriteria: ContractSearchCriteria = { ...defaultContractSearchCriteria };

  /** Pagination */
  pagination = {
    currentPage: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false
  };

  /** Options de pagination */
  pageSizeOptions = [10, 25, 50, 100];

  /** Tri */
  selectedSort: string = 'createdAt';
  sortDescending: boolean = true;

  /** État de chargement */
  loading: boolean = false;
  error: string | null = null;

  /** Pages visibles pour la pagination */
  visiblePages: number[] = [];

  // ============================================================================
  // SECTION 2: MODALES ET FORMULAIRES
  // ============================================================================

  /** Modal d'enregistrement de paiement */
  showPaymentModal: boolean = false;
  selectedContractForPayment: ContractDto | null = null;
  paymentForm: FormGroup;
  paymentLoading: boolean = false;
  paymentSubmitted: boolean = false;

  /** Modal de renouvellement */
  showRenewModal: boolean = false;
  renewForm: FormGroup;
  renewLoading: boolean = false;
  renewSubmitted: boolean = false;

  /** Modal de termination */
  showTerminateModal: boolean = false;
  terminateForm: FormGroup;
  terminateLoading: boolean = false;
  terminateSubmitted: boolean = false;
  isSidebarCollapsed: boolean = false;

  /** Modal de solde détaillé */
  showBalanceModal: boolean = false;
  contractBalance: ContractBalance | null = null;
  balanceLoading: boolean = false;

  /** Modal de rapport financier */
  showFinancialReportModal: boolean = false;
  financialReport: ContractFinancialReport | null = null;
  financialReportLoading: boolean = false;

  /** Modal de signature */
  showSignatureModal: boolean = false;
  signatureForm: FormGroup;
  signatureFile: File | null = null;
  signatureLoading: boolean = false;
  signatureSubmitted: boolean = false;

  /** Modal d'éligibilité */
  showEligibilityModal: boolean = false;
  eligibilityResult: ContractEligibilityResult | null = null;
  eligibilityLoading: boolean = false;

  /** Modal de détails */
  showDetailsModal: boolean = false;
  selectedContract: ContractDto | null = null;
  contractDetailsLoading: boolean = false;

  /** Modal de création */
  showCreateModal: boolean = false;
  createForm: FormGroup;
  createLoading: boolean = false;
  createSubmitted: boolean = false;

  // ============================================================================
  // SECTION 3: MENUS D'ACTIONS
  // ============================================================================

  /** Menu d'actions ouvert */
  openedActionsMenu: string | null = null;

  /** Filtres avancés */
  showAdvancedFilters: boolean = false;

  // ============================================================================
  // SECTION 4: PROPRIÉTÉS DE GESTION UTILISATEUR
  // ============================================================================

  currentUser: any = null;
  userName: string = 'Utilisateur';
  userPhotoUrl: string = '';
  showUserMenu: boolean = false;

  /** Rôles et permissions */
  userRole = UserRole;
  permission = Permission;
  userPermissions: Set<Permission> = new Set();

  // ============================================================================
  // SECTION 5: ÉNUMÉRATIONS ET SERVICES
  // ============================================================================

  contractStatus = ContractStatus;
  paymentFrequency = PaymentFrequency;
  paymentMethod = PaymentMethod;
  contractType = ContractType;

  /** Options de statut */
  statusOptions = [
    { value: ContractStatus.Draft, label: 'Brouillon', icon: 'bx bx-edit', color: 'secondary' },
    { value: ContractStatus.Pending, label: 'En attente', icon: 'bx bx-time', color: 'warning' },
    { value: ContractStatus.Active, label: 'Actif', icon: 'bx bx-check-circle', color: 'success' },
    { value: ContractStatus.Suspended, label: 'Suspendu', icon: 'bx bx-pause-circle', color: 'warning' },
    { value: ContractStatus.Terminated, label: 'Terminé', icon: 'bx bx-x-circle', color: 'danger' },
    { value: ContractStatus.Completed, label: 'Complété', icon: 'bx bx-check-circle', color: 'success' },
    { value: ContractStatus.Assigned, label: 'Assigné', icon: 'bx bx-user-check', color: 'info' }
  ];

  /** Options de fréquence de paiement */
  frequencyOptions = [
    { value: PaymentFrequency.Weekly, label: 'Hebdomadaire', icon: 'bx bx-calendar-week' },
    { value: PaymentFrequency.BiWeekly, label: 'Bi-hebdomadaire', icon: 'bx bx-calendar' },
    { value: PaymentFrequency.Monthly, label: 'Mensuel', icon: 'bx bx-calendar' }
  ];

  /** Options de méthode de paiement */
  paymentMethodOptions = [
    { value: PaymentMethod.Cash, label: 'Espèces', icon: 'bx bx-money' },
    { value: PaymentMethod.MobileMoney, label: 'Mobile Money', icon: 'bx bx-mobile-alt' },
    { value: PaymentMethod.BankTransfer, label: 'Virement bancaire', icon: 'bx bx-bank' },
    { value: PaymentMethod.Check, label: 'Chèque', icon: 'bx bx-receipt' }
  ];

  /** Subject pour la gestion de la destruction des observables */
  private destroy$ = new Subject<void>();

  // ============================================================================
  // SECTION 6: CONSTRUCTEUR ET INITIALISATION
  // ============================================================================

  constructor(
    private formBuilder: FormBuilder,
    private contractService: Contract,
    private notificationService: NotificationService,
    private authService: Auth,
    private tokenService: Token,
    private router: Router
  ) {
    // Initialisation des formulaires
    this.paymentForm = this.formBuilder.group({
      paymentDate: [new Date().toISOString().split('T')[0], Validators.required],
      amountPaid: [0, [Validators.required, Validators.min(0.01)]],
      method: [PaymentMethod.Cash, Validators.required],
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
  }

    getDefaultAvatar(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=696cff&color=fff&size=128`;
  }

  toggleMenu(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    if (element && element.parentElement) {
      element.parentElement.classList.toggle('open');
    }
  }

getUserInitials(): string {
    const name = this.userName;
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
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

  /**
   * Initialise le composant
   */
  ngOnInit(): void {
    this.checkAuthentication();
    this.loadCurrentUser();
    this.loadContracts();
    this.loadDashboardStats();

    // Configurer la recherche en temps réel
    this.setupSearchObservable();
  }

  /**
   * Nettoie les ressources à la destruction du composant
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // SECTION 7: GESTION D'AUTHENTIFICATION ET UTILISATEUR
  // ============================================================================

  /**
   * Vérifie la présence d'un token d'authentification
   */
  private checkAuthentication(): void {
    const token = this.tokenService.getToken();
    if (!token) {
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Charge les informations de l'utilisateur courant
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
          this.handleUserLoadError(error);
        }
      });
  }

  /**
   * Charge les permissions de l'utilisateur
   */
  private loadUserPermissions(): void {
    // À adapter selon votre système de permissions
    this.userPermissions.add(Permission.Contract_Read);
    this.userPermissions.add(Permission.Contract_Create);
    // Ajouter d'autres permissions selon le rôle...
  }

  /**
   * Vérifie si l'utilisateur a une permission
   */
  hasPermission(permission: Permission): boolean {
    return this.userPermissions.has(permission);
  }

  /**
   * Formate le nom d'utilisateur pour l'affichage
   */
  private formatUserName(user: any): string {
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
   * Génère une URL d'avatar
   */
  private generateAvatarUrl(user: User): string {
    const name = this.formatUserName(user);
    const colors = ['FF6B6B', '4ECDC4', 'FFD166', '06D6A0', '118AB2', 'EF476F', '7209B7', '3A86FF'];
    const colorIndex = name.length % colors.length;

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${colors[colorIndex]}&color=fff&size=128`;
  }

  /**
   * Gère les erreurs de chargement de l'utilisateur
   */
  private handleUserLoadError(error: any): void {
    if (error.status === 401) {
      this.tokenService.handleTokenExpired();
    } else {
      this.setDefaultUser();
    }
  }

  /**
   * Définit les valeurs par défaut pour l'utilisateur
   */
  private setDefaultUser(): void {
    this.userName = 'Utilisateur Logistiks';
    this.userPhotoUrl = this.generateAvatarUrl({ firstName: 'Utilisateur' } as User);
  }

  // ============================================================================
  // SECTION 8: CHARGEMENT DES DONNÉES
  // ============================================================================

  /**
   * Charge la liste des contrats
   */
  loadContracts(): void {
    this.loading = true;
    this.error = null;

    // Mettre à jour les critères
    this.searchCriteria.searchTerm = this.searchTerm || undefined;
    this.searchCriteria.status = this.selectedStatus || undefined;
    this.searchCriteria.paymentFrequency = this.selectedPaymentFrequency || undefined;
    this.searchCriteria.hasOutstandingBalance = this.hasOutstandingBalance || undefined;
    this.searchCriteria.page = this.pagination.currentPage;
    this.searchCriteria.pageSize = this.pagination.pageSize;
    this.searchCriteria.sortBy = this.selectedSort;
    this.searchCriteria.sortDescending = this.sortDescending;

    // Gestion des dates
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

    this.contractService.searchContracts(this.searchCriteria)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (response: PaginatedResponse<ContractDto>) => {
          this.contracts = response.data;
          this.pagination = {
            currentPage: response.currentPage,
            pageSize: response.pageSize,
            totalCount: response.totalCount,
            totalPages: response.totalPages,
            hasPreviousPage: response.hasPreviousPage,
            hasNextPage: response.hasNextPage
          };
          this.updateVisiblePages();
        },
        error: (error) => {
          console.error('Erreur chargement contrats:', error);
          this.error = error.message || 'Erreur lors du chargement des contrats';
          this.notificationService.error('Erreur chargement contrats', '' + this.error);
        }
      });
  }

  /**
   * Charge les statistiques du tableau de bord
   */
  loadDashboardStats(): void {
    // Charger les contrats actifs
    this.contractService.getActiveContracts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponseData<ContractDto[]>) => {
          this.dashboardStats.activeContracts = response.data.length;
        },
        error: (error) => {
          console.error('Erreur chargement contrats actifs:', error);
        }
      });

    // Charger les paiements en retard
    this.contractService.getOverduePayments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponseData<PaymentRecord[]>) => {
          this.dashboardStats.paymentsOverdue = response.data.length;
          this.dashboardStats.totalOutstanding = response.data.reduce(
            (sum, payment) => sum + payment.amountDue, 0
          );
        },
        error: (error) => {
          console.error('Erreur chargement paiements retard:', error);
        }
      });

    // Charger les contrats arrivant à expiration
    this.contractService.getExpiringContracts(7)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponseData<ContractDto[]>) => {
          this.dashboardStats.contractsExpiring = response.data.length;
        },
        error: (error) => {
          console.error('Erreur chargement contrats expirants:', error);
        }
      });
  }

  /**
   * Configure l'observable pour la recherche en temps réel
   */
  private setupSearchObservable(): void {
    // Implémentation de la recherche en temps réel si nécessaire
  }

  // ============================================================================
  // SECTION 9: GESTION DES FILTRES ET RECHERCHE
  // ============================================================================

  /**
   * Exécute la recherche
   */
  onSearch(): void {
    this.pagination.currentPage = 1;
    this.loadContracts();
  }

  /**
   * Réinitialise les filtres
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
  // SECTION 10: GESTION DE LA PAGINATION
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
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
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
  // SECTION 11: GESTION DES MODALES
  // ============================================================================

  /**
   * Ouvre la modal d'enregistrement de paiement
   */
  openPaymentModal(contract: ContractDto): void {
    this.selectedContractForPayment = contract;
    this.paymentForm.patchValue({
      amountPaid: contract.weeklyAmount,
      paymentDate: new Date().toISOString().split('T')[0]
    });
    this.showPaymentModal = true;
    this.paymentSubmitted = false;
  }

  /**
   * Ferme la modal d'enregistrement de paiement
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
      amountPaid: this.paymentForm.value.amountPaid,
      method: this.paymentForm.value.method,
      reference: this.paymentForm.value.reference,
      notes: this.paymentForm.value.notes
    };

    this.contractService.recordPayment(this.selectedContractForPayment.id, request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.paymentLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<PaymentRecord>) => {
          this.notificationService.success('Paiement enregistré avec succès', 'Succès');
          this.closePaymentModal();
          this.loadContracts(); // Recharger la liste
        },
        error: (error) => {
          console.error('Erreur enregistrement paiement:', error);
          this.notificationService.error('Erreur lors de l\'enregistrement du paiement', error.message || '');
        }
      });
  }

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
    this.renewForm.reset({
      durationInWeeks: 4,
      newWeeklyAmount: 0,
      newSecurityDeposit: 0
    });
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
          this.notificationService.success('Contrat renouvelé avec succès', 'Succès');
          this.closeRenewModal();
          this.loadContracts();
        },
        error: (error) => {
          console.error('Erreur renouvellement contrat:', error);
          this.notificationService.error('Erreur lors du renouvellement du contrat', error.message || '');
        }
      });
  }

  /**
   * Ouvre la modal de termination
   */
  openTerminateModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.showTerminateModal = true;
    this.terminateSubmitted = false;
  }

  /**
   * Ferme la modal de termination
   */
  closeTerminateModal(): void {
    this.showTerminateModal = false;
    this.selectedContract = null;
    this.terminateForm.reset();
  }

  /**
   * Soumet le formulaire de termination
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
          this.notificationService.success('Contrat terminé avec succès', 'Succès');
          this.closeTerminateModal();
          this.loadContracts();
        },
        error: (error) => {
          console.error('Erreur termination contrat:', error);
          this.notificationService.error('Erreur lors de la termination du contrat', error.message || '');
        }
      });
  }

  /**
   * Ouvre la modal de solde détaillé
   */
  openBalanceModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.balanceLoading = true;
    this.showBalanceModal = true;

    this.contractService.getContractBalance(contract.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.balanceLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<ContractBalance>) => {
          this.contractBalance = response.data;
        },
        error: (error) => {
          console.error('Erreur chargement solde:', error);
          this.notificationService.error('Erreur lors du chargement du solde', error.message || '');
          this.closeBalanceModal();
        }
      });
  }

  /**
   * Ferme la modal de solde détaillé
   */
  closeBalanceModal(): void {
    this.showBalanceModal = false;
    this.selectedContract = null;
    this.contractBalance = null;
  }

  /**
   * Ouvre la modal de rapport financier
   */
  openFinancialReportModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.financialReportLoading = true;
    this.showFinancialReportModal = true;

    this.contractService.getContractFinancialReport(contract.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.financialReportLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<ContractFinancialReport>) => {
          this.financialReport = response.data;
        },
        error: (error) => {
          console.error('Erreur chargement rapport financier:', error);
          this.notificationService.error('Erreur lors du chargement du rapport financier', error.message || '');
          this.closeFinancialReportModal();
        }
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
    this.signatureForm.reset({
      signatureDate: new Date().toISOString().split('T')[0]
    });
    this.signatureFile = null;
  }

  /**
   * Gère la sélection du fichier de signature
   */
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.signatureFile = file;
    } else {
      this.notificationService.error('Veuillez sélectionner un fichier PDF', 'Fichier invalide');
    }
  }

  /**
   * Soumet le formulaire de signature
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
          this.notificationService.success('Contrat signé uploadé avec succès', 'Succès');
          this.closeSignatureModal();
        },
        error: (error) => {
          console.error('Erreur upload signature:', error);
          this.notificationService.error('Erreur lors de l\'upload du contrat signé', error.message || '');
        }
      });
  }

  /**
   * Ouvre la modal d'éligibilité
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
          console.error('Erreur vérification éligibilité:', error);
          this.notificationService.error('Erreur lors de la vérification d\'éligibilité', error.message || '');
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

  /**
   * Ouvre la modal de détails
   */
  openDetailsModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.contractDetailsLoading = true;
    this.showDetailsModal = true;

    // Charger les détails complets
    this.contractService.getContractById(contract.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.contractDetailsLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<ContractDto>) => {
          this.selectedContract = response.data;
        },
        error: (error) => {
          console.error('Erreur chargement détails:', error);
          this.notificationService.error('Erreur lors du chargement des détails du contrat', error.message || '');
        }
      });
  }

  /**
   * Ferme la modal de détails
   */
  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedContract = null;
  }

  /**
   * Ouvre la modal de création
   */
  openCreateModal(): void {
    this.showCreateModal = true;
    this.createSubmitted = false;
  }

  /**
   * Ferme la modal de création
   */
  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createForm.reset({
      startDate: new Date().toISOString().split('T')[0],
      durationInWeeks: 4,
      weeklyAmount: 0,
      securityDeposit: 0,
      paymentFrequency: PaymentFrequency.Weekly,
      paymentDay: 1,
      weeklyMileageLimit: 1000
    });
  }

  /**
   * Soumet le formulaire de création
   */
  onCreateSubmit(): void {
    this.createSubmitted = true;

    if (this.createForm.invalid) {
      return;
    }

    this.createLoading = true;

    const request: CreateContractRequest = {
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

    this.contractService.createContract(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.createLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<ContractDto>) => {
          this.notificationService.success('Contrat créé avec succès', 'Succès');
          this.closeCreateModal();
          this.loadContracts();
        },
        error: (error) => {
          console.error('Erreur création contrat:', error);
          this.notificationService.error('Erreur lors de la création du contrat', error.message || '');
        }
      });
  }

  // ============================================================================
  // SECTION 12: GESTION DES ACTIONS
  // ============================================================================

  /**
   * Bascule le menu d'actions
   */
  toggleActionsMenu(contract: ContractDto, event: MouseEvent): void {
    event.stopPropagation();
    if (this.openedActionsMenu === contract.id) {
      this.openedActionsMenu = null;
    } else {
      this.openedActionsMenu = contract.id;
    }
  }

  /**
   * Ferme le menu d'actions
   */
  closeActionsMenu(event: MouseEvent): void {
    if (!(event.target as HTMLElement).closest('.dropdown')) {
      this.openedActionsMenu = null;
    }
  }

  /**
   * Génère le PDF du contrat
   */
  generatePdf(contract: ContractDto): void {
    this.contractService.generateContractPdf(contract.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponseData<any>) => {
          this.notificationService.success('PDF généré avec succès', 'Succès');
          // Téléchargement automatique
          this.downloadPdf(contract.id);
        },
        error: (error) => {
          console.error('Erreur génération PDF:', error);
          this.notificationService.error('Erreur lors de la génération du PDF', error.message || '');
        }
      });
  }

  /**
   * Télécharge le PDF du contrat
   */
  downloadPdf(contractId: string): void {
    this.contractService.downloadContractPdf(contractId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `contrat-${contractId}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        },
        error: (error) => {
          console.error('Erreur téléchargement PDF:', error);
          this.notificationService.error('Erreur lors du téléchargement du PDF', error.message || '');
        }
      });
  }

  // ============================================================================
  // SECTION 13: HELPERS D'AFFICHAGE
  // ============================================================================

  /**
   * Obtient le label du statut
   */
  getStatusLabel(status: ContractStatus): string {
    const option = this.statusOptions.find(opt => opt.value === status);
    return option ? option.label : 'Inconnu';
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
    const option = this.statusOptions.find(opt => opt.value === status);
    return option ? option.icon : 'bx bx-question-mark';
  }

  /**
   * Formate une date
   */
  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  /**
   * Formate une devise
   */
  formatCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '0 FCFA';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Calcule les jours restants
   */
  getDaysRemaining(endDate: Date | string): number {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const today = new Date();
    const diff = end.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  }

  /**
   * Formate la fréquence de paiement
   */
  getPaymentFrequencyLabel(frequency: PaymentFrequency): string {
    const option = this.frequencyOptions.find(opt => opt.value === frequency);
    return option ? option.label : 'Inconnu';
  }

  /**
   * Formate la méthode de paiement
   */
  getPaymentMethodLabel(method: PaymentMethod): string {
    const option = this.paymentMethodOptions.find(opt => opt.value === method);
    return option ? option.label : 'Inconnu';
  }

  // ============================================================================
  // SECTION 14: GESTION DE L'INTERFACE UTILISATEUR
  // ============================================================================

  /**
   * Bascule l'affichage du menu utilisateur
   */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  /**
   * Écouteur d'événement pour fermer le menu utilisateur
   */
  @HostListener('document:click', ['$event'])
  closeUserMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-toggle') && !target.closest('.dropdown-menu')) {
      this.showUserMenu = false;
    }
  }

  /**
   * Écouteur d'événement pour fermer le menu d'actions
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.closeActionsMenu(event);
  }

  // ============================================================================
  // SECTION 15: GESTION DE LA DÉCONNEXION
  // ============================================================================

  /**
   * Gère le processus de déconnexion
   */
  logout(): void {
    console.log('🚪 Déconnexion en cours...');
    this.tokenService.logout();

    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Déconnexion API réussie');
          this.router.navigate(['/auth/login']);
        },
        error: (error) => {
          console.warn('⚠️ Erreur API déconnexion (ignorée):', error);
          this.router.navigate(['/auth/login']);
        }
      });
  }

  // ============================================================================
  // SECTION 16: GETTERS POUR LES FORMULAIRES
  // ============================================================================

  get pf() { return this.paymentForm.controls; }
  get rf() { return this.renewForm.controls; }
  get tf() { return this.terminateForm.controls; }
  get sf() { return this.signatureForm.controls; }
  get cf() { return this.createForm.controls; }
}
