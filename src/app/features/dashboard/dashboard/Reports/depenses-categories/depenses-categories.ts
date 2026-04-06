import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { finalize, Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { NotificationComponent } from '../../../../../core/components/notification-component/notification-component';
import { SidebarComponent } from '../../../../../core/components/sidebar-component/sidebar-component';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import { VehicleType, FuelType, ExportFormat } from '../../../../../core/models/Enums/Logistiks-enums';
import { VehicleDto } from '../../../../../core/models/Vehicles/Vehicle.dtos';
import { Auth } from '../../../../../core/services/Auth/auth';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Token } from '../../../../../core/services/Token/token';
import { Vehicles } from '../../../../../core/services/Vehicles/vehicles';
import { ExpenseByCategoryResult, ExpenseCategoryEntry, ExpenseVehicleEntry, ExpenseMonthlyEntry } from '../../../../../core/models/Reports/report-results.models';
import { ReportResultDto } from '../../../../../core/models/Reports/report.models';
import { Reports } from '../../../../../core/services/Reports/reports';
import { SumPipe } from "../../../../pipes/sum.pipe";

@Component({
  selector: 'app-depenses-categories',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NotificationComponent, SidebarComponent, SumPipe],
  templateUrl: './depenses-categories.html',
  styleUrl: './depenses-categories.scss',
})
export class DepensesCategories implements OnInit, OnDestroy {

  // ============================================================================
  // SECTION 1 : DONNÉES DU RAPPORT
  // ============================================================================

  reportResult: ReportResultDto | null = null;
  reportData: ExpenseByCategoryResult | null = null;
  categories: ExpenseCategoryEntry[] = [];
  byVehicle: ExpenseVehicleEntry[] = [];
  monthly: ExpenseMonthlyEntry[] = [];

  // ============================================================================
  // SECTION 2 : FILTRES
  // ============================================================================

  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear: number  = new Date().getFullYear();
  periodStart: string   = '';
  periodEnd: string     = '';

  /** Filtre véhicule optionnel */
  selectedVehicleId: string = '';

  months = [
    { value: 1,  label: 'Janvier'   }, { value: 2,  label: 'Février'   },
    { value: 3,  label: 'Mars'      }, { value: 4,  label: 'Avril'     },
    { value: 5,  label: 'Mai'       }, { value: 6,  label: 'Juin'      },
    { value: 7,  label: 'Juillet'   }, { value: 8,  label: 'Août'      },
    { value: 9,  label: 'Septembre' }, { value: 10, label: 'Octobre'   },
    { value: 11, label: 'Novembre'  }, { value: 12, label: 'Décembre'  },
  ];

  years: number[] = [];

  // ============================================================================
  // SECTION 3 : ÉTATS UI
  // ============================================================================

  isLoading: boolean  = false;
  hasError: boolean   = false;
  errorMessage: string = '';
  isExporting: boolean = false;

  /** Vue active du tableau véhicule : 'table' | 'bars' */
  vehicleView: 'table' | 'bars' = 'bars';

  /** Catégorie survolée pour highlight */
  hoveredCategory: string | null = null;

  /** Tri du tableau véhicules */
  sortColumn: keyof ExpenseVehicleEntry = 'totalExpense';
  sortAsc: boolean = false;

  // ============================================================================
  // SECTION 4 : MÉTADONNÉES VISUELLES CATÉGORIES
  // ============================================================================

  readonly categoryMeta: Record<string, { color: string; icon: string; softColor: string }> = {
    Maintenance: { color: '#ffab00', softColor: '#fff8e6', icon: 'bx-wrench'       },
    Carburant:   { color: '#696cff', softColor: '#edeeff', icon: 'bx-gas-pump'     },
    Assurance:   { color: '#03c3ec', softColor: '#e8f9fd', icon: 'bx-shield-check' },
    Taxes:       { color: '#8592a3', softColor: '#f5f5f9', icon: 'bx-receipt'      },
    Autres:      { color: '#ff3e1d', softColor: '#fff0ed', icon: 'bx-dots-horizontal-rounded' },
  };

  /** Couleur de secours si la catégorie est inconnue */
  private readonly fallbackColor = '#8592a3';

  // ============================================================================
  // SECTION 5 : GESTION UTILISATEUR
  // ============================================================================

  currentUser: any    = null;
  userName: string    = 'Utilisateur';
  userPhotoUrl: string = '';
  showUserMenu: boolean = false;
  isSidebarCollapsed: boolean = false;

  Math = Math;
  ExportFormat = ExportFormat;

  private destroy$ = new Subject<void>();

