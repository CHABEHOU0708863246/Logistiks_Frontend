import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { MenuItemConfig } from '../../models/Menu/Menu-config.model';
import { Menu } from '../../services/Menu/menu';
import { Token } from '../../services/Token/token';
import { CommonModule } from '@angular/common';
import { Permission } from '../../services/Permission/permission';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit, OnDestroy {

  menuItems: MenuItemConfig[] = [];
  isLoading = false;

  dashboardStats = {
    documentsPending: 0,
    paymentsOverdue: 0,
    vehiclesAvailable: 28,
    vehiclesRented: 12,
    vehiclesMaintenance: 5,
    activeContracts: 12,
    expiringContracts: 3
  };

  private subscriptions = new Subscription();

  constructor(
    private menuService: Menu,
    private permissionService: Permission,
    private tokenService: Token,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🔧 Sidebar - Initialisation');
    this.loadMenu();
    this.loadDashboardStats();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Charge le menu depuis l'API
   */
  loadMenu(): void {
    this.isLoading = true;
    console.log('📋 Chargement du menu...');

    // S'abonner au menu
    this.subscriptions.add(
      this.menuService.menu$.subscribe({
        next: (menu) => {
          this.menuItems = menu;
          console.log('✅ Menu chargé:', menu.length, 'items');
          console.log('📊 Détail du menu:', menu);

          // Debug: afficher les permissions de l'utilisateur
          const userPermissions = this.permissionService.getAllPermissions();
          const userRoles = this.permissionService.getAllRoles();
          console.log('👤 Permissions utilisateur:', userPermissions);
          console.log('👤 Rôles utilisateur:', userRoles);

          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Erreur chargement menu:', error);
          this.isLoading = false;
        }
      })
    );

    // Charger le menu si vide
    if (this.menuService.needsRefresh()) {
      console.log('🔄 Rafraîchissement du menu nécessaire');
      this.menuService.loadUserMenu().subscribe({
        next: () => console.log('✅ Menu rafraîchi'),
        error: (err) => console.error('❌ Erreur rafraîchissement:', err)
      });
    }
  }

  /**
   * Charge les statistiques du dashboard
   */
  loadDashboardStats(): void {
    // TODO: Remplacer par de vraies stats depuis l'API
    this.dashboardStats = {
      documentsPending: 3,
      paymentsOverdue: 5,
      vehiclesAvailable: 28,
      vehiclesRented: 12,
      vehiclesMaintenance: 5,
      activeContracts: 12,
      expiringContracts: 3
    };
  }

  /**
   * Toggle un menu item
   */
  toggleMenu(event: MouseEvent): void {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const parentLi = element.closest('.menu-item');

    if (parentLi) {
      parentLi.classList.toggle('open');
    }
  }

  /**
   * ✅ CORRECTION: Vérifie si un menu item est visible
   * L'API backend envoie déjà un menu filtré, donc on fait confiance au backend
   */
  isMenuItemVisible(item: MenuItemConfig): boolean {
    if (!item) {
      console.warn('⚠️ Item menu null ou undefined');
      return false;
    }
    return true;
  }

  /**
   * ✅ CORRECTION: Vérifie si un menu a des sous-items visibles
   */
  hasVisibleSubItems(item: MenuItemConfig): boolean {
    if (!item || !item.subItems || item.subItems.length === 0) {
      return false;
    }

    // ✅ Si le backend a envoyé des sous-items, ils sont visibles
    return item.subItems.length > 0;
  }

  /**
   * ✅ CORRECTION: Récupère les sous-items visibles
   */
  getVisibleSubItems(item: MenuItemConfig): MenuItemConfig[] {
    if (!item || !item.subItems) {
      return [];
    }

    // ✅ Retourner tous les sous-items car le backend a déjà filtré
    return item.subItems;
  }

  /**
   * Déconnexion
   */
  logout(): void {
    console.log('🚪 Déconnexion...');
    this.tokenService.logout();
    this.menuService.clearCache();
    this.permissionService.clearPermissions();
    this.router.navigate(['/auth/login']);
  }

  /**
   * Rafraîchir le menu
   */
  refreshMenu(): void {
    console.log('🔄 Rafraîchissement manuel du menu');
    this.menuService.refresh();
  }
}
