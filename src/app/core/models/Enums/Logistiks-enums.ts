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
