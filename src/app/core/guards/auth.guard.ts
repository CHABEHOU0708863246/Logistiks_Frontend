import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { Auth } from "../services/Auth/auth";
import { Token } from "../services/Token/token";

/**
 * `authGuard` : Fonction de garde pour protéger les routes en fonction de l'authentification et des rôles.
 *
 * Cette garde vérifie si l'utilisateur est authentifié, si son token n'est pas expiré,
 * et s'il possède les rôles requis pour accéder à une route spécifique.
 *
 * @param route - Informations sur la route à laquelle l'utilisateur tente d'accéder.
 * @param state - L'état de navigation actuel (non utilisé ici mais disponible).
 * @returns `true` si l'utilisateur est autorisé, sinon une URL pour rediriger l'utilisateur.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const tokenService = inject(Token);
  const router = inject(Router);

  if (tokenService.isLogged() && !tokenService.isTokenExpired()) {
    console.log('✅ AuthGuard: Accès autorisé');
    return true;
  } else {
    console.log('❌ AuthGuard: Accès refusé - Redirection vers login');
    tokenService.logout();
    return router.parseUrl('/auth/login');
  }
};

/**
 * Vérifie si l'utilisateur possède un des rôles requis.
 *
 * @param userRole - Le rôle de l'utilisateur.
 * @param requiredRoles - Les rôles requis pour accéder à la route.
 * @returns `true` si l'utilisateur possède un des rôles requis, `false` sinon.
 */
const hasRequiredRole = (userRole: string, requiredRoles: string[]): boolean => {
  // Si aucun rôle requis n'est spécifié, autoriser l'accès
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }
  return requiredRoles.includes(userRole);
};

/**
 * Guard pour vérifier uniquement l'authentification (sans vérification de rôle)
 */
export const simpleAuthGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(Token);
  const router = inject(Router);

  if (tokenService.isLogged() && !tokenService.isTokenExpired()) {
    return true;
  } else {
    tokenService.logout();
    return router.parseUrl('/auth/login');
  }
};

/**
 * Guard pour la page de login - Empêche l'accès si déjà connecté
 * NOUVEAU: Empêche également le retour arrière vers le login après connexion
 */
export const loginGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(Token);
  const router = inject(Router);

  if (tokenService.isLogged() && !tokenService.isTokenExpired()) {
    console.log('✅ Utilisateur déjà connecté - Redirection vers dashboard');
    return router.parseUrl('/dashboard');
  }

  return true;
};
