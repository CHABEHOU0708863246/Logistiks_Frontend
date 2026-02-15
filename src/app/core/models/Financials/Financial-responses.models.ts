import { ExpenseBreakdown, FinancialSummary } from "./Financial.models";

export class MonthlyProfitability {
    year!: number;
    month!: number;
    monthName!: string;
    revenue!: number;
    expenses!: number;
    netProfit!: number;
}

export class VehiclePerformance {
    vehicleId!: string;
    vehicleCode!: string;
    vehicleName!: string;
    revenue!: number;
    expenses!: number;
    netProfit!: number;
    roi!: number;
}

export class DailyFinancialData {
    date!: Date;
    revenue!: number;
    expenses!: number;
}

export class MonthlyEvolution {
    year!: number;
    month!: number;
    monthName!: string;
    revenue!: number;
    expenses!: number;
    netProfit!: number;
    growthRate!: number;
}

// Réponses principales
export class VehicleProfitabilityResponse {
    vehicleId!: string;
    vehicleCode!: string;
    vehicleName!: string;
    totalRevenue!: number;
    totalExpenses!: number;
    netProfit!: number;
    profitMargin!: number;
    roi!: number;
    expenseBreakdown: ExpenseBreakdown = new ExpenseBreakdown();
    monthlyData: MonthlyProfitability[] = [];
}

export class FinancialDashboardResponse {
    periodStart!: Date;
    periodEnd!: Date;

    // Vue d'ensemble
    totalRevenue!: number;
    totalExpenses!: number;
    netProfit!: number;
    profitMargin!: number;

    // Détails revenus
    activeContracts!: number;
    totalPaymentsReceived!: number;
    pendingPayments!: number;
    latePayments!: number;

    // Détails dépenses
    expenseBreakdown: ExpenseBreakdown = new ExpenseBreakdown();

    // Performance flotte
    totalVehicles!: number;
    rentedVehicles!: number;
    fleetUtilizationRate!: number;

    // Top performers
    topPerformingVehicles: VehiclePerformance[] = [];
    lowPerformingVehicles: VehiclePerformance[] = [];
}

export class MonthlyFinancialSummary {
    year!: number;
    month!: number;
    monthName!: string;

    totalRevenue!: number;
    totalExpenses!: number;
    netProfit!: number;

    paymentsReceived!: number;
    paymentsMissed!: number;

    dailyData: DailyFinancialData[] = [];
}

export class VehicleFinancialDetail {
    vehicleCode!: string;
    vehicleName!: string;
    revenue!: number;
    expenses!: number;
    netProfit!: number;
    roi!: number;
    daysRented!: number;
}

export class FinancialReportResponse {
    startDate!: Date;
    endDate!: Date;
    generatedAt!: Date;

    // Synthèse globale
    summary: FinancialSummary = new FinancialSummary();

    // Détails par véhicule
    vehicleDetails: VehicleFinancialDetail[] = [];

    // Détails des dépenses
    totalExpenseBreakdown: ExpenseBreakdown = new ExpenseBreakdown();

    // Évolution mensuelle
    monthlyEvolution: MonthlyEvolution[] = [];
}
