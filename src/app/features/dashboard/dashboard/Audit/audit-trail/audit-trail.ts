import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, forkJoin, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// ============================================================================
// CORE IMPORTS
// ============================================================================
import { environment } from '../../../../../../environments/environment';
import { NotificationComponent } from '../../../../../core/components/notification-component/notification-component';
import { SidebarComponent } from '../../../../../core/components/sidebar-component/sidebar-component';

// ============================================================================
// MODELS IMPORTS
// ============================================================================
import { AuditLog, AuditSearchFilters } from '../../../../../core/models/Audit/audit.models';
import { User } from '../../../../../core/models/Core/Users/Entities/User';

// ============================================================================
// SERVICES IMPORTS
// ============================================================================
import { Audit } from '../../../../../core/services/Audit/audit';
import { Auth } from '../../../../../core/services/Auth/auth';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Token } from '../../../../../core/services/Token/token';

// ============================================================================
// INTERFACES INTERNES
// ============================================================================

/** Filtres de l'écran (valeurs brutes des contrôles). */
interface AuditFilters {
  entityType: string;
  action: string;
  userId: string;
  fromDate: string;
  toDate: string;
  searchTerm: string;
}

/** Configuration de pagination serveur. */
interface Pagination {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Libellés français des actions journalisées.
 * Une action inconnue est affichée telle quelle (underscores remplacés).
 */
const AUDIT_ACTION_LABELS: Record<string, string> = {
  TIER_CREATED: 'Tier créé',
  TIER_UPDATED: 'Tier modifié',
  TIER_VALIDATED: 'Tier validé',
  CONTRACT_ACTIVATED: 'Contrat activé',
  CONTRACT_REJECTED: 'Contrat rejeté',
  CONTRACT_CANCELLED: 'Contrat annulé',
  CONTRACT_TERMINATED: 'Contrat résilié',
  CONTRACT_RENEWED: 'Contrat renouvelé',
  PAYMENT_RECORDED: 'Paiement enregistré',
  DAMAGE_REPORTED: 'Dommage signalé',
  VEHICLE_RETURNED: 'Véhicule restitué',
  VEHICLE_CREATED: 'Véhicule créé',
  VEHICLE_UPDATED: 'Véhicule modifié',
  VEHICLE_DELETED: 'Véhicule supprimé',
  VEHICLE_STATUS_CHANGED: 'Statut véhicule modifié',
  FINANCE_TRANSACTION_CREATED: 'Transaction créée',
  FINANCE_TRANSACTION_VERIFIED: 'Transaction vérifiée',
  FINANCE_TRANSACTION_PAID: 'Transaction payée',
  USER_CREATED: 'Utilisateur créé',
  USER_STATUS_CHANGED: 'Statut utilisateur modifié',
  USER_ROLES_CHANGED: 'Rôles utilisateur modifiés',
  ROLE_CREATED: 'Rôle créé',
  ROLE_UPDATED: 'Rôle modifié',
  ROLE_DELETED: 'Rôle supprimé',
};

@Component({
  selector: 'app-audit-trail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NotificationComponent,
    SidebarComponent
  ],
  templateUrl: './audit-trail.html',
  styleUrl: './audit-trail.scss',
})
export class AuditTrail implements OnInit, OnDestroy {

  // ============================================================================
  // SECTION 1: DONNÉES PRINCIPALES
  // ============================================================================

  /** Entrées d'audit de la page courante */
  auditLogs: AuditLog[] = [];

  /** Entrée sélectionnée pour la modale de détails */
  selectedLog: AuditLog | null = null;

  // ============================================================================
  // SECTION 2: STATISTIQUES
  // ============================================================================

  /** Nombre d'entrées correspondant aux filtres actifs (métadonnée serveur) */
  totalEntries = 0;

  /** Nombre d'entrées journalisées aujourd'hui */
  entriesToday = 0;

  /** Horodatage de la dernière entrée correspondant aux filtres */
  lastEntryAt: string | null = null;

