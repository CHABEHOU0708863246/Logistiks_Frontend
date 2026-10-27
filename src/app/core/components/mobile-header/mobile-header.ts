import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { NavigationService } from '../../services/Navigation/navigation.service';

const SECTION_TITLES: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/dashboard/analytics': 'Analyses & KPIs',
  '/dashboard/tiers': 'Tiers',
  '/dashboard/vehicules': 'Véhicules',
  '/dashboard/documents': 'Documents',
  '/dashboard/contrats': 'Contrats',
  '/dashboard/finances': 'Finances',
  '/dashboard/rapports': 'Rapports',
  '/dashboard/rentabilite': 'Rentabilité',
  '/dashboard/users': 'Utilisateurs',
  '/dashboard/settings': 'Paramètres',
  '/dashboard/audit': 'Audit',
  '/dashboard/profiles': 'Mon profil',
  '/dashboard/about': 'À propos',
};

@Component({
  selector: 'app-mobile-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (isDashboard) {
      <header class="mobile-header">
        <button
          type="button"
          class="mobile-header__icon"
          aria-label="Ouvrir le menu"
          aria-controls="sidebar"
          [attr.aria-expanded]="navigation.mobileOpen"
          (click)="openMenu()"
        >
          <i class="bx bx-menu"></i>
        </button>

        @if (showBack) {
          <button
            type="button"
            class="mobile-header__icon"
            aria-label="Retour"
            (click)="goBack()"
          >
            <i class="bx bx-arrow-back"></i>
          </button>
        }

        <div class="mobile-header__title" role="heading" aria-level="1" [title]="title">
          {{ title }}
        </div>

        <a
          class="mobile-header__icon mobile-header__profile"
          routerLink="/dashboard/profiles"
          aria-label="Mon profil"
        >
          <i class="bx bx-user-circle"></i>
        </a>
      </header>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .mobile-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 4px;
        box-sizing: border-box;
        height: calc(56px + env(safe-area-inset-top, 0px));
        padding: env(safe-area-inset-top, 0px) max(8px, env(safe-area-inset-right, 0px)) 0 max(8px, env(safe-area-inset-left, 0px));
        background: #ffffff;
        border-bottom: 1px solid #e5e7eb;
        box-shadow: 0 2px 12px rgba(15, 13, 43, 0.06);
      }

      .mobile-header__icon {
        display: inline-flex;
        flex: 0 0 44px;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        padding: 0;
        border: 0;
        border-radius: 12px;
        background: transparent;
        color: #4b5563;
        font-size: 22px;
        text-decoration: none;
        cursor: pointer;
      }

      .mobile-header__icon:hover {
        background: #f3f4f6;
        color: #111827;
      }

      .mobile-header__icon:focus-visible {
        outline: 2px solid #696cff;
        outline-offset: 2px;
      }

      .mobile-header__title {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        color: #111827;
        font-size: 15px;
        font-weight: 700;
        line-height: 1.2;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .mobile-header__profile {
        color: #696cff;
        font-size: 24px;
      }

      @media (min-width: 901px) {
        .mobile-header {
          display: none;
        }
      }
    `,
  ],
})
export class MobileHeaderComponent implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();

  isDashboard = false;
  showBack = false;
  title = 'Tableau de bord';

  constructor(
    private readonly router: Router,
    public readonly navigation: NavigationService
  ) {}

  ngOnInit(): void {
    this.update();
    this.subscriptions.add(
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(() => this.update())
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  openMenu(): void {
    this.navigation.openMobile();
  }

  goBack(): void {
    const path = this.router.url.split('?')[0];
    if (path === '/dashboard' || window.history.length <= 1) {
      void this.router.navigate(['/dashboard']);
      return;
    }

    window.history.back();
  }

  private update(): void {
    const path = this.router.url.split('?')[0];
    this.isDashboard = path.startsWith('/dashboard');
    this.showBack = this.isDashboard && path !== '/dashboard';

    if (!this.isDashboard) {
      return;
    }

    let route = this.router.routerState.root;
    while (route.firstChild) {
      route = route.firstChild;
    }

    const data = route.snapshot.data;
    const queryType = route.snapshot.queryParamMap.get('type');
    const leafTitle = (data?.['title'] ?? data?.['breadcrumb']) as string | undefined;

    if (path === '/dashboard/finances/transactions/nouvelle' && queryType === 'revenue') {
      this.title = 'Encaisser';
      return;
    }

    this.title = leafTitle?.trim() || this.sectionTitle(path);
  }

  private sectionTitle(path: string): string {
    const section = Object.keys(SECTION_TITLES)
      .filter((prefix) => path === prefix || path.startsWith(`${prefix}/`))
      .sort((a, b) => b.length - a.length)[0];

    return section ? SECTION_TITLES[section] : 'LOGISTIK';
  }
}
