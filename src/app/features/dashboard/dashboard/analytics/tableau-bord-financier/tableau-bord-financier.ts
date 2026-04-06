import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NotificationComponent } from '../../../../../core/components/notification-component/notification-component';
import { SidebarComponent } from '../../../../../core/components/sidebar-component/sidebar-component';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import { VehicleType, FuelType } from '../../../../../core/models/Enums/Logistiks-enums';
import { VehicleDto } from '../../../../../core/models/Vehicles/Vehicle.dtos';
import { Auth } from '../../../../../core/services/Auth/auth';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Token } from '../../../../../core/services/Token/token';
import { Vehicles } from '../../../../../core/services/Vehicles/vehicles';
import { ContractPerformanceDto } from '../../../../../core/models/Dashboard/ContractPerformanceDto';
import { DashboardKpiDto } from '../../../../../core/models/Dashboard/DashboardKpiDto';
import { DashboardSummaryDto } from '../../../../../core/models/Dashboard/DashboardSummaryDto';
import { FleetStatsDto } from '../../../../../core/models/Dashboard/FleetStatsDto';
import { MonthlyChartPoint } from '../../../../../core/models/Dashboard/MonthlyChartPoint';
import { Dashboard } from '../../../../../core/services/Dashboard/dashboard';

// ─────────────────────────────────────────────────────────────
// Interface locale pour le classement véhicules
// ─────────────────────────────────────────────────────────────
interface RankedVehicle {
  vehicleName:     string;
  licensePlate:    string;
  totalRevenue:    number;
  totalExpenses:   number;
  profit:          number;
  utilizationRate: number;
  status:          string;
}

@Component({
  selector: 'app-tableau-bord-financier',
  imports: [CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NotificationComponent,
    SidebarComponent,],
  templateUrl: './tableau-bord-financier.html',
  styleUrl: './tableau-bord-financier.scss',
})
export class TableauBordFinancier  implements OnInit, OnDestroy {

  // ============================================================================
  // SECTION 1 : PROPRIÉTÉS CHARGEMENT / ÉTAT
  // ============================================================================

  isLoading      = false;
  hasError       = false;
  errorMessage   = '';
  isExporting    = false;
  lastRefreshed: Date | null = null;
  today          = new Date();

  // ============================================================================
  // SECTION 2 : DONNÉES DASHBOARD
  // ============================================================================

  summaryData:        DashboardSummaryDto | null    = null;
  kpi:                DashboardKpiDto | null         = null;
  fleetStats:         FleetStatsDto | null           = null;
  chartData:          MonthlyChartPoint[]            = [];
  contractPerf:       ContractPerformanceDto | null  = null;
  rankedVehicles:     RankedVehicle[]                = [];

  // ============================================================================
  // SECTION 3 : GRAPHIQUE SVG
  // ============================================================================

  /** Dimensions du SVG */
  chartW = 900;
  chartH = 260;
  chartPad = { l: 60, r: 20, t: 20, b: 30 };
  chartMonths = 12;

  /** Lignes de grille horizontales */
  gridLines: { y: number; label: string }[] = [];

  /** Valeur max pour l'échelle Y */
  private chartMax = 0;

  /** Tooltip */
  tooltipVisible = false;
  tooltipX       = 0;
  tooltipY       = 0;
  tooltipData:   MonthlyChartPoint | null = null;

  // ============================================================================
  // SECTION 4 : FILTRE / CLASSEMENT VÉHICULES
  // ============================================================================

  rankMode: 'revenue' | 'profit' | 'utilization' = 'revenue';

  // ============================================================================
  // SECTION 5 : PÉRIODE
  // ============================================================================

  selectedMonth = new Date().getMonth() + 1;
  selectedYear  = new Date().getFullYear();

  months = [
    { value: 1,  label: 'Janvier'   },
    { value: 2,  label: 'Février'   },
    { value: 3,  label: 'Mars'      },
    { value: 4,  label: 'Avril'     },
    { value: 5,  label: 'Mai'       },
    { value: 6,  label: 'Juin'      },
    { value: 7,  label: 'Juillet'   },
    { value: 8,  label: 'Août'      },
    { value: 9,  label: 'Septembre' },
    { value: 10, label: 'Octobre'   },
    { value: 11, label: 'Novembre'  },
    { value: 12, label: 'Décembre'  },
  ];

