import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { LoginRequest } from '../../models/Auth/Login/LoginRequest';
import { LoginResponse } from '../../models/Auth/Login/LoginResponse';
import { ChangePasswordRequest } from '../../models/Auth/Password/ChangePasswordRequest';
import { ForgotPasswordRequest } from '../../models/Auth/Password/ForgotPasswordRequest';
import { ResetPasswordRequest } from '../../models/Auth/Password/ResetPasswordRequest';
import { RefreshTokenRequest } from '../../models/Auth/Token/RefreshTokenRequest';
import { ValidateResetTokenRequest } from '../../models/Auth/Token/ValidateResetTokenRequest';
import { ApiResponseData } from '../../models/Common/ApiResponseData';
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
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, loginRequest)
      .pipe(
        catchError(this.handleError)
      );
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
  refreshToken(refreshTokenRequest: RefreshTokenRequest): Observable<RefreshTokenRequest> {
    return this.http.post<RefreshTokenRequest>(`${this.baseUrl}/refresh-token`, refreshTokenRequest)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Mot de passe oublié - Demande initiale
   */
  forgotPassword(forgotPasswordRequest: ForgotPasswordRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponseData<any>>(`${this.baseUrl}/forgot-password`, forgotPasswordRequest)
      .pipe(
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
    return this.http.get<User>(`${this.baseUrl}/me`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .pipe(
        map(user => {
          return user;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Gestion centralisée des erreurs
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Données invalides';
          break;
        case 401:
          errorMessage = 'Non autorisé. Veuillez vous reconnecter.';
          break;
        case 403:
          errorMessage = 'Accès refusé';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée';
          break;
        case 500:
          errorMessage = 'Erreur serveur interne';
          break;
        default:
          errorMessage = `Erreur ${error.status}: ${error.message}`;
      }
    }

    console.error('AuthService error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
