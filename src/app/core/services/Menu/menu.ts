import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { MenuItemConfig, MenuResponse } from '../../models/Menu/Menu-config.model';
import { Token } from '../Token/token';
import { Permission } from '../Permission/permission';

@Injectable({
  providedIn: 'root',
})
export class Menu {
  private readonly API_URL = `${environment.apiUrl}/api/Menu`;

  // Sujet pour le menu actuel
  private menuSubject = new BehaviorSubject<MenuItemConfig[]>([]);
  public menu$ = this.menuSubject.asObservable();

  // Sujet pour l'état de chargement
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  // Cache en mémoire avec clé utilisateur
  private menuCache: Map<string, { menu: MenuItemConfig[], timestamp: number }> = new Map();

  constructor(
    private http: HttpClient,
    private tokenService: Token,
    private permissionService: Permission
  ) {
  }

  /**
   * Charge le menu de l'utilisateur depuis l'API
   * IMPORTANT: Ne plus utiliser localStorage pour éviter que tous les users voient le même menu
   */
loadUserMenu(): Observable<MenuItemConfig[]> {
  this.loadingSubject.next(true);

  const userId = this.tokenService.getUserId() || 'anonymous';

  // Vérifier le cache en mémoire pour cet utilisateur
  const cached = this.getCachedMenuForUser(userId);
  if (cached) {
    this.menuSubject.next(cached);
    this.loadingSubject.next(false);

    return new Observable<MenuItemConfig[]>(observer => {
      observer.next(cached);
      observer.complete();
    });
  }

  return this.http.get<MenuResponse>(`${this.API_URL}/user-menu`).pipe(
    map(response => {
      console.log('📦 Réponse API reçue:', response);

      if (response.success && response.menu) {
        return response.menu;
      } else {
        console.error('❌ Réponse API invalide:', response);
        throw new Error(response.message || 'Erreur lors du chargement du menu');
      }
    }),
    tap(menu => {

      // Log chaque item principal
      menu.forEach((item, index) => {
        console.log(`📌 Item ${index + 1}:`, {
          label: item.label,
          route: item.route,
          icon: item.icon,
          requiredPermissions: item.requiredPermissions,
          subItemsCount: item.subItems?.length || 0
        });

        // Log des sous-items
        if (item.subItems && item.subItems.length > 0) {
          item.subItems.forEach((subItem, subIndex) => {
            console.log(`  └─ Sous-item ${subIndex + 1}:`, {
              label: subItem.label,
              route: subItem.route,
              requiredPermissions: subItem.requiredPermissions
            });
          });
        }
      });

      this.menuSubject.next(menu);
      this.cacheMenuForUser(userId, menu);
      this.loadingSubject.next(false);
    }),
    catchError(error => {
      console.error('❌ Erreur chargement menu:', error);
      this.loadingSubject.next(false);

      return throwError(() => error);
    })
  );
}

  /**
   * Vérifie si un item de menu est visible pour l'utilisateur
   */
  isMenuItemVisible(item: MenuItemConfig, userPermissions: string[], userRoles: string[]): boolean {
    // SUPER_ADMIN a accès à tout
    if (userRoles.includes('SUPER_ADMIN')) {
      return true;
    }

    // Vérifier si l'item est marqué comme non visible
    if (item.isVisible === false) {
      return false;
    }

    // Si aucune permission requise, visible
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
      return true;
    }

    // Vérifier les permissions requises (AU MOINS UNE)
    const hasPermission = item.requiredPermissions.some(permission =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) return false;

    // Vérifier les rôles requis
    if (item.requiredRoles && item.requiredRoles.length > 0) {
      const hasRole = item.requiredRoles.some(role =>
        userRoles.includes(role)
      );

      if (!hasRole) return false;
    }

    return true;
  }

  /**
   * Rafraîchit le menu (force le rechargement depuis l'API)
   */
