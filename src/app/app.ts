import { AfterViewInit, Component, Inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MobileBottomNavComponent } from './core/components/mobile-bottom-nav/mobile-bottom-nav';
import { MobileHeaderComponent } from './core/components/mobile-header/mobile-header';
import { PwaStatusComponent } from './core/components/pwa-status/pwa-status';
import { MobileDomService } from './core/services/MobileDom/mobile-dom.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PwaStatusComponent, MobileHeaderComponent, MobileBottomNavComponent],
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, AfterViewInit {
  protected readonly title = signal('Logistiks_Frontend');
  protected readonly isDashboard = signal(false);

  constructor(
    private readonly mobileDom: MobileDomService,
    private readonly router: Router,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
    this.isDashboard.set(this.router.url.startsWith('/dashboard'));
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.mobileDom.start();
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.isDashboard.set(event.urlAfterRedirects.startsWith('/dashboard')));
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const splash = document.getElementById('iam-splash');
    if (!splash) {
      return;
    }

    splash.classList.add('is-ready');
    splash.setAttribute('aria-hidden', 'true');
    setTimeout(() => splash.remove(), 350);
  }
}
