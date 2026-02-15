import { Routes } from '@angular/router';

export const ABOUT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./about-home/about-home').then(m => m.AboutHome),
    data: {
      title: 'À propos de Logistik',
      breadcrumb: 'À propos'
    }
  }
];
