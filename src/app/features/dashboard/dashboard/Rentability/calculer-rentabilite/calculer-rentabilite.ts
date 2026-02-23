import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';

// ============================================================================
// CORE IMPORTS
// ============================================================================
import { NotificationComponent } from '../../../../../core/components/notification-component/notification-component';
import { SidebarComponent } from '../../../../../core/components/sidebar-component/sidebar-component';
import { environment } from '../../../../../../environments/environment';

// ============================================================================
// MODELS IMPORTS
// ============================================================================
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import { VehicleType, FuelType } from '../../../../../core/models/Enums/Logistiks-enums';
import { VehicleDto, VehicleSearchCriteria } from '../../../../../core/models/Vehicles/Vehicle.dtos';
import { VehicleRoiResponse } from '../../../../../core/models/Rentability/Rentability.types';
import { ApiResponseData } from '../../../../../core/models/Common/ApiResponseData';

// ============================================================================
// SERVICES IMPORTS
// ============================================================================
import { Auth } from '../../../../../core/services/Auth/auth';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Token } from '../../../../../core/services/Token/token';
import { Vehicles } from '../../../../../core/services/Vehicles/vehicles';
import { Rentability } from '../../../../../core/services/Rentability/rentability';

// ============================================================================
// INTERFACES INTERNES
// ============================================================================

/**
 * Interface pour la ventilation des dépenses
 */
interface ExpenseItem {
  label: string;
  amount: number;
  pct: number;
  color: string;
}

