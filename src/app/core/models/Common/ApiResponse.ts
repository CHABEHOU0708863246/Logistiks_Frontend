/**
 * Réponse métier simple renvoyée par les endpoints d'authentification
 * (`{ success, message }`).
 */
export interface ApiResponse {
  success: boolean;
  message: string;
}
