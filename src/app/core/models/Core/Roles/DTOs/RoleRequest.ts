/**
 * Requête pour créer ou modifier un rôle
 */
export interface RoleRequest {
  code: string;
  roleName: string;
  permissions: string[];
  isVisible: boolean;
  description?: string;
}
