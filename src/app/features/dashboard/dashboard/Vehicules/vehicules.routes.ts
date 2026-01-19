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
    path: 'disponibles',
    loadComponent: () => import('./vehicules-disponibles/vehicules-disponibles').then(m => m.VehiculesDisponibles),
    data: {
      title: 'Véhicules Disponibles',
      breadcrumb: 'Disponibles'
    }
  },
  {
    path: 'loues',
    loadComponent: () => import('./vehicules-loues/vehicules-loues').then(m => m.VehiculesLoues),
    data: {
      title: 'Véhicules Loués',
      breadcrumb: 'Loués'
    }
  },
  {
    path: 'maintenance',
    loadComponent: () => import('./vehicules-maintenance/vehicules-maintenance').then(m => m.VehiculesMaintenance),
    data: {
      title: 'En maintenance',
      breadcrumb: 'Maintenance'
    }
  },
  {
    path: 'entretien',
    loadComponent: () => import('./suivi-entretien/suivi-entretien').then(m => m.SuiviEntretien),
    data: {
      title: 'Suivi de l\'entretien',
      breadcrumb: 'Entretien'
    }
  },
  {
    path: 'new',
    loadComponent: () => import('./vehicule-form/vehicule-form').then(m => m.VehiculeForm),
    data: {
      title: 'Ajouter un véhicule',
      breadcrumb: 'Nouveau'
    }
  }
];