@Component({
  selector: 'app-calculer-rentabilite',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NotificationComponent,
    SidebarComponent,
  ],
  templateUrl: './calculer-rentabilite.html',
  styleUrl: './calculer-rentabilite.scss',
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('400ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class CalculerRentabilite implements OnInit, OnDestroy {
  // ============================================================================
  // SECTION 1: ÉNUMÉRATIONS ET CONSTANTES
  // ============================================================================

  readonly vehicleType = VehicleType;
  readonly fuelType = FuelType;
  readonly Math = Math;

  /** Couleurs pour la ventilation des dépenses */
  private readonly EXPENSE_COLORS: Record<string, string> = {
    Maintenance: '#f5c842',
    Carburant: '#5eb8ff',
    Assurance: '#10e8a0',
    Taxes: '#a78bfa',
    Autre: '#f4617a',
  };

  // ============================================================================
  // SECTION 2: DONNÉES DU FORMULAIRE
  // ============================================================================

  /** ID du véhicule sélectionné */
  selectedVehicleId: string = '';

  /** Objet véhicule sélectionné pour l'aperçu */
  selectedVehicle: VehicleDto | null = null;

  /** Date de début de période (format string pour input) */
  periodStartStr: string = '';

  /** Date de fin de période (format string pour input) */
  periodEndStr: string = '';

  /** Date du jour pour les inputs (max) */
  todayStr: string = new Date().toISOString().substring(0, 10);

  // ============================================================================
  // SECTION 3: DONNÉES PRINCIPALES
  // ============================================================================

  /** Liste complète des véhicules */
  allVehicles: VehicleDto[] = [];

  /** Résultat du calcul ROI */
  roiResult: VehicleRoiResponse | null = null;

  // ============================================================================
  // SECTION 4: ÉTATS DE CHARGEMENT
  // ============================================================================

  /** Indicateur de chargement */
  isLoading: boolean = false;

  // ============================================================================
  // SECTION 5: UTILISATEUR ET INTERFACE
  // ============================================================================

  /** Utilisateur connecté */
  currentUser: User | null = null;

  /** Nom d'affichage de l'utilisateur */
  userName: string = 'Utilisateur';

  /** URL de la photo de profil */
  userPhotoUrl: string = '';

  /** Contrôle l'affichage du menu utilisateur */
  showUserMenu: boolean = false;

  /** État de réduction de la barre latérale */
  isSidebarCollapsed: boolean = false;

  // ============================================================================
  // SECTION 6: GESTION DES SUBSCRIPTIONS
  // ============================================================================

  /** Subject pour la destruction des observables */
  private destroy$ = new Subject<void>();

  // ============================================================================
  // SECTION 7: CONSTRUCTEUR
  // ============================================================================

  constructor(
    private formBuilder: FormBuilder,
    private vehiclesService: Vehicles,
    private rentabilityService: Rentability,
    private notificationService: NotificationService,
    private authService: Auth,
    private tokenService: Token,
    private router: Router,
  ) {}

  // ============================================================================
  // SECTION 8: CYCLE DE VIE DU COMPOSANT
  // ============================================================================

  ngOnInit(): void {
    this.checkAuthentication();
    this.loadCurrentUser();
    this.loadVehicles();
    this.setShortcut('month');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // SECTION 9: CHARGEMENT DES DONNÉES
  // ============================================================================

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

  // ============================================================================
  // SECTION 10: GESTION DU FORMULAIRE
  // ============================================================================

  /**
   * Met à jour l'aperçu du véhicule lors du changement de sélection
   */
  onVehicleChange(): void {
    this.selectedVehicle = this.allVehicles.find(v => v.id === this.selectedVehicleId) ?? null;
    this.roiResult = null;
  }

  /**
   * Positionne les dates selon le raccourci choisi
   */
  setShortcut(shortcut: 'month' | 'prev-month' | 'quarter' | 'year'): void {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().substring(0, 10);

    switch (shortcut) {
      case 'month':
        this.periodStartStr = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
        this.periodEndStr = fmt(now);
        break;

      case 'prev-month': {
        const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const last = new Date(now.getFullYear(), now.getMonth(), 0);
        this.periodStartStr = fmt(first);
        this.periodEndStr = fmt(last);
        break;
      }

      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        this.periodStartStr = fmt(new Date(now.getFullYear(), quarter * 3, 1));
        this.periodEndStr = fmt(now);
        break;
      }

      case 'year':
        this.periodStartStr = fmt(new Date(now.getFullYear(), 0, 1));
        this.periodEndStr = fmt(now);
        break;
    }
  }

  // ============================================================================
  // SECTION 11: CALCUL DU ROI
  // ============================================================================

  /**
   * Lance le calcul de rentabilité
   */
  calculateRoi(): void {
    if (!this.selectedVehicleId || !this.periodStartStr || !this.periodEndStr) {
      this.notificationService.warning('Formulaire incomplet', 'Veuillez sélectionner un véhicule et une période');
      return;
    }

    const start = new Date(this.periodStartStr);
    const end = new Date(this.periodEndStr);

    if (start > end) {
      this.notificationService.error('Erreur de période', 'La date de début doit être antérieure à la date de fin');
      return;
    }

    this.isLoading = true;
    this.roiResult = null;

    this.rentabilityService.getVehicleRoi(this.selectedVehicleId, start, end)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success && response.data) {
            this.roiResult = response.data;
          } else {
            this.notificationService.error('Erreur de calcul', response.message ?? 'Erreur lors du calcul');
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.notificationService.error('Erreur serveur', 'Erreur lors du calcul de rentabilité');
          console.error(err);
        },
      });
  }

  /**
   * Réinitialise le formulaire et les résultats
   */
  resetForm(): void {
    this.roiResult = null;
    this.selectedVehicleId = '';
    this.selectedVehicle = null;
    this.setShortcut('month');
  }

  // ============================================================================
  // SECTION 12: HELPERS POUR LE TEMPLATE
  // ============================================================================

  /**
   * Construit la liste ventilée des dépenses pour les barres
   */
  getExpenseBreakdown(): ExpenseItem[] {
    if (!this.roiResult || this.roiResult.totalExpenses === 0) return [];

    const total = this.roiResult.totalExpenses;
    const raw = [
      { label: 'Maintenance', amount: this.roiResult.maintenanceCost },
      { label: 'Carburant', amount: this.roiResult.fuelCost },
      { label: 'Assurance', amount: this.roiResult.insuranceCost },
      { label: 'Taxes', amount: this.roiResult.taxesCost },
      { label: 'Autre', amount: this.roiResult.otherCost },
    ];

    return raw
      .filter(item => item.amount > 0)
      .map(item => ({
        label: item.label,
        amount: item.amount,
        pct: Math.round((item.amount / total) * 100 * 10) / 10,
        color: this.EXPENSE_COLORS[item.label] ?? '#8b90a7',
      }));
  }

  /**
   * Calcule le stroke-dashoffset pour la jauge ROI (max visuel = 30%)
   */
  getRoiDashOffset(roi: number): number {
    const circumference = 314;
    const maxRoi = 30;
    const clamped = Math.min(Math.max(roi, 0), maxRoi);
    const fill = (clamped / maxRoi) * circumference;
    return circumference - fill;
  }

  /**
   * Calcule le stroke-dashoffset pour la jauge d'utilisation
   */
  getUtilDashOffset(rate: number): number {
    const circumference = 314;
    const clamped = Math.min(Math.max(rate, 0), 100);
    const fill = (clamped / 100) * circumference;
    return circumference - fill;
  }

  /**
   * Largeur de la mini-barre mensuelle
   */
  getMonthlyBarWidth(revenue: number): number {
    if (!this.roiResult?.monthlyBreakdown?.length) return 0;
    const max = Math.max(...this.roiResult.monthlyBreakdown.map(m => m.revenue));
    return max > 0 ? Math.round((revenue / max) * 100) : 0;
  }

  /**
   * Formate un montant en FCFA
   */
  formatAmount(amount: number): string {
    return this.rentabilityService.formatAmount(amount);
  }

  /**
   * Formate une date
   */
  formatShortDate(isoDate: string | Date): string {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(d);
  }

  // ============================================================================
  // SECTION 13: GESTION DE L'AUTHENTIFICATION
  // ============================================================================

  /**
   * Vérifie la présence d'un token valide
   */
  private checkAuthentication(): void {
    if (!this.tokenService.getToken()) {
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Charge les informations de l'utilisateur connecté
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
        error: (err) => {
          if (err.status === 401) {
            this.tokenService.handleTokenExpired();
          } else {
            this.setDefaultUser();
          }
        },
      });
  }

  /**
   * Définit les valeurs par défaut pour l'utilisateur
   */
  private setDefaultUser(): void {
    this.userName = 'Utilisateur Logistiks';
    this.userPhotoUrl = this.generateAvatarUrl({ firstName: 'Utilisateur' } as User);
  }

  /**
   * Formate le nom d'utilisateur
   */
  formatUserName(user: any): string {
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    if (user?.firstName) return user.firstName;
    if (user?.username) return user.username;
    if (user?.email) return user.email.split('@')[0];
    return 'Utilisateur Logistiks';
  }

  /**
   * Obtient l'URL de la photo de profil
   */
  getUserPhotoUrl(user: User): string {
    if (user.photoUrl && /^[0-9a-fA-F]{24}$/.test(user.photoUrl)) {
      return `${environment.apiUrl}/api/User/photo/${user.photoUrl}`;
    }
    if (user.photoUrl?.startsWith('http')) return user.photoUrl;
    return this.generateAvatarUrl(user);
  }

  /**
   * Génère une URL d'avatar
   */
  generateAvatarUrl(user: User): string {
    const name = this.formatUserName(user);
    const colors = ['FF6B6B', '4ECDC4', 'FFD166', '06D6A0', '118AB2', 'EF476F', '7209B7', '3A86FF'];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${colors[name.length % colors.length]}&color=fff&size=128`;
  }

  /**
   * Obtient les initiales de l'utilisateur
   */
  getUserInitials(): string {
    const parts = this.userName.split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : this.userName[0].toUpperCase();
  }

  /**
   * Obtient l'avatar par défaut
   */
  getDefaultAvatar(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=696cff&color=fff&size=128`;
  }

  // ============================================================================
  // SECTION 14: GESTION DE L'INTERFACE UTILISATEUR
  // ============================================================================

  /**
   * Bascule le menu utilisateur
   */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  /**
   * Bascule la barre latérale
   */
  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  /**
   * Bascule un menu (dropdown)
   */
  toggleMenu(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    el?.parentElement?.classList.toggle('open');
  }

  // ============================================================================
  // SECTION 15: GESTIONNAIRES D'ÉVÉNEMENTS GLOBAUX
  // ============================================================================

  @HostListener('document:click', ['$event'])
  closeUserMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-toggle') && !target.closest('.dropdown-menu')) {
      this.showUserMenu = false;
    }
  }

  // ============================================================================
  // SECTION 16: DÉCONNEXION
  // ============================================================================

  /**
   * Déconnecte l'utilisateur
   */
  logout(): void {
    this.tokenService.logout();
    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.router.navigate(['/auth/login']),
        error: () => this.router.navigate(['/auth/login']),
      });
  }

  // ============================================================================
  // SECTION 17: GETTERS POUR LE TEMPLATE (si nécessaire)
  // ============================================================================

  // Pas de getters particuliers pour ce composant

  // ============================================================================
  // FIN DU COMPOSANT
  // ============================================================================
}
