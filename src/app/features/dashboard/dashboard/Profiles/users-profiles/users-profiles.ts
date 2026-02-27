import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import {
  FormsModule, ReactiveFormsModule, FormBuilder, FormGroup,
  Validators, AbstractControl, ValidationErrors
} from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { NotificationComponent } from '../../../../../core/components/notification-component/notification-component';
import { SidebarComponent } from '../../../../../core/components/sidebar-component/sidebar-component';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import { UserProfile } from '../../../../../core/models/Core/Users/Entities/UserProfile';
import { UpdateProfileRequest } from '../../../../../core/models/Core/Users/DTOs/UpdateProfileRequest';
import { Auth } from '../../../../../core/services/Auth/auth';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Token } from '../../../../../core/services/Token/token';
import { Users } from '../../../../../core/services/Users/users';

// ============================================================================
// VALIDATOR: vérification que les mots de passe correspondent
// ============================================================================
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPwd = control.get('newPassword')?.value;
  const confirmPwd = control.get('confirmNewPassword')?.value;
  if (newPwd && confirmPwd && newPwd !== confirmPwd) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-users-profiles',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NotificationComponent, SidebarComponent],
  templateUrl: './users-profiles.html',
  styleUrl: './users-profiles.scss',
})
export class UsersProfiles implements OnInit, OnDestroy {

  // ============================================================================
  // SECTION 1: RÉFÉRENCES
  // ============================================================================
  @ViewChild('photoInput') photoInput!: ElementRef<HTMLInputElement>;

  // ============================================================================
  // SECTION 2: ÉTAT DU COMPOSANT
  // ============================================================================

  /** Onglet actif */
  activeTab: 'personal' | 'address' | 'emergency' | 'security' = 'personal';

  /** Chargement des données */
  isLoading = true;

  /** Sauvegarde en cours */
  isSaving = false;

  /** Messages */
  successMessage = '';
  errorMessage = '';

  // ============================================================================
  // SECTION 3: DONNÉES UTILISATEUR
  // ============================================================================

  currentUser: User | null = null;
  userProfile: UserProfile | null = null;
  userName = 'Utilisateur';
  userPhotoUrl = '';
  previewPhotoUrl = '';
  selectedPhotoFile: File | null = null;

  // ============================================================================
  // SECTION 4: FORMULAIRES
  // ============================================================================

  personalForm!: FormGroup;
  addressForm!: FormGroup;
  emergencyForm!: FormGroup;
  securityForm!: FormGroup;

  // ============================================================================
  // SECTION 5: UI
  // ============================================================================

