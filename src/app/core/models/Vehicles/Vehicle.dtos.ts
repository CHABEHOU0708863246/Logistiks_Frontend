import { VehicleType, FuelType, VehicleStatus } from "../Enums/Logistiks-enums";
import { InsuranceInfo, VehicleFeatures, GeoLocation } from "./Vehicle.model";

export interface CreateVehicleRequest {
  type: VehicleType;
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  chassisNumber?: string;
  engineNumber?: string;
  color?: string;
  fuelType: FuelType;
  currentMileage: number;
  acquisitionDate: Date | string;
  acquisitionCost: number;
  purchasePrice: number;
  insurance: InsuranceInfo;
  features?: VehicleFeatures;
  currentLocation?: GeoLocation;
  notes?: string;
}

export interface UpdateVehicleRequest {
  plateNumber?: string;
  color?: string;
  currentMileage?: number;
  insurance?: InsuranceInfo;
  features?: VehicleFeatures;
  currentLocation?: GeoLocation;
  notes?: string;
}

export interface AssignVehicleRequest {
  vehicleId: string;
  contractId: string;
  customerId: string;
  startDate: Date | string;
  startMileage: number;
}

export interface VehicleDto {
  showActionsMenu: boolean;
  id: string;
  code: string;
  type: VehicleType;
  typeLabel: string;
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  chassisNumber?: string;
  color?: string;
  fuelType: FuelType;
  fuelTypeLabel: string;
  currentMileage: number;
  status: VehicleStatus;
  statusLabel: string;
  acquisitionDate: Date | string;
  acquisitionCost: number;
  purchasePrice: number;
  insurance?: InsuranceInfo;
  isInsuranceExpired: boolean;
  daysUntilInsuranceExpiry?: number;
  features: VehicleFeatures;
  currentLocation?: GeoLocation;
  notes?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  ageInYears: number;
  fullName: string;
}

export interface VehicleSearchCriteria {
  searchTerm?: string;
  type?: VehicleType;
  status?: VehicleStatus;
  fuelType?: FuelType;
  minYear?: number;
  maxYear?: number;
  minAcquisitionCost?: number;
  maxAcquisitionCost?: number;
  hasExpiredInsurance?: boolean;
  needsMaintenanceSoon?: boolean;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDescending: boolean;
}

/**
 * Statistiques du parc véhicules
 */
export interface VehicleStatistics {
  totalVehicles: number;
  availableVehicles: number;
  rentedVehicles: number;
  inMaintenanceVehicles: number;
  outOfServiceVehicles: number;
  reservedVehicles: number;

  totalFleetValue: number;
  averageVehicleValue: number;

  vehiclesWithExpiredInsurance: number;
  vehiclesWithExpiringInsurance: number; // < 30 jours

  averageVehicleAge: number;
  totalDistanceTraveled: number;
  averageMileage: number;

  // Utilisation de Record pour simuler les Dictionnaires C#
  vehiclesByType: Record<string, number>;
  vehiclesByFuelType: Record<string, number>;
  vehiclesByStatus: Record<string, number>;

  // Statistiques de location
  activeContracts: number;
  totalMonthlyRevenue: number;
  averageUtilizationRate: number; // Pourcentage

  // Alertes
  alerts: string[];
  generatedAt: Date;
}
