import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../../environments/environment.development';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import { VehicleStatus, VehicleType, FuelType, TierStatus } from '../../../../../core/models/Enums/Logistiks-enums';
import { UpdateVehicleRequest, VehicleDto, VehicleSearchCriteria, VehicleStatistics } from '../../../../../core/models/Vehicles/Vehicle.dtos';
import { Auth } from '../../../../../core/services/Auth/auth';
import { Token } from '../../../../../core/services/Token/token';
import { Vehicles } from '../../../../../core/services/Vehicles/vehicles';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Tier } from '../../../../../core/models/Tiers/Tiers';
import { Tiers } from '../../../../../core/services/Tiers/tiers';

/**
 * Composant de gestion de la liste des véhicules
 * @selector app-vehicules-list
 * @templateUrl ./vehicules-list.html
 * @styleUrls ./vehicules-list.scss
 */
@Component({
  selector: 'app-vehicules-list',
  imports: [CommonModule, FormsModule, RouterModule, ReactiveFormsModule],
  templateUrl: './vehicules-list.html',
  styleUrls: ['./vehicules-list.scss'],
})
export class VehiculesList implements OnInit, OnDestroy {
  // ============================================================================
  // SECTION 1: PROPRIÉTÉS DE GESTION DE L'ÉTAT DE L'INTERFACE
  // ============================================================================

  /** Contrôle l'affichage du modal d'édition */
  showEditModal = false;
  /** Contrôle l'affichage du modal de détails */
  showDetailsModal = false;
  /** Contrôle l'affichage du modal de réservation */
  showReservationModal = false;
  /** Contrôle l'affichage du modal d'annulation de réservation */
  showCancelReservationModal = false;
  /** Contrôle l'affichage du modal de confirmation de réservation */
  showConfirmReservationModal = false;
  /** Contrôle l'affichage de la barre latérale de filtres */
  sidebarVisible = false;
  /** Contrôle l'affichage du menu utilisateur */
  showUserMenu: boolean = false;
  /** Contrôle l'état de réduction de la sidebar principale */
  isSidebarCollapsed: boolean = false;

  /** Véhicule sélectionné pour les opérations */
  selectedVehicle: VehicleDto | null = null;
  /** Réservation sélectionnée pour les opérations */
  selectedReservation: any = null;
  /** Véhicule pour la réservation en cours */
  reservationVehicle: VehicleDto | null = null;

  // ============================================================================
  // SECTION 2: PROPRIÉTÉS DE DONNÉES
  // ============================================================================

  /** Liste des véhicules affichés */
  vehicles: VehicleDto[] = [];
  /** Liste des tiers disponibles */
  tiersList: Tier[] = [];
  /** Liste filtrée des tiers pour l'autocomplétion */
  filteredTiers: Tier[] = [];
  /** Réservations actives */
  activeReservations: any[] = [];

  /** Statistiques de l'application */
  dashboardStats = {
    totalTiers: 0,
    activeTiers: 0,
    activeContracts: 0,
    recoveryRate: 0,
    documentsPending: 0,
    paymentsOverdue: 0,
    vehiclesNeedingAttention: 0,
    totalClients: 0,
    totalSuppliers: 0
  };

  /** Statistiques des véhicules */
  stats: VehicleStatistics = {
    totalVehicles: 0,
    availableVehicles: 0,
    rentedVehicles: 0,
    inMaintenanceVehicles: 0,
    outOfServiceVehicles: 0,
    reservedVehicles: 0,
    totalFleetValue: 0,
    averageVehicleValue: 0,
    vehiclesWithExpiredInsurance: 0,
    vehiclesWithExpiringInsurance: 0,
    averageVehicleAge: 0,
    totalDistanceTraveled: 0,
    averageMileage: 0,
    vehiclesByType: {} as Record<VehicleType, number>,
    vehiclesByFuelType: {} as Record<FuelType, number>,
    vehiclesByStatus: {} as Record<VehicleStatus, number>,
    activeContracts: 0,
    totalMonthlyRevenue: 0,
    averageUtilizationRate: 0,
    alerts: [],
    generatedAt: new Date()
  };

  // ============================================================================
  // SECTION 3: PROPRIÉTÉS DE GESTION UTILISATEUR
  // ============================================================================

  /** Utilisateur actuellement connecté */
  currentUser: any = null;
  /** Nom d'affichage de l'utilisateur */
  userName: string = 'Utilisateur';
  /** URL de la photo de profil de l'utilisateur */
  userPhotoUrl: string = '';

  // ============================================================================
  // SECTION 4: PROPRIÉTÉS DE PAGINATION ET FILTRES
  // ============================================================================

  /** Configuration de la pagination */
  pagination = {
    data: [] as VehicleDto[],
    currentPage: 1,
    pageSize: 50,
    totalCount: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false
  };

  /** Critères de recherche courants */
  searchCriteria: VehicleSearchCriteria = {
    page: 1,
    pageSize: 50,
    sortDescending: true,
    sortBy: 'createdAt'
  };

  /** Terme de recherche */
  searchTerm: string = '';
  /** Type de véhicule sélectionné pour le filtre */
  selectedType?: VehicleType;
  /** Statut sélectionné pour le filtre */
  selectedStatus?: VehicleStatus;
  /** Type de carburant sélectionné pour le filtre */
  selectedFuelType?: FuelType;
  /** Options de taille de page */
  pageSizeOptions = [10, 25, 50, 100];
  /** Pages visibles dans la pagination */
  visiblePages: number[] = [];

  /** Options de tri */
  sortOptions = [
    { value: 'createdAt', label: 'Date de création', icon: 'bx bx-calendar' },
    { value: 'updatedAt', label: 'Date de modification', icon: 'bx bx-calendar-edit' },
    { value: 'code', label: 'Code', icon: 'bx bx-hash' },
    { value: 'brand', label: 'Marque', icon: 'bx bx-sort-a-z' },
    { value: 'year', label: 'Année', icon: 'bx bx-calendar-alt' },
    { value: 'currentMileage', label: 'Kilométrage', icon: 'bx bx-tachometer' }
  ];

  /** Tri sélectionné */
  selectedSort = this.sortOptions[0].value;
  /** Ordre de tri (décroissant par défaut) */
  sortDescending = true;

  // ============================================================================
  // SECTION 5: FORMULAIRES
  // ============================================================================

