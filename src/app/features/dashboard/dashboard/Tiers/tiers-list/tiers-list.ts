import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PaginatedResponse } from '../../../../../core/models/Common/PaginatedResponse';
import { TierRoleType, TierStatus } from '../../../../../core/models/Enums/Logistiks-enums';
import { Tier } from '../../../../../core/models/Tiers/Tiers';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import { Tiers } from '../../../../../core/services/Tiers/tiers';
import { Notification } from '../../../../../core/services/Notification/notification';
import { Auth } from '../../../../../core/services/Auth/auth';
import { Token } from '../../../../../core/services/Token/token';
import { environment } from '../../../../../../environments/environment.development';

@Component({
  selector: 'app-tiers-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './tiers-list.html',
  styleUrls: ['./tiers-list.scss']
})
export class TiersList implements OnInit, OnDestroy {
  // Export des enums pour utilisation dans le template
  TierStatus = TierStatus;
  TierRoleType = TierRoleType;

  // Données
  tiers: Tier[] = [];
  pagination: PaginatedResponse<Tier> = {
    data: [],
    currentPage: 1,
    pageSize: 50,
    totalCount: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false
  };

  // Filtres
  searchTerm: string = '';
  selectedRole?: TierRoleType;
  selectedStatus?: TierStatus;
  pageSizeOptions = [10, 25, 50, 100];

  // États
  loading = false;
  error: string | null = null;
  sidebarVisible = false;

  // Gestion utilisateur
  currentUser: User | null = null;
  userName: string = 'Utilisateur';
  userPhotoUrl: string = '';
  showUserMenu: boolean = false;
  isSidebarCollapsed: boolean = false;

  // États des sous-menus ouverts
  isTiersMenuOpen: boolean = true;
  isVehiculesMenuOpen: boolean = false;
  isDocumentsMenuOpen: boolean = false;
  isContratsMenuOpen: boolean = false;
  isComptesMenuOpen: boolean = false;
  isPaiementsMenuOpen: boolean = false;
  isChargesMenuOpen: boolean = false;
  isReportingMenuOpen: boolean = false;
  isParametrageMenuOpen: boolean = false;

  // Options de tri
  sortOptions = [
    { value: 'updatedAt', label: 'Date de modification', icon: 'bx bx-calendar' },
    { value: 'createdAt', label: 'Date de création', icon: 'bx bx-plus-circle' },
    { value: 'lastName', label: 'Nom', icon: 'bx bx-sort-a-z' },
    { value: 'tierNumber', label: 'Numéro de tier', icon: 'bx bx-hash' },
    { value: 'status', label: 'Statut', icon: 'bx bx-check-circle' }
  ];

  selectedSort = this.sortOptions[0].value;
  sortDescending = true;

  // Rôles disponibles
  roles = [
    { value: TierRoleType.ClientParticulier, label: 'Client Particulier', icon: 'bx bx-user', color: 'primary' },
    { value: TierRoleType.Supplier, label: 'Fournisseur', icon: 'bx bx-truck', color: 'info' },
    { value: TierRoleType.ClientLivreur, label: 'Client/Livreur', icon: 'bx bx-briefcase', color: 'warning' },
    { value: TierRoleType.Partner, label: 'Partenaire', icon: 'bx bx-handshake', color: 'success' }
  ];

  // Statuts disponibles
  statuses = [
    { value: TierStatus.Active, label: 'Actif', badge: 'success', icon: 'bx bx-check-circle' },
    { value: TierStatus.PendingValidation, label: 'En attente', badge: 'warning', icon: 'bx bx-time' },
    { value: TierStatus.Blocked, label: 'Bloqué', badge: 'danger', icon: 'bx bx-block' },
    { value: TierStatus.Inactive, label: 'Inactif', badge: 'default', icon: 'bx bx-minus-circle' }
  ];

  // Statistiques
  stats = {
    total: 0,
    active: 0,
    pending: 0,
    blocked: 0,
    clients: 0,
    suppliers: 0
  };

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

  // Pagination
  visiblePages: number[] = [];

  private destroy$ = new Subject<void>();
  Math: any;