  // ============================================================================
  // SECTION 3: ÉTATS DE CHARGEMENT
  // ============================================================================

  isLoading = false;
  isExporting = false;

  // ============================================================================
  // SECTION 4: FILTRES
  // ============================================================================

  filters: AuditFilters = {
    entityType: '',
    action: '',
    userId: '',
    fromDate: '',
    toDate: '',
    searchTerm: ''
  };

  /** Types d'entité proposés au filtrage (valeurs journalisées côté backend) */
  readonly entityTypeOptions: { value: string; label: string }[] = [
    { value: '', label: 'Toutes les entités' },
    { value: 'Contract', label: 'Contrats' },
    { value: 'Tier', label: 'Tiers' },
    { value: 'Vehicle', label: 'Véhicules' },
    { value: 'Finance', label: 'Finances' },
    { value: 'User', label: 'Utilisateurs' },
    { value: 'Role', label: 'Rôles' }
  ];

  private searchSubject = new Subject<string>();

  // ============================================================================
  // SECTION 5: PAGINATION
  // ============================================================================

  pagination: Pagination = {
    currentPage: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1
  };

  visiblePages: number[] = [];
  pageSizeOptions: number[] = [10, 20, 50, 100];

  // ============================================================================
  // SECTION 6: MODALES
  // ============================================================================

  showDetailsModal = false;

  // ============================================================================
  // SECTION 7: UTILISATEUR ET INTERFACE
  // ============================================================================

  currentUser: User | null = null;
  userName = 'Utilisateur';
  userPhotoUrl = '';
  showUserMenu = false;
  isSidebarCollapsed = false;

  private destroy$ = new Subject<void>();

