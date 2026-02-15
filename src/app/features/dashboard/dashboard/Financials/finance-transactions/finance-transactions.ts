import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../../environments/environment.development';
import { NotificationComponent } from '../../../../../core/components/notification-component/notification-component';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import {
  TransactionType,
  TransactionCategory,
  PaymentMethod
} from '../../../../../core/models/Financials/Financial.models';
import { FinancialTransaction } from '../../../../../core/models/Financials/Financial.models';
import { CreateTransactionRequest } from '../../../../../core/models/Financials/Financial-requests.models';
import { Auth } from '../../../../../core/services/Auth/auth';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Token } from '../../../../../core/services/Token/token';
import { Financials } from '../../../../../core/services/Financials/financials';
import { SidebarComponent } from "../../../../../core/components/sidebar-component/sidebar-component";

/**
 * Interface pour les filtres de transaction
 */
interface TransactionFilters {
  type?: TransactionType;
  category?: TransactionCategory;
  paymentMethod?: PaymentMethod;
  verified?: boolean;
  searchTerm?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Interface pour la pagination
 */
interface Pagination {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Interface pour le tri
 */
interface SortConfig {
  column: string;
  ascending: boolean;
}

/**
 * Composant de gestion des transactions financières
 */
@Component({
  selector: 'app-finance-transactions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NotificationComponent,
    SidebarComponent
],
  templateUrl: './finance-transactions.html',
  styleUrl: './finance-transactions.scss',
})
export class FinanceTransactions implements OnInit, OnDestroy {
  // ============================================================================
  // SECTION 1: ÉNUMÉRATIONS ET TYPES
  // ============================================================================

  /** Énumérations pour les templates */
  readonly TransactionType = TransactionType;
  readonly TransactionCategory = TransactionCategory;
  readonly PaymentMethod = PaymentMethod;
  readonly Math = Math;

  // ============================================================================
  // SECTION 2: DONNÉES DES TRANSACTIONS
  // ============================================================================

  /** Liste complète des transactions */
  allTransactions: FinancialTransaction[] = [];

  /** Transactions filtrées et paginées */
  displayedTransactions: FinancialTransaction[] = [];

  /** Transaction sélectionnée pour affichage/édition */
  selectedTransaction: FinancialTransaction | null = null;

  /** Indicateur de chargement */
  isLoading: boolean = false;

  /** Indicateur de soumission */
  isSubmitting: boolean = false;

  // ============================================================================
  // SECTION 3: STATISTIQUES ET DASHBOARD
  // ============================================================================

  /** Statistiques du tableau de bord */
  dashboardStats = {
    totalTransactions: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    verifiedTransactions: 0,
    unverifiedTransactions: 0,
    recentTransactions: 0
  };

  /** Répartition par catégorie */
  categoryBreakdown: Map<string, number> = new Map();

  // ============================================================================
  // SECTION 4: FILTRES ET RECHERCHE
  // ============================================================================

  /** Filtres actifs */
  filters: TransactionFilters = {
    startDate: this.getFirstDayOfMonth(),
    endDate: new Date()
  };

  /** Terme de recherche */
  searchTerm: string = '';

  /** Subject pour le debounce de recherche */
  private searchSubject = new Subject<string>();

  // ============================================================================
  // SECTION 5: PAGINATION
  // ============================================================================

  /** Configuration de pagination */
  pagination: Pagination = {
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1
  };

  /** Pages visibles dans la pagination */
  visiblePages: number[] = [];

  /** Options de taille de page */
  pageSizeOptions: number[] = [5, 10, 25, 50, 100];

  // ============================================================================
  // SECTION 6: TRI
  // ============================================================================

  /** Configuration du tri */
  sortConfig: SortConfig = {
    column: 'date',
    ascending: false
  };

  // ============================================================================
  // SECTION 7: FORMULAIRES
  // ============================================================================

  /** Formulaire de création/édition de transaction */
  transactionForm!: FormGroup;

  /** Mode du formulaire (create ou edit) */
  formMode: 'create' | 'edit' = 'create';

  /** Affichage du modal de formulaire */
  showFormModal: boolean = false;

  // ============================================================================
  // SECTION 8: GESTION UTILISATEUR
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
  // SECTION 9: INTERFACE UTILISATEUR
  // ============================================================================

  /** État de réduction de la barre latérale */
  isSidebarCollapsed: boolean = false;

  /** Affichage du modal de détails */
  showDetailsModal: boolean = false;

  /** Affichage du modal de confirmation de suppression */
  showDeleteModal: boolean = false;

