

// ═══════════════════════════════════════════════════════════
// ENTITÉ PRINCIPALE (mapping MongoDB)
// ═══════════════════════════════════════════════════════════

import { ReportType, ReportStatus, ExportFormat, ReportScheduleFrequency } from "../Enums/Logistiks-enums";
import { MonthlyActivityResult, VehicleRoiDetailResult, ExpenseByCategoryResult, ExpiringContractsResult, ClientPaymentHistoryResult, OverduePaymentsResult, FleetUtilizationResult, MaintenanceSummaryResult, InsuranceExpiryResult, PeriodComparisonResult } from "./report-results.models";

export interface Report {
  id: string;
  reportNumber: string;
  type: ReportType;
  title: string;
  description: string;

  // Périmètre
  periodStart: string;   // ISO 8601
  periodEnd: string;
  vehicleId?: string;
  customerId?: string;

  // Statut
  status: ReportStatus;
  errorMessage?: string;

  // Résultat
  resultJson?: string;
  resultRowCount: number;
  exportFileId?: string;
  exportFileName?: string;
  exportFormat?: ExportFormat;

  // Planification
  isScheduled: boolean;
  scheduleFrequency?: ReportScheduleFrequency;
  nextScheduledAt?: string;
  lastScheduledAt?: string;

  // Audit
  createdBy: string;
  createdAt: string;
  generatedAt?: string;
  updatedAt?: string;
  executionTimeMs?: number;
  isDeleted: boolean;
}

// ═══════════════════════════════════════════════════════════
// DTOs (réponses API)
// ═══════════════════════════════════════════════════════════

/** DTO liste — sans les données de résultat */
export interface ReportDto {
  id: string;
  reportNumber: string;
  type: ReportType;
  typeLabel: string;
  title: string;
  description: string;

  periodStart: string;
  periodEnd: string;
  periodLabel: string;

  vehicleId?: string;
  vehicleName?: string;
  customerId?: string;
  customerName?: string;

  status: ReportStatus;
  statusLabel: string;
  errorMessage?: string;

  resultRowCount: number;
  exportFileName?: string;
  exportFormat?: ExportFormat;

  isScheduled: boolean;
  scheduleFrequency?: ReportScheduleFrequency;
  nextScheduledAt?: string;

  createdBy: string;
  createdAt: string;
  generatedAt?: string;
  executionTimeMs?: number;
}

/**
 * DTO complet — inclut les données du rapport désérialisées.
 * ResultData est typé selon ReportType via le type union ReportResultData.
 */
export interface ReportResultDto extends ReportDto {
  resultData?: ReportResultData;
}

/**
 * Union discriminante : chaque type de rapport a sa propre structure.
 * Utilisé pour typer resultData dans ReportResultDto.
 */
export type ReportResultData =
  | MonthlyActivityResult
  | VehicleRoiDetailResult
  | ExpenseByCategoryResult
  | ExpiringContractsResult
  | ClientPaymentHistoryResult
  | OverduePaymentsResult
  | FleetUtilizationResult
  | MaintenanceSummaryResult
  | InsuranceExpiryResult
  | PeriodComparisonResult;
