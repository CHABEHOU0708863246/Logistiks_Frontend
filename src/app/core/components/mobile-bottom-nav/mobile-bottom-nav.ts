import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { NavigationService } from '../../services/Navigation/navigation.service';
import { Permissions } from '../../services/Permission/permissions.service';

@Component({
  selector: 'app-mobile-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    @if (isDashboard) {
      <nav class="mobile-bottom-nav" aria-label="Navigation mobile">
        <a
          class="mobile-bottom-nav__item"
          routerLink="/dashboard"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          aria-label="Accueil"
        >
          <i class="bx bxs-dashboard"></i>
          <span>Accueil</span>
        </a>

        @if (permissions.canViewContracts()) {
          <a
            class="mobile-bottom-nav__item"
            routerLink="/dashboard/contrats/list"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            aria-label="Contrats"
          >
            <i class="bx bx-file-blank"></i>
            <span>Contrats</span>
          </a>
        }

        @if (permissions.canRecordPayments()) {
          <a
            class="mobile-bottom-nav__item mobile-bottom-nav__item--primary"
            routerLink="/dashboard/finances/transactions/nouvelle"
            [queryParams]="{ type: 'revenue' }"
            routerLinkActive="active"
            aria-label="Encaisser — enregistrer un paiement"
          >
            <span class="mobile-bottom-nav__primary-icon">
              <i class="bx bx-dollar-circle"></i>
            </span>
            <span>Encaisser</span>
          </a>
        }

        @if (permissions.canViewTiers()) {
          <a
            class="mobile-bottom-nav__item"
            routerLink="/dashboard/tiers/list"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            aria-label="Tiers"
          >
            <i class="bx bx-group"></i>
            <span>Tiers</span>
          </a>
        }

        <button
          type="button"
          class="mobile-bottom-nav__item mobile-bottom-nav__item--button"
          aria-label="Plus de navigation"
          aria-controls="sidebar"
          [attr.aria-expanded]="navigation.mobileOpen"
          (click)="openMore()"
        >
          <i class="bx bx-menu-alt-right"></i>
          <span>Plus</span>
        </button>
      </nav>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .mobile-bottom-nav {
        position: fixed;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 1000;
        display: flex;
        align-items: stretch;
        box-sizing: border-box;
        height: calc(64px + env(safe-area-inset-bottom, 0px));
        padding: 0 max(4px, env(safe-area-inset-right, 0px)) env(safe-area-inset-bottom, 0px) max(4px, env(safe-area-inset-left, 0px));
        background: #ffffff;
        border-top: 1px solid #e5e7eb;
        box-shadow: 0 -4px 20px rgba(15, 13, 43, 0.08);
      }

      .mobile-bottom-nav__item {
        display: flex;
        flex: 1 1 0;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        min-width: 0;
        min-height: 44px;
        padding: 6px 2px;
        border: 0;
        background: transparent;
        color: #6b7280;
        font-family: 'Public Sans', sans-serif;
        font-size: 10.5px;
        font-weight: 600;
        line-height: 1;
        text-decoration: none;
        cursor: pointer;
      }

      .mobile-bottom-nav__item i {
        font-size: 21px;
      }

      .mobile-bottom-nav__item span:last-child {
        overflow: hidden;
        max-width: 100%;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .mobile-bottom-nav__item.active {
        color: #696cff;
      }

      .mobile-bottom-nav__item:focus-visible {
        outline: 2px solid #696cff;
        outline-offset: -2px;
        border-radius: 10px;
      }

      .mobile-bottom-nav__item--primary {
        position: relative;
        top: -14px;
        justify-content: flex-end;
        padding-bottom: 4px;
      }

      .mobile-bottom-nav__primary-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 52px;
        height: 52px;
        margin-bottom: 1px;
        border-radius: 50%;
        background: #696cff;
        color: #ffffff;
        box-shadow: 0 8px 18px rgba(105, 108, 255, 0.42);
      }

      .mobile-bottom-nav__primary-icon i {
        font-size: 24px;
      }

      .mobile-bottom-nav__item--primary span:last-child {
        color: #3c3489;
      }

      .mobile-bottom-nav__item--primary.active .mobile-bottom-nav__primary-icon {
        background: #3c3489;
      }

      .mobile-bottom-nav__item--button {
        appearance: none;
      }

      @media (min-width: 901px) {
        .mobile-bottom-nav {
          display: none;
        }
      }
    `,
  ],
})
export class MobileBottomNavComponent implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();
  isDashboard = false;

  constructor(
    private readonly router: Router,
    public readonly permissions: Permissions,
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

  openMore(): void {
    this.navigation.openMobile();
  }

  private update(): void {
    this.isDashboard = this.router.url.startsWith('/dashboard');
  }
}
