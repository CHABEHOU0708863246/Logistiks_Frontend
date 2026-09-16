import { PaymentMethod } from "../Enums/Logistiks-enums";
import { TransactionCategory, TransactionStatus, TransactionType } from "./Financial.models";

export class CreateTransactionRequest {
    type!: TransactionType;
    category!: TransactionCategory;
    amount!: number;
    date!: Date;
    description!: string;
    paymentMethod!: PaymentMethod;
    reference?: string;
    relatedId?: string; // ID du contrat, véhicule, etc.
    relatedType?: string; // "Contract", "Vehicle", "Maintenance"
}

export class CalculateProfitabilityRequest {
    vehicleId!: string;
    periodStart!: Date;
    periodEnd!: Date;
}

export class GenerateReportRequest {
    startDate!: Date;
    endDate!: Date;
    includeVehicleDetails: boolean = true;
    includeExpenseBreakdown: boolean = true;
    includeComparisons: boolean = false;
}

/**
 * Demande d'export Excel personnalisé des transactions.
 * Tous les champs sont optionnels : sans filtre, l'export couvre tout.
 * `columns` accepte : date, number, type, category, description, amount,
 * paymentMethod, reference, vehicle, status, verifiedBy, verifiedAt,
 * paidAt, createdBy, createdAt.
 */
export class ExportTransactionsRequest {
    dateFrom?: string;
    dateTo?: string;
    type?: TransactionType;
    statuses?: TransactionStatus[];
    categories?: TransactionCategory[];
    vehicleId?: string;
    minAmount?: number;
    maxAmount?: number;
    searchTerm?: string;
    columns?: string[];
    title?: string;
}