  constructor(
    public reportService: Reports,
    private notificationService: NotificationService,
    private authService: Auth,
    private tokenService: Token,
    private router: Router
  ) {}

  // ============================================================================
  // SECTION 6 : CYCLE DE VIE
  // ============================================================================

  ngOnInit(): void {
    this.checkAuthentication();
    this.loadCurrentUser();
    this.initYears();
    this.computePeriod();
    this.loadReport();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // SECTION 7 : INITIALISATION
  // ============================================================================

  /**
 * Construit le dégradé conic-gradient CSS pour le donut visuel.
 * Ex : "conic-gradient(#ffab00 0% 45%, #696cff 45% 72%, ...)"
 */
buildConicGradient(): string {
  if (!this.categories.length) return '#f0f0f0';

  let cumul  = 0;
  const stops: string[] = [];

  for (const cat of this.categories) {
    const start = cumul;
    cumul += cat.percentOfTotal;
    const color = this.getCategoryColor(cat.categoryLabel);
    stops.push(`${color} ${start.toFixed(1)}% ${cumul.toFixed(1)}%`);
  }

  return `conic-gradient(${stops.join(', ')})`;
}

  private initYears(): void {
    const cur = new Date().getFullYear();
    for (let y = cur; y >= cur - 4; y--) this.years.push(y);
  }

  private computePeriod(): void {
    const first = new Date(this.selectedYear, this.selectedMonth - 1, 1);
    const last  = new Date(this.selectedYear, this.selectedMonth, 0, 23, 59, 59);
    this.periodStart = first.toISOString();
    this.periodEnd   = last.toISOString();
  }

  // ============================================================================
  // SECTION 8 : CHARGEMENT
  // ============================================================================

  /**
   * GET /api/v1/reports/expenses-by-category
   */
  loadReport(): void {
    this.isLoading  = true;
    this.hasError   = false;
    this.reportData = null;

    const vehicleId = this.selectedVehicleId || undefined;

    this.reportService
      .getExpensesByCategory(
        { periodStart: this.periodStart, periodEnd: this.periodEnd },
        vehicleId
      )
      .pipe(takeUntil(this.destroy$), finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res: { success: any; data: ReportResultDto | null; message: string; }) => {
          if (res.success && res.data) {
            this.reportResult = res.data;
            this.reportData   = res.data.resultData as ExpenseByCategoryResult;
            this.categories   = this.reportData?.categories  ?? [];
            this.byVehicle    = this.reportData?.byVehicle   ?? [];
            this.monthly      = this.reportData?.monthly     ?? [];
          } else {
            this.hasError     = true;
            this.errorMessage = res.message ?? 'Erreur chargement rapport';
          }
        },
        error: (err: { message: string; }) => {
          this.hasError     = true;
          this.errorMessage = err.message ?? 'Erreur réseau';
          this.notificationService.error('Impossible de charger le rapport de dépenses', "Erreur");
        }
      });
  }

  onPeriodChange(): void {
    this.computePeriod();
    this.loadReport();
  }

  previousMonth(): void {
    this.selectedMonth === 1
      ? (this.selectedMonth = 12, this.selectedYear--)
      : this.selectedMonth--;
    this.onPeriodChange();
  }

  nextMonth(): void {
    if (this.isNextMonthDisabled) return;
    this.selectedMonth === 12
      ? (this.selectedMonth = 1, this.selectedYear++)
      : this.selectedMonth++;
    this.onPeriodChange();
  }

  get isNextMonthDisabled(): boolean {
    const now = new Date();
    return this.selectedYear > now.getFullYear() ||
      (this.selectedYear === now.getFullYear() && this.selectedMonth >= now.getMonth() + 1);
  }

  get periodLabel(): string {
    const m = this.months.find(x => x.value === this.selectedMonth);
    return `${m?.label ?? ''} ${this.selectedYear}`;
  }

  // ============================================================================
  // SECTION 9 : CALCULS & ACCESSEURS
  // ============================================================================

  /** Catégorie avec le montant le plus élevé */
  get topCategory(): ExpenseCategoryEntry | null {
    return this.categories.length
      ? [...this.categories].sort((a, b) => b.amount - a.amount)[0]
      : null;
  }

  /** Nombre total de transactions toutes catégories */
  get totalTransactions(): number {
    return this.categories.reduce((acc, c) => acc + c.transactionCount, 0);
  }

  /** Véhicule le plus coûteux */
  get mostExpensiveVehicle(): ExpenseVehicleEntry | null {
    return this.byVehicle.length
      ? [...this.byVehicle].sort((a, b) => b.totalExpense - a.totalExpense)[0]
      : null;
  }

  /** Véhicules triés */
  get sortedVehicles(): ExpenseVehicleEntry[] {
    return [...this.byVehicle].sort((a, b) => {
      const va = a[this.sortColumn] as number;
      const vb = b[this.sortColumn] as number;
      return this.sortAsc ? va - vb : vb - va;
    });
  }

  /** Valeur max dans le tableau mensuel (pour normaliser les barres) */
  get maxMonthlyExpense(): number {
    return this.monthly.length
      ? Math.max(...this.monthly.map(m => m.totalExpense))
      : 1;
  }

  sortBy(col: keyof ExpenseVehicleEntry): void {
    this.sortAsc = this.sortColumn === col ? !this.sortAsc : false;
    this.sortColumn = col;
  }

  getCategoryColor(label: string): string {
    return this.categoryMeta[label]?.color ?? this.fallbackColor;
  }

  getCategorySoftColor(label: string): string {
    return this.categoryMeta[label]?.softColor ?? '#f5f5f9';
  }

  getCategoryIcon(label: string): string {
    return this.categoryMeta[label]?.icon ?? 'bx-question-mark';
  }

  formatAmount(v: number): string {
  if (v == null || isNaN(v)) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0
  }).format(Math.round(v)) + ' FCFA';
}

  formatPercent(v: number, sign = false): string {
    return `${sign && v > 0 ? '+' : ''}${v.toFixed(1)}%`;
  }

  /** Hauteur de barre mensuelle normalisée (max 80px) */
  barHeight(amount: number): number {
    return Math.max(4, Math.round((amount / this.maxMonthlyExpense) * 80));
  }

  // ============================================================================
  // SECTION 10 : EXPORT
  // ============================================================================

  exportReport(format: ExportFormat): void {
    if (!this.reportResult?.id) {
      this.notificationService.error('Générez d\'abord le rapport avant d\'exporter', "Erreur export");
      return;
    }
    this.isExporting = true;
    const name = `depenses-categories-${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    this.reportService.downloadReport(this.reportResult.id, format, name);
    setTimeout(() => (this.isExporting = false), 2000);
  }

  // ============================================================================
  // SECTION 11 : GESTION UTILISATEUR
  // ============================================================================

  private checkAuthentication(): void {
    if (!this.tokenService.getToken()) this.router.navigate(['/auth/login']);
  }

  loadCurrentUser(): void {
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: User) => {
          this.currentUser  = user;
          this.userName     = this.formatUserName(user);
          this.userPhotoUrl = this.getUserPhotoUrl(user);
        },
        error: (err) => {
          if (err.status === 401) this.tokenService.handleTokenExpired();
          else this.setDefaultUser();
        }
      });
  }

  private setDefaultUser(): void {
    this.userName     = 'Utilisateur Logistiks';
    this.userPhotoUrl = this.generateAvatarUrl({ firstName: 'Utilisateur' } as User);
  }

  formatUserName(user: any): string {
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    if (user?.firstName) return user.firstName;
    if (user?.username)  return user.username;
    if (user?.email)     return user.email.split('@')[0];
    return 'Utilisateur Logistiks';
  }

  getUserPhotoUrl(user: User): string {
    if (user.photoUrl && /^[0-9a-fA-F]{24}$/.test(user.photoUrl))
      return `${environment.apiUrl}/api/User/photo/${user.photoUrl}`;
    if (user.photoUrl?.startsWith('http')) return user.photoUrl;
    return this.generateAvatarUrl(user);
  }

  generateAvatarUrl(user: any): string {
    const name   = this.formatUserName(user);
    const colors = ['FF6B6B','4ECDC4','FFD166','06D6A0','118AB2','EF476F','7209B7','3A86FF'];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${colors[name.length % colors.length]}&color=fff&size=128`;
  }

  getUserInitials(): string {
    const parts = this.userName.split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : this.userName[0].toUpperCase();
  }

  getDefaultAvatar(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=696cff&color=fff&size=128`;
  }

  toggleUserMenu(): void  { this.showUserMenu = !this.showUserMenu; }
  toggleSidebar(): void   { this.isSidebarCollapsed = !this.isSidebarCollapsed; }

  toggleMenu(event: MouseEvent): void {
    (event.currentTarget as HTMLElement)?.parentElement?.classList.toggle('open');
  }

  @HostListener('document:click', ['$event'])
  closeUserMenu(event: MouseEvent): void {
    const t = event.target as HTMLElement;
    if (!t.closest('.dropdown-toggle') && !t.closest('.dropdown-menu'))
      this.showUserMenu = false;
  }

  logout(): void {
    this.tokenService.logout();
    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.router.navigate(['/auth/login']),
        error: () => this.router.navigate(['/auth/login'])
      });
  }
}
