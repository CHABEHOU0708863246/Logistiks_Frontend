import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Modèles
import { PaginatedResponse } from '../../../../../core/models/Common/PaginatedResponse';
import { TierRoleType, TierStatus } from '../../../../../core/models/Enums/Logistiks-enums';
import { Tier } from '../../../../../core/models/Tiers/Tiers';
import { User } from '../../../../../core/models/Core/Users/Entities/User';

// Services
import { Tiers } from '../../../../../core/services/Tiers/tiers';
import { Auth } from '../../../../../core/services/Auth/auth';
import { Token } from '../../../../../core/services/Token/token';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';

// Composants
import { Sidebar } from "../../../../../core/components/sidebar/sidebar";
import { ConfirmDialog } from "../../../../../core/components/confirm-dialog/confirm-dialog";
import { ConfirmDialogWithInput } from "../../../../../core/components/confirm-dialog-with-input/confirm-dialog-with-input";

// Environnement
import { environment } from '../../../../../../environments/environment.development';

/**
 * Composant de gestion de la liste des tiers (clients, fournisseurs, partenaires)
 * @class TiersList
 * @implements {OnInit, OnDestroy}
 */
@Component({
  selector: 'app-tiers-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ConfirmDialog,
    ConfirmDialogWithInput
  ],
  templateUrl: './tiers-list.html',
  styleUrls: ['./tiers-list.scss']
})
export class TiersList implements OnInit, OnDestroy {
  // ===========================================================================
  // CONSTANTES ET CONFIGURATION
  // ===========================================================================

  /** Enums exportés pour utilisation dans le template */
  TierStatus = TierStatus;
  TierRoleType = TierRoleType;

  /** Options de pagination disponibles */
  pageSizeOptions = [10, 25, 50, 100];

  /** Options de tri disponibles */
  sortOptions = [
    { value: 'updatedAt', label: 'Date de modification', icon: 'bx bx-calendar' },
    { value: 'createdAt', label: 'Date de création', icon: 'bx bx-plus-circle' },
    { value: 'lastName', label: 'Nom', icon: 'bx bx-sort-a-z' },
    { value: 'tierNumber', label: 'Numéro de tier', icon: 'bx bx-hash' },
    { value: 'status', label: 'Statut', icon: 'bx bx-check-circle' }
  ];

  /** Rôles disponibles pour le filtrage */
  roles = [
    { value: TierRoleType.ClientParticulier, label: 'Client Particulier', icon: 'bx bx-user', color: 'primary' },
    { value: TierRoleType.Supplier, label: 'Fournisseur', icon: 'bx bx-truck', color: 'info' },
    { value: TierRoleType.ClientLivreur, label: 'Client/Livreur', icon: 'bx bx-briefcase', color: 'warning' },
    { value: TierRoleType.Partner, label: 'Partenaire', icon: 'bx bx-handshake', color: 'success' }
  ];

  /** Statuts disponibles pour le filtrage */
  statuses = [
    { value: TierStatus.Active, label: 'Actif', badge: 'success', icon: 'bx bx-check-circle' },
    { value: TierStatus.PendingValidation, label: 'En attente', badge: 'warning', icon: 'bx bx-time' },
    { value: TierStatus.Blocked, label: 'Bloqué', badge: 'danger', icon: 'bx bx-block' },
    { value: TierStatus.Inactive, label: 'Inactif', badge: 'default', icon: 'bx bx-minus-circle' }
  ];

  /** Classes pour les couleurs des avatars */
  private avatarColors = ['FF6B6B', '4ECDC4', 'FFD166', '06D6A0', '118AB2', 'EF476F', '7209B7', '3A86FF'];

  // ===========================================================================
  // ÉTATS DE L'APPLICATION
  // ===========================================================================

  // États de chargement et erreurs
  loading = false;
  error: string | null = null;

