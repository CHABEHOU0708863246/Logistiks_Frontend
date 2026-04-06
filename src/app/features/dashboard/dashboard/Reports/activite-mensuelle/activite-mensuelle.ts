import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NotificationComponent } from "../../../../../core/components/notification-component/notification-component";
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { finalize, Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { SidebarComponent } from '../../../../../core/components/sidebar-component/sidebar-component';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import { VehicleType, FuelType, ExportFormat } from '../../../../../core/models/Enums/Logistiks-enums';
import { VehicleDto } from '../../../../../core/models/Vehicles/Vehicle.dtos';
import { Auth } from '../../../../../core/services/Auth/auth';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Token } from '../../../../../core/services/Token/token';
import { Vehicles } from '../../../../../core/services/Vehicles/vehicles';
import { MonthlyActivityResult, VehicleActivityEntry, DailyRevenueEntry } from '../../../../../core/models/Reports/report-results.models';
import { ReportResultDto } from '../../../../../core/models/Reports/report.models';
import { Reports } from '../../../../../core/services/Reports/reports';

@Component({
  selector: 'app-activite-mensuelle',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NotificationComponent, SidebarComponent],
  templateUrl: './activite-mensuelle.html',
  styleUrl: './activite-mensuelle.scss',
})
export class ActiviteMensuelle implements OnInit, OnDestroy {

  // ============================================================================
  // SECTION 1 : DONNÉES DU RAPPORT
  // ============================================================================

  /** Résultat complet du rapport reçu de l'API */
  reportResult: ReportResultDto | null = null;

  /** Données typées du rapport RPT-01 */
  reportData: MonthlyActivityResult | null = null;

  /** Top 3 véhicules les plus rentables */
  topVehicles: VehicleActivityEntry[] = [];

  /** Bottom 3 véhicules les moins rentables */
  bottomVehicles: VehicleActivityEntry[] = [];

  /** Détail journalier des revenus */
  dailyRevenue: DailyRevenueEntry[] = [];

  // ============================================================================
  // SECTION 2 : FILTRES DE PÉRIODE
  // ============================================================================

  /** Mois sélectionné (1-12) */
  selectedMonth: number = new Date().getMonth() + 1;

  /** Année sélectionnée */
  selectedYear: number = new Date().getFullYear();

  /** Période de début (ISO string) */
  periodStart: string = '';

  /** Période de fin (ISO string) */
  periodEnd: string = '';

