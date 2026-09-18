import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiResponseData } from '../../models/Common/ApiResponseData';
import { SettingsUpdateRequest, SystemSetting } from '../../models/Settings/settings.models';

/**
 * Service du paramétrage global — API /api/v1/settings.
 */
@Injectable({
  providedIn: 'root',
})
export class Settings {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/settings`;

  constructor(private http: HttpClient) {}

  /**
   * Tous les paramètres, triés par catégorie puis clé.
   */
  getAll(): Observable<ApiResponseData<SystemSetting[]>> {
    return this.http
      .get<ApiResponseData<SystemSetting[]>>(this.baseUrl)
      .pipe(catchError(this.handleError));
  }

  /**
   * Paramètres d'une catégorie (GENERAL, FINANCE, NOTIFICATIONS).
   */
  getByCategory(category: string): Observable<ApiResponseData<SystemSetting[]>> {
    const url = `${this.baseUrl}/category/${encodeURIComponent(category)}`;
    return this.http
      .get<ApiResponseData<SystemSetting[]>>(url)
      .pipe(catchError(this.handleError));
  }

  /**
   * Mise à jour par lot : refusée en bloc si une clé est inconnue
   * ou une valeur invalide pour son type.
   */
  updateBatch(updates: SettingsUpdateRequest[]): Observable<ApiResponseData<SystemSetting[]>> {
    return this.http
      .put<ApiResponseData<SystemSetting[]>>(this.baseUrl, updates)
      .pipe(catchError(this.handleError));
  }

  /**
   * Gestion centralisée des erreurs HTTP.
   */
  private handleError(error: any): Observable<never> {
    console.error('SettingsService — Erreur HTTP :', error);

    let errorMessage = 'Une erreur est survenue';

    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.error?.errors?.length) {
      errorMessage = error.error.errors.join(', ');
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return throwError(() => new Error(errorMessage));
  }
}
