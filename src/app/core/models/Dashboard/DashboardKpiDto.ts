export interface DashboardKpiDto {
    // ── Financiers ──────────────────────────────────────────
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMarginPercent: number;

    /**
     * Variation (%) vs période précédente : mois calendaire précédent pour un
     * mois complet, sinon fenêtre de même durée. `null` = pas de période de
     * comparaison disponible → afficher « — ».
     */
    revenueGrowthPercent: number | null;
    expenseGrowthPercent: number | null;
    profitGrowthPercent: number | null;

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
