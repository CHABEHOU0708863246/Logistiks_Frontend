/**
 * Modèle pour la finalisation de la réinitialisation (Nouveau mot de passe)
 */
export interface ResetPasswordRequest {
  email: string;
  token: string;
  password: string;
}
