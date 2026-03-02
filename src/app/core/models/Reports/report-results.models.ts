// ═══════════════════════════════════════════════════════════
// STRUCTURES DE RÉSULTATS — Une interface par type de rapport
// ═══════════════════════════════════════════════════════════

// ── Entrées communes (réutilisées dans plusieurs rapports) ─

export interface VehicleBaseEntry {
  vehicleId: string;
  vehicleCode: string;
  vehicleName: string;
}

export interface MonthlyEntry {
  year: number;
  month: number;
  monthLabel: string;
}

// ─────────────────────────────────────────────────────────────
// RPT-01 : Activité mensuelle de la flotte
// ─────────────────────────────────────────────────────────────

export interface MonthlyActivityResult {
  periodLabel: string;
  periodStart: string;
  periodEnd: string;

  // KPIs financiers
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMarginPercent: number;

  // KPIs opérationnels
  totalContracts: number;
  activeContracts: number;
  newContracts: number;
  terminatedContracts: number;
  renewedContracts: number;

  // KPIs flotte
  totalVehicles: number;
  rentedVehicles: number;
  fleetUtilizationPercent: number;

  // Ventilation dépenses
  maintenanceCost: number;
  fuelCost: number;
  insuranceCost: number;
  taxesCost: number;
  otherCost: number;

  // Classements
  topVehicles: VehicleActivityEntry[];
  bottomVehicles: VehicleActivityEntry[];

  // Détail journalier
  dailyRevenue: DailyRevenueEntry[];
}

export interface VehicleActivityEntry extends VehicleBaseEntry {
  revenue: number;
  expenses: number;
  netProfit: number;
  roiPercent: number;
  utilizationRate: number;
  contractsCount: number;
}

export interface DailyRevenueEntry {
  date: string;
  dateLabel: string;
  revenue: number;
  expenses: number;
  paymentsCount: number;
}

// ─────────────────────────────────────────────────────────────
// RPT-02 : ROI détaillé par véhicule
// ─────────────────────────────────────────────────────────────

export interface VehicleRoiDetailResult extends VehicleBaseEntry {
  plateNumber: string;
  acquisitionCost: number;
  acquisitionDate: string;
  periodLabel: string;

  // Financiers
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  roiPercent: number;
  profitMarginPercent: number;
  utilizationRatePercent: number;

  // Ventilation dépenses
  maintenanceCost: number;
  fuelCost: number;
  insuranceCost: number;
  taxesCost: number;
  otherCost: number;

  // Historique
  monthlyBreakdown: MonthlyRoiEntry[];

  // Opérationnel
  totalContracts: number;
  daysRented: number;
  currentStatus: string;
}

export interface MonthlyRoiEntry extends MonthlyEntry {
  revenue: number;
  expenses: number;
  netProfit: number;  // calculé côté front : revenue - expenses
  roiPercent: number;
}

// ─────────────────────────────────────────────────────────────
// RPT-03 : Dépenses par catégorie
// ─────────────────────────────────────────────────────────────

export interface ExpenseByCategoryResult {
  periodLabel: string;
  totalExpenses: number;
  categories: ExpenseCategoryEntry[];
  byVehicle: ExpenseVehicleEntry[];
  monthly: ExpenseMonthlyEntry[];
}

export interface ExpenseCategoryEntry {
  categoryCode: string;
  categoryLabel: string;
  amount: number;
  percentOfTotal: number;
  transactionCount: number;
}

export interface ExpenseVehicleEntry extends VehicleBaseEntry {
  totalExpense: number;
  maintenanceCost: number;
  fuelCost: number;
  insuranceCost: number;
  otherCost: number;
}

export interface ExpenseMonthlyEntry extends MonthlyEntry {
  totalExpense: number;
  maintenanceCost: number;
  fuelCost: number;
  insuranceCost: number;
}

// ─────────────────────────────────────────────────────────────
// RPT-04 : Contrats arrivant à expiration
// ─────────────────────────────────────────────────────────────

export interface ExpiringContractsResult {
  daysThreshold: number;
  totalExpiring: number;
  totalWeeklyAmountAtRisk: number;
  contracts: ExpiringContractEntry[];
}

export interface ExpiringContractEntry {
  contractId: string;
  contractNumber: string;
  customerName: string;
  customerPhone: string;
  vehicleCode: string;
  vehicleName: string;
  endDate: string;
  daysRemaining: number;
  weeklyAmount: number;
  outstandingBalance: number;
  isRenewalEligible: boolean;
  urgencyLevel: 'Expiré' | 'Critique' | 'Avertissement' | 'Information';
}

