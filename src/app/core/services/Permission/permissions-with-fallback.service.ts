import { Injectable } from '@angular/core';
import { Token } from '../Token/token';

/**
 * Service de gestion des permissions
 * CORRECTION : Gère le cas où les permissions ne sont pas dans le token
 */
@Injectable({
  providedIn: 'root'
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

    // Extraire les rôles du token
    this.userRoles = this.extractRoles(payload);

    // Extraire les permissions du token
    this.userPermissions = this.extractPermissions(payload);

    // ⚠️ CORRECTION CRITIQUE : Si pas de permissions dans le token mais rôle présent
    // On accorde les permissions par défaut selon le rôle
    if (this.userPermissions.length === 0 && this.userRoles.length > 0) {
      console.warn('⚠️ Aucune permission dans le token, utilisation des permissions par rôle');
      this.userPermissions = this.getDefaultPermissionsByRole(this.userRoles);
    }
  }

  /**
   * Retourne les permissions par défaut selon le rôle
   * Cette méthode est utilisée si le backend n'envoie pas les permissions dans le token
   */
  private getDefaultPermissionsByRole(roles: string[]): string[] {
    const permissions: Set<string> = new Set();

    roles.forEach(role => {
      const normalizedRole = role.toUpperCase();

      // Super Admin - TOUTES les permissions
      if (normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'SUPER ADMINISTRATEUR') {
        permissions.add('Customer_Create');
        permissions.add('Customer_Read');
        permissions.add('Customer_Update');
        permissions.add('Customer_Delete');
        permissions.add('Customer_Validate');
        permissions.add('Customer_Block');
        permissions.add('Supplier_Create');
        permissions.add('Supplier_Read');
        permissions.add('Supplier_Update');
        permissions.add('Supplier_Delete');
        permissions.add('Vehicle_Create');
        permissions.add('Vehicle_Read');
        permissions.add('Vehicle_Update');
        permissions.add('Vehicle_Delete');
        permissions.add('Vehicle_Assign');
        permissions.add('Vehicle_Maintenance_Plan');
        permissions.add('Document_Upload');
        permissions.add('Document_Read');
        permissions.add('Document_Update');
        permissions.add('Document_Delete');
        permissions.add('Document_Validate');
        permissions.add('Document_Download');
        permissions.add('Contract_Create');
        permissions.add('Contract_Read');
        permissions.add('Contract_Update');
        permissions.add('Contract_Delete');
        permissions.add('Contract_Validate');
        permissions.add('Contract_Terminate');
        permissions.add('Contract_Renew');
        permissions.add('Contract_Export');
        permissions.add('Schedule_Read');
        permissions.add('Schedule_Manage');
        permissions.add('Payment_Generate');
        permissions.add('Account_Create');
        permissions.add('Account_Read');
        permissions.add('Account_Update');
        permissions.add('Account_Delete');
        permissions.add('Account_Reconcile');
        permissions.add('Payment_Record');
        permissions.add('Payment_Read');
        permissions.add('Payment_Update');
        permissions.add('Payment_Delete');
        permissions.add('Payment_Verify');
        permissions.add('Payment_Export');
        permissions.add('Expense_Create');
        permissions.add('Expense_Read');
        permissions.add('Expense_Update');
        permissions.add('Expense_Delete');
        permissions.add('Expense_Validate');
        permissions.add('Expense_Approve');
        permissions.add('Transfer_Create');
        permissions.add('Transfer_Read');
        permissions.add('Transfer_Approve');
        permissions.add('Transfer_Execute');
        permissions.add('Transfer_Cancel');
        permissions.add('Calculation_Run');
        permissions.add('Calculation_Read');
        permissions.add('Calculation_Export');
        permissions.add('ROI_Read');
        permissions.add('ROI_Calculate');
        permissions.add('ROI_Export');
        permissions.add('ROI_Compare');
        permissions.add('Dashboard_View');
        permissions.add('Dashboard_Customize');
        permissions.add('Dashboard_Export');
        permissions.add('Notification_Read');
        permissions.add('Notification_Send');
        permissions.add('Notification_Configure');
        permissions.add('Notification_Template_Manage');
        permissions.add('Audit_Read');
        permissions.add('Audit_Export');
        permissions.add('Audit_Configure');
        permissions.add('Report_Generate');
        permissions.add('Report_Read');
        permissions.add('Report_Export');
        permissions.add('Report_Schedule');
        permissions.add('Settings_Read');
        permissions.add('Settings_Update');
        permissions.add('Settings_Advanced');
        permissions.add('Integration_Configure');
        permissions.add('Integration_Test');
        permissions.add('Integration_Manage');
        permissions.add('User_Manage');
        permissions.add('Role_Manage');
        permissions.add('System_Admin');
      }
      // Manager
      else if (normalizedRole === 'MANAGER' || normalizedRole === 'RESPONSABLE LOGISTIKS') {
        permissions.add('Customer_Create');
        permissions.add('Customer_Read');
        permissions.add('Customer_Update');
        permissions.add('Customer_Validate');
        permissions.add('Customer_Block');
        permissions.add('Supplier_Create');
        permissions.add('Supplier_Read');
        permissions.add('Supplier_Update');
        permissions.add('Vehicle_Create');
        permissions.add('Vehicle_Read');
        permissions.add('Vehicle_Update');
        permissions.add('Vehicle_Assign');
        permissions.add('Vehicle_Maintenance_Plan');
        permissions.add('Document_Upload');
        permissions.add('Document_Read');
        permissions.add('Document_Update');
        permissions.add('Document_Validate');
        permissions.add('Document_Download');
        permissions.add('Contract_Create');
        permissions.add('Contract_Read');
        permissions.add('Contract_Update');
        permissions.add('Contract_Validate');
        permissions.add('Contract_Terminate');
        permissions.add('Contract_Renew');
        permissions.add('Contract_Export');
        permissions.add('Schedule_Read');
        permissions.add('Schedule_Manage');
        permissions.add('Account_Read');
        permissions.add('Account_Reconcile');
        permissions.add('Payment_Read');
        permissions.add('Payment_Verify');
        permissions.add('Payment_Export');
        permissions.add('Expense_Read');
        permissions.add('Expense_Validate');
        permissions.add('Expense_Approve');
        permissions.add('Transfer_Read');
        permissions.add('Transfer_Approve');
        permissions.add('Calculation_Read');
        permissions.add('Calculation_Export');
        permissions.add('ROI_Read');
        permissions.add('ROI_Calculate');
        permissions.add('ROI_Export');
        permissions.add('ROI_Compare');
        permissions.add('Dashboard_View');
        permissions.add('Dashboard_Customize');
        permissions.add('Dashboard_Export');
        permissions.add('Notification_Read');
        permissions.add('Notification_Send');
        permissions.add('Notification_Configure');
        permissions.add('Audit_Read');
        permissions.add('Audit_Export');
        permissions.add('Report_Generate');
        permissions.add('Report_Read');
        permissions.add('Report_Export');
        permissions.add('Report_Schedule');
        permissions.add('Settings_Read');
        permissions.add('Settings_Update');
        permissions.add('User_Manage');
      }
      // Finance
      else if (normalizedRole === 'FINANCE' || normalizedRole === 'RESPONSABLE FINANCES') {
        permissions.add('Customer_Read');
        permissions.add('Supplier_Read');
        permissions.add('Vehicle_Read');
        permissions.add('Document_Read');
        permissions.add('Document_Download');
        permissions.add('Contract_Read');
        permissions.add('Contract_Export');
        permissions.add('Schedule_Read');
        permissions.add('Account_Create');
        permissions.add('Account_Read');
        permissions.add('Account_Update');
        permissions.add('Account_Reconcile');
        permissions.add('Payment_Record');
        permissions.add('Payment_Read');
        permissions.add('Payment_Update');
        permissions.add('Payment_Verify');
        permissions.add('Payment_Export');
        permissions.add('Expense_Read');
        permissions.add('Expense_Validate');
        permissions.add('Expense_Approve');
        permissions.add('Transfer_Create');
        permissions.add('Transfer_Read');
        permissions.add('Transfer_Approve');
        permissions.add('Transfer_Execute');
        permissions.add('Calculation_Run');
        permissions.add('Calculation_Read');
        permissions.add('Calculation_Export');
        permissions.add('ROI_Read');
        permissions.add('ROI_Calculate');
        permissions.add('ROI_Export');
        permissions.add('ROI_Compare');
        permissions.add('Dashboard_View');
        permissions.add('Dashboard_Customize');
        permissions.add('Dashboard_Export');
        permissions.add('Notification_Read');
        permissions.add('Audit_Read');
        permissions.add('Audit_Export');
        permissions.add('Report_Generate');
        permissions.add('Report_Read');
        permissions.add('Report_Export');
        permissions.add('Report_Schedule');
        permissions.add('Settings_Read');
      }
      // Operations
      else if (normalizedRole === 'OPERATIONS' || normalizedRole === 'GESTIONNAIRE MOYENS GÉNÉRAUX') {
        permissions.add('Customer_Create');
        permissions.add('Customer_Read');
        permissions.add('Customer_Update');
        permissions.add('Supplier_Create');
        permissions.add('Supplier_Read');
        permissions.add('Supplier_Update');
        permissions.add('Vehicle_Create');
        permissions.add('Vehicle_Read');
        permissions.add('Vehicle_Update');
        permissions.add('Vehicle_Assign');
        permissions.add('Vehicle_Maintenance_Plan');
        permissions.add('Document_Upload');
        permissions.add('Document_Read');
        permissions.add('Document_Update');
        permissions.add('Document_Download');
        permissions.add('Contract_Create');
        permissions.add('Contract_Read');
        permissions.add('Contract_Update');
        permissions.add('Contract_Export');
        permissions.add('Schedule_Read');
        permissions.add('Schedule_Manage');
        permissions.add('Expense_Create');
        permissions.add('Expense_Read');
        permissions.add('Expense_Update');
        permissions.add('Dashboard_View');
        permissions.add('Notification_Read');
        permissions.add('Report_Read');
      }
      // Livreur
      else if (normalizedRole === 'DRIVER' || normalizedRole === 'LIVREUR') {
        permissions.add('Customer_Read');
        permissions.add('Vehicle_Read');
        permissions.add('Document_Read');
        //permissions.add('Document_Download');
        //permissions.add('Contract_Read');
        //permissions.add('Contract_Export');
        //permissions.add('Schedule_Read');
        //permissions.add('Payment_Read');
        //permissions.add('Expense_Read');
        //permissions.add('Dashboard_View');
        permissions.add('Notification_Read');
      }
      // Consultant
      else if (normalizedRole === 'READ_ONLY' || normalizedRole === 'CONSULTANT') {
        permissions.add('Customer_Read');
        permissions.add('Supplier_Read');
        permissions.add('Vehicle_Read');
        permissions.add('Document_Read');
        permissions.add('Document_Download');
        permissions.add('Contract_Read');
        permissions.add('Contract_Export');
        permissions.add('Schedule_Read');
        permissions.add('Account_Read');
        permissions.add('Payment_Read');
        permissions.add('Expense_Read');
        permissions.add('Transfer_Read');
        permissions.add('Calculation_Read');
        permissions.add('ROI_Read');
        permissions.add('Dashboard_View');
        permissions.add('Notification_Read');
        permissions.add('Audit_Read');
        permissions.add('Audit_Export');
        permissions.add('Report_Read');
        permissions.add('Report_Export');
        permissions.add('Settings_Read');
      }
    });

    return Array.from(permissions);
  }

  /**
   * Extrait les permissions du payload JWT
   */
  private extractPermissions(payload: any): string[] {
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

    return [...new Set(permissions)];
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

    return [...new Set(roles)];
  }

  // ============================================================================
  // TOUTES LES AUTRES MÉTHODES RESTENT IDENTIQUES
  // ============================================================================

  public reloadPermissions(): void {
    this.loadUserPermissions();
  }

  public hasPermission(permission: string): boolean {
    return this.userPermissions.includes(permission);
  }

  public hasAnyPermission(...permissions: string[]): boolean {
    return permissions.some(p => this.userPermissions.includes(p));
  }

  public hasAllPermissions(...permissions: string[]): boolean {
    return permissions.every(p => this.userPermissions.includes(p));
  }

  public hasRole(role: string): boolean {
    return this.userRoles.some(r =>
      r.toUpperCase() === role.toUpperCase() ||
      r === role
    );
  }

  public hasAnyRole(...roles: string[]): boolean {
    return roles.some(role => this.hasRole(role));
  }

  public isSuperAdmin(): boolean {
    return this.hasRole('SUPER_ADMIN') ||
      this.hasRole('SUPER ADMINISTRATEUR') ||
      this.hasRole('Super Administrateur');
  }

  public isManagerOrAbove(): boolean {
    return this.isSuperAdmin() ||
      this.hasRole('MANAGER') ||
      this.hasRole('RESPONSABLE LOGISTIKS');
  }

  public canViewTiers(): boolean {
    return this.hasAnyPermission(
      'Customer_Read',
      'Customer_Create',
      'Supplier_Read',
      'Supplier_Create'
    );
  }

  public canCreateTiers(): boolean {
    return this.hasAnyPermission(
      'Customer_Create',
      'Supplier_Create'
    );
  }

  public canViewVehicles(): boolean {
    return this.hasAnyPermission(
      'Vehicle_Read',
      'Vehicle_Create',
      'Vehicle_Update',
      'Vehicle_Assign'
    );
  }

  public canCreateVehicles(): boolean {
    return this.hasPermission('Vehicle_Create');
  }

  public canReadReport(): boolean {
    return this.hasAnyPermission(
      'Report_Read',
      'Report_Generate',
      'Report_Export',
      'Report_Schedule'
    );
  }

  public canScheduleReport(): boolean {
    return this.hasPermission('Report_Schedule');
  }

  public canGenerateReport(): boolean {
    return this.hasPermission('Report_Generate');
  }

  public canExportReport(): boolean {
    return this.hasAnyPermission('Report_Export', 'Report_Generate');
  }

  public canViewDocuments(): boolean {
    return this.hasAnyPermission(
      'Document_Read',
      'Document_Upload',
      'Document_Download'
    );
  }

  public canValidateDocuments(): boolean {
    return this.hasPermission('Document_Validate');
  }

  public canViewContracts(): boolean {
    return this.hasAnyPermission(
      'Contract_Read',
      'Contract_Create',
      'Contract_Update',
      'Contract_Validate'
    );
  }

  public canCreateContracts(): boolean {
    return this.hasPermission('Contract_Create');
  }

  public canViewPayments(): boolean {
    return this.hasAnyPermission(
      'Payment_Read',
      'Payment_Record',
      'Payment_Verify'
    );
  }

  public canRecordPayments(): boolean {
    return this.hasPermission('Payment_Record');
  }

  public canViewFinances(): boolean {
    return this.hasAnyPermission(
      'Payment_Read',
      'Expense_Read',
      'Account_Read',
      'ROI_Read',
      'Dashboard_View'
    );
  }

  public canViewTransactions(): boolean {
    return this.hasAnyPermission(
      'Payment_Read',
      'Expense_Read',
      'Transfer_Read'
    );
  }

  public canCreateTransactions(): boolean {
    return this.hasAnyPermission(
      'Payment_Record',
      'Expense_Create',
      'Transfer_Create'
    );
  }

  public canViewExpenses(): boolean {
    return this.hasAnyPermission(
      'Expense_Read',
      'Expense_Create',
      'Expense_Validate'
    );
  }

  public canViewROI(): boolean {
    return this.hasAnyPermission(
      'ROI_Read',
      'ROI_Calculate',
      'Calculation_Read'
    );
  }

  public canViewReports(): boolean {
    return this.hasAnyPermission(
      'Report_Read',
      'Report_Generate',
      'Report_Export'
    );
  }

  public canViewDashboard(): boolean {
    return this.hasPermission('Dashboard_View');
  }

  public canViewAnalytics(): boolean {
    return this.hasAnyPermission(
      'Dashboard_View',
      'ROI_Read',
      'Report_Generate',
      'Calculation_Read'
    );
  }

  public canViewAdministration(): boolean {
    return this.hasAnyPermission(
      'User_Manage',
      'Role_Manage',
      'Settings_Update',
      'System_Admin'
    );
  }

  public canManageUsers(): boolean {
    return this.hasPermission('User_Manage');
  }

  public canManageSettings(): boolean {
    return this.hasAnyPermission(
      'Settings_Update',
      'Settings_Advanced'
    );
  }

  public canViewAudit(): boolean {
    return this.hasAnyPermission(
      'Audit_Read',
      'Audit_Export'
    );
  }

  public getUserPermissions(): string[] {
    return [...this.userPermissions];
  }

  public getUserRoles(): string[] {
    return [...this.userRoles];
  }
}
