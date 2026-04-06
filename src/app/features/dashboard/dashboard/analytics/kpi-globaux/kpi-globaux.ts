import { CommonModule, DecimalPipe, DatePipe, SlicePipe } from '@angular/common';
import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subject, forkJoin, takeUntil } from 'rxjs';

import { NotificationComponent } from '../../../../../core/components/notification-component/notification-component';
import { SidebarComponent } from '../../../../../core/components/sidebar-component/sidebar-component';
import { Auth } from '../../../../../core/services/Auth/auth';
import { Token } from '../../../../../core/services/Token/token';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { environment } from '../../../../../../environments/environment';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import { ContractPerformanceDto } from '../../../../../core/models/Dashboard/ContractPerformanceDto';
import { DashboardAlertsDto } from '../../../../../core/models/Dashboard/DashboardAlertsDto';
import { DashboardKpiDto } from '../../../../../core/models/Dashboard/DashboardKpiDto';
import { DashboardSummaryDto } from '../../../../../core/models/Dashboard/DashboardSummaryDto';
import { ExpenseChartSlice } from '../../../../../core/models/Dashboard/ExpenseChartSlice';
import { FleetStatsDto } from '../../../../../core/models/Dashboard/FleetStatsDto';
import { MonthlyChartPoint } from '../../../../../core/models/Dashboard/MonthlyChartPoint';
import { VehicleKpiEntry } from '../../../../../core/models/Dashboard/VehicleKpiEntry';
import { Dashboard } from '../../../../../core/services/Dashboard/dashboard';


interface PeriodOption {
  label: string;
  value: 'month' | 'quarter' | 'year';
}

interface DonutSlice {
  color: string;
  dashArray: string;
  dashOffset: string;
}

@Component({
  selector: 'app-kpi-globaux',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NotificationComponent,
    SidebarComponent,
    DecimalPipe,
    DatePipe,
    SlicePipe,
  ],
  templateUrl: './kpi-globaux.html',
  styleUrl: './kpi-globaux.scss',
})
export class KpiGlobaux implements OnInit, OnDestroy {

  // ═══════════════════════════════════════════
  // ÉTAT
  // ═══════════════════════════════════════════

  isLoading = false;
  errorMessage = '';
  periodLabel = '';

  selectedPeriod: 'month' | 'quarter' | 'year' = 'month';

  periodOptions: PeriodOption[] = [
    { label: 'Ce mois', value: 'month' },
    { label: 'Trimestre', value: 'quarter' },
    { label: 'Année', value: 'year' },
  ];

  // ═══════════════════════════════════════════
  // DONNÉES DASHBOARD
  // ═══════════════════════════════════════════

  summary: DashboardSummaryDto | null = null;

  kpis: DashboardKpiDto = {
    totalRevenue: 0, totalExpenses: 0, netProfit: 0,
    profitMarginPercent: 0, revenueGrowthPercent: 0,
    expenseGrowthPercent: 0, profitGrowthPercent: 0,
    totalVehicles: 0, rentedVehicles: 0, availableVehicles: 0,
    maintenanceVehicles: 0, fleetUtilizationPercent: 0,
    activeContracts: 0, newContractsThisMonth: 0,
    expiringIn30Days: 0, averageContractValue: 0,
    totalClients: 0, clientsWithDebt: 0, totalOutstandingDebt: 0,
  };

  revenueChart: MonthlyChartPoint[] = [];

  fleetStats: FleetStatsDto = {
    totalVehicles: 0, rentedCount: 0, availableCount: 0,
    maintenanceCount: 0, outOfServiceCount: 0,
    byType: [], utilizationPercent: 0,
  };

  contractPerformance: ContractPerformanceDto = {
    totalContracts: 0, activeContracts: 0, completedContracts: 0,
    terminatedContracts: 0, totalRevenue: 0, averageContractValue: 0,
    collectionRate: 0, topContracts: [],
  };

  expenseBreakdown: ExpenseChartSlice[] = [];
  topVehicles: VehicleKpiEntry[] = [];
  alerts: DashboardAlertsDto = { totalAlerts: 0, criticalCount: 0, items: [] };

  // ═══════════════════════════════════════════
  // GRAPHIQUE
  // ═══════════════════════════════════════════

  chartMonths = 6;
  chartMax = 1;
  chartHeight = 120;

  // ═══════════════════════════════════════════
  // DONUT
  // ═══════════════════════════════════════════

  readonly donutColors = ['#BA7517', '#378ADD', '#7F77DD', '#E24B4A', '#888780'];
  donutSlices: DonutSlice[] = [];

  // ═══════════════════════════════════════════
  // UTILISATEUR
  // ═══════════════════════════════════════════

  currentUser: User | null = null;
  userName = 'Utilisateur';
  userPhotoUrl = '';
  showUserMenu = false;
  isSidebarCollapsed = false;

  private destroy$ = new Subject<void>();

