import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { NotificationComponent } from '../../../../../core/components/notification-component/notification-component';
import { SidebarComponent } from '../../../../../core/components/sidebar-component/sidebar-component';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import { VehicleType, FuelType } from '../../../../../core/models/Enums/Logistiks-enums';
import { VehicleDto, VehicleSearchCriteria } from '../../../../../core/models/Vehicles/Vehicle.dtos';
import { Auth } from '../../../../../core/services/Auth/auth';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Token } from '../../../../../core/services/Token/token';
import { Rentability } from '../../../../../core/services/Rentability/rentability';
import { VehicleRoiResponse } from '../../../../../core/models/Rentability/Rentability.types';
import { Vehicles } from '../../../../../core/services/Vehicles/vehicles';
import { ApiResponseData } from '../../../../../core/models/Common/ApiResponseData';

// ── Interfaces locales ─────────────────────────────────────────────────────────

export interface MonthlyBreakdown {
  month: string;      // ex. "Jan 2025"
  revenue:  number;
  expenses: number;
  profit:   number;   // ← Requis par votre composant
}

export interface ExpenseBreakdownItem {
  label:  string;
  amount: number;
  pct:    number;
  color:  string;
}

// Interface pour la réponse API (si différente)
export interface MonthlyRoiEntry {
  month: string;
  revenue: number;
  expenses: number;
  // Pas de profit dans l'API ?
}

export interface VehicleRoiResult {
  vehicleCode:             string;
  vehicleName:             string;
  periodStart:             Date;
  periodEnd:               Date;
  totalRevenue:            number;
  totalExpenses:           number;
  netProfit:               number;
  profitMarginPercent:     number;
  roiPercent:              number;
  utilizationRatePercent:  number;
  acquisitionCost:         number;
  monthlyBreakdown?:       MonthlyBreakdown[];  // ← Attend profit
  // Dépenses ventilées
  maintenanceCost?:        number;
  fuelCost?:               number;
  insuranceCost?:          number;
  otherCost?:              number;
}



// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT
// ══════════════════════════════════════════════════════════════════════════════

@Component({
  selector: 'app-vehicule-roi',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NotificationComponent,
    SidebarComponent
  ],
  templateUrl: './vehicule-roi.html',
  styleUrl: './vehicule-roi.scss',
})
export class VehiculeRoi implements OnInit, OnDestroy {

  // ── Données ROI ──────────────────────────────────────────────────────────────
  selectedVehicleId: string    = '';
  selectedVehicle:   VehicleDto | null = null;
  periodStartStr:    string    = '';
  periodEndStr:      string    = '';
  todayStr:          string    = '';
  isLoading:         boolean   = false;
  roiResult:         VehicleRoiResult | null = null;

  // ── Données véhicules ────────────────────────────────────────────────────────
  allVehicles: VehicleDto[] = [];

  // ── Utilisateur ──────────────────────────────────────────────────────────────
  currentUser:    any    = null;
  userName:       string = 'Utilisateur';
  userPhotoUrl:   string = '';
  showUserMenu:   boolean = false;

  // ── UI ───────────────────────────────────────────────────────────────────────
  isSidebarCollapsed: boolean = false;

  // ── Enums ────────────────────────────────────────────────────────────────────
  vehicleType = VehicleType;
  fuelType    = FuelType;
  Math        = Math;

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder:         FormBuilder,
    private vehiclesService:     Vehicles,
    private rentabilityService:  Rentability,
    private notificationService: NotificationService,
    private authService:         Auth,
    private tokenService:        Token,
    private router:              Router
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ══════════════════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.checkAuthentication();
    this.loadCurrentUser();
    this.initDates();
    this.loadVehicles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INITIALISATION
  // ══════════════════════════════════════════════════════════════════════════

  private initDates(): void {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    this.todayStr      = this.toDateInputStr(now);
    this.periodStartStr = this.toDateInputStr(start);
    this.periodEndStr   = this.toDateInputStr(now);
  }

