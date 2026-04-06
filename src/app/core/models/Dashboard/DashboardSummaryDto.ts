import { ContractPerformanceDto } from "./ContractPerformanceDto";
import { DashboardAlertsDto } from "./DashboardAlertsDto";
import { DashboardKpiDto } from "./DashboardKpiDto";
import { ExpenseChartSlice } from "./ExpenseChartSlice";
import { FleetStatsDto } from "./FleetStatsDto";
import { MonthlyChartPoint } from "./MonthlyChartPoint";
import { VehicleKpiEntry } from "./VehicleKpiEntry";

export interface DashboardSummaryDto {
    /** Horodatage de génération (UTC) */
    generatedAt: Date;

    /** Période couverte par les KPIs */
    periodLabel: string;
    periodStart: Date;
    periodEnd: Date;

    /** Indicateurs clés de performance */
    kpis: DashboardKpiDto;

    /** Évolution mensuelle sur 12 mois glissants */
    revenueChart: MonthlyChartPoint[];

    /** Répartition des dépenses par catégorie (mois courant) */
    expenseBreakdown: ExpenseChartSlice[];

    /** État et répartition de la flotte */
    fleetStats: FleetStatsDto;

    /** Performance des contrats actifs */
    contractPerformance: ContractPerformanceDto;

    /** Top 5 véhicules les plus rentables (mois courant) */
    topVehicles: VehicleKpiEntry[];

    /** Alertes actives (assurances, impayés, contrats expirant) */
    alerts: DashboardAlertsDto;

    /** Temps de génération en ms */
    executionTimeMs: number;
}
