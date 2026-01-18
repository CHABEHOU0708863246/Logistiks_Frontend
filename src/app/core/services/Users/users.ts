import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ApiResponseData } from '../../models/Common/ApiResponseData';
import { PaginatedRequest } from '../../models/Common/PaginatedRequest';
import { PaginatedResponse } from '../../models/Common/PaginatedResponse';
import { UpdateProfileRequest } from '../../models/Core/Users/DTOs/UpdateProfileRequest';
import { UserRequest } from '../../models/Core/Users/DTOs/UserRequest';
import { User } from '../../models/Core/Users/Entities/User';
import { UserPreferences } from '../../models/Core/Users/Entities/UserPreferences';
import { UserProfile } from '../../models/Core/Users/Entities/UserProfile';
import { UserEditableFields } from '../../models/Core/Users/Responses/UserEditableFields';
import { UserResponse } from '../../models/Core/Users/Responses/UserResponse';

@Injectable({
  providedIn: 'root',
})
export class Users {
  private readonly baseUrl = `${environment.apiUrl}/api/user`;

  constructor(private http: HttpClient) {}

  // ============ OPÉRATIONS PUBLIQUES ============

  /**
   * Créer un nouvel utilisateur (inscription)
   */
  registerUser(userRequest: UserRequest): Observable<UserResponse> {
    const formData = this.createUserFormData(userRequest);

    return this.http.post<UserResponse>(`${this.baseUrl}/register`, formData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Récupérer la photo d'un utilisateur
   */
  getUserPhoto(photoId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/photo/${photoId}`, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  // ============ OPÉRATIONS AUTHENTIFIÉES ============

  /**
   * Récupérer l'utilisateur actuellement connecté
   */
  getCurrentUser(): Observable<{
    user: User;
    profile?: UserProfile;
    preferences?: UserPreferences;
  }> {
    return this.http.get<ApiResponseData<{
      user: User;
      profile?: UserProfile;
      preferences?: UserPreferences;
    }>>(`${this.baseUrl}/me`)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Mettre à jour le profil de l'utilisateur connecté
   */
  updateCurrentUser(updateRequest: UpdateProfileRequest): Observable<UserResponse> {
    const formData = this.createUpdateProfileFormData(updateRequest);

    return this.http.put<UserResponse>(`${this.baseUrl}/me`, formData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Mettre à jour la photo de profil
   */
  updateProfilePhoto(photoFile: File): Observable<UserResponse> {
    const formData = new FormData();
    formData.append('photoFile', photoFile);

    return this.http.put<UserResponse>(`${this.baseUrl}/me/photo`, formData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // ============ OPÉRATIONS ADMINISTRATIVES ============

  /**
   * Récupérer tous les utilisateurs
   */
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.baseUrl)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Récupérer un utilisateur par ID
   */
  getUserById(id: string): Observable<{
    user: User;
    profile?: UserProfile;
    preferences?: UserPreferences;
  }> {
    return this.http.get<ApiResponseData<{
      user: User;
      profile?: UserProfile;
      preferences?: UserPreferences;
    }>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Récupérer un utilisateur par email
   */
  getUserByEmail(email: string): Observable<User> {
    return this.http.get<ApiResponseData<User>>(`${this.baseUrl}/by-email/${email}`)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Récupérer le profil utilisateur
   */
  getUserProfile(userId: string): Observable<UserProfile> {
    return this.http.get<ApiResponseData<UserProfile>>(`${this.baseUrl}/${userId}/profile`)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Récupérer les préférences utilisateur
   */
  getUserPreferences(userId: string): Observable<UserPreferences> {
    return this.http.get<ApiResponseData<UserPreferences>>(`${this.baseUrl}/${userId}/preferences`)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Activer/désactiver un utilisateur
   */
  toggleUserStatus(userId: string): Observable<{ message: string }> {
    return this.http.put<ApiResponseData<{ message: string }>>(
      `${this.baseUrl}/${userId}/status`,
      {}
    ).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Mettre à jour les rôles d'un utilisateur
   */
  updateUserRoles(userId: string, roles: string[]): Observable<{ message: string }> {
    return this.http.put<ApiResponseData<{ message: string }>>(
      `${this.baseUrl}/${userId}/roles`,
      roles
    ).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Mettre à jour les permissions d'un utilisateur
   */
  updateUserPermissions(userId: string, permissions: string[]): Observable<{ message: string }> {
    return this.http.put<ApiResponseData<{ message: string }>>(
      `${this.baseUrl}/${userId}/permissions`,
      permissions
    ).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer les utilisateurs paginés
   */
  getPaginatedUsers(request: PaginatedRequest): Observable<PaginatedResponse<User>> {
    let params = new HttpParams()
      .set('pageNumber', request.pageNumber.toString())
      .set('pageSize', request.pageSize.toString());

    if (request.searchTerm) {
      params = params.set('searchTerm', request.searchTerm);
    }
    if (request.sortBy) {
      params = params.set('sortBy', request.sortBy);
    }

    return this.http.get<ApiResponseData<PaginatedResponse<User>>>(`${this.baseUrl}/paginated`, { params })
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Exporter les utilisateurs
   */
  exportUsers(fileType: 'csv' | 'xlsx'): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export/${fileType}`, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Rechercher des utilisateurs
   */
  searchUsers(searchTerm: string, role?: string, isActive?: boolean): Observable<User[]> {
    let params = new HttpParams().set('searchTerm', searchTerm);

    if (role) {
      params = params.set('role', role);
    }
    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }

    return this.http.get<User[]>(`${this.baseUrl}/search`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Récupérer les champs modifiables pour un utilisateur
   */
  getEditableFields(userId: string): Observable<UserEditableFields> {
    return this.http.get<ApiResponseData<UserEditableFields>>(`${this.baseUrl}/${userId}/editable-fields`)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Mettre à jour le profil d'un utilisateur
   */
  updateUserProfile(userId: string, updateRequest: UpdateProfileRequest): Observable<UserResponse> {
    const formData = this.createUpdateProfileFormData(updateRequest);

    return this.http.put<UserResponse>(`${this.baseUrl}/${userId}/profile`, formData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Vérifier si un utilisateur a une permission spécifique
   */
  hasPermission(userId: string, permissionCode: string): Observable<boolean> {
    return this.http.get<ApiResponseData<boolean>>(`${this.baseUrl}/${userId}/has-permission/${permissionCode}`)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Vérifier si un utilisateur a un rôle spécifique
   */
  hasRole(userId: string, roleCode: string): Observable<boolean> {
    return this.http.get<ApiResponseData<boolean>>(`${this.baseUrl}/${userId}/has-role/${roleCode}`)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Obtenir les statistiques utilisateurs
   */
  getUserStatistics(): Observable<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    usersByRole: { [role: string]: number };
    newUsersThisMonth: number;
  }> {
    return this.http.get<ApiResponseData<any>>(`${this.baseUrl}/statistics`)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  // ============ MÉTHODES UTILITAIRES ============

  /**
   * Créer FormData pour l'inscription
   */
  private createUserFormData(userRequest: UserRequest): FormData {
    const formData = new FormData();

    // Ajouter les champs de base
    formData.append('username', userRequest.username);
    formData.append('email', userRequest.email);
    formData.append('firstName', userRequest.firstName);
    formData.append('lastName', userRequest.lastName);
    formData.append('phone', userRequest.phone);
    formData.append('isActive', userRequest.isActive.toString());

    // Ajouter la photo si fournie
    if (userRequest.photoFile) {
      formData.append('photoFile', userRequest.photoFile);
    } else if (userRequest.photoUrl) {
      formData.append('photoUrl', userRequest.photoUrl);
    }

    // Ajouter le mot de passe
    if (userRequest.password) {
      formData.append('password', userRequest.password);
      formData.append('confirmPassword', userRequest.confirmPassword || '');
    }

    // Ajouter les rôles
    if (userRequest.roles && userRequest.roles.length > 0) {
      userRequest.roles.forEach((role, index) => {
        formData.append(`roles[${index}]`, role);
      });
    }

    return formData;
  }

  /**
   * Créer FormData pour la mise à jour du profil
   */
  private createUpdateProfileFormData(updateRequest: UpdateProfileRequest): FormData {
    const formData = new FormData();

    // Ajouter les champs de base
    if (updateRequest.firstName) formData.append('firstName', updateRequest.firstName);
    if (updateRequest.lastName) formData.append('lastName', updateRequest.lastName);
    if (updateRequest.phone) formData.append('phone', updateRequest.phone);
    if (updateRequest.photoUrl) formData.append('photoUrl', updateRequest.photoUrl);

    // Ajouter la photo si fournie
    if (updateRequest.photoFile) {
      formData.append('photoFile', updateRequest.photoFile);
    }

    // Ajouter les informations personnelles
    if (updateRequest.gender) formData.append('gender', updateRequest.gender);
    if (updateRequest.maritalStatus) formData.append('maritalStatus', updateRequest.maritalStatus);
    if (updateRequest.dateOfBirth) formData.append('dateOfBirth', updateRequest.dateOfBirth.toISOString());
    if (updateRequest.nationalId) formData.append('nationalId', updateRequest.nationalId);
    if (updateRequest.numberOfChildren !== undefined) {
      formData.append('numberOfChildren', updateRequest.numberOfChildren.toString());
    }

    // Ajouter l'adresse
    if (updateRequest.address) formData.append('address', updateRequest.address);
    if (updateRequest.city) formData.append('city', updateRequest.city);
    if (updateRequest.postalCode) formData.append('postalCode', updateRequest.postalCode);

    // Ajouter les contacts d'urgence
    if (updateRequest.emergencyContact) formData.append('emergencyContact', updateRequest.emergencyContact);
    if (updateRequest.emergencyPhone) formData.append('emergencyPhone', updateRequest.emergencyPhone);
    if (updateRequest.notes) formData.append('notes', updateRequest.notes);

    // Ajouter le mot de passe si nécessaire
    if (updateRequest.currentPassword) formData.append('currentPassword', updateRequest.currentPassword);
    if (updateRequest.newPassword) formData.append('newPassword', updateRequest.newPassword);
    if (updateRequest.confirmNewPassword) formData.append('confirmNewPassword', updateRequest.confirmNewPassword);

    return formData;
  }

  /**
   * Générer l'URL de la photo
   */
  getPhotoUrl(photoId: string): string {
    return `${this.baseUrl}/photo/${photoId}`;
  }

  /**
   * Télécharger un fichier
   */
  downloadFile(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Gestion centralisée des erreurs
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Une erreur est survenue lors de l\'opération sur les utilisateurs';

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
          errorMessage = 'Utilisateur non trouvé';
          break;
        case 409:
          errorMessage = 'Un utilisateur avec cet email existe déjà';
          break;
        case 422:
          errorMessage = error.error?.errors?.join(', ') || 'Validation des données échouée';
          break;
        case 500:
          errorMessage = 'Erreur serveur interne';
          break;
        default:
          errorMessage = `Erreur ${error.status}: ${error.message}`;
      }
    }

    console.error('UsersService error:', error);
    return throwError(() => new Error(errorMessage));
  }

  // ============ MÉTHODES UTILITAIRES POUR LE FRONT ============

  /**
   * Vérifier si l'utilisateur actuel peut éditer un champ spécifique
   */
  async canEditField(userId: string, fieldName: string): Promise<boolean> {
    try {
      const editableFields = await this.getEditableFields(userId).toPromise();
      if (!editableFields) return false;

      switch (fieldName) {
        case 'firstName':
        case 'lastName':
        case 'phone':
        case 'email':
          return editableFields.canEditPersonalInfo;
        case 'roles':
          return editableFields.canEditRoles;
        case 'permissions':
          return editableFields.canEditPermissions;
        case 'isActive':
          return editableFields.canEditStatus;
        case 'photoUrl':
          return editableFields.canEditPhoto;
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking editable fields:', error);
      return false;
    }
  }

  /**
   * Formater le nom complet de l'utilisateur
   */
  getFullName(user: User): string {
    return `${user.firstName} ${user.lastName}`.trim();
  }

  /**
   * Obtenir l'initiale de l'utilisateur pour les avatars
   */
  getInitials(user: User): string {
    const firstInitial = user.firstName?.charAt(0) || '';
    const lastInitial = user.lastName?.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase();
  }

  /**
   * Obtenir la couleur d'avatar basée sur l'ID de l'utilisateur
   */
  getAvatarColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0',
      '#118AB2', '#EF476F', '#7209B7', '#3A86FF'
    ];
    const hash = this.hashString(userId);
    return colors[hash % colors.length];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * Filtrer les utilisateurs par rôle
   */
  filterUsersByRole(users: User[], roleCode: string): User[] {
    return users.filter(user =>
      user.roles.some(role =>
        role.toLowerCase() === roleCode.toLowerCase()
      )
    );
  }

  /**
   * Trier les utilisateurs
   */
  sortUsers(users: User[], field: keyof User, direction: 'asc' | 'desc' = 'asc'): User[] {
    return [...users].sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return direction === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      return 0;
    });
  }

  /**
   * Rechercher des utilisateurs localement
   */
  searchUsersLocal(users: User[], searchTerm: string): User[] {
    if (!searchTerm) return users;

    const term = searchTerm.toLowerCase();
    return users.filter(user =>
      user.firstName?.toLowerCase().includes(term) ||
      user.lastName?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.phone?.toLowerCase().includes(term) ||
      user.username?.toLowerCase().includes(term) ||
      user.roles?.some(role => role.toLowerCase().includes(term))
    );
  }
}
