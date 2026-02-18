import { Routes } from '@angular/router';

export const ANALYTICS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'kpi',
    pathMatch: 'full'
  },
  {
    path: 'kpi',
    loadComponent: () => import('./kpi/kpi-globaux/kpi-globaux').then(m => m.KpiGlobaux),
    data: {
      title: 'KPIs Globaux',
      breadcrumb: 'KPIs'
    }
  },
  {
    path: 'finance',
    loadComponent: () => import('./finances/tableau-bord-financier/tableau-bord-financier').then(m => m.TableauBordFinancier),
    data: {
      title: 'Tableau de bord financier',
      breadcrumb: 'Dashboard financier',
      rules: ['RG-016', 'RG-017', 'RG-014']
    }
  },
  {
    path: 'flotte',
    loadComponent: () => import('./flotte/statistiques-flotte/statistiques-flotte').then(m => m.StatistiquesFlotte),
    data: {
      title: 'Statistiques flotte',
      breadcrumb: 'Statistiques flotte',
      rules: ['RG-011', 'RG-017']
    }
  }
];