  /** Formulaire d'édition de véhicule */
  editVehicleForm!: FormGroup;
  /** Formulaire de réservation */
  reservationForm!: FormGroup;
  /** Formulaire d'annulation de réservation */
  cancelReservationForm!: FormGroup;
  /** Formulaire de confirmation de réservation */
  confirmReservationForm!: FormGroup;

  // ============================================================================
  // SECTION 6: PROPRIÉTÉS D'ÉTAT DE CHARGEMENT
  // ============================================================================

  /** Indique si le chargement principal est en cours */
  loading = false;
  /** Indique si le chargement de l'édition est en cours */
  editLoading = false;
  /** Indique si le chargement des détails est en cours */
  vehicleDetailsLoading = false;
  /** Indique si le chargement des réservations est en cours */
  reservationsLoading = false;
  /** Indique si le chargement des tiers est en cours */
  tiersLoading = false;
  /** Indique si la soumission de réservation est en cours */
  reservationLoading = false;
  /** Indique si l'annulation de réservation est en cours */
  cancelReservationLoading = false;
  /** Indique si la confirmation de réservation est en cours */
  confirmReservationLoading = false;

  // ============================================================================
  // SECTION 7: PROPRIÉTÉS DE VALIDATION ET ERREURS
  // ============================================================================

  /** Indique si le formulaire d'édition a été soumis */
  editSubmitted = false;
  /** Indique si le formulaire de réservation a été soumis */
  reservationSubmitted = false;
  /** Indique si le formulaire d'annulation a été soumis */
  cancelReservationSubmitted = false;
  /** Indique si le formulaire de confirmation a été soumis */
  confirmReservationSubmitted = false;
  /** Message d'erreur global */
  error: string | null = null;

  // ============================================================================
  // SECTION 8: OPTIONS ET CONFIGURATIONS D'AFFICHAGE
  // ============================================================================

  /** Options de type de véhicule pour les selects */
  vehicleTypeOptions = [
    { value: VehicleType.Motorcycle, label: 'Moto' },
    { value: VehicleType.Car, label: 'Voiture' },
    { value: VehicleType.Tricycle, label: 'Tricycle' },
    { value: VehicleType.Scooter, label: 'Scooter' },
    { value: VehicleType.Van, label: 'Van' }
  ];

  /** Options de type de carburant pour les selects */
  fuelTypeOptions = [
    { value: FuelType.Gasoline, label: 'Essence' },
    { value: FuelType.Diesel, label: 'Diesel' },
    { value: FuelType.Electric, label: 'Électrique' },
    { value: FuelType.Hybrid, label: 'Hybride' }
  ];

  /** Types de véhicules avec métadonnées d'affichage */
  vehicleTypes = [
    { value: VehicleType.Motorcycle, label: 'Moto', icon: 'bx bx-cycling', color: 'primary' },
    { value: VehicleType.Car, label: 'Voiture', icon: 'bx bx-car', color: 'info' },
    { value: VehicleType.Tricycle, label: 'Tricycle', icon: 'bx bx-cycling', color: 'warning' },
    { value: VehicleType.Scooter, label: 'Scooter', icon: 'bx bx-cycling', color: 'success' },
    { value: VehicleType.Van, label: 'Van', icon: 'bx bx-bus', color: 'danger' }
  ];

  /** Statuts avec métadonnées d'affichage */
  statuses = [
    { value: VehicleStatus.Available, label: 'Disponible', badge: 'success', icon: 'bx bx-check-circle' },
    { value: VehicleStatus.Rented, label: 'Loué', badge: 'warning', icon: 'bx bx-key' },
    { value: VehicleStatus.Maintenance, label: 'Maintenance', badge: 'info', icon: 'bx bx-wrench' },
    { value: VehicleStatus.Reserved, label: 'Réservé', badge: 'primary', icon: 'bx bx-time' },
    { value: VehicleStatus.OutOfService, label: 'Hors service', badge: 'danger', icon: 'bx bx-block' }
  ];

  /** Types de carburant avec métadonnées d'affichage */
  fuelTypes = [
    { value: FuelType.Gasoline, label: 'Essence', icon: 'bx bx-gas-pump' },
    { value: FuelType.Diesel, label: 'Diesel', icon: 'bx bx-gas-pump' },
    { value: FuelType.Electric, label: 'Électrique', icon: 'bx bx-battery-charging' },
    { value: FuelType.Hybrid, label: 'Hybride', icon: 'bx bx-leaf' }
  ];

  /** Date du jour pour validation */
  today = new Date();

  // ============================================================================
  // SECTION 9: GESTION DES ÉNUMÉRATIONS ET DROPDOWNS
  // ============================================================================

  /** Référence aux énumérations pour le template */
  VehicleStatus = VehicleStatus;
  VehicleType = VehicleType;
  FuelType = FuelType;

  /** Gestion du dropdown ouvert actuellement */
  private currentOpenDropdown: VehicleDto | null = null;

  // ============================================================================
  // SECTION 10: GESTION DES OBSERVABLES
  // ============================================================================

  /** Subject pour la gestion de la destruction des observables */
  private destroy$ = new Subject<void>();

  // ============================================================================
  // SECTION 11: CONSTRUCTEUR ET INJECTION DE DÉPENDANCES
  // ============================================================================

  /**
   * Constructeur du composant
   * @param vehiclesService - Service de gestion des véhicules
   * @param notificationService - Service de notifications
   * @param authService - Service d'authentification
   * @param tokenService - Service de gestion des tokens
   * @param tiersService - Service de gestion des tiers
   * @param formBuilder - Service de création de formulaires réactifs
   * @param router - Service de routage
   */
  constructor(
    private vehiclesService: Vehicles,
    private notificationService: NotificationService,
    private authService: Auth,
    private tokenService: Token,
    public tiersService: Tiers,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.initializeForms();
  }

