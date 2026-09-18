
import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { AUDIT_ROUTES } from './dashboard/Audit/audit.routes';
import { SETTINGS_ROUTES } from './dashboard/Settings/settings.routes';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: Dashboard
  },
  {
    path: 'audit',
    children: AUDIT_ROUTES
  },
  {
    path: 'settings',
    children: SETTINGS_ROUTES
  }
];
