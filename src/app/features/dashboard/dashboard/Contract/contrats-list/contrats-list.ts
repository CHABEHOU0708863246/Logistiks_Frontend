import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NotificationComponent } from '../../../../../core/components/notification-component/notification-component';
import { finalize, Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../../environments/environment.development';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import { ContractStatus, ContractType, DamageSeverity, PaymentFrequency, PaymentMethod, Permission, TierStatus, UserRole, VehicleStatus } from '../../../../../core/models/Enums/Logistiks-enums';
import { Auth } from '../../../../../core/services/Auth/auth';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Token } from '../../../../../core/services/Token/token';
import { ApiResponseData } from '../../../../../core/models/Common/ApiResponseData';
import { PaginatedResponse } from '../../../../../core/models/Common/PaginatedResponse';
import { RecordPaymentRequest, RenewContractRequest, CreateContractRequest, ReportDamageRequest, VehicleReturnRequest, ActivateContractRequest } from '../../../../../core/models/Contracts/Contract-request.models';
import { ContractSearchCriteria, defaultContractSearchCriteria } from '../../../../../core/models/Contracts/Contract-search.models';
import { ContractBalance } from '../../../../../core/models/Contracts/ContractBalance';
import { ContractDto } from '../../../../../core/models/Contracts/ContractDto';
import { ContractEligibilityResult } from '../../../../../core/models/Contracts/ContractEligibilityResult';
import { ContractFinancialReport } from '../../../../../core/models/Contracts/ContractFinancialReport';
import { PaymentRecord } from '../../../../../core/models/Contracts/PaymentRecord';
import { Contract } from '../../../../../core/services/Contract/contract';
import { LatePenaltyInfo, RenewalEligibilityResult } from '../../../../../core/models/Contracts/penalty.models';
import { Tiers } from '../../../../../core/services/Tiers/tiers';
import { Vehicles } from '../../../../../core/services/Vehicles/vehicles';
import { VehicleDto, VehicleSearchCriteria } from '../../../../../core/models/Vehicles/Vehicle.dtos';
import { VehicleReturnResult } from '../../../../../core/models/Contracts/VehicleReturnResult';
import { SidebarComponent } from "../../../../../core/components/sidebar-component/sidebar-component";

@Component({
  selector: 'app-contrats-list',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NotificationComponent, SidebarComponent],
  templateUrl: './contrats-list.html',
  styleUrl: './contrats-list.scss',
})
export class ContratsList implements OnInit, OnDestroy {
  // ============================================================================
  // SECTION 1: PROPRIÉTÉS DE DONNÉES ET D'ÉTAT
  // ============================================================================
  contractPayments: PaymentRecord[] = [];

  showActivateContractModal: boolean = false;
  activateContractForm!: FormGroup;
  activateContractLoading: boolean = false;
  activateContractSubmitted: boolean = false;

  /** Modal de pénalités */
  showPenaltiesModal: boolean = false;
  penaltiesInfo: LatePenaltyInfo | null = null;
  penaltiesLoading: boolean = false;
  vehicleStatusEnum = VehicleStatus;

  // Dans la classe ContratsList
  availableTiers: any[] = [];
  availableVehicles: any[] = [];
  loadingTiers: boolean = false;
  loadingVehicles: boolean = false;
  searchTermCustomer: string = '';
  searchTermVehicle: string = '';
  selectedTier: any = null;
  selectedVehicle: any = null;

  /** Modal d'éligibilité au renouvellement */
  showRenewalEligibilityModal: boolean = false;
  renewalEligibility: RenewalEligibilityResult | null = null;
  renewalEligibilityLoading: boolean = false;

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
  // SECTION 2bis: MODALES SUPPLEMENTAIRES
  // ============================================================================

  /** Modal pour enregistrer le retour du véhicule */
  showVehicleReturnModal: boolean = false;
  vehicleReturnForm!: FormGroup;
  vehicleReturnLoading: boolean = false;
  vehicleReturnSubmitted: boolean = false;

  /** Modal pour signaler un dommage */
  showDamageReportModal: boolean = false;
  damageReportForm!: FormGroup;
  damageReportLoading: boolean = false;
  damageReportSubmitted: boolean = false;

  /** Modal pour annuler un contrat */
  showCancelContractModal: boolean = false;
  cancelContractForm!: FormGroup;
  cancelContractLoading: boolean = false;
  cancelContractSubmitted: boolean = false;

  /** Modal pour rejeter un contrat */
  showRejectContractModal: boolean = false;
  rejectContractForm!: FormGroup;
  rejectContractLoading: boolean = false;
  rejectContractSubmitted: boolean = false;

  // ============================================================================
  // SECTION 12bis: MODÈLES DE DONNÉES SUPPLÉMENTAIRES
  // ============================================================================

