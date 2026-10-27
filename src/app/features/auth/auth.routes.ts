import { Routes } from '@angular/router';
import { loginGuard } from '../../core/guards/auth.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login),
    canActivate: [loginGuard]
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./forgot-password-form/forgot-password-form').then((m) => m.ForgotPasswordForm)
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./reset-password/reset-password').then((m) => m.ResetPassword)
  }
];
