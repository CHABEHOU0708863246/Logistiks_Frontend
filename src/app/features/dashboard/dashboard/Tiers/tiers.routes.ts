import { Routes } from '@angular/router';

export const TIERS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    loadComponent: () => import('./tiers-list/tiers-list').then(m => m.TiersList),
    data: {
      title: 'Liste des Tiers',
      breadcrumb: 'Liste'
    }
  },
  {
    path: 'new',
    loadComponent: () => import('./tier-form/tier-form').then(m => m.TierForm),
    data: {
      title: 'Nouveau Tier',
      breadcrumb: 'Nouveau'
    }
  },
  {
    path: 'documents-validation',
    loadComponent: () => import('./documents-validation/documents-validation').then(m => m.DocumentsValidation),
    data: {
      title: 'Documents à valider',
      breadcrumb: 'Documents à valider'
    }
  },
  {
    path: 'documents-management',
    loadComponent: () => import('./documents-management/documents-management').then(m => m.DocumentsManagement),
    data: {
      title: 'Gestion des documents',
      breadcrumb: 'Gestion des documents'
    }
  }
];
