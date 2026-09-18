import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { CommonModule } from '@angular/common';

// ============================================================================
// CORE IMPORTS
// ============================================================================
import { environment } from '../../../../../../environments/environment';
import { NotificationComponent } from '../../../../../core/components/notification-component/notification-component';
import { SidebarComponent } from "../../../../../core/components/sidebar-component/sidebar-component";

// ============================================================================
// MODELS IMPORTS
// ============================================================================
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import {
  TransactionStatus,
  TransactionType,
  TransactionCategory,
  PaymentMethod
} from '../../../../../core/models/Financials/Financial.models';
import { FinancialTransaction } from '../../../../../core/models/Financials/Financial.models';
import { CreateTransactionRequest, ExportTransactionsRequest } from '../../../../../core/models/Financials/Financial-requests.models';

// ============================================================================
// SERVICES IMPORTS
// ============================================================================
import { Auth } from '../../../../../core/services/Auth/auth';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Token } from '../../../../../core/services/Token/token';
import { Financials } from '../../../../../core/services/Financials/financials';

// ============================================================================
// INTERFACES INTERNES
// ============================================================================

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
 * Agrégat (nombre + montant) d'un statut du workflow
 */
interface WorkflowKpi {
  count: number;
  amount: number;
}

/**
 * Indicateurs du cycle Pending → Verified → Paid (Annulée terminale)
 */
interface WorkflowStats {
  pending: WorkflowKpi;
  verified: WorkflowKpi;
  paid: WorkflowKpi;
  cancelled: WorkflowKpi;
  bookingRate: number;
}

/**
 * Tranche du donut de répartition par catégorie
 */
interface CategorySlice {
  category: TransactionCategory;
  label: string;
  icon: string;
  color: string;
  amount: number;
  percent: number;
}

/**
 * Tranche SVG du donut
 */
interface DonutSlice {
  color: string;
  dashArray: string;
  dashOffset: string;
}

/**
 * Point d'agrégation de la courbe de tendance
 */
interface TrendPoint {
  label: string;
  fullLabel: string;
  revenue: number;
  expenses: number;
}

/**
 * Ligne de grille de la courbe de tendance
 */
