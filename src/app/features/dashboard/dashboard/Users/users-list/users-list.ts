import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { NotificationComponent } from '../../../../../core/components/notification-component/notification-component';
import { SidebarComponent } from '../../../../../core/components/sidebar-component/sidebar-component';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import { Auth } from '../../../../../core/services/Auth/auth';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Token } from '../../../../../core/services/Token/token';
import { Users } from '../../../../../core/services/Users/users';
import { Roles } from '../../../../../core/services/Roles/roles';
import { RoleDto } from '../../../../../core/models/Core/Roles/DTOs/RoleDto';
import { Permissions } from "../../../../../core/services/Permission/permissions-with-fallback.service";

@Component({
  selector: 'app-users-list',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NotificationComponent, SidebarComponent],
  templateUrl: './users-list.html',
  styleUrl: './users-list.scss',
})
export class UsersList implements OnInit, OnDestroy {

  // ============================================================================
  // SECTION 1: PROPRIÉTÉS DES DONNÉES UTILISATEURS
  // ============================================================================

  /** Liste complète des utilisateurs */
  allUsers: User[] = [];

  /** Liste des utilisateurs filtrés */
  filteredUsers: User[] = [];

  /** Liste des utilisateurs paginés (page actuelle) */
  paginatedUsers: User[] = [];

