import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { Subscription } from 'rxjs';
import { ConnectivityService } from '../../services/Connectivity/connectivity.service';
import { NotificationService } from '../../services/Notification/notification-service';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Component({
  selector: 'app-pwa-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pwa-status.html',
  styleUrl: './pwa-status.scss'
})
export class PwaStatusComponent implements OnInit, OnDestroy {
  private readonly swUpdate = inject(SwUpdate, { optional: true });
  private readonly connectivity = inject(ConnectivityService);
  private readonly notifications = inject(NotificationService);

  private readonly subscriptions = new Subscription();
  private readonly installDismissKey = 'logistiks_install_dismissed_until';

  isOnline = this.connectivity.isOnline;
  updateAvailable = false;
  showInstallCard = false;
  showIosInstructions = false;

  private installEvent: BeforeInstallPromptEvent | null = null;
  private iosTimer: ReturnType<typeof setTimeout> | null = null;
  private updateTimer: ReturnType<typeof setInterval> | null = null;

  private readonly onOnline = (): void => {
    this.isOnline = true;
  };

  private readonly onOffline = (): void => {
    this.isOnline = false;
  };

  private readonly onBeforeInstallPrompt = (event: Event): void => {
    const promptEvent = event as BeforeInstallPromptEvent;
    promptEvent.preventDefault();
    this.installEvent = promptEvent;
    if (!this.isDismissed()) {
      this.showInstallCard = true;
    }
  };

  private readonly onAppInstalled = (): void => {
    this.showInstallCard = false;
    this.installEvent = null;
  };

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      void this.checkForUpdate();
    }
  };

  private readonly onSubmit = (event: Event): void => {
    if (!this.isOnline) {
      event.preventDefault();
      event.stopPropagation();
      this.notifications.warning(
        'Hors connexion',
        'Cette action nécessite une connexion Internet. Réessayez une fois reconnecté.'
      );
    }
  };

  ngOnInit(): void {
    this.subscriptions.add(
      this.connectivity.isOnline$.subscribe((online) => {
        this.isOnline = online;
      })
    );

    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
    window.addEventListener('beforeinstallprompt', this.onBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', this.onAppInstalled);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    document.addEventListener('submit', this.onSubmit, true);

    if (this.isIos() && !this.isStandalone()) {
      this.iosTimer = setTimeout(() => {
        if (!this.isDismissed()) {
          this.showInstallCard = true;
        }
      }, 1500);
    }

    if (this.swUpdate) {
      this.subscriptions.add(
        this.swUpdate.versionUpdates.subscribe((event) => {
          if (event.type === 'VERSION_READY') {
            this.updateAvailable = true;
          }
        })
      );
      this.subscriptions.add(
        this.swUpdate.unrecoverable.subscribe(() => {
          this.updateAvailable = true;
        })
      );
      void this.checkForUpdate();
      this.updateTimer = setInterval(() => {
        void this.checkForUpdate();
      }, 15 * 60 * 1000);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.iosTimer) {
      clearTimeout(this.iosTimer);
    }
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    if (typeof window === 'undefined') {
      return;
    }
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
    window.removeEventListener('beforeinstallprompt', this.onBeforeInstallPrompt as EventListener);
    window.removeEventListener('appinstalled', this.onAppInstalled);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    document.removeEventListener('submit', this.onSubmit, true);
  }

  async install(): Promise<void> {
    if (this.isIos()) {
      this.showIosInstructions = true;
      return;
    }

    const promptEvent = this.installEvent;
    if (!promptEvent) {
      return;
    }

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;

    if (choice.outcome === 'accepted') {
      this.showInstallCard = false;
    } else {
      this.dismissInstall();
    }

    this.installEvent = null;
  }

  dismissInstall(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        this.installDismissKey,
        String(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );
    }
    this.showInstallCard = false;
  }

  closeIosInstructions(): void {
    this.showIosInstructions = false;
  }

  async reload(): Promise<void> {
    if (this.swUpdate) {
      try {
        await this.swUpdate.activateUpdate();
      } catch {
      }
    }
    document.location.reload();
  }

  private async checkForUpdate(): Promise<void> {
    if (!this.swUpdate || !this.isOnline) {
      return;
    }
    try {
      await this.swUpdate.checkForUpdate();
    } catch {
    }
  }

  private isIos(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }
    return (
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }

  private isStandalone(): boolean {
    const standaloneDisplay =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches;

    const standaloneNavigator =
      typeof navigator !== 'undefined' &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    return standaloneDisplay || standaloneNavigator;
  }

  private isDismissed(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    const until = Number(localStorage.getItem(this.installDismissKey) || 0);
    return until > Date.now();
  }
}
