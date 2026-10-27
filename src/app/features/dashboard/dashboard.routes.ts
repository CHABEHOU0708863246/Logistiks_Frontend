import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { AUDIT_ROUTES } from './dashboard/Audit/audit.routes';
import { SETTINGS_ROUTES } from './dashboard/Settings/settings.routes';
import { permissionGuard } from '../../core/guards/permission.guard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: Dashboard,
  },
  {
    path: 'audit',
    canActivate: [permissionGuard],
    data: {
      permissions: ['Audit_Read', 'Audit_Export'],
    },
    children: AUDIT_ROUTES,
  },
  {
    path: 'settings',
    canActivate: [permissionGuard],
    data: {
      permissions: ['Settings_Read', 'Settings_Update', 'Settings_Advanced'],
    },
    children: SETTINGS_ROUTES,
  },
];
