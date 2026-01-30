import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { Token } from '../../services/Token/token';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit, OnDestroy {

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
    private tokenService: Token,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🔧 Sidebar - Initialisation');
    this.loadDashboardStats();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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
   * Déconnexion
   */
  logout(): void {
    console.log('🚪 Déconnexion...');
    this.tokenService.logout();
    this.router.navigate(['/auth/login']);
  }

}
