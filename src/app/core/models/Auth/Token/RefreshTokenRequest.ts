/**
 * Modèle pour demander un nouveau Access Token via un Refresh Token
 */
export interface RefreshTokenRequest {
  token: string;
  refreshToken: string;
}
