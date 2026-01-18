/**
 * DTO pour l'affichage des rôles dans les listes
 */
export interface RoleDto {
  id: string;
  code: string;
  name: string;
  roleName: string;
  normalizedName: string;
  description?: string;
  permissions: string[];
  isVisible: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt?: Date;
  createdByName: string;
  updatedByName?: string;
  permissionCount: number;
}