  constructor(
    private auditService: Audit,
    private authService: Auth,
    private tokenService: Token,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  // ============================================================================
  // SECTION 8: CYCLE DE VIE
  // ============================================================================

  ngOnInit(): void {
    this.checkAuthentication();
    this.loadCurrentUser();
    this.loadAuditLogs();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // SECTION 9: AUTHENTIFICATION
  // ============================================================================

  private checkAuthentication(): void {
    if (!this.tokenService.getToken()) {
      this.router.navigate(['/auth/login']);
    }
  }

  loadCurrentUser(): void {
    this.authService
      .getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: User) => {
          this.currentUser = user;
          this.userName = this.formatUserName(user);
          this.userPhotoUrl = this.getUserPhotoUrl(user);
        },
        error: (error) => {
          if (error?.status === 401) {
            this.tokenService.handleTokenExpired();
          } else {
            this.userName = 'Utilisateur Logistiks';
            this.userPhotoUrl = this.getDefaultAvatar();
          }
        }
      });
  }

  formatUserName(user: any): string {
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    if (user.username) return user.username;
    if (user.email) return user.email.split('@')[0];
    return 'Utilisateur Logistiks';
  }

  getUserPhotoUrl(user: User): string {
    if (user.photoUrl && /^[0-9a-fA-F]{24}$/.test(user.photoUrl)) {
      return `${environment.apiUrl}/api/User/photo/${user.photoUrl}`;
    }
    if (user.photoUrl && user.photoUrl.startsWith('http')) {
      return user.photoUrl;
    }
    return this.getDefaultAvatar();
  }

  getDefaultAvatar(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=696cff&color=fff&size=128`;
  }

  getUserInitials(): string {
    const parts = this.userName.split(' ');
    return parts.length >= 2
      ? (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
      : this.userName.charAt(0).toUpperCase();
  }

  // ============================================================================
  // SECTION 10: CHARGEMENT DU JOURNAL
  // ============================================================================

  loadAuditLogs(): void {
    this.isLoading = true;

    this.auditService
      .search(this.buildFilters(true))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.auditLogs = response.data;
            this.pagination.totalItems = response.totalCount ?? response.data.length;
            this.pagination.totalPages = Math.max(
              1,
              response.totalPages ?? Math.ceil(this.pagination.totalItems / this.pagination.pageSize)
            );
            this.totalEntries = this.pagination.totalItems;
            this.calculateVisiblePages();
          } else {
            this.auditLogs = [];
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur chargement audit:', error);
          this.notificationService.error('Erreur', 'Impossible de charger le journal d\'audit');
          this.auditLogs = [];
          this.isLoading = false;
        }
      });

    this.loadStatistics();
  }

  /**
   * Statistiques complémentaires : deux requêtes légères et réelles
   * (aucune valeur inventée à partir de la seule page affichée).
   */
  private loadStatistics(): void {
    const today = this.toDateInputValue(new Date());

    forkJoin({
      today: this.auditService.search({ fromDate: today, toDate: today, page: 1, pageSize: 1 }),
      latest: this.auditService.search({ ...this.buildFilters(false), page: 1, pageSize: 1 })
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ today: todayResponse, latest }) => {
          this.entriesToday = todayResponse.totalCount ?? 0;
          this.lastEntryAt = latest.data?.[0]?.timestamp ?? null;
        },
        error: (error) => {
          console.error('Erreur chargement statistiques audit:', error);
        }
      });
  }

  /**
   * Construit les filtres transmis à l'API.
   * Les valeurs vides sont omises ; la pagination est optionnelle (export).
   */
  private buildFilters(includePagination: boolean): AuditSearchFilters {
    const filters: AuditSearchFilters = {
      entityType: this.filters.entityType || undefined,
      action: this.filters.action.trim() || undefined,
      userId: this.filters.userId.trim() || undefined,
      fromDate: this.filters.fromDate || undefined,
      toDate: this.filters.toDate || undefined,
      searchTerm: this.filters.searchTerm.trim() || undefined
    };

    if (includePagination) {
      filters.page = this.pagination.currentPage;
      filters.pageSize = this.pagination.pageSize;
    }

    return filters;
  }

  // ============================================================================
  // SECTION 11: RECHERCHE ET FILTRES
  // ============================================================================

  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm) => {
        this.filters.searchTerm = searchTerm;
        this.applyFilters();
      });
  }

  onSearchChange(term: string): void {
    this.searchSubject.next(term);
  }

  /** Applique les filtres et revient à la première page. */
  applyFilters(): void {
    this.pagination.currentPage = 1;
    this.loadAuditLogs();
  }

  refreshAuditLogs(): void {
    this.loadAuditLogs();
  }

  resetFilters(): void {
    this.filters = {
      entityType: '',
      action: '',
      userId: '',
      fromDate: '',
      toDate: '',
      searchTerm: ''
    };
    this.pagination.currentPage = 1;
    this.loadAuditLogs();
  }

  onFromDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filters.fromDate = input.value;

    if (this.filters.toDate && this.filters.fromDate > this.filters.toDate) {
      this.notificationService.warning('Attention', 'La date de début ne peut pas être après la date de fin');
      this.filters.toDate = this.filters.fromDate;
    }

    this.applyFilters();
  }

  onToDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filters.toDate = input.value;

    if (this.filters.fromDate && this.filters.toDate < this.filters.fromDate) {
      this.notificationService.warning('Attention', 'La date de fin ne peut pas être avant la date de début');
      this.filters.fromDate = this.filters.toDate;
    }

    this.applyFilters();
  }

  // ============================================================================
  // SECTION 12: PAGINATION
  // ============================================================================

  goToPage(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages && page !== this.pagination.currentPage) {
      this.pagination.currentPage = page;
      this.loadAuditLogs();
    }
  }

  previousPage(): void {
    this.goToPage(this.pagination.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.pagination.currentPage + 1);
  }

  changePageSize(size: number): void {
    this.pagination.pageSize = size;
    this.pagination.currentPage = 1;
    this.loadAuditLogs();
  }

  private calculateVisiblePages(): void {
    const maxVisible = 5;
    const total = this.pagination.totalPages;
    const current = this.pagination.currentPage;

    if (total <= maxVisible) {
      this.visiblePages = Array.from({ length: total }, (_, i) => i + 1);
      return;
    }

    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, current - half);
    const end = Math.min(total, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    this.visiblePages = pages;
  }

  // ============================================================================
  // SECTION 13: DÉTAILS
  // ============================================================================

  openDetails(log: AuditLog): void {
    this.selectedLog = log;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedLog = null;
  }

  hasChanges(log: AuditLog | null): boolean {
    return !!log && !!log.changes && log.changes.length > 0;
  }

  /** Reformate une valeur JSON texte pour affichage lisible. */
  formatJson(value?: string | null): string {
    if (!value) return '';
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  // ============================================================================
  // SECTION 14: EXPORT CSV
  // ============================================================================

  exportCsv(): void {
    if (this.isExporting) return;

    this.isExporting = true;

    this.auditService
      .exportCsv(this.buildFilters(false))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.isExporting = false;
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `journal-audit_${new Date().toISOString().slice(0, 10)}.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.notificationService.success('Export terminé', 'Le journal d\'audit a été téléchargé.');
        },
        error: async (error) => {
          this.isExporting = false;
          let message = error?.message || 'Impossible de générer l\'export.';
          try {
            if (error?.error instanceof Blob) {
              const text = await error.error.text();
              const parsed = JSON.parse(text);
              message = parsed?.message || parsed?.data?.message || message;
            }
          } catch { /* on garde le message par défaut */ }
          this.notificationService.error('Export impossible', message);
        }
      });
  }

  // ============================================================================
  // SECTION 15: HELPERS D'AFFICHAGE
  // ============================================================================

  formatDateTime(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  }

  /** Auteur de l'action, tel qu'enregistré par le backend. */
  getLogUser(log: AuditLog | null): string {
    if (!log) return '—';
    return log.userName || log.userId || 'Système';
  }

  getActionLabel(action: string): string {
    return AUDIT_ACTION_LABELS[action] ?? action.replace(/_/g, ' ');
  }

  /** Couleur du badge d'action selon la nature de l'opération. */
  getActionClass(action: string): string {
    if (action.includes('DELETED') || action.includes('REJECTED') || action.includes('CANCELLED')) {
      return 'badge-danger';
    }
    if (action.includes('CREATED') || action.includes('ACTIVATED') || action.includes('PAID')) {
      return 'badge-success';
    }
    if (action.includes('UPDATED') || action.includes('CHANGED') || action.includes('RENEWED') || action.includes('VERIFIED')) {
      return 'badge-info';
    }
    if (action.includes('VALIDATED') || action.includes('RECORDED') || action.includes('REPORTED')
      || action.includes('RETURNED') || action.includes('TERMINATED')) {
      return 'badge-warning';
    }
    return 'badge-neutral';
  }

  getEntityLabel(entityType: string): string {
    const labels: Record<string, string> = {
      Contract: 'Contrat',
      Tier: 'Tier',
      Vehicle: 'Véhicule',
      Finance: 'Finance',
      User: 'Utilisateur',
      Role: 'Rôle'
    };
    return labels[entityType] ?? entityType;
  }

  getEntityIcon(entityType: string): string {
    const icons: Record<string, string> = {
      Contract: 'bx-file-blank',
      Tier: 'bx-user-circle',
      Vehicle: 'bx-car',
      Finance: 'bx-wallet',
      User: 'bx-user',
      Role: 'bx-shield-quarter'
    };
    return icons[entityType] ?? 'bx-package';
  }

  private toDateInputValue(date: Date): string {
    return isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  // ============================================================================
  // SECTION 16: INTERFACE UTILISATEUR
  // ============================================================================

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  @HostListener('document:click', ['$event'])
  closeUserMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-toggle') && !target.closest('.dropdown-menu')) {
      this.showUserMenu = false;
    }
  }

  logout(): void {
    this.tokenService.logout();
    this.authService
      .logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.router.navigate(['/auth/login']),
        error: () => this.router.navigate(['/auth/login'])
      });
  }
}