  /**
   * Initialise tous les formulaires du composant
   */
  initializeForms(): void {
    // Formulaire d'édition
    this.editVehicleForm = this.formBuilder.group({
      plateNumber: ['', [Validators.required, Validators.minLength(5)]],
      color: [''],
      currentMileage: ['', [Validators.required, Validators.min(0)]],
      notes: [''],

      // Assurance
      insuranceCompany: [''],
      insurancePolicyNumber: [''],
      insuranceStartDate: [''],
      insuranceEndDate: [''],
      insuranceCoverageType: [''],
      insuranceAnnualPremium: ['', [Validators.min(0)]],

      // Caractéristiques
      hasGps: [false],
      hasAirConditioning: [false],
      transmission: [''],
      engineCapacity: [''],
      fuelCapacity: [''],
      additionalFeatures: [''],

      // Localisation
      currentLocationAddress: [''],
      currentLocationLatitude: [''],
      currentLocationLongitude: ['']
    });

    // Formulaire de réservation
    this.reservationForm = this.formBuilder.group({
      vehicleId: ['', Validators.required],
      customerId: ['', [Validators.required, Validators.pattern(/^[0-9a-fA-F]{24}$/)]],
      expectedStartDate: ['', Validators.required],
      reservationDurationDays: [7, [Validators.required, Validators.min(1), Validators.max(30)]],
      notes: ['']
    });

    // Formulaire d'annulation
    this.cancelReservationForm = this.formBuilder.group({
      reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]]
    });

    // Formulaire de confirmation
    this.confirmReservationForm = this.formBuilder.group({
      contractId: ['', [Validators.required, Validators.pattern(/^[0-9a-fA-F]{24}$/)]]
    });
  }

  // ============================================================================
  // SECTION 12: LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Initialise le composant au chargement
   */
  ngOnInit(): void {
    this.checkAuthentication();
    this.loadCurrentUser();
    this.loadVehicles();
    this.loadStatistics();
    this.loadActiveReservations();
  }

  /**
   * Nettoie les ressources à la destruction du composant
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // SECTION 13: GESTION D'AUTHENTIFICATION ET UTILISATEUR
  // ============================================================================

  /**
   * Vérifie l'authentification et redirige si nécessaire
   */
  checkAuthentication(): void {
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
        },
        error: (error) => {
          console.error('Erreur chargement utilisateur:', error);
          this.handleUserLoadError(error);
        }
      });
  }

  /**
   * Gère les erreurs de chargement de l'utilisateur
   * @param error - Erreur survenue
   */
  handleUserLoadError(error: any): void {
    if (error.status === 401) {
      this.tokenService.handleTokenExpired();
    } else {
      this.setDefaultUser();
    }
  }

  /**
   * Définit les valeurs par défaut pour l'utilisateur
   */
  setDefaultUser(): void {
    this.userName = 'Utilisateur Logistiks';
    this.userPhotoUrl = this.generateAvatarUrl({ firstName: 'Utilisateur' } as User);
  }

  /**
   * Formatte le nom d'utilisateur pour l'affichage
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
   * Obtient l'URL de la photo de profil de l'utilisateur
   */
  getUserPhotoUrl(user: User): string {
    if (user.photoUrl && /^[0-9a-fA-F]{24}$/.test(user.photoUrl)) {
      return `${environment.apiUrl}/api/User/photo/${user.photoUrl}`;
    }
    if (user.photoUrl && user.photoUrl.startsWith('http')) {
      return user.photoUrl;
    }
    return this.generateAvatarUrl(user);
  }

  /**
   * Génère une URL d'avatar à partir du nom de l'utilisateur
   */
  generateAvatarUrl(user: User): string {
    const name = this.formatUserName(user);
    const colors = ['FF6B6B', '4ECDC4', 'FFD166', '06D6A0', '118AB2', 'EF476F', '7209B7', '3A86FF'];
    const colorIndex = name.length % colors.length;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${colors[colorIndex]}&color=fff&size=128`;
  }

  /**
   * Obtient les initiales de l'utilisateur
   */
  getUserInitials(): string {
    const name = this.userName;
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }

  /**
   * Obtient l'avatar par défaut
   */
  getDefaultAvatar(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=696cff&color=fff&size=128`;
  }

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
   * Déconnecte l'utilisateur
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
  // SECTION 14: GESTION DE LA SIDEBAR PRINCIPALE
  // ============================================================================

  /**
   * Bascule l'état de la sidebar principale
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
        (layoutPage as HTMLElement).style.marginLeft = '280px';
      }
    }
  }

  /**
   * Bascule l'état de la sidebar de filtres
   */
  toggleFiltersSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
  }

  /**
   * Bascule l'état d'un menu de navigation
   */
  toggleMenu(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    if (element && element.parentElement) {
      element.parentElement.classList.toggle('open');
    }
  }

  // ============================================================================
  // SECTION 15: GESTION DES VÉHICULES (CRUD & ACTIONS)
  // ============================================================================

  /**
   * Charge la liste des véhicules avec les critères de recherche actuels
   */
  loadVehicles(page: number = 1): void {
    this.loading = true;
    this.error = null;

    this.updateSearchCriteria(page);
    this.vehiclesService.searchVehicles(this.searchCriteria)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => this.handleVehiclesResponse(response),
        error: (error) => this.handleVehiclesError(error)
      });
  }

  /**
   * Met à jour les critères de recherche
   */
  private updateSearchCriteria(page: number): void {
    this.searchCriteria.page = page;
    this.searchCriteria.pageSize = this.pagination.pageSize;
    this.searchCriteria.searchTerm = this.searchTerm;
    this.searchCriteria.type = this.selectedType;
    this.searchCriteria.status = this.selectedStatus;
    this.searchCriteria.fuelType = this.selectedFuelType;
    this.searchCriteria.sortBy = this.selectedSort;
    this.searchCriteria.sortDescending = this.sortDescending;
  }

  /**
   * Gère la réponse du chargement des véhicules
   */
  private handleVehiclesResponse(response: any): void {
    this.vehicles = response.data || [];
    this.updatePagination(response);
    this.loading = false;
    this.updateVisiblePages();
  }

  /**
   * Gère les erreurs de chargement des véhicules
   */
  private handleVehiclesError(error: any): void {
    this.error = error instanceof Error ? error.message : 'Erreur lors du chargement';
    this.loading = false;
    this.notificationService.error('Erreur de chargement', this.error);
  }

  /**
   * Met à jour les informations de pagination
   */
  private updatePagination(response: any): void {
    this.pagination = {
      data: this.vehicles,
      currentPage: response.pageNumber || 1,
      pageSize: response.pageSize || 50,
      totalCount: response.totalCount || 0,
      totalPages: response.totalPages || 1,
      hasPreviousPage: (response.pageNumber || 1) > 1,
      hasNextPage: (response.pageNumber || 1) < (response.totalPages || 1)
    };
  }

  /**
   * Charge les statistiques des véhicules
   */
  loadStatistics(): void {
    this.vehiclesService.getVehicleStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.stats = response.data;
          }
        },
        error: (error) => {
          console.error('Erreur chargement statistiques:', error);
        }
      });
  }

  // ============================================================================
  // SECTION 16: GESTION DES MODALS DE DÉTAILS ET ÉDITION
  // ============================================================================

  /**
   * Affiche les détails d'un véhicule dans un modal
   */
  showVehicleDetails(vehicle: VehicleDto): void {
    this.selectedVehicle = vehicle;
    this.vehicleDetailsLoading = true;
    this.showDetailsModal = true;

    this.vehiclesService.getVehicleById(vehicle.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.vehicleDetailsLoading = false;
          if (response.success && response.data) {
            this.selectedVehicle = response.data;
          }
        },
        error: () => {
          this.vehicleDetailsLoading = false;
        }
      });
  }

  /**
   * Ferme le modal de détails
   */
  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedVehicle = null;
  }

  /**
   * Ouvre la page complète du véhicule
   */
  openFullDetails(): void {
    if (this.selectedVehicle) {
      this.router.navigate(['/dashboard/vehicules', this.selectedVehicle.id]);
      this.closeDetailsModal();
    }
  }

  /**
   * Ouvre le modal d'édition pour un véhicule
   */
  openEditModal(vehicle: VehicleDto): void {
    this.selectedVehicle = vehicle;
    this.populateEditForm(vehicle);
    this.showEditModal = true;
    this.editSubmitted = false;
  }

  /**
   * Remplit le formulaire d'édition avec les données du véhicule
   */
  private populateEditForm(vehicle: VehicleDto): void {
    this.editVehicleForm.patchValue({
      plateNumber: vehicle.plateNumber,
      color: vehicle.color || '',
      currentMileage: vehicle.currentMileage,
      notes: vehicle.notes || '',

      insuranceCompany: vehicle.insurance?.company || '',
      insurancePolicyNumber: vehicle.insurance?.policyNumber || '',
      insuranceStartDate: vehicle.insurance?.startDate ?
        new Date(vehicle.insurance.startDate).toISOString().split('T')[0] : '',
      insuranceEndDate: vehicle.insurance?.endDate ?
        new Date(vehicle.insurance.endDate).toISOString().split('T')[0] : '',
      insuranceCoverageType: vehicle.insurance?.coverageType || '',
      insuranceAnnualPremium: vehicle.insurance?.annualPremium || '',

      hasGps: vehicle.features?.hasGps || false,
      hasAirConditioning: vehicle.features?.hasAirConditioning || false,
      transmission: vehicle.features?.transmission || '',
      engineCapacity: vehicle.features?.engineCapacity || '',
      fuelCapacity: vehicle.features?.fuelCapacity || '',
      additionalFeatures: vehicle.features?.additionalFeatures?.join(', ') || '',

      currentLocationAddress: vehicle.currentLocation?.address || '',
      currentLocationLatitude: vehicle.currentLocation?.latitude || '',
      currentLocationLongitude: vehicle.currentLocation?.longitude || ''
    });
  }

  /**
   * Soumet le formulaire d'édition
   */
  onEditSubmit(): void {
    this.editSubmitted = true;

    if (this.editVehicleForm.invalid || !this.selectedVehicle) {
      this.notifyFormValidationError();
      return;
    }

    this.editLoading = true;
    const updateRequest = this.prepareUpdateRequest();

    this.vehiclesService.updateVehicle(this.selectedVehicle.id, updateRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => this.handleEditSuccess(response),
        error: (error) => this.handleEditError(error)
      });
  }

  /**
   * Prépare la requête de mise à jour
   */
  private prepareUpdateRequest(): UpdateVehicleRequest {
    const formValue = this.editVehicleForm.value;

    return {
      plateNumber: formValue.plateNumber,
      color: formValue.color || undefined,
      currentMileage: parseFloat(formValue.currentMileage),
      notes: formValue.notes || undefined,

      insurance: (formValue.insuranceCompany && formValue.insurancePolicyNumber) ? {
        company: formValue.insuranceCompany,
        policyNumber: formValue.insurancePolicyNumber,
        startDate: formValue.insuranceStartDate,
        endDate: formValue.insuranceEndDate,
        coverageType: formValue.insuranceCoverageType,
        annualPremium: parseFloat(formValue.insuranceAnnualPremium) || 0
      } : undefined,

      features: {
        hasGps: formValue.hasGps,
        hasAirConditioning: formValue.hasAirConditioning,
        transmission: formValue.transmission || undefined,
        engineCapacity: formValue.engineCapacity ? parseInt(formValue.engineCapacity) : undefined,
        fuelCapacity: formValue.fuelCapacity ? parseInt(formValue.fuelCapacity) : undefined,
        additionalFeatures: formValue.additionalFeatures
          ? formValue.additionalFeatures.split(',').map((f: string) => f.trim()).filter((f: string) => f)
          : []
      },

      currentLocation: (formValue.currentLocationAddress || formValue.currentLocationLatitude) ? {
        address: formValue.currentLocationAddress || undefined,
        latitude: parseFloat(formValue.currentLocationLatitude) || 0,
        longitude: parseFloat(formValue.currentLocationLongitude) || 0
      } : undefined
    };
  }

  /**
   * Gère le succès de l'édition
   */
  private handleEditSuccess(response: any): void {
    this.editLoading = false;

    if (response.success && response.data) {
      this.notificationService.success(
        'Véhicule modifié',
        `Les informations du véhicule ${response.data.plateNumber} ont été mises à jour`
      );

      this.closeEditModal();
      this.closeDetailsModal();
      this.loadVehicles(this.pagination.currentPage);

      if (this.selectedVehicle) {
        this.selectedVehicle = response.data;
      }
    } else {
      this.notificationService.error(
        'Erreur de modification',
        response.message || 'Impossible de modifier le véhicule'
      );
    }
  }

  /**
   * Gère les erreurs d'édition
   */
  private handleEditError(error: any): void {
    this.editLoading = false;
    this.notificationService.error(
      'Erreur',
      error.message || 'Une erreur est survenue lors de la modification'
    );
  }

  /**
   * Notifie les erreurs de validation du formulaire
   */
  private notifyFormValidationError(): void {
    this.notificationService.warning(
      'Formulaire invalide',
      'Veuillez corriger les erreurs dans le formulaire'
    );
  }

  /**
   * Ferme le modal d'édition
   */
  closeEditModal(): void {
    this.showEditModal = false;
    this.editVehicleForm.reset();
    this.editSubmitted = false;
  }

  // ============================================================================
  // SECTION 17: GESTION DES RÉSERVATIONS
  // ============================================================================

  /**
   * Charge les réservations actives
   */
  loadActiveReservations(): void {
    this.reservationsLoading = true;
    this.vehiclesService.getActiveReservations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => this.handleReservationsResponse(response),
        error: (error) => this.handleReservationsError(error)
      });
  }

  /**
   * Gère la réponse des réservations
   */
  private handleReservationsResponse(response: any): void {
    this.reservationsLoading = false;
    if (response.success && response.data) {
      this.activeReservations = response.data;
    }
  }

  /**
   * Gère les erreurs de chargement des réservations
   */
  private handleReservationsError(error: any): void {
    this.reservationsLoading = false;
    console.error('Erreur chargement des réservations:', error);
  }

  /**
   * Ouvre le modal de réservation pour un véhicule
   */
  openReservationModal(vehicle: VehicleDto): void {
    this.reservationVehicle = vehicle;
    this.showReservationModal = true;
    this.reservationSubmitted = false;

    this.reservationForm.patchValue({
      vehicleId: vehicle.id,
      customerId: '',
      expectedStartDate: '',
      reservationDurationDays: 7,
      notes: ''
    });

    this.loadTiersList();
  }

  /**
   * Charge la liste des tiers
   */
  loadTiersList(): void {
    this.tiersLoading = true;
    this.tiersService.getTiersList({
      status: TierStatus.Active,
      pageSize: 100
    }).subscribe({
      next: (response) => {
        this.tiersList = response.data;
        this.filteredTiers = response.data;
        this.tiersLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des tiers:', error);
        this.tiersLoading = false;
      }
    });
  }

  /**
   * Filtre les tiers selon le terme de recherche
   */
  filterTiers(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === '') {
      this.filteredTiers = this.tiersList;
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredTiers = this.tiersList.filter(tier =>
      this.tiersService.getFullName(tier).toLowerCase().includes(term) ||
      tier.phone?.toLowerCase().includes(term) ||
      tier.tierNumber?.toLowerCase().includes(term)
    );
  }

  /**
   * Obtient le tier sélectionné
   */
  getSelectedTier(): Tier | undefined {
    const customerId = this.reservationForm.get('customerId')?.value;
    if (!customerId) return undefined;
    return this.tiersList.find(t => t.id === customerId);
  }

  /**
   * Obtient le nom du tier sélectionné
   */
  getSelectedTierName(): string {
    const tier = this.getSelectedTier();
    return tier ? this.tiersService.getFullName(tier) : '';
  }

  /**
   * Ferme le modal de réservation
   */
  closeReservationModal(): void {
    this.showReservationModal = false;
    this.reservationForm.reset();
    this.reservationSubmitted = false;
    this.reservationVehicle = null;
  }

  /**
   * Soumet la réservation
   */
  onReservationSubmit(): void {
    this.reservationSubmitted = true;

    if (this.reservationForm.invalid) {
      this.notifyFormValidationError();
      return;
    }

    this.reservationLoading = true;
    const request = this.prepareReservationRequest();

    this.vehiclesService.reserveVehicle(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => this.handleReservationSuccess(response),
        error: (error) => this.handleReservationError(error)
      });
  }

  /**
   * Prépare la requête de réservation
   */
  private prepareReservationRequest(): any {
    const formValue = this.reservationForm.getRawValue();
    return {
      vehicleId: formValue.vehicleId,
      customerId: formValue.customerId,
      expectedStartDate: new Date(formValue.expectedStartDate),
      reservationDurationDays: formValue.reservationDurationDays,
      notes: formValue.notes || undefined
    };
  }

  /**
   * Gère le succès de la réservation
   */
  private handleReservationSuccess(response: any): void {
    this.reservationLoading = false;

    if (response.status === 200 && response.statusText === 'OK') {
      this.notificationService.success(
        'Réservation effectuée',
        response.statusText || 'Le véhicule a été réservé avec succès'
      );

      this.closeReservationModal();
      this.loadVehicles(this.pagination.currentPage);
      this.loadActiveReservations();
    } else {
      this.notificationService.error(
        'Erreur de réservation',
        response.statusText || 'Impossible de réserver le véhicule'
      );
    }
  }

  /**
   * Gère les erreurs de réservation
   */
  private handleReservationError(error: any): void {
    this.reservationLoading = false;
    this.notificationService.error(
      'Erreur',
      error.message || 'Une erreur est survenue lors de la réservation'
    );
  }

  /**
   * Ouvre le modal d'annulation de réservation
   */
  openCancelReservationModal(reservation: any): void {
    this.selectedReservation = reservation;
    this.cancelReservationForm.reset();
    this.cancelReservationSubmitted = false;
    this.showCancelReservationModal = true;
  }

  /**
   * Soumet l'annulation de réservation
   */
  onCancelReservationSubmit(): void {
    this.cancelReservationSubmitted = true;

    if (this.cancelReservationForm.invalid || !this.selectedReservation) {
      this.notifyFormValidationError();
      return;
    }

    this.cancelReservationLoading = true;
    const reason = this.cancelReservationForm.get('reason')?.value;

    this.vehiclesService.cancelReservation(this.selectedReservation.id, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => this.handleCancelReservationSuccess(response),
        error: (error) => this.handleCancelReservationError(error)
      });
  }

  /**
   * Gère le succès de l'annulation
   */
  private handleCancelReservationSuccess(response: any): void {
    this.cancelReservationLoading = false;

    if (response.status === 200) {
      this.notificationService.success(
        'Réservation annulée',
        response.statusText || 'La réservation a été annulée avec succès'
      );

      this.showCancelReservationModal = false;
      this.loadVehicles(this.pagination.currentPage);
      this.loadActiveReservations();
    } else {
      this.notificationService.error(
        'Erreur d\'annulation',
        response.statusText || 'Impossible d\'annuler la réservation'
      );
    }
  }

  /**
   * Gère les erreurs d'annulation
   */
  private handleCancelReservationError(error: any): void {
    this.cancelReservationLoading = false;
    this.notificationService.error(
      'Erreur',
      error.message || 'Une erreur est survenue lors de l\'annulation'
    );
  }

  /**
   * Ouvre le modal de confirmation de réservation
   */
  openConfirmReservationModal(reservation: any): void {
    this.selectedReservation = reservation;
    this.confirmReservationForm.reset();
    this.confirmReservationSubmitted = false;
    this.showConfirmReservationModal = true;
  }

  /**
   * Soumet la confirmation de réservation
   */
  onConfirmReservationSubmit(): void {
    this.confirmReservationSubmitted = true;

    if (this.confirmReservationForm.invalid || !this.selectedReservation) {
      this.notifyFormValidationError();
      return;
    }

    this.confirmReservationLoading = true;
    const contractId = this.confirmReservationForm.get('contractId')?.value;

    this.vehiclesService.confirmReservation(this.selectedReservation.id, contractId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => this.handleConfirmReservationSuccess(response),
        error: (error) => this.handleConfirmReservationError(error)
      });
  }

  /**
   * Gère le succès de la confirmation
   */
  private handleConfirmReservationSuccess(response: any): void {
    this.confirmReservationLoading = false;

    if (response.status === 200) {
      this.notificationService.success(
        'Réservation confirmée',
        response.statusText || 'La réservation a été liée au contrat avec succès'
      );

      this.showConfirmReservationModal = false;
      this.loadActiveReservations();
    } else {
      this.notificationService.error(
        'Erreur de confirmation',
        response.statusText || 'Impossible de confirmer la réservation'
      );
    }
  }

  /**
   * Gère les erreurs de confirmation
   */
  private handleConfirmReservationError(error: any): void {
    this.confirmReservationLoading = false;
    this.notificationService.error(
      'Erreur',
      error.message || 'Une erreur est survenue lors de la confirmation'
    );
  }

  /**
   * Vérifie si un véhicule peut être réservé
   */
  canReserveVehicle(vehicle: VehicleDto): boolean {
    return vehicle.status === VehicleStatus.Available &&
      (!vehicle.isInsuranceExpired ||
        (vehicle.daysUntilInsuranceExpiry !== undefined &&
          vehicle.daysUntilInsuranceExpiry > 0));
  }

  // ============================================================================
  // SECTION 18: GESTION DES ACTIONS ET DROPDOWNS
  // ============================================================================

  /**
   * Bascule le menu d'actions d'un véhicule
   */
  toggleActionsMenu(vehicle: VehicleDto, event: Event): void {
    event.stopPropagation();

    this.vehicles.forEach(v => {
      if (v !== vehicle) {
        v.showActionsMenu = false;
      }
    });

    vehicle.showActionsMenu = !vehicle.showActionsMenu;
    this.currentOpenDropdown = vehicle.showActionsMenu ? vehicle : null;
  }

  /**
   * Ferme tous les dropdowns quand on clique ailleurs
   */
  @HostListener('document:click', ['$event'])
  closeAllDropdowns(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      this.vehicles.forEach(v => v.showActionsMenu = false);
      this.currentOpenDropdown = null;
    }
  }

  /**
   * Exécute une action et ferme le dropdown
   */
  executeAction(vehicle: VehicleDto, action: () => void): void {
    action();
    vehicle.showActionsMenu = false;
    this.currentOpenDropdown = null;
  }

  /**
   * Obtient les actions disponibles pour un statut donné
   */
  getAvailableActions(vehicle: VehicleDto): any[] {
    const actions = [];

    switch (vehicle.status) {
      case VehicleStatus.Available:
        actions.push(
          { label: 'Louer', icon: 'bx bx-key', action: () => this.assignToRental(vehicle), class: 'btn-success' },
          { label: 'Réserver', icon: 'bx bx-time', action: () => this.openReservationModal(vehicle), class: 'btn-primary' },
          { label: 'Maintenance', icon: 'bx bx-wrench', action: () => this.changeStatus(vehicle, VehicleStatus.Maintenance), class: 'btn-info' }
        );
        break;
      case VehicleStatus.Rented:
        actions.push(
          { label: 'Libérer', icon: 'bx bx-check-circle', action: () => this.releaseVehicle(vehicle), class: 'btn-warning' },
          { label: 'Maintenance', icon: 'bx bx-wrench', action: () => this.changeStatus(vehicle, VehicleStatus.Maintenance), class: 'btn-info' }
        );
        break;
      case VehicleStatus.Reserved:
        actions.push(
          { label: 'Confirmer location', icon: 'bx bx-key', action: () => this.assignToRental(vehicle), class: 'btn-success' },
          { label: 'Annuler réservation', icon: 'bx bx-x', action: () => this.changeStatus(vehicle, VehicleStatus.Available), class: 'btn-secondary' }
        );
        break;
    }

    actions.push({
      label: 'Détails',
      icon: 'bx bx-show',
      action: () => this.showVehicleDetails(vehicle),
      class: 'btn-secondary'
    });

    return actions;
  }

  /**
   * Assigner un véhicule à une location
   */
  assignToRental(vehicle: VehicleDto): void {
    this.vehiclesService.canBeRented(vehicle.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.router.navigate(['/dashboard/vehicules', vehicle.id, 'affecter']);
          } else {
            this.notificationService.warning(
              'Véhicule non louable',
              'Ce véhicule ne peut pas être loué pour le moment'
            );
          }
        },
        error: (error) => {
          this.notificationService.error(
            'Erreur de vérification',
            error.message || 'Impossible de vérifier si le véhicule peut être loué'
          );
        }
      });
  }

  /**
   * Libérer un véhicule loué
   */
  releaseVehicle(vehicle: VehicleDto): void {
    const currentMileage = prompt(
      `Veuillez entrer le kilométrage actuel du véhicule ${vehicle.code} :`,
      vehicle.currentMileage.toString()
    );

    if (!currentMileage || isNaN(Number(currentMileage))) {
      this.notificationService.warning(
        'Kilométrage invalide',
        'Veuillez entrer un nombre valide'
      );
      return;
    }

    const confirmed = confirm(`Confirmer la libération du véhicule ${vehicle.code} ?`);
    if (!confirmed) return;

    this.loading = true;
    this.vehiclesService.releaseVehicle(vehicle.id, Number(currentMileage))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.handleReleaseSuccess(vehicle),
        error: (error) => this.handleReleaseError(error)
      });
  }

  /**
   * Gère le succès de la libération
   */
  private handleReleaseSuccess(vehicle: VehicleDto): void {
    this.loading = false;
    this.notificationService.success(
      'Véhicule libéré',
      `Le véhicule ${vehicle.code} est maintenant disponible`
    );
    this.loadVehicles(this.pagination.currentPage);
  }

  /**
   * Gère les erreurs de libération
   */
  private handleReleaseError(error: any): void {
    this.loading = false;
    this.notificationService.error(
      'Erreur de libération',
      error.message || 'Impossible de libérer le véhicule'
    );
  }

  /**
   * Change le statut d'un véhicule
   */
  changeStatus(vehicle: VehicleDto, newStatus: VehicleStatus): void {
    const currentStatus = this.getStatusText(vehicle.status);
    const newStatusText = this.getStatusText(newStatus);

    let message = `Changer le statut de ${vehicle.code} de "${currentStatus}" à "${newStatusText}" ?`;
    let warning = '';

    if (vehicle.status === VehicleStatus.Rented && newStatus !== VehicleStatus.Maintenance) {
      warning = '\n⚠️ Ce véhicule est actuellement loué. La location doit d\'abord être terminée.';
    }

    if (vehicle.isInsuranceExpired && newStatus === VehicleStatus.Available) {
      warning += '\n⚠️ L\'assurance de ce véhicule est expirée.';
    }

    if (!confirm(message + warning)) {
      return;
    }

    let reason: string | undefined;
    if ([VehicleStatus.Maintenance, VehicleStatus.OutOfService].includes(newStatus)) {
      reason = prompt('Veuillez indiquer la raison de ce changement :', '') || undefined;
      if (reason === undefined) return;
    }

    this.loading = true;
    this.vehiclesService.changeVehicleStatus(vehicle.id, newStatus, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.handleStatusChangeSuccess(vehicle, newStatusText),
        error: (error) => this.handleStatusChangeError(error)
      });
  }

  /**
   * Gère le succès du changement de statut
   */
  private handleStatusChangeSuccess(vehicle: VehicleDto, newStatusText: string): void {
    this.loading = false;
    this.notificationService.success(
      'Statut modifié',
      `Le véhicule ${vehicle.code} est maintenant "${newStatusText}"`
    );
    this.loadVehicles(this.pagination.currentPage);
  }

  /**
   * Gère les erreurs de changement de statut
   */
  private handleStatusChangeError(error: any): void {
    this.loading = false;
    this.notificationService.error(
      'Erreur de modification',
      error.message || 'Impossible de changer le statut'
    );
  }

  // ============================================================================
  // SECTION 19: GESTION DES RECHERCHES ET FILTRES
  // ============================================================================

  /**
   * Lance une recherche avec les critères actuels
   */
  onSearch(): void {
    this.pagination.currentPage = 1;
    this.loadVehicles();
  }

  /**
   * Filtre par type de véhicule
   */
  onFilterByType(type?: VehicleType): void {
    this.selectedType = type;
    this.pagination.currentPage = 1;
    this.loadVehicles();
  }

  /**
   * Filtre par statut
   */
  onFilterByStatus(status?: VehicleStatus): void {
    this.selectedStatus = status;
    this.pagination.currentPage = 1;
    this.loadVehicles();
  }

  /**
   * Filtre par type de carburant
   */
  onFilterByFuelType(fuelType?: FuelType): void {
    this.selectedFuelType = fuelType;
    this.pagination.currentPage = 1;
    this.loadVehicles();
  }

  /**
   * Change le critère de tri
   */
  onSortChange(field: string): void {
    if (this.selectedSort === field) {
      this.sortDescending = !this.sortDescending;
    } else {
      this.selectedSort = field;
      this.sortDescending = true;
    }
    this.loadVehicles(this.pagination.currentPage);
  }

  // ============================================================================
  // SECTION 20: GESTION DE LA PAGINATION
  // ============================================================================

  /**
   * Change de page
   */
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages) {
      this.loadVehicles(page);
    }
  }

  /**
   * Change la taille de la page
   */
  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pagination.pageSize = parseInt(select.value, 10);
    this.pagination.currentPage = 1;
    this.loadVehicles();
  }

  /**
   * Met à jour les pages visibles dans la pagination
   */
  updateVisiblePages(): void {
    const totalPages = this.pagination.totalPages;
    const currentPage = this.pagination.currentPage;
    const visiblePages: number[] = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        visiblePages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        visiblePages.push(1, 2, 3, 4, 5);
      } else if (currentPage >= totalPages - 2) {
        visiblePages.push(
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        visiblePages.push(
          currentPage - 2,
          currentPage - 1,
          currentPage,
          currentPage + 1,
          currentPage + 2
        );
      }
    }

    this.visiblePages = visiblePages;
  }

  // ============================================================================
  // SECTION 21: GETTERS POUR LES FORMULAIRES
  // ============================================================================

  /**
   * Getter pour les contrôles du formulaire d'édition
   */
  get ef() {
    return this.editVehicleForm.controls;
  }

  /**
   * Getter pour les contrôles du formulaire de réservation
   */
  get rf() {
    return this.reservationForm.controls;
  }

  /**
   * Getter pour les contrôles du formulaire d'annulation
   */
  get cf() {
    return this.cancelReservationForm.controls;
  }

  /**
   * Getter pour les contrôles du formulaire de confirmation
   */
  get conf() {
    return this.confirmReservationForm.controls;
  }

  // ============================================================================
  // SECTION 22: MÉTHODES UTILITAIRES D'AFFICHAGE
  // ============================================================================

  /**
   * Obtient la classe CSS pour le badge de type
   */
  getTypeBadgeClass(type: VehicleType): string {
    const vehicleType = this.vehicleTypes.find(t => t.value === type);
    return vehicleType ? `badge-${vehicleType.color}` : 'badge-secondary';
  }

  /**
   * Obtient la classe CSS pour le badge de statut
   */
  getStatusBadgeClass(status: VehicleStatus): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj ? `badge-${statusObj.badge}` : 'badge-secondary';
  }

  /**
   * Obtient le texte du statut
   */
  getStatusText(status: VehicleStatus): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj ? statusObj.label : 'Inconnu';
  }

  /**
   * Obtient l'icône du statut
   */
  getStatusIcon(status: VehicleStatus): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj ? statusObj.icon : 'bx bx-question-mark';
  }

  /**
   * Obtient le texte du type de véhicule
   */
  getTypeText(type: VehicleType): string {
    const vehicleType = this.vehicleTypes.find(t => t.value === type);
    return vehicleType ? vehicleType.label : 'Inconnu';
  }

  /**
   * Obtient le texte du type de carburant
   */
  getFuelTypeText(fuelType: FuelType): string {
    const fuel = this.fuelTypes.find(f => f.value === fuelType);
    return fuel ? fuel.label : 'Inconnu';
  }

  /**
   * Formate une date
   */
  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('fr-FR');
    } catch (error) {
      return 'Date invalide';
    }
  }

  /**
   * Formate une date de réservation
   */
  formatReservationDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Date invalide';
    }
  }

  /**
   * Formate une valeur monétaire
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  }

  /**
   * Obtient le statut de l'assurance d'un véhicule
   */
  getInsuranceStatus(vehicle: VehicleDto): { text: string; class: string } {
    if (!vehicle.insurance) {
      return { text: 'Aucune assurance', class: 'text-danger' };
    }
    if (vehicle.isInsuranceExpired) {
      return { text: 'Expirée', class: 'text-danger' };
    }
    if (vehicle.daysUntilInsuranceExpiry !== undefined && vehicle.daysUntilInsuranceExpiry <= 30) {
      return { text: `${vehicle.daysUntilInsuranceExpiry} jours`, class: 'text-warning' };
    }
    return { text: 'Valide', class: 'text-success' };
  }

  /**
   * Formate les caractéristiques additionnelles
   */
  formatAdditionalFeatures(features: string[] | undefined): string {
    return features ? features.join(', ') : '';
  }

  /**
   * Obtient les caractéristiques formatées d'un véhicule
   */
  getFormattedFeatures(vehicle: VehicleDto): string[] {
    const features = [];

    if (vehicle.features?.hasGps) features.push('GPS');
    if (vehicle.features?.hasAirConditioning) features.push('Climatisation');
    if (vehicle.features?.transmission) features.push(`Transmission: ${vehicle.features.transmission}`);
    if (vehicle.features?.engineCapacity) features.push(`Cylindrée: ${vehicle.features.engineCapacity} cm³`);
    if (vehicle.features?.fuelCapacity) features.push(`Réservoir: ${vehicle.features.fuelCapacity} L`);

    if (vehicle.features?.additionalFeatures?.length) {
      features.push(...vehicle.features.additionalFeatures);
    }

    return features;
  }

  /**
   * Obtient l'icône d'un véhicule selon son type
   */
  getVehicleIcon(type: VehicleType): string {
    switch (type) {
      case VehicleType.Motorcycle: return 'bx bx-cycling';
      case VehicleType.Car: return 'bx bx-car';
      case VehicleType.Tricycle: return 'bx bx-cycling';
      case VehicleType.Scooter: return 'bx bx-cycling';
      case VehicleType.Van: return 'bx bx-bus';
      default: return 'bx bx-car';
    }
  }

  /**
   * Obtient la classe CSS pour la section de statut
   */
  getStatusSectionClass(status: VehicleStatus): string {
    switch (status) {
      case VehicleStatus.Available: return 'bg-success-light';
      case VehicleStatus.Rented: return 'bg-warning-light';
      case VehicleStatus.Maintenance: return 'bg-info-light';
      case VehicleStatus.Reserved: return 'bg-primary-light';
      case VehicleStatus.OutOfService: return 'bg-danger-light';
      default: return 'bg-light';
    }
  }

  /**
   * Obtient la classe CSS pour la carte d'assurance
   */
  getInsuranceCardClass(vehicle: VehicleDto): string {
    if (!vehicle.insurance) return 'bg-danger text-white';
    if (vehicle.isInsuranceExpired) return 'bg-danger text-white';
    if (vehicle.daysUntilInsuranceExpiry !== undefined && vehicle.daysUntilInsuranceExpiry <= 7) {
      return 'bg-warning text-dark';
    }
    return 'bg-success text-white';
  }

  /**
   * Calcule la valeur actuelle d'un véhicule
   */
  calculateCurrentValue(vehicle: VehicleDto): number {
    const age = vehicle.ageInYears;
    const depreciationRate = 0.15;
    const mileageDepreciation = Math.min(vehicle.currentMileage / 200000, 0.5);

    let value = vehicle.purchasePrice;

    for (let i = 0; i < age; i++) {
      value *= (1 - depreciationRate);
    }

    value *= (1 - mileageDepreciation);

    return Math.max(value, vehicle.purchasePrice * 0.1);
  }

  /**
   * Obtient le badge de statut pour une réservation
   */
  getReservationStatusBadge(status: string): string {
    switch (status) {
      case 'Active': return 'badge-primary';
      case 'Confirmed': return 'badge-success';
      case 'Expired': return 'badge-warning';
      case 'Cancelled': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  /**
   * Obtient le texte du statut d'une réservation
   */
  getReservationStatusText(status: string): string {
    switch (status) {
      case 'Active': return 'Active';
      case 'Confirmed': return 'Confirmée';
      case 'Expired': return 'Expirée';
      case 'Cancelled': return 'Annulée';
      default: return 'Inconnu';
    }
  }

  // ============================================================================
  // SECTION 23: EXPORT ET AUTRES ACTIONS
  // ============================================================================

  /**
   * Exporte les données en Excel
   */
  exportToExcel(): void {
    this.vehiclesService.downloadCsvExport(this.searchCriteria);
    this.notificationService.success(
      'Export en cours',
      'Le téléchargement va démarrer...'
    );
  }

  /**
   * Charge les réservations d'un véhicule spécifique
   */
  loadVehicleReservations(vehicleId: string): void {
    this.vehiclesService.getVehicleReservations(vehicleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            console.log('Réservations du véhicule:', response.data);
          }
        },
        error: (error) => {
          console.error('Erreur chargement des réservations:', error);
        }
      });
  }
}
