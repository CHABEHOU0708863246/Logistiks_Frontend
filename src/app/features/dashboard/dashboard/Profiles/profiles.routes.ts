import { Routes } from '@angular/router';
import { authGuard } from '../../../../core/guards/auth.guard';

export const PROFILES_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'users',
    pathMatch: 'full'
  },
  {
    path: 'users',
    loadComponent: () => import('./users-profiles/users-profiles').then(m => m.UsersProfiles),
    data: {
      title: 'Profils des utilisateurs',
      breadcrumb: 'Profils utilisateurs'
    },
    canActivate: [authGuard]
  }
];
