
// ═══════════════════════════════════════════════════════════
// REQUÊTES API — DTOs d'entrée
// ═══════════════════════════════════════════════════════════

import { ReportType, ExportFormat, ReportScheduleFrequency } from "../Enums/Logistiks-enums";

/** POST /reports/generate — point d'entrée universel */
export interface GenerateReportRequest {
  type: ReportType;

  /** Début de la période. Défaut API : 1er du mois en cours */
  periodStart?: string;  // ISO 8601

  /** Fin de la période. Défaut API : aujourd'hui */
  periodEnd?: string;

  /**
   * Filtre véhicule optionnel.
   * Requis pour : VehicleRoiDetail
   * Optionnel pour : ExpenseByCategory, FleetUtilization, MaintenanceSummary
   */
  vehicleId?: string;

  /**
   * Filtre client optionnel.
   * Requis pour : ClientPaymentHistory
   */
  customerId?: string;

  /**
   * Seuil en jours pour les rapports d'alerte.
   * Utilisé par : ExpiringContracts, InsuranceExpiry (défaut : 30)
   */
  daysThreshold?: number;

  /** Format d'export. Si absent : retourne uniquement le JSON */
  exportFormat?: ExportFormat;
}

/** POST /reports/compare — comparaison de deux périodes */
export interface ComparePeriodReportRequest {
  periodAStart: string;  // ISO 8601
  periodAEnd: string;
  periodBStart: string;
  periodBEnd: string;

  /** Null = comparaison sur toute la flotte */
  vehicleId?: string;
}

/** POST /reports/schedule — planification automatique */
export interface ScheduleReportRequest {
  type: ReportType;
  frequency: ReportScheduleFrequency;
  exportFormat: ExportFormat;
  vehicleId?: string;
  customerId?: string;
  daysThreshold?: number;

  /** Date de la première exécution. Défaut : maintenant */
  firstExecutionAt: string;  // ISO 8601
}

// ── Paramètres de requête GET (query params) ──────────────

export interface ReportSearchParams {
  type?: ReportType;
  status?: number;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface PeriodParams {
  periodStart?: string;
  periodEnd?: string;
}

export interface ThresholdParams {
  daysThreshold?: number;
}
