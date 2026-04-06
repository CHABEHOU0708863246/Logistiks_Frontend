import { Routes } from '@angular/router';

export const ANALYTICS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'kpi-globaux',
    pathMatch: 'full'
  },
  {
    path: 'kpi-globaux',                        // ← était 'kpi', sidebar attend 'kpi-globaux'
    loadComponent: () => import('./kpi-globaux/kpi-globaux').then(m => m.KpiGlobaux),
    data: {
      title: 'KPIs Globaux',
      breadcrumb: 'KPIs'
    }
  },
  {
    path: 'finance',                             // ← déjà correct, sidebar utilise 'finance'
    loadComponent: () => import('./tableau-bord-financier/tableau-bord-financier')
      .then(m => m.TableauBordFinancier),
    data: {
      title: 'Tableau de bord financier',
      breadcrumb: 'Dashboard financier',
      rules: ['RG-016', 'RG-017', 'RG-014']
    }
  }
];
