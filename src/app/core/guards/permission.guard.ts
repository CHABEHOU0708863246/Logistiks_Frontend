import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Permissions } from '../services/Permission/permissions.service';

/**
 * Protège une route par permission(s) déclarée(s) dans `route.data`.
 *
 * data: {
 *   permissions: ['Customer_Read', 'Supplier_Read'],
 *   permissionMode: 'any' | 'all' // 'any' par défaut
 * }
 */
export const permissionGuard: CanActivateFn = (route) => {
  const required = route.data?.['permissions'] as string[] | undefined;

  if (!required || required.length === 0) {
    return true;
  }

  const mode = (route.data?.['permissionMode'] as 'any' | 'all' | undefined) ?? 'any';
  const permissions = inject(Permissions);
  const router = inject(Router);

  const allowed =
    mode === 'all'
      ? permissions.hasAllPermissions(...required)
      : permissions.hasAnyPermission(...required);

  return allowed ? true : router.parseUrl('/access-denied');
};
