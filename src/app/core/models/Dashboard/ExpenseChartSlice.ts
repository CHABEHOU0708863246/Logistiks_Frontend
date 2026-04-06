/**
 * Tranche du camembert dépenses.
 */
export interface ExpenseChartSlice {
    categoryCode: string;
    categoryLabel: string;
    amount: number;
    percentOfTotal: number;
}