  constructor(
    private tiersService: Tiers,
    private notificationService: Notification,
    private authService: Auth,
    private tokenService: Token,
    private router: Router
  ) { }

  ngOnInit() {
    // Vérifier le token
    const token = this.tokenService.getToken();
    if (!token) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.loadCurrentUser();
    this.loadTiers();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // === GESTION UTILISATEUR ===

  /**
   * Charger l'utilisateur connecté
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
          if (error.status === 401) {
            this.tokenService.handleTokenExpired();
          } else {
            this.setDefaultUser();
          }
        }
      });
  }

  private setDefaultUser(): void {
    this.userName = 'Utilisateur Logistiks';
    this.userPhotoUrl = this.generateAvatarUrl({ firstName: 'Utilisateur' } as User);
  }

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
   * Construction de l'URL de la photo
   */
  getUserPhotoUrl(user: User): string {
    if (user.photoUrl && /^[0-9a-fA-F]{24}$/.test(user.photoUrl)) {
      return `${environment.apiUrl}/api/User/photo/${user.photoUrl}`;
    }

    // Si photoUrl est déjà une URL complète
    if (user.photoUrl && user.photoUrl.startsWith('http')) {
      return user.photoUrl;
    }

    // Sinon, générer un avatar
    return this.generateAvatarUrl(user);
  }

  generateAvatarUrl(user: User): string {
    const name = this.formatUserName(user);
    const colors = ['FF6B6B', '4ECDC4', 'FFD166', '06D6A0', '118AB2', 'EF476F', '7209B7', '3A86FF'];
    const colorIndex = name.length % colors.length;

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${colors[colorIndex]}&color=fff&size=128`;
  }

  getUserInitials(): string {
    const name = this.userName;
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }

  getDefaultAvatar(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=696cff&color=fff&size=128`;
  }

  /**
   * Toggle du menu utilisateur
   */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  @HostListener('document:click', ['$event'])
  closeUserMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-toggle') && !target.closest('.dropdown-menu')) {
      this.showUserMenu = false;
    }
  }

  /**
   * Déconnexion
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

  // === GESTION DE LA SIDEBAR ===

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;

    const sidebar = document.getElementById('sidebar');
    const layoutPage = document.querySelector('.layout-page');

    if (sidebar && layoutPage) {
      if (this.isSidebarCollapsed) {
        sidebar.classList.add('collapsed');
        (layoutPage as HTMLElement).style.marginLeft = '0';
      } else {
        sidebar.classList.remove('collapsed');
        (layoutPage as HTMLElement).style.marginLeft = '280px';
      }
    }
  }

  // === GESTION DES TIERS ===

  // Chargement des tiers avec filtres
  loadTiers(page: number = 1) {
    this.loading = true;
    this.error = null;

    this.tiersService.getTiersList({
      search: this.searchTerm,
      role: this.selectedRole,
      status: this.selectedStatus,
      pageNumber: page,
      pageSize: this.pagination.pageSize,
      sortBy: this.selectedSort,
      sortDescending: this.sortDescending
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.tiers = response.data;
          this.pagination = response;
          this.loading = false;
          this.updateVisiblePages();
          this.loadStatistics();
        },
        error: (error) => {
          this.error = error instanceof Error ? error.message : 'Erreur inconnue lors du chargement';
          this.loading = false;
          console.error('Erreur de chargement des tiers:', error);

          this.notificationService.error(
            'Erreur de chargement',
            this.error
          );
        }
      });
  }

  // Charger les statistiques
  loadStatistics() {
    // Calculer les statistiques locales
    this.stats.total = this.tiers.length;
    this.stats.active = this.tiers.filter(t => t.status === TierStatus.Active).length;
    this.stats.pending = this.tiers.filter(t => t.status === TierStatus.PendingValidation).length;
    this.stats.blocked = this.tiers.filter(t => t.status === TierStatus.Blocked).length;
    this.stats.clients = this.tiers.filter(t =>
      t.roles.some(r => r.roleType === TierRoleType.ClientParticulier && r.isActive)
    ).length;
    this.stats.suppliers = this.tiers.filter(t =>
      t.roles.some(r => r.roleType === TierRoleType.Supplier && r.isActive)
    ).length;
  }

  // Recherche
  onSearch() {
    this.pagination.currentPage = 1;
    this.loadTiers();
  }

  // Gestion des filtres
  onFilterByRole(role?: TierRoleType) {
    this.selectedRole = role;
    this.pagination.currentPage = 1;
    this.loadTiers();
  }

  onFilterByStatus(status?: TierStatus) {
    this.selectedStatus = status;
    this.pagination.currentPage = 1;
    this.loadTiers();
  }

  // Gestion du tri
  onSortChange(field: string) {
    if (this.selectedSort === field) {
      this.sortDescending = !this.sortDescending;
    } else {
      this.selectedSort = field;
      this.sortDescending = true;
    }
    this.loadTiers(this.pagination.currentPage);
  }

  // Pagination
  onPageChange(page: number) {
    if (page >= 1 && page <= this.pagination.totalPages) {
      this.loadTiers(page);
    }
  }

  onPageSizeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.pagination.pageSize = parseInt(select.value, 10);
    this.pagination.currentPage = 1;
    this.loadTiers();
  }

  updateVisiblePages() {
    const totalPages = this.pagination.totalPages;
    const currentPage = this.pagination.currentPage;
    const visiblePages: number[] = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        visiblePages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        visiblePages.push(1, 2, 3, 4, 5);
      } else if (currentPage >= totalPages - 2) {
        visiblePages.push(
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        visiblePages.push(
          currentPage - 2,
          currentPage - 1,
          currentPage,
          currentPage + 1,
          currentPage + 2
        );
      }
    }

    this.visiblePages = visiblePages;
  }

  // Méthode helper pour les confirmations avec promesse
  private async showConfirmation(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const result = confirm(message);
      resolve(result);
    });
  }

  private async showPrompt(message: string): Promise<string | null> {
    return new Promise((resolve) => {
      const result = prompt(message);
      resolve(result);
    });
  }

  toggleMenu(menuName: string): void {
    switch (menuName) {
      case 'tiers':
        this.isTiersMenuOpen = !this.isTiersMenuOpen;
        break;
      case 'vehicules':
        this.isVehiculesMenuOpen = !this.isVehiculesMenuOpen;
        break;
      case 'documents':
        this.isDocumentsMenuOpen = !this.isDocumentsMenuOpen;
        break;
      case 'contrats':
        this.isContratsMenuOpen = !this.isContratsMenuOpen;
        break;
      case 'comptes':
        this.isComptesMenuOpen = !this.isComptesMenuOpen;
        break;
      case 'paiements':
        this.isPaiementsMenuOpen = !this.isPaiementsMenuOpen;
        break;
      case 'charges':
        this.isChargesMenuOpen = !this.isChargesMenuOpen;
        break;
      case 'reporting':
        this.isReportingMenuOpen = !this.isReportingMenuOpen;
        break;
      case 'parametrage':
        this.isParametrageMenuOpen = !this.isParametrageMenuOpen;
        break;
    }
  }

  // Dans tiers-list.component.ts - méthode validateTier()
  async validateTier(tier: Tier) {
    const confirmed = await this.showConfirmation(`Valider le tier ${tier.tierNumber} ?`);

    if (!confirmed) return;

    this.tiersService.validateTier(tier.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success(
              'Validation réussie',
              `Le tier ${tier.tierNumber} a été validé avec succès`
            );
            this.loadTiers(this.pagination.currentPage);
          } else {
            // Afficher les erreurs détaillées
            let errorMessage = response.message || 'Échec de validation';

            if (response.errors && response.errors.length > 0) {
              errorMessage += `:\n${response.errors.join('\n')}`;
            }

            this.notificationService.error(
              'Erreur de validation',
              errorMessage
            );
          }
        },
        error: (error) => {
          // Traiter les erreurs HTTP
          let errorMessage = 'Erreur inconnue';

          if (error.error) {
            // Si l'API retourne un objet d'erreur structuré
            const apiError = error.error;
            errorMessage = apiError.message || errorMessage;

            if (apiError.errors && apiError.errors.length > 0) {
              errorMessage += `:\n${apiError.errors.join('\n')}`;
            }
          } else if (error.message) {
            errorMessage = error.message;
          }

          this.notificationService.error(
            'Erreur de validation',
            errorMessage
          );
          console.error('Erreur de validation détaillée:', error);
        }
      });
  }

  async blockTier(tier: Tier) {
    const reason = await this.showPrompt('Raison du blocage :');

    if (reason && reason.trim()) {
      this.tiersService.blockTier(tier.id, { reason: reason.trim() })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.warning(
              'Tier bloqué',
              `Le tier ${tier.tierNumber} a été bloqué`
            );
            this.loadTiers(this.pagination.currentPage);
          },
          error: (error) => {
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            this.notificationService.error(
              'Erreur de blocage',
              errorMessage
            );
            console.error('Erreur de blocage:', error);
          }
        });
    }
  }

  async activateTier(tier: Tier) {
    const confirmed = await this.showConfirmation(`Activer le tier ${tier.tierNumber} ?`);

    if (!confirmed) return;

    this.tiersService.activateTier(tier.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.success(
            'Tier activé',
            `Le tier ${tier.tierNumber} a été activé`
          );
          this.loadTiers(this.pagination.currentPage);
        },
        error: (error) => {
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          this.notificationService.error(
            'Erreur d\'activation',
            errorMessage
          );
          console.error('Erreur d\'activation:', error);
        }
      });
  }

  // Méthodes utilitaires
  getRoleBadgeClass(roleType: TierRoleType): string {
    const role = this.roles.find(r => r.value === roleType);
    return role ? `badge-${role.color}` : 'badge-secondary';
  }

  getStatusBadgeClass(status: TierStatus): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj ? `badge-${statusObj.badge}` : 'badge-secondary';
  }

  getStatusText(status: TierStatus): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj ? statusObj.label : 'Inconnu';
  }

  getRoleText(roleType: TierRoleType): string {
    const role = this.roles.find(r => r.value === roleType);
    return role ? role.label : 'Inconnu';
  }

  getFullName(tier: Tier): string {
    return tier.fullName || `${tier.firstName} ${tier.lastName}`;
  }

  formatPhoneNumber(phone: string): string {
    return this.tiersService.formatPhoneNumber(phone);
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('fr-FR');
    } catch (error) {
      return 'Date invalide';
    }
  }

  getActiveRoles(tier: Tier): TierRoleType[] {
    return tier.roles
      .filter(role => role.isActive)
      .map(role => role.roleType);
  }

  hasExpiredDocuments(tier: Tier): boolean {
    return this.tiersService.hasExpiredDocuments(tier);
  }

  canSignContract(tier: Tier): boolean {
    return this.tiersService.canTierSignContracts(tier);
  }


  /**
   * Export des tiers au format Excel
   */
  exportToExcel() {
    this.tiersService.exportTiers({ format: 'xlsx' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob | MediaSource) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `tiers_${new Date().toISOString().split('T')[0]}.xlsx`;
          a.click();
          window.URL.revokeObjectURL(url);

          this.notificationService.success(
            'Export réussi',
            'Les données ont été exportées avec succès'
          );
          console.log('Export réussi');
        },
        error: (error: { message: any; }) => {
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          this.notificationService.error(
            'Erreur d\'export',
            errorMessage
          );
          console.error('Erreur d\'export:', error);
        }
      });
  }

  getStatusIcon(status: TierStatus): string {
    switch (status) {
      case TierStatus.Active:
        return 'bx bx-check-circle';
      case TierStatus.PendingValidation:
        return 'bx bx-time';
      case TierStatus.Blocked:
        return 'bx bx-block';
      case TierStatus.Inactive:
        return 'bx bx-minus-circle';
      default:
        return 'bx bx-question-mark';
    }
  }

  getInitialsFromName(tier: Tier): string {
    const name = this.getFullName(tier);
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }

  // Basculer la sidebar mobile (filtres)
  toggleFiltersSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
  }
}
