import { Routes } from '@angular/router';
import { NotFound } from './core/components/not-found/not-found';
import { authGuard } from './core/guards/auth.guard';
import { USERS_ROUTES } from './features/dashboard/dashboard/Users/users.routes';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/tiers',
    loadChildren: () => import('./features/dashboard/dashboard/Tiers/tiers.routes').then((m) => m.TIERS_ROUTES),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/vehicules',
    loadChildren: () => import('./features/dashboard/dashboard/Vehicules/vehicules.routes').then((m) => m.VEHICULES_ROUTES),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/documents',
    loadChildren: () => import('./features/dashboard/dashboard/Documents/documents.routes').then((m) => m.DOCUMENTS_ROUTES),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/contrats',
    loadChildren: () => import('./features/dashboard/dashboard/Contract/contracts.routes').then((m) => m.CONTRACT_ROUTES),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/finances',
    loadChildren: () => import('./features/dashboard/dashboard/Financials/finances.routes').then((m) => m.FINANCES_ROUTES),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/about',
    loadChildren: () => import('./features/dashboard/dashboard/About/about.routes').then((m) => m.ABOUT_ROUTES),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/users',
    loadChildren: () => import('./features/dashboard/dashboard/Users/users.routes').then((m) => m.USERS_ROUTES),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/rentabilite',
    loadChildren: () => import('./features/dashboard/dashboard/Rentability/rentability.routes').then(m => m.RENTABILITE_ROUTES),
    data: {
      title: 'Rentabilité',
      breadcrumb: 'Rentabilité'
    },
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/profiles',
    loadChildren: () => import('./features/dashboard/dashboard/Profiles/profiles.routes').then(m => m.PROFILES_ROUTES),
    data: {
      title: 'Profils des utilisateurs',
      breadcrumb: 'Profils utilisateurs'
    },
    canActivate: [authGuard]
  },
  {
    path: '**',
    component: NotFound
  },
];
