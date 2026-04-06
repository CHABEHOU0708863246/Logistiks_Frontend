export interface FleetStatsDto {
    totalVehicles: number;

    // Par statut
    rentedCount: number;
    availableCount: number;
    maintenanceCount: number;
    outOfServiceCount: number;

    // Par type
    byType: VehicleTypeCount[];

    // Taux global
    utilizationPercent: number;
}

export interface VehicleTypeCount {
    vehicleType: string;
    count: number;
    percent: number;
}
