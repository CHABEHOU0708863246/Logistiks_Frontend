import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Token } from '../Token/token';

@Injectable({
  providedIn: 'root',
})
export class Permission {

  private permissionsSubject = new BehaviorSubject<string[]>([]);
  public permissions$ = this.permissionsSubject.asObservable();

  private rolesSubject = new BehaviorSubject<string[]>([]);
  public roles$ = this.rolesSubject.asObservable();

  constructor(private tokenService: Token) {
    this.loadPermissionsFromToken();
  }

  /**
   * Charge les permissions depuis le token JWT
   */
  loadPermissionsFromToken(): void {
    const token = this.tokenService.getToken();

    if (!token) {
      this.permissionsSubject.next([]);
      this.rolesSubject.next([]);
      return;
    }

    try {
      const decodedToken = this.tokenService.decodeToken(token);

      // Récupérer les permissions
      const permissions = this.extractPermissions(decodedToken);
      this.permissionsSubject.next(permissions);

      // Récupérer les rôles
      const roles = this.extractRoles(decodedToken);
      this.rolesSubject.next(roles);

      console.log('📋 Permissions chargées:', permissions.length);
      console.log('👥 Rôles chargés:', roles);

    } catch (error) {
      console.error('❌ Erreur décodage token:', error);
      this.permissionsSubject.next([]);
      this.rolesSubject.next([]);
    }
  }

  /**
   * Extrait les permissions du token décodé
   */
  private extractPermissions(decodedToken: any): string[] {
    // Les permissions sont stockées dans la claim "Permission"
    const permissionClaim = decodedToken['Permission'];

    if (!permissionClaim) return [];

    // Si c'est un tableau
    if (Array.isArray(permissionClaim)) {
      return permissionClaim;
    }

    // Si c'est une seule valeur
    return [permissionClaim];
  }

  /**
   * Extrait les rôles du token décodé
   */
  private extractRoles(decodedToken: any): string[] {
    // Les rôles sont stockés dans la claim standard "role"
    const roleClaim = decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
                   || decodedToken['role'];

    if (!roleClaim) return [];

    if (Array.isArray(roleClaim)) {
      return roleClaim;
    }

    return [roleClaim];
  }

  /**
   * Vérifie si l'utilisateur a une permission spécifique
   */
  hasPermission(permission: string): boolean {
    const permissions = this.permissionsSubject.value;
    const roles = this.rolesSubject.value;

    // SUPER_ADMIN a toutes les permissions
    if (roles.includes('SUPER_ADMIN')) {
      return true;
    }

    return permissions.includes(permission);
  }

  /**
   * Vérifie si l'utilisateur a au moins une des permissions
   */
  hasAnyPermission(permissions: string[]): boolean {
    const userPermissions = this.permissionsSubject.value;
    const roles = this.rolesSubject.value;

    if (roles.includes('SUPER_ADMIN')) {
      return true;
    }

    return permissions.some(p => userPermissions.includes(p));
  }

  /**
   * Vérifie si l'utilisateur a toutes les permissions
   */
  hasAllPermissions(permissions: string[]): boolean {
    const userPermissions = this.permissionsSubject.value;
    const roles = this.rolesSubject.value;

    if (roles.includes('SUPER_ADMIN')) {
      return true;
    }

    return permissions.every(p => userPermissions.includes(p));
  }

  /**
   * Vérifie si l'utilisateur a un rôle spécifique
   */
  hasRole(role: string): boolean {
    const roles = this.rolesSubject.value;
    return roles.includes(role);
  }

  /**
   * Vérifie si l'utilisateur a au moins un des rôles
   */
  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.rolesSubject.value;
    return roles.some(r => userRoles.includes(r));
  }

  /**
   * Récupère toutes les permissions
   */
  getAllPermissions(): string[] {
    return this.permissionsSubject.value;
  }

  /**
   * Récupère tous les rôles
   */
  getAllRoles(): string[] {
    return this.rolesSubject.value;
  }

  /**
   * Vérifie si l'utilisateur est SUPER_ADMIN
   */
  isSuperAdmin(): boolean {
    return this.hasRole('SUPER_ADMIN');
  }

  /**
   * Vérifie si l'utilisateur est Manager
   */
  isManager(): boolean {
    return this.hasRole('MANAGER');
  }

  /**
   * Nettoie les permissions
   */
  clearPermissions(): void {
    this.permissionsSubject.next([]);
    this.rolesSubject.next([]);
  }
}
