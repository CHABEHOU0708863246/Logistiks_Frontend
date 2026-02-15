import { Component, OnDestroy, OnInit } from '@angular/core';
import { Auth } from '../../services/Auth/auth';
import { Token } from '../../services/Token/token';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar-component',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar-component.html',
  styleUrl: './sidebar-component.scss',
})
export class SidebarComponent implements OnInit, OnDestroy {

  /**
   * Subject pour la gestion de la destruction des observables
   */
  private destroy$ = new Subject<void>();

  /**
   * État de réduction de la sidebar (peut être contrôlé par le parent)
   */
  isCollapsed: boolean = false;

  constructor(
    private authService: Auth,
    private tokenService: Token,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initialisation si nécessaire
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Bascule l'état d'ouverture d'un menu
   */
  toggleMenu(event: MouseEvent): void {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    if (element && element.parentElement) {
      element.parentElement.classList.toggle('open');
    }
  }

  /**
   * Gère le processus de déconnexion
   */
  logout(): void {
    console.log('🚪 Déconnexion en cours...');
    this.tokenService.logout();

    this.authService
      .logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Déconnexion API réussie');
          this.router.navigate(['/auth/login']);
        },
        error: (error) => {
          console.warn('⚠️ Erreur API déconnexion (ignorée):', error);
          this.router.navigate(['/auth/login']);
        }
      });
  }

  /**
   * Bascule l'état de réduction de la sidebar
   */
  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }
}

