/**
 * Modèle pour la requête de connexion
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}
