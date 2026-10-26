import { CommonModule } from "@angular/common";
import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { Auth } from "../../services/Auth/auth";
import { Token } from "../../services/Token/token";
//import { Permissions } from "../../services/Permission/permissions";
import { Permissions } from "../../services/Permission/permissions-with-fallback.service";


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
   * État de réduction de la sidebar
   */
  isCollapsed: boolean = false;

  mobileOpen: boolean = false;

  private readonly onMenuToggleClick = (event: MouseEvent): void => {
    if (!this.isMobileViewport()) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('.menu-toggle-btn')) {
      event.stopPropagation();
      this.toggleMobile();
    }
  };

  constructor(
    private authService: Auth,
    private tokenService: Token,
    private router: Router,
    public permission: Permissions
  ) {}

  ngOnInit(): void {
    // Recharger les permissions au démarrage
    this.permission.reloadPermissions();
    document.addEventListener('click', this.onMenuToggleClick, true);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.onMenuToggleClick, true);
    this.closeMobile();
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMobile();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.isMobileViewport()) {
      this.closeMobile();
    }
  }

  onNavClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('a[href]')) {
      this.closeMobile();
    }
  }

  toggleMobile(): void {
    this.mobileOpen = !this.mobileOpen;
    this.syncBodyScroll();
  }

  closeMobile(): void {
    if (!this.mobileOpen) return;
    this.mobileOpen = false;
    this.syncBodyScroll();
  }

  private syncBodyScroll(): void {
    document.body.style.overflow = this.mobileOpen ? 'hidden' : '';
  }

  private isMobileViewport(): boolean {
    return window.matchMedia('(max-width: 900px)').matches;
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

  /**
   * Vérifie si on est en environnement de production
   */
  private isProduction(): boolean {
    return window.location.hostname !== 'localhost';
  }
}
