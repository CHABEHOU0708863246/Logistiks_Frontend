import { Routes } from '@angular/router';
import { ForgotPasswordForm } from './forgot-password-form/forgot-password-form';
import { Login } from './login/login';
import { ResetPassword } from './reset-password/reset-password';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordForm
  },
  {
    path: 'reset-password',
    component: ResetPassword
  }
];