  /** Liste des mois pour le sélecteur */
  months = [
    { value: 1,  label: 'Janvier' },
    { value: 2,  label: 'Février' },
    { value: 3,  label: 'Mars' },
    { value: 4,  label: 'Avril' },
    { value: 5,  label: 'Mai' },
    { value: 6,  label: 'Juin' },
    { value: 7,  label: 'Juillet' },
    { value: 8,  label: 'Août' },
    { value: 9,  label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' },
  ];

  /** Liste des années disponibles (5 ans en arrière) */
  years: number[] = [];

  // ============================================================================
  // SECTION 3 : ÉTATS DE L'INTERFACE
  // ============================================================================

  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';
  isExporting: boolean = false;

  /** Onglet actif du graphique : 'revenue' | 'expenses' | 'profit' */
  activeChartTab: 'revenue' | 'expenses' | 'profit' = 'revenue';

  /** Vue active des véhicules : 'top' | 'bottom' */
  vehicleView: 'top' | 'bottom' = 'top';

  // ============================================================================
  // SECTION 4 : GESTION UTILISATEUR
  // ============================================================================

  currentUser: any = null;
  userName: string = 'Utilisateur';
  userPhotoUrl: string = '';
  showUserMenu: boolean = false;
  isSidebarCollapsed: boolean = false;

  // ============================================================================
  // SECTION 5 : UTILITAIRES
  // ============================================================================

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
    this.initPeriod();
    this.loadReport();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // SECTION 7 : INITIALISATION
  // ============================================================================

  /** Génère les 5 dernières années */
  private initYears(): void {
    const current = new Date().getFullYear();
    for (let y = current; y >= current - 4; y--) {
      this.years.push(y);
    }
  }

  /** Initialise la période au mois en cours */
  private initPeriod(): void {
    const now = new Date();
    this.selectedMonth = now.getMonth() + 1;
    this.selectedYear = now.getFullYear();
    this.computePeriod();
  }

  /** Calcule periodStart et periodEnd à partir du mois/année sélectionnés */
  private computePeriod(): void {
    const firstDay = new Date(this.selectedYear, this.selectedMonth - 1, 1);
    const lastDay  = new Date(this.selectedYear, this.selectedMonth, 0, 23, 59, 59);
    this.periodStart = firstDay.toISOString();
    this.periodEnd   = lastDay.toISOString();
  }

  // ============================================================================
  // SECTION 8 : CHARGEMENT DU RAPPORT
  // ============================================================================

  /**
   * Charge le rapport RPT-01 pour la période sélectionnée.
   * Appelle GET /api/v1/reports/monthly-activity
   */
  loadReport(): void {
    this.isLoading  = true;
    this.hasError   = false;
    this.reportData = null;

    this.reportService
      .getMonthlyActivity({ periodStart: this.periodStart, periodEnd: this.periodEnd })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: (response: { success: any; data: ReportResultDto | null; message: string; }) => {
          if (response.success && response.data) {
            this.reportResult = response.data;
            this.reportData   = response.data.resultData as MonthlyActivityResult;
            this.topVehicles  = this.reportData?.topVehicles    ?? [];
            this.bottomVehicles = this.reportData?.bottomVehicles ?? [];
            this.dailyRevenue   = this.reportData?.dailyRevenue   ?? [];
          } else {
            this.hasError     = true;
            this.errorMessage = response.message ?? 'Erreur lors du chargement du rapport';
          }
        },
        error: (err: { message: string; }) => {
          this.hasError     = true;
          this.errorMessage = err.message ?? 'Erreur réseau';
          this.notificationService.error('Impossible de charger le rapport d\'activité', "top-right");
        }
      });
  }

  /** Déclenché quand l'utilisateur change le mois ou l'année */
  onPeriodChange(): void {
    this.computePeriod();
    this.loadReport();
  }

  /** Passe au mois précédent */
  previousMonth(): void {
    if (this.selectedMonth === 1) {
      this.selectedMonth = 12;
      this.selectedYear--;
    } else {
      this.selectedMonth--;
    }
    this.onPeriodChange();
  }

  /** Passe au mois suivant (bloqué si mois futur) */
  nextMonth(): void {
    const now = new Date();
    const isCurrentOrFuture =
      this.selectedYear > now.getFullYear() ||
      (this.selectedYear === now.getFullYear() && this.selectedMonth >= now.getMonth() + 1);

    if (isCurrentOrFuture) return;

    if (this.selectedMonth === 12) {
      this.selectedMonth = 1;
      this.selectedYear++;
    } else {
      this.selectedMonth++;
    }
    this.onPeriodChange();
  }

  /** Retourne true si le mois suivant est dans le futur */
  get isNextMonthDisabled(): boolean {
    const now = new Date();
    return (
      this.selectedYear > now.getFullYear() ||
      (this.selectedYear === now.getFullYear() && this.selectedMonth >= now.getMonth() + 1)
    );
  }

  /** Label de la période affichée */
  get periodLabel(): string {
    const month = this.months.find(m => m.value === this.selectedMonth);
    return `${month?.label ?? ''} ${this.selectedYear}`;
  }

  // ============================================================================
  // SECTION 9 : CALCULS ET ACCESSEURS
  // ============================================================================

  /** Pourcentage des dépenses de maintenance sur total dépenses */
  get maintenancePercent(): number {
    if (!this.reportData?.totalExpenses) return 0;
    return Math.round((this.reportData.maintenanceCost / this.reportData.totalExpenses) * 100);
  }

  /** Pourcentage des dépenses carburant sur total dépenses */
  get fuelPercent(): number {
    if (!this.reportData?.totalExpenses) return 0;
    return Math.round((this.reportData.fuelCost / this.reportData.totalExpenses) * 100);
  }

  /** Pourcentage des dépenses assurance sur total dépenses */
  get insurancePercent(): number {
    if (!this.reportData?.totalExpenses) return 0;
    return Math.round((this.reportData.insuranceCost / this.reportData.totalExpenses) * 100);
  }

  /** Pourcentage des autres dépenses sur total dépenses */
  get otherExpensesPercent(): number {
    if (!this.reportData?.totalExpenses) return 0;
    const other = (this.reportData.taxesCost ?? 0) + (this.reportData.otherCost ?? 0);
    return Math.round((other / this.reportData.totalExpenses) * 100);
  }

  /** Véhicules affichés selon la vue active (top ou bottom) */
  get displayedVehicles(): VehicleActivityEntry[] {
    return this.vehicleView === 'top' ? this.topVehicles : this.bottomVehicles;
  }

  /** Couleur de la marge bénéficiaire */
  get profitMarginColor(): string {
    const margin = this.reportData?.profitMarginPercent ?? 0;
    if (margin >= 30) return 'var(--rpt-success)';
    if (margin >= 15) return 'var(--rpt-warning)';
    return 'var(--rpt-danger)';
  }

  /** Formate un montant en FCFA */
  formatAmount(value: number): string {
  if (value == null || isNaN(value)) return '0 FCFA';

  if (value >= 1_000_000) {
    return new Intl.NumberFormat('fr-FR').format(Math.round(value)) + ' FCFA';
  }

  // Utiliser toLocaleString pour garder tous les chiffres significatifs
  return new Intl.NumberFormat('fr-FR').format(Math.round(value)) + ' FCFA';
}

  /** Formate un pourcentage avec signe */
  formatPercent(value: number, showSign = false): string {
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  /** Couleur d'un badge de niveau d'urgence véhicule (ROI) */
  getRoiClass(roi: number): string {
    if (roi >= 20) return 'badge-success';
    if (roi >= 10) return 'badge-warning';
    return 'badge-danger';
  }

  // ============================================================================
  // SECTION 10 : EXPORT
  // ============================================================================

  /**
   * Exporte le rapport au format demandé.
   * Utilise downloadReport() du service qui déclenche le téléchargement navigateur.
   */
  exportReport(format: ExportFormat): void {
    if (!this.reportResult?.id) {
      this.notificationService.error('Générez d\'abord le rapport avant d\'exporter', "top-right");
      return;
    }

    this.isExporting = true;
    const fileName   = `rapport-activite-${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;

    this.reportService.downloadReport(this.reportResult.id, format, fileName);

    setTimeout(() => (this.isExporting = false), 2000);
  }

  // ============================================================================
  // SECTION 11 : GESTION UTILISATEUR (pattern existant)
  // ============================================================================

  private checkAuthentication(): void {
    const token = this.tokenService.getToken();
    if (!token) this.router.navigate(['/auth/login']);
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
          if (error.status === 401) this.tokenService.handleTokenExpired();
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
    const colors = ['FF6B6B', '4ECDC4', 'FFD166', '06D6A0', '118AB2', 'EF476F', '7209B7', '3A86FF'];
    const idx    = name.length % colors.length;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${colors[idx]}&color=fff&size=128`;
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

  toggleUserMenu(): void  { this.showUserMenu = !this.showUserMenu; }
  toggleSidebar(): void   { this.isSidebarCollapsed = !this.isSidebarCollapsed; }

  toggleMenu(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    el?.parentElement?.classList.toggle('open');
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
      .subscribe({ next: () => this.router.navigate(['/auth/login']),
                   error: () => this.router.navigate(['/auth/login']) });
  }
}
