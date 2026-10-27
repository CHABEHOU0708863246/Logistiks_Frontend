import { Injectable } from '@angular/core';
import { Token } from '../Token/token';

@Injectable({
  providedIn: 'root',
})
export class Permissions {

  private userPermissions: string[] = [];
  private userRoles: string[] = [];
  private loadedToken: string | null = null;
  private loaded = false;

  constructor(private tokenService: Token) {
    this.loadUserPermissions();
  }

  /**
   * Charge les permissions depuis le token JWT. La revendication émise par le
   * backend est « Permission » (majuscule), sérialisée en tableau par le JWT.
   */
  private loadUserPermissions(): void {
    this.loaded = true;
    this.loadedToken = this.tokenService.getToken();

    const payload = this.tokenService.getPayload();

    if (!payload) {
      this.userPermissions = [];
      this.userRoles = [];
      return;
    }

    this.userPermissions = this.extractPermissions(payload);
    this.userRoles = this.extractRoles(payload);
  }

  /**
   * Recharge si le token a changé (login, refresh, changement d'onglet...).
   */
  private ensureLoaded(): void {
    const token = this.tokenService.getToken();
    if (!this.loaded || token !== this.loadedToken) {
      this.loadUserPermissions();
    }
  }

  /**
   * Extrait les permissions du payload JWT.
   */
  private extractPermissions(payload: any): string[] {
    const permissions: string[] = [];

    const claims = [
      payload.Permission,
      payload.permissions,
      payload.permission,
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/permissions'],
    ];

    for (const claim of claims) {
      if (Array.isArray(claim)) {
        permissions.push(...claim);
      } else if (typeof claim === 'string' && claim.length > 0) {
        permissions.push(claim);
      }
    }

    return [...new Set(permissions)];
  }

  /**
   * Extrait les rôles du payload JWT.
   */
  private extractRoles(payload: any): string[] {
    const roles: string[] = [];

    const claims = [
      payload.role,
      payload.roles,
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
    ];

    for (const claim of claims) {
      if (Array.isArray(claim)) {
        roles.push(...claim);
      } else if (typeof claim === 'string' && claim.length > 0) {
        roles.push(claim);
      }
    }

    return [...new Set(roles)];
  }

  /**
   * Recharge les permissions (après login/refresh explicite).
   */
  public reloadPermissions(): void {
    this.loadUserPermissions();
  }

  /**
   * Vérifie si l'utilisateur a UNE permission spécifique.
   * Le SUPER_ADMIN est autorisé comme côté backend (PermissionHandler).
   */
  public hasPermission(permission: string): boolean {
    this.ensureLoaded();
    return this.isSuperAdmin() || this.userPermissions.includes(permission);
  }

  /**
   * Vérifie si l'utilisateur a AU MOINS UNE des permissions.
   */
  public hasAnyPermission(...permissions: string[]): boolean {
    return permissions.some((permission) => this.hasPermission(permission));
  }

  /**
   * Vérifie si l'utilisateur a TOUTES les permissions.
   */
  public hasAllPermissions(...permissions: string[]): boolean {
    return permissions.every((permission) => this.hasPermission(permission));
  }

  /**
   * Vérifie si l'utilisateur a un rôle spécifique.
   */
  public hasRole(role: string): boolean {
    this.ensureLoaded();
    return this.userRoles.some(r =>
      r.toUpperCase() === role.toUpperCase() ||
      r === role
    );
  }

  /**
   * Vérifie si l'utilisateur a AU MOINS UN des rôles
   */
  public hasAnyRole(...roles: string[]): boolean {
    return roles.some(role => this.hasRole(role));
  }

  /**
   * Vérifie si l'utilisateur est Super Admin
   */
  public isSuperAdmin(): boolean {
    return this.hasRole('SUPER_ADMIN') ||
           this.hasRole('SUPER ADMINISTRATEUR') ||
           this.hasRole('Super Administrateur');
  }

  /**
   * Vérifie si l'utilisateur est Manager ou supérieur
   */
  public isManagerOrAbove(): boolean {
    return this.isSuperAdmin() ||
           this.hasRole('MANAGER') ||
           this.hasRole('RESPONSABLE LOGISTIKS');
  }

  /**
   * Vérifie si l'utilisateur peut voir le menu Tiers
   */
  public canViewTiers(): boolean {
    return this.hasAnyPermission(
      'Customer_Read',
      'Customer_Create',
      'Supplier_Read',
      'Supplier_Create'
    );
  }

  /**
   * Vérifie si l'utilisateur peut créer des tiers
   */
  public canCreateTiers(): boolean {
    return this.hasAnyPermission(
      'Customer_Create',
      'Supplier_Create'
    );
  }

  /**
   * Vérifie si l'utilisateur peut voir le menu Véhicules
   */
  public canViewVehicles(): boolean {
    return this.hasAnyPermission(
      'Vehicle_Read',
      'Vehicle_Create',
      'Vehicle_Update',
      'Vehicle_Assign'
    );
  }

  /**
   * Vérifie si l'utilisateur peut créer des véhicules
   */
  public canCreateVehicles(): boolean {
    return this.hasPermission('Vehicle_Create');
  }

  /**
   * Vérifie si l'utilisateur peut voir le menu Documents
   */
  public canViewDocuments(): boolean {
    return this.hasAnyPermission(
      'Document_Read',
      'Document_Upload',
      'Document_Download'
    );
  }

