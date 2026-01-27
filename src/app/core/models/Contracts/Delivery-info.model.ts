/**
 * Informations de livraison du véhicule
 */
export interface DeliveryInfo {
  date: Date;
  location: string;
  mileageAtDelivery: number;
  fuelLevel: number; // en pourcentage
  conditionNotes?: string;
  deliveredBy: string;
  receivedBy: string;
}
