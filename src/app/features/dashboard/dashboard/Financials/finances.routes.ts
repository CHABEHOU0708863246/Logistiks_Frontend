import { Routes } from '@angular/router';

export const FINANCES_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'transactions',
    pathMatch: 'full'
  },
  // Route principale : liste des transactions
  {
    path: 'transactions',
    loadComponent: () => import('./finance-transactions/finance-transactions').then(m => m.FinanceTransactions),
    data: {
      title: 'Toutes les transactions',
      breadcrumb: 'Transactions'
    }
  },
  // Créer une nouvelle transaction
  {
    path: 'transactions/nouvelle',
    loadComponent: () => import('./finance-create-transaction/finance-create-transaction').then(m => m.FinanceCreateTransaction),
    data: {
      title: 'Nouvelle transaction',
      breadcrumb: 'Nouvelle'
    }
  }
];
