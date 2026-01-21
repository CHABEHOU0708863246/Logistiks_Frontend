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

/**
 * Requête pour réserver un véhicule
 */
export interface ReserveVehicleRequest {
  vehicleId: string;
  customerId: string;
  reservedBy?: string; // Optionnel
  expectedStartDate: Date;
  reservationDurationDays: number; // Défaut: 7
  notes?: string;
}


/**
 * Réservation temporaire d'un véhicule avant création du contrat
 */
export type ReservationStatus = 'Active' | 'Confirmed' | 'Expired' | 'Cancelled';

export interface VehicleReservation {
  id: string;
  vehicleId: string;
  customerId: string;
  reservedBy?: string;
  reservationDate: Date;
  expectedStartDate: Date;
  expiryDate: Date;
  status: ReservationStatus;
  notes?: string;
  contractId?: string;
  cancelledReason?: string;
  cancelledAt?: Date;
}