  constructor(
    private dashboardService: Dashboard,
    private authService: Auth,
    private tokenService: Token,
    private notificationService: NotificationService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.checkAuthentication();
    this.loadCurrentUser();
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════════
  // CHARGEMENT DASHBOARD
  // ═══════════════════════════════════════════

  setPeriod(period: 'month' | 'quarter' | 'year'): void {
    this.selectedPeriod = period;
    this.loadDashboard();
  }

  loadDashboard(): void {
    if (this.isLoading) return;

    const { start, end } = this.getPeriodDates();
    this.periodLabel = this.formatPeriodLabel(start, end);
    this.isLoading = true;
    this.errorMessage = '';

    const startStr = start.toISOString();
    const endStr = end.toISOString();

    forkJoin({
      summary: this.dashboardService.getDashboardSummary(startStr, endStr),
      chart: this.dashboardService.getRevenueChart(this.chartMonths),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ summary, chart }) => {
          if (summary.success && summary.data) {
            const d = summary.data;
            this.summary = d;
            this.kpis = d.kpis;
            this.fleetStats = d.fleetStats;
            this.contractPerformance = d.contractPerformance;
            this.expenseBreakdown = d.expenseBreakdown;
            this.topVehicles = d.topVehicles;
            this.alerts = d.alerts;
          }
          if (chart.success && chart.data) {
            this.revenueChart = chart.data.slice(-this.chartMonths);
            this.computeChartMax();
          }
          this.buildDonutSlices();
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = err.message ?? 'Erreur lors du chargement du dashboard';
          this.isLoading = false;
        },
      });
  }

  // ═══════════════════════════════════════════
  // HELPERS GRAPHIQUE
  // ═══════════════════════════════════════════

  private computeChartMax(): void {
    const values = this.revenueChart.flatMap(p => [p.revenue, p.expenses]);
    this.chartMax = values.length ? Math.max(...values) : 1;
  }

  getBarHeight(value: number): number {
    return Math.round((value / this.chartMax) * this.chartHeight);
  }

  // ═══════════════════════════════════════════
  // HELPERS FLOTTE
  // ═══════════════════════════════════════════

  getFleetPct(count: number): number {
    const total = this.fleetStats.totalVehicles;
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  // ═══════════════════════════════════════════
  // HELPERS TOP VÉHICULES
  // ═══════════════════════════════════════════

  getTopVehicleBarWidth(profit: number): number {
    const max = this.topVehicles.length ? this.topVehicles[0].netProfit : 1;
    return max > 0 ? Math.round((profit / max) * 100) : 0;
  }

  // ═══════════════════════════════════════════
  // HELPERS DONUT
  // ═══════════════════════════════════════════

  private buildDonutSlices(): void {
    const r = 36;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    this.donutSlices = this.expenseBreakdown.map((s, i) => {
      const dash = (s.percentOfTotal / 100) * circ;
      const slice: DonutSlice = {
        color: this.donutColors[i % this.donutColors.length],
        dashArray: `${dash} ${circ - dash}`,
        dashOffset: `${-offset}`,
      };
      offset += dash;
      return slice;
    });
  }

  // ═══════════════════════════════════════════
  // HELPERS PÉRIODE
  // ═══════════════════════════════════════════

  private getPeriodDates(): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    const end = new Date(now);

    switch (this.selectedPeriod) {
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return { start, end };
  }

  private formatPeriodLabel(start: Date, end: Date): string {
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    switch (this.selectedPeriod) {
      case 'year': return `Année ${start.getFullYear()}`;
      case 'quarter':
        const q = Math.floor(start.getMonth() / 3) + 1;
        return `T${q} ${start.getFullYear()}`;
      default:
        return `${months[start.getMonth()]} ${start.getFullYear()}`;
    }
  }

  // ═══════════════════════════════════════════
  // AUTH & UTILISATEUR
  // ═══════════════════════════════════════════

  private checkAuthentication(): void {
    if (!this.tokenService.getToken()) {
      this.router.navigate(['/auth/login']);
    }
  }

  loadCurrentUser(): void {
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: User) => {
          this.currentUser = user;
          this.userName = this.formatUserName(user);
          this.userPhotoUrl = this.getUserPhotoUrl(user);
        },
        error: (err) => {
          if (err.status === 401) this.tokenService.handleTokenExpired();
          else this.userName = 'Utilisateur';
        },
      });
  }

  formatUserName(user: any): string {
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    if (user.username) return user.username;
    if (user.email) return user.email.split('@')[0];
    return 'Utilisateur';
  }

  getUserPhotoUrl(user: User): string {
    if (user.photoUrl && /^[0-9a-fA-F]{24}$/.test(user.photoUrl))
      return `${environment.apiUrl}/api/User/photo/${user.photoUrl}`;
    if (user.photoUrl?.startsWith('http')) return user.photoUrl;
    const name = this.formatUserName(user);
    const colors = ['1D9E75', '378ADD', '7F77DD', 'BA7517', 'E24B4A'];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${colors[name.length % colors.length]}&color=fff&size=128`;
  }

  // ═══════════════════════════════════════════
  // UI
  // ═══════════════════════════════════════════

  toggleUserMenu(): void { this.showUserMenu = !this.showUserMenu; }

  @HostListener('document:click', ['$event'])
  closeUserMenu(event: MouseEvent): void {
    const t = event.target as HTMLElement;
    if (!t.closest('.dropdown-toggle') && !t.closest('.dropdown-menu')) {
      this.showUserMenu = false;
    }
  }

  toggleSidebar(): void { this.isSidebarCollapsed = !this.isSidebarCollapsed; }

  /**
 * Obtient l'avatar par défaut
 * @returns URL de l'avatar par défaut
 */
  getDefaultAvatar(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=696cff&color=fff&size=128`;
  }

  /**
* Obtient les initiales de l'utilisateur
* @returns Initiales de l'utilisateur
*/
  getUserInitials(): string {
    const name = this.userName;
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
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
