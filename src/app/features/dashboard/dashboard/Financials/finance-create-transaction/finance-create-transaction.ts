import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../../environments/environment.development';
import { NotificationComponent } from '../../../../../core/components/notification-component/notification-component';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import {
  TransactionType,
  TransactionCategory,
  PaymentMethod
} from '../../../../../core/models/Financials/Financial.models';
import { CreateTransactionRequest } from '../../../../../core/models/Financials/Financial-requests.models';
import { Auth } from '../../../../../core/services/Auth/auth';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Token } from '../../../../../core/services/Token/token';
import { Financials } from '../../../../../core/services/Financials/financials';
import { SidebarComponent } from "../../../../../core/components/sidebar-component/sidebar-component";
import { VehicleDto, VehicleSearchCriteria } from '../../../../../core/models/Vehicles/Vehicle.dtos';
import { Vehicles } from '../../../../../core/services/Vehicles/vehicles';
import { ApiResponseData } from '../../../../../core/models/Common/ApiResponseData';
import { VehicleStatus } from '../../../../../core/models/Enums/Logistiks-enums';

/**
 * Interface pour la suggestion de description
 */
interface DescriptionSuggestion {
  icon: string;
  text: string;
  category: TransactionCategory;
}

/**
 * Composant de création de transaction financière
 */
@Component({
  selector: 'app-finance-create-transaction',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NotificationComponent,
    SidebarComponent
],
  templateUrl: './finance-create-transaction.html',
  styleUrl: './finance-create-transaction.scss',
})
export class FinanceCreateTransaction implements OnInit, OnDestroy {

  // ============================================================================
// SECTION X: GESTION DES VÉHICULES
// ============================================================================

/** Liste des véhicules disponibles */
availableVehicles: VehicleDto[] = [];

/** Véhicule sélectionné */
selectedVehicle: VehicleDto | null = null;

/** Terme de recherche pour les véhicules */
vehicleSearchTerm: string = '';

/** Chargement des véhicules */
loadingVehicles: boolean = false;

/** Affichage de la liste des véhicules */
showVehicleList: boolean = false;
  // ============================================================================
  // SECTION 1: ÉNUMÉRATIONS ET TYPES
  // ============================================================================

  /** Énumérations pour les templates */
  readonly TransactionType = TransactionType;
  readonly TransactionCategory = TransactionCategory;
  readonly PaymentMethod = PaymentMethod;
  readonly Math = Math;

  // ============================================================================
  // SECTION 2: FORMULAIRE ET VALIDATION
  // ============================================================================

  /** Formulaire de création de transaction */
  transactionForm!: FormGroup;

  /** Indicateur de soumission */
  isSubmitting: boolean = false;

  /** Étape actuelle du formulaire (pour formulaire en plusieurs étapes) */
  currentStep: number = 1;

  /** Nombre total d'étapes */
  totalSteps: number = 3;

  // ============================================================================
  // SECTION 3: SUGGESTIONS ET AIDE
  // ============================================================================

  /** Suggestions de descriptions selon la catégorie */
descriptionSuggestions: DescriptionSuggestion[] = [
    // Revenus (1-100)
    { icon: 'bx-car', text: 'Paiement location véhicule', category: TransactionCategory.RentalIncome }, // 1
    { icon: 'bx-money', text: 'Remboursement caution', category: TransactionCategory.OtherIncome }, // 4 (Deposit n'existe plus, remplacé par OtherIncome)

    // Dépenses (101-109)
    { icon: 'bx-gas-pump', text: 'Achat carburant', category: TransactionCategory.Fuel }, // 102
    { icon: 'bx-wrench', text: 'Réparation et entretien', category: TransactionCategory.Maintenance }, // 101
    { icon: 'bx-shield-alt-2', text: 'Paiement assurance', category: TransactionCategory.Insurance }, // 103
    { icon: 'bx-receipt', text: 'Paiement taxe', category: TransactionCategory.Taxes }, // 104 (corrigé de Tax à Taxes)
    { icon: 'bx-user', text: 'Salaire employé', category: TransactionCategory.Salary }, // 105
    { icon: 'bx-cog', text: 'Frais administratifs', category: TransactionCategory.OtherExpense } // 109 (Service n'existe plus, remplacé par OtherExpense)
];


  /** Suggestions filtrées selon le type et la catégorie sélectionnés */
  filteredSuggestions: DescriptionSuggestion[] = [];

  // ============================================================================
  // SECTION 4: CALCULS ET APERÇU
  // ============================================================================

