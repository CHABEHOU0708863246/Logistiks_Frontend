import { Routes } from '@angular/router';

export const DOCUMENTS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    loadComponent: () => import('./documents-list/documents-list').then(m => m.DocumentsList),
    data: {
      title: 'Liste des Documents',
      breadcrumb: 'Liste des Documents'
    }
  },

];
