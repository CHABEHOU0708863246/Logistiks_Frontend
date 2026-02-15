export enum TransactionType {
    Revenue = 1,
    Expense = 2
}

export enum TransactionCategory {
    // Revenus
    Rental = 1,
    Deposit = 2,
    Service = 3,
    // Dépenses
    Fuel = 4,
    Maintenance = 5,
    Insurance = 6,
    Tax = 7,
    Salary = 8,
    Other = 9
}

export enum PaymentMethod {
    Cash = 1,
    BankTransfer = 2,
    Check = 3,
    MobileMoney = 4,
    CreditCard = 5
}

export enum AccountType {
    Bank = 1,
    MobileMoney = 2,
    Cash = 3
}

export enum AccountStatus {
    Active = 1,
    Frozen = 2,
    Closed = 3
}

export enum TransferStatus {
    Pending = 1,
    Approved = 2,
    Executed = 3,
    Cancelled = 4,
    Failed = 5
}

export enum Severity {
    Info = 1,
    Warning = 2,
    Critical = 3
}

/**
 * Modèle de transaction financière
 * Correspond au modèle C# FinancialTransaction
 */
export class FinancialTransaction {
  id!: string;
  transactionNumber!: string; // REC-2025-0001 ou EXP-2025-0001
  type!: TransactionType; // Income ou Expense
  category!: TransactionCategory; // Fuel, Maintenance, Insurance, etc.
  amount!: number;
  date!: Date;
  description!: string;
  paymentMethod!: PaymentMethod; // Cash, BankTransfer, MobileMoney, etc.
  reference?: string; // Numéro de référence externe
  relatedId?: string; // ID du contrat, véhicule, tier concerné
  relatedType?: string; // "Contract", "Vehicle", "Tier", "Maintenance"
  createdBy!: string; // ID de l'utilisateur créateur
  createdAt!: Date;
  verifiedBy?: string; // ID de l'utilisateur valideur
  verifiedAt?: Date;

  // Propriétés calculées côté client
  get isVerified(): boolean {
    return !!this.verifiedBy && !!this.verifiedAt;
  }

  get isExpense(): boolean {
    return this.type === TransactionType.Expense;
  }

  get isIncome(): boolean {
    return this.type === TransactionType.Revenue;
  }
}

/**
 * Modèle de rentabilité d'un véhicule
 * Correspond au modèle C# VehicleProfitability
 */
export class VehicleProfitability {
  id!: string;
  vehicleId!: string;
  periodStart!: Date;
  periodEnd!: Date;
  totalRevenue!: number;
  totalExpenses!: number;
  expenses!: ExpenseBreakdown;
  roi!: number; // Return on Investment en %
  utilizationRate!: number; // Taux d'utilisation en %
  updatedAt!: Date;

  // Propriétés calculées
  get netProfit(): number {
    return this.totalRevenue - this.totalExpenses;
  }

  get profitMargin(): number {
    if (this.totalRevenue === 0) return 0;
    return (this.netProfit / this.totalRevenue) * 100;
  }

  get periodDays(): number {
    const start = new Date(this.periodStart);
    const end = new Date(this.periodEnd);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}

/**
 * Ventilation des dépenses par catégorie
 * Correspond à ExpenseBreakdown
 */
export class ExpenseBreakdown {
  maintenance: number = 0;
  fuel: number = 0;
  insurance: number = 0;
  taxes: number = 0;
  depreciation: number = 0;
  other: number = 0;

  get total(): number {
    return (
      this.maintenance +
      this.fuel +
      this.insurance +
      this.taxes +
      this.depreciation +
      this.other
    );
  }

  // Obtenir les dépenses sous forme de tableau pour graphiques
  toArray(): { category: string; amount: number }[] {
    return [
      { category: 'Maintenance', amount: this.maintenance },
      { category: 'Carburant', amount: this.fuel },
      { category: 'Assurance', amount: this.insurance },
      { category: 'Taxes', amount: this.taxes },
      { category: 'Dépréciation', amount: this.depreciation },
      { category: 'Autre', amount: this.other },
    ].filter((item) => item.amount > 0);
  }
}

/**
 * Résumé financier global
 * Correspond à FinancialSummary
 */
export class FinancialSummary {
  totalRevenue!: number;
  totalExpenses!: number;
  netProfit!: number;
  profitMargin!: number;
  averageROI!: number;
}

