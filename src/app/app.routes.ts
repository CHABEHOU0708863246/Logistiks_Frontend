import { Routes } from '@angular/router';
import { NotFound } from './core/components/not-found/not-found';
import { PermissionDenied } from './core/components/permission-denied/permission-denied';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

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
    canActivate: [authGuard],
  },
  {
    path: 'dashboard/analytics',
    loadChildren: () =>
      import('./features/dashboard/dashboard/analytics/analytics.routes').then((m) => m.ANALYTICS_ROUTES),
    canActivate: [authGuard, permissionGuard],
    data: {
      permissions: ['Dashboard_View', 'ROI_Read', 'Report_Generate', 'Calculation_Read'],
    },
  },
  {
    path: 'dashboard/tiers',
    loadChildren: () =>
      import('./features/dashboard/dashboard/Tiers/tiers.routes').then((m) => m.TIERS_ROUTES),
    canActivate: [authGuard, permissionGuard],
    data: {
      permissions: ['Customer_Read', 'Supplier_Read', 'Customer_Create', 'Supplier_Create'],
    },
  },
  {
    path: 'dashboard/vehicules',
    loadChildren: () =>
      import('./features/dashboard/dashboard/Vehicules/vehicules.routes').then((m) => m.VEHICULES_ROUTES),
    canActivate: [authGuard, permissionGuard],
    data: {
      permissions: ['Vehicle_Read', 'Vehicle_Create', 'Vehicle_Update', 'Vehicle_Assign'],
    },
  },
  {
    path: 'dashboard/documents',
    loadChildren: () =>
      import('./features/dashboard/dashboard/Documents/documents.routes').then((m) => m.DOCUMENTS_ROUTES),
    canActivate: [authGuard, permissionGuard],
    data: {
      permissions: ['Document_Read', 'Document_Upload', 'Document_Download'],
    },
  },
  {
    path: 'dashboard/contrats',
    loadChildren: () =>
      import('./features/dashboard/dashboard/Contract/contracts.routes').then((m) => m.CONTRACT_ROUTES),
    canActivate: [authGuard, permissionGuard],
    data: {
      permissions: ['Contract_Read', 'Contract_Create', 'Contract_Update', 'Contract_Validate'],
    },
  },
  {
    path: 'dashboard/finances',
    loadChildren: () =>
      import('./features/dashboard/dashboard/Financials/finances.routes').then((m) => m.FINANCES_ROUTES),
    canActivate: [authGuard, permissionGuard],
    data: {
      permissions: [
        'Payment_Read',
        'Payment_Record',
        'Expense_Read',
        'Expense_Create',
        'Transfer_Read',
        'Transfer_Create',
        'Account_Read',
        'ROI_Read',
        'Dashboard_View',
      ],
    },
  },
  {
    path: 'dashboard/rapports',
    loadChildren: () =>
      import('./features/dashboard/dashboard/Reports/reports.routes').then((m) => m.REPORTS_ROUTES),
    canActivate: [authGuard, permissionGuard],
    data: {
      permissions: ['Report_Read', 'Report_Generate', 'Report_Export', 'Report_Schedule'],
    },
  },
  {
    path: 'dashboard/about',
    loadChildren: () =>
      import('./features/dashboard/dashboard/About/about.routes').then((m) => m.ABOUT_ROUTES),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard/users',
    loadChildren: () =>
      import('./features/dashboard/dashboard/Users/users.routes').then((m) => m.USERS_ROUTES),
    canActivate: [authGuard, permissionGuard],
    data: {
      permissions: ['User_Manage', 'Role_Manage', 'System_Admin'],
    },
  },
  {
    path: 'dashboard/rentabilite',
    loadChildren: () =>
      import('./features/dashboard/dashboard/Rentability/rentability.routes').then(
        (m) => m.RENTABILITE_ROUTES
      ),
    canActivate: [authGuard, permissionGuard],
    data: {
      title: 'Rentabilité',
      breadcrumb: 'Rentabilité',
      permissions: ['ROI_Read', 'ROI_Calculate', 'Calculation_Read'],
    },
  },
  {
    path: 'dashboard/profiles',
    loadChildren: () =>
      import('./features/dashboard/dashboard/Profiles/profiles.routes').then(
        (m) => m.PROFILES_ROUTES
      ),
    canActivate: [authGuard],
    data: {
      title: 'Profils des utilisateurs',
      breadcrumb: 'Profils utilisateurs',
    },
  },
  {
    path: 'access-denied',
    component: PermissionDenied,
    canActivate: [authGuard],
  },
  {
    path: '**',
    component: NotFound,
  },
];
