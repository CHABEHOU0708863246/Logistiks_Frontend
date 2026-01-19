import { VehicleType, FuelType, VehicleStatus } from "../Enums/Logistiks-enums";

export interface InsuranceInfo {
  company: string;
  policyNumber: string;
  startDate: Date | string;
  endDate: Date | string;
  coverageType: string;
  annualPremium: number;
}

export interface VehicleFeatures {
  engineCapacity?: number;
  fuelCapacity?: number;
  transmission?: string;
  hasGps: boolean;
  hasAirConditioning: boolean;
  additionalFeatures: string[];
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface Vehicle {
  id: string;
  code: string;
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
  status: VehicleStatus;
  acquisitionDate: Date | string;
  acquisitionCost: number;
  purchasePrice: number;
  insurance?: InsuranceInfo;
  currentLocation?: GeoLocation;
  features: VehicleFeatures;
  notes?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  isDeleted: boolean;
}
