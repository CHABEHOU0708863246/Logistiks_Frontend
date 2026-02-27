import { Component, HostListener } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../../environments/environment.development';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import { VehicleType, FuelType } from '../../../../../core/models/Enums/Logistiks-enums';
import { VehicleDto } from '../../../../../core/models/Vehicles/Vehicle.dtos';
import { Auth } from '../../../../../core/services/Auth/auth';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Token } from '../../../../../core/services/Token/token';
import { Vehicles } from '../../../../../core/services/Vehicles/vehicles';
import { NotificationComponent } from "../../../../../core/components/notification-component/notification-component";
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../../../../core/components/sidebar-component/sidebar-component';

@Component({
  selector: 'app-about-home',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NotificationComponent, SidebarComponent],
  templateUrl: './about-home.html',
  styleUrl: './about-home.scss',
})
export class AboutHome {

  // ============================================================================
  // SECTION 2: PROPRIÉTÉS DE DONNÉES ET D'ÉTAT
  // ============================================================================

  /** Statistiques du tableau de bord (pour affichage) */
  dashboardStats = {
    totalTiers: 0,
    activeTiers: 0,
    activeContracts: 0,
    recoveryRate: 0,
    documentsPending: 0,
    paymentsOverdue: 0,
    vehiclesNeedingAttention: 0,
    totalClients: 0,
    totalSuppliers: 0
  };

  // Statistiques
  validInsurances: number = 0;
  expiredInsurances: number = 0;
  expiringInsurances: number = 0;
  totalAnnualCost: number = 0;

  // Alertes
  monthlyRenewalCount: number = 0;

  allVehicles: VehicleDto[] = [];

  // Filtres
  filterStatus: string = '';
  filterCompany: string = '';
  searchTerm: string = '';
  insuranceCompanies: string[] = [];

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  visiblePages: number[] = [];

  // Tri
  sortColumn: string = '';
  sortAscending: boolean = true;

  // Math pour le template
  Math = Math;

  // ============================================================================
  // SECTION 3: PROPRIÉTÉS DE GESTION UTILISATEUR
  // ============================================================================

  /** Utilisateur actuellement connecté */
  currentUser: any = null;

  /** Nom d'affichage de l'utilisateur */
  userName: string = 'Utilisateur';

  /** URL de la photo de profil de l'utilisateur */
  userPhotoUrl: string = '';

  /** Contrôle l'affichage du menu utilisateur */
  showUserMenu: boolean = false;

  // ============================================================================
  // SECTION 4: PROPRIÉTÉS D'INTERFACE UTILISATEUR
  // ============================================================================

  /** État de réduction de la barre latérale */
  isSidebarCollapsed: boolean = false;

  // ============================================================================
    // SECTION 5: ÉNUMÉRATIONS ET SERVICES
    // ============================================================================

    /** Types de véhicules disponibles */
    vehicleType = VehicleType;

    /** Types de carburant disponibles */
    fuelType = FuelType;

    /** Subject pour la gestion de la destruction des observables */
    private destroy$ = new Subject<void>();

    constructor(
    private formBuilder: FormBuilder,
    private vehiclesService: Vehicles,
    private notificationService: NotificationService,
    private authService: Auth,
    private tokenService: Token,
    private router: Router
  ) {
  }


  /**
   * Initialise le composant
   * Vérifie l'authentification et charge les données utilisateur
   */
  ngOnInit(): void {
    this.checkAuthentication();
    this.loadCurrentUser();
  }

  /**
     * Nettoie les ressources à la destruction du composant
     * Désabonne tous les observables
     */
    ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
    }

    // ============================================================================
    // SECTION 8: GESTION D'AUTHENTIFICATION ET UTILISATEUR
    // ============================================================================

    /**
     * Vérifie la présence d'un token d'authentification
     * Redirige vers la page de login si absent
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
          },
          error: (error) => {
            console.error('Erreur chargement utilisateur:', error);
            this.handleUserLoadError(error);
          }
        });
    }

    /**
     * Gère les erreurs de chargement de l'utilisateur
     * @param error - Erreur survenue
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

    /**
     * Formate le nom d'utilisateur pour l'affichage
     * @param user - Objet utilisateur
     * @returns Nom formaté pour l'affichage
     */
    formatUserName(user: any): string {
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
     * @param user - Objet utilisateur
     * @returns URL de la photo de profil
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
     * @param user - Objet utilisateur
     * @returns URL de l'avatar généré
     */
    generateAvatarUrl(user: User): string {
      const name = this.formatUserName(user);
      const colors = ['FF6B6B', '4ECDC4', 'FFD166', '06D6A0', '118AB2', 'EF476F', '7209B7', '3A86FF'];
      const colorIndex = name.length % colors.length;

      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${colors[colorIndex]}&color=fff&size=128`;
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

    /**
     * Obtient l'avatar par défaut
     * @returns URL de l'avatar par défaut
     */
    getDefaultAvatar(): string {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=696cff&color=fff&size=128`;
    }


    // ============================================================================
  // SECTION 11: GESTION DE L'INTERFACE UTILISATEUR
  // ============================================================================

  /**
   * Bascule l'affichage du menu utilisateur
   */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  /**
   * Écouteur d'événement pour fermer le menu utilisateur
   * @param event - Événement de clic
   */
  @HostListener('document:click', ['$event'])
  closeUserMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-toggle') && !target.closest('.dropdown-menu')) {
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
   * @param event - Événement de clic
   */
  toggleMenu(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    if (element && element.parentElement) {
      element.parentElement.classList.toggle('open');
    }
  }

  // ============================================================================
  // SECTION 12: GESTION DE LA DÉCONNEXION
  // ============================================================================

  /**
   * Gère le processus de déconnexion
   * Nettoie le token et redirige vers la page de login
   */
  logout(): void {
    this.tokenService.logout();

    this.authService.logout()
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

