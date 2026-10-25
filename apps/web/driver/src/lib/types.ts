// Shapes returned by the backend /driver API (apps/api/src/modules/driver).

export type StopType = 'PICKUP' | 'DELIVERY' | 'DROPOFF' | 'WAREHOUSE' | 'RETURN_EMPTY' | 'EXCHANGE';
/** "PENDING" | "EN_ROUTE" | "ARRIVED" | "COMPLETED" | "SKIPPED" */
export type StopStatus = 'PENDING' | 'EN_ROUTE' | 'ARRIVED' | 'COMPLETED' | 'SKIPPED';

export interface OrderStop {
  id: string;
  sequence: number;
  type: StopType;
  status: string;
  city: string;
  region: string;
  address: string;
  lat: number | null;
  lng: number | null;
  contactName: string | null;
  contactPhone: string | null;
  scheduledAt: string | null;
  instructions: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
}

export interface DriverJob {
  id: string;
  orderNumber: string;
  status: string;
  cargoDescription: string | null;
  originCity: string;
  destinationCity: string;
  pickupDate: string | null;
  deliveryDate: string | null;
  client: { nameAr: string; nameEn: string; contactPhone: string | null } | null;
  stops: OrderStop[];
}

export interface DriverMe {
  id: string;
  name: string;
  phone: string;
  status: string;
  ownership: string;
  rating: number | null;
  totalTrips: number;
  company: { id: string; nameAr: string; nameEn: string } | null;
  currentLat: number | null;
  currentLng: number | null;
}
