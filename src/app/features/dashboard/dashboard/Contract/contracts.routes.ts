import { Routes } from '@angular/router';

export const CONTRACT_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    loadComponent: () => import('./contrats-list/contrats-list').then(m => m.ContratsList),
    data: {
      title: 'Tous les contrats',
      breadcrumb: 'Liste'
    }
  },
  {
    path: 'stats',
    loadComponent: () => import('./contrat-statistics/contrat-statistics').then(m => m.ContratStatistics),
    data: {
      title: 'Statistiques des contrats',
      breadcrumb: 'Statistiques'
    }
  },
];
