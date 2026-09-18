import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// ============================================================================
// CORE IMPORTS
// ============================================================================
import { SidebarComponent } from '../../../../../core/components/sidebar-component/sidebar-component';
import { ContractStatus } from '../../../../../core/models/Enums/Logistiks-enums';
import {
  ContractMonthlyPoint,
  ContractStatEntry,
  ContractStatisticsDetailResponse,
  ContractStatisticsResponse,
} from '../../../../../core/models/Contracts/contract-statistics.models';
import { ContractStatisticsService } from '../../../../../core/services/Contract/contract-statistics';

/** Périodes prédéfinies du sélecteur. */
type PeriodPreset = 'month' | 'quarter' | 'year' | 'custom';

interface VehicleOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-contrat-statistics',
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './contrat-statistics.html',
  styleUrl: './contrat-statistics.scss',
})
export class ContratStatistics implements OnInit, OnDestroy {
  // ============================================================================
  // ÉTAT PRINCIPAL
  // ============================================================================

  stats: ContractStatisticsResponse | null = null;
  isLoading = false;
  errorMessage: string | null = null;

  // ============================================================================
  // FILTRES
  // ============================================================================

  periodPreset: PeriodPreset = 'month';
  periodStart = '';
  periodEnd = '';

  selectedVehicleId = '';
  selectedStatus: ContractStatus | '' = '';

  vehicleOptions: VehicleOption[] = [];
  private vehicleOptionMap = new Map<string, string>();

  readonly statusOptions: { value: ContractStatus; label: string }[] = [
    { value: ContractStatus.Pending, label: 'En attente' },
    { value: ContractStatus.Active, label: 'Actif' },
    { value: ContractStatus.Suspended, label: 'Suspendu' },
    { value: ContractStatus.Completed, label: 'Terminé' },
    { value: ContractStatus.Terminated, label: 'Résilié' },
    { value: ContractStatus.Assigned, label: 'Assigné' },
  ];

  // ============================================================================
  // MODALE DE DÉTAIL
  // ============================================================================

  showDetailModal = false;
  detailLoading = false;
  detailError: string | null = null;
  detail: ContractStatisticsDetailResponse | null = null;
  detailContractNumber = '';

  private destroy$ = new Subject<void>();

  constructor(private statisticsService: ContractStatisticsService) {}

  ngOnInit(): void {
    this.setPreset('month');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // PÉRIODE
  // ============================================================================

  setPreset(preset: PeriodPreset): void {
    this.periodPreset = preset;

    const today = new Date();
    switch (preset) {
      case 'month':
        this.periodStart = this.toDateInput(new Date(today.getFullYear(), today.getMonth(), 1));
        this.periodEnd = this.toDateInput(today);
        this.loadStatistics();
        break;
      case 'quarter': {
        const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
        this.periodStart = this.toDateInput(new Date(today.getFullYear(), quarterStartMonth, 1));
        this.periodEnd = this.toDateInput(today);
        this.loadStatistics();
        break;
      }
      case 'year':
        this.periodStart = this.toDateInput(new Date(today.getFullYear(), 0, 1));
        this.periodEnd = this.toDateInput(today);
        this.loadStatistics();
        break;
      case 'custom':
        break;
    }
  }

  onCustomDateChange(): void {
    if (this.periodPreset !== 'custom') {
      return;
    }
    if (this.periodStart && this.periodEnd) {
      this.loadStatistics();
    }
  }

  onVehicleChange(): void {
    this.loadStatistics();
  }

  onStatusChange(): void {
    this.loadStatistics();
  }

  refresh(): void {
    this.loadStatistics();
  }

  // ============================================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================================

  loadStatistics(): void {
    const start = this.parseDate(this.periodStart);
    const end = this.parseDate(this.periodEnd);

    if (!start || !end) {
      this.errorMessage = 'Période invalide';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.statisticsService
      .getStatistics(
        start,
        end,
        this.selectedVehicleId || undefined,
        undefined,
        this.selectedStatus === '' ? null : this.selectedStatus
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.stats = response.data;
            this.mergeVehicleOptions(response.data.contracts ?? []);
          } else {
            this.stats = null;
            this.errorMessage = response.message || 'Impossible de charger les statistiques';
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur chargement statistiques contrats:', error);
          this.stats = null;
          this.errorMessage = error?.message || 'Impossible de charger les statistiques';
          this.isLoading = false;
        },
      });
  }

