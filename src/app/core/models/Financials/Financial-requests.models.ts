import { PaymentMethod } from "../Enums/Logistiks-enums";
import { TransactionCategory, TransactionType } from "./Financial.models";

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
