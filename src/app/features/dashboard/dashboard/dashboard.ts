import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, RouterLink, Router } from '@angular/router';
import { forkJoin, Observable, Subscription } from 'rxjs';

import { User } from '../../../core/models/Core/Users/Entities/User';
import { DocumentStatus, TierRoleType, TierStatus } from '../../../core/models/Enums/Logistiks-enums';
import { Auth } from '../../../core/services/Auth/auth';
import { Tiers } from '../../../core/services/Tiers/tiers';
import { Token } from '../../../core/services/Token/token';
import { environment } from '../../../../environments/environment.development';
import { Tier } from '../../../core/models/Tiers/Tiers';
import { PaginatedResponse } from '../../../core/models/Common/PaginatedResponse';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit, OnDestroy {

  currentUser: User | null = null;
  userName: string = 'Utilisateur';
  userPhotoUrl: string = '';
  showUserMenu: boolean = false;

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

  isLoading: boolean = true;
  isSidebarCollapsed: boolean = false;
  isMobileView: boolean = false;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private authService: Auth,
    private tiersService: Tiers,
    private tokenService: Token,
    private router: Router,
  ) { }

  ngOnInit(): void {

    // Vérifier que le token est bien présent
    const token = this.tokenService.getToken();

    if (!token) {
      console.error('❌ Pas de token - Redirection login');
      this.router.navigate(['/auth/login']);
      return;
    }
    this.loadTiersStatistics();
    this.checkMobileView();
    this.loadCurrentUser();
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkMobileView();

    if (this.isMobileView) {
      this.isSidebarCollapsed = true;
      const sidebar = document.getElementById('sidebar');
      const layoutPage = document.querySelector('.layout-page');

      if (sidebar) sidebar.classList.add('collapsed');
      if (layoutPage) (layoutPage as HTMLElement).style.marginLeft = '0';
    }
  }

  /**
   * Charger l'utilisateur connecté
   */
  loadCurrentUser(): void {
    console.log('👤 Chargement utilisateur...');

    this.subscriptions.add(
      this.authService.getCurrentUser().subscribe({
        next: (user: User) => {

          this.currentUser = user;
          this.userName = this.formatUserName(user);
          this.userPhotoUrl = this.getUserPhotoUrl(user);
        },
        error: (error) => {
          console.error('❌ Erreur chargement utilisateur:', error);

          // Si erreur 401, déconnecter
          if (error.message.includes('401')) {
            console.error('🔐 Token invalide - Déconnexion');
            this.tokenService.handleTokenExpired();
          } else {
            this.setDefaultUser();
          }
        }
      })
    );
  }

  private setDefaultUser(): void {
    this.userName = 'Utilisateur Logistiks';
    this.userPhotoUrl = this.generateAvatarUrl({ firstName: 'Utilisateur' } as User);
  }

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
   * Construction de l'URL de la photo
   */
  getUserPhotoUrl(user: User): string {
    if (user.photoUrl && user.photoUrl.length === 24) {
      return `${environment.apiUrl}/api/User/photo/${user.photoUrl}`;
    }

    // Si photoUrl est déjà une URL complète
    if (user.photoUrl && user.photoUrl.startsWith('http')) {
      return user.photoUrl;
    }

    // Sinon, générer un avatar
    return this.generateAvatarUrl(user);
  }

  generateAvatarUrl(user: User): string {
    const name = this.formatUserName(user);
    const colors = ['FF6B6B', '4ECDC4', 'FFD166', '06D6A0', '118AB2', 'EF476F', '7209B7', '3A86FF'];
    const colorIndex = name.length % colors.length;

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${colors[colorIndex]}&color=fff&size=128`;
  }

  getUserInitials(): string {
    const name = this.userName;
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }

  getDefaultAvatar(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=696cff&color=fff&size=128`;
  }

  /**
   * Charger les données du tableau de bord
   */
  loadDashboardData(): void {
    this.isLoading = true;
    this.loadTiersStatistics();
    this.loadSimulatedData();
  }

  loadTiersStatistics(): void {
    this.subscriptions.add(
      this.tiersService.getTiersList({
        pageNumber: 1,
        pageSize: 100 // Changé de 1000 à 100
      }).subscribe({
        next: (response) => {

          this.dashboardStats.totalTiers = response.totalCount || response.data?.length || 0;

          // Calculer les statistiques sur la première page
          const firstPageTiers = response.data || [];

          // Statistiques par statut (première page seulement)
          this.dashboardStats.activeTiers = firstPageTiers.filter(t =>
            t.status === TierStatus.Active
          ).length;

          // Statistiques par rôle (première page seulement)
          this.dashboardStats.totalClients = firstPageTiers.filter(t =>
            t.roles?.some(r =>
              r.roleType === TierRoleType.ClientParticulier &&
              r.isActive === true
            )
          ).length;

          this.dashboardStats.totalSuppliers = firstPageTiers.filter(t =>
            t.roles?.some(r =>
              r.roleType === TierRoleType.Supplier &&
              r.isActive === true
            )
          ).length;

          // Documents en attente (première page seulement)
          this.dashboardStats.documentsPending = firstPageTiers.reduce((count, tier) => {
            const pendingDocs = tier.documents?.filter(doc =>
              doc.status === DocumentStatus.Pending
            ).length || 0;
            return count + pendingDocs;
          }, 0);

          // Si nous avons besoin de statistiques exactes, nous pouvons faire des requêtes supplémentaires
          if (response.totalCount > 100) {
            this.loadCompleteTiersStatistics(response.totalCount);
          }

          console.log('📊 Statistiques calculées (page 1):', {
            total: this.dashboardStats.totalTiers,
            active: this.dashboardStats.activeTiers,
            clients: this.dashboardStats.totalClients,
            suppliers: this.dashboardStats.totalSuppliers,
            pendingDocs: this.dashboardStats.documentsPending
          });
        },
        error: (error) => {
          console.error('❌ Erreur chargement des statistiques des tiers:', error);
        }
      })
    );
  }


  loadCompleteTiersStatistics(totalTiers: number): void {
    const totalPages = Math.ceil(totalTiers / 100);
    const requests: Observable<PaginatedResponse<Tier>>[] = [];

    // Créer des requêtes pour toutes les pages
    for (let page = 2; page <= totalPages; page++) {
      requests.push(
        this.tiersService.getTiersList({
          pageNumber: page,
          pageSize: 100
        })
      );
    }

    if (requests.length > 0) {
      forkJoin(requests).subscribe({
        next: (responses) => {
          let allTiers: Tier[] = [];

          responses.forEach(response => {
            if (response.data) {
              allTiers = allTiers.concat(response.data);
            }
          });

          // Recalculer les statistiques exactes
          this.calculateExactStatistics(allTiers);
        },
        error: (error) => {
          console.warn('⚠️ Impossible de charger toutes les pages, utilisation des statistiques partielles');
        }
      });
    }
  }


  calculateExactStatistics(allTiers: Tier[]): void {
    // Statistiques par statut
    this.dashboardStats.activeTiers = allTiers.filter(t =>
      t.status === TierStatus.Active
    ).length;

    // Statistiques par rôle
    this.dashboardStats.totalClients = allTiers.filter(t =>
      t.roles?.some((r: { roleType: TierRoleType; isActive: boolean; }) =>
        r.roleType === TierRoleType.ClientParticulier &&
        r.isActive === true
      )
    ).length;

    this.dashboardStats.totalSuppliers = allTiers.filter(t =>
      t.roles?.some((r: { roleType: TierRoleType; isActive: boolean; }) =>
        r.roleType === TierRoleType.Supplier &&
        r.isActive === true
      )
    ).length;

    // Documents en attente
    this.dashboardStats.documentsPending = allTiers.reduce((count, tier) => {
      const pendingDocs = tier.documents?.filter(doc =>
        doc.status === DocumentStatus.Pending
      ).length || 0;
      return count + pendingDocs;
    }, 0);

    console.log('📊 Statistiques exactes calculées:', {
      total: this.dashboardStats.totalTiers,
      active: this.dashboardStats.activeTiers,
      clients: this.dashboardStats.totalClients,
      suppliers: this.dashboardStats.totalSuppliers,
      pendingDocs: this.dashboardStats.documentsPending
    });
  }



  setDefaultStatistics(): void {
    this.dashboardStats = {
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
  }

  loadSimulatedData(): void {
    setTimeout(() => {
      this.dashboardStats.activeContracts = 15;
      this.dashboardStats.recoveryRate = 85;
      this.dashboardStats.documentsPending = 3;
      this.dashboardStats.paymentsOverdue = 2;
      this.dashboardStats.vehiclesNeedingAttention = 1;
      this.dashboardStats.totalClients = 8;
      this.dashboardStats.totalSuppliers = 5;
    }, 1000);
  }

  toggleMenu(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    if (element && element.parentElement) {
      element.parentElement.classList.toggle('open');
    }
  }

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
        if (this.isMobileView) {
          (layoutPage as HTMLElement).style.marginLeft = '0';
        } else {
          (layoutPage as HTMLElement).style.marginLeft = '280px';
        }
      }
    }
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  @HostListener('document:click', ['$event'])
  closeUserMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-toggle') && !target.closest('.dropdown-menu')) {
      this.showUserMenu = false;
    }
  }

  checkMobileView(): void {
    this.isMobileView = window.innerWidth <= 768;
    if (this.isMobileView) {
      this.isSidebarCollapsed = true;
    }
  }

  getWelcomeMessage(): string {
    const parts = [];

    if (this.dashboardStats.documentsPending > 0) {
      parts.push(`<strong>${this.dashboardStats.documentsPending} document${this.dashboardStats.documentsPending > 1 ? 's' : ''}</strong> attendent votre validation`);
    }

    if (this.dashboardStats.paymentsOverdue > 0) {
      parts.push(`<strong>${this.dashboardStats.paymentsOverdue} paiement${this.dashboardStats.paymentsOverdue > 1 ? 's' : ''}</strong> sont en retard`);
    }

    if (this.dashboardStats.vehiclesNeedingAttention > 0) {
      parts.push(`<strong>${this.dashboardStats.vehiclesNeedingAttention} véhicule${this.dashboardStats.vehiclesNeedingAttention > 1 ? 's' : ''}</strong> nécessitent votre attention`);
    }

    if (parts.length === 0) {
      return 'Bienvenue sur votre tableau de bord Logistiks. Toutes les tâches sont à jour.';
    }

    return `Bienvenue sur votre tableau de bord Logistiks. ${parts.join(', ')} aujourd'hui.`;
  }

  getFormattedNumber(value: number): string {
    return value.toLocaleString('fr-FR');
  }

  getTiersProgress(): number {
    if (this.dashboardStats.totalTiers === 0) return 0;
    return Math.min(100, (this.dashboardStats.activeTiers / this.dashboardStats.totalTiers) * 100);
  }

  getTiersTrend(): number {
    if (this.dashboardStats.activeTiers === 0) return 0;
    return Math.floor(Math.random() * 20) + 5;
  }

  /**
   * Logout
   */
  logout(): void {
    // 1. Nettoyer le localStorage d'abord
    this.tokenService.logout();

    // 2. Appeler l'API de déconnexion (optionnel)
    this.authService.logout().subscribe({
      next: () => {
      },
      error: (error) => {
        console.warn('⚠️ Erreur API déconnexion (ignorée):', error);
      }
    });
  }
}
