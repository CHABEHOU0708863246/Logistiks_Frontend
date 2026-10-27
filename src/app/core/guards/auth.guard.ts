import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { Token } from '../services/Token/token';
import { TokenRefreshService } from '../services/Token/token-refresh.service';

type SessionResolution = boolean | UrlTree | Observable<boolean | UrlTree>;

const loginUrlTree = (router: Router, expired: boolean): UrlTree =>
  expired
    ? router.createUrlTree(['/auth/login'], { queryParams: { sessionExpired: '1' } })
    : router.createUrlTree(['/auth/login']);

/**
 * Résout la session avant d'activer une route :
 * - token valide : accès immédiat ;
 * - token expiré + refresh token : rafraîchissement transparent ;
 * - sinon : retour au login, avec message si une session existait.
 */
const resolveSession = (): SessionResolution => {
  const tokenService = inject(Token);
  const router = inject(Router);
  const tokenRefreshService = inject(TokenRefreshService);

  if (tokenService.hasValidAccessToken()) {
    return true;
  }

  const hasAccessToken = !!tokenService.getToken();
  const hasRefreshToken = tokenService.hasRefreshToken();

  if (hasAccessToken && hasRefreshToken) {
    return tokenRefreshService.refresh().pipe(
      map(() => true),
      catchError(() => {
        tokenService.clearSession();
        return of(loginUrlTree(router, true));
      })
    );
  }

  tokenService.clearSession();
  return loginUrlTree(router, hasAccessToken || hasRefreshToken);
};

/**
 * `authGuard` : protège les routes authentifiées et restaure la session au besoin.
 */
export const authGuard: CanActivateFn = (): SessionResolution => resolveSession();

/**
 * Guard pour vérifier uniquement l'authentification (sans vérification de rôle).
 */
export const simpleAuthGuard: CanActivateFn = (): SessionResolution => resolveSession();

/**
 * Guard pour la page de login : empêche l'accès si une session est déjà disponible.
 */
export const loginGuard: CanActivateFn = () => {
  const tokenService = inject(Token);
  const router = inject(Router);

  if (tokenService.hasValidAccessToken()) {
    return router.parseUrl('/dashboard');
  }

  if (tokenService.getToken() && tokenService.hasRefreshToken()) {
    return router.parseUrl('/dashboard');
  }

  tokenService.clearSession();
  return true;
};