  // États de la sidebar et menus
  sidebarVisible = false;
  isSidebarCollapsed: boolean = false;
  showUserMenu: boolean = false;

  // États des boîtes de dialogue
  confirmDialogVisible = false;
  confirmDialogTitle = '';
  confirmDialogMessage = '';
  confirmDialogDetails = '';
  confirmAction: (() => void) | null = null;

  showBlockConfirmDialog = false;
  blockReason = '';
  tierToBlock: Tier | null = null;

  // ===========================================================================
  // DONNÉES ET FILTRES
  // ===========================================================================

  // Données principales
  tiers: Tier[] = [];

  /** Configuration de pagination */
  pagination: PaginatedResponse<Tier> = {
    data: [],
    currentPage: 1,
    pageSize: 50,
    totalCount: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false
  };

  // Filtres
  searchTerm: string = '';
  selectedRole?: TierRoleType;
  selectedStatus?: TierStatus;
  selectedSort = this.sortOptions[0].value;
  sortDescending = true;

  // Gestion utilisateur
  currentUser: User | null = null;
  userName: string = 'Utilisateur';
  userPhotoUrl: string = '';

  // Statistiques
  stats = {
    total: 0,
    active: 0,
    pending: 0,
    blocked: 0,
    clients: 0,
    suppliers: 0
  };

  dashboardStats = {
    totalTiers: 0,
    activeTiers: 0,
    activeContracts: 0,
    recoveryRate: 0,
    documentsPending: 0,
    paymentsOverdue: 0,
    vehiclesNeedingAttention: 0,
    totalClients: 0,
    totalSuppliers: 0
  };

  /** Pages visibles dans la pagination */
  visiblePages: number[] = [];

  // ===========================================================================
  // SUBJECTS ET SERVICES
  // ===========================================================================

  private destroy$ = new Subject<void>();

  constructor(
    private tiersService: Tiers,
    private notificationService: NotificationService,
    private authService: Auth,
    private tokenService: Token,
    private router: Router
  ) { }

  // ===========================================================================
  // LIFECYCLE HOOKS
  // ===========================================================================

  /**
   * Initialisation du composant
   */
  ngOnInit(): void {
    this.verifyAuthentication();
    this.loadCurrentUser();
    this.loadTiers();
  }

