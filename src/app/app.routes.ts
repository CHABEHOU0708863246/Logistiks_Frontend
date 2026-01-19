import { Routes } from '@angular/router';
import { NotFound } from './core/components/not-found/not-found';
import { authGuard } from './core/guards/auth.guard';

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
    path: '**',
    component: NotFound
  },
];
