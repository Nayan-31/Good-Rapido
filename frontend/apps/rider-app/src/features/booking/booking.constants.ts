import type { BookingHomeForm, VehicleType } from "./booking.types";

export const VEHICLE_OPTIONS: Array<{
  type: VehicleType;
  label: string;
  eta: string;
  capacity: string;
  description: string;
}> = [
  {
    type: "bike",
    label: "Bike",
    eta: "2 min",
    capacity: "1 rider",
    description: "Fastest pickup"
  },
  {
    type: "auto",
    label: "Auto",
    eta: "4 min",
    capacity: "3 seats",
    description: "Everyday city ride"
  },
  {
    type: "cab_economy",
    label: "Economy Cab",
    eta: "6 min",
    capacity: "4 seats",
    description: "Comfortable ride"
  },
  {
    type: "cab_premium",
    label: "Premium Cab",
    eta: "8 min",
    capacity: "6 seats",
    description: "More space"
  }
];

export const DEFAULT_BOOKING_FORM: BookingHomeForm = {
  pickup: {
    address: "Howrah Bridge",
    latitude: "22.5851",
    longitude: "88.3468"
  },
  dropoff: {
    address: "Park Street",
    latitude: "22.5546",
    longitude: "88.3520"
  },
  vehicleType: "bike",
  passengers: "1"
};
