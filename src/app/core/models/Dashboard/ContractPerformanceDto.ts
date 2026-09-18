export interface ContractPerformanceDto {
    totalContracts: number;
    activeContracts: number;
    completedContracts: number;
    terminatedContracts: number;
    /** Montant encaissé sur la période (hors caution). */
    totalRevenue: number;
    /** Moyenne des `totalAmount` des contrats de la période. */
    averageContractValue: number;
    /** % encaissé / exigible sur la période ; 0 quand rien n'était exigible. */
    collectionRate: number;

    /** Top 10 contrats par valeur contractuelle — agrégats de la période */
    topContracts: ContractRevenueEntry[];
}

export interface ContractRevenueEntry {
    contractNumber: string;
    customerName: string;
    vehicleName: string;
    weeklyAmount: number;
    /** Encaissé sur la période. */
    totalPaid: number;
    /** Échéances exigibles sur la période ; 0 → taux de recouvrement non applicable. */
    totalDue: number;
    collectionRate: number;
    status: string;
}
