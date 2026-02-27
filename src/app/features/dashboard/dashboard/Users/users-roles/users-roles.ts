import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { NotificationComponent } from '../../../../../core/components/notification-component/notification-component';
import { SidebarComponent } from '../../../../../core/components/sidebar-component/sidebar-component';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import { VehicleType, FuelType } from '../../../../../core/models/Enums/Logistiks-enums';
import { VehicleDto } from '../../../../../core/models/Vehicles/Vehicle.dtos';
import { Auth } from '../../../../../core/services/Auth/auth';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Token } from '../../../../../core/services/Token/token';
import { Vehicles } from '../../../../../core/services/Vehicles/vehicles';
import { RoleDto } from '../../../../../core/models/Core/Roles/DTOs/RoleDto';
import { RoleRequest } from '../../../../../core/models/Core/Roles/DTOs/RoleRequest';
import { Role } from '../../../../../core/models/Core/Roles/Entities/Role';
import { Roles } from '../../../../../core/services/Roles/roles';

@Component({
  selector: 'app-users-roles',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NotificationComponent, SidebarComponent],
  templateUrl: './users-roles.html',
  styleUrl: './users-roles.scss',
})
export class UsersRoles {

  // ============================================================================
  // SECTION 1: DONNÉES
  // ============================================================================

  allRoles: RoleDto[] = [];
  filteredRoles: RoleDto[] = [];
  allPermissions: string[] = [];
  filteredPermissions: string[] = [];
  selectedRole: RoleDto | null = null;

  // ============================================================================
  // SECTION 2: FILTRES
  // ============================================================================

  searchTerm: string = '';
  filterType: string = '';
  filterVisibility: string = '';
  permissionSearchTerm: string = '';

  // ============================================================================
  // SECTION 3: STATS
  // ============================================================================

  get systemRolesCount(): number {
    return this.allRoles.filter(r => r.isSystem).length;
  }

  get customRolesCount(): number {
    return this.allRoles.filter(r => !r.isSystem).length;
  }

  // ============================================================================
  // SECTION 4: MODALS
  // ============================================================================

  showModal: boolean = false;
  showDetailsModal: boolean = false;
  isEditMode: boolean = false;
  isSubmitting: boolean = false;

  // ============================================================================
  // SECTION 5: FORMULAIRE
  // ============================================================================

  roleForm!: FormGroup;
  selectedPermissions: string[] = [];

  // ============================================================================
  // SECTION 6: PERMISSIONS GROUPÉES
  // ============================================================================

  groupedPermissions: { [key: string]: string[] } = {};
  expandedGroups: Set<string> = new Set();

  // ============================================================================
  // SECTION 7: ÉTATS
  // ============================================================================

  isLoading: boolean = false;

  // ============================================================================
  // SECTION 8: UTILITAIRES
  // ============================================================================

  private destroy$ = new Subject<void>();

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

  // Données
  allVehicles: VehicleDto[] = [];

  // Filtres
  filterStatus: string = '';
  filterCompany: string = '';
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

  constructor(
    private formBuilder: FormBuilder,
    private vehiclesService: Vehicles,
    private notificationService: NotificationService,
    private authService: Auth,
    private tokenService: Token,
    private rolesService: Roles,
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
    this.loadRoles();
    this.loadPermissions();
  }

  // ============================================================================
  // SECTION 11: INITIALISATION
  // ============================================================================

