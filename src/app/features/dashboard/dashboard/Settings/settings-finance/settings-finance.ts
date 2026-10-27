import { CommonModule } from '@angular/common';
import { buildAvatarDataUrl } from '../../../../../core/utils/avatar';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { environment } from '../../../../../../environments/environment';
import { NotificationComponent } from '../../../../../core/components/notification-component/notification-component';
import { SidebarComponent } from '../../../../../core/components/sidebar-component/sidebar-component';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import {
  SettingField,
  SettingsUpdateRequest,
} from '../../../../../core/models/Settings/settings.models';
import { Auth } from '../../../../../core/services/Auth/auth';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Settings } from '../../../../../core/services/Settings/settings';
import { Token } from '../../../../../core/services/Token/token';

/**
 * Paramètres financiers : pénalités, franchises et tarifs (montants en FCFA).
 */
@Component({
  selector: 'app-settings-finance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NotificationComponent, SidebarComponent],
  templateUrl: './settings-finance.html',
  styleUrl: './settings-finance.scss',
})
export class SettingsFinance implements OnInit, OnDestroy {
  readonly category = 'FINANCE';
  readonly pageTitle = 'Paramètres financiers';
  readonly pageSubtitle = 'Pénalités, franchises et tarifs appliqués aux contrats de location.';
  readonly breadcrumb = 'Paramètres financiers';

  /** Libellés métier (l'ordre définit l'ordre d'affichage). */
  private readonly labels: Record<string, string> = {
    latePaymentFee: 'Pénalité de retard (par échéance)',
    lateFeeGraceDays: 'Jours de grâce avant pénalité',
    damageDeductible: 'Franchise dommage véhicule',
    mileageOverageFee: 'Tarif kilomètre dépassé',
    insuranceDeductible: 'Franchise assurance sinistre',
  };

  /** Champs monétaires : suffixe FCFA et séparateurs de milliers. */
  private readonly moneyKeys: string[] = [
    'latePaymentFee',
    'damageDeductible',
    'mileageOverageFee',
    'insuranceDeductible',
  ];

  fields: SettingField[] = [];
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  lastUpdatedAt: string | null = null;

  currentUser: User | null = null;
  userName = 'Utilisateur';
  userPhotoUrl = '';
  showUserMenu = false;
  isSidebarCollapsed = false;

  private destroy$ = new Subject<void>();

  constructor(
    private settingsService: Settings,
    private notificationService: NotificationService,
    private authService: Auth,
    private tokenService: Token,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkAuthentication();
    this.loadCurrentUser();
    this.loadSettings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════════
  // CHARGEMENT / ENREGISTREMENT
  // ═══════════════════════════════════════════

  loadSettings(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.settingsService
      .getByCategory(this.category)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.applySettings(response.data ?? []);
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = err.message ?? 'Erreur lors du chargement des paramètres';
          this.isLoading = false;
        },
      });
  }

  save(): void {
    if (this.isSaving || this.fields.length === 0) return;

    this.isSaving = true;

    const updates: SettingsUpdateRequest[] = this.fields.map((field) => ({
      category: this.category,
      key: field.key,
      value: field.inputType === 'boolean' ? String(field.boolValue) : String(field.value ?? ''),
    }));

    this.settingsService
      .updateBatch(updates)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSaving = false;

          if (!response.success) {
            this.notificationService.error(
              'Enregistrement refusé',
              response.message ?? 'Mise à jour refusée par le serveur'
            );
            return;
          }

          this.applySettings(response.data ?? []);
          this.notificationService.success(
            'Paramètres enregistrés',
            'Les paramètres financiers ont été mis à jour.'
          );
        },
        error: (err) => {
          this.isSaving = false;
          this.notificationService.error(
            'Erreur',
            err.message ?? "Échec de l'enregistrement des paramètres"
          );
        },
      });
  }

  /**
   * Recharge les valeurs du serveur (annule les modifications non enregistrées).
   */
  reset(): void {
    this.loadSettings();
    this.notificationService.info('Valeurs rechargées', 'Les dernières valeurs enregistrées ont été restaurées.');
  }

  // ═══════════════════════════════════════════
  // HELPERS D'AFFICHAGE
  // ═══════════════════════════════════════════

  toNumber(value: string): number {
    const parsed = Number(String(value ?? '').replace(/\s/g, '').replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  }

  private applySettings(settings: { key: string; value: string; dataType: string; description?: string | null; updatedAt?: string | null }[]): void {
    this.fields = settings
      .map((setting) => this.toField(setting))
      .sort((a, b) => this.orderIndex(a.key) - this.orderIndex(b.key));

    const dates = settings
      .map((setting) => setting.updatedAt)
      .filter((date): date is string => !!date)
      .sort();

    this.lastUpdatedAt = dates.length > 0 ? dates[dates.length - 1] : null;
  }

  private toField(setting: { key: string; value: string; dataType: string; description?: string | null }): SettingField {
    const inputType = this.inputTypeFor(setting.dataType);
    return {
      key: setting.key,
      label: this.labels[setting.key] ?? setting.key,
      value: setting.value ?? '',
      boolValue: (setting.value ?? '').toLowerCase() === 'true',
      dataType: setting.dataType,
      description: setting.description ?? '',
      inputType,
      isMoney: this.moneyKeys.includes(setting.key),
    };
  }

  private inputTypeFor(dataType: string): 'text' | 'number' | 'boolean' {
    switch ((dataType ?? '').toLowerCase()) {
      case 'integer':
      case 'decimal':
        return 'number';
      case 'boolean':
        return 'boolean';
      default:
        return 'text';
    }
  }

  private orderIndex(key: string): number {
    const index = Object.keys(this.labels).indexOf(key);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  }

  // ═══════════════════════════════════════════
  // AUTH & UTILISATEUR
  // ═══════════════════════════════════════════

  private checkAuthentication(): void {
    if (!this.tokenService.getToken()) {
      this.router.navigate(['/auth/login']);
    }
  }

  loadCurrentUser(): void {
    this.authService
      .getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: User) => {
          this.currentUser = user;
          this.userName = this.formatUserName(user);
          this.userPhotoUrl = this.getUserPhotoUrl(user);
        },
        error: (err) => {
          if (err.status === 401) this.tokenService.handleTokenExpired();
          else this.userName = 'Utilisateur';
        },
      });
  }

  formatUserName(user: any): string {
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    if (user.username) return user.username;
    if (user.email) return user.email.split('@')[0];
    return 'Utilisateur';
  }

  getUserPhotoUrl(user: User): string {
    if (user.photoUrl && /^[0-9a-fA-F]{24}$/.test(user.photoUrl))
      return `${environment.apiUrl}/api/User/photo/${user.photoUrl}`;
    if (user.photoUrl?.startsWith('http')) return user.photoUrl;
    return this.getDefaultAvatar();
  }

  getDefaultAvatar(): string {
    return buildAvatarDataUrl(this.userName, '696cff');
  }

  getUserInitials(): string {
    const parts = this.userName.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return this.userName.charAt(0).toUpperCase();
  }

  // ═══════════════════════════════════════════
  // UI
  // ═══════════════════════════════════════════

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  @HostListener('document:click', ['$event'])
  closeUserMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-toggle') && !target.closest('.dropdown-menu')) {
      this.showUserMenu = false;
    }
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  logout(): void {
    this.tokenService.logout();
    this.authService
      .logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.router.navigate(['/auth/login']),
        error: () => this.router.navigate(['/auth/login']),
      });
  }
}
