import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

const COLLAPSED_KEY = 'iam_sidebar_collapsed';
const COLLAPSED_BODY_CLASS = 'iam-sidebar-collapsed';

/**
 * État partagé de la navigation : tiroir mobile et sidebar desktop repliée.
 * Un seul point de vérité évite les doubles bascules et les états bloqués.
 */
@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private readonly mobileOpenSubject = new BehaviorSubject<boolean>(false);
  private readonly collapsedSubject = new BehaviorSubject<boolean>(this.readCollapsed());

  readonly mobileOpen$: Observable<boolean> = this.mobileOpenSubject.asObservable();
  readonly collapsed$: Observable<boolean> = this.collapsedSubject.asObservable();

  constructor() {
    this.applyCollapsedBodyClass(this.collapsedSubject.value);
  }

  get mobileOpen(): boolean {
    return this.mobileOpenSubject.value;
  }

  get collapsed(): boolean {
    return this.collapsedSubject.value;
  }

  openMobile(): void {
    if (!this.mobileOpenSubject.value) {
      this.mobileOpenSubject.next(true);
    }
  }

  closeMobile(): void {
    if (this.mobileOpenSubject.value) {
      this.mobileOpenSubject.next(false);
    }
  }

  toggleMobile(): void {
    this.mobileOpenSubject.next(!this.mobileOpenSubject.value);
  }

  toggleDesktopCollapse(): void {
    const collapsed = !this.collapsedSubject.value;
    this.collapsedSubject.next(collapsed);
    this.applyCollapsedBodyClass(collapsed);

    try {
      localStorage.setItem(COLLAPSED_KEY, String(collapsed));
    } catch {
      // stockage indisponible : le repli reste valable pour la session courante
    }
  }

  private readCollapsed(): boolean {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private applyCollapsedBodyClass(collapsed: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.classList.toggle(COLLAPSED_BODY_CLASS, collapsed);
  }
}