  private initForm(): void {
    this.roleForm = this.formBuilder.group({
      roleName: ['', Validators.required],
      code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]+$/)]],
      description: [''],
      isVisible: [true]
    });
  }

  // ============================================================================
  // SECTION 12: CHARGEMENT DES DONNÉES
  // ============================================================================

  loadRoles(): void {
    this.isLoading = true;
    this.rolesService.getRoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          // Vérification et transformation des données
          if (Array.isArray(response)) {
            // Si c'est déjà un tableau, on le mappe vers RoleDto
            this.allRoles = response.map((item: any) => this.mapToRoleDto(item));
          } else if (typeof response === 'string') {
            // Si c'est une string, on essaie de parser
            try {
              const parsed = JSON.parse(response);
              this.allRoles = Array.isArray(parsed)
                ? parsed.map((item: any) => this.mapToRoleDto(item))
                : [];
            } catch {
              this.allRoles = [];
            }
          } else if (response && response.data && Array.isArray(response.data)) {
            // Si la réponse est encapsulée dans un objet { data: [...] }
            this.allRoles = response.data.map((item: any) => this.mapToRoleDto(item));
          } else {
            this.allRoles = [];
          }

          this.applyFilters();
          this.isLoading = false;
          console.log('✅ Rôles chargés:', this.allRoles.length);
        },
        error: (error: any) => {
          console.error('❌ Erreur chargement rôles:', error);
          this.notificationService.error(
            'Impossible de charger les rôles',
            'Erreur'
          );
          this.isLoading = false;
        }
      });
  }

  // Méthode utilitaire pour mapper vers RoleDto
  private mapToRoleDto(item: any): RoleDto {
    return {
      id: item.id || '',
      code: item.code || item.name || '',
      name: item.name || item.roleName || '',
      roleName: item.roleName || item.name || '',
      normalizedName: item.normalizedName || (item.name || '').toUpperCase(),
      description: item.description,
      permissions: item.permissions || [],
      isVisible: item.isVisible ?? true,
      isSystem: item.isSystem ?? false,
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
      createdByName: item.createdByName || '',
      updatedByName: item.updatedByName,
      permissionCount: item.permissionCount || (item.permissions?.length || 0)
    };
  }

  loadPermissions(): void {
    this.rolesService.getAllPermissions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (permissions: string[]) => {
          this.allPermissions = permissions.sort();
          this.filteredPermissions = [...this.allPermissions];
          this.groupPermissions();
          console.log('✅ Permissions chargées:', permissions.length);
        },
        error: (error: any) => {
          console.error('❌ Erreur chargement permissions:', error);
          this.notificationService.error(
            'Impossible de charger les permissions',
            'Erreur'
          );
        }
      });
  }

  // ============================================================================
  // SECTION 13: FILTRAGE
  // ============================================================================

  applyFilters(): void {
    let filtered = [...this.allRoles];

    // Filtre par recherche
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(role =>
        role.roleName.toLowerCase().includes(term) ||
        role.code.toLowerCase().includes(term) ||
        (role.description && role.description.toLowerCase().includes(term))
      );
    }

    // Filtre par type
    if (this.filterType === 'system') {
      filtered = filtered.filter(role => role.isSystem);
    } else if (this.filterType === 'custom') {
      filtered = filtered.filter(role => !role.isSystem);
    }

    // Filtre par visibilité
    if (this.filterVisibility === 'visible') {
      filtered = filtered.filter(role => role.isVisible);
    } else if (this.filterVisibility === 'hidden') {
      filtered = filtered.filter(role => !role.isVisible);
    }

    this.filteredRoles = filtered;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filterType = '';
    this.filterVisibility = '';
    this.applyFilters();
  }

  // ============================================================================
  // SECTION 14: PERMISSIONS - GROUPEMENT
  // ============================================================================

  private groupPermissions(): void {
    this.groupedPermissions = {};

    this.allPermissions.forEach(permission => {
      // Extraire le préfixe (ex: "Customer_Read" -> "Customer")
      const parts = permission.split('_');
      const group = parts[0] || 'Other';

      if (!this.groupedPermissions[group]) {
        this.groupedPermissions[group] = [];
      }

      this.groupedPermissions[group].push(permission);
    });

    // Développer tous les groupes par défaut
    Object.keys(this.groupedPermissions).forEach(group => {
      this.expandedGroups.add(group);
    });
  }

  filterPermissions(): void {
    if (!this.permissionSearchTerm) {
      this.filteredPermissions = [...this.allPermissions];
    } else {
      const term = this.permissionSearchTerm.toLowerCase();
      this.filteredPermissions = this.allPermissions.filter(p =>
        p.toLowerCase().includes(term)
      );
    }
    this.groupPermissions();
  }

  toggleGroup(groupName: string): void {
    if (this.expandedGroups.has(groupName)) {
      this.expandedGroups.delete(groupName);
    } else {
      this.expandedGroups.add(groupName);
    }
  }

  isGroupExpanded(groupName: string): boolean {
    return this.expandedGroups.has(groupName);
  }

  getGroupSelectedCount(permissions: string[]): number {
    return permissions.filter(p => this.isPermissionSelected(p)).length;
  }

  // ============================================================================
  // SECTION 15: PERMISSIONS - SÉLECTION
  // ============================================================================

  togglePermission(permission: string): void {
    const index = this.selectedPermissions.indexOf(permission);
    if (index > -1) {
      this.selectedPermissions.splice(index, 1);
    } else {
      this.selectedPermissions.push(permission);
    }
  }

  isPermissionSelected(permission: string): boolean {
    return this.selectedPermissions.includes(permission);
  }

  selectAllPermissions(): void {
    this.selectedPermissions = [...this.allPermissions];
  }

  clearAllPermissions(): void {
    this.selectedPermissions = [];
  }

  // ============================================================================
  // SECTION 16: MODAL CRÉATION/ÉDITION
  // ============================================================================

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedRole = null;
    this.roleForm.reset({
      roleName: '',
      code: '',
      description: '',
      isVisible: true
    });
    this.selectedPermissions = [];
    this.showModal = true;
  }

  openEditModal(role: RoleDto): void {
    this.isEditMode = true;
    this.selectedRole = role;
    this.roleForm.patchValue({
      roleName: role.roleName,
      code: role.code,
      description: role.description,
      isVisible: role.isVisible
    });
    this.selectedPermissions = role.permissions ? [...role.permissions] : [];
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.isEditMode = false;
    this.selectedRole = null;
    this.roleForm.reset();
    this.selectedPermissions = [];
  }

  // ============================================================================
  // SECTION 17: MODAL DÉTAILS
  // ============================================================================

  viewRoleDetails(role: RoleDto): void {
    this.selectedRole = role;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedRole = null;
  }

  editFromDetails(): void {
    if (this.selectedRole) {
      this.closeDetailsModal();
      this.openEditModal(this.selectedRole);
    }
  }

  // ============================================================================
  // SECTION 18: VALIDATION
  // ============================================================================

  isFieldInvalid(fieldName: string): boolean {
    const field = this.roleForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  // ============================================================================
  // SECTION 19: SOUMISSION
  // ============================================================================

  onSubmit(): void {
    if (this.roleForm.invalid) {
      Object.keys(this.roleForm.controls).forEach(key => {
        this.roleForm.get(key)?.markAsTouched();
      });
      this.notificationService.warning(
        'Veuillez remplir tous les champs requis',
        'Formulaire incomplet'
      );
      return;
    }

    if (this.selectedPermissions.length === 0) {
      this.notificationService.warning(
        'Veuillez sélectionner au moins une permission',
        'Permissions requises'
      );
      return;
    }

    this.isSubmitting = true;

    const roleRequest: RoleRequest = {
      roleName: this.roleForm.get('roleName')?.value,
      code: this.roleForm.get('code')?.value,
      description: this.roleForm.get('description')?.value || '',
      isVisible: this.roleForm.get('isVisible')?.value,
      permissions: this.selectedPermissions
    };

    if (this.isEditMode && this.selectedRole) {
      this.updateRole(this.selectedRole.id, roleRequest);
    } else {
      this.createRole(roleRequest);
    }
  }

  private createRole(roleRequest: RoleRequest): void {
    this.rolesService.addRole(roleRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.notificationService.success(
            `Le rôle "${roleRequest.roleName}" a été créé avec succès`,
            'Rôle créé'
          );
          this.closeModal();
          this.loadRoles();
          this.isSubmitting = false;
        },
        error: (error: { message: any; }) => {
          console.error('❌ Erreur création rôle:', error);
          this.isSubmitting = false;
          this.notificationService.error(
            error.message || 'Une erreur est survenue lors de la création',
            'Erreur'
          );
        }
      });
  }

  private updateRole(roleId: string, roleRequest: RoleRequest): void {
    this.rolesService.updateRole(roleId, roleRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.notificationService.success(
            `Le rôle "${roleRequest.roleName}" a été mis à jour avec succès`,
            'Rôle modifié'
          );
          this.closeModal();
          this.loadRoles();
          this.isSubmitting = false;
        },
        error: (error: { message: any; }) => {
          console.error('❌ Erreur mise à jour rôle:', error);
          this.isSubmitting = false;
          this.notificationService.error(
            error.message || 'Une erreur est survenue lors de la mise à jour',
            'Erreur'
          );
        }
      });
  }

  // ============================================================================
  // SECTION 20: SUPPRESSION
  // ============================================================================

  confirmDelete(role: RoleDto): void {
    if (role.isSystem) {
      this.notificationService.warning(
        'Les rôles système ne peuvent pas être supprimés',
        'Action non autorisée'
      );
      return;
    }

    if (confirm(`Êtes-vous sûr de vouloir supprimer le rôle "${role.roleName}" ?

Cette action est irréversible et tous les utilisateurs ayant ce rôle perdront leurs permissions associées.`)) {
      this.deleteRole(role);
    }
  }

  private deleteRole(role: RoleDto): void {
    this.rolesService.deleteRole(role.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.notificationService.success(
            `Le rôle "${role.roleName}" a été supprimé avec succès`,
            'Rôle supprimé'
          );
          this.loadRoles();
        },
        error: (error: { message: any; }) => {
          console.error('❌ Erreur suppression rôle:', error);
          this.notificationService.error(
            error.message || 'Une erreur est survenue lors de la suppression',
            'Erreur'
          );
        }
      });
  }

  // ============================================================================
  // SECTION 21: UTILITAIRES
  // ============================================================================

  getRoleIcon(code: string): string {
    const icons: { [key: string]: string } = {
      'SUPER_ADMIN': 'bx bx-crown',
      'MANAGER': 'bx bx-briefcase',
      'FINANCE': 'bx bx-dollar-circle',
      'OPERATIONS': 'bx bx-cog',
      'DRIVER': 'bx bx-car',
      'READ_ONLY': 'bx bx-glasses'
    };
    return icons[code] || 'bx bx-shield-quarter';
  }

  getRoleColorClass(code: string): string {
    const classes: { [key: string]: string } = {
      'SUPER_ADMIN': 'role-super-admin',
      'MANAGER': 'role-manager',
      'FINANCE': 'role-finance',
      'OPERATIONS': 'role-operations',
      'DRIVER': 'role-driver',
      'READ_ONLY': 'role-readonly'
    };
    return classes[code] || 'role-default';
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        error: (error: any) => {
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
        error: (error: any) => {
          console.warn('⚠️ Erreur API déconnexion (ignorée):', error);
          this.router.navigate(['/auth/login']);
        }
      });
  }



}


