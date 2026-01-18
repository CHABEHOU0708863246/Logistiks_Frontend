import { Role } from "../Entities/Role";

/**
 * Réponse standard pour les opérations sur les rôles
 */
export interface RoleResponse {
  succeeded: boolean;
  messages: string[];
  errors: string[];
  role?: Role;
  auditInfo?: any; // Remplacez par votre interface AuditInfo si nécessaire
}