  damagePhotos: File[] = [];
  previewUrls: string[] = [];

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
    { value: 1, label: 'Espèces', icon: 'bx bx-money' },
    { value: 2, label: 'Mobile Money', icon: 'bx bx-mobile-alt' },
    { value: 3, label: 'Virement bancaire', icon: 'bx bx-bank' },
    { value: 4, label: 'Chèque', icon: 'bx bx-receipt' }
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
    private tierService: Tiers,
    private vehicleService: Vehicles,
    private authService: Auth,
    private tokenService: Token,
    private router: Router
  ) {
    // Initialisation des formulaires
    this.paymentForm = this.formBuilder.group({
      paymentDate: [new Date().toISOString().split('T')[0], Validators.required],
      amountPaid: [0, [Validators.required, Validators.min(0.01)]],
      method: [1, Validators.required],
      reference: [''],
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

    // Formulaire pour le retour du véhicule
    this.vehicleReturnForm = this.formBuilder.group({
      returnDate: [new Date().toISOString().split('T')[0], Validators.required],
      endMileage: [0, [Validators.required, Validators.min(0)]],
      fuelLevel: ['FULL', Validators.required],
      vehicleCondition: ['GOOD', Validators.required],
      notes: [''],
      hasDamage: [false],
      hasOverdueMileage: [false]
    });

    // Formulaire pour signaler un dommage
    this.damageReportForm = this.formBuilder.group({
      damageDate: [new Date().toISOString().split('T')[0], Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      estimatedRepairCost: [0, [Validators.required, Validators.min(0)]],
      severity: [DamageSeverity.Minor, Validators.required], // ✅ Valeur numérique par défaut
      locationOnVehicle: ['', Validators.required],
      responsibleParty: ['CUSTOMER', Validators.required],
      notes: ['']
    });

    // Formulaire pour annuler un contrat
    this.cancelContractForm = this.formBuilder.group({
      reason: ['', [Validators.required, Validators.minLength(10)]],
      refundAmount: [0, [Validators.min(0)]],
      cancellationFee: [0, [Validators.min(0)]],
      effectiveDate: [new Date().toISOString().split('T')[0], Validators.required]
    });

    // Formulaire pour rejeter un contrat
    this.rejectContractForm = this.formBuilder.group({
      reason: ['', [Validators.required, Validators.minLength(10)]],
      notes: ['']
    });

  }

  // ============================================================================
  // SECTION 16: GESTION DU RETOUR DU VÉHICULE
  // ============================================================================

  /**
   * Ouvre la modal de retour du véhicule
   */
  openVehicleReturnModal(contract: ContractDto): void {
    // ✅ AJOUT : Vérifier que le contrat a des informations de livraison
    if (!contract.deliveryInfo) {
      this.notificationService.error(
        'Impossible d\'enregistrer le retour',
        'Ce contrat n\'a pas d\'informations de livraison. Veuillez d\'abord activer le contrat avec les informations de livraison.'
      );
      return;
    }

    this.selectedContract = contract;
    this.showVehicleReturnModal = true;
    this.vehicleReturnSubmitted = false;

    // Pré-remplir avec les données actuelles
    this.vehicleReturnForm.patchValue({
      returnDate: new Date().toISOString().split('T')[0],
      endMileage: 0, // L'utilisateur doit saisir le kilométrage de retour
      fuelLevel: 'FULL',
      vehicleCondition: 'GOOD'
    });
  }

  /**
 * Ouvre la modal d'activation du contrat
 */
  openActivateContractModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.showActivateContractModal = true;
    this.activateContractSubmitted = false;

    // Pré-remplir avec des valeurs par défaut
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
      this.notificationService.error(
        'Formulaire incomplet',
        'Veuillez remplir tous les champs obligatoires'
      );
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

    console.log('✅ Activation du contrat:', request);

    this.contractService.activateContract(this.selectedContract.id, request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.activateContractLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<ContractDto>) => {
          this.notificationService.success(
            'Contrat activé',
            `Le contrat ${this.selectedContract?.contractNumber} a été activé avec succès.`
          );

          this.closeActivateContractModal();
          this.loadContracts();
          this.loadDashboardStats();
        },
        error: (error) => {
          console.error('❌ Erreur activation contrat:', error);
          const errorMessage = this.extractApiError(error);
          this.notificationService.error(
            'Erreur lors de l\'activation du contrat',
            errorMessage
          );
        }
      });
  }

  /**
   * Vérifie si un contrat peut être activé
   */
  canActivateContract(contract: ContractDto): boolean {
    // Seuls les contrats PENDING ou DRAFT peuvent être activés
    return contract.status === ContractStatus.Pending ||
      contract.status === ContractStatus.Draft;
  }

  /**
   * Vérifie si un contrat a des informations de livraison
   */
  hasDeliveryInfo(contract: ContractDto): boolean {
    return !!contract.deliveryInfo;
  }

  /**
   * Ferme la modal de retour du véhicule
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
 * Soumet le formulaire de retour du véhicule (VERSION CORRIGÉE)
 */
  onVehicleReturnSubmit(): void {
    this.vehicleReturnSubmitted = true;

    if (this.vehicleReturnForm.invalid || !this.selectedContract) {
      this.notificationService.error('Formulaire incomplet', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    // ✅ AJOUT : Vérifier à nouveau les deliveryInfo
    if (!this.selectedContract.deliveryInfo) {
      this.notificationService.error(
        'Erreur de données',
        'Les informations de livraison sont manquantes pour ce contrat.'
      );
      return;
    }

    this.vehicleReturnLoading = true;

    // Convertir fuelLevel de chaîne à enum/nombre
    const fuelLevelMap: { [key: string]: number } = {
      'EMPTY': 0,
      'QUARTER': 25,
      'HALF': 50,
      'THREE_QUARTERS': 75,
      'FULL': 100
    };

    // Récupérer les valeurs de l'utilisateur actuel
    const currentUserId = this.currentUser?.id || '';
    const currentUserName = this.currentUser?.username || 'System';

    const request: VehicleReturnRequest = {
      returnDate: new Date(this.vehicleReturnForm.value.returnDate),
      returnLocation: this.selectedContract.deliveryInfo, // ✅ Utiliser deliveryInfo existant
      mileageAtReturn: Number(this.vehicleReturnForm.value.endMileage),
      fuelLevel: fuelLevelMap[this.vehicleReturnForm.value.fuelLevel] || 100,
      conditionNotes: this.vehicleReturnForm.value.vehicleCondition,
      photos: [],
      damages: [],
      returnedBy: this.selectedContract.customerName || 'Client',
      receivedBy: currentUserName
    };

    console.log('✅ Envoi retour véhicule:', request);

    this.contractService.recordVehicleReturn(this.selectedContract.id, request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.vehicleReturnLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<VehicleReturnResult>) => {
          this.notificationService.success(
            'Retour du véhicule enregistré',
            `Le véhicule a été retourné avec succès. Contrat ${this.selectedContract?.contractNumber} clôturé.`
          );

          if (response.data) {
            this.showReturnSummary(response.data);
          }

          this.closeVehicleReturnModal();
          this.loadContracts();
          this.loadDashboardStats();
        },
        error: (error) => {
          console.error('❌ Erreur retour véhicule:', error);

          if (error.error && error.error.errors) {
            console.log('Erreurs de validation:', error.error.errors);
          }

          const errorMessage = this.extractApiError(error);
          this.notificationService.error('Erreur lors du retour du véhicule', errorMessage);
        }
      });
  }

  /**
   * Affiche le récapitulatif du retour
   */
  private showReturnSummary(result: VehicleReturnResult): void {
    // Calculer si il y a des frais supplémentaires
    const hasExtraCharges = result.mileageOverageFee > 0 || result.fuelCharge > 0 || result.totalDamageCost > 0;
    const totalExtraCharges = result.mileageOverageFee + result.fuelCharge + result.totalDamageCost;

    // Vérifier s'il y a des dommages
    const hasDamages = result.damages && result.damages.length > 0;

    // Formater la date
    const formattedReturnDate = result.returnedAt ? this.formatDate(result.returnedAt) : 'N/A';

    // Créer le récapitulatif
    const summary = `
    <div class="return-summary">
      <h6 class="mb-3">📋 Récapitulatif du retour</h6>
      <div class="row">
        <div class="col-md-6">
          <ul class="list-unstyled">
            <li class="mb-2">
              <i class='bx bx-calendar me-2'></i>
              <strong>Date de retour:</strong> ${formattedReturnDate}
            </li>
            <li class="mb-2">
              <i class='bx bx-tachometer me-2'></i>
              <strong>Kilométrage:</strong>
              <div class="ms-4">
                <small>Livraison: ${result.mileageAtDelivery} km</small><br>
                <small>Retour: ${result.mileageAtReturn} km</small><br>
                <small>Total parcouru: ${result.totalMileage} km</small>
              </div>
            </li>
            <li class="mb-2">
              <i class='bx bx-gas-pump me-2'></i>
              <strong>Niveau carburant:</strong>
              <div class="ms-4">
                <small>Livraison: ${result.fuelLevelAtDelivery}%</small><br>
                <small>Retour: ${result.fuelLevelAtReturn}%</small>
              </div>
            </li>
          </ul>
        </div>
        <div class="col-md-6">
          <ul class="list-unstyled">
            <li class="mb-2">
              <i class='bx bx-dollar-circle me-2'></i>
              <strong>Détails financiers:</strong>
              <div class="ms-4">
                ${result.mileageOverage > 0 ? `
                  <small class="text-warning">
                    Dépassement: ${result.mileageOverage} km
                    <span class="badge bg-warning ms-2">${this.formatCurrency(result.mileageOverageFee)}</span>
                  </small><br>
                ` : ''}
                ${result.fuelCharge > 0 ? `
                  <small class="text-danger">
                    Frais carburant
                    <span class="badge bg-danger ms-2">${this.formatCurrency(result.fuelCharge)}</span>
                  </small><br>
                ` : ''}
                ${result.totalDamageCost > 0 ? `
                  <small class="text-danger">
                    Réparation dommages
                    <span class="badge bg-danger ms-2">${this.formatCurrency(result.totalDamageCost)}</span>
                  </small><br>
                ` : ''}
                ${hasExtraCharges ? `
                  <small class="text-primary mt-1 d-block">
                    <strong>Total frais: ${this.formatCurrency(totalExtraCharges)}</strong>
                  </small>
                ` : '<small class="text-success">Aucun frais supplémentaire</small>'}
              </div>
            </li>
            ${hasDamages ? `
              <li class="mb-2">
                <i class='bx bx-error me-2'></i>
                <strong>Dommages signalés:</strong>
                <div class="ms-4">
                  <small class="text-danger">${result.damages.length} dommage(s) détecté(s)</small>
                </div>
              </li>
            ` : ''}
            ${result.mileageLimit ? `
              <li class="mb-2">
                <i class='bx bx-flag me-2'></i>
                <strong>Limite kilométrique:</strong>
                <div class="ms-4">
                  <small>${result.mileageLimit} km (${result.mileageOverage > 0 ? 'Dépassé' : 'Respecté'})</small>
                </div>
              </li>
            ` : ''}
          </ul>
        </div>
      </div>

      ${hasDamages ? `
        <div class="mt-3 p-2 border rounded bg-light">
          <h6 class="mb-2">📝 Détail des dommages:</h6>
          <div class="table-responsive">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th class="text-end">Coût</th>
                </tr>
              </thead>
              <tbody>
                ${result.damages.map((damage: any, index: number) => `
                  <tr>
                    <td>${damage.type || 'Dommage'}</td>
                    <td>${damage.description || 'Non spécifié'}</td>
                    <td class="text-end">${this.formatCurrency(damage.cost || 0)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <div class="mt-3 alert ${hasExtraCharges ? 'alert-warning' : 'alert-success'}">
        <i class='bx ${hasExtraCharges ? 'bx-error-circle' : 'bx-check-circle'} me-2'></i>
        <strong>${result.message || (hasExtraCharges ? 'Frais supplémentaires appliqués' : 'Retour validé sans frais')}</strong>
      </div>
    </div>
  `;

    // Afficher la notification avec le récapitulatif
    this.notificationService.info(
      '🔄 Retour du véhicule - Récapitulatif',
      summary,
      15000, // Durée plus longue pour la lecture
    );
  }

  /**
   * Formate une date avec heure (optionnel)
   */
  private formatDateTime(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Obtient le label du type de dommage
   */
  private getDamageTypeLabel(type: string): string {
    const types: { [key: string]: string } = {
      'SCRATCH': 'Rayure',
      'DENT': 'Boss',
      'BREAK': 'Cassure',
      'CRACK': 'Fêlure',
      'STAIN': 'Tache',
      'OTHER': 'Autre'
    };
    return types[type] || type;
  }

  // ============================================================================
  // SECTION 17: GESTION DES DOMMAGES
  // ============================================================================

  /**
 * Ouvre la modal de signalement de dommage (VERSION CORRIGÉE)
 */
  openDamageReportModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.showDamageReportModal = true;
    this.damageReportSubmitted = false;
    this.damagePhotos = [];
    this.previewUrls = [];

    this.damageReportForm.patchValue({
      damageDate: new Date().toISOString().split('T')[0],
      severity: DamageSeverity.Minor, // ✅ Valeur numérique (1)
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
   * Gère la sélection de photos de dommage
   */
  onDamagePhotoSelected(event: any): void {
    const files: FileList = event.target.files;

    if (files.length > 0) {
      // Limiter à 5 photos
      const maxFiles = 5;
      const filesToAdd = Array.from(files).slice(0, maxFiles - this.damagePhotos.length);

      filesToAdd.forEach(file => {
        if (file.type.startsWith('image/')) {
          this.damagePhotos.push(file);

          // Créer une URL de prévisualisation
          const reader = new FileReader();
          reader.onload = (e: any) => {
            this.previewUrls.push(e.target.result);
          };
          reader.readAsDataURL(file);
        }
      });

      if (files.length > maxFiles) {
        this.notificationService.warning('Limite de photos', `Maximum ${maxFiles} photos autorisées.`);
      }
    }
  }

  /**
   * Supprime une photo de dommage
   */
  removeDamagePhoto(index: number): void {
    this.damagePhotos.splice(index, 1);
    this.previewUrls.splice(index, 1);
  }

  /**
   * Soumet le formulaire de signalement de dommage
   */
  onDamageReportSubmit(): void {
    this.damageReportSubmitted = true;

    if (this.damageReportForm.invalid || !this.selectedContract) {
      this.notificationService.error('Formulaire incomplet', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    // ✅ Récupérer et valider severity
    let severityValue = this.damageReportForm.value.severity;

    // Si severity est une chaîne, la convertir
    if (typeof severityValue === 'string') {
      severityValue = this.getDamageSeverityValue(severityValue);
    }

    // Valider que severity est un nombre valide
    if (!severityValue || severityValue < 1 || severityValue > 4) {
      this.notificationService.error(
        'Sévérité invalide',
        'Veuillez sélectionner une sévérité de dommage valide.'
      );
      return;
    }

    // Vérifier les photos pour les dommages graves
    if ((severityValue === DamageSeverity.Major || severityValue === DamageSeverity.Total)
      && this.damagePhotos.length === 0) {
      this.notificationService.warning(
        'Photos requises',
        'Veuillez ajouter au moins une photo pour les dommages graves.'
      );
      return;
    }

    this.damageReportLoading = true;

    // Convertir les photos en URLs
    const photoUrls: string[] = this.damagePhotos.map((photo, index) =>
      `damage_${this.selectedContract!.id}_${Date.now()}_${index}.jpg`
    );

    const request: ReportDamageRequest = {
      description: this.damageReportForm.value.description,
      severity: Number(severityValue), // ✅ S'assurer que c'est un nombre
      estimatedCost: Number(this.damageReportForm.value.estimatedRepairCost),
      photoUrls: photoUrls,
      notes: this.damageReportForm.value.notes || ''
    };

    console.log('✅ Envoi signalement dommage:', request);

    this.contractService.reportDamage(this.selectedContract.id, request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.damageReportLoading = false)
      )
      .subscribe({
        next: () => {
          this.notificationService.success(
            'Dommage signalé',
            `Le dommage a été signalé avec succès pour le contrat ${this.selectedContract?.contractNumber}.`
          );

          this.uploadDamagePhotos();
          this.closeDamageReportModal();
          this.loadContracts();
        },
        error: (error) => {
          console.error('❌ Erreur signalement dommage:', error);

          if (error.error && error.error.errors) {
            console.log('Erreurs de validation:', error.error.errors);
          }

          const errorMessage = this.extractApiError(error);
          this.notificationService.error('Erreur lors du signalement du dommage', errorMessage);
        }
      });
  }

  /**
   * Upload les photos de dommage (méthode séparée)
   */
  private uploadDamagePhotos(): void {
    if (this.damagePhotos.length === 0) return;

    // TODO: Implémenter l'upload des photos vers votre API
    console.log(`${this.damagePhotos.length} photos à uploader`);
  }

  // ============================================================================
  // SECTION 18: ANNULATION DE CONTRAT
  // ============================================================================

  /**
   * Ouvre la modal d'annulation de contrat
   */
  openCancelContractModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.showCancelContractModal = true;
    this.cancelContractSubmitted = false;

    // Calculer les frais d'annulation potentiels
    this.calculateCancellationFees(contract);
  }

  /**
   * Calcule les frais d'annulation
   */
  private calculateCancellationFees(contract: ContractDto): void {
    const today = new Date();
    const startDate = new Date(contract.startDate);
    const endDate = new Date(contract.endDate);

    // Calculer la durée totale et la durée écoulée
    const totalDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const elapsedDuration = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));

    // Calculer le pourcentage de durée écoulée
    const percentageElapsed = (elapsedDuration / totalDuration) * 100;

    let cancellationFee = 0;
    let refundAmount = 0;

    if (percentageElapsed <= 25) {
      // Moins de 25% de la durée : frais de 50% du reste
      cancellationFee = (contract.weeklyAmount * (totalDuration - elapsedDuration)) * 0.5;
      refundAmount = (contract.weeklyAmount * (totalDuration - elapsedDuration)) - cancellationFee;
    } else if (percentageElapsed <= 50) {
      // Moins de 50% de la durée : frais de 75% du reste
      cancellationFee = (contract.weeklyAmount * (totalDuration - elapsedDuration)) * 0.75;
      refundAmount = (contract.weeklyAmount * (totalDuration - elapsedDuration)) - cancellationFee;
    } else {
      // Plus de 50% de la durée : pas de remboursement
      cancellationFee = contract.weeklyAmount * (totalDuration - elapsedDuration);
      refundAmount = 0;
    }

    this.cancelContractForm.patchValue({
      cancellationFee: Math.round(cancellationFee),
      refundAmount: Math.round(refundAmount),
      effectiveDate: new Date().toISOString().split('T')[0]
    });
  }

  /**
   * Ferme la modal d'annulation de contrat
   */
  closeCancelContractModal(): void {
    this.showCancelContractModal = false;
    this.selectedContract = null;
    this.cancelContractForm.reset({
      reason: '',
      refundAmount: 0,
      cancellationFee: 0,
      effectiveDate: new Date().toISOString().split('T')[0]
    });
  }

  /**
   * Soumet le formulaire d'annulation de contrat
   */
  onCancelContractSubmit(): void {
    this.cancelContractSubmitted = true;

    if (this.cancelContractForm.invalid || !this.selectedContract) {
      this.notificationService.error('Formulaire incomplet', 'Veuillez indiquer la raison de l\'annulation');
      return;
    }

    // Confirmation supplémentaire pour l'annulation
    if (!confirm('Êtes-vous sûr de vouloir annuler ce contrat ? Cette action est irréversible.')) {
      return;
    }

    this.cancelContractLoading = true;

    this.contractService.cancelContract(
      this.selectedContract.id,
      this.cancelContractForm.value.reason
    )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cancelContractLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<ContractDto>) => {
          this.notificationService.success(
            'Contrat annulé',
            `Le contrat ${this.selectedContract?.contractNumber} a été annulé avec succès.`
          );

          // Afficher les détails financiers
          this.showCancellationSummary();

          this.closeCancelContractModal();
          this.loadContracts();
          this.loadDashboardStats();
        },
        error: (error) => {
          console.error('Erreur annulation contrat:', error);
          const errorMessage = this.extractApiError(error);
          this.notificationService.error('Erreur lors de l\'annulation du contrat', errorMessage);
        }
      });
  }

  /**
   * Affiche le récapitulatif de l'annulation
   */
  private showCancellationSummary(): void {
    const summary = `
    <div class="cancellation-summary">
      <h6>Récapitulatif de l'annulation</h6>
      <ul>
        <li><strong>Contrat:</strong> ${this.selectedContract?.contractNumber}</li>
        <li><strong>Frais d'annulation:</strong> ${this.formatCurrency(this.cancelContractForm.value.cancellationFee)}</li>
        <li><strong>Remboursement client:</strong> ${this.formatCurrency(this.cancelContractForm.value.refundAmount)}</li>
        <li><strong>Motif:</strong> ${this.cancelContractForm.value.reason}</li>
      </ul>
    </div>
  `;

    this.notificationService.info('Détails de l\'annulation', summary, 8000);
  }

  // ============================================================================
  // SECTION 19: REJET DE CONTRAT
  // ============================================================================

  /**
   * Ouvre la modal de rejet de contrat
   */
  openRejectContractModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.showRejectContractModal = true;
    this.rejectContractSubmitted = false;

    // Suggestions de motifs courants
    const suggestions = [
      'Documentation incomplète',
      'Vérification d\'identité échouée',
      'Historique de crédit insuffisant',
      'Véhicule non disponible',
      'Conditions contractuelles non acceptées',
      'Informations fournies incorrectes'
    ];

    // Pré-remplir avec un motif suggéré
    this.rejectContractForm.patchValue({
      reason: suggestions[0]
    });
  }

  /**
   * Ferme la modal de rejet de contrat
   */
  closeRejectContractModal(): void {
    this.showRejectContractModal = false;
    this.selectedContract = null;
    this.rejectContractForm.reset({
      reason: '',
      notes: ''
    });
  }

  /**
   * Soumet le formulaire de rejet de contrat
   */
  onRejectContractSubmit(): void {
    this.rejectContractSubmitted = true;

    if (this.rejectContractForm.invalid || !this.selectedContract) {
      this.notificationService.error('Formulaire incomplet', 'Veuillez indiquer le motif du rejet');
      return;
    }

    // Confirmation pour le rejet
    if (!confirm('Êtes-vous sûr de vouloir rejeter ce contrat ? Cette action est irréversible.')) {
      return;
    }

    this.rejectContractLoading = true;

    this.contractService.rejectContract(
      this.selectedContract.id,
      this.rejectContractForm.value.reason
    )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.rejectContractLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<ContractDto>) => {
          this.notificationService.success(
            'Contrat rejeté',
            `Le contrat ${this.selectedContract?.contractNumber} a été rejeté.`
          );

          this.closeRejectContractModal();
          this.loadContracts();
        },
        error: (error) => {
          console.error('Erreur rejet contrat:', error);
          const errorMessage = this.extractApiError(error);
          this.notificationService.error('Erreur lors du rejet du contrat', errorMessage);
        }
      });
  }

  // ============================================================================
  // SECTION 20: HELPERS SUPPLÉMENTAIRES
  // ============================================================================

  /**
   * Obtient le label de l'état du véhicule
   */
  getVehicleConditionLabel(condition: string): string {
    const conditions: { [key: string]: string } = {
      'EXCELLENT': 'Excellent',
      'GOOD': 'Bon',
      'FAIR': 'Correct',
      'POOR': 'Mauvais',
      'DAMAGED': 'Endommagé'
    };
    return conditions[condition] || condition;
  }

  /**
   * Obtient le label de la sévérité du dommage
   */
  getDamageSeverityLabel(severityValue: number): string {
    const severities: { [key: number]: string } = {
      1: 'Mineur',
      2: 'Modéré',
      3: 'Majeur',
      4: 'Critique'
    };
    return severities[severityValue] || 'Inconnu';
  }

  /**
   * Convertir le niveau de carburant de chaîne à nombre (pour l'envoi)
   */
  getFuelLevelValue(levelString: string): number {
    const fuelLevelMap: { [key: string]: number } = {
      'EMPTY': 0,
      'QUARTER': 25,
      'HALF': 50,
      'THREE_QUARTERS': 75,
      'FULL': 100
    };
    return fuelLevelMap[levelString] || 50;
  }


  /**
   * Convertir la sévérité de chaîne à nombre (pour l'envoi)
   */
  getDamageSeverityValue(severityString: string): number {
    const severityMap: { [key: string]: number } = {
      'MINOR': DamageSeverity.Minor,      // 1
      'MODERATE': DamageSeverity.Moderate, // 2
      'MAJOR': DamageSeverity.Major,       // 3
      'CRITICAL': DamageSeverity.Total,    // 4
      'TOTAL': DamageSeverity.Total        // 4
    };

    const upperString = severityString.toUpperCase();
    return severityMap[upperString] || DamageSeverity.Minor;
  }

  /**
   * Obtient le label de la partie responsable
   */
  getResponsiblePartyLabel(party: string): string {
    const parties: { [key: string]: string } = {
      'CUSTOMER': 'Client',
      'COMPANY': 'Société',
      'THIRD_PARTY': 'Tiers',
      'UNKNOWN': 'Inconnu'
    };
    return parties[party] || party;
  }

  /**
   * Obtient le label du niveau de carburant
   */
  getFuelLevelLabel(levelValue: number): string {
    const levels: { [key: number]: string } = {
      0: 'Vide',
      25: '¼',
      50: '½',
      75: '¾',
      100: 'Plein'
    };
    return levels[levelValue] || `${levelValue}%`;
  }

  // ============================================================================
  // SECTION 21: GETTERS SUPPLÉMENTAIRES
  // ============================================================================

  get vrf() { return this.vehicleReturnForm.controls; }
  get drf() { return this.damageReportForm.controls; }
  get ccf() { return this.cancelContractForm.controls; }
  get rjf() { return this.rejectContractForm.controls; }
  get acf() { return this.activateContractForm.controls; }


  /**
   * Vérifie si un contrat peut être retourné
   */
  canReturnVehicle(contract: ContractDto): boolean {
    // Le contrat doit être actif
    if (contract.status !== ContractStatus.Active) return false;

    // Le contrat doit avoir des informations de livraison
    if (!contract.deliveryInfo) return false;

    const today = new Date();
    const startDate = new Date(contract.startDate);

    // Le véhicule ne peut être retourné qu'après le début du contrat
    return today >= startDate;
  }

  /**
   * Vérifie si un dommage peut être signalé
   */
  canReportDamage(contract: ContractDto): boolean {
    if (contract.status !== ContractStatus.Active) return false;

    const today = new Date();
    const startDate = new Date(contract.startDate);
    const endDate = new Date(contract.endDate);

    // Le dommage ne peut être signalé que pendant la durée du contrat
    return today >= startDate && today <= endDate;
  }

  /**
   * Vérifie si un contrat peut être annulé
   */
  canCancelContract(contract: ContractDto): boolean {
    if (contract.status !== ContractStatus.Active) return false;

    const today = new Date();
    const endDate = new Date(contract.endDate);

    // Le contrat ne peut être annulé qu'avant sa date de fin
    return today < endDate;
  }

  /**
   * Vérifie si un contrat peut être rejeté
   */
  canRejectContract(contract: ContractDto): boolean {
    // Seuls les contrats en brouillon ou en attente peuvent être rejetés
    return contract.status === ContractStatus.Draft ||
      contract.status === ContractStatus.Pending;
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

  /**
 * Charge les tiers actifs (pour le selectbox)
 */
  loadAvailableTiers(searchTerm: string = ''): void {
    this.loadingTiers = true;

    // Utilisez le service tiers avec les paramètres appropriés
    const params = {
      search: searchTerm,
      status: TierStatus.Active, // Seulement les tiers actifs
      pageNumber: 1,
      pageSize: 50, // Limite pour éviter trop de données
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
        error: (error: { message: any; }) => {
          console.error('Erreur chargement tiers:', error);
          this.notificationService.error('Erreur lors du chargement des clients', error.message || '');
        }
      });
  }

  /**
   * Charge les véhicules disponibles (Available ou Reserved)
   */
  loadAvailableVehicles(searchTerm: string = ''): void {
    this.loadingVehicles = true;

    const criteria: VehicleSearchCriteria = {
      searchTerm: searchTerm,
      status: undefined, // Nous filtrerons côté frontend
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
          // Filtrer pour n'avoir que les véhicules disponibles ou réservés
          this.availableVehicles = (response.data || [])
            .filter(vehicle =>
              vehicle.status === VehicleStatus.Available ||
              vehicle.status === VehicleStatus.Reserved
            )
            .map(vehicle => ({
              id: vehicle.id,
              value: vehicle.id,
              label: `${vehicle.plateNumber} - ${vehicle.brand} ${vehicle.model} (${vehicle.code})`,
              plateNumber: vehicle.plateNumber,
              brand: vehicle.brand,
              model: vehicle.model,
              code: vehicle.code,
              status: vehicle.status,
              statusLabel: this.getVehicleStatusLabel(vehicle.status)
            }));
        },
        error: (error: { message: any; }) => {
          console.error('Erreur chargement véhicules:', error);
          this.notificationService.error('Erreur lors du chargement des véhicules', error.message || '');
        }
      });
  }

  /**
   * Obtient le label du statut d'un véhicule
   */
  getVehicleStatusLabel(status: VehicleStatus): string {
    switch (status) {
      case VehicleStatus.Available:
        return 'Disponible';
      case VehicleStatus.Reserved:
        return 'Réservé';
      case VehicleStatus.Rented:
        return 'Loué';
      case VehicleStatus.Maintenance:
        return 'Maintenance';
      case VehicleStatus.OutOfService:
        return 'Hors service';
      default:
        return 'Inconnu';
    }
  }

  /**
   * Ouvre la modal de création et charge les données
   */
  openCreateModal(): void {
    this.showCreateModal = true;
    this.createSubmitted = false;

    // Charger les données pour les selectboxes
    this.loadAvailableTiers();
    this.loadAvailableVehicles();

    // Réinitialiser les sélections
    this.selectedTier = null;
    this.selectedVehicle = null;
    this.searchTermCustomer = '';
    this.searchTermVehicle = '';

    // Réinitialiser le formulaire
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
  }

  /**
   * Gère la recherche en temps réel pour les clients
   */
  onSearchCustomer(): void {
    this.loadAvailableTiers(this.searchTermCustomer);
  }

  /**
   * Gère la recherche en temps réel pour les véhicules
   */
  onSearchVehicle(): void {
    this.loadAvailableVehicles(this.searchTermVehicle);
  }

  /**
   * Sélectionne un client dans la liste
   */
  selectTier(tier: any): void {
    this.selectedTier = tier;
    this.searchTermCustomer = tier.fullName;
    this.createForm.patchValue({ customerId: tier.id });
    this.availableTiers = []; // Ferme la liste dropdown
  }

  /**
   * Sélectionne un véhicule dans la liste
   */
  selectVehicle(vehicle: any): void {
    this.selectedVehicle = vehicle;
    this.searchTermVehicle = `${vehicle.plateNumber} - ${vehicle.brand} ${vehicle.model}`;
    this.createForm.patchValue({ vehicleId: vehicle.id });
    this.availableVehicles = []; // Ferme la liste dropdown
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

          // ✅ NOUVEAU : Mettre à jour les statistiques du dashboard
          this.updateDashboardStatsFromContracts();
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

  /**
 * Ouvre la modal de pénalités
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
          this.notificationService.error('Erreur lors du chargement des pénalités', error.message || '');
          this.closePenaltiesModal();
        }
      });
  }

  /**
   * Ferme la modal de pénalités
   */
  closePenaltiesModal(): void {
    this.showPenaltiesModal = false;
    this.selectedContract = null;
    this.penaltiesInfo = null;
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
    this.penaltiesLoading = true;

    // Charger les pénalités pour ce contrat
    this.contractService.getContractPenalties(contract.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.penaltiesLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<LatePenaltyInfo>) => {
          this.penaltiesInfo = response.data;

          // Calculer le montant total à payer (montant de base + pénalités en cours)
          const currentPenalty = this.penaltiesInfo?.payments
            .filter(p => p.daysLate > 0 && p.penaltyApplies)
            .reduce((sum, p) => sum + p.penaltyAmount, 0) || 0;

          this.paymentForm.patchValue({
            amountPaid: contract.weeklyAmount + currentPenalty,
            paymentDate: new Date().toISOString().split('T')[0]
          });
        },
        error: (error) => {
          console.error('Erreur chargement pénalités:', error);
          // Continuer quand même
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

          // Si éligible, pré-remplir le formulaire
          if (this.renewalEligibility?.isEligible) {
            this.renewForm.patchValue({
              durationInWeeks: 4,
              newWeeklyAmount: contract.weeklyAmount,
              newSecurityDeposit: contract.securityDeposit
            });
          }
        },
        error: (error) => {
          console.error('Erreur vérification éligibilité renouvellement:', error);
          this.notificationService.error('Erreur lors de la vérification d\'éligibilité', error.message || '');
          this.closeRenewalEligibilityModal();
        }
      });
  }


  /**
   * Ferme la modal d'éligibilité au renouvellement
   */
  closeRenewalEligibilityModal(): void {
    this.showRenewalEligibilityModal = false;
    this.selectedContract = null;
    this.renewalEligibility = null;
  }

  /**
   * Procéder au renouvellement depuis la modal d'éligibilité
   */
  proceedToRenewal(): void {
    if (this.selectedContract && this.renewalEligibility?.isEligible) {
      this.closeRenewalEligibilityModal();
      this.openRenewModal(this.selectedContract);
    }
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
          this.notificationService.success('Paiement enregistré avec succès', 'Succès');

          // ✅ Recalculer les montants après paiement
          this.recalculateAmountsAfterPayment(
            this.selectedContractForPayment!.id,
            request.amountPaid
          );

          // ✅ Si le modal de solde est ouvert, le recharger
          if (this.showBalanceModal && this.selectedContract) {
            this.loadBalanceForCurrentContract();
          }

          this.closePaymentModal();
          this.loadContracts(); // Recharger la liste
          this.loadDashboardStats();
        },
        error: (error) => {
          console.error('❌ Erreur enregistrement paiement:', error);
          const errorMessage = this.extractApiError(error);
          this.notificationService.error(
            'Erreur lors de l\'enregistrement du paiement',
            errorMessage
          );
        }
      });
  }

  /**
   * Recharge le solde pour le contrat actuellement sélectionné
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
        error: (error) => {
          console.error('Erreur rechargement solde:', error);
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

    // Charger le solde
    this.contractService.getContractBalance(contract.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponseData<ContractBalance>) => {
          this.contractBalance = response.data;
        }
      });

    // ✅ Charger l'historique des paiements
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
   * Calcule le pourcentage de paiements manqués
   */
  getMissedPaymentPercentage(): number {
    if (!this.financialReport) return 0;

    const total = this.financialReport.paymentsMade + this.financialReport.paymentsMissed;
    if (total === 0) return 0;

    return Math.round((this.financialReport.paymentsMissed / total) * 100);
  }

  /**
   * Calcule le pourcentage du montant restant
   */
  getOutstandingPercentage(): number {
    if (!this.financialReport || this.financialReport.totalContractValue === 0) return 0;

    return Math.round((this.financialReport.totalOutstanding / this.financialReport.totalContractValue) * 100);
  }

  /**
   * Met à jour les données d'un contrat après un paiement
   */
  private updateContractAfterPayment(contractId: string, balance: ContractBalance): void {
    const contractIndex = this.contracts.findIndex(c => c.id === contractId);

    if (contractIndex !== -1) {
      // Mettre à jour les propriétés calculées du contrat
      this.contracts[contractIndex] = {
        ...this.contracts[contractIndex],
        weeksRemaining: this.calculateWeeksRemaining(this.contracts[contractIndex], balance),
        daysRemaining: this.calculateDaysRemaining(this.contracts[contractIndex], balance)
      };
    }
  }

  /**
   * Calcule les semaines restantes basé sur le solde
   */
  private calculateWeeksRemaining(contract: ContractDto, balance: ContractBalance): number {
    if (balance.totalOutstanding <= 0) return 0;

    // Calcul basé sur le montant hebdomadaire
    if (contract.weeklyAmount > 0) {
      return Math.ceil(balance.totalOutstanding / contract.weeklyAmount);
    }

    return contract.weeksRemaining;
  }

  /**
   * Calcule les jours restants basé sur le solde
   */
  private calculateDaysRemaining(contract: ContractDto, balance: ContractBalance): number {
    const today = new Date();
    const endDate = new Date(contract.endDate);
    const diffTime = endDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Si le solde est payé, retourner 0
    if (balance.totalOutstanding <= 0) {
      return 0;
    }

    return Math.max(0, daysRemaining);
  }


  /**
   * Recalcule les montants dûs après un paiement
   */
  private recalculateAmountsAfterPayment(contractId: string, paymentAmount: number): void {
    const contractIndex = this.contracts.findIndex(c => c.id === contractId);

    if (contractIndex === -1) return;

    const contract = this.contracts[contractIndex];

    // Calculer le nouveau montant total dû
    const currentTotalDue = contract.weeksRemaining * contract.weeklyAmount;
    const newTotalDue = Math.max(0, currentTotalDue - paymentAmount);

    // Mettre à jour les semaines restantes
    const newWeeksRemaining = Math.ceil(newTotalDue / contract.weeklyAmount);

    // Mettre à jour le contrat
    this.contracts[contractIndex] = {
      ...contract,
      weeksRemaining: newWeeksRemaining,
      daysRemaining: this.calculateUpdatedDaysRemaining(contract, newWeeksRemaining)
    };

    // Mettre à jour les statistiques du dashboard
    this.updateDashboardStatsFromContracts();
  }

  /**
   * Calcule les jours restants mis à jour
   */
  private calculateUpdatedDaysRemaining(contract: ContractDto, weeksRemaining: number): number {
    if (weeksRemaining <= 0) return 0;

    const today = new Date();
    const originalEndDate = new Date(contract.endDate);

    // Si le contrat est payé en avance, ajuster la date de fin
    if (weeksRemaining < contract.weeksRemaining) {
      const daysPerWeek = 7;
      const daysReduced = (contract.weeksRemaining - weeksRemaining) * daysPerWeek;
      const newEndDate = new Date(originalEndDate);
      newEndDate.setDate(originalEndDate.getDate() - daysReduced);

      const diffTime = newEndDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Sinon, utiliser la date de fin originale
    const diffTime = originalEndDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Ferme la modal de solde détaillé et rafraîchit les données
   */
  closeBalanceModal(): void {
    this.showBalanceModal = false;
    this.selectedContract = null;
    this.contractBalance = null;

    // ✅ Rafraîchir les données après fermeture
    if (this.contracts.length > 0) {
      this.loadContracts();
    }
  }

  /**
   * Calcule le montant total dû pour un contrat
   */
  getCurrentAmountDue(contract: ContractDto): number {
    // Utiliser weeksRemaining s'il est disponible, sinon calculer
    const weeksRemaining = contract.weeksRemaining || 0;
    const weeklyAmount = contract.weeklyAmount || 0;

    return weeksRemaining * weeklyAmount;
  }

  /**
   * Formate le montant dû avec indication de statut
   */
  formatAmountDueWithStatus(contract: ContractDto): string {
    const amountDue = this.getCurrentAmountDue(contract);
    const formattedAmount = this.formatCurrency(amountDue);

    // Ajouter un indicateur si le paiement est en retard
    if (this.isPaymentOverdue(contract)) {
      return `${formattedAmount} <span class="badge bg-danger ms-2">En retard</span>`;
    }

    return formattedAmount;
  }


  /**
   * Affiche les détails du solde dans la console pour debug
   */
  private logBalanceDetails(balance: ContractBalance): void {
    console.log('📊 Détails du solde:', {
      contractNumber: balance.contractNumber,
      totalContractAmount: balance.totalContractAmount,
      totalPaid: balance.totalPaid,
      paymentsMade: balance.paymentsMade,
      totalPayments: balance.totalPayments,
      totalOutstanding: balance.totalOutstanding,
      currentWeekDue: balance.currentWeekDue
    });
  }

  /**
  * Ouvre la modal de rapport financier
  */
  openFinancialReportModal(contract: ContractDto): void {
    this.selectedContract = contract;
    this.financialReportLoading = true;
    this.showFinancialReportModal = true;

    // Charger le rapport financier
    this.contractService.getContractFinancialReport(contract.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponseData<ContractFinancialReport>) => {
          this.financialReport = response.data;
        }
      });

    // ✅ Charger l'historique des paiements
    this.contractService.getContractPayments(contract.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.financialReportLoading = false)
      )
      .subscribe({
        next: (response: ApiResponseData<PaymentRecord[]>) => {
          this.contractPayments = response.data;
        },
        error: (error) => {
          console.error('Erreur chargement historique paiements:', error);
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
      // Afficher une notification pour les erreurs de formulaire
      const errors = this.getFormErrors();
      if (errors.length > 0) {
        this.notificationService.error(
          'Formulaire incomplet',
          `Veuillez corriger les erreurs suivantes : ${errors.join(', ')}`
        );
      }
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
          if (response.success) {
            this.notificationService.success(
              'Contrat créé avec succès',
              `Contrat ${response.data.contractNumber} a été créé avec succès.`
            );
            this.closeCreateModal();
            this.loadContracts();
          } else {
            // Gérer le cas où l'API retourne success: false
            const errorMessage = this.extractErrorMessage(response);
            this.notificationService.error(
              'Échec de la création du contrat',
              errorMessage
            );
          }
        },
        error: (error) => {
          console.error('Erreur création contrat:', error);

          // Extraire le message d'erreur de manière plus précise
          const errorMessage = this.extractApiError(error);

          this.notificationService.error(
            'Erreur lors de la création du contrat',
            errorMessage
          );
        }
      });
  }

  /**
   * Extrait les erreurs de validation du formulaire
   */
  private getFormErrors(): string[] {
    const errors: string[] = [];

    if (this.cf['customerId']?.errors?.['required']) {
      errors.push('Client est requis');
    }

    if (this.cf['vehicleId']?.errors?.['required']) {
      errors.push('Véhicule est requis');
    }

    if (this.cf['startDate']?.errors?.['required']) {
      errors.push('Date de début est requise');
    }

    if (this.cf['durationInWeeks']?.errors?.['required']) {
      errors.push('Durée est requise');
    }

    if (this.cf['durationInWeeks']?.errors?.['min']) {
      errors.push('La durée doit être d\'au moins 1 semaine');
    }

    if (this.cf['durationInWeeks']?.errors?.['max']) {
      errors.push('La durée ne peut pas dépasser 52 semaines');
    }

    if (this.cf['weeklyAmount']?.errors?.['required']) {
      errors.push('Montant hebdomadaire est requis');
    }

    if (this.cf['weeklyAmount']?.errors?.['min']) {
      errors.push('Le montant hebdomadaire doit être positif');
    }

    if (this.cf['paymentDay']?.errors?.['required']) {
      errors.push('Jour de paiement est requis');
    }

    if (this.cf['paymentDay']?.errors?.['min'] || this.cf['paymentDay']?.errors?.['max']) {
      errors.push('Le jour de paiement doit être entre 1 (Lundi) et 7 (Dimanche)');
    }

    return errors;
  }

  /**
   * Extrait le message d'erreur de la réponse API
   */
  private extractErrorMessage(response: any): string {
    if (!response) {
      return 'Erreur inconnue';
    }

    // Priorité 1 : Message principal de la réponse
    if (response.message) {
      return response.message;
    }

    // Priorité 2 : Tableau d'erreurs
    if (response.errors && Array.isArray(response.errors) && response.errors.length > 0) {
      return response.errors.join(', ');
    }

    // Priorité 3 : Détails dans data
    if (response.data && typeof response.data === 'string') {
      return response.data;
    }

    // Priorité 4 : Status text
    if (response.statusText) {
      return response.statusText;
    }

    return 'Erreur lors de la création du contrat';
  }

  /**
   * Extrait les messages d'erreur de l'objet error HTTP
   */
  private extractApiError(error: any): string {
    console.log('📋 Structure de l\'erreur:', error);

    // Cas spécifique : Informations de livraison manquantes
    if (error.error && error.error.errors &&
      error.error.errors.includes('DELIVERY_INFO_MISSING')) {
      return 'Les informations de livraison sont manquantes. Le contrat doit d\'abord être activé avec les informations de livraison complètes.';
    }

    // Si c'est une erreur HTTP avec une réponse
    if (error.error) {
      // Cas 1 : Message principal
      if (error.error.message) {
        return error.error.message;
      }

      // Cas 2 : Tableau d'erreurs
      if (error.error.errors && Array.isArray(error.error.errors)) {
        return error.error.errors.join(', ');
      }

      // Cas 3 : Erreurs de validation
      if (error.error.errors && typeof error.error.errors === 'object') {
        const messages = Object.entries(error.error.errors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('; ');
        return messages;
      }

      // Cas 4 : Error simple (string)
      if (typeof error.error === 'string') {
        return error.error;
      }
    }

    // Erreurs HTTP standard
    if (error.status === 400) {
      return 'Données invalides. Veuillez vérifier les informations saisies.';
    }

    if (error.status === 401) {
      return 'Session expirée. Veuillez vous reconnecter.';
    }

    if (error.status === 403) {
      return 'Vous n\'avez pas les autorisations nécessaires.';
    }

    if (error.status >= 500) {
      return 'Erreur serveur. Veuillez réessayer plus tard.';
    }

    return error.message || 'Erreur lors de l\'opération';
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
          a.download = `CONTRAT-LOCATION.pdf`;
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

  /**
 * Calcule le total des paiements dus pour tous les contrats
 * @returns Le montant total des paiements en attente
 */
  getTotalPaymentsDue(): number {
    if (!this.contracts || this.contracts.length === 0) {
      return 0;
    }

    // Somme des weeklyAmount * weeksRemaining de chaque contrat actif
    const totalFromContracts = this.contracts
      .filter(c => c.status === ContractStatus.Active)
      .reduce((sum, contract) => {
        const weeksRemaining = contract.weeksRemaining || 0;
        const weeklyAmount = contract.weeklyAmount || 0;
        const remaining = weeksRemaining * weeklyAmount;
        return sum + remaining;
      }, 0);

    return totalFromContracts;
  }

  /**
   * Calcule le total des paiements en retard (overdue)
   * @returns Le montant total des paiements en retard
   */
  getTotalOverduePayments(): number {
    if (!this.contracts || this.contracts.length === 0) {
      return 0;
    }

    // Cette valeur sera calculée depuis le backend via getOverduePayments()
    return this.dashboardStats.totalOutstanding;
  }

  /**
   * Calcule les statistiques de paiement pour le tableau de bord
   */
  calculatePaymentStats(): void {
    if (!this.contracts || this.contracts.length === 0) {
      this.dashboardStats.totalOutstanding = 0;
      return;
    }

    // Calculer le total des soldes impayés
    this.dashboardStats.totalOutstanding = this.getTotalPaymentsDue();

    // Calculer le nombre de contrats avec paiements en retard
    const today = new Date();
    this.dashboardStats.paymentsOverdue = this.contracts.filter(contract => {
      if (contract.status !== ContractStatus.Active) {
        return false;
      }

      // Un contrat est en retard si la date de fin est passée et qu'il reste des paiements
      const endDate = new Date(contract.endDate);
      return endDate < today && (contract.weeksRemaining || 0) > 0;
    }).length;
  }

  /**
   * Obtient le montant des paiements dus pour un contrat spécifique
   * @param contractId ID du contrat
   * @returns Montant dû pour le contrat
   */
  getContractPaymentsDue(contractId: string): number {
    const contract = this.contracts.find(c => c.id === contractId);
    if (!contract) {
      return 0;
    }

    const weeksRemaining = contract.weeksRemaining || 0;
    const weeklyAmount = contract.weeklyAmount || 0;

    return weeksRemaining * weeklyAmount;
  }

  /**
   * Obtient les détails des paiements dus avec ventilation par contrat
   */
  getDetailedPaymentsDue(): Array<{
    contractId: string;
    contractReference: string;
    amountDue: number;
    daysOverdue: number;
  }> {
    if (!this.contracts || this.contracts.length === 0) {
      return [];
    }

    const today = new Date();
    const detailedPayments: Array<{
      contractId: string;
      contractReference: string;
      amountDue: number;
      daysOverdue: number;
    }> = [];

    this.contracts
      .filter(c => c.status === ContractStatus.Active)
      .forEach(contract => {
        const weeksRemaining = contract.weeksRemaining || 0;
        const weeklyAmount = contract.weeklyAmount || 0;
        const amountDue = weeksRemaining * weeklyAmount;

        if (amountDue > 0) {
          let daysOverdue = 0;

          // Calculer les jours de retard basé sur la date de fin
          const endDate = new Date(contract.endDate);
          if (endDate < today) {
            const diffTime = Math.abs(today.getTime() - endDate.getTime());
            daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }

          detailedPayments.push({
            contractId: contract.id,
            contractReference: contract.contractNumber,
            amountDue: amountDue,
            daysOverdue: daysOverdue
          });
        }
      });

    // Trier par montant dû décroissant
    return detailedPayments.sort((a, b) => b.amountDue - a.amountDue);
  }

  /**
   * Obtient le total des paiements dus pour les contrats expirant bientôt
   * @param daysThreshold Nombre de jours pour définir "bientôt" (défaut: 7)
   * @returns Montant total des paiements dus pour les contrats expirant bientôt
   */
  getTotalPaymentsDueForExpiringContracts(daysThreshold: number = 7): number {
    if (!this.contracts || this.contracts.length === 0) {
      return 0;
    }

    const today = new Date();
    let total = 0;

    this.contracts
      .filter(c => c.status === ContractStatus.Active)
      .forEach(contract => {
        const endDate = new Date(contract.endDate);
        const diffTime = endDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysRemaining > 0 && daysRemaining <= daysThreshold) {
          const weeksRemaining = contract.weeksRemaining || 0;
          const weeklyAmount = contract.weeklyAmount || 0;
          total += weeksRemaining * weeklyAmount;
        }
      });

    return total;
  }

  /**
   * Obtient le pourcentage de paiements complétés
   * @param contract Le contrat
   * @returns Pourcentage de paiements effectués (0-100)
   */
  /**
 * Calcule le pourcentage de paiements complétés
 */
  getPaymentCompletionPercentage(): number {
    if (!this.financialReport) return 0;

    const total = this.financialReport.paymentsMade + this.financialReport.paymentsMissed;
    if (total === 0) return 0;

    return Math.round((this.financialReport.paymentsMade / total) * 100);
  }

  /**
   * Obtient le prochain paiement dû pour un contrat
   * @param contract Le contrat
   * @returns Date du prochain paiement
   */
  getNextPaymentDate(contract: ContractDto): Date | null {
    if (!contract || contract.status !== ContractStatus.Active) {
      return null;
    }

    const today = new Date();
    const startDate = new Date(contract.startDate);

    // Calculer combien de semaines se sont écoulées
    const diffTime = today.getTime() - startDate.getTime();
    const weeksPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));

    // Le prochain paiement est dans 1 semaine après la dernière semaine écoulée
    const nextPayment = new Date(startDate);
    nextPayment.setDate(nextPayment.getDate() + ((weeksPassed + 1) * 7));

    return nextPayment;
  }

  /**
   * Vérifie si un paiement est en retard
   * @param contract Le contrat
   * @returns true si le paiement est en retard
   */
  isPaymentOverdue(contract: ContractDto): boolean {
    if (!contract || contract.status !== ContractStatus.Active) {
      return false;
    }

    const nextPayment = this.getNextPaymentDate(contract);
    if (!nextPayment) {
      return false;
    }

    const today = new Date();
    return nextPayment < today;
  }

  /**
   * Obtient le nombre de jours de retard pour un contrat
   * @param contract Le contrat
   * @returns Nombre de jours de retard (0 si pas de retard)
   */
  getDaysOverdue(contract: ContractDto): number {
    if (!this.isPaymentOverdue(contract)) {
      return 0;
    }

    const nextPayment = this.getNextPaymentDate(contract);
    if (!nextPayment) {
      return 0;
    }

    const today = new Date();
    const diffTime = today.getTime() - nextPayment.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Met à jour les statistiques après chargement des données
   */
  private updateDashboardStatsFromContracts(): void {
    if (!this.contracts || this.contracts.length === 0) {
      return;
    }

    // Compter les contrats par statut
    this.dashboardStats.totalContracts = this.contracts.length;
    this.dashboardStats.activeContracts = this.contracts.filter(c => c.status === ContractStatus.Active).length;
    this.dashboardStats.draftContracts = this.contracts.filter(c => c.status === ContractStatus.Draft).length;
    this.dashboardStats.pendingContracts = this.contracts.filter(c => c.status === ContractStatus.Pending).length;
    this.dashboardStats.completedContracts = this.contracts.filter(c => c.status === ContractStatus.Completed).length;
    this.dashboardStats.terminatedContracts = this.contracts.filter(c => c.status === ContractStatus.Terminated).length;

    // Calculer les statistiques de paiement
    this.calculatePaymentStats();

    // Calculer les contrats expirant bientôt
    const today = new Date();
    this.dashboardStats.contractsExpiring = this.contracts.filter(contract => {
      if (contract.status !== ContractStatus.Active) {
        return false;
      }

      const endDate = new Date(contract.endDate);
      const diffTime = endDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return daysRemaining > 0 && daysRemaining <= 7;
    }).length;
  }

  onReasonChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.rejectContractForm.patchValue({ reason: selectElement.value });
  }


  // ============================================================================
  // SECTION : PROPRIÉTÉS CALCULÉES POUR LES STATISTIQUES
  // ============================================================================

  /**
   * Calcule le taux de recouvrement (paiements reçus / montant total dû)
   */
  get recoveryRate(): number {
    const totalContractsValue = this.contracts
      .filter(c => c.status === ContractStatus.Active || c.status === ContractStatus.Completed)
      .reduce((sum, contract) => sum + contract.totalAmount, 0);

    const totalPaid = this.dashboardStats.totalOutstanding ?
      totalContractsValue - this.dashboardStats.totalOutstanding : 0;

    if (totalContractsValue === 0) return 0;
    return (totalPaid / totalContractsValue) * 100;
  }

  /**
   * Calcule la valeur totale du portefeuille de contrats actifs
   */
  get totalActiveContractsValue(): number {
    return this.contracts
      .filter(c => c.status === ContractStatus.Active)
      .reduce((sum, contract) => sum + contract.totalAmount, 0);
  }

  /**
   * Obtient le nombre total de semaines restantes pour tous les contrats actifs
   */
  get totalWeeksRemaining(): number {
    return this.contracts
      .filter(c => c.status === ContractStatus.Active)
      .reduce((sum, contract) => sum + (contract.weeksRemaining || 0), 0);
  }

  /**
   * Obtient le nombre de contrats avec des paiements en retard
   */
  get contractsWithOverduePayments(): ContractDto[] {
    return this.contracts.filter(c =>
      c.status === ContractStatus.Active && this.isPaymentOverdue(c)
    );
  }

}
