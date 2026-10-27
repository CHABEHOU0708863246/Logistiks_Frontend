import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
//import { environment } from '../../../../environments/environment.development';
import { LoginRequest } from '../../models/Auth/Login/LoginRequest';
import { LoginResponse } from '../../models/Auth/Login/LoginResponse';
import { ChangePasswordRequest } from '../../models/Auth/Password/ChangePasswordRequest';
import { ForgotPasswordRequest } from '../../models/Auth/Password/ForgotPasswordRequest';
import { ResetPasswordRequest } from '../../models/Auth/Password/ResetPasswordRequest';
import { RefreshTokenRequest } from '../../models/Auth/Token/RefreshTokenRequest';
import { ValidateResetTokenRequest } from '../../models/Auth/Token/ValidateResetTokenRequest';
import { ApiResponseData } from '../../models/Common/ApiResponseData';
import { ApiResponse } from '../../models/Common/ApiResponse';
import { User } from '../../models/Core/Users/Entities/User';

@Injectable({
  providedIn: 'root',
})
export class Auth {

  private readonly baseUrl = `${environment.apiUrl}/api/Auth`;

  constructor(private http: HttpClient) { }

  /**
   * Authentifie un utilisateur et génère un token JWT
   */
  authenticate(loginRequest: LoginRequest): Observable<LoginResponse> {
    // Erreurs HTTP brutes volontairement : l'écran de connexion doit pouvoir
    // distinguer 401, 429 (rate limit) et le verrouillage du compte.
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, loginRequest);
  }

  /**
   * Connexion traditionnelle (si nécessaire)
   */
  logIn(loginRequest: LoginRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponseData<any>>(`${this.baseUrl}/login`, loginRequest)
      .pipe(
        map(response => ({
          success: response.success,
          message: response.message
        })),
        catchError(this.handleError)
      );
  }

  /**
   * Déconnexion
   */
  logout(): Observable<boolean> {
    return this.http.post<boolean>(`${this.baseUrl}/logout`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Rafraîchir le token
   */
  refreshToken(refreshTokenRequest: RefreshTokenRequest): Observable<LoginResponse> {
    // Le rafraîchissement automatique passe par TokenRefreshService (HttpBackend).
    // Cette méthode reste disponible pour les appels explicites.
    return this.http.post<LoginResponse>(`${this.baseUrl}/refresh-token`, refreshTokenRequest);
  }

  /**
   * Mot de passe oublié - Demande initiale
   */
  forgotPassword(forgotPasswordRequest: ForgotPasswordRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponseData<any>>(
      `${this.baseUrl}/forgot-password`,
      forgotPasswordRequest
    ).pipe(
      map(response => ({
        success: response.success,
        message: response.message
      })),
      catchError(this.handleError)
    );
  }
  /**
   * Valider un token de réinitialisation
   */
  validateResetToken(validateRequest: ValidateResetTokenRequest): Observable<ApiResponse> {
    const decodedRequest = {
      email: validateRequest.email,
      token: encodeURIComponent(validateRequest.token)
    };

    return this.http.post<ApiResponseData<any>>(`${this.baseUrl}/validate-reset-token`, decodedRequest)
      .pipe(
        map(response => ({
          success: response.success,
          message: response.message
        })),
        catchError(this.handleError)
      );
  }

  /**
   * Réinitialiser le mot de passe
   */
  resetPassword(resetPasswordRequest: ResetPasswordRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponseData<any>>(`${this.baseUrl}/reset-password`, resetPasswordRequest)
      .pipe(
        map(response => ({
          success: response.success,
          message: response.message
        })),
        catchError(this.handleError)
      );
  }

  /**
   * Changer le mot de passe (utilisateur connecté)
   */
  changePassword(changePasswordRequest: ChangePasswordRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponseData<any>>(`${this.baseUrl}/change-password`, changePasswordRequest)
      .pipe(
        map(response => ({
          success: response.success,
          message: response.message
        })),
        catchError(this.handleError)
      );
  }

  /**
   * Obtenir les informations de l'utilisateur connecté
   */
  getCurrentUser(): Observable<User> {
    // AuthInterceptor ajoute le Bearer et gère le refresh 401.
    return this.http.get<User>(`${this.baseUrl}/me`);
  }

  /**
   * Gestion centralisée des erreurs
   */
  private handleError(error: any): Observable<never> {
    const status = Number(error?.status ?? 0);
    let errorMessage = 'Une erreur est survenue';

    if (error?.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      switch (status) {
        case 0:
          errorMessage = 'Vous êtes hors ligne ou le serveur est injoignable.';
          break;
        case 400:
          errorMessage = error.error?.message || 'Données invalides';
          break;
        case 401:
          errorMessage = 'Email ou mot de passe incorrect.';
          break;
        case 403:
          errorMessage = 'Accès refusé';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée';
          break;
        case 423:
          errorMessage = 'Votre compte est verrouillé.';
          break;
        case 429:
          errorMessage = 'Trop de tentatives. Réessayez dans quelques minutes.';
          break;
        case 500:
          errorMessage = 'Erreur serveur interne';
          break;
        default:
          errorMessage = `Erreur ${status}: ${error.message}`;
      }
    }

    console.error('AuthService error:', error);

    // Le statut est conservé : les écrans doivent pouvoir distinguer un
    // identifiant faux (401), un compte verrouillé (423) et le hors-ligne (0).
    const normalized: any = new Error(errorMessage);
    normalized.status = status;
    normalized.error = error?.error;
    return throwError(() => normalized);
  }
}
