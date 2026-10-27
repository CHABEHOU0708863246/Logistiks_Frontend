import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, catchError, throwError } from 'rxjs';
import { Auth } from '../../../core/services/Auth/auth';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword implements OnInit, OnDestroy {
  resetPasswordForm: FormGroup;
  isLoading = false;
  isValidating = true;
  errorMessage = '';
  successMessage = '';
  hidePassword = true;
  hideConfirmPassword = true;
  email = '';
  token = '';
  tokenValid = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: Auth
  ) {
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [
        Validators.required,
        Validators.minLength(6),
        this.passwordStrengthValidator
      ]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    // Récupérer les paramètres de l'URL
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.email = params['email'] || '';
      this.token = params['token'] || '';

      if (!this.email || !this.token) {
        this.errorMessage = 'Lien de réinitialisation invalide ou expiré.';
        this.isValidating = false;
        return;
      }

      this.validateToken();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  validateToken(): void {
    this.authService.validateResetToken({ email: this.email, token: this.token })
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.handleTokenValidationError(error);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          this.isValidating = false;

          if (response.success === true) {
            this.tokenValid = true;
            this.errorMessage = '';
          } else {
            this.tokenValid = false;
            this.errorMessage = response.message || 'Lien de réinitialisation invalide ou expiré.';
          }
        },
        error: (error) => {
          //console.error('Erreur validation token:', error);
          this.handleTokenValidationError(error);
        }
      });
  }

  // Méthodes pour l'affichage en temps réel de la force du mot de passe
  getPasswordStrengthClass(): string {
    const password = this.newPassword?.value;
    if (!password) return 'strength-0';

    let strength = 0;
    if (password.length >= 6) strength++;
    if (this.hasUpperCase()) strength++;
    if (this.hasLowerCase()) strength++;
    if (this.hasNumber()) strength++;

    return `strength-${strength}`;
  }

  hasUpperCase(): boolean {
    return /[A-Z]/.test(this.newPassword?.value || '');
  }

  hasLowerCase(): boolean {
    return /[a-z]/.test(this.newPassword?.value || '');
  }

  hasNumber(): boolean {
    return /[0-9]/.test(this.newPassword?.value || '');
  }

  hasSpecialChar(): boolean {
    return /[#?!@$%^&*-]/.test(this.newPassword?.value || '');
  }

  handleTokenValidationError(error: any): void {
    this.isValidating = false;
    this.tokenValid = false;
    const status = Number(error?.status ?? 0);

    if (this.isOffline(error)) {
      this.errorMessage =
        'Vous êtes hors ligne. Vérifiez votre connexion internet puis réessayez.';
    } else if (status === 400 || status === 404 || status === 410) {
      this.errorMessage = 'Lien de réinitialisation invalide ou expiré.';
    } else if (status >= 500) {
      this.errorMessage = 'Le serveur rencontre un problème. Réessayez plus tard.';
    } else {
      this.errorMessage = 'La validation du lien a échoué. Demandez un nouveau lien.';
    }
  }

  private isOffline(error: any): boolean {
    const status = Number(error?.status ?? 0);
    return status === 0 || (typeof navigator !== 'undefined' && navigator.onLine === false);
  }

  onSubmit(): void {
  if (this.resetPasswordForm.valid && !this.isLoading && this.tokenValid) {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { newPassword } = this.resetPasswordForm.value;

    this.authService.resetPassword({
      email: this.email,
      token: this.token,
      password: newPassword // ✅ utiliser la valeur du formulaire
    })
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.handleResetError(error);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success === true) {
            this.handleResetSuccess(response.message);
          } else {
            this.errorMessage = response.message;
          }
        },
        error: () => {}
      });
  } else {
    this.resetPasswordForm.markAllAsTouched();
  }
}

  handleResetSuccess(message: string): void {
    this.successMessage = message;
    this.resetPasswordForm.disable();

    // Rediriger vers la page de connexion après 3 secondes
    setTimeout(() => {
      this.router.navigate(['/auth/login'], {
        queryParams: { message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.' }
      });
    }, 3000);
  }

  handleResetError(error: any): void {
    this.isLoading = false;
    const status = Number(error?.status ?? 0);

    if (this.isOffline(error)) {
      this.errorMessage =
        'Vous êtes hors ligne. Vérifiez votre connexion internet puis réessayez.';
    } else if (status === 400) {
      this.errorMessage = error.error?.message || 'Les informations saisies sont invalides.';
    } else if (status === 404 || status === 410) {
      this.errorMessage = 'Lien de réinitialisation invalide ou expiré.';
    } else if (status === 429) {
      this.errorMessage = 'Trop de tentatives. Réessayez dans quelques minutes.';
    } else if (status >= 500) {
      this.errorMessage = 'Le serveur rencontre un problème. Réessayez plus tard.';
    } else {
      this.errorMessage = 'La réinitialisation du mot de passe a échoué. Réessayez.';
    }
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }

  // Validateurs personnalisés
  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;

    if (!value) {
      return null;
    }

    const hasNumber = /[0-9]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasSpecial = /[#?!@$%^&*-]/.test(value);

    const passwordValid = hasNumber && hasUpper && hasLower && value.length >= 6;

    return passwordValid ? null : {
      passwordStrength: {
        hasNumber,
        hasUpper,
        hasLower,
        hasSpecial,
        minLength: value.length >= 6
      }
    };
  }

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  goBackToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  requestNewResetLink(): void {
    this.router.navigate(['/auth/forgot-password']);
  }

  // Getters pour faciliter l'accès aux contrôles dans le template
  get newPassword() {
    return this.resetPasswordForm.get('newPassword');
  }

  get confirmPassword() {
    return this.resetPasswordForm.get('confirmPassword');
  }

  getPasswordStrengthErrors() {
    return this.newPassword?.errors?.['passwordStrength'] || {};
  }

  get hasPasswordMismatch(): boolean {
    return (
      !!this.resetPasswordForm.errors?.['passwordMismatch'] &&
      (this.confirmPassword?.dirty === true || this.confirmPassword?.touched === true)
    );
  }
}
