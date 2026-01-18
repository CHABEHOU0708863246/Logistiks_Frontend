import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../../core/services/Auth/auth';
import { Notification } from '../../../core/services/Notification/notification';
import { Notification as NotificationComponent } from '../../../core/components/notification/notification';
import { Token } from '../../../core/services/Token/token';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NotificationComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  loginForm!: FormGroup;
  isLoading = false;
  hidePassword = true;
  private tokenService = inject(Token);

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private router: Router,
    private notificationService: Notification
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [true],
    });
  }

  goToForgotPassword(): void {
    this.router.navigate(['/auth/forgot-password']);
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const { email, password, rememberMe } = this.loginForm.value;

      const loginRequest = {
        email: email,
        password: password,
        rememberMe: rememberMe,
      };

      // Utilisation de la méthode authenticate() du service
      this.authService.authenticate(loginRequest).subscribe({
        next: (response: any) => {
          this.isLoading = false;

          // Vérification basée sur la structure de LoginResponse
          if (response && (response.token || response.accessToken || response.data?.token)) {
            const token = response.token || response.accessToken || response.data?.token;

            // Décodage du token pour extraire le rôle
            let userRole = 'user'; // Rôle par défaut

            try {
              if (token) {
                const decodedToken: any = jwtDecode(token);

                // CORRECTION : Extrayez le rôle de la propriété correcte
                // Le rôle est dans 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
                userRole =
                  decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
                  decodedToken.role ||
                  decodedToken.roles?.[0] ||
                  decodedToken.authorities?.[0] ||
                  decodedToken.scope ||
                  'user';
              }
            } catch (error) {
              console.error('Erreur lors du décodage du token:', error);
            }

            // Stockage du token avec le service Token
            if (token) {
              // CORRECTION CRITIQUE : Utilisez saveToken du service Token
              this.tokenService.saveToken(token, userRole);

              if (response.refreshToken) {
                localStorage.setItem('refresh_token', response.refreshToken);
              }

              // Si rememberMe, stocker plus longtemps
              if (rememberMe) {
                localStorage.setItem('remember_me', 'true');
              }

              // Vérifiez que le token est bien stocké
              const storedToken = this.tokenService.getToken();
            }

            // Notification de succès
            this.notificationService.success(
              'Connexion réussie',
              'Bienvenue ! Redirection vers votre tableau de bord...'
            );

            // Redirection après un court délai
            setTimeout(() => {

              // Naviguez d'abord, puis rechargez pour forcer la vérification du guard
              this.router.navigate(['/dashboard']).then(
                (success) => {
                  if (!success) {
                    // Si la navigation échoue, rechargez la page
                    window.location.href = '/dashboard';
                  }
                },
                (error) => {
                  console.error('Erreur de navigation:', error);
                  // Fallback: rechargez la page
                  window.location.href = '/dashboard';
                }
              );
            }, 1000);
          } else {
            this.notificationService.error(
              'Échec de la connexion',
              'Réponse du serveur invalide. Token manquant.'
            );
            console.error('Réponse sans token:', response);
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.handleLoginError(err);
        },
      });
    } else {
      this.loginForm.markAllAsTouched();
      this.notificationService.warning(
        'Formulaire incomplet',
        'Veuillez remplir correctement tous les champs obligatoires.'
      );
    }
  }

  /**
   * Gestion centralisée des erreurs de login
   */
  private handleLoginError(err: any): void {
    let errorTitle = 'Erreur de connexion';
    let errorMessage = 'Une erreur est survenue lors de la connexion.';

    if (err.status === 400) {
      errorTitle = 'Données invalides';
      errorMessage = err.error?.message || 'Veuillez vérifier votre email et mot de passe.';
    } else if (err.status === 401) {
      errorTitle = 'Identifiants invalides';
      errorMessage = err.error?.message || 'Email ou mot de passe incorrect.';
    } else if (err.status === 403) {
      errorTitle = 'Accès refusé';
      errorMessage = err.error?.message || "Votre compte n'a pas les droits nécessaires.";
    } else if (err.status === 404) {
      errorTitle = 'Service indisponible';
      errorMessage = "Le service d'authentification est momentanément indisponible.";
    } else if (err.status === 429) {
      errorTitle = 'Trop de tentatives';
      errorMessage = 'Veuillez réessayer dans quelques minutes.';
    } else if (err.status >= 500) {
      errorTitle = 'Erreur serveur';
      errorMessage = 'Le serveur rencontre des difficultés. Veuillez réessayer plus tard.';
    }

    this.notificationService.error(errorTitle, errorMessage);
    console.error('Login error:', err);
  }

  /**
   * Méthode pour basculer la visibilité du mot de passe
   */
  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }
}
