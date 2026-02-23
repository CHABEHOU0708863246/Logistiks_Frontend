// rentability.types.ts

// ============================================================================
// TYPES DE BASE PARTAGÉS
// ============================================================================

export interface VehicleRankEntry {
  vehicleId: string;
  vehicleCode: string;
  vehicleName: string;
  netProfit: number;
  roi: number;
  utilizationRate: number;
}

export interface MonthlyRoiEntry {
  year: number;
  month: number;
  monthLabel: string;
  revenue: number;
  expenses: number;
  netProfit: number; // Calculé: revenue - expenses
}

// ============================================================================
// MODÈLES DOMAINE
// ============================================================================

/**
 * Snapshot des KPIs globaux de la flotte pour une période donnée
 */
export interface FleetKpiSnapshot {
  periodStart: Date;
  periodEnd: Date;

  // Financiers
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number; // Calculé: totalRevenue - totalExpenses
  profitMarginPercent: number; // Calculé: (netProfit / totalRevenue) * 100

  // Flotte
  totalVehicles: number;
  rentedVehicles: number;
  fleetUtilizationPercent: number; // Calculé: (rentedVehicles / totalVehicles) * 100

  // Performance
  averageRoi: number;
  topPerformers: VehicleRankEntry[];
  lowPerformers: VehicleRankEntry[];
}

/**
 * Détail complet du ROI d'un véhicule sur une période
 */
export interface VehicleRoiDetail {
  vehicleId: string;
  vehicleCode: string;
  vehicleName: string;
  acquisitionCost: number;

  periodStart: Date;
  periodEnd: Date;

  // Financiers
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number; // Calculé: totalRevenue - totalExpenses
  roiPercent: number; // (netProfit / acquisitionCost) * 100
  profitMarginPercent: number; // (netProfit / revenue) * 100

  // Utilisation
  utilizationRatePercent: number;
  rentedDays: number;
  totalDays: number;

  // Ventilation dépenses
  maintenanceCost: number;
  fuelCost: number;
  insuranceCost: number;
  taxesCost: number;
  otherCost: number;

  // Évolution mensuelle
  monthlyBreakdown: MonthlyRoiEntry[];
}

/**
 * Tranche temporelle pour les comparaisons
 */
export interface PeriodSlice {
  label: string; // Ex: "Mars 2024"
  start: Date;
  end: Date;

  totalRevenue: number;
  totalExpenses: number;
  netProfit: number; // Calculé: totalRevenue - totalExpenses
  averageRoi: number;
  fleetUtilizationPercent: number;
  activeContracts: number;
}

/**
 * Résultat de comparaison entre deux périodes
 */
export interface PeriodComparison {
  periodA: PeriodSlice;
  periodB: PeriodSlice;

  // Évolutions (positif = amélioration)
  revenueGrowthPercent: number; // Calculé
  profitGrowthPercent: number; // Calculé
  roiGrowthPercent: number; // Calculé
  utilizationGrowthPercent: number; // Calculé
}

// ============================================================================
// DTOs REQUÊTE
// ============================================================================

export interface PeriodComparisonRequest {
  /** Période de référence (ex: mois dernier) */
  periodAStart: Date;
  periodAEnd: Date;
  periodALabel: string;

  /** Période à comparer (ex: ce mois-ci) */
  periodBStart: Date;
  periodBEnd: Date;
  periodBLabel: string;

  /**
   * Optionnel : restreindre la comparaison à un seul véhicule.
   * Si null/undefined → comparaison sur toute la flotte.
   */
  vehicleId?: string | null;
}

// ============================================================================
// DTOs RÉPONSE
// ============================================================================

export interface FleetKpiResponse {
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;

  // KPIs principaux
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMarginPercent: number;
  averageRoi: number;

  // Flotte
  totalVehicles: number;
  rentedVehicles: number;
  fleetUtilizationPercent: number;

  // Classements
  top3: VehicleRankEntry[];
  bottom3: VehicleRankEntry[];
}

export interface VehicleRoiResponse {
  // Identité véhicule
  vehicleId: string;
  vehicleCode: string;
  vehicleName: string;
  acquisitionCost: number;

  // Période
  periodStart: Date;
  periodEnd: Date;

  // Résultats
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  roiPercent: number;
  profitMarginPercent: number;
  utilizationRatePercent: number;

  // Détail dépenses
  maintenanceCost: number;
  fuelCost: number;
  insuranceCost: number;
  taxesCost: number;
  otherCost: number;

  // Évolution
  monthlyBreakdown: MonthlyRoiEntry[];
}

export interface PeriodComparisonResponse {
  periodA: PeriodSliceDto;
  periodB: PeriodSliceDto;

  // Variations (positif = amélioration)
  revenueGrowthPercent: number;
  profitGrowthPercent: number;
  roiGrowthPercent: number;
  utilizationGrowthPercent: number;
}

export interface PeriodSliceDto {
  label: string;
  start: Date;
  end: Date;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  averageRoi: number;
  fleetUtilizationPercent: number;
}