refresh(): void {
  const userId = this.tokenService.getUserId() || 'anonymous';
  this.clearCacheForUser(userId);
  this.loadUserMenu().subscribe();
}

  /**
   * Nettoie tout le cache du menu
   */
  clearCache(): void {
    this.menuCache.clear();
    this.menuSubject.next([]);
  }

  /**
   * Vérifie si le menu a besoin d'être rafraîchi
   */
  needsRefresh(): boolean {
    const currentMenu = this.menuSubject.value;
    const needsRefresh = currentMenu.length === 0;
    return needsRefresh;
  }

  // ============ MÉTHODES DE CACHE EN MÉMOIRE ============

  private getCachedMenuForUser(userId: string): MenuItemConfig[] | null {
    if (!userId) {
      console.warn('⚠️ Pas d\'userId pour récupérer le cache');
      return null;
    }

    const cached = this.menuCache.get(userId);
    if (!cached) {
      return null;
    }

    const currentTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes

    // Vérifier si le cache n'est pas expiré
    if ((currentTime - cached.timestamp) > fiveMinutes) {
      this.menuCache.delete(userId);
      return null;
    }
    return cached.menu;
  }

  private cacheMenuForUser(userId: string, menu: MenuItemConfig[]): void {
    if (!userId) {
      console.warn('⚠️ Pas d\'userId pour mettre en cache');
      return;
    }
    this.menuCache.set(userId, {
      menu: menu,
      timestamp: Date.now()
    });
  }

  private clearCacheForUser(userId: string): void {
    if (!userId) return;
    this.menuCache.delete(userId);
  }

  // ============ MÉTHODES UTILITAIRES ============

  /**
   * Recherche un item de menu par sa route
   */
  findMenuItemByRoute(route: string): MenuItemConfig | null {
    const menu = this.menuSubject.value;
    return this.findMenuItemRecursive(menu, route);
  }

  private findMenuItemRecursive(items: MenuItemConfig[], route: string): MenuItemConfig | null {
    for (const item of items) {
      if (item.route === route) {
        return item;
      }

      if (item.subItems && item.subItems.length > 0) {
        const found = this.findMenuItemRecursive(item.subItems, route);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * Récupère tous les items de menu (aplatis)
   */
  getAllMenuItems(): MenuItemConfig[] {
    const menu = this.menuSubject.value;
    return this.flattenMenuItems(menu);
  }

  private flattenMenuItems(items: MenuItemConfig[]): MenuItemConfig[] {
    const flattened: MenuItemConfig[] = [];

    items.forEach(item => {
      flattened.push(item);

      if (item.subItems && item.subItems.length > 0) {
        flattened.push(...this.flattenMenuItems(item.subItems));
      }
    });

    return flattened;
  }

  /**
   * Vérifie si une route est autorisée dans le menu
   */
  isRouteAllowed(route: string): boolean {
    const userPermissions = this.permissionService.getAllPermissions();
    const userRoles = this.permissionService.getAllRoles();

    const allItems = this.getAllMenuItems();
    const item = allItems.find(i => i.route === route);

    if (!item) return false;

    return this.isMenuItemVisible(item, userPermissions, userRoles);
  }

  /**
   * Récupère le chemin du breadcrumb pour une route
   */
  getBreadcrumbForRoute(route: string): { label: string, route: string }[] {
    const breadcrumb: { label: string, route: string }[] = [];
    const menu = this.menuSubject.value;

    this.buildBreadcrumb(menu, route, breadcrumb);

    return breadcrumb;
  }

  private buildBreadcrumb(
    items: MenuItemConfig[],
    targetRoute: string,
    breadcrumb: { label: string, route: string }[]
  ): boolean {
    for (const item of items) {
      if (item.route === targetRoute) {
        breadcrumb.push({ label: item.label, route: item.route });
        return true;
      }

      if (item.subItems && item.subItems.length > 0) {
        if (this.buildBreadcrumb(item.subItems, targetRoute, breadcrumb)) {
          breadcrumb.unshift({ label: item.label, route: item.route || '' });
          return true;
        }
      }
    }

    return false;
  }
}
