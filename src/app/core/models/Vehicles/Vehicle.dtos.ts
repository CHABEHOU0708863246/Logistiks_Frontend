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

export interface VehicleStatistics {
  totalVehicles: number;
  availableVehicles: number;
  rentedVehicles: number;
  inMaintenanceVehicles: number;
  outOfServiceVehicles: number;
  totalFleetValue: number;
  vehiclesWithExpiredInsurance: number;
  averageVehicleAge: number;
  vehiclesByType: Record<VehicleType, number>; // Utilisation de Record pour le Dictionary C#
  vehiclesByFuelType: Record<FuelType, number>;
}
