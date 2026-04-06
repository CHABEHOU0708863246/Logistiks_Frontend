import { ContractPerformanceDto, ContractRevenueEntry } from "./ContractPerformanceDto";
import { ExpenseChartSlice } from "./ExpenseChartSlice";
import { FleetStatsDto, VehicleTypeCount } from "./FleetStatsDto";
import { MonthlyChartPoint } from "./MonthlyChartPoint";
import { VehicleKpiEntry } from "./VehicleKpiEntry";

export interface DashboardAlertsDto {
    totalAlerts: number;
    criticalCount: number;
    items: DashboardAlert[];
}

export interface DashboardAlert {
    /** 'critical' | 'warning' | 'info' */
    severity: 'critical' | 'warning' | 'info';
    /** 'insurance' | 'contract' | 'payment' */
    category: string;
    title: string;
    description: string;
    entityId?: string | null;
    entityLabel?: string | null;
}