  /**
   * Nettoyage à la destruction du composant
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===========================================================================
  // GESTION DE L'AUTHENTIFICATION ET UTILISATEUR
  // ===========================================================================

  /**
   * Vérifie l'authentification de l'utilisateur
   */
  verifyAuthentication(): void {
    const token = this.tokenService.getToken();
    if (!token) {
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Charge les informations de l'utilisateur connecté
   */
  loadCurrentUser(): void {
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: User) => {
          this.currentUser = user;
          this.userName = this.formatUserName(user);
          this.userPhotoUrl = this.getUserPhotoUrl(user);
        },
        error: (error) => {
          console.error('Erreur chargement utilisateur:', error);
          if (error.status === 401) {
            this.tokenService.handleTokenExpired();
          } else {
            this.setDefaultUser();
          }
        }
      });
  }

  getDefaultAvatar(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=696cff&color=fff&size=128`;
  }

  /**
   * Définit un utilisateur par défaut en cas d'erreur
   */
  setDefaultUser(): void {
    this.userName = 'Utilisateur Logistiks';
    this.userPhotoUrl = this.generateAvatarUrl({ firstName: 'Utilisateur' } as User);
  }

  /**
   * Formate le nom d'utilisateur pour l'affichage
   * @param user - Utilisateur à formater
   * @returns Nom formaté
   */
  formatUserName(user: User): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
      return user.firstName;
    } else if (user.username) {
      return user.username;
    } else if (user.email) {
      return user.email.split('@')[0];
    }
    return 'Utilisateur Logistiks';
  }

  /**
   * Obtient l'URL de la photo de l'utilisateur
   * @param user - Utilisateur
   * @returns URL de la photo
   */
  getUserPhotoUrl(user: User): string {
    // Si photoUrl est un ID MongoDB
    if (user.photoUrl && /^[0-9a-fA-F]{24}$/.test(user.photoUrl)) {
      return `${environment.apiUrl}/api/User/photo/${user.photoUrl}`;
    }

    // Si photoUrl est déjà une URL complète
    if (user.photoUrl && user.photoUrl.startsWith('http')) {
      return user.photoUrl;
    }

    // Sinon, générer un avatar
    return this.generateAvatarUrl(user);
  }

  /**
   * Génère un avatar à partir du nom de l'utilisateur
   * @param user - Utilisateur
   * @returns URL de l'avatar généré
   */
  generateAvatarUrl(user: User): string {
    const name = this.formatUserName(user);
    const colorIndex = name.length % this.avatarColors.length;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${this.avatarColors[colorIndex]}&color=fff&size=128`;
  }

  /**
   * Obtient les initiales de l'utilisateur
   * @returns Initiales de l'utilisateur
   */
  getUserInitials(): string {
    const parts = this.userName.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return this.userName.charAt(0).toUpperCase();
  }

  /**
   * Basculer l'affichage du menu utilisateur
   */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  /**
   * Ferme le menu utilisateur lors d'un clic à l'extérieur
   */
  @HostListener('document:click', ['$event'])
  closeUserMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-toggle') && !target.closest('.dropdown-menu')) {
      this.showUserMenu = false;
    }
  }

  /**
   * Déconnecte l'utilisateur
   */
  logout(): void {
    this.tokenService.logout();

    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['/auth/login']);
        },
        error: (error) => {
          console.warn('⚠️ Erreur API déconnexion (ignorée):', error);
          this.router.navigate(['/auth/login']);
        }
      });
  }

  // ===========================================================================
  // GESTION DE LA SIDEBAR
  // ===========================================================================

  /**
   * Basculer l'état de la sidebar principale
   */
  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;

    const sidebar = document.getElementById('sidebar');
    const layoutPage = document.querySelector('.layout-page');

    if (sidebar && layoutPage) {
      if (this.isSidebarCollapsed) {
        sidebar.classList.add('collapsed');
        (layoutPage as HTMLElement).style.marginLeft = '0';
      } else {
        sidebar.classList.remove('collapsed');
        (layoutPage as HTMLElement).style.marginLeft = '280px';
      }
    }
  }

  /**
   * Basculer l'affichage de la sidebar des filtres (mobile)
   */
  toggleFiltersSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
  }

  /**
   * Basculer l'affichage d'un menu déroulant
   * @param event - Événement de clic
   */
  toggleMenu(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    element?.parentElement?.classList.toggle('open');
  }

  // ===========================================================================
  // GESTION DES BOÎTES DE DIALOGUE
  // ===========================================================================

  /**
   * Ouvre une boîte de dialogue de confirmation
   * @param title - Titre de la boîte de dialogue
   * @param message - Message principal
   * @param details - Détails supplémentaires
   * @param onConfirm - Callback à exécuter sur confirmation
   */
  openConfirmDialog(
    title: string,
    message: string,
    details: string = '',
    onConfirm: () => void
  ): void {
    this.confirmDialogTitle = title;
    this.confirmDialogMessage = message;
    this.confirmDialogDetails = details;
    this.confirmAction = onConfirm;
    this.confirmDialogVisible = true;
  }

  /**
   * Confirme l'action de la boîte de dialogue
   */
  onConfirmDialogConfirm(): void {
    this.confirmAction?.();
    this.resetConfirmDialog();
  }

  /**
   * Annule l'action de la boîte de dialogue
   */
  onConfirmDialogCancel(): void {
    this.resetConfirmDialog();
  }

  /**
   * Réinitialise l'état de la boîte de dialogue
   */
  resetConfirmDialog(): void {
    this.confirmDialogVisible = false;
    this.confirmAction = null;
    this.confirmDialogTitle = '';
    this.confirmDialogMessage = '';
    this.confirmDialogDetails = '';
  }

  /**
   * Ouvre la boîte de dialogue de blocage d'un tier
   * @param tier - Tier à bloquer
   */
  openBlockDialog(tier: Tier): void {
    this.tierToBlock = tier;
    this.blockReason = '';
    this.showBlockConfirmDialog = true;
  }

  /**
   * Confirme le blocage d'un tier
   * @param reason - Raison du blocage
   */
  confirmBlockTier(reason: string): void {
    if (!this.tierToBlock) return;

    if (!reason?.trim()) {
      this.notificationService.warning(
        'Raison obligatoire',
        'Veuillez saisir une raison de blocage'
      );
      return;
    }

    this.blockReason = reason.trim();

    this.tiersService.blockTier(this.tierToBlock.id, { reason: this.blockReason })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.warning(
            'Tier bloqué',
            `Le tier ${this.tierToBlock?.tierNumber} a été bloqué`
          );

          this.showBlockConfirmDialog = false;
          this.tierToBlock = null;
          this.blockReason = '';

          this.loadTiers(this.pagination.currentPage);
        },
        error: (error) => {
          const errorMessage = error?.error?.message || error?.message || 'Erreur inconnue';
          this.notificationService.error('Erreur de blocage', errorMessage);
          console.error('Erreur de blocage:', error);
        }
      });
  }

  /**
   * Annule le blocage d'un tier
   */
  cancelBlockTier(): void {
    this.showBlockConfirmDialog = false;
    this.tierToBlock = null;
    this.blockReason = '';
  }

  // ===========================================================================
  // GESTION DES TIERS (CRUD ET ACTIONS)
  // ===========================================================================

  /**
   * Charge la liste des tiers avec filtres
   * @param page - Numéro de page
   */
  loadTiers(page: number = 1): void {
    this.loading = true;
    this.error = null;

    this.tiersService.getTiersList({
      search: this.searchTerm,
      role: this.selectedRole,
      status: this.selectedStatus,
      pageNumber: page,
      pageSize: this.pagination.pageSize,
      sortBy: this.selectedSort,
      sortDescending: this.sortDescending
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.tiers = response.data;
          this.pagination = response;
          this.loading = false;
          this.updateVisiblePages();
          this.loadStatistics();
        },
        error: (error) => {
          this.error = error instanceof Error ? error.message : 'Erreur inconnue';
          this.loading = false;
          console.error('Erreur de chargement des tiers:', error);

          this.notificationService.error(
            'Erreur de chargement',
            this.error
          );
        }
      });
  }

  /**
   * Valide un tier
   * @param tier - Tier à valider
   */
  validateTier(tier: Tier): void {
    this.openConfirmDialog(
      'Validation du tier',
      `Voulez-vous valider le tier ${tier.tierNumber} ?`,
      'Cette action est irréversible.',
      () => {
        this.tiersService.validateTier(tier.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success) {
                this.notificationService.success(
                  'Validation réussie',
                  `Le tier ${tier.tierNumber} a été validé avec succès`
                );
                this.loadTiers(this.pagination.currentPage);
              } else {
                let errorMessage = response.message || 'Échec de validation';
                if (response.errors?.length) {
                  errorMessage += `:\n${response.errors.join('\n')}`;
                }
                this.notificationService.error('Erreur de validation', errorMessage);
              }
            },
            error: (error) => {
              const apiError = error.error;
              let message = apiError?.message || 'Erreur inconnue';
              if (apiError?.errors?.length) {
                message += `:\n${apiError.errors.join('\n')}`;
              }
              this.notificationService.error('Erreur de validation', message);
            }
          });
      }
    );
  }

  /**
   * Bloque un tier (ouvre la boîte de dialogue)
   * @param tier - Tier à bloquer
   */
  blockTier(tier: Tier): void {
    this.openBlockDialog(tier);
  }

  /**
   * Active un tier
   * @param tier - Tier à activer
   */
  activateTier(tier: Tier): void {
    this.openConfirmDialog(
      'Activation du tier',
      `Voulez-vous activer le tier ${tier.tierNumber} ?`,
      '',
      () => {
        this.tiersService.activateTier(tier.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.success(
                'Tier activé',
                `Le tier ${tier.tierNumber} a été activé`
              );
              this.loadTiers(this.pagination.currentPage);
            },
            error: (error) => {
              const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
              this.notificationService.error('Erreur d’activation', errorMessage);
            }
          });
      }
    );
  }

  // ===========================================================================
  // FILTRES ET TRI
  // ===========================================================================

  /**
   * Lance une recherche
   */
  onSearch(): void {
    this.pagination.currentPage = 1;
    this.loadTiers();
  }

  /**
   * Filtre par rôle
   * @param role - Rôle à filtrer
   */
  onFilterByRole(role?: TierRoleType): void {
    this.selectedRole = role;
    this.pagination.currentPage = 1;
    this.loadTiers();
  }

  /**
   * Filtre par statut
   * @param status - Statut à filtrer
   */
  onFilterByStatus(status?: TierStatus): void {
    this.selectedStatus = status;
    this.pagination.currentPage = 1;
    this.loadTiers();
  }

  /**
   * Change le critère de tri
   * @param field - Champ de tri
   */
  onSortChange(field: string): void {
    if (this.selectedSort === field) {
      this.sortDescending = !this.sortDescending;
    } else {
      this.selectedSort = field;
      this.sortDescending = true;
    }
    this.loadTiers(this.pagination.currentPage);
  }

  // ===========================================================================
  // PAGINATION
  // ===========================================================================

  /**
   * Change de page
   * @param page - Numéro de page
   */
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages) {
      this.loadTiers(page);
    }
  }

  /**
   * Change la taille de la page
   * @param event - Événement de changement
   */
  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pagination.pageSize = parseInt(select.value, 10);
    this.pagination.currentPage = 1;
    this.loadTiers();
  }

  /**
   * Met à jour la liste des pages visibles
   */
  updateVisiblePages(): void {
    const totalPages = this.pagination.totalPages;
    const currentPage = this.pagination.currentPage;
    const visiblePages: number[] = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        visiblePages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        visiblePages.push(1, 2, 3, 4, 5);
      } else if (currentPage >= totalPages - 2) {
        visiblePages.push(
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        visiblePages.push(
          currentPage - 2,
          currentPage - 1,
          currentPage,
          currentPage + 1,
          currentPage + 2
        );
      }
    }

    this.visiblePages = visiblePages;
  }

  // ===========================================================================
  // STATISTIQUES
  // ===========================================================================

  /**
   * Charge les statistiques à partir des données chargées
   */
  loadStatistics(): void {
    this.stats.total = this.tiers.length;
    this.stats.active = this.tiers.filter(t => t.status === TierStatus.Active).length;
    this.stats.pending = this.tiers.filter(t => t.status === TierStatus.PendingValidation).length;
    this.stats.blocked = this.tiers.filter(t => t.status === TierStatus.Blocked).length;
    this.stats.clients = this.tiers.filter(t =>
      t.roles.some(r => r.roleType === TierRoleType.ClientParticulier && r.isActive)
    ).length;
    this.stats.suppliers = this.tiers.filter(t =>
      t.roles.some(r => r.roleType === TierRoleType.Supplier && r.isActive)
    ).length;
  }

  // ===========================================================================
  // UTILITAIRES D'AFFICHAGE
  // ===========================================================================

  /**
   * Obtient la classe CSS pour un badge de rôle
   * @param roleType - Type de rôle
   * @returns Classe CSS
   */
  getRoleBadgeClass(roleType: TierRoleType): string {
    const role = this.roles.find(r => r.value === roleType);
    return role ? `badge-${role.color}` : 'badge-secondary';
  }

  /**
   * Obtient la classe CSS pour un badge de statut
   * @param status - Statut du tier
   * @returns Classe CSS
   */
  getStatusBadgeClass(status: TierStatus): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj ? `badge-${statusObj.badge}` : 'badge-secondary';
  }

  /**
   * Obtient le texte d'un statut
   * @param status - Statut du tier
   * @returns Texte du statut
   */
  getStatusText(status: TierStatus): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj ? statusObj.label : 'Inconnu';
  }

  /**
   * Obtient le texte d'un rôle
   * @param roleType - Type de rôle
   * @returns Texte du rôle
   */
  getRoleText(roleType: TierRoleType): string {
    const role = this.roles.find(r => r.value === roleType);
    return role ? role.label : 'Inconnu';
  }

  /**
   * Obtient l'icône d'un statut
   * @param status - Statut du tier
   * @returns Classe de l'icône
   */
  getStatusIcon(status: TierStatus): string {
    switch (status) {
      case TierStatus.Active:
        return 'bx bx-check-circle';
      case TierStatus.PendingValidation:
        return 'bx bx-time';
      case TierStatus.Blocked:
        return 'bx bx-block';
      case TierStatus.Inactive:
        return 'bx bx-minus-circle';
      default:
        return 'bx bx-question-mark';
    }
  }

  /**
   * Obtient le nom complet d'un tier
   * @param tier - Tier
   * @returns Nom complet
   */
  getFullName(tier: Tier): string {
    return tier.fullName || `${tier.firstName} ${tier.lastName}`;
  }

  /**
   * Obtient les initiales d'un tier
   * @param tier - Tier
   * @returns Initiales
   */
  getInitialsFromName(tier: Tier): string {
    const name = this.getFullName(tier);
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }

  /**
   * Formate un numéro de téléphone
   * @param phone - Numéro de téléphone
   * @returns Numéro formaté
   */
  formatPhoneNumber(phone: string): string {
    return this.tiersService.formatPhoneNumber(phone);
  }

  /**
   * Formate une date
   * @param date - Date à formater
   * @returns Date formatée
   */
  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('fr-FR');
    } catch (error) {
      return 'Date invalide';
    }
  }

  /**
   * Obtient les rôles actifs d'un tier
   * @param tier - Tier
   * @returns Liste des rôles actifs
   */
  getActiveRoles(tier: Tier): TierRoleType[] {
    return tier.roles
      .filter(role => role.isActive)
      .map(role => role.roleType);
  }

  // ===========================================================================
  // VÉRIFICATIONS ET VALIDATIONS
  // ===========================================================================

  /**
   * Vérifie si un tier a des documents expirés
   * @param tier - Tier
   * @returns True si des documents sont expirés
   */
  hasExpiredDocuments(tier: Tier): boolean {
    return this.tiersService.hasExpiredDocuments(tier);
  }

  /**
   * Vérifie si un tier peut signer des contrats
   * @param tier - Tier
   * @returns True si le tier peut signer
   */
  canSignContract(tier: Tier): boolean {
    return this.tiersService.canTierSignContracts(tier);
  }

  // ===========================================================================
  // EXPORT
  // ===========================================================================

  /**
   * Exporte les tiers au format Excel
   */
  exportToExcel(): void {
    this.tiersService.exportTiers({ format: 'xlsx' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob | MediaSource) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `tiers_${new Date().toISOString().split('T')[0]}.xlsx`;
          a.click();
          window.URL.revokeObjectURL(url);

          this.notificationService.success(
            'Export réussi',
            'Les données ont été exportées avec succès'
          );
          console.log('Export réussi');
        },
        error: (error: any) => {
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          this.notificationService.error('Erreur d\'export', errorMessage);
          console.error('Erreur d\'export:', error);
        }
      });
  }
}
