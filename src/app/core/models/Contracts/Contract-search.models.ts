import { ContractStatus, PaymentFrequency } from "../Enums/Logistiks-enums";

// Critères de recherche de contrats
export interface ContractSearchCriteria {
  // Recherche textuelle
  searchTerm?: string;

  // Filtres
  customerId?: string;
  vehicleId?: string;
  status?: ContractStatus;
  paymentFrequency?: PaymentFrequency;

  // Dates
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  isExpiring?: boolean;
  expiringInDays?: number;

  // Montants
  minWeeklyAmount?: number;
  maxWeeklyAmount?: number;
  hasOutstandingBalance?: boolean;

  // Pagination
  page: number;
  pageSize: number;

  // Tri
  sortBy: string;
  sortDescending: boolean;
}

// Valeurs par défaut pour les critères de recherche
export const defaultContractSearchCriteria: ContractSearchCriteria = {
  page: 1,
  pageSize: 50,
  sortBy: 'createdAt',
  sortDescending: true
};