// ─────────────────────────────────────────────────────────────
// RPT-05 : Historique paiements client
// ─────────────────────────────────────────────────────────────

export interface ClientPaymentHistoryResult {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerStatus: string;

  totalPaid: number;
  totalDue: number;
  outstandingBalance: number;
  totalPayments: number;
  latePayments: number;
  paymentRatePercent: number;
  reliabilityScore: 'Excellent' | 'Bon' | 'À surveiller' | 'Risqué';

  contracts: ClientContractSummary[];
  payments: ClientPaymentEntry[];
}

export interface ClientContractSummary {
  contractNumber: string;
  vehicleName: string;
  startDate: string;
  endDate: string;
  status: string;
  weeklyAmount: number;
  totalPaid: number;
  totalDue: number;
}

export interface ClientPaymentEntry {
  paymentDate: string;
  amount: number;
  method: string;
  contractNumber: string;
  isLate: boolean;
  daysLate: number;
}

// ─────────────────────────────────────────────────────────────
// RPT-06 : Impayés et retards
// ─────────────────────────────────────────────────────────────

export interface OverduePaymentsResult {
  generatedAt: string;
  totalOverdueClients: number;
  totalOverdueAmount: number;
  clients: OverdueClientEntry[];
}

export interface OverdueClientEntry {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerStatus: string;
  overdueAmount: number;
  consecutiveLatePayments: number;
  daysOverdue: number;
  contractNumber: string;
  vehicleName: string;
  riskLevel: 'Critique' | 'Élevé' | 'Modéré';
}

// ─────────────────────────────────────────────────────────────
// RPT-07 : Taux d'utilisation de la flotte
// ─────────────────────────────────────────────────────────────

export interface FleetUtilizationResult {
  periodLabel: string;
  totalVehicles: number;
  rentedVehicles: number;
  availableVehicles: number;
  maintenanceVehicles: number;
  outOfServiceVehicles: number;
  globalUtilizationPercent: number;
  vehicleDetails: VehicleUtilizationEntry[];
}

export interface VehicleUtilizationEntry extends VehicleBaseEntry {
  plateNumber: string;
  currentStatus: string;
  utilizationPercent: number;
  daysRented: number;
  daysAvailable: number;
  daysMaintenance: number;
  revenueGenerated: number;
  contractsCount: number;
}

// ─────────────────────────────────────────────────────────────
// RPT-08 : Synthèse maintenance
// ─────────────────────────────────────────────────────────────

export interface MaintenanceSummaryResult {
  periodLabel: string;
  totalMaintenanceCost: number;
  totalMaintenanceEvents: number;
  averageCostPerVehicle: number;
  averageCostPerEvent: number;
  byVehicle: VehicleMaintenanceEntry[];
  monthly: MaintenanceMonthlyEntry[];
}

export interface VehicleMaintenanceEntry extends VehicleBaseEntry {
  totalCost: number;
  eventCount: number;
  costVsRevenuePercent: number;
  maintenanceStatus: string;
}

export interface MaintenanceMonthlyEntry extends MonthlyEntry {
  totalCost: number;
  eventCount: number;
}

// ─────────────────────────────────────────────────────────────
// RPT-09 : Assurances à renouveler
// ─────────────────────────────────────────────────────────────

export interface InsuranceExpiryResult {
  daysThreshold: number;
  totalExpiring: number;
  alreadyExpired: number;
  vehicles: InsuranceExpiryEntry[];
}

export interface InsuranceExpiryEntry extends VehicleBaseEntry {
  plateNumber: string;
  currentStatus: string;
  insuranceExpiryDate: string;
  daysUntilExpiry: number;
  isExpired: boolean;
  isCurrentlyRented: boolean;
  urgencyLevel: 'Expiré' | 'Critique' | 'Avertissement';
  insuranceProvider: string;
}

// ─────────────────────────────────────────────────────────────
// RPT-10 : Comparaison de périodes
// ─────────────────────────────────────────────────────────────

export interface PeriodComparisonResult {
  periodA: PeriodSnapshot;
  periodB: PeriodSnapshot;

  revenueGrowthPercent: number;
  profitGrowthPercent: number;
  roiGrowthPercent: number;
  utilizationGrowthPercent: number;
  contractsGrowthPercent: number;

  globalTrend: 'Croissance' | 'Stable' | 'Déclin';
  insights: string[];
}

export interface PeriodSnapshot {
  label: string;
  start: string;
  end: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMarginPercent: number;
  averageRoi: number;
  fleetUtilizationPercent: number;
  totalContracts: number;
  newContracts: number;
}
