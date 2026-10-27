import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Auth } from '../../../core/services/Auth/auth';;
import { Token } from '../../../core/services/Token/token';
import { jwtDecode } from 'jwt-decode';
import { NotificationService } from '../../../core/services/Notification/notification-service';
import { NotificationComponent } from "../../../core/components/notification-component/notification-component";

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
  formError = '';
  private tokenService = inject(Token);

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [true],
    });

    const sessionExpired =
      this.route.snapshot.queryParamMap.get('sessionExpired') === '1' ||
      this.route.snapshot.queryParamMap.get('expired') === 'true';

    if (sessionExpired) {
      this.notificationService.warning(
        'Session expirée',
        'Votre session a expiré. Veuillez vous reconnecter.'
      );

      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });
    }
  }

  goToForgotPassword(): void {
    this.router.navigate(['/auth/forgot-password']);
  }

  clearFormError(): void {
    this.formError = '';
  }

  onSubmit(): void {
    this.formError = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.formError = 'Veuillez saisir votre email et votre mot de passe.';
      return;
    }

    this.isLoading = true;
    const { email, password, rememberMe } = this.loginForm.value;

    this.authService.authenticate({ email, password, rememberMe }).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        const token = response?.token || response?.accessToken || response?.data?.token;

        if (!token) {
          this.formError = 'La réponse du serveur est invalide. Veuillez réessayer.';
          console.error('Réponse sans token:', response);
          return;
        }

        let userRole = 'user';
        try {
          const decodedToken: any = jwtDecode(token);
          userRole =
            decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
            decodedToken.role ||
            decodedToken.roles?.[0] ||
            decodedToken.authorities?.[0] ||
            decodedToken.scope ||
            'user';
        } catch (error) {
          console.error('Erreur lors du décodage du token:', error);
        }

        const refreshToken = response.refreshToken || response.data?.refreshToken || null;
        this.tokenService.saveSession(token, refreshToken, !!rememberMe, userRole);

        this.notificationService.success(
          'Connexion réussie',
          'Bienvenue ! Redirection vers votre tableau de bord...'
        );

        setTimeout(() => {
          this.router.navigate(['/dashboard']).then(
            (success) => {
              if (!success) {
                window.location.href = '/dashboard';
              }
            },
            (error) => {
              console.error('Erreur de navigation:', error);
              window.location.href = '/dashboard';
            }
          );
        }, 1000);
      },
      error: (err) => {
        this.isLoading = false;
        this.handleLoginError(err);
      },
    });
  }

  /**
   * Gestion centralisée des erreurs de login.
   * Les messages restent volontairement courts et explicites : identifiants
   * faux, compte verrouillé/désactivé, hors ligne, trop de tentatives.
   */
  private handleLoginError(err: any): void {
    const status = Number(err?.status ?? 0);
    const serverMessage = this.readServerMessage(err);
    const probe = serverMessage.toLowerCase();

    if (status === 0) {
      this.formError =
        'Vous êtes hors ligne. Vérifiez votre connexion internet puis réessayez.';
    } else if (status === 423 || /verrouill|locked|bloqu/.test(probe)) {
      this.formError =
        'Votre compte est verrouillé. Contactez un administrateur pour le débloquer.';
    } else if (status === 401) {
      this.formError = 'Email ou mot de passe incorrect.';
    } else if (status === 403) {
      this.formError =
        'Votre compte est désactivé ou ne dispose pas des droits nécessaires.';
    } else if (status === 400) {
      this.formError = serverMessage || 'Les informations saisies sont invalides.';
    } else if (status === 404) {
      this.formError = "Le service de connexion est momentanément indisponible.";
    } else if (status === 429) {
      this.formError = 'Trop de tentatives. Réessayez dans quelques minutes.';
    } else if (status >= 500) {
      this.formError = 'Le serveur rencontre un problème. Réessayez plus tard.';
    } else {
      this.formError = 'La connexion a échoué. Veuillez réessayer.';
    }

    console.error('Login error:', err);
  }

  private readServerMessage(err: any): string {
    const body = err?.error;
    if (typeof body === 'string' && body.trim()) {
      return body.trim();
    }

    const message = body?.message || body?.detail || body?.title;
    return typeof message === 'string' ? message.trim() : '';
  }

  /**
   * Méthode pour basculer la visibilité du mot de passe
   */
  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }
}