  showUserMenu = false;
  isSidebarCollapsed = false;
  showCurrentPwd = false;
  showNewPwd = false;
  showConfirmPwd = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private usersService: Users,
    private notificationService: NotificationService,
    private tokenService: Token,
    private router: Router
  ) { }

  // ============================================================================
  // SECTION 6: LIFECYCLE
  // ============================================================================

  ngOnInit(): void {
    this.checkAuthentication();
    this.initForms();
    this.loadCurrentUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // SECTION 7: INITIALISATION DES FORMULAIRES
  // ============================================================================

  private initForms(): void {
    this.personalForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      phone: [''],
      gender: [''],
      dateOfBirth: [''],
      maritalStatus: [''],
      nationalId: [''],
      numberOfChildren: [null],
      notes: [''],
    });

    this.addressForm = this.fb.group({
      address: [''],
      city: [''],
      postalCode: [''],
    });

    this.emergencyForm = this.fb.group({
      emergencyContact: [''],
      emergencyPhone: [''],
    });

    this.securityForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmNewPassword: ['', Validators.required],
    }, { validators: passwordMatchValidator });
  }

  // ============================================================================
  // SECTION 8: CHARGEMENT DES DONNÉES
  // ============================================================================

  loadCurrentUser(): void {
    this.isLoading = true;

    this.usersService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          console.log('RAW data:', data); // ← vérifier la vraie structure

          // Adapter selon ce que vous voyez dans la console :
          const user = data?.user ?? data;           // si la réponse est directement un User
          const profile = data?.profile ?? null;

          this.currentUser = user;
          this.userProfile = profile;
          this.userName = this.formatUserName(user);
          this.userPhotoUrl = this.getUserPhotoUrl(user);
          this.patchForms(user, profile);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur chargement utilisateur:', error);
          this.isLoading = false;
          if (error.status === 401) {
            this.tokenService.handleTokenExpired();
          } else {
            this.showError('Impossible de charger votre profil.');
          }
        }
      });
  }

  private patchForms(user: User, profile?: UserProfile): void {
    // Formulaire personnel
    this.personalForm.patchValue({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      gender: profile?.gender || '',
      dateOfBirth: profile?.dateOfBirth ? this.formatDateForInput(new Date(profile.dateOfBirth)) : '',
      maritalStatus: profile?.maritalStatus || '',
      nationalId: profile?.nationalId || '',
      numberOfChildren: profile?.numberOfChildren ?? null,
      notes: profile?.notes || '',
    });

    // Formulaire adresse
    this.addressForm.patchValue({
      address: profile?.address || '',
      city: profile?.city || '',
      postalCode: profile?.postalCode || '',
    });

    // Formulaire urgence
    this.emergencyForm.patchValue({
      emergencyContact: profile?.emergencyContact || '',
      emergencyPhone: profile?.emergencyPhone || '',
    });
  }

  // ============================================================================
  // SECTION 9: SAUVEGARDE
  // ============================================================================

  savePersonalInfo(): void {
    if (this.personalForm.invalid) {
      this.personalForm.markAllAsTouched();
      return;
    }

    const val = this.personalForm.value;
    const request: UpdateProfileRequest = {
      firstName: val.firstName,
      lastName: val.lastName,
      phone: val.phone,
      gender: val.gender || undefined,
      dateOfBirth: val.dateOfBirth ? new Date(val.dateOfBirth) : undefined,
      maritalStatus: val.maritalStatus || undefined,
      nationalId: val.nationalId || undefined,
      numberOfChildren: val.numberOfChildren ?? undefined,
      notes: val.notes || undefined,
      photoFile: this.selectedPhotoFile || undefined,
      photoUrl: this.selectedPhotoFile ? undefined : (this.currentUser?.photoUrl || ''), // ✅
    };

    this.submitUpdate(request);
  }

  saveAddress(): void {
    const val = this.addressForm.value;
    const request: UpdateProfileRequest = {
      address: val.address || undefined,
      city: val.city || undefined,
      postalCode: val.postalCode || undefined,
      photoUrl: this.currentUser?.photoUrl || '',
    };
    this.submitUpdate(request);
  }

  saveEmergency(): void {
    const val = this.emergencyForm.value;
    const request: UpdateProfileRequest = {
      emergencyContact: val.emergencyContact || undefined,
      emergencyPhone: val.emergencyPhone || undefined,
      photoUrl: this.currentUser?.photoUrl || '', // ✅
    };
    this.submitUpdate(request);
  }

  savePassword(): void {
    if (this.securityForm.invalid) {
      this.securityForm.markAllAsTouched();
      return;
    }

    const val = this.securityForm.value;
    const request: UpdateProfileRequest = {
      currentPassword: val.currentPassword,
      newPassword: val.newPassword,
      confirmNewPassword: val.confirmNewPassword,
      photoUrl: this.currentUser?.photoUrl || '',
    };
    this.submitUpdate(request, () => {
      this.securityForm.reset();
    });
  }

  private submitUpdate(request: UpdateProfileRequest, onSuccess?: () => void): void {
    this.isSaving = true;
    this.clearMessages();

    this.usersService.updateCurrentUser(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSaving = false;
          if (response.succeeded) {
            this.showSuccess(response.message || 'Profil mis à jour avec succès.');
            this.selectedPhotoFile = null;
            this.loadCurrentUser(); // recharger les données
            if (onSuccess) onSuccess();
          } else {
            this.showError(response.errors?.join(', ') || response.message || 'Une erreur est survenue.');
          }
        },
        error: (error) => {
          this.isSaving = false;
          this.showError(error.message || 'Erreur lors de la mise à jour.');
        }
      });
  }

  // ============================================================================
  // SECTION 10: GESTION PHOTO
  // ============================================================================

  triggerPhotoUpload(): void {
    this.photoInput.nativeElement.click();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validation taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.showError('La photo ne doit pas dépasser 5 MB.');
        return;
      }

      this.selectedPhotoFile = file;

      // Prévisualisation
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewPhotoUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  clearPreview(): void {
    this.previewPhotoUrl = '';
    this.userPhotoUrl = this.generateAvatarUrl(this.currentUser || { firstName: 'U' } as User);
  }

  // ============================================================================
  // SECTION 11: RÉINITIALISATION FORMULAIRES
  // ============================================================================

  resetPersonalForm(): void {
    if (this.currentUser) this.patchForms(this.currentUser, this.userProfile || undefined);
    this.clearMessages();
  }

  resetAddressForm(): void {
    if (this.currentUser) this.patchForms(this.currentUser, this.userProfile || undefined);
    this.clearMessages();
  }

  resetEmergencyForm(): void {
    if (this.currentUser) this.patchForms(this.currentUser, this.userProfile || undefined);
    this.clearMessages();
  }

  resetSecurityForm(): void {
    this.securityForm.reset();
    this.clearMessages();
  }

  // ============================================================================
  // SECTION 12: ONGLETS
  // ============================================================================

  setTab(tab: 'personal' | 'address' | 'emergency' | 'security'): void {
    this.activeTab = tab;
    this.clearMessages();
  }

  // ============================================================================
  // SECTION 13: MOT DE PASSE — FORCE
  // ============================================================================

  get passwordStrength(): number {
    const pwd = this.securityForm.get('newPassword')?.value || '';
    if (!pwd) return 0;
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (pwd.length >= 12) strength += 15;
    if (/[A-Z]/.test(pwd)) strength += 20;
    if (/[0-9]/.test(pwd)) strength += 20;
    if (/[^A-Za-z0-9]/.test(pwd)) strength += 20;
    return Math.min(strength, 100);
  }

  get passwordStrengthClass(): string {
    const s = this.passwordStrength;
    if (s < 40) return 'weak';
    if (s < 75) return 'medium';
    return 'strong';
  }

  get passwordStrengthLabel(): string {
    const s = this.passwordStrength;
    if (s < 40) return 'Faible';
    if (s < 75) return 'Moyen';
    return 'Fort';
  }

  // ============================================================================
  // SECTION 14: VALIDATION
  // ============================================================================

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const control = form.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  // ============================================================================
  // SECTION 15: AUTHENTIFICATION
  // ============================================================================

  private checkAuthentication(): void {
    const token = this.tokenService.getToken();
    if (!token) {
      this.router.navigate(['/auth/login']);
    }
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

  // ============================================================================
  // SECTION 16: UI
  // ============================================================================

  toggleUserMenu(): void { this.showUserMenu = !this.showUserMenu; }
  toggleSidebar(): void { this.isSidebarCollapsed = !this.isSidebarCollapsed; }

  @HostListener('document:click', ['$event'])
  closeUserMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-avatar-btn') && !target.closest('.dropdown-menu')) {
      this.showUserMenu = false;
    }
  }

  // ============================================================================
  // SECTION 17: HELPERS
  // ============================================================================

  formatUserName(user: any): string {
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    if (user?.firstName) return user.firstName;
    if (user?.username) return user.username;
    if (user?.email) return user.email.split('@')[0];
    return 'Utilisateur';
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

  generateAvatarUrl(user: any): string {
    const name = this.formatUserName(user);
    const colors = ['FF6B6B', '4ECDC4', 'FFD166', '06D6A0', '118AB2', 'EF476F', '7209B7', '3A86FF'];
    const colorIndex = name.length % colors.length;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${colors[colorIndex]}&color=fff&size=128`;
  }

  getUserInitials(): string {
    const parts = this.userName.split(' ');
    if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    return this.userName.charAt(0).toUpperCase();
  }

  getDefaultAvatar(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=696cff&color=fff&size=128`;
  }

  private formatDateForInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 5000);
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    this.successMessage = '';
    setTimeout(() => this.errorMessage = '', 7000);
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}
