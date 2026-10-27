import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationStart, Router, RouterModule } from '@angular/router';
import { Subject, Subscription, filter } from 'rxjs';
import { Auth } from '../../services/Auth/auth';
import { NavigationService } from '../../services/Navigation/navigation.service';
import { Permissions } from '../../services/Permission/permissions.service';
import { Token } from '../../services/Token/token';

@Component({
  selector: 'app-sidebar-component',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar-component.html',
  styleUrl: './sidebar-component.scss',
})
export class SidebarComponent implements OnInit, OnDestroy {
  @ViewChild('sidebar', { static: true })
  private sidebarRef?: ElementRef<HTMLElement>;

  private readonly destroy$ = new Subject<void>();
  private readonly subscriptions = new Subscription();
  private previouslyFocused: HTMLElement | null = null;

  isCollapsed = false;
  mobileOpen = false;
  isMobileViewport = false;

  constructor(
    private authService: Auth,
    private tokenService: Token,
    private router: Router,
    public permission: Permissions,
    public navigation: NavigationService
  ) {}

  ngOnInit(): void {
    this.permission.reloadPermissions();
    this.isMobileViewport = this.matchesMobileViewport();

    this.subscriptions.add(
      this.navigation.collapsed$.subscribe((collapsed) => {
        this.isCollapsed = collapsed;
      })
    );

    this.subscriptions.add(
      this.navigation.mobileOpen$.subscribe((open) => this.applyMobileState(open))
    );

    this.subscriptions.add(
      this.router.events
        .pipe(filter((event): event is NavigationStart => event instanceof NavigationStart))
        .subscribe(() => this.navigation.closeMobile())
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
    this.unlockPageScroll();
    this.navigation.closeMobile();
  }

  @HostListener('window:resize')
  onResize(): void {
    const wasMobile = this.isMobileViewport;
    this.isMobileViewport = this.matchesMobileViewport();

    if (wasMobile && !this.isMobileViewport) {
      this.navigation.closeMobile();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.mobileOpen) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMobile();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const container = this.sidebarRef?.nativeElement;
    if (!container) {
      return;
    }

    const focusables = this.focusableElements(container);
    if (focusables.length === 0) {
      event.preventDefault();
      container.focus();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && (active === first || !container.contains(active))) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && (active === last || !container.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  openMobile(): void {
    this.navigation.openMobile();
  }

  toggleMobile(): void {
    this.navigation.toggleMobile();
  }

  closeMobile(): void {
    this.navigation.closeMobile();
  }

  onNavClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('a[href]')) {
      this.closeMobile();
    }
  }

  onCollapseButton(): void {
    if (this.isMobileViewport) {
      this.closeMobile();
      return;
    }

    this.navigation.toggleDesktopCollapse();
  }

  onBrandClick(): void {
    if (!this.isMobileViewport && this.isCollapsed) {
      this.navigation.toggleDesktopCollapse();
    }
  }

  /**
   * Bascule l'état d'un sous-menu.
   */
  toggleMenu(event: MouseEvent): void {
    event.preventDefault();

    if (this.isCollapsed && !this.isMobileViewport) {
      this.navigation.toggleDesktopCollapse();
      return;
    }

    const element = event.currentTarget as HTMLElement;
    if (element && element.parentElement) {
      element.parentElement.classList.toggle('open');
    }
  }

  /**
   * Déconnexion : révocation côté serveur puis nettoyage local.
   */
  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.tokenService.logout(),
      error: () => this.tokenService.logout(),
    });
  }

  private applyMobileState(open: boolean): void {
    if (open && !this.isMobileViewport) {
      this.navigation.closeMobile();
      return;
    }

    const container = this.sidebarRef?.nativeElement;

    if (open) {
      this.previouslyFocused =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      this.mobileOpen = true;
      this.lockPageScroll();

      const focusFirst = (): void => {
        if (!this.mobileOpen) {
          return;
        }

        const focusables = container ? this.focusableElements(container) : [];
        (focusables[0] ?? container)?.focus();
      };

      // Le clic qui a ouvert le tiroir peut reprendre le focus après le handler.
      // On attend la fin du rendu, puis on vérifie que le focus est bien dedans.
      setTimeout(() => {
        focusFirst();
        if (document.activeElement?.closest('#sidebar') === null) {
          setTimeout(focusFirst, 50);
        }
      }, 0);
      return;
    }

    this.mobileOpen = false;
    this.unlockPageScroll();

    if (this.previouslyFocused?.isConnected) {
      this.previouslyFocused.focus();
    }
    this.previouslyFocused = null;
  }

  private lockPageScroll(): void {
    document.body.classList.add('iam-nav-open');
  }

  private unlockPageScroll(): void {
    document.body.classList.remove('iam-nav-open');
  }

  private matchesMobileViewport(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    if (typeof window.matchMedia === 'function') {
      return window.matchMedia('(max-width: 900px)').matches;
    }

    return window.innerWidth <= 900;
  }

  private focusableElements(container: HTMLElement): HTMLElement[] {
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
      (element) => element.getClientRects().length > 0 && !element.hasAttribute('hidden')
    );
  }
}