  /** Aperçu du montant formaté */
  formattedAmountPreview: string = '0 FCFA';

  /** Estimation de l'impact sur le solde */
  balanceImpact: number = 0;

  /** Pourcentage du montant par rapport au budget mensuel (simulation) */
  budgetPercentage: number = 0;

  // ============================================================================
  // SECTION 5: GESTION UTILISATEUR
  // ============================================================================

  /** Utilisateur actuellement connecté */
  currentUser: User | null = null;

  /** Nom d'affichage de l'utilisateur */
  userName: string = 'Utilisateur';

  /** URL de la photo de profil de l'utilisateur */
  userPhotoUrl: string = '';

  /** Contrôle l'affichage du menu utilisateur */
  showUserMenu: boolean = false;

  // ============================================================================
  // SECTION 6: INTERFACE UTILISATEUR
  // ============================================================================

  /** État de réduction de la barre latérale */
  isSidebarCollapsed: boolean = false;

  /** Affichage du modal de confirmation */
  showConfirmModal: boolean = false;

  /** Affichage du panneau d'aide */
  showHelpPanel: boolean = false;

  /** Affichage des suggestions de description */
  showSuggestions: boolean = false;

  // ============================================================================
  // SECTION 7: GESTION DES SUBSCRIPTIONS
  // ============================================================================

  /** Subject pour la gestion de la destruction des observables */
  private destroy$ = new Subject<void>();

  // ============================================================================
  // SECTION 8: CONSTRUCTEUR ET INJECTION DE DÉPENDANCES
  // ============================================================================

  constructor(
    private formBuilder: FormBuilder,
    private financialService: Financials,
    private notificationService: NotificationService,
    private authService: Auth,
    private vehiclesService: Vehicles,
    private tokenService: Token,
    private router: Router
  ) {
    this.initializeForm();
  }

  // ============================================================================
  // SECTION 9: LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Initialise le composant
   */
  ngOnInit(): void {
    this.checkAuthentication();
    this.loadCurrentUser();
    this.loadAvailableVehicles();
    this.setupFormListeners();
  }

  /**
   * Nettoie les ressources à la destruction du composant
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
// SECTION X: CHARGEMENT DES VÉHICULES
// ============================================================================

/**
 * Charge les véhicules disponibles
 */
loadAvailableVehicles(searchTerm: string = ''): void {
  this.loadingVehicles = true;

  const criteria: VehicleSearchCriteria = {
    searchTerm: searchTerm,
    status: undefined, // On peut charger tous les véhicules
    page: 1,
    pageSize: 50,
    sortBy: 'plateNumber',
    sortDescending: false
  };

  this.vehiclesService.searchVehicles(criteria)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: ApiResponseData<VehicleDto[]>) => {
        if (response.success && response.data) {
          this.availableVehicles = response.data;
        }
        this.loadingVehicles = false;
      },
      error: (error) => {
        console.error('❌ Erreur chargement véhicules:', error);
        this.loadingVehicles = false;
        this.notificationService.error(
          'Erreur lors du chargement des véhicules',
          'Erreur'
        );
      }
    });
}

/**
 * Sélectionne un véhicule
 */
selectVehicle(vehicle: VehicleDto): void {
  this.selectedVehicle = vehicle;
  this.vehicleSearchTerm = `${vehicle.plateNumber} - ${vehicle.brand} ${vehicle.model}`;

  // Mettre à jour le formulaire avec les IDs de liaison
  this.transactionForm.patchValue({
    relatedId: vehicle.id,
    relatedType: 'Vehicle'
  });

  this.showVehicleList = false;
}

/**
 * Efface la sélection du véhicule
 */
clearVehicleSelection(): void {
  this.selectedVehicle = null;
  this.vehicleSearchTerm = '';
  this.transactionForm.patchValue({
    relatedId: '',
    relatedType: ''
  });
}

/**
 * Gère la recherche de véhicules
 */
onVehicleSearchChange(term: string): void {
  this.vehicleSearchTerm = term;
  if (term.length >= 2) {
    this.loadAvailableVehicles(term);
    this.showVehicleList = true;
  } else {
    this.availableVehicles = [];
    this.showVehicleList = false;
  }
}

/**
 * Formate l'affichage du statut du véhicule
 */
getVehicleStatusLabel(status: VehicleStatus): string {
  const statusMap: { [key: number]: string } = {
    [VehicleStatus.Available]: 'Disponible',
    [VehicleStatus.Rented]: 'Loué',
    [VehicleStatus.Maintenance]: 'Maintenance',
    [VehicleStatus.Reserved]: 'Réservé',
    [VehicleStatus.OutOfService]: 'Hors service'
  };
  return statusMap[status] || 'Inconnu';
}