  /**
   * Options véhicule cumulées : un filtre actif ne doit pas vider la liste.
   */
  private mergeVehicleOptions(contracts: ContractStatEntry[]): void {
    contracts.forEach((contract) => {
      if (contract.vehicleId && !this.vehicleOptionMap.has(contract.vehicleId)) {
        const label = contract.vehicleCode
          ? `${contract.vehicleCode} · ${contract.vehicleName}`
          : contract.vehicleName || contract.vehicleId;
        this.vehicleOptionMap.set(contract.vehicleId, label);
      }
    });

    this.vehicleOptions = Array.from(this.vehicleOptionMap.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }

  // ============================================================================
  // MODALE DE DÉTAIL
  // ============================================================================

  openDetail(entry: ContractStatEntry): void {
    const start = this.parseDate(this.periodStart);
    const end = this.parseDate(this.periodEnd);

    this.showDetailModal = true;
    this.detailLoading = true;
    this.detailError = null;
    this.detail = null;
    this.detailContractNumber = entry.contractNumber;

    if (!start || !end) {
      this.detailLoading = false;
      this.detailError = 'Période invalide';
      return;
    }

    this.statisticsService
      .getContractStatistics(entry.contractId, start, end)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.detail = response.data;
          } else {
            this.detailError = response.message || 'Impossible de charger le détail du contrat';
          }
          this.detailLoading = false;
        },
        error: (error) => {
          console.error('Erreur chargement détail contrat:', error);
          this.detailError = error?.message || 'Impossible de charger le détail du contrat';
          this.detailLoading = false;
        },
      });
  }

  closeDetail(): void {
    this.showDetailModal = false;
    this.detail = null;
    this.detailError = null;
  }

  // ============================================================================
  // AFFICHAGE
  // ============================================================================

  formatAmount(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)} FCFA`;
  }

  formatPercent(value: number, applicable = true): string {
    if (!applicable) {
      return '—';
    }
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value)} %`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    return isNaN(date.getTime())
      ? '—'
      : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }

  formatShortDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    return isNaN(date.getTime())
      ? '—'
      : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(date);
  }

  /** Montant compact pour les étiquettes du mini-graphe (k / M). */
  compactAmount(value: number): string {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`;
    if (abs >= 1_000) return `${Math.round(value / 1_000)} k`;
    return `${Math.round(value)}`;
  }

  monthShort(label: string): string {
    return label ? label.slice(0, 3) : '';
  }

  statusClass(status: number): string {
    switch (status) {
      case ContractStatus.Active:
        return 'st-active';
      case ContractStatus.Completed:
        return 'st-completed';
      case ContractStatus.Terminated:
        return 'st-terminated';
      case ContractStatus.Suspended:
        return 'st-suspended';
      default:
        return 'st-pending';
    }
  }

  installmentStatusClass(effectiveStatus: number): string {
    switch (effectiveStatus) {
      case 2:
        return 'st-paid';
      case 3:
        return 'st-late';
      case 4:
        return 'st-missed';
      case 5:
        return 'st-partial';
      case 6:
        return 'st-cancelled';
      default:
        return 'st-pending';
    }
  }

  collectionClass(entry: ContractStatEntry): string {
    if (!entry.collectionRateApplicable) {
      return 'rate-none';
    }
    if (entry.collectionRatePercent >= 80) {
      return 'rate-good';
    }
    if (entry.collectionRatePercent >= 60) {
      return 'rate-mid';
    }
    return 'rate-bad';
  }

  performanceClass(level: string): string {
    switch (level) {
      case 'Excellent':
        return 'perf-excellent';
      case 'Bon':
        return 'perf-bon';
      case 'À surveiller':
        return 'perf-watch';
      default:
        return 'perf-risky';
    }
  }

  // ============================================================================
  // MINI-GRAPHE MENSUEL
  // ============================================================================

  get monthlyMax(): number {
    if (!this.detail?.monthly?.length) {
      return 0;
    }
    return this.detail.monthly.reduce(
      (max, point) => Math.max(max, point.revenue, point.expenses),
      0
    );
  }

  barPercent(value: number): number {
    const max = this.monthlyMax;
    if (max <= 0 || value <= 0) {
      return 0;
    }
    return Math.max(4, Math.round((value / max) * 100));
  }

  monthlyLabel(point: ContractMonthlyPoint): string {
    return `${point.monthLabel} ${point.year}`;
  }

  // ============================================================================
  // OUTILS
  // ============================================================================

  private toDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseDate(value: string): Date | null {
    if (!value) {
      return null;
    }
    const parts = value.split('-').map(Number);
    if (parts.length !== 3 || parts.some((part) => isNaN(part))) {
      return null;
    }
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
}
