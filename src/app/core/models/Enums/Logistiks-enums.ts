// USERS & PERMISSIONS
export enum UserRole {
  SuperAdmin = 1,
  Manager = 2,
  Operations = 3,
  Finance = 4,
  Driver = 5
}

export enum Permission {
  Vehicle_Create = 'Vehicle_Create',
  Vehicle_Read = 'Vehicle_Read',
  Vehicle_Update = 'Vehicle_Update',
  Vehicle_Delete = 'Vehicle_Delete',
  Vehicle_Assign = 'Vehicle_Assign',
  Customer_Create = 'Customer_Create',
  Customer_Read = 'Customer_Read',
  Customer_Update = 'Customer_Update',
  Customer_Delete = 'Customer_Delete',
  Contract_Create = 'Contract_Create',
  Contract_Read = 'Contract_Read',
  Contract_Update = 'Contract_Update',
  Contract_Terminate = 'Contract_Terminate',
  Contract_Validate = 'Contract_Validate',
  Payment_Record = 'Payment_Record',
  Payment_Verify = 'Payment_Verify',
  Payment_Read = 'Payment_Read',
  Payment_Export = 'Payment_Export',
  Maintenance_Create = 'Maintenance_Create',
  Maintenance_Update = 'Maintenance_Update',
  Maintenance_Read = 'Maintenance_Read',
  Document_Upload = 'Document_Upload',
  Document_Read = 'Document_Read',
  Document_Delete = 'Document_Delete',
  Report_View = 'Report_View',
  Report_Export = 'Report_Export',
  User_Manage = 'User_Manage',
  Role_Manage = 'Role_Manage',
  Configuration_Manage = 'Configuration_Manage'
}

// VEHICLES
export enum VehicleType {
  Motorcycle = 1,
  Car = 2,
  Tricycle = 3,
  Scooter = 4,
  Van = 5
}

export enum VehicleStatus {
  Available = 1,
  Rented = 2,
  Maintenance = 3,
  Reserved = 4,
  OutOfService = 5
}

export enum FuelType {
  Gasoline = 1,
  Diesel = 2,
  Electric = 3,
  Hybrid = 4
}

// CONTRACTS
export enum ContractStatus {
  Draft = 1,
  Pending = 2,
  Active = 3,
  Suspended = 4,
  Terminated = 5,
  Completed = 6,
  Template = 7,
  Assigned = 8
}

export enum PaymentFrequency {
  Weekly = 1,
  BiWeekly = 2,
  Monthly = 3
}

export enum DamageSeverity {
  Minor = 1,
  Moderate = 2,
  Major = 3,
  Total = 4
}

// FINANCIAL
export enum PaymentStatus {
  Pending = 1,
  Paid = 2,
  Late = 3,
  Missed = 4,
  PartiallyPaid = 5
}

export enum TransactionType {
  Income = 1,   // Revenu
  Expense = 2    // Dépense
}

export enum TransactionCategory {
  // Revenus
  RentalIncome = 1,
  LateFees = 2,
  DamageFees = 3,
  OtherIncome = 4,

  // Dépenses
  Maintenance = 101,
  Fuel = 102,
  Insurance = 103,
  Taxes = 104,
  Salary = 105,
  Utilities = 106,
  OfficeSupplies = 107,
  Marketing = 108,
  OtherExpense = 109
}

export enum PaymentMethod {
  Cash = 1,
  MobileMoney = 2,
  BankTransfer = 3,
  Check = 4
}

// DOCUMENTS
export enum DocumentType {
  IdentityCard = 1,
  DriverLicense = 2,
  VehicleRegistration = 3,
  Insurance = 4,
  Contract = 5,
  Invoice = 6,
  Receipt = 7,
  MaintenanceReport = 8,
  BusinessLicense = 9,
  Other = 10
}

export enum DocumentStatus {
  Pending = 1,
  Validated = 2,
  Rejected = 3,
  Expired = 4
}

// NOTIFICATIONS & CONFIG
export enum ConfigDataType {
  String = 1,
  Integer = 2,
  Decimal = 3,
  Boolean = 4,
  DateTime = 5,
  Json = 6
}

export enum NotificationType {
  Contract = 1,
  Payment = 2,
  Maintenance = 3,
  System = 4,
  Alert = 5
}

export enum NotificationPriority {
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4
}

// MAINTENANCE
export enum MaintenanceType {
  Preventive = 1,
  Corrective = 2,
  Accident = 3,
  Inspection = 4,
  Other = 5
}

export enum MaintenanceStatus {
  Scheduled = 1,
  InProgress = 2,
  Completed = 3,
  Cancelled = 4
}

// TIERS & CUSTOMERS
export enum TierType {
  Individual = 1,
  Company = 2,
  Freelancer = 3
}

export enum TierStatus {
  PendingValidation = 1,
  Active = 2,
  Blocked = 3,
  Suspended = 4,
  Inactive = 5,
  Blacklisted = 6,
  None = 7
}

export enum IdentityType {
  CNI = 1,
  Passport = 2,
  ResidenceCard = 3,
  Other = 4
}

export enum TierRoleType {
  ClientLivreur = 1,
  ClientParticulier = 2,
  Supplier = 3,
  Partner = 4
}


// Type pour les champs personnalisés
export type CustomFields = Record<string, string>;

// Type pour les dictionnaires
export type Dictionary<TKey extends string | number | symbol, TValue> = Record<TKey, TValue>;

/**
 * Type d'entité pour les documents
 */
