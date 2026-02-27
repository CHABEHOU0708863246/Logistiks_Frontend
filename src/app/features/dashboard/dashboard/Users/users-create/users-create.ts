import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, AbstractControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
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
import { UserRequest } from '../../../../../core/models/Core/Users/DTOs/UserRequest';
import { Roles } from '../../../../../core/services/Roles/roles';
import { Users } from '../../../../../core/services/Users/users';

@Component({
  selector: 'app-users-create',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NotificationComponent, SidebarComponent],
  templateUrl: './users-create.html',
  styleUrl: './users-create.scss',
})
export class UsersCreate implements OnInit, OnDestroy {

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

  // ============================================================================
  // SECTION 1: FORMULAIRE
  // ============================================================================

  userForm!: FormGroup;
  currentStep: number = 1;
  isSubmitting: boolean = false;

  // ============================================================================
  // SECTION 2: PHOTO
  // ============================================================================

  photoFile: File | null = null;
  photoPreview: string = '';

  // ============================================================================
  // SECTION 3: RÔLES ET PERMISSIONS
  // ============================================================================

  availableRoles: RoleDto[] = [];
  selectedRoles: string[] = [];
  showAllPermissions: boolean = false;

  // ============================================================================
  // SECTION 4: MOT DE PASSE
  // ============================================================================

  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  passwordStrength: number = 0;

  // ============================================================================
  // SECTION 6: CONSTRUCTEUR
  // ============================================================================

  constructor(
    private formBuilder: FormBuilder,
    private usersService: Users,
    private rolesService: Roles,
    private vehiclesService: Vehicles,
    private authService: Auth,
    private tokenService: Token,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.initForm();
  }

  // ============================================================================
  // SECTION 7: LIFECYCLE
  // ============================================================================

  ngOnInit(): void {
    this.loadAvailableRoles();
    this.setupPasswordStrengthListener();
     this.loadCurrentUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // SECTION 8: INITIALISATION DU FORMULAIRE
  // ============================================================================

  private initForm(): void {
    this.userForm = this.formBuilder.group({
      // Étape 1: Informations de base
      username: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.pattern(/^[a-zA-Z0-9._-]+$/)
      ]],
      email: ['', [
        Validators.required,
        Validators.email
      ]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phone: ['', [
        Validators.required,
        Validators.pattern(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8)
      ]],
      confirmPassword: ['', Validators.required],
      isActive: [true]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  // ============================================================================
  // SECTION 9: VALIDATEURS PERSONNALISÉS
  // ============================================================================

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    if (confirmPassword.errors && !confirmPassword.errors['passwordMismatch']) {
      return null;
    }

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      const errors = confirmPassword.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        confirmPassword.setErrors(Object.keys(errors).length ? errors : null);
      }
      return null;
    }
  }

  // ============================================================================
  // SECTION 10: CHARGEMENT DES DONNÉES
  // ============================================================================

