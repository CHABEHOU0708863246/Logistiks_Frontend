export interface DashboardKpiDto {
    // ── Financiers ──────────────────────────────────────────
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMarginPercent: number;

    /** Variation revenus vs mois précédent (%) */
    revenueGrowthPercent: number;
    expenseGrowthPercent: number;
    profitGrowthPercent: number;

    // ── Flotte ──────────────────────────────────────────────
    totalVehicles: number;
    rentedVehicles: number;
    availableVehicles: number;
    maintenanceVehicles: number;
    fleetUtilizationPercent: number;

    // ── Contrats ────────────────────────────────────────────
    activeContracts: number;
    newContractsThisMonth: number;
    expiringIn30Days: number;
    averageContractValue: number;

    // ── Clients ─────────────────────────────────────────────
    totalClients: number;
    clientsWithDebt: number;
    totalOutstandingDebt: number;
}
