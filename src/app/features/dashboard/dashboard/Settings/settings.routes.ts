import { Routes } from '@angular/router';

/**
 * Routes du paramétrage global.
 * Chemins alignés sur les liens de la sidebar :
 * /dashboard/settings/general | finance | notifications
 */
export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'general',
    pathMatch: 'full',
  },
  {
    path: 'general',
    loadComponent: () =>
      import('./settings-general/settings-general').then((m) => m.SettingsGeneral),
    data: {
      title: 'Paramètres généraux',
      breadcrumb: 'Général',
    },
  },
  {
    path: 'finance',
    loadComponent: () =>
      import('./settings-finance/settings-finance').then((m) => m.SettingsFinance),
    data: {
      title: 'Paramètres financiers',
      breadcrumb: 'Finance',
    },
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./settings-notifications/settings-notifications').then(
        (m) => m.SettingsNotifications
      ),
    data: {
      title: 'Paramètres de notifications',
      breadcrumb: 'Notifications',
    },
  },
];
