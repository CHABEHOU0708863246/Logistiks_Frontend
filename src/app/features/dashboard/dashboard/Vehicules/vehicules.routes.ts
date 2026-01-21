import { Routes } from '@angular/router';

export const VEHICULES_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    loadComponent: () => import('./vehicules-list/vehicules-list').then(m => m.VehiculesList),
    data: {
      title: 'Tous les véhicules',
      breadcrumb: 'Liste'
    }
  },
  {
    path: 'ajouter',
    loadComponent: () => import('./vehicule-form/vehicule-form').then(m => m.VehiculeForm),
    data: {
      title: 'Ajouter un véhicule',
      breadcrumb: 'Nouveau'
    }
  }
];