  /**
     * Charge la liste des véhicules
     */
    loadVehicles(): void {
      const criteria: VehicleSearchCriteria = {
        searchTerm: '',
        status: undefined,
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
              this.allVehicles = response.data;
            }
          },
          error: (err) => {
            console.error('Erreur chargement véhicules:', err);
            this.notificationService.error(
              'Erreur chargement véhicules',
              'Impossible de charger la liste des véhicules'
            );
          }
        });
    }

  // ══════════════════════════════════════════════════════════════════════════
  // CALCUL ROI
  // ══════════════════════════════════════════════════════════════════════════

  onVehicleChange(): void {
    this.selectedVehicle = this.allVehicles.find(v => v.id === this.selectedVehicleId) ?? null;
    this.roiResult = null;
  }

  calculateRoi(): void {
    if (!this.selectedVehicleId || !this.periodStartStr || !this.periodEndStr) return;

    const start = new Date(this.periodStartStr);
    const end   = new Date(this.periodEndStr);

    if (start >= end) {
      this.notificationService.error('La date de début doit être antérieure à la date de fin', 'Veuillez sélectionner une période valide.');
      return;
    }

    this.isLoading = true;
    this.roiResult = null;

    this.rentabilityService.getVehicleRoi(this.selectedVehicleId, start, end)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const data: VehicleRoiResponse = response?.data ?? response;
          this.roiResult = this.mapToRoiResult(data);
          this.isLoading = false;
          this.notificationService.success('Analyse ROI calculée avec succès', 'Les données de rentabilité ont été mises à jour.');
        },
        error: (err) => {
          console.error('Erreur calcul ROI:', err);
          this.isLoading = false;
          this.notificationService.error('Impossible de calculer le ROI. Vérifiez les données disponibles.', 'Aucun résultat de rentabilité trouvé pour ce véhicule et cette période.');
        }
      });
  }

  private mapToRoiResult(data: VehicleRoiResponse): VehicleRoiResult {
    const vehicle = this.selectedVehicle;
    return {
      vehicleCode:            data.vehicleCode            ?? vehicle?.code ?? '',
      vehicleName:            data.vehicleName            ?? `${vehicle?.brand} ${vehicle?.model}`,
      periodStart:            new Date(data.periodStart   ?? this.periodStartStr),
      periodEnd:              new Date(data.periodEnd     ?? this.periodEndStr),
      totalRevenue:           data.totalRevenue            ?? 0,
      totalExpenses:          data.totalExpenses           ?? 0,
      netProfit:              data.netProfit               ?? 0,
      profitMarginPercent:    data.profitMarginPercent     ?? 0,
      roiPercent:             data.roiPercent              ?? 0,
      utilizationRatePercent: data.utilizationRatePercent  ?? 0,
      acquisitionCost:        data.acquisitionCost         ?? vehicle?.acquisitionCost ?? 0,
      monthlyBreakdown:       (data.monthlyBreakdown ?? []).map(entry => ({
        month: String(entry.month),
        revenue: entry.revenue,
        expenses: entry.expenses,
        profit: entry.revenue - entry.expenses
      })),
      maintenanceCost:        data.maintenanceCost         ?? 0,
      fuelCost:               data.fuelCost               ?? 0,
      insuranceCost:          data.insuranceCost          ?? 0,
      otherCost:              data.otherCost              ?? 0,
    };
  }

  resetForm(): void {
    this.roiResult        = null;
    this.selectedVehicleId = '';
    this.selectedVehicle  = null;
    this.initDates();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RACCOURCIS PÉRIODES
  // ══════════════════════════════════════════════════════════════════════════

  setShortcut(period: 'month' | 'prev-month' | 'quarter' | 'year'): void {
    const now = new Date();

    switch (period) {
      case 'month':
        this.periodStartStr = this.toDateInputStr(new Date(now.getFullYear(), now.getMonth(), 1));
        this.periodEndStr   = this.todayStr;
        break;

      case 'prev-month':
        this.periodStartStr = this.toDateInputStr(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        this.periodEndStr   = this.toDateInputStr(new Date(now.getFullYear(), now.getMonth(), 0));
        break;

      case 'quarter': {
        const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        this.periodStartStr = this.toDateInputStr(qStart);
        this.periodEndStr   = this.todayStr;
        break;
      }

      case 'year':
        this.periodStartStr = this.toDateInputStr(new Date(now.getFullYear(), 0, 1));
        this.periodEndStr   = this.todayStr;
        break;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MÉTHODES TEMPLATE — GAUGES
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Calcule le dashoffset SVG pour la jauge ROI
   * stroke-dasharray = 2πr = 2 × π × 50 ≈ 314
   */
  getRoiDashOffset(roiPercent: number): number {
    const circumference = 314;
    const clamped = Math.max(-100, Math.min(200, roiPercent));
    const ratio = Math.max(0, Math.min(1, (clamped + 100) / 200));
    return circumference * (1 - ratio);
  }

  /** Calcule le dashoffset SVG pour la jauge utilisation (0–100 %) */
  getUtilDashOffset(utilPercent: number): number {
    const circumference = 314;
    const ratio = Math.max(0, Math.min(1, utilPercent / 100));
    return circumference * (1 - ratio);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MÉTHODES TEMPLATE — DÉPENSES
  // ══════════════════════════════════════════════════════════════════════════

  getExpenseBreakdown(): ExpenseBreakdownItem[] {
    if (!this.roiResult || this.roiResult.totalExpenses === 0) return [];

    const total = this.roiResult.totalExpenses;

    const categories = [
      { label: 'Maintenance',   amount: this.roiResult.maintenanceCost ?? 0, color: '#696cff' },
      { label: 'Carburant',     amount: this.roiResult.fuelCost        ?? 0, color: '#ffab00' },
      { label: 'Assurance',     amount: this.roiResult.insuranceCost   ?? 0, color: '#28c76f' },
      { label: 'Autres',        amount: this.roiResult.otherCost       ?? 0, color: '#8592a3' },
    ];

    return categories
      .filter(c => c.amount > 0)
      .map(c => ({ ...c, pct: (c.amount / total) * 100 }));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MÉTHODES TEMPLATE — ÉVOLUTION MENSUELLE
  // ══════════════════════════════════════════════════════════════════════════

  getMaxMonthlyValue(): number {
    if (!this.roiResult?.monthlyBreakdown?.length) return 1;
    return Math.max(
      ...this.roiResult.monthlyBreakdown.flatMap(m => [m.revenue, m.expenses])
    ) || 1;
  }

  getBarHeight(value: number, max: number): number {
    if (max === 0) return 0;
    return Math.max(4, (value / max) * 100);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MÉTHODES TEMPLATE — SYNTHÈSE
  // ══════════════════════════════════════════════════════════════════════════

  getAmortizationDuration(): string {
    if (!this.roiResult) return '—';

    const { acquisitionCost, totalRevenue, totalExpenses } = this.roiResult;
    if (acquisitionCost <= 0 || totalRevenue <= totalExpenses) return 'Non rentable';

    // Durée période en jours
    const start   = this.roiResult.periodStart;
    const end     = this.roiResult.periodEnd;
    const days    = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    const netProfit = totalRevenue - totalExpenses;

    // Profit journalier → durée pour amortir le coût d'acquisition
    const dailyProfit = netProfit / days;
    if (dailyProfit <= 0) return 'Non rentable';

    const daysToAmortize = acquisitionCost / dailyProfit;

    if (daysToAmortize < 30)    return `~${Math.round(daysToAmortize)} jour(s)`;
    if (daysToAmortize < 365)   return `~${Math.round(daysToAmortize / 30)} mois`;
    return `~${(daysToAmortize / 365).toFixed(1)} ans`;
  }

  getDailyRevenue(): number {
    if (!this.roiResult) return 0;

    const start = this.roiResult.periodStart;
    const end   = this.roiResult.periodEnd;
    const days  = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;

    return this.roiResult.totalRevenue / days;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FORMATAGE
  // ══════════════════════════════════════════════════════════════════════════

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style:                 'currency',
      currency:              'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount ?? 0);
  }

  formatAmountShort(amount: number): string {
    const abs = Math.abs(amount ?? 0);
    const sign = amount < 0 ? '-' : '';

    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)     return `${sign}${(abs / 1_000).toFixed(0)}k`;
    return `${sign}${abs.toFixed(0)}`;
  }

  formatShortDate(date: Date | string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day:   '2-digit',
      month: 'short',
      year:  'numeric',
    });
  }

  private toDateInputStr(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AUTHENTIFICATION & UTILISATEUR
  // ══════════════════════════════════════════════════════════════════════════

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
          console.error('Erreur chargement utilisateur:', error);
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
    if (user.photoUrl && user.photoUrl.startsWith('http'))
      return user.photoUrl;
    return this.generateAvatarUrl(user);
  }

  generateAvatarUrl(user: User): string {
    const name   = this.formatUserName(user);
    const colors = ['FF6B6B','4ECDC4','FFD166','06D6A0','118AB2','EF476F','7209B7','3A86FF'];
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

  // ══════════════════════════════════════════════════════════════════════════
  // UI
  // ══════════════════════════════════════════════════════════════════════════

  toggleUserMenu(): void { this.showUserMenu = !this.showUserMenu; }

  @HostListener('document:click', ['$event'])
  closeUserMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-toggle') && !target.closest('.dropdown-menu')) {
      this.showUserMenu = false;
    }
  }

  toggleSidebar(): void { this.isSidebarCollapsed = !this.isSidebarCollapsed; }

  toggleMenu(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    el?.parentElement?.classList.toggle('open');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DÉCONNEXION
  // ══════════════════════════════════════════════════════════════════════════

  logout(): void {
    this.tokenService.logout();
    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  () => this.router.navigate(['/auth/login']),
        error: () => this.router.navigate(['/auth/login'])
      });
  }
}
