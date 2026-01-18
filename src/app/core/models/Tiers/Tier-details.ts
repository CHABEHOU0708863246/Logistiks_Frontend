export interface BankingInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  iban?: string;
  swiftCode?: string;
}

export interface DriverLicenseInfo {
  licenseNumber: string;
  category: string; // A, B, C
  issueDate: Date;
  expiryDate: Date;
  issuingAuthority: string;
  readonly isValid?: boolean;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Address {
  street: string;
  city: string;
  country: string;
  zipCode?: string;
}
