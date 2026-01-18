/**
 * Interface de base pour un Rôle (Entité)
 */
export interface Role {
  id: string;
  code: string;
  roleName: string;
  normalizedName: string;
  description?: string;
  permissions: string[];
  isVisible: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt?: Date;
  createdBy: string;
  createdByName: string;
  updatedBy?: string;
  updatedByName?: string;
}