/**
 * Obtient la classe CSS du badge de statut
 */
getVehicleStatusClass(status: VehicleStatus): string {
  const classMap: { [key: number]: string } = {
    [VehicleStatus.Available]: 'badge-success',
    [VehicleStatus.Rented]: 'badge-primary',
    [VehicleStatus.Maintenance]: 'badge-warning',
    [VehicleStatus.Reserved]: 'badge-info',
    [VehicleStatus.OutOfService]: 'badge-danger'
  };
  return classMap[status] || 'badge-secondary';
}

  // ============================================================================
  // SECTION 10: INITIALISATION DU FORMULAIRE
  // ============================================================================

  /**
   * Initialise le formulaire de transaction
   */
 initializeForm(): void {
  const today = new Date().toISOString().split('T')[0];
  this.transactionForm = this.formBuilder.group({
    type:          [TransactionType.Expense, Validators.required],
    category:      [TransactionCategory.OtherExpense, Validators.required], // 109
    amount:        [0, [Validators.required, Validators.min(0.01)]],
    date:          [today, Validators.required],
    paymentMethod: [PaymentMethod.Cash, Validators.required],
    description:   ['', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]],
    reference:     ['', Validators.maxLength(100)],
    relatedId:     [''],
    relatedType:   [''],
    notes:         ['', Validators.maxLength(1000)]
  });
}

  /**
   * Configure les écouteurs de changement du formulaire
   */
  private setupFormListeners(): void {
  this.transactionForm.get('amount')?.valueChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe(amount => {
      this.updateAmountPreview(amount);
      this.calculateBalanceImpact(amount);
    });

  // ✅ Reset catégorie quand le type change
  this.transactionForm.get('type')?.valueChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe(type => {
      const defaultCategory = type === TransactionType.Revenue
          ? TransactionCategory.RentalIncome
          : TransactionCategory.OtherExpense;
      this.transactionForm.patchValue({ category: defaultCategory }, { emitEvent: false });

      const amount = this.transactionForm.get('amount')?.value || 0;
      this.calculateBalanceImpact(amount);
    });

  this.transactionForm.get('category')?.valueChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe(category => this.filterDescriptionSuggestions(category));
}

  // ============================================================================
  // SECTION 11: GESTION DES ÉTAPES
  // ============================================================================

  /**
   * Passe à l'étape suivante
   */
  nextStep(): void {
    if (this.canProceedToNextStep()) {
      this.currentStep++;
      this.scrollToTop();
    } else {
      this.notificationService.warning(
        'Veuillez remplir tous les champs requis avant de continuer',
        'Champs requis'
      );
      this.markCurrentStepAsTouched();
    }
  }

  /**
   * Retourne à l'étape précédente
   */
  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.scrollToTop();
    }
  }

  /**
   * Vérifie si on peut passer à l'étape suivante
   */
  private canProceedToNextStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.transactionForm.get('type')?.valid === true &&
          this.transactionForm.get('category')?.valid === true;
      case 2:
        return this.transactionForm.get('amount')?.valid === true &&
          this.transactionForm.get('date')?.valid === true &&
          this.transactionForm.get('paymentMethod')?.valid === true;
      case 3:
        return this.transactionForm.get('description')?.valid === true;
      default:
        return false;
    }
  }

  /**
   * Marque les champs de l'étape actuelle comme touchés
   */
  private markCurrentStepAsTouched(): void {
    let fieldsToMark: string[] = [];

    switch (this.currentStep) {
      case 1:
        fieldsToMark = ['type', 'category'];
        break;
      case 2:
        fieldsToMark = ['amount', 'date', 'paymentMethod'];
        break;
      case 3:
        fieldsToMark = ['description'];
        break;
    }

    fieldsToMark.forEach(field => {
      this.transactionForm.get(field)?.markAsTouched();
    });
  }

  /**
   * Fait défiler vers le haut de la page
   */
  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ============================================================================
  // SECTION 12: SUGGESTIONS DE DESCRIPTION
  // ============================================================================

  /**
   * Filtre les suggestions selon la catégorie sélectionnée
   */
  private filterDescriptionSuggestions(category: TransactionCategory): void {
    this.filteredSuggestions = this.descriptionSuggestions.filter(
      s => s.category === category
    );
  }

  /**
   * Applique une suggestion de description
   */
  applySuggestion(suggestion: DescriptionSuggestion): void {
    this.transactionForm.patchValue({
      description: suggestion.text
    });
    this.showSuggestions = false;
  }

  /**
   * Bascule l'affichage des suggestions
   */
  toggleSuggestions(): void {
    this.showSuggestions = !this.showSuggestions;
    if (this.showSuggestions) {
      const category = this.transactionForm.get('category')?.value;
      this.filterDescriptionSuggestions(category);
    }
  }

  // ============================================================================
  // SECTION 13: CALCULS ET APERÇU
  // ============================================================================

  /**
   * Met à jour l'aperçu du montant
   */
  private updateAmountPreview(amount: number): void {
    if (amount && amount > 0) {
      this.formattedAmountPreview = this.financialService.formatAmount(amount);
    } else {
      this.formattedAmountPreview = '0 FCFA';
    }
  }

  /**
   * Calcule l'impact sur le solde
   */
  private calculateBalanceImpact(amount: number): void {
    const type = this.transactionForm.get('type')?.value;
    this.balanceImpact = type === TransactionType.Revenue ? amount : -amount;

    // Simulation du pourcentage du budget (à adapter selon vos besoins)
    const monthlyBudget = 1000000; // 1M FCFA par exemple
    this.budgetPercentage = (Math.abs(amount) / monthlyBudget) * 100;
  }

  /**
   * Obtient la classe CSS pour l'impact sur le solde
   */
  getBalanceImpactClass(): string {
    if (this.balanceImpact > 0) return 'text-success';
    if (this.balanceImpact < 0) return 'text-danger';
    return 'text-muted';
  }

  /**
   * Obtient l'icône pour l'impact sur le solde
   */
  getBalanceImpactIcon(): string {
    if (this.balanceImpact > 0) return 'bx-trending-up';
    if (this.balanceImpact < 0) return 'bx-trending-down';
    return 'bx-minus';
  }

  // ============================================================================
  // SECTION 14: SOUMISSION DU FORMULAIRE
  // ============================================================================

  /**
 * Ouvre le modal de confirmation
 */
  openConfirmModal(): void {
    this.showConfirmModal = true;
    document.body.classList.add('modal-open');

    // Ajouter un écouteur pour la touche Echap
    document.addEventListener('keydown', this.handleEscapeKey.bind(this));
  }


  /**
   * Gère la touche Echap pour fermer le modal
   */
  private handleEscapeKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeConfirmModal();
    }
  }

  /**
   * Ferme le modal de confirmation
   */
  closeConfirmModal(): void {
    this.showConfirmModal = false;
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', this.handleEscapeKey.bind(this));
  }

  /**
   * Soumet le formulaire après confirmation
   */
  submitTransaction(): void {
    if (this.transactionForm.invalid || this.isSubmitting) {
      console.warn('⚠️ Formulaire invalide ou déjà en soumission');
      if (this.transactionForm.invalid) {
        Object.keys(this.transactionForm.controls).forEach(key => {
          const control = this.transactionForm.get(key);
          if (control?.invalid) {
          }
        });
      }
      return;
    }

    this.isSubmitting = true;
    this.closeConfirmModal();

    const formValue = this.transactionForm.value;

    const request: CreateTransactionRequest = {
      type: formValue.type,
      category: formValue.category,
      amount: formValue.amount,
      date: new Date(formValue.date),
      description: formValue.description,
      paymentMethod: formValue.paymentMethod,
      reference: formValue.reference || undefined,
      relatedId: this.selectedVehicle?.id || undefined,
      relatedType: this.selectedVehicle ? 'Vehicle' : undefined
    };

    this.financialService
      .createTransaction(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success(
              'La transaction a été créée avec succès',
              'Transaction créée'
            );
            this.resetForm();
            // Rediriger vers la liste des transactions après 2 secondes
            setTimeout(() => {
              this.router.navigate(['/dashboard/finances/transactions']);
            }, 2000);
          } else {
            console.warn('⚠️ Réponse avec success=false:', response);
            this.notificationService.warning(
              response.message || 'La transaction n\'a pas pu être créée',
              'Attention'
            );
          }
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('❌ Erreur création transaction:', error);
          console.error('📊 Détails de l\'erreur:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error
          });

          let errorMessage = 'Une erreur est survenue lors de la création de la transaction';

          // Extraire le message d'erreur selon le format
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.error?.errors) {
            errorMessage = Object.values(error.error.errors).flat().join(', ');
          } else if (error.message) {
            errorMessage = error.message;
          }

          this.notificationService.error(
            errorMessage,
            'Erreur de création'
          );
          this.isSubmitting = false;
        }
      });
  }

  /**
   * Réinitialise le formulaire
   */
  resetForm(): void {
    const today = new Date().toISOString().split('T')[0];
    this.transactionForm.reset({
      type: TransactionType.Expense,
      category: TransactionCategory.OtherExpense,
      amount: 0,
      date: today,
      paymentMethod: PaymentMethod.Cash
    });
    this.currentStep = 1;
    this.formattedAmountPreview = '0 FCFA';
    this.balanceImpact = 0;
    this.budgetPercentage = 0;
  }

  /**
   * Annule et retourne à la liste
   */
  cancelAndGoBack(): void {
    if (this.hasUnsavedChanges()) {
      if (confirm('Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?')) {
        this.router.navigate(['/dashboard/finances/transactions']);
      }
    } else {
      this.router.navigate(['/dashboard/finances/transactions']);
    }
  }

  /**
   * Vérifie s'il y a des modifications non enregistrées
   */
  private hasUnsavedChanges(): boolean {
    const formValue = this.transactionForm.value;
    return formValue.amount > 0 ||
      (formValue.description && formValue.description.trim().length > 0) ||
      (formValue.reference && formValue.reference.trim().length > 0);
  }

  // ============================================================================
  // SECTION 15: MÉTHODES UTILITAIRES
  // ============================================================================

  /**
   * Marque tous les champs d'un FormGroup comme touchés
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Obtient le nom de la catégorie
   */
  getCategoryName(category: TransactionCategory): string {
    return this.financialService.getCategoryName(category);
  }

  /**
   * Obtient l'icône de la catégorie
   */
  getCategoryIcon(category: TransactionCategory): string {
    return this.financialService.getCategoryIcon(category);
  }

  /**
   * Formate un montant
   */
  formatAmount(amount: number): string {
    return this.financialService.formatAmount(amount);
  }

  /**
   * Obtient le label du type
   */
  getTypeLabel(type: TransactionType): string {
    return type === TransactionType.Revenue ? 'Revenu' : 'Dépense';
  }

  /**
   * Obtient la classe CSS pour le type
   */
  getTypeClass(type: TransactionType): string {
    return type === TransactionType.Revenue ? 'badge-success' : 'badge-danger';
  }

  /**
   * Obtient le nom de la méthode de paiement
   */
  getPaymentMethodName(method: PaymentMethod): string {
    const methods: { [key: number]: string } = {
      [PaymentMethod.Cash]: 'Espèces',
      [PaymentMethod.BankTransfer]: 'Virement bancaire',
      [PaymentMethod.Check]: 'Chèque',
      [PaymentMethod.MobileMoney]: 'Mobile Money'
    };
    return methods[method] || 'Autre';
  }

  // ============================================================================
  // SECTION 16: AUTHENTIFICATION ET UTILISATEUR
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
        }
      });
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
    this.userPhotoUrl = this.generateAvatarUrl({
      firstName: 'Utilisateur'
    } as User);
  }

  /**
   * Formate le nom d'utilisateur pour l'affichage
   */
  formatUserName(user: User): string {
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
    const colors = [
      'FF6B6B',
      '4ECDC4',
      'FFD166',
      '06D6A0',
      '118AB2',
      'EF476F',
      '7209B7',
      '3A86FF'
    ];
    const colorIndex = name.length % colors.length;

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=${colors[colorIndex]}&color=fff&size=128`;
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

  // ============================================================================
  // SECTION 17: INTERFACE UTILISATEUR
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
    if (
      !target.closest('.dropdown-toggle') &&
      !target.closest('.dropdown-menu')
    ) {
      this.showUserMenu = false;
    }
  }

  /**
   * Bascule l'état de réduction de la barre latérale
   */
  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  /**
   * Bascule l'état d'ouverture d'un menu
   */
  toggleMenu(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    if (element && element.parentElement) {
      element.parentElement.classList.toggle('open');
    }
  }

  /**
   * Bascule l'affichage du panneau d'aide
   */
  toggleHelpPanel(): void {
    this.showHelpPanel = !this.showHelpPanel;
  }




  // ============================================================================
  // SECTION 18: DÉCONNEXION
  // ============================================================================

  /**
   * Gère le processus de déconnexion
   */
  logout(): void {
    this.tokenService.logout();

    this.authService
      .logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['/auth/login']);
        },
        error: (error) => {
          console.warn('⚠️ Erreur API déconnexion (ignorée):', error);
          this.router.navigate(['/auth/login']);
        }
      });
  }
}