  /** Transaction à supprimer */
  transactionToDelete: FinancialTransaction | null = null;

  // ============================================================================
  // SECTION 10: GESTION DES SUBSCRIPTIONS
  // ============================================================================

  /** Subject pour la gestion de la destruction des observables */
  private destroy$ = new Subject<void>();

  // ============================================================================
  // SECTION 11: CONSTRUCTEUR ET INJECTION DE DÉPENDANCES
  // ============================================================================

  constructor(
    private formBuilder: FormBuilder,
    private financialService: Financials,
    private notificationService: NotificationService,
    private authService: Auth,
    private tokenService: Token,
    private router: Router
  ) {
    this.initializeForm();
  }

  // ============================================================================
  // SECTION 12: LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Initialise le composant
   */
  ngOnInit(): void {
    this.checkAuthentication();
    this.loadCurrentUser();
    this.loadTransactions();
    this.setupSearchDebounce();
  }

  /**
   * Nettoie les ressources à la destruction du composant
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }



  /**
 * Obtient l'avatar par défaut
 * @returns URL de l'avatar par défaut
 */
  getDefaultAvatar(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=696cff&color=fff&size=128`;
  }

  // ============================================================================
  // SECTION 13: INITIALISATION
  // ============================================================================

  /**
   * Initialise le formulaire de transaction
   */
  private initializeForm(): void {
    this.transactionForm = this.formBuilder.group({
      type: [TransactionType.Expense, Validators.required],
      category: [TransactionCategory.Other, Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      description: ['', [Validators.required, Validators.minLength(3)]],
      paymentMethod: [PaymentMethod.Cash, Validators.required],
      reference: [''],
      relatedId: [''],
      relatedType: ['']
    });
  }

  /**
   * Configure le debounce pour la recherche
   */
  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm) => {
        this.filters.searchTerm = searchTerm;
        this.applyFiltersAndSort();
      });
  }

  // ============================================================================
  // SECTION 14: CHARGEMENT DES DONNÉES
  // ============================================================================

  /**
   * Met à jour les statistiques du dashboard
   */
  private updateDashboardStats(): void {
    // Revenus totaux
    this.dashboardStats.totalRevenue = this.allTransactions
      .filter(t => t.type === TransactionType.Revenue)
      .reduce((sum, t) => sum + t.amount, 0);

    // Dépenses totales
    this.dashboardStats.totalExpenses = this.allTransactions
      .filter(t => t.type === TransactionType.Expense)
      .reduce((sum, t) => sum + t.amount, 0);

    // Profit net
    this.dashboardStats.netProfit =
      this.dashboardStats.totalRevenue - this.dashboardStats.totalExpenses;

    // Nombre total de transactions
    this.dashboardStats.totalTransactions = this.allTransactions.length;

    // Transactions récentes (7 derniers jours)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    this.dashboardStats.recentTransactions = this.allTransactions
      .filter(t => new Date(t.date) >= oneWeekAgo)
      .length;

    // Transactions vérifiées
    this.dashboardStats.verifiedTransactions = this.allTransactions
      .filter(t => t.verifiedBy && t.verifiedAt)
      .length;

    this.dashboardStats.unverifiedTransactions =
      this.dashboardStats.totalTransactions - this.dashboardStats.verifiedTransactions;

    // Marge bénéficiaire
    this.dashboardStats.profitMargin = this.dashboardStats.totalRevenue > 0
      ? (this.dashboardStats.netProfit / this.dashboardStats.totalRevenue) * 100
      : 0;
  }



  /**
   * Charge les transactions depuis l'API
   */
  loadTransactions(): void {
    this.isLoading = true;

    this.financialService
      .getTransactionsByPeriod(this.filters.startDate!, this.filters.endDate!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.allTransactions = response.data;
            this.applyFiltersAndSort();
            this.updateDashboardStats(); // ✅ AJOUTER CETTE LIGNE
          }
          this.isLoading = false;
        },
        error: (error) => {
          // ... gestion erreur
          this.isLoading = false;
        }
      });
  }

  /**
   * Recharge les transactions
   */
  refreshTransactions(): void {
    this.loadTransactions();
  }


  // ============================================================================
  // SECTION 16: FILTRAGE ET TRI
  // ============================================================================

  /**
   * Applique les filtres et le tri sur les transactions
   */
  applyFiltersAndSort(): void {
    let filtered = [...this.allTransactions];

    // Filtre par type
    if (this.filters.type !== undefined) {
      filtered = filtered.filter((t) => t.type === this.filters.type);
    }

    // Filtre par catégorie
    if (this.filters.category !== undefined) {
      filtered = filtered.filter((t) => t.category === this.filters.category);
    }

    // Filtre par méthode de paiement
    if (this.filters.paymentMethod !== undefined) {
      filtered = filtered.filter(
        (t) => t.paymentMethod === this.filters.paymentMethod
      );
    }

    // Filtre par statut de vérification
    if (this.filters.verified !== undefined) {
      filtered = filtered.filter((t) => {
        const isVerified = !!(t.verifiedBy && t.verifiedAt);
        return this.filters.verified ? isVerified : !isVerified;
      });
    }

    // Filtre par terme de recherche
    if (this.filters.searchTerm && this.filters.searchTerm.trim()) {
      const term = this.filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (t) =>
          t.description.toLowerCase().includes(term) ||
          t.transactionNumber.toLowerCase().includes(term) ||
          (t.reference && t.reference.toLowerCase().includes(term))
      );
    }

    // Applique le tri
    filtered = this.sortTransactions(filtered);

    // Met à jour la pagination
    this.pagination.totalItems = filtered.length;
    this.pagination.totalPages = Math.ceil(
      this.pagination.totalItems / this.pagination.pageSize
    );

    // Assure que la page courante est valide
    if (this.pagination.currentPage > this.pagination.totalPages) {
      this.pagination.currentPage = Math.max(1, this.pagination.totalPages);
    }

    // Applique la pagination
    const startIndex =
      (this.pagination.currentPage - 1) * this.pagination.pageSize;
    const endIndex = startIndex + this.pagination.pageSize;
    this.displayedTransactions = filtered.slice(startIndex, endIndex);

    // Calcule les pages visibles
    this.calculateVisiblePages();
  }

  /**
   * Trie les transactions selon la configuration
   */
  private sortTransactions(
    transactions: FinancialTransaction[]
  ): FinancialTransaction[] {
    return transactions.sort((a, b) => {
      let comparison = 0;

      switch (this.sortConfig.column) {
        case 'date':
          comparison =
            new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'type':
          comparison = a.type - b.type;
          break;
        case 'category':
          comparison = a.category - b.category;
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        case 'verified':
          const aVerified = !!(a.verifiedBy && a.verifiedAt);
          const bVerified = !!(b.verifiedBy && b.verifiedAt);
          comparison = Number(aVerified) - Number(bVerified);
          break;
        default:
          comparison = 0;
      }

      return this.sortConfig.ascending ? comparison : -comparison;
    });
  }

  /**
   * Change la colonne de tri
   */
  sortBy(column: string): void {
    if (this.sortConfig.column === column) {
      this.sortConfig.ascending = !this.sortConfig.ascending;
    } else {
      this.sortConfig.column = column;
      this.sortConfig.ascending = true;
    }
    this.applyFiltersAndSort();
  }

  /**
   * Obtient l'icône de tri pour une colonne
   */
  getSortIcon(column: string): string {
    if (this.sortConfig.column !== column) {
      return 'bx-sort';
    }
    return this.sortConfig.ascending ? 'bx-sort-up' : 'bx-sort-down';
  }

  // ============================================================================
  // SECTION 17: GESTION DES FILTRES
  // ============================================================================

  /**
   * Réinitialise tous les filtres
   */
  resetFilters(): void {
    this.filters = {
      startDate: this.getFirstDayOfMonth(),
      endDate: new Date()
    };
    this.searchTerm = '';
    this.applyFiltersAndSort();
  }

  /**
   * Change le filtre de type
   */
  filterByType(type?: TransactionType): void {
    this.filters.type = type;
    this.pagination.currentPage = 1;
    this.applyFiltersAndSort();
  }

  /**
   * Change le filtre de catégorie
   */
  filterByCategory(category?: TransactionCategory): void {
    this.filters.category = category;
    this.pagination.currentPage = 1;
    this.applyFiltersAndSort();
  }

  /**
   * Change le filtre de vérification
   */
  filterByVerified(verified?: boolean): void {
    this.filters.verified = verified;
    this.pagination.currentPage = 1;
    this.applyFiltersAndSort();
  }

  /**
   * Gère le changement de terme de recherche
   */
  onSearchChange(term: string): void {
    this.searchSubject.next(term);
  }

  /**
   * Change la période de filtrage
   */
  changePeriod(startDate: Date, endDate: Date): void {
    this.filters.startDate = startDate;
    this.filters.endDate = endDate;
    this.loadTransactions();
  }

  // ============================================================================
  // SECTION 18: PAGINATION
  // ============================================================================

  /**
   * Change la page courante
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages) {
      this.pagination.currentPage = page;
      this.applyFiltersAndSort();
    }
  }

  /**
   * Page précédente
   */
  previousPage(): void {
    this.goToPage(this.pagination.currentPage - 1);
  }

  /**
   * Page suivante
   */
  nextPage(): void {
    this.goToPage(this.pagination.currentPage + 1);
  }

  /**
   * Change la taille de page
   */
  changePageSize(size: number): void {
    this.pagination.pageSize = size;
    this.pagination.currentPage = 1;
    this.applyFiltersAndSort();
  }

  /**
   * Calcule les pages visibles pour la pagination
   */
  private calculateVisiblePages(): void {
    const maxVisible = 5;
    const total = this.pagination.totalPages;
    const current = this.pagination.currentPage;

    if (total <= maxVisible) {
      this.visiblePages = Array.from({ length: total }, (_, i) => i + 1);
      return;
    }

    const pages: number[] = [];
    const half = Math.floor(maxVisible / 2);

    let start = Math.max(1, current - half);
    let end = Math.min(total, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    this.visiblePages = pages;
  }

  // ============================================================================
  // SECTION 19: CRUD TRANSACTIONS
  // ============================================================================

  /**
   * Ouvre le modal de création de transaction
   */
  openCreateModal(): void {
    this.formMode = 'create';
    this.transactionForm.reset({
      type: TransactionType.Expense,
      category: TransactionCategory.Other,
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: PaymentMethod.Cash
    });
    this.showFormModal = true;
  }

  /**
   * Ouvre le modal d'édition de transaction
   */
  openEditModal(transaction: FinancialTransaction): void {
    this.formMode = 'edit';
    this.selectedTransaction = transaction;

    this.transactionForm.patchValue({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      date: new Date(transaction.date).toISOString().split('T')[0],
      description: transaction.description,
      paymentMethod: transaction.paymentMethod,
      reference: transaction.reference || '',
      relatedId: transaction.relatedId || '',
      relatedType: transaction.relatedType || ''
    });

    this.showFormModal = true;
  }

  /**
   * Soumet le formulaire de transaction
   */
  submitTransactionForm(): void {
    if (this.transactionForm.invalid) {
      this.markFormGroupTouched(this.transactionForm);
      this.notificationService.error('Veuillez remplir tous les champs requis', 'Formulaire invalide');
      return;
    }

    this.isSubmitting = true;

    const formValue = this.transactionForm.value;
    const request: CreateTransactionRequest = {
      type: formValue.type,
      category: formValue.category,
      amount: formValue.amount,
      date: new Date(formValue.date),
      description: formValue.description,
      paymentMethod: formValue.paymentMethod,
      reference: formValue.reference || undefined,
      relatedId: formValue.relatedId || undefined,
      relatedType: formValue.relatedType || undefined
    };

    if (this.formMode === 'create') {
      this.createTransaction(request);
    } else if (this.selectedTransaction) {

    }
  }

  /**
   * Crée une nouvelle transaction
   */
  private createTransaction(request: CreateTransactionRequest): void {
    this.financialService
      .createTransaction(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; }) => {
          if (response.success) {
            this.notificationService.success('Transaction créée avec succès', 'Transaction créée');
            this.closeFormModal();
            this.loadTransactions();
          }
          this.isSubmitting = false;
        },
        error: (error: { message: any; }) => {
          console.error('Erreur création transaction:', error);
          this.notificationService.error(
            error.message || 'Erreur lors de la création de la transaction', 'Erreur de création'
          );
          this.isSubmitting = false;
        }
      });
  }

  /**
   * Ouvre le modal de confirmation de suppression
   */
  confirmDelete(transaction: FinancialTransaction): void {
    this.transactionToDelete = transaction;
    this.showDeleteModal = true;
  }

  /**
   * Vérifie une transaction
   */
  verifyTransaction(transaction: FinancialTransaction): void {
    this.financialService
      .verifyTransaction(transaction.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; }) => {
          if (response.success) {
            this.notificationService.success('Transaction vérifiée avec succès', 'Transaction vérifiée');
            this.loadTransactions();
          }
        },
        error: (error: { message: any; }) => {
          console.error('Erreur vérification transaction:', error);
          this.notificationService.error(
            error.message || 'Erreur lors de la vérification de la transaction', 'Erreur de vérification'
          );
        }
      });
  }

  // ============================================================================
  // SECTION 20: AFFICHAGE DES DÉTAILS
  // ============================================================================

  /**
   * Affiche les détails d'une transaction
   */
  viewDetails(transaction: FinancialTransaction): void {
    this.selectedTransaction = transaction;
    this.showDetailsModal = true;
  }

  /**
   * Ferme le modal de détails
   */
  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedTransaction = null;
  }

  // ============================================================================
  // SECTION 21: GESTION DES MODALS
  // ============================================================================

  /**
   * Ferme le modal de formulaire
   */
  closeFormModal(): void {
    this.showFormModal = false;
    this.selectedTransaction = null;
    this.transactionForm.reset();
  }

  /**
   * Ferme le modal de suppression
   */
  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.transactionToDelete = null;
  }

  // ============================================================================
  // SECTION 22: MÉTHODES UTILITAIRES
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
   * Obtient le premier jour du mois en cours
   */
  private getFirstDayOfMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
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
   * Formate une date
   */
  formatDate(date: Date | string): string {
    return this.financialService.formatDate(date);
  }

  /**
   * Vérifie si une transaction est récente
   */
  isRecentTransaction(transaction: FinancialTransaction): boolean {
    return this.financialService.isRecentTransaction(transaction);
  }



  /**
   * Obtient la classe CSS pour le badge de type
   */
  getTypeClass(type: TransactionType): string {
    return type === TransactionType.Revenue ? 'badge-success' : 'badge-danger';
  }

  /**
   * Obtient le label du type
   */
  getTypeLabel(type: TransactionType): string {
    return type === TransactionType.Revenue ? 'Revenu' : 'Dépense';
  }

  // ============================================================================
  // SECTION 23: AUTHENTIFICATION ET UTILISATEUR
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

  // ============================================================================
  // SECTION 24: INTERFACE UTILISATEUR
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

  // ============================================================================
  // SECTION 17.5: GESTION DES CHANGEMENTS DE DATE
  // ============================================================================

  /**
   * Gère le changement de la date de début
   */
  onStartDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      // Créer une date à minuit pour éviter les problèmes de fuseau horaire
      const date = new Date(input.value + 'T00:00:00');
      this.filters.startDate = date;

      // Valider que la date de début n'est pas après la date de fin
      if (this.filters.endDate && date > this.filters.endDate) {
        this.notificationService.warning(
          'La date de début ne peut pas être après la date de fin',
          'Attention'
        );
        this.filters.endDate = date;
      }

      this.loadTransactions();
    }
  }

  /**
   * Gère le changement de la date de fin
   */
  onEndDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      // Créer une date à minuit pour éviter les problèmes de fuseau horaire
      const date = new Date(input.value + 'T00:00:00');
      this.filters.endDate = date;

      // Valider que la date de fin n'est pas avant la date de début
      if (this.filters.startDate && date < this.filters.startDate) {
        this.notificationService.warning(
          'La date de fin ne peut pas être avant la date de début',
          'Attention'
        );
        this.filters.startDate = date;
      }

      this.loadTransactions();
    }
  }

  /**
   * Version alternative avec gestion de la période personnalisée
   */
  onPeriodChange(startDate: Date, endDate: Date): void {
    this.filters.startDate = startDate;
    this.filters.endDate = endDate;
    this.loadTransactions();
  }

  /**
   * Définit la période sur aujourd'hui
   */
  setToday(): void {
    const today = new Date();
    this.filters.startDate = today;
    this.filters.endDate = today;
    this.loadTransactions();
  }

  /**
   * Définit la période sur cette semaine
   */
  setThisWeek(): void {
    const today = new Date();
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - today.getDay()); // Dimanche = premier jour

    const lastDay = new Date(firstDay);
    lastDay.setDate(firstDay.getDate() + 6);

    this.filters.startDate = firstDay;
    this.filters.endDate = lastDay;
    this.loadTransactions();
  }

  /**
   * Définit la période sur ce mois
   */
  setThisMonth(): void {
    this.filters.startDate = this.getFirstDayOfMonth();
    this.filters.endDate = new Date();
    this.loadTransactions();
  }

  /**
   * Définit la période sur le mois dernier
   */
  setLastMonth(): void {
    const now = new Date();
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    this.filters.startDate = firstDayLastMonth;
    this.filters.endDate = lastDayLastMonth;
    this.loadTransactions();
  }

  /**
   * Définit la période sur cette année
   */
  setThisYear(): void {
    const now = new Date();
    const firstDayYear = new Date(now.getFullYear(), 0, 1);

    this.filters.startDate = firstDayYear;
    this.filters.endDate = now;
    this.loadTransactions();
  }

  // ============================================================================
  // SECTION 25: DÉCONNEXION
  // ============================================================================

  /**
   * Gère le processus de déconnexion
   */
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
        }
      });
  }
}
