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
  private readonly LEGACY_TOKEN_KEY = 'token';

  private sessionExpiryHandled = false;

  constructor(private router: Router) {
    this.preventBackNavigationAfterLogout();
  }

  /**
   * Récupère l'ID utilisateur depuis le token.
   */
  getUserId(): string | null {
    const payload = this.getPayload();

    if (!payload) {
      console.warn('getUserId: Aucun payload disponible');
      return null;
    }

    const userId =
      payload.userId ||
      payload.id ||
      (payload as any)['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];

    if (!userId) {
      console.error('User ID introuvable dans le token');
      return null;
    }

    return userId;
  }

  /**
   * Sauvegarde une session complète en respectant « Se souvenir de moi ».
   * - rememberMe = true  -> localStorage (session conservée après fermeture)
   * - rememberMe = false -> sessionStorage (session limitée à l'onglet/PWA)
   */
  saveSession(
    token: string,
    refreshToken: string | null | undefined,
    rememberMe: boolean,
    role?: string | string[] | null
  ): void {
    const target = rememberMe ? this.storage('local') : this.storage('session');

    this.clearSession();

    if (!target) {
      return;
    }

    const data: TokenData = {
      token,
      role: this.normalizeRole(role) ?? this.extractRoleFromToken(token) ?? undefined,
      rememberMe,
    };

    target.setItem(this.STORAGE_KEY, JSON.stringify(data));

    if (refreshToken) {
      target.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }

    target.setItem(this.REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
    this.sessionExpiryHandled = false;
  }

  /**
   * Compatibilité avec l'ancien appel : le stockage suit « Se souvenir de moi ».
   */
  saveToken(
    token: string,
    role: string,
    refreshToken?: string,
    rememberMe: boolean = this.getRememberMe()
  ): void {
    this.saveSession(token, refreshToken ?? this.getRefreshToken(), rememberMe, role);
  }

  /**
   * Met à jour les jetons après un rafraîchissement, sans changer de stockage.
   */
  updateTokens(token: string, refreshToken: string | null | undefined): void {
    const rememberMe = this.getRememberMe();
    const role = this.getUserRole() ?? this.extractRoleFromToken(token);
    this.saveSession(token, refreshToken, rememberMe, role);
  }

  /**
   * Récupère le token brut pour les intercepteurs HTTP.
   */
  getToken(): string | null {
    for (const storage of this.storages()) {
      const data = this.readAuthData(storage);
      if (data?.token) {
        return data.token;
      }
    }

    for (const storage of this.storages()) {
      const legacyToken = storage.getItem(this.LEGACY_TOKEN_KEY);
      if (legacyToken) {
        console.warn('Utilisation du token legacy');
        return legacyToken;
      }
    }

    return null;
  }

  /**
   * Récupère le refresh token.
   */
  getRefreshToken(): string | null {
    for (const storage of this.storages()) {
      const refreshToken = storage.getItem(this.REFRESH_TOKEN_KEY);
      if (refreshToken) {
        return refreshToken;
      }
    }

    return null;
  }

  /**
   * Indique si la session doit survivre à la fermeture du navigateur/PWA.
   */
  getRememberMe(): boolean {
    for (const storage of this.storages()) {
      if (storage.getItem(this.REMEMBER_ME_KEY) === 'true') {
        return true;
      }

      const data = this.readAuthData(storage);
      if (data?.rememberMe === true) {
        return true;
      }
    }

    return false;
  }

  /**
   * Récupère le rôle stocké (ou celui du token).
   */
  getUserRole(): string | null {
    for (const storage of this.storages()) {
      const data = this.readAuthData(storage);
      if (data?.role) {
        return data.role;
      }
    }

    return this.extractRoleFromToken(this.getToken());
  }

  /**
   * Vérifie si le token d'accès est encore valide.
   */
  isLogged(): boolean {
    return this.hasValidAccessToken();
  }

  /**
   * Vérifie si un token d'accès valide existe.
   */
  hasValidAccessToken(): boolean {
    return !!this.getToken() && !this.isTokenExpired();
  }

  /**
   * Vérifie si un refresh token est disponible.
   */
  hasRefreshToken(): boolean {
    return !!this.getRefreshToken();
  }

  /**
   * Vérifie si une session peut être restaurée ou rafraîchie.
   */
  hasSession(): boolean {
    return !!this.getToken() && (this.hasValidAccessToken() || this.hasRefreshToken());
  }

  /**
   * Décode le token JWT (méthode manuelle, conservée pour compatibilité).
   */
  decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Erreur décodage token:', error);
      return null;
    }
  }

  /**
   * Décode le payload avec jwtDecode.
   */
  getPayload(): LogistiksJwtPayload | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      return jwtDecode<LogistiksJwtPayload>(token);
    } catch (error) {
      console.error('Erreur décodage token:', error);
      return null;
    }
  }

  /**
   * Vérifie si le token est expiré (marge optionnelle en secondes).
   */
  isTokenExpired(offsetSeconds: number = 0): boolean {
    const payload = this.getPayload();
    if (!payload || !payload.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime + offsetSeconds;
  }

  /**
   * Déconnexion locale complète.
   */
  logout(): void {
    this.clearSession();
    this.sessionExpiryHandled = false;

    this.blockBackNavigation();

    this.router.navigate(['/auth/login'], {
      replaceUrl: true,
    });
  }

  /**
   * Gère une session devenue invalide : nettoyage + retour au login avec message.
   * Idempotent : plusieurs 401 simultanés ne déclenchent qu'une seule redirection.
   */
  handleTokenExpired(): void {
    if (this.sessionExpiryHandled) {
      return;
    }

    const currentUrl = this.router.url || '';
    const isOnAuthScreen = currentUrl.startsWith('/auth/');

    this.sessionExpiryHandled = true;
    this.clearSession();

    if (isOnAuthScreen) {
      return;
    }

    this.router.navigate(['/auth/login'], {
      queryParams: { sessionExpired: '1' },
      replaceUrl: true,
    });
  }

  /**
   * Supprime toutes les données d'authentification des deux stockages.
   */
  clearSession(): void {
    for (const storage of this.storages()) {
      storage.removeItem(this.STORAGE_KEY);
      storage.removeItem(this.REFRESH_TOKEN_KEY);
      storage.removeItem(this.REMEMBER_ME_KEY);
      storage.removeItem(this.LEGACY_TOKEN_KEY);
    }
  }

  /**
   * Empêche la navigation arrière après déconnexion.
   */
  private blockBackNavigation(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.history.pushState(null, '', window.location.href);

    window.onpopstate = () => {
      if (!this.hasSession()) {
        window.history.pushState(null, '', window.location.href);
        this.router.navigate(['/auth/login'], { replaceUrl: true });
      }
    };
  }

  /**
   * Protection globale contre le retour arrière sans session.
   */
  private preventBackNavigationAfterLogout(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('popstate', (event) => {
      if (!this.hasSession()) {
        const currentPath = window.location.pathname;

        if (!currentPath.includes('/auth/')) {
          console.warn('Tentative retour arrière sans session');
          event.preventDefault();
          this.router.navigate(['/auth/login'], { replaceUrl: true });
        }
      }
    });
  }

  /**
   * Vérifie si le token expire bientôt (5 minutes).
   */
  isTokenExpiringSoon(): boolean {
    const payload = this.getPayload();
    if (!payload || !payload.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const fiveMinutes = 5 * 60;

    return payload.exp - currentTime < fiveMinutes;
  }

  /**
   * Temps restant avant expiration (secondes).
   */
  getTimeUntilExpiration(): number {
    const payload = this.getPayload();
    if (!payload || !payload.exp) {
      return 0;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return Math.max(0, payload.exp - currentTime);
  }

  /**
   * Validation synchrone d'un token d'accès valide (le refresh est géré par les guards/intercepteurs).
   */
  validateToken(): boolean {
    return this.hasValidAccessToken();
  }

  /**
   * DEBUG : ne journalise jamais le contenu du token.
   */
  debugToken(): void {
    const token = this.getToken();
    if (!token) {
      return;
    }

    const payload = this.getPayload();
    if (!payload) {
      return;
    }
  }

  private extractRoleFromToken(token: string | null): string | null {
    if (!token) {
      return null;
    }

    try {
      const payload = jwtDecode<LogistiksJwtPayload>(token);
      const role =
        payload.role ||
        payload.roles ||
        (payload as any)['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

      if (Array.isArray(role)) {
        return role.length > 0 ? role[0] : null;
      }

      return role ?? null;
    } catch {
      return null;
    }
  }

  private normalizeRole(role?: string | string[] | null): string | null {
    if (Array.isArray(role)) {
      return role.length > 0 ? role[0] : null;
    }

    return role ?? null;
  }

  private readAuthData(storage: Storage): TokenData | null {
    const raw = storage.getItem(this.STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as TokenData;
    } catch (error) {
      console.error('Erreur parsing authData:', error);
      return null;
    }
  }

  private storage(kind: 'local' | 'session'): Storage | null {
    try {
      if (typeof window === 'undefined') {
        return null;
      }

      return kind === 'local' ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  }

  private storages(): Storage[] {
    return [this.storage('local'), this.storage('session')].filter(
      (storage): storage is Storage => storage !== null
    );
  }
}