  /**
   * Vérifie si l'utilisateur peut valider des documents
   */
  public canValidateDocuments(): boolean {
    return this.hasPermission('Document_Validate');
  }

  /**
   * Vérifie si l'utilisateur peut voir le menu Contrats
   */
  public canViewContracts(): boolean {
    return this.hasAnyPermission(
      'Contract_Read',
      'Contract_Create',
      'Contract_Update',
      'Contract_Validate'
    );
  }

  /**
   * Vérifie si l'utilisateur peut créer des contrats
   */
  public canCreateContracts(): boolean {
    return this.hasPermission('Contract_Create');
  }

  /**
   * Vérifie si l'utilisateur peut voir le menu Paiements
   */
  public canViewPayments(): boolean {
    return this.hasAnyPermission(
      'Payment_Read',
      'Payment_Record',
      'Payment_Verify'
    );
  }

  /**
   * Vérifie si l'utilisateur peut enregistrer des paiements
   */
  public canRecordPayments(): boolean {
    return this.hasPermission('Payment_Record');
  }

  /**
   * Vérifie si l'utilisateur peut voir le menu Finances
   */
  public canViewFinances(): boolean {
    return this.hasAnyPermission(
      'Payment_Read',
      'Expense_Read',
      'Account_Read',
      'ROI_Read',
      'Dashboard_View'
    );
  }

  /**
   * Vérifie si l'utilisateur peut voir les transactions
   */
  public canViewTransactions(): boolean {
    return this.hasAnyPermission(
      'Payment_Read',
      'Expense_Read',
      'Transfer_Read'
    );
  }

  /**
   * Vérifie si l'utilisateur peut créer des transactions
   */
  public canCreateTransactions(): boolean {
    return this.hasAnyPermission(
      'Payment_Record',
      'Expense_Create',
      'Transfer_Create'
    );
  }

  /**
   * Vérifie si l'utilisateur peut voir les charges/dépenses
   */
  public canViewExpenses(): boolean {
    return this.hasAnyPermission(
      'Expense_Read',
      'Expense_Create',
      'Expense_Validate'
    );
  }

  /**
   * Vérifie si l'utilisateur peut voir la rentabilité/ROI
   */
  public canViewROI(): boolean {
    return this.hasAnyPermission(
      'ROI_Read',
      'ROI_Calculate',
      'Calculation_Read'
    );
  }

  /**
   * Vérifie si l'utilisateur peut voir les rapports
   */
  public canViewReports(): boolean {
    return this.hasAnyPermission(
      'Report_Generate',
      'Report_Read',
      'Report_Export',
      'Report_Schedule'
    );
  }

  public canReadReport(): boolean {
  return this.hasAnyPermission(
    'Report_Read',
    'Report_Generate',
    'Report_Export',
    'Report_Schedule'
  );
}

  /**
   * Vérifie si l'utilisateur peut voir le tableau de bord
   */
  public canViewDashboard(): boolean {
    return this.hasPermission('Dashboard_View');
  }

  /**
   * Vérifie si l'utilisateur peut voir les analytics
   */
  public canViewAnalytics(): boolean {
    return this.hasAnyPermission(
      'Dashboard_View',
      'ROI_Read',
      'Report_Generate',
      'Calculation_Read'
    );
  }

  /**
   * Vérifie si l'utilisateur peut voir le menu Administration
   */
  public canViewAdministration(): boolean {
    return this.hasAnyPermission(
      'User_Manage',
      'Role_Manage',
      'Settings_Read',
      'Settings_Update',
      'System_Admin'
    );
  }

  /**
   * Vérifie si l'utilisateur peut gérer les utilisateurs
   */
  public canManageUsers(): boolean {
    return this.hasPermission('User_Manage');
  }

  /**
   * Vérifie si l'utilisateur peut voir le module Utilisateurs.
   */
  public canViewUsers(): boolean {
    return this.hasAnyPermission('User_Manage', 'Role_Manage', 'System_Admin');
  }

  /**
   * Vérifie si l'utilisateur peut voir le module Paramètres.
   */
  public canViewSettings(): boolean {
    return this.hasAnyPermission('Settings_Read', 'Settings_Update', 'Settings_Advanced');
  }

  /**
   * Vérifie si l'utilisateur peut gérer les paramètres
   */
  public canManageSettings(): boolean {
    return this.hasAnyPermission(
      'Settings_Update',
      'Settings_Advanced'
    );
  }

  /**
   * Vérifie si l'utilisateur peut voir l'audit
   */
  public canViewAudit(): boolean {
    return this.hasAnyPermission(
      'Audit_Read',
      'Audit_Export'
    );
  }

  /**
   * Obtient toutes les permissions de l'utilisateur
   */
  public getUserPermissions(): string[] {
    this.ensureLoaded();
    return [...this.userPermissions];
  }

  /**
   * Obtient tous les rôles de l'utilisateur
   */
  public getUserRoles(): string[] {
    this.ensureLoaded();
    return [...this.userRoles];
  }

  public canGenerateReport(): boolean {
    return this.hasPermission('Report_Generate');
  }

  public canExportReport(): boolean {
    return this.hasAnyPermission('Report_Export', 'Report_Generate');
  }

  public canScheduleReport(): boolean {
    return this.hasPermission('Report_Schedule');
  }
}
