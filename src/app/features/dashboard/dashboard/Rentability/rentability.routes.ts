import { Routes } from '@angular/router';
import { authGuard } from '../../../../core/guards/auth.guard';

export const RENTABILITE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'vehicules',
    loadComponent: () => import('./vehicule-roi/vehicule-roi').then(m => m.VehiculeRoi),
    data: {
      title: 'ROI par véhicule',
      breadcrumb: 'ROI véhicules'
    },
    canActivate: [authGuard]
  },
  {
    path: 'calculer',
    loadComponent: () => import('./calculer-rentabilite/calculer-rentabilite').then(m => m.CalculerRentabilite),
    data: {
      title: 'Calculer la rentabilité',
      breadcrumb: 'Calcul'
    },
    canActivate: [authGuard]
  },
  {
    path: 'comparaisons',
    loadComponent: () => import('./period-comparison/period-comparison').then(m => m.PeriodComparison),
    data: {
      title: 'Comparaisons de périodes',
      breadcrumb: 'Comparaisons'
    },
    canActivate: [authGuard]
  }
];
