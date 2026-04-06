export interface ContractPerformanceDto {
    totalContracts: number;
    activeContracts: number;
    completedContracts: number;
    terminatedContracts: number;
    totalRevenue: number;
    averageContractValue: number;
    /** % paiements reçus / dus */
    collectionRate: number;

    /** CA généré par contrat — top 10 */
    topContracts: ContractRevenueEntry[];
}

export interface ContractRevenueEntry {
    contractNumber: string;
    customerName: string;
    vehicleName: string;
    weeklyAmount: number;
    totalPaid: number;
    totalDue: number;
    collectionRate: number;
    status: string;
}