  get years(): number[] {
    const y = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => y - i);
  }

  // ============================================================================
// SECTION 10 : HELPERS CALCULS / FORMATAGE (suite)
// ============================================================================

/**
 * Récupère le montant d'une catégorie de dépense depuis expenseBreakdown
 * @param category - Catégorie de dépense ('maintenance', 'fuel', 'insurance', 'taxes', 'other')
 */
getExpenseAmount(category: string): number {
  if (!this.summaryData?.expenseBreakdown || this.summaryData.expenseBreakdown.length === 0) {
    return 0;
  }

  // Mapping des catégories
  const categoryMap: Record<string, string> = {
    'maintenance': 'MNT',
    'fuel': 'CARB',
    'insurance': 'ASS',
    'taxes': 'TAX',
    'other': 'DIV'
  };

  const categoryCode = categoryMap[category] || category.toUpperCase();

  const slice = this.summaryData.expenseBreakdown.find(s =>
    s.categoryCode === categoryCode ||
    s.categoryLabel.toLowerCase() === category.toLowerCase()
  );

  return slice?.amount ?? 0;
}

/**
 * Récupère le pourcentage d'une catégorie de dépense
 * @param category - Catégorie de dépense ('maintenance', 'fuel', 'insurance', 'taxes', 'other')
 */