  /** Statistiques des utilisateurs */
  statistics: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    newUsersThisMonth: number;
    usersByRole: { [role: string]: number };
  } | null = null;

  /** Rôles disponibles pour les filtres */
  availableRoles: RoleDto[] = [];

  /** Utilisateur sélectionné pour affichage détails */
  selectedUser: User | null = null;

  // ============================================================================
  // SECTION 2: FILTRES ET RECHERCHE
  // ============================================================================

  /** Terme de recherche */
  searchTerm: string = '';

  /** Filtre par rôle sélectionné */
  selectedRole: string = '';

  /** Filtre par statut */
  selectedStatus: string = '';

  // ============================================================================
  // SECTION 3: PAGINATION
  // ============================================================================

  /** Page actuelle */
  currentPage: number = 1;

  /** Nombre d'éléments par page */
  pageSize: number = 10;

  /** Nombre total de pages */
  totalPages: number = 1;

  /** Pages visibles dans la pagination */
  visiblePages: number[] = [];

  /** Math pour le template */
  Math = Math;

  // ============================================================================
  // SECTION 4: SÉLECTION ET ACTIONS GROUPÉES
  // ============================================================================

  /** IDs des utilisateurs sélectionnés */
  selectedUserIds: string[] = [];

  /** État de sélection globale */
  selectAll: boolean = false;

  /** ID du dropdown ouvert */
  openDropdownId: string | null = null;

  // ============================================================================
  // SECTION 5: ÉTATS D'INTERFACE
  // ============================================================================

  /** État de chargement */
  isLoading: boolean = false;

  /** Affichage du modal détails */
  showDetailsModal: boolean = false;

  // ============================================================================
  // SECTION 6: PROPRIÉTÉS UTILISATEUR CONNECTÉ
  // ============================================================================

  /** Utilisateur actuellement connecté */
  currentUser: any = null;

  /** Nom d'affichage de l'utilisateur */
  userName: string = 'Utilisateur';

  /** URL de la photo de profil */
  userPhotoUrl: string = '';

  /** Contrôle l'affichage du menu utilisateur */
  showUserMenu: boolean = false;

  // ============================================================================
  // SECTION 7: UI & NAVIGATION
  // ============================================================================

  /** État de réduction de la sidebar */
  isSidebarCollapsed: boolean = false;

  /** Subject pour la destruction des observables */
  private destroy$ = new Subject<void>();

  // ============================================================================
  // SECTION 8: CONSTRUCTEUR & INJECTION DE DÉPENDANCES
  // ============================================================================

  constructor(
    private formBuilder: FormBuilder,
    private usersService: Users,
    private rolesService: Roles,
    private notificationService: NotificationService,
    private authService: Auth,
    private tokenService: Token,
    private router: Router,
    public permissions: Permissions
  ) {}

  // ============================================================================
  // SECTION 9: LIFECYCLE HOOKS
  // ============================================================================

  ngOnInit(): void {
    this.checkAuthentication();
    this.loadCurrentUser();
    this.loadAvailableRoles();
    this.loadUsers();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // SECTION 10: CHARGEMENT DES DONNÉES
  // ============================================================================

  /**
   * Charge la liste complète des utilisateurs
   */
  loadUsers(): void {
    this.isLoading = true;
    this.usersService.getAllUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          // Traiter les URLs des photos pour chaque utilisateur
          this.allUsers = users.map(user => ({
            ...user,
            photoUrl: this.processPhotoUrl(user.photoUrl)
          }));
          this.applyFilters();
          this.calculateStatistics(); // Calculer les stats depuis les données
          this.isLoading = false;
          console.log('✅ Utilisateurs chargés:', users.length);
        },
        error: (error) => {
          console.error('❌ Erreur chargement utilisateurs:', error);
          this.notificationService.error(
            'Erreur lors du chargement des utilisateurs',
            'Erreur'
          );
          this.isLoading = false;
        }
      });
  }

  /**
   * Charge les statistiques des utilisateurs
   */
  loadStatistics(): void {
    this.usersService.getUserStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statistics = stats;
          console.log('✅ Statistiques chargées:', stats);
        },
        error: (error) => {
          console.error('❌ Erreur chargement statistiques:', error);
        }
      });
  }

  /**
   * Charge les rôles disponibles pour les filtres
   */
  loadAvailableRoles(): void {
    this.rolesService.getRoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (roles) => {
          this.availableRoles = roles.filter(role => role.isVisible);
          console.log('✅ Rôles chargés:', roles.length);
          console.log('📋 Rôles disponibles pour filtre:', this.availableRoles.map(r => ({
            code: r.code,
            name: r.roleName
          })));
        },
        error: (error) => {
          console.error('❌ Erreur chargement rôles:', error);
        }
      });
  }

  // ============================================================================
  // SECTION 11: FILTRES ET RECHERCHE
  // ============================================================================

  /**
   * Applique tous les filtres et recalcule la pagination
   */
  applyFilters(): void {
    let filtered = [...this.allUsers];

    console.log('🔍 Application des filtres:', {
      searchTerm: this.searchTerm,
      selectedRole: this.selectedRole,
      selectedStatus: this.selectedStatus,
      totalUsers: filtered.length
    });

    // Filtre par recherche
    if (this.searchTerm) {
      filtered = this.usersService.searchUsersLocal(filtered, this.searchTerm);
      console.log('Après recherche:', filtered.length);
    }

    // Filtre par rôle
    if (this.selectedRole) {
      filtered = filtered.filter(user => {
        // Vérifier si l'utilisateur a le rôle sélectionné
        const hasRole = user.roles.some(role => {
          // Comparaison insensible à la casse et aux espaces
          const userRole = role.trim().toUpperCase();
          const filterRole = this.selectedRole.trim().toUpperCase();
          return userRole === filterRole;
        });
        return hasRole;
      });
      console.log('Après filtre rôle:', filtered.length, 'Rôle recherché:', this.selectedRole);
    }

    // Filtre par statut
    if (this.selectedStatus) {
      filtered = filtered.filter(user => {
        if (this.selectedStatus === 'active') return user.isActive;
        if (this.selectedStatus === 'inactive') return !user.isActive;
        return true;
      });
      console.log('Après filtre statut:', filtered.length);
    }

    this.filteredUsers = filtered;
    this.currentPage = 1;
    this.updatePagination();

    console.log('✅ Filtrage terminé:', this.filteredUsers.length, 'résultats');
  }

  /**
   * Réinitialise tous les filtres
   */
  resetFilters(): void {
    this.searchTerm = '';
    this.selectedRole = '';
    this.selectedStatus = '';
    this.applyFilters();
  }

  /**
   * Gestionnaire de changement de recherche (debounced)
   */
  private searchTimeout: any;
  onSearchChange(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.applyFilters();
    }, 300);
  }

  // ============================================================================
  // SECTION 12: PAGINATION
  // ============================================================================

  /**
   * Met à jour la pagination
   */
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.pageSize);
    this.calculateVisiblePages();
    this.updatePaginatedUsers();
  }

  /**
   * Met à jour la liste des utilisateurs paginés
   */
  updatePaginatedUsers(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);
  }

  /**
   * Calcule les pages visibles
   */
  calculateVisiblePages(): void {
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    this.visiblePages = [];
    for (let i = start; i <= end; i++) {
      this.visiblePages.push(i);
    }
  }

  /**
   * Va à une page spécifique
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  /**
   * Change la taille de page
   */
  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  // ============================================================================
  // SECTION 13: SÉLECTION
  // ============================================================================

  /**
   * Toggle la sélection d'un utilisateur
   */
  toggleSelection(userId: string): void {
    const index = this.selectedUserIds.indexOf(userId);
    if (index > -1) {
      this.selectedUserIds.splice(index, 1);
    } else {
      this.selectedUserIds.push(userId);
    }
    this.updateSelectAllState();
  }

  /**
   * Vérifie si un utilisateur est sélectionné
   */
  isSelected(userId: string): boolean {
    return this.selectedUserIds.includes(userId);
  }

  /**
   * Gère le changement de sélection globale
   */
  onSelectAllChange(): void {
    if (this.selectAll) {
      this.selectedUserIds = this.paginatedUsers.map(u => u.id);
    } else {
      this.selectedUserIds = [];
    }
  }

  /**
   * Met à jour l'état de sélection globale
   */
  updateSelectAllState(): void {
    this.selectAll = this.paginatedUsers.length > 0 &&
      this.paginatedUsers.every(u => this.isSelected(u.id));
  }

  /**
   * Efface la sélection
   */
  clearSelection(): void {
    this.selectedUserIds = [];
    this.selectAll = false;
  }

  // ============================================================================
  // SECTION 14: ACTIONS UTILISATEUR
  // ============================================================================

  /**
   * Toggle le statut d'un utilisateur
   */
  toggleUserStatus(user: User): void {
    this.usersService.toggleUserStatus(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          user.isActive = !user.isActive;
          this.notificationService.success(
            response.message,
            'Statut modifié'
          );
          // Recalculer les statistiques après changement
          this.calculateStatistics();
        },
        error: (error) => {
          console.error('❌ Erreur toggle statut:', error);
          this.notificationService.error(
            error.message,
            'Erreur'
          );
        }
      });
  }

  /**
   * Affiche les détails d'un utilisateur
   */
  viewUserDetails(user: User): void {
    this.selectedUser = user;
    this.showDetailsModal = true;
  }

  /**
   * Ferme le modal de détails
   */
  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedUser = null;
  }

  /**
   * Gère les permissions d'un utilisateur
   */
  manageUserPermissions(user: User): void {
    this.router.navigate(['/dashboard/admin/users-permissions', user.id]);
  }

  /**
   * Réinitialise le mot de passe d'un utilisateur
   */
  resetPassword(user: User): void {
    if (confirm(`Voulez-vous vraiment réinitialiser le mot de passe de ${this.getFullName(user)} ?`)) {
      this.notificationService.info(
        'Fonctionnalité en cours de développement',
        'Info'
      );
    }
  }

  /**
   * Affiche l'historique d'un utilisateur
   */
  viewAuditLog(user: User): void {
    this.router.navigate(['/dashboard/audit'], {
      queryParams: { userId: user.id }
    });
  }

  /**
   * Confirme la suppression d'un utilisateur
   */
  confirmDelete(user: User): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${this.getFullName(user)} ?`)) {
      this.notificationService.warning(
        'La suppression définitive n\'est pas encore implémentée',
        'Info'
      );
    }
  }

  // ============================================================================
  // SECTION 15: ACTIONS GROUPÉES
  // ============================================================================

  bulkActivate(): void {
    console.log('Activation groupée:', this.selectedUserIds);
    this.notificationService.info('Fonctionnalité en développement', 'Info');
  }

  bulkDeactivate(): void {
    console.log('Désactivation groupée:', this.selectedUserIds);
    this.notificationService.info('Fonctionnalité en développement', 'Info');
  }

  bulkDelete(): void {
    if (confirm(`Voulez-vous vraiment supprimer ${this.selectedUserIds.length} utilisateur(s) ?`)) {
      this.notificationService.info('Fonctionnalité en développement', 'Info');
    }
  }

  // ============================================================================
  // SECTION 16: EXPORTS
  // ============================================================================

  exportUsers(format: 'csv' | 'xlsx'): void {
    this.usersService.exportUsers(format)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const filename = `utilisateurs_${new Date().toISOString().split('T')[0]}.${format}`;
          this.usersService.downloadFile(blob, filename);
          this.notificationService.success(
            `Export ${format.toUpperCase()} réussi`,
            'Export'
          );
        },
        error: (error) => {
          console.error('❌ Erreur export:', error);
          this.notificationService.error(
            error.message,
            'Erreur d\'export'
          );
        }
      });
  }

  // ============================================================================
  // SECTION 17: UTILITAIRES
  // ============================================================================

  /**
   * Traite l'URL de la photo pour l'affichage
   */
  processPhotoUrl(photoUrl: string | null | undefined): string {
    if (!photoUrl) {
      return ''; // Retourne vide, l'avatar par défaut sera utilisé
    }

    // Si c'est un ID MongoDB (24 caractères hexadécimaux)
    if (/^[0-9a-fA-F]{24}$/.test(photoUrl)) {
      return `${environment.apiUrl}/api/User/photo/${photoUrl}`;
    }

    // Si c'est déjà une URL complète
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }

    // Si c'est un chemin relatif
    if (photoUrl.startsWith('/')) {
      return `${environment.apiUrl}${photoUrl}`;
    }

    // Par défaut, construire l'URL
    return `${environment.apiUrl}/api/User/photo/${photoUrl}`;
  }

  /**
   * Calcule les statistiques depuis les données chargées
   */
  calculateStatistics(): void {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    this.statistics = {
      totalUsers: this.allUsers.length,
      activeUsers: this.allUsers.filter(u => u.isActive).length,
      inactiveUsers: this.allUsers.filter(u => !u.isActive).length,
      newUsersThisMonth: this.allUsers.filter(u => {
        const createdDate = new Date(u.createdAt);
        return createdDate >= firstDayOfMonth;
      }).length,
      usersByRole: this.calculateUsersByRole()
    };

    console.log('📊 Statistiques calculées:', this.statistics);
  }

  /**
   * Calcule le nombre d'utilisateurs par rôle
   */
  private calculateUsersByRole(): { [role: string]: number } {
    const roleCount: { [role: string]: number } = {};

    this.allUsers.forEach(user => {
      user.roles.forEach(role => {
        if (!roleCount[role]) {
          roleCount[role] = 0;
        }
        roleCount[role]++;
      });
    });

    return roleCount;
  }

  getFullName(user: User): string {
    return this.usersService.getFullName(user);
  }

  getInitials(user: User): string {
    return this.usersService.getInitials(user);
  }

  getAvatarColor(userId: string): string {
    return this.usersService.getAvatarColor(userId);
  }

  getRoleDisplayName(roleCode: string): string {
    const role = this.availableRoles.find(r => r.code === roleCode);
    return role ? role.roleName : roleCode;
  }

  getRoleBadgeClass(roleCode: string): string {
    const classes: { [key: string]: string } = {
      'SUPER_ADMIN': 'role-super-admin',
      'MANAGER': 'role-manager',
      'FINANCE': 'role-finance',
      'OPERATIONS': 'role-operations',
      'DRIVER': 'role-driver',
      'READ_ONLY': 'role-readonly'
    };
    return classes[roleCode] || 'role-default';
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  onImageError(event: any): void {
    event.target.style.display = 'none';
  }

  // ============================================================================
  // SECTION 18: DROPDOWN
  // ============================================================================

  toggleDropdown(userId: string): void {
    this.openDropdownId = this.openDropdownId === userId ? null : userId;
  }

  isDropdownOpen(userId: string): boolean {
    return this.openDropdownId === userId;
  }

  @HostListener('document:click', ['$event'])
  closeDropdowns(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      this.openDropdownId = null;
    }
    if (!target.closest('.dropdown-toggle') && !target.closest('.dropdown-menu')) {
      this.showUserMenu = false;
    }
  }

  // ============================================================================
  // SECTION 19: AUTHENTIFICATION
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

  private handleUserLoadError(error: any): void {
    if (error.status === 401) {
      this.tokenService.handleTokenExpired();
    } else {
      this.setDefaultUser();
    }
  }

  private setDefaultUser(): void {
    this.userName = 'Utilisateur Logistiks';
    this.userPhotoUrl = this.generateAvatarUrl({ firstName: 'Utilisateur' } as User);
  }

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

  getUserPhotoUrl(user: User): string {
    if (user.photoUrl && /^[0-9a-fA-F]{24}$/.test(user.photoUrl)) {
      return `${environment.apiUrl}/api/User/photo/${user.photoUrl}`;
    }
    if (user.photoUrl && user.photoUrl.startsWith('http')) {
      return user.photoUrl;
    }
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

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleMenu(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    if (element && element.parentElement) {
      element.parentElement.classList.toggle('open');
    }
  }

  logout(): void {
    console.log('🚪 Déconnexion en cours...');
    this.tokenService.logout();
    this.authService.logout()
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
