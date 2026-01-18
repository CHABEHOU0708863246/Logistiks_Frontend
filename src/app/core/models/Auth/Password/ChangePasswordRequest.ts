/**
 * Modèle pour changer le mot de passe (Utilisateur connecté)
 */
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}
