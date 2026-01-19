export interface VehicleUsage {
  id: string;
  vehicleId: string;
  contractId?: string;
  customerId?: string;
  startDate: Date | string;
  endDate?: Date | string;
  startMileage: number;
  endMileage?: number;
  readonly distanceTraveled: number; // Calculé côté client ou backend
}
