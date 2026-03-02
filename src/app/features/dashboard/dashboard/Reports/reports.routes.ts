import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'activite-mensuelle',
    loadComponent: () => import('./activite-mensuelle/activite-mensuelle').then(m => m.ActiviteMensuelle),
    data: {
      title: 'Rapports d\'activité mensuelle',
      breadcrumb: 'Rapports d\'activité mensuelle'
    }
  },
  {
    path: 'depenses-categories',
    loadComponent: () => import('./depenses-categories/depenses-categories').then(m => m.DepensesCategories),
    data: {
      title: 'Rapports de dépenses par catégorie',
      breadcrumb: 'Rapports de dépenses par catégorie'
    }
  },
];