export enum DocumentEntityType {
  Tier = 1,
  Vehicle = 2,
  Contract = 3,
  Expense = 4,
  Maintenance = 5
}

export enum ContractType {
  Template = 0, // Contrat modèle sans client/véhicule assigné
  Final = 1,    // Contrat final avec client/véhicule assigné
  Draft = 2     // Brouillon en cours de création
}

/**
 * Labels pour l'affichage des types d'entité de document
 */
export const DocumentEntityTypeLabels: Record<DocumentEntityType, string> = {
  [DocumentEntityType.Tier]: 'Tier (Client/Fournisseur)',
  [DocumentEntityType.Vehicle]: 'Véhicule',
  [DocumentEntityType.Contract]: 'Contrat',
  [DocumentEntityType.Expense]: 'Dépense',
  [DocumentEntityType.Maintenance]: 'Maintenance'
};

/**
 * Helper pour obtenir le label d'un type d'entité de document
 */
export function getDocumentEntityTypeLabel(type: DocumentEntityType): string {
  return DocumentEntityTypeLabels[type] || 'Inconnu';
}

/**
 * Helper pour obtenir tous les types d'entité de document
 */
export function getAllDocumentEntityTypes(): Array<{ value: DocumentEntityType; label: string }> {
  return Object.keys(DocumentEntityType)
    .filter(key => !isNaN(Number(key)))
    .map(key => ({
      value: Number(key) as DocumentEntityType,
      label: DocumentEntityTypeLabels[Number(key) as DocumentEntityType]
    }));
}

/**
 * Helper pour vérifier si une valeur est un DocumentEntityType valide
 */
export function isValidDocumentEntityType(value: any): value is DocumentEntityType {
  return Object.values(DocumentEntityType).includes(value);
}

/**
 * Helper pour convertir une chaîne en DocumentEntityType
 */
export function parseDocumentEntityType(value: string): DocumentEntityType | null {
  const numValue = Number(value);
  if (isValidDocumentEntityType(numValue)) {
    return numValue;
  }

  // Essayer de parser par nom
  const enumKey = Object.keys(DocumentEntityType).find(
    key => key.toLowerCase() === value.toLowerCase() && isNaN(Number(key))
  );

  if (enumKey) {
    return DocumentEntityType[enumKey as keyof typeof DocumentEntityType] as DocumentEntityType;
  }

  return null;
}

// ═══════════════════════════════════════════════════════════
// MODULE RAPPORT — Enums
// ═══════════════════════════════════════════════════════════

export enum ReportType {
  MonthlyActivity = 1,       // RPT-01 : Activité mensuelle flotte
  VehicleRoiDetail = 2,      // RPT-02 : ROI détaillé par véhicule
  ExpenseByCategory = 3,     // RPT-03 : Dépenses par catégorie
  ExpiringContracts = 4,     // RPT-04 : Contrats arrivant à expiration
  ClientPaymentHistory = 5,  // RPT-05 : Historique paiements client
  OverduePayments = 6,       // RPT-06 : Impayés et retards
  FleetUtilization = 7,      // RPT-07 : Taux utilisation flotte
  MaintenanceSummary = 8,    // RPT-08 : Synthèse maintenance
  InsuranceExpiry = 9,       // RPT-09 : Assurances à renouveler
  PeriodComparison = 10      // RPT-10 : Comparaison de périodes
}

export enum ReportStatus {
  Pending = 1,    // En attente de génération
  Running = 2,    // En cours de génération
  Completed = 3,  // Généré avec succès
  Failed = 4,     // Échec de génération
  Scheduled = 5   // Planifié (pas encore exécuté)
}

export enum ReportScheduleFrequency {
  Daily = 1,
  Weekly = 2,
  Monthly = 3
}

export enum ExportFormat {
  Pdf = 1,
  Excel = 2,
  Csv = 3,
  Json = 4
}

// ── Labels lisibles pour l'UI ─────────────────────────────

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  [ReportType.MonthlyActivity]: 'Activité mensuelle',
  [ReportType.VehicleRoiDetail]: 'ROI par véhicule',
  [ReportType.ExpenseByCategory]: 'Dépenses par catégorie',
  [ReportType.ExpiringContracts]: 'Contrats expirants',
  [ReportType.ClientPaymentHistory]: 'Historique paiements client',
  [ReportType.OverduePayments]: 'Impayés et retards',
  [ReportType.FleetUtilization]: 'Utilisation de la flotte',
  [ReportType.MaintenanceSummary]: 'Synthèse maintenance',
  [ReportType.InsuranceExpiry]: 'Assurances à renouveler',
  [ReportType.PeriodComparison]: 'Comparaison de périodes',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  [ReportStatus.Pending]: 'En attente',
  [ReportStatus.Running]: 'En cours',
  [ReportStatus.Completed]: 'Généré',
  [ReportStatus.Failed]: 'Échec',
  [ReportStatus.Scheduled]: 'Planifié',
};

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  [ExportFormat.Pdf]: 'PDF',
  [ExportFormat.Excel]: 'Excel',
  [ExportFormat.Csv]: 'CSV',
  [ExportFormat.Json]: 'JSON',
};

export const SCHEDULE_FREQUENCY_LABELS: Record<ReportScheduleFrequency, string> = {
  [ReportScheduleFrequency.Daily]: 'Quotidien',
  [ReportScheduleFrequency.Weekly]: 'Hebdomadaire',
  [ReportScheduleFrequency.Monthly]: 'Mensuel',
};