interface TrendGridLine {
  y: number;
  label: string;
}

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
  // SECTION 1: ÉNUMÉRATIONS ET CONSTANTES
  // ============================================================================

  /** Énumérations pour les templates */
  readonly TransactionType = TransactionType;
  readonly TransactionStatus = TransactionStatus;
  readonly TransactionCategory = TransactionCategory;
  readonly PaymentMethod = PaymentMethod;
  readonly Math = Math;

  // ============================================================================
  // SECTION 2: DONNÉES PRINCIPALES
  // ============================================================================

  /** Liste complète des transactions */
  allTransactions: FinancialTransaction[] = [];

  /** Transactions filtrées et paginées */
  displayedTransactions: FinancialTransaction[] = [];

  /** Transaction sélectionnée pour affichage */
  selectedTransaction: FinancialTransaction | null = null;

  // ============================================================================
  // SECTION 3: STATISTIQUES DU TABLEAU DE BORD
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
  // SECTION 3 bis: WORKFLOW, DONUT ET TENDANCE
  // ============================================================================

  /** Indicateurs du workflow (Pending → Verified → Paid, Annulée terminale) */
  workflowStats: WorkflowStats = {
    pending: { count: 0, amount: 0 },
    verified: { count: 0, amount: 0 },
    paid: { count: 0, amount: 0 },
    cancelled: { count: 0, amount: 0 },
    bookingRate: 0
  };

  /** Mode du donut de répartition (dépenses par défaut) */
  donutMode: 'expense' | 'income' = 'expense';

  /** Tranches SVG du donut */
  donutSlices: DonutSlice[] = [];

  /** Légende du donut */
  donutLegend: CategorySlice[] = [];

  /** Total de la répartition affichée */
  donutTotal = 0;

  /** Rayon du donut (viewBox 100 × 100) */
  private readonly donutRadius = 36;

  /** Points de la courbe de tendance revenus / dépenses */
  trendPoints: TrendPoint[] = [];

  /** Granularité de la tendance : jour ou semaine */
  trendGranularity: 'day' | 'week' = 'day';

  /** Valeur maximale de l'axe Y de la tendance */
  trendMax = 0;

  /** Lignes de grille de la courbe de tendance */
  trendGridLines: TrendGridLine[] = [];

  /** Dimensions du SVG de tendance */
  readonly trendW = 620;
  readonly trendH = 220;
  readonly trendPad = { l: 56, r: 16, t: 16, b: 28 };

  /** Tooltip de la courbe de tendance */
  tooltipVisible = false;
  tooltipX = 0;
  tooltipY = 0;
  tooltipPoint: TrendPoint | null = null;

  // ============================================================================
  // SECTION 4: ÉTATS DE CHARGEMENT
  // ============================================================================

  /** Indicateur de chargement */
  isLoading: boolean = false;

  /** Indicateur de soumission */
  isSubmitting: boolean = false;

  // ============================================================================
  // SECTION 5: FILTRES ET RECHERCHE
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
  // SECTION 6: PAGINATION
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
  // SECTION 7: TRI
  // ============================================================================

  /** Configuration du tri */
  sortConfig: SortConfig = {
    column: 'date',
    ascending: false
  };

  // ============================================================================
  // SECTION 8: FORMULAIRES
  // ============================================================================

  /** Formulaire de création de transaction */
  transactionForm!: FormGroup;

  // ============================================================================
  // SECTION 9: MODALES - ÉTATS D'AFFICHAGE
  // ============================================================================

  /** Affichage du modal de formulaire */
  showFormModal: boolean = false;

  /** Affichage du modal de détails */
  showDetailsModal: boolean = false;

  // ============================================================================
  // SECTION 10: UTILISATEUR ET INTERFACE
  // ============================================================================

  /** Utilisateur actuellement connecté */
  currentUser: User | null = null;

  /** Nom d'affichage de l'utilisateur */
  userName: string = 'Utilisateur';

  /** URL de la photo de profil de l'utilisateur */
  userPhotoUrl: string = '';

  /** Contrôle l'affichage du menu utilisateur */
  showUserMenu: boolean = false;

  /** État de réduction de la barre latérale */
  isSidebarCollapsed: boolean = false;

  // ============================================================================
  // SECTION 11: GESTION DES SUBSCRIPTIONS
  // ============================================================================

  /** Subject pour la gestion de la destruction des observables */
  private destroy$ = new Subject<void>();

  // ============================================================================
  // SECTION 12: CONSTRUCTEUR ET INITIALISATION
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

  /**
   * Initialise le formulaire de transaction
   */
  private initializeForm(): void {
    this.transactionForm = this.formBuilder.group({
      type: [TransactionType.Expense, Validators.required],
      category: [TransactionCategory.OtherExpense, Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      description: ['', [Validators.required, Validators.minLength(3)]],
      paymentMethod: [PaymentMethod.Cash, Validators.required],
      reference: [''],
      relatedId: [''],
      relatedType: ['']
    });
  }

  // ============================================================================
  // SECTION 13: CYCLE DE VIE DU COMPOSANT
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

  // ============================================================================
  // SECTION 14: GESTION DE L'AUTHENTIFICATION
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
    const colors = ['FF6B6B', '4ECDC4', 'FFD166', '06D6A0', '118AB2', 'EF476F', '7209B7', '3A86FF'];
    const colorIndex = name.length % colors.length;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${colors[colorIndex]}&color=fff&size=128`;
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
  // SECTION 15: CHARGEMENT DES DONNÉES PRINCIPALES
  // ============================================================================

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
            this.updateDashboardStats();
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur chargement transactions:', error);
          this.notificationService.error('Erreur', 'Impossible de charger les transactions');
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

  /**
   * Met à jour les statistiques du dashboard
   */
  private updateDashboardStats(): void {
    // Les cautions sont de la trésorerie : jamais un revenu ni une dépense.
    const resultTransactions = this.allTransactions.filter((t) => !this.isSecurityDeposit(t));

    // Revenus totaux
    this.dashboardStats.totalRevenue = resultTransactions
      .filter(t => t.type === TransactionType.Revenue)
      .reduce((sum, t) => sum + t.amount, 0);

    // Dépenses totales
    this.dashboardStats.totalExpenses = resultTransactions
      .filter(t => t.type === TransactionType.Expense)
      .reduce((sum, t) => sum + t.amount, 0);

    // Profit net
    this.dashboardStats.netProfit = this.dashboardStats.totalRevenue - this.dashboardStats.totalExpenses;

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

    this.dashboardStats.unverifiedTransactions = this.dashboardStats.totalTransactions - this.dashboardStats.verifiedTransactions;

    // Marge bénéficiaire
    this.dashboardStats.profitMargin = this.dashboardStats.totalRevenue > 0
      ? (this.dashboardStats.netProfit / this.dashboardStats.totalRevenue) * 100
      : 0;

    // Synthèses visuelles de la période chargée
    this.updateWorkflowStats();
    this.buildCategoryDonut();
    this.buildTrendChart();
  }

  // ============================================================================
  // SECTION 15 bis: SYNTHÈSES DE LA PÉRIODE CHARGÉE
  // ============================================================================

  /**
   * Une caution est de la trésorerie, exclue de tout calcul de résultat.
   */
  isSecurityDeposit(transaction: FinancialTransaction): boolean {
    return this.financialService.isSecurityDepositCategory(transaction.category);
  }

  /**
   * Statut effectif d'une transaction : les données historiques n'ont pas de
   * champ status, verifiedAt fait alors foi (même règle que getStatusLabel).
   */
  private getWorkflowStatus(transaction: FinancialTransaction): TransactionStatus {
    if (transaction.status) return transaction.status;
    return transaction.isVerified ? TransactionStatus.Verified : TransactionStatus.Pending;
  }

  /**
   * Agrège le cycle de vie du workflow sur la période chargée.
   * Le taux de comptabilisation est montant Payé / montant total, cautions exclues.
   */
  private updateWorkflowStats(): void {
    const stats: WorkflowStats = {
      pending: { count: 0, amount: 0 },
      verified: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
      bookingRate: 0
    };

    this.allTransactions.forEach((transaction) => {
      switch (this.getWorkflowStatus(transaction)) {
        case TransactionStatus.Paid:
          stats.paid.count += 1;
          stats.paid.amount += transaction.amount;
          break;
        case TransactionStatus.Verified:
          stats.verified.count += 1;
          stats.verified.amount += transaction.amount;
          break;
        case TransactionStatus.Cancelled:
          stats.cancelled.count += 1;
          stats.cancelled.amount += transaction.amount;
          break;
        default:
          stats.pending.count += 1;
          stats.pending.amount += transaction.amount;
      }
    });

    const countable = this.allTransactions.filter((t) => !this.isSecurityDeposit(t));
    const totalAmount = countable.reduce((sum, t) => sum + t.amount, 0);
    const paidAmount = countable
      .filter((t) => this.getWorkflowStatus(t) === TransactionStatus.Paid)
      .reduce((sum, t) => sum + t.amount, 0);
    stats.bookingRate = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

    this.workflowStats = stats;
  }

  /**
   * Construit le donut de répartition par catégorie (cautions exclues).
   */
  private buildCategoryDonut(): void {
    const wantedType = this.donutMode === 'income'
      ? TransactionType.Revenue
      : TransactionType.Expense;
    const totals = new Map<TransactionCategory, number>();

    this.allTransactions
      .filter((t) => !this.isSecurityDeposit(t) && t.type === wantedType)
      .forEach((t) => totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount));

    const entries = Array.from(totals.entries())
      .filter(([, amount]) => amount > 0)
      .sort((a, b) => b[1] - a[1]);

    this.donutTotal = entries.reduce((sum, [, amount]) => sum + amount, 0);

    this.donutLegend = entries.map(([category, amount]) => ({
      category,
      label: this.getCategoryName(category),
      icon: this.getCategoryIcon(category),
      color: this.getCategoryColor(category),
      amount,
      percent: this.donutTotal > 0 ? (amount / this.donutTotal) * 100 : 0
    }));

    const circumference = 2 * Math.PI * this.donutRadius;
    let offset = 0;
    this.donutSlices = this.donutLegend.map((slice) => {
      const dash = (slice.percent / 100) * circumference;
      const donutSlice: DonutSlice = {
        color: slice.color,
        dashArray: `${dash} ${circumference - dash}`,
        dashOffset: `${-offset}`
      };
      offset += dash;
      return donutSlice;
    });
  }

  /**
   * Bascule le donut entre dépenses et revenus.
   */
  setDonutMode(mode: 'expense' | 'income'): void {
    if (this.donutMode === mode) return;
    this.donutMode = mode;
    this.buildCategoryDonut();
  }

  /**
   * Agrège la période chargée par jour, ou par semaine quand elle dépasse 31 jours.
   */
  private buildTrendChart(): void {
    const countable = this.allTransactions.filter((t) => !this.isSecurityDeposit(t));
    const dates = countable
      .map((t) => new Date(t.date))
      .filter((d) => !isNaN(d.getTime()));

    let start = this.filters.startDate ? new Date(this.filters.startDate) : null;
    let end = this.filters.endDate ? new Date(this.filters.endDate) : null;

    if (!start && dates.length) {
      start = new Date(Math.min(...dates.map((d) => d.getTime())));
    }
    if (!end && dates.length) {
      end = new Date(Math.max(...dates.map((d) => d.getTime())));
    }
    if (!start || !end) {
      this.trendPoints = [];
      this.trendMax = 0;
      this.trendGridLines = [];
      return;
    }

    const periodStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const periodEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const totalDays = Math.floor((periodEnd.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    this.trendGranularity = totalDays > 31 ? 'week' : 'day';

    const buckets = new Map<number, TrendPoint>();
    countable.forEach((transaction) => {
      const date = new Date(transaction.date);
      if (isNaN(date.getTime()) || date < periodStart || date > periodEnd) return;

      const key = this.getTrendBucketStart(date).getTime();
      let point = buckets.get(key);
      if (!point) {
        point = { label: '', fullLabel: '', revenue: 0, expenses: 0 };
        buckets.set(key, point);
      }
      if (transaction.type === TransactionType.Revenue) {
        point.revenue += transaction.amount;
      } else {
        point.expenses += transaction.amount;
      }
    });

    const points: TrendPoint[] = [];
    const cursor = this.getTrendBucketStart(periodStart);
    while (cursor <= periodEnd) {
      const bucket = buckets.get(cursor.getTime())
        ?? { label: '', fullLabel: '', revenue: 0, expenses: 0 };
      bucket.label = this.formatTrendLabel(cursor);
      bucket.fullLabel = this.formatTrendFullLabel(cursor);
      points.push(bucket);
      cursor.setDate(cursor.getDate() + (this.trendGranularity === 'day' ? 1 : 7));
    }

    this.trendPoints = points;
    const max = points.reduce((current, point) => Math.max(current, point.revenue, point.expenses), 0);
    this.trendMax = max === 0 ? 0 : Math.ceil(max * 1.15);
    this.trendGridLines = this.trendMax > 0
      ? Array.from({ length: 5 }, (_, i) => {
          const value = (this.trendMax / 4) * (4 - i);
          return { y: this.getTrendY(value), label: this.compactAmount(value) };
        })
      : [];
  }

  /**
   * Premier jour du bucket (jour même, ou lundi pour une semaine).
   */
  private getTrendBucketStart(date: Date): Date {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (this.trendGranularity === 'week') {
      const day = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - day);
    }
    return start;
  }

  private formatTrendLabel(date: Date): string {
    const options: Intl.DateTimeFormatOptions = this.trendGranularity === 'week'
      ? { day: '2-digit', month: 'short' }
      : { day: '2-digit', month: '2-digit' };
    return new Intl.DateTimeFormat('fr-FR', options).format(date);
  }

  private formatTrendFullLabel(date: Date): string {
    if (this.trendGranularity === 'week') {
      const weekEnd = new Date(date);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const dayFormat = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' });
      return `Semaine du ${dayFormat.format(date)} au ${dayFormat.format(weekEnd)}`;
    }
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    }).format(date);
  }

  /** Coordonnée X d'un point de la courbe. */
  getTrendX(index: number): number {
    const width = this.trendW - this.trendPad.l - this.trendPad.r;
    if (this.trendPoints.length <= 1) return this.trendPad.l + width / 2;
    return this.trendPad.l + (width / (this.trendPoints.length - 1)) * index;
  }

  /** Coordonnée Y d'une valeur de la courbe. */
  getTrendY(value: number): number {
    const height = this.trendH - this.trendPad.t - this.trendPad.b;
    const ratio = this.trendMax === 0 ? 0 : value / this.trendMax;
    return this.trendPad.t + height * (1 - Math.max(0, ratio));
  }

  /** Chemin SVG d'une ligne de la courbe. */
  getTrendLinePath(field: 'revenue' | 'expenses'): string {
    return this.trendPoints
      .map((point, i) => `${i === 0 ? 'M' : 'L'}${this.getTrendX(i)},${this.getTrendY(point[field])}`)
      .join(' ');
  }

  /** Chemin SVG de l'aire remplie sous une ligne. */
  getTrendAreaPath(field: 'revenue' | 'expenses'): string {
    if (!this.trendPoints.length) return '';
    const baseline = this.trendH - this.trendPad.b;
    const lastX = this.getTrendX(this.trendPoints.length - 1);
    return `${this.getTrendLinePath(field)} L${lastX},${baseline} L${this.getTrendX(0)},${baseline} Z`;
  }

  /** N'affiche qu'un libellé sur N pour éviter le chevauchement de l'axe X. */
  showTrendLabel(index: number): boolean {
    const count = this.trendPoints.length;
    if (count <= 12) return true;
    const step = Math.ceil(count / 12);
    return index % step === 0 || index === count - 1;
  }

  /** Affiche le tooltip de la courbe. */
  showTrendTooltip(event: MouseEvent, point: TrendPoint): void {
    const wrap = (event.target as SVGElement).closest('.trend-chart-wrap') as HTMLElement;
    const wrapRect = wrap?.getBoundingClientRect();
    if (wrapRect) {
      this.tooltipX = event.clientX - wrapRect.left + 12;
      this.tooltipY = event.clientY - wrapRect.top - 40;
    }
    this.tooltipPoint = point;
    this.tooltipVisible = true;
  }

  /** Cache le tooltip de la courbe. */
  hideTrendTooltip(): void {
    this.tooltipVisible = false;
  }

  /** Montant compact pour les axes et le centre du donut (k / M). */
  compactAmount(value: number): string {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`;
    if (abs >= 1_000) return `${Math.round(value / 1_000)} k`;
    return `${Math.round(value)}`;
  }

  // ============================================================================
  // SECTION 16: GESTION DE LA RECHERCHE
  // ============================================================================

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

  /**
   * Gère le changement de terme de recherche
   */
  onSearchChange(term: string): void {
    this.searchSubject.next(term);
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

  // ============================================================================
  // SECTION 18: GESTION DES DATES
  // ============================================================================

  /**
   * Obtient le premier jour du mois en cours
   */
  private getFirstDayOfMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  /**
   * Gère le changement de la date de début
   */
  onStartDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      const date = new Date(input.value + 'T00:00:00');
      this.filters.startDate = date;

      if (this.filters.endDate && date > this.filters.endDate) {
        this.notificationService.warning('Attention', 'La date de début ne peut pas être après la date de fin');
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
      const date = new Date(input.value + 'T00:00:00');
      this.filters.endDate = date;

      if (this.filters.startDate && date < this.filters.startDate) {
        this.notificationService.warning('Attention', 'La date de fin ne peut pas être avant la date de début');
        this.filters.startDate = date;
      }

      this.loadTransactions();
    }
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
    firstDay.setDate(today.getDate() - today.getDay());
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

  /**
   * Version alternative avec gestion de la période personnalisée
   */
  onPeriodChange(startDate: Date, endDate: Date): void {
    this.filters.startDate = startDate;
    this.filters.endDate = endDate;
    this.loadTransactions();
  }

  // ============================================================================
  // SECTION 19: FILTRAGE ET TRI
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
      filtered = filtered.filter((t) => t.paymentMethod === this.filters.paymentMethod);
    }

    // Filtre par statut de vérification
    if (this.filters.verified !== undefined) {
      filtered = filtered.filter((t) => {
        const isVerified = !!(t.verifiedBy && t.verifiedAt);
        return this.filters.verified ? isVerified : !isVerified;
      });
    }

    // Filtre par terme de recherche
    if (this.filters.searchTerm?.trim()) {
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
    this.pagination.totalPages = Math.ceil(this.pagination.totalItems / this.pagination.pageSize);

    // Assure que la page courante est valide
    if (this.pagination.currentPage > this.pagination.totalPages) {
      this.pagination.currentPage = Math.max(1, this.pagination.totalPages);
    }

    // Applique la pagination
    const startIndex = (this.pagination.currentPage - 1) * this.pagination.pageSize;
    const endIndex = startIndex + this.pagination.pageSize;
    this.displayedTransactions = filtered.slice(startIndex, endIndex);

    // Calcule les pages visibles
    this.calculateVisiblePages();
  }

  /**
   * Trie les transactions selon la configuration
   */
  private sortTransactions(transactions: FinancialTransaction[]): FinancialTransaction[] {
    return transactions.sort((a, b) => {
      let comparison = 0;

      switch (this.sortConfig.column) {
        case 'transactionNumber':
          comparison = a.transactionNumber.localeCompare(b.transactionNumber);
          break;
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
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
    if (this.sortConfig.column !== column) return 'bx-sort';
    return this.sortConfig.ascending ? 'bx-sort-up' : 'bx-sort-down';
  }

  // ============================================================================
  // SECTION 20: GESTION DE LA PAGINATION
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
  // SECTION 21: GESTION DES TRANSACTIONS - CRÉATION
  // ============================================================================

  /**
   * Ouvre le modal de création de transaction
   */
  openCreateModal(): void {
    this.transactionForm.reset({
      type: TransactionType.Expense,
      category: TransactionCategory.OtherExpense,
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: PaymentMethod.Cash
    });
    this.showFormModal = true;
  }

  /**
   * Soumet le formulaire de transaction (création uniquement : RG-013/RG-014)
   */
  submitTransactionForm(): void {
    if (this.transactionForm.invalid) {
      this.markFormGroupTouched(this.transactionForm);
      this.notificationService.error('Formulaire invalide', 'Veuillez remplir tous les champs requis');
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

    this.createTransaction(request);
  }

  /**
   * Crée une nouvelle transaction
   */
  private createTransaction(request: CreateTransactionRequest): void {
    this.financialService
      .createTransaction(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Transaction créée', 'Transaction créée avec succès');
            this.closeFormModal();
            this.loadTransactions();
          }
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Erreur création transaction:', error);
          this.notificationService.error('Erreur de création', error.message || 'Erreur lors de la création');
          this.isSubmitting = false;
        }
      });
  }

  // ============================================================================
  // SECTION 22: GESTION DES TRANSACTIONS - ACTIONS
  // ============================================================================

  /**
   * Affiche les détails d'une transaction
   */
  viewDetails(transaction: FinancialTransaction): void {
    this.selectedTransaction = transaction;
    this.showDetailsModal = true;
  }

  /**
   * Vérifie une transaction
   */
  verifyTransaction(transaction: FinancialTransaction): void {
    this.financialService
      .verifyTransaction(transaction.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Transaction vérifiée', 'Transaction vérifiée avec succès');
            this.loadTransactions();
          }
        },
        error: (error) => {
          console.error('Erreur vérification:', error);
          this.notificationService.error('Erreur de vérification', error.message || 'Impossible de vérifier la transaction');
        }
      });
  }

  // ============================================================================
  // SECTION 22 bis: WORKFLOW DE PAIEMENT (RG-006 → RG-008/RG-009)
  // ============================================================================

  /** Libellé français du statut d'une transaction. */
  getStatusLabel(transaction: FinancialTransaction): string {
    switch (transaction.status) {
      case TransactionStatus.Paid: return 'Payée';
      case TransactionStatus.Verified: return 'Vérifiée';
      case TransactionStatus.Cancelled: return 'Annulée';
      case TransactionStatus.Pending: return 'En attente';
      default:
        // Données historiques : champ status absent, verifiedAt fait foi.
        return transaction.isVerified ? 'Vérifiée (ancien)' : 'En attente';
    }
  }

  /** Classe CSS du badge de statut. */
  getStatusClass(transaction: FinancialTransaction): string {
    switch (transaction.status) {
      case TransactionStatus.Paid: return 'status-paid';
      case TransactionStatus.Verified: return 'status-verified';
      case TransactionStatus.Cancelled: return 'status-cancelled';
      case TransactionStatus.Pending: return 'status-pending';
      default:
        return transaction.isVerified ? 'status-verified' : 'status-pending';
    }
  }

  /** Une transaction peut être vérifiée si elle est encore en attente. */
  canVerify(transaction: FinancialTransaction): boolean {
    return transaction.status === TransactionStatus.Pending
      || (!transaction.status && !transaction.isVerified);
  }

  /**
   * Une transaction vérifiée (mais pas encore payée) peut être marquée payée.
   * RG-006 : la vérification est obligatoire avant la confirmation du paiement.
   */
  canMarkPaid(transaction: FinancialTransaction): boolean {
    if (transaction.status === TransactionStatus.Verified) return true;
    // Données historiques : vérifiées avant l'ajout du statut.
    return !transaction.status && transaction.isVerified;
  }

  /**
   * Confirme la réception/paiement : la transaction entre alors dans les
   * calculs de rentabilité (RG-008/RG-009).
   */
  markTransactionPaid(transaction: FinancialTransaction): void {
    if (!this.canMarkPaid(transaction)) return;

    this.financialService
      .markTransactionPaid(transaction.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success(
              'Paiement confirmé',
              `La transaction ${transaction.transactionNumber} est désormais comptabilisée.`
            );
            this.loadTransactions();
          } else {
            this.notificationService.error('Paiement non confirmé', response.message || 'Opération impossible.');
          }
        },
        error: (error) => {
          console.error('Erreur confirmation paiement:', error);
          this.notificationService.error(
            'Erreur de confirmation',
            error.message || 'Impossible de confirmer le paiement.'
          );
        }
      });
  }

  // ============================================================================
  // SECTION 22 ter: EXPORT EXCEL PERSONNALISÉ
  // ============================================================================

  /** Modale d'export ouverte/fermée. */
  showExportModal = false;

  /** État de l'export en cours. */
  isExporting = false;

  /** Colonnes disponibles pour l'export (clé = colonne backend). */
  readonly exportColumnOptions: { key: string; label: string }[] = [
    { key: 'date', label: 'Date' },
    { key: 'number', label: 'N° transaction' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Catégorie' },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Montant (FCFA)' },
    { key: 'paymentMethod', label: 'Mode de paiement' },
    { key: 'reference', label: 'Référence' },
    { key: 'vehicle', label: 'Véhicule' },
    { key: 'status', label: 'Statut' },
    { key: 'verifiedBy', label: 'Vérifié par' },
    { key: 'verifiedAt', label: 'Vérifié le' },
    { key: 'paidAt', label: 'Payé le' },
    { key: 'createdBy', label: 'Créé par' },
    { key: 'createdAt', label: 'Créé le' },
  ];

  /** Options d'export (filtres + colonnes). */
  exportOptions = {
    dateFrom: '' as string,
    dateTo: '' as string,
    type: '' as '' | 'income' | 'expense',
    status: '' as '' | 'pending' | 'verified' | 'paid',
    searchTerm: '',
    columns: [
      'date', 'number', 'type', 'category', 'description',
      'amount', 'paymentMethod', 'reference', 'vehicle', 'status'
    ] as string[],
  };

  openExportModal(): void {
    // Pré-remplir la période avec les filtres actuels de l'écran.
    const start = this.filters.startDate;
    const end = this.filters.endDate;
    this.exportOptions.dateFrom = start ? this.toDateInputValue(start) : '';
    this.exportOptions.dateTo = end ? this.toDateInputValue(end) : '';
    this.showExportModal = true;
  }

  closeExportModal(): void {
    this.showExportModal = false;
  }

  toggleExportColumn(key: string): void {
    const columns = this.exportOptions.columns;
    const index = columns.indexOf(key);
    if (index >= 0) {
      columns.splice(index, 1);
    } else {
      // Conserver l'ordre d'affichage de référence.
      const reference = this.exportColumnOptions.map((c) => c.key);
      columns.push(key);
      columns.sort((a, b) => reference.indexOf(a) - reference.indexOf(b));
    }
  }

  isExportColumnSelected(key: string): boolean {
    return this.exportOptions.columns.includes(key);
  }

  /** Lance l'export Excel et déclenche le téléchargement du fichier. */
  exportTransactions(): void {
    if (this.isExporting) return;

    if (this.exportOptions.columns.length === 0) {
      this.notificationService.warning('Export impossible', 'Sélectionnez au moins une colonne à exporter.');
      return;
    }

    this.isExporting = true;

    const request: ExportTransactionsRequest = {
      dateFrom: this.exportOptions.dateFrom || undefined,
      dateTo: this.exportOptions.dateTo || undefined,
      type: this.exportOptions.type === 'income'
        ? TransactionType.Revenue
        : this.exportOptions.type === 'expense'
          ? TransactionType.Expense
          : undefined,
      statuses: this.exportOptions.status
        ? [{
            pending: TransactionStatus.Pending,
            verified: TransactionStatus.Verified,
            paid: TransactionStatus.Paid,
          }[this.exportOptions.status] as TransactionStatus]
        : undefined,
      categories: this.filters.category ? [this.filters.category] : undefined,
      searchTerm: this.exportOptions.searchTerm || undefined,
      columns: [...this.exportOptions.columns],
      title: 'TRANSACTIONS FINANCIÈRES — LOGISTIK',
    };

    this.financialService
      .exportTransactions(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.isExporting = false;
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Transactions_Logistiks_${new Date().toISOString().slice(0, 10)}.xlsx`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.showExportModal = false;
          this.notificationService.success('Export terminé', 'Le fichier Excel a été téléchargé.');
        },
        error: async (error) => {
          this.isExporting = false;
          let message = error?.message || "Impossible de générer l'export.";
          // Le backend peut renvoyer un JSON d'erreur dans un Blob.
          try {
            if (error?.error instanceof Blob) {
              const text = await error.error.text();
              const parsed = JSON.parse(text);
              message = parsed?.message || parsed?.data?.message || message;
            }
          } catch { /* on garde le message par défaut */ }
          this.notificationService.error('Export impossible', message);
        }
      });
  }

  private toDateInputValue(date: Date | string): string {
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  // ============================================================================
  // SECTION 23: GESTION DES MODALES
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
   * Ferme le modal de détails
   */
  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedTransaction = null;
  }

  // ============================================================================
  // SECTION 24: MÉTHODES UTILITAIRES
  // ============================================================================

  /**
   * Marque tous les champs d'un FormGroup comme touchés
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      formGroup.get(key)?.markAsTouched();
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
   * Obtient la couleur de la catégorie
   */
  getCategoryColor(category: TransactionCategory): string {
    return this.financialService.getCategoryColor(category);
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
  // SECTION 25: GESTION DE L'INTERFACE UTILISATEUR
  // ============================================================================

  /**
   * Bascule l'affichage du menu utilisateur
   */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
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
    element.parentElement?.classList.toggle('open');
  }

  // ============================================================================
  // SECTION 26: GESTIONNAIRES D'ÉVÉNEMENTS GLOBAUX
  // ============================================================================

  @HostListener('document:click', ['$event'])
  closeUserMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-toggle') && !target.closest('.dropdown-menu')) {
      this.showUserMenu = false;
    }
  }

  // ============================================================================
  // SECTION 27: DÉCONNEXION
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
        next: () => this.router.navigate(['/auth/login']),
        error: () => this.router.navigate(['/auth/login'])
      });
  }

  // ============================================================================
  // SECTION 28: GETTERS POUR LES FORMULAIRES (si nécessaire)
  // ============================================================================

  // get tf() { return this.transactionForm.controls; }

  // ============================================================================
  // FIN DU COMPOSANT
  // ============================================================================
}
