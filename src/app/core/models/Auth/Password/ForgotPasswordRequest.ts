/**
 * Modèle pour la demande initiale de réinitialisation (Envoi de l'email)
 */
export interface ForgotPasswordRequest {
  email: string;
  redirectPath: string;
}
