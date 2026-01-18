import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { LogistiksJwtPayload } from '../../models/Auth/Token/LogistiksJwtPayload';
import { TokenData } from '../../models/Auth/Token/TokenData';

@Injectable({
  providedIn: 'root',
})
export class Token {
  private readonly STORAGE_KEY = 'logistiks_auth_data';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly REMEMBER_ME_KEY = 'remember_me';

  constructor(private router: Router) {
    this.preventBackNavigationAfterLogout();
  }

  /**
   * Sauvegarde les données d'authentification
   */
  saveToken(token: string, role: string, refreshToken?: string): void {
    const data: TokenData = { token, role };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));

    if (refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  /**
   * Récupère le token brut pour les intercepteurs HTTP
   */
  getToken(): string | null {
    // 1️⃣ Vérifier d'abord dans logistiks_auth_data
    const authData = localStorage.getItem(this.STORAGE_KEY);
    if (authData) {
      try {
        const parsedData: TokenData = JSON.parse(authData);
        if (parsedData.token) {
          return parsedData.token;
        }
      } catch (error) {
        console.error('❌ Erreur parsing authData:', error);
      }
    }

    // 2️⃣ Fallback sur l'ancien système 'token' si présent
    const legacyToken = localStorage.getItem('token');
    if (legacyToken) {
      return legacyToken;
    }
    return null;
  }

  /**
   * Récupère le refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Récupère le rôle stocké
   */
  getUserRole(): string | null {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return null;

    try {
      const parsedData: TokenData = JSON.parse(data);
      return parsedData.role;
    } catch {
      return null;
    }
  }

  /**
   * Vérifie si l'utilisateur est connecté
   */
  isLogged(): boolean {
    const token = this.getToken();
    const isValid = !!token && !this.isTokenExpired();
    return isValid;
  }

  /**
   * Décodage sécurisé du Payload
   */
  getPayload(): LogistiksJwtPayload | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = jwtDecode<LogistiksJwtPayload>(token);
      return payload;
    } catch (error) {
      console.error('❌ Erreur décodage token:', error);
      return null;
    }
  }

  /**
   * Vérifie si le token est expiré
   */
  isTokenExpired(): boolean {
    const payload = this.getPayload();
    if (!payload || !payload.exp) {
      console.warn('⚠️ Payload invalide ou pas d\'expiration');
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp < currentTime;

    if (isExpired) {
      console.warn('⚠️ Token expiré:', {
        exp: new Date(payload.exp * 1000),
        now: new Date(currentTime * 1000)
      });
    }

    return isExpired;
  }

  /**
   * Déconnexion complète
   */
  logout(): void {
    // Supprimer toutes les clés liées à l'auth
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.REMEMBER_ME_KEY);
    localStorage.removeItem('token'); // Legacy
    sessionStorage.clear();

    this.blockBackNavigation();

    this.router.navigate(['/auth/login'], {
      replaceUrl: true
    });
  }

  /**
   * Gère l'expiration automatique du token
   */
  handleTokenExpired(): void {
    console.warn('⚠️ Token expiré - Déconnexion automatique');

    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem('token');
    sessionStorage.clear();

    this.router.navigate(['/auth/login'], {
      queryParams: { expired: true },
      replaceUrl: true
    });
  }

  /**
   * Empêche la navigation arrière après déconnexion
   */
  private blockBackNavigation(): void {
    window.history.pushState(null, '', window.location.href);

    window.onpopstate = () => {
      if (!this.isLogged()) {
        window.history.pushState(null, '', window.location.href);
        this.router.navigate(['/auth/login'], { replaceUrl: true });
      }
    };
  }

  /**
   * Protection globale contre le retour arrière
   */
  private preventBackNavigationAfterLogout(): void {
    window.addEventListener('popstate', (event) => {
      if (!this.isLogged()) {
        const currentPath = window.location.pathname;

        if (!currentPath.includes('/auth/')) {
          console.warn('⚠️ Tentative retour arrière sans auth');
          event.preventDefault();
          this.router.navigate(['/auth/login'], { replaceUrl: true });
        }
      }
    });
  }

  /**
   * Vérifier si le token expire bientôt
   */
  isTokenExpiringSoon(): boolean {
    const payload = this.getPayload();
    if (!payload || !payload.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    const fiveMinutes = 5 * 60;

    return (payload.exp - currentTime) < fiveMinutes;
  }

  /**
   * Obtenir le temps restant avant expiration
   */
  getTimeUntilExpiration(): number {
    const payload = this.getPayload();
    if (!payload || !payload.exp) return 0;

    const currentTime = Math.floor(Date.now() / 1000);
    return Math.max(0, payload.exp - currentTime);
  }

  /**
   * Valider le token avant une requête importante
   */
  validateToken(): boolean {
    if (!this.isLogged()) {
      console.warn('⚠️ Token invalide ou expiré');
      this.handleTokenExpired();
      return false;
    }
    return true;
  }
}
