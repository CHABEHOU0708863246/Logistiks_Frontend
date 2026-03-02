import { Injectable } from '@angular/core';
import { Token } from '../Token/token';

@Injectable({
  providedIn: 'root',
})
export class Permissions {

  private userPermissions: string[] = [];
  private userRoles: string[] = [];

  constructor(private tokenService: Token) {
    this.loadUserPermissions();
  }

  /**
   * Charge les permissions depuis le token JWT
   */
  private loadUserPermissions(): void {
    const payload = this.tokenService.getPayload();

    if (!payload) {
      this.userPermissions = [];
      this.userRoles = [];
      return;
    }

    // Extraire les permissions du token
    // Le backend peut envoyer les permissions dans différents claims
    this.userPermissions = this.extractPermissions(payload);
    this.userRoles = this.extractRoles(payload);
  }

  /**
   * Extrait les permissions du payload JWT
   */
  private extractPermissions(payload: any): string[] {
    // Vérifier différents emplacements possibles des permissions
    const permissions: string[] = [];

    // 1. Permissions directes
    if (payload.permissions && Array.isArray(payload.permissions)) {
      permissions.push(...payload.permissions);
    }

    // 2. Claims de permissions
    if (payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/permissions']) {
      const permClaims = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/permissions'];
      if (Array.isArray(permClaims)) {
        permissions.push(...permClaims);
      } else if (typeof permClaims === 'string') {
        permissions.push(permClaims);
      }
    }

    // 3. Permission claim (singulier)
    if (payload.permission) {
      if (Array.isArray(payload.permission)) {
        permissions.push(...payload.permission);
      } else if (typeof payload.permission === 'string') {
        permissions.push(payload.permission);
      }
    }

    return [...new Set(permissions)]; // Dédupliquer
  }

  /**
   * Extrait les rôles du payload JWT
   */
  private extractRoles(payload: any): string[] {
    const roles: string[] = [];

    // 1. Role direct
    if (payload.role) {
      if (Array.isArray(payload.role)) {
        roles.push(...payload.role);
      } else if (typeof payload.role === 'string') {
        roles.push(payload.role);
      }
    }

    // 2. Claims de rôle
    if (payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']) {
      const roleClaims = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      if (Array.isArray(roleClaims)) {
        roles.push(...roleClaims);
      } else if (typeof roleClaims === 'string') {
        roles.push(roleClaims);
      }
    }

    return [...new Set(roles)]; // Dédupliquer
  }

  /**
   * Recharge les permissions (après login par exemple)
   */
  public reloadPermissions(): void {
    this.loadUserPermissions();
  }

  /**
   * Vérifie si l'utilisateur a UNE permission spécifique
   */
  public hasPermission(permission: string): boolean {
    return this.userPermissions.includes(permission);
  }

  /**
   * Vérifie si l'utilisateur a AU MOINS UNE des permissions
   */
  public hasAnyPermission(...permissions: string[]): boolean {
    return permissions.some(p => this.userPermissions.includes(p));
  }

  /**
   * Vérifie si l'utilisateur a TOUTES les permissions
   */
  public hasAllPermissions(...permissions: string[]): boolean {
    return permissions.every(p => this.userPermissions.includes(p));
  }

  /**
   * Vérifie si l'utilisateur a un rôle spécifique
   */
  public hasRole(role: string): boolean {
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
    return [...this.userPermissions];
  }

  /**
   * Obtient tous les rôles de l'utilisateur
   */
  public getUserRoles(): string[] {
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