  private loadAvailableRoles(): void {
    this.rolesService.getVisibleRoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (roles: RoleDto[]) => {
          this.availableRoles = roles;
        },
        error: (error: any) => {
          console.error('❌ Erreur chargement rôles:', error);
          this.notificationService.error(
            'Impossible de charger les rôles disponibles',
            'Erreur'
          );
        }
      });
  }

  // ============================================================================
  // SECTION 11: GESTION DES ÉTAPES
  // ============================================================================

  nextStep(): void {
    if (this.currentStep === 1 && this.isStep1Valid()) {
      this.currentStep = 2;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (this.currentStep === 2 && this.selectedRoles.length > 0) {
      this.currentStep = 3;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToStep(step: number): void {
    this.currentStep = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  isStep1Valid(): boolean {
    const controls = ['username', 'email', 'firstName', 'lastName', 'phone', 'password', 'confirmPassword'];
    return controls.every(controlName => {
      const control = this.userForm.get(controlName);
      return control && control.valid;
    }) && !this.userForm.errors?.['passwordMismatch'];
  }

  // ============================================================================
  // SECTION 12: VALIDATION
  // ============================================================================

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  // ============================================================================
  // SECTION 13: GESTION DE LA PHOTO
  // ============================================================================

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Vérifier la taille (max 5 MB)
      if (file.size > 5 * 1024 * 1024) {
        this.notificationService.warning(
          'La photo ne doit pas dépasser 5 MB',
          'Fichier trop volumineux'
        );
        return;
      }

      // Vérifier le type
      if (!file.type.startsWith('image/')) {
        this.notificationService.warning(
          'Seules les images sont acceptées',
          'Format invalide'
        );
        return;
      }

      this.photoFile = file;

      // Prévisualisation
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(): void {
    this.photoFile = null;
    this.photoPreview = '';
  }

  getPreviewInitials(): string {
    const firstName = this.userForm.get('firstName')?.value || '';
    const lastName = this.userForm.get('lastName')?.value || '';

    if (!firstName && !lastName) {
      return 'UN';
    }

    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    return initials;
  }

  getPreviewColor(): string {
    const username = this.userForm.get('username')?.value || 'user';
    const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', '#EF476F', '#7209B7', '#3A86FF'];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = ((hash << 5) - hash) + username.charCodeAt(i);
      hash |= 0;
    }
    return colors[Math.abs(hash) % colors.length];
  }

  // ============================================================================
  // SECTION 14: GESTION DES RÔLES
  // ============================================================================

  toggleRole(roleCode: string): void {
    const index = this.selectedRoles.indexOf(roleCode);
    if (index > -1) {
      this.selectedRoles.splice(index, 1);
    } else {
      this.selectedRoles.push(roleCode);
    }
  }

  isRoleSelected(roleCode: string): boolean {
    return this.selectedRoles.includes(roleCode);
  }

  getRoleName(roleCode: string): string {
    const role = this.availableRoles.find(r => r.code === roleCode);
    return role?.roleName || roleCode;
  }

  getRoleIcon(roleCode: string): string {
    const icons: { [key: string]: string } = {
      'SUPER_ADMIN': 'bx bx-crown',
      'MANAGER': 'bx bx-briefcase',
      'FINANCE': 'bx bx-dollar-circle',
      'OPERATIONS': 'bx bx-cog',
      'DRIVER': 'bx bx-car',
      'READ_ONLY': 'bx bx-glasses'
    };
    return icons[roleCode] || 'bx bx-user';
  }

  getRoleIconClass(roleCode: string): string {
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

  // ============================================================================
  // SECTION 15: PERMISSIONS
  // ============================================================================

  getUniquePermissions(): string[] {
    const permissionsSet = new Set<string>();

    this.selectedRoles.forEach(roleCode => {
      const role = this.availableRoles.find(r => r.code === roleCode);
      if (role && role.permissions) {
        role.permissions.forEach((permission: string) => {
          permissionsSet.add(permission);
        });
      }
    });

    return Array.from(permissionsSet).sort();
  }

  getTotalPermissions(): number {
    return this.getUniquePermissions().length;
  }

  // ============================================================================
  // SECTION 16: MOT DE PASSE
  // ============================================================================

  private setupPasswordStrengthListener(): void {
    this.userForm.get('password')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((password: string) => {
        this.passwordStrength = this.calculatePasswordStrength(password);
      });
  }

  private calculatePasswordStrength(password: string): number {
    if (!password) return 0;

    let strength = 0;

    // Longueur
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;

    // Majuscules et minuscules
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;

    // Chiffres
    if (/\d/.test(password)) strength++;

    // Caractères spéciaux
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    // Normaliser sur 3 niveaux
    return Math.min(3, Math.ceil(strength / 2));
  }

  getPasswordStrengthLabel(): string {
    switch (this.passwordStrength) {
      case 1: return 'Faible';
      case 2: return 'Moyen';
      case 3: return 'Fort';
      default: return '';
    }
  }

  // ============================================================================
  // SECTION 17: SOUMISSION
  // ============================================================================

  onSubmit(): void {
    if (this.userForm.invalid || this.selectedRoles.length === 0) {
      this.notificationService.warning(
        'Veuillez remplir tous les champs requis',
        'Formulaire incomplet'
      );
      return;
    }

    this.isSubmitting = true;

    const userRequest: UserRequest = {
      username: this.userForm.get('username')?.value,
      email: this.userForm.get('email')?.value,
      firstName: this.userForm.get('firstName')?.value,
      lastName: this.userForm.get('lastName')?.value,
      phone: this.userForm.get('phone')?.value,
      photoUrl: this.userForm.get('photoUrl')?.value || '',
      password: this.userForm.get('password')?.value,
      confirmPassword: this.userForm.get('confirmPassword')?.value,
      isActive: this.userForm.get('isActive')?.value,
      roles: this.selectedRoles,
      photoFile: this.photoFile || undefined
    };

    this.usersService.registerUser(userRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.notificationService.success(
            `L'utilisateur ${userRequest.firstName} ${userRequest.lastName} a été créé avec succès`,
            'Utilisateur créé'
          );

          // Redirection vers la liste après 1.5 secondes
          setTimeout(() => {
            this.router.navigate(['/dashboard/users/list']);
          }, 1500);
        },
        error: (error: { message: any; }) => {
          console.error('❌ Erreur création utilisateur:', error);
          this.isSubmitting = false;
          this.notificationService.error(
            error.message || 'Une erreur est survenue lors de la création',
            'Erreur de création'
          );
        }
      });
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