getExpensePct(category: string): number {
  if (!this.summaryData?.expenseBreakdown || this.summaryData.expenseBreakdown.length === 0) {
    return 0;
  }

  // Mapping des catégories
  const categoryMap: Record<string, string> = {
    'maintenance': 'MNT',
    'fuel': 'CARB',
    'insurance': 'ASS',
    'taxes': 'TAX',
    'other': 'DIV'
  };

  const categoryCode = categoryMap[category] || category.toUpperCase();

  const slice = this.summaryData.expenseBreakdown.find(s =>
    s.categoryCode === categoryCode ||
    s.categoryLabel.toLowerCase() === category.toLowerCase()
  );

  return slice?.percentOfTotal ?? 0;
}

  // ============================================================================
  // SECTION 6 : UTILISATEUR / UI
  // ============================================================================

  currentUser: any       = null;
  userName: string       = 'Utilisateur';
  userPhotoUrl: string   = '';
  showUserMenu: boolean  = false;
  isSidebarCollapsed     = false;

  vehicleType = VehicleType;
  fuelType    = FuelType;

  private destroy$ = new Subject<void>();

  // ============================================================================
  // SECTION 7 : CONSTRUCTEUR & CYCLE DE VIE
  // ============================================================================

  constructor(
    private formBuilder:         FormBuilder,
    private dashboardService:    Dashboard,
    private notificationService: NotificationService,
    private authService:         Auth,
    private tokenService:        Token,
    private router:              Router,
  ) {}

  ngOnInit(): void {
    this.checkAuthentication();
    this.loadCurrentUser();
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // SECTION 8 : CHARGEMENT DES DONNÉES
  // ============================================================================

  /**
   * Lance le chargement parallèle de toutes les données du dashboard.
   */
  loadAll(): void {
    this.isLoading = true;
    this.hasError  = false;

    const { start, end } = this.getPeriodBounds();

    forkJoin({
      summary:   this.dashboardService.getDashboardSummary(start, end),
      kpi:       this.dashboardService.getKpis(start, end),
      fleet:     this.dashboardService.getFleetStats(),
      chart:     this.dashboardService.getRevenueChart(this.chartMonths),
      contracts: this.dashboardService.getContractPerformance(start, end),
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ({ summary, kpi, fleet, chart, contracts }) => {
        this.summaryData  = summary.data  ?? null;
        this.kpi          = kpi.data      ?? null;
        this.fleetStats   = fleet.data    ?? null;
        this.chartData    = chart.data    ?? [];
        this.contractPerf = contracts.data ?? null;

        this.buildChartScale();
        this.buildRankedVehicles();

        this.isLoading    = false;
        this.lastRefreshed = new Date();
        this.today         = new Date();
      },
      error: (err) => {
        this.isLoading    = false;
        this.hasError     = true;
        this.errorMessage = err?.message ?? 'Erreur de chargement';
        console.error('Erreur dashboard :', err);
      },
    });
  }

  /** Actualise toutes les données */
  refreshAll(): void {
    this.loadAll();
  }

  // ── Graphique ──────────────────────────────────────────────────────────────

  /**
   * Calcule la valeur maximum pour l'axe Y et génère les lignes de grille.
   */
  private buildChartScale(): void {
    if (!this.chartData.length) { this.chartMax = 100; return; }

    const allVals = this.chartData.flatMap(p => [p.revenue, p.expenses, p.profit]);
    const max = Math.max(...allVals);
    const min = Math.min(...allVals, 0);

    this.chartMax = max === 0 ? 100 : Math.ceil(max * 1.15);

    // 5 lignes de grille
    this.gridLines = Array.from({ length: 5 }, (_, i) => {
      const val = (this.chartMax / 4) * (4 - i);
      return {
        y:     this.getY(val),
        label: this.shortCurrency(val),
      };
    });
  }

/**
 * Recalcule le classement des véhicules selon le mode actif.
 */
private buildRankedVehicles(): void {
  // Correction : topVehicles est dans summaryData, pas dans contractPerf
  if (!this.summaryData?.topVehicles) {
    this.rankedVehicles = [];
    return;
  }

  const sorted = [...this.summaryData.topVehicles].sort((a, b) => {
    if (this.rankMode === 'revenue')     return b.revenue - a.revenue;
    if (this.rankMode === 'profit')      return b.netProfit - a.netProfit;
    if (this.rankMode === 'utilization') return b.utilizationRate - a.utilizationRate;
    return 0;
  });

  this.rankedVehicles = sorted.slice(0, 10).map(v => ({
    vehicleName:     v.vehicleName ?? '—',
    licensePlate:    v.vehicleCode ?? '—',
    totalRevenue:    v.revenue ?? 0,
    totalExpenses:   v.expenses ?? 0,
    profit:          v.netProfit ?? 0,
    utilizationRate: v.utilizationRate ?? 0,
    status:          v.currentStatus ?? 'Actif',
  }));
}

  // ============================================================================
  // SECTION 9 : HELPERS GRAPHIQUE SVG
  // ============================================================================

  /** Coordonnée X d'un point d'index i */
  getX(i: number): number {
    const w = this.chartW - this.chartPad.l - this.chartPad.r;
    const n = Math.max(this.chartData.length - 1, 1);
    return this.chartPad.l + (w / n) * i;
  }

  /** Coordonnée Y d'une valeur */
  getY(val: number): number {
    const h = this.chartH - this.chartPad.t - this.chartPad.b;
    const ratio = this.chartMax === 0 ? 0 : val / this.chartMax;
    return this.chartPad.t + h * (1 - Math.max(0, ratio));
  }

  /** Chemin SVG d'une ligne */
  getLinePath(field: 'revenue' | 'expenses' | 'profit'): string {
    return this.chartData
      .map((pt, i) => `${i === 0 ? 'M' : 'L'}${this.getX(i)},${this.getY(pt[field] ?? 0)}`)
      .join(' ');
  }

  /** Chemin SVG d'une zone remplie (area) */
  getAreaPath(field: 'revenue' | 'profit'): string {
    if (!this.chartData.length) return '';
    const line = this.getLinePath(field);
    const baseline = this.chartH - this.chartPad.b;
    const lastX    = this.getX(this.chartData.length - 1);
    return `${line} L${lastX},${baseline} L${this.chartPad.l},${baseline} Z`;
  }

  /** Affiche le tooltip */
  showTooltip(event: MouseEvent, pt: MonthlyChartPoint): void {
    const target = event.target as SVGElement;
    const rect   = target.closest('svg')?.getBoundingClientRect();
    const wrap   = target.closest('.rpt-chart-container') as HTMLElement;
    const wRect  = wrap?.getBoundingClientRect();

    if (wRect) {
      this.tooltipX = event.clientX - wRect.left + 12;
      this.tooltipY = event.clientY - wRect.top  - 40;
    }

    this.tooltipData    = pt;
    this.tooltipVisible = true;
  }

  /** Cache le tooltip */
  hideTooltip(): void {
    this.tooltipVisible = false;
  }

  /** Change la période du graphique et recharge */
  setChartMonths(n: number): void {
    this.chartMonths = n;
    this.dashboardService.getRevenueChart(n)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.chartData = r.data ?? [];
          this.buildChartScale();
        },
        error: (err) => console.error('Chart error:', err),
      });
  }

  // ============================================================================
  // SECTION 10 : HELPERS CALCULS / FORMATAGE
  // ============================================================================

  /**
   * Calcule le dash SVG d'un anneau de progression.
   * @param value - Valeur courante
   * @param max   - Valeur maximum (100 par défaut)
   */
  getRingDash(value: number, max: number = 100): string {
    const circumference = 2 * Math.PI * 15.9;
    const ratio = Math.min(Math.abs(value) / max, 1);
    return `${(circumference * ratio).toFixed(1)} ${circumference.toFixed(1)}`;
  }

  /**
   * Calcule le pourcentage d'une dépense par rapport au total des dépenses.
   */
  // getExpensePct(amount: number): number {
  //   const totalExpenses = this.summaryData?.kpis?.totalExpenses ?? 0;
  //   if (!totalExpenses) return 0;
  //   return Math.round((amount / totalExpenses) * 100);
  // }

  /**
   * Calcule le pourcentage d'un segment de flotte.
   */
  getFleetPct(segment: 'rented' | 'available'): number {
    const total = this.fleetStats?.totalVehicles ?? 0;
    if (!total) return 0;
    const val = segment === 'rented'
      ? (this.fleetStats?.rentedCount  ?? 0)
      : (this.fleetStats?.availableCount  ?? 0);
    return Math.round((val / total) * 100);
  }

  /**
   * Formate un montant en devise locale (FCFA / EUR selon config).
   */
  formatCurrency(val: number): string {
    if (val === null || val === undefined) return '—';
    return new Intl.NumberFormat('fr-FR', {
      style:    'currency',
      currency: 'XOF',
      maximumFractionDigits: 0,
    }).format(val);
  }

  /**
   * Formate un nombre en version courte pour les axes de graphique.
   */
  private shortCurrency(val: number): string {
    if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (Math.abs(val) >= 1_000)     return `${(val / 1_000).toFixed(0)}k`;
    return val.toFixed(0);
  }

  /** Formate un nombre avec séparateur de milliers */
  formatNumber(val: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(val ?? 0));
  }

  /** Formate un pourcentage */
  formatPercent(val: number): string {
    const v = val ?? 0;
    return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
  }

  /** Clamp utilitaire */
  clamp(val: number, min: number, max: number): number {
    return Math.min(Math.max(val ?? 0, min), max);
  }

  // ============================================================================
  // SECTION 11 : GESTION DE LA PÉRIODE
  // ============================================================================

  /** Construit les bornes ISO de la période sélectionnée */
  getPeriodBounds(): { start: string; end: string } {
    const year  = this.selectedYear;
    const month = this.selectedMonth;
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0);         // dernier jour du mois
    return {
      start: start.toISOString().split('T')[0],
      end:   end.toISOString().split('T')[0],
    };
  }

  /** Libellé lisible de la période sélectionnée */
  getPeriodLabel(): string {
    const m = this.months.find(x => x.value === this.selectedMonth);
    return `${m?.label ?? ''} ${this.selectedYear}`;
  }

  /** Avance ou recule d'un mois */
  shiftPeriod(delta: number): void {
    let m = this.selectedMonth + delta;
    let y = this.selectedYear;
    if (m > 12) { m = 1;  y++; }
    if (m < 1)  { m = 12; y--; }
    this.selectedMonth = m;
    this.selectedYear  = y;
    this.loadAll();
  }

  /** Retourne vrai si la période sélectionnée est le mois courant */
  isCurrentPeriod(): boolean {
    const now = new Date();
    return this.selectedMonth === now.getMonth() + 1
        && this.selectedYear  === now.getFullYear();
  }

  /** Callback sur changement de période */
  onPeriodChange(): void {
    this.loadAll();
  }

  // ── Classement ──────────────────────────────────────────────────────────────

  /** Change le mode de classement et recompute la liste */
  setRankMode(mode: 'revenue' | 'profit' | 'utilization'): void {
    this.rankMode = mode;
    this.buildRankedVehicles();
  }

  // ============================================================================
  // SECTION 12 : EXPORT
  // ============================================================================

  exportPdf(): void {
    this.notificationService.info('Export PDF en cours de développement…', " Patience !");
  }

  exportExcel(): void {
    this.notificationService.info('Export Excel en cours de développement…', " Patience !" );
  }

  exportCsv(): void {
    if (!this.chartData.length) return;
    const header = 'Mois,Revenus,Dépenses,Profit\n';
    const rows   = this.chartData
      .map(p => `${p.monthLabel ?? p.month},${p.revenue},${p.expenses},${p.profit}`)
      .join('\n');
    const blob   = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href = url;
    a.download = `rapport_financier_${this.getPeriodLabel().replace(' ', '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ============================================================================
  // SECTION 13 : GESTION AUTHENTIFICATION & UTILISATEUR
  // ============================================================================

  private checkAuthentication(): void {
    const token = this.tokenService.getToken();
    if (!token) {
      this.router.navigate(['/auth/login']);
    }
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
        error: (error) => {
          console.error('Erreur chargement utilisateur:', error);
          this.handleUserLoadError(error);
        },
      });
  }

  private handleUserLoadError(error: any): void {
    if (error.status === 401) {
      this.tokenService.handleTokenExpired();
    } else {
      this.setDefaultUser();
    }
  }

  private setDefaultUser(): void {
    this.userName     = 'Utilisateur Logistiks';
    this.userPhotoUrl = this.generateAvatarUrl({ firstName: 'Utilisateur' } as User);
  }

  formatUserName(user: any): string {
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName)  return user.firstName;
    if (user.username)   return user.username;
    if (user.email)      return user.email.split('@')[0];
    return 'Utilisateur Logistiks';
  }

  getUserPhotoUrl(user: User): string {
    if (user.photoUrl && /^[0-9a-fA-F]{24}$/.test(user.photoUrl)) {
      return `${environment.apiUrl}/api/User/photo/${user.photoUrl}`;
    }
    if (user.photoUrl?.startsWith('http')) return user.photoUrl;
    return this.generateAvatarUrl(user);
  }

  generateAvatarUrl(user: User): string {
    const name = this.formatUserName(user);
    const colors = ['FF6B6B', '4ECDC4', 'FFD166', '06D6A0', '118AB2', 'EF476F', '7209B7', '3A86FF'];
    const color  = colors[name.length % colors.length];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&size=128`;
  }

  getUserInitials(): string {
    const parts = this.userName.split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : this.userName[0].toUpperCase();
  }

  getDefaultAvatar(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=696cff&color=fff&size=128`;
  }

  // ============================================================================
  // SECTION 14 : GESTION INTERFACE UTILISATEUR
  // ============================================================================

  toggleUserMenu():  void { this.showUserMenu = !this.showUserMenu; }
  toggleSidebar():   void { this.isSidebarCollapsed = !this.isSidebarCollapsed; }

  toggleMenu(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    el?.parentElement?.classList.toggle('open');
  }

  @HostListener('document:click', ['$event'])
  closeUserMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-toggle') && !target.closest('.dropdown-menu')) {
      this.showUserMenu = false;
    }
  }

  // ============================================================================
  // SECTION 15 : DÉCONNEXION
  // ============================================================================

  logout(): void {
    this.tokenService.logout();
    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  () => this.router.navigate(['/auth/login']),
        error: () => this.router.navigate(['/auth/login']),
      });
  }
}
