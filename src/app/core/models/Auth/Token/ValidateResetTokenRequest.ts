/**
 * Modèle pour valider la validité d'un jeton de réinitialisation avant d'afficher le formulaire
 */
export interface ValidateResetTokenRequest {
  email: string;
  token: string;
}
