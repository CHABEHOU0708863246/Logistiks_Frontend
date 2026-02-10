import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../../environments/environment.development';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import { VehicleStatus, VehicleType, FuelType, TierStatus, ContractStatus } from '../../../../../core/models/Enums/Logistiks-enums';
import { UpdateVehicleRequest, VehicleDto, VehicleSearchCriteria, VehicleStatistics } from '../../../../../core/models/Vehicles/Vehicle.dtos';
import { Auth } from '../../../../../core/services/Auth/auth';
import { Token } from '../../../../../core/services/Token/token';
import { Vehicles } from '../../../../../core/services/Vehicles/vehicles';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Tier } from '../../../../../core/models/Tiers/Tiers';
import { Tiers } from '../../../../../core/services/Tiers/tiers';
import { NotificationComponent } from "../../../../../core/components/notification-component/notification-component";
import { ContractBasic, RentalContract } from '../../../../../core/models/Contracts/Rental-contract.model';
import { Contract } from '../../../../../core/services/Contract/contract';
import { ContractDto } from '../../../../../core/models/Contracts/ContractDto';
import { ConfirmDialog } from '../../../../../core/components/confirm-dialog/confirm-dialog';

/**
 * Réponse paginée du serveur pour les contrats
 */
export interface ContractPaginatedResponse {
  data: ContractDto[];
  success?: boolean;
  errors?: string[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/**
 * Composant de gestion de la liste des véhicules
 * @selector app-vehicules-list
 * @templateUrl ./vehicules-list.html
 * @styleUrls ./vehicules-list.scss
 */
@Component({
  selector: 'app-vehicules-list',
  imports: [CommonModule, FormsModule, RouterModule, ReactiveFormsModule, NotificationComponent, ConfirmDialog],
  templateUrl: './vehicules-list.html',
  styleUrls: ['./vehicules-list.scss'],
})
export class VehiculesList implements OnInit, OnDestroy {

  /** Contrôle l'affichage du dialog de confirmation */
  showConfirmDialog = false;

  showReasonModal = false;
  reasonForm!: FormGroup;
  reasonSubmitted = false;
  reasonLoading = false;
  pendingVehicle: VehicleDto | null = null;
  pendingStatus: VehicleStatus | null = null;

  /** Titre du dialog de confirmation */
  confirmDialogTitle = '';

  /** Message du dialog de confirmation */
  confirmDialogMessage = '';

  /** Détails supplémentaires du dialog de confirmation */
  confirmDialogDetails = '';

  /** Texte du bouton de confirmation */
  confirmDialogConfirmText = 'Confirmer';

  /** Texte du bouton d'annulation */
  confirmDialogCancelText = 'Annuler';

  /** Véhicule concerné par la confirmation */
  pendingConfirmVehicle: VehicleDto | null = null;

  /** Action à exécuter après confirmation */
  pendingConfirmAction: (() => void) | null = null;

  /** Indique si le chargement des tiers pour affectation est en cours */
  isLoadingTiersForAssignment: boolean = false;

  /** Indique si le chargement des contrats pour affectation est en cours */
  isLoadingContractsForAssignment: boolean = false;

  // ============================================================================
  // SECTION 1: AJOUTER CES PROPRIÉTÉS
  // ============================================================================

  /** Contrôle l'affichage du modal d'affectation */
  showAssignRentalModal = false;

  /** Véhicule pour l'affectation en cours */
  assignRentalVehicle: VehicleDto | null = null;

  /** Tiers filtrés pour l'affectation */
  filteredTiersForAssignment: Tier[] = [];

  /** Contrats filtrés pour l'affectation */
  filteredContractsForAssignment: ContractBasic[] = [];

  /** Formulaire d'affectation */
  assignRentalForm!: FormGroup;

  /** Indique si le chargement d'affectation est en cours */
  assignRentalLoading = false;

  /** Indique si le formulaire d'affectation a été soumis */
  assignRentalSubmitted = false;

  // ============================================================================
  // SECTION 1: PROPRIÉTÉS DE GESTION DE L'ÉTAT DE L'INTERFACE
  // ============================================================================

  /** Liste des véhicules affichés */
  vehicles: VehicleDto[] = [];
  /** Liste des tiers disponibles */
  tiersList: Tier[] = [];
  /** Liste filtrée des tiers pour l'autocomplétion */
  filteredTiers: Tier[] = [];
  /** Réservations actives */
  activeReservations: any[] = [];

  /** Liste des contrats disponibles pour la confirmation */
  availableContracts: ContractBasic[] = [];
  /** Contrats filtrés pour la sélection */
  filteredContracts: ContractBasic[] = [];

  /** Contrôle l'affichage du modal d'édition */
  showEditModal = false;
  /** Contrôle l'affichage du modal de détails */
  showDetailsModal = false;
  /** Contrôle l'affichage du modal de Location */
  showReservationModal = false;
  /** Contrôle l'affichage du modal d'annulation de Location */
  showCancelReservationModal = false;
  /** Contrôle l'affichage du modal de confirmation de Location */
  showConfirmReservationModal = false;
  /** Contrôle l'affichage de la barre latérale de filtres */
  sidebarVisible = false;
  /** Contrôle l'affichage du menu utilisateur */
  showUserMenu: boolean = false;
  /** Contrôle l'état de réduction de la sidebar principale */
  isSidebarCollapsed: boolean = false;

  /** Véhicule sélectionné pour les opérations */
  selectedVehicle: VehicleDto | null = null;
  /** Location sélectionnée pour les opérations */
  selectedReservation: any = null;
  /** Véhicule pour la Location en cours */
  reservationVehicle: VehicleDto | null = null;

  // ============================================================================
  // SECTION 2: PROPRIÉTÉS DE DONNÉES
  // ============================================================================

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
  /** Formulaire de Location */
  reservationForm!: FormGroup;
  /** Formulaire d'annulation de Location */
  cancelReservationForm!: FormGroup;
  /** Formulaire de confirmation de Location */
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
  /** Indique si la soumission de Location est en cours */
  reservationLoading = false;
  /** Indique si l'annulation de Location est en cours */
  cancelReservationLoading = false;
  /** Indique si la confirmation de Location est en cours */
  confirmReservationLoading = false;

  // ============================================================================
  // SECTION 7: PROPRIÉTÉS DE VALIDATION ET ERREURS
  // ============================================================================

  /** Indique si le formulaire d'édition a été soumis */
  editSubmitted = false;
  /** Indique si le formulaire de Location a été soumis */
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


  // Catégories de maintenance
  maintenanceCategories = [
    {
      value: 'repair',
      label: 'Réparation mécanique',
      icon: 'bx bx-wrench',
      description: 'Problèmes moteur, freins, transmission'
    },
    {
      value: 'bodywork',
      label: 'Carrosserie',
      icon: 'bx bx-car',
      description: 'Dégâts esthétiques, peinture, tôlerie'
    },
    {
      value: 'electrical',
      label: 'Problème électrique',
      icon: 'bx bx-bolt',
      description: 'Batterie, alternateur, circuits électriques'
    },
    {
      value: 'preventive',
      label: 'Maintenance préventive',
      icon: 'bx bx-calendar-check',
      description: 'Vidange, révision, contrôle technique'
    },
    {
      value: 'tire',
      label: 'Pneus',
      icon: 'bx bx-circle',
      description: 'Changement, équilibrage, géométrie'
    },
    {
      value: 'other',
      label: 'Autre',
      icon: 'bx bx-question-mark',
      description: 'Autre type de maintenance'
    }
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
  TierStatus: any;

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
    private contractService: Contract,
    private tokenService: Token,
    public tiersService: Tiers,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.initializeForms();
    this.initializeReasonForm();
  }

  initializeReasonForm(): void {
    this.reasonForm = this.formBuilder.group({
      reason: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      category: ['other'],
      estimatedReturnDate: [''],
      attachments: [[]]
    });
  }

  // Soumission du formulaire
  submitReason(): void {
    this.reasonSubmitted = true;

    if (this.reasonForm.invalid || !this.pendingVehicle || !this.pendingStatus) {
      this.notificationService.warning(
        'Formulaire incomplet',
        'Veuillez remplir tous les champs obligatoires'
      );
      return;
    }

    this.reasonLoading = true;
    const reasonData = this.reasonForm.value;

    // Construire la raison complète
    let fullReason = reasonData.reason;
    if (reasonData.category && reasonData.category !== 'other') {
      const category = this.maintenanceCategories.find(c => c.value === reasonData.category);
      fullReason = `[${category?.label}] ${reasonData.reason}`;
    }

    // Appeler le service pour changer le statut
    this.vehiclesService.changeVehicleStatus(
      this.pendingVehicle.id,
      this.pendingStatus,
      fullReason
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => this.handleReasonSuccess(response),
        error: (error) => this.handleReasonError(error)
      });
  }

  private handleReasonSuccess(response: any): void {
    this.reasonLoading = false;
    this.showReasonModal = false;

    if (response.success) {
      const message = this.getSuccessMessage();
      this.notificationService.success(
        '✅ Changement effectué',
        message
      );

      // Rafraîchir les données
      this.loadVehicles(this.pagination.currentPage);
      this.loadStatistics();
    }
  }

  private getSuccessMessage(): string {
    switch (this.pendingStatus) {
      case VehicleStatus.Maintenance:
        return `Le véhicule ${this.pendingVehicle?.code} a été mis en maintenance`;
      case VehicleStatus.OutOfService:
        return `Le véhicule ${this.pendingVehicle?.code} a été mis hors service`;
      case VehicleStatus.Available:
        return `Le véhicule ${this.pendingVehicle?.code} est maintenant disponible`;
      default:
        return 'Statut modifié avec succès';
    }
  }

  showWarnings(): boolean {
    return (
      this.pendingVehicle?.status === VehicleStatus.Rented ||
      this.pendingVehicle?.status === VehicleStatus.Reserved ||
      this.pendingVehicle?.isInsuranceExpired ||
      this.pendingStatus === VehicleStatus.OutOfService
    );
  }

  private handleReasonError(error: any): void {
    this.reasonLoading = false;
    this.notificationService.error(
      'Erreur',
      error.message || 'Une erreur est survenue lors du changement de statut'
    );
  }

  // Méthode pour ouvrir le modal
  openReasonModal(vehicle: VehicleDto, newStatus: VehicleStatus): void {
    this.pendingVehicle = vehicle;
    this.pendingStatus = newStatus;
    this.reasonForm.reset({
      category: 'other',
      estimatedReturnDate: ''
    });
    this.reasonSubmitted = false;
    this.showReasonModal = true;
  }

  // Méthode pour fermer le modal
  closeReasonModal(): void {
    this.showReasonModal = false;
    this.reasonForm.reset();
    this.reasonSubmitted = false;
  }

  // Méthodes utilitaires pour le template
  getModalTitle(): string {
    switch (this.pendingStatus) {
      case VehicleStatus.Maintenance:
        return 'Mise en maintenance';
      case VehicleStatus.OutOfService:
        return 'Mise hors service';
      case VehicleStatus.Available:
        return 'Rendre disponible';
      default:
        return 'Changement de statut';
    }
  }

  getModalSubtitle(): string {
    switch (this.pendingStatus) {
      case VehicleStatus.Maintenance:
        return 'Décrivez les travaux à effectuer sur le véhicule';
      case VehicleStatus.OutOfService:
        return 'Justifiez la mise hors service du véhicule';
      case VehicleStatus.Available:
        return 'Indiquez pourquoi le véhicule est de nouveau disponible';
      default:
        return 'Décrivez la raison du changement';
    }
  }

  getReasonLabel(): string {
    switch (this.pendingStatus) {
      case VehicleStatus.Maintenance:
        return 'Description des travaux';
      case VehicleStatus.OutOfService:
        return 'Motif de la mise hors service';
      case VehicleStatus.Available:
        return 'Raison du retour en service';
      default:
        return 'Raison du changement';
    }
  }

  getPlaceholderText(): string {
    switch (this.pendingStatus) {
      case VehicleStatus.Maintenance:
        return 'Ex: Changement des plaquettes de frein avant - Bruits anormaux à l\'avant droit - Prise de rendez-vous chez le garagiste pour le 15/12...';
      case VehicleStatus.OutOfService:
        return 'Ex: Accident grave - Coût de réparation trop élevé - Moteur irréparable - Fin de vie du véhicule...';
      case VehicleStatus.Available:
        return 'Ex: Maintenance terminée - Réparations effectuées - Contrôle technique validé - Nettoyage complet...';
      default:
        return 'Décrivez la raison du changement de statut...';
    }
  }

  getCharacterHint(): string {
    switch (this.pendingStatus) {
      case VehicleStatus.Maintenance:
        return 'Décrivez précisément les travaux à effectuer';
      case VehicleStatus.OutOfService:
        return 'Une justification détaillée est requise pour cette action définitive';
      default:
        return 'Minimum 10 caractères recommandés';
    }
  }

  getSubmitButtonText(): string {
    switch (this.pendingStatus) {
      case VehicleStatus.Maintenance:
        return 'Confirmer la maintenance';
      case VehicleStatus.OutOfService:
        return 'Mettre hors service';
      case VehicleStatus.Available:
        return 'Rendre disponible';
      default:
        return 'Confirmer';
    }
  }

  getSubmitIcon(): string {
    switch (this.pendingStatus) {
      case VehicleStatus.Maintenance:
        return 'bx bx-wrench';
      case VehicleStatus.OutOfService:
        return 'bx bx-block';
      case VehicleStatus.Available:
        return 'bx bx-check-circle';
      default:
        return 'bx bx-check';
    }
  }

  /**
 * Affiche le dialog de confirmation pour changer le statut d'un véhicule
 */
  openConfirmDialog(vehicle: VehicleDto, newStatus: VehicleStatus): void {
    this.pendingConfirmVehicle = vehicle;
    this.pendingStatus = newStatus;

    const currentStatus = this.getStatusText(vehicle.status);
    const newStatusText = this.getStatusText(newStatus);

    // Configuration du dialog selon le statut cible
    if (newStatus === VehicleStatus.Maintenance) {
      this.configureMaintenanceDialog(vehicle, currentStatus, newStatusText);
    } else if (newStatus === VehicleStatus.OutOfService) {
      this.configureOutOfServiceDialog(vehicle, currentStatus, newStatusText);
    } else if (newStatus === VehicleStatus.Available) {
      this.configureAvailableDialog(vehicle, currentStatus, newStatusText);
    }

    this.showConfirmDialog = true;
  }

  /**
   * Configure le dialog pour la maintenance
   */
  private configureMaintenanceDialog(
    vehicle: VehicleDto,
    currentStatus: string,
    newStatusText: string
  ): void {
    this.confirmDialogTitle = 'Mettre en maintenance';
    this.confirmDialogMessage = `Êtes-vous sûr de vouloir mettre le véhicule "${vehicle.code}" en maintenance ?`;

    let details = `Statut actuel: ${currentStatus}\n`;
    details += `Nouveau statut: ${newStatusText}\n`;

    // Ajouter des avertissements spécifiques
    if (vehicle.status === VehicleStatus.Rented) {
      details += '\n⚠️ ATTENTION: Ce véhicule est actuellement loué.\n';
      details += 'La location doit d\'abord être terminée.';
    }

    if (vehicle.isInsuranceExpired) {
      details += '\n⚠️ ATTENTION: L\'assurance de ce véhicule est expirée.';
    }

    this.confirmDialogDetails = details;
    this.confirmDialogConfirmText = 'Mettre en maintenance';
    this.confirmDialogCancelText = 'Annuler';
  }

  /**
   * Configure le dialog pour hors service
   */
  private configureOutOfServiceDialog(
    vehicle: VehicleDto,
    currentStatus: string,
    newStatusText: string
  ): void {
    this.confirmDialogTitle = 'Mettre hors service';
    this.confirmDialogMessage = `Êtes-vous sûr de vouloir mettre le véhicule "${vehicle.code}" hors service ?`;

    let details = `Statut actuel: ${currentStatus}\n`;
    details += `Nouveau statut: ${newStatusText}\n`;
    details += '\n⚠️ Cette action est définitive et nécessite une raison valide.';

    // Ajouter des avertissements spécifiques
    if (vehicle.status === VehicleStatus.Rented) {
      details += '\n⚠️ IMPOSSIBLE: Ce véhicule est actuellement loué.\n';
      details += 'Terminez d\'abord la location.';
    }

    if (vehicle.status === VehicleStatus.Reserved) {
      details += '\n⚠️ IMPOSSIBLE: Ce véhicule est réservé.\n';
      details += 'Annulez d\'abord la réservation.';
    }

    this.confirmDialogDetails = details;
    this.confirmDialogConfirmText = 'Mettre hors service';
    this.confirmDialogCancelText = 'Annuler';
  }

  /**
   * Configure le dialog pour rendre disponible
   */
  private configureAvailableDialog(
    vehicle: VehicleDto,
    currentStatus: string,
    newStatusText: string
  ): void {
    this.confirmDialogTitle = 'Rendre disponible';
    this.confirmDialogMessage = `Êtes-vous sûr de vouloir rendre le véhicule "${vehicle.code}" disponible ?`;

    let details = `Statut actuel: ${currentStatus}\n`;
    details += `Nouveau statut: ${newStatusText}\n`;

    if (vehicle.isInsuranceExpired) {
      details += '\n⚠️ ATTENTION: L\'assurance de ce véhicule est expirée.\n';
      details += 'Le véhicule ne pourra pas être loué sans assurance valide.';
    }

    this.confirmDialogDetails = details;
    this.confirmDialogConfirmText = 'Rendre disponible';
    this.confirmDialogCancelText = 'Annuler';
  }

  /**
   * Gère la confirmation du dialog
   */
  onDialogConfirm(): void {
    this.showConfirmDialog = false;

    if (this.pendingConfirmVehicle && this.pendingStatus) {
      // Demander la raison si nécessaire
      if ([VehicleStatus.Maintenance, VehicleStatus.OutOfService].includes(this.pendingStatus)) {
        this.askReasonAndExecute();
      } else {
        // Pour les autres statuts, exécuter directement
        this.executeChangeStatus(this.pendingConfirmVehicle, this.pendingStatus);
      }
    }

    this.resetDialog();
  }

  /**
   * Demande la raison puis exécute l'action
   */
  private askReasonAndExecute(): void {
    const reason = prompt('Veuillez indiquer la raison de ce changement :', '');

    if (reason === null || reason.trim() === '') {
      this.notificationService.warning(
        'Raison requise',
        'Le changement de statut a été annulé. Une raison est obligatoire.'
      );
      return;
    }

    if (this.pendingConfirmVehicle && this.pendingStatus) {
      this.executeChangeStatus(this.pendingConfirmVehicle, this.pendingStatus, reason);
    }
  }

  /**
   * Exécute le changement de statut
   */
  private executeChangeStatus(vehicle: VehicleDto, newStatus: VehicleStatus, reason?: string): void {
    console.log('🔄 Changement de statut:', {
      vehicleId: vehicle.id,
      vehicleCode: vehicle.code,
      fromStatus: vehicle.status,
      toStatus: newStatus,
      reason: reason
    });

    this.loading = true;

    this.vehiclesService.changeVehicleStatus(vehicle.id, newStatus, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Réponse du serveur:', response);
          this.loading = false;

          // ✅ CORRECTION: Vérification flexible de la réussite
          const isSuccess = this.checkStatusChangeSuccess(response);

          if (isSuccess) {
            const newStatusText = this.getStatusText(newStatus);

            this.notificationService.success(
              '✅ Statut modifié',
              `Le véhicule ${vehicle.code} est maintenant "${newStatusText}"`
            );

            // ✅ RAFRAÎCHISSEMENT AUTOMATIQUE
            this.refreshAfterStatusChange();
          } else {
            this.handleStatusChangeFailure(response);
          }
        },
        error: (error) => {
          console.error('❌ Erreur lors du changement de statut:', error);
          this.loading = false;

          this.notificationService.error(
            'Erreur de modification',
            this.extractErrorMessage(error)
          );
        }
      });
  }

  /**
   * Vérifie si le changement de statut est un succès
   */
  private checkStatusChangeSuccess(response: any): boolean {
    if (!response) return false;

    return (
      // Format HTTP standard
      response.ok === true ||
      response.status === 200 ||
      response.status === 204 ||

      // Format avec propriété success
      response.success === true ||

      // Format dans body
      (response.body && response.body.success === true) ||

      // Format texte
      (typeof response === 'string' && (
        response.toLowerCase().includes('success') ||
        response.toLowerCase().includes('modifié') ||
        response.toLowerCase().includes('changed')
      ))
    );
  }

  /**
   * Gère les échecs de changement de statut
   */
  private handleStatusChangeFailure(response: any): void {
    const errorMessage =
      response.message ||
      response.error?.message ||
      response.body?.message ||
      response.statusText ||
      'Impossible de changer le statut du véhicule';

    this.notificationService.error(
      'Échec de modification',
      errorMessage
    );

    console.warn('⚠️ Détails de l\'échec:', response);
  }

  /**
   * Extrait le message d'erreur
   */
  private extractErrorMessage(error: any): string {
    if (error.error?.message) return error.error.message;
    if (error.message) return error.message;
    if (error.statusText && error.statusText !== 'Unknown Error') return error.statusText;

    // Messages par code HTTP
    switch (error.status) {
      case 400: return 'Requête invalide - Vérifiez les données';
      case 401: return 'Session expirée - Reconnectez-vous';
      case 403: return 'Action non autorisée';
      case 404: return 'Véhicule introuvable';
      case 409: return 'Conflit - Le véhicule ne peut pas changer de statut';
      case 422: return 'Données incorrectes';
      case 500: return 'Erreur serveur';
      default: return 'Une erreur est survenue lors du changement de statut';
    }
  }

  /**
   * Rafraîchit les données après un changement de statut
   */
  private refreshAfterStatusChange(): void {
    console.log('🔄 Rafraîchissement des données...');

    // 1. Rafraîchir la liste des véhicules (garde la même page)
    this.loadVehicles(this.pagination.currentPage);

    // 2. Rafraîchir les statistiques
    setTimeout(() => {
      this.loadStatistics();
    }, 300);

    // 3. Optionnel: Rafraîchir les réservations actives si nécessaire
    setTimeout(() => {
      this.loadActiveReservations();
    }, 500);

    console.log('✅ Rafraîchissement terminé');
  }

  /**
   * Calcule la date de fin estimée en fonction de la date de début et de la durée
   */
  calculateEndDate(): string {
    const startDate = this.reservationForm?.get('expectedStartDate')?.value;
    const durationDays = this.reservationForm?.get('reservationDurationDays')?.value;

    if (!startDate || !durationDays) {
      return '';
    }

    try {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + parseInt(durationDays, 9));

      return end.toISOString().split('T')[0];
    } catch (error) {
      console.error('Erreur lors du calcul de la date de fin:', error);
      return '';
    }
  }

  /**
   * Gère l'annulation du dialog
   */
  onDialogCancel(): void {
    this.showConfirmDialog = false;
    this.resetDialog();

    this.notificationService.info(
      'Action annulée',
      'Le changement de statut a été annulé.'
    );
  }

  /**
   * Réinitialise les données du dialog
   */
  private resetDialog(): void {
    this.pendingConfirmVehicle = null;
    this.pendingConfirmAction = null;
    this.pendingStatus = null;
    this.confirmDialogTitle = '';
    this.confirmDialogMessage = '';
    this.confirmDialogDetails = '';
    this.confirmDialogConfirmText = 'Confirmer';
    this.confirmDialogCancelText = 'Annuler';
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
      contractId: ['', [Validators.required, Validators.pattern(/^[0-9a-fA-F]{24}$/)]],
      additionalNotes: ['']
    });

    // Formulaire d'affectation
    this.assignRentalForm = this.formBuilder.group({
      vehicleId: ['', Validators.required],
      customerId: ['', [Validators.required, Validators.pattern(/^[0-9a-fA-F]{24}$/)]],
      contractId: ['', [Validators.required, Validators.pattern(/^[0-9a-fA-F]{24}$/)]],
      startDate: ['', Validators.required],
      startMileage: ['', [Validators.required, Validators.min(0)]],
      notes: ['']
    });

  }

  /**
 * Ouvre le modal d'affectation pour un véhicule
 */
  openAssignRentalModal(vehicle: VehicleDto): void {
    console.log('🚀 Ouverture du modal d\'affectation pour:', vehicle.code);

    this.assignRentalVehicle = vehicle;
    this.showAssignRentalModal = true;
    this.assignRentalSubmitted = false;

    // Initialiser le formulaire
    this.assignRentalForm.patchValue({
      vehicleId: vehicle.id,
      customerId: '',
      contractId: '',
      startDate: new Date().toISOString().slice(0, 16),
      startMileage: vehicle.currentMileage,
      notes: ''
    });

    // Charger les données
    this.loadTiersForAssignment();
    this.loadContractsForAssignment();
  }

  /**
   * Convertit un DTO de contrat en ContractBasic pour l'affectation
   */
  private convertDtoToContractBasic(dto: ContractDto): ContractBasic {
    return {
      id: dto.id,
      contractNumber: dto.contractNumber,
      contractType: dto.contractType,
      customerId: dto.customerId,
      vehicleId: dto.vehicleId,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      durationInWeeks: dto.durationInWeeks,
      weeklyAmount: dto.weeklyAmount,
      totalAmount: dto.totalAmount,
      securityDeposit: dto.securityDeposit,
      depositPaid: dto.depositPaid,
      paymentFrequency: dto.paymentFrequency,
      paymentDay: dto.paymentDay,
      status: dto.status,
      terms: dto.terms,
      weeklyMileageLimit: dto.weeklyMileageLimit,
      deliveryInfo: dto.deliveryInfo,
      returnInfo: dto.returnInfo,
      documents: undefined,

      notes: dto.notes,
      createdAt: new Date(dto.createdAt),
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : undefined,
      createdBy: dto.createdBy,
      approvedBy: dto.approvedBy,
      approvedAt: dto.approvedAt ? new Date(dto.approvedAt) : undefined,

      // Champs calculés
      isActive: this.isContractActive(dto),
      isExpired: this.isContractExpired(dto),
      weeksRemaining: this.calculateWeeksRemaining(dto),
    };
  }

  /**
   * Vérifie si un contrat est actif
   */
  private isContractActive(dto: ContractDto): boolean {
    const now = new Date();
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    return dto.status === ContractStatus.Active &&
      now >= startDate &&
      now <= endDate;
  }

  /**
   * Vérifie si un contrat est expiré
   */
  private isContractExpired(dto: ContractDto): boolean {
    const now = new Date();
    const endDate = new Date(dto.endDate);

    return dto.status === ContractStatus.Suspended ||
      (dto.status === ContractStatus.Active && now > endDate);
  }

  /**
   * Calcule le nombre de semaines restantes
   */
  private calculateWeeksRemaining(dto: ContractDto): number {
    const now = new Date();
    const endDate = new Date(dto.endDate);

    if (now > endDate) return 0;

    const diffInMs = endDate.getTime() - now.getTime();
    const diffInWeeks = Math.ceil(diffInMs / (1000 * 60 * 60 * 24 * 7));

    return diffInWeeks;
  }

  /**
 * Rafraîchit la liste des contrats
 */
  refreshContracts(): void {
    console.log('🔄 Rafraîchissement manuel des contrats...');

    if (this.showAssignRentalModal) {
      this.loadContractsForAssignment();

      this.notificationService.info(
        'Actualisation',
        'Rechargement des contrats disponibles...'
      );
    }
  }

  /**
   * Charge les contrats pour l'affectation
   */
  loadContractsForAssignment(): void {
    this.isLoadingContractsForAssignment = true;  // <-- Démarrer le loading

    console.log('🔄 Chargement des contrats pour affectation...');

    // Critères de recherche pour les contrats disponibles
    const searchCriteria = {
      page: 1,
      pageSize: 100,
      sortBy: 'createdAt',
      sortDescending: true,
      // On charge les contrats actifs OU en attente
      // Le filtrage se fera côté client
    };

    this.contractService.searchContracts(searchCriteria)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ContractPaginatedResponse) => {
          this.isLoadingContractsForAssignment = false;  // <-- Arrêter le loading

          console.log('📡 Réponse API contrats:', response);

          if (response && response.data && Array.isArray(response.data)) {
            // Convertir les DTOs en ContractBasic
            const allContracts = response.data.map(dto =>
              this.convertDtoToContractBasic(dto)
            );

            console.log(`📦 ${allContracts.length} contrats récupérés du serveur`);

            // Filtrer les contrats disponibles pour affectation
            this.availableContracts = this.filterContractsForVehicleAssignment(allContracts);
            this.filteredContractsForAssignment = [...this.availableContracts];

            console.log(`✅ ${this.filteredContractsForAssignment.length} contrats disponibles pour affectation`);

            // Notification si aucun contrat disponible
            if (this.filteredContractsForAssignment.length === 0) {
              this.notificationService.info(
                'Aucun contrat disponible',
                'Tous les contrats actifs sont déjà affectés ou ne répondent pas aux critères'
              );
            }
          } else {
            console.warn('⚠️ Réponse invalide du serveur:', response);
            this.availableContracts = [];
            this.filteredContractsForAssignment = [];

            this.notificationService.warning(
              'Données incomplètes',
              'Les contrats n\'ont pas pu être chargés correctement'
            );
          }
        },
        error: (error: any) => {
          this.isLoadingContractsForAssignment = false;

          console.error('❌ Erreur lors du chargement des contrats:', error);
          console.error('Détails de l\'erreur:', {
            status: error.status,
            message: error.message,
            error: error.error
          });

          this.availableContracts = [];
          this.filteredContractsForAssignment = [];

          // Message d'erreur détaillé
          let errorMessage = 'Impossible de charger les contrats disponibles';

          if (error.status === 404) {
            errorMessage = 'Le service de contrats n\'est pas disponible';
          } else if (error.status === 401) {
            errorMessage = 'Votre session a expiré';
          } else if (error.status === 500) {
            errorMessage = 'Erreur serveur lors du chargement des contrats';
          } else if (error.message) {
            errorMessage = error.message;
          }

          this.notificationService.error(
            'Erreur de chargement',
            errorMessage
          );
        }
      });
  }

  /**
 * Filtre les contrats pour l'affectation d'un véhicule
 * RÈGLES MÉTIER:
 * - Contrat actif OU en attente
 * - PAS de véhicule déjà affecté
 * - Dépôt payé (si requis)
 * - Date de début <= aujourd'hui
 * - Date de fin >= aujourd'hui
 */
  private filterContractsForVehicleAssignment(contracts: RentalContract[]): RentalContract[] {
    if (!this.assignRentalVehicle) {
      console.warn('⚠️ Aucun véhicule sélectionné pour le filtrage');
      return contracts;
    }

    console.log(`🔍 Filtrage de ${contracts.length} contrats...`);

    const filtered = contracts.filter(contract => {
      // Debug pour chaque contrat
      const debugInfo = {
        contractNumber: contract.contractNumber,
        vehicleId: contract.vehicleId,
        status: contract.status,
        depositPaid: contract.depositPaid,
        startDate: contract.startDate,
        endDate: contract.endDate
      };

      // 1. Vérifier si le contrat a déjà un véhicule
      if (contract.vehicleId && contract.vehicleId !== '' && contract.vehicleId !== null) {
        console.log(`❌ Contrat ${contract.contractNumber} déjà affecté au véhicule ${contract.vehicleId}`);
        return false;
      }

      // 2. Vérifier le statut du contrat
      const validStatuses = [ContractStatus.Active, ContractStatus.Pending];
      if (!validStatuses.includes(contract.status)) {
        console.log(`❌ Contrat ${contract.contractNumber} a un statut invalide: ${contract.status}`);
        return false;
      }

      // 3. Vérifier si le dépôt est payé (si la vérification est activée)
      if (contract.securityDeposit && contract.securityDeposit > 0) {
        if (contract.depositPaid === false) {
          console.log(`❌ Contrat ${contract.contractNumber} - Dépôt non payé`);
          return false;
        }
      }

      // 4. Vérifier les dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (contract.startDate) {
        const startDate = new Date(contract.startDate);
        startDate.setHours(0, 0, 0, 0);

        // Le contrat ne doit pas commencer dans le futur (marge de 7 jours)
        const maxFutureDate = new Date(today);
        maxFutureDate.setDate(maxFutureDate.getDate() + 7);

        if (startDate > maxFutureDate) {
          console.log(`❌ Contrat ${contract.contractNumber} commence trop dans le futur: ${startDate}`);
          return false;
        }
      }

      if (contract.endDate) {
        const endDate = new Date(contract.endDate);
        endDate.setHours(0, 0, 0, 0);

        if (endDate < today) {
          console.log(`❌ Contrat ${contract.contractNumber} expiré: ${endDate}`);
          return false;
        }
      }

      console.log(`✅ Contrat ${contract.contractNumber} valide pour affectation`);
      return true;
    });

    console.log(`✅ ${filtered.length} contrats passent les filtres`);
    return filtered;
  }

  /**
   * Filtre les tiers pour l'affectation
   */
  filterTiersForAssignment(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === '') {
      this.filteredTiersForAssignment = this.tiersList;
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredTiersForAssignment = this.tiersList.filter(tier =>
      this.tiersService.getFullName(tier).toLowerCase().includes(term) ||
      tier.phone?.toLowerCase().includes(term) ||
      tier.tierNumber?.toLowerCase().includes(term)
    );
  }

  /**
   * Filtre les contrats pour l'affectation
   */
  filterContractsForAssignment(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === '') {
      this.filteredContractsForAssignment = this.availableContracts;
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredContractsForAssignment = this.availableContracts.filter(contract =>
      contract.contractNumber.toLowerCase().includes(term)
    );
  }

  /**
   * Sélectionne un tier pour l'affectation
   */
  selectTierForAssignment(tier: Tier): void {
    this.assignRentalForm.patchValue({
      customerId: tier.id
    });
  }

  /**
   * Sélectionne un contrat pour l'affectation
   */
  selectContractForAssignment(contract: RentalContract): void {
    this.assignRentalForm.patchValue({
      contractId: contract.id
    });
  }

  /**
   * Récupère le tier sélectionné pour l'affectation
   */
  getSelectedTierForAssignment(): Tier | undefined {
    const customerId = this.assignRentalForm.get('customerId')?.value;
    if (!customerId) return undefined;
    return this.tiersList.find(t => t.id === customerId);
  }

  /**
   * Récupère le contrat sélectionné pour l'affectation
   */
  getSelectedContractForAssignment(): RentalContract | undefined {
    const contractId = this.assignRentalForm.get('contractId')?.value;
    if (!contractId) return undefined;
    return this.availableContracts.find(c => c.id === contractId);
  }

  /**
   * Soumet l'affectation
   */
  onAssignRentalSubmit(): void {
    this.assignRentalSubmitted = true;

    if (this.assignRentalForm.invalid || !this.assignRentalVehicle) {
      this.notificationService.warning(
        'Formulaire invalide',
        'Veuillez remplir tous les champs obligatoires'
      );
      return;
    }

    this.assignRentalLoading = true;
    const request = this.prepareAssignRequest();

    this.vehiclesService.assignVehicle(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => this.handleAssignSuccess(response),
        error: (error) => this.handleAssignError(error)
      });
  }

  /**
   * Prépare la requête d'affectation
   */
  private prepareAssignRequest(): any {
    const formValue = this.assignRentalForm.getRawValue();
    return {
      vehicleId: formValue.vehicleId,
      customerId: formValue.customerId,
      contractId: formValue.contractId,
      startDate: new Date(formValue.startDate).toISOString(),
      startMileage: parseInt(formValue.startMileage, 10),
      notes: formValue.notes || undefined
    };
  }

  /**
   * Gère le succès de l'affectation
   */
  private handleAssignSuccess(response: any): void {
    this.assignRentalLoading = false;

    if (response.success) {
      this.notificationService.success(
        'Véhicule affecté ✅',
        `Le véhicule ${this.assignRentalVehicle?.code} a été affecté avec succès`
      );

      // Fermer le modal
      this.showAssignRentalModal = false;
      this.assignRentalForm.reset();

      // Rafraîchir les données
      this.loadVehicles(this.pagination.currentPage);
      this.loadActiveReservations();
    } else {
      this.notificationService.error(
        'Erreur d\'affectation ❌',
        response.message || 'Impossible d\'affecter le véhicule'
      );
    }
  }

  /**
   * Gère les erreurs d'affectation
   */
  private handleAssignError(error: any): void {
    this.assignRentalLoading = false;
    this.notificationService.error(
      'Erreur',
      error.message || 'Une erreur est survenue lors de l\'affectation'
    );
  }

  /**
   * Getter pour les contrôles du formulaire d'affectation
   */
  get arf() {
    return this.assignRentalForm.controls;
  }

  /**
 * Charge les tiers pour l'affectation (uniquement les actifs)
 */
  loadTiersForAssignment(): void {
    this.isLoadingTiersForAssignment = true;

    this.tiersService.getTiersList({
      status: TierStatus.Active,
      pageSize: 100
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoadingTiersForAssignment = false;  // <-- Arrêter le loading

          if (response.data) {
            // Stocker tous les tiers
            this.tiersList = response.data;

            // Filtrer pour l'affectation (actifs et en validation)
            this.filteredTiersForAssignment = response.data.filter(tier =>
              tier.status === TierStatus.Active ||
              tier.status === TierStatus.PendingValidation
            );

            console.log(`✅ ${this.filteredTiersForAssignment.length} clients chargés pour affectation`);
          } else {
            console.warn('Aucun tier dans la réponse:', response);
            this.filteredTiersForAssignment = [];
          }
        },
        error: (error) => {
          this.isLoadingTiersForAssignment = false;  // <-- Arrêter le loading même en cas d'erreur
          console.error('❌ Erreur lors du chargement des tiers:', error);

          this.notificationService.error(
            'Erreur de chargement',
            'Impossible de charger les clients disponibles'
          );

          this.filteredTiersForAssignment = [];
        }
      });
  }


  /**
   * Obtient le texte du statut d'un tier
   */
  getTierStatusText(status: TierStatus): string {
    switch (status) {
      case TierStatus.PendingValidation: return 'En validation';
      case TierStatus.Active: return 'Actif';
      case TierStatus.Blocked: return 'Bloqué';
      case TierStatus.Suspended: return 'Suspendu';
      case TierStatus.Inactive: return 'Inactif';
      case TierStatus.Blacklisted: return 'Liste noire';
      case TierStatus.None: return 'Aucun';
      default: return 'Inconnu';
    }
  }

  /**
   * Obtient la classe CSS pour le badge de statut Tier
   */
  getTierStatusBadge(status: TierStatus): string {
    switch (status) {
      case TierStatus.Active: return 'badge-success';
      case TierStatus.PendingValidation: return 'badge-warning';
      case TierStatus.Suspended:
      case TierStatus.Blocked:
        return 'badge-danger';
      case TierStatus.Inactive: return 'badge-secondary';
      case TierStatus.Blacklisted: return 'badge-dark';
      default: return 'badge-light';
    }
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
   * Charge la liste des contrats disponibles pour confirmation
   */
  loadAvailableContracts(): void {
    // Options de recherche pour les contrats
    const searchCriteria = {
      page: 1,
      pageSize: 50,
      sortBy: 'createdAt',
      sortDescending: true,
      status: ContractStatus.Draft,
    };

    this.contractService.searchContracts(searchCriteria)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.availableContracts = response.data;
            this.filteredContracts = [...this.availableContracts];

            console.log(`${this.availableContracts.length} contrats chargés pour confirmation`);
          } else {
            console.warn('Aucun contrat disponible:', response.data);
            this.availableContracts = [];
            this.filteredContracts = [];
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement des contrats:', error);
          this.notificationService.error(
            'Erreur de chargement',
            'Impossible de charger les contrats disponibles'
          );
          // Fallback sur une liste vide
          this.availableContracts = [];
          this.filteredContracts = [];
        }
      });
  }

  /**
   * Filtre les contrats selon le terme de recherche
   */
  filterContracts(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === '') {
      this.filteredContracts = this.availableContracts;
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredContracts = this.availableContracts.filter(contract =>
      contract.contractNumber.toLowerCase().includes(term) ||
      contract.id.toLowerCase().includes(term) ||
      // Ajouter la recherche par nom client si disponible
      (contract.customerName && contract.customerName.toLowerCase().includes(term))
    );
  }

  // ============================================================================
  // SECTION 24: MÉTHODES POUR LA GESTION DES RÉSERVATIONS
  // ============================================================================

  /**
   * Ouvre le modal de confirmation de réservation
   */
  openConfirmReservationModal(reservation: any): void {
    this.selectedReservation = reservation;
    this.confirmReservationForm.reset();
    this.confirmReservationSubmitted = false;
    this.showConfirmReservationModal = true;

    // Charger les contrats disponibles
    this.loadAvailableContracts();

    // Pré-remplir avec le contrat si déjà lié
    if (reservation.contractId) {
      this.confirmReservationForm.patchValue({
        contractId: reservation.contractId
      });
    }
  }

  /**
   * Sélectionne un contrat
   */
  selectContract(contract: RentalContract): void {
    this.confirmReservationForm.patchValue({
      contractId: contract.id
    });

    // Scroller vers l'élément sélectionné
    setTimeout(() => {
      const selectedElement = document.querySelector('.contract-item.bg-light');
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  /**
   * Récupère le contrat sélectionné
   */
  getSelectedContract(): RentalContract | undefined {
    const contractId = this.confirmReservationForm.get('contractId')?.value;
    if (!contractId) return undefined;

    return this.availableContracts.find(c => c.id === contractId);
  }

  /**
   * Calcule le nombre de jours restants avant expiration
   */
  getDaysRemaining(expiryDate: Date | string | undefined): number {
    if (!expiryDate) return 0;

    try {
      const expiry = new Date(expiryDate);
      const today = new Date();
      const diffTime = expiry.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (error) {
      return 0;
    }
  }

  /**
   * Obtient l'icône du type de véhicule
   */
  getVehicleTypeIcon(vehicleType?: string): string {
    if (!vehicleType) return 'bx bx-car';

    switch (vehicleType.toLowerCase()) {
      case 'moto': return 'bx bx-cycling';
      case 'voiture': return 'bx bx-car';
      case 'tricycle': return 'bx bx-cycling';
      case 'scooter': return 'bx bx-cycling';
      case 'van': return 'bx bx-bus';
      default: return 'bx bx-car';
    }
  }

  /**
   * Obtient la classe CSS pour le badge de statut de contrat
   */
  getContractStatusBadge(status: number): string {
    switch (status) {
      case 1: return 'badge-info'; // Draft
      case 2: return 'badge-warning'; // Pending
      case 3: return 'badge-success'; // Active
      case 4: return 'badge-secondary'; // Suspended
      case 5: return 'badge-danger'; // Terminated
      case 6: return 'badge-primary'; // Completed
      default: return 'badge-secondary';
    }
  }

  /**
   * Obtient le texte du statut du contrat
   */
  getContractStatusText(status: number): string {
    switch (status) {
      case 1: return 'Brouillon';
      case 2: return 'En attente';
      case 3: return 'Actif';
      case 4: return 'Suspendu';
      case 5: return 'Résilié';
      case 6: return 'Terminé';
      default: return 'Inconnu';
    }
  }

  /**
   * Affiche les détails d'une réservation
   */
  showReservationDetails(reservation: any): void {
    console.log('Détails de la réservation:', reservation);

    // Vous pouvez créer un modal de détails ici
    this.notificationService.info(
      'Détails de la réservation',
      `Véhicule: ${reservation.vehicleName || 'N/A'}<br>
     Client: ${reservation.customerName || 'N/A'}<br>
     Date début: ${this.formatReservationDate(reservation.expectedStartDate)}<br>
     Date fin: ${this.formatReservationDate(reservation.expiryDate)}<br>
     Statut: ${this.getReservationStatusText(reservation.status)}`
    );
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
 * Charge les réservations actives avec enrichissement des données
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
   * Gère la réponse des réservations avec enrichissement des données
   */
  private handleReservationsResponse(response: any): void {
    this.reservationsLoading = false;

    if (response.success && response.data) {
      this.activeReservations = response.data;

      // Charger les véhicules et clients AVANT d'enrichir
      this.loadDataForReservations();
    }
  }

  /**
   * Charge les données nécessaires pour enrichir les réservations
   */
  private loadDataForReservations(): void {
    // 1. Charger les véhicules si nécessaire
    if (this.vehicles.length === 0) {
      this.vehiclesService.searchVehicles({
        page: 1, pageSize: 100,
        sortDescending: false
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.vehicles = response.data;
              this.enrichReservationsData();
            }
          },
          error: (error) => {
            console.error('Erreur chargement véhicules:', error);
            this.enrichReservationsData(); // Essayer quand même avec les données disponibles
          }
        });
    } else {
      // 2. Charger les clients si nécessaire
      if (this.tiersList.length === 0) {
        this.tiersService.getTiersList({
          pageNumber: 1,
          pageSize: 100
        }).subscribe({
          next: (response) => {
            if (response.data) {
              this.tiersList = response.data;
              this.enrichReservationsData();
            }
          },
          error: (error) => {
            console.error('Erreur chargement clients:', error);
            this.enrichReservationsData();
          }
        });
      } else {
        this.enrichReservationsData();
      }
    }
  }

  /**
   * Enrichit les réservations avec les données des véhicules et clients
   */
  private enrichReservationsData(): void {
    this.activeReservations.forEach(reservation => {
      // Récupérer le véhicule correspondant
      const vehicle = this.vehicles.find(v => v.id === reservation.vehicleId);
      if (vehicle) {
        reservation.vehicleCode = vehicle.code;
        reservation.vehicleName = `${vehicle.brand} ${vehicle.model} (${vehicle.plateNumber})`;
        reservation.vehicleType = this.getTypeText(vehicle.type);
      } else {
        reservation.vehicleCode = 'N/A';
        reservation.vehicleName = `Véhicule ${reservation.vehicleId?.substring(0, 8) || 'inconnu'}`;

        // Essayer de charger ce véhicule spécifique
        this.loadReservationVehicle(reservation);
      }

      // Récupérer le client correspondant
      const client = this.tiersList.find(t => t.id === reservation.customerId);
      if (client) {
        reservation.customerName = this.tiersService.getFullName(client);
        reservation.customerPhone = client.phone;
        reservation.customerTierNumber = client.tierNumber;
      } else {
        reservation.customerName = 'Client non chargé';
        reservation.customerPhone = null;

        // Charger le client spécifique
        this.loadReservationClient(reservation);
      }
    });
  }

  /**
   * Charge les données d'un véhicule spécifique pour une réservation
   */
  private loadReservationVehicle(reservation: any): void {
    this.vehiclesService.getVehicleById(reservation.vehicleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const vehicle = response.data;

            // Mettre à jour la réservation
            const reservationIndex = this.activeReservations.findIndex(r => r.id === reservation.id);
            if (reservationIndex !== -1) {
              this.activeReservations[reservationIndex].vehicleCode = vehicle.code;
              this.activeReservations[reservationIndex].vehicleName = `${vehicle.brand} ${vehicle.model} (${vehicle.plateNumber})`;
              this.activeReservations[reservationIndex].vehicleType = this.getTypeText(vehicle.type);

              // Forcer la détection des changements
              this.activeReservations = [...this.activeReservations];
            }
          }
        },
        error: (error) => {
          console.warn('Impossible de charger le véhicule:', error);
        }
      });
  }

  /**
 * Charge les données d'un client spécifique pour une réservation
 */
  private loadReservationClient(reservation: any): void {
    this.tiersService.getTierById(reservation.customerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const client = response.data;

            // Mettre à jour la réservation
            const reservationIndex = this.activeReservations.findIndex(r => r.id === reservation.id);
            if (reservationIndex !== -1) {
              this.activeReservations[reservationIndex].customerName = this.tiersService.getFullName(client);
              this.activeReservations[reservationIndex].customerPhone = client.phone;
              this.activeReservations[reservationIndex].customerTierNumber = client.tierNumber;

              // Forcer la détection des changements
              this.activeReservations = [...this.activeReservations];
            }
          }
        },
        error: (error) => {
          console.warn('Impossible de charger le client:', error);
        }
      });
  }

  /**
   * Gère les erreurs de chargement des réservations
   */
  private handleReservationsError(error: any): void {
    this.reservationsLoading = false;
    console.error('Erreur chargement des réservations:', error);
  }

  /**
   * Ouvre le modal de Location pour un véhicule
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

    // DEBUG: Afficher la structure complète de la réponse
    console.log('📡 Réponse complète de la réservation:', response);
    console.log('📡 Status:', response.status);
    console.log('📡 StatusText:', response.statusText);
    console.log('📡 Body:', response.body);
    console.log('📡 Success property:', response.success);
    console.log('📡 StatusCode property:', response.statusCode);

    // Vérifier différentes structures de réponse possibles
    const isSuccess =
      response.status === 200 ||
      response.status === 201 ||
      response.success === true ||
      response.ok === true ||
      (response.body && response.body.success === true) ||
      (typeof response === 'string' && response.includes('success'));

    if (isSuccess) {
      this.notificationService.success(
        'Location effectuée ✅',
        'Le véhicule a été louer avec succès'
      );

      this.closeReservationModal();
      this.loadVehicles(this.pagination.currentPage);
      this.loadActiveReservations();

      // Optionnel: Rediriger ou afficher un message supplémentaire
      setTimeout(() => {
        this.notificationService.info(
          'Location confirmée',
          'Vous pouvez consulter la Location dans le menu "Location actives"'
        );
      }, 1000);
    } else {
      // Extraire le message d'erreur de différentes propriétés possibles
      const errorMessage =
        response.message ||
        response.error?.message ||
        response.body?.message ||
        response.statusText ||
        'Impossible de réserver le véhicule';

      this.notificationService.error(
        'Erreur de Location ❌',
        errorMessage
      );

      // Optionnel: Afficher plus de détails dans la console
      console.error('❌ Détails de l\'erreur:', response);
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
 * Gère le succès de l'annulation de réservation
 */
  private handleCancelReservationSuccess(response: any): void {
    this.cancelReservationLoading = false;

    // Debug log
    console.log('📡 Réponse annulation réservation:', response);

    try {
      // Vérification flexible du succès
      const isSuccess = this.checkCancellationSuccess(response);

      if (isSuccess) {
        const successMessage = this.extractCancellationSuccessMessage(response);

        this.notificationService.success(
          '✅ Location annulée',
          successMessage
        );

        // Actions de succès
        this.closeCancellationModal();
        this.refreshRelevantData();

        // Message informatif supplémentaire
        this.showCancellationFeedback();

      } else {
        this.handleCancellationFailure(response);
      }
    } catch (error) {
      console.error('❌ Erreur lors du traitement de l\'annulation:', error);
      this.notificationService.error(
        'Erreur de traitement',
        'Une erreur est survenue lors du traitement de l\'annulation'
      );
    }
  }

  /**
   * Vérifie si l'annulation est un succès
   */
  private checkCancellationSuccess(response: any): boolean {
    if (!response) return false;

    // Multiples formats de succès supportés
    return (
      // Format HTTP standard
      (response.status && (response.status === 200 || response.status === 204)) ||
      // Format avec propriété success
      response.success === true ||
      // Format avec propriété cancelled
      response.cancelled === true ||
      // Format dans data/body
      (response.data && response.data.success === true) ||
      (response.body && response.body.cancelled === true) ||
      // Format texte
      (typeof response === 'string' && (
        response.toLowerCase().includes('cancelled') ||
        response.toLowerCase().includes('annulé') ||
        response.toLowerCase().includes('success')
      ))
    );
  }

  /**
   * Extrait le message de succès d'annulation
   */
  private extractCancellationSuccessMessage(response: any): string {
    // Priorités pour extraire le message
    if (response.message) return response.message;
    if (response.data?.message) return response.data.message;
    if (response.body?.message) return response.body.message;
    if (response.statusText && response.statusText !== 'OK') return response.statusText;

    // Message par défaut avec emoji approprié
    return 'La Location a été annulée avec succès ✨';
  }

  /**
   * Ferme le modal d'annulation
   */
  private closeCancellationModal(): void {
    this.showCancelReservationModal = false;
    this.selectedReservation = null;
    this.cancelReservationForm.reset();
    this.cancelReservationSubmitted = false;
  }

  /**
   * Rafraîchit les données pertinentes
   */
  private refreshRelevantData(): void {
    // Rafraîchir la liste des véhicules
    this.loadVehicles(this.pagination.currentPage);

    // Rafraîchir les réservations actives
    this.loadActiveReservations();

    // Optionnel: Rafraîchir les statistiques
    setTimeout(() => {
      this.loadStatistics();
    }, 500);
  }

  /**
   * Affiche un feedback supplémentaire
   */
  private showCancellationFeedback(): void {
    setTimeout(() => {
      if (this.selectedReservation?.customerName) {
        this.notificationService.info(
          'Client notifié',
          `Le client ${this.selectedReservation.customerName} a été notifié de l'annulation`
        );
      }
    }, 1000);
  }

  /**
   * Gère les échecs d'annulation
   */
  private handleCancellationFailure(response: any): void {
    let errorTitle = 'Erreur d\'annulation';
    let errorMessage = 'Impossible d\'annuler la réservation';

    // Extraction du message d'erreur
    if (response.message) {
      errorMessage = response.message;
    } else if (response.error?.message) {
      errorMessage = response.error.message;
    } else if (response.body?.message) {
      errorMessage = response.body.message;
    } else if (response.status) {
      // Messages basés sur le code HTTP
      switch (response.status) {
        case 400:
          errorTitle = 'Requête invalide';
          errorMessage = 'La requête d\'annulation est incorrecte';
          break;
        case 401:
          errorTitle = 'Non autorisé';
          errorMessage = 'Votre session a expiré';
          break;
        case 403:
          errorTitle = 'Interdit';
          errorMessage = 'Vous n\'avez pas les permissions pour annuler cette réservation';
          break;
        case 404:
          errorTitle = 'Non trouvé';
          errorMessage = 'La Location à annuler n\'existe pas';
          break;
        case 409:
          errorTitle = 'Conflit';
          errorMessage = 'Cette Location ne peut pas être annulée (déjà confirmée ou expirée)';
          break;
        case 410:
          errorTitle = 'Déjà annulée';
          errorMessage = 'Cette Location a déjà été annulée';
          break;
        case 422:
          errorTitle = 'Données manquantes';
          errorMessage = 'Le motif d\'annulation est requis';
          break;
        case 423:
          errorTitle = 'Verrouillé';
          errorMessage = 'La Location est verrouillée et ne peut pas être annulée';
          break;
        case 500:
          errorTitle = 'Erreur serveur';
          errorMessage = 'Le serveur rencontre des difficultés techniques';
          break;
      }
    }

    this.notificationService.error(errorTitle, errorMessage);

    // Conserver le formulaire ouvert pour correction
    this.cancelReservationSubmitted = false;

    // Proposition de solution
    if (response.status === 409 || response.status === 423) {
      setTimeout(() => {
        this.notificationService.warning(
          'Alternative',
          'Contactez le support pour obtenir de l\'aide sur cette réservation'
        );
      }, 1500);
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
 * Gère le succès de la confirmation de réservation
 */
  private handleConfirmReservationSuccess(response: any): void {
    this.confirmReservationLoading = false;

    // Log pour débogage
    console.log('📡 Réponse confirmation réservation:', response);

    try {
      // Vérifier différents formats de succès
      const isSuccess = this.checkConfirmationSuccess(response);

      if (isSuccess) {
        const successMessage = this.extractConfirmationSuccessMessage(response);

        this.notificationService.success(
          '✅ Location confirmée',
          successMessage
        );

        // Fermer le modal
        this.showConfirmReservationModal = false;

        // Rafraîchir les données
        this.loadActiveReservations();

        // Si un véhicule spécifique était sélectionné, rafraîchir aussi sa liste
        if (this.selectedReservation?.vehicleId) {
          this.loadVehicles(this.pagination.currentPage);
        }

        // Message informatif supplémentaire
        setTimeout(() => {
          if (this.selectedReservation) {
            this.notificationService.info(
              'Contrat lié',
              `Le contrat ${this.confirmReservationForm.get('contractId')?.value} a été associé avec succès`
            );
          }
        }, 800);
      } else {
        // Gérer l'erreur
        this.handleConfirmationError(response);
      }
    } catch (error) {
      console.error('❌ Erreur inattendue dans handleConfirmReservationSuccess:', error);
      this.notificationService.error(
        'Erreur inattendue',
        'Une erreur est survenue lors du traitement de la confirmation'
      );
    }
  }

  /**
   * Vérifie si la confirmation est un succès
   */
  private checkConfirmationSuccess(response: any): boolean {
    if (!response) return false;

    // Format 1: Réponse HTTP standard
    if (response.status && (response.status === 200 || response.status === 201)) {
      return true;
    }

    // Format 2: Réponse avec propriété 'success'
    if (response.success === true) {
      return true;
    }

    // Format 3: Réponse avec propriété 'ok'
    if (response.ok === true) {
      return true;
    }

    // Format 4: Réponse dans 'data' ou 'body'
    if ((response.data && response.data.success === true) ||
      (response.body && response.body.success === true)) {
      return true;
    }

    // Format 5: Réponse texte indiquant le succès
    if (typeof response === 'string') {
      const lowerResponse = response.toLowerCase();
      return lowerResponse.includes('success') ||
        lowerResponse.includes('confirm') ||
        lowerResponse.includes('liée') ||
        lowerResponse.includes('associée');
    }

    return false;
  }

  /**
   * Extrait le message de succès
   */
  private extractConfirmationSuccessMessage(response: any): string {
    // Priorité 1: Message spécifique de l'API
    if (response.message) return response.message;

    // Priorité 2: Message dans data
    if (response.data && response.data.message) return response.data.message;

    // Priorité 3: Message dans body
    if (response.body && response.body.message) return response.body.message;

    // Priorité 4: StatusText si pertinent
    if (response.statusText && response.statusText !== 'OK') {
      return response.statusText;
    }

    // Priorité 5: Message par défaut
    return 'La Location a été liée au contrat avec succès';
  }

  /**
   * Gère les erreurs de confirmation
   */
  private handleConfirmationError(response: any): void {
    let errorTitle = 'Erreur de confirmation';
    let errorMessage = 'Impossible de confirmer la réservation';

    // Extraire le message d'erreur
    if (response.message) {
      errorMessage = response.message;
    } else if (response.error && response.error.message) {
      errorMessage = response.error.message;
    } else if (response.body && response.body.message) {
      errorMessage = response.body.message;
    } else if (response.data && response.data.message) {
      errorMessage = response.data.message;
    } else if (response.statusText && response.statusText !== 'OK') {
      errorMessage = response.statusText;
    } else if (response.status) {
      // Messages basés sur le code HTTP
      switch (response.status) {
        case 400:
          errorTitle = 'Données invalides';
          errorMessage = 'L\'ID du contrat ou de la Location est invalide';
          break;
        case 401:
          errorTitle = 'Non autorisé';
          errorMessage = 'Votre session a expiré';
          break;
        case 403:
          errorTitle = 'Accès refusé';
          errorMessage = 'Vous n\'avez pas les permissions pour cette action';
          break;
        case 404:
          errorTitle = 'Non trouvé';
          errorMessage = 'La Location ou le contrat n\'existe pas';
          break;
        case 409:
          errorTitle = 'Conflit';
          errorMessage = 'Ce contrat est déjà associé à une autre réservation';
          break;
        case 422:
          errorTitle = 'Données incorrectes';
          errorMessage = 'Le format de l\'ID de contrat est incorrect';
          break;
        case 500:
          errorTitle = 'Erreur serveur';
          errorMessage = 'Le serveur rencontre des difficultés';
          break;
      }
    }

    this.notificationService.error(errorTitle, errorMessage);

    // Conserver les données du formulaire en cas d'erreur
    this.confirmReservationSubmitted = false;
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
          { label: 'Maintenance', icon: 'bx bx-wrench', action: () => this.openConfirmDialog(vehicle, VehicleStatus.Maintenance), class: 'btn-info' }
        );
        break;

      case VehicleStatus.Rented:
        // ❌ RETIRÉ: Le bouton "Libérer" n'apparaît plus ici
        actions.push(
          { label: 'Maintenance', icon: 'bx bx-wrench', action: () => this.openConfirmDialog(vehicle, VehicleStatus.Maintenance), class: 'btn-info' }
        );
        break;

      case VehicleStatus.Reserved:
        actions.push(
          { label: 'Confirmer location', icon: 'bx bx-key', action: () => this.assignToRental(vehicle), class: 'btn-success' },
          { label: 'Annuler réservation', icon: 'bx bx-x', action: () => this.openConfirmDialog(vehicle, VehicleStatus.Available), class: 'btn-secondary' }
        );
        break;

      case VehicleStatus.Maintenance:
        actions.push(
          { label: 'Marquer disponible', icon: 'bx bx-check-circle', action: () => this.openConfirmDialog(vehicle, VehicleStatus.Available), class: 'btn-success' }
        );
        break;

      case VehicleStatus.OutOfService:
        actions.push(
          { label: 'Marquer disponible', icon: 'bx bx-check-circle', action: () => this.openConfirmDialog(vehicle, VehicleStatus.Available), class: 'btn-success' }
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
            // Ouvrir le modal d'affectation au lieu de naviguer
            this.openAssignRentalModal(vehicle);
          } else {
            this.notificationService.warning(
              'Véhicule non louable',
              response.message || 'Ce véhicule ne peut pas être loué pour le moment'
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
  getTypeBadgeClass(type: VehicleType | null | undefined): string {
    if (!type) return 'badge-secondary';

    const vehicleType = this.vehicleTypes.find(t => t.value === type);
    return vehicleType ? `badge-${vehicleType.color}` : 'badge-secondary';
  }

  /**
   * Obtient la classe CSS pour le badge de statut
   */
  getStatusBadgeClass(status: VehicleStatus | null | undefined): string {
    if (!status) return 'badge-secondary';

    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj ? `badge-${statusObj.badge}` : 'badge-secondary';
  }

  /**
   * Obtient le texte du statut
   */
  getStatusText(status: VehicleStatus | null | undefined): string {
    if (!status) return 'Inconnu';

    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj ? statusObj.label : 'Inconnu';
  }

  /**
   * Obtient l'icône du statut
   */
  getStatusIcon(status: VehicleStatus | null | undefined): string {
    if (!status) return 'bx bx-question-mark';

    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj ? statusObj.icon : 'bx bx-question-mark';
  }

  /**
   * Obtient le texte du type de véhicule
   */
  getTypeText(type: VehicleType | null | undefined): string {
    if (!type) return 'Inconnu';

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
  getVehicleIcon(type: VehicleType | null | undefined): string {
    if (!type) return 'bx bx-car';

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
