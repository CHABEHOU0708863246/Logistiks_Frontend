import { Routes } from '@angular/router';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    loadComponent: () => import('./users-list/users-list').then(m => m.UsersList),
    data: {
      title: 'Tous les utilisateurs',
      breadcrumb: 'Liste'
    }
  },
  {
    path: 'create',
    loadComponent: () => import('./users-create/users-create').then(m => m.UsersCreate),
    data: {
      title: 'Crée un utilisateur',
      breadcrumb: 'Crée'
    }
  },
  {
    path: 'roles',
    loadComponent: () => import('./users-roles/users-roles').then(m => m.UsersRoles),
    data: {
      title: 'Gestion des rôles',
      breadcrumb: 'Rôles'
    }
  },

];
