/**
 * Point mensuel pour les courbes revenus / dépenses / profit.
 */
export interface MonthlyChartPoint {
    year: number;
    month: number;
    /** "Jan", "Fév", etc. */
    monthLabel: string;
    revenue: number;
    expenses: number;
    profit: number;
}
