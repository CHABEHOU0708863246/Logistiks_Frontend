import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ApiResponseData } from '../../models/Common/ApiResponseData';
import { RoleDto } from '../../models/Core/Roles/DTOs/RoleDto';
import { RoleRequest } from '../../models/Core/Roles/DTOs/RoleRequest';

@Injectable({
  providedIn: 'root',
})
export class Roles {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/roles`;

  constructor(private http: HttpClient) {}

  /**
   * Récupérer tous les rôles
   */
  getRoles(): Observable<RoleDto[]> {
    return this.http.get<RoleDto[]>(this.baseUrl)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Récupérer un rôle par son ID
   */
  getRole(id: string): Observable<ApiResponseData<RoleDto>> {
    return this.http.get<ApiResponseData<RoleDto>>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Créer un nouveau rôle
   */
  addRole(request: RoleRequest): Observable<ApiResponseData<RoleDto>> {
    // Les informations de l'utilisateur connecté seront ajoutées par l'intercepteur
    return this.http.post<ApiResponseData<RoleDto>>(this.baseUrl, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Mettre à jour un rôle existant
   */
  updateRole(id: string, request: RoleRequest): Observable<ApiResponseData<RoleDto>> {
    return this.http.put<ApiResponseData<RoleDto>>(`${this.baseUrl}/${id}`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Supprimer un rôle
   */
  deleteRole(id: string): Observable<ApiResponseData<RoleDto>> {
    return this.http.delete<ApiResponseData<RoleDto>>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Récupérer un rôle par son code
   */
  getRoleByCode(code: string): Observable<ApiResponseData<RoleDto>> {
    return this.http.get<ApiResponseData<RoleDto>>(`${this.baseUrl}/by-code/${code}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Récupérer plusieurs rôles par leurs IDs
   */
  getRolesByIds(roleIds: string[]): Observable<ApiResponseData<RoleDto[]>> {
    return this.http.post<ApiResponseData<RoleDto[]>>(`${this.baseUrl}/by-ids`, roleIds)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Récupérer tous les rôles d'un utilisateur
   */
  getUserRoles(roleIds: string[]): Observable<RoleDto[]> {
    return this.getRolesByIds(roleIds)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Récupérer toutes les permissions disponibles
   */
  getAllPermissions(): Observable<string[]> {
    return this.http.get<ApiResponseData<string[]>>(`${this.baseUrl}/permissions`)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Récupérer toutes les permissions (simplifié)
   */
  getPermissions(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/permissions`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Vérifier si un code de rôle existe déjà
   */
  checkRoleCodeExists(code: string, excludeId?: string): Observable<boolean> {
    return this.getRoleByCode(code)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            // Si un ID est fourni pour exclusion, vérifier s'il s'agit du même rôle
            if (excludeId && response.data.id === excludeId) {
              return false;
            }
            return true;
          }
          return false;
        }),
        catchError(() => {
          return new Observable<boolean>(subscriber => {
            subscriber.next(false);
            subscriber.complete();
          });
        })
      );
  }

  /**
   * Vérifier si un nom de rôle existe déjà
   */
  checkRoleNameExists(name: string, excludeId?: string): Observable<boolean> {
    return this.getRoles()
      .pipe(
        map(roles => {
          const existingRole = roles.find(role =>
            role.roleName.toLowerCase() === name.toLowerCase()
          );

          if (existingRole) {
            // Si un ID est fourni pour exclusion, vérifier s'il s'agit du même rôle
            if (excludeId && existingRole.id === excludeId) {
              return false; // C'est le même rôle
            }
            return true; // Le nom existe pour un autre rôle
          }
          return false; // Le nom n'existe pas
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Obtenir les rôles visibles (pour les formulaires de sélection)
   */
  getVisibleRoles(): Observable<RoleDto[]> {
    return this.getRoles()
      .pipe(
        map(roles => roles.filter(role => role.isVisible)),
        catchError(this.handleError)
      );
  }

  /**
   * Obtenir les rôles système
   */
  getSystemRoles(): Observable<RoleDto[]> {
    return this.getRoles()
      .pipe(
        map(roles => roles.filter(role => role.isSystem)),
        catchError(this.handleError)
      );
  }

  /**
   * Obtenir les rôles non-système (modifiables)
   */
  getEditableRoles(): Observable<RoleDto[]> {
    return this.getRoles()
      .pipe(
        map(roles => roles.filter(role => !role.isSystem)),
        catchError(this.handleError)
      );
  }

  /**
   * Gestion centralisée des erreurs
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Une erreur est survenue lors de l\'opération sur les rôles';

    if (error.error instanceof ErrorEvent) {
      // Erreur client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur serveur
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Données invalides';
          break;
        case 401:
          errorMessage = 'Non autorisé. Veuillez vous reconnecter.';
          break;
        case 403:
          errorMessage = 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
          break;
        case 404:
          errorMessage = 'Rôle non trouvé';
          break;
        case 409:
          errorMessage = 'Un rôle avec ce code ou ce nom existe déjà';
          break;
        case 500:
          errorMessage = 'Erreur serveur interne';
          break;
        default:
          errorMessage = `Erreur ${error.status}: ${error.message}`;
      }
    }

    console.error('RolesService error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
