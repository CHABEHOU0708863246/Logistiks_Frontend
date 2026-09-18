import { Routes } from '@angular/router';

export const AUDIT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./audit-trail/audit-trail').then(m => m.AuditTrail),
    data: {
      title: 'Journal d\'audit',
      breadcrumb: 'Journal d\'audit'
    }
  }
];
